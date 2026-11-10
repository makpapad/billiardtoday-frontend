# -*- coding: utf-8 -*-
import json, os, importlib.util
from collections import OrderedDict

REPO = "D:/Projects/4-billiardtoday-frontend"
CD = REPO + "/docs/ai/ceb-ranking"
spec = importlib.util.spec_from_file_location("trc", CD + "/tie_rule_candidate.py")
trc = importlib.util.module_from_spec(spec); spec.loader.exec_module(trc)
norm = trc._norm_name


def key(r):
    return (tuple(sorted(norm(r["name"]).split())), (r.get("fed") or "").strip().upper())


ours = json.load(open(REPO + "/public/data/ceb-ranking/3c-individual.json", encoding="utf-8"))["rows"]
xl = [r for r in json.load(open(CD + "/ceb16_xlsx_final_clean.json", encoding="utf-8"))["rows"]
      if norm(r["name"]) != "GROOT RAYMON"]
prev = json.load(open("D:/tmp/ceb/ceb16_prev_HEAD.json", encoding="utf-8"))
ev_raw = json.load(open(CD + "/editions/16-2026.json", encoding="utf-8"))
events = ev_raw.get("events") or ev_raw.get("meta", {}).get("events")

# prev rank map: use trc._key (unsorted normalized name) as the rule does
prm = trc._prev_rank_map(prev)
def plook(r):
    return prm.get(trc._key(r))

xlmap = {key(r): r for r in xl}
def ceb_rank(r): return xlmap[key(r)]["rank"]

print("prev ranks (rule key):")
for nm in ["GOKSU Volkan", "GENC Burhan", "BARTSOKAS Konstantinos", "HENDRIKSEN Rene",
           "TORRISCO Enrique Jose", "PRASSAS Konstantinos", "TACHOIRE Adrien",
           "OZEN Mohamed", "CELIK Sabir", "ALEXANDROPOULOS Stefanos", "SELEVENTAS Charis"]:
    for r in ours:
        if r["name"] == nm:
            print(f"  {nm:26s} now=#{r['rank']:<5} ceb=#{ceb_rank(r):<5} prev={plook(r)} ev={r['ev']}")

# the 9 pairs of pts=12 (rule vs CEB)
groups = OrderedDict()
for r in ours: groups.setdefault(r["points"], []).append(r)
g = groups[12]
ceb_order = sorted(g, key=ceb_rank)
rule_order = trc.sort_tie_group(g, prev, events)
print("\npts=12 group: rule places PRASSAS at group-index", rule_order.index(next(r for r in g if r["name"]=="PRASSAS Konstantinos")))
print("pts=12 group: CEB places PRASSAS at group-index", ceb_order.index(next(r for r in g if r["name"]=="PRASSAS Konstantinos")))
print("CEB order first 11:", [(r["name"], ceb_rank(r)) for r in ceb_order[:11]])

# 0-group pair
g0 = groups[0]
c0 = sorted(g0, key=ceb_rank)
r0 = trc.sort_absolute_tie_only(g0, prev, events)  # beta only
for nm in ["ALEXANDROPOULOS Stefanos", "SELEVENTAS Charis"]:
    rr = next(r for r in g0 if r["name"] == nm)
    print(f"\n{nm}: ceb=#{ceb_rank(rr)} beta_pos={r0.index(rr)} ceb_pos={c0.index(rr)} prev_rulekey={plook(rr)} prev_sortedkey={trc._prev_rank_map(prev).get(key(rr))}")
