// Renders the casting call graphic (light design) to img/casting/<date>-<slug>.png at 2160x2160.
// Usage: node tools/render-casting.js <data.json>
// data.json: { script, date:'YYYY-MM-DD', times:'4:30 PM or 6:00 PM' }
// Prints the repo-relative image path on the last line of stdout.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// '2026-08-24' + '4:30 PM or 6:00 PM' -> 'Aug 24, 4:30 PM or 6:00 PM ET'
function dateLine(date, times) {
  const [, m, d] = date.split('-').map(Number);
  const t = String(times).trim();
  return `${MONTHS[m - 1]} ${d}, ${t}${/\bET$/i.test(t) ? '' : ' ET'}`;
}
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'call';

async function main() {
  const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const root = path.join(__dirname, '..');
  const tpl = fs.readFileSync(path.join(__dirname, 'casting-graphic', 'template.html'), 'utf8');
  const vals = { scriptTitle: data.script, dateTime: dateLine(data.date, data.times) };
  const html = tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => esc(vals[k]));
  const rel = `img/casting/${data.date}-${slug(data.script)}.png`;
  fs.mkdirSync(path.join(root, 'img', 'casting'), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(root, rel), clip: { x: 0, y: 0, width: 1080, height: 1080 } });
  await browser.close();
  console.log(rel);
}
main().catch((e) => { console.error(e); process.exit(1); });
