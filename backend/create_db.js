require('dotenv').config();
const mysql = require('mysql2/promise');

async function createDb() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = process.env.DB_PORT || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASS || '';
  const dbName = process.env.DB_NAME || 'chiangho_db';

  try {
    const conn = await mysql.createConnection({ host, port, user, password });
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log('[create_db] Database ensured:', dbName);
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('[create_db] error:', err.message || err);
    process.exit(1);
  }
}

createDb();
