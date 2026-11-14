const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const ctx = await browser.newContext({ javaScriptEnabled: false, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36' });
  const page = await ctx.newPage();
  for (const url of ['https://billiardtoday.com/', 'https://billiardtoday.com/tournaments/world-cup-3-cushion-yanggu-2026']) {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    const info = await page.evaluate(() => {
      const t = document.body.innerText || '';
      const ok = (s) => s && t.includes(s);
      return {
        title: document.title,
        textLen: t.length,
        hasPlayingNow: ok('Playing now'),
        hasMasterLeague: ok('Master League'),
        hasHCO: ok('World Cup 3-Cushion, Yanggu'),
        visibleH1: [...document.querySelectorAll('h1')].filter(e => e.offsetHeight > 0).map(e => e.innerText.trim()).slice(0,3),
        tables: document.querySelectorAll('table').length,
        rows: document.querySelectorAll('tr').length,
        bodyHeight: document.body.getBoundingClientRect().height,
        sample: t.slice(0, 260).replace(/\n+/g,' | ')
      };
    });
    console.log('=== ' + url);
    console.log(JSON.stringify(info, null, 1));
  }
  await browser.close();
})();
