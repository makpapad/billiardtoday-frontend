# -*- coding: utf-8 -*-
"""Έλεγχος και διόρθωση των δικών μας δεδομένων παικτών (bt-players, Strapi).

  python fix_players.py --scan                # read-only: καρτέλες-στόχοι + διπλές καρτέλες
  python fix_players.py --scan --name GROOT   # μόνο ένα επώνυμο

Το token διαβάζεται από την πρώτη γραμμή του 2-billiardtoday-admin/.env.local
(STRAPI_API_TOKEN). Δεν τυπώνεται ποτέ.
"""
from __future__ import annotations

import argparse
import collections
import json
import os
import re
import sys
import unicodedata
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
API = "https://app.billiardtoday.com/api"
ENV_LOCAL = r"D:\Projects\2-billiardtoday-admin\.env.local"
OUT = os.path.join(HERE, "data", "player-scan.json")
STOP = {"DE", "VAN", "DER", "LA", "LE", "EL", "DI", "DA", "VON", "DEN"}


def token() -> str:
    t = (os.environ.get("STRAPI_API_TOKEN") or "").strip().strip('"').strip("'")
    if t:
        return t
    for path in (ENV_LOCAL, r"D:\Projects\4-billiardtoday-frontend\.env.local"):
        if os.path.exists(path):
            for line in open(path, encoding="utf-8-sig").read().splitlines():
                if line.strip().startswith("STRAPI_API_TOKEN="):
                    v = line.split("=", 1)[1].strip().strip('"').strip("'")
                    if v:
                        return v
    return ""  # οι αναγνώσεις είναι δημόσιες· το κενό token δεν εμποδίζει το scan


def call(path: str, tok: str):
    hdr = {"Authorization": f"Bearer {tok}"} if tok else {}
    req = urllib.request.Request(API + path, headers=hdr)
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


def key(name: str) -> str:
    if not name:
        return ""
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c)).upper()
    s = s.translate(str.maketrans({"Ø": "O", "Đ": "D", "Ł": "L", "Æ": "AE", "Œ": "OE", "ß": "SS"}))
    s = re.sub(r"[^A-Z0-9 ]", " ", s)
    return " ".join(sorted(t for t in s.split() if len(t) > 1))


def all_players(tok: str) -> list:
    out, page = [], 1
    while True:
        d = call(f"/bt-players?pagination%5BpageSize%5D=1000&pagination%5Bpage%5D={page}", tok)
        out += d["data"]
        if page >= d["meta"]["pagination"]["pageCount"]:
            return out
        page += 1


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--scan", action="store_true")
    ap.add_argument("--name", help="φίλτρο επωνύμου")
    args = ap.parse_args()
    tok = token()

    players = all_players("")  # οι αναγνώσεις των bt-players είναι δημόσιες
    print(f"καρτέλες παικτών: {len(players)}")
    if not players:
        return 0
    attrs = {k: v for k, v in players[0].items() if k != "documentId"}
    print("πεδία καρτέλας:", ", ".join(sorted(attrs.keys())))

    def show(p):
        a = p
        return {k: a.get(k) for k in ("documentId", "full_name", "first_name", "last_name",
                                      "country", "umb_id", "date_of_birth", "slug") if k in a}

    want = ["BOUCHAT", "GROOT", "HENDRIKSEN"]
    if args.name:
        want = [args.name.upper()]
    print("\n=== καρτέλες-στόχοι ===")
    for w in want:
        for p in players:
            blob = (str(p.get("full_name") or "") + " " + str(p.get("last_name") or "")).upper()
            if w in blob:
                print(" ", show(p))

    groups = collections.defaultdict(list)
    for p in players:
        nm = p.get("full_name") or f"{p.get('first_name') or ''} {p.get('last_name') or ''}".strip()
        k = key(str(nm))
        if k:
            groups[k].append(p)
    dups = {k: v for k, v in groups.items() if len(v) > 1}
    print(f"\n=== διπλές καρτέλες: {len(dups)} ονόματα ===")
    for k, v in sorted(dups.items())[:40]:
        names = " | ".join(f"{p.get('full_name')}({p.get('country')},{p.get('umb_id') or '-'})" for p in v)
        print(f"  {k:32s} -> {names}")
    json.dump({"players": [show(p) for p in players], "dups": {k: [show(p) for p in v] for k, v in dups.items()}},
              open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"\n-> {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
