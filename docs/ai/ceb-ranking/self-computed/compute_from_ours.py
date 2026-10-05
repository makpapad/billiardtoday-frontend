"""Υπολογισμός της κατάταξης CEB από τα ΔΙΚΑ ΜΑΣ αποτελέσματα.

Συγκρίνει, για κάθε ένα από τα 7 τουρνουά (A + E-J):
  - τη θέση κάθε παίκτη από τη βάση μας (bt_results_final.position)
  - τους πόντους που του έδωσε η CEB (στήλη του PDF)
και ελέγχει αν η αντιστοιχία θέση -> πόντοι είναι σταθερή (άρα υπολογίσιμη).

    python compute_from_ours.py
"""
import csv, glob, json, os, re, unicodedata
from collections import defaultdict, Counter

HERE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
CEB_JSON = os.path.join(HERE, "ceb16_clean.json")
OURS_CSV = os.path.join(HERE, "our_finals.csv")

# event_docid -> στήλη του PDF
DOC2COL = {
    "2c8d4cc9-cbb6-480f-98a6-01e73a8d4c9e": ("A", "EC Antalya 2026", "ec"),
    "4878d859-934a-4bfe-8edf-4e0fb57999b4": ("E", "WC Ankara 2025", "wc"),
    "d6676863-ced3-49e0-adb1-5bd9850c2e15": ("F", "WC Porto 2025", "wc"),
    "ec9b5e40-0264-4647-950e-d50edf88cb65": ("G", "WC Antwerp 2025", "wc"),
    "f45f1401-2772-49ea-8e7c-3a31240d09aa": ("H", "WC Ankara 2026", "wc"),
    "35b08ee0-c07f-4c65-9e6f-3c9e9f6b2b91": ("I", "WC Porto/Matosinhos 2026", "wc"),
    "e8e9634d-7f81-429c-8e08-ada646adc353": ("J", "WC Lier 2026", "wc"),
}

# Επίσημος πίνακας πόντων (πάνω μέρος του PDF, επιβεβαιωμένος)
CEB_TABLE = {
    "ec": [(1, 1, 80), (2, 2, 54), (3, 4, 38), (5, 8, 26), (9, 16, 16), (17, 32, 8), (33, 9999, 4)],
    "wc": [(1, 1, 40), (2, 2, 27), (3, 4, 19), (5, 8, 13), (9, 16, 8), (17, 32, 4), (33, 9999, 2)],
}


def ceb_points(position: int, kind: str):
    for lo, hi, pts in CEB_TABLE[kind]:
        if lo <= position <= hi:
            return pts
    return None


def norm(name: str) -> str:
    """Κανονικοποίηση ονόματος: κεφαλαία, χωρίς τόνους/σημεία, ταξινομημένα tokens."""
    if not name:
        return ""
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.upper()
    s = re.sub(r"[^A-Z0-9 ]", " ", s)
    tokens = [t for t in s.split() if len(t) > 1]
    return " ".join(sorted(tokens))


def main():
    ceb = json.load(open(CEB_JSON, encoding="utf-8"))
    print(f"CEB rows: {len(ceb)}")

    # ευρετήριο CEB: κανονικοποιημένο όνομα -> λίστα γραμμών
    by_name = defaultdict(list)
    for r in ceb:
        by_name[norm(r["name"])].append(r)
    # και ευρετήριο 'επώνυμο + αρχικό' για πιο χαλαρό ταίριασμα
    by_surname = defaultdict(list)
    for r in ceb:
        toks = norm(r["name"]).split()
        if toks:
            by_surname[(toks[-1], r["fed"])].append(r)

    with open(OURS_CSV, encoding="utf-8") as fh:
        lines = fh.read().splitlines()
    start = next(i for i, line in enumerate(lines) if line.startswith("event_docid,"))
    ours = list(csv.DictReader(lines[start:]))

    # (στήλη, θέση) -> Counter(CEB πόντοι)  -> για να μάθουμε τη κλίμακα
    scale_learn = defaultdict(Counter)
    per_event = defaultdict(lambda: {"matched": 0, "unmatched": [], "points_ok": 0, "points_bad": []})

    for row in ours:
        docid = row["event_docid"]
        if docid not in DOC2COL:
            continue
        col, label, kind = DOC2COL[docid]
        pos = int(row["position"])
        name = row["full_name"] or row["full_name_en"] or ""
        country = (row["country"] or "").strip()

        key = norm(name)
        hit = None
        for r in by_name.get(key, []):
            if r["fed"] == country or not country:
                hit = r
                break
        if hit is None:
            toks = key.split()
            if toks:
                for r in by_surname.get((toks[-1], country), []):
                    hit = r
                    break
        if hit is None:
            per_event[(col, label)]["unmatched"].append((pos, name, country))
            continue

        per_event[(col, label)]["matched"] += 1
        ceb_pts = hit["ev"].get(col)
        if ceb_pts is None:
            ceb_pts = 0
        scale_learn[(col, pos)][ceb_pts] += 1

        expected = ceb_points(pos, kind)
        if ceb_pts == expected:
            per_event[(col, label)]["points_ok"] += 1
        else:
            per_event[(col, label)]["points_bad"].append((pos, name, country, ceb_pts, expected))

    print("\n=== ΤΑΙΡΙΑΣΜΑ ΠΑΙΚΤΩΝ ===")
    for (col, label), d in sorted(per_event.items()):
        print(f"  {col} {label:28s} matched={d['matched']:4d}  unmatched={len(d['unmatched']):3d}  "
              f"points_ok={d['points_ok']:4d}  points_bad={len(d['points_bad']):3d}")

    print("\n=== ΠΑΡΑΤΗΡΟΥΜΕΝΗ ΚΛΙΜΑΚΑ (θέση -> πόντοι CEB) ===")
    for col in "AEFGHIJ":
        rows = [(pos, cnt) for (c, pos), cnt in scale_learn.items() if c == col]
        if not rows:
            continue
        rows.sort()
        summary = []
        for pos, cnt in rows:
            pts = ", ".join(f"{p}×{n}" for p, n in sorted(cnt.items(), key=lambda x: -x[1])[:3])
            summary.append(f"{pos}->{pts}")
        print(f"  στήλη {col}: " + " | ".join(summary[:40]))

    print("\n=== ΔΕΙΓΜΑΤΑ ΑΣΥΜΦΩΝΙΩΝ (πρώτες 25) ===")
    shown = 0
    for (col, label), d in sorted(per_event.items()):
        for pos, name, country, got, exp in d["points_bad"]:
            if shown >= 25:
                break
            print(f"  {col} {label:26s} θέση {pos:4d} {name[:32]:32s} {country:3s} CEB={got} (περιμέναμε {exp})")
            shown += 1

    print("\n=== ΔΕΙΓΜΑΤΑ ΧΩΡΙΣ ΑΝΤΙΣΤΟΙΧΙΑ (πρώτα 15) ===")
    shown = 0
    for (col, label), d in sorted(per_event.items()):
        for pos, name, country in d["unmatched"][:5]:
            print(f"  {col} {label:26s} θέση {pos:4d} {name[:34]:34s} {country}")
            shown += 1


if __name__ == "__main__":
    main()
