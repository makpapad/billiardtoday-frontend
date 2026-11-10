# -*- coding: utf-8 -*-
"""Διορθώσεις ΚΑΡΤΕΛΩΝ ΠΑΙΚΤΩΝ στο production (Strapi) — με ξηρή λειτουργία (dry-run).

ΠΡΟΕΠΙΛΟΓΗ = ΔΟΚΙΜΗ. Δεν γράφει τίποτα χωρίς `--apply`.

Τι κάνει
--------
1. Διορθώνει πεδία καρτέλας:  PUT  /api/bt-players/<documentId>  {"data": {...}}
2. Συγχωνεύει διπλές καρτέλες: POST /api/bt-players/merge          {"source","target","hardDelete"}
   ΠΡΟΣΟΧΗ: το merge ΜΕΤΑΚΙΝΕΙ τις σχέσεις (αποτελέσματα/συμμετοχές) source->target και
   μετά διαγράφει (hardDelete) ή απενεργοποιεί (active:false) το source. ΔΕΝ αντιγράφει
   πεδία (country / umb_id). Γι' αυτό, ό,τι πεδίο κρατάμε (π.χ. UMB ID) γράφεται ΠΡΩΤΑ στο
   target με PUT — αυτό το κάνει αυτόματα το script (βλ. `copy_from_source`).

Token
-----
Διαβάζεται από STRAPI_API_TOKEN (env) ή από την πρώτη γραμμή του
D:\\Projects\\2-billiardtoday-admin\\.env.local. Δεν τυπώνεται ποτέ.
Χρειάζεται token με ΔΙΚΑΙΩΜΑ ΕΓΓΡΑΦΗΣ (update/delete) στο content-type bt-player.
Τα σημερινά token είναι ΛΗΓΜΕΝΑ (401) — δες το README/report.

Χρήση
-----
    python fix_production_players.py                 # ΔΟΚΙΜΗ: δείχνει τι θα άλλαζε
    python fix_production_players.py --check-token   # μόνο έλεγχος του token (401?)
    python fix_production_players.py --apply         # ΕΚΤΕΛΕΙ τις αλλαγές (με έγκριση χρήστη)
"""
from __future__ import annotations

import argparse
import collections
import json
import os
import re
import sys
import unicodedata
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
API = "https://app.billiardtoday.com/api"
ENV_LOCAL = r"D:\Projects\2-billiardtoday-admin\.env.local"
SCAN = os.path.join(HERE, "data", "player-scan.json")
UMB = os.path.join(HERE, "data", "umb-ids.json")

# ---------------------------------------------------------------------------
# 1) ΔΙΟΡΘΩΣΕΙΣ ΠΕΔΙΩΝ (PUT)   — πηγή τιμών: docs/ai/umb-player-ids/data/umb-ids.json
# ---------------------------------------------------------------------------
# Βρέθηκε από τον έλεγχο των καρτελών (fix_players.py --scan, 07/10/2026).
CARD_UPDATES = [
    {
        "name": "BOUCHAT Fabrice",
        "documentId": "m54kz0j093le3tqykzwkxc4k",   # από player-scan.json
        "set": {"country": "BE", "umb_id": "3635"},  # BE + UMB 3635 — πηγή: umb-ids.json (UMB)
        "why": "χώρα FR->BE και κενό UMB ID -> 3635",
    },
    {
        # Η καρτέλα είναι ΗΔΗ NL — την κρατάμε εδώ για να είναι το script ρητό/idempotent.
        "name": "GROOT Raymon",
        "documentId": "cee55730-23e6-42c3-8259-3f1cdcc5de66",
        "set": {"country": "NL"},                    # σωστή τιμή κατά την κατάταξη CEB μας
        "why": "βεβαιώνει NL (το 'US' υπάρχει μόνο στο ιστορικό dump lier9.json)",
    },
]

