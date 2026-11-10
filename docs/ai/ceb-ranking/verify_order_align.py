# -*- coding: utf-8 -*-
import json, unicodedata, re, collections

REPO = "D:/Projects/4-billiardtoday-frontend"
LIVE = REPO + "/public/data/ceb-ranking/3c-individual.json"
BKP = REPO + "/docs/ai/ceb-ranking/backup/3c-individual.json.pre-order-align.bak"
XL = REPO + "/docs/ai/ceb-ranking/ceb16_xlsx_final_clean.json"
COLS = list("ABCDEFGHIJ")


def norm(s):
    s = unicodedata.normalize("NFKD", str(s or ""))
    s = "".join(c for c in s if not unicodedata.combining(c)).upper()
    s = s.translate(str.maketrans({"\u00d8": "O", "\u0110": "D", "\u0141": "L",
                                   "\u00c6": "AE", "\u0152": "OE", "\u00df": "SS"}))
    s = re.sub(r"[^A-Z0-9 ]", " ", s)
    return " ".join(s.split())


def key(r):
    return (tuple(sorted(norm(r["name"]).split())), (r.get("fed") or "").strip().upper())


def inversions(a_rows, pos_of):
    cl = [key(r) for r in a_rows]
    n = len(cl)
    inv = 0
    for i in range(n):
        for j in range(i + 1, n):
            if pos_of[cl[i]] > pos_of[cl[j]]:
                inv += 1
    return inv


cur = json.load(open(LIVE, encoding="utf-8"))
ours = cur["rows"]
bkp = json.load(open(BKP, encoding="utf-8"))["rows"]
xl = [r for r in json.load(open(XL, encoding="utf-8"))["rows"] if norm(r["name"]) != "GROOT RAYMON"]
xl_pos = {key(r): r["rank"] for r in xl}

print("=" * 72)
print("(a) SYNOLA (τρεχον αρχειο)")
ranks = [r["rank"] for r in ours]
print("  rows        =", len(ours), "OK" if len(ours) == 1467 else "FAIL")
print("  sum points  =", sum(r["points"] for r in ours), "OK" if sum(r["points"] for r in ours) == 6989 else "FAIL")
print("  rank min/max=", min(ranks), "..", max(ranks), "unique=", len(set(ranks)))
print("  contiguous  =", ranks == list(range(1, len(ours) + 1)))
print("  counts.players =", cur["counts"]["players"])

print("=" * 72)
print("(b) ev A+..+J == points")
bad = [(r["rank"], r["name"], r["points"], sum(v for v in r["ev"] if v is not None))
       for r in ours if sum(v for v in r["ev"] if v is not None) != r["points"]]
print("  deviations =", len(bad), "/", len(ours))
for b in bad:
    print("   ", b)

print("=" * 72)
print("(c) ANTISTROFES vs CEB (χωρις GROOT)")
print("  before (backup) =", inversions(bkp, xl_pos))
print("  after  (live)   =", inversions(ours, xl_pos))

print("=" * 72)
print("(d) 5 ΣΤΟΧΟΙ + νεοι")
idx = {id(r): i for i, r in enumerate(ours, 1)}
for nm in ["GOKSU Volkan", "GENC Burhan", "BARTSOKAS Konstantinos",
           "HENDRIKSEN Rene", "TORRISCO Enrique Jose", "OZEN Mohamed", "CELIK Sabir"]:
    for r in ours:
        if r["name"] == nm:
            print(f"  {nm:26s} fed={r['fed']} {r['points']:>3}p  now=#{r['rank']:<5} CEB=#{xl_pos[key(r)]}")

print("=" * 72)
print("(e) 6 ζευγαρια v15 (θεσεις στη λιστα μας, μετα)")
pairs = [("SIX Jean Paul", "DE QUEIROS Jose"), ("MACQUET Patrick", "MILLET Michel"),
         ("PIGNATEL Florent", "TROMAS Eric"), ("COLSON Herve", "DAUPHIN Michel"),
         ("MIOSSEC Cyril", "GAUCHER Julien"), ("LEROY Xavier", "BIBAUT Pierre")]
for a, b in pairs:
    ra = next((r for r in ours if r["name"] == a), None)
    rb = next((r for r in ours if r["name"] == b), None)
    print(f"  {a:20s} #{ra['rank']:<5}  |  {b:20s} #{rb['rank']:<5}")

print("=" * 72)
print("META-TEST: name/fed/points/ev/suspended αμετάβλητα (multiset)")
def sig(r):
    return (r["name"], r["fed"], r["points"], tuple(r["ev"]), r["suspended"])
csa = collections.Counter(sig(r) for r in ours)
csb = collections.Counter(sig(r) for r in bkp)
print("  identical multisets:", csa == csb)
print("  only-in-after:", list((csa - csb))[:5])
print("  only-in-before:", list((csb - csa))[:5])
print("  generatedAt before/after:", json.load(open(BKP, encoding="utf-8"))["generatedAt"], "/", cur["generatedAt"])
