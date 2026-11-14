# billiardtoday.com — Τεχνικός έλεγχος SEO: ιεραρχημένα ευρήματα

**Ημερομηνία ελέγχου:** 28/10/2026, 11:51–12:08 (τοπική ώρα, UTC+2)
**Εργαλείο:** `D:\Projects\5-billiardtoday-frontend\tools\seo-audit\audit.py` (v2.0 — read-only, stdlib-only, throttled)
**Αναφορές:** `tools\seo-audit\reports\20261028-1205-audit.{json,md}` (κύριο τρέξιμο), `reports\20261028-1151-audit.{json,md}` (πρώτο τρέξιμο)

Κάθε εύρημα συνοδεύεται από URL, μετρημένο νούμερο και ώρα. Ό,τι δεν μετρήθηκε δηλώνεται ρητά ως **δεν ελέγχθηκε**.

**Σταμάτημα crawl:** στο 12:00 (εντολή ιδιοκτήτη) σταμάτησε κάθε πρόσβαση σε `/players/*`, `/rankings/*`, `/clubs/*` λόγω φόρτου στη Strapi. Το τελικό τρέξιμο (12:05) άγγιξε **μόνο** `/tournaments/*`, `/federations/*` και στατικές σελίδες: 40 σελίδες, 43 requests, 2 workers, 1 request/s, 54.1s — κανένα σφάλμα (`status 200: 40/40`).

---

## P1 — Πρέπει να διορθωθούν

### P1.1 · Οι σελίδες `/players/<id>` κολλάνε τη Strapi (5.8–8.7s/κλήση) και δεν σερβίρονται κάτω από παράλληλο φόρτο

| Μέτρηση | Απόδειξη |
|---|---|
| Server log (ιδιοκτήτης): `/api/bt-players/participations-by` **5.8–8.7s** ανά κλήση, ids **4169, 4184, 4347, 4354, 4359, 4372, 4384** | καταγραφή ~12:00, από το log της Strapi (δήλωση ιδιοκτήτη) |
| 1ο τρέξιμο 11:51 (10 workers, timeout 25s): **32/126 σελίδες → status 0**, ms **25.324–30.241**. Κατανομή: **20 `/players/`**, **8 `/rankings/ceb/*`**, 3 παράπλευρες (`/privacy-policy`, `/terms-of-service`, `/tournaments` — επέστρεψαν 200 στη συνέχεια) | `reports\20261028-1151-audit.json`, `checked_at 2026-10-28T09:51:22Z` |
| Κρύα φόρτωση σελίδας αθλητή, σειριακά με timeout 90s: `/players/4384-MARTINEZ-Julio` **5.108s**, `/players/89-KOURIAS-Evaggelos` **5.266s**, `/players/982-MAZONAKIS-Stefanos` **5.735s** | probe 12:02–12:04 |
| Ίδιες σελίδες ζεστές: **454–2.042 ms** (π.χ. `/players/4359-CIFUENTES-David` 5.495s → 521 ms → 454 ms) | probe 12:02–12:04 |
| `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` στην απάντηση `/players/4384-MARTINEZ-Julio` (server Date: 28/10/2026 10:03:46 GMT) | μετρημένο header, 12:03:46 τοπική |

**Τι σημαίνει μετρημένα:** κάθε αίτημα σελίδας αθλητή είναι uncached render που χτυπάει το `participations-by`. Με 10 ταυτόχρονα το origin δεν ολοκληρώνει σε 25s, ενώ ακόμη και ακίνδυνες στατικές σελίδες (`/privacy-policy`, `/terms-of-service`) απέτυχαν στο ίδιο κύμα. Δεν μετρήθηκε TTFB server-side ούτε το εύρος σελίδων που πλήττεται (32 από 3.272 URLs `/players/`).

### P1.2 · `/tournaments` δηλώνει canonical την αρχική σελίδα (και δεν έχει H1)

- `https://billiardtoday.com/tournaments` → `<link rel="canonical" href="https://billiardtoday.com">` (μετρημένο: `canonical=https://billiardtoday.com`, `final=https://billiardtoday.com/tournaments`), **H1 count = 0**, title `"Billiard Today | Billiard Today"`.
- **Ώρα:** 12:05:23 (τρέξιμο 40 σελίδων).
- Αποτέλεσμα: η λίστα τουρνουά ζητά από τον Google να μην την ευρετηριάσει· δεν βρέθηκε άλλη σελίδα στο δείγμα με αντίστοιχο πρόβλημα (0/40 canonical mismatch εκτός αυτής).
- Επιπλέον 3 σελίδες με **H1 = 0**: `/news/ankara-world-cup-2026-cho-jaspers-recap`, `/news/longoni-next-gen-grand-prix-u21-2026-athens-recap`, `/news/porto-matosinhos-world-cup-2026-preview` (12:05:23).

