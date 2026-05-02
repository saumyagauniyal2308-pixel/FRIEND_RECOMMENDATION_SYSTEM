const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();

// MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Serve index.html for root (Express 5 compatibility)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// =====================
// REGISTER
// =====================
app.post('/register', (req, res) => {
    const { name, password, age, location, interests } = req.body;

    if (!name || !password) {
        return res.status(400).json({ error: "Missing username or password" });
    }

    db.run(
        `INSERT INTO users (name, password, age, location, interests, tokens)
         VALUES (?, ?, ?, ?, ?, 10)`,
        [name, password, age || null, location || '', interests || ''],
        function (err) {
            if (err) {
                return res.status(409).json({ error: "Username already exists" });
            }
            res.json({ message: "Registration successful", id: this.lastID });
        }
    );
});

// =====================
// LOGIN
// =====================
app.post('/login', (req, res) => {
    const { name, password } = req.body;

    db.get(
        `SELECT * FROM users WHERE name = ? AND password = ?`,
        [name, password],
        (err, user) => {
            if (err) return res.status(500).json({ error: "Database error" });

            if (!user) {
                return res.status(401).json({ error: "Invalid credentials" });
            }

            // Daily login reward: +2 tokens
            const newTokens = (user.tokens || 0) + 2;

            db.run("UPDATE users SET tokens = ? WHERE id = ?", [newTokens, user.id]);

            // Record daily login task
            const today = new Date().toISOString().split('T')[0];
            db.get(
                "SELECT id FROM completed_tasks WHERE user_id = ? AND task_key = ? AND DATE(completed_at) = ?",
                [user.id, 'daily_login', today],
                (err, row) => {
                    if (!row) {
                        db.run("INSERT INTO completed_tasks (user_id, task_key) VALUES (?, ?)",
                            [user.id, 'daily_login']);
                    }
                }
            );

            // Get connection count
            db.get(
                `SELECT COUNT(*) as count FROM connections 
                 WHERE user1_id = ? OR user2_id = ?`,
                [user.id, user.id],
                (err, connRow) => {
                    // Get pending incoming requests count
                    db.get(
                        `SELECT COUNT(*) as count FROM connection_requests 
                         WHERE to_id = ? AND status = 'pending'`,
                        [user.id],
                        (err, reqRow) => {
                            res.json({
                                id: user.id,
                                name: user.name,
                                age: user.age,
                                location: user.location,
                                interests: user.interests,
                                tokens: newTokens,
                                connections: connRow ? connRow.count : 0,
                                pendingRequests: reqRow ? reqRow.count : 0
                            });
                        }
                    );
                }
            );
        }
    );
});

// =====================
// RECOMMEND (Jaccard + location similarity)
// =====================
app.get('/recommend/:id', (req, res) => {
    const id = parseInt(req.params.id);

    db.get("SELECT * FROM users WHERE id = ?", [id], (err, current) => {
        if (err) return res.status(500).json({ error: "DB error" });
        if (!current) return res.json([]);

        const currentInterests = current.interests
            ? current.interests.split(',').map(i => i.trim().toLowerCase())
            : [];

        // Get users already connected or with pending requests
        db.all(
            `SELECT user1_id, user2_id FROM connections WHERE user1_id = ? OR user2_id = ?`,
            [id, id],
            (err, conns) => {
                const connectedIds = new Set();
                (conns || []).forEach(c => {
                    connectedIds.add(c.user1_id);
                    connectedIds.add(c.user2_id);
                });
                connectedIds.delete(id);

                db.all(
                    `SELECT from_id, to_id FROM connection_requests 
                     WHERE (from_id = ? OR to_id = ?) AND status = 'pending'`,
                    [id, id],
                    (err, reqs) => {
                        const pendingIds = new Set();
                        (reqs || []).forEach(r => {
                            pendingIds.add(r.from_id);
                            pendingIds.add(r.to_id);
                        });
                        pendingIds.delete(id);

                        db.all(
                            "SELECT id, name, age, location, interests FROM users WHERE id != ?",
                            [id],
                            (err, users) => {
                                if (err) return res.status(500).json({ error: "DB error" });

                                const rec = users
                                    .filter(u => !connectedIds.has(u.id))
                                    .map(u => {
                                        const interests = u.interests
                                            ? u.interests.split(',').map(i => i.trim().toLowerCase())
                                            : [];

                                        // Jaccard similarity
                                        const inter = interests.filter(i => currentInterests.includes(i)).length;
                                        const uni = new Set([...currentInterests, ...interests]).size;
                                        let score = uni ? inter / uni : 0;

                                        // Location bonus
                                        if (u.location && current.location &&
                                            u.location.toLowerCase() === current.location.toLowerCase()) {
                                            score += 0.2;
                                        }

                                        // Age proximity bonus
                                        if (u.age && current.age) {
                                            score += 0.2 * (1.0 / (1 + Math.abs(current.age - u.age)));
                                        }

                                        return {
                                            ...u,
                                            score,
                                            isPending: pendingIds.has(u.id)
                                        };
                                    })
                                    .sort((a, b) => b.score - a.score);

                                res.json(rec);
                            }
                        );
                    }
                );
            }
        );
    });
});

