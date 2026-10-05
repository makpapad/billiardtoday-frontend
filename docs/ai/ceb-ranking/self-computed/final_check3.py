"""ΤΕΛΙΚΟΣ ΕΛΕΓΧΟΣ v3 — ταυτοποίηση με αυτοεπαλήθευση.

Αντί να «μαντέψω» ποιος είναι ποιος, δοκιμάζω όλους τους υποψήφιους παίκτες μας
(ίδια χώρα + κοινό όνομα/μεταγραμματισμό) και κρατάω ΕΚΕΙΝΟΝ του οποίου οι πόντοι
από τα 7 τουρνουά μας βγάζουν ΑΚΡΙΒΩΣ τη γραμμή της CEB.

Έτσι κάθε ταίριασμα είναι από μόνο του απόδειξη.
"""
import csv, json, os, re, unicodedata
from collections import defaultdict, Counter
from greek_translit import latinize_fullname

HERE = os.path.dirname(os.path.abspath(__file__))


def rd(path, header):
    lines = open(path, encoding="utf-8").read().splitlines()
    s = next(i for i, ln in enumerate(lines) if ln.startswith(header))
    return list(csv.DictReader(lines[s:]))


def toks(name):
    if not name:
        return set()
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c)).upper()
    s = re.sub(r"[^A-Z0-9 ]", " ", s)
    return {t for t in s.split() if len(t) > 1}


DOC2COL = {
    "2c8d4cc9-cbb6-480f-98a6-01e73a8d4c9e": ("A", "ec"),
    "4878d859-934a-4bfe-8edf-4e0fb57999b4": ("E", "wc"),
    "d6676863-ced3-49e0-adb1-5bd9850c2e15": ("F", "wc"),
    "ec9b5e40-0264-4647-950e-d50edf88cb65": ("G", "wc"),
    "f45f1401-2772-49ea-8e7c-3a31240d09aa": ("H", "wc"),
    "35b08ee0-c07f-4c65-9e6f-3c9e9f6b2b91": ("I", "wc"),
    "e8e9634d-7f81-429c-8e08-ada646adc353": ("J", "wc"),
}
COL2KIND = {v[0]: v[1] for v in DOC2COL.values()}
TBL = {"ec": [(1, 1, 80), (2, 2, 54), (3, 4, 38), (5, 8, 26), (9, 16, 16), (17, 32, 8), (33, 10**6, 4)],
       "wc": [(1, 1, 40), (2, 2, 27), (3, 4, 19), (5, 8, 13), (9, 16, 8), (17, 32, 4), (33, 10**6, 2)]}
COLS = ["A", "E", "F", "G", "H", "I", "J"]


def pts(pos, kind):
    for lo, hi, p in TBL[kind]:
        if lo <= pos <= hi:
            return p
    return 0


ceb = json.load(open(os.path.join(HERE, "ceb16_clean.json"), encoding="utf-8"))
finals = rd(os.path.join(HERE, "our_finals.csv"), "event_docid,")

# παίκτης μας: id -> {όνομα, χώρα, στήλη->θέση, τοκενς}
players = defaultdict(lambda: {"name": "", "country": "", "pos": {}, "tokens": set()})
for r in finals:
    if not r["player_id"]:
        continue
    pid = int(r["player_id"])
    p = players[pid]
    p["name"] = p["name"] or (r["full_name"] or "")
    p["country"] = p["country"] or (r["country"] or "").strip().upper()
    p["pos"][DOC2COL[r["event_docid"]][0]] = int(r["position"])
    p["tokens"] |= toks(r["full_name"])
    p["tokens"] |= toks(latinize_fullname(r["full_name"] or ""))

by_country = defaultdict(list)
for pid, p in players.items():
    by_country[p["country"]].append(pid)

stats, mismatch, pen_rows, gap_rows = Counter(), [], [], []
sum_ours = sum_ceb = 0

