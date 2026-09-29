const db = require('./db');
const issues = db.prepare('SELECT summary, category, priority_level, score FROM issues ORDER BY updated_at DESC LIMIT 5').all();
for (let i of issues) console.log(`${i.summary} | ${i.category} | ${i.priority_level} | ${i.score}`);
