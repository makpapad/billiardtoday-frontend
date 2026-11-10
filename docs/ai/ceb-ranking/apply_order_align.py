# -*- coding: utf-8 -*-
"""
apply_order_align.py — Ευθυγράμμιση ΣΕΙΡΑΣ της δημοσιευμένης λίστας
`public/data/ceb-ranking/3c-individual.json` με το επίσημο αρχείο της CEB
`docs/ai/ceb-ranking/ceb16_xlsx_final_clean.json` (χωρίς τον GROOT Raymon).

- Αλλάζει ΜΟΝΟ τη σειρά των γραμμών + το πεδίο `rank` (1..1467).
- name / fed / points / ev / suspended μένουν ΑΠΟΛΥΤΑ τα ίδια.
- Η σειρά-στόχος = η σειρά του αρχείου της CEB (μία-προς-μία αντιστοίχιση
  με κανονικοποιημένο όνομα + ομοσπονδία). Εκεί που ο κανόνας
  (tie_rule_candidate.sort_tie_group) αναπαράγει τη σειρά, χρησιμοποιείται ο
  κανόνας· εκεί που δεν φτάνει (pts=12 PRASSAS, pts=-4 OZEN/CELIK) παίρνουμε
  τη σειρά της CEB ως έχει — το τελικό αποτέλεσμα ταυτίζεται με τη σειρά CEB.

Χρήση: python apply_order_align.py            # ΔΟΚΙΜΗ
       python apply_order_align.py --apply    # εκτέλεση (backup + εγγραφή)
"""
from __future__ import annotations
import json, os, shutil, hashlib, unicodedata, re

REPO = "D:/Projects/4-billiardtoday-frontend"
CD = os.path.join(REPO, "docs", "ai", "ceb-ranking")
LIVE = os.path.join(REPO, "public", "data", "ceb-ranking", "3c-individual.json")
XL = os.path.join(CD, "ceb16_xlsx_final_clean.json")
BACKUP = os.path.join(CD, "backup", "3c-individual.json.pre-order-align.bak")
COLS = list("ABCDEFGHIJ")


def norm(s):
    s = unicodedata.normalize("NFKD", str(s or ""))
    s = "".join(c for c in s if not unicodedata.combining(c)).upper()
    s = s.translate(str.maketrans({"\u00d8": "O", "\u0110": "D", "\u0141": "L",
                                   "\u00c6": "AE", "\u0152": "OE", "\u00df": "SS"}))
    s = re.sub(r"[^A-Z0-9 ]", " ", s)
    return " ".join(s.split())


def toks(s):
    return tuple(sorted(norm(s).split()))


def key(r):
    return (toks(r["name"]), (r.get("fed") or "").strip().upper())


def sha(path):
    return hashlib.sha256(open(path, "rb").read()).hexdigest()


def main():
    import sys
    apply_ = "--apply" in sys.argv

    payload = json.load(open(LIVE, encoding="utf-8"))
    rows = payload["rows"]
    xl = json.load(open(XL, encoding="utf-8"))["rows"]
    xl_no_groot = [r for r in xl if norm(r["name"]) != "GROOT RAYMON"]
    xm = {key(r): r for r in xl_no_groot}

    assert len(rows) == 1467, len(rows)
    assert len(xm) == 1467, len(xm)
    assert set(key(r) for r in rows) == set(xm), "bijection failed"

    # δείκτης CEB-rank για κάθε δική μας γραμμή
    new_order = sorted(rows, key=lambda r: xm[key(r)]["rank"])
    # μόνο αναδιάταξη ομάδων: οι πόντοι παραμένουν φθίνοντες
    pts = [r["points"] for r in new_order]
    assert all(pts[i] >= pts[i + 1] for i in range(len(pts) - 1)), "cross-group move!"

    for i, r in enumerate(new_order, 1):
        r["rank"] = i

    if not apply_:
        print("[ΔΟΚΙΜΗ] δεν γράφτηκε τίποτα.")
        for r in rows:
            pass
        return

    os.makedirs(os.path.dirname(BACKUP), exist_ok=True)
    shutil.copy2(LIVE, BACKUP)
    print("backup ->", BACKUP, "sha256:", sha(BACKUP))

    payload["rows"] = new_order
    with open(LIVE, "w", encoding="utf-8", newline="") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    print("written:", LIVE)


if __name__ == "__main__":
    main()
