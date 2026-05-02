const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./groupy.db', (err) => {
    if (err) console.error(err.message);
    else console.log("Connected to SQLite database");
});

db.serialize(() => {
    // Users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            password TEXT,
            age INTEGER,
            location TEXT,
            interests TEXT,
            tokens INTEGER DEFAULT 10
        )
    `);

    // Connection requests table
    db.run(`
        CREATE TABLE IF NOT EXISTS connection_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_id INTEGER,
            to_id INTEGER,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (from_id) REFERENCES users(id),
            FOREIGN KEY (to_id) REFERENCES users(id)
        )
    `);

    // Accepted connections (friends) table
    db.run(`
        CREATE TABLE IF NOT EXISTS connections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user1_id INTEGER,
            user2_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user1_id) REFERENCES users(id),
            FOREIGN KEY (user2_id) REFERENCES users(id)
        )
    `);

    // Messages table
    db.run(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER,
            receiver_id INTEGER,
            content TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES users(id),
            FOREIGN KEY (receiver_id) REFERENCES users(id)
        )
    `);

    // Completed tasks table
    db.run(`
        CREATE TABLE IF NOT EXISTS completed_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            task_key TEXT,
            completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Ensure legacy DBs have the expected columns
    db.all("PRAGMA table_info(users)", [], (err, cols) => {
        if (err) return;

        const names = (cols || []).map(c => c.name);

        if (!names.includes('password')) {
            db.run("ALTER TABLE users ADD COLUMN password TEXT DEFAULT 'pass'");
        }

        if (!names.includes('tokens')) {
            db.run("ALTER TABLE users ADD COLUMN tokens INTEGER DEFAULT 10");
        }

        if (!names.includes('interests')) {
            db.run("ALTER TABLE users ADD COLUMN interests TEXT DEFAULT ''");
        }
    });
});

module.exports = db;