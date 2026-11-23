// Keeps casting/index.html (the write7in7.com/casting redirect) in step with casting/calls.json.
// Usage:
//   node tools/casting-sync.js                 -> recompute the redirect from calls.json
//   node tools/casting-sync.js --add data.json -> append the call in data.json first
// data.json: { script, date:'YYYY-MM-DD', times, link, image }
// Rule: the newest submitted call whose recording date has not passed (America/New_York) wins;
// with none left, the redirect returns to the evergreen signup form.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CALLS = path.join(ROOT, 'casting', 'calls.json');
const PAGE = path.join(ROOT, 'casting', 'index.html');
const URL_LINE = /(var CASTING_CALL_FORM_URL = ")[^"]*(";)/;

const todayET = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());

// calls are in submission order (oldest first); ISO dates compare as strings.
function desiredUrl(state, today = todayET()) {
  for (let i = state.calls.length - 1; i >= 0; i--) {
    if (state.calls[i].date >= today) return { url: state.calls[i].link, call: state.calls[i] };
  }
  return { url: state.evergreen, call: null };
}

function sync(addFile) {
  const state = JSON.parse(fs.readFileSync(CALLS, 'utf8'));
  if (addFile) {
    const c = JSON.parse(fs.readFileSync(addFile, 'utf8'));
    state.calls.push({ script: c.script, date: c.date, times: c.times, link: c.link, image: c.image, addedAt: new Date().toISOString() });
    fs.writeFileSync(CALLS, JSON.stringify(state, null, 2) + '\n');
  }
  const { url, call } = desiredUrl(state);
  const html = fs.readFileSync(PAGE, 'utf8');
  if (!URL_LINE.test(html)) throw new Error('CASTING_CALL_FORM_URL line not found in casting/index.html');
  const out = html.replace(URL_LINE, (_, a, b) => `${a}${url}${b}`);
  const changed = out !== html;
  if (changed) fs.writeFileSync(PAGE, out);
  return { url, changed, active: call ? `${call.script} (${call.date})` : 'none (evergreen)' };
}

module.exports = { desiredUrl, sync };

if (require.main === module) {
  const i = process.argv.indexOf('--add');
  console.log(JSON.stringify(sync(i > -1 ? process.argv[i + 1] : null)));
}
