import json, html, os

rows = json.load(open("ceb16_clean.json", encoding="utf-8"))

EVENTS = [
    ("A", "EC", "European Championship 3-Cushion Individual – Antalya (TR)", "15/03/2026",
     "80 / 54 / 38 / 26 / 16 / 8 / 4", "2c8d4cc9-cbb6-480f-98a6-01e73a8d4c9e", "european-championship-3-cushion-individual-2026"),
    ("B", "NC 24/25", "National Championships – Season 2024/2025", "", "40 / 27 / 19 / 13 / 8 / 4", None, None),
    ("C", "NC 25/26", "National Championships – Season 2025/2026", "", "40 / 27 / 19 / 13 / 8 / 4", None, None),
    ("D", "NC 26/27", "National Championships – Season 2026/2027", "", "40 / 27 / 19 / 13 / 8 / 4", None, None),
    ("E", "WC Ankara 25", "UMB / CEB World Cup – Ankara (TR)", "15/06/2025",
     "40 / 27 / 19 / 13 / 8 / 4 / 2", "4878d859-934a-4bfe-8edf-4e0fb57999b4", "world-cup-3-cushion-ankara-2025"),
    ("F", "WC Porto 25", "UMB / CEB World Cup – Porto (PT)", "05/07/2025",
     "40 / 27 / 19 / 13 / 8 / 4 / 2", "d6676863-ced3-49e0-adb1-5bd9850c2e15", "world-cup-3-cushion-porto-2025"),
    ("G", "WC Antwerp 25", "UMB / CEB World Cup – Antwerp (BE)", "12/10/2025",
     "40 / 27 / 19 / 13 / 8 / 4 / 2", "ec9b5e40-0264-4647-950e-d50edf88cb65", "world-cup-3-cushion-antwerp-2025"),
    ("H", "WC Ankara 26", "UMB / CEB World Cup – Ankara (TR)", "14/06/2026",
     "40 / 27 / 19 / 13 / 8 / 4 / 2", "f45f1401-2772-49ea-8e7c-3a31240d09aa", "world-cup-3-cushion-ankara-2026"),
    ("I", "WC Porto 26", "UMB / CEB World Cup – Porto (PT)", "18/07/2026",
     "40 / 27 / 19 / 13 / 8 / 4 / 2", "35b08ee0-c07f-4c65-9e6f-3c9e9f6b2b91", "world-cup-3-cushion-porto-2026"),
    ("J", "WC Lier 26", "UMB / CEB World Cup – Lier (BE)", "06/09/2026",
     "40 / 27 / 19 / 13 / 8 / 4 / 2", "e8e9634d-7f81-429c-8e08-ada646adc353", "world-cup-3-cushion-lier-2026"),
]

data = []
for r in sorted(rows, key=lambda x: x["rank"]):
    data.append({
        "r": r["rank"], "n": r["name"], "f": r["fed"], "p": r["Pnts"],
        "e": [r["ev"].get(c) for c in "ABCDEFGHIJ"],
        "s": r["dates"][0] if r["dates"] else None,
    })

js_events = json.dumps([
    {"k": k, "short": s, "name": nm, "date": d, "scale": sc,
     "href": (f"/tournaments/{doc}--{sl}" if doc else None)}
    for k, s, nm, d, sc, doc, sl in EVENTS
], ensure_ascii=False)

