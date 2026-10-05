"""Έλεγχος: βγαίνει η κατάταξη CEB από τα δικά μας αποτελέσματα;

Για κάθε γραμμή του επίσημου PDF (1482):
  - βρίσκουμε τον παίκτη μας (από player-links.json: rank -> id)
  - διαβάζουμε τη θέση του σε κάθε ένα από τα 7 τουρνουά (A, E-J) από bt_results_final
  - μετατρέπουμε θέση -> πόντους με τον επίσημο πίνακα
  - συγκρίνουμε με τους πόντους που του έδωσε η CEB στο PDF
"""
import csv, json, os, re, unicodedata
from collections import defaultdict, Counter

HERE = os.path.dirname(os.path.abspath(__file__))
CEB_JSON = os.path.join(HERE, "ceb16_clean.json")
OURS_CSV = os.path.join(HERE, "our_finals.csv")
LINKS = os.path.join(HERE, "player-links.json")

DOC2COL = {
    "2c8d4cc9-cbb6-480f-98a6-01e73a8d4c9e": ("A", "ec"),
    "4878d859-934a-4bfe-8edf-4e0fb57999b4": ("E", "wc"),
    "d6676863-ced3-49e0-adb1-5bd9850c2e15": ("F", "wc"),
    "ec9b5e40-0264-4647-950e-d50edf88cb65": ("G", "wc"),
    "f45f1401-2772-49ea-8e7c-3a31240d09aa": ("H", "wc"),
    "35b08ee0-c07f-4c65-9e6f-3c9e9f6b2b91": ("I", "wc"),
    "e8e9634d-7f81-429c-8e08-ada646adc353": ("J", "wc"),
}
CEB_TABLE = {
    "ec": [(1, 1, 80), (2, 2, 54), (3, 4, 38), (5, 8, 26), (9, 16, 16), (17, 32, 8), (33, 9999, 4)],
    "wc": [(1, 1, 40), (2, 2, 27), (3, 4, 19), (5, 8, 13), (9, 16, 8), (17, 32, 4), (33, 9999, 2)],
}


def ceb_points(position, kind):
    for lo, hi, pts in CEB_TABLE[kind]:
        if lo <= position <= hi:
            return pts
    return 0


def norm(name):
    if not name:
        return ""
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c)).upper()
    s = re.sub(r"[^A-Z0-9 ]", " ", s)
    return " ".join(sorted(t for t in s.split() if len(t) > 1))


def load_ours():
    with open(OURS_CSV, encoding="utf-8") as fh:
        lines = fh.read().splitlines()
    start = next(i for i, ln in enumerate(lines) if ln.startswith("event_docid,"))
    rows = list(csv.DictReader(lines[start:]))
    by_id = defaultdict(dict)      # player_id -> {col: position}
    by_name = {}                   # norm(name) -> {col: position}
    name_of_id = {}                # player_id -> norm(name)
    for r in rows:
        col, kind = DOC2COL[r["event_docid"]]
        pos = int(r["position"])
        if r["player_id"]:
            pid = int(r["player_id"])
            by_id[pid][col] = pos
            name_of_id.setdefault(pid, norm(r["full_name"] or r["full_name_en"]))
        for key in {norm(r["full_name"]), norm(r["full_name_en"])}:
            if key:
                by_name.setdefault(key, {})[col] = pos
    # χώρα ανά όνομα (για να ξεχωρίζουμε συνώνυμα)
    country_of_name = {}
    for r in rows:
        for key in {norm(r["full_name"]), norm(r["full_name_en"])}:
            if key and r["country"]:
                country_of_name[key] = r["country"].strip().upper()
    return by_id, by_name, name_of_id, country_of_name


def main():
    ceb = json.load(open(CEB_JSON, encoding="utf-8"))
    links = json.load(open(LINKS, encoding="utf-8"))
    by_id, by_name, name_of_id, country_of_name = load_ours()
    cols = ["A", "E", "F", "G", "H", "I", "J"]

    stats = Counter()
    mismatches = []
    rows_compared = 0
    sum_ours = 0
    sum_ceb = 0

    for r in ceb:
        rank = str(r["rank"])
        link = links.get(rank)
        fed = (r["fed"] or "").strip().upper()
        key = norm(r["name"])
        positions = None
        how = None

        # 1) ταίριασμα με όνομα (και χώρα) — το πιο αξιόπιστο
        if key in by_name and (not fed or country_of_name.get(key, fed) == fed):
            positions = by_name[key]
            how = "name"
        elif key in by_name:
            positions = by_name[key]
            how = "name-fed"
        # 2) αλλιώς το link του player-links.json
        elif link:
            pid = int(link["id"])
            if pid in by_id:
                linked_name = name_of_id.get(pid, "")
                if not linked_name or key == linked_name or set(key.split()) & set(linked_name.split()):
                    positions = by_id[pid]
                    how = "link"
                else:
                    stats["link_mismatch"] += 1
        ceb_vals = {c: (r["ev"].get(c) or 0) for c in cols}
        ceb_total = sum(ceb_vals.values())

        if positions is None:
            if ceb_total > 0:
                stats["rows_with_points_no_data"] += 1
            stats["rows_no_data"] += 1
            continue

        rows_compared += 1
        stats[f"how_{how}"] += 1
        computed = {}
        for c in cols:
            pos = positions.get(c)
            kind = DOC2COL_KIND[c]
            computed[c] = ceb_points(pos, kind) if pos else 0
        comp_total = sum(computed.values())
        sum_ours += comp_total
        sum_ceb += ceb_total

        if comp_total == ceb_total:
            stats["total_ok"] += 1
        else:
            stats["total_bad"] += 1
            mismatches.append((r["rank"], r["name"], r["fed"], ceb_total, comp_total,
                               {c: (ceb_vals[c], computed[c]) for c in cols if ceb_vals[c] != computed[c]}))

    print("=== ΣΥΝΟΨΗ ===")
    print(f"  γραμμές PDF: {len(ceb)}")
    print(f"  συγκρίθηκαν: {rows_compared}  (χωρίς δικά μας δεδομένα: {stats['rows_no_data']}, "
          f"από αυτές με πόντους: {stats['rows_with_points_no_data']})")
    print(f"  ταίριασμα μέσω player-links: {stats['how_link']} · μέσω ονόματος: {stats['how_name'] + stats['how_link-name']}")
    print(f"  ΣΥΝΟΛΟ ΣΩΣΤΑ: {stats['total_ok']} · ΛΑΘΟΣ: {stats['total_bad']}")
    print(f"  άθροισμα πόντων (τα 7 τουρνουά): δικά μας {sum_ours} vs CEB {sum_ceb}")

    print("\n=== ΟΙ ΔΙΑΦΟΡΕΣ (όλες, max 40) ===")
    for rank, name, fed, ct, ot, diffs in mismatches[:40]:
        d = " ".join(f"{c}:CEB={a}/μας={b}" for c, (a, b) in diffs.items())
        print(f"  #{rank:4d} {name[:30]:30s} {fed:3s} σύνολο CEB={ct:4d} μας={ot:4d} | {d}")


DOC2COL_KIND = {v[0]: v[1] for v in DOC2COL.values()}

if __name__ == "__main__":
    main()
