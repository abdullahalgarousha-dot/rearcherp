
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('prisma/dev.db');

db.all("PRAGMA table_info(DailyReport)", (err, rows) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log("Columns in DailyReport:");
    rows.forEach(row => console.log(`- ${row.name} (${row.type})`));
    db.close();
});