# ---------------------------------------------------------------------------
# 2) ΔΙΠΛΕΣ ΚΑΡΤΕΛΕΣ (merge) — υποψήφιες, από player-scan.json (07/10/2026)
# ---------------------------------------------------------------------------
# source = φεύγει, target = μένει. Ό,τι πεδίο έχει το source και λείπει από το target
# (κατά σειρά: umb_id, country) αντιγράφεται στο target ΠΡΙΝ το merge.
MERGE_CANDIDATES = [
    {"label": "KIM Bo Mi",
     "source": "8cd60682-479c-4a19-a7f5-1c851ea60b27",   # KIM Bo Mi (χωρίς χώρα)
     "target": "be2b5de1-42f7-4610-bcae-c9857a92dd88"},   # KIM Bo Mi 2 (KR)
    {"label": "ANDERSEN Thomas",
     "source": "68526e8d-1e52-4e34-bb72-46a7f2541df0",   # ANDERSEN Thomas K (χωρίς χώρα)
     "target": "tncisa5ocsfuqyukwid3tkii"},               # ANDERSEN Thomas (DK)
    {"label": "NARANJO Andres",
     "source": "4ce05fa2-8bb7-472d-9db0-c83665fef7fd",   # NARANJO Andres F (χωρίς UMB)
     "target": "608644e6-cc85-4ce7-8f71-eaf7099872e0"},   # NARANJO Andres (CO, UMB 0539)
    {"label": "BJORNSTAD Jo",
     "source": "7a580d40-3fa7-4b7a-959c-b806aec2e289",   # BJÖRNSTAD Jo (χωρίς χώρα)
     "target": "df093f7e-38c7-47ea-9e49-792544364a69"},   # BJØRNSTAD Jo (NO)
]

COPY_FIELDS = ("umb_id", "country")


def token() -> str:
    t = (os.environ.get("STRAPI_API_TOKEN") or "").strip().strip('"').strip("'")
    if t:
        return t
    if os.path.exists(ENV_LOCAL):
        for line in open(ENV_LOCAL, encoding="utf-8-sig").read().splitlines():
            if line.strip().startswith("STRAPI_API_TOKEN="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def call(path: str, method: str = "GET", body: dict | None = None, tok: str = ""):
    hdr = {"Content-Type": "application/json"}
    if tok:
        hdr["Authorization"] = f"Bearer {tok}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, method=method, headers=hdr, data=data)
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


def all_players() -> list:
    """Δημόσια ανάγνωση όλων των καρτελών (χωρίς token)."""
    out, page = [], 1
    while True:
        d = call(f"/bt-players?pagination%5BpageSize%5D=1000&pagination%5Bpage%5D={page}")
        out += d["data"]
        if page >= d["meta"]["pagination"]["pageCount"]:
            return out
        page += 1


def key(name: str) -> str:
    if not name:
        return ""
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c)).upper()
    s = s.translate(str.maketrans({"Ø": "O", "Đ": "D", "Ł": "L", "Æ": "AE", "Œ": "OE", "ß": "SS"}))
    s = re.sub(r"[^A-Z0-9 ]", " ", s)
    return " ".join(sorted(t for t in s.split() if len(t) > 1))


