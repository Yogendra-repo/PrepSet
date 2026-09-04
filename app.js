import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import flash from 'connect-flash';
import passport from 'passport';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import setsRouter from './routes/sets.js';
import questionsRouter from './routes/questions.js';
import quizRouter from './routes/quiz.js';
import flaggedRouter from './routes/flagged.js';
import authRouter from './routes/auth.js';
import { configurePassport } from './config/passport.js';
import { requireAuth } from './middleware/auth.js';
import { getTabUser } from './utils/tabSession.js';
import db, { dbReady } from './db/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

configurePassport(passport);

// View engine
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));

// Static files with caching for high speed
app.use(express.static(join(__dirname, 'public'), { maxAge: '1d' }));

// Body parsing
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'prepset_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  req.user = getTabUser(req);
  next();
});

// Flash messages
app.use(flash());

// Make flash messages and appName available to all views
app.use((req, res, next) => {
  res.locals.appName = 'PrepSet';
  res.locals.currentUser = req.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.info = req.flash('info');
  next();
});

// Routes
app.get('/', (req, res) => {
  const tab = typeof req.query.tab === 'string' ? `?tab=${encodeURIComponent(req.query.tab)}` : '';
  res.redirect(`/dashboard${tab}`);
});

app.use(authRouter);
app.use(requireAuth);

app.get('/dashboard', async (req, res) => {
  try {
    const [setsResult, statsResult] = await Promise.all([
      db.query(`
        SELECT qs.id, qs.name, qs.description, qs.created_at,
               COUNT(q.id)::int AS question_count
        FROM question_sets qs
        LEFT JOIN questions q ON qs.id = q.question_set_id
        WHERE qs.user_id = $1
        GROUP BY qs.id
        ORDER BY qs.created_at DESC
      `, [req.user.id]),
      db.query(`
        SELECT
          (SELECT COUNT(*)::int FROM question_sets WHERE user_id = $1) AS total_sets,
          (SELECT COUNT(*)::int FROM questions q JOIN question_sets qs ON qs.id = q.question_set_id WHERE qs.user_id = $1) AS total_questions,
          (SELECT COUNT(*)::int FROM quiz_attempts WHERE user_id = $1 AND submitted_at IS NOT NULL) AS total_quizzes,
          (SELECT COUNT(*)::int FROM questions q JOIN question_sets qs ON qs.id = q.question_set_id WHERE qs.user_id = $1 AND q.is_flagged = TRUE) AS total_flagged
      `, [req.user.id])
    ]);

    res.render('dashboard', {
      questionSets: setsResult.rows,
      stats: statsResult.rows[0] || {
        total_sets: 0,
        total_questions: 0,
        total_quizzes: 0,
        total_flagged: 0
      },
    });
  } catch (err) {
    console.error('Error loading dashboard:', err);
    res.render('error', { message: 'Failed to load dashboard.', error: err });
  }
});

app.use('/sets', setsRouter);
app.use('/questions', questionsRouter);
app.use('/sets', quizRouter);
app.use('/flagged', flaggedRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { message: 'The requested page could not be found.', error: null });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.stack);
  res.status(500).render('error', { message: 'Something went wrong on the server. Please try again.', error: null });
});

dbReady.finally(() => {
  app.listen(PORT, () => {
    console.log(`🚀 PrepSet is running at http://localhost:${PORT}`);
  });
});