import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import flash from 'connect-flash';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import setsRouter from './routes/sets.js';
import questionsRouter from './routes/questions.js';
import quizRouter from './routes/quiz.js';
import flaggedRouter from './routes/flagged.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));

// Static files
app.use(express.static(join(__dirname, 'public')));

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'quizvault_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));

// Flash messages
app.use(flash());

// Make flash messages available to all views
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.info = req.flash('info');
  next();
});

// Routes
app.get('/', (req, res) => res.redirect('/dashboard'));
app.get('/dashboard', async (req, res) => {
  const { default: db } = await import('./db/db.js');
  try {
    const result = await db.query(`
      SELECT qs.*, COUNT(q.id) as question_count
      FROM question_sets qs
      LEFT JOIN questions q ON qs.id = q.question_set_id
      GROUP BY qs.id
      ORDER BY qs.created_at DESC
    `);
    res.render('dashboard', { questionSets: result.rows });
  } catch (err) {
    console.error(err);
    res.render('error', { message: 'Failed to load dashboard.', error: err });
  }
});

app.use('/sets', setsRouter);
app.use('/questions', questionsRouter);
app.use('/sets', quizRouter);
app.use('/flagged', flaggedRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { message: 'Page not found.', error: null });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { message: 'Something went wrong on the server.', error: null });
});

app.listen(PORT, () => {
  console.log(`✅ QuizVault is running at http://localhost:${PORT}`);
});
