# -*- coding: utf-8 -*-
"""Φάση 0 — ευθυγράμμιση της λίστας CEB 3C με την επίσημη v16.

ΑΡΧΗ: η λίστα βγαίνει από τα ΔΙΚΑ ΜΑΣ δεδομένα· το επίσημο PDF χρησιμεύει
μόνο για έλεγχο (τι λείπει, τι περισσεύει), όχι για να δανειστούμε τη σειρά.

Τι κάνει:
  1. αφαιρεί τις 7 διπλοεγγραφές που έχει ακόμη η λίστα μας (όλες με 0 πόντους),
  2. διορθώνει την ομοσπονδία του BOUCHAT Fabrice σε BE (όπως τη δίνει η CEB,
     το δικό μας δεδομένο ελέγχεται χωριστά),
  3. προσθέτει τις δύο γραμμές ποινής: OZEN Mohamed (I, -4) και CELIK Sabir (E, -4),
  4. ξανα-αριθμεί τις θέσεις με ΤΟΝ ΔΙΚΟ ΜΑΣ κανόνα: πόντοι, μετά το διάνυσμα των
     events από το νεότερο World Cup προς τα πίσω (J..A), και σε απόλυτη ισοβαθμία
     η θέση της προηγούμενης έκδοσης (ο κανόνας της CEB, 54/54 ομάδες).
  5. αφήνει στη λίστα τα 3 ονόματα που εκκρεμούν στη CEB (GOKSU Volkan,
     REFASSI Badreddine, REFASSI Abdelghani).
"""
import collections, datetime, json, os, re, shutil, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
DATA = os.path.join(REPO, "public", "data", "ceb-ranking")
LIVE = os.path.join(DATA, "3c-individual.json")
CLEAN = os.path.join(HERE, "ceb16_clean.json")
OFFICIAL = r"D:/tmp/ceb/ceb16_new.json"
TS = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
BACKUP = rf"D:/tmp/ceb/3c-individual.json.bak-{TS}"
COLS = list("ABCDEFGHIJ")

PENALTIES = [("OZEN Mohamed", "TR", "I", -4), ("CELIK Sabir", "TR", "E", -4)]
PENDING = {"GOKSU VOLKAN", "REFASSI BADREDDINE", "REFASSI ABDELGHANI"}
BOUCHAT_FED = "BE"


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip()).upper()


def toks(name: str) -> frozenset:
    """Ίδιας λογικής με το final_check3.py: ανεξάρτητο σειράς λέξεων και τόνων."""
    if not name:
        return frozenset()
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c)).upper()
    unicodedata_key = str.maketrans({"Ø": "O", "Đ": "D", "Ł": "L", "Æ": "AE", "Œ": "OE", "ß": "SS"})
    s = s.translate(unicodedata_key)
    s = re.sub(r"[^A-Z0-9 ]", " ", s)
    return frozenset(t for t in s.split() if len(t) > 1)


def tievec(ev: list) -> tuple:
    """Διάνυσμα από το νεότερο World Cup προς τα πίσω (J..A), χωρίς τις ποινές."""
    out = []
    for c in reversed(COLS):
        v = ev[COLS.index(c)] or 0
        out.append(v if v > 0 else 0)
    return tuple(out)


def sortkey(r: dict) -> tuple:
    """Ο κανόνας μας: πόντοι φθίνουσα, μετά το διάνυσμα των events φθίνουσα."""
    return (-(r["points"] or 0), tuple(-x for x in tievec(r["ev"])))