// =====================
// SEND CONNECTION REQUEST
// =====================
app.post('/connect', (req, res) => {
    const { from, to } = req.body;

    // Check for existing request or connection
    db.get(
        `SELECT id FROM connection_requests 
         WHERE ((from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?))
         AND status = 'pending'`,
        [from, to, to, from],
        (err, existing) => {
            if (existing) {
                return res.json({ error: "Request already pending" });
            }

            db.get(
                `SELECT id FROM connections 
                 WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)`,
                [from, to, to, from],
                (err, conn) => {
                    if (conn) {
                        return res.json({ error: "Already connected" });
                    }

                    // Check tokens
                    db.get("SELECT tokens FROM users WHERE id = ?", [from], (err, user) => {
                        if (err) return res.status(500).json({ error: "DB error" });
                        if (!user || user.tokens < 2) {
                            return res.json({ error: "Not enough points (need 2)" });
                        }

                        const newTokens = user.tokens - 2;
                        db.run("UPDATE users SET tokens = ? WHERE id = ?", [newTokens, from]);

                        db.run(
                            "INSERT INTO connection_requests (from_id, to_id) VALUES (?, ?)",
                            [from, to],
                            function (err) {
                                if (err) return res.status(500).json({ error: "DB error" });
                                res.json({
                                    tokens: newTokens,
                                    message: "Connection request sent!",
                                    requestId: this.lastID
                                });
                            }
                        );
                    });
                }
            );
        }
    );
});

// =====================
// GET PENDING REQUESTS (incoming)
// =====================
app.get('/requests/:id', (req, res) => {
    const id = parseInt(req.params.id);

    db.all(
        `SELECT cr.id as requestId, cr.from_id, u.name, u.location, u.interests, cr.created_at
         FROM connection_requests cr
         JOIN users u ON u.id = cr.from_id
         WHERE cr.to_id = ? AND cr.status = 'pending'
         ORDER BY cr.created_at DESC`,
        [id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: "DB error" });
            res.json(rows || []);
        }
    );
});

// =====================
// ACCEPT / REJECT CONNECTION REQUEST
// =====================
app.post('/requests/:requestId/respond', (req, res) => {
    const requestId = parseInt(req.params.requestId);
    const { action } = req.body; // 'accept' or 'reject'

    db.get("SELECT * FROM connection_requests WHERE id = ?", [requestId], (err, request) => {
        if (err) return res.status(500).json({ error: "DB error" });
        if (!request) return res.status(404).json({ error: "Request not found" });

        if (action === 'accept') {
            // Create connection
            db.run(
                "INSERT INTO connections (user1_id, user2_id) VALUES (?, ?)",
                [request.from_id, request.to_id]
            );

            // Mutual reward: +3 tokens each
            db.run("UPDATE users SET tokens = tokens + 3 WHERE id = ?", [request.from_id]);
            db.run("UPDATE users SET tokens = tokens + 3 WHERE id = ?", [request.to_id]);

            // Update request status
            db.run("UPDATE connection_requests SET status = 'accepted' WHERE id = ?", [requestId]);

            res.json({ message: "Connection accepted! Both users earned +3 points." });
        } else {
            db.run("UPDATE connection_requests SET status = 'rejected' WHERE id = ?", [requestId]);
            res.json({ message: "Request declined." });
        }
    });
});

// =====================
// GET FRIENDS (accepted connections)
// =====================
app.get('/friends/:id', (req, res) => {
    const id = parseInt(req.params.id);

    db.all(
        `SELECT u.id, u.name, u.location, u.interests
         FROM connections c
         JOIN users u ON (u.id = c.user1_id OR u.id = c.user2_id)
         WHERE (c.user1_id = ? OR c.user2_id = ?) AND u.id != ?`,
        [id, id, id],
        (err, friends) => {
            if (err) return res.status(500).json({ error: "DB error" });
            res.json(friends || []);
        }
    );
});

// =====================
// GET USER PROFILE
// =====================
app.get('/user/:id', (req, res) => {
    const id = parseInt(req.params.id);

    db.get("SELECT id, name, age, location, interests, tokens FROM users WHERE id = ?", [id], (err, user) => {
        if (err) return res.status(500).json({ error: "DB error" });
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    });
});

