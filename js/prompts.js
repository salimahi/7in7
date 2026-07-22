/* 7 IN 7 — Prompt Page Renderer */

(function () {
  const root = document.getElementById('prompts-root');
  if (!root || typeof PROMPTS === 'undefined') return;

  const now = Date.now();

  // Sort chronologically
  const sorted = [...PROMPTS].sort((a, b) => new Date(a.revealAt) - new Date(b.revealAt));

  const revealed   = sorted.filter(p => new Date(p.revealAt) <= now);
  const unrevealed = sorted.filter(p => new Date(p.revealAt) > now);

  // Active = revealed and deadline not yet passed
  const active = revealed.find(p => new Date(p.deadline) >= now) || null;

  // Archive = revealed and deadline passed, newest first
  const archive = revealed.filter(p => new Date(p.deadline) < now).reverse();

  // Next upcoming prompt (for teaser)
  const upcoming = unrevealed[0] || null;

  // ── Date helpers ────────────────────────────────────────────────────────────

  function fmt(iso, opts) {
    return new Date(iso).toLocaleString('en-US', { timeZone: 'America/New_York', ...opts });
  }

  function fmtReveal(iso) {
    const date = fmt(iso, { month: 'long', day: 'numeric', year: 'numeric' });
    const time = fmt(iso, { hour: 'numeric', hour12: true });
    return `${date} at ${time} ET`;
  }

  function ordinal(n) {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
  }

  function fmtRevealShort(iso) {
    const month = fmt(iso, { month: 'long' });
    const day = Number(fmt(iso, { day: 'numeric' }));
    return `${month} ${ordinal(day)}`;
  }

  function fmtWindow(revealIso, deadlineIso) {
    const mo = fmt(revealIso, { month: 'long' });
    const d1 = fmt(revealIso, { day: 'numeric' });
    const d2 = fmt(deadlineIso, { day: 'numeric' });
    const yr = fmt(revealIso, { year: 'numeric' });
    return `${mo} ${d1} – ${d2}, ${yr}`;
  }

  function fmtResultsDate(revealIso) {
    const mo = fmt(revealIso, { month: 'long' });
    const yr = fmt(revealIso, { year: 'numeric' });
    return `${mo} 22, ${yr}`;
  }

  function resultsReady(p) {
    return new Date(p.resultsRevealAt || p.deadline) <= now;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function statusBadge(cls, label) {
    return `<span class="prompt-status ${cls}">${label}</span>`;
  }

  function typeBadge(type) {
    return type ? `<span class="prompt-type-badge">${escHtml(type)}</span>` : '';
  }

  function winnersHTML(winners, winnerImage) {
    if (!winners) return '';
    const { first, second, third } = winners;
    if (!first && !second && !third) return '';

    const row = (place, label, w) => w
      ? `<div class="winner-row">
           <span class="winner-place">${label}</span>
           <span class="winner-name"><strong>${escHtml(w.title)}</strong> by ${escHtml(w.name)}${
             w.instagram ? ` <a href="https://www.instagram.com/${escHtml(w.instagram)}/" target="_blank" rel="noopener">@${escHtml(w.instagram)}</a>` : ''
           }</span>
         </div>`
      : '';

    const graphic = winnerImage
      ? `<img src="${escHtml(winnerImage)}" alt="Winner announcement graphic" class="winner-graphic" />`
      : '';

    return `<div class="archive-winners">
      ${graphic}
      ${row('first',  '1st', first)}
      ${row('second', '2nd', second)}
      ${row('third',  '3rd', third)}
    </div>`;
  }

  function escHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Section builders ────────────────────────────────────────────────────────

  function buildCurrentSection() {
    if (active) {
      return `
        <section class="section">
          <div class="container" style="max-width:860px;">
            <p class="section-label">Current Cycle</p>
            <h2 class="section-title">This Month's Prompt</h2>
            <div class="gold-rule"></div>
            <div class="prompt-current">
              <p class="prompt-cycle-label">${escHtml(active.cycle)}</p>
              <p class="prompt-month">${fmtWindow(active.revealAt, active.deadline)}</p>
              <div class="prompt-meta">
                ${statusBadge('open', 'Open')}
                ${typeBadge(active.type)}
              </div>
              ${active.image ? `<img src="${escHtml(active.image)}" alt="${escHtml(active.cycle)} thumbnail" class="prompt-thumbnail" />` : ''}
              <p class="prompt-text">${escHtml(active.text)}</p>
            </div>
            <div class="prize-callout" style="margin-top:1.5rem;">
              <p class="prompt-cta-text"><strong>Think you could have written something for this prompt?</strong> Submit a late entry or purchase an annual subscription to join this cycle.</p>
            </div>
            <div class="late-entry-callout" style="margin-top:1.5rem;">
              <div class="late-entry-options">
                <div class="late-entry-option">
                  <p style="font-size:0.75rem; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color:var(--text-muted); margin-bottom:0.25rem;">Late Entry</p>
                  <p style="font-family:'Cormorant', serif; font-size:2rem; font-weight:600; color:var(--dark); margin-bottom:0.75rem;">US$35</p>
                  <button class="btn btn-primary" data-checkout-product="late_entry">Register</button>
                </div>
                <div class="late-entry-option featured">
                  <p style="font-size:0.75rem; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color:var(--text-muted); margin-bottom:0.25rem;">Annual Subscription</p>
                  <p style="font-family:'Cormorant', serif; font-size:2rem; font-weight:600; color:var(--dark); margin-bottom:0.25rem;">US$20<span style="font-size:1rem;">/mo</span></p>
                  <p style="font-size:0.8rem; color:var(--gold-light); font-weight:500; margin-bottom:0.75rem;">US$240 billed annually</p>
                  <button class="btn btn-primary" data-checkout-product="subscription_annual">Subscribe</button>
                </div>
              </div>
            </div>
          </div>
        </section>`;
    }

    if (revealed.length === 0 && upcoming) {
      // Nothing revealed yet — tease the first cycle
      return `
        <section class="section">
          <div class="container" style="max-width:860px;">
            <p class="section-label">Coming Soon</p>
            <h2 class="section-title">First Prompt Incoming</h2>
            <div class="gold-rule"></div>
            <div class="prompt-current" style="text-align:center; padding:3rem 2rem;">
              <p style="font-size:3rem; margin-bottom:1rem;">🕐</p>
              <p style="font-family:'Playfair Display',serif; font-size:1.3rem; color:var(--purple-light); margin-bottom:1rem; font-style:italic;">
                The first prompt drops on ${fmtReveal(upcoming.revealAt)}.
              </p>
              <p style="color:var(--text-muted); font-size:0.95rem; margin-bottom:2rem;">
                Subscribe now to ensure you receive your submission link automatically the moment the cycle opens.
              </p>
              <div class="btn-group" style="justify-content:center;">
                <a href="register.html" class="btn btn-primary">Register</a>
              </div>
            </div>
          </div>
        </section>`;
    }

    // Fallback: nothing at all
    return `
      <section class="section">
        <div class="container" style="max-width:860px; text-align:center;">
          <p style="color:var(--text-muted); font-size:1.05rem;">The first cycle is coming soon. Check back shortly.</p>
        </div>
      </section>`;
  }

  function buildArchiveSection() {
    let inner = '';

    if (archive.length === 0) {
      inner = `
        <div class="empty-archive">
          <span style="font-size:2rem;">📂</span>
          <p>Previous prompts and winners will appear here after each cycle closes.</p>
          ${active
            ? `<p style="margin-top:0.35rem; font-size:0.85rem;">Check back after ${fmtResultsDate(active.revealAt)}.</p>`
            : ''}
        </div>`;
    } else {
      const cards = archive.map(p => `
        <div class="archive-card">
          <div class="archive-card-header">
            <span class="archive-month">${escHtml(p.cycle)}</span>
            <div class="archive-card-badges">
              ${typeBadge(p.type)}
              ${statusBadge('closed', 'Closed')}
            </div>
          </div>
          ${p.image ? `<img src="${escHtml(p.image)}" alt="${escHtml(p.cycle)} thumbnail" class="archive-thumbnail" />` : ''}
          <p class="archive-prompt">&ldquo;${escHtml(p.text)}&rdquo;</p>
          ${resultsReady(p) ? winnersHTML(p.winners, p.winnerImage) : ''}
        </div>`).join('');
      inner = `<div class="archive-grid">${cards}</div>`;
    }

    return `
      <section class="section section-alt">
        <div class="container" style="max-width:860px;">
          <p class="section-label">Archive</p>
          <h2 class="section-title">Previous Prompts and Winners</h2>
          <div class="gold-rule"></div>
          ${inner}
        </div>
      </section>`;
  }

  function buildUpcomingSection() {
    const teaser = upcoming
      ? `Reserve your spot today and get an email with your prompt on ${fmtRevealShort(upcoming.revealAt)}.`
      : `The next cycle will be announced soon.`;

    return `
      <section class="section">
        <div class="container" style="max-width:860px;">
          <div class="text-center">
            <p class="section-label">Next Cycle</p>
            <h2 class="section-title">${upcoming ? fmt(upcoming.revealAt, { month: 'long', year: 'numeric' }) : 'Coming Soon'}</h2>
            <div class="gold-rule"></div>
            <p style="color:var(--text-muted); max-width:500px; margin:0 auto 2rem;">${teaser}</p>
            <div class="btn-group">
              <a href="register.html" class="btn btn-primary">Register</a>
            </div>
          </div>
        </div>
      </section>`;
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  // Between cycles (last cycle closed, next one not revealed yet): lead with
  // the "next prompt" teaser, then the archive — where the just-closed cycle's
  // winners now live as the newest (first) card in Previous Prompts and Winners.
  const betweenCycles = !active && revealed.length > 0;

  root.innerHTML = betweenCycles
    ? buildUpcomingSection() + buildArchiveSection()
    : buildCurrentSection() + buildArchiveSection();

})();
