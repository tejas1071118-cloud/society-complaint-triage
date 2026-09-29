const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');
const newReanalyze = `app.post('/api/issues/:id/reanalyze', async (req, res) => {
    try {
        const issueId = req.params.id;
        db.prepare(\`
            UPDATE issues 
            SET category = 'Analyzing...', status = 'Analyzing...' 
            WHERE id = ?
        \`).run(issueId);
        
        res.json({ success: true });
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to reanalyze' });
    }
});`;

code = code.replace(/app\.post\('\/api\/issues\/:id\/reanalyze', async \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ error: 'Failed to reanalyze' \}\);\s*\}\s*\}\);/g, newReanalyze);
fs.writeFileSync('server.js', code);
console.log('Fixed reanalyze endpoint!');
