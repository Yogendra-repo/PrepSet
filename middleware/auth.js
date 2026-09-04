import { getTabUser } from '../utils/tabSession.js';

export function requireAuth(req, res, next) {
  const tabUser = getTabUser(req);
  if (tabUser) {
    req.user = tabUser;
    return next();
  }

  if (req.method === 'GET' && req.path !== '/login' && req.path !== '/signup') {
    req.session.returnToByTab = req.session.returnToByTab || {};
    const tabId = req.query?.tab;
    if (typeof tabId === 'string') {
      req.session.returnToByTab[tabId] = req.originalUrl;
    }
  }
  res.redirect(`/login${req.query?.tab ? `?tab=${encodeURIComponent(req.query.tab)}` : ''}`);
}

export function redirectIfAuthenticated(req, res, next) {
  const tabUser = getTabUser(req);
  if (tabUser) {
    req.user = tabUser;
    return res.redirect(`/dashboard?tab=${encodeURIComponent(req.query.tab)}`);
  }
  next();
}