const db = require('./db');
const issues = db.prepare('SELECT id, category, priority_level, score, reasoning, summary FROM issues').all();
let ai_count = 0;
for (let i of issues) {
  if (i.reasoning && !i.reasoning.includes('rule-based') && !i.reasoning.includes('Failed to parse')) ai_count++;
  console.log(`${i.summary} | ${i.category} | ${i.priority_level} | ${i.score}`);
}
console.log('AI Summaries: ' + ai_count);
