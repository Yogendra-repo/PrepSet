import db from '../db/db.js';

// POST /questions/:id/toggle-flag
export async function toggleFlag(req, res) {
  const { id } = req.params;
  try {
    const result = await db.query(
      'UPDATE questions SET is_flagged = NOT is_flagged WHERE id = $1 RETURNING is_flagged, question_set_id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }

    const { is_flagged, question_set_id } = result.rows[0];

    // If AJAX request, return JSON
    if (req.headers['x-requested-with'] === 'XMLHttpRequest' || req.headers.accept?.includes('application/json')) {
      return res.json({ success: true, is_flagged });
    }

    // Otherwise redirect back
    const referer = req.get('Referer') || `/sets/${question_set_id}`;
    req.flash('success', is_flagged ? 'Question flagged as important.' : 'Question unflagged.');
    res.redirect(referer);
  } catch (err) {
    console.error('Error toggling flag:', err);
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.status(500).json({ success: false, message: 'Server error.' });
    }
    req.flash('error', 'Failed to update flag status.');
    res.redirect('back');
  }
}

// GET /flagged
export async function showFlagged(req, res) {
  try {
    const result = await db.query(`
      SELECT q.*, qs.name as set_name, qs.id as set_id
      FROM questions q
      JOIN question_sets qs ON q.question_set_id = qs.id
      WHERE q.is_flagged = TRUE
      ORDER BY qs.name, q.id
    `);

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
