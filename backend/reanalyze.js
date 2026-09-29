require('dotenv').config();
const db = require('./db');
const axios = require('axios');

async function run() {
    console.log("Fetching issues that need re-analysis...");
    const issues = db.prepare('SELECT id, category, reasoning FROM issues').all();
    
    const stuckIssues = issues.filter(i => i.reasoning && (i.reasoning.includes("AI unavailable") || i.reasoning.includes("Failed to parse")));
    
    console.log(`Found ${stuckIssues.length} issues to re-analyze.`);
    
    for (let i = 0; i < stuckIssues.length; i++) {
        const issue = stuckIssues[i];
        console.log(`Re-analyzing issue ${issue.id}...`);
        try {
            await axios.post(`http://localhost:3001/api/issues/${issue.id}/reanalyze`);
            console.log("  Success.");
        } catch(err) {
            console.error("  Failed:", err.message);
        }
        await new Promise(r => setTimeout(r, 2500)); // Rate limit backoff
    }
    
    console.log("Re-analysis complete!");
}

run();
