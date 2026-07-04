const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");

const dbPath = path.join(__dirname, "users.db");
const db = new Database(dbPath);

const adminEmail = "pdfdoeradmin@gmail.com";
const adminPassword = "303030";

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT DEFAULT '',
    tier TEXT DEFAULT 'free',
    actions_used INTEGER DEFAULT 0,
    actions_limit INTEGER DEFAULT 10,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

async function createAdmin() {
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const existingUser = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(adminEmail);

  if (existingUser) {
    db.prepare(`
      UPDATE users
      SET password_hash = ?,
          name = ?,
          tier = 'pro',
          actions_limit = 999
      WHERE email = ?
    `).run(passwordHash, "PDFDoer Admin", adminEmail);

    console.log("Admin account updated successfully.");
  } else {
    db.prepare(`
      INSERT INTO users (email, password_hash, name, tier, actions_used, actions_limit)
      VALUES (?, ?, ?, 'pro', 0, 999)
    `).run(adminEmail, passwordHash, "PDFDoer Admin");

    console.log("Admin account created successfully.");
  }

  console.log("Email:", adminEmail);
  console.log("Password:", adminPassword);
  console.log("Tier: pro");

  db.close();
}

createAdmin().catch((error) => {
  console.error("Failed to create admin account:", error);
  db.close();
});