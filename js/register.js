/* 7 IN 7 — register page: show the late-entry window while a cycle is live.

   Mirrors the "active cycle" test in js/prompts.js: a cycle is live from its
   revealAt (7pm ET on the 7th) to its deadline (7pm ET on the 14th), both
   stored as UTC instants in js/prompts-data.js. During that window we swap the
   standard two-card layout for the three-card late-entry layout. */

(function () {
  if (typeof PROMPTS === 'undefined') return;

  const standard = document.getElementById('register-standard');
  const late = document.getElementById('register-late');
  if (!standard || !late) return;

  const now = Date.now();
  const active = PROMPTS.find(p =>
    new Date(p.revealAt) <= now && new Date(p.deadline) >= now);
  if (!active) return; // outside the window — leave the page as-is

  const fmtMonth = iso => new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/New_York', month: 'long', year: 'numeric',
  });

  // Label the "Late Entry" card with the cycle that's currently live.
  const currentEl = late.querySelector('.js-current-cycle-month');
  if (currentEl) currentEl.textContent = fmtMonth(active.revealAt) + ' cycle';

  // Label the "Next Cycle" card with the next upcoming month, if we have one.
  const upcoming = PROMPTS
    .filter(p => new Date(p.revealAt) > now)
    .sort((a, b) => new Date(a.revealAt) - new Date(b.revealAt))[0];

  if (upcoming) {
    const el = late.querySelector('.js-next-cycle-month');
    if (el) el.textContent = fmtMonth(upcoming.revealAt) + ' cycle';
  }

  standard.hidden = true;
  late.hidden = false;
})();
