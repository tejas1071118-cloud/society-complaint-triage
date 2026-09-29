const fs = require('fs');
if (fs.existsSync('society.db')) {
    fs.unlinkSync('society.db');
    console.log('Database society.db has been deleted.');
} else {
    console.log('No database found.');
}
