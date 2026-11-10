# -*- coding: utf-8 -*-
"""
tie_rule_candidate.py — CEB 3-Cushion Individual: κανόνας ταξινόμησης αθλητών με ίδιους πόντους.

ΕΜΠΕΙΡΙΚΟ ΣΥΜΠΕΡΑΣΜΑ (από τα δικά τους αρχεία: ceb15_clean.json, git HEAD:ceb16_clean.json,
ceb16_new.json, ceb16_xlsx_clean.json, ceb16_xlsx_final_clean.json — βλ. report-tie-rule-el.md):

    κλειδί = ( πόντοι ↓ , νεότερη διοργάνωση με αποτέλεσμα , θέση στην προηγούμενη δημοσίευση ↑ )

  1) Πόντοι: φθίνουσα σειρά.
  2) «Νεότερη διοργάνωση με αποτέλεσμα»: η πιο πρόσφατη διοργάνωση (J→I→H→...→A) στην οποία ο
     αθλητής έχει ΟΠΟΙΑΔΗΠΟΤΕ καταγραφή. ΣΗΜΑΝΤΙΚΟ: μετράει ΚΑΙ η αρνητική τιμή (ποινή, π.χ.
     H:-4). Έτσι ο GENC Burhan [C:8 E:2 H:-4] πάει στο H-block και βγαίνει #320 (όπως στη CEB),
     όχι στο E-block (#325 = το λάθος μας). Στο Excel της CEB το −4 μετράει σαν θετικό γι' αυτόν
     ακριβώς τον λόγο.
  3) Ίδια νεότερη διοργάνωση → σειρά της ΠΡΟΗΓΟΥΜΕΝΗΣ ΔΗΜΟΣΙΕΥΣΗΣ (αύξουσα θέση· μικρότερος
     αριθμός = ψηλότερα). Αυτή είναι η πρακτική που δηλώνει και η CEB («κρατάμε τη σειρά της
     προηγούμενης έκδοσης»). Σε διπλές εγγραφές της προηγούμενης έκδοσης κρατάμε τη ΜΙΚΡΟΤΕΡΗ θέση.
  4) Αθλητής που ΔΕΝ υπάρχει στην προηγούμενη έκδοση (νέος) → ΠΡΩΤΟΣ μέσα στο block του
     (έτσι βγαίνει ο GOKSU Volkan #438). ΠΡΟΣΟΧΗ: αυτό είναι το μόνο σημείο χωρίς σταθερό κανόνα —
     η CEB δήλωσε ότι τον GOKSU τον έβαλε ΧΕΙΡΟΚΙΝΗΤΑ· στους OZEN/CELIK (επίσης νέοι) τους έβαλε
     ΤΕΛΕΥΤΑΙΟΥΣ. Το 'new_first' εδώ αναπαράγει τη συντριπτική πλειοψηφία.

Μετρήσεις (βλ. report):
  - Νέο xlsx (xlsx_final), μη-μηδενικές ομάδες: ο κανόνας αναπαράγει 33/33 ομάδες (0 αντιφάσεις).
  - «Σκέτο» β (θέση προηγ. έκδοσης) αναπαράγει 29/33 έναντι της προηγ. δημοσίευσης 16/2026,
    και 14/33 έναντι του v15 (άρα ως «προηγούμενη» χρησιμοποίησε την ΑΜΕΣΩΣ προηγούμενη δημοσίευση).
  - Στα 5 ονόματα που μας απασχολούσαν, ο κανόνας δίνει: GOKSU #438, GENC #320, BARTSOKAS #468,
    HENDRIKSEN #1210, TORRISCO #1248 — όλα ίδια με τη CEB.

Το `sort_tie_group` δουλεύει σε ΕΝΑ στάδιο: δέξου τις γραμμές που έχουν ήδη το ίδιο σύνολο πόντων
(ή και ολόκληρη τη λίστα — το ίδιο κάνει) και επέστρεψέ τις στην προβλεπόμενη σειρά.
"""

from __future__ import annotations
import unicodedata
import re

# Διοργανώσεις από την παλαιότερη στη νεότερη (βλ. editions/16-2026.json: A=EC Antalya 2026-03 …
# J=WC Lier 2026). Κρατάμε τη σειρά ως default ΟΤΑΝ δεν δίνονται ημερομηνίες.
DEFAULT_EVENT_ORDER_OLD_TO_NEW = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]
EVENT_KEYS = list(DEFAULT_EVENT_ORDER_OLD_TO_NEW)


# --------------------------------------------------------------------------------------
# Βοηθητικά
# --------------------------------------------------------------------------------------
def _norm_name(name) -> str:
    """Κεφαλαία, χωρίς τόνους/διακριτικά, χωρίς διπλά κενά. Κρατά τη σειρά των tokens."""
    s = unicodedata.normalize("NFKD", str(name or ""))
    s = "".join(c for c in s if not unicodedata.combining(c)).upper()
    s = s.translate(str.maketrans({"Ø": "O", "Đ": "D", "Ł": "L", "Æ": "AE", "Œ": "OE", "ß": "SS"}))
    s = re.sub(r"[^A-Z0-9 ]", " ", s)
    return " ".join(s.split())


