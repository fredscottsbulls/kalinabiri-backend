const sql = "SELECT * FROM users WHERE username=$1 AND password_hash=$2";
const params = ['admin', 'admin123'];
let idx = 0;
const converted = sql.replace(/\$[0-9]+/g, () => '?' + (++idx > params.length ? '' : ''));
console.log('converted:', converted);
console.log('paramCount:', (converted.match(/\?/g)||[]).length);
console.log('convertedParams:', params.slice(0, (converted.match(/\?/g)||[]).length));