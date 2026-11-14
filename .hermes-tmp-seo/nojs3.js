const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const ctx = await b.newContext({ javaScriptEnabled: false });
  const p = await ctx.newPage();
  await p.goto('https://billiardtoday.com/tournaments/world-cup-3-cushion-yanggu-2026', { waitUntil: 'load', timeout: 60000 });
  const r = await p.evaluate(() => {
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll('script,style,noscript').forEach(n => n.remove());
    const markupText = clone.textContent.replace(/\s+/g,' ').trim();
    const hidden = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.children.length === 0 && el.textContent.trim().length > 25) {
        const s = getComputedStyle(el);
        const vis = s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' && el.getClientRects().length > 0;
        if (!vis) {
          let anc = el, chain = [];
          for (let i=0;i<4 && anc;i++){ anc = anc.parentElement; if(!anc) break; chain.push(anc.tagName + (anc.className && typeof anc.className==='string' ? '.'+anc.className.split(' ').slice(0,3).join('.') : '')); }
          hidden.push({ text: el.textContent.trim().slice(0,60), tag: el.tagName, chain });
        }
      }
    });
    return { markupTextLen: markupText.length, visibleLen: document.body.innerText.replace(/\s+/g,' ').trim().length,
      hiddenLeafCount: hidden.length, hiddenSample: hidden.slice(0,6),
      hasPlayerName: markupText.includes('AGUILAR'), markupHasMatchData: /innings|Points|Avg/.test(markupText) };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