def _key(rec):
    return (_norm_name(rec.get("name")), (rec.get("fed") or "").strip().upper())


def _points(rec):
    for k in ("Pnts", "points", "total"):
        if rec.get(k) is not None:
            return int(rec[k])
    return 0


def _events_old_to_new(edition_events):
    """
    Δέχεται:
      - λίστα από dicts {'key':..,'date':..} (π.χ. editions/16-2026.json) -> sorts by date
      - λίστα από dicts {'key':..} χωρίς date, ή λίστα από strings ['A','B',...] -> όπως δίνεται
    Επιστρέφει λίστα με keys ταξινομημένα από την ΠΑΛΑΙΟΤΕΡΗ στη ΝΕΟΤΕΡΗ.
    """
    if not edition_events:
        return list(DEFAULT_EVENT_ORDER_OLD_TO_NEW)
    if all(isinstance(e, str) for e in edition_events):
        return list(edition_events)
    dated = [e for e in edition_events if isinstance(e, dict) and e.get("date")]
    if dated and len(dated) == len(edition_events):
        return [e["key"] for e in sorted(edition_events, key=lambda e: e["date"])]
    return [e["key"] if isinstance(e, dict) else e for e in edition_events]


def _event_value(rec, key):
    """Τιμή του αθλητή στη διοργάνωση `key`. Το ev μπορεί να είναι dict {A:..} ή λίστα A..J."""
    ev = rec.get("ev")
    if isinstance(ev, dict):
        return ev.get(key)
    if isinstance(ev, (list, tuple)):
        try:
            return ev[EVENT_KEYS.index(key)]
        except (ValueError, IndexError):
            return None
    return None


def _prev_rank_map(prev_edition_rows):
    """key -> θέση στην προηγούμενη έκδοση. Σε διπλές εγγραφές κρατάμε τη ΜΙΚΡΟΤΕΡΗ θέση."""
    out = {}
    for r in prev_edition_rows or []:
        k = _key(r)
        rank = r.get("rank")
        if rank is None:
            rank = r.get("Rank") or r.get("PP")
        if rank is None:
            continue
        rank = int(rank)
        if k not in out or rank < out[k]:
            out[k] = rank
    return out


# --------------------------------------------------------------------------------------
# Ο ΚΑΝΟΝΑΣ
# --------------------------------------------------------------------------------------
def sort_tie_group(rows, prev_edition_rows, edition_events, new_first=True):
    """
    Επιστρέφει τα `rows` ταξινομημένα με τον κανόνα της CEB:

        πόντοι ↓ , νεότερη-διοργάνωση-με-αποτέλεσμα , θέση-προηγ.-έκδοσης ↑ , νέος=πρώτος

    Παράμετροι
    ----------
    rows : list[dict]
        Οι εγγραφές προς ταξινόμηση. Κάθε εγγραφή: {'name','fed','Pnts'|'points'|'total',
        'ev'} όπου 'ev' = dict {A..J} ή λίστα [A..J]. (π.χ. ολόκληρο το 'rows' του xlsx/json,
        ή μόνο τα μέλη μιας ομάδας ίσων πόντων.)
    prev_edition_rows : list[dict]
        Οι εγγραφές της ΠΡΟΗΓΟΥΜΕΝΗΣ δημοσίευσης-έκδοσης: {'name','fed','rank'}.
        Αν κάποια λείπουν από εδώ -> θεωρούνται νέοι.
    edition_events : list
        Τα events της έκδοσης (dicts με 'key' [,'date'] ή strings), από παλαιότερα σε νεότερα.
    new_first : bool
        True (προεπιλογή) -> νέος αθλητής = πρώτος στην ομάδα (αναπαράγει GOKSU #438).

    Επιστρέφει
    ----------
    list[dict] : τα rows στην προβλεπόμενη σειρά.
    """
    ev_old_new = _events_old_to_new(edition_events)
    ev_new_old = list(reversed(ev_old_new))            # νεότερη -> παλαιότερη
    prev_rank = _prev_rank_map(prev_edition_rows)

    NEG = -10 ** 9            # νέος -> μπροστά
    BIG = 10 ** 9             # άγνωστο -> πίσω

    new_val = NEG if new_first else BIG

    def newest_event_index(rec):
        """0 = J (νεότερη) … όλο και μεγαλύτερο όσο πάμε παλαιότερα. BIG = πουθενά αποτέλεσμα."""
        for i, k in enumerate(ev_new_old):
            v = _event_value(rec, k)
            if v is not None and v != 0:   # ΣΗΜΑΝΤΙΚΟ: μετράει και το αρνητικό (π.χ. -4)
                return i
        return BIG

    def sort_key(rec):
        return (
            -_points(rec),                                   # 1) πόντοι ↓
            newest_event_index(rec),                         # 2) νεότερη διοργάνωση με αποτέλεσμα
            prev_rank.get(_key(rec), new_val),               # 3) θέση προηγ. έκδοσης ↑ (νέος=πρώτος)
            _norm_name(rec.get("name")),                     # 4) σταθερό tie-break (σπάνια ενεργό)
        )

    # Σταθερό (sorted είναι stable) -> σε πλήρη ισοπαλία διατηρείται η σειρά εισόδου.
    return sorted(rows, key=sort_key)


