const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const ctx = await b.newContext({ javaScriptEnabled: false });
  const p = await ctx.newPage();
  await p.goto('http://localhost:3022/tournaments/world-cup-3-cushion-yanggu-2026', { waitUntil: 'load', timeout: 180000 });
  const r = await p.evaluate(() => {
    const vis = e => getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0;
    const tbls = [...document.querySelectorAll('table')].filter(vis);
    const txt = document.body.innerText.replace(/\s+/g,' ').trim();
    return {
      visibleTextLen: txt.length,
      visibleTables: tbls.length,
      visibleRows: tbls.reduce((n,t)=>n+t.querySelectorAll('tbody tr').length,0),
      hasStageHeading: txt.includes('Match results by stage'),
      hasScoreCell: /30–21|32–39/.test(txt),
      sample: txt.slice(txt.indexOf('Match results by stage'), txt.indexOf('Match results by stage')+420)
    };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
