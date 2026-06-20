// Test: force the issue by calling through HTTP via node's http module
const http = require('http');

const data = JSON.stringify({
  username: 't_' + Date.now(),
  email: 't_' + Date.now() + '@test.com',
  password: 'Test1234',
  role: 'teacher',
  first_name: 'John',
  last_name: 'Doe'
});

const options = {
  hostname: '127.0.0.1',
  port: 3000,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
  });
});
req.on('error', e => console.error('Request error:', e));
req.write(data);
req.end();
