# -*- coding: utf-8 -*-
import json, os, importlib.util, unicodedata, re
from collections import OrderedDict

REPO = "D:/Projects/4-billiardtoday-frontend"
CD = os.path.join(REPO, "docs", "ai", "ceb-ranking")

spec = importlib.util.spec_from_file_location("trc", os.path.join(CD, "tie_rule_candidate.py"))
trc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(trc)

def norm(s):
    return trc._norm_name(s)
def toks(s):
    return tuple(sorted(norm(s).split()))
def key(r):
    return (toks(r["name"]), (r.get("fed") or "").strip().upper())

ours_payload = json.load(open(os.path.join(REPO, "public/data/ceb-ranking/3c-individual.json"), encoding="utf-8"))
ours = ours_payload["rows"]
xl = json.load(open(os.path.join(CD, "ceb16_xlsx_final_clean.json"), encoding="utf-8"))["rows"]
prev = json.load(open("D:/tmp/ceb/ceb16_prev_HEAD.json", encoding="utf-8"))
ev_raw = json.load(open(os.path.join(CD, "editions", "16-2026.json"), encoding="utf-8"))
events = ev_raw.get("events") or ev_raw.get("meta", {}).get("events")
print("events:", [e.get("key") for e in events] if events else events)

xl_no_groot = [r for r in xl if norm(r["name"]) != "GROOT RAYMON"]
xm = {key(r): r for r in xl_no_groot}
assert len(xm) == 1467

def ceb_rank(r):
    return xm[key(r)]["rank"]

# groups by points
groups = OrderedDict()
for r in ours:
    groups.setdefault(r["points"], []).append(r)

print("groups:", len(groups))
mismatch_groups = []
total_pairs = 0
for pts, g in groups.items():
    if len(g) < 2:
        continue
    ceb_order = sorted(g, key=ceb_rank)
    rule_order = trc.sort_tie_group(g, prev, events)
    same = [id(x) for x in ceb_order] == [id(x) for x in rule_order]
    # count pair inversions rule vs ceb
    pos_ceb = {id(x): i for i, x in enumerate(ceb_order)}
    pos_rule = {id(x): i for i, x in enumerate(rule_order)}
    pairs = 0
    for i in range(len(g)):
        for j in range(i+1, len(g)):
            a, b = g[i], g[j]
            if (pos_ceb[id(a)] - pos_ceb[id(b)]) * (pos_rule[id(a)] - pos_rule[id(b)]) < 0:
                pairs += 1
    total_pairs += pairs
    if not same:
        mismatch_groups.append((pts, len(g), pairs))
        print(f"  MISMATCH pts={pts} n={len(g)} pairs(rule-vs-ceb)={pairs}")
print("mismatch groups:", mismatch_groups)
print("total rule-vs-ceb pair inversions:", total_pairs)

# ---- full move list: current rank -> new rank (position in CEB order) ----
new_order = sorted(ours, key=ceb_rank)
moves = []
for i, r in enumerate(new_order, 1):
    if r["rank"] != i:
        moves.append((r["rank"], i, r["name"], r["fed"], r["points"]))
print("rows changing rank:", len(moves))
# summarize contiguous blocks
moves_sorted = sorted(moves)
for old, new, nm, fed, pts in moves_sorted:
    pass

# named movers of interest
interest = ["GOKSU Volkan","GENC Burhan","BARTSOKAS Konstantinos","HENDRIKSEN Rene",
            "TORRISCO Enrique Jose","PRASSAS Konstantinos","TACHOIRE Adrien",
            "OZEN Mohamed","CELIK Sabir"]
pos_new = {}
for i, r in enumerate(new_order, 1):
    pos_new[id(r)] = i
print("--- interest ---")
for r in ours:
    if r["name"] in interest:
        print(f"  {r['name']:26s} {r['fed']} {r['points']:>3}p  now=#{r['rank']:<5} new=#{pos_new[id(r)]}")

# also dump all moves to tmp for report building
json.dump(moves_sorted, open("D:/tmp/ceb/moves.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
