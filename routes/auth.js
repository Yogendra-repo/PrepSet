import { Router } from 'express';
import passport from 'passport';
import { redirectIfAuthenticated } from '../middleware/auth.js';
import { login, logout, showLogin, showSignup, signup } from '../controllers/authController.js';

const router = Router();

router.get('/login', redirectIfAuthenticated, showLogin);
router.post('/login', redirectIfAuthenticated, (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      req.flash('error', info?.message || 'Invalid email or password.');
      return res.status(401).render('login', {
        formData: { email: req.body.email || '' },
        tabId: req.query?.tab || '',
      });
    }
    req.user = user;
    next();
  })(req, res, next);
}, login);
router.get('/signup', redirectIfAuthenticated, showSignup);
router.post('/signup', redirectIfAuthenticated, signup);
router.post('/logout', logout);

export default router;