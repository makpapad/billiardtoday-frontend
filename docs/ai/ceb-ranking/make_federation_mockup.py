"""Γεννήτρια του mockup: σελίδα υποβολής εθνικών βαθμολογιών από τις ομοσπονδίες.

Δίνει το .xlsx/πλέγμα με τα πραγματικά ονόματα της χώρας από τη λίστα CEB,
προσυμπληρωμένα με UMB ID όπου το μητρώο έχει βέβαιο ταίριασμα (ίδιος κανόνας με match_players.py:
επώνυμο + μικρό όνομα, με προτίμηση στην ίδια χώρα, κανένα αυτόματο γέμισμα σε αμφισημία).

    python make_federation_mockup.py            # -> public/mockups/federation-submission.html
"""
from __future__ import annotations

import json
import pathlib
import re
import unicodedata
from collections import defaultdict

ROOT = pathlib.Path(__file__).resolve().parents[3]
CEB = ROOT / "public" / "data" / "ceb-ranking" / "3c-individual.json"
REG = ROOT / "docs" / "ai" / "umb-player-ids" / "data" / "umb-ids.json"
EDITIONS = ROOT / "docs" / "ai" / "ceb-ranking" / "editions"


def current_edition_file() -> pathlib.Path:
    """Η τρέχουσα έκδοση CEB — η ζωντανή αν υπάρχει, αλλιώς η πιο πρόσφατη.

    Δεν είναι καρφιτσωμένο όνομα αρχείου: όταν μπει νέα έκδοση στον φάκελο,
    η σελίδα ακολουθεί μόνη της.
    """
    loaded: list[tuple[pathlib.Path, dict]] = []
    for path in sorted(EDITIONS.glob("*.json")):
        try:
            loaded.append((path, json.loads(path.read_text(encoding="utf-8"))))
        except Exception:
            continue
    if not loaded:
        raise SystemExit(f"δεν βρέθηκε έκδοση CEB στον φάκελο {EDITIONS}")
    live = [item for item in loaded if item[1].get("live")]
    pool = live or loaded
    pool.sort(key=lambda item: ((item[1].get("meta") or {}).get("updatedAt") or "", item[0].name))
    return pool[-1][0]
OUT = ROOT / "public" / "mockups" / "federation-submission.html"
PREVIEW_JSON = ROOT / "src" / "app" / "federation" / "preview" / "players-gr.json"

# Πόντοι από τη θέση (CEB): 1→40 · 2→27 · 3-4→19 · 5-8→13 · 9-16→8 · 17-32→4
FED = "GR"
FED_NAME = "Greece"
SEASON = "2025-26"


