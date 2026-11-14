const { chromium } = require('playwright');

(async () => {
  const urls = process.argv.slice(2);
  const b = await chromium.launch({ channel: 'chrome' });
  const ctx = await b.newContext({ javaScriptEnabled: false, viewport: { width: 1366, height: 768 } });
  const out = [];
  for (const url of urls) {
    const p = await ctx.newPage();
    const resp = await p.goto(url, { waitUntil: 'load', timeout: 240000 });
    const r = await p.evaluate(() => {
      const vis = (e) => getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0;
      const tbls = [...document.querySelectorAll('table')].filter(vis);
      const txt = document.body.innerText.replace(/\s+/g, ' ').trim();
      const idx = txt.indexOf('Match results by stage');
      const wrappers = [...document.querySelectorAll('div.overflow-x-auto')].filter(vis);
      return {
        visibleTextLen: txt.length,
        visibleTables: tbls.length,
        visibleRows: tbls.reduce((n, t) => n + t.querySelectorAll('tbody tr').length, 0),
        openDetails: document.querySelectorAll('details').length,
        openDetailsShown: [...document.querySelectorAll('details')].filter((d) => d.open).length,
        stageHeadings: [...document.querySelectorAll('h3')].filter(vis).length,
        emptyTables: tbls.filter((t) => t.querySelectorAll('tbody tr').length === 0).length,
        playerLinks: [...document.querySelectorAll('table a[href^="/players/"]')].filter(vis).length,
        hasSection: idx >= 0,
        sample: idx >= 0 ? txt.slice(idx, idx + 320) : txt.slice(0, 320),
        docScrollW: document.documentElement.scrollWidth,
        winW: window.innerWidth,
        hScroll: document.documentElement.scrollWidth > window.innerWidth + 1,
        tableOverflow: wrappers.map((w) => (w.scrollWidth > w.clientWidth + 1 ? w.scrollWidth + '>' + w.clientWidth : 'ok')),
      };
    });
    out.push({ url, status: resp && resp.status(), ...r });
    await p.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
