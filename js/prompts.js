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

  // Brand icon paths, matching the nav social icons (viewBox 0 0 16 16).
  const ICON_PATHS = {
    instagram: 'M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z',
    tiktok: 'M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3z',
  };

  function socialIcon(kind) {
    return `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${ICON_PATHS[kind]}"/></svg>`;
  }

  function socialLink(kind, href, handle) {
    return `<a class="winner-social" href="${escHtml(href)}" target="_blank" rel="noopener">${socialIcon(kind)}@${escHtml(handle)}</a>`;
  }

  // Accepts a single winner object or an array of winner objects (a tie).
  function toList(w) {
    if (!w) return [];
    return Array.isArray(w) ? w : [w];
  }

  function winnersHTML(winners, winnerImage) {
    if (!winners) return '';
    const groups = [
      { label: '1st', place: 'first',  list: toList(winners.first)  },
      { label: '2nd', place: 'second', list: toList(winners.second) },
      { label: '3rd', place: 'third',  list: toList(winners.third)  },
    ];
    if (!groups.some(g => g.list.length)) return '';

    const winnerLine = (w) => {
      const links = [];
      if (w.instagram) links.push(socialLink('instagram', `https://www.instagram.com/${w.instagram}/`, w.instagram));
      if (w.tiktok) links.push(socialLink('tiktok', `https://www.tiktok.com/@${w.tiktok}`, w.tiktok));
      const linksHtml = links.length ? `<span class="winner-links">${links.join('')}</span>` : '';
      return `<strong>${escHtml(w.title)}</strong> by <span class="winner-author">${escHtml(w.name)}</span>${linksHtml}`;
    };

    const rows = groups.flatMap(({ label, place, list }) => {
      const tied = list.length > 1;
      return list.map(w => `
        <div class="winner-row place-${place}">
          <span class="winner-place">${label}${tied ? ' (tie)' : ''}</span>
          <span class="winner-name">${winnerLine(w)}</span>
        </div>`);
    }).join('');

    const graphic = winnerImage
      ? `<img src="${escHtml(winnerImage)}" alt="Winner announcement graphic" class="winner-graphic" />`
      : '';

    return `<div class="archive-winners">
      ${graphic}
      ${rows}
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
        <div class="container" style="max-width:820px;">
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
