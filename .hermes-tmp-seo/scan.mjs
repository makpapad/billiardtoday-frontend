import fs from 'node:fs';
const urls = fs.readFileSync('.hermes-tmp-seo/turls.txt', 'utf8').trim().split('\n');
const CONC = 8;
let i = 0;
const rows = [];
async function worker() {
  while (i < urls.length) {
    const u = urls[i++];
    try {
      const res = await fetch('http://localhost:3022' + u, { signal: AbortSignal.timeout(120000) });
      const body = await res.text();
      const n = body.split('Match results by stage').length - 1;
      rows.push({ n, status: res.status, bytes: body.length, u });
    } catch (e) {
      rows.push({ n: -1, status: 0, bytes: 0, u, err: String(e).slice(0, 60) });
    }
    if (rows.length % 50 === 0) console.log('done', rows.length);
  }
}
await Promise.all(Array.from({ length: CONC }, worker));
fs.writeFileSync('.hermes-tmp-seo/scan2.json', JSON.stringify(rows));
console.log('total', rows.length, 'zero', rows.filter(r => r.n === 0).length);
