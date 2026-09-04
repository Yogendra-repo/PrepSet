import db from '../db/db.js';

// GET /sets/:id/quiz
export async function showQuiz(req, res) {
  const { id } = req.params;
  try {
    const setResult = await db.query('SELECT * FROM question_sets WHERE id = $1', [id]);
    if (setResult.rows.length === 0) {
      return res.status(404).render('error', { message: 'Question set not found.', error: null });
    }

    const questionsResult = await db.query(
      'SELECT id, question_text, option_a, option_b, option_c, option_d FROM questions WHERE question_set_id = $1 ORDER BY id ASC',
      [id]
    );

    if (questionsResult.rows.length === 0) {
      req.flash('error', 'This question set has no questions. Please upload a CSV first.');
      return res.redirect(`/sets/${id}`);
    }

    res.render('quiz', {
      questionSet: setResult.rows[0],
      questions: questionsResult.rows,
    });
  } catch (err) {
    console.error('Error loading quiz:', err);
    res.render('error', { message: 'Failed to load quiz.', error: null });
  }
}

// POST /sets/:id/quiz/submit
export async function submitQuiz(req, res) {
  const { id } = req.params;
  const { answers } = req.body || {}; // answers is an object: { questionId: selectedAnswer }

  try {
    const setResult = await db.query('SELECT * FROM question_sets WHERE id = $1', [id]);
    if (setResult.rows.length === 0) {
      return res.status(404).render('error', { message: 'Question set not found.', error: null });
    }

    const questionsResult = await db.query(
      'SELECT id, question_text, option_a, option_b, option_c, option_d, correct_answer FROM questions WHERE question_set_id = $1 ORDER BY id ASC',
      [id]
    );

    const questions = questionsResult.rows;
    const totalQuestions = questions.length;

    let score = 0;
    const results = questions.map((q) => {
      const submittedAnswer = answers && typeof answers === 'object'
        ? answers[`q_${q.id}`]
        : null;
      const userAnswer = typeof submittedAnswer === 'string'
        ? submittedAnswer.trim().toUpperCase()
        : null;
      const isCorrect = userAnswer !== null && userAnswer === q.correct_answer.trim().toUpperCase();
      if (isCorrect) score++;
      return {
        ...q,
        userAnswer,
        isCorrect,
      };
    });

    // Save quiz attempt
    await db.query(
      'INSERT INTO quiz_attempts (question_set_id, score, total_questions) VALUES ($1, $2, $3)',
      [id, score, totalQuestions]
    );

    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    res.render('result', {
      questionSet: setResult.rows[0],
      score,
      totalQuestions,
      percentage,
      correct: score,
      incorrect: totalQuestions - score,
      results,
    });
  } catch (err) {
    console.error('Error submitting quiz:', err);
    res.render('error', { message: 'Failed to submit quiz. Please try again.', error: null });
  }
}