def short(c: dict) -> dict:
    return {k: c.get(k) for k in ("id", "documentId", "full_name", "country", "umb_id", "active")}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="χωρίς αυτό: ΔΟΚΙΜΗ (dry-run)")
    ap.add_argument("--check-token", action="store_true", help="έλεγχος αν το token έχει δικαίωμα εγγραφής")
    ap.add_argument("--hard-delete", action="store_true", help="στα merge: οριστική διαγραφή αντί απενεργοποίησης")
    args = ap.parse_args()

    tok = token()
    print(f"token από: {'env/STRAPI_API_TOKEN' if os.environ.get('STRAPI_API_TOKEN') else ENV_LOCAL} · "
          f"παρόν: {bool(tok)} · μήκος: {len(tok)}")

    if args.check_token:
        try:
            call("/bt-players?pagination%5BpageSize%5D=1", "GET", None, tok)
            print("✓ το token διαβάζει με auth (200)")
        except urllib.error.HTTPError as e:
            print(f"✗ auth read -> HTTP {e.code}")
        return 0

    # --- τρέχουσα κατάσταση από το production (δημόσια ανάγνωση) ---
    players = all_players()
    by_doc = {p.get("documentId"): p for p in players}
    print(f"καρτέλες στο production: {len(players)}")

    mode = "ΕΚΤΕΛΕΣΗ (--apply)" if args.apply else "ΔΟΚΙΜΗ (dry-run)"
    print(f"\n===== {mode} =====\n")

    # ---------- Α. Διορθώσεις πεδίων ----------
    print("Α) ΔΙΟΡΘΩΣΕΙΣ ΠΕΔΙΩΝ (PUT /bt-players/<documentId>)")
    planned_puts = []
    for u in CARD_UPDATES:
        cur = by_doc.get(u["documentId"])
        if not cur:
            print(f"  ! {u['name']}: ΔΕΝ βρέθηκε documentId {u['documentId']} στο production")
            continue
        changes = {k: v for k, v in u["set"].items() if cur.get(k) != v}
        if not changes:
            print(f"  = {u['name']}: ήδη σωστό ({u['set']}) — καμία αλλαγή")
            continue
        print(f"  > {u['name']} ({u['documentId'][:8]}): {u['why']}")
        print(f"      πριν : country={cur.get('country')!r} umb_id={cur.get('umb_id')!r}")
        print(f"      μετά : {changes}")
        planned_puts.append((u["documentId"], changes))

    # ---------- Β. Συγχώνευση διπλών καρτελών ----------
    print("\nΒ) ΣΥΓΧΩΝΕΥΣΗ ΔΙΠΛΩΝ ΚΑΡΤΕΛΩΝ (POST /bt-players/merge)")
    planned_merges = []
    for m in MERGE_CANDIDATES:
        s, t = by_doc.get(m["source"]), by_doc.get(m["target"])
        if not s or not t:
            print(f"  ! {m['label']}: λείπει source ή target στο production — παραλείπεται")
            continue
        pre = {}
        for f in COPY_FIELDS:                      # κρατάμε UMB ID/χώρα στο target
            if s.get(f) and not t.get(f):
                pre[f] = s[f]
        print(f"  > {m['label']}")
        print(f"      κρατάμε (target): {short(t)}")
        print(f"      φεύγει (source): {short(s)}")
        if pre:
            print(f"      πρώτα PUT στο target: {pre}  (αντιγραφή πεδίων που κρατάμε)")
        print(f"      merge: POST /bt-players/merge  source={m['source']}  target={m['target']}  "
              f"hardDelete={bool(args.hard_delete)}")
        planned_merges.append((m, pre))

    if not args.apply:
        print("\n(ΔΟΚΙΜΗ — δεν στάλθηκε κανένα αίτημα. Βάλε --apply για εκτέλεση με έγκριση.)")
        return 0

    # ---------- ΕΚΤΕΛΕΣΗ ----------
    if not tok:
        sys.exit("✗ χρειάζεται token με δικαίωμα εγγραφής για --apply")
    ok, fail = 0, []
    for doc, changes in planned_puts:
        try:
            call(f"/bt-players/{doc}", "PUT", {"data": changes}, tok)
            ok += 1
            print(f"  ✓ PUT {doc[:8]} {changes}")
        except urllib.error.HTTPError as e:
            fail.append((doc, changes, e.code, e.read().decode("utf-8", "replace")[:150]))
            print(f"  ✗ PUT {doc[:8]} -> {e.code}")
            if e.code in (401, 403):
                sys.exit("  το token δεν έχει δικαίωμα εγγραφής — σταματώ")
    for m, pre in planned_merges:
        try:
            if pre:
                call(f"/bt-players/{m['target']}", "PUT", {"data": pre}, tok)
            call("/bt-players/merge", "POST",
                 {"source": m["source"], "target": m["target"], "hardDelete": bool(args.hard_delete)}, tok)
            ok += 1
            print(f"  ✓ merge {m['label']}")
        except urllib.error.HTTPError as e:
            fail.append((m["label"], "merge", e.code, e.read().decode("utf-8", "replace")[:150]))
            print(f"  ✗ merge {m['label']} -> {e.code}")
    print(f"\nσύνολο: ✓ {ok} · ✗ {len(fail)}")
    for f in fail:
        print("   ", f)
    return 0


if __name__ == "__main__":
    sys.exit(main())