### P1.3 · Το προηγούμενο εργαλείο έβλεπε μόνο 2.216 από τα 3.798 URLs του sitemap (τυφλό σημείο 41,7%)

- `/sitemap.xml` = **707.255 bytes / 3.798 URLs**. Ο παλιός κώδικας διάβαζε μόνο τα πρώτα **400.000 bytes** → **2.216 URLs** (απώλεια **41,7%**), γι' αυτό εμφανιζόταν «ασταθές» μέγεθος (3.691 μέσω curl, 2.216 στο τρέξιμο).
- Το sitemap **είναι σταθερό**: 3 λήψεις (11:55–11:59) + 2 λήψεις (12:05) → ίδιο μέγεθος, ίδιο `sha256[:16] = a70a97eab3c1502f`, 3.798 `<loc>` κάθε φορά, 0 διπλότυπα, άθροισμα συνόλων ίδιο (κανένα URL να «πετάει» μεταξύ λήψεων).
- Το v2.0 διαβάζει πλήρες σώμα (όριο 6 MB) και καταγράφει το παραπάνω ως διαγνωστικό σε κάθε αναφορά.

---

## P2 — Σημαντικά

### P2.1 · Το sitemap περιέχει 14 URLs που κάνουν 301 και **κανένα** από τα τελικά URLs

- 14 από τις 17 σελίδες `/tournaments/*` του δείγματος επέστρεψαν redirect (12:05:23), π.χ. `/tournaments/cadre-712-cceb-15--cadre-71-2-2017` → `/tournaments/cadre-71-2-2017`.
- Έλεγχος μελών στο sitemap (12:08): από τις 14 πηγές, **14/14 βρίσκονται στο sitemap**· από τους 14 προορισμούς, **0/14** βρίσκονται στο sitemap.
- Συνέπεια: ο crawler ξοδεύει budget σε URLs που αλλάζουν διεύθυνση και η κανονική σελίδα δεν είναι ανακαλύψιμη από το sitemap.

### P2.2 · 23/40 σελίδες χωρίς JSON-LD — μαζί η αρχική και το `/tournaments`

- Χωρίς κανένα structured data: `/`, `/cookie-policy`, `/federations`, **13 σελίδες `/federations/<slug>`** και οι υπόλοιπες του δείγματος (σύνολο 23 από 40). Ώρα 12:05:23.
- Οι σελίδες `/tournaments/<slug>` **έχουν** JSON-LD· τύποι που μετρήθηκαν συνολικά: `ProfilePage` (20 στο τρέξιμο 11:51), `ItemList` (2), `CollectionPage` (1). Σπασμένο JSON-LD: 0/40.

### P2.3 · Titles: 11 > 60 χαρακτήρες, 1 < 15, ένα με διπλό brand

- Μεγαλύτερα (12:05:23): `/news/longoni-next-gen-grand-prix-u21-2026-athens-recap` **87**, `/news/ankara-world-cup-2026-cho-jaspers-recap` **84**, `/news/porto-matosinhos-world-cup-2026-preview` **79**, `/tournaments/european-championship-3-cushion-national-teams-u21--…-2026` **72**, `/tournaments/european-championship-3-cushion-individual-u21-cceb-296--…-2022` **68**, `/federations/federation-luxembourgeoise-des-amateurs-de-billard` **67**, `/tournaments/team/european-championship-biathlon-national-teams-u21-2026` **66** (σύνολο 11).
- Πολύ σύντομο: `/` → title `"Billiard Today"`, **14 χαρακτήρες**.
- Διπλό brand: `/tournaments` → `"Billiard Today | Billiard Today"`.

### P2.4 · Meta descriptions: 3 > 160 χαρακτήρες και 2 σετ διπλότυπων (δείγμα test/demo περιεχομένου σε production)

- Μακρύτερες: `/tournaments/european-championship-3-cushion-national-teams-u21--…-2026` **180**, `/federations/federation-luxembourgeoise-des-amateurs-de-billard` **172**, `/tournaments/european-championship-3-cushion-u17--…-2026` **165**.
- Διπλότυπα: `"Tournament Rules\n\nMain page of the Antalya Championships."` **×3** και `"Tournament Rules"` **×2** — περιεχόμενο που μοιάζει με template/demo και σερβίρεται δημόσια.

### P2.5 · Σελίδες `/rankings/ceb/*` στέλνουν 300–391 KB HTML

