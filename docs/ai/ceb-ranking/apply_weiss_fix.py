# -*- coding: utf-8 -*-
"""
apply_weiss_fix.py — Διόρθωση στήλης A (Ευρωπαϊκό Πρωτάθλημα) για ΔΥΟ ζεύγη,
με ΕΝΑ πέρασμα ταξινόμησης/αρίθμησης (εντολή CEB 07/10/2026):

  (1) WEISS Adrian (SE) έδινε 4 π. στη στήλη A — ΔΕΝ είναι δικά του.
      WEISS Alexander (AT) πρέπει να τα πάρει.
        · WEISS Alexander (AT): ev[0] = 4   (ήταν None), points 46 → 50
        · WEISS Adrian    (SE): ev[0] = None (ήταν 4),   points  8 → 4
  (2) Pinto Vítor (PT) έδινε 4 π. στη στήλη A — ΔΕΝ είναι δικά του.
      Pinto Luis (PT) πρέπει να τα πάρει.
        · Pinto Luis  (PT): ev[0] = 4    (ήταν None), points 31 → 35
        · Pinto Vítor (PT): ev[0] = None (ήταν 4),    points  6 → 2

Μετά τη διόρθωση: ξανα-ταξινόμηση ΜΕ ΤΟΝ ΙΔΙΟ ΚΑΝΟΝΑ της πρόσφατης ευθυγράμμισης
(`tie_rule_candidate.sort_tie_group`: πόντοι ↓, νεότερη διοργάνωση με αποτέλεσμα
όπου το −4 μετρά ως ΠΑΡΟΥΣΙΑ, θέση προηγ. δημοσίευσης ↑, νέος = πρώτος) και
fallback στη ΣΕΙΡΑ του αρχείου της CEB ΜΟΝΟ στις ομάδες όπου ο κανόνας δεν την
αναπαράγει (εδώ pts=12 και pts=-4) — ΠΟΤΕ στους πόντους τους. Ξαναρίθμηση 1..1467
και εγγραφή στην ΙΔΙΑ συμπυκνωμένη μορφή.

Χρήση: python apply_weiss_fix.py            # ΔΟΚΙΜΗ (δεν γράφει)
       python apply_weiss_fix.py --apply    # εκτέλεση (backup + εγγραφή)
"""
from __future__ import annotations
import json, os, sys, copy, shutil, hashlib, subprocess

REPO = "D:/Projects/4-billiardtoday-frontend"
CD = os.path.join(REPO, "docs", "ai", "ceb-ranking")
LIVE = os.path.join(REPO, "public", "data", "ceb-ranking", "3c-individual.json")
XL = os.path.join(CD, "ceb16_xlsx_final_clean.json")
EVENTS = os.path.join(CD, "editions", "16-2026.json")
PREV_HEAD = "D:/tmp/ceb/ceb16_prev_HEAD.json"          # git show HEAD:.../ceb16_clean.json
PREVREL = "docs/ai/ceb-ranking/ceb16_clean.json"
BACKUP = os.path.join(CD, "backup", "3c-individual.json.pre-weiss-fix.bak")

EXPECTED_SHA = "57369b7ae6c6f93371b6fae2d8773b5fe9924532405b4683129e77472bf9087b"

sys.path.insert(0, CD)
import tie_rule_candidate as T   # noqa: E402

# Οι 4 διορθώσεις: (όνομα, ομοσπονδία, νέα στήλη A, νέοι πόντοι)
FIXES = [
    ("WEISS Alexander", "AT", 4,    50),
    ("WEISS Adrian",    "SE", None,  4),
    ("Pinto Luis",      "PT", 4,    35),
    ("Pinto Vítor",     "PT", None,  2),
]


def sha(path):
    return hashlib.sha256(open(path, "rb").read()).hexdigest()


