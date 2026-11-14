import fs from 'node:fs';
const all = fs.readFileSync('.hermes-tmp-seo/turls.txt', 'utf8').trim().split('\n');
const start = Number(process.argv[2] || 0);
const end = Number(process.argv[3] || all.length);
const urls = all.slice(start, end);
const CONC = 16;
let i = 0;
const out = fs.createWriteStream('.hermes-tmp-seo/scan_lines.jsonl', { flags: 'a' });
function emit(obj) {
  out.write(JSON.stringify(obj) + '\n');
}
async function worker() {
  while (i < urls.length) {
    const u = urls[i++];
    try {
      const res = await fetch('http://localhost:3022' + u, { signal: AbortSignal.timeout(60000) });
      const body = await res.text();
      emit({ u, s: res.status, n: body.split('Match results by stage').length - 1, b: body.length });
    } catch (e) {
      emit({ u, s: 0, n: -1, b: 0, e: String(e).slice(0, 40) });
    }
  }
}
await Promise.all(Array.from({ length: CONC }, worker));
out.end();
console.log('chunk done', start, end);
