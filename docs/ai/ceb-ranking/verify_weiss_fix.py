# -*- coding: utf-8 -*-
"""
verify_weiss_fix.py — Επαλήθευση (α)–(ε) μετά τη διόρθωση Weiss + Pinto.
Καθαρά διαβάζει· δεν γράφει τίποτα. Αριθμοί ΜΟΝΟ από αρχείο.
"""
from __future__ import annotations
import json, os, unicodedata, re, collections

REPO = "D:/Projects/4-billiardtoday-frontend"
CD = os.path.join(REPO, "docs", "ai", "ceb-ranking")
LIVE = os.path.join(REPO, "public", "data", "ceb-ranking", "3c-individual.json")
BKP = os.path.join(CD, "backup", "3c-individual.json.pre-weiss-fix.bak")
XL = os.path.join(CD, "ceb16_xlsx_final_clean.json")

MOVER = [("WEISS Alexander", "AT"), ("WEISS Adrian", "SE"),
         ("Pinto Luis", "PT"), ("Pinto Vítor", "PT")]
TARGETS = ["GOKSU Volkan", "HENDRIKSEN Rene", "TORRISCO Enrique Jose", "BARTSOKAS Konstantinos"]


def norm(s):
    s = unicodedata.normalize("NFKD", str(s or ""))
    s = "".join(c for c in s if not unicodedata.combining(c)).upper()
    s = s.translate(str.maketrans({"Ø": "O", "Đ": "D", "Ł": "L", "Æ": "AE", "Œ": "OE", "ß": "SS"}))
    s = re.sub(r"[^A-Z0-9 ]", " ", s)
    return " ".join(s.split())


def key(r):   # κανονικοποιημένα: πεζά/τόνοι/σειρά ονόματος αγνοούνται
    return (tuple(sorted(norm(r["name"]).split())), (r.get("fed") or "").strip().upper())


def ekey(r):  # όνομα με σειρά tokens (για ταύτιση με tie_rule)
    return (norm(r["name"]), (r.get("fed") or "").strip().upper())


def load(p):
    d = json.load(open(p, encoding="utf-8"))
    return d["rows"] if isinstance(d, dict) else d


def main():
    cur = json.load(open(LIVE, encoding="utf-8"))
    ours = cur["rows"]
    bak = load(BKP)

    print("=" * 74)
    print("(α) ΣΥΝΟΛΑ")
    ranks = [r["rank"] for r in ours]
    s = sum(r["points"] for r in ours)
    print("  rows        =", len(ours), "OK" if len(ours) == 1467 else "FAIL")
    print("  sum points  =", s, "OK" if s == 6989 else "FAIL")
    print("  rank 1..N   =", min(ranks), "..", max(ranks), "contiguous:", ranks == list(range(1, len(ours) + 1)))

    print("=" * 74)
    print("(β) A+..+J == points")
    bad = [(r["rank"], r["name"], r["points"], sum(v for v in r["ev"] if v is not None))
           for r in ours if sum(v for v in r["ev"] if v is not None) != r["points"]]
    print("  αποκλίσεις =", len(bad), "/", len(ours))
    for b in bad:
        print("   ", b)

    print("=" * 74)
    print("(γ) ΟΙ 4 ΔΙΟΡΘΩΜΕΝΕΣ ΓΡΑΜΜΕΣ (τιμή + θέση)")
    bpos = {ekey(r): i for i, r in enumerate(bak, 1)}
    for name, fed in MOVER:
        r = next(x for x in ours if x["name"] == name and x["fed"] == fed)
        old = next(x for x in bak if x["name"] == name and x["fed"] == fed)
        print(f"  {name:18s} {fed}: ev[0] {old['ev'][0]}->{r['ev'][0]}  points {old['points']}->{r['points']}  "
              f"θέση {bpos[ekey(old)]} -> #{r['rank']}  ev={r['ev']}")

    print("=" * 74)
    print("(δ) ΣΕΙΡΑ vs ceb16_xlsx_final_clean.json (χωρίς GROOT, κανονικοποιημένα)")
    xl = [r for r in load(XL) if norm(r["name"]) != "GROOT RAYMON"]
    xl_pos = {key(r): i for i, r in enumerate(xl, 1)}
    assert len(xl) == 1467, len(xl)
    assert set(xl_pos) == set(key(r) for r in ours), "bijection failed"
    moves = [(r["rank"], xl_pos[key(r)], r["name"], r["fed"], r["points"]) for r in ours
             if xl_pos[key(r)] != r["rank"]]
    print("  γραμμές με άλλη θέση =", len(moves))
    blocks, block, prev_i = [], [], None
    for m in moves:
        if prev_i is not None and m[0] != prev_i + 1:
            blocks.append(block); block = []
        block.append(m); prev_i = m[0]
    if block:
        blocks.append(block)
    for b in blocks:
        anchors = [f"{m[2]}({m[3]})" for m in b if (m[2], m[3]) in MOVER]
        print(f"  ▸ ΜΠΛΟΚ νέα #{b[0][0]}..{b[-1][0]}  (CEB #{b[0][1]}..{b[-1][1]})  γραμμές={len(b)}"
              f"  άγκυρες={anchors}")
    # inversions vs CEB
    pos = [xl_pos[key(r)] for r in ours]
    inv = sum(1 for i in range(len(pos)) for j in range(i + 1, len(pos)) if pos[i] > pos[j])
    print("  αντιστροφές vs CEB =", inv)

    print("=" * 74)
    print("(ε) ΣΗΜΕΙΑ-ΣΤΟΧΟΙ")
    bpos2 = {ekey(r): i for i, r in enumerate(bak, 1)}
    for nm in TARGETS:
        r = next(x for x in ours if x["name"] == nm)
        old = next(x for x in bak if x["name"] == nm)
        print(f"  {nm:26s} {r['fed']} pts={r['points']:>3}  πριν=#{bpos2[ekey(old)]} -> τώρα=#{r['rank']}"
              f"  (CEB xlsx=#{xl_pos[key(r)]})")

    print("=" * 74)
    print("META: name/fed/points/ev/suspended — το multiset άλλαξε ΜΟΝΟ στις 4 γραμμές")
    def sig(r):
        return (r["name"], r["fed"], r["points"], tuple(r["ev"]), r["suspended"])
    ca, cb = collections.Counter(sig(r) for r in ours), collections.Counter(sig(r) for r in bak)
    diff_only_after = list((ca - cb).elements())
    print("  only-in-after:", diff_only_after)
    print("  only-in-before:", list((cb - ca).elements()))


if __name__ == "__main__":
    main()
