import json, collections

P = r"D:/Projects/5-billiardtoday-frontend/public/data/ceb-ranking/3c-individual.json"
d = json.load(open(P, encoding="utf-8"))
ev = d["events"]
keys = [e["key"] for e in ev]
rows = d["rows"]
print("players:", len(rows), "| counts:", d.get("counts"))
print("lastEvent:", d.get("lastEvent"), "| edition:", d.get("edition"), "| updatedAt:", d.get("updatedAt"))

nz_counts = collections.Counter()
nc_multi = 0
nc_cols = collections.Counter()
wc_cols = collections.Counter()
sum_bad = 0
examples = []
for r in rows:
    vals = r["ev"]
    nz = [k for k, v in zip(keys, vals) if v]
    nz_counts[len(nz)] += 1
    ncs = [k for k in nz if k in ("B", "C", "D")]
    if len(ncs) > 1:
        nc_multi += 1
        if len(examples) < 5:
            examples.append((r["rank"], r["name"], ncs, vals))
    for k in ncs:
        nc_cols[k] += 1
    wc_cols[len([k for k in nz if k in ("E", "F", "G", "H", "I", "J")])] += 1
    if sum(v or 0 for v in vals) != (r["points"] or 0):
        sum_bad += 1

print("\ncolumns filled per player:", dict(sorted(nz_counts.items())))
print("max columns filled:", max(nz_counts))
print("players with MORE than one national-championship column:", nc_multi, examples[:3])
print("NC column usage (players with points in it):", dict(nc_cols))
print("World-Cup columns filled per player:", dict(sorted(wc_cols.items())))
print("rows where sum(A..J) != points:", sum_bad)
print("players with 8 columns:", nz_counts[8], "| 7:", nz_counts[7], "| 0 points:", nz_counts[0])
