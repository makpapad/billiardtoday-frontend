# -*- coding: utf-8 -*-
"""Διαβάζει λίστα/κατάταξη της UMB (PDF) -> (rank, name, fed, umb_id).

Η UMB δημοσιεύει σε κάθε λίστα της στήλες:  Rank | Name | Fed. | Player ID | Pnts | ...
Το «Player ID» είναι το UMB ID — το ίδιο που στέλνουν και οι ομοσπονδίες στα εθνικά
τους αρχεία (επαληθεύτηκε: Δανία 0273 = KNUDSEN Brian, Νορβηγία 3650 = OZCAN Gazi).

Ανάγνωση με το words-layer του pymupdf (ΟΧΙ pdftotext -layout: στις πυκνές γραμμές
τα ζεύγη στήλης/τιμής μπερδεύονται).

Χρήση ως εργαλείο:  uv run --python 3.12 --with pymupdf python parse_umb_ranking.py <file.pdf>
Χρήση ως module:   from parse_umb_ranking import parse_ranking_pdf, norm
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata

# χαρακτήρες που δεν αποσυνθέτει το NFKD
_MAP = str.maketrans({
    "Ø": "O", "ø": "O", "Æ": "AE", "æ": "AE", "Å": "A", "å": "A", "Ö": "O", "ö": "O",
    "Ü": "U", "ü": "U", "ß": "SS", "Đ": "D", "đ": "D", "É": "E", "È": "E", "Ê": "E",
    "Ç": "C", "Ñ": "N", "İ": "I", "ı": "I", "Š": "S", "š": "S", "Ž": "Z", "ž": "Z",
    "Ł": "L", "ł": "L", "Ő": "O", "ő": "O", "Ű": "U", "ű": "U",
})

_RE_RANK = re.compile(r"^\d{1,4}$")
_RE_ID = re.compile(r"^\d{3,5}$")
_RE_FED = re.compile(r"^[A-Z]{2,3}$")

# στήλες: όνομα στήλης στο header -> (αριστερό x, δεξί x). Το header της UMB δεν είναι
# ευθυγραμμισμένο με τα δεδομένα (το «Name» κάθεται στο 275 ενώ τα ονόματα ξεκινούν στο 123),
# γι' αυτό τα όρια βγαίνουν από τα x των γειτονικών στηλών, όχι από το ίδιο το label.
_HDR_KEYS = ("Rank", "Name", "Fed.", "Player", "ID", "Pnts")


def norm(s: str | None) -> str:
    """Κανονικοποίηση για ταίριασμα ονομάτων: πεζά/τόνοι/σημεία εκτός, ένα κενό."""
    if not s:
        return ""
    s = str(s).translate(_MAP)
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c)).upper()
    s = re.sub(r"[^0-9A-ZΑ-Ω ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def _lines(words, tol=2.5):
    """Ομαδοποίηση λέξεων σε οπτικές γραμμές με βάση το y."""
    out = {}
    for w in words:
        out.setdefault(round(w[1] / tol), []).append(w)
    return {y: sorted(out[y], key=lambda w: w[0]) for y in sorted(out)}


def _header_columns(words):
    """Βρίσκει τη γραμμή header και επιστρέφει τα x των στηλών (ή None).

    Η ετικέτα δεν είναι σταθερή: άλλες λίστες γράφουν `Rank`, άλλες `Rank.`· μερικές
    έχουν επιπλέον στήλη `DOB` ανάμεσα στο ID και τους πόντους.
    """
    for y, ws in _lines(words).items():
        low = [w[4].rstrip(".").lower() for w in ws]
        if "rank" in low and "name" in low and ("player" in low or "id" in low):
            x = {}
            for w, l in zip(ws, low):
                x.setdefault(l, w[0])
            x_fed = x.get("fed")
            x_pid = x.get("player", x.get("id"))
            if x_fed is None or x_pid is None:
                continue
            x_pnts = x.get("pnts", x_pid + 60.0)
            return {"y": ws[0][1], "rank": x.get("rank", 80.0), "fed": x_fed,
                    "id": x_pid, "pnts": x_pnts}
    return None


def parse_ranking_pdf(path: str):
    """Επιστρέφει (rows, stats). rows: dict(rank, name, fed, umb_id, page)."""
    import pymupdf  # τοπικό import: το module φορτώνει και χωρίς pymupdf για το norm()

    doc = pymupdf.open(path)
    rows, pending, stats = [], None, {"pages": doc.page_count, "wrapped_lines": 0,
                                      "pages_without_header": 0, "skipped_rows": 0}
    cols = None
    for pno in range(doc.page_count):
        words = doc[pno].get_text("words")
        hdr = _header_columns(words)
        if hdr:
            cols = hdr
        else:
            stats["pages_without_header"] += 1
            if cols is None:
                continue
            cols = dict(cols, y=-1)  # συνέχεια: ίδιες στήλες, χωρίς όριο header
        pending = None
        for y, ws in _lines(words).items():
            if y <= round(cols["y"] / 2.5) and cols["y"] >= 0:
                continue
            left = [w for w in ws if w[0] < cols["fed"]]
            mid = [w for w in ws if cols["fed"] <= w[0] < cols["id"]]
            rid = [w for w in ws if cols["id"] <= w[0] < cols["pnts"]]
            left_txt = [w[4] for w in left]
            has_rank = bool(left_txt) and bool(_RE_RANK.match(left_txt[0])) and len(left_txt) > 1
            rank = left_txt[0] if has_rank else None
            name = " ".join(left_txt[1:] if has_rank else left_txt).strip()
            fed = "".join(w[4] for w in mid)
            pid = next((w[4] for w in rid if _RE_ID.match(w[4])), None)
            if rank is None and name and not fed and not pid and rows:
                # το όνομα συνεχίζει σε δεύτερη γραμμή (π.χ. πολύ μακρύ επώνυμο)
                rows[-1]["name"] = (rows[-1]["name"] + " " + name).strip()
                stats["wrapped_lines"] += 1
                continue
            if not (rank and name and pid):
                if name or fed or pid:
                    stats["skipped_rows"] += 1
                continue
            if fed and not _RE_FED.match(fed):
                # λερωμένη στήλη χώρας: το κρατάμε χωρίς χώρα, δεν πετάμε τον παίκτη
                name = (name + " " + fed).strip()
                fed = ""
            rows.append({"rank": int(rank), "name": name, "fed": fed,
                         "umb_id": pid.zfill(4), "page": pno + 1})
    # διπλότυπα μέσα στο ίδιο PDF (γραμμές που επαναλαμβάνονται σε αλλαγή σελίδας)
    seen, uniq = set(), []
    for r in rows:
        k = (r["fed"], r["umb_id"])
        if k in seen:
            continue
        seen.add(k)
        uniq.append(r)
    stats["rows"] = len(uniq)
    stats["duplicates_dropped"] = len(rows) - len(uniq)
    return uniq, stats


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    data, st = parse_ranking_pdf(sys.argv[1])
    print(json.dumps(st, ensure_ascii=False))
    for r in data[:5]:
        print(f"  #{r['rank']:4d} {r['name']:32s} {r['fed']:3s} id={r['umb_id']}")
    print(f"  ... σύνολο {len(data)}")
