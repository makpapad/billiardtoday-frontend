#!/usr/bin/env python3
"""
Τεχνικός έλεγχος SEO (read-only, stdlib-only) για το billiardtoday.com.

Αρχές ασφάλειας που επιβάλλονται από τον κώδικα (όχι από την πειθαρχία του χρήστη):
  * concurrency: default 2 workers, σκληρό όριο 4 (HARD_WORKERS).
  * throttle: έναρξη request κάθε --min-interval δευτ. (default 1.0) — global, όχι per-worker.
  * όρια: --max-pages (default 40) και --time-budget (default 420s).
  * βαριές ομάδες (/players/, /rankings/, /clubs/) ΜΠΛΟΚΑΡΟΝΤΑΙ εξ ορισμού: κάθε τέτοια σελίδα
    καλεί /api/bt-players/participations-by (μετρημένο 5.8-8.7s στη Strapi) και ζορίζει παραγωγή.
  * μόνο GET, χωρίς cookies/login/POST — καμία εγγραφή στο site.
  * πλήρες σώμα sitemap (χωρίς truncation) + έλεγχος σταθερότητας μεταξύ λήψεων.

Χρήση (ασφαλές προεπιλεγμένο):
  python audit.py --site https://billiardtoday.com
Γράφει: reports/<timestamp>-audit.json  και  reports/<timestamp>-audit.md (ελληνικά).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import random
import re
import statistics
import sys
import threading
import time
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, unquote, urlparse, urlsplit, urlunsplit
from urllib.request import Request, urlopen

UA = "BilliardToday-SEO-Audit/2.0 (read-only, throttled; +https://billiardtoday.com)"
HARD_WORKERS = 4            # σκληρό όριο concurrency ανεξάρτητα από --workers
MAX_BODY = 6_000_000        # όριο σώματος (bytes) — αρκετά για sitemap 707KB, όχι truncation
HEAVY_GROUPS = ("players", "rankings", "clubs")

TAG = re.compile(r"<[^>]+>")
SCRIPT = re.compile(r"<(script|style|noscript)\b.*?</\1>", re.S | re.I)
TITLE = re.compile(r"<title[^>]*>(.*?)</title>", re.S | re.I)
META = re.compile(r"<meta\b[^>]*>", re.I)
LINK = re.compile(r"<link\b[^>]*>", re.I)
ANCHOR = re.compile(r"<a\b[^>]*href=[\"']([^\"']+)[\"']", re.I)
H1 = re.compile(r"<h1\b[^>]*>(.*?)</h1>", re.S | re.I)
JSONLD = re.compile(r"<script[^>]+type=[\"']application/ld\+json[\"'][^>]*>(.*?)</script>", re.S | re.I)
HTML_LANG = re.compile(r"<html\b[^>]*\blang=[\"']([^\"']+)[\"']", re.I)
LOC = re.compile(r"<loc>\s*([^<\s]+)\s*</loc>")


# --------------------------------------------------------------------------- #
# throttling
# --------------------------------------------------------------------------- #
class Throttle:
    """Ελάχιστο διάστημα μεταξύ ενάρξεων request, κοινό για όλους τους workers."""

    def __init__(self, min_interval: float) -> None:
        self.min_interval = max(0.0, float(min_interval))
        self._lock = threading.Lock()
        self._next_at = 0.0
        self.requests = 0

    def wait(self) -> None:
        if self.min_interval <= 0:
            return
        with self._lock:
            now = time.monotonic()
            start_at = max(now, self._next_at)
            self._next_at = start_at + self.min_interval
            delay = start_at - now
        if delay > 0:
            time.sleep(delay)
        with self._lock:
            self.requests += 1


# --------------------------------------------------------------------------- #
# HTTP
# --------------------------------------------------------------------------- #
def encode_url(url: str) -> str:
    """Μη-ASCII διαδρομές (π.χ. 'Andrés') → percent-encoding για το urllib."""
    p = urlsplit(url)
    return urlunsplit((p.scheme, p.netloc, quote(p.path, safe="/%"), quote(p.query, safe="=&%?+"), ""))


def fetch(url: str, throttle: Throttle, timeout: float = 45.0, retries: int = 1) -> dict:
    attempts: list[int] = []
    last_err = None
    for i in range(retries + 1):
        throttle.wait()
        t0 = time.time()
        try:
            req = Request(encode_url(url), headers={"User-Agent": UA, "Accept": "text/html,application/xml,*/*"})
            with urlopen(req, timeout=timeout) as resp:
                raw = resp.read(MAX_BODY)
                headers = {k.lower(): v for k, v in resp.headers.items()}
                attempts.append(int((time.time() - t0) * 1000))
                return {"url": url, "status": resp.status, "final": resp.geturl(), "bytes": len(raw),
                        "ms": attempts[-1], "html": raw.decode("utf-8", "ignore"), "headers": headers,
                        "attempts": attempts}
        except HTTPError as exc:
            ms = int((time.time() - t0) * 1000)
            attempts.append(ms)
            body = b""
            try:
                body = exc.read(MAX_BODY)
            except Exception:  # noqa: BLE001
                pass
            return {"url": url, "status": exc.code, "final": url, "bytes": len(body), "ms": ms,
                    "html": body.decode("utf-8", "ignore"),
                    "headers": {k.lower(): v for k, v in (exc.headers or {}).items()},
                    "error": f"HTTP {exc.code}", "attempts": attempts}
        except (URLError, TimeoutError, OSError, Exception) as exc:  # noqa: BLE001
            ms = int((time.time() - t0) * 1000)
            attempts.append(ms)
            last_err = f"{type(exc).__name__}: {exc}"
            if i < retries:
                time.sleep(2.0)
    return {"url": url, "status": 0, "final": url, "bytes": 0,
            "ms": attempts[-1] if attempts else 0, "html": "", "headers": {},
            "error": last_err, "attempts": attempts}


# --------------------------------------------------------------------------- #
# parsing
# --------------------------------------------------------------------------- #
def attr(tag: str, name: str) -> str | None:
    m = re.search(rf"\b{name}\s*=\s*[\"']([^\"']*)[\"']", tag, re.I)
    return m.group(1).strip() if m else None


def norm_url(url: str) -> str:
    """Κανονικοποίηση για σύγκριση: decode, χωρίς trailing slash, host πεζά."""
    if not url:
        return ""
    p = urlsplit(url.strip())
    path = unquote(p.path or "/").rstrip("/") or "/"
    return f"{p.scheme.lower()}://{(p.netloc or '').lower()}{path}"


def visible_text(html: str) -> str:
    return re.sub(r"\s+", " ", TAG.sub(" ", SCRIPT.sub(" ", html))).strip()


def analyse(page: dict, site_host: str) -> dict:
    html = page["html"]
    text = visible_text(html)
    title_m = TITLE.search(html)
    title = re.sub(r"\s+", " ", TAG.sub(" ", title_m.group(1))).strip() if title_m else None

    desc = canonical = robots = og_image = og_title = og_desc = None
    for tag in META.findall(html):
        name = (attr(tag, "name") or attr(tag, "property") or "").lower()
        content = attr(tag, "content")
        if name == "description" and desc is None:
            desc = content
        elif name == "robots" and robots is None:
            robots = content
        elif name == "og:image" and og_image is None:
            og_image = content
        elif name == "og:title" and og_title is None:
            og_title = content
        elif name == "og:description" and og_desc is None:
            og_desc = content

    hreflang: list[str] = []
    for tag in LINK.findall(html):
        rel = (attr(tag, "rel") or "").lower()
        if rel == "canonical" and canonical is None:
            canonical = attr(tag, "href")
        elif rel == "alternate":
            hl = attr(tag, "hreflang")
            if hl:
                hreflang.append(hl.lower())

    xrobots = (page.get("headers") or {}).get("x-robots-tag")
    if xrobots and not robots:
        robots = xrobots

    hrefs = ANCHOR.findall(html)
    internal = [h for h in hrefs if (h.startswith("/") or site_host in h)
                and not h.startswith(("#", "javascript:", "mailto:", "tel:"))]
    player_links = {h for h in hrefs if "/players/" in h}

    ld_types: list[str] = []
    ld_broken = 0
    for block in JSONLD.findall(html):
        try:
            data = json.loads(block.strip())
        except Exception:  # noqa: BLE001
            ld_broken += 1
            continue
        stack = [data]
        while stack:
            node = stack.pop()
            if isinstance(node, list):
                stack.extend(node)
            elif isinstance(node, dict):
                t = node.get("@type")
                if t:
                    ld_types.extend(t if isinstance(t, list) else [t])
                for v in node.values():
                    if isinstance(v, (dict, list)):
                        stack.append(v)

    h1s = [re.sub(r"\s+", " ", TAG.sub(" ", h)).strip() for h in H1.findall(html)]
    lang_m = HTML_LANG.search(html)
    final = page["final"]

    return {
        "url": page["url"],
        "group": urlparse(page["url"]).path.strip("/").split("/")[0] or "(root)",
        "status": page["status"],
        "final": final,
        "redirected": norm_url(final) != norm_url(page["url"]),
        "ms": page["ms"],
        "html_kb": round(page["bytes"] / 1024),
        "text_chars": len(text),
        "title": title,
        "title_len": len(title) if title else 0,
        "description": desc,
        "description_len": len(desc) if desc else 0,
        "canonical": canonical,
        "canonical_mismatch": bool(canonical) and bool(final) and norm_url(canonical) != norm_url(final),
        "robots": robots,
        "noindex": bool(robots and "noindex" in robots.lower()),
        "lang": lang_m.group(1).strip() if lang_m else None,
        "hreflang": sorted(set(hreflang)),
        "h1_count": len(h1s),
        "h1": h1s[0] if h1s else None,
        "jsonld_types": sorted(set(ld_types)),
        "jsonld_broken": ld_broken,
        "internal_links": len(internal),
        "unique_internal_links": len(set(internal)),
        "player_links": len(player_links),
        "og_image": bool(og_image),
        "og_title": bool(og_title),
        "og_description": bool(og_desc),
        "error": page.get("error"),
        "bytes": page["bytes"],
        "attempts": page.get("attempts"),
    }


# --------------------------------------------------------------------------- #
# sitemap
# --------------------------------------------------------------------------- #
def load_sitemap(site: str, throttle: Throttle, fetches: int = 2) -> dict:
    """Φορτώνει ΟΛΟ το sitemap και ελέγχει σταθερότητα μεταξύ διαδοχικών λήψεων."""
    runs: list[dict] = []
    urls: list[str] = []
    for i in range(max(1, fetches)):
        page = fetch(f"{site}/sitemap.xml", throttle)
        locs = LOC.findall(page["html"])
        is_index = "<sitemapindex" in page["html"]
        runs.append({"attempt": i + 1, "status": page["status"], "ms": page["ms"], "bytes": page["bytes"],
                     "locs": len(locs), "sitemapindex": is_index,
                     "sha256_16": hashlib.sha256(page["html"].encode()).hexdigest()[:16],
                     "error": page.get("error")})
        if i == 0 and page["status"] == 200:
            if is_index:
                for sub in locs[:20]:
                    urls.extend(LOC.findall(fetch(sub, throttle)["html"]))
            else:
                urls = list(locs)

    url_list = sorted(set(urls))
    groups = Counter(urlparse(u).path.strip("/").split("/")[0] or "(root)" for u in url_list)
    return {
        "total": len(url_list), "duplicates": len(urls) - len(url_list),
        "groups": dict(sorted(groups.items(), key=lambda kv: -kv[1])),
        "runs": runs,
        "stable": len({r["locs"] for r in runs}) == 1 and len({r["sha256_16"] for r in runs}) == 1,
        "urls": url_list,
    }


def truncation_evidence(site: str, throttle: Throttle) -> dict:
    """Πόσα URLs «έχανε» το παλιό ανάγνωσμα των 400KB — απόδειξη για το 2216 vs 3798."""
    page = fetch(f"{site}/sitemap.xml", throttle)
    html = page["html"]
    full = len(LOC.findall(html))
    cut = len(LOC.findall(html[:400_000]))
    return {"sitemap_bytes": page["bytes"], "locs_full": full, "locs_at_400kb": cut,
            "lost_pct": round(100 * (full - cut) / full, 1) if full else 0}


# --------------------------------------------------------------------------- #
# selection
# --------------------------------------------------------------------------- #
STATIC_PATHS = ("/", "/tournaments", "/news", "/federations")
HEAVY_LANDINGS = ("/players", "/clubs", "/rankings")  # μπλοκάρονται μαζί με τις βαριές ομάδες


def pick(urls: list[str], site: str, caps: dict, seed: int, allow_heavy: bool,
         groups_filter: list[str] | None, max_pages: int) -> tuple[list[str], dict]:
    rnd = random.Random(seed)
    buckets: dict[str, list[str]] = defaultdict(list)
    for u in urls:
        head = urlparse(u).path.strip("/").split("/")[0] or "(root)"
        buckets["static" if head == "(root)" else head].append(u)

    skipped: dict[str, int] = {}
    chosen: list[str] = []
    for g in sorted(buckets):
        if groups_filter and g not in groups_filter and g != "static":
            skipped[g] = len(buckets[g])
            continue
        if g in HEAVY_GROUPS and not allow_heavy:
            skipped[g] = len(buckets[g])
            continue
        members = sorted(buckets[g])
        cap = caps.get(g, caps.get("*", 4))
        chosen.extend(members if len(members) <= cap else rnd.sample(members, cap))

    if not groups_filter or "static" in groups_filter:
        chosen.extend(f"{site}{p}" for p in STATIC_PATHS)
    if allow_heavy:
        chosen.extend(f"{site}{p}" for p in HEAVY_LANDINGS)

    seen, ordered = set(), []
    for u in chosen:
        k = norm_url(u)
        if k not in seen:
            seen.add(k)
            ordered.append(u)
    ordered.sort()
    return ordered[:max_pages], skipped


# --------------------------------------------------------------------------- #
# aggregation
# --------------------------------------------------------------------------- #
def build_findings(rows: list[dict], sitemap_total: int) -> dict:
    ok = [r for r in rows if r["status"] == 200]
    titles = Counter(r["title"] for r in ok if r["title"])
    descs = Counter(r["description"] for r in ok if r["description"])
    ms_all = [r["ms"] for r in rows]
    return {
        "status_counts": dict(Counter(r["status"] for r in rows)),
        "not_200": [{"url": r["url"], "status": r["status"], "ms": r["ms"], "error": r["error"]}
                    for r in rows if r["status"] != 200],
        "fetch_failures": [{"url": r["url"], "ms": r["ms"], "error": r["error"], "attempts": r["attempts"]}
                           for r in rows if r["status"] == 0],
        "redirects": [{"from": r["url"], "to": r["final"]} for r in rows if r["redirected"]],
        "missing_title": [r["url"] for r in ok if not r["title"]],
        "title_too_short": [{"url": r["url"], "len": r["title_len"], "title": r["title"]}
                            for r in ok if r["title_len"] and r["title_len"] < 15],
        "title_too_long": [{"url": r["url"], "len": r["title_len"], "title": r["title"]}
                           for r in ok if r["title_len"] > 60],
        "missing_description": [r["url"] for r in ok if not r["description"]],
        "description_too_long": [{"url": r["url"], "len": r["description_len"], "description": r["description"]}
                                 for r in ok if r["description_len"] > 160],
        "duplicate_titles": {t: n for t, n in titles.items() if n > 1},
        "duplicate_descriptions": {d[:90]: n for d, n in descs.items() if n > 1},
        "missing_canonical": [r["url"] for r in ok if not r["canonical"]],
        "canonical_mismatch": [{"url": r["url"], "canonical": r["canonical"], "final": r["final"]}
                               for r in ok if r["canonical_mismatch"]],
        "noindex": [r["url"] for r in ok if r["noindex"]],
        "lang_counts": dict(Counter(r["lang"] for r in ok)),
        "missing_hreflang": [{"url": r["url"], "lang": r["lang"]} for r in ok
                             if (r["lang"] or "").lower().startswith("en") and not r["hreflang"]],
        "hreflang_values": dict(Counter(h for r in ok for h in r["hreflang"])),
        "h1_problems": [{"url": r["url"], "h1_count": r["h1_count"], "h1": r["h1"]}
                        for r in ok if r["h1_count"] != 1],
        "no_jsonld": [r["url"] for r in ok if not r["jsonld_types"]],
        "jsonld_broken": [r["url"] for r in ok if r["jsonld_broken"] > 0],
        "jsonld_types": dict(Counter(t for r in ok for t in r["jsonld_types"])),
        "no_internal_links": [{"url": r["url"], "internal_links": r["internal_links"]}
                              for r in ok if r["internal_links"] == 0],
        "missing_og_title": [r["url"] for r in ok if not r["og_title"]],
        "missing_og_description": [r["url"] for r in ok if not r["og_description"]],
        "missing_og_image": [r["url"] for r in ok if not r["og_image"]],
        "thin_html": sorted([{"url": r["url"], "text_chars": r["text_chars"], "player_links": r["player_links"]}
                             for r in ok if r["text_chars"] < 1200], key=lambda x: x["text_chars"])[:40],
        "heavy_html": sorted([{"url": r["url"], "html_kb": r["html_kb"]} for r in ok if r["html_kb"] > 200],
                             key=lambda x: -x["html_kb"])[:15],
        "slow_pages": sorted([{"url": r["url"], "ms": r["ms"], "html_kb": r["html_kb"]}
                              for r in ok if r["ms"] > 3000], key=lambda x: -x["ms"])[:20],
        "latency": {"n": len(rows),
                    "median_ms": int(statistics.median(ms_all)) if ms_all else 0,
                    "p95_ms": sorted(ms_all)[max(0, int(len(ms_all) * 0.95) - 1)] if ms_all else 0,
                    "max_ms": max(ms_all, default=0)},
        "sitemap_total": sitemap_total,
        "coverage_pct": round(100 * len(rows) / sitemap_total, 2) if sitemap_total else 0,
    }


PRIORITY = [
    ("P1", "HTTP != 200 (σελίδες του sitemap που δεν σερβίρονται)", "not_200"),
    ("P1", "Αποτυχία fetch (status 0)", "fetch_failures"),
    ("P1", "canonical ≠ τελικό URL", "canonical_mismatch"),
    ("P1", "noindex σε σελίδα του sitemap", "noindex"),
    ("P1", "Διπλά titles", "duplicate_titles"),
    ("P1", "H1 πλήθος != 1", "h1_problems"),
    ("P1", "Σελίδα χωρίς εσωτερικά links", "no_internal_links"),
    ("P2", "Χωρίς title", "missing_title"),
    ("P2", "Χωρίς meta description", "missing_description"),
    ("P2", "Διπλές meta descriptions", "duplicate_descriptions"),
    ("P2", "Title > 60 χαρακτήρες", "title_too_long"),
    ("P2", "Title < 15 χαρακτήρες", "title_too_short"),
    ("P2", "Meta description > 160 χαρακτήρες", "description_too_long"),
    ("P2", "Χωρίς canonical", "missing_canonical"),
    ("P2", "Χωρίς hreflang ενώ lang=en", "missing_hreflang"),
    ("P2", "Χωρίς JSON-LD", "no_jsonld"),
    ("P2", "Χωρίς og:title", "missing_og_title"),
    ("P2", "Χωρίς og:description", "missing_og_description"),
    ("P3", "Χωρίς og:image", "missing_og_image"),
    ("P3", "Λεπτό κείμενο (<1200 χαρακτήρες)", "thin_html"),
    ("P3", "Βαρύ HTML (>200KB)", "heavy_html"),
    ("P3", "Redirect", "redirects"),
    ("P3", "Σπασμένο JSON-LD", "jsonld_broken"),
]


def count_of(value) -> int:
    return sum(value.values()) if isinstance(value, dict) else len(value)


# --------------------------------------------------------------------------- #
# markdown (ελληνικά)
# --------------------------------------------------------------------------- #
def write_markdown(path: Path, report: dict) -> None:
    s, f, sm = report["summary"], report["findings"], report["sitemap"]
    L: list[str] = [
        f"# Τεχνικός έλεγχος SEO — {s['site']}",
        "",
        f"- **Έλεγχος:** {s['checked_at']} UTC · {s['checked_at_local']} τοπική ώρα",
        f"- **Σελίδες:** {s['checked']} από {s['sitemap_urls']} URLs του sitemap "
        f"({f['coverage_pct']}% κάλυψη) σε {s['seconds']}s · {s['requests_made']} HTTP requests",
        f"- **Ρυθμός:** {s['workers']} workers, 1 request / {s['min_interval']}s, όριο {s['max_pages']} σελίδων",
        f"- **Λανθάνουσα (median / p95 / max):** {f['latency']['median_ms']} / {f['latency']['p95_ms']} / "
        f"{f['latency']['max_ms']} ms",
        "",
        "Read-only έλεγχος: μόνο GET, χωρίς JavaScript, χωρίς login, χωρίς εγγραφή. "
        "Μετριέται ό,τι βλέπει crawler στο αρχικό HTML.",
        "",
        "## Σύνοψη ελέγχων",
        "",
        "| Έλεγχος | Πλήθος |",
        "|---|---|",
    ]
    for prio, label, key in PRIORITY:
        L.append(f"| {prio} · {label} | {count_of(f.get(key, []))} |")

    L += ["", "## Κάλυψη ανά ομάδα", "", "| Ομάδα | URLs στο sitemap | Ελέγχθηκαν |", "|---|---|---|"]
    checked_groups = Counter("static" if r["group"] == "(root)" else r["group"] for r in report["pages"])
    for g, total in sm["groups"].items():
        gname = "static" if g == "(root)" else g
        L.append(f"| {gname} | {total} | {checked_groups.get(gname, 0)} |")
    if s.get("skipped_groups"):
        L += ["", "**Παραλείφθηκαν σκόπιμα (βαριά API):** " +
              ", ".join(f"{g} ({n} URLs)" for g, n in s["skipped_groups"].items())]

    L += ["", "## Sitemap", "",
          f"- Μέγεθος: {sm['runs'][0]['bytes']} bytes · URLs: **{sm['total']}** · διπλότυπα: {sm['duplicates']}",
          f"- Σταθερότητα σε {len(sm['runs'])} διαδοχικές λήψεις: "
          f"**{'σταθερό' if sm['stable'] else 'ΑΣΤΑΘΕΣ'}**",
          "", "| Λήψη | HTTP | ms | bytes | URLs | sha256 (16) |", "|---|---|---|---|---|---|"]
    for r in sm["runs"]:
        L.append(f"| {r['attempt']} | {r['status']} | {r['ms']} | {r['bytes']} | {r['locs']} | `{r['sha256_16']}` |")
    if report.get("truncation"):
        t = report["truncation"]
        L += ["", f"- Παγίδα 400KB: πλήρες sitemap = {t['locs_full']} URLs, ανάγνωση μόνο 400KB = "
                  f"{t['locs_at_400kb']} URLs (χάνονται {t['lost_pct']}%)."]

    for prio in ("P1", "P2", "P3"):
        items = [(label, key) for p, label, key in PRIORITY if p == prio and count_of(f.get(key, []))]
        if not items:
            continue
        L += ["", f"## Ευρήματα {prio}", ""]
        for label, key in items:
            val = f[key]
            L += [f"### {prio} — {label} ({count_of(val)})", ""]
            if isinstance(val, dict):
                for k, n in list(val.items())[:15]:
                    flat = re.sub(r"[\r\n]+", " / ", k)[:110]
                    L.append(f"- ({n}×) {flat}")
            elif key == "redirects":
                for it in val[:15]:
                    L.append(f"- {it['from']} → {it['to']}")
                if len(val) > 15:
                    L.append(f"- … και {len(val) - 15} ακόμη (βλ. JSON)")
            else:
                for it in val[:15]:
                    if isinstance(it, dict):
                        detail = ", ".join(f"{k}={v}" for k, v in it.items()
                                           if k not in ("url", "description", "title") and v not in (None, ""))
                        L.append(f"- {it.get('url')} — {detail}")
                    else:
                        L.append(f"- {it}")
                if len(val) > 15:
                    L.append(f"- … και {len(val) - 15} ακόμη (βλ. JSON)")
            L.append("")

    L += ["", "## Αργές σελίδες (>3000 ms)", "", "| Σελίδα | ms | HTML KB |", "|---|---|---|"]
    for r in f["slow_pages"][:15]:
        L.append(f"| {r['url']} | {r['ms']} | {r['html_kb']} |")
    if not f["slow_pages"]:
        L.append("| — | — | — |")

    L += ["", "## Τι ΔΕΝ ελέγχθηκε", ""]
    for line in report["limitations"]:
        L.append(f"- {line}")
    path.write_text("\n".join(L) + "\n", encoding="utf-8")


# --------------------------------------------------------------------------- #
# main
# --------------------------------------------------------------------------- #
def main() -> int:
    ap = argparse.ArgumentParser(description="Read-only, throttled SEO audit")
    ap.add_argument("--site", default="https://billiardtoday.com")
    ap.add_argument("--out", default="reports")
    ap.add_argument("--workers", type=int, default=2, help="default 2, σκληρό όριο 4")
    ap.add_argument("--min-interval", type=float, default=1.0, help="δευτ. μεταξύ ενάρξεων request")
    ap.add_argument("--max-pages", type=int, default=40)
    ap.add_argument("--time-budget", type=float, default=420.0)
    ap.add_argument("--timeout", type=float, default=45.0)
    ap.add_argument("--sitemap-fetches", type=int, default=2, help="λήψεις sitemap (σταθερότητα)")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--allow-heavy", action="store_true",
                    help="ΕΝΕΡΓΟΠΟΙΕΙ /players/, /rankings/, /clubs/ — κάθε σελίδα κοστίζει 5.8-8.7s στη Strapi")
    ap.add_argument("--groups", default="", help="allowlist ομάδων, π.χ. tournaments,federations")
    ap.add_argument("--max-tournaments", type=int, default=24)
    ap.add_argument("--max-federations", type=int, default=12)
    ap.add_argument("--max-static", type=int, default=6)
    args = ap.parse_args()

    workers = max(1, min(args.workers, HARD_WORKERS))
    if args.workers > HARD_WORKERS:
        print(f"[warn] --workers {args.workers} → περιορίζεται σε {HARD_WORKERS}", file=sys.stderr)

    site = args.site.rstrip("/")
    host = urlparse(site).netloc
    started = time.time()
    throttle = Throttle(args.min_interval)

    sm = load_sitemap(site, throttle, max(1, min(args.sitemap_fetches, 3)))
    caps = {"tournaments": args.max_tournaments, "federations": args.max_federations,
            "static": args.max_static, "*": 4}
    groups_filter = [g.strip() for g in args.groups.split(",") if g.strip()] or None
    targets, skipped = pick(sm["urls"], site, caps, args.seed, args.allow_heavy, groups_filter, args.max_pages)

    pages: list[dict] = []
    budget_hit = False
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = []
        for u in targets:
            if time.time() - started > args.time_budget:
                budget_hit = True
                break
            futures.append(pool.submit(fetch, u, throttle, args.timeout))
        for fu in futures:
            pages.append(fu.result())

    rows = [analyse(p, host) for p in pages]
    findings = build_findings(rows, sm["total"])
    trunc = None
    if time.time() - started < args.time_budget:
        trunc = truncation_evidence(site, throttle)

    now_utc = datetime.now(timezone.utc)
    summary = {
        "site": site,
        "checked_at": now_utc.isoformat(timespec="seconds"),
        "checked_at_local": datetime.now().astimezone().isoformat(timespec="seconds"),
        "sitemap_urls": sm["total"],
        "checked": len(rows),
        "seconds": round(time.time() - started, 1),
        "workers": workers,
        "min_interval": args.min_interval,
        "max_pages": args.max_pages,
        "requests_made": throttle.requests,
        "allow_heavy": args.allow_heavy,
        "skipped_groups": skipped,
        "time_budget_hit": budget_hit,
    }
    limitations = [
        "Χωρίς JavaScript: μετριέται μόνο το server-rendered HTML (client-side αλλαγές, lazy content, "
        "υδάτωση δεν αξιολογούνται).",
        f"Δείγμα, όχι πλήρης σάρωση: {len(rows)} από {sm['total']} URLs ({findings['coverage_pct']}%).",
        "Οι ομάδες /players/, /rankings/, /clubs/ εξαιρέθηκαν λόγω κόστους στη Strapi "
        "(/api/bt-players/participations-by 5.8-8.7s ανά σελίδα) — δεν ελέγχθηκαν σε αυτό το τρέξιμο.",
        "Δεν ελέγχθηκαν: Core Web Vitals (LCP/CLS/INP), κινητή φιλικότητα, TLS/HTTPS chain, "
        "εικόνες (alt/βάρος), βάθος εσωτερικού link graph, διπλό περιεχόμενο πέραν title/description.",
        f"Έλεγχος HTTP status σε ΟΛΟ το sitemap δεν έγινε (μόνο στις {len(rows)} σελίδες του δείγματος).",
        "Το ms είναι συνολικός χρόνος λήψης από το μηχάνημα ελέγχου (όχι TTFB server-side).",
    ]
    if budget_hit:
        limitations.append("Το time budget εξαντλήθηκε — μέρος των προγραμματισμένων σελίδων δεν ελέγχθηκε.")

    report = {
        "summary": summary,
        "sitemap": {k: v for k, v in sm.items() if k != "urls"},
        "truncation": trunc,
        "findings": findings,
        "limitations": limitations,
        "pages": rows,
    }

    outdir = Path(args.out)
    outdir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M")
    json_path = outdir / f"{stamp}-audit.json"
    md_path = outdir / f"{stamp}-audit.md"
    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    write_markdown(md_path, report)

    print(json.dumps({**summary, "sitemap_groups": sm["groups"], "sitemap_stable": sm["stable"],
                      "status_counts": findings["status_counts"], "truncation": trunc,
                      "json": str(json_path), "md": str(md_path)}, ensure_ascii=False, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
