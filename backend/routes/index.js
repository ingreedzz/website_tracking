const express = require('express');
const axios = require('axios');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const supabase = require('../supabaseClient');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(express.json());

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'dev_jwt_secret';
const UPLOAD_BUCKET = process.env.SUPABASE_UPLOAD_BUCKET || 'sablon-images';

// multer setup — keep file in memory for direct upload to Supabase
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[ROUTES] Supabase Configuration Missing:', {
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
        SUPABASE_KEY: !!process.env.SUPABASE_KEY,
        VITE_SUPABASE_ANON_KEY: !!process.env.VITE_SUPABASE_ANON_KEY
    });
}
const REST_BASE = SUPABASE_URL ? SUPABASE_URL.replace(/\/$/, '') + '/rest/v1' : null;
const SB_HEADERS = SUPABASE_KEY ? { 
    apikey: SUPABASE_KEY, 
    Authorization: `Bearer ${SUPABASE_KEY}`, 
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
} : {};

// MySQL fallback removed — use Supabase only

router.post('/register', async (req, res) => {
  const requestId = req.id || 'unknown';
  console.log(`[REQ:${requestId}] [REGISTER] === Starting user registration ===`);
  console.log(`[REQ:${requestId}] [REGISTER] Timestamp:`, new Date().toISOString());
  
  try {
    // Step 1: Extract and validate input
    console.log(`[REQ:${requestId}] [REGISTER] Step 1: Extracting input data`);
    const { name, email, password, phone, role } = req.body;
    console.log(`[REQ:${requestId}] [REGISTER] Input:`, { 
      name, 
      email, 
      phone: phone || '(not provided)',
      role: role || '(will use default)',
      hasPassword: !!password 
    });
    
    if (!name || !email || !password) {
      console.error(`[REQ:${requestId}] [REGISTER] ❌ Missing required fields`);
      return res.status(400).json({ error: 'name, email and password required' });
    }
    console.log(`[REQ:${requestId}] [REGISTER] ✓ Input validation passed`);

    // Step 2: Validate Supabase configuration
    console.log(`[REQ:${requestId}] [REGISTER] Step 2: Validating Supabase configuration`);
    if (!REST_BASE) {
      console.error(`[REQ:${requestId}] [REGISTER] ❌ REST_BASE not configured`);
      return res.status(500).json({ error: 'Supabase not configured' });
    }
    if (!SUPABASE_KEY) {
      console.error(`[REQ:${requestId}] [REGISTER] ❌ SUPABASE_KEY not configured`);
      return res.status(500).json({ error: 'Supabase credentials missing' });
    }
    console.log(`[REQ:${requestId}] [REGISTER] ✓ Supabase configuration validated`);

    // Step 3: Hash password
    console.log(`[REQ:${requestId}] [REGISTER] Step 3: Hashing password`);
    const hashed = await bcrypt.hash(password, 10);
    console.log(`[REQ:${requestId}] [REGISTER] ✓ Password hashed`);

    // Step 4: Check for existing email
    console.log(`[REQ:${requestId}] [REGISTER] Step 4: Checking for existing email`);
    const checkUrl = `${REST_BASE}/users?select=*&email=eq.${encodeURIComponent(email)}`;
    try {
      const checkResp = await axios.get(checkUrl, { headers: SB_HEADERS, timeout: 5000 });
      const existing = Array.isArray(checkResp.data) && checkResp.data.length ? checkResp.data[0] : null;
      
      if (existing) {
        console.warn(`[REQ:${requestId}] [REGISTER] ⚠️  Email already registered`);
        console.warn(`[REQ:${requestId}] [REGISTER] Existing user ID:`, existing.users_id);
        return res.status(409).json({ error: 'Email already registered' });
      }
      console.log(`[REQ:${requestId}] [REGISTER] ✓ Email is available`);
    } catch (checkErr) {
      console.error(`[REQ:${requestId}] [REGISTER] ❌ Failed to check existing email`);
      console.error(`[REQ:${requestId}] [REGISTER] Error:`, checkErr.message);
      if (checkErr.response) {
        console.error(`[REQ:${requestId}] [REGISTER] Response status:`, checkErr.response.status);
        console.error(`[REQ:${requestId}] [REGISTER] Response data:`, checkErr.response.data);
      }
      throw checkErr;
    }

    // Step 5: Determine user role
    console.log(`[REQ:${requestId}] [REGISTER] Step 5: Determining user role`);
    // Allow role to be specified for testing/development, but default to 'customer'
    // In production, you may want to remove the role parameter entirely
    const userRole = role && ['customer', 'admin'].includes(role) ? role : 'customer';
    const isAdmin = userRole === 'admin';
    
    if (role && role !== userRole) {
      console.warn(`[REQ:${requestId}] [REGISTER] ⚠️  Invalid role '${role}' provided, using 'customer'`);
    }
    
    console.log(`[REQ:${requestId}] [REGISTER] User role:`, userRole);
    console.log(`[REQ:${requestId}] [REGISTER] Is admin:`, isAdmin);
    
    // Step 6: Create user in database
    console.log(`[REQ:${requestId}] [REGISTER] Step 6: Creating user in database`);
    const url = `${REST_BASE}/users`;
    const body = [{ 
      name, 
      email, 
      password: hashed, 
      phone: phone || null,
      role: userRole,
      is_admin: isAdmin
    }];
    
    console.log(`[REQ:${requestId}] [REGISTER] Creating user with role:`, userRole);
    
    try {
      const resp = await axios.post(url, body, { 
        headers: { ...SB_HEADERS, Prefer: 'return=representation' },
        timeout: 10000
      });
      
      const created = Array.isArray(resp.data) && resp.data.length ? resp.data[0] : null;
      
      if (!created) {
        console.error(`[REQ:${requestId}] [REGISTER] ❌ No data returned from database`);
        return res.status(500).json({ error: 'Failed to create user' });
      }
      
      console.log(`[REQ:${requestId}] [REGISTER] ✓ User created successfully`);
      console.log(`[REQ:${requestId}] [REGISTER] User ID:`, created.users_id);
      console.log(`[REQ:${requestId}] [REGISTER] User role:`, created.role);
      console.log(`[REQ:${requestId}] [REGISTER] Is admin:`, created.is_admin);
      
      // Remove password from response
      if (created.password) delete created.password;

      // Step 7: Generate JWT token
      console.log(`[REQ:${requestId}] [REGISTER] Step 7: Generating JWT token`);
      const payload = { 
        users_id: created.users_id, 
        email: created.email, 
        role: created.role || 'customer' 
      };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
      console.log(`[REQ:${requestId}] [REGISTER] ✓ JWT token generated`);
      
      console.log(`[REQ:${requestId}] [REGISTER] === Registration complete ===`);
      res.status(201).json({ user: created, token });
      
    } catch (createErr) {
      console.error(`[REQ:${requestId}] [REGISTER] ❌ Failed to create user`);
      console.error(`[REQ:${requestId}] [REGISTER] Error:`, createErr.message);
      
      if (createErr.response) {
        console.error(`[REQ:${requestId}] [REGISTER] Response status:`, createErr.response.status);
        console.error(`[REQ:${requestId}] [REGISTER] Response data:`, JSON.stringify(createErr.response.data));
        
        if (createErr.response.status === 409) {
          return res.status(409).json({ error: 'Email already registered' });
        }
      }
      
      if (createErr.code === 'ECONNABORTED') {
        console.error(`[REQ:${requestId}] [REGISTER] Request timeout`);
        return res.status(504).json({ error: 'Database request timeout' });
      }
      
      const msg = createErr.response?.data || createErr.message;
      res.status(400).json({ 
        error: msg,
        details: process.env.NODE_ENV === 'development' ? createErr.message : undefined
      });
    }
    
  } catch (err) {
    console.error(`[REQ:${requestId}] [REGISTER] ❌ Unexpected error`);
    console.error(`[REQ:${requestId}] [REGISTER] Error name:`, err.name);
    console.error(`[REQ:${requestId}] [REGISTER] Error message:`, err.message);
    console.error(`[REQ:${requestId}] [REGISTER] Stack:`, err.stack);
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

router.post('/login', async (req, res) => {
  const requestId = req.id || 'unknown';
  console.log(`[REQ:${requestId}] [LOGIN] === Starting user login ===`);
  console.log(`[REQ:${requestId}] [LOGIN] Timestamp:`, new Date().toISOString());
  
  try {
    // Step 1: Extract and validate input
    console.log(`[REQ:${requestId}] [LOGIN] Step 1: Extracting input data`);
    const { email, password } = req.body;
    console.log(`[REQ:${requestId}] [LOGIN] Input:`, { 
      email, 
      hasPassword: !!password 
    });
    
    if (!email || !password) {
      console.error(`[REQ:${requestId}] [LOGIN] ❌ Missing required fields`);
      return res.status(400).json({ error: 'email and password required' });
    }
    console.log(`[REQ:${requestId}] [LOGIN] ✓ Input validation passed`);

    // Step 2: Validate Supabase configuration
    console.log(`[REQ:${requestId}] [LOGIN] Step 2: Validating Supabase configuration`);
    if (!REST_BASE) {
      console.error(`[REQ:${requestId}] [LOGIN] ❌ REST_BASE not configured`);
      return res.status(500).json({ error: 'Supabase not configured' });
    }
    if (!SUPABASE_KEY) {
      console.error(`[REQ:${requestId}] [LOGIN] ❌ SUPABASE_KEY not configured`);
      return res.status(500).json({ error: 'Supabase credentials missing' });
    }
    console.log(`[REQ:${requestId}] [LOGIN] ✓ Supabase configuration validated`);
    
    // Step 3: Fetch user from database
    console.log(`[REQ:${requestId}] [LOGIN] Step 3: Fetching user from database`);
    const url = `${REST_BASE}/users?select=*&email=eq.${encodeURIComponent(email)}`;
    
    try {
      const resp = await axios.get(url, { 
        headers: SB_HEADERS,
        timeout: 5000
      });
      
      const rows = Array.isArray(resp.data) ? resp.data : [];
      const data = rows.length ? rows[0] : null;
      
      console.log(`[REQ:${requestId}] [LOGIN] Database query result:`, {
        rowsFound: rows.length,
        userFound: !!data
      });
      
      if (!data) {
        console.warn(`[REQ:${requestId}] [LOGIN] ⚠️  No user found with email:`, email);
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      console.log(`[REQ:${requestId}] [LOGIN] ✓ User found`);
      console.log(`[REQ:${requestId}] [LOGIN] User details:`, {
        users_id: data.users_id,
        email: data.email,
        name: data.name,
        role: data.role,
        is_admin: data.is_admin,
        hasPassword: !!data.password
      });
      
      // Step 4: Verify password
      console.log(`[REQ:${requestId}] [LOGIN] Step 4: Verifying password`);
      const match = await bcrypt.compare(password, data.password || '');
      
      if (!match) {
        console.warn(`[REQ:${requestId}] [LOGIN] ⚠️  Password mismatch for user:`, data.users_id);
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      console.log(`[REQ:${requestId}] [LOGIN] ✓ Password verified`);
      
      // Remove password from response
      delete data.password;
      
      // Step 5: Generate JWT token
      console.log(`[REQ:${requestId}] [LOGIN] Step 5: Generating JWT token`);
      const payload = { 
        users_id: data.users_id, 
        email: data.email, 
        role: data.role || 'customer' 
      };
      
      console.log(`[REQ:${requestId}] [LOGIN] Token payload:`, {
        users_id: payload.users_id,
        email: payload.email,
        role: payload.role
      });
      
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
      console.log(`[REQ:${requestId}] [LOGIN] ✓ JWT token generated`);
      
      console.log(`[REQ:${requestId}] [LOGIN] === Login complete ===`);
      console.log(`[REQ:${requestId}] [LOGIN] User role:`, data.role);
      console.log(`[REQ:${requestId}] [LOGIN] Is admin:`, data.is_admin);
      
      res.json({ user: data, token });
      
    } catch (fetchErr) {
      console.error(`[REQ:${requestId}] [LOGIN] ❌ Failed to fetch user`);
      console.error(`[REQ:${requestId}] [LOGIN] Error:`, fetchErr.message);
      
      if (fetchErr.response) {
        console.error(`[REQ:${requestId}] [LOGIN] Response status:`, fetchErr.response.status);
        console.error(`[REQ:${requestId}] [LOGIN] Response data:`, JSON.stringify(fetchErr.response.data));
      }
      
      if (fetchErr.code === 'ECONNABORTED') {
        console.error(`[REQ:${requestId}] [LOGIN] Request timeout`);
        return res.status(504).json({ error: 'Database request timeout' });
      }
      
      res.status(500).json({ 
        error: 'Database error',
        details: process.env.NODE_ENV === 'development' ? fetchErr.message : undefined
      });
    }
    
  } catch (err) {
    console.error(`[REQ:${requestId}] [LOGIN] ❌ Unexpected error`);
    console.error(`[REQ:${requestId}] [LOGIN] Error name:`, err.name);
    console.error(`[REQ:${requestId}] [LOGIN] Error message:`, err.message);
    console.error(`[REQ:${requestId}] [LOGIN] Stack:`, err.stack);
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

router.get('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    if (!REST_BASE) return res.status(500).json({ error: 'Supabase not configured' })
    const url = `${REST_BASE}/users?select=users_id,name,email,phone,role`;
    const resp = await axios.get(url, { headers: SB_HEADERS });
    res.json(Array.isArray(resp.data) ? resp.data : []);
  } catch (err) {
    console.error('[USERS] axios error', err && err.response ? { status: err.response.status, data: err.response.data } : err.message)
    res.status(500).json({ error: err.message });
  }
});

router.get('/orders', verifyToken, requireAdmin, async (req, res) => {
  console.log('[GET /orders] === Fetching all orders for admin ===');
  console.log('[GET /orders] Timestamp:', new Date().toISOString());
  const requestUserId = req.user?.users_id || req.user?.user_id || null;
  const requestUserRole = req.user?.role || null;
  console.log('[GET /orders] Admin user:', { users_id: requestUserId, role: requestUserRole });
  
  try {
    // Step 1: Validate Supabase configuration
    if (!REST_BASE) {
      console.error('[GET /orders] ❌ REST_BASE not configured');
      return res.status(500).json({ error: 'Supabase not configured' });
    }
    
    // Step 2: Fetch orders with related data
    console.log('[GET /orders] Step 1: Fetching orders with order_items');
    // Include order_items and user information via REST API
    const url = `${REST_BASE}/orders?select=*,order_items(*)`;
    console.log('[GET /orders] Query URL:', url);
    
    const resp = await axios.get(url, { 
      headers: SB_HEADERS,
      timeout: 15000 // 15 second timeout for admin queries
    });
    
    const orders = Array.isArray(resp.data) ? resp.data : [];
    console.log('[GET /orders] ✓ Retrieved', orders.length, 'orders from database');
    
    // Step 3: Fetch user information for all orders
    console.log('[GET /orders] Step 2: Fetching user information');
    const userIds = [...new Set(orders.map(o => o.user_id).filter(Boolean))];
    console.log('[GET /orders] Found', userIds.length, 'unique user IDs');
    
    let users = {};
    if (userIds.length > 0) {
      try {
        // Fetch users in bulk
        const usersUrl = `${REST_BASE}/users?select=users_id,name,email,phone&users_id=in.(${userIds.join(',')})`;
        const usersResp = await axios.get(usersUrl, { 
          headers: SB_HEADERS,
          timeout: 5000
        });
        
        const usersArray = Array.isArray(usersResp.data) ? usersResp.data : [];
        console.log('[GET /orders] ✓ Retrieved', usersArray.length, 'user records');
        
        // Create a lookup map
        usersArray.forEach(user => {
          users[user.users_id] = user;
        });
      } catch (userErr) {
        console.warn('[GET /orders] ⚠️  Failed to fetch users:', userErr.message);
        // Continue without user data
      }
    }
    
    // Step 4: Normalize response data
    console.log('[GET /orders] Step 3: Normalizing order data');
    const normalized = orders.map(order => {
      const firstItem = order.order_items && order.order_items.length > 0 ? order.order_items[0] : null;
      
      // Get user info
      const user = users[order.user_id];
      
      // Generate public URL for sablon image if path exists
      let sablonUrl = null;
      if (firstItem?.sablon_path && supabase) {
        try {
          const { data: pu } = supabase.storage.from(UPLOAD_BUCKET).getPublicUrl(firstItem.sablon_path);
          sablonUrl = pu?.publicUrl || null;
        } catch (e) {
          console.warn('[GET /orders] ⚠️  Failed to get public URL for:', firstItem.sablon_path);
        }
      }
      
      // Extract product info with fallbacks
      const productSnapshot = firstItem?.product_snapshot || {};
      
      return {
        ...order,
        id: order.orders_id, // Add id field for frontend compatibility
        // User information
        user_name: user?.name || 'Unknown Customer',
        user_email: user?.email || '',
        user_phone: user?.phone || '',
        // Product information
        product: productSnapshot.product || 'Unknown Product',
        model: productSnapshot.model || 'N/A',
        size: productSnapshot.size || 'N/A',
        color: productSnapshot.color || 'N/A',
        quantity: firstItem?.quantity || 0,
        unit_price: firstItem?.unit_price || 0,
        total_price: order.total || 0,
        sablon_path: firstItem?.sablon_path || null,
        sablon_url: sablonUrl,
        custom: firstItem?.customization || {}
      };
    });
    
    console.log('[GET /orders] ✓ Normalized', normalized.length, 'orders successfully');
    console.log('[GET /orders] === Admin orders fetch complete ===');
    
    res.json(normalized);
    
  } catch (err) {
    console.error('[GET /orders] === Fatal error ===');
    console.error('[GET /orders] Error name:', err.name);
    console.error('[GET /orders] Error message:', err.message);
    
    if (err.response) {
      console.error('[GET /orders] Response status:', err.response.status);
      console.error('[GET /orders] Response data:', JSON.stringify(err.response.data));
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch orders',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// User-specific orders endpoint (no admin required)
router.get('/user/orders', verifyToken, async (req, res) => {
  console.log('[GET /user/orders] === Starting user orders fetch ===');
  console.log('[GET /user/orders] Timestamp:', new Date().toISOString());
  const requestUserId = req.user?.users_id || req.user?.user_id || null;
  const requestUserRole = req.user?.role || null;
  console.log('[GET /user/orders] User:', { users_id: requestUserId, role: requestUserRole });
  
  try {
    // Step 1: Validate user authentication
    console.log('[GET /user/orders] Step 1: Validating user authentication');
    const userId = req.user?.users_id || req.user?.user_id || null;
    if (!userId) {
      console.error('[GET /user/orders] ❌ No user ID in request');
      return res.status(401).json({ error: 'User ID not found' });
    }
    console.log('[GET /user/orders] ✓ User ID validated:', userId);
    
    // Step 2: Validate Supabase configuration
    console.log('[GET /user/orders] Step 2: Validating Supabase configuration');
    if (!REST_BASE) {
      console.error('[GET /user/orders] ❌ REST_BASE not configured');
      return res.status(500).json({ error: 'Supabase not configured' });
    }
    if (!SUPABASE_KEY) {
      console.error('[GET /user/orders] ❌ SUPABASE_KEY not configured');
      return res.status(500).json({ error: 'Supabase credentials missing' });
    }
    console.log('[GET /user/orders] ✓ Supabase configuration validated');
    
    // Step 3: Fetch orders from database with timeout protection
    console.log('[GET /user/orders] Step 3: Fetching orders from database');
    const url = `${REST_BASE}/orders?user_id=eq.${encodeURIComponent(userId)}&select=*,order_items(*)`;
    console.log('[GET /user/orders] Query URL:', url);
    
    let resp;
    try {
      resp = await axios.get(url, { 
        headers: SB_HEADERS,
        timeout: 10000 // 10 second timeout to prevent hanging
      });
    } catch (axiosErr) {
      console.error('[GET /user/orders] ❌ Axios request failed');
      console.error('[GET /user/orders] Error details:', {
        message: axiosErr.message,
        code: axiosErr.code,
        status: axiosErr.response?.status,
        statusText: axiosErr.response?.statusText,
        data: axiosErr.response?.data
      });
      
      if (axiosErr.code === 'ECONNABORTED') {
        return res.status(504).json({ error: 'Database request timeout' });
      }
      if (axiosErr.response?.status === 404) {
        // Table might not exist or wrong endpoint
        return res.status(500).json({ error: 'Database table not found' });
      }
      if (axiosErr.response?.status >= 500) {
        return res.status(502).json({ error: 'Database server error' });
      }
      
      throw axiosErr; // Re-throw for generic handler
    }
    
    const orders = Array.isArray(resp.data) ? resp.data : [];
    console.log('[GET /user/orders] ✓ Retrieved', orders.length, 'orders from database');
    
    // Step 4: Normalize response data
    console.log('[GET /user/orders] Step 4: Normalizing order data');
    const normalized = [];
    
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      console.log(`[GET /user/orders] Processing order ${i + 1}/${orders.length}:`, order.orders_id);
      
      try {
        const firstItem = order.order_items && order.order_items.length > 0 ? order.order_items[0] : null;
        
        // Log if order has no items
        if (!firstItem) {
          console.warn('[GET /user/orders] ⚠️  Order has no items:', order.orders_id);
        }
        
        // Generate public URL for sablon image if path exists
        let sablonUrl = null;
        if (firstItem?.sablon_path && supabase) {
          try {
            const { data: pu } = supabase.storage.from(UPLOAD_BUCKET).getPublicUrl(firstItem.sablon_path);
            sablonUrl = pu?.publicUrl || null;
          } catch (e) {
            console.warn('[GET /user/orders] ⚠️  Failed to get public URL for:', firstItem.sablon_path, e.message);
          }
        }
        
        // Extract product info with fallbacks
        const productSnapshot = firstItem?.product_snapshot || {};
        const product = productSnapshot.product || 'Unknown Product';
        const model = productSnapshot.model || 'N/A';
        const size = productSnapshot.size || 'N/A';
        const color = productSnapshot.color || 'N/A';
        
        normalized.push({
          ...order,
          id: order.orders_id, // Add id field for frontend compatibility
          product: product,
          model: model,
          size: size,
          color: color,
          quantity: firstItem?.quantity || 0,
          unit_price: firstItem?.unit_price || 0,
          total_price: order.total || 0,
          sablon_path: firstItem?.sablon_path || null,
          sablon_url: sablonUrl,
          custom: firstItem?.customization || {},
          // Add payment info for frontend display
          payment_status: order.payment_status || 'unpaid',
          payment_proof_path: null, // Will be fetched separately if needed
          payment_proof_url: null
        });
        
      } catch (normalizeErr) {
        console.error('[GET /user/orders] ❌ Error normalizing order:', order.orders_id);
        console.error('[GET /user/orders] Normalization error:', normalizeErr.message);
        // Continue processing other orders
      }
    }
    
    console.log('[GET /user/orders] ✓ Normalized', normalized.length, 'orders successfully');
    console.log('[GET /user/orders] === User orders fetch complete ===');
    
    res.json(normalized);
    
  } catch (err) {
    console.error('[GET /user/orders] === Fatal error ===');
    console.error('[GET /user/orders] Error name:', err.name);
    console.error('[GET /user/orders] Error message:', err.message);
    console.error('[GET /user/orders] Error stack:', err.stack);
    
    if (err.response) {
      console.error('[GET /user/orders] Response status:', err.response.status);
      console.error('[GET /user/orders] Response data:', JSON.stringify(err.response.data));
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch orders',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

router.get('/orders/:id', verifyToken, async (req, res) => {
  console.log('[GET /orders/:id] Fetching order details');
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'order id required' });
    console.log('[GET /orders/:id] Order ID:', id);
    const requestUserId = req.user?.users_id || req.user?.user_id || null;
    const requestUserRole = req.user?.role || null;
    console.log('[GET /orders/:id] User:', { users_id: requestUserId, role: requestUserRole });
    
    if (!REST_BASE) return res.status(500).json({ error: 'Supabase not configured' })
    const url = `${REST_BASE}/orders?orders_id=eq.${encodeURIComponent(id)}&select=*,order_items(*)`;
    console.log('[GET /orders/:id] Fetching from Supabase:', url);
    const resp = await axios.get(url, { headers: SB_HEADERS });
    const rows = Array.isArray(resp.data) ? resp.data : [];
    console.log('[GET /orders/:id] Found orders:', rows.length);
    
    if (!rows.length) {
      console.log('[GET /orders/:id] Order not found');
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Ownership check: users can only access their own orders unless admin
    const order = rows[0];
    console.log('[GET /orders/:id] Order user_id:', order.user_id);
    const isAdmin = requestUserRole === 'admin';
    console.log('[GET /orders/:id] Access check:', { 
      isAdmin: isAdmin,
      orderUserId: order.user_id,
      requestUserId: requestUserId,
      match: order.user_id === requestUserId
    });
    
    if (!isAdmin && order.user_id !== requestUserId) {
      console.log('[GET /orders/:id] Access denied');
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Normalize response: add 'id' field and flatten order_items data
    const firstItem = order.order_items && order.order_items.length > 0 ? order.order_items[0] : null;
    
    // Generate public URL for sablon image if path exists
    let sablonUrl = null;
    if (firstItem?.sablon_path && supabase) {
      try {
        const { data: pu } = supabase.storage.from(UPLOAD_BUCKET).getPublicUrl(firstItem.sablon_path);
        sablonUrl = pu?.publicUrl || null;
      } catch (e) {
        console.warn('[GET /orders/:id] Failed to get public URL for:', firstItem.sablon_path);
      }
    }
    
    // Generate public URL for payment proof if exists
    let paymentProofUrl = null;
    if (order.payment_proof_url && supabase) {
      try {
        // Check if it's already a full URL
        if (order.payment_proof_url.startsWith('http://') || order.payment_proof_url.startsWith('https://')) {
          paymentProofUrl = order.payment_proof_url;
        } else {
          // It's a storage path, generate public URL
          const { data: pu } = supabase.storage.from(UPLOAD_BUCKET).getPublicUrl(order.payment_proof_url);
          paymentProofUrl = pu?.publicUrl || null;
        }
      } catch (e) {
        console.warn('[GET /orders/:id] Failed to get public URL for payment proof:', order.payment_proof_url);
      }
    }
    
    const normalized = {
      ...order,
      id: order.orders_id, // Add id field for frontend compatibility
      product: firstItem?.product_snapshot?.product || null,
      model: firstItem?.product_snapshot?.model || null,
      size: firstItem?.product_snapshot?.size || null,
      color: firstItem?.product_snapshot?.color || null,
      quantity: firstItem?.quantity || null,
      unit_price: firstItem?.unit_price || null,
      total_price: order.total || null,
      sablon_path: firstItem?.sablon_path || null,
      sablon_url: sablonUrl,
      payment_proof_path: order.payment_proof_url || null,
      payment_proof_url: paymentProofUrl,
      custom: firstItem?.customization || {}
    };
    
    console.log('[GET /orders/:id] Returning normalized order');
    res.json(normalized);
  } catch (err) {
    console.error('[ORDERS/:id] axios error', err && err.response ? { status: err.response.status, data: err.response.data } : err.message)
    res.status(500).json({ error: err.message });
  }
});

// Simple proxy endpoints for order_addresses and payments for admin UI
router.get('/order_addresses', verifyToken, requireAdmin, async (req, res) => {
  try {
    const q = req.query || {}
    let query = supabase.from('order_addresses').select('*')
    if (q.order_id) query = query.eq('order_id', q.order_id)
    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message || error })
    res.json(Array.isArray(data) ? data : [])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/payments', verifyToken, requireAdmin, async (req, res) => {
  console.log('[GET /payments] === Fetching payments for admin ===');
  console.log('[GET /payments] Timestamp:', new Date().toISOString());
  
  try {
    const q = req.query || {};
    console.log('[GET /payments] Query params:', q);
    
    // Fetch payments with order and order_items information
    let query = supabase
      .from('payments')
      .select(`
        *,
        orders:order_id (
          orders_id,
          user_id,
          total,
          status,
          payment_status,
          created_at,
          order_items (
            product_snapshot,
            quantity,
            unit_price
          )
        )
      `);
    
    if (q.order_id) {
      query = query.eq('order_id', q.order_id);
      console.log('[GET /payments] Filtering by order_id:', q.order_id);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[GET /payments] ❌ Database error:', error);
      return res.status(500).json({ error: error.message || error });
    }
    
    const payments = Array.isArray(data) ? data : [];
    console.log('[GET /payments] Retrieved', payments.length, 'payment records');
    
    // Normalize payments to include product information
    const normalized = payments.map(payment => {
      const order = payment.orders;
      const firstItem = order?.order_items?.[0];
      const productSnapshot = firstItem?.product_snapshot || {};
      
      return {
        ...payment,
        // Add order summary for easier display
        order_summary: {
          order_id: order?.orders_id || payment.order_id,
          product: productSnapshot.product || 'Unknown Product',
          model: productSnapshot.model || 'N/A',
          quantity: firstItem?.quantity || 0,
          total: order?.total || payment.amount || 0,
          order_status: order?.status || 'unknown',
          payment_status: order?.payment_status || 'unknown'
        }
      };
    });
    
    console.log('[GET /payments] Normalized', normalized.length, 'payment records');
    console.log('[GET /payments] === Fetch complete ===');
    
    res.json(normalized);
  } catch (err) {
    console.error('[GET /payments] === Fatal error ===');
    console.error('[GET /payments] Error:', err.message);
    console.error('[GET /payments] Stack:', err.stack);
    res.status(500).json({ error: err.message });
  }
})

// Create order (used by frontend: POST /api/server/orders)
router.post('/server/orders', verifyToken, upload.single('file'), async (req, res) => {
  const requestId = req.id || 'unknown';
  const orderStartTime = Date.now();
  
  console.log(`[REQ:${requestId}] [ORDER] ${'='.repeat(60)}`);
  console.log(`[REQ:${requestId}] [ORDER] === New Order Creation Request ===`);
  console.log(`[REQ:${requestId}] [ORDER] Timestamp: ${new Date().toISOString()}`);
  console.log(`[REQ:${requestId}] [ORDER] ${'='.repeat(60)}`);
  
  console.log(`[REQ:${requestId}] [ORDER] Request Details:`);
  console.log(`[REQ:${requestId}] [ORDER]   Content-Type: ${req.headers['content-type']}`);
  console.log(`[REQ:${requestId}] [ORDER]   Content-Length: ${req.headers['content-length'] || 'unknown'}`);
  console.log(`[REQ:${requestId}] [ORDER]   Authorization: ${req.headers.authorization ? 'Bearer <present>' : 'missing'}`);
  console.log(`[REQ:${requestId}] [ORDER]   User-Agent: ${(req.headers['user-agent'] || 'unknown').substring(0, 50)}`);
  
  console.log(`[REQ:${requestId}] [ORDER] Body Fields:`, Object.keys(req.body));
  console.log(`[REQ:${requestId}] [ORDER] Body Data:`, JSON.stringify(req.body, null, 2));
  
  if (req.file) {
    console.log(`[REQ:${requestId}] [ORDER] File Uploaded:`);
    console.log(`[REQ:${requestId}] [ORDER]   Field Name: ${req.file.fieldname}`);
    console.log(`[REQ:${requestId}] [ORDER]   Original Name: ${req.file.originalname}`);
    console.log(`[REQ:${requestId}] [ORDER]   MIME Type: ${req.file.mimetype}`);
    console.log(`[REQ:${requestId}] [ORDER]   Size: ${req.file.size} bytes (${(req.file.size / 1024).toFixed(2)} KB)`);
    console.log(`[REQ:${requestId}] [ORDER]   Encoding: ${req.file.encoding || 'not set'}`);
    console.log(`[REQ:${requestId}] [ORDER]   Buffer Available: ${!!req.file.buffer}`);
  } else {
    console.log(`[REQ:${requestId}] [ORDER] File: NO FILE UPLOADED`);
  }
  
  if (req.user) {
    console.log(`[REQ:${requestId}] [ORDER] User from Token:`);
    console.log(`[REQ:${requestId}] [ORDER]   User ID: ${req.user.users_id || req.user.user_id || 'not found'}`);
    console.log(`[REQ:${requestId}] [ORDER]   Email: ${req.user.email || 'not set'}`);
    console.log(`[REQ:${requestId}] [ORDER]   Role: ${req.user.role || 'not set'}`);
  } else {
    console.error(`[REQ:${requestId}] [ORDER] User: NO USER ON REQUEST`);
  }

  try {
    // User is already authenticated via middleware
    console.log(`[REQ:${requestId}] [ORDER] ${'─'.repeat(60)}`);
    console.log(`[REQ:${requestId}] [ORDER] STEP 1: VALIDATING AUTHENTICATION`);
    console.log(`[REQ:${requestId}] [ORDER] ${'─'.repeat(60)}`);
    
    const step1Start = Date.now();
    const userId = req.user && req.user.users_id ? req.user.users_id : (req.user && req.user.user_id ? req.user.user_id : null);
    
    console.log(`[REQ:${requestId}] [ORDER] Extracted User ID: ${userId || 'NULL'}`);
    console.log(`[REQ:${requestId}] [ORDER] req.user structure:`, JSON.stringify(req.user, null, 2));
    
    if (!userId) {
      console.error(`[REQ:${requestId}] [ORDER] ❌ ERROR: No user ID available`);
      console.error(`[REQ:${requestId}] [ORDER] Available fields on req.user:`, Object.keys(req.user || {}));
      return res.status(401).json({ 
        error: 'Authentication required',
        details: 'User ID not found in token',
        code: 'MISSING_USER_ID'
      });
    }
    
    const step1Duration = Date.now() - step1Start;
    console.log(`[REQ:${requestId}] [ORDER] ✓ Authentication validated (${step1Duration}ms)`);

    // validate body
    console.log(`[REQ:${requestId}] [ORDER] ${'─'.repeat(60)}`);
    console.log(`[REQ:${requestId}] [ORDER] STEP 2: VALIDATING REQUEST BODY`);
    console.log(`[REQ:${requestId}] [ORDER] ${'─'.repeat(60)}`);
    
    const step2Start = Date.now();
    const { product, model, size, color, address, phone, quantity, unit_price, total_price, deadline, custom, customer_name, order_name } = req.body;
    
    console.log(`[REQ:${requestId}] [ORDER] Extracted Fields:`);
    console.log(`[REQ:${requestId}] [ORDER]   product: ${product || 'MISSING'}`);
    console.log(`[REQ:${requestId}] [ORDER]   model: ${model || 'MISSING'}`);
    console.log(`[REQ:${requestId}] [ORDER]   size: ${size || 'not set'}`);
    console.log(`[REQ:${requestId}] [ORDER]   color: ${color || 'not set'}`);
    console.log(`[REQ:${requestId}] [ORDER]   quantity: ${quantity || 'not set'}`);
    console.log(`[REQ:${requestId}] [ORDER]   unit_price: ${unit_price || 'not set'}`);
    console.log(`[REQ:${requestId}] [ORDER]   total_price: ${total_price || 'not set'}`);
    console.log(`[REQ:${requestId}] [ORDER]   deadline: ${deadline || 'not set'}`);
    console.log(`[REQ:${requestId}] [ORDER]   custom: ${custom ? `present (type: ${typeof custom})` : 'not set'}`);
    console.log(`[REQ:${requestId}] [ORDER]   address: ${address || 'not set'}`);
    console.log(`[REQ:${requestId}] [ORDER]   phone: ${phone || 'not set'}`);
    console.log(`[REQ:${requestId}] [ORDER]   customer_name: ${customer_name || 'not set'}`);
    console.log(`[REQ:${requestId}] [ORDER]   order_name: ${order_name || 'not set'}`);
    
    if (!product || !model || !req.file) {
      console.error(`[REQ:${requestId}] [ORDER] ❌ ERROR: Validation failed`);
      console.error(`[REQ:${requestId}] [ORDER]   product: ${product ? 'PRESENT' : 'MISSING'}`);
      console.error(`[REQ:${requestId}] [ORDER]   model: ${model ? 'PRESENT' : 'MISSING'}`);
      console.error(`[REQ:${requestId}] [ORDER]   file: ${req.file ? 'PRESENT' : 'MISSING'}`);
      
      return res.status(400).json({ 
        error: 'product, model and file are required',
        details: {
          product: product ? 'present' : 'missing',
          model: model ? 'present' : 'missing',
          file: req.file ? 'present' : 'missing'
        },
        code: 'VALIDATION_ERROR'
      });
    }
    
    const step2Duration = Date.now() - step2Start;
    console.log(`[REQ:${requestId}] [ORDER] ✓ Validation passed (${step2Duration}ms)`);

    // upload file to Supabase Storage
    console.log(`[REQ:${requestId}] [ORDER] ${'─'.repeat(60)}`);
    console.log(`[REQ:${requestId}] [ORDER] STEP 3: UPLOADING FILE TO SUPABASE STORAGE`);
    console.log(`[REQ:${requestId}] [ORDER] ${'─'.repeat(60)}`);
    
    const step3Start = Date.now();
    const file = req.file;
    const ext = (file.originalname && file.originalname.split('.').pop()) || 'jpg';
    const path = `users/${userId}/sablons/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const contentType = file.mimetype || 'application/octet-stream';
    
    console.log(`[REQ:${requestId}] [ORDER] File Upload Details:`);
    console.log(`[REQ:${requestId}] [ORDER]   Storage Path: ${path}`);
    console.log(`[REQ:${requestId}] [ORDER]   Content-Type: ${contentType}`);
    console.log(`[REQ:${requestId}] [ORDER]   File Extension: ${ext}`);
    console.log(`[REQ:${requestId}] [ORDER]   Original Filename: ${file.originalname}`);
    console.log(`[REQ:${requestId}] [ORDER]   Buffer Size: ${file.buffer ? file.buffer.length : 0} bytes`);
    console.log(`[REQ:${requestId}] [ORDER]   Upload Bucket: ${UPLOAD_BUCKET}`);
    console.log(`[REQ:${requestId}] [ORDER]   Supabase Client: ${supabase ? 'INITIALIZED' : 'NOT INITIALIZED'}`);

    if (!supabase) {
      console.error(`[REQ:${requestId}] [ORDER] ❌ ERROR: Supabase client not initialized`);
      console.error(`[REQ:${requestId}] [ORDER] Environment Check:`, {
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
        SUPABASE_KEY: !!process.env.SUPABASE_KEY,
        VITE_SUPABASE_ANON_KEY: !!process.env.VITE_SUPABASE_ANON_KEY
      });
      
      return res.status(500).json({ 
        error: 'Database connection not available',
        details: 'Supabase client not initialized. Check environment variables.',
        code: 'DB_NOT_INITIALIZED'
      });
    }
    
    console.log(`[REQ:${requestId}] [ORDER] Attempting file upload to Supabase Storage...`);
    const uploadStart = Date.now();
    
    const { data: upData, error: upErr } = await supabase.storage.from(UPLOAD_BUCKET).upload(path, file.buffer, { contentType });
    
    const uploadDuration = Date.now() - uploadStart;
    
    if (upErr) {
      console.error(`[REQ:${requestId}] [ORDER] ❌ ERROR: Storage upload failed after ${uploadDuration}ms`);
      console.error(`[REQ:${requestId}] [ORDER] Error Type: ${upErr.name || 'Unknown'}`);
      console.error(`[REQ:${requestId}] [ORDER] Error Message: ${upErr.message}`);
      console.error(`[REQ:${requestId}] [ORDER] Status Code: ${upErr.statusCode || 'not set'}`);
      console.error(`[REQ:${requestId}] [ORDER] Error Code: ${upErr.error || upErr.code || 'not set'}`);
      console.error(`[REQ:${requestId}] [ORDER] Full Error:`, JSON.stringify(upErr, null, 2));
      
      return res.status(500).json({ 
        error: 'Failed to upload file',
        details: upErr.message || 'Storage upload error',
        code: 'STORAGE_UPLOAD_ERROR'
      });
    }
    
    console.log(`[REQ:${requestId}] [ORDER] ✓ File uploaded successfully (${uploadDuration}ms)`);
    console.log(`[REQ:${requestId}] [ORDER] Upload Result:`);
    console.log(`[REQ:${requestId}] [ORDER]   Path: ${upData.path}`);
    console.log(`[REQ:${requestId}] [ORDER]   ID: ${upData.id || 'not set'}`);
    console.log(`[REQ:${requestId}] [ORDER]   Full Path: ${upData.fullPath || 'not set'}`);
    
    const step3Duration = Date.now() - step3Start;
    console.log(`[REQ:${requestId}] [ORDER] ✓ Step 3 complete (${step3Duration}ms)`);

    try {
      console.log(`[REQ:${requestId}] [ORDER] ${'─'.repeat(60)}`);
      console.log(`[REQ:${requestId}] [ORDER] STEP 4: CREATING ORDER IN DATABASE`);
      console.log(`[REQ:${requestId}] [ORDER] ${'─'.repeat(60)}`);
      
      const step4Start = Date.now();
      
      // Calculate total price
      const calculatedTotal = total_price ? Number(total_price) : (unit_price ? Number(unit_price) * (Number(quantity || 1)) : 0);
      
      const orderObj = {
        user_id: userId,
        status: 'created',
        total: calculatedTotal,
        notes: null,
        order_date: new Date().toISOString(),
        deadline: deadline || null,
        payment_status: 'pending'
      };
      
      // Conditionally add customer_name and order_name if provided
      // These fields will only be included if the DB has the columns
      if (customer_name) {
        orderObj.customer_name = customer_name;
        console.log(`[REQ:${requestId}] [ORDER]   Including customer_name: ${customer_name}`);
      }
      if (order_name) {
        orderObj.order_name = order_name;
        console.log(`[REQ:${requestId}] [ORDER]   Including order_name: ${order_name}`);
      }
      
      console.log(`[REQ:${requestId}] [ORDER] Order Object to Insert:`);
      console.log(`[REQ:${requestId}] [ORDER]   user_id: ${orderObj.user_id}`);
      console.log(`[REQ:${requestId}] [ORDER]   status: ${orderObj.status}`);
      console.log(`[REQ:${requestId}] [ORDER]   total: ${orderObj.total}`);
      console.log(`[REQ:${requestId}] [ORDER]   order_date: ${orderObj.order_date}`);
      console.log(`[REQ:${requestId}] [ORDER]   deadline: ${orderObj.deadline || 'not set'}`);
      console.log(`[REQ:${requestId}] [ORDER]   payment_status: ${orderObj.payment_status}`);
      if (orderObj.customer_name) console.log(`[REQ:${requestId}] [ORDER]   customer_name: ${orderObj.customer_name}`);
      if (orderObj.order_name) console.log(`[REQ:${requestId}] [ORDER]   order_name: ${orderObj.order_name}`);
      
      console.log(`[REQ:${requestId}] [ORDER] Inserting into 'orders' table...`);
      const orderInsertStart = Date.now();
      
      let { data: orderInsert, error: orderErr } = await supabase.from('orders').insert([orderObj]).select().maybeSingle();
      
      const orderInsertDuration = Date.now() - orderInsertStart;
      
      if (orderErr || !orderInsert) {
        console.error(`[REQ:${requestId}] [ORDER] ❌ ERROR: Insert order failed after ${orderInsertDuration}ms`);
        console.error(`[REQ:${requestId}] [ORDER] Error Message: ${orderErr?.message || 'no error object'}`);
        console.error(`[REQ:${requestId}] [ORDER] Error Details: ${orderErr?.details || 'none'}`);
        console.error(`[REQ:${requestId}] [ORDER] Error Hint: ${orderErr?.hint || 'none'}`);
        console.error(`[REQ:${requestId}] [ORDER] Error Code: ${orderErr?.code || 'none'}`);
        console.error(`[REQ:${requestId}] [ORDER] Insert Data: ${orderInsert ? JSON.stringify(orderInsert) : 'null'}`);
        console.error(`[REQ:${requestId}] [ORDER] Full Error:`, JSON.stringify(orderErr, null, 2));
        
        // Check if error is due to missing columns (customer_name or order_name)
        const errMsg = orderErr?.message || '';
        const isMissingColumn = errMsg.includes('column') && (errMsg.includes('customer_name') || errMsg.includes('order_name'));
        
        if (isMissingColumn && (customer_name || order_name)) {
          console.warn(`[REQ:${requestId}] [ORDER] ⚠️  WARNING: customer_name/order_name columns don't exist in DB`);
          console.warn(`[REQ:${requestId}] [ORDER] Retrying without customer_name and order_name...`);
          
          // Retry without the new fields
          const retryOrderObj = {
            user_id: userId,
            status: 'created',
            total: calculatedTotal,
            notes: null,
            order_date: new Date().toISOString(),
            deadline: deadline || null,
            payment_status: 'pending'
          };
          
          const { data: retryInsert, error: retryErr } = await supabase.from('orders').insert([retryOrderObj]).select().maybeSingle();
          
          if (retryErr || !retryInsert) {
            console.error(`[REQ:${requestId}] [ORDER] ❌ Retry also failed:`, retryErr?.message);
            
            // cleanup uploaded file
            console.log(`[REQ:${requestId}] [ORDER] Initiating cleanup of uploaded file: ${upData.path}`);
            await supabase.storage.from(UPLOAD_BUCKET).remove([upData.path]).catch((e) => {
              console.warn(`[REQ:${requestId}] [ORDER] WARNING: Failed to cleanup file:`, e.message);
            });
            console.log(`[REQ:${requestId}] [ORDER] Cleanup complete`);
            
            return res.status(500).json({ 
              error: 'Failed to create order',
              details: retryErr?.message || 'Database insert failed'
            });
          }
          
          console.log(`[REQ:${requestId}] [ORDER] ✓ Order created successfully (without customer/order names)`);
          // Continue with retryInsert as orderInsert
          orderInsert = retryInsert;
        } else {
          // cleanup uploaded file
          console.log(`[REQ:${requestId}] [ORDER] Initiating cleanup of uploaded file: ${upData.path}`);
          await supabase.storage.from(UPLOAD_BUCKET).remove([upData.path]).catch((e) => {
            console.warn(`[REQ:${requestId}] [ORDER] WARNING: Failed to cleanup file:`, e.message);
          });
          console.log(`[REQ:${requestId}] [ORDER] Cleanup complete`);
          
          return res.status(500).json({ 
            error: 'Failed to create order',
            details: orderErr?.message || 'Database insert failed'
          });
        }
      } else {
        console.log(`[REQ:${requestId}] [ORDER] ✓ Order created successfully:`, { orders_id: orderInsert.orders_id });
      }

      // optionally insert delivery/billing address
      console.log('[ORDER] Step 5: Inserting order address (optional)...');
      try {
        if (address || phone) {
          const addrObj = {
            order_id: orderInsert.orders_id,
            address: address || null,
            phone: phone || null
          };
          console.log('[ORDER] Address object:', JSON.stringify(addrObj, null, 2));
          const { error: addrErr } = await supabase.from('order_addresses').insert([addrObj]);
          if (addrErr) {
            console.warn('[ORDER] WARNING: Failed to insert address:', JSON.stringify(addrErr, null, 2));
          } else {
            console.log('[ORDER] ✓ Address inserted successfully');
          }
        } else {
          console.log('[ORDER] No address/phone provided, skipping');
        }
      } catch (_e) {
        // non-fatal: log but continue
        console.warn('[ORDER] WARNING: Exception inserting order_addresses:', _e && _e.message ? _e.message : _e);
      }

      // Parse custom field with better error handling
      console.log('[ORDER] Step 5.5: Parsing custom field...');
      let customData = {};
      if (custom) {
        try {
          // Handle both string and object cases
          if (typeof custom === 'string') {
            const trimmed = custom.trim();
            if (trimmed && trimmed !== 'null' && trimmed !== 'undefined') {
              customData = JSON.parse(trimmed);
              // Ensure it's an object, not null or other primitive
              if (customData === null || typeof customData !== 'object' || Array.isArray(customData)) {
                console.warn('[ORDER] WARNING: custom parsed to non-object:', typeof customData, customData);
                customData = {};
              }
            }
          } else if (typeof custom === 'object' && custom !== null) {
            customData = custom;
          }
          console.log('[ORDER] ✓ Custom data parsed:', JSON.stringify(customData, null, 2));
        } catch (parseErr) {
          console.error('[ORDER] ERROR: Failed to parse custom field');
          console.error('[ORDER] Custom value:', custom);
          console.error('[ORDER] Parse error:', parseErr.message);
          // Continue with empty object rather than failing
          customData = {};
        }
      } else {
        console.log('[ORDER] No custom data provided');
      }

      // insert into order_items (lightweight snapshot)
      console.log('[ORDER] Step 6: Creating order item...');
      const itemObj = {
        order_id: orderInsert.orders_id,
        product_snapshot: { product: product, model: model, size: size, color: color },
        quantity: quantity ? Number(quantity) : 1,
        unit_price: unit_price ? Number(unit_price) : 0,
        customization: customData,
        calculated_price: total_price ? Number(total_price) : (unit_price ? Number(unit_price) * (Number(quantity || 1)) : 0),
        sablon_path: upData.path,
        color_id: null
      };
      console.log('[ORDER] Item object:', JSON.stringify(itemObj, null, 2));
      
      const { data: itemInsert, error: itemErr } = await supabase.from('order_items').insert([itemObj]).select().maybeSingle();
      if (itemErr || !itemInsert) {
        console.error('[ORDER] ERROR: Insert item failed');
        console.error('[ORDER] Item error:', JSON.stringify(itemErr, null, 2));
        console.error('[ORDER] Item insert data:', itemInsert);
        console.error('[ORDER] Error details:', {
          message: itemErr?.message,
          details: itemErr?.details,
          hint: itemErr?.hint,
          code: itemErr?.code
        });
        // cleanup: delete uploaded file and delete order
        console.log('[ORDER] Cleaning up: deleting order and file');
        await supabase.from('orders').delete().eq('orders_id', orderInsert.orders_id).catch((e) => {
          console.warn('[ORDER] Failed to delete order:', e);
        });
        await supabase.storage.from(UPLOAD_BUCKET).remove([upData.path]).catch((e) => {
          console.warn('[ORDER] Failed to cleanup file:', e);
        });
        return res.status(500).json({ 
          error: 'Failed to create order item',
          details: itemErr?.message || 'Database insert failed'
        });
      }
      console.log('[ORDER] ✓ Order item created successfully:', { items_id: itemInsert.items_id });

      // compute public URL (simple public URL; depending on bucket visibility)
      console.log('[ORDER] Step 7: Getting public URL for uploaded file...');
      let publicUrl = null;
      try {
        const { data: pu } = supabase.storage.from(UPLOAD_BUCKET).getPublicUrl(upData.path);
        publicUrl = pu && pu.publicUrl ? pu.publicUrl : null;
        console.log('[ORDER] ✓ Public URL:', publicUrl);
      } catch (_e) { 
        console.warn('[ORDER] WARNING: Failed to get public URL:', _e && _e.message ? _e.message : _e);
      }

      // Return created order in a frontend-friendly shape (id field)
      const out = {
        order: Object.assign({}, orderInsert, { id: orderInsert.orders_id, sablon_path: upData.path, sablon_url: publicUrl, item: itemInsert })
      };
      console.log('[ORDER] === Order creation successful ===');
      console.log('[ORDER] Response:', { order_id: out.order.id, status: out.order.status });
      return res.status(201).json(out);
    } catch (err) {
      console.error('[ORDER] === Unexpected error in order creation ===');
      console.error('[ORDER] Error name:', err.name);
      console.error('[ORDER] Error message:', err.message);
      console.error('[ORDER] Error stack:', err.stack);
      console.error('[ORDER] Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
      // cleanup upload
      if (upData && upData.path) {
        console.log('[ORDER] Cleaning up uploaded file:', upData.path);
        await supabase.storage.from(UPLOAD_BUCKET).remove([upData.path]).catch((e) => {
          console.warn('[ORDER] Failed to cleanup file:', e);
        });
      }
      // Return more details in development
      const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev';
      return res.status(500).json({ 
        error: 'Server error during order creation',
        details: isDev ? err.message : 'An internal error occurred',
        ...(isDev && { stack: err.stack })
      });
    }
  } catch (err) {
    console.error('[ORDER] === Handler-level error ===');
    console.error('[ORDER] Error:', err);
    console.error('[ORDER] Error stack:', err.stack);
    console.error('[ORDER] Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev';
    return res.status(500).json({ 
      error: 'Server error',
      details: isDev ? err.message || String(err) : 'An internal error occurred',
      ...(isDev && { stack: err.stack })
    });
  }
});

// Upload payment proof and create a payments row
router.post('/server/orders/:id/payment', verifyToken, upload.single('file'), async (req, res) => {
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  
  console.log(`[REQ:${requestId}] [PAYMENT] ${'='.repeat(60)}`);
  console.log(`[REQ:${requestId}] [PAYMENT] PAYMENT PROOF UPLOAD STARTED`);
  console.log(`[REQ:${requestId}] [PAYMENT] ${'='.repeat(60)}`);
  
  try {
    // User is already authenticated via middleware
    const userId = req.user?.users_id || req.user?.user_id || null;
    const orderId = req.params.id;
    
    console.log(`[REQ:${requestId}] [PAYMENT] STEP 1: VALIDATING REQUEST`);
    console.log(`[REQ:${requestId}] [PAYMENT]   User ID: ${userId || 'NOT SET'}`);
    console.log(`[REQ:${requestId}] [PAYMENT]   Order ID: ${orderId || 'NOT SET'}`);
    console.log(`[REQ:${requestId}] [PAYMENT]   File attached: ${req.file ? 'YES' : 'NO'}`);
    
    if (!orderId) {
      console.error(`[REQ:${requestId}] [PAYMENT] ❌ ERROR: No order ID provided`);
      return res.status(400).json({ error: 'order id required' });
    }
    
    if (!userId) {
      console.error(`[REQ:${requestId}] [PAYMENT] ❌ ERROR: No user ID found`);
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log(`[REQ:${requestId}] [PAYMENT] STEP 2: VERIFYING ORDER EXISTS`);
    const { data: orderRows, error: orderErr } = await supabase.from('orders').select('*').eq('orders_id', orderId).maybeSingle();
    
    if (orderErr) {
      console.error(`[REQ:${requestId}] [PAYMENT] ❌ ERROR: Failed to query order`);
      console.error(`[REQ:${requestId}] [PAYMENT]   Error:`, JSON.stringify(orderErr, null, 2));
      return res.status(500).json({ error: 'Failed to query order' });
    }
    
    if (!orderRows) {
      console.error(`[REQ:${requestId}] [PAYMENT] ❌ ERROR: Order not found`);
      return res.status(404).json({ error: 'Order not found' });
    }
    
    console.log(`[REQ:${requestId}] [PAYMENT] ✓ Order found`);
    console.log(`[REQ:${requestId}] [PAYMENT]   Order total: ${orderRows.total}`);
    console.log(`[REQ:${requestId}] [PAYMENT]   Current payment status: ${orderRows.payment_status || 'not set'}`);

    // Upload file to Supabase Storage
    let proofPath = null;
    let publicUrl = null;
    
    if (req.file) {
      console.log(`[REQ:${requestId}] [PAYMENT] STEP 3: UPLOADING PAYMENT PROOF`);
      const file = req.file;
      const ext = (file.originalname && file.originalname.split('.').pop()) || 'jpg';
      const path = `users/${userId}/payments/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const contentType = file.mimetype || 'application/octet-stream';
      
      console.log(`[REQ:${requestId}] [PAYMENT]   File name: ${file.originalname}`);
      console.log(`[REQ:${requestId}] [PAYMENT]   File size: ${file.size} bytes`);
      console.log(`[REQ:${requestId}] [PAYMENT]   Content type: ${contentType}`);
      console.log(`[REQ:${requestId}] [PAYMENT]   Storage path: ${path}`);
      
      const { data: upData, error: upErr } = await supabase.storage.from(UPLOAD_BUCKET).upload(path, file.buffer, { contentType });
      
      if (upErr) {
        console.error(`[REQ:${requestId}] [PAYMENT] ❌ ERROR: Storage upload failed`);
        console.error(`[REQ:${requestId}] [PAYMENT]   Error:`, JSON.stringify(upErr, null, 2));
        return res.status(500).json({ error: 'Failed to upload payment proof' });
      }
      
      proofPath = upData.path;
      console.log(`[REQ:${requestId}] [PAYMENT] ✓ File uploaded successfully`);
      console.log(`[REQ:${requestId}] [PAYMENT]   Stored at: ${proofPath}`);
      
      // Get public URL
      try {
        const { data: pu } = supabase.storage.from(UPLOAD_BUCKET).getPublicUrl(proofPath);
        publicUrl = pu?.publicUrl || null;
        console.log(`[REQ:${requestId}] [PAYMENT] ✓ Public URL generated: ${publicUrl}`);
      } catch (e) {
        console.warn(`[REQ:${requestId}] [PAYMENT] ⚠ WARNING: Failed to get public URL`, e.message);
      }
    } else {
      console.log(`[REQ:${requestId}] [PAYMENT] STEP 3: SKIPPED (no file attached)`);
    }

    const amount = req.body.amount ? Number(req.body.amount) : (orderRows.total || null);
    const method = req.body.payment_method || req.body.method || 'bank_transfer';
    const notes = req.body.notes || null;
    
    console.log(`[REQ:${requestId}] [PAYMENT] STEP 4: CREATING PAYMENT RECORD`);
    console.log(`[REQ:${requestId}] [PAYMENT]   Amount: ${amount}`);
    console.log(`[REQ:${requestId}] [PAYMENT]   Method: ${method}`);
    console.log(`[REQ:${requestId}] [PAYMENT]   Notes: ${notes || 'none'}`);

    const paymentObj = {
      order_id: orderId,
      amount: amount,
      method: method,
      status: 'pending',
      proof_url: proofPath,
      notes: notes
    };

    const { data: paymentInsert, error: payErr } = await supabase.from('payments').insert([paymentObj]).select().maybeSingle();
    
    if (payErr || !paymentInsert) {
      console.error(`[REQ:${requestId}] [PAYMENT] ❌ ERROR: Failed to create payment record`);
      console.error(`[REQ:${requestId}] [PAYMENT]   Error:`, JSON.stringify(payErr, null, 2));
      
      // cleanup upload if present
      if (proofPath) {
        console.log(`[REQ:${requestId}] [PAYMENT] Cleaning up uploaded file...`);
        await supabase.storage.from(UPLOAD_BUCKET).remove([proofPath]).catch(() => {});
      }
      return res.status(500).json({ error: 'Failed to record payment' });
    }
    
    console.log(`[REQ:${requestId}] [PAYMENT] ✓ Payment record created`);
    console.log(`[REQ:${requestId}] [PAYMENT]   Payment ID: ${paymentInsert.payment_id}`);

    console.log(`[REQ:${requestId}] [PAYMENT] STEP 5: UPDATING ORDER STATUS`);
    const { error: updateErr } = await supabase.from('orders').update({ payment_status: 'pending' }).eq('orders_id', orderId);
    
    if (updateErr) {
      console.warn(`[REQ:${requestId}] [PAYMENT] ⚠ WARNING: Failed to update order status`, updateErr.message);
    } else {
      console.log(`[REQ:${requestId}] [PAYMENT] ✓ Order payment_status updated to 'pending'`);
    }
    
    // Fetch updated order with items to return complete info
    console.log(`[REQ:${requestId}] [PAYMENT] STEP 6: FETCHING UPDATED ORDER`);
    const { data: updatedOrder, error: fetchErr } = await supabase.from('orders')
      .select('*,order_items(*)')
      .eq('orders_id', orderId)
      .maybeSingle();
    
    if (fetchErr || !updatedOrder) {
      console.warn(`[REQ:${requestId}] [PAYMENT] ⚠ WARNING: Failed to fetch updated order`, fetchErr?.message);
    } else {
      console.log(`[REQ:${requestId}] [PAYMENT] ✓ Updated order fetched`);
    }

    console.log(`[REQ:${requestId}] [PAYMENT] ${'='.repeat(60)}`);
    console.log(`[REQ:${requestId}] [PAYMENT] PAYMENT UPLOAD COMPLETE`);
    console.log(`[REQ:${requestId}] [PAYMENT] ${'='.repeat(60)}`);

    // Return payment and order with public URL
    return res.status(201).json({ 
      payment: paymentInsert,
      order: updatedOrder ? {
        ...updatedOrder,
        id: updatedOrder.orders_id,
        payment_proof_path: proofPath,
        payment_proof_url: publicUrl
      } : null
    });
    
  } catch (err) {
    console.error(`[REQ:${requestId}] [PAYMENT] ${'='.repeat(60)}`);
    console.error(`[REQ:${requestId}] [PAYMENT] UNEXPECTED ERROR`);
    console.error(`[REQ:${requestId}] [PAYMENT] ${'='.repeat(60)}`);
    console.error(`[REQ:${requestId}] [PAYMENT] Error name:`, err.name);
    console.error(`[REQ:${requestId}] [PAYMENT] Error message:`, err.message);
    console.error(`[REQ:${requestId}] [PAYMENT] Error stack:`, err.stack);
    
    return res.status(500).json({ error: err.message || String(err) });
  }
});

// Update order status and record history (admin only)
router.put('/server/orders/:id/status', verifyToken, requireAdmin, async (req, res) => {
  try {
  // User is already authenticated via middleware
  const userId = req.user?.users_id || req.user?.user_id || null;

    const orderId = req.params.id;
    const { status, note } = req.body;
    if (!orderId || !status) return res.status(400).json({ error: 'order id and new status required' });

    // fetch current order
    const { data: orderRow } = await supabase.from('orders').select('*').eq('orders_id', orderId).maybeSingle();
    if (!orderRow) return res.status(404).json({ error: 'Order not found' });
    const oldStatus = orderRow.status || null;

    // update order (status and optional payment_status)
    const updates = { status: status };
    if (req.body && req.body.payment_status) updates.payment_status = req.body.payment_status;
    const { data: updatedOrder, error: updErr } = await supabase.from('orders').update(updates).eq('orders_id', orderId).select().maybeSingle();
    if (updErr) {
      console.error('[ORDER STATUS] update error', updErr)
      return res.status(500).json({ error: 'Failed to update order status' });
    }

    // insert status history
    const histObj = {
      order_id: orderId,
      old_status: oldStatus,
      new_status: status,
      changed_by: userId,
      note: note || null
    };
    const { data: histIns, error: histErr } = await supabase.from('order_status_history').insert([histObj]).select().maybeSingle();
    if (histErr) {
      console.warn('[ORDER STATUS] failed to insert history', histErr)
    }

    // if payment_status was provided and payments exist, try to update payments rows
    try {
      if (req.body && req.body.payment_status) {
        await supabase.from('payments').update({ status: req.body.payment_status }).eq('order_id', orderId).catch(() => {});
      }
    } catch (_e) { /* non-fatal */ }

    return res.json({ order: updatedOrder, history: histIns || null });
  } catch (err) {
    console.error('[server/orders/:id/status] handler error', err)
    return res.status(500).json({ error: err.message || String(err) });
  }
});

// Get all models (with size_fields if column exists)
router.get('/models', async (req, res) => {
  const requestId = req.id || 'unknown';
  console.log(`[REQ:${requestId}] [MODELS] === Fetching models ===`);
  
  try {
    if (!REST_BASE) {
      console.error(`[REQ:${requestId}] [MODELS] REST_BASE not configured`);
      return res.status(500).json({ 
        error: 'Database configuration missing',
        code: 'DB_NOT_CONFIGURED'
      });
    }
    
    // Try to fetch models with size_fields
    // If size_fields column doesn't exist, it will be null/undefined
    console.log(`[REQ:${requestId}] [MODELS] Fetching from database...`);
    const modelsResp = await axios.get(`${REST_BASE}/models?select=models_id,name,description,size_fields`, {
      headers: SB_HEADERS,
      timeout: 10000
    });
    
    const models = modelsResp.data || [];
    console.log(`[REQ:${requestId}] [MODELS] ✓ Retrieved ${models.length} models`);
    
    // Normalize models - ensure size_fields is always an array
    const normalizedModels = models.map(m => ({
      id: m.models_id,
      models_id: m.models_id,
      name: m.name || 'Unknown Model',
      description: m.description || '',
      size_fields: Array.isArray(m.size_fields) ? m.size_fields : []
    }));
    
    res.json(normalizedModels);
  } catch (err) {
    console.error(`[REQ:${requestId}] [MODELS] Error:`, err.message);
    
    // If the error is about column not existing, return empty size_fields
    if (err.response && err.response.data && err.response.data.message) {
      const errMsg = err.response.data.message;
      if (errMsg.includes('column') && errMsg.includes('size_fields')) {
        console.warn(`[REQ:${requestId}] [MODELS] size_fields column doesn't exist, falling back`);
        
        // Fetch without size_fields column
        try {
          const fallbackResp = await axios.get(`${REST_BASE}/models?select=models_id,name,description`, {
            headers: SB_HEADERS,
            timeout: 10000
          });
          
          const models = fallbackResp.data || [];
          const normalizedModels = models.map(m => ({
            id: m.models_id,
            models_id: m.models_id,
            name: m.name || 'Unknown Model',
            description: m.description || '',
            size_fields: [] // Empty array when column doesn't exist
          }));
          
          return res.json(normalizedModels);
        } catch (fallbackErr) {
          console.error(`[REQ:${requestId}] [MODELS] Fallback also failed:`, fallbackErr.message);
        }
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch models',
      details: err.message,
      code: 'MODELS_FETCH_ERROR'
    });
  }
});

// Health check endpoint to verify Supabase connectivity
router.get('/health', async (req, res) => {
  try {
    if (!REST_BASE) {
      return res.status(500).json({ 
        status: 'error',
        message: 'Supabase not configured',
        config: {
          hasSupabaseUrl: !!SUPABASE_URL,
          hasSupabaseKey: !!SUPABASE_KEY,
          hasRestBase: !!REST_BASE
        }
      });
    }

    // Try a simple query to verify database connection
  const url = `${REST_BASE}/users?select=count`;
  await axios.get(url, { headers: SB_HEADERS });
    
    res.json({ 
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      config: {
        hasSupabaseUrl: !!SUPABASE_URL,
        hasSupabaseKey: !!SUPABASE_KEY,
        hasRestBase: !!REST_BASE
      }
    });
  } catch (err) {
    console.error('[HEALTH] Supabase connection error:', err.message);
    res.status(500).json({ 
      status: 'error',
      message: err.message,
      details: err.response?.data || null,
      config: {
        hasSupabaseUrl: !!SUPABASE_URL,
        hasSupabaseKey: !!SUPABASE_KEY,
        hasRestBase: !!REST_BASE
      }
    });
  }
});

module.exports = router;
