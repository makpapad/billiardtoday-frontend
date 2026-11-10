"""Σύγκριση: ΕΠΙΣΗΜΟ V17 PDF (ceb17_clean.json)  vs  CEB Ranking_2026_V17.xlsx.
Κεφαλίδα xlsx = γραμμή 12 (RANK|CEB Name|CEB Fed.|Pnts|PP|A..J), δεδομένα από 13.
"""
import json, re, unicodedata
from collections import Counter
import openpyxl

HERE = "D:/Projects/4-billiardtoday-frontend/docs/ai/ceb-ranking/"


def key(name: str) -> str:
    s = unicodedata.normalize("NFKD", str(name or ""))
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^A-Za-z ]", " ", s).upper()
    return re.sub(r"\s+", " ", s).strip()


pdf = json.load(open(HERE + "ceb17_clean.json", encoding="utf-8"))
pdf_map = {}
for r in pdf:
    pdf_map.setdefault(key(r["name"]), []).append(r)

wb = openpyxl.load_workbook(HERE + "CEB Ranking_2026_V17.xlsx", data_only=True)
ws = wb.active
raw = list(ws.iter_rows(values_only=True))
hdr = [str(c).strip() if c is not None else "" for c in raw[12]]
print("κεφαλιδα:", hdr[:16])
i_rank, i_name, i_fed, i_pnts = hdr.index("RANK"), hdr.index("CEB Name"), hdr.index("CEB Fed."), hdr.index("Pnts")

xls = []
for r in raw[13:]:
    nm = r[i_name]
    if nm is None or not str(nm).strip():
        continue
    pnts = r[i_pnts]
    xls.append({
        "name": str(nm).strip(),
        "fed": str(r[i_fed] or "").strip(),
        "rank": r[i_rank],
        "Pnts": int(pnts or 0) if str(pnts).strip() not in ("", "None") else 0,
        "ev": {c: (r[hdr.index(c)] if hdr.index(c) < len(r) else None) for c in "ABCDEFGHIJ"},
    })

print("xlsx γραμμες:", len(xls), "| αθροισμα Pnts:", sum(v["Pnts"] for v in xls))
print("pdf  γραμμες:", len(pdf),  "| αθροισμα Pnts:", sum(int(v["Pnts"] or 0) for v in pdf))

pdf_names = Counter(key(r["name"]) for r in pdf)
xls_names = Counter(key(r["name"]) for r in xls)
print("\nπληθος ιδιων ονοματων: pdf", len(pdf_names), "| xlsx", len(xls_names))
print("μονο στο PDF:", sorted(pdf_names - xls_names))
print("μονο στο xlsx:", sorted(xls_names - pdf_names))

# λεπτομερης ελεγχος ανα παικτη
pdf_by_key = {}
for r in pdf:
    pdf_by_key.setdefault(key(r["name"]), []).append(r)
bad = []
for v in xls:
    k = key(v["name"])
    cands = pdf_by_key.get(k) or []
    if not cands:
        bad.append((v["name"], "ΛΕΙΠΕΙ ΑΠΟ PDF", v["Pnts"], None))
        continue
    p = cands[0]
    if int(p["Pnts"] or 0) != v["Pnts"]:
        bad.append((v["name"], "ΠΟΝΤΟΙ", v["Pnts"], p["Pnts"]))
        continue
    # ελεγχος στηλων
    for col in "ABCDEFGHIJ":
        xv = v["ev"].get(col)
        xv = int(xv) if isinstance(xv, (int, float)) else 0
        pv = int(p["ev"].get(col) or 0)
        if xv != pv:
            bad.append((v["name"], f"στηλη {col}", xv, pv))

print("\n=== ΔΙΑΦΟΡΕΣ ΑΝΑ ΠΑΙΚΤΗ:", len(bad), "===")
for b in bad[:40]:
    print("  ", b)

lu = [v for v in xls if v["fed"].upper().startswith("LU")]
print("\n=== LU στο xlsx:", len(lu), "===")
for v in sorted(lu, key=lambda x: x["Pnts"], reverse=True):
    k = key(v["name"])
    p = (pdf_by_key.get(k) or [{}])[0]
    ev = {c: v["ev"][c] for c in "ABCDEFGHIJ" if isinstance(v["ev"][c], (int, float)) and v["ev"][c]}
    print(f"   {str(v['rank']):>5} {v['name']:24} xlsx={v['Pnts']:<4} pdf={p.get('Pnts')}  στηλες xlsx={ev} pdf={p.get('ev')}")
