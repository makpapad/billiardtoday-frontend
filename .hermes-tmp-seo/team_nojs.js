const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const ctx = await b.newContext({ javaScriptEnabled: false });
  const p = await ctx.newPage();
  const urls = [
    'https://billiardtoday.com/tournaments/team/3-cushion-2026-2027-a1-katigoria',
    'https://billiardtoday.com/tournaments/master-league-1o-toyrnoya-2026-2027-2026'
  ];
  for (const u of urls) {
    await p.goto(u, { waitUntil: 'load', timeout: 60000 });
    const r = await p.evaluate(() => {
      const vis = e => getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0;
      const txt = document.body.innerText.replace(/\s+/g,' ').trim();
      const tbls = [...document.querySelectorAll('table')].filter(vis);
      return {
        title: document.title,
        visibleTextLen: txt.length,
        visibleTables: tbls.length,
        visibleRows: tbls.reduce((n,t)=>n+t.querySelectorAll('tbody tr').length,0),
        playerLinks: new Set([...document.querySelectorAll('a[href^="/players/"]')].map(a=>a.getAttribute('href'))).size,
        teamLinks: new Set([...document.querySelectorAll('a[href*="/teams/"]')].map(a=>a.getAttribute('href'))).size,
        sample: txt.slice(300, 900)
      };
    });
    console.log('=== ' + u);
    console.log(JSON.stringify(r, null, 1));
  }
  await b.close();
})();
