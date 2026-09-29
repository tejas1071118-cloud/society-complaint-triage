const db = require('better-sqlite3')('societydesk.db');
const issues = db.prepare('SELECT summary, category, priority_level, score, reasoning FROM issues ORDER BY score DESC LIMIT 25').all();
console.log('| Title | Category | Level | Score | Analysis Mode |');
console.log('|-------|----------|-------|-------|---------------|');
for (const i of issues) {
  const mode = (i.reasoning && i.reasoning.includes('rule-based')) ? 'Rule-based' : 'AI-analyzed';
  console.log(`| ${i.summary} | ${i.category} | ${i.priority_level} | ${i.score} | ${mode} |`);
}
