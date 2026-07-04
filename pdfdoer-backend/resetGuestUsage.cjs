const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "users.db");
const db = new Database(dbPath);

db.prepare("DROP TABLE IF EXISTS guest_usage").run();

db.exec(`
  CREATE TABLE IF NOT EXISTS guest_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_key TEXT NOT NULL UNIQUE,
    ip_address TEXT DEFAULT '',
    device_id TEXT DEFAULT '',
    actions_used INTEGER DEFAULT 0,
    actions_limit INTEGER DEFAULT 3,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log("guest_usage table reset successfully.");
db.close();