"""Ποια φάση αποκλεισμού δίνει πόντους; (μαντεύουμε τον κανόνα από τα δεδομένα)"""
import csv, json, os, re, unicodedata
from collections import defaultdict, Counter

HERE = os.path.dirname(os.path.abspath(__file__))
COL2DOC = {
    "A": "2c8d4cc9-cbb6-480f-98a6-01e73a8d4c9e",
    "E": "4878d859-934a-4bfe-8edf-4e0fb57999b4",
    "F": "d6676863-ced3-49e0-adb1-5bd9850c2e15",
    "G": "ec9b5e40-0264-4647-950e-d50edf88cb65",
    "H": "f45f1401-2772-49ea-8e7c-3a31240d09aa",
    "I": "35b08ee0-c07f-4c65-9e6f-3c9e9f6b2b91",
    "J": "e8e9634d-7f81-429c-8e08-ada646adc353",
}
DOC2COL = {v: k for k, v in COL2DOC.items()}


def rd(path, header_start):
    lines = open(path, encoding="utf-8").read().splitlines()
    s = next(i for i, ln in enumerate(lines) if ln.startswith(header_start))
    return list(csv.DictReader(lines[s:]))


def norm(name):
    if not name:
        return ""
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c)).upper()
    s = re.sub(r"[^A-Z0-9 ]", " ", s)
    return " ".join(sorted(t for t in s.split() if len(t) > 1))


ceb = json.load(open(os.path.join(HERE, "ceb16_clean.json"), encoding="utf-8"))
finals = rd(os.path.join(HERE, "our_finals.csv"), "event_docid,")
rounds = rd(os.path.join(HERE, "rounds.csv"), "event_docid,")

# πόντοι CEB ανά (όνομα, στήλη)
ceb_pts = {}
for r in ceb:
    for col in "AEFGHIJ":
        ceb_pts[(norm(r["name"]), col)] = r["ev"].get(col)

# βαθύτερο στάδιο ανά παίκτη/event (με βάση τα ματς που παίχτηκαν)
deep = {}
played_matches = defaultdict(int)
for r in rounds:
    if int(r["played"]) == 0:
        continue
    key = (r["event_docid"], int(r["player_id"]))
    order = int(r["stage_order"])
    played_matches[key] += int(r["played"])
    ttl = r["stage_title"]
    if key not in deep or order > deep[key][0]:
        deep[key] = (order, ttl)

print("=== ΘΕΣΕΙΣ 33+ : ποια φάση -> τι πόντοι CEB ===")
by_event = defaultdict(lambda: defaultdict(Counter))
examples = defaultdict(list)
for r in finals:
    col = DOC2COL.get(r["event_docid"])
    pos = int(r["position"])
    if col is None or pos <= 32:
        continue
    pid = int(r["player_id"]) if r["player_id"] else None
    d = deep.get((r["event_docid"], pid))
    label = f"{d[0]}:{d[1]}" if d else "ΚΑΝΕΝΑ ΜΑΤΣ"
    if col == "A":
        label = f"{d[0]}:{d[1]}({played_matches.get((r['event_docid'], pid), 0)} ματς)" if d else label
    p = ceb_pts.get((norm(r["full_name"]), col))
    by_event[col][label][p] += 1
    if len(examples[(col, label)]) < 4:
        examples[(col, label)].append((pos, r["full_name"], r["country"], p))

for col in "AEFGHIJ":
    print(f"\n--- στήλη {col} ---")
    for label, cnt in sorted(by_event[col].items()):
        tot = sum(cnt.values())
        pts = ", ".join(f"{p}×{n}" for p, n in sorted(cnt.items(), key=lambda x: -x[1]))
        print(f"  {label:42s} {tot:4d} παίκτες -> {pts}")
        for pos, name, country, p in examples[(col, label)][:2]:
            print(f"        π.χ. θέση {pos:3d} {name[:28]:28s} {country} CEB={p}")
