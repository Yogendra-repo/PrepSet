import db from '../db/db.js';

// POST /questions/:id/toggle-flag
export async function toggleFlag(req, res) {
  const questionId = parseInt(req.params.id, 10);
  const isAjax = req.headers['x-requested-with'] === 'XMLHttpRequest' || req.headers.accept?.includes('application/json');

  if (!Number.isInteger(questionId) || questionId <= 0) {
    if (isAjax) return res.status(400).json({ success: false, message: 'Invalid question ID.' });
    return res.status(404).render('error', { message: 'Question not found.', error: null });
  }

  try {
    const result = await db.query(
      `UPDATE questions q
       SET is_flagged = NOT q.is_flagged
       FROM question_sets qs
       WHERE q.id = $1 AND q.question_set_id = qs.id AND qs.user_id = $2
       RETURNING q.is_flagged, q.question_set_id`,
      [questionId, req.user.id]
    );

    if (result.rows.length === 0) {
      if (isAjax) return res.status(404).json({ success: false, message: 'Question not found.' });
      return res.status(404).render('error', { message: 'Question not found.', error: null });
    }

    const { is_flagged, question_set_id } = result.rows[0];

    // If AJAX request, return JSON
    if (isAjax) {
      return res.json({ success: true, is_flagged });
    }

    // Otherwise redirect back
    const referer = req.get('Referer') || `/sets/${question_set_id}`;
    req.flash('success', is_flagged ? 'Question flagged as important.' : 'Question unflagged.');
    res.redirect(referer);
  } catch (err) {
    console.error('Error toggling flag:', err);
    if (isAjax) {
      return res.status(500).json({ success: false, message: 'Server error.' });
    }
    req.flash('error', 'Failed to update flag status.');
    const referer = req.get('Referer') || '/dashboard';
    res.redirect(referer);
  }
}

// GET /flagged
export async function showFlagged(req, res) {
  try {
    const result = await db.query(`
      SELECT q.*, qs.name as set_name, qs.id as set_id
      FROM questions q
      JOIN question_sets qs ON q.question_set_id = qs.id
      WHERE q.is_flagged = TRUE AND qs.user_id = $1
      ORDER BY qs.name, q.id
    `, [req.user.id]);

    // Group by question set
    const grouped = {};
    for (const q of result.rows) {
      if (!grouped[q.set_id]) {
        grouped[q.set_id] = {
          id: q.set_id,
          name: q.set_name,
          questions: [],
        };
      }
      grouped[q.set_id].questions.push(q);
    }

    res.render('flagged', {
      groups: Object.values(grouped),
      totalFlagged: result.rows.length,
    });
  } catch (err) {
    console.error('Error loading flagged questions:', err);
    res.render('error', { message: 'Failed to load flagged questions.', error: null });
  }
}
