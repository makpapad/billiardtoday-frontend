const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await b.newPage();
  const hits = [];
  p.on('response', async (res) => {
    const u = res.url();
    if (u.includes('/event-data/') || u.includes('/final-results')) {
      try { const body = await res.body(); hits.push({ url: u.replace('https://billiardtoday.com',''), kb: Math.round(body.length/1024), ms: null }); } catch {}
    }
  });
  const t0 = Date.now();
  await p.goto('https://billiardtoday.com/tournaments/world-cup-3-cushion-yanggu-2026', { waitUntil: 'networkidle', timeout: 90000 });
  const total = Date.now() - t0;
  const perf = await p.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0] || {};
    return { domContentLoaded: Math.round(n.domContentLoadedEventEnd||0), load: Math.round(n.loadEventEnd||0), transferKB: Math.round((n.transferSize||0)/1024) };
  });
  console.log(JSON.stringify({ networkidleMs: total, perf, payloads: hits }, null, 1));
  await b.close();
})();