def now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def main() -> None:
    shutil.copy2(LIVE, BACKUP)
    print("αντίγραφο ασφαλείας:", BACKUP)

    payload = json.load(open(LIVE, encoding="utf-8"))
    rows = payload["rows"]
    print("πριν:", len(rows), "γραμμές |", sum(r["points"] or 0 for r in rows), "πόντοι")

    official = sorted(json.load(open(OFFICIAL, encoding="utf-8")), key=lambda r: r["rank"])
    print("επίσημη λίστα (για έλεγχο):", len(official), "γραμμές |",
          sum(r["Pnts"] or 0 for r in official), "πόντοι")

    off_rank = {}
    for r in official:
        off_rank.setdefault((toks(r["name"]), r["fed"]), r["rank"])

    # Θέσεις της ΠΡΟΗΓΟΥΜΕΝΗΣ έκδοσης (διαβάζονται πριν ξαναγραφτεί το clean JSON
    # στο βήμα 6). Είναι ο κανόνας της CEB για απόλυτη ισοβαθμία: 54/54 ομάδες.
    prev = json.load(open(CLEAN, encoding="utf-8"))
    prev = prev["rows"] if isinstance(prev, dict) and "rows" in prev else prev
    prev_rank = {}
    for r in prev:
        if isinstance(r, dict) and r.get("name"):
            prev_rank.setdefault((toks(r["name"]), r.get("fed")), r.get("rank"))

    # --- 1. διπλοεγγραφές ---
    # Κρατάμε τη γραμμή που δίνει η CEB για το ίδιο πρόσωπο (ίδια ομοσπονδία)·
    # αλλιώς την πρώτη. Η άλλη είναι διπλή εγγραφή του ίδιου αθλητή στα δεδομένα μας.
    byname = collections.defaultdict(list)
    for r in rows:
        byname[norm(r["name"])].append(r)
    keep, dropped = [], []
    for nm, group in byname.items():
        if len(group) == 1:
            keep.append(group[0])
            continue
        pick = None
        for r in sorted(group, key=lambda r: r["rank"]):
            if (toks(r["name"]), r["fed"]) in off_rank:
                pick = r
                break
        pick = pick or sorted(group, key=lambda r: r["rank"])[0]
        keep.append(pick)
        dropped += [r for r in group if r is not pick]
    for r in sorted(dropped, key=lambda r: r["rank"]):
        print(f"  διπλοεγγραφή που φεύγει: #{r['rank']} {r['name']} ({r['fed']}) {r['points']} πόντοι")

    # --- 2. BOUCHAT -> BE ---
    for r in keep:
        if norm(r["name"]) == "BOUCHAT FABRICE" and r["fed"] != BOUCHAT_FED:
            print(f"  BOUCHAT Fabrice: {r['fed']} -> {BOUCHAT_FED}")
            r["fed"] = BOUCHAT_FED

    # --- 3. γραμμές ποινής ---
    names = {norm(r["name"]) for r in keep}
    for nm, fed, col, pts in PENALTIES:
        if norm(nm) in names:
            print("  υπάρχει ήδη:", nm)
            continue
        ev = [None] * 10
        ev[COLS.index(col)] = pts
        keep.append({"rank": None, "name": nm, "fed": fed, "points": pts, "ev": ev, "suspended": None})
        print(f"  νέα γραμμή ποινής: {nm} ({fed}) {pts} στη στήλη {col}")

    # --- 4. σειρά με τον δικό μας κανόνα ---
    # Πρωτεύει ο κανόνας μας (πόντοι, μετά το διάνυσμα των events από το νεότερο
    # World Cup προς τα πίσω). Σε απόλυτη ισοβαθμία εφαρμόζουμε τον κανόνα της CEB:
    # τη θέση της προηγούμενης έκδοσης (54/54 ομάδες). Ό,τι μένει αδιευκρίνιστο
    # κρατά τη σειρά της επίσημης έκδοσης — δεν επινοούμε δική μας σειρά.
    final = sorted(keep, key=lambda r: (sortkey(r),
                                        prev_rank.get((toks(r["name"]), r["fed"]), 10 ** 6),
                                        off_rank.get((toks(r["name"]), r["fed"]), 10 ** 6)))
    for i, r in enumerate(final, 1):
        r["rank"] = i
    for r in final:
        if norm(r["name"]) in PENDING:
            print(f"  εκκρεμεί στη CEB: {r['name']} ({r['fed']}) {r['points']} -> θέση {r['rank']}")

    # --- 5. γράψιμο ---
    payload["rows"] = final
    payload["generatedAt"] = now_iso()
    payload["counts"] = {
        "players": len(final),
        "federations": len({r["fed"] for r in final}),
        "suspended": sum(1 for r in final if r.get("suspended")),
    }
    json.dump(payload, open(LIVE, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

    arch_dir = os.path.join(DATA, "archive", "3c-individual")
    snap = dict(payload)
    snap["editionKey"] = "16-2026"
    snap["archivedAt"] = payload["generatedAt"]
    json.dump(snap, open(os.path.join(arch_dir, "16-2026.json"), "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))
    aidx = json.load(open(os.path.join(arch_dir, "index.json"), encoding="utf-8"))
    for e in aidx["editions"]:
        if e.get("key") == "16-2026":
            e.update({"players": payload["counts"]["players"], "federations": payload["counts"]["federations"],
                      "suspended": payload["counts"]["suspended"], "archivedAt": snap["archivedAt"]})
    aidx["generatedAt"] = payload["generatedAt"]
    json.dump(aidx, open(os.path.join(arch_dir, "index.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    tidx_path = os.path.join(DATA, "index.json")
    tidx = json.load(open(tidx_path, encoding="utf-8"))
    for a in tidx["available"]:
        if a.get("slug") == payload["slug"]:
            a.update({"players": payload["counts"]["players"], "federations": payload["counts"]["federations"],
                      "suspended": payload["counts"]["suspended"]})
    tidx["generatedAt"] = payload["generatedAt"]
    json.dump(tidx, open(tidx_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    # --- 6. το clean JSON να συμφωνεί, ώστε το pipeline να μην ξαναγυρίσει τα παλιά ---
    clean = []
    for r in final:
        dates = []
        if r.get("suspended"):
            y, m, d = r["suspended"].split("-")
            dates = [f"{int(d)}.{int(m)}.{y}"]
        clean.append({"page": None, "rank": r["rank"], "name": r["name"], "fed": r["fed"],
                      "Pnts": r["points"], "PP": None,
                      "ev": {c: r["ev"][COLS.index(c)] for c in COLS if r["ev"][COLS.index(c)] is not None},
                      "dates": dates})
    json.dump(clean, open(CLEAN, "w", encoding="utf-8"), ensure_ascii=False)

    # --- 7. έλεγχος ---
    print("\nμετά:", len(final), "γραμμές |", sum(r["points"] or 0 for r in final), "πόντοι",
          "| ομοσπονδίες:", payload["counts"]["federations"], "| τιμωρημένοι:", payload["counts"]["suspended"])
    ours_key = {}
    for r in final:
        ours_key.setdefault((toks(r["name"]), r["fed"]), r)
    off_key = {}
    for r in official:
        off_key.setdefault((toks(r["name"]), r["fed"]), r)
    only_ours = [r for k, r in ours_key.items() if k not in off_key]
    only_off = [k for k in off_key if k not in ours_key]
    print("μόνο σε εμάς:", [(r["rank"], r["name"], r["fed"], r["points"]) for r in only_ours])
    print("μόνο στο επίσημο:", len(only_off), sorted(" ".join(sorted(k[0])) for k in only_off)[:12])
    diff = [(ours_key[k]["rank"], ours_key[k]["name"], ours_key[k]["points"], off_key[k]["Pnts"])
            for k in ours_key.keys() & off_key.keys()
            if (ours_key[k]["points"] or 0) != (off_key[k]["Pnts"] or 0)]
    print("διαφορές πόντων:", diff if diff else "καμία")

    our_seq = [(toks(r["name"]), r["fed"]) for r in final]
    off_seq = [(toks(r["name"]), r["fed"]) for r in official]
    ours_set, off_set = set(our_seq), set(off_seq)
    a = [k for k in our_seq if k in off_set]
    b = [k for k in off_seq if k in ours_set]
    mism = [(i, x, y) for i, (x, y) in enumerate(zip(a, b)) if x != y]
    print("διαφορές σειράς θέσεων (κοινές εγγραφές):", len(mism))
    for i, x, y in mism[:8]:
        print(f"   θέση ~{i + 1}: εμείς {' '.join(sorted(x[0]))} {x[1]} / επίσημο {' '.join(sorted(y[0]))} {y[1]}")
    groups = collections.Counter((r["points"] or 0) for r in final)
    print("ομάδες πόντων >1 αθλητή:", dict(sorted(groups.items(), reverse=True)[:6]))
    print("τελευταίες 4 γραμμές:", [(r["rank"], r["name"], r["points"]) for r in final[-4:]])
    print("ceb16_clean.json ενημερώθηκε (", len(clean), "γραμμές )")


if __name__ == "__main__":
    main()
