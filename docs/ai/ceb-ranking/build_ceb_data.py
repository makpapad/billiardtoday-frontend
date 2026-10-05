"""Build the JSON the frontend serves, from the parsed CEB PDF.

Pipeline:  parse_final.py  ->  ceb16_clean.json  ->  build_ceb_data.py  ->  public/data/ceb-ranking/*.json

    uv run --python 3.12 python build_ceb_data.py             # την τρέχουσα έκδοση (editions/16-2026.json)
    uv run --python 3.12 python build_ceb_data.py 15-2026     # μόνο αρχειοθέτηση παλιότερης έκδοσης

Κάθε έκδοση περιγράφεται σε δικό της αρχείο `editions/<key>.json` (meta + events + το clean JSON
που παρήγαγε ο parser). Το build γράφει:

* `public/data/ceb-ranking/<slug>.json` + `index.json` — μόνο για την έκδοση με `"live": true`
  (το ζωντανό ranking που σερβίρει το site),
* `public/data/ceb-ranking/archive/<slug>/<key>.json` + `archive/<slug>/index.json` — **πάντα**, ώστε
  μια νέα έκδοση να μην σβήνει την προηγούμενη (το rankings archive του site).

Το output μένει στο public/ ώστε ο (μελλοντικός) daily importer να το ξαναγράφει στον server χωρίς
rebuild· οι σελίδες κάνουν revalidate κάθε 5 λεπτά. Τα hrefs των events δείχνουν στις κανονικές σελίδες
τουρνουά (ελεγμένα live: 200, χωρίς documentId prefix).
"""
import datetime, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.abspath(os.path.join(HERE, "..", "..", "..", "public", "data", "ceb-ranking"))
ARCHIVE_DIR = os.path.join(OUT_DIR, "archive")
EDITIONS_DIR = os.path.join(HERE, "editions")

# Η έκδοση που σερβίρεται τώρα, όταν το script τρέξει χωρίς όρισμα.
LIVE_KEY = "16-2026"

FEDERATIONS = {
    "AL": "Albania", "AT": "Austria", "BE": "Belgium", "CH": "Switzerland", "CY": "Cyprus",
    "CZ": "Czechia", "DE": "Germany", "DK": "Denmark", "ES": "Spain", "FI": "Finland",
    "FR": "France", "GR": "Greece", "HR": "Croatia", "HU": "Hungary", "IT": "Italy",
    "LU": "Luxembourg", "NL": "Netherlands", "NO": "Norway", "PL": "Poland", "PT": "Portugal",
    "SE": "Sweden", "TR": "Türkiye", "VN": "Vietnam",
}

UPCOMING = [
    {"title": "3-Cushion Ladies", "file": "ceb-ladies-rank-2026-v12.pdf"},
    {"title": "3-Cushion National Teams", "file": "ranking-3c-national-teams-15-03-2026-antalya.pdf"},
    {"title": "3-Cushion Ladies National Teams", "file": "ranking-3c-ladies-national-teams-15-03-2026-antalya.pdf"},
    {"title": "5-Pins National Teams", "file": "european-ranking-national-teams-5pins-updated-15-03-2026.pdf"},
    {"title": "Artistic — Individual", "file": "ceb-ranking-billiard-artistic-2026-09-05.pdf"},
    {"title": "Artistic — National Teams", "file": "ceb-ranking-billiard-artistic-nt-2026-03-13.pdf"},
    {"title": "Cadre 47/2", "file": "ceb-ranking-cadre-47-2-2026-v04-4-9-2026.pdf"},
    {"title": "Cadre 71/2", "file": "ceb-ranking-cadre-71-2-2026-v04-6-9-2026.pdf"},
    {"title": "1-Cushion", "file": "ceb-ranking-1-cushion-2026-v04-5-9-2026.pdf"},
    {"title": "Longoni Next Gen 3-Cushion U21 2025/26", "file": "longoni-next-gen-ranking-3c-u21-25-26-final.pdf"},
    {"title": "Longoni Next Gen 3-Cushion U21 2024/25", "file": "longoni-next-gen-ranking-3c-u21-24-25-final.pdf"},
    {"title": "Longoni Next Gen 3-Cushion U21 2023/24", "file": "longoni-next-gen-ranking-3c-u21-23-24-final.pdf"},
    {"title": "Longoni Next Gen 3-Cushion U21 2022/23", "file": "longoni-next-gen-ranking-3c-u21-22-23.pdf"},
    {"title": "Longoni Next Gen 5-Pins U21 2022/23", "file": "longoni-next-gen-ranking-5p-u21-22-23.pdf"},
]


def now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def iso(value: str | None) -> str | None:
    if not value:
        return None
    m = re.fullmatch(r"(\d{1,2})\.(\d{1,2})\.(\d{4})", value.strip())
    if not m:
        return None
    d, mo, y = (int(g) for g in m.groups())
    return f"{y:04d}-{mo:02d}-{d:02d}"


def edition_key(edition: str) -> str:
    """«16/2026» -> «16-2026» (κλειδί αρχείου/URL)."""
    return edition.strip().replace("/", "-")


def season_sort(edition: str) -> tuple[int, int]:
    m = re.fullmatch(r"(\d{1,2})/(\d{4})", (edition or "").strip())
    return (int(m.group(2)), int(m.group(1))) if m else (0, 0)


