-- QuizVault Database Schema
-- Run this script to initialize the database

-- Create question_sets table
CREATE TABLE IF NOT EXISTS question_sets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    question_set_id INTEGER REFERENCES question_sets(id) ON DELETE CASCADE,
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
    question_set_id INTEGER REFERENCES question_sets(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_set_id ON questions(question_set_id);
CREATE INDEX IF NOT EXISTS idx_questions_is_flagged ON questions(is_flagged);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_set_id ON quiz_attempts(question_set_id);

-- Sample data (optional - uncomment to use)
-- INSERT INTO question_sets (name, description) VALUES
-- ('DBMS Interview Questions', 'Important DBMS questions for placement preparation.');
