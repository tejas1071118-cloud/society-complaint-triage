const db = require('better-sqlite3')('societydesk.db');
const { calculatePriority } = require('./priorityEngine');

const issues = db.prepare('SELECT * FROM issues').all();
for (const issue of issues) {
    const complaints = db.prepare('SELECT * FROM complaints WHERE issue_id = ?').all(issue.id);
    const uniqueFlats = new Set(complaints.map(c => c.flat_number));
    
    let ageHours = 0;
    const firstReported = db.prepare('SELECT MIN(created_at) as first FROM complaints WHERE issue_id = ?').get(issue.id);
    if (firstReported && firstReported.first) {
        ageHours = (new Date() - new Date(firstReported.first)) / (1000 * 60 * 60);
    }

    const { score, priorityLevel, isOverdue, escalationReason } = calculatePriority(
        issue, 
        complaints.length, 
        uniqueFlats.size, 
        ageHours
    );
    
    db.prepare(`
        UPDATE issues 
        SET score = ?, priority_level = ?, is_overdue = ?, escalation_reason = ?
        WHERE id = ?
    `).run(score, priorityLevel, isOverdue ? 1 : 0, escalationReason, issue.id);
}
console.log('Recalculated ' + issues.length + ' issues');
