import bcrypt from 'bcrypt';
import db from '../db/db.js';
import { clearTabUser, setTabUser } from '../utils/tabSession.js';

const BCRYPT_SALT_ROUNDS = 12;

export function showLogin(req, res) {
  res.render('login', { formData: { email: '' }, tabId: req.query?.tab || '' });
}

export function showSignup(req, res) {
  res.render('signup', { formData: { email: '', displayName: '' }, tabId: req.query?.tab || '' });
}

export async function signup(req, res, next) {
  const { email, password, displayName } = req.body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const name = typeof displayName === 'string' ? displayName.trim() : '';

  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    req.flash('error', 'Please enter a valid email address.');
    return res.status(400).render('signup', { formData: { email: normalizedEmail, displayName: name }, tabId: req.query?.tab || '' });
  }
  if (name.length < 2 || name.length > 80) {
    req.flash('error', 'Display name must be between 2 and 80 characters.');
    return res.status(400).render('signup', { formData: { email: normalizedEmail, displayName: name }, tabId: req.query?.tab || '' });
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    req.flash('error', 'Password must be between 8 and 128 characters.');
    return res.status(400).render('signup', { formData: { email: normalizedEmail, displayName: name }, tabId: req.query?.tab || '' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const result = await db.query(
      `INSERT INTO users (email, display_name, password_hash)
       VALUES (LOWER($1), $2, $3)
       RETURNING id, email, display_name`,
      [normalizedEmail, name, passwordHash]
    );
    const createdUser = {
      id: result.rows[0].id,
      email: result.rows[0].email,
      displayName: result.rows[0].display_name,
    };
    const tabId = setTabUser(req, createdUser);
    req.flash('success', 'Your account was created successfully.');
    res.redirect(`/dashboard?tab=${encodeURIComponent(tabId)}`);
  } catch (err) {
    if (err.code === '23505') {
      req.flash('error', 'An account with that email already exists.');
      return res.status(409).render('signup', { formData: { email: normalizedEmail, displayName: name }, tabId: req.query?.tab || '' });
    }
    next(err);
  }
}

export function login(req, res, next) {
  const tabId = setTabUser(req, req.user);
  const returnTo = req.session.returnToByTab?.[tabId];
  if (req.session.returnToByTab) delete req.session.returnToByTab[tabId];
  req.flash('success', `Welcome back, ${req.user.displayName}.`);
  res.redirect(returnTo && returnTo.startsWith('/') ? returnTo : `/dashboard?tab=${encodeURIComponent(tabId)}`);
}

export function logout(req, res, next) {
  const tabId = clearTabUser(req);
  res.redirect(tabId ? `/login?tab=${encodeURIComponent(tabId)}` : '/login');
}