const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2];
  const b = await chromium.launch({ channel: 'chrome' });
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  const r = await p.evaluate(() => {
    const cs = (el) => getComputedStyle(el);
    const results = [...document.querySelectorAll('table')].filter((t) => cs(t).minWidth === '600px');
    return results.map((t) => {
      const h3 = t.closest('section') ? t.closest('section').querySelector('h3') : null;
      return {
        stage: h3 ? h3.innerText.trim() : null,
        rows: t.querySelectorAll('tbody tr').length,
        links: t.querySelectorAll('tbody a').length,
        firstRow: t.querySelector('tbody tr') ? t.querySelector('tbody tr').innerText.replace(/\s+/g, ' ').trim() : null,
      };
    });
  });
  for (const s of r) console.log(JSON.stringify(s));
  console.log('stages=' + r.length + ' totalRows=' + r.reduce((n, s) => n + s.rows, 0) + ' totalLinks=' + r.reduce((n, s) => n + s.links, 0));
  await b.close();
})();