def materialize_prev():
    """git show HEAD:docs/ai/ceb-ranking/ceb16_clean.json -> τοπικό αρχείο (μόνο ανάγνωση)."""
    os.makedirs(os.path.dirname(PREV_HEAD), exist_ok=True)
    out = subprocess.run(["git", "show", f"HEAD:{PREVREL}"], cwd=REPO,
                         capture_output=True, check=True).stdout
    with open(PREV_HEAD, "wb") as f:
        f.write(out)
    return json.loads(out.decode("utf-8"))


def fallback_groups(rows, prev, events):
    """Οι ομάδες πόντων όπου ο κανόνας ΔΕΝ αναπαράγει τη σειρά της CEB."""
    ordered = T.sort_tie_group(rows, prev, events)
    cur = {T._key(r): i for i, r in enumerate(rows)}
    return {r["points"] for i, r in enumerate(ordered) if cur[T._key(r)] != i}


def build(rows, prev, events, fb_pts):
    new = copy.deepcopy(rows)
    applied = {}
    for name, fed, val, pts in FIXES:
        hit = [r for r in new if r["name"] == name and (r.get("fed") or "").upper() == fed]
        assert len(hit) == 1, f"{name} ({fed}): {len(hit)} γραμμές"
        r = hit[0]
        applied[name] = (r["ev"][0], r["points"])
        r["ev"][0] = val
        r["points"] = pts

    ordered = T.sort_tie_group(new, prev, events)

    # fallback: επανάφερε τη σειρά της CEB (== τρέχουσα σειρά) ΜΟΝΟ σε αυτές τις ομάδες
    for pts in fb_pts:
        members_rule = [r for r in ordered if r["points"] == pts]
        cur_seq = [T._key(r) for r in rows if r["points"] == pts]
        by_key = {T._key(r): r for r in members_rule}
        assert set(by_key) == set(cur_seq), f"fallback ομάδα pts={pts}: άλλαξε σύνθεση"
        reord = [by_key[k] for k in cur_seq]
        idxs = [i for i, r in enumerate(ordered) if r["points"] == pts]
        for i, rr in zip(idxs, reord):
            ordered[i] = rr

    for i, r in enumerate(ordered, 1):
        r["rank"] = i
    return ordered, applied


def main():
    apply_ = "--apply" in sys.argv
    assert sha(LIVE) == EXPECTED_SHA, f"sha αναπάντεχο: {sha(LIVE)}"

    payload = json.load(open(LIVE, encoding="utf-8"))
    rows = payload["rows"]
    assert len(rows) == 1467 and sum(r["points"] for r in rows) == 6989

    prev = materialize_prev()
    events = json.load(open(EVENTS, encoding="utf-8"))["events"]
    fb = fallback_groups(rows, prev, events)
    ordered, applied = build(rows, prev, events, fb)

    print("fallback ομάδες:", sorted(fb))
    for name, fed, val, pts in FIXES:
        old = applied[name]
        r = next(x for x in ordered if x["name"] == name and (x.get("fed") or "").upper() == fed)
        print(f"  {name:18s} {fed}  ev[0] {old[0]}->{val}  points {old[1]}->{pts}  νέα θέση #{r['rank']}")

    assert len(ordered) == 1467
    assert sum(r["points"] for r in ordered) == 6989
    assert [r["rank"] for r in ordered] == list(range(1, 1468))
    assert all(sum(v for v in r["ev"] if v is not None) == r["points"] for r in ordered)

    if not apply_:
        print("[ΔΟΚΙΜΗ] δεν γράφτηκε τίποτα.")
        return

    os.makedirs(os.path.dirname(BACKUP), exist_ok=True)
    shutil.copy2(LIVE, BACKUP)
    print("backup ->", BACKUP, "sha256:", sha(BACKUP))
    assert sha(BACKUP) == EXPECTED_SHA

    payload["rows"] = ordered
    with open(LIVE, "w", encoding="utf-8", newline="") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    print("written:", LIVE, "sha256:", sha(LIVE))


if __name__ == "__main__":
    main()
