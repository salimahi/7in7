// Renders the winners graphic to img/prompts/winners/YYYY-MM.png.
// Usage: node tools/render.js <data.json>
// data.json: { month:'2026-11', monthLabel:'November 2026', tied:false,
//   winners:[{ place:1, title, name, handles:{instagram,tiktok,facebook,twitter} }, ...] }
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Social icons (24x24, filled with the template's gold handle colour).
const ICONS = {
  instagram: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
  tiktok: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
  twitter: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>',
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
}
main().catch((e) => { console.error(e); process.exit(1); });
