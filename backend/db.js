const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'societydesk.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS issues (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      urgency TEXT NOT NULL,
      status TEXT DEFAULT 'New',
      assignee TEXT,
      internal_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      score REAL DEFAULT 0,
      priority_level TEXT,
      safety_risk INTEGER DEFAULT 0,
      service_impact INTEGER DEFAULT 0,
      vulnerable_residents INTEGER DEFAULT 0,
      reasoning TEXT,
      suggested_action TEXT,
      suggested_owner_role TEXT,
      is_overdue INTEGER DEFAULT 0,
      manual_override_reason TEXT,
      is_recurring INTEGER DEFAULT 0,
      escalation_reason TEXT
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id TEXT PRIMARY KEY,
      flat_number TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      description TEXT NOT NULL,
      photo_url TEXT,
      status TEXT DEFAULT 'New',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      issue_id TEXT,
      category TEXT,
      urgency TEXT,
      summary TEXT,
      language_detected TEXT,
      embedding TEXT, -- JSON array of floats
      FOREIGN KEY (issue_id) REFERENCES issues (id)
    );

    CREATE TABLE IF NOT EXISTS replies (
      id TEXT PRIMARY KEY,
      complaint_id TEXT NOT NULL,
      issue_id TEXT NOT NULL,
      message TEXT NOT NULL,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (complaint_id) REFERENCES complaints (id),
      FOREIGN KEY (issue_id) REFERENCES issues (id)
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      complaint_id TEXT,
      file_path TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      kind TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (complaint_id) REFERENCES complaints (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
  `);

  // Seed members if empty
  const memberCount = db.prepare('SELECT count(*) as count FROM members').get().count;
  if (memberCount === 0) {
    const insertMember = db.prepare('INSERT INTO members (id, name) VALUES (?, ?)');
    insertMember.run('m1', 'Rahul (Secretary)');
    insertMember.run('m2', 'Priya (Maintenance)');
    insertMember.run('m3', 'Amit (Security)');
  }

  // Seed complaints if empty
  const complaintCount = db.prepare('SELECT count(*) as count FROM complaints').get().count;
  if (complaintCount === 0) {
      console.log('Seeding 35 realistic demo complaints...');
      const { v4: uuidv4 } = require('uuid');
      const insertIssue = db.prepare(`INSERT INTO issues (id, category, urgency, status, score, priority_level, reasoning, is_overdue) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      const insertComplaint = db.prepare(`INSERT INTO complaints (id, flat_number, name, description, issue_id, category, urgency, summary, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      
      const demoData = [
          { cat: 'Lift', urg: 'Critical', text: 'Lift number 2 is stuck on 4th floor and 2 kids are trapped inside crying! Please send someone immediately, very urgent emergency!', flat: 'A-402', isOverdue: 1, score: 98 },
          { cat: 'Water', urg: 'High', text: 'Pani nahi aa raha subah se. Please check tank.', flat: 'B-101', isOverdue: 0, score: 75 },
          { cat: 'Water', urg: 'High', text: 'No water supply in B wing since 6 AM.', flat: 'B-205', isOverdue: 0, score: 75 },
          { cat: 'Parking', urg: 'Medium', text: 'Someone parked a scooter in my allotted parking slot 45 again.', flat: 'C-301', isOverdue: 0, score: 45 },
          { cat: 'Security', urg: 'High', text: 'Main gate guard is sleeping at night. Anyone can walk in.', flat: 'A-102', isOverdue: 0, score: 80 },
          { cat: 'Noise', urg: 'Medium', text: 'Loud music playing from D wing 5th floor at 1 AM. Cannot sleep.', flat: 'D-405', isOverdue: 0, score: 50 },
          { cat: 'Cleaning', urg: 'Low', text: 'Kachra still outside door from yesterday.', flat: 'A-501', isOverdue: 1, score: 30 },
          { cat: 'Cleaning', urg: 'Low', text: 'Corridor on 5th floor A wing needs sweeping.', flat: 'A-502', isOverdue: 0, score: 25 },
          { cat: 'Lift', urg: 'Critical', text: 'Lift button shocking people, current lag raha hai.', flat: 'C-101', isOverdue: 0, score: 95 },
          { cat: 'Water', urg: 'High', text: 'Yellow dirty water coming from kitchen tap.', flat: 'D-201', isOverdue: 0, score: 70 },
      ];

      for (let i = 0; i < 35; i++) {
          const t = demoData[i % demoData.length];
          const issueId = uuidv4();
          insertIssue.run(issueId, t.cat, t.urg, i < 3 ? 'In Progress' : 'New', t.score, t.urg, 'AI generated reasoning for demo.', t.isOverdue);
          insertComplaint.run(uuidv4(), t.flat, 'Resident ' + i, t.text + (i > 9 ? ' (Repeat ' + i + ')' : ''), issueId, t.cat, t.urg, t.text.substring(0, 20), 'New');
      }
      console.log('Seeding complete.');
  }
}

initDb();

module.exports = db;
