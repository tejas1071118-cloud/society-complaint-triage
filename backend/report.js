const db = require('./db');
const issues = db.prepare('SELECT id, category, priority_level, score, reasoning, (SELECT summary FROM complaints WHERE issue_id = issues.id ORDER BY created_at DESC LIMIT 1) as summary FROM issues').all();
let ai_count = 0;
for (let i of issues) {
  if (i.reasoning && !i.reasoning.includes('rule-based') && !i.reasoning.includes('Failed to parse')) ai_count++;
  console.log(`${i.summary} | ${i.category} | ${i.priority_level} | ${i.score}`);
}
console.log('AI Summaries: ' + ai_count);
