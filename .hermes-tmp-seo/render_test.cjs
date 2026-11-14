// Harness: αποδίδει το πραγματικό component με react-dom/server, χωρίς Next runtime.
// Σκοπός: απόδειξη της συμπεριφοράς όταν ΔΕΝ υπάρχουν δημοσιευμένα αποτελέσματα.
const fs = require('fs');
const path = require('path');
const sharpRequire = require('module').createRequire(__filename);

(async () => {
  const swc = require('next/dist/build/swc');
  const src = fs.readFileSync('src/components/public/TournamentResultsSection.tsx', 'utf8');
  const out = await swc.transform(src, {
    filename: 'TournamentResultsSection.tsx',
    jsc: {
      parser: { syntax: 'typescript', tsx: true },
      transform: { react: { runtime: 'automatic', development: false } },
      target: 'es2020',
    },
    module: { type: 'es6' },
  });
  let code = String(out.code);
  // Αντικατάσταση του next/link με τοπικό stub ώστε να τρέξει εκτός Next.
  code = code.replace(/(["'])next\/link\1/g, "'./link-stub.mjs'");
  const tmp = path.join('.hermes-tmp-seo', 'trs.gen.mjs');
  fs.writeFileSync(tmp, code);

  const React = sharpRequire('react');
  const { renderToStaticMarkup } = sharpRequire('react-dom/server');
  const mod = await import('file://' + path.resolve(tmp) + '?v=' + Date.now());
  const Section = mod.TournamentResultsSection;

  const cases = {
    noStages: [],
    stagesWithoutMatches: [
      { key: 's1', title: 'PPPQ', order: 1, matches: [] },
    ],
    oneStage: [
      {
        key: 's1',
        title: 'PPPQ',
        order: 1,
        matches: [
          {
            key: 'm1',
            label: '1',
            group: 'A',
            player1: {
              id: 1,
              documentId: 'p1',
              name: 'KATOU Kazuhiro',
              nameEn: null,
              country: 'JP',
              seed: null,
              ranking: null,
              href: '/players/katou-kazuhiro-1',
            },
            player2: null,
            player1Fallback: null,
            player2Fallback: 'Winner of match 12',
            player1Points: 30,
            player2Points: 21,
            player1Innings: 27,
            player2Innings: 27,
            player1MatchPoints: 2,
            player2MatchPoints: 0,
            player1HighRun: 4,
            player2HighRun: 3,
          },
        ],
      },
    ],
  };

  for (const [name, stages] of Object.entries(cases)) {
    const html = renderToStaticMarkup(React.createElement(Section, { stages, title: 'Demo Event 2026' }));
    console.log(
      JSON.stringify({
        case: name,
        htmlLen: html.length,
        tables: (html.match(/<table/g) || []).length,
        details: (html.match(/<details/g) || []).length,
        rows: (html.match(/<tr/g) || []).length,
        html: html.slice(0, 1800),
      }),
    );
  }
})();