// =====================
// UPDATE USER PROFILE
// =====================
app.post('/user/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { name, age, location, interests } = req.body;

    db.run(
        "UPDATE users SET name = ?, age = ?, location = ?, interests = ? WHERE id = ?",
        [name, age, location, interests, id],
        function(err) {
            if (err) return res.status(500).json({ error: "DB error" });
            res.json({ message: "Profile updated" });
        }
    );
});

// =====================
// SEND MESSAGE
// =====================
app.post('/messages', (req, res) => {
    const { sender_id, receiver_id, content } = req.body;

    if (!content || !content.trim()) {
        return res.status(400).json({ error: "Message cannot be empty" });
    }

    db.run(
        "INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)",
        [sender_id, receiver_id, content.trim()],
        function (err) {
            if (err) return res.status(500).json({ error: "DB error" });
            res.json({
                id: this.lastID,
                sender_id,
                receiver_id,
                content: content.trim(),
                created_at: new Date().toISOString()
            });
        }
    );
});

// =====================
// GET MESSAGES BETWEEN TWO USERS
// =====================
app.get('/messages/:userId/:friendId', (req, res) => {
    const userId = parseInt(req.params.userId);
    const friendId = parseInt(req.params.friendId);

    db.all(
        `SELECT * FROM messages 
         WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
         ORDER BY created_at ASC`,
        [userId, friendId, friendId, userId],
        (err, messages) => {
            if (err) return res.status(500).json({ error: "DB error" });
            res.json(messages || []);
        }
    );
});

// =====================
// EARN TASKS
// =====================
app.post('/tasks/claim', (req, res) => {
    const { user_id, task_key, reward } = req.body;

    // Check if already completed today
    const today = new Date().toISOString().split('T')[0];

    db.get(
        "SELECT id FROM completed_tasks WHERE user_id = ? AND task_key = ? AND DATE(completed_at) = ?",
        [user_id, task_key, today],
        (err, existing) => {
            if (existing) {
                return res.json({ error: "Already claimed today" });
            }

            // Validate task conditions
            validateTask(user_id, task_key, (isValid) => {
                if (!isValid) {
                    return res.json({ error: "Task not yet completed" });
                }

                db.run("UPDATE users SET tokens = tokens + ? WHERE id = ?", [reward, user_id]);
                db.run("INSERT INTO completed_tasks (user_id, task_key) VALUES (?, ?)", [user_id, task_key]);

                db.get("SELECT tokens FROM users WHERE id = ?", [user_id], (err, user) => {
                    res.json({
                        message: `Earned +${reward} points!`,
                        tokens: user ? user.tokens : 0
                    });
                });
            });
        }
    );
});

function validateTask(userId, taskKey, callback) {
    switch (taskKey) {
        case 'daily_login':
            callback(true); // Always valid during login
            break;
        case 'complete_profile':
            db.get("SELECT * FROM users WHERE id = ?", [userId], (err, user) => {
                callback(user && user.name && user.location && user.interests && user.age);
            });
            break;
        case 'add_interests':
            db.get("SELECT interests FROM users WHERE id = ?", [userId], (err, user) => {
                const count = user && user.interests ? user.interests.split(',').filter(i => i.trim()).length : 0;
                callback(count >= 3);
            });
            break;
        case 'send_connections':
            db.get("SELECT COUNT(*) as count FROM connection_requests WHERE from_id = ?", [userId], (err, row) => {
                callback(row && row.count >= 5);
            });
            break;
        default:
            callback(false);
    }
}

// =====================
// REWARDS SHOP - BUY
// =====================
app.post('/rewards/buy', (req, res) => {
    const { user_id, reward_title, cost } = req.body;

    db.get("SELECT tokens FROM users WHERE id = ?", [user_id], (err, user) => {
        if (err) return res.status(500).json({ error: "DB error" });
        if (!user) return res.status(404).json({ error: "User not found" });

        if (user.tokens < cost) {
            return res.json({ error: "Not enough points!" });
        }

        const newTokens = user.tokens - cost;
        db.run("UPDATE users SET tokens = ? WHERE id = ?", [newTokens, user_id]);

        res.json({
            message: `Purchased: ${reward_title}`,
            tokens: newTokens
        });
    });
});

// =====================
// ERROR HANDLER
// =====================
process.on('uncaughtException', (err) => {
    console.error("❌ Crash:", err);
});

// =====================
// START SERVER
// =====================
app.listen(3000, () => {
    console.log("✅ Server running on http://localhost:3000");
});
