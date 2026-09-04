import { randomUUID } from 'crypto';

const TAB_ID_PATTERN = /^[a-zA-Z0-9-]{16,100}$/;

export function getTabId(req) {
  const candidate = req.query?.tab || req.body?.tab || req.get('x-prepset-tab');
  return typeof candidate === 'string' && TAB_ID_PATTERN.test(candidate) ? candidate : null;
}

export function ensureTabId(req) {
  const tabId = getTabId(req) || randomUUID();
  req.authTabId = tabId;
  return tabId;
}

export function getTabUser(req) {
  const tabId = getTabId(req);
  return tabId ? req.session.tabUsers?.[tabId] || null : null;
}

export function setTabUser(req, user) {
  const tabId = ensureTabId(req);
  req.session.tabUsers = req.session.tabUsers || {};
  req.session.tabUsers[tabId] = user;
  req.authTabId = tabId;
  return tabId;
}

export function clearTabUser(req) {
  const tabId = getTabId(req);
  if (tabId && req.session.tabUsers) {
    delete req.session.tabUsers[tabId];
  }
  return tabId;
}