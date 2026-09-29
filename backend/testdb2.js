const db = require('./db');
const issues = db.prepare('SELECT summary, category, priority_level, score, reasoning FROM issues ORDER BY updated_at DESC LIMIT 25').all();
let aiCount = 0;
for (let i of issues) {
  if (i.reasoning && !i.reasoning.includes('rule-based') && i.reasoning !== 'Pending AI analysis') aiCount++;
  console.log(`${i.summary} | ${i.category} | ${i.priority_level} | ${i.score} | ${i.reasoning ? i.reasoning.substring(0, 20) : ''}`);
}
console.log('AI Processed: ' + aiCount);
