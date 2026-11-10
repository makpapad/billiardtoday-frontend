# -*- coding: utf-8 -*-
"""Ποιος κανόνας βάζει τη σειρά σε ΑΠΟΛΥΤΗ ισοβαθμία (ίδιοι πόντοι + ίδιο διάνυσμα event)
στην επίσημη έκδοση v16;

Δοκιμάζει: (α) αλφαβητικά, (β) UMB ID, (γ) θέση στην προηγούμενη έκδοση.
"""
from __future__ import annotations

import collections
import json
import os
import re
import unicodedata

ROOT = os.path.dirname(os.path.abspath(__file__))
OFF = "D:/tmp/ceb/ceb16_new.json"
OLD = os.path.join(ROOT, os.environ.get("CEB_OLD", "ceb16_clean.json"))
UMB = os.path.join(ROOT, "..", "umb-player-ids", "data", "umb-ids.json")


def toks(s) -> str:
    s = unicodedata.normalize("NFKD", str(s or ""))
    s = "".join(c for c in s if not unicodedata.combining(c)).upper()
    s = s.translate(str.maketrans({"Ø": "O", "Đ": "D", "Ł": "L", "Æ": "AE", "Œ": "OE", "ß": "SS"}))
    s = re.sub(r"[^A-Z0-9 ]", " ", s)
    return " ".join(sorted(s.split()))


def key_of(r):
    return (toks(r.get("name")), r.get("fed"))


def load_umb() -> dict:
    out = {}
    if not os.path.exists(UMB):
        return out
    data = json.load(open(UMB, encoding="utf-8"))
    items = data.values() if isinstance(data, dict) else data
    for e in items:
        if not isinstance(e, dict):
            continue
        nm, fed, uid = e.get("name"), e.get("fed"), e.get("umb_id")
        if nm and uid:
            out[(toks(nm), fed)] = int(re.sub(r"\D", "", str(uid)) or 0)
    return out


def load_old() -> dict:
    out = {}
    if not os.path.exists(OLD):
        return out
    data = json.load(open(OLD, encoding="utf-8"))
    rows = data["rows"] if isinstance(data, dict) and "rows" in data else data
    for r in rows:
        if isinstance(r, dict) and r.get("name"):
            out[key_of(r)] = r.get("rank")
    return out


def main() -> int:
    off = json.load(open(OFF, encoding="utf-8"))
    umb, old = load_umb(), load_old()
    print(f"v16: {len(off)} γραμμές | μητρώο UMB: {len(umb)} εγγραφές | παλιά έκδοση: {len(old)} γραμμές")

    groups = collections.defaultdict(list)
    for r in off:
        groups[(r["Pnts"], tuple(r["ev"] or []))].append(r)
    ties = [v for v in groups.values() if len(v) > 1]
    print(f"ομάδες απόλυτης ισοβαθμίας: {len(ties)} (σύνολο {sum(len(v) for v in ties)} αθλητές)\n")

    def name_is(r, other):
        return toks(r["name"]) == toks(other["name"])

    tests = {
        "αλφαβητικά (NAME)": lambda v: [r["name"] for r in v],
        "UMB ID": lambda v: [umb.get(key_of(r), 10 ** 9) for r in v],
        "θέση προηγ. έκδοσης": lambda v: [old.get(key_of(r), 10 ** 9) for r in v],
    }
    for label, fn in tests.items():
        ok = cov = 0
        examples = []
        for v in ties:
            keys = fn(v)
            if 10 ** 9 in keys:      # λείπουν δεδομένα για κάποιον της ομάδας
                if label != "αλφαβητικά (NAME)":
                    continue
            cov += 1
            if keys == sorted(keys):
                ok += 1
            elif len(examples) < 3 and label != "αλφαβητικά (NAME)":
                examples.append(([r["rank"] for r in v], [r["name"] for r in v], keys))
        print(f"{label:22s}: {ok}/{cov} ομάδες")
        for ranks, names, keys in examples:
            print(f"    π.χ. θέσεις {ranks} {names} -> κλειδιά {keys}")
    # --- ομάδες ΙΣΩΝ ΠΟΝΤΩΝ: ποιος συνδυασμός αναπαράγει τη σειρά του v16; ---
    pg = collections.defaultdict(list)
    for r in off:
        pg[r["Pnts"]].append(r)
    pgroups = [v for v in pg.values() if len(v) > 1]
    missing = 10 ** 9

    def num(x):
        s = str(x or "").strip()
        return int(s) if s.lstrip("-").isdigit() else 0

    def ev_fwd(r):
        return [-num(x) for x in (r["ev"] or [])]

    def ev_rev(r):
        return [-num(x) for x in reversed(r["ev"] or [])]

    def oldk(r):
        return old.get(key_of(r), missing)

    combos = {
        "διανυσμα (οπως στο αρχειο)": lambda r: (ev_fwd(r),),
        "διανυσμα (αντιστροφα)": lambda r: (ev_rev(r),),
        "προηγ. εκδοση": lambda r: (oldk(r),),
        "διανυσμα(οπως) + προηγ. εκδοση": lambda r: (ev_fwd(r), oldk(r)),
        "διανυσμα(αντιστροφα) + προηγ. εκδοση": lambda r: (ev_rev(r), oldk(r)),
    }
    print(f"\nομαδες ισων ποντων: {len(pgroups)}")
    for label, kf in combos.items():
        ok = sum(1 for v in pgroups if sorted(v, key=kf) == v)
        print(f"  {label:38s}: {ok}/{len(pgroups)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
