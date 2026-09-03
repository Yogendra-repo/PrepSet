import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'quizvault',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
  process.exit(-1);
});

// Test connection on startup
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('❌ Failed to connect to PostgreSQL:', err.message);
  } else {
    console.log('✅ Connected to PostgreSQL database');
  }
});

export default pool;
