require("dotenv").config();

const express = require("express");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "pdfdoer_local_secret_change_later";
const ADMIN_EMAIL = "pdfdoeradmin@gmail.com";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM =
  process.env.SMTP_FROM || SMTP_USER || "PDFDoer <no-reply@pdfdoer.local>";

const dbPath = path.join(__dirname, "users.db");
const db = new Database(dbPath);

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

function ensureColumn(tableName, columnName, columnDefinition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some((column) => column.name === columnName);

  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}

function resetGuestUsageTable() {
  db.prepare("DROP TABLE IF EXISTS guest_usage").run();

  db.exec(`
    CREATE TABLE guest_usage (
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
}

function ensureGuestUsageTable() {
  const table = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='guest_usage'")
    .get();

  if (!table) {
    resetGuestUsageTable();
    return;
  }

  const columns = db.prepare("PRAGMA table_info(guest_usage)").all();
  const columnNames = columns.map((column) => column.name);

  const hasOldUsageDate = columnNames.includes("usage_date");
  const missingGuestKey = !columnNames.includes("guest_key");

  if (hasOldUsageDate || missingGuestKey) {
    resetGuestUsageTable();
    return;
  }

  const addColumnIfMissing = (columnName, columnDefinition) => {
    if (!columnNames.includes(columnName)) {
      db.exec(`ALTER TABLE guest_usage ADD COLUMN ${columnName} ${columnDefinition}`);
    }
  };

  addColumnIfMissing("guest_key", "TEXT DEFAULT ''");
  addColumnIfMissing("ip_address", "TEXT DEFAULT ''");
  addColumnIfMissing("device_id", "TEXT DEFAULT ''");
  addColumnIfMissing("actions_used", "INTEGER DEFAULT 0");
  addColumnIfMissing("actions_limit", "INTEGER DEFAULT 3");
  addColumnIfMissing("created_at", "TEXT DEFAULT CURRENT_TIMESTAMP");
  addColumnIfMissing("updated_at", "TEXT DEFAULT CURRENT_TIMESTAMP");
}

ensureColumn("users", "email_verified", "INTEGER DEFAULT 0");
ensureColumn("users", "verification_token", "TEXT DEFAULT ''");
ensureColumn("users", "verification_expires", "TEXT DEFAULT ''");
ensureColumn("users", "reset_password_token", "TEXT DEFAULT ''");
ensureColumn("users", "reset_password_expires", "TEXT DEFAULT ''");
ensureColumn("users", "auth_provider", "TEXT DEFAULT 'email'");
ensureColumn("users", "google_id", "TEXT DEFAULT ''");
ensureColumn("users", "updated_at", "TEXT DEFAULT ''");

ensureGuestUsageTable();

db.prepare(`
  UPDATE users
  SET email_verified = 1,
      tier = 'pro',
      actions_limit = 999,
      updated_at = CURRENT_TIMESTAMP
  WHERE email = ?
`).run(ADMIN_EMAIL);

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return (
    req.ip ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    "unknown"
  );
}

function getDeviceId(req) {
  return String(req.headers["x-pdfdoer-device-id"] || "")
    .trim()
    .replace(/[^\w.-]/g, "")
    .slice(0, 120);
}

function getGuestKey(req) {
  const ipAddress = getClientIp(req);
  const deviceId = getDeviceId(req);

  if (deviceId) {
    return `device:${deviceId}|ip:${ipAddress}`;
  }

  return `ip:${ipAddress}`;
}

function getOrCreateGuestUsage(req) {
  const guestKey = getGuestKey(req);
  const ipAddress = getClientIp(req);
  const deviceId = getDeviceId(req);

  let guestUsage = db
    .prepare("SELECT * FROM guest_usage WHERE guest_key = ?")
    .get(guestKey);

  if (!guestUsage) {
    db.prepare(`
      INSERT INTO guest_usage (guest_key, ip_address, device_id, actions_used, actions_limit)
      VALUES (?, ?, ?, 0, 3)
    `).run(guestKey, ipAddress, deviceId);

    guestUsage = db
      .prepare("SELECT * FROM guest_usage WHERE guest_key = ?")
      .get(guestKey);
  }

  return guestUsage;
}

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      tier: user.tier,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function createVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

function createVerificationExpiry() {
  const expires = new Date();
  expires.setHours(expires.getHours() + 24);
  return expires.toISOString();
}

function isVerificationExpired(expiryValue) {
  if (!expiryValue) return true;

  const expiryDate = new Date(expiryValue);
  return Number.isNaN(expiryDate.getTime()) || expiryDate.getTime() < Date.now();
}

function cleanUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name || "",
    tier: user.tier || "free",
    actionsUsed: user.actions_used || 0,
    actionsLimit: user.tier === "pro" ? 999 : user.actions_limit || 10,
    emailVerified: Boolean(user.email_verified),
    authProvider: user.auth_provider || "email",
    createdAt: user.created_at || "",
  };
}

function hasSmtpConfig() {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

async function sendVerificationEmail(userEmail, verificationToken) {
  const verificationUrl = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;

  if (!hasSmtpConfig()) {
    console.log("SMTP is not configured. Dev verification link:");
    console.log(verificationUrl);

    return {
      sent: false,
      devVerificationUrl: verificationUrl,
    };
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: SMTP_FROM,
    to: userEmail,
    subject: "Verify your PDFDoer account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0f172a;">Verify your PDFDoer account</h2>
        <p style="color: #475569; line-height: 1.6;">
          Thanks for creating your PDFDoer account. Please verify your email address to activate your free account.
        </p>
        <a href="${verificationUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 12px 18px; border-radius: 10px; text-decoration: none; font-weight: bold;">
          Verify Email
        </a>
        <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin-top: 20px;">
          This verification link expires in 24 hours.
        </p>
      </div>
    `,
  });

  return {
    sent: true,
    devVerificationUrl: "",
  };
}

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Please login first.",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Session expired. Please login again.",
    });
  }
}

