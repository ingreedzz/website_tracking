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
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password required' });

    console.log('[REGISTER] incoming:', { name, email, phone })

    const hashed = await bcrypt.hash(password, 10);

    // Using Supabase exclusively (MySQL fallback removed)

    if (!REST_BASE) return res.status(500).json({ error: 'Supabase not configured' })
    try {
      // Check for existing email
      const checkUrl = `${REST_BASE}/users?select=*&email=eq.${encodeURIComponent(email)}`;
      const checkResp = await axios.get(checkUrl, { headers: SB_HEADERS });
      const existing = Array.isArray(checkResp.data) && checkResp.data.length ? checkResp.data[0] : null;
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const url = `${REST_BASE}/users`;
      const body = [{ name, email, password: hashed, phone }];
      const resp = await axios.post(url, body, { headers: { ...SB_HEADERS, Prefer: 'return=representation' } });
      const created = Array.isArray(resp.data) && resp.data.length ? resp.data[0] : null;
      if (!created) return res.status(500).json({ error: 'Failed to create user' });
      if (created.password) delete created.password;

      // Sign a JWT for the created user - use only users_id
      const payload = { 
        users_id: created.users_id, 
        email: created.email, 
        role: created.role || 'customer' 
      };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

      res.status(201).json({ user: created, token });
    } catch (err) {
      console.error('[REGISTER] axios error', err && err.response ? { status: err.response.status, data: err.response.data } : err.message)
      const msg = err.response && err.response.data ? err.response.data : err.message;
      // If Supabase returned a duplicate constraint message, normalize it
      if (err.response && err.response.status === 409) return res.status(409).json({ error: 'Email already registered' });
      res.status(400).json({ error: msg });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    console.log('[LOGIN] incoming:', { email })
    
    // Using Supabase exclusively (MySQL fallback removed)

    if (!REST_BASE) return res.status(500).json({ error: 'Supabase not configured' })
    try {
      const url = `${REST_BASE}/users?select=*&email=eq.${encodeURIComponent(email)}`;
      const resp = await axios.get(url, { headers: SB_HEADERS });
      const rows = Array.isArray(resp.data) ? resp.data : [];
      const data = rows.length ? rows[0] : null;
      console.log('[LOGIN] axios response rows=', rows.length)
      if (!data) return res.status(401).json({ error: 'Invalid credentials' });
      const match = await bcrypt.compare(password, data.password || '');
      if (!match) return res.status(401).json({ error: 'Invalid credentials' });
      delete data.password;
      // Sign a JWT and return with user - use only users_id
      const payload = { 
        users_id: data.users_id, 
        email: data.email, 
        role: data.role || 'customer' 
      };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
      res.json({ user: data, token });
    } catch (err) {
      console.error('[LOGIN] axios error', err && err.response ? { status: err.response.status, data: err.response.data } : err.message)
      res.status(500).json({ error: err.message });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
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
  console.log('[GET /orders] Fetching all orders for admin');
  const requestUserId = req.user?.users_id || req.user?.user_id || null;
  const requestUserRole = req.user?.role || null;
  console.log('[GET /orders] User:', { users_id: requestUserId, role: requestUserRole });
  try {
    if (!REST_BASE) return res.status(500).json({ error: 'Supabase not configured' })
    // include related order_items in the response for admin UI
    const url = `${REST_BASE}/orders?select=*,order_items(*)`;
    console.log('[GET /orders] Fetching from Supabase:', url);
    const resp = await axios.get(url, { headers: SB_HEADERS });
    const orders = Array.isArray(resp.data) ? resp.data : [];
    console.log('[GET /orders] Retrieved orders:', orders.length);
    
    // Normalize response: add 'id' field and flatten order_items data
    const normalized = orders.map(order => {
      const firstItem = order.order_items && order.order_items.length > 0 ? order.order_items[0] : null;
      return {
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
        custom: firstItem?.customization || {}
      };
    });
    
    console.log('[GET /orders] Normalized orders:', normalized.length);
    res.json(normalized);
  } catch (err) {
    console.error('[ORDERS] axios error', err && err.response ? { status: err.response.status, data: err.response.data } : err.message)
    res.status(500).json({ error: err.message });
  }
});

