// Fills winnerImage + winners for one cycle in js/prompts-data.js, touching nothing else.
// Usage: node tools/update-prompts-data.js <data.json>
const fs = require('fs');
const path = require('path');

const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

function winnerObj(w) {
  const f = [`name: ${q(w.name)}`, `title: ${q(w.title)}`];
  for (const k of ['instagram', 'tiktok', 'facebook', 'twitter']) {
    if (w.handles && w.handles[k]) f.push(`${k}: ${q(w.handles[k])}`);
  }
  return `{ ${f.join(', ')} }`;
}

function winnersBlock(data, indent) {
  const byPlace = { 1: [], 2: [], 3: [] };
  data.winners.forEach((w) => byPlace[w.place].push(w));
  const line = (key, arr) => {
    key = `${key}:`.padEnd(7);
    if (!arr.length) return `${indent}  ${key} null,`;
    if (arr.length === 1) return `${indent}  ${key} ${winnerObj(arr[0])},`;
    return `${indent}  ${key} [\n${arr.map((w) => `${indent}    ${winnerObj(w)},`).join('\n')}\n${indent}  ],`;  };
  return `winners: {\n${line('first', byPlace[1])}\n${line('second', byPlace[2])}\n${line('third', byPlace[3])}\n${indent}},`;
}

const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const file = path.join(__dirname, '..', 'js', 'prompts-data.js');
let src = fs.readFileSync(file, 'utf8');

const start = src.indexOf(`month:`) >= 0 ? src.indexOf(`'${data.monthLabel}',`) : -1;
if (start < 0) throw new Error(`No cycle with month '${data.monthLabel}' in prompts-data.js`);
// The month: line is the second string in the block; find the block's opening brace before it.
const blockStart = src.lastIndexOf('\n  {', start);
const blockEnd = src.indexOf('\n  },', start);
if (blockStart < 0 || blockEnd < 0) throw new Error('Could not locate the cycle block');
let block = src.slice(blockStart, blockEnd);

if (!/winnerImage:\s*[^,\n]+,/.test(block)) throw new Error('No winnerImage: key in cycle block');
block = block.replace(/winnerImage:\s*[^,\n]+,/, `winnerImage:     'img/prompts/winners/${data.month}.png',`);

const wStart = block.indexOf('winners:');
if (wStart < 0) throw new Error('No winners: key in cycle block');
let depth = 0;
let j = block.indexOf('{', wStart);
for (; j < block.length; j++) {
  if (block[j] === '{') depth++;
  else if (block[j] === '}' && --depth === 0) break;
}
let end = j + 1;
if (block[end] === ',') end++;
block = block.slice(0, wStart) + winnersBlock(data, '    ') + block.slice(end);

src = src.slice(0, blockStart) + block + src.slice(blockEnd);
fs.writeFileSync(file, src);
console.log('Updated', file);
