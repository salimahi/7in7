// Renders the winners graphic to img/prompts/winners/YYYY-MM.png.
// Also writes the 1080x1920 story versions next to it: YYYY-MM-story.png and YYYY-MM-story.mp4 (10s).
// Usage: node tools/render.js <data.json>
// data.json: { month:'2026-11', monthLabel:'November 2026', tied:false,
//   winners:[{ place:1, title, name, handles:{instagram,tiktok,facebook,twitter} }, ...] }
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { renderStory } = require('./render-story');

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Social icons (24x24, filled with the template's gold handle colour).
const ICONS = {
  instagram: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
  tiktok: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
  twitter: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>',
  facebook: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
};

// Returns HTML: one line per platform, icon then handle, right-aligned.
function handleHtml(h = {}) {
  const lines = [];
  for (const k of ['instagram', 'tiktok', 'twitter', 'facebook']) {
    if (!h[k]) continue;
    const text = k === 'facebook' ? h[k] : `@${h[k]}`;
    lines.push(`<span style="display:inline-flex;align-items:center;gap:10px;white-space:nowrap">${ICONS[k]}<span>${esc(text)}</span></span>`);
  }
  return lines.length ? `<span style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">${lines.join('')}</span>` : '';
}

// Story layout: handles sit under the name, left-aligned, one line per platform.
function handleHtmlStory(h = {}) {
  const lines = [];
  for (const k of ['instagram', 'tiktok', 'twitter', 'facebook']) {
    if (!h[k]) continue;
    const text = k === 'facebook' ? h[k] : `@${h[k]}`;
    lines.push(`<div style="display:flex;align-items:center;gap:12px;white-space:nowrap">${ICONS[k].replace(/width="24" height="24"/, 'width="28" height="28"')}<span>${esc(text)}</span></div>`);
  }
  return lines.length ? `<div class="hd">${lines.join('')}</div>` : '';
}

const GOLD = '#D4AF37', SILVER = '#C0C0C0', BRONZE = '#CD7F32';
const badge = (text, color) => `<div class="badge" style="color:${color};border-color:${color}80">${text}</div>`;

// Medal, colour and optional badge for slots 1-3. A tie for 1st fills slots 1 and 2; 3rd stays in slot 3.
function storySlots(tied) {
  return tied
    ? [{ medal: 'I', color: GOLD, badge: badge('Tied for 1st', GOLD) }, { medal: 'I', color: GOLD, badge: badge('Tied for 1st', GOLD) }, { medal: 'III', color: BRONZE, badge: badge('3rd Place', BRONZE) }]
    : [{ medal: 'I', color: GOLD, badge: '' }, { medal: 'II', color: SILVER, badge: '' }, { medal: 'III', color: BRONZE, badge: '' }];
}

async function main() {
  const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const root = path.join(__dirname, '..');
  const tplName = data.tied ? 'template-tied.html' : 'template.html';
  const tpl = fs.readFileSync(path.join(__dirname, 'winner-graphic', tplName), 'utf8');
  const vals = { monthLabel: data.monthLabel };
  // Slots w1..w3 in order. A tie for 1st fills w1 and w2, and 3rd goes in w3 (template-tied).
  data.winners.slice(0, 3).forEach((w, i) => {
    vals[`w${i + 1}Title`] = w.title;
    vals[`w${i + 1}Name`] = w.name;
    vals[`w${i + 1}Handle`] = handleHtml(w.handles); // already-escaped HTML
  });
  const html = tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (/Handle$/.test(k) ? vals[k] || '' : esc(vals[k])));
  const out = path.join(root, 'img', 'prompts', 'winners', `${data.month}.png`);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1080 } });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1080, height: 1080 } });
  await browser.close();
  console.log('Wrote', out);

  // 1080x1920 story PNG + 10s MP4.
  const storyTpl = fs.readFileSync(path.join(__dirname, 'winner-graphic', 'template-story.html'), 'utf8');
  const sv = { monthLabel: data.monthLabel };
  const slots = storySlots(data.tied);
  data.winners.slice(0, 3).forEach((w, i) => {
    sv[`w${i + 1}Title`] = w.title;
    sv[`w${i + 1}Name`] = w.name;
    sv[`w${i + 1}Handle`] = handleHtmlStory(w.handles); // already-escaped HTML
    sv[`w${i + 1}Badge`] = slots[i].badge;              // already-escaped HTML
    sv[`w${i + 1}Medal`] = slots[i].medal;
    sv[`w${i + 1}Color`] = slots[i].color;
  });
  const storyHtml = storyTpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (/(Handle|Badge)$/.test(k) ? sv[k] || '' : esc(sv[k])));
  const storyOut = path.join(root, 'img', 'prompts', 'winners', `${data.month}-story`);
  await renderStory(chromium, storyHtml, storyOut);
  console.log('Wrote', `${storyOut}.png`, `${storyOut}.mp4`);
}
main().catch((e) => { console.error(e); process.exit(1); });
