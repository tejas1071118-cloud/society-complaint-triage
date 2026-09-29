const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
require('dotenv').config(); // fallback
process.env.GEMINI_API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY;
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const { tagComplaint, getEmbedding, cosineSimilarity, draftReply } = require('./gemini');
const { calculatePriority } = require('./priorityEngine');

const app = express();
app.use(cors());
app.use(express.json());

const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Serve uploads statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB max limit (video)
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

const URGENCY_LEVELS = { "Low": 1, "Medium": 2, "High": 3, "Critical": 4 };
const LEVEL_TO_URGENCY = { 1: "Low", 2: "Medium", 3: "High", 4: "Critical" };

function recalcIssue(issueId, isNewMatch = false) {
    const issue = db.prepare('SELECT * FROM issues WHERE id = ?').get(issueId);
    if (!issue) return;

    const complaints = db.prepare('SELECT * FROM complaints WHERE issue_id = ?').all(issueId);
    
    // Determine affected flats count
    const uniqueFlats = new Set(complaints.map(c => c.flat_number));
    
    // Calculate Age
    const firstReported = new Date(db.prepare('SELECT MIN(created_at) as first FROM complaints WHERE issue_id = ?').get(issueId).first);
    const ageHours = (new Date() - firstReported) / (1000 * 60 * 60);

    const { score, priorityLevel, isOverdue, escalationReason } = calculatePriority(
        issue, 
        complaints.length, 
        uniqueFlats.size, 
        ageHours
    );

    let isRecurring = issue.is_recurring || 0;
    let newStatus = issue.status;
    if (isNewMatch && issue.status === 'Resolved') {
        isRecurring = 1;
        newStatus = 'New';
    }

    db.prepare(`
        UPDATE issues 
        SET score = ?, priority_level = ?, is_overdue = ?, escalation_reason = ?, is_recurring = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(score, priorityLevel, isOverdue ? 1 : 0, escalationReason, isRecurring, newStatus, issueId);
}

// Background job every hour
setInterval(() => {
    const issues = db.prepare('SELECT id FROM issues WHERE status != "Resolved"').all();
    issues.forEach(i => recalcIssue(i.id));
}, 60 * 60 * 1000);

// Background Queue for AI Analysis
let isProcessingQueue = false;
setInterval(async () => {
    if (isProcessingQueue) return;
    isProcessingQueue = true;
    try {
        const { tagComplaintsBatch } = require('./gemini');
        
        // Find up to 10 issues that need analysis
        const pendingIssues = db.prepare(`
            SELECT id FROM issues WHERE category = 'Analyzing...' LIMIT 10
        `).all();

        if (pendingIssues.length > 0) {
            const batchPayload = [];
            for (const pi of pendingIssues) {
                const complaints = db.prepare('SELECT description FROM complaints WHERE issue_id = ?').all(pi.id);
                const combinedText = complaints.map(c => c.description).join(' | ');
                
                // compute flat count & age for fallback
                const firstReported = db.prepare('SELECT MIN(created_at) as c FROM complaints WHERE issue_id = ?').get(pi.id);
                let ageHours = 0;
                if (firstReported && firstReported.c) {
                    ageHours = (Date.now() - new Date(firstReported.c).getTime()) / (1000 * 60 * 60);
                }
                let firstImage = null;
                if (process.env.ENABLE_IMAGE_ANALYSIS === 'true') {
                    const attach = db.prepare(`
                        SELECT a.* FROM attachments a 
                        JOIN complaints c ON a.complaint_id = c.id 
                        WHERE c.issue_id = ? AND a.kind = 'image' 
                        ORDER BY a.created_at ASC LIMIT 1
                    `).get(pi.id);
                    if (attach) {
                        try {
                            const fileData = fs.readFileSync(path.join(__dirname, 'uploads', attach.file_path));
                            firstImage = {
                                inlineData: {
                                    data: fileData.toString('base64'),
                                    mimeType: attach.mime_type
                                }
                            };
                        } catch(e) { console.error('Image read error:', e); }
                    }
                }
                
                batchPayload.push({
                    id: pi.id,
                    text: combinedText,
                    flatCount: complaints.length,
                    ageInHours: ageHours,
                    imagePart: firstImage
                });
            }

            const results = await tagComplaintsBatch(batchPayload);
            
            for (const tags of results) {
                const issueId = tags.complaint_id;
                db.prepare(`
                    UPDATE issues 
                    SET category = ?, urgency = ?, priority_level = ?, safety_risk = ?, service_impact = ?, vulnerable_residents = ?, reasoning = ?, suggested_action = ?, suggested_owner_role = ?, summary = ?, status = 'New'
                    WHERE id = ?
                `).run(
                    tags.category, tags.urgency_level, tags.urgency_level, tags.safety_risk, tags.service_impact, 
                    tags.vulnerable_residents ? 1 : 0, tags.reasoning, tags.suggested_action, 
                    tags.suggested_owner_role, tags.summary, issueId
                );
                
                db.prepare(`
                    UPDATE complaints 
                    SET category = ?, urgency = ?, summary = ?
                    WHERE issue_id = ?
                `).run(tags.category, tags.urgency_level, tags.summary, issueId);
                
                recalcIssue(issueId, false);
            }
        }
    } catch (e) {
        console.error("Queue Error:", e);
    }
    isProcessingQueue = false;
}, 4000);

// Add AI health endpoint
app.get('/api/ai/health', async (req, res) => {
    try {
        const { checkHealth } = require('./gemini');
        const status = await checkHealth();
        res.json(status);
    } catch (error) {
        res.json({ status: 'offline', error: error.message });
    }
});

app.post('/api/ai/retry', (req, res) => {
    try {
        db.prepare(`
            UPDATE issues 
            SET category = 'Analyzing...', status = 'Analyzing...' 
            WHERE reasoning LIKE '%rule-based%'
        `).run();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded or invalid type' });
        }
        
        // Manual magic number check could be added here, but mimetype+extension is verified by multer
        const isImage = req.file.mimetype.startsWith('image/');
        if (isImage && req.file.size > 5 * 1024 * 1024) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Image exceeds 5MB limit' });
        }
        
        const attachId = uuidv4();
        db.prepare(`
            INSERT INTO attachments (id, file_path, original_name, mime_type, size_bytes, kind)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            attachId,
            req.file.filename,
            req.file.originalname,
            req.file.mimetype,
            req.file.size,
            isImage ? 'image' : 'video'
        );
        
        res.json({ success: true, attachmentId: attachId, kind: isImage ? 'image' : 'video' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/complaints', async (req, res) => {
    try {
        const { flat_number, name, phone, description, attachment_ids } = req.body;
        const { calculateSimilarity } = require('./gemini');
        
        // Local clustering
        const recentComplaints = db.prepare(`
            SELECT id, issue_id, description 
            FROM complaints 
            WHERE created_at >= datetime('now', '-48 hours')
        `).all();

        let matchedIssueId = null;
        let maxSimilarity = 0;

        for (const c of recentComplaints) {
            const sim = calculateSimilarity(description, c.description);
            if (sim > 0.35 && sim > maxSimilarity) {
                maxSimilarity = sim;
                matchedIssueId = c.issue_id;
            }
        }

        const isDuplicate = !!matchedIssueId;

        const complaintId = uuidv4();

        if (matchedIssueId) {
            db.prepare(`
                INSERT INTO complaints (id, flat_number, name, phone, description, category, urgency, summary, language_detected, issue_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(complaintId, flat_number, name, phone, description, 'Pending', 'Pending', 'Pending', 'en', matchedIssueId);
            
            recalcIssue(matchedIssueId, true);
        } else {
            matchedIssueId = uuidv4();
            db.prepare(`
                INSERT INTO issues (id, category, urgency, priority_level, safety_risk, service_impact, vulnerable_residents, reasoning, suggested_action, suggested_owner_role, summary, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                matchedIssueId, 'Analyzing...', 'Medium', 'Medium', 
                0, 0, 0, 
                'Pending AI analysis', 'Wait for analysis', 'Secretary', 'Analyzing...', 'New'
            );

            db.prepare(`
                INSERT INTO complaints (id, flat_number, name, phone, description, category, urgency, summary, language_detected, issue_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(complaintId, flat_number, name, phone, description, 'Pending', 'Medium', 'Analyzing...', 'en', matchedIssueId);
            
            recalcIssue(matchedIssueId, false);
        }

        // Link attachments
        if (attachment_ids && Array.isArray(attachment_ids)) {
            for (const aid of attachment_ids) {
                db.prepare('UPDATE attachments SET complaint_id = ? WHERE id = ?').run(complaintId, aid);
            }
        }

        res.json({ success: true, complaintId, issueId: matchedIssueId, isDuplicate });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to submit complaint' });
    }
});

app.get('/api/complaints/:id', (req, res) => {
    const row = db.prepare(`
        SELECT c.*, i.status as issue_status, i.assignee 
        FROM complaints c 
        LEFT JOIN issues i ON c.issue_id = i.id 
        WHERE c.id = ? OR c.flat_number = ?
        ORDER BY c.created_at DESC
    `).get(req.params.id, req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    
    // get replies and attachments
    const replies = db.prepare('SELECT * FROM replies WHERE complaint_id = ? ORDER BY sent_at DESC').all(row.id);
    row.replies = replies;
    const attachments = db.prepare('SELECT * FROM attachments WHERE complaint_id = ?').all(row.id);
    row.attachments = attachments;
    res.json(row);
});

app.get('/api/issues', (req, res) => {
    const issues = db.prepare(`
        SELECT 
            i.*, 
            COUNT(c.id) as complaint_count,
            MIN(c.created_at) as first_reported,
            MAX(c.created_at) as last_reported
        FROM issues i
        LEFT JOIN complaints c ON i.id = c.issue_id
        GROUP BY i.id
        ORDER BY score DESC, i.updated_at ASC
    `).all();

    // Map to include a preview of affected flats and attachment counts
    for (let issue of issues) {
        const flats = db.prepare('SELECT DISTINCT flat_number FROM complaints WHERE issue_id = ?').all(issue.id);
        issue.affected_flats = flats.map(f => f.flat_number).join(', ');
        
        const attachments = db.prepare(`
            SELECT a.* FROM attachments a
            JOIN complaints c ON a.complaint_id = c.id
            WHERE c.issue_id = ?
            ORDER BY a.created_at ASC
        `).all(issue.id);
        issue.attachments = attachments;
    }

    res.json(issues);
});

app.get('/api/issues/:id', (req, res) => {
    const issue = db.prepare('SELECT * FROM issues WHERE id = ?').get(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Not found' });

    const complaints = db.prepare('SELECT * FROM complaints WHERE issue_id = ? ORDER BY created_at ASC').all(issue.id);
    issue.complaints = complaints.map(c => {
        delete c.embedding; // hide embedding from response
        c.attachments = db.prepare('SELECT * FROM attachments WHERE complaint_id = ?').all(c.id);
        return c;
    });

    res.json(issue);
});

app.patch('/api/issues/:id', (req, res) => {
    const { status, assignee, internal_notes } = req.body;
    const issueId = req.params.id;

    const updates = [];
    const values = [];
    if (status) { updates.push('status = ?'); values.push(status); }
    if (assignee !== undefined) { updates.push('assignee = ?'); values.push(assignee); }
    if (internal_notes !== undefined) { updates.push('internal_notes = ?'); values.push(internal_notes); }

    if (updates.length > 0) {
        values.push(issueId);
        db.prepare(`UPDATE issues SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
        
        // Recalculate in case status changed to Resolved (to drop from SLA check)
        recalcIssue(issueId);
    }
    res.json({ success: true });
});

app.post('/api/issues/:id/override', (req, res) => {
    const { priority_level, reason } = req.body;
    db.prepare('UPDATE issues SET priority_level = ?, manual_override_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(priority_level, reason, req.params.id);
    recalcIssue(req.params.id);
    res.json({ success: true });
});

app.post('/api/issues/:id/reanalyze', async (req, res) => {
    try {
        const issueId = req.params.id;
        db.prepare(`
            UPDATE issues 
            SET category = 'Analyzing...', status = 'Analyzing...' 
            WHERE id = ?
        `).run(issueId);
        
        res.json({ success: true });
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to reanalyze' });
    }
});

app.post('/api/issues/:id/reanalyze', async (req, res) => {
    try {
        const issueId = req.params.id;
        db.prepare(`
            UPDATE issues 
            SET category = 'Analyzing...', status = 'Analyzing...' 
            WHERE id = ?
        `).run(issueId);
        
        res.json({ success: true });
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to reanalyze' });
    }
});

app.post('/api/issues/:id/draft-reply', async (req, res) => {
    try {
        const issue = db.prepare('SELECT * FROM issues WHERE id = ?').get(req.params.id);
        if (!issue) return res.status(404).json({ error: 'Not found' });

        const complaints = db.prepare('SELECT * FROM complaints WHERE issue_id = ?').all(issue.id);
        if (complaints.length === 0) return res.status(400).json({ error: 'No complaints in issue' });

        // Generate draft for the most prevalent language (or just the first complaint's language)
        const language = complaints[0].language_detected;
        const context = complaints.map(c => c.description).join(' | ').substring(0, 500);

        const draft = await draftReply(issue.category, issue.status, issue.internal_notes, language, context);
        res.json({ draft });
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to draft reply' });
    }
});

app.post('/api/issues/:id/send-reply', (req, res) => {
    const { message } = req.body;
    const issueId = req.params.id;

    const complaints = db.prepare('SELECT id FROM complaints WHERE issue_id = ?').all(issueId);
    
    const insertReply = db.prepare('INSERT INTO replies (id, complaint_id, issue_id, message) VALUES (?, ?, ?, ?)');
    
    db.transaction(() => {
        for (const c of complaints) {
            insertReply.run(uuidv4(), c.id, issueId, message);
        }
    })();

    res.json({ success: true, count: complaints.length });
});

app.get('/api/members', (req, res) => {
    const members = db.prepare('SELECT * FROM members').all();
    res.json(members);
});

app.get('/api/daily-brief', async (req, res) => {
    try {
        const recentIssues = db.prepare(`SELECT category, priority_level, status FROM issues WHERE updated_at >= datetime('now', '-24 hours')`).all();
        const overdue = db.prepare(`SELECT category, priority_level FROM issues WHERE is_overdue = 1 AND status != 'Resolved'`).all();
        const prompt = `Write a short daily digest for the housing society committee (max 120 words) in English and Hinglish.
Recent Issues: ${JSON.stringify(recentIssues)}
Overdue Issues: ${JSON.stringify(overdue)}
Format: How many new/updated, top 3 needing action, what is overdue, what was resolved. Make it very readable.`;
        
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your_')) {
            return res.json({ brief: "AI offline. Please configure your API key to view the daily digest." });
        }
        
        const { GoogleGenAI } = require('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const resp = await ai.models.generateContent({ model: 'gemini-3.8-flash', contents: prompt });
        res.json({ brief: resp.text.trim() });
    } catch(err) {
        console.error(err);
        if (err.status === 429) {
            return res.status(429).json({ error: 'AI limit reached. Please try again later.' });
        }
        res.status(500).json({ error: 'Failed to generate brief' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('Backend running on port ' + PORT));

// Cleanup orphaned attachments
setInterval(() => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const orphaned = db.prepare('SELECT * FROM attachments WHERE complaint_id IS NULL AND created_at < ?').all(cutoff);
    for (const a of orphaned) {
        try {
            fs.unlinkSync(path.join(__dirname, 'uploads', a.file_path));
        } catch (err) {}
        db.prepare('DELETE FROM attachments WHERE id = ?').run(a.id);
    }
}, 60 * 60 * 1000);
