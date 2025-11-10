const http = require('http');
const https = require('https');

// Test configuration
const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const useHttps = API_BASE.startsWith('https://');

function request(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const client = useHttps ? https : http;
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const payload = data ? JSON.stringify(data) : null;
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    
    const opts = {
      hostname: url.hostname,
      port: url.port || (useHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers
    };
    
    const req = client.request(opts, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = body ? JSON.parse(body) : null;
        } catch (e) {
          parsed = body;
        }
        resolve({ 
          status: res.statusCode, 
          body: parsed,
          headers: res.headers
        });
      });
    });
    
    req.on('error', reject);
    
    if (payload) {
      req.write(payload);
    }
    
    req.end();
  });
}

async function testAuthFlow() {
  console.log('===== Authentication Flow Test =====\n');
  console.log('API Base:', API_BASE);
  console.log('');
  
  const email = `test+${Date.now()}@example.com`;
  const password = 'TestPassword123!';
  let userToken = null;
  let userId = null;
  
  try {
    // Test 1: Health check
    console.log('Test 1: Health check');
    const health = await request('/api/health');
    console.log('Status:', health.status);
    console.log('Response:', JSON.stringify(health.body, null, 2));
    if (health.status !== 200) {
      throw new Error('Health check failed');
    }
    console.log('✓ Health check passed\n');
    
    // Test 2: Register new user
    console.log('Test 2: Register new user');
    console.log('Email:', email);
    const register = await request('/api/register', 'POST', {
      name: 'Test User',
      email,
      password,
      phone: '1234567890'
    });
    console.log('Status:', register.status);
    if (register.status !== 201) {
      console.log('Response:', JSON.stringify(register.body, null, 2));
      throw new Error('Registration failed');
    }
    if (!register.body.token) {
      throw new Error('No token in registration response');
    }
    userToken = register.body.token;
    userId = register.body.user?.users_id || register.body.user?.user_id || register.body.user?.id;
    console.log('User ID:', userId);
    console.log('Token received:', userToken.substring(0, 20) + '...');
    console.log('✓ Registration successful\n');
    
    // Test 3: Login with credentials
    console.log('Test 3: Login with credentials');
    const login = await request('/api/login', 'POST', {
      email,
      password
    });
    console.log('Status:', login.status);
    if (login.status !== 200) {
      console.log('Response:', JSON.stringify(login.body, null, 2));
      throw new Error('Login failed');
    }
    if (!login.body.token) {
      throw new Error('No token in login response');
    }
    userToken = login.body.token;
    console.log('Token received:', userToken.substring(0, 20) + '...');
    console.log('✓ Login successful\n');
    
    // Test 4: Access protected endpoint without token (should fail)
    console.log('Test 4: Access protected endpoint without token');
    const ordersNoAuth = await request('/api/orders', 'GET');
    console.log('Status:', ordersNoAuth.status);
    if (ordersNoAuth.status === 200) {
      throw new Error('Protected endpoint accessible without token');
    }
    console.log('✓ Protected endpoint correctly requires authentication\n');
    
    // Test 5: Access protected endpoint with invalid token (should fail)
    console.log('Test 5: Access protected endpoint with invalid token');
    const ordersInvalidAuth = await request('/api/orders', 'GET', null, 'invalid-token-12345');
    console.log('Status:', ordersInvalidAuth.status);
    if (ordersInvalidAuth.status === 200) {
      throw new Error('Protected endpoint accessible with invalid token');
    }
    console.log('✓ Protected endpoint rejects invalid token\n');
    
    // Test 6: Access admin endpoint as regular user (should fail)
    console.log('Test 6: Access admin endpoint as regular user');
    const usersAsUser = await request('/api/users', 'GET', null, userToken);
    console.log('Status:', usersAsUser.status);
    if (usersAsUser.status === 200) {
      throw new Error('Admin endpoint accessible to regular user');
    }
    console.log('✓ Admin endpoint correctly requires admin role\n');
    
    // Test 7: Try to login with wrong password
    console.log('Test 7: Login with wrong password');
    const wrongPassword = await request('/api/login', 'POST', {
      email,
      password: 'wrongpassword'
    });
    console.log('Status:', wrongPassword.status);
    if (wrongPassword.status === 200) {
      throw new Error('Login succeeded with wrong password');
    }
    console.log('✓ Wrong password correctly rejected\n');
    
    // Test 8: Try to register duplicate email
    console.log('Test 8: Register with duplicate email');
    const duplicate = await request('/api/register', 'POST', {
      name: 'Another User',
      email,
      password: 'AnotherPassword123!'
    });
    console.log('Status:', duplicate.status);
    if (duplicate.status === 201) {
      throw new Error('Duplicate registration succeeded');
    }
    console.log('✓ Duplicate email correctly rejected\n');
    
    console.log('===== All tests passed! =====');
    return true;
    
  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    if (err.stack) {
      console.error('Stack:', err.stack);
    }
    return false;
  }
}

// Run tests
testAuthFlow().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
