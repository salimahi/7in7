/* 7 IN 7 — Episodes Page Renderer */

(function () {
  const root = document.getElementById('episodes-root');
  if (!root || typeof EPISODES === 'undefined') return;

  const sorted = [...EPISODES].sort((a, b) => b.number - a.number);

  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmtDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  function platformLink(href, label, icon) {
    if (!href) return '';
    return `<a href="${escHtml(href)}" target="_blank" rel="noopener noreferrer" class="platform-btn">
      <span class="platform-icon">${icon}</span>
      <span>${label}</span>
    </a>`;
  }

  function episodeCard(ep) {
    const links = [
      platformLink(ep.links.spotify, 'Spotify',       '🎵'),
      platformLink(ep.links.apple,   'Apple Podcasts', '🎙'),
      platformLink(ep.links.amazon,  'Amazon Music',   '🎶'),
      platformLink(ep.links.youtube, 'YouTube',        '▶'),
    ].filter(Boolean).join('');

    return `
      <div class="episode-card">
        <div class="episode-card-header">
          <div class="episode-number">Ep. ${ep.number}</div>
          <span class="episode-cycle">${escHtml(ep.cycle)}</span>
        </div>
        <h3 class="episode-title">&ldquo;${escHtml(ep.title)}&rdquo;</h3>
        <p class="episode-writer">Written by <strong>${escHtml(ep.writer)}</strong></p>
        ${ep.description ? `<p class="episode-desc">${escHtml(ep.description)}</p>` : ''}
        <div class="episode-meta">
          ${ep.publishedAt ? `<span class="episode-date">📅 ${fmtDate(ep.publishedAt)}</span>` : ''}
          ${ep.duration ? `<span class="episode-duration">⏱ ${escHtml(ep.duration)}</span>` : ''}
        </div>
        ${links ? `<div class="episode-links">${links}</div>` : ''}
      </div>`;
  }

  function buildEpisodesSection() {
    if (sorted.length === 0) {
      return `
        <section class="section">
          <div class="container" style="max-width:860px;">
            <p class="section-label">Episodes</p>
            <h2 class="section-title">All Episodes</h2>
            <div class="gold-rule"></div>
            <div class="empty-episodes">
              <span style="font-size:2rem;">🎙</span>
              <p>The first episode is on its way.</p>
              <p style="font-size:0.85rem; margin-top:0.35rem;">
                Table reads are produced within 30 days of each cycle's results.
                <a href="prompts.html" style="color:var(--purple-light);">Check the current prompt →</a>
              </p>
            </div>
          </div>
        </section>`;
    }

    return `
      <section class="section">
        <div class="container" style="max-width:860px;">
          <p class="section-label">Episodes</p>
          <h2 class="section-title">All Episodes</h2>
          <div class="gold-rule"></div>
          <div class="episodes-list">
            ${sorted.map(episodeCard).join('')}
          </div>
        </div>
      </section>`;
  }

  root.innerHTML = buildEpisodesSection();
})();
