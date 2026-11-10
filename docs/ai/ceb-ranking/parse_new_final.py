# -*- coding: utf-8 -*-
"""Parse the NEW CEB xlsx (14 corrections) into clean JSON (our schema)."""
import openpyxl, json, re, collections, datetime, sys

BASE = r"D:\Projects\4-billiardtoday-frontend\docs\ai\ceb-ranking"
SRC = BASE + r"\CEB Ranking_2026_V16 - Copia - Copia.xlsx"
OUT = BASE + r"\ceb16_xlsx_final_clean.json"
SHEET = "CEB_V16_2026"

wb = openpyxl.load_workbook(SRC, data_only=True)
ws = wb[SHEET]

# --- locate header row (row with 'RANK' in col A and 'Pnts' in col D) ---
header_row = None
for r in range(1, 30):
    a = ws.cell(row=r, column=1).value
    b = ws.cell(row=r, column=2).value
    d = ws.cell(row=r, column=4).value
    if a and str(a).strip().upper() == "RANK" and d and "pnt" in str(d).lower():
        header_row = r
        break
assert header_row, "header row not found"
print("header_row:", header_row)

# --- parse event legend rows above header: A..J ---
events = []
for r in range(1, header_row):
    key = ws.cell(row=r, column=1).value
    nm = ws.cell(row=r, column=2).value
    if key and str(key).strip() in list("ABCDEFGHIJ") and len(str(key).strip()) == 1:
        scale_row = [ws.cell(row=r, column=cc).value for cc in range(6, 16)]
        scale = [int(x) for x in scale_row if isinstance(x, (int, float))]
        events.append({"key": str(key).strip(), "name": (nm or "").strip(), "scale": scale})
print("events:", [(e["key"], e["name"][:40]) for e in events])

title = None
for r in range(1, header_row):
    v = ws.cell(row=r, column=2).value
    if v and "RANKING" in str(v).upper():
        title = str(v).strip()
        break

# --- column map from header ---
colmap = {}
for c in range(1, ws.max_column + 1):
    h = ws.cell(row=header_row, column=c).value
    if h is not None:
        colmap[c] = str(h).strip()
print("colmap:", colmap)

# indices (1-based)
COL_RANK = 1; COL_NAME = 2; COL_FED = 3; COL_PNTS = 4; COL_PP = 5
EV_COLS = list(range(6, 16))  # A..J

def to_int(v):
    if v is None: return None
    if isinstance(v, bool): return None
    if isinstance(v, (int, float)):
        return int(v)
    s = str(v).strip()
    if re.fullmatch(r"-?\d+", s):
        return int(s)
    if re.fullmatch(r"-?\d+\.0+", s):
        return int(float(s))
    return None

def to_penalty(v):
    if v is None: return None
    if isinstance(v, datetime.datetime): return v.date().isoformat()
    if isinstance(v, datetime.date): return v.isoformat()
    s = str(v).strip()
    if not s: return None
    m = re.fullmatch(r"(\d{1,2})[./](\d{1,2})[./](\d{4})", s)
    if m:
        d, mo, y = m.groups()
        return f"{y}-{int(mo):02d}-{int(d):02d}"
    return s  # keep raw text if not a date

rows = []
first_data = header_row + 1
for r in range(first_data, ws.max_row + 1):
    rank = to_int(ws.cell(row=r, column=COL_RANK).value)
    name_v = ws.cell(row=r, column=COL_NAME).value
    name = ("" if name_v is None else str(name_v)).strip()
    fed_v = ws.cell(row=r, column=COL_FED).value
    fed = ("" if fed_v is None else str(fed_v)).strip()
    if rank is None and not name and not fed:
        continue
    ev = [to_int(ws.cell(row=r, column=cc).value) for cc in EV_COLS]
    points = to_int(ws.cell(row=r, column=COL_PNTS).value)
    penalty = to_penalty(ws.cell(row=r, column=COL_PP).value)
    evsum = sum(x for x in ev if x is not None)
    total = points
    check_ok = (points is None) or (evsum == points)
    rows.append({
        "rank": rank, "pos": rank, "row": r,
        "name": name, "latinName": name, "fed": fed,
        "ev": ev, "points": points, "penalty": penalty, "total": total,
        "suspended": penalty, "check_ok": check_ok,
    })

n = len(rows)
sumtotal = sum(r["total"] for r in rows if r["total"] is not None)
zero = sum(1 for r in rows if r["total"] == 0)
neg = [r for r in rows if r["total"] is not None and r["total"] < 0]
sus = [r for r in rows if r["penalty"]]
mism = [r for r in rows if not r["check_ok"]]
lastrow = rows[-1]

data = {
    "source": "docs/ai/ceb-ranking/CEB Ranking_2026_V16 - Copia - Copia.xlsx",
    "sheet": SHEET,
    "title": title,
    "headerRow": header_row,
    "firstDataRow": first_data,
    "lastDataRow": ws.max_row,
    "columns": {
        "A": "RANK (=rank/pos)",
        "B": "CEB Name (λατινικό όνομα· δεν υπάρχει ξεχωριστή στήλη ονόματος)",
        "C": "CEB Fed.",
        "D": "Pnts (=Σύνολο· δεν υπάρχει ξεχωριστή στήλη 'Σύνολο')",
        "E": "PP (ποινή/αναστολή = ημερομηνία, όχι αριθμός)",
        "F:O": "A,B,C,D,E,F,G,H,I,J",
    },
    "events": events,
    "notes": [
        "Το xlsx ΔΕΝ έχει ξεχωριστή στήλη λατινικού ονόματος ούτε ξεχωριστή στήλη 'Σύνολο': η στήλη 'CEB Name' είναι ήδη λατινική και η στήλη 'Pnts' ΕΙΝΑΙ το Σύνολο.",
        f"Σε {n - len(mism)}/{n} γραμμές ισχύει A+...+J == Pnts (η στήλη PP δεν είναι αριθμός, ώστε να αφαιρεθεί).",
        "Το πεδίο latinName επαναλαμβάνει το name (δεν υπάρχει δεύτερη πηγή).",
    ],
    "counts": {
        "rows": n,
        "sumTotal": sumtotal,
        "zeroPointRows": zero,
        "negativeRows": len(neg),
        "suspendedRows": len(sus),
        "lastRank": lastrow["rank"],
        "checkMismatches": len(mism),
    },
    "generatedAt": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    "rows": rows,
}
json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

print("=== SUMMARY ===")
print("rows:", n)
print("sumTotal:", sumtotal)
print("zeroPointRows:", zero)
print("negativeRows:", len(neg))
print("suspendedRows:", len(sus))
print("lastRank:", lastrow["rank"], lastrow["name"], lastrow["fed"], lastrow["total"])
print("checkMismatches:", len(mism))
for r in mism[:10]:
    print("  MISMATCH r", r["rank"], r["name"], r["fed"], r["points"], r["ev"], sum(x for x in r["ev"] if x is not None))
print("negatives:", [(r["rank"], r["name"], r["fed"], r["total"]) for r in neg])
print("saved", OUT)