for r in ceb:
    fed = (r["fed"] or "").strip().upper()
    ceb_vals = {c: r["ev"].get(c) for c in COLS}
    ceb_total = sum(v for v in ceb_vals.values() if v is not None)

    if any(v is not None and v < 0 for v in ceb_vals.values()):
        pen_rows.append((r["rank"], r["name"], fed, {c: v for c, v in ceb_vals.items() if v is not None and v < 0}))
        continue

    row_tokens = toks(r["name"]) | toks(latinize_fullname(r["name"]))
    exact, near = [], []
    for pid in by_country.get(fed, []):
        p = players[pid]
        if not (row_tokens & p["tokens"]):
            continue
        comp_vals = {c: (pts(p["pos"][c], COL2KIND[c]) if c in p["pos"] else None) for c in COLS}
        matches = all((ceb_vals[c] is None and comp_vals[c] is None) or (ceb_vals[c] == comp_vals[c])
                      for c in COLS)
        if matches:
            exact.append(pid)
        else:
            diff = sum(1 for c in COLS if (ceb_vals[c] or 0) != (comp_vals[c] or 0))
            if diff <= 2:
                near.append((pid, diff))

    if len(exact) == 1:
        stats["matched"] += 1
        pid = exact[0]
        p = players[pid]
        comp = {c: (pts(p["pos"][c], COL2KIND[c]) if c in p["pos"] else 0) for c in COLS}
        sum_ours += sum(comp.values())
        sum_ceb += ceb_total
    elif len(exact) > 1:
        stats["ambiguous"] += 1
    elif near:
        stats["near_miss"] += 1
        pid, diff = sorted(near, key=lambda x: x[1])[0]
        p = players[pid]
        comp = {c: (pts(p["pos"][c], COL2KIND[c]) if c in p["pos"] else 0) for c in COLS}
        mismatch.append((r["rank"], r["name"], fed, ceb_total, sum(comp.values()), p["name"],
                         {c: (ceb_vals[c], comp[c]) for c in COLS if (ceb_vals[c] or 0) != comp[c]}))
    else:
        stats["unmatched"] += 1
        if ceb_total > 0 or True:
            gap_rows.append((r["rank"], r["name"], fed, {c: v for c, v in ceb_vals.items() if v}))

tot = stats["matched"] + stats["ambiguous"] + stats["near_miss"] + stats["unmatched"]
print("=== v3: ταυτοποίηση με αυτοεπαλήθευση ===")
print(f"  γραμμές CEB (χωρίς ποινές): {tot}")
print(f"  ΑΠΟΔΕΔΕΙΓΜΕΝΑ ίδιοι (η γραμμή βγαίνει ακριβώς): {stats['matched']}  ({(stats['matched']/max(tot,1))*100:.1f}%)")
print(f"  αμφίσημα: {stats['ambiguous']} · σχεδόν (1-2 κελιά): {stats['near_miss']} · αταίριαστα: {stats['unmatched']}")
print(f"  άθροισμα πόντων στα αποδεδειγμένα: δικά μας {sum_ours} vs CEB {sum_ceb}")

print(f"\n=== ΠΟΙΝΕΣ στη CEB: {len(pen_rows)} ===")
for rank, name, fed, vals in pen_rows:
    print(f"  #{rank:5d} {name[:28]:28s} {fed} {vals}")

print(f"\n=== ΑΤΑΙΡΙΑΣΤΑ ({stats['unmatched']}) — όσα έχουν πόντους στη CEB ===")
for rank, name, fed, vals in gap_rows[:25]:
    if vals:
        print(f"  #{rank:5d} {name[:28]:28s} {fed} {vals}")

print(f"\n=== ΣΧΕΔΟΝ (1-2 κελιά διαφορά) — υποψήφια λάθος ταυτοποίηση ή κενό: {len(mismatch)} ===")
for rank, name, fed, ct, ot, ourname, diff in mismatch[:20]:
    d = " ".join(f"{c}:CEB={a}/μας={b}" for c, (a, b) in diff.items())
    print(f"  #{rank:5d} {name[:24]:24s} {fed} CEB={ct:4d} μας={ot:4d} (ταιριάξαμε: {ourname[:22]}) | {d}")
