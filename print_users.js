const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./groupy.db', (err) => { if (err) { console.error('DB open error', err); process.exit(1); } });

db.all('SELECT id,name,password,age,location,interests,tokens FROM users', [], (err, rows) => {
  if (err) { console.error('Query error', err); process.exit(1); }
  console.log(JSON.stringify(rows, null, 2));
  db.close();
});
