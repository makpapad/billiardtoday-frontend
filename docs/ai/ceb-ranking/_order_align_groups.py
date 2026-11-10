# -*- coding: utf-8 -*-
import json, os, importlib.util
from collections import OrderedDict

REPO = "D:/Projects/4-billiardtoday-frontend"
CD = os.path.join(REPO, "docs", "ai", "ceb-ranking")
spec = importlib.util.spec_from_file_location("trc", os.path.join(CD, "tie_rule_candidate.py"))
trc = importlib.util.module_from_spec(spec); spec.loader.exec_module(trc)

norm = trc._norm_name
def toks(s): return tuple(sorted(norm(s).split()))
def key(r): return (toks(r["name"]), (r.get("fed") or "").strip().upper())

ours = json.load(open(os.path.join(REPO,"public/data/ceb-ranking/3c-individual.json"),encoding="utf-8"))["rows"]
xl = json.load(open(os.path.join(CD,"ceb16_xlsx_final_clean.json"),encoding="utf-8"))["rows"]
prev = json.load(open("D:/tmp/ceb/ceb16_prev_HEAD.json",encoding="utf-8"))
ev_raw = json.load(open(os.path.join(CD,"editions","16-2026.json"),encoding="utf-8"))
events = ev_raw.get("events") or ev_raw.get("meta",{}).get("events")

xmn = [r for r in xl if norm(r["name"])!="GROOT RAYMON"]
xm = {key(r):r for r in xmn}
def ceb_rank(r): return xm[key(r)]["rank"]

groups = OrderedDict()
for r in ours: groups.setdefault(r["points"],[]).append(r)

def pair_inv(a_order, b_order):
    pa = {id(x):i for i,x in enumerate(a_order)}
    pb = {id(x):i for i,x in enumerate(b_order)}
    n=0
    for i in range(len(a_order)):
        for j in range(i+1,len(a_order)):
            x,y=a_order[i],a_order[j]
            if (pa[id(x)]-pa[id(y)])*(pb[id(x)]-pb[id(y)]) < 0:
                n+=1
    return n

print("=== pts=-4 (ours) ===")
for r in groups[-4]:
    print(f"  now=#{r['rank']:<5} ceb=#{ceb_rank(r):<5} {r['name']} {r['fed']} ev={r['ev']} prev={trc._prev_rank_map(prev).get(key(r))}")
g=groups[-4]
ceb_order=sorted(g,key=ceb_rank)
rule_full=trc.sort_tie_group(g,prev,events)
rule_b=trc.sort_absolute_tie_only(g,prev,events)
print(" ceb  order:", [r["name"] for r in ceb_order])
print(" full rule :", [r["name"] for r in rule_full], "pairs_vs_ceb=",pair_inv(ceb_order,rule_full))
print(" beta only :", [r["name"] for r in rule_b], "pairs_vs_ceb=",pair_inv(ceb_order,rule_b))

print("\n=== pts=12 (ours) ===")
g=groups[12]
ceb_order=sorted(g,key=ceb_rank)
rule_full=trc.sort_tie_group(g,prev,events)
print(" ceb  order:", [r["name"] for r in ceb_order])
print(" full rule :", [r["name"] for r in rule_full])
# show positions where they differ
for r in g:
    ci=ceb_order.index(r); ri=rule_full.index(r)
    if ci!=ri:
        print(f"   DIFF {r['name']:26s} ceb_pos_in_grp={ci} rule_pos={ri} now=#{r['rank']} ceb=#{ceb_rank(r)}")

print("\n=== pts=0 group size ===")
g0=groups[0]
print("n=",len(g0))
ceb_order0=sorted(g0,key=ceb_rank)
rule_full0=trc.sort_tie_group(g0,prev,events)
rule_b0=trc.sort_absolute_tie_only(g0,prev,events)
print(" full rule pairs_vs_ceb =", pair_inv(ceb_order0,rule_full0))
print(" beta only pairs_vs_ceb =", pair_inv(ceb_order0,rule_b0))
# find the actual differing pair(s) for beta-only
pa={id(x):i for i,x in enumerate(ceb_order0)}
pb={id(x):i for i,x in enumerate(rule_b0)}
cnt=0
for i in range(len(g0)):
    for j in range(i+1,len(g0)):
        x,y=g0[i],g0[j]
        if (pa[id(x)]-pa[id(y)])*(pb[id(x)]-pb[id(y)])<0:
            cnt+=1
            if cnt<=5:
                print("  pair inv: ", x["name"],x["fed"],ceb_rank(x),"|",y["name"],y["fed"],ceb_rank(y))
print(" beta-only total pairs:",cnt)
