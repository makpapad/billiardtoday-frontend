# -*- coding: utf-8 -*-
"""Γράφει τα UMB IDs στους bt-players (Strapi). Χωρίς --apply δεν γράφει τίποτα.

Προϋπόθεση: το πεδίο `umb_id` να υπάρχει στο content-type (deploy του Strapi repo).

Χρήση:
  uv run --python 3.12 python apply_umb_ids.py                      # δοκιμή (dry-run)
  uv run --python 3.12 python apply_umb_ids.py --apply --limit 5    # γράψε 5 και σταμάτα
  uv run --python 3.12 python apply_umb_ids.py --apply              # γράψε όλα
  uv run --python 3.12 python apply_umb_ids.py --verify             # μέτρα πόσα είναι γραμμένα

Το token διαβάζεται από την πρώτη γραμμή του 2-billiardtoday-admin/.env.local (STRAPI_API_TOKEN)
ή από τη μεταβλητή STRAPI_API_TOKEN. Δεν τυπώνεται ποτέ.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
API = "https://app.billiardtoday.com/api"
FILL = os.path.join(HERE, "data", "match-fill.json")
REPORT = os.path.join(HERE, "data", "apply-report.json")
ENV_LOCAL = r"D:\Projects\2-billiardtoday-admin\.env.local"


def token() -> str:
    t = (os.environ.get("STRAPI_API_TOKEN") or "").strip().strip('"').strip("'")
    if t:
        return t
    if os.path.exists(ENV_LOCAL):
        raw = open(ENV_LOCAL, encoding="utf-8-sig").read().splitlines()
        for line in raw:
            if line.strip().startswith("STRAPI_API_TOKEN="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("✗ δεν βρέθηκε STRAPI_API_TOKEN (ούτε στο περιβάλλον ούτε στο .env.local του admin)")


def call(path: str, tok: str, method: str = "GET", body: dict | None = None):
    req = urllib.request.Request(API + path, method=method,
                                 headers={"Authorization": f"Bearer {tok}",
                                          "Content-Type": "application/json"})
    data = json.dumps(body).encode() if body is not None else None
    with urllib.request.urlopen(req, data=data, timeout=60) as r:
        return json.load(r)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="χωρίς αυτό: dry-run")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--verify", action="store_true", help="μέτρα πόσοι παίκτες έχουν ήδη umb_id")
    ap.add_argument("--sleep", type=float, default=0.05, help="παύση ανά εγγραφή (δευτ.)")
    args = ap.parse_args()
    tok = token()

    if args.verify:
        have = total = 0
        page = 1
        while True:
            d = call(f"/bt-players?fields%5B0%5D=umb_id&pagination%5BpageSize%5D=1000&pagination%5Bpage%5D={page}", tok)
            for p in d["data"]:
                total += 1
                if p.get("umb_id"):
                    have += 1
            if page >= d["meta"]["pagination"]["pageCount"]:
                break
            page += 1
        print(f"παίκτες: {total} · με UMB ID: {have}")
        return 0

    rows = json.load(open(FILL, encoding="utf-8"))
    if args.limit:
        rows = rows[: args.limit]
    print(f"{'ΓΡΑΦΗ' if args.apply else 'ΔΟΚΙΜΗ'}: {len(rows)} παίκτες -> {API}/bt-players/<documentId>")
    ok, fail = 0, []
    for i, r in enumerate(rows, 1):
        if not r.get("documentId"):
            fail.append({"our_name": r["our_name"], "why": "χωρίς documentId"})
            continue
        if not args.apply:
            ok += 1
            continue
        try:
            call(f"/bt-players/{r['documentId']}", tok, "PUT", {"data": {"umb_id": r["umb_id"]}})
            ok += 1
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "replace")[:200]
            fail.append({"our_name": r["our_name"], "umb_id": r["umb_id"], "http": e.code, "detail": detail})
            if e.code in (401, 403):
                print("✗ το token δεν έχει δικαίωμα εγγραφής — σταματώ")
                break
        except Exception as e:
            fail.append({"our_name": r["our_name"], "umb_id": r["umb_id"], "why": str(e)[:200]})
        if args.sleep:
            time.sleep(args.sleep)
        if i % 100 == 0:
            print(f"  … {i}/{len(rows)}")
    print(f"  ✓ {ok} · ✗ {len(fail)}")
    if fail[:5]:
        for f in fail[:5]:
            print("   ", f)
    if args.apply:
        json.dump({"applied_at": time.strftime("%Y-%m-%dT%H:%M:%S"), "ok": ok, "failed": fail},
                  open(REPORT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"  -> data/apply-report.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
