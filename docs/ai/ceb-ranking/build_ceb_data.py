"""Build the JSON the frontend serves, from the parsed CEB PDF.

Pipeline:  parse_final.py  ->  ceb16_clean.json  ->  build_ceb_data.py  ->  public/data/ceb-ranking/*.json

    uv run --python 3.12 python build_ceb_data.py

The output lives in the frontend's public/ dir so the (later) daily importer can
rewrite it on the server without a rebuild. Event hrefs point at the canonical
tournament pages (verified live: 200, no documentId prefix).
"""
import datetime, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.abspath(os.path.join(HERE, "..", "..", "..", "public", "data", "ceb-ranking"))

# JSON event keys are always A..J (column order in the official PDF).
EVENTS = [
    {"key": "A", "short": "EC", "name": "European Championship 3-Cushion Individual",
     "city": "Antalya (TR)", "date": "2026-03-15", "scale": [80, 54, 38, 26, 16, 8, 4],
     "href": "/tournaments/european-championship-3-cushion-individual-2026", "ours": True},
    {"key": "B", "short": "Nat 24/25", "name": "National Championships — Season 2024/2025", "city": None,
     "date": None, "scale": [40, 27, 19, 13, 8, 4], "href": None, "ours": False,
     "note": "Points awarded by each national federation."},
    {"key": "C", "short": "Nat 25/26", "name": "National Championships — Season 2025/2026", "city": None,
     "date": None, "scale": [40, 27, 19, 13, 8, 4], "href": None, "ours": False,
     "note": "Points awarded by each national federation."},
    {"key": "D", "short": "Nat 26/27", "name": "National Championships — Season 2026/2027", "city": None,
     "date": None, "scale": [40, 27, 19, 13, 8, 4], "href": None, "ours": False,
     "note": "Points awarded by each national federation."},
    {"key": "E", "short": "Ankara 25", "name": "UMB / CEB World Cup — Ankara (TR)", "city": "Ankara (TR)",
     "date": "2025-06-15", "scale": [40, 27, 19, 13, 8, 4, 2],
     "href": "/tournaments/world-cup-3-cushion-ankara-2025", "ours": True},
    {"key": "F", "short": "Porto 25", "name": "UMB / CEB World Cup — Porto (PT)", "city": "Porto (PT)",
     "date": "2025-07-05", "scale": [40, 27, 19, 13, 8, 4, 2],
     "href": "/tournaments/world-cup-3-cushion-porto-2025", "ours": True},
    {"key": "G", "short": "Antwerp 25", "name": "UMB / CEB World Cup — Antwerp (BE)", "city": "Antwerp (BE)",
     "date": "2025-10-12", "scale": [40, 27, 19, 13, 8, 4, 2],
     "href": "/tournaments/world-cup-3-cushion-antwerp-2025", "ours": True},
    {"key": "H", "short": "Ankara 26", "name": "UMB / CEB World Cup — Ankara (TR)", "city": "Ankara (TR)",
     "date": "2026-06-14", "scale": [40, 27, 19, 13, 8, 4, 2],
     "href": "/tournaments/world-cup-3-cushion-ankara-2026", "ours": True},
    {"key": "I", "short": "Porto 26", "name": "UMB / CEB World Cup — Porto / Matosinhos (PT)",
     "city": "Porto / Matosinhos (PT)", "date": "2026-07-18", "scale": [40, 27, 19, 13, 8, 4, 2],
     "href": "/tournaments/world-cup-3-cushion-porto-matosinhos-2026", "ours": True},
    {"key": "J", "short": "Lier 26", "name": "UMB / CEB World Cup — Lier (BE)", "city": "Lier (BE)",
     "date": "2026-09-06", "scale": [40, 27, 19, 13, 8, 4, 2],
     "href": "/tournaments/world-cup-3-cushion-lier-2026", "ours": True},
]

FEDERATIONS = {
    "AL": "Albania", "AT": "Austria", "BE": "Belgium", "CH": "Switzerland", "CY": "Cyprus",
    "CZ": "Czechia", "DE": "Germany", "DK": "Denmark", "ES": "Spain", "FI": "Finland",
    "FR": "France", "GR": "Greece", "HR": "Croatia", "HU": "Hungary", "IT": "Italy",
    "LU": "Luxembourg", "NL": "Netherlands", "NO": "Norway", "PL": "Poland", "PT": "Portugal",
    "SE": "Sweden", "TR": "Türkiye", "VN": "Vietnam",
}

META = {
    "slug": "3c-individual",
    "title": "3-Cushion Individual",
    "discipline": "3-Cushion",
    "categoryLabel": "Individual — Men",
    "edition": "16/2026",
    "updatedAt": "2026-09-06",
    "lastEvent": "UMB / CEB World Cup — Lier (BE), 6 September 2026",
    "sourceUrl": "https://www.eurobillard.org/medias/rankings/ceb-ranking-2026-v16.pdf",
    "sourcePage": "https://www.eurobillard.org/pages/rankings-42.html",
    "sourceLabel": "CEB Ranking 3C Individual",
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


def iso(value: str | None) -> str | None:
    if not value:
        return None
    m = re.fullmatch(r"(\d{1,2})\.(\d{1,2})\.(\d{4})", value.strip())
    if not m:
        return None
    d, mo, y = (int(g) for g in m.groups())
    return f"{y:04d}-{mo:02d}-{d:02d}"


def main() -> None:
    src = json.load(open(os.path.join(HERE, "ceb16_clean.json"), encoding="utf-8"))
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

    feds = sorted({row["fed"] for row in rows})
    missing = [f for f in feds if f not in FEDERATIONS]
    if missing:
        raise SystemExit(f"unknown federation codes: {missing}")

    payload = dict(META)
    payload.update({
        "generatedAt": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "counts": {
            "players": len(rows),
            "federations": len(feds),
            "suspended": sum(1 for row in rows if row["suspended"]),
        },
        "events": EVENTS,
        "federations": {f: FEDERATIONS[f] for f in feds},
        "rows": rows,
    })

    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, f"{META['slug']}.json")
    json.dump(payload, open(path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

    index = {
        "sourcePage": META["sourcePage"],
        "generatedAt": payload["generatedAt"],
        "available": [{
            "slug": META["slug"], "title": META["title"], "discipline": META["discipline"],
            "categoryLabel": META["categoryLabel"], "edition": META["edition"],
            "updatedAt": META["updatedAt"], "players": payload["counts"]["players"],
            "federations": payload["counts"]["federations"], "suspended": payload["counts"]["suspended"],
            "href": f"/rankings/ceb/{META['slug']}", "sourceUrl": META["sourceUrl"],
        }],
        "upcoming": UPCOMING,
    }
    json.dump(index, open(os.path.join(OUT_DIR, "index.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    print(f"written {path} ({os.path.getsize(path) / 1024:.1f} KB)")
    print("counts:", payload["counts"], "| feds:", len(feds))
    print("suspended rows:", [(r["rank"], r["name"], r["suspended"]) for r in rows if r["suspended"]])
    print("zero-point rows:", sum(1 for r in rows if r["points"] == 0))
    print("rows with any event points:", sum(1 for r in rows if any(v for v in r["ev"] if v)))


if __name__ == "__main__":
    main()
