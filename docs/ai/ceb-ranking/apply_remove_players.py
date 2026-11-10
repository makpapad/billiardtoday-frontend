# -*- coding: utf-8 -*-
"""Αφαίρεση αθλητών από τη λίστα CEB 3C (ζωντανό + αρχείο + clean + indexes).

ΕΙΝΑΙ ΕΤΟΙΜΟ ΑΛΛΑ ΔΕΝ ΕΚΤΕΛΕΙΤΑΙ: προεπιλογή = ΔΟΚΙΜΗ. Θέλει `--apply`.

Πότε χρειάζεται: απόφαση CEB (μόλις ήρθε) ότι ο REFASSI Badreddine (FR) άλλαξε
εθνικότητα μετά το Porto World Cup και ακυρώθηκε — βγαίνει από τη λίστα. Εκκρεμεί
απάντηση και για GOKSU Volkan + REFASSI Abdelghani.

Χρήση:
    python apply_remove_players.py                                  # ΔΟΚΙΜΗ (μόνο Badreddine)
    python apply_remove_players.py --also "GOKSU Volkan,REFASSI Abdelghani"   # ΔΟΚΙΜΗ με τους 3
    python apply_remove_players.py --also "..." --apply             # εκτέλεση (με έγκριση)
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import shutil
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
DATA = os.path.join(REPO, "public", "data", "ceb-ranking")
LIVE = os.path.join(DATA, "3c-individual.json")
ARCH = os.path.join(DATA, "archive", "3c-individual", "16-2026.json")
AIDX = os.path.join(DATA, "archive", "3c-individual", "index.json")
TIDX = os.path.join(DATA, "index.json")
CLEAN = os.path.join(HERE, "ceb16_clean.json")
COLS = list("ABCDEFGHIJ")
DEFAULT_REMOVE = ["REFASSI Badreddine"]


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    return " ".join(s.upper().split())


def now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def totals(rows) -> tuple[int, int]:
    return len(rows), sum(r.get("points", 0) or 0 for r in rows)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--also", default="", help="επιπλέον ονόματα χωρισμένα με κόμμα")
    ap.add_argument("--apply", action="store_true", help="χωρίς αυτό: ΔΟΚΙΜΗ")
    args = ap.parse_args()

    remove = {norm(n) for n in DEFAULT_REMOVE}
    if args.also:
        remove |= {norm(n) for n in args.also.split(",") if n.strip()}

    payload = json.load(open(LIVE, encoding="utf-8"))
    rows = payload["rows"]
    print(f"πριν : {len(rows)} γραμμές | {sum(r.get('points', 0) or 0 for r in rows)} πόντοι")
    print("θα αφαιρεθούν:")
    kept, gone = [], []
    for r in rows:
        (gone if norm(r["name"]) in remove else kept).append(r)
    for r in gone:
        print(f"  - #{r['rank']} {r['name']} ({r['fed']}) {r['points']} πόντοι")
    if not gone:
        print("  (κανείς — δεν ταιριάζει κανένα όνομα)")
    for i, r in enumerate(kept, 1):
        r["rank"] = i
    print(f"μετά : {len(kept)} γραμμές | {sum(r.get('points', 0) or 0 for r in kept)} πόντοι "
          f"(μεταβολή: {len(kept) - len(rows):+d} γραμμές, "
          f"{sum(r.get('points', 0) or 0 for r in kept) - sum(r.get('points', 0) or 0 for r in rows):+d} πόντοι)")

    if not args.apply:
        print("\n(ΔΟΚΙΜΗ — δεν γράφτηκε τίποτα. Βάλε --apply με έγκριση χρήστη.)")
        return 0

    os.makedirs(r"D:/tmp/ceb", exist_ok=True)
    ts = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    for src in (LIVE, ARCH, CLEAN):
        if os.path.exists(src):
            shutil.copy2(src, rf"D:/tmp/ceb/{os.path.basename(src)}.bak-{ts}")

    payload["rows"] = kept
    payload["generatedAt"] = now_iso()
    counts = {
        "players": len(kept),
        "federations": len({r["fed"] for r in kept if r.get("fed")}),
        "suspended": sum(1 for r in kept if r.get("suspended")),
    }
    payload["counts"] = counts
    json.dump(payload, open(LIVE, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    snap = dict(payload, editionKey="16-2026", archivedAt=payload["generatedAt"])
    json.dump(snap, open(ARCH, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

    clean = [{"page": None, "rank": r["rank"], "name": r["name"], "fed": r["fed"],
              "Pnts": r["points"], "PP": None,
              "ev": {c: r["ev"][COLS.index(c)] for c in COLS if r["ev"][COLS.index(c)] is not None},
              "dates": [r["suspended"]] if r.get("suspended") else []} for r in kept]
    json.dump(clean, open(CLEAN, "w", encoding="utf-8"), ensure_ascii=False)

    for path, keypath in ((AIDX, "editions"), (TIDX, "available")):
        idx = json.load(open(path, encoding="utf-8"))
        for e in idx.get(keypath, []):
            if e.get("key") == "16-2026" or e.get("slug") == payload["slug"]:
                e.update(counts)
        idx["generatedAt"] = payload["generatedAt"]
        json.dump(idx, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    print(f"\n✓ γράφτηκαν: {os.path.basename(LIVE)}, archive/16-2026.json, ceb16_clean.json, indexes")
    print(f"  αντίγραφα ασφαλείας στο D:/tmp/ceb/ (bak-{ts})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