def sort_absolute_tie_only(rows, prev_edition_rows, edition_events, new_first=True):
    """ΒΟΗΘΗΤΙΚΟ — «σκέτο β» (η πρακτική που δηλώνει η CEB): πόντοι ↓ , θέση προηγ. έκδοσης ↑.
    Δεν κοιτάει καθόλου τα events. Αναπαράγει ~29/33 ομάδες (vs προηγ. δημοσίευση)."""
    prev_rank = _prev_rank_map(prev_edition_rows)
    new_val = (-10 ** 9) if new_first else (10 ** 9)
    return sorted(rows, key=lambda r: (-_points(r), prev_rank.get(_key(r), new_val),
                                       _norm_name(r.get("name"))))


# --------------------------------------------------------------------------------------
# Self-test στα πραγματικά αρχεία (καθαρά διαβάζει — δεν γράφει τίποτα)
# --------------------------------------------------------------------------------------
if __name__ == "__main__":
    import json, os, sys

    REPO = os.environ.get("CEB_REPO", r"D:\Projects\4-billiardtoday-frontend")
    CEDIR = os.path.join(REPO, "docs", "ai", "ceb-ranking")

    def load(path):
        data = json.load(open(path, encoding="utf-8"))
        return data["rows"] if isinstance(data, dict) and "rows" in data else data

    ev_source = load(os.path.join(CEDIR, "editions", "16-2026.json"))  # έχει events in "meta"/"events"
    ev_raw = json.load(open(os.path.join(CEDIR, "editions", "16-2026.json"), encoding="utf-8"))
    edition_events = ev_raw.get("events") or ev_raw.get("meta", {}).get("events")

    target = load(os.path.join(CEDIR, "ceb16_xlsx_final_clean.json"))
    prev = os.environ.get("CEB_OLD", r"D:\tmp\ceb\ceb16_prev_HEAD.json")
    prev_rows = load(prev)

    # ομάδες ίδιων πόντων
    from collections import OrderedDict
    groups = OrderedDict()
    for r in target:
        groups.setdefault(_points(r), []).append(r)
    groups = [g for g in groups.values() if len(g) > 1]

    print(f"target={os.path.basename(os.path.join(CEDIR, 'ceb16_xlsx_final_clean.json'))}  "
          f"prev={os.path.basename(prev)}")
    print(f"ομάδες ίδιων πόντων: {len(groups)}")

    for label, fn in (("ζ+β (προτεινόμενος)", sort_tie_group),
                      ("β μόνο", sort_absolute_tie_only)):
        ok = tot = 0
        for g in groups:
            if _points(g[0]) == 0:
                continue
            tot += 1
            ordered = fn(g, prev_rows, edition_events)
            if [id(x) for x in ordered] == [id(x) for x in g]:   # ίδια σειρά με το επίσημο
                ok += 1
        print(f"  {label:24s}: {ok}/{tot} μη-μηδενικές ομάδες αναπαράγονται ακριβώς")

    # τα 5 ονόματα
    print("\nΠροβλεπόμενες θέσεις (πρέπει να συμφωνούν με τη CEB):")
    want = {"GOKSU Volkan": 438, "GENC Burhan": 320, "BARTSOKAS Konstantinos": 468,
            "HENDRIKSEN Rene": 1210, "TORRISCO Enrique Jose": 1248}
    ordered_all = sort_tie_group(target, prev_rows, edition_events)
    pred = {_key(r): r.get("rank") for r in ordered_all}  # (απλοποίηση: δες report για ακριβή #)
    # σωστός υπολογισμός: μετράμε θέση εντός ομάδας
    for r in target:
        if r.get("name") in want:
            g = [x for x in groups if r in x]
            if g:
                g = g[0]
                start = min((x.get("rank") or 0) for x in g)
                ordered = sort_tie_group(g, prev_rows, edition_events)
                pos = start + [id(x) for x in ordered].index(id(r))
                flag = "OK" if pos == want[r["name"]] else "!! αποκλίνει"
                print(f"  {r['name']:26s} CEB=#{r.get('rank'):<5} πρόβλεψη=#{pos:<5} {flag}")
