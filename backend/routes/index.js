const express = require('express');
const axios = require('axios');
const bcrypt = require('bcrypt');

const router = express.Router();

// Parse JSON bodies
router.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) console.warn('[ROUTES] SUPABASE_URL or SUPABASE_KEY not set');
const REST_BASE = SUPABASE_URL ? SUPABASE_URL.replace(/\/$/, '') + '/rest/v1' : null;
const SB_HEADERS = SUPABASE_KEY ? { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' } : {};
// Optional local MySQL (XAMPP) support
const { initPool } = require('../db');
let mysqlPoolPromise = null;
if (process.env.DB_NAME) {
  mysqlPoolPromise = initPool();
}

// Register - create a new user (stores hashed password)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password required' });

    console.log('[REGISTER] incoming:', { name, email, phone })

    const hashed = await bcrypt.hash(password, 10);

    // If local MySQL configured, insert there
    if (mysqlPoolPromise) {
      try {
        const pool = await mysqlPoolPromise;
        const userId = require('crypto').randomUUID();
        const sql = 'INSERT INTO users (user_id, name, email, password, phone) VALUES (?, ?, ?, ?, ?)';
        const conn = await pool.getConnection();
        await conn.execute(sql, [userId, name, email, hashed, phone || null]);
        conn.release();
        return res.status(201).json({ user_id: userId, name, email, phone });
      } catch (err) {
        console.error('[REGISTER][MYSQL] error', err.message || err);
        return res.status(500).json({ error: 'DB error: ' + err.message });
      }
    }

    if (!REST_BASE) return res.status(500).json({ error: 'Supabase not configured' })
    try {
      const url = `${REST_BASE}/users`;
      const body = [{ name, email, password: hashed, phone }];
      const resp = await axios.post(url, body, { headers: { ...SB_HEADERS, Prefer: 'return=representation' } });
      const created = Array.isArray(resp.data) && resp.data.length ? resp.data[0] : null;
      if (!created) return res.status(500).json({ error: 'Failed to create user' });
      if (created.password) delete created.password;
      res.status(201).json(created);
    } catch (err) {
      console.error('[REGISTER] axios error', err && err.response ? { status: err.response.status, data: err.response.data } : err.message)
      const msg = err.response && err.response.data ? err.response.data : err.message;
      res.status(400).json({ error: msg });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login - verify credentials
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    console.log('[LOGIN] incoming:', { email })
    // If MySQL configured, query local DB
    if (mysqlPoolPromise) {
      try {
        const pool = await mysqlPoolPromise;
        const sql = 'SELECT user_id, name, email, password, phone FROM users WHERE email = ? LIMIT 1';
        const conn = await pool.getConnection();
        const [rows] = await conn.execute(sql, [email]);
        conn.release();
        const data = Array.isArray(rows) && rows.length ? rows[0] : null;
        if (!data) return res.status(401).json({ error: 'Invalid credentials' });
        const match = await bcrypt.compare(password, data.password || '');
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });
        delete data.password;
        return res.json({ user: data });
      } catch (err) {
        console.error('[LOGIN][MYSQL] error', err.message || err);
        return res.status(500).json({ error: 'DB error' });
      }
    }

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
      res.json({ user: data });
    } catch (err) {
      console.error('[LOGIN] axios error', err && err.response ? { status: err.response.status, data: err.response.data } : err.message)
      res.status(500).json({ error: err.message });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List users (for admin/debug) - hides passwords
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

// Lightweight ping endpoint for debugging Supabase connectivity
router.get('/ping', async (req, res) => {
  try {
    if (!REST_BASE) return res.status(500).json({ ok: false, error: 'Supabase not configured' })
    const url = `${REST_BASE}/users?select=user_id&limit=1`;
    const resp = await axios.get(url, { headers: SB_HEADERS });
    res.json({ ok: true, data: Array.isArray(resp.data) ? resp.data : null })
  } catch (err) {
    console.error('[PING] axios error', err && err.response ? { status: err.response.status, data: err.response.data } : err.message)
    res.status(500).json({ ok: false, error: err.message })
  }
})

// Raw fetch debug: call Supabase REST manually with headers to inspect HTTP response
router.get('/supabase-debug', async (req, res) => {
  try {
    if (!REST_BASE) return res.status(500).json({ error: 'SUPABASE_URL or SUPABASE_KEY not set' })
    const url = `${REST_BASE}/users?select=user_id`;
    console.log('[SUPABASE-DEBUG] fetching', url)
    const resp = await axios.get(url, { headers: SB_HEADERS, responseType: 'text' });
    res.status(200).json({ status: resp.status, body: JSON.stringify(resp.data).slice(0, 10000) })
  } catch (err) {
    console.error('[SUPABASE-DEBUG] error', err && err.response ? { status: err.response.status, data: err.response.data } : err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router;
