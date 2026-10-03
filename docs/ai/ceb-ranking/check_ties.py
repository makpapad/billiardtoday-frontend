import json, collections

P = r"D:/Projects/5-billiardtoday-frontend/public/data/ceb-ranking/3c-individual.json"
d = json.load(open(P, encoding="utf-8"))
keys = [e["key"] for e in d["events"]]
rows = d["rows"]
order = list(reversed(keys))  # J .. A (last counting event -> first)

groups = collections.defaultdict(list)
for r in rows:
    groups[r["points"]].append(r)
tied = {p: g for p, g in groups.items() if len(g) > 1 and p and p > 0}

def vec(r, drop_penalties):
    out = []
    for k in order:
        v = r["ev"][keys.index(k)] or 0
        if drop_penalties and v < 0:
            v = 0
        out.append(v)
    return tuple(out)

for drop in (False, True):
    ok = 0
    bad = []
    for p, g in tied.items():
        s = sorted(g, key=lambda r: vec(r, drop), reverse=True)
        if [r["rank"] for r in s] == [r["rank"] for r in g]:
            ok += 1
        else:
            bad.append(p)
    label = "ignoring the deduction cells" if drop else "counting the deduction cells as values"
    print(f"{label:38s} -> {ok}/{len(tied)} tied groups in the same order as the PDF   (mismatch: {bad})")

# how deep does the comparison ever need to go?
depths = collections.Counter()
for p, g in tied.items():
    s = sorted(g, key=lambda r: vec(r, True), reverse=True)
    for a, b in zip(s, s[1:]):
        va, vb = vec(a, True), vec(b, True)
        for i, (x, y) in enumerate(zip(va, vb)):
            if x != y:
                depths[order[i]] += 1
                break
print("\nthe event that actually decided a tie (J = most recent):", dict(depths))
pen = [(r["rank"], r["name"], r["fed"], r["points"], r["ev"]) for r in rows if any((v or 0) < 0 for v in r["ev"])]
print("\nplayers with a deduction cell:", len(pen))
for x in pen:
    print("  ", x)
