# -*- coding: utf-8 -*-
"""
verify_ch_move.py — Επαλήθευση (α)–(ε) μετά τη μετακίνηση των 6 Ελβετών B -> C.
Καθαρά διαβάζει· δεν γράφει τίποτα. Αριθμοί ΜΟΝΟ από αρχείο.
"""
from __future__ import annotations
import json, os, unicodedata, re, collections

REPO = "D:/Projects/4-billiardtoday-frontend"
CD = os.path.join(REPO, "docs", "ai", "ceb-ranking")
LIVE = os.path.join(REPO, "public", "data", "ceb-ranking", "3c-individual.json")
BKP = os.path.join(CD, "backup", "3c-individual.json.pre-ch-move.bak")
XL = os.path.join(CD, "ceb16_xlsx_final_clean.json")

MOVERS = [("BEHZAT Cetin", "CH"), ("RECH Pierre Alain", "CH"), ("CANTURK Kenan", "CH"),
          ("GRETILLAT Xavier", "CH"), ("DUVOISIN Joel", "CH"), ("BOULAZ Michel", "CH")]
WEISS_PINTO = [("WEISS Alexander", "AT"), ("WEISS Adrian", "SE"),
               ("Pinto Luis", "PT"), ("Pinto Vítor", "PT")]


def norm(s):
    s = unicodedata.normalize("NFKD", str(s or ""))
    s = "".join(c for c in s if not unicodedata.combining(c)).upper()
    s = s.translate(str.maketrans({"Ø": "O", "Đ": "D", "Ł": "L", "Æ": "AE", "Œ": "OE", "ß": "SS"}))
    s = re.sub(r"[^A-Z0-9 ]", " ", s)
    return " ".join(s.split())


def key(r):   # κανονικοποιημένα: πεζά/τόνοι/σειρά ονόματος/ø αγνοούνται
    return (tuple(sorted(norm(r["name"]).split())), (r.get("fed") or "").strip().upper())


def ekey(r):  # όνομα με σειρά tokens
    return (norm(r["name"]), (r.get("fed") or "").strip().upper())


def load(p):
    d = json.load(open(p, encoding="utf-8"))
    return d["rows"] if isinstance(d, dict) and "rows" in d else d


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
    print("  rank 1..N   =", min(ranks), "..", max(ranks),
          "contiguous:", ranks == list(range(1, len(ours) + 1)))

    print("=" * 74)
    print("(β) A+..+J == points")
    bad = [(r["rank"], r["name"], r["points"], sum(v for v in r["ev"] if v is not None))
           for r in ours if sum(v for v in r["ev"] if v is not None) != r["points"]]
    print("  αποκλίσεις =", len(bad), "/", len(ours))
    for b in bad:
        print("   ", b)

    print("=" * 74)
    print("(γ) ΟΙ 6 ΕΛΒΕΤΟΙ (ev[1] B -> None, ev[2] C <- B  · θέση πριν/μετά)")
    bpos = {ekey(r): i for i, r in enumerate(bak, 1)}
    for name, fed in MOVERS:
        r = next(x for x in ours if x["name"] == name and x["fed"] == fed)
        old = next(x for x in bak if x["name"] == name and x["fed"] == fed)
        assert r["ev"][1] is None, f"{name}: ev[1] όχι None"
        assert r["ev"][2] == old["ev"][1], f"{name}: ev[2] != παλιό B"
        assert r["points"] == old["points"], f"{name}: points άλλαξαν!"
        print(f"  {name:18s} {fed}: B {old['ev'][1]}->None  C {old['ev'][2]}->{r['ev'][2]}"
              f"  points {old['points']}->{r['points']}  θέση #{bpos[ekey(old)]} -> #{r['rank']}")

    print("=" * 74)
    print("(δ) multiset name/fed/points/ev/suspended — ΜΟΝΟ οι 6 άλλαξαν")
    def sig(r):
        return (r["name"], r["fed"], r["points"], tuple(r["ev"]), r.get("suspended"))
    ca, cb = collections.Counter(sig(r) for r in ours), collections.Counter(sig(r) for r in bak)
    only_after = list((ca - cb).elements())
    only_before = list((cb - ca).elements())
    print("  only-in-after :", len(only_after))
    for x in only_after:
        print("     ", x)
    print("  only-in-before:", len(only_before))
    for x in only_before:
        print("     ", x)
    # επιβεβαίωση ότι οι διαφορές αφορούν ΑΠΟΚΛΕΙΣΤΙΚΑ τους 6
    names_after = {x[0] for x in only_after} | {x[0] for x in only_before}
    assert names_after == {n for n, _ in MOVERS}, names_after
    # name/fed/points/suspended ίδια παντού
    def core(r):
        return (r["name"], r["fed"], r["points"], r.get("suspended"))
    assert collections.Counter(core(r) for r in ours) == collections.Counter(core(r) for r in bak), \
        "άλλαξε κάτι σε name/fed/points/suspended"
    print("  name/fed/points/suspended: IDENTICAL multiset σε ΟΛΕΣ τις 1467")

    print("=" * 74)
    print("(ε) ΣΕΙΡΑ vs ceb16_xlsx_final_clean.json (χωρίς GROOT, κανονικοποιημένα)")
    xl = [r for r in load(XL) if norm(r["name"]) != "GROOT RAYMON"]
    xl_pos = {key(r): i for i, r in enumerate(xl, 1)}
    assert len(xl) == 1467, len(xl)
    assert set(xl_pos) == set(key(r) for r in ours), "bijection failed"
    moves = [(r["rank"], xl_pos[key(r)], r["name"], r["fed"], r["points"]) for r in ours
             if xl_pos[key(r)] != r["rank"]]
    print("  γραμμές με άλλη θέση =", len(moves))
    expect = {n for n, _ in MOVERS} | {n for n, _ in WEISS_PINTO}
    unexpected = [m for m in moves if m[2] not in expect]
    print("  αναμενόμενες (Weiss/Pinto + 6 Ελβετοί):",
          sorted({m[2] for m in moves} & expect))
    print("  ΑΛΛΕΣ (μη αναμενόμενες) =", len(unexpected))
    for m in unexpected:
        print("     !!", m)
    # δεσμευμένες ζώνες που άλλαξαν λόγω της θέσης των 6 (μη-Weiss)
    print("  --- όλες οι μετακινήσεις ---")
    for m in moves:
        tag = "ΕΛΒΕΤΟΣ" if m[2] in {n for n, _ in MOVERS} else \
              ("WEISS/PINTO" if m[2] in {n for n, _ in WEISS_PINTO} else "άλλο")
        print(f"    #{m[0]:>4} (xlsx #{m[1]:>4})  {m[2]:26s} {m[3]}  pts={m[4]}  [{tag}]")
    # αντιστροφές
    pos = [xl_pos[key(r)] for r in ours]
    inv = sum(1 for i in range(len(pos)) for j in range(i + 1, len(pos)) if pos[i] > pos[j])
    print("  αντιστροφές vs CEB xlsx =", inv)


if __name__ == "__main__":
    main()
