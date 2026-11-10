# -*- coding: utf-8 -*-
import json, unicodedata, re, collections

P  = "public/data/ceb-ranking/3c-individual.json"
XL = "docs/ai/ceb-ranking/ceb16_xlsx_final_clean.json"

us  = json.load(open(P, encoding="utf-8"))
ours = us["rows"]
xl  = json.load(open(XL, encoding="utf-8"))["rows"]

print("="*70)
print("(a) SYNOLA")
ranks = [r["rank"] for r in ours]
print(f"  rows          = {len(ours)}   (expect 1467)  {'OK' if len(ours)==1467 else 'FAIL'}")
print(f"  sum points    = {sum(r['points'] for r in ours)}   (expect 6989)  {'OK' if sum(r['points'] for r in ours)==6989 else 'FAIL'}")
print(f"  rank min/max  = {min(ranks)}..{max(ranks)}  unique={len(set(ranks))}")
print(f"  contiguous    = {ranks == list(range(1,len(ours)+1))}")
print(f"  counts.players= {us['counts']['players']}")

print("="*70)
print("(b) ALLAGES")
def occ(sub):
    return [(r['rank'],r['name'],r['fed'],r['points']) for r in ours if sub.upper() in r['name'].upper()]
for s in ["REFASSI","GROOT","HENDRIKSEN","TORRISCO"]:
    print(f"  {s:11s}: {occ(s)}")

print("="*70)
print("(g) ELENCHOS ev A+..+J == points")
bad = []
for r in ours:
    s = sum(v for v in r["ev"] if v is not None)
    if s != r["points"]:
        bad.append((r["rank"], r["name"], r["fed"], r["points"], r["ev"], s))
print(f"  deviations: {len(bad)} / {len(ours)}")
for b in bad:
    print("   ", b)

print("="*70)
print("(d) SYGRISI me ceb16_xlsx_final_clean.json")
def toks(s):
    s = unicodedata.normalize("NFKD", str(s or ""))
    s = "".join(c for c in s if not unicodedata.combining(c)).upper()
    s = s.translate(str.maketrans({"\u00d8":"O","\u0110":"D","\u0141":"L","\u00c6":"AE","\u0152":"OE","\u00df":"SS"}))
    s = re.sub(r"[^A-Z0-9 ]"," ", s)
    return " ".join(sorted(s.split()))
def key(r): return (toks(r["name"]), r["fed"])

ourmap = {}
for r in ours: ourmap.setdefault(key(r), r)
xlmap = {}
for r in xl:  xlmap.setdefault(key(r), r)

common = set(ourmap).intersection(set(xlmap))
only_us = set(ourmap).difference(xlmap)
only_xl = set(xlmap).difference(ourmap)
print(f"  common={len(common)}  only-us={len(only_us)}  only-them={len(only_xl)}")
print("  --- only-us ---")
for k in sorted(only_us, key=lambda k: ourmap[k]['rank']):
    r=ourmap[k]; print(f"     #{r['rank']:>4} {r['name']} {r['fed']} {r['points']}p {r['ev']}")
print("  --- only-them (xlsx) ---")
for k in sorted(only_xl, key=lambda k: xlmap[k]['rank']):
    r=xlmap[k]; print(f"     #{r['rank']:>4} {r['name']} {r['fed']} {r['points']}p {r['ev']}")

diff = []
for k in common:
    a, b = ourmap[k], xlmap[k]
    if a["points"] != b["points"] or (a["ev"] or []) != (b["ev"] or []):
        diff.append((a["name"], a["fed"], a["points"], b["points"], a["ev"], b["ev"], a["rank"], b["rank"]))
print(f"  point/vector diffs among common: {len(diff)}")
for d in sorted(diff, key=lambda x: x[6]):
    print("    ", d)

print("="*70)
print("(e) RANK-ORDER DIFFS among common")
cl = sorted(common, key=lambda k: ourmap[k]["rank"])
pos_xl = {k: xlmap[k]["rank"] for k in common}
inv = 0
for i in range(len(cl)):
    for j in range(i+1, len(cl)):
        if pos_xl[cl[i]] > pos_xl[cl[j]]:
            inv += 1
print(f"  inverted pairs = {inv}")
