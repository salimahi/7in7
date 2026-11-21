// Renders the winners graphic to img/prompts/winners/YYYY-MM.png.
// Usage: node tools/render.js <data.json>
// data.json: { month:'2026-11', monthLabel:'November 2026', tied:false,
//   winners:[{ place:1, title, name, handles:{instagram,tiktok,facebook,twitter} }, ...] }
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function handleText(h = {}) {
  const parts = [];
  if (h.instagram) parts.push(`IG: @${h.instagram}`);
  if (h.tiktok) parts.push(`TT: @${h.tiktok}`);
  if (h.twitter) parts.push(`X: @${h.twitter}`);
  if (h.facebook) parts.push(`FB: ${h.facebook}`);
  return parts.join(' ');
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
    vals[`w${i + 1}Handle`] = handleText(w.handles);
  });
  const html = tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => esc(vals[k]));
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
