"""ΤΕΛΙΚΟΣ ΕΛΕΓΧΟΣ: βγαίνει η κατάταξη CEB από τα δικά μας δεδομένα;
Αυστηρό ταίριασμα: όνομα + χώρα. Χωριστά οι ποινές (-4) και τα κενά.
"""
import csv, json, os, re, unicodedata
from collections import defaultdict, Counter

HERE = os.path.dirname(os.path.abspath(__file__))


def rd(path, header):
    lines = open(path, encoding="utf-8").read().splitlines()
    s = next(i for i, ln in enumerate(lines) if ln.startswith(header))
    return list(csv.DictReader(lines[s:]))


def norm(name):
    if not name:
        return ""
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c)).upper()
    s = re.sub(r"[^A-Z0-9 ]", " ", s)
    return " ".join(sorted(t for t in s.split() if len(t) > 1))


DOC2COL = {
    "2c8d4cc9-cbb6-480f-98a6-01e73a8d4c9e": ("A", "ec"),
    "4878d859-934a-4bfe-8edf-4e0fb57999b4": ("E", "wc"),
    "d6676863-ced3-49e0-adb1-5bd9850c2e15": ("F", "wc"),
    "ec9b5e40-0264-4647-950e-d50edf88cb65": ("G", "wc"),
    "f45f1401-2772-49ea-8e7c-3a31240d09aa": ("H", "wc"),
    "35b08ee0-c07f-4c65-9e6f-3c9e9f6b2b91": ("I", "wc"),
    "e8e9634d-7f81-429c-8e08-ada646adc353": ("J", "wc"),
}
TBL = {"ec": [(1, 1, 80), (2, 2, 54), (3, 4, 38), (5, 8, 26), (9, 16, 16), (17, 32, 8), (33, 10**6, 4)],
       "wc": [(1, 1, 40), (2, 2, 27), (3, 4, 19), (5, 8, 13), (9, 16, 8), (17, 32, 4), (33, 10**6, 2)]}


def pts(pos, kind):
    for lo, hi, p in TBL[kind]:
        if lo <= pos <= hi:
            return p
    return 0


ceb = json.load(open(os.path.join(HERE, "ceb16_clean.json"), encoding="utf-8"))
finals = rd(os.path.join(HERE, "our_finals.csv"), "event_docid,")
rounds = rd(os.path.join(HERE, "rounds.csv"), "event_docid,")

# 1) τα δικά μας: (όνομα, χώρα) -> {στήλη: θέση}
ours = defaultdict(dict)
for r in finals:
    col = DOC2COL[r["event_docid"]][0]
    key = (norm(r["full_name"]), (r["country"] or "").strip().upper())
    ours[key][col] = int(r["position"])

# 2) πόσα ματς έπαιξε ο καθένας (για τις ποινές)
played = Counter()
for r in rounds:
    played[(r["event_docid"], int(r["player_id"]))] = max(
        played[(r["event_docid"], int(r["player_id"]))], int(r["played"]))
no_show = set()
name_country_of_id = {}
for r in finals:
    if not r["player_id"]:
        continue
    pid = int(r["player_id"])
    name_country_of_id.setdefault(pid, (norm(r["full_name"]), (r["country"] or "").strip().upper()))
    if played.get((r["event_docid"], pid), 0) == 0 and int(r["high_run"] or 0) == 0:
        no_show.add((norm(r["full_name"]), (r["country"] or "").strip().upper()))

cols = ["A", "E", "F", "G", "H", "I", "J"]
COL2KIND = {v[0]: v[1] for v in DOC2COL.values()}
stats = Counter()
pen_rows, gap_rows = [], []
mismatch = []
sum_ours = sum_ceb = 0
compared = 0

for r in ceb:
    key = (norm(r["name"]), (r["fed"] or "").strip().upper())
    ceb_vals = {c: (r["ev"].get(c) if r["ev"].get(c) is not None else None) for c in cols}
    ceb_has = {c: v for c, v in ceb_vals.items() if v is not None}
    positions = ours.get(key)
    ceb_total = sum(v for v in ceb_vals.values() if v is not None)

    # ποινή: αρνητική τιμή στη CEB
    if any(v is not None and v < 0 for v in ceb_vals.values()):
        pen_rows.append((r["rank"], r["name"], r["fed"], ceb_vals, positions is not None))
        continue

    if positions is None:
        if ceb_total > 0:
            gap_rows.append((r["rank"], r["name"], r["fed"], {c: v for c, v in ceb_has.items()}))
        stats["no_data"] += 1
        continue

    compared += 1
    comp = {}
    for c in cols:
        pos = positions.get(c)
        comp[c] = pts(pos, COL2KIND[c]) if pos else 0
    comp_total = sum(comp.values())
    sum_ours += comp_total
    sum_ceb += ceb_total
    if comp_total == ceb_total and all((ceb_vals[c] or 0) == comp[c] for c in cols):
        stats["ok"] += 1
    else:
        stats["bad"] += 1
        diff = {c: (ceb_vals[c], comp[c]) for c in cols if (ceb_vals[c] or 0) != comp[c]}
        mismatch.append((r["rank"], r["name"], r["fed"], ceb_total, comp_total, diff))

print("=== ΤΕΛΙΚΟΣ ΕΛΕΓΧΟΣ ===")
print(f"  γραμμές PDF: {len(ceb)} · συγκρίθηκαν (και τα 7): {compared} · χωρίς δεδομένα: {stats['no_data']}")
print(f"  ΑΚΡΙΒΩΣ ΙΣΑ: {stats['ok']}  ·  ΔΙΑΦΟΡΕΣ: {stats['bad']}  ->  {(stats['ok']/max(compared,1))*100:.1f}% ακρίβεια")
print(f"  άθροισμα πόντων: δικά μας {sum_ours} vs CEB {sum_ceb}")
print(f"\n  γραμμές με ΠΟΙΝΗ στη CEB (-τιμές): {len(pen_rows)}")
for rank, name, fed, vals, has_data in pen_rows:
    neg = {c: v for c, v in vals.items() if v is not None and v < 0}
    print(f"     #{rank:5d} {name[:26]:26s} {fed} {neg} · στα δικά μας δεδομένα: {'ναι' if has_data else 'ΟΧΙ'}")
print(f"\n  γραμμές με πόντους στη CEB αλλά ΚΑΘΟΛΟΥ δεδομένα σε εμάς: {len(gap_rows)}")
for rank, name, fed, vals in gap_rows[:20]:
    print(f"     #{rank:5d} {name[:26]:26s} {fed} {vals}")
print(f"\n  ΟΙ ΔΙΑΦΟΡΕΣ (max 30):")
for rank, name, fed, ct, ot, diff in mismatch[:30]:
    d = " ".join(f"{c}:CEB={a}/μας={b}" for c, (a, b) in diff.items())
    print(f"     #{rank:5d} {name[:26]:26s} {fed} σύνολο CEB={ct:4d} μας={ot:4d} | {d}")
