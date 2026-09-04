/* PrepSet — Frontend Interactivity & Enhancements */

document.addEventListener('DOMContentLoaded', () => {

  // Keep authentication isolated when multiple accounts are open in one browser.
  const tabStorageKey = 'prepset-tab-id';
  const createTabId = () => (globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`);
  const tabId = sessionStorage.getItem(tabStorageKey) || createTabId();
  sessionStorage.setItem(tabStorageKey, tabId);

  const withTab = (target) => {
    try {
      const url = new URL(target, window.location.origin);
      if (url.origin !== window.location.origin) return target;
      url.searchParams.set('tab', tabId);
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return target;
    }
  };

  document.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href');
    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      link.setAttribute('href', withTab(href));
    }
  });

  document.querySelectorAll('form[action]').forEach((form) => {
    form.setAttribute('action', withTab(form.getAttribute('action')));
  });

  // ── Dashboard Real-Time Search ───────────────────────
  const searchInput = document.getElementById('setSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase().trim();
      let matches = 0;
      document.querySelectorAll('#setsContainer .set-item').forEach(card => {
        const name = card.getAttribute('data-name') || '';
        const desc = card.getAttribute('data-desc') || '';
        const isMatch = name.includes(query) || desc.includes(query);
        card.classList.toggle('d-none', !isMatch);
        if (isMatch) matches++;
      });
      const noMatch = document.getElementById('noSearchMatch');
      if (noMatch) {
        noMatch.classList.toggle('d-none', matches > 0 || !query);
      }
    });
  }

  // ── Flag Buttons ──────────────────────────────────────
  document.querySelectorAll('.flag-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const questionId = btn.dataset.questionId;
      const removeOnUnflag = btn.dataset.removeOnUnflag === 'true';

      btn.disabled = true;
      const originalHTML = btn.innerHTML;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

      try {
        const res = await fetch(withTab(`/questions/${questionId}/toggle-flag`), {
          method: 'POST',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/json',
          },
        });

        const data = await res.json();

        if (!data.success) throw new Error(data.message || 'Toggle failed');

        const isFlagged = data.is_flagged;

        // Update button
        if (isFlagged) {
          btn.innerHTML = '<i class="bi bi-star-fill me-1"></i>Unflag';
          btn.classList.remove('btn-outline-secondary');
          btn.classList.add('btn-warning');
        } else {
          // On flagged page, remove the card with smooth transition
          if (removeOnUnflag) {
            const card = document.getElementById(`flagged-q-${questionId}`);
            if (card) {
              card.style.transition = 'opacity .3s ease, transform .3s ease';
              card.style.opacity = '0';
              card.style.transform = 'translateX(30px)';
              setTimeout(() => card.remove(), 320);
            }
            return;
          }

          btn.innerHTML = '<i class="bi bi-star me-1"></i>Flag Important';
          btn.classList.remove('btn-warning');
          btn.classList.add('btn-outline-secondary');
        }

        // Toggle flagged-card border on question card & data attribute
        const questionCard = document.getElementById(`question-${questionId}`);
        if (questionCard) {
          questionCard.classList.toggle('flagged-card', isFlagged);
          questionCard.setAttribute('data-flagged', String(isFlagged));
        }

        // Update counter in set header
        const totalFlaggedBadge = document.getElementById('flaggedTotalCount');
        if (totalFlaggedBadge) {
          let count = parseInt(totalFlaggedBadge.textContent, 10) || 0;
          totalFlaggedBadge.textContent = isFlagged ? count + 1 : Math.max(0, count - 1);
        }

        // Toggle badge in card header
        const badgeContainer = btn.closest('.card-body');
        if (badgeContainer) {
          let badge = badgeContainer.querySelector('.flagged-badge');
          if (isFlagged && !badge) {
            const header = badgeContainer.querySelector('.d-flex');
            if (header) {
              const newBadge = document.createElement('span');
              newBadge.className = 'badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1 flex-shrink-0 flagged-badge';
              newBadge.innerHTML = '<i class="bi bi-star-fill me-1"></i>Flagged';
              header.appendChild(newBadge);
            }
          } else if (!isFlagged && badge) {
            badge.remove();
          }
        }

      } catch (err) {
        console.error('Flag toggle error:', err);
        btn.innerHTML = originalHTML;
        showToast('Failed to update flag. Please try again.', 'danger');
      } finally {
        btn.disabled = false;
      }
    });
  });

  // ── Toast Notification ──────────────────────────────
  function showToast(message, type = 'info') {
    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-bg-${type} border-0 show shadow-lg`;
    toastEl.setAttribute('role', 'alert');
    toastEl.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;min-width:260px;border-radius:10px;';
    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.closest('.toast').remove()"></button>
      </div>`;
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 4000);
  }

  // ── Auto-dismiss flash alerts after 5s ──────────────
  document.querySelectorAll('.alert.alert-success, .alert.alert-info').forEach(alert => {
    setTimeout(() => {
      const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
      if (bsAlert) bsAlert.close();
    }, 5000);
  });

});