def norm(value: str | None) -> str:
    text = unicodedata.normalize("NFKD", value or "")
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.upper().replace("-", " ").replace("'", " ")
    text = re.sub(r"[^A-Z ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def build_index(players: dict) -> dict[str, list[tuple[str, list[str], str]]]:
    index: dict[str, list[tuple[str, list[str], str]]] = defaultdict(list)
    for pid, entry in players.items():
        parts = norm(entry.get("name")).split()
        if parts:
            index[parts[0]].append((pid, parts, entry.get("fed") or ""))
    return index


def match(name: str, fed: str, index) -> tuple[str | None, str]:
    parts = norm(name).split()
    if not parts:
        return None, "no-name"
    surname, rest = parts[0], parts[1:]
    candidates = index.get(surname, [])
    if not candidates:
        return None, "not-found"
    hits: list[tuple[str, str]] = []
    for pid, candidate_parts, candidate_fed in candidates:
        first = candidate_parts[1] if len(candidate_parts) > 1 else ""
        if not rest:
            hits.append((pid, candidate_fed))
            continue
        if first == rest[0] or (len(rest[0]) >= 4 and first[:4] == rest[0][:4]):
            hits.append((pid, candidate_fed))
    home = [hit for hit in hits if hit[1] == fed]
    chosen = home or hits
    if len(chosen) == 1:
        return chosen[0][0], ("matched" if home else "other-fed")
    if len(chosen) > 1:
        return None, "ambiguous"
    return None, "not-found"


def seasons_from_edition() -> tuple[list[dict], str]:
    """Οι σεζόν των εθνικών πρωταθλημάτων όπως τις ορίζει η τρέχουσα έκδοση CEB."""
    path = current_edition_file()
    cfg = json.loads(path.read_text(encoding="utf-8"))
    label = (cfg.get("meta") or {}).get("edition") or path.stem
    out = []
    for event in cfg.get("events", []):
        name = event.get("name") or ""
        found = re.search(r"(\d{4})/(\d{4})", name)
        if "National Championships" in name and found:
            out.append(
                {
                    "key": event.get("key"),
                    "season": f"{found.group(1)}-{found.group(2)[2:]}",
                    "label": name.replace("National Championships — Season ", "National Championships "),
                    "scale": event.get("scale"),
                }
            )
    return out, label


def main() -> None:
    payload = json.loads(CEB.read_text(encoding="utf-8"))
    registry = json.loads(REG.read_text(encoding="utf-8"))["players"]
    index = build_index(registry)

    rows = []
    for row in payload["rows"]:
        if row.get("fed") != FED:
            continue
        umb, note = match(row["name"], FED, index)
        rows.append(
            {
                "rank": row.get("rank"),
                "name": row.get("name"),
                "umb": umb,
                "note": note,
                "points": row.get("points"),
            }
        )

    with_id = [r for r in rows if r["umb"]]
    seasons, edition_label = seasons_from_edition()
    season = seasons[-1]["season"] if seasons else SEASON
    html = TEMPLATE.replace("/*__ROWS__*/[]", json.dumps(rows, ensure_ascii=False))
    html = html.replace("/*__SEASONS__*/[]", json.dumps(seasons, ensure_ascii=False))
    html = (
        html.replace("__FED_NAME__", FED_NAME)
        .replace("__FED__", FED)
        .replace("__SEASON__", season)
        .replace("__EDITION__", edition_label)
        .replace("__TOTAL__", str(len(rows)))
        .replace("__WITH_ID__", str(len(with_id)))
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding="utf-8")

    PREVIEW_JSON.parent.mkdir(parents=True, exist_ok=True)
    PREVIEW_JSON.write_text(
        json.dumps(
            {
                "federation": FED,
                "federationName": FED_NAME,
                "edition": edition_label,
                "season": season,
                "seasons": seasons,
                "rows": rows,
            },
            ensure_ascii=False,
            indent=1,
        ),
        encoding="utf-8",
    )

    print(f"σεζόν από την έκδοση 16/2026: {', '.join(s['season'] for s in seasons)}")
    print(f"-> {PREVIEW_JSON}")

    print(f"παίκτες {FED} στη λίστα CEB: {len(rows)}")
    print(f"  με UMB ID (βέβαιο):        {len(with_id)}")
    print(f"  χωρίς ID/έλεγχο:           {len(rows) - len(with_id)}")
    checks = defaultdict(int)
    for row in rows:
        checks[row["note"]] += 1
    for key, value in sorted(checks.items(), key=lambda kv: -kv[1]):
        print(f"    {key:<10} {value}")
    print(f"-> {OUT}")


TEMPLATE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Federation ranking submission — BilliardToday (mockup)</title>
<style>
  :root{
    --ink:#0f172a; --muted:#64748b; --line:#e2e8f0; --soft:#f8fafc;
    --brand:#0369a1; --brand-soft:#e0f2fe; --ok:#047857; --ok-soft:#ecfdf5;
    --warn:#b45309; --warn-soft:#fffbeb; --bad:#b91c1c; --bad-soft:#fef2f2;
  }
  *{box-sizing:border-box}
  body{margin:0;background:#f4f6fa;color:var(--ink);
    font:15px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Inter,sans-serif}
  .wrap{max-width:1180px;margin:0 auto;padding:28px 20px 64px}
  .muted{color:var(--muted)}
  .row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
  .between{justify-content:space-between}
  .card{background:#fff;border:1px solid rgba(0,0,0,.05);border-radius:32px;padding:26px 30px;
    box-shadow:0 24px 80px rgba(15,23,42,.08);margin-bottom:22px}
  .card.tight{border-radius:26px;padding:20px 24px;box-shadow:0 18px 50px rgba(15,23,42,.06)}
  .eyebrow{font-size:11.5px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--brand)}
  h1{font-size:27px;line-height:1.2;margin:10px 0 6px}
  h2{font-size:19px;margin:0 0 4px}
  h3{font-size:14px;margin:0 0 8px;text-transform:uppercase;letter-spacing:.12em;color:var(--muted)}
  p{margin:6px 0}
  .panel{background:var(--soft);border:1px solid var(--line);border-radius:18px;padding:14px 16px}
  button{font:inherit;cursor:pointer;border-radius:14px;border:1px solid var(--line);background:#fff;
    padding:10px 16px;color:var(--ink);font-weight:600}
  button:hover{border-color:#cbd5e1;background:#fbfdff}
  button.primary{background:var(--brand);border-color:var(--brand);color:#fff}
  button.primary:hover{background:#075985}
  button.ghost{background:transparent;border-color:transparent;color:var(--brand);padding:6px 8px}
  button:disabled{opacity:.45;cursor:not-allowed}
  input,select,textarea{font:inherit;color:var(--ink);border:1px solid var(--line);border-radius:12px;
    padding:10px 12px;background:#fff;width:100%}
  input:focus,select:focus,textarea:focus{outline:2px solid var(--brand-soft);border-color:var(--brand)}
  label{display:block;font-size:12.5px;font-weight:600;color:var(--muted);margin:12px 0 5px}
  .tabs{display:flex;gap:6px;background:#eef2f7;padding:5px;border-radius:16px;width:max-content}
  .tabs button{border:0;background:transparent;padding:8px 16px;border-radius:12px;color:var(--muted)}
  .tabs button[aria-selected="true"]{background:#fff;color:var(--ink);box-shadow:0 2px 8px rgba(15,23,42,.08)}
  .chip{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;
    padding:4px 10px;border-radius:999px;border:1px solid transparent}
  .chip.ok{background:var(--ok-soft);color:var(--ok);border-color:#a7f3d0}
  .chip.warn{background:var(--warn-soft);color:var(--warn);border-color:#fde68a}
  .chip.bad{background:var(--bad-soft);color:var(--bad);border-color:#fecaca}
  .chip.info{background:var(--brand-soft);color:var(--brand);border-color:#bae6fd}
  .chip.plain{background:#f1f5f9;color:var(--muted);border-color:var(--line)}
  table{width:100%;border-collapse:collapse;font-size:14px}
  th{position:sticky;top:0;background:#fff;text-align:left;font-size:11px;letter-spacing:.1em;
    text-transform:uppercase;color:var(--muted);padding:10px 10px;border-bottom:1px solid var(--line);white-space:nowrap}
  th .sub{display:block;font-size:10.5px;font-weight:500;letter-spacing:0;text-transform:none;color:#94a3b8}
  td{padding:8px 10px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
  tr.done td{background:#f8fefb}
  tr.flagged td{background:var(--bad-soft)}
  .num{font-variant-numeric:tabular-nums}
  .pts{font-weight:700;color:var(--brand)}
  .gridbox{max-height:430px;overflow:auto;border:1px solid var(--line);border-radius:18px}
  .pos{width:92px}
  .idbox{width:104px;font-variant-numeric:tabular-nums}
  .bars{display:flex;gap:10px;flex-wrap:wrap}
  .stat{flex:1 1 150px;background:#fff;border:1px solid var(--line);border-radius:18px;padding:12px 16px}
  .stat b{display:block;font-size:24px;line-height:1.2}
  .stat span{font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
  .steps{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px}
  .step{flex:1 1 210px;border:1px solid var(--line);border-radius:18px;padding:14px 16px;background:#fff}
  .step b{display:block;font-size:13px}
  .step p{font-size:13px;color:var(--muted);margin:4px 0 0}
  .drop{border:1.5px dashed #cbd5e1;border-radius:20px;padding:26px;text-align:center;background:#fbfdff}
  .drop.on{border-color:var(--brand);background:var(--brand-soft)}
  .msg{border-radius:16px;padding:12px 14px;font-size:13.5px;margin-top:12px}
  .msg.bad{background:var(--bad-soft);color:#7f1d1d;border:1px solid #fecaca}
  .msg.ok{background:var(--ok-soft);color:#065f46;border:1px solid #a7f3d0}
  .msg.info{background:#f8fafc;color:#334155;border:1px solid var(--line)}
  .hide{display:none !important}
  .modal{position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:center;
    justify-content:center;padding:20px;z-index:40}
  .modal .card{max-width:520px;margin:0}
  .lock{font-size:12px;color:var(--muted)}
  .foot{font-size:12.5px;color:var(--muted);margin-top:8px}
  .demo{background:var(--ink);color:#fff;border-radius:22px;padding:16px 20px;margin-bottom:22px;
    display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap}
  .demo button{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.25);color:#fff}
  a{color:var(--brand)}
</style>
</head>
<body>
<div class="wrap">

  <div class="demo">
    <div><b>Mockup</b> — federation ranking submission. Nothing here is saved; it shows the flow and the live checks.</div>
    <div class="row">
      <button data-goto="auth">Sign in / Register</button>
      <button data-goto="home">My submissions</button>
      <button data-goto="new">New submission</button>
    </div>
  </div>

  <!-- ============ 1. SIGN IN / REGISTER ============ -->
  <section id="view-auth">
    <div class="card" style="max-width:560px;margin:0 auto">
      <div class="eyebrow">BilliardToday · Federations</div>
      <h1>National ranking submission</h1>
      <p class="muted">Enter the finishing positions of your national championship. BilliardToday turns them
        into CEB ranking points — one season per player.</p>

      <div class="tabs" style="margin:18px 0 4px">
        <button data-auth="signin" aria-selected="true">Sign in</button>
        <button data-auth="register" aria-selected="false">Create account</button>
      </div>

      <button class="primary" style="width:100%;margin-top:14px;display:flex;gap:10px;justify-content:center">
        <span style="font-weight:700">G</span> Continue with Google
      </button>
      <p class="foot" style="text-align:center">Use the email of your federation (Google Workspace works).</p>

      <div class="row" style="margin:18px 0 6px"><hr style="flex:1;border:0;border-top:1px solid var(--line)"><span class="lock">or use email</span><hr style="flex:1;border:0;border-top:1px solid var(--line)"></div>

      <div id="auth-register" class="hide">
        <label>Federation</label>
        <select>
          <option>Greece — Hellenic Billiard Federation (GR)</option>
          <option>Cyprus — (CY)</option>
          <option>Bulgaria — (BG)</option>
          <option>Other — my federation is not listed</option>
        </select>
        <p class="foot">We match it with the federation records already in our system, so the account is
          tied to the right country from the first minute.</p>
      </div>

      <label>Email</label>
      <input type="email" value="federation@example.org">
      <label>Password</label>
      <input type="password" value="demo-password">
      <div id="auth-register2" class="hide">
        <label>Repeat password</label>
        <input type="password" value="demo-password">
      </div>

      <div class="row between" style="margin-top:16px">
        <a href="#" onclick="return false">Forgot password?</a>
        <button class="primary" data-goto="home">Sign in</button>
      </div>

      <div class="msg info" style="margin-top:18px">
        <b>Federation accounts are created by CEB and handed to BilliardToday to load into the ranking platform.</b>
        Each account is tied to one federation, so the country is fixed from the first minute — federations do not
        register here.
      </div>
    </div>
  </section>

  <!-- ============ 2. MY SUBMISSIONS ============ -->
  <section id="view-home" class="hide">
    <div class="card tight">
      <div class="row between">
        <div>
          <div class="eyebrow">Signed in</div>
          <h2>Hellenic Billiard Federation <span class="chip ok">Verified</span></h2>
          <p class="muted">Country <b>Greece (GR)</b> · 3-Cushion · seasons 2024-25 / 2025-26 / 2026-27</p>
        </div>
        <button class="primary" data-goto="new">New submission</button>
      </div>
    </div>

    <div class="card">
      <h3>My submissions</h3>
      <table>
        <thead><tr>
          <th>Season<span class="sub">the year that counts</span></th><th>Discipline</th><th>Players</th>
          <th>Submitted</th><th>Status<span class="sub">what happens now</span></th><th></th>
        </tr></thead>
        <tbody>
          <tr>
            <td class="num">2025-26</td><td>3-Cushion Individual</td><td class="num">42</td>
            <td>28 Sep 2026</td>
            <td><span class="chip warn">In review</span> <span class="lock">checked by BilliardToday</span></td>
            <td><button class="ghost" data-goto="new">Open</button></td>
          </tr>
          <tr>
            <td class="num">2024-25</td><td>3-Cushion Individual</td><td class="num">38</td>
            <td>12 Jun 2026</td>
            <td><span class="chip ok">Published</span> <span class="lock">CEB ranking 15/2026</span></td>
            <td><button class="ghost" onclick="return false">View</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- ============ 3. NEW SUBMISSION ============ -->
  <section id="view-new" class="hide">
    <div class="card tight">
      <div class="row between">
        <div class="row">
          <span class="chip plain">Greece (GR) <span class="lock">locked to your account</span></span>
          <span class="chip plain">3-Cushion Individual</span>
        </div>
        <div class="row">
          <span class="lock">Season</span>
          <select id="seasonSel" style="width:300px"></select>
          <input id="seasonManual" class="hide" style="width:150px" placeholder="e.g. 2023-24">
        </div>
      </div>
      <p class="foot">Only one season counts per player. The list comes from the <b>current CEB edition</b>
        (<span id="editionNote">__EDITION__</span>) — when a new season opens it appears here by itself and the
        season that drops off disappears. Submit <b id="seasonLabel">__SEASON__</b>; players who did not take
        part in it stay without a position.</p>
      <p class="foot">Points come from the position, not the other way round:
        1 → 40 · 2 → 27 · 3-4 → 19 · 5-8 → 13 · 9-16 → 8 · 17-32 → 4.</p>
    </div>

    <!-- step 1: template -->
    <div class="card">
      <h3>Step 1 — Download the template</h3>
      <div class="row between">
        <div>
          <b id="fileName">__FED__-3C-Individual-__SEASON__.xlsx</b>
          <p class="muted">__TOTAL__ players of your country from the CEB list, __WITH_ID__ of them already
            carrying their UMB ID. Fill a finishing position next to the players who took part.</p>
        </div>
        <button class="primary" onclick="return false">Download template</button>
      </div>
      <div class="steps">
        <div class="step"><b>Position, not points</b><p>Write 1, 2, 3… Points are calculated here.</p></div>
        <div class="step"><b>Do not rename the ID column</b><p>It is how we recognise each player for sure.</p></div>
        <div class="step"><b>Unknown ID?</b><p>Leave <b>0</b> — we find the player by the name.</p></div>
      </div>
    </div>

    <!-- step 2: three ways in -->
    <div class="card">
      <h3>Step 2 — Bring the positions back</h3>
      <div class="tabs" style="margin-bottom:16px">
        <button data-mode="upload" aria-selected="true">Upload the file</button>
        <button data-mode="paste" aria-selected="false">Paste rows</button>
        <button data-mode="grid" aria-selected="false">Type in the grid</button>
      </div>

      <div id="mode-upload">
        <div class="drop" id="drop">
          <b>Drop the filled file here</b>
          <p class="muted">.xlsx or .csv — the positions fill the grid below instantly. Nothing is submitted yet.</p>
          <button style="margin-top:8px" id="fakeUpload">Choose file (demo)</button>
        </div>
        <div class="msg info hide" id="uploadMsg"></div>
      </div>

      <div id="mode-paste" class="hide">
        <p class="muted">Copy the two columns straight out of your own file — position first, then the name.
          Any order, extra spaces and “1.” are fine.</p>
        <textarea id="pasteBox" rows="7">1 ATHANASIOU Michalis
2 FELEKIDIS Panagiotis
3 PAPAKONSTANTINOU Kostas
4 KOKKORIS Kostantinos
5 BALOGIANNIS Apostolos</textarea>
        <div class="row" style="margin-top:10px">
          <button class="primary" id="pasteFill">Fill the grid</button>
          <span class="lock">We sort them and match the names to the UMB registry ourselves.</span>
        </div>
        <div class="msg info hide" id="pasteMsg"></div>
      </div>

      <div id="mode-grid" class="hide">
        <p class="muted">Type the position next to each player in the grid below. Rows left empty simply mean
          “did not take part”.</p>
      </div>
    </div>

    <!-- step 3: grid -->
    <div class="card">
      <div class="row between" style="margin-bottom:12px">
        <h3 style="margin:0">Step 3 — Check before you submit</h3>
        <div class="row">
          <button id="demoAnswer">Fill a demo answer</button>
          <button id="clearAll">Clear positions</button>
        </div>
      </div>

      <div class="bars" style="margin-bottom:14px">
        <div class="stat"><span>Positioned</span><b id="statPos">0</b></div>
        <div class="stat"><span>Of players</span><b id="statTotal">0</b></div>
        <div class="stat"><span>Matched to ID</span><b id="statId">0</b></div>
        <div class="stat"><span>Need your attention</span><b id="statFlags">0</b></div>
      </div>

      <div id="warnings"></div>

      <div class="gridbox">
        <table>
          <thead><tr>
            <th>CEB list<span class="sub">reference</span></th>
            <th>Player<span class="sub">as in the CEB list</span></th>
            <th>UMB ID<span class="sub">key of the player</span></th>
            <th>Position<span class="sub">what you fill</span></th>
            <th>Points<span class="sub">auto</span></th>
            <th>Check<span class="sub">live</span></th>
          </tr></thead>
          <tbody id="grid"></tbody>
        </table>
      </div>

      <div class="row between" style="margin-top:18px">
        <span class="lock" id="readyLine"></span>
        <div class="row">
          <button data-goto="home">Cancel</button>
          <button class="primary" id="submitBtn" disabled>Submit for review</button>
        </div>
      </div>
    </div>

    <div class="card tight">
      <h3>What happens next</h3>
      <div class="steps">
        <div class="step"><b>1 · You submit</b><p>The list is stored with your name and the time.</p></div>
        <div class="step"><b>2 · We check</b><p>Every row against the UMB registry; anything unclear comes back to you.</p></div>
        <div class="step"><b>3 · It is published</b><p>Your national column joins the next CEB ranking edition — and the previous edition stays online.</p></div>
      </div>
    </div>
  </section>
</div>

<div id="modal" class="modal hide">
  <div class="card">
    <div class="eyebrow">Submitted</div>
    <h2>Sent for review</h2>
    <p class="muted" id="modalText"></p>
    <div class="row between" style="margin-top:16px">
      <span class="lock">You can come back and resubmit until we approve it.</span>
      <button class="primary" id="modalOk">Back to my submissions</button>
    </div>
  </div>
</div>

<script>
const ROWS = /*__ROWS__*/[];
const FED = "__FED__";
const SEASONS = /*__SEASONS__*/[];
let SEASON = "__SEASON__";
const points = p => p === 1 ? 40 : p === 2 ? 27 : p <= 4 ? 19 : p <= 8 ? 13 : p <= 16 ? 8 : p <= 32 ? 4 : 0;
const norm = s => (s || "").toUpperCase().replace(/[^A-Z ]+/g, " ").replace(/\s+/g, " ").trim();

let state = ROWS.map(r => ({...r, position: "", umb: r.umb || ""}));
const $ = id => document.getElementById(id);

/* ---------- view switch ---------- */
function goto(view) {
  ["auth","home","new"].forEach(v => $("view-" + v).classList.toggle("hide", v !== view));
  window.scrollTo({top: 0, behavior: "smooth"});
}
document.querySelectorAll("[data-goto]").forEach(b => b.onclick = () => goto(b.dataset.goto));
document.querySelectorAll("[data-auth]").forEach(b => b.onclick = () => {
  document.querySelectorAll("[data-auth]").forEach(x => x.setAttribute("aria-selected", x === b));
  $("auth-register").classList.toggle("hide", b.dataset.auth !== "register");
  $("auth-register2").classList.toggle("hide", b.dataset.auth !== "register");
});
const OTHER = "__other__";
const seasonSel = $("seasonSel"), seasonManual = $("seasonManual");
seasonSel.innerHTML = SEASONS.map(s => `<option value="${s.season}">${s.label}</option>`).join("")
  + `<option value="${OTHER}">Other season (type it)…</option>`;
function applySeason(value) {
  SEASON = value;
  $("seasonLabel").textContent = value;
  $("fileName").textContent = `${FED}-3C-Individual-${value}.xlsx`;
}
seasonSel.value = SEASON;
applySeason(SEASON);
seasonSel.onchange = () => {
  const custom = seasonSel.value === OTHER;
  seasonManual.classList.toggle("hide", !custom);
  applySeason(custom ? (seasonManual.value || "—") : seasonSel.value);
};
seasonManual.oninput = () => { if (seasonSel.value === OTHER) applySeason(seasonManual.value || "—"); };
document.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => {
  document.querySelectorAll("[data-mode]").forEach(x => x.setAttribute("aria-selected", x === b));
  ["upload","paste","grid"].forEach(m => $("mode-" + m).classList.toggle("hide", m !== b.dataset.mode));
});

/* ---------- grid ---------- */
function statusOf(row) {
  const p = Number(row.position);
  if (!row.position) return {cls: "plain", text: row.umb ? "Matched" : "No UMB ID"};
  if (!row.umb) return {cls: "warn", text: "Needs ID"};
  if (row.umb.length && row.umb !== row.origUmb && row.note === "ambiguous") return {cls: "warn", text: "Check name"};
  if ($("grid") && dupPositions().has(p)) return {cls: "bad", text: "Position twice"};
  return {cls: "ok", text: "Ready"};
}
function dupPositions() {
  const seen = new Map(), dup = new Set();
  state.filter(r => r.position).forEach(r => {
    const p = Number(r.position);
    if (seen.has(p)) { dup.add(p); } else seen.set(p, true);
  });
  return dup;
}
function render() {
  const dup = dupPositions();
  $("grid").innerHTML = state.map((r, i) => {
    const p = Number(r.position), pts = r.position ? points(p) : 0;
    const isDup = r.position && dup.has(p);
    let cls = "plain", text = r.umb ? (r.note === "ambiguous" ? "Check name" : "Matched") : "No UMB ID";
    let chip = "plain";
    if (r.position) {
      if (!r.umb) { chip = "warn"; text = "Needs ID"; }
      else if (isDup) { chip = "bad"; text = "Position twice"; }
      else { chip = "ok"; text = "Ready"; }
    }
    const flagged = r.position && (!r.umb || isDup);
    return `<tr class="${r.position ? (flagged ? "flagged" : "done") : ""}">
      <td class="num muted">${r.rank ?? "—"}</td>
      <td><b>${r.name}</b></td>
      <td><input class="idbox" data-i="${i}" data-k="umb" value="${r.umb || ""}" placeholder="0"
            inputmode="numeric" title="UMB ID — leave 0 if unknown"></td>
      <td><input class="pos" data-i="${i}" data-k="position" value="${r.position}" placeholder="—"
            inputmode="numeric" title="Finishing position in your national championship"></td>
      <td class="pts num">${pts ? pts : "—"}</td>
      <td><span class="chip ${chip}">${text}</span></td>
    </tr>`;
  }).join("");

  $("grid").querySelectorAll("input").forEach(inp => {
    inp.oninput = e => {
      const i = Number(e.target.dataset.i), k = e.target.dataset.k;
      state[i][k] = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
      if (k === "position") { render(); } else { updateStats(); }
    };
  });
  updateStats();
}
function updateStats() {
  const positioned = state.filter(r => r.position);
  const dup = dupPositions();
  const flags = positioned.filter(r => !r.umb || dup.has(Number(r.position)) || (r.note === "ambiguous" && !r.umb));
  const withId = positioned.filter(r => r.umb);
  $("statPos").textContent = positioned.length;
  $("statTotal").textContent = state.length;
  $("statId").textContent = withId.length;
  $("statFlags").textContent = flags.length;

  const msgs = [];
  if (dup.size) msgs.push(`Position ${[...dup].sort((a,b)=>a-b).join(", ")} is used twice — clear the duplicate.`);
  const noId = positioned.filter(r => !r.umb);
  if (noId.length) msgs.push(`${noId.length} positioned ${noId.length === 1 ? "player has" : "players have"} no UMB ID — type it in the ID column, or leave it empty if the name is correct and we will find it.`);
  if (positioned.length && !dup.size && !noId.length) msgs.push("All positioned rows are ready to submit.");
  $("warnings").innerHTML = msgs.map(m => `<div class="msg ${dup.size ? "bad" : noId.length ? "info" : "ok"}">${m}</div>`).join("");

  const ready = positioned.length > 0 && !dup.size && !noId.length;
  $("submitBtn").disabled = !ready;
  $("readyLine").textContent = positioned.length
    ? (ready ? `${positioned.length} players ready — submit when you are.`
             : `Fix the highlighted rows first (${flags.length}).`)
    : "No positions filled yet.";
}
render();

/* ---------- demo helpers ---------- */
function applyPairs(pairs) {
  let filled = 0, unknown = [];
  pairs.forEach(([pos, name]) => {
    const target = norm(name);
    const hit = state.find(r => norm(r.name) === target) ||
                state.find(r => norm(r.name).startsWith(target.split(" ")[0] + " " + target.split(" ").slice(1).join(" ").slice(0, 4))) ||
                state.find(r => norm(r.name).split(" ")[0] === target.split(" ")[0]);
    if (hit) { hit.position = String(pos); filled++; } else { unknown.push(name); }
  });
  render();
  return {filled, unknown};
}
$("fakeUpload").onclick = () => {
  const demo = [["1","ATHANASIOU Michalis"],["2","FELEKIDIS Panagiotis"],["3","PAPAKONSTANTINOU Kostas"],
                ["4","KOKKORIS Kostantinos"],["5","BALOGIANNIS Apostolos"],["6","SELEVENTAS Dimitrios"],
                ["7","POLYCHRONOPOULOS Nikos"],["8","ANTONATOS Kostas"],["9","MOULOS Vangelis"],
                ["10","EVAGGELOU Nikos"],["11","Unknown Player"],["12","BALOGIANNIS Apostolos"]];
  const {filled, unknown} = applyPairs(demo);
  $("uploadMsg").className = "msg info";
  $("uploadMsg").innerHTML = `<b>GR-3C-Individual-${SEASON}.xlsx read:</b> ${filled} rows matched
    ${unknown.length ? `· ${unknown.length} name(s) not in the CEB list: <b>${unknown.join(", ")}</b>` : ""}
    · the grid is filled — nothing has been submitted yet.`;
};
$("pasteFill").onclick = () => {
  const pairs = $("pasteBox").value.split("\n").map(line => {
    const parts = line.trim().replace(/^(\d+)[.)]?\s+/, "$1 ").split(/\s+/);
    const pos = Number((line.match(/^\s*(\d+)/) || [])[1]);
    if (!pos) return null;
    return [pos, line.replace(/^\s*\d+[.)]?\s*/, "").trim()];
  }).filter(Boolean);
  const {filled, unknown} = applyPairs(pairs);
  $("pasteMsg").className = "msg " + (unknown.length ? "info" : "ok");
  $("pasteMsg").innerHTML = `<b>${filled}</b> rows placed` +
    (unknown.length ? ` · not found in the CEB list: <b>${unknown.join(", ")}</b> (send them to us and we will add them).` : " · all names matched.");
};
$("demoAnswer").onclick = () => {
  const list = state.slice(0, 12);
  list.forEach((r, i) => r.position = String(i + 1));
  list[3].umb = "";                 // shows the "needs ID" case
  list[6].position = "4";           // shows the duplicate case
  render();
};
$("clearAll").onclick = () => { state.forEach(r => r.position = ""); render(); };

/* ---------- submit ---------- */
$("submitBtn").onclick = () => {
  const positioned = state.filter(r => r.position);
  $("modalText").innerHTML = `<b>Greece (GR)</b> · 3-Cushion Individual · season <b>${SEASON}</b><br>
    ${positioned.length} players with a position, ${positioned.filter(r => r.umb).length} of them matched to a UMB ID.
    Stored as <span class="chip warn">In review</span> — the CEB list is not touched until we approve it.`;
  $("modal").classList.remove("hide");
};
$("modalOk").onclick = () => { $("modal").classList.add("hide"); goto("home"); };
</script>
</body>
</html>
"""


if __name__ == "__main__":
    main()
