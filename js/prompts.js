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

  function fmtDeadline(iso) {
    const date = fmt(iso, { month: 'long', day: 'numeric', year: 'numeric' });
    const time = fmt(iso, { hour: 'numeric', hour12: true });
    return `${date} at ${time} ET`;
  }

  function fmtWindow(revealIso, deadlineIso) {
    const mo = fmt(revealIso, { month: 'long' });
    const d1 = fmt(revealIso, { day: 'numeric' });
    const d2 = fmt(deadlineIso, { day: 'numeric' });
    const yr = fmt(revealIso, { year: 'numeric' });
    return `${mo} ${d1} – ${d2}, ${yr}`;
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
           <span class="winner-name"><strong>${escHtml(w.title)}</strong> by ${escHtml(w.name)}</span>
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
              ${active.image ? `<img src="${escHtml(active.image)}" alt="${escHtml(active.cycle)} thumbnail" class="prompt-thumbnail" />` : ''}
              <p class="prompt-text">${escHtml(active.text)}</p>
              <div class="prompt-meta">
                ${statusBadge('open', 'Open')}
                ${typeBadge(active.type)}
                <div class="prompt-meta-item">
                  <span>📅</span>
                  <span>Prompt released: <strong>${fmtReveal(active.revealAt)}</strong></span>
                </div>
                <div class="prompt-meta-item">
                  <span>⏰</span>
                  <span>Submissions close: <strong>${fmtDeadline(active.deadline)}</strong></span>
                </div>
              </div>
              <a href="register.html" class="btn btn-primary">Register to Enter</a>
            </div>
            <div class="prize-callout" style="margin-top:1.5rem;">
              <strong>New to 7 in 7?</strong> Read the <a href="rules.html" style="color:var(--purple-light);">rules</a> before you write. Scripts must be no more than 7 pages, in PDF format, in standard screenplay format, with no author name in the document.
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

    if (revealed.length > 0 && !active) {
      // Between cycles — show last cycle as closed + next teaser
      const last = archive[0];
      const nextLine = upcoming
        ? `Next prompt drops <strong>${fmtReveal(upcoming.revealAt)}</strong>.`
        : 'The next cycle will be announced soon.';
      return `
        <section class="section">
          <div class="container" style="max-width:860px;">
            <p class="section-label">Current Cycle</p>
            <h2 class="section-title">Submissions Closed</h2>
            <div class="gold-rule"></div>
            <div class="prompt-current">
              <p class="prompt-cycle-label">${escHtml(last.cycle)}</p>
              <p class="prompt-month">${fmtWindow(last.revealAt, last.deadline)}</p>
              <p class="prompt-text">${escHtml(last.text)}</p>
              <div class="prompt-meta">
                ${statusBadge('closed', 'Closed')}
                ${typeBadge(last.type)}
                <div class="prompt-meta-item">
                  <span>⏰</span>
                  <span>Submissions closed: <strong>${fmtDeadline(last.deadline)}</strong></span>
                </div>
              </div>
              <p style="color:var(--text-muted); font-size:0.95rem; margin-top:0.5rem;">${nextLine}</p>
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
    const showLastAsClosed = !active && archive.length > 0;
    // If we showed the last closed cycle in the "current" section, skip it in archive
    const archiveItems = showLastAsClosed ? archive.slice(1) : archive;

    let inner = '';

    if (archiveItems.length === 0) {
      inner = `
        <div class="empty-archive">
          <span style="font-size:2rem;">📂</span>
          <p>Previous prompts and winners will appear here after each cycle closes.</p>
          ${archive.length === 0 && active
            ? `<p style="margin-top:0.35rem; font-size:0.85rem;">Check back after ${fmtDeadline(active.deadline)}.</p>`
            : ''}
        </div>`;
    } else {
      const cards = archiveItems.map(p => `
        <div class="archive-card">
          <div class="archive-card-header">
            <span class="archive-month">${escHtml(p.cycle)}</span>
            <div style="display:flex; gap:0.4rem; align-items:center;">
              ${typeBadge(p.type)}
              ${statusBadge('closed', 'Closed')}
            </div>
          </div>
          <p class="archive-prompt">&ldquo;${escHtml(p.text)}&rdquo;</p>
          ${winnersHTML(p.winners, p.winnerImage)}
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
    const nextMonth = upcoming
      ? `<strong>${fmt(upcoming.revealAt, { month: 'long', year: 'numeric' })}</strong>`
      : 'the next cycle';
    const teaser = upcoming
      ? `The prompt for ${nextMonth} will be revealed at ${fmtReveal(upcoming.revealAt)}.`
      : `The next cycle will be announced soon.`;

    return `
      <section class="section">
        <div class="container" style="max-width:860px;">
          <div class="text-center">
            <p class="section-label">Next Cycle</p>
            <h2 class="section-title">${upcoming ? fmt(upcoming.revealAt, { month: 'long', year: 'numeric' }) : 'Coming Soon'}</h2>
            <div class="gold-rule"></div>
            <p style="color:var(--text-muted); max-width:500px; margin:0 auto 2rem;">${teaser} Register annually to secure your spot in every cycle automatically.</p>
            <div class="btn-group">
              <a href="register.html" class="btn btn-primary">Register</a>
            </div>
          </div>
        </div>
      </section>`;
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  root.innerHTML =
    buildCurrentSection() +
    buildArchiveSection();

})();
