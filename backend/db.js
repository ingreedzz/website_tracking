const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs');

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = process.env.DB_PORT || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || '';
const DB_NAME = process.env.DB_NAME || '';

let pool = null;

async function initPool() {
  if (!DB_NAME) return null;
  if (pool) return pool;
  pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  // Ensure users table exists
  const createUsersSql = `
    CREATE TABLE IF NOT EXISTS users (
      user_id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      role VARCHAR(50) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  try {
    const conn = await pool.getConnection();
    await conn.query(createUsersSql);
    conn.release();
    console.log('[DB] Connected to MySQL and ensured users table exists');
  } catch (err) {
    console.error('[DB] error ensuring users table', err.message);
    throw err;
  }

  return pool;
}

module.exports = { initPool };
