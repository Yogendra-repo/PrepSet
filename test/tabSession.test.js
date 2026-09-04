import assert from 'node:assert/strict';
import test from 'node:test';
import { clearTabUser, getTabUser, setTabUser } from '../utils/tabSession.js';

function request(tab, users = {}) {
  return {
    query: { tab },
    body: {},
    session: { tabUsers: users },
    get() { return undefined; },
  };
}

test('keeps authenticated users isolated by tab id', () => {
  const users = {};
  const firstTab = request('first-tab-123456', users);
  const secondTab = request('second-tab-123456', users);

  setTabUser(firstTab, { id: 1, email: 'one@example.com' });
  setTabUser(secondTab, { id: 2, email: 'two@example.com' });

  assert.equal(getTabUser(firstTab).id, 1);
  assert.equal(getTabUser(secondTab).id, 2);

  clearTabUser(firstTab);
  assert.equal(getTabUser(firstTab), null);
  assert.equal(getTabUser(secondTab).id, 2);
});