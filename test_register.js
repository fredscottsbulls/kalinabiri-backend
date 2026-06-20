// Standalone test - exactly simulates what server.js does
process.env.DATABASE_URL = undefined;
const dbUrl = process.env.DATABASE_URL;
const isSqlite = !dbUrl || dbUrl.includes('railway.internal');
console.log('isSqlite:', isSqlite, 'dbUrl:', dbUrl);

const pool = require('./db.js');
const bcrypt = require('bcryptjs');

const username = 'fresh_' + Date.now();
const email = username + '@test.com';
const password = 'Test1234';
const role = 'teacher';
const first_name = 'John';
const last_name = 'Doe';

const hash = bcrypt.hashSync(password, 10);
const sql = `INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone, class, stream, gender, status)
 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active') RETURNING id,username,email,role`;
const params = [username, email, hash, role, first_name, last_name, '', '', '', ''];

console.log('Executing INSERT with RETURNING...');
pool.query(sql, params).then(r => {
  console.log('SUCCESS:', JSON.stringify(r));
  process.exit(0);
}).catch(e => {
  console.log('ERROR:', e.message);
  console.log('Stack:', e.stack);
  process.exit(1);
});
