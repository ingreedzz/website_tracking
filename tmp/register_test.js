const http = require('http')
const data = JSON.stringify({ name: 'Test User', email: `test+${Date.now()}@example.com`, password: 'Secret123' })
const options = { hostname: 'localhost', port: 3000, path: '/api/register', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }
const req = http.request(options, (res) => {
  let body = ''
  res.on('data', chunk => body += chunk)
  res.on('end', () => { console.log('Status:', res.statusCode); console.log('Body:', body) })
})
req.on('error', (e) => console.error('Request error', e))
req.write(data)
req.end()