function verifiedUserOnly(req, res, next) {
  if (req.user.email === ADMIN_EMAIL) {
    return next();
  }

  if (!req.user.email_verified) {
    return res.status(403).json({
      success: false,
      message: "Please verify your email before using account actions.",
      user: cleanUser(req.user),
    });
  }

  next();
}

function adminOnly(req, res, next) {
  const userEmail = String(req.user?.email || "").trim().toLowerCase();

  if (userEmail !== ADMIN_EMAIL) {
    return res.status(403).json({
      success: false,
      message: "Admin access only.",
    });
  }

  next();
}

router.get("/guest-usage", (req, res) => {
  try {
    const guestUsage = getOrCreateGuestUsage(req);

    return res.json({
      success: true,
      usage: {
        tier: "guest",
        actionsUsed: guestUsage.actions_used,
        actionsLimit: guestUsage.actions_limit,
        remaining: Math.max(0, guestUsage.actions_limit - guestUsage.actions_used),
      },
    });
  } catch (error) {
    console.error("Guest usage error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load guest usage.",
    });
  }
});

router.post("/guest-increment-usage", (req, res) => {
  try {
    const guestUsage = getOrCreateGuestUsage(req);

    if (guestUsage.actions_used >= guestUsage.actions_limit) {
      return res.status(403).json({
        success: false,
        message: "Guest usage limit reached. Please sign up or upgrade.",
        usage: {
          tier: "guest",
          actionsUsed: guestUsage.actions_used,
          actionsLimit: guestUsage.actions_limit,
          remaining: 0,
        },
      });
    }

    db.prepare(`
      UPDATE guest_usage
      SET actions_used = actions_used + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE guest_key = ?
    `).run(guestUsage.guest_key);

    const updatedUsage = db
      .prepare("SELECT * FROM guest_usage WHERE guest_key = ?")
      .get(guestUsage.guest_key);

    return res.json({
      success: true,
      usage: {
        tier: "guest",
        actionsUsed: updatedUsage.actions_used,
        actionsLimit: updatedUsage.actions_limit,
        remaining: Math.max(0, updatedUsage.actions_limit - updatedUsage.actions_used),
      },
    });
  } catch (error) {
    console.error("Guest increment usage error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update guest usage.",
    });
  }
});

router.post("/register", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "").trim();
    const name = String(req.body.name || "").trim();

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    const existingUser = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email);

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "This email is already registered.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = createVerificationToken();
    const verificationExpires = createVerificationExpiry();

    const result = db
      .prepare(`
        INSERT INTO users (
          email,
          password_hash,
          name,
          tier,
          actions_used,
          actions_limit,
          email_verified,
          verification_token,
          verification_expires,
          auth_provider,
          updated_at
        )
        VALUES (?, ?, ?, 'free', 0, 10, 0, ?, ?, 'email', CURRENT_TIMESTAMP)
      `)
      .run(email, passwordHash, name, verificationToken, verificationExpires);

    const user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(result.lastInsertRowid);

    const emailResult = await sendVerificationEmail(email, verificationToken);
    const token = createToken(user);

    return res.json({
      success: true,
      message: emailResult.sent
        ? "Account created. Please check your email to verify your account."
        : "Account created. SMTP is not configured, so use the dev verification link.",
      token,
      user: cleanUser(user),
      devVerificationUrl: emailResult.devVerificationUrl || undefined,
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create account.",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "").trim();

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordCorrect) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = createToken(user);

    return res.json({
      success: true,
      message: user.email_verified
        ? "Login successful."
        : "Login successful. Please verify your email to activate account actions.",
      token,
      user: cleanUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to login.",
    });
  }
});

