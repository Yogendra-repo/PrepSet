import { randomUUID } from 'crypto';
import db from '../db/db.js';
import { scoreQuiz } from '../utils/quizScoring.js';

// Helper to parse and validate integer IDs
function parseId(idParam) {
  const id = parseInt(idParam, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /sets/:id/quiz
export async function showQuiz(req, res) {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(404).render('error', { message: 'Question set not found.', error: null });
  }

  try {
    const setResult = await db.query('SELECT * FROM question_sets WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (setResult.rows.length === 0) {
      return res.status(404).render('error', { message: 'Question set not found.', error: null });
    }

    const questionsResult = await db.query(
      'SELECT id, question_text, option_a, option_b, option_c, option_d, correct_answer FROM questions WHERE question_set_id = $1 ORDER BY id ASC',
      [id]
    );

    if (questionsResult.rows.length === 0) {
      req.flash('error', 'This question set has no questions. Please upload a CSV first.');
      return res.redirect(`/sets/${id}`);
    }

    const questionSnapshot = questionsResult.rows.map((question) => ({
      id: question.id,
      question_text: question.question_text,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      correct_answer: question.correct_answer,
    }));
    const attemptToken = randomUUID();
    const publicQuestions = questionsResult.rows.map(({ correct_answer, ...question }) => question);

    await db.query(
      `INSERT INTO quiz_attempts
       (question_set_id, user_id, attempt_token, question_snapshot, total_questions, started_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, NOW())`,
      [id, req.user.id, attemptToken, JSON.stringify(questionSnapshot), questionSnapshot.length]
    );

    res.render('quiz', {
      questionSet: setResult.rows[0],
      questions: publicQuestions,
      attemptToken,
    });
  } catch (err) {
    console.error('Error loading quiz:', err);
    res.render('error', { message: 'Failed to load quiz.', error: null });
  }
}

// POST /sets/:id/quiz/submit
export async function submitQuiz(req, res) {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(404).render('error', { message: 'Question set not found.', error: null });
  }

  const { answers, attemptToken } = req.body || {};

  if (typeof attemptToken !== 'string' || !attemptToken.trim()) {
    return res.status(400).render('error', { message: 'This quiz attempt is invalid or has expired.', error: null });
  }

  try {
    const setResult = await db.query('SELECT * FROM question_sets WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (setResult.rows.length === 0) {
      return res.status(404).render('error', { message: 'Question set not found.', error: null });
    }

    const attemptResult = await db.query(
      `SELECT id, question_snapshot, started_at
       FROM quiz_attempts
      WHERE question_set_id = $1 AND user_id = $2 AND attempt_token = $3 AND submitted_at IS NULL`,
          [id, req.user.id, attemptToken.trim()]
    );

    if (attemptResult.rows.length === 0) {
      return res.status(409).render('error', { message: 'This quiz attempt is invalid, expired, or already submitted.', error: null });
    }

    const attempt = attemptResult.rows[0];
    const questions = attempt.question_snapshot;
    const totalQuestions = questions.length;

    const scoring = scoreQuiz(questions, answers);
    const durationSeconds = Math.max(
      0,
      Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000)
    );

    const updateResult = await db.query(
      `UPDATE quiz_attempts
       SET score = $1, duration_seconds = $2, submitted_at = NOW()
      WHERE id = $3 AND user_id = $4 AND submitted_at IS NULL
       RETURNING id`,
          [scoring.score, durationSeconds, attempt.id, req.user.id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(409).render('error', { message: 'This quiz attempt has already been submitted.', error: null });
    }

    const percentage = totalQuestions > 0 ? Math.round((scoring.score / totalQuestions) * 100) : 0;

    res.render('result', {
      questionSet: setResult.rows[0],
      score: scoring.score,
      totalQuestions,
      percentage,
      correct: scoring.correct,
      incorrect: scoring.incorrect,
      skipped: scoring.skipped,
      results: scoring.results,
      durationSeconds,
    });
  } catch (err) {
    console.error('Error submitting quiz:', err);
    res.render('error', { message: 'Failed to submit quiz. Please try again.', error: null });
  }
}
