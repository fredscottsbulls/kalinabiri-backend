// db.js - SQLite fallback wrapper that mimics pg Pool interface
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'kalinabiri.db');
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initTables();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE, email TEXT UNIQUE,
      password_hash TEXT NOT NULL, role TEXT DEFAULT 'student',
      first_name TEXT, last_name TEXT, phone TEXT,
      class TEXT, stream TEXT, gender TEXT,
      address TEXT, emergency_contact TEXT, avatar_url TEXT,
      status TEXT DEFAULT 'active', created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME, is_online INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      admission_number TEXT UNIQUE, class TEXT, stream TEXT,
      house TEXT, gender TEXT, date_of_birth TEXT,
      guardian_name TEXT, guardian_phone TEXT, guardian_relation TEXT,
      medical_conditions TEXT, status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      employee_id TEXT UNIQUE, department TEXT, subject TEXT,
      qualification TEXT, experience_years INTEGER, gender TEXT,
      date_of_birth TEXT, status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES users(id),
      date DATE, status TEXT, period TEXT,
      marked_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES users(id),
      exam_type TEXT, subject TEXT, score REAL, grade TEXT,
      term TEXT, year INTEGER, class TEXT, stream TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT, content TEXT, category TEXT,
      posted_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER REFERENCES users(id),
      recipient_id INTEGER REFERENCES users(id),
      subject TEXT, body TEXT, read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      type TEXT, title TEXT, message TEXT, read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default admin if none exists
  const adminExists = db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get();
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(`INSERT INTO users (username,email,password_hash,role,first_name,last_name)
      VALUES (?,?,?,'admin','School','Administrator')`).run('admin', 'admin@kalinabiri.edu', hash);
  }
}

function convertPlaceholders(sql, params) {
  // Replace $1 $2 ... $10+ correctly (don't partial-match $10 as $1+0)
  const converted = sql.replace(/\$(\d+)/g, '?');
  const paramCount = (converted.match(/\?/g) || []).length;
  const convertedParams = params.slice(0, paramCount);
  return { sql: converted, params: convertedParams };
}

// Mock Pool-like interface
class DbWrapper {
  connect() {
    return { query: (...args) => this.all(...args), release: () => {} };
  }
  query(...args) { return this.all(...args); }
  all(sql, ...params) {
    const database = getDb();
    const { sql: converted, params: convertedParams } = convertPlaceholders(sql, params);
    // RETURNING on INSERT/UPDATE/DELETE needs stmt.get()
    if (/RETURNING/i.test(converted) && /^(INSERT|UPDATE|DELETE)/i.test(converted.trim())) {
      const stmt = database.prepare(converted);
      const row = convertedParams.length ? stmt.get(...convertedParams) : stmt.get();
      return Promise.resolve({ rows: row ? [row] : [], rowCount: row ? 1 : 0 });
    }
    const stmt = database.prepare(converted);
    const rows = convertedParams.length ? stmt.all(...convertedParams) : stmt.all();
    return Promise.resolve({ rows, rowCount: rows.length });
  }
  run(sql, ...params) {
    const database = getDb();
    const { sql: converted, params: convertedParams } = convertPlaceholders(sql, params);
    const stmt = database.prepare(converted);
    const info = convertedParams.length ? stmt.run(...convertedParams) : stmt.run();
    return Promise.resolve({ rowCount: info.changes });
  }
  exec(sql) {
    getDb().exec(sql);
    return Promise.resolve();
  }
}

const wrapper = new DbWrapper();
module.exports = wrapper;
module.exports.getDb = getDb;