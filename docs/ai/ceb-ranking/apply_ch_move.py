# -*- coding: utf-8 -*-
"""
apply_ch_move.py — Μετακίνηση των πόντων 6 Ελβετών (CH) από τη στήλη B (Nat 24/25)
στη στήλη C (Nat 25/26), με ΕΝΑ πέρασμα ταξινόμησης/αρίθμησης (εντολή CEB 07/10/2026:
«I move the points from col. B to C — 6 players»).

Για καθένα από τους 6:  ev[2] = ev[1]  (C ← B)  και  ev[1] = None.
ΚΑΝΕΝΑΣ πόντος/σύνολο δεν αλλάζει (σύνολο μένει 6989, κάθε ατομικό σύνολο ίδιο).

Ξανα-ταξινόμηση με τον καθιερωμένο κανόνα (tie_rule_candidate.sort_tie_group):
πόντοι ↓ · νεότερη διοργάνωση με αποτέλεσμα (και το −4 μετρά ως ΠΑΡΟΥΣΙΑ) ·
θέση αμέσως προηγούμενης δημοσίευσης (git HEAD:docs/ai/ceb-ranking/ceb16_clean.json) ↑ ·
νέος = πρώτος στην ομάδα του. Fallback στη ΣΕΙΡΑ της CEB (== τρέχουσα σειρά) ΜΟΝΟ στις
ομάδες όπου ο κανόνας δεν την αναπαράγει — ΠΟΤΕ στους πόντους.

Ξαναρίθμηση 1..1467 και εγγραφή στην ΙΔΙΑ συμπυκνωμένη μορφή.

Χρήση: python apply_ch_move.py            # ΔΟΚΙΜΗ (δεν γράφει)
       python apply_ch_move.py --apply    # εκτέλεση (backup + εγγραφή)
"""
from __future__ import annotations
import json, os, sys, copy, shutil, hashlib, subprocess

REPO = "D:/Projects/4-billiardtoday-frontend"
CD = os.path.join(REPO, "docs", "ai", "ceb-ranking")
LIVE = os.path.join(REPO, "public", "data", "ceb-ranking", "3c-individual.json")
EVENTS = os.path.join(CD, "editions", "16-2026.json")
PREV_HEAD = "D:/tmp/ceb/ceb16_prev_HEAD.json"          # git show HEAD:.../ceb16_clean.json
PREVREL = "docs/ai/ceb-ranking/ceb16_clean.json"
BACKUP = os.path.join(CD, "backup", "3c-individual.json.pre-ch-move.bak")

# sha256 του ζωντανού αρχείου ΠΡΙΝ τη μετακίνηση (μετά τη διόρθωση Weiss+Pinto)
EXPECTED_SHA = "144ca15bf738bc73c80f8b218b4ca31db31f9cf56988e05dec4edfa6c4095c24"

sys.path.insert(0, CD)
import tie_rule_candidate as T   # noqa: E402

MOVERS = [
    ("BEHZAT Cetin",       "CH"),
    ("RECH Pierre Alain",  "CH"),
    ("CANTURK Kenan",      "CH"),
    ("GRETILLAT Xavier",   "CH"),
    ("DUVOISIN Joel",      "CH"),
    ("BOULAZ Michel",      "CH"),
]


def sha(path):
    return hashlib.sha256(open(path, "rb").read()).hexdigest()


def materialize_prev():
    os.makedirs(os.path.dirname(PREV_HEAD), exist_ok=True)
    out = subprocess.run(["git", "show", f"HEAD:{PREVREL}"], cwd=REPO,
                         capture_output=True, check=True).stdout
    with open(PREV_HEAD, "wb") as f:
        f.write(out)
    p = json.loads(out.decode("utf-8"))
    return p["rows"] if isinstance(p, dict) and "rows" in p else p


def fallback_groups(rows, prev, events):
    """Ομάδες πόντων όπου ο κανόνας ΔΕΝ αναπαράγει τη σειρά της CEB (== τρέχουσα σειρά)."""
    ordered = T.sort_tie_group(rows, prev, events)
    cur = {T._key(r): i for i, r in enumerate(rows)}
    return {r["points"] for i, r in enumerate(ordered) if cur[T._key(r)] != i}


def build(rows, prev, events, fb_pts):
    new = copy.deepcopy(rows)
    applied = {}
    for name, fed in MOVERS:
        hit = [r for r in new if r["name"] == name and (r.get("fed") or "").upper() == fed]
        assert len(hit) == 1, f"{name} ({fed}): {len(hit)} γραμμές"
        r = hit[0]
        assert r["ev"][1] is not None and r["ev"][2] is None, \
            f"{name}: ev[1]={r['ev'][1]} ev[2]={r['ev'][2]} — δεν είναι B->C"
        before_pts = r["points"]
        applied[name] = (r["ev"][1], before_pts)
        r["ev"][2] = r["ev"][1]
        r["ev"][1] = None
        # κανένα σύνολο δεν αλλάζει
        assert r["points"] == before_pts
        assert sum(v for v in r["ev"] if v is not None) == r["points"]

    ordered = T.sort_tie_group(new, prev, events)

    # fallback: επανάφερε τη σειρά της CEB (== τρέχουσα) ΜΟΝΟ σε αυτές τις ομάδες
    for pts in fb_pts:
        members_rule = [r for r in ordered if r["points"] == pts]
        cur_seq = [T._key(r) for r in rows if r["points"] == pts]
        by_key = {T._key(r): r for r in members_rule}
        assert set(by_key) == set(cur_seq), f"fallback ομάδα pts={pts}: άλλαξε σύνθεση"
        idxs = [i for i, r in enumerate(ordered) if r["points"] == pts]
        for i, k in zip(idxs, cur_seq):
            ordered[i] = by_key[k]

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
    for name, fed in MOVERS:
        old_b, pts = applied[name]
        r = next(x for x in ordered if x["name"] == name and (x.get("fed") or "").upper() == fed)
        print(f"  {name:18s} {fed}  B {old_b}->C{None} (C={r['ev'][2]})  points {pts}->{r['points']}"
              f"  νέα θέση #{r['rank']}")

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
