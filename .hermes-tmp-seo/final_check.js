const { chromium } = require('playwright');

const URLS = [
  'http://localhost:3022/tournaments/world-cup-3-cushion-yanggu-2026',
  'http://localhost:3022/tournaments/european-championship-3-cushion-u25-2026',
  'http://localhost:3022/tournaments/ming-hui-chang/', // 404-ish sanity, replaced below
];

(async () => {
  const urls = process.argv.slice(2);
  const b = await chromium.launch({ channel: 'chrome' });
  for (const url of urls) {
    for (const width of [1366, 1280]) {
      // 1) JS απενεργοποιημένο: ό,τι βλέπει ο crawler/NoJS χρήστης.
      const ctxNoJs = await b.newContext({ javaScriptEnabled: false, viewport: { width, height: 768 } });
      const p = await ctxNoJs.newPage();
      const resp = await p.goto(url, { waitUntil: 'load', timeout: 180000 });
      const nojs = await p.evaluate(() => {
        const vis = (e) => getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0;
        const tbls = [...document.querySelectorAll('table')].filter(vis);
        const txt = document.body.innerText.replace(/\s+/g, ' ').trim();
        return {
          status: document.readyState,
          visibleTables: tbls.length,
          visibleRows: tbls.reduce((n, t) => n + t.querySelectorAll('tbody tr').length, 0),
          emptyVisibleTables: tbls.filter((t) => t.querySelectorAll('tbody tr').length === 0).length,
          visibleTextLen: txt.length,
          hasResultsHeading: txt.includes('Match results by stage'),
          hScroll: document.documentElement.scrollWidth > window.innerWidth + 1,
          scrollW: document.documentElement.scrollWidth,
          innerW: window.innerWidth,
        };
      });
      await ctxNoJs.close();

      // 2) JS ενεργό: επιβεβαίωση ότι τα arbitrary variants του πίνακα όντως εφαρμόζονται.
      const ctxJs = await b.newContext({ viewport: { width, height: 900 } });
      const p2 = await ctxJs.newPage();
      const resp2 = await p2.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
      const styled = await p2.evaluate(() => {
        const tbl = document.querySelector('table');
        if (!tbl) return { table: false };
        const td = tbl.querySelector('tbody td');
        const th = tbl.querySelector('th');
        const a = tbl.querySelector('tbody a');
        const tr = tbl.querySelector('tbody tr');
        const cs = (el) => (el ? getComputedStyle(el) : null);
        const wrapper = tbl.closest('div');
        return {
          table: true,
          firstRowText: tr.innerText.replace(/\s+/g, ' ').trim(),
          tdPadTop: cs(td).paddingTop,
          tdPadRight: cs(td).paddingRight,
          thUpperCase: cs(th).textTransform,
          thFontSize: cs(th).fontSize,
          aUnderline: cs(a) ? cs(a).textDecorationLine : null,
          aDecoration: cs(a) ? cs(a).textDecorationStyle : null,
          aWeight: cs(a) ? cs(a).fontWeight : null,
          trBorderTop: cs(tr).borderTopWidth,
          tableMinWidth: cs(tbl).minWidth,
          wrapperOverflow: wrapper ? cs(wrapper).overflowX : null,
          wrapperScrolls: wrapper ? wrapper.scrollWidth > wrapper.clientWidth + 1 : null,
          docScrollW: document.documentElement.scrollWidth,
          innerW: window.innerWidth,
          hasParticipantsHeading: document.body.innerText.includes('Participants —'),
        };
      });
      await ctxJs.close();

      console.log(JSON.stringify({ url, width, status: resp && resp.status(), statusJs: resp2 && resp2.status(), nojs, styled }));
    }
  }
  await b.close();
})();
