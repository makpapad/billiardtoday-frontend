# -*- coding: utf-8 -*-
"""Κατεβάζει τις λίστες της UMB (τρέχουσα + αρχείο εκδόσεων), τις διαβάζει και χτίζει
το μητρώο UMB ID -> (όνομα, χώρα).

Γιατί πολλές εκδόσεις: το ID είναι σταθερό. Όποιος έπεσε από την τρέχουσα κατάταξη
(δεν έχει πόντους στο τρέχον παράθυρο) εξακολουθεί να έχει το ID του σε παλιότερη έκδοση —
έτσι το μητρώο καλύπτει και παίκτες που δεν είναι στην τρέχουσα λίστα.

Χρήση:
  uv run --python 3.12 --with pymupdf python fetch_umb_rankings.py                 # 4 εκδόσεις/κατηγορία
  ... --max-per-category 12 --stop-after 3                                        # πιο βαθιά
  ... --categories WorldLadies,WorldJuniors                                       # μόνο κάποιες λίστες
  ... --refresh                                                                    # ξανά κατέβασμα

Έξοδος: data/umb-ids.json (+ cache PDF στο .cache/, δεν μπαίνει στο git).
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from parse_umb_ranking import norm, parse_ranking_pdf  # noqa: E402


def _surname(name: str) -> str:
    toks = norm(name or "").split()
    return toks[0] if toks else ""

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "data", "umb-ids.json")
CACHE = os.path.join(HERE, ".cache")
INDEX_PAGES = ["https://www.umb-carom.org/ranking", "https://www.umb-carom.org/ranking/archive"]
CATEGORIES = ["WorldPlayers", "WorldLadies", "WorldJuniors", "UMBEvents"]
UA = "Mozilla/5.0 (compatible; BilliardToday data import; +https://billiardtoday.com)"


def get(url: str, timeout: int = 60) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def collect_links() -> list[dict]:
    """Όλα τα /uploads/rankings/*.pdf από τις σελίδες ευρετηρίου, με ετικέτα."""
    out, seen = [], set()
    for page in INDEX_PAGES:
        html = get(page).decode("utf-8", "replace")
        for m in re.finditer(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', html, re.S):
            href, txt = m.group(1), re.sub(r"<[^>]+>", "", m.group(2))
            label = " ".join(txt.split())
            if "/uploads/rankings/" not in href or not href.lower().endswith(".pdf"):
                continue
            url = urllib.parse.urljoin(page, href)
            if url in seen:
                continue
            seen.add(url)
            cat = next((c for c in CATEGORIES if label.lower().startswith(c.lower())), None)
            date = re.search(r"\((\d{2})\.(\d{2})\.(\d{4})\)", label)
            sort_key = f"{date.group(3)}{date.group(2)}{date.group(1)}" if date else "0"
            out.append({"url": url, "label": label, "category": cat, "date": sort_key})
    return out


def edition_short(label: str) -> str:
    m = re.search(r"Edition\s+(\d+/\d+)", label)
    d = re.search(r"\((\d{2}\.\d{2}\.\d{4})\)", label)
    return " ".join(x for x in [m.group(1) if m else None, d.group(1) if d else None] if x)


def load_registry() -> dict:
    if os.path.exists(OUT):
        try:
            return json.load(open(OUT, encoding="utf-8"))
        except Exception:
            pass
    return {"meta": {}, "players": {}}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--categories", default=",".join(CATEGORIES))
    ap.add_argument("--max-per-category", type=int, default=4)
    ap.add_argument("--stop-after", type=int, default=2,
                    help="σταμάτα μια κατηγορία μετά από τόσα συνεχόμενα αρχεία χωρίς νέα IDs")
    ap.add_argument("--refresh", action="store_true", help="ξανά κατέβασμα των PDF")
    ap.add_argument("--rebuild", action="store_true",
                    help="ξεκίνα από άδειο μητρώο (χρήσιμο όταν αλλάζει ο κανόνας σύγκρουσης)")
    ap.add_argument("--extra", action="append", default=[],
                    help="επιπλέον PDF (URL ή διαδρομή) πέρα από το ευρετήριο — π.χ. νεότερη έκδοση")
    ap.add_argument("--min-id-coverage", type=float, default=0.5,
                    help="αν το PDF δεν βγάζει τουλάχιστον τόσες γραμμές ανά σελίδα, θεωρείται αποτυχία")
    args = ap.parse_args()

    cats = [c.strip() for c in args.categories.split(",") if c.strip()]
    links = [l for l in collect_links() if l["category"] in cats]
    os.makedirs(CACHE, exist_ok=True)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)

    reg = load_registry()
    players: dict[str, dict] = {} if args.rebuild else (reg.get("players") or {})
    before = len(players)
    print(f"μητρώο πριν: {before} IDs · αρχεία προς εξέταση: {len(links)}")
    sources: dict[str, dict] = {s["url"]: s for s in (reg.get("meta", {}).get("sources") or [])}
    read_now = 0

    def merge_rows(rows: list[dict], label: str, fresh: bool = False) -> int:
        """Προσθέτει γραμμές στο μητρώο. Επιστρέφει πόσα νέα IDs προστέθηκαν.

        fresh=True (νεότερη έκδοση): το όνομα της UMB υπερισχύει του παλιότερου.
        """
        new = 0
        for r in rows:
            pid = r["umb_id"]
            if pid not in players:
                players[pid] = {"umb_id": pid, "name": r["name"], "fed": r["fed"], "editions": [label]}
                new += 1
            else:
                p = players[pid]
                # Ίδιο ID, άλλο επώνυμο => η λίστα της UMB έχει διπλοεγγραφή (το είδαμε: 3185
                # δίνεται και σε KNUDSEN Thomas [DK] και σε EGGERS Jens [DE]). Δεν διαλέγουμε —
                # καταγράφουμε τη σύγκρουση και το ID δεν χρησιμοποιείται αυτόματα.
                if _surname(r["name"]) != _surname(p["name"]):
                    conf = p.setdefault("conflicts", [])
                    if not any(_surname(a["name"]) == _surname(r["name"]) and a.get("fed") == r["fed"]
                               for a in conf):
                        conf.append({"name": r["name"], "fed": r["fed"], "source": label})
                    continue
                if fresh and r["name"]:
                    p["name"] = r["name"]
                if r["fed"] and not p.get("fed"):
                    p["fed"] = r["fed"]
                if r["fed"] and p.get("fed") and r["fed"] != p["fed"]:
                    alt = p.get("fed_alt")
                    if not isinstance(alt, set):
                        alt = set(alt or [])
                        p["fed_alt"] = alt
                    alt.add(r["fed"])
                eds = p.setdefault("editions", [])
                if label not in eds and len(eds) < 6:
                    eds.append(label)
        return new

    for cat in cats:
        files = sorted([l for l in links if l["category"] == cat], key=lambda l: l["date"], reverse=True)
        empty_run = 0
        print(f"\n=== {cat}: {len(files)} αρχεία στο ευρετήριο")
        for i, f in enumerate(files[: args.max_per_category], 1):
            name = os.path.basename(f["url"])
            path = os.path.join(CACHE, name)
            if args.refresh or not os.path.exists(path):
                try:
                    data = get(f["url"], timeout=180)
                    open(path, "wb").write(data)
                except Exception as e:  # δίκτυο/404: το αρχείο χάνεται, η ροή συνεχίζει
                    print(f"  {i:2d}. {edition_short(f['label']) or name:24s} ✗ λήψη: {e}")
                    continue
            try:
                rows, st = parse_ranking_pdf(path)
            except Exception as e:
                print(f"  {i:2d}. {edition_short(f['label']) or name:24s} ✗ ανάγνωση: {e}")
                continue
            if not rows or len(rows) < args.min_id_coverage * st.get("pages", 1):
                print(f"  {i:2d}. {edition_short(f['label']) or name:24s} ✗ ύποπτο: {st}")
                continue
            new = merge_rows(rows, edition_short(f["label"]) or name, fresh=(i == 1))
            sources[f["url"]] = {"url": f["url"], "label": f["label"], "category": cat,
                                 "rows": len(rows), "new_ids": new, "added_at": time.strftime("%Y-%m-%d")}
            read_now += 1
            print(f"  {i:2d}. {edition_short(f['label']) or name:24s} γραμμές={len(rows):5d} νέα={new:4d} σύνολο={len(players)}")
            empty_run = empty_run + 1 if new == 0 else 0
            if empty_run >= args.stop_after:
                print(f"      -> διακοπή κατηγορίας ({empty_run} αρχεία χωρίς νέα IDs)")
                break

    # Επιπλέον αρχεία (URL ή τοπικό PDF): χρήσιμο για έκδοση που έχει βγει αλλά δεν είναι
    # ακόμη στο ευρετήριο — π.χ. ένα PDF που μας έστειλαν ή το νεότερο της αρχικής σελίδας.
    for i, extra in enumerate(args.extra, 1):
        label = f"extra {os.path.basename(extra)}"
        if extra.lower().startswith("http"):
            name = os.path.basename(extra.split("?")[0]) or f"extra-{i}.pdf"
            path = os.path.join(CACHE, name)
            if args.refresh or not os.path.exists(path):
                open(path, "wb").write(get(extra, timeout=180))
        else:
            path = extra
        rows, st = parse_ranking_pdf(path)
        new = merge_rows(rows, label, fresh=True)
        sources[extra] = {"url": extra, "label": label, "category": "extra",
                          "rows": len(rows), "new_ids": new, "added_at": time.strftime("%Y-%m-%d")}
        read_now += 1
        print(f"  extra {i}. {os.path.basename(path):24s} γραμμές={len(rows):5d} νέα={new:4d} σύνολο={len(players)}")

    # sets -> λίστες, για να είναι το JSON καθαρό
    for p in players.values():
        if isinstance(p.get("fed_alt"), set):
            p["fed_alt"] = sorted(p["fed_alt"])
    payload = {"meta": {"generated_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
                        "index_pages": INDEX_PAGES, "categories": cats,
                        "count": len(players), "files_read_this_run": read_now,
                        "conflicts": {k: v.get("conflicts") for k, v in players.items() if v.get("conflicts")},
                        "sources": sorted(sources.values(), key=lambda s: s["label"])},
               "players": players}
    json.dump(payload, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    feds = {}
    for p in players.values():
        feds[p.get("fed") or "?"] = feds.get(p.get("fed") or "?", 0) + 1
    print(f"\nμητρώο: {before} -> {len(players)} IDs · γράφτηκε {os.path.relpath(OUT, HERE)}")
    nconf = sum(1 for v in players.values() if v.get("conflicts"))
    print(f"  διπλά IDs με άλλο επώνυμο (μπαίνουν σε έλεγχο, δεν γεμίζουν μόνα τους): {nconf}")
    print("  χώρες:", ", ".join(f"{k}:{v}" for k, v in sorted(feds.items(), key=lambda kv: -kv[1])[:14]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
