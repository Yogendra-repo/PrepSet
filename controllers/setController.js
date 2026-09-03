import db from '../db/db.js';
import fs from 'fs';
import { parseQuizCSV } from '../utils/csvParser.js';

// GET /sets/new
export function showCreateForm(req, res) {
  res.render('create-set');
}

// POST /sets
export async function createSet(req, res) {
  const { name, description } = req.body;

  if (!name || name.trim() === '') {
    req.flash('error', 'Question Set name is required.');
    return res.redirect('/sets/new');
  }

  try {
    const result = await db.query(
      'INSERT INTO question_sets (name, description) VALUES ($1, $2) RETURNING id',
      [name.trim(), description?.trim() || null]
    );
    const setId = result.rows[0].id;
    req.flash('success', `Question set "${name.trim()}" created successfully!`);
    res.redirect(`/sets/${setId}/upload`);
  } catch (err) {
    console.error('Error creating question set:', err);
    req.flash('error', 'Failed to create question set. Please try again.');
    res.redirect('/sets/new');
  }
}

// GET /sets/:id
export async function showSet(req, res) {
  const { id } = req.params;
  try {
    const setResult = await db.query(
      'SELECT * FROM question_sets WHERE id = $1',
      [id]
    );
    if (setResult.rows.length === 0) {
      return res.status(404).render('error', { message: 'Question set not found.', error: null });
    }
    const questionSet = setResult.rows[0];

    const questionsResult = await db.query(
      'SELECT * FROM questions WHERE question_set_id = $1 ORDER BY id ASC',
      [id]
    );

    const attemptsResult = await db.query(
      'SELECT * FROM quiz_attempts WHERE question_set_id = $1 ORDER BY created_at DESC LIMIT 5',
      [id]
    );

    res.render('questions', {
      questionSet,
      questions: questionsResult.rows,
      attempts: attemptsResult.rows,
    });
  } catch (err) {
    console.error('Error loading question set:', err);
    res.render('error', { message: 'Failed to load question set.', error: null });
  }
}

// GET /sets/:id/upload
export async function showUploadForm(req, res) {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM question_sets WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).render('error', { message: 'Question set not found.', error: null });
    }
    res.render('upload', { questionSet: result.rows[0] });
  } catch (err) {
    console.error('Error loading upload page:', err);
    res.render('error', { message: 'Failed to load upload page.', error: null });
  }
}

// POST /sets/:id/upload
export async function uploadCSV(req, res) {
  const { id } = req.params;

  // Get question set
  let questionSet;
  try {
    const result = await db.query('SELECT * FROM question_sets WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).render('error', { message: 'Question set not found.', error: null });
    }
    questionSet = result.rows[0];
  } catch (err) {
    console.error(err);
    req.flash('error', 'Database error. Please try again.');
    return res.redirect(`/sets/${id}/upload`);
  }

  // Check file was uploaded
  if (!req.file) {
    req.flash('error', 'Please select a CSV file to upload.');
    return res.redirect(`/sets/${id}/upload`);
  }

  // Check MIME type / extension
  const ext = req.file.originalname.split('.').pop().toLowerCase();
  if (ext !== 'csv') {
    fs.unlinkSync(req.file.path);
    req.flash('error', 'Only CSV files are allowed.');
    return res.redirect(`/sets/${id}/upload`);
  }

  try {
    const { questions, errors } = await parseQuizCSV(req.file.path);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    if (errors.length > 0) {
      req.flash('error', errors.join(' | '));
      return res.redirect(`/sets/${id}/upload`);
    }

    if (questions.length === 0) {
      req.flash('error', 'No valid questions found in the CSV file.');
      return res.redirect(`/sets/${id}/upload`);
    }

    // Insert all questions in a transaction
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      for (const q of questions) {
        await client.query(
          `INSERT INTO questions (question_set_id, question_text, option_a, option_b, option_c, option_d, correct_answer)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    req.flash('success', `${questions.length} questions imported successfully!`);
    res.redirect(`/sets/${id}`);
  } catch (err) {
    console.error('Error uploading CSV:', err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    req.flash('error', 'Failed to process CSV file. Please check the format and try again.');
    res.redirect(`/sets/${id}/upload`);
  }
}

// POST /sets/:id/delete
export async function deleteSet(req, res) {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM question_sets WHERE id = $1', [id]);
    req.flash('success', 'Question set deleted successfully.');
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Error deleting question set:', err);
    req.flash('error', 'Failed to delete question set.');
    res.redirect('/dashboard');
  }
}
