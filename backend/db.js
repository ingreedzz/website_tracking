import postgres from 'postgres';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

// create or reuse a global client (helps in serverless / hot-reload environments)
const globalKey = '__PG_CLIENT__';

const sql = globalThis[globalKey] ?? postgres(connectionString, {
  ssl: { rejectUnauthorized: false }, // safe for many hosted DBs like Supabase
  max: 5,             // max connections in pool
  idle_timeout: 60,   // secs before idle connection closes
  connect_timeout: 10 // seconds
});

if (!globalThis[globalKey]) globalThis[globalKey] = sql;

export default sql;