router.get("/verify-email", (req, res) => {
  try {
    const token = String(req.query.token || "").trim();

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required.",
      });
    }

    const user = db
      .prepare("SELECT * FROM users WHERE verification_token = ?")
      .get(token);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification token.",
      });
    }

    if (isVerificationExpired(user.verification_expires)) {
      return res.status(400).json({
        success: false,
        message: "Verification link expired. Please request a new verification email.",
      });
    }

    db.prepare(`
      UPDATE users
      SET email_verified = 1,
          verification_token = '',
          verification_expires = '',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(user.id);

    const updatedUser = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(user.id);

    return res.json({
      success: true,
      message: "Email verified successfully.",
      user: cleanUser(updatedUser),
    });
  } catch (error) {
    console.error("Verify email error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify email.",
    });
  }
});

router.post("/resend-verification", authMiddleware, async (req, res) => {
  try {
    if (req.user.email_verified) {
      return res.json({
        success: true,
        message: "Your email is already verified.",
        user: cleanUser(req.user),
      });
    }

    const verificationToken = createVerificationToken();
    const verificationExpires = createVerificationExpiry();

    db.prepare(`
      UPDATE users
      SET verification_token = ?,
          verification_expires = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(verificationToken, verificationExpires, req.user.id);

    const emailResult = await sendVerificationEmail(req.user.email, verificationToken);

    return res.json({
      success: true,
      message: emailResult.sent
        ? "Verification email sent."
        : "SMTP is not configured, so use the dev verification link.",
      devVerificationUrl: emailResult.devVerificationUrl || undefined,
    });
  } catch (error) {
    console.error("Resend verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to resend verification email.",
    });
  }
});

router.get("/me", authMiddleware, (req, res) => {
  return res.json({
    success: true,
    user: cleanUser(req.user),
  });
});

router.get("/usage", authMiddleware, (req, res) => {
  return res.json({
    success: true,
    usage: {
      tier: req.user.tier,
      actionsUsed: req.user.actions_used,
      actionsLimit: req.user.tier === "pro" ? 999 : req.user.actions_limit,
      remaining:
        req.user.tier === "pro"
          ? 999
          : Math.max(0, req.user.actions_limit - req.user.actions_used),
    },
  });
});

router.post("/increment-usage", authMiddleware, (req, res) => {
  if (req.user.tier === "pro") {
    return res.json({
      success: true,
      usage: {
        tier: "pro",
        actionsUsed: req.user.actions_used,
        actionsLimit: 999,
        remaining: 999,
      },
    });
  }

  if (req.user.actions_used >= req.user.actions_limit) {
    return res.status(403).json({
      success: false,
      message: "Free usage limit reached. Please upgrade to Pro.",
    });
  }

  db.prepare(`
    UPDATE users
    SET actions_used = actions_used + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(req.user.id);

  const user = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(req.user.id);

  return res.json({
    success: true,
    usage: {
      tier: user.tier,
      actionsUsed: user.actions_used,
      actionsLimit: user.tier === "pro" ? 999 : user.actions_limit,
      remaining:
        user.tier === "pro"
          ? 999
          : Math.max(0, user.actions_limit - user.actions_used),
    },
  });
});

router.post("/admin/upgrade-user", authMiddleware, adminOnly, (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "User email is required.",
      });
    }

    const user = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No user found with that email.",
      });
    }

    db.prepare(`
      UPDATE users
      SET tier = 'pro',
          actions_limit = 999,
          email_verified = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE email = ?
    `).run(email);

    const updatedUser = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email);

    return res.json({
      success: true,
      message: `${updatedUser.email} has been upgraded to Pro.`,
      user: cleanUser(updatedUser),
    });
  } catch (error) {
    console.error("Admin upgrade user error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to upgrade user.",
    });
  }
});

router.post("/admin/downgrade-user", authMiddleware, adminOnly, (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "User email is required.",
      });
    }

    const user = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No user found with that email.",
      });
    }

    if (email === ADMIN_EMAIL) {
      return res.status(400).json({
        success: false,
        message: "The admin account cannot be downgraded.",
      });
    }

    db.prepare(`
      UPDATE users
      SET tier = 'free',
          actions_limit = 10,
          updated_at = CURRENT_TIMESTAMP
      WHERE email = ?
    `).run(email);

    const updatedUser = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email);

    return res.json({
      success: true,
      message: `${updatedUser.email} has been downgraded to Free.`,
      user: cleanUser(updatedUser),
    });
  } catch (error) {
    console.error("Admin downgrade user error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to downgrade user.",
    });
  }
});

module.exports = {
  router,
  authMiddleware,
  db,
};