def load_edition(key: str) -> dict:
    path = os.path.join(EDITIONS_DIR, f"{key}.json")
    if not os.path.exists(path):
        raise SystemExit(f"missing edition config: {path}")
    cfg = json.load(open(path, encoding="utf-8"))
    for field in ("meta", "events", "clean"):
        if not cfg.get(field):
            raise SystemExit(f"edition config {path} needs a non-empty '{field}'")
    if edition_key(cfg["meta"]["edition"]) != key:
        raise SystemExit(f"edition config {path}: meta.edition does not match the file name ({key})")
    return cfg


def build_rows(src: list) -> list:
    rows = []
    for r in sorted(src, key=lambda x: x["rank"]):
        ev = [r["ev"].get(c) for c in "ABCDEFGHIJ"]
        rows.append({
            "rank": r["rank"],
            "name": r["name"].strip(),
            "fed": r["fed"],
            "points": r["Pnts"] or 0,
            "ev": ev,
            "suspended": iso(r["dates"][0]) if r["dates"] else None,
        })
    return rows


def write_archive(payload: dict) -> int:
    """Αντίγραφο της έκδοσης + ενημέρωση του index του αρχείου. Επιστρέφει το πλήθος εκδόσεων."""
    slug = payload["slug"]
    key = edition_key(payload["edition"])
    out = os.path.join(ARCHIVE_DIR, slug)
    os.makedirs(out, exist_ok=True)

    snapshot = dict(payload)
    snapshot["editionKey"] = key
    snapshot["archivedAt"] = now_iso()
    snapshot_path = os.path.join(out, f"{key}.json")
    json.dump(snapshot, open(snapshot_path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

    index_path = os.path.join(out, "index.json")
    index = {"slug": slug, "title": payload["title"], "generatedAt": payload["generatedAt"], "editions": []}
    if os.path.exists(index_path):
        try:
            index = json.load(open(index_path, encoding="utf-8"))
        except (ValueError, OSError):
            index = {"slug": slug, "title": payload["title"], "generatedAt": payload["generatedAt"], "editions": []}

    entry = {
        "key": key,
        "edition": payload["edition"],
        "updatedAt": payload["updatedAt"],
        "archivedAt": snapshot["archivedAt"],
        "players": payload["counts"]["players"],
        "federations": payload["counts"]["federations"],
        "suspended": payload["counts"]["suspended"],
        "sourceUrl": payload["sourceUrl"],
    }
    editions = [e for e in index.get("editions", []) if e.get("key") != key]
    editions.append(entry)
    editions.sort(key=lambda e: season_sort(e.get("edition", "")), reverse=True)

    index.update({
        "slug": slug,
        "title": payload["title"],
        "generatedAt": payload["generatedAt"],
        "editions": editions,
    })
    json.dump(index, open(index_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"archive: {len(editions)} edition(s) · written {snapshot_path}")
    return len(editions)


def main() -> None:
    key = sys.argv[1] if len(sys.argv) > 1 else LIVE_KEY
    cfg = load_edition(key)
    meta, events = cfg["meta"], cfg["events"]

    src = json.load(open(os.path.join(HERE, cfg["clean"]), encoding="utf-8"))
    rows = build_rows(src)

    feds = sorted({row["fed"] for row in rows})
    missing = [f for f in feds if f not in FEDERATIONS]
    if missing:
        raise SystemExit(f"unknown federation codes: {missing}")

    payload = dict(meta)
    payload.update({
        "generatedAt": now_iso(),
        "counts": {
            "players": len(rows),
            "federations": len(feds),
            "suspended": sum(1 for row in rows if row["suspended"]),
        },
        "events": events,
        "federations": {f: FEDERATIONS[f] for f in feds},
        "rows": rows,
    })

    os.makedirs(OUT_DIR, exist_ok=True)

    if cfg.get("live"):
        path = os.path.join(OUT_DIR, f"{payload['slug']}.json")
        json.dump(payload, open(path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

        index = {
            "sourcePage": payload["sourcePage"],
            "generatedAt": payload["generatedAt"],
            "available": [{
                "slug": payload["slug"], "title": payload["title"], "discipline": payload["discipline"],
                "categoryLabel": payload["categoryLabel"], "edition": payload["edition"],
                "updatedAt": payload["updatedAt"], "players": payload["counts"]["players"],
                "federations": payload["counts"]["federations"], "suspended": payload["counts"]["suspended"],
                "href": f"/rankings/ceb/{payload['slug']}", "sourceUrl": payload["sourceUrl"],
            }],
            "upcoming": UPCOMING,
        }
        json.dump(index, open(os.path.join(OUT_DIR, "index.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print(f"written {path} ({os.path.getsize(path) / 1024:.1f} KB)")
    else:
        print(f"edition {payload['edition']} is archived only (live: false) — το ζωντανό αρχείο δεν άλλαξε")

    write_archive(payload)

    print("counts:", payload["counts"], "| feds:", len(feds))
    print("suspended rows:", [(r["rank"], r["name"], r["suspended"]) for r in rows if r["suspended"]])
    print("zero-point rows:", sum(1 for r in rows if r["points"] == 0))
    print("rows with any event points:", sum(1 for r in rows if any(v for v in r["ev"] if v)))


if __name__ == "__main__":
    main()
