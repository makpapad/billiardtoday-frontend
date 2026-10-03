import collections, json, re
import pymupdf

doc = pymupdf.open("ceb16.pdf")
COLX = {"A": 388, "B": 404, "C": 420, "D": 436, "E": 452, "F": 468,
        "G": 484, "H": 500, "I": 516, "J": 530}


def num(t):
    t = t.strip()
    return int(t) if re.fullmatch(r"-?\d+", t) else None


def cluster(ys, tol=3.0):
    ys = sorted(set(ys)); out = []; cur = [ys[0]]
    for y in ys[1:]:
        if y - cur[-1] <= tol:
            cur.append(y)
        else:
            out.append(cur); cur = [y]
    out.append(cur); return out


rows = []
skipped = []
for pi in range(doc.page_count):
    p = doc[pi]
    words = p.get_text("words")
    clusters = cluster([w[3] for w in words])
    pending_name = ""
    for cl in clusters:
        ws = [w for w in words if w[3] in cl]
        rank = None; fed = None; names = []; cols = {}; dates = []
        for w in sorted(ws, key=lambda w: (w[0], w[1])):
            x, t = w[0], w[4]; v = num(t)
            if x < 64 and v is not None and rank is None:
                rank = v; continue
            if 310 <= x <= 332 and re.fullmatch(r"[A-Z]{2,4}", t):
                fed = t; continue
            if 65 <= x < 310:
                names.append(t); continue
            if v is None:
                if re.fullmatch(r"\d{1,2}\.\d{1,2}\.\d{4}", t):
                    dates.append(t)
                continue
            if 330 <= x <= 350:
                cols["Pnts"] = v; continue
            if 350 < x <= 378:
                cols["PP"] = v; continue
            for c, cx in COLX.items():
                if abs(x - cx) <= 6:
                    cols[c] = v; break
        nm = " ".join(names).strip()
        if rank is None and fed is None and nm and not cols:
            pending_name = nm; continue
        if rank is None or fed is None:
            skipped.append((pi + 1, cl, nm, cols))
            continue
        if not nm and pending_name:
            nm = pending_name
        pending_name = ""
        rows.append({"page": pi + 1, "rank": rank, "name": nm, "fed": fed,
                     "Pnts": cols.get("Pnts"), "PP": cols.get("PP"),
                     "ev": {c: cols[c] for c in "ABCDEFGHIJ" if c in cols},
                     "dates": dates})

print("pages:", doc.page_count, "| rows:", len(rows),
      "| ranks distinct:", len({r['rank'] for r in rows}),
      "| range:", min(r['rank'] for r in rows), "-", max(r['rank'] for r in rows))
print("skipped clusters (no rank/fed):", len(skipped), skipped[:4])
bad = [r for r in rows if r["Pnts"] is not None and sum(r["ev"].values()) + (r["PP"] or 0) != r["Pnts"]]
print("sum(Pnts) mismatches:", len(bad), [(r["rank"], r["name"], r["Pnts"], r["PP"], r["ev"]) for r in bad[:5]])
print("rows missing Pnts:", sum(1 for r in rows if r["Pnts"] is None))
print("rows missing name:", sum(1 for r in rows if not r["name"].strip()),
      [(r["rank"], r["fed"]) for r in rows if not r["name"].strip()][:5])
print("rows with PP:", sum(1 for r in rows if r["PP"]), [(r["rank"], r["name"], r["PP"]) for r in rows if r["PP"]][:8])
print("rows with suspension date:", [(r["rank"], r["name"], r["fed"], r["dates"]) for r in rows if r["dates"]])
print("players per event column:", {c: sum(1 for r in rows if c in r["ev"]) for c in "ABCDEFGHIJ"})
print("top fed counts:", collections.Counter(r["fed"] for r in rows).most_common(12))
json.dump(rows, open("ceb16_clean.json", "w", encoding="utf-8"), ensure_ascii=False)
print("saved ceb16_clean.json")

# ---- suspension highlighting: text color of the name span for flagged rows ----
flagged = {976: "KASIDOKOSTAS", 1469: "YUKSEL"}
colors = collections.Counter()
for pi in range(doc.page_count):
    d = doc[pi].get_text("dict")
    for blk in d.get("blocks", []):
        for ln in blk.get("lines", []):
            for sp in ln.get("spans", []):
                t = sp["text"].strip()
                if not t:
                    continue
                colors[sp["color"]] += 1
                for rk, nm in flagged.items():
                    if nm in t:
                        print(f"  flagged page {pi+1}: rank {rk} {nm!r} color={sp['color']:#08x} font={sp['font']} size={round(sp['size'],1)}")
print("distinct text colors on all pages:", [(hex(c), n) for c, n in colors.most_common(8)])
