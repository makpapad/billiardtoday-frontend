import fs from 'node:fs';
const urls = process.argv.slice(2);
for (const u of urls) {
  try {
    const res = await fetch('http://localhost:3022' + u, { signal: AbortSignal.timeout(120000) });
    const body = await res.text();
    const n = body.split('Match results by stage').length - 1;
    const part = body.split('Participants —').length - 1;
    const rows = body.split('Match results by stage').length > 2;
    console.log(n, res.status, body.length, 'participants=' + part, u);
  } catch (e) {
    console.log('ERR', u, String(e).slice(0, 50));
  }
}
