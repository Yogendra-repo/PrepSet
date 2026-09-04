import bcrypt from 'bcrypt';
import { Strategy as LocalStrategy } from 'passport-local';
import db from '../db/db.js';

export function configurePassport(passport) {
  passport.use(new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const result = await db.query(
          'SELECT id, email, display_name, password_hash FROM users WHERE email = LOWER($1)',
          [email.trim()]
        );
        const user = result.rows[0];
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
          return done(null, false, { message: 'Invalid email or password.' });
        }
        return done(null, {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
        });
      } catch (err) {
        return done(err);
      }
    }
  ));

  passport.serializeUser((user, done) => done(null, user.id));

  passport.deserializeUser(async (id, done) => {
    try {
      const result = await db.query(
        'SELECT id, email, display_name FROM users WHERE id = $1',
        [id]
      );
      if (result.rows.length === 0) return done(null, false);
      const user = result.rows[0];
      done(null, { id: user.id, email: user.email, displayName: user.display_name });
    } catch (err) {
      done(err);
    }
  });
}