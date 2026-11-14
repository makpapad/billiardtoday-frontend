const { chromium } = require('playwright');

(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
  const p = await ctx.newPage();
  await p.goto('http://localhost:3022/tournaments/european-championship-3-cushion-u25-2026', { waitUntil: 'domcontentloaded', timeout: 180000 });
  const r = await p.evaluate(() => {
    const cs = (el) => getComputedStyle(el);
    const results = [...document.querySelectorAll('table')].filter((t) => cs(t).minWidth === '600px');
    return {
      resultsTables: results.length,
      rowsPerTable: results.map((t) => t.querySelectorAll('tbody tr').length),
      firstRow: results[0] ? results[0].querySelector('tbody tr').innerText.replace(/\s+/g, ' ').trim() : null,
      thLabels: results[0] ? [...results[0].querySelectorAll('th')].map((t) => t.innerText) : null,
      thTitles: results[0] ? [...results[0].querySelectorAll('th')].map((t) => t.getAttribute('title')) : null,
      headings: [...document.querySelectorAll('h3')].map((h) => h.innerText.trim()),
      details: [...document.querySelectorAll('details')].length,
      tdCount: results.reduce((n, t) => n + t.querySelectorAll('tbody td').length, 0),
      aCount: results.reduce((n, t) => n + t.querySelectorAll('tbody a').length, 0),
    };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
