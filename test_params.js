// Test convertPlaceholders directly from db.js
const Database = require('better-sqlite3');
const path = require('path');
const DB_PATH = path.join(__dirname, 'kalinabiri.db');
const db = new Database(DB_PATH);

function convertPlaceholders(sql, params) {
  const converted = sql.replace(/\$(\d+)/g, '?');
  const paramCount = (converted.match(/\?/g) || []).length;
  const convertedParams = params.slice(0, paramCount);
  return { sql: converted, params: convertedParams };
}

const sql = `INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone, class, stream, gender, status)
 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active') RETURNING id,username,email,role`;
const params = ['alice_new2', 'alice_new2@test.com', 'hash', 'teacher', 'Alice', 'Smith', '', '', '', ''];

console.log('Original SQL:', sql);
console.log('Params:', params);
console.log('');

const { sql: converted, params: convertedParams } = convertPlaceholders(sql, params);
console.log('Converted SQL:', converted);
console.log('Converted Params:', convertedParams);
console.log('Param needed:', (converted.match(/\?/g) || []).length);
console.log('Param got:', convertedParams.length);
console.log('');

const stmt = db.prepare(converted);
try {
  const row = stmt.get(...convertedParams);
  console.log('stmt.get SUCCESS:', row);
} catch(e) {
  console.log('stmt.get ERROR:', e.message);
}

// Now test with stmt.all()
const stmt2 = db.prepare(converted);
try {
  const rows = stmt2.all(...convertedParams);
  console.log('stmt.all SUCCESS:', rows);
} catch(e) {
  console.log('stmt.all ERROR:', e.message);
}