HTML = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CEB Official Rankings — 3-Cushion Individual | BilliardToday</title>
<style>
  :root{
    --ink:#0f172a; --muted:#64748b; --line:rgba(15,23,42,.08);
    --sky:#0369a1; --cyan:#a5f3fc; --bg:#f6f8fb; --card:#fff;
    --susp:#d2cfcf;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
    font:14px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
  .wrap{max-width:1180px;margin:0 auto;padding:28px 16px 56px}
  .crumbs{font-size:12px;color:var(--muted);margin-bottom:14px}
  .crumbs a{color:var(--sky);text-decoration:none}
  .crumbs span{margin:0 6px;opacity:.5}
  .hero{border-radius:32px;padding:30px 32px;color:#fff;
    background:linear-gradient(135deg,#0f172a 0%,#082f49 100%);
    box-shadow:0 24px 80px rgba(15,23,42,.16)}
  .hero .eyebrow{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:rgba(165,243,252,.85);font-weight:700}
  .hero h1{margin:12px 0 10px;font-size:30px;line-height:1.15;letter-spacing:-.02em}
  .hero p{margin:0;max-width:760px;color:rgba(255,255,255,.78);font-size:14px}
  .badges{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
  .badge{border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:5px 12px;font-size:12px;color:rgba(255,255,255,.9)}
  .badge b{color:#fff}
  .rules{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));margin:18px 0 0}
  .rule{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.13);border-radius:18px;padding:12px 14px;font-size:12.5px;color:rgba(255,255,255,.82)}
  .rule b{display:block;color:#fff;font-size:12px;letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:28px;margin-top:18px;
    box-shadow:0 24px 80px rgba(15,23,42,.08)}
  .card-head{padding:20px 24px 0}
  .card-head h2{margin:0;font-size:20px;letter-spacing:-.01em}
  .card-head .sub{color:var(--muted);font-size:12.5px;margin-top:4px}
  .controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:16px 24px}
  input[type=search],select{border:1px solid var(--line);background:#fff;border-radius:12px;padding:9px 12px;font:inherit;font-size:13px;color:var(--ink)}
  input[type=search]{min-width:230px}
  .chip{border:1px solid var(--line);background:#fff;border-radius:999px;padding:8px 14px;font-size:12.5px;cursor:pointer;color:var(--muted)}
  .chip.on{background:#0f172a;border-color:#0f172a;color:#fff}
  .grow{flex:1}
  .live{font-size:11.5px;color:var(--muted);display:flex;align-items:center;gap:6px}
  .dot{width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.18)}
  .tablewrap{overflow:auto;padding:0 12px 8px}
  table{border-collapse:separate;border-spacing:0;width:100%;font-variant-numeric:tabular-nums}
  th,td{padding:7px 8px;text-align:right;white-space:nowrap}
  th{position:sticky;top:0;background:#fff;z-index:2;border-bottom:1px solid var(--line);font-size:11.5px;color:var(--muted);font-weight:600}
  thead tr.hdr2 th{top:29px;font-size:10.5px;font-weight:600;color:#94a3b8;padding-top:0}
  th.num,td.num{width:34px}
  th.left,td.left{text-align:left}
  td{border-bottom:1px solid rgba(15,23,42,.05);font-size:13px}
  tbody tr:hover td{background:#f8fbff}
  .pos{color:var(--muted);font-size:12px}
  .name{font-weight:600}
  .fed{display:inline-block;min-width:26px;text-align:center;font-size:11px;font-weight:700;color:#475569;background:#f1f5f9;border-radius:6px;padding:2px 5px}
  .pts{font-weight:700}
  .zero{color:#cbd5e1}
  th.ev a{color:var(--sky);text-decoration:none;border-bottom:1px dotted rgba(3,105,161,.5)}
  th.ev.ours::after{content:"›";color:var(--sky);font-weight:700;margin-left:2px}
  tr.susp td{background:var(--susp);color:#5b5b5b}
  tr.susp .name::after{content:"suspended";margin-left:8px;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#6b6b6b;
    border:1px solid rgba(0,0,0,.18);border-radius:6px;padding:1px 5px;font-weight:700;vertical-align:1px}
  .foot{padding:14px 24px 22px;color:var(--muted);font-size:12px;display:flex;flex-wrap:wrap;gap:14px;align-items:center}
  .pager{display:flex;gap:6px;align-items:center;margin-left:auto}
  .pager button{border:1px solid var(--line);background:#fff;border-radius:10px;padding:6px 11px;font:inherit;font-size:12.5px;cursor:pointer;color:var(--ink)}
  .pager button:disabled{opacity:.4;cursor:default}
  .pager .cur{padding:0 4px;color:var(--muted);font-size:12.5px}
  .note{font-size:11.5px;color:#94a3b8;margin-top:6px}
</style>
</head>
<body>
<div class="wrap">

  <div class="crumbs"><a href="#">Rankings</a><span>/</span><a href="#">CEB Official Rankings</a><span>/</span>3-Cushion Individual</div>

  <header class="hero">
    <div class="eyebrow">CEB Official Ranking · Individual</div>
    <h1>3-Cushion Individual — European Ranking</h1>
    <p>The official CEB ranking list, published by the Confédération Européenne de Billard, with the point
       breakdown of every counting tournament. Each tournament column links to the event page on BilliardToday.</p>
    <div class="badges">
      <span class="badge">Edition <b>16/2026</b></span>
      <span class="badge">Last update <b>06/09/2026</b></span>
      <span class="badge"><b>1,482</b> players</span>
      <span class="badge"><b>23</b> federations</span>
      <span class="badge">After <b>WC Lier (BE)</b></span>
    </div>
    <div class="rules">
      <div class="rule"><b>Who is listed</b>European players only — non-European World Cup winners get no points here.</div>
      <div class="rule"><b>Which events count</b>Only World Cups held in Europe, plus the European Championship and national championships.</div>
      <div class="rule"><b>National championships</b>Points come from each federation; the others are entered from the CEB list.</div>
    </div>
  </header>

  <section class="card">
    <div class="card-head">
      <h2>Standings</h2>
      <div class="sub">Points per counting tournament (A–J) and total. Hover a column letter for the event, date and points scale.</div>
    </div>

    <div class="controls">
      <input id="q" type="search" placeholder="Search player name…" autocomplete="off">
      <select id="fed"></select>
      <button class="chip on" id="showSusp">Suspended shown</button>
      <span class="grow"></span>
      <span class="live"><i class="dot"></i>filters &amp; search update instantly · list refreshed after each CEB update</span>
    </div>

    <div class="tablewrap">
      <table id="tbl">
        <thead>
          <tr class="hdr1">
            <th class="num">#</th><th class="left">Player</th><th>Fed</th><th>Pts</th>
            <th class="num" colspan="10">Points by counting tournament</th>
          </tr>
          <tr class="hdr2" id="evhdr"></tr>
        </thead>
        <tbody id="body"></tbody>
      </table>
    </div>

    <div class="foot">
      <span id="count"></span>
      <span class="note">Source: CEB official ranking PDF (edition 16/2026). BilliardToday mirrors it — it is not computed from our own results.</span>
      <span class="pager">
        <button id="prev">‹ Prev</button>
        <span class="cur" id="pageinfo"></span>
        <button id="next">Next ›</button>
      </span>
    </div>
  </section>
</div>

<script>
const EVENTS = __EVENTS__;
const ROWS = __ROWS__;
const PAGE = 50;

let state = { q:"", fed:"", showSusp:true, page:1 };

const evhdr = document.getElementById("evhdr");
evhdr.innerHTML = '<th class="num"></th><th class="left"></th><th></th><th>Total</th>' +
  EVENTS.map(e => {
    const label = e.href ? `<a href="${e.href}" title="${e.name}${e.date ? " · " + e.date : ""} · points ${e.scale}">${e.k}</a>`
                         : e.k;
    return `<th class="num ev ${e.href ? "ours" : ""}" title="${e.name}${e.date ? " · " + e.date : ""} · points ${e.scale}"><div>${label}</div><div style="font-weight:500;color:#94a3b8">${e.short}</div></th>`;
  }).join("");

const feds = [...new Set(ROWS.map(r => r.f))].sort();
document.getElementById("fed").innerHTML = '<option value="">All federations (' + feds.length + ')</option>' +
  feds.map(f => `<option value="${f}">${f} — ${ROWS.filter(r => r.f === f).length}</option>`).join("");

function filtered(){
  const q = state.q.trim().toLowerCase();
  return ROWS.filter(r =>
    (!q || r.n.toLowerCase().includes(q)) &&
    (!state.fed || r.f === state.fed)
  );
}

function render(){
  const list = filtered();
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  if (state.page > pages) state.page = pages;
  const slice = list.slice((state.page - 1) * PAGE, state.page * PAGE);

  document.getElementById("body").innerHTML = slice.map(r => {
    const cells = r.e.map(v => v === null ? '<td class="num zero">–</td>'
      : `<td class="num${v === 0 ? " zero" : ""}">${v}</td>`).join("");
    return `<tr class="${r.s ? "susp" : ""}">
      <td class="num pos">${r.r}</td>
      <td class="left name">${r.n}${r.s ? `<span title="Suspended for 1 year from ${r.s}">${r.s}</span>` : ""}</td>
      <td><span class="fed">${r.f}</span></td>
      <td class="pts">${r.p}</td>${cells}</tr>`;
  }).join("");

  document.getElementById("count").innerHTML =
    `<b>${slice.length}</b> shown · ${list.length} match the filters · ${ROWS.length} ranked players`;
  document.getElementById("pageinfo").textContent = state.page + " / " + pages;
  document.getElementById("prev").disabled = state.page <= 1;
  document.getElementById("next").disabled = state.page >= pages;
}

document.getElementById("q").oninput = e => { state.q = e.target.value; state.page = 1; render(); };
document.getElementById("fed").onchange = e => { state.fed = e.target.value; state.page = 1; render(); };
document.getElementById("showSusp").onclick = e => {
  state.showSusp = !state.showSusp;
  e.target.classList.toggle("on", state.showSusp);
  e.target.textContent = state.showSusp ? "Suspended shown" : "Suspended hidden";
  if (!state.showSusp) { document.querySelectorAll("tr.susp").forEach(tr => tr.style.display = "none"); }
  render();
};
document.getElementById("prev").onclick = () => { state.page--; render(); };
document.getElementById("next").onclick = () => { state.page++; render(); };

render();
</script>
</body>
</html>
"""

out = HTML.replace("__EVENTS__", js_events).replace("__ROWS__", json.dumps(data, ensure_ascii=False, separators=(",", ":")))
path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ceb-ranking-mockup.html")
open(path, "w", encoding="utf-8").write(out)
print("written", path, round(len(out) / 1024, 1), "KB")
print("rows:", len(data), "| suspended rows:", sum(1 for d in data if d["s"]))
print("scale check: max per column ->", {c: max(d["e"][i] or 0 for d in data) for i, c in enumerate("ABCDEFGHIJ")})