// User-specific orders endpoint (no admin required)
router.get('/user/orders', verifyToken, async (req, res) => {
  console.log('[GET /user/orders] Fetching orders for user');
  const requestUserId = req.user?.users_id || req.user?.user_id || null;
  const requestUserRole = req.user?.role || null;
  console.log('[GET /user/orders] User:', { users_id: requestUserId, role: requestUserRole });
  try {
  const userId = req.user?.users_id || req.user?.user_id || null;
    if (!userId) {
      console.error('[GET /user/orders] No user ID');
      return res.status(401).json({ error: 'User ID not found' });
    }
    
    if (!REST_BASE) return res.status(500).json({ error: 'Supabase not configured' })
    
    // Fetch only orders for this user
    const url = `${REST_BASE}/orders?user_id=eq.${encodeURIComponent(userId)}&select=*,order_items(*)`;
    console.log('[GET /user/orders] Fetching from Supabase:', url);
    const resp = await axios.get(url, { headers: SB_HEADERS });
    const orders = Array.isArray(resp.data) ? resp.data : [];
    console.log('[GET /user/orders] Retrieved orders:', orders.length);
    
    // Normalize response: add 'id' field and flatten order_items data
    const normalized = orders.map(order => {
      const firstItem = order.order_items && order.order_items.length > 0 ? order.order_items[0] : null;
      return {
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
        custom: firstItem?.customization || {}
      };
    });
    
    console.log('[GET /user/orders] Normalized orders:', normalized.length);
    res.json(normalized);
  } catch (err) {
    console.error('[GET /user/orders] error', err && err.response ? { status: err.response.status, data: err.response.data } : err.message)
    res.status(500).json({ error: err.message });
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
  try {
    const q = req.query || {}
    let query = supabase.from('payments').select('*')
    if (q.order_id) query = query.eq('order_id', q.order_id)
    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message || error })
    res.json(Array.isArray(data) ? data : [])
  } catch (err) {
    res.status(500).json({ error: err.message })
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
    const { product, model, size, color, address, phone, quantity, unit_price, total_price, deadline, custom } = req.body;
    
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
      
      console.log(`[REQ:${requestId}] [ORDER] Order Object to Insert:`);
      console.log(`[REQ:${requestId}] [ORDER]   user_id: ${orderObj.user_id}`);
      console.log(`[REQ:${requestId}] [ORDER]   status: ${orderObj.status}`);
      console.log(`[REQ:${requestId}] [ORDER]   total: ${orderObj.total}`);
      console.log(`[REQ:${requestId}] [ORDER]   order_date: ${orderObj.order_date}`);
      console.log(`[REQ:${requestId}] [ORDER]   deadline: ${orderObj.deadline || 'not set'}`);
      console.log(`[REQ:${requestId}] [ORDER]   payment_status: ${orderObj.payment_status}`);
      
      console.log(`[REQ:${requestId}] [ORDER] Inserting into 'orders' table...`);
      const orderInsertStart = Date.now();
      
      const { data: orderInsert, error: orderErr } = await supabase.from('orders').insert([orderObj]).select().maybeSingle();
      
      const orderInsertDuration = Date.now() - orderInsertStart;
      
      if (orderErr || !orderInsert) {
        console.error(`[REQ:${requestId}] [ORDER] ❌ ERROR: Insert order failed after ${orderInsertDuration}ms`);
        console.error(`[REQ:${requestId}] [ORDER] Error Message: ${orderErr?.message || 'no error object'}`);
        console.error(`[REQ:${requestId}] [ORDER] Error Details: ${orderErr?.details || 'none'}`);
        console.error(`[REQ:${requestId}] [ORDER] Error Hint: ${orderErr?.hint || 'none'}`);
        console.error(`[REQ:${requestId}] [ORDER] Error Code: ${orderErr?.code || 'none'}`);
        console.error(`[REQ:${requestId}] [ORDER] Insert Data: ${orderInsert ? JSON.stringify(orderInsert) : 'null'}`);
        console.error(`[REQ:${requestId}] [ORDER] Full Error:`, JSON.stringify(orderErr, null, 2));
        
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
      console.log('[ORDER] ✓ Order created successfully:', { orders_id: orderInsert.orders_id });

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
  try {
  // User is already authenticated via middleware
  const userId = req.user?.users_id || req.user?.user_id || null;

    const orderId = req.params.id;
    if (!orderId) return res.status(400).json({ error: 'order id required' });

    // verify order exists
    const { data: orderRows, error: orderErr } = await supabase.from('orders').select('*').eq('orders_id', orderId).maybeSingle();
    if (orderErr) return res.status(500).json({ error: 'Failed to query order' });
    if (!orderRows) return res.status(404).json({ error: 'Order not found' });

    // accept file upload (optional)
    let proofPath = null;
    if (req.file) {
      const file = req.file;
      const ext = (file.originalname && file.originalname.split('.').pop()) || 'jpg';
      const path = `users/${userId}/payments/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const contentType = file.mimetype || 'application/octet-stream';
      const { data: upData, error: upErr } = await supabase.storage.from(UPLOAD_BUCKET).upload(path, file.buffer, { contentType });
      if (upErr) {
        console.error('[PAYMENT] storage upload error', upErr)
        return res.status(500).json({ error: 'Failed to upload payment proof' });
      }
      proofPath = upData.path;
    }

    const amount = req.body.amount ? Number(req.body.amount) : null;
    const method = req.body.method || 'bank_transfer';
    const notes = req.body.notes || null;

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
      console.error('[PAYMENT] insert error', payErr)
      // cleanup upload if present
      if (proofPath) await supabase.storage.from(UPLOAD_BUCKET).remove([proofPath]).catch(() => {});
      return res.status(500).json({ error: 'Failed to record payment' });
    }

    // update orders.payment_status to pending (or keep as provided)
    await supabase.from('orders').update({ payment_status: 'pending' }).eq('orders_id', orderId).catch(() => {});

    return res.status(201).json({ payment: paymentInsert });
  } catch (err) {
    console.error('[server/orders/:id/payment] handler error', err)
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
