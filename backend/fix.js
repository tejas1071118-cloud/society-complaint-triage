const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');
code = code.replace(/app\.post\('\/api\/issues\/:id\/reanalyze', async \(req, res\) => \{[\s\S]*?\}\);/g, '');
code = code.replace(/app\.post\('\/api\/issues\/:id\/draft-reply',/g, 
`app.post('/api/issues/:id/reanalyze', async (req, res) => {
    try {
        const issueId = req.params.id;
        const complaints = db.prepare('SELECT description FROM complaints WHERE issue_id = ?').all(issueId);
        if (complaints.length === 0) return res.json({ success: false, error: 'No complaints found' });
        
        const combinedText = complaints.map(c => c.description).join(' | ');
        const { tagComplaint } = require('./gemini');
        const tags = await tagComplaint(combinedText, true);
        
        db.prepare(\`
            UPDATE issues 
            SET category = ?, priority_level = ?, safety_risk = ?, service_impact = ?, vulnerable_residents = ?, reasoning = ?, suggested_action = ?, suggested_owner_role = ?, summary = ?, manual_override_reason = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        \`).run(tags.category, tags.urgency_level, tags.safety_risk, tags.service_impact, tags.vulnerable_residents ? 1 : 0, tags.reasoning, tags.suggested_action, tags.suggested_owner_role, tags.summary, issueId);
        
        recalcIssue(issueId, false);
        res.json({ success: true });
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to reanalyze' });
    }
});

app.post('/api/issues/:id/draft-reply',`);
fs.writeFileSync('server.js', code);
console.log('Fixed reanalyze endpoint!');
