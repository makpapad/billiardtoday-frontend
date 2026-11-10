# -*- coding: utf-8 -*-
import json, unicodedata, re

def norm(s):
    s = unicodedata.normalize("NFKD", str(s or ""))
    s = "".join(c for c in s if not unicodedata.combining(c)).upper()
    s = s.translate(str.maketrans({"\u00d8":"O","\u0110":"D","\u0141":"L","\u00c6":"AE","\u0152":"OE","\u00df":"SS"}))
    s = re.sub(r"[^A-Z0-9 ]"," ", s)
    return " ".join(s.split())

def toks(s): return tuple(sorted(norm(s).split()))
def key(r): return (toks(r["name"]), (r.get("fed") or "").strip().upper())

ours = json.load(open("public/data/ceb-ranking/3c-individual.json",encoding="utf-8"))["rows"]
xl = json.load(open("docs/ai/ceb-ranking/ceb16_xlsx_final_clean.json",encoding="utf-8"))["rows"]
print("ours", len(ours), "xl", len(xl))

xl_no_groot = [r for r in xl if norm(r["name"]) != "GROOT RAYMON"]
print("xl_no_groot", len(xl_no_groot))

def build_map(rows):
    m = {}
    dups = []
    for r in rows:
        k = key(r)
        if k in m: dups.append((k, m[k]["rank"], r["rank"]))
        m.setdefault(k, r)
    return m, dups

om, odups = build_map(ours)
xm, xdups = build_map(xl_no_groot)
print("our dup keys:", len(odups), "xl dup keys:", len(xdups))
for d in odups[:20]: print("  our dup", d)
for d in xdups[:20]: print("  xl dup", d)

common = set(om).intersection(xm)
only_us = set(om).difference(xm)
only_xl = set(xm).difference(om)
print("common", len(common), "only_us", len(only_us), "only_xl", len(only_xl))
for k in sorted(only_us, key=lambda k: om[k]["rank"]):
    r = om[k]; print("  ONLY US  #%d %s %s %sp %s" % (r["rank"], r["name"], r["fed"], r["points"], r["ev"]))
for k in sorted(only_xl, key=lambda k: xm[k]["rank"]):
    r = xm[k]; print("  ONLY XL  #%d %s %s %sp %s" % (r["rank"], r["name"], r["fed"], r["points"], r["ev"]))

for nm in ["HENDRIKSEN","TORRISCO","GOKSU","GENC","BARTSOKAS","PRASSAS","TACHOIRE","OZEN","CELIK"]:
    print("--- %s ---" % nm)
    print("  ours:", [(r["rank"], r["name"], r["fed"], r["points"]) for r in ours if nm in norm(r["name"])])
    print("  xl  :", [(r["rank"], r["name"], r["fed"], r["points"]) for r in xl if nm in norm(r["name"])])

xl_pos = {k: xm[k]["rank"] for k in common}
cl = sorted(common, key=lambda k: om[k]["rank"])
inv = 0
pairs = []
for i in range(len(cl)):
    for j in range(i+1, len(cl)):
        if xl_pos[cl[i]] > xl_pos[cl[j]]:
            inv += 1
print("current inversions =", inv)
