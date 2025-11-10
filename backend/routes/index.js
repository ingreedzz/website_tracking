const express = require('express');
const axios = require('axios');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const supabase = require('../supabaseClient');

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

      // Sign a JWT for the created user
      const payload = { user_id: created.user_id || created.id || created.userId || null, email: created.email, role: created.role || 'customer' };
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
      // Sign a JWT and return with user
      const payload = { user_id: data.user_id || data.id || data.userId || null, email: data.email, role: data.role || 'customer' };
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

router.get('/users', async (req, res) => {
  try {
    if (!REST_BASE) return res.status(500).json({ error: 'Supabase not configured' })
    const url = `${REST_BASE}/users?select=user_id,name,email,phone,role`;
    const resp = await axios.get(url, { headers: SB_HEADERS });
    res.json(Array.isArray(resp.data) ? resp.data : []);
  } catch (err) {
    console.error('[USERS] axios error', err && err.response ? { status: err.response.status, data: err.response.data } : err.message)
    res.status(500).json({ error: err.message });
  }
});

router.get('/orders', async (req, res) => {
  try {
    if (!REST_BASE) return res.status(500).json({ error: 'Supabase not configured' })
    const url = `${REST_BASE}/orders?select=*`;
    const resp = await axios.get(url, { headers: SB_HEADERS });
    res.json(Array.isArray(resp.data) ? resp.data : []);
  } catch (err) {
    console.error('[ORDERS] axios error', err && err.response ? { status: err.response.status, data: err.response.data } : err.message)
    res.status(500).json({ error: err.message });
  }
});

router.get('/orders/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'order id required' });
    if (!REST_BASE) return res.status(500).json({ error: 'Supabase not configured' })
    const url = `${REST_BASE}/orders?order_id=eq.${encodeURIComponent(id)}`;
    const resp = await axios.get(url, { headers: SB_HEADERS });
    const rows = Array.isArray(resp.data) ? resp.data : [];
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[ORDERS/:id] axios error', err && err.response ? { status: err.response.status, data: err.response.data } : err.message)
    res.status(500).json({ error: err.message });
  }
});

// Create order (used by frontend: POST /api/server/orders)
router.post('/server/orders', upload.single('file'), async (req, res) => {
  try {
    // authenticate
    const auth = req.headers.authorization || '';
    const m = auth.match(/^Bearer\s+(.*)$/i);
    if (!m) return res.status(401).json({ error: 'Missing Authorization header' });
    const token = m[1];
    let payload = null;
    try { payload = jwt.verify(token, JWT_SECRET); } catch (e) { return res.status(401).json({ error: 'Invalid token' }); }
    const userId = payload && (payload.user_id || payload.users_id || payload.id || payload.sub) ? (payload.user_id || payload.users_id || payload.id || payload.sub) : null;
    if (!userId) return res.status(401).json({ error: 'Invalid token payload (no user id)' });

    // validate body
    const { product, model, size, color, address, phone, quantity, unit_price, total_price, deadline, custom } = req.body;
    if (!product || !model || !req.file) return res.status(400).json({ error: 'product, model and file are required' });

    // upload file to Supabase Storage
    const file = req.file;
    const ext = (file.originalname && file.originalname.split('.').pop()) || 'jpg';
    const path = `users/${userId}/sablons/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const contentType = file.mimetype || 'application/octet-stream';

    if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });

    const { data: upData, error: upErr } = await supabase.storage.from(UPLOAD_BUCKET).upload(path, file.buffer, { contentType });
    if (upErr) {
      console.error('[ORDER] storage upload error', upErr)
      return res.status(500).json({ error: 'Failed to upload file' });
    }

    // insert into orders table
    try {
      const orderObj = {
        user_id: userId,
        status: 'created',
        total: total_price ? Number(total_price) : (unit_price ? Number(unit_price) * (Number(quantity || 1)) : 0),
        notes: null,
        order_date: new Date().toISOString(),
        deadline: deadline || null,
        payment_status: 'pending'
      };
      const { data: orderInsert, error: orderErr } = await supabase.from('orders').insert([orderObj]).select().maybeSingle();
      if (orderErr || !orderInsert) {
        console.error('[ORDER] insert order error', orderErr)
        // cleanup uploaded file
        await supabase.storage.from(UPLOAD_BUCKET).remove([upData.path]).catch(() => {});
        return res.status(500).json({ error: 'Failed to create order' });
      }

      // insert into order_items (lightweight snapshot)
      const itemObj = {
        order_id: orderInsert.orders_id,
        product_snapshot: { product: product, model: model, size: size, color: color },
        quantity: quantity ? Number(quantity) : 1,
        unit_price: unit_price ? Number(unit_price) : 0,
        customization: custom ? JSON.parse(custom || '{}') : {},
        calculated_price: total_price ? Number(total_price) : (unit_price ? Number(unit_price) * (Number(quantity || 1)) : 0),
        sablon_path: upData.path,
        color_id: null
      };
      const { data: itemInsert, error: itemErr } = await supabase.from('order_items').insert([itemObj]).select().maybeSingle();
      if (itemErr || !itemInsert) {
        console.error('[ORDER] insert item error', itemErr)
        // cleanup: delete uploaded file and delete order
        await supabase.storage.from(UPLOAD_BUCKET).remove([upData.path]).catch(() => {});
        await supabase.from('orders').delete().eq('orders_id', orderInsert.orders_id).catch(() => {});
        return res.status(500).json({ error: 'Failed to create order item' });
      }

      // compute public URL (simple public URL; depending on bucket visibility)
      let publicUrl = null;
      try {
        const { data: pu } = supabase.storage.from(UPLOAD_BUCKET).getPublicUrl(upData.path);
        publicUrl = pu && pu.publicUrl ? pu.publicUrl : null;
      } catch (e) { /* ignore */ }

      // Return created order in a frontend-friendly shape (id field)
      const out = {
        order: Object.assign({}, orderInsert, { id: orderInsert.orders_id, sablon_path: upData.path, sablon_url: publicUrl, item: itemInsert })
      };
      return res.status(201).json(out);
    } catch (err) {
      console.error('[ORDER] unexpected error', err)
      // cleanup upload
      await supabase.storage.from(UPLOAD_BUCKET).remove([upData.path]).catch(() => {});
      return res.status(500).json({ error: 'Server error' });
    }
  } catch (err) {
    console.error('[server/orders] handler error', err)
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
    const resp = await axios.get(url, { headers: SB_HEADERS });
    
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
