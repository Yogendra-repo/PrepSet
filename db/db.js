import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'quizvault',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || ''),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
  process.exit(-1);
});

// Prepare database schema & performance indexes on startup
export const dbReady = (async () => {
  try {
    // Ensure duration_seconds exists on quiz_attempts
    await pool.query(
      'ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS duration_seconds INTEGER NOT NULL DEFAULT 0'
    );
    await pool.query(
      'ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS attempt_token UUID UNIQUE'
    );
    await pool.query(
      "ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS question_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb"
    );
    await pool.query(
      'ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP'
    );
    await pool.query(
      'ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ'
    );
    await pool.query(
      'ALTER TABLE quiz_attempts ALTER COLUMN score DROP NOT NULL'
    );
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(320) NOT NULL,
        display_name VARCHAR(80) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email))');
    await pool.query('ALTER TABLE question_sets ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE');
    await pool.query('ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE');
    // Compound indexes for optimal query speed
    await pool.query(
      'CREATE INDEX IF NOT EXISTS idx_questions_set_id_id ON questions(question_set_id, id)'
    );
    await pool.query(
      'CREATE INDEX IF NOT EXISTS idx_questions_flagged_set ON questions(question_set_id) WHERE is_flagged = TRUE'
    );
    await pool.query(
      'CREATE INDEX IF NOT EXISTS idx_quiz_attempts_set_created ON quiz_attempts(question_set_id, created_at DESC)'
    );
    await pool.query(
      'CREATE INDEX IF NOT EXISTS idx_question_sets_user_created ON question_sets(user_id, created_at DESC)'
    );
    await pool.query(
      'CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_created ON quiz_attempts(user_id, created_at DESC)'
    );
  } catch (err) {
    console.error('Failed to prepare database schema / indexes:', err.message);
  }
})();

// Test connection on startup
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('❌ Failed to connect to PostgreSQL:', err.message);
  } else {
    console.log('✅ Connected to PostgreSQL database (PrepSet)');
  }
});

export default pool;

