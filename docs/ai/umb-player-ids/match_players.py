# -*- coding: utf-8 -*-
"""Ταιριάζει το μητρώο UMB (data/umb-ids.json) με τους παίκτες μας (bt-players) και
βγάζει τρεις λίστες: τι γεμίζει αυτόματα, τι θέλει ανθρώπινο έλεγχο, τι δεν βρέθηκε.

Χρήση:
  uv run --python 3.12 --with openpyxl python match_players.py            # + xlsx στο data/
  ... --xlsx                                                             # μόνο xlsx

Έξοδος στο data/:
  match-fill.json    παίκτης μας -> UMB ID (ασφαλές, μοναδικό, ίδια χώρα)
  match-review.json  διφορούμενο ή χώρα που δεν ταιριάζει -> θέλει μάτι
  match-none.json    δεν βρέθηκε σε καμία λίστα UMB
  umb-id-match.xlsx  τα τρία φύλλα για ανθρώπινο έλεγχο (αν δοθεί --xlsx)
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.request
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from parse_umb_ranking import norm  # noqa: E402

sys.path.insert(0, os.path.join(HERE, "..", "ceb-ranking", "self-computed"))
try:
    from greek_translit import latinize_fullname  # noqa: E402
except Exception:  # το αρχείο μπορεί να μην υπάρχει σε άλλο PC
    def latinize_fullname(s):
        return s or ""

API = "https://app.billiardtoday.com/api/bt-players"
MIN_TOKEN = 3


def fetch_players() -> list[dict]:
    out, page = [], 1
    while True:
        url = (API + "?fields%5B0%5D=full_name&fields%5B1%5D=full_name_en&fields%5B2%5D=country"
                     f"&pagination%5BpageSize%5D=1000&pagination%5Bpage%5D={page}")
        req = urllib.request.Request(url, headers={"User-Agent": "billiardtoday/umb-id-match"})
        with urllib.request.urlopen(req, timeout=120) as r:
            d = json.load(r)
        out += d["data"]
        if page >= d["meta"]["pagination"]["pageCount"]:
            return out
        page += 1


def variants_of(p: dict) -> list[set[str]]:
    """Τα ονόματα του παίκτη σε όλες τις μορφές (πεδίο, αγγλικά, ελληνικό->λατινικά).

    Η ένωση των δύο πεδίων βοηθάει όταν το ένα έχει συνθετικό που λείπει από το άλλο
    (π.χ. μεσαίο όνομα μόνο στο ελληνικό πεδίο).
    """
    out = []
    for raw in (p.get("full_name"), p.get("full_name_en")):
        if not raw:
            continue
        for cand in (raw, latinize_fullname(raw)):
            toks = set(norm(cand).split())
            if toks and toks not in out:
                out.append(toks)
    if len(out) > 1:
        union = set().union(*out)
        if union not in out:
            out.append(union)
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--registry", default=os.path.join(HERE, "data", "umb-ids.json"))
    ap.add_argument("--xlsx", action="store_true")
    ap.add_argument("--only-greek-script", action="store_true",
                    help="μόνο οι παίκτες με ελληνικό όνομα (έλεγχος μεταγραφής)")
    args = ap.parse_args()

    reg = json.load(open(args.registry, encoding="utf-8"))["players"]
    umb = list(reg.values())
    for u in umb:
        u["tok"] = set(norm(u["name"]).split())
        if not u["tok"]:
            u["tok"] = {u["umb_id"]}
    players = fetch_players()
    print(f"μητρώο UMB: {len(umb)} IDs | bt-players: {len(players)}")

    by_key = defaultdict(list)      # (χώρα, επίθετο)
    by_surname = defaultdict(list)  # επίθετο (για παίκτες χωρίς χώρα)
    for u in umb:
        sur = next(iter(norm(u["name"]).split()), None) or u["umb_id"]
        u["surname"] = sur
        by_key[((u.get("fed") or ""), sur)].append(u)
        by_surname[sur].append(u)

    fill, review, none = [], [], []
    seen_ids = defaultdict(list)
    for p in players:
        raw = p.get("full_name") or ""
        if args.only_greek_script and not re.search(r"[\u0370-\u03ff\u1f00-\u1fff]", raw):
            continue
        cc = (p.get("country") or "").upper()
        variants = variants_of(p)
        if not variants:
            none.append({"player_id": p["id"], "documentId": p.get("documentId"),
                         "our_name": raw, "country": cc, "why": "χωρίς όνομα/χώρα"})
            continue
        # Το επίθετο είναι το κλειδί: το πρώτο συνθετικό στο όνομα της UMB. Ταίριασμα με κοινό
        # μικρό όνομα (Dimitrios, Konstantinos) βγάζει σκουπίδια — γι' αυτό δεν μετράει.
        strong, weak, conflict = {}, {}, {}
        for toks in variants:
            for t in toks:
                if len(t) < MIN_TOKEN:
                    continue
                pool = by_key.get((cc, t), []) if cc else by_surname.get(t, [])
                if cc:
                    pool = pool + [u for u in by_surname.get(t, []) if not u.get("fed")]
                for u in pool:
                    shared = u["tok"] & toks
                    if u["tok"] <= toks:                    # όλα τα συνθετικά της UMB υπάρχουν στο δικό μας όνομα
                        if u.get("conflicts"):
                            conflict[u["umb_id"]] = u       # διπλό ID στη λίστα UMB: ποτέ αυτόματα
                        else:
                            strong[u["umb_id"]] = u
                    elif len(shared) >= 2 and t == u["surname"]:
                        weak.setdefault(u["umb_id"], u)     # ίδιο επίθετο, διαφορετικό μικρό όνομα
                    elif t == u["surname"] and len(t) >= 4:
                        weak.setdefault(u["umb_id"], u)
        chosen, how = None, ""
        if len(strong) == 1:
            chosen, how = list(strong.values())[0], "επίθετο + όνομα"
        cand_list = list(strong.values()) or list(weak.values()) or list(conflict.values())
        row = {"player_id": p["id"], "documentId": p.get("documentId"), "our_name": raw,
               "our_name_en": p.get("full_name_en"), "country": cc,
               "candidates": [{"umb_id": u["umb_id"], "umb_name": u["name"], "fed": u.get("fed")}
                              for u in cand_list[:6]]}
        if chosen and chosen.get("fed") and cc and chosen["fed"] != cc:
            chosen, how = None, "χώρα δεν ταιριάζει"
        if chosen and conflict:
            chosen, how = None, "διπλό ID στη λίστα UMB"
        if chosen:
            fill.append(dict(row, umb_id=chosen["umb_id"], umb_name=chosen["name"],
                             umb_fed=chosen.get("fed"), rule=how))
            seen_ids[chosen["umb_id"]].append(p["id"])
        elif strong or weak or conflict:
            if conflict and not strong:
                why = "διπλό ID στη λίστα UMB"
            elif len(row["candidates"]) > 1:
                why = "διφορούμενο"
            else:
                why = how or "ίδιο επίθετο μόνο"
            review.append(dict(row, why=why))
        else:
            none.append(dict(row, why="δεν βρέθηκε"))

    # ένα UMB ID δεν μπορεί να ανήκει σε δύο δικούς μας παίκτες -> πίσω στον έλεγχο
    conflict = {i: ids for i, ids in seen_ids.items() if len(ids) > 1}
    if conflict:
        keep = [r for r in fill if r["umb_id"] not in conflict]
        moved = [dict(r, why=f"ίδιο UMB ID σε {len(conflict[r['umb_id']])} δικούς μας παίκτες")
                 for r in fill if r["umb_id"] in conflict]
        fill, review = keep, review + moved
        print(f"  ! {len(conflict)} UMB IDs μοιράζονται σε 2+ δικούς μας παίκτες -> στον έλεγχο")

    n = len(players)
    print(f"  ✓ συμπλήρωση        : {len(fill):5d} ({len(fill)/n:.0%})")
    print(f"  ~ ανθρώπινος έλεγχος: {len(review):5d} ({len(review)/n:.0%})")
    print(f"  ✗ δεν βρέθηκε       : {len(none):5d} ({len(none)/n:.0%})")
    per = defaultdict(lambda: [0, 0, 0])
    for r in fill:
        per[r["country"] or "?"][0] += 1
    for r in review:
        per[r["country"] or "?"][1] += 1
    for r in none:
        per[r["country"] or "?"][2] += 1
    print("  χώρα: ✓ / ~ / ✗")
    for c, v in sorted(per.items(), key=lambda kv: -sum(kv[1]))[:12]:
        print(f"    {c:3s} {v[0]:5d} {v[1]:5d} {v[2]:5d}")

    for name, data in (("match-fill.json", fill), ("match-review.json", review), ("match-none.json", none)):
        json.dump(data, open(os.path.join(HERE, "data", name), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print(f"  -> data/{name}")

    if args.xlsx:
        try:
            from openpyxl import Workbook
            from openpyxl.styles import Font
        except ImportError:
            print("  (λείπει το openpyxl: πρόσθεσε --with openpyxl)")
            return 0
        wb = Workbook()
        wb.remove(wb.active)
        headers = {"fill": ["player_id", "documentId", "όνομα (μας)", "όνομα EN", "χώρα",
                            "UMB ID", "όνομα (UMB)", "χώρα UMB", "κανόνας"],
                   "review": ["player_id", "documentId", "όνομα (μας)", "όνομα EN", "χώρα",
                              "γιατί", "υποψήφια"],
                   "none": ["player_id", "documentId", "όνομα (μας)", "όνομα EN", "χώρα", "γιατί"]}
        for key, data, title in (("fill", fill, "Συμπλήρωση"), ("review", review, "Έλεγχος"),
                                 ("none", none, "Δεν βρέθηκε")):
            ws = wb.create_sheet(title)
            ws.append(headers[key])
            for c in ws[1]:
                c.font = Font(bold=True)
            for r in data:
                row = [r.get("player_id"), r.get("documentId"), r.get("our_name"), r.get("our_name_en"),
                       r.get("country")]
                if key == "fill":
                    row += [r.get("umb_id"), r.get("umb_name"), r.get("umb_fed"), r.get("rule")]
                elif key == "review":
                    row += [r.get("why"), " · ".join(f"{c['umb_id']} {c['umb_name']} ({c['fed']})"
                                                     for c in r.get("candidates") or [])]
                else:
                    row += [r.get("why")]
                ws.append(row)
            ws.freeze_panes = "A2"
            ws.auto_filter.ref = ws.dimensions
            widths = {"fill": [10, 40, 30, 30, 8, 9, 30, 10, 22],
                      "review": [10, 40, 30, 30, 8, 22, 60], "none": [10, 40, 30, 30, 8, 18]}[key]
            for i, w in enumerate(widths, 1):
                ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = w
        out = os.path.join(HERE, "data", "umb-id-match.xlsx")
        wb.save(out)
        print(f"  -> data/umb-id-match.xlsx")
    return 0


if __name__ == "__main__":
    sys.exit(main())
