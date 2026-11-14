const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const ctx = await b.newContext({ javaScriptEnabled: false });
  const p = await ctx.newPage();
  await p.goto('https://billiardtoday.com/tournaments/world-cup-3-cushion-yanggu-2026', { waitUntil: 'load', timeout: 60000 });
  const r = await p.evaluate(() => {
    const vis = (el) => { const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && el.offsetHeight > 0; };
    const tabs = [...document.querySelectorAll('button,[role="tab"]')].slice(0, 14).map(e => e.innerText.trim()).filter(Boolean);
    const hiddenBig = [...document.querySelectorAll('div,section,table')].filter(e => !vis(e) && e.textContent.trim().length > 300).length;
    return {
      domText: document.body.textContent.replace(/\s+/g,' ').trim().length,
      visibleText: document.body.innerText.replace(/\s+/g,' ').trim().length,
      tables: document.querySelectorAll('table').length,
      rows: document.querySelectorAll('tr').length,
      playerLinks: new Set([...document.querySelectorAll('a[href^="/players/"]')].map(a=>a.getAttribute('href'))).size,
      buttons: tabs,
      hiddenBlocksOver300chars: hiddenBig,
      visible: document.body.innerText.replace(/\s+/g,' ').trim().slice(0, 996)
    };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
