-- PrepSet Database Schema
-- Run this script to initialize the database

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(320) NOT NULL,
    display_name VARCHAR(80) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));

-- Create question_sets table
CREATE TABLE IF NOT EXISTS question_sets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    question_set_id INTEGER NOT NULL REFERENCES question_sets(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
    is_flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create quiz_attempts table
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_set_id INTEGER NOT NULL REFERENCES question_sets(id) ON DELETE CASCADE,
    score INTEGER,
    total_questions INTEGER NOT NULL CHECK (total_questions > 0),
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    attempt_token UUID UNIQUE,
    question_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS attempt_token UUID UNIQUE;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS question_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE quiz_attempts ALTER COLUMN score DROP NOT NULL;

ALTER TABLE question_sets ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS duration_seconds INTEGER NOT NULL DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_set_id ON questions(question_set_id);
CREATE INDEX IF NOT EXISTS idx_questions_set_id_id ON questions(question_set_id, id);
CREATE INDEX IF NOT EXISTS idx_questions_is_flagged ON questions(is_flagged);
CREATE INDEX IF NOT EXISTS idx_questions_flagged_set ON questions(question_set_id) WHERE is_flagged = TRUE;
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_set_id ON quiz_attempts(question_set_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_set_created ON quiz_attempts(question_set_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_question_sets_user_created ON question_sets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_created ON quiz_attempts(user_id, created_at DESC);

