# -*- coding: utf-8 -*-
import json, unicodedata, re

REPO = "D:/Projects/4-billiardtoday-frontend"
LIVE = REPO + "/public/data/ceb-ranking/3c-individual.json"
BKP = REPO + "/docs/ai/ceb-ranking/backup/3c-individual.json.pre-order-align.bak"


def norm(s):
    s = unicodedata.normalize("NFKD", str(s or ""))
    s = "".join(c for c in s if not unicodedata.combining(c)).upper()
    s = s.translate(str.maketrans({"\u00d8": "O", "\u0110": "D", "\u0141": "L",
                                   "\u00c6": "AE", "\u0152": "OE", "\u00df": "SS"}))
    s = re.sub(r"[^A-Z0-9 ]", " ", s)
    return " ".join(s.split())


def key(r):
    return (tuple(sorted(norm(r["name"]).split())), (r.get("fed") or "").strip().upper())


ours = json.load(open(LIVE, encoding="utf-8"))["rows"]
bkp = json.load(open(BKP, encoding="utf-8"))["rows"]
old = {key(r): r["rank"] for r in bkp}

moves = []
for r in ours:
    o = old[key(r)]
    if o != r["rank"]:
        moves.append((o, r["rank"], r["rank"] - o, r["name"], r["fed"], r["points"]))

moves.sort(key=lambda m: m[1])
print("rows changed rank:", len(moves))
print()
# contiguous runs with same delta
print("CONTIGUOUS RUNS (old_start..old_end -> new_start..new_end, delta):")
runs = []
for m in moves:
    if runs and m[1] - runs[-1]["last_new"] == 1 and m[2] == runs[-1]["delta"]:
        runs[-1]["last_new"] = m[1]
        runs[-1]["last_old"] = m[0]
        runs[-1]["n"] += 1
    else:
        runs.append({"first_old": m[0], "last_old": m[0], "first_new": m[1],
                     "last_new": m[1], "delta": m[2], "n": 1})
for rn in runs:
    print(f"  old {rn['first_old']:>4}..{rn['last_old']:<4} -> new {rn['first_new']:>4}..{rn['last_new']:<4}"
          f" delta={rn['delta']:+d}  n={rn['n']}")

print()
print("BIG movers (|delta|>=2):")
for o, n, d, nm, fed, p in sorted(moves, key=lambda m: -abs(m[2])):
    if abs(d) >= 2:
        print(f"  {nm:28s} {fed} {p:>3}p  #{o} -> #{n}  ({d:+d})")

# save
json.dump(moves, open("D:/tmp/ceb/moves.json", "w", encoding="utf-8"), ensure_ascii=False)
