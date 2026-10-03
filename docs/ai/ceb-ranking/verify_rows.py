"""Independent re-read of every CEB PDF row straight from the words layer.

Anchors each row on its RANK word (x < 64, digits) and takes the words within
+-3.5pt of that word's vertical centre, then compares rank / name / fed / points
with ceb16_clean.json. pdftotext -layout is NOT usable for this (it pairs tight
rows wrongly), so the words layer is the ground truth.

    uv run --python 3.12 --with "pymupdf==1.24.14" python verify_rows.py
"""
import json, re, sys
import pymupdf

doc = pymupdf.open("ceb16.pdf")
json_rows = {r["rank"]: r for r in json.load(open("ceb16_clean.json", encoding="utf-8"))}

rebuilt = {}
for pi in range(doc.page_count):
    words = doc[pi].get_text("words")
    anchors = [w for w in words if w[0] < 64 and re.fullmatch(r"\d{1,4}", w[4])]
    for a in anchors:
        rank = int(a[4])
        yc = (a[1] + a[3]) / 2
        row = [w for w in words if abs(((w[1] + w[3]) / 2) - yc) <= 3.5]
        row.sort(key=lambda w: w[0])
        if rank not in rebuilt:          # first hit wins (no duplicate ranks in the PDF)
            rebuilt[rank] = row

print("ranks anchored :", len(rebuilt), "| json rows:", len(json_rows))

prob = {"fed": [], "pnts": [], "name": [], "missing": [], "dupe": []}
for rank, row in rebuilt.items():
    r = json_rows.get(rank)
    if not r:
        prob["missing"].append(rank)
        continue
    name_tokens = [w[4] for w in row if 65 <= w[0] < 313]
    fed_tokens = [w[4] for w in row if 313 <= w[0] <= 328 and re.fullmatch(r"[A-Z]{2,4}", w[4])]
    pnts_tokens = [w[4] for w in row if 328 < w[0] <= 352 and re.fullmatch(r"-?\d+", w[4])]
    nm = " ".join(name_tokens).strip()
    if nm != r["name"].strip():
        prob["name"].append((rank, r["name"], nm))
    if len(fed_tokens) == 1 and fed_tokens[0] != r["fed"]:
        prob["fed"].append((rank, r["name"], r["fed"], fed_tokens[0]))
    if len(fed_tokens) != 1:
        prob["dupe"].append((rank, r["name"], fed_tokens))
    if len(pnts_tokens) == 1 and int(pnts_tokens[0]) != (r["Pnts"] or 0):
        prob["pnts"].append((rank, r["name"], r["Pnts"], pnts_tokens[0]))
    if len(pnts_tokens) > 1:
        prob["dupe"].append((rank, r["name"], pnts_tokens))

print("ranks in json but not anchored :", sorted(set(json_rows) - set(rebuilt))[:10])
for k, v in prob.items():
    print(f"  {k:<8}: {len(v)} {v[:6]}")

bad = sum(len(v) for v in prob.values())
print("\nRESULT:", "OK - every row agrees with the words layer" if bad == 0 else f"{bad} problems")
sys.exit(1 if bad else 0)
