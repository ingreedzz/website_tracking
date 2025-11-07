const http = require('http')

function request(path, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data)
    const opts = { hostname: 'localhost', port: 3000, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } }
    const req = http.request(opts, (res) => {
      let body = ''
      res.on('data', c => body += c)
      res.on('end', () => {
        resolve({ status: res.statusCode, body: body ? JSON.parse(body) : null })
      })
    })
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

;(async () => {
  try {
    const email = `e2e+${Date.now()}@example.com`
    const password = 'Secret123'
    console.log('Registering', email)
    const reg = await request('/api/register', { name: 'E2E Test', email, password })
    console.log('Register result:', reg.status, reg.body)

    console.log('Logging in')
    const login = await request('/api/login', { email, password })
    console.log('Login result:', login.status, login.body)
  } catch (err) {
    console.error('Test error:', err)
  }
})()