- Μετρημένα (12:02–12:04, χωρίς JS): `/rankings/ceb/3c-ladies` **370.005 bytes**, `/rankings/ceb/1c-individual` **319.771**, `/rankings/ceb/artistic-individual` **304.589**, `/rankings/ceb/cadre-472` **311.836**, `/rankings/ceb/cadre-712` **308.459**.
- Στο τρέξιμο 11:51: `/rankings/ceb/3c-individual` **391 KB**, `/rankings/ceb/3c-individual/16-2026` **391 KB**, `/players` **272 KB**, `/live` **143 KB**. Το `/tournaments` (λίστα) μόλις **29 KB**.
- Δεν μετρήθηκε συμπιεσμένο μέγεθος (gzip/brotli) ούτε χρόνος render στο client.

### P2.6 · 13 σελίδες με λεπτό κείμενο (924–1.039 χαρακτήρες) χωρίς links προς αθλητές

- `/federations/*` (12 σελίδες: `hellenic-billiard-union` **924**, `croatian-billiard-association` **949**, …, `federazione-italiana-sport-biliardo-e-bowling` **1.039**) και `/tournaments` **643** χαρακτήρες. `player_links = 0` σε όλες. Ώρα 12:05:23.

### P2.7 · Δεν υπάρχει hreflang σε καμία από τις 40 σελίδες (lang="en" παντού)

- `lang_counts = {'en': 40}`, `hreflang_values = {}` (12:05:23). **Δεν ελέγχθηκε** αν το site έχει ή σχεδιάζει άλλες γλωσσικές εκδόσεις — αν δεν υπάρχουν, η απουσία hreflang δεν είναι σφάλμα.

---

## P3 — Καλό να διορθωθούν

- **Οκτώ σελίδες `/tournaments/*` σε 3,0–3,6s:** `tournament-191--3c-d-division-2024` **3.591 ms** (124 KB), `eoaa-2026-2027-…-master-league-…` **3.562 ms**, `tournament-194--libre-c-div-2nd-2024` **3.426 ms**, `tournament-181--a-division-3c-2023` **3.364 ms** (12:05:23). Διάμεσος όλου του δείγματος **760 ms**, p95 **3.426 ms**.
- **Redirect πηγές στο sitemap:** 14 URLs (βλ. P2.1) — το ίδιο σετ.
- **Λεπτό περιεχόμενο:** βλ. P2.6 (ίδια ευρήματα, χαμηλότερη προτεραιότητα γιατί οι σελίδες είναι profile-style).
- **Θετικά, μετρημένα:** og:title / og:description / og:image **παρόντα σε 40/40**· **0** σπασμένα JSON-LD· **0** noindex· **0** status ≠ 200 στο τελικό τρέξιμο· **0** σελίδες χωρίς εσωτερικά links· title & meta description **παρόντα σε 40/40**.

---

## Κάλυψη & τι ΔΕΝ ελέγχθηκε

Σύνολο sitemap **3.798 URLs**: players **3.272**, tournaments **410**, clubs **64**, federations **27**, rankings **15**, news **4**, στατικές **6**.

- **Δεν ελέγχθηκαν (εντολή διακοπής 12:00):** και τα **64** URLs `/clubs/`, και τα **3.272** `/players/`, και τα **15** `/rankings/` (τα 10 κάτω από `/rankings/ceb/`).
- **Δεν ελέγχθηκαν:** 393 από τα 410 `/tournaments/*` — το όριο ήταν 40 σελίδες στο 1 request/s, άρα πλήρης έλεγχος των 410 θα απαιτούσε ≥410s μόνο σε ρυθμό αναμονής. Ελέγχθηκαν **17 tournaments + 13 federations + 10 στατικές**.
- **Δεν ελέγχθηκαν:** HTTP status σε όλο το sitemap (404 scan) πέραν του δείγματος· Core Web Vitals (LCP/CLS/INP)· mobile rendering· TLS/HTTPS chain· βάρος/alt εικόνων· ανάλυση internal link graph· client-side JS περιεχόμενο (o έλεγχος είναι χωρίς JS)· συμπιεσμένο μέγεθος απαντήσεων.
- Οι μετρήσεις χρόνου είναι συνολικός χρόνος λήψης από το μηχάνημα ελέγχου, όχι TTFB του server.

## Μεθοδολογία / αναπαραγωγή

```bash
# ασφαλές προεπιλεγμένο (throttled, χωρίς βαριές ομάδες)
cd /d/Projects/5-billiardtoday-frontend/tools/seo-audit
python audit.py --site https://billiardtoday.com            # 2 workers, 1 req/s, ≤40 σελίδες, ≤420s
# ρητά αποκλεισμένες ομάδες: players, rankings, clubs (βλ. HEAVY_GROUPS στο audit.py)
```

Το v2.0 που παραδίδεται προσθέτει, πέρα από throttling/όρια: πλήρες sitemap + σταθερότητα με sha256, έλεγχο canonical ≠ τελικό URL, μήκη title/description, 0 internal links, og:title/og:description, hreflang, 404/redirects, latency percentiles, ελληνικά markdown reports.
