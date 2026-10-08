# Μελέτη billiardtoday.com — site, CMS, admin, scoreboard, live

**Ημερομηνία:** 08/10/2026 · **Είδος:** μελέτη κώδικα **read-only** (+ read-only `SELECT` στη production Postgres για μεγέθη) · **Καμία αλλαγή, κανένα commit, κανένα deploy.**
Οδηγός: `docs/ai/2026-10-08-frontend-study-brief-el.md`.

**Πηγές (4 repos):** frontend `D:/Projects/4-billiardtoday-frontend` (Next.js App Router — 94 `page.tsx`, 106 `route.ts`, ~86k LOC στο `src`) · Strapi `D:/Projects/1-billiards-strapi` (90 content types) · admin `D:/Projects/2-billiardtoday-admin` (115 σελίδες) · scoreboard `D:/Projects/3-BilliatdToday-Scoreboard` (Electron + Next + `ws-server/`).

**Μέθοδος:** κάθε συμπέρασμα φέρει πηγή `αρχείο:γραμμή` ή endpoint. Τα πιο κρίσιμα σημεία **επαληθεύτηκαν ξανά** συγκεντρωτικά (βλ. §0.6) — εκεί που ένα σκέλος έδωσε διαφορετικό νούμερο, ισχύει το επαληθευμένο.

---

## 0. Απαντήσεις στα 5 ερωτήματα-κλειδιά

| # | Ερώτημα | Απάντηση σε μία γραμμή | Λεπτομέρεια |
|---|---|---|---|
| 1 | Τι είναι CMS-driven, τι κώδικας/αρχεία (με νούμερα) | **5** δημόσια routes φορτώνουν CMS σελίδα (`CmsPageView`), οι κατατάξεις CEB/UMB είναι **29 JSON αρχεία**, το live/αποτελέσματα ζουν σε **Strapi πίνακες**, ο κατάλογος (παίκτες/κλαμπ/ομοσπονδίες/BTR) είναι **Strapi μέσω `/api/*`**, ~**11 αρχεία** κώδικα κρατούν hardcoded περιεχόμενο | §A |
| 2 | Δομή παρουσίασης ενός τουρνουά και πού ορίζεται | Η **σελίδα/λίστα** για `/tournaments` είναι CMS (`CmsPageView` + section tournament-list)· η **δομή φάσεων/ομίλων/αγώνων/κατάταξης είναι κώδικας** (`TournamentEventsContent.tsx` ~8k γραμμές, `GroupStandingsTable.tsx`) πάνω σε `bt_event`/`bt_event_stage`/`bt_group` | §A.2.3, §C |
| 3 | Πώς υπολογίζονται/δημοσιεύονται οι κατατάξεις, τι είναι live | **3 στρώματα**: (α) ζωντανό `bt_results` — ξαναγράφεται σε **κάθε** αποτέλεσμα, (β) τελικό `bt_results_final` + `bt_events.final_standings_published` — κλειδώνει με publish, (γ) δημόσιο φίλτρο `tournament.format_definition.publication.state` | §C.2 |
| 4 | Βήματα που απαιτούν dev/χειροκίνητη δουλειά | 12 καταγεγραμμένα, με παράδειγμα το καθένα (κατατάξεις=JSON+deploy, νέες σελίδες CMS=deploy, χρήστες/ρόλοι=SQL, θέματα/μεταφράσεις=τοπικά αρχεία, media resize=χειροκίνητο, live screens stub κ.λπ.) | §0.4 |
| 5 | Ελάχιστα για αυτοεξυπηρέτηση χωρίς κώδικα | 10 ιεραρχημένα βήματα (κατατάξεις→admin importer, CMS slug πολλαπλών τμημάτων, νομικές σελίδες, UI χρηστών/ρόλων, publication toggle, media pipeline…) | §0.5 |

### 0.1 Νούμερα που μετρήθηκαν (όχι εκτιμήσεις)

| Μέγεθος | Τιμή | Πηγή |
|---|---|---|
| Δημόσια routes στο frontend | 77 (τα 18 `embed`) σε σύνολο 94 `page.tsx` / 106 `route.ts` | §A.4 |
| Routes που φορτώνουν CMS σελίδα (`CmsPageView`) | **5** — `/[...slug]`, `/tournaments`, `/embed/tournaments`, `/embed/page/[slug]`, `/news/[slug]` | `grep -rn CmsPageView src/app` (επαληθεύτηκε) |
| Sections του CMS page-builder | 19 components στο Strapi `page` ↔ 19 στο `CmsSection` union | §A.3 |
| Sections στην παλέτα του admin που **δεν** υπάρχουν στον renderer | 5 (`button`/`logo`/`menu`/`social-links`/`contact-info-block`) | §A.3.3, §D |
| Αρχεία κατατάξεων | 29 `public/data/**` (CEB 21 / UMB 8) | §F |
| Content types στο Strapi | 90 (τα `bt-*` + `ceb-ranking-*` + `commercial-*` + `team-*` …) | §C.1 |
| Production μεγέθη (read-only psql) | `bt_events` **400**, `bt_event_stages` **2084**, `bt_groups` **39519**, `bt_results` **40086**, `bt_results_final` **22178**, `tournaments` **424**, `ranking_series` **3**, `ceb_ranking_editions` **1**, `ranking_submissions` **2**, `scoreboard_sessions` **0** | §C.4 |
| Σελίδες admin / με API calls | 115 / 70 | §D.0 |
| Media | Strapi local provider → `public/uploads` == `cdn…/httpdocs/uploads` (**ίδιο αρχείο**, ίδιο inode/μέγεθος/mtime) | §F.A |

### 0.2 Δομή παρουσίασης ενός τουρνουά (σύντομα)

- **Λίστες τουρνουά:** ένας renderer παντού — `TournamentCollection.tsx` (view `table`/`cards`) μέσω `TournamentListSection` (UMB, ομοσπονδίες, `/tournaments`, κλαμπ, embeds) και `CebFederationExperience`. Στοιχεία από `/api/tournaments` (paginate **τοπικά**, γιατί το Strapi μετρά και drafts).
- **Σελίδα τουρνουά/αγώνων:** `/tournaments/[slug]` → `TournamentDetailPage.tsx` (wrapper, δικό του polling) → `TournamentEventsContent.tsx` (στήλες φάσεων, προεπισκόπηση ομίλων, κατατάξεις ομίλων) + `GroupStandingsTable.tsx` + entry badges. Πηγή: `bt_event` + `bt_event_stage` + `bt_group` (το **bt-group είναι ταυτόχρονα αγώνας ομίλου και νοκ-άουτ**, με πεδία bracket).
- **Κατάταξη ομίλου/φάσης:** `/api/event-stages/[stageId]/standings` με αλυσίδα fallback `stored-results` (`bt_results`) → `computed-stage-results` (υπολογισμός από τα παιγμένα matches) → direct Strapi → knockout normalize.
- **Πού ορίζεται:** τα *δεδομένα* στο Strapi (admin UI: events/stages/groups/participants/results), το *κλείδωμα κανονισμών* με `ensureRulesetFrozen` στο πρώτο αποτέλεσμα (snapshot στο event+stage), η *παρουσίαση* σε κώδικα frontend, η *δημοσίευση* με `tournament.format_definition.publication.state`.

### 0.3 Κατατάξεις: τι είναι ζωντανό και τι τελικό

| Στρώμα | Πίνακας / πεδίο | Ποιος το γράφει | Πότε |
|---|---|---|---|
| Ζωντανό | `bt_results` (+ `bt_groups.final_position`) | `standingsCalculator.calculateAndUpdateGroupStage` μέσω του `bt-group` lifecycle `afterUpdate` | σε **κάθε** νέο/αλλαγμένο αποτέλεσμα (και από τον cuesco sync) |
| Τελικό | `bt_results_final` + `bt_events.final_standings_published` | `finalResultsPublisher.publishFinalResults` (auto με cooldown 60s ή manual `POST /bt-events/:id/publish-final-results`) | όταν «κλειδώσει» το τουρνουά |
| Δημόσιο | `tournament.format_definition.publication.state` | club-tournament setup στο admin | φιλτράρεται στο frontend με `isDraftTournament()` |

Συνέπεια: **αλλαγή με απευθείας SQL δεν ενημερώνει κατατάξεις** — θέλει `npm run stats:recalculate-production` (Strapi `package.json:29`, επαληθεύτηκε).

### 0.4 Τι απαιτεί σήμερα dev / χειροκίνητη δουλειά (12, με παράδειγμα)

| # | Τι | Παράδειγμα / γιατί | Πηγή |
|---|---|---|---|
| 1 | Νέα/αλλαγμένη κατάταξη CEB ή UMB | Νέο edition = νέο JSON + commit + `bt-sync frontend` (δεν υπάρχει import από admin) | §A.5, §F.Β |
| 2 | Νέα σελίδα «CMS» πέρα από τις 5 | Σελίδα στο `/docs/*` = markdown στο repo· `/manual`, `/privacy-policy`, `/terms-of-service`, `/cookie-policy` = hardcoded | §A.6 |
| 3 | Αλλαγή δομής αρχικής σελίδας | Η `/` δεν είναι συνθέσιμη: δομή hardcoded, το CMS δίνει μόνο τιμές | §A.2.2 |
| 4 | Νέα σελίδα CMS με slug πολλών τμημάτων | Το `[...slug]` δέχεται μόνο ένα segment | §D.3 |
| 5 | Χρήστες/ρόλοι/permissions | **Καθόλου UI** — 8 ρόλοι ανατίθενται χειροκίνητα στη Strapi | §D.2 |
| 6 | Θέματα CMS / patterns / plugins / media-meta | Αποθηκεύονται σε **τοπικά αρχεία του admin** (`data/*.json`) → χάνονται σε redeploy | §D.2 |
| 7 | Μεταφράσεις admin | Γράφονται σε `src/locales/*.json` μέσα στον κώδικα → νέο build | §D.2 |
| 8 | Country rules | Σελίδες στο admin καλούν `/api/admin/country-rules` που **δεν υπάρχει** (orphan λειτουργία) | §D.2 |
| 9 | Publication toggle ενός event | UI μόνο για club tournaments — αλλού SQL (`jsonb_set` στο `format_definition`) | §C.6 |
| 10 | Ruleset freeze / re-resolve | Δεν προκαλείται από UI (γίνεται αυτόματα στο πρώτο αποτέλεσμα· re-resolve με ρητό endpoint) | §C.3.1 |
| 11 | Σύνδεση scoreboard με αγώνα | Χειροκίνητο «Στείλε στο scoreboard» από το admin — **χωρίς auto-assign βάσει timetable** | §E.3 |
| 12 | Media (μέγεθος/variants) | `sizeOptimization:false`, `breakpoints:{}` — resize γίνεται χειροκίνητα πριν το upload | §F.A.4 |

Επιπλέον, λειτουργικά κενά/ρίσκα που καταγράφηκαν: 5 blocks της παλέτας CMS πέφτουν σε «Unsupported CMS section.»· `scoreboard_sessions` = **0** rows σήμερα (κανένα ζωντανό session τη στιγμή της μέτρησης)· hardcoded WS token στο client· 3 ξεχωριστά WebSocket στο tournament detail (ρίσκο reconnect-storm)· stub `POST /api/admin/tournament/live-screens` χωρίς persistence· `getExternalLiveTablesCompetitionIdx()` επιστρέφει πάντα `null`· το lazy feed του εξωτερικού provider σπάει **σιωπηλά** (200 με `data:[]`) αν αλλάξουν τα CSS classes.

### 0.5 Ελάχιστα για αυτοεξυπηρέτηση (χωρίς αλλαγή κώδικα)

1. **Κατατάξεις CEB/UMB μέσω admin** (upload/import αρχείου → γράφει το `public/data/*.json` στον server) — σήμερα μόνο dev.
2. **CMS slugs πολλαπλών τμημάτων** στο `[...slug]` (τώρα ένα segment).
3. **Νομικές + `/manual` + `/docs` σε CMS** αντί hardcoded/markdown.
4. **Σύνθεση αρχικής σελίδας** (ή τουλάχιστον όλων των sections της) από το CMS.
5. **UI χρηστών/ρόλων/permissions** (σήμερα χειροκίνητα στη Strapi).
6. **Publication state toggle** για κάθε event/tournament από το admin.
7. **Μεταφορά themes/patterns/plugins/media-meta/translations από τοπικά αρχεία στη Strapi.**
8. **Υλοποίηση των 5 orphan CMS blocks** (button/logo/menu/social/contact) στον renderer.
9. **Media pipeline** (variants/resize, εναλλαγή CDN).
10. **Auto-assign scoreboard session** από το timetable αντί «Στείλε στο scoreboard» χειροκίνητα.

### 0.6 Τι επαληθεύτηκε συγκεντρωτικά (και μια διόρθωση)

| Ισχυρισμός ερευνητή | Έλεγχος | Αποτέλεσμα |
|---|---|---|
| «5 routes φορτώνουν `CmsPageView`» | `grep -rn CmsPageView src/app` | **Σωστό** — `/[...slug]:56`, `/tournaments:53`, `/embed/tournaments:53`, `/embed/page/[slug]:36`, `/news/[slug]:155` |
| «Μόνο το `[...slug]` είναι CMS-driven» (άλλο σκέλος) | ίδιος έλεγχος | **Λάθος** — ισχύει το 5· τα υπόλοιπα 4 είναι CMS περιεχόμενο με δικό τους wrapper |
| `EVENT_FALLBACK_POLL_MS=60000`, `LIVE_SESSIONS_FALLBACK_POLL_MS=30000` | grep στο `TournamentDetailPage.tsx` | **Σωστό** (γρ. 953, 954) |
| `npm run stats:recalculate-production` | `1-billiards-strapi/package.json:29` | **Σωστό** |
| Country-rules χωρίς route | `ls src/app/api/admin` | **Σωστό** — σελίδες υπάρχουν, route όχι |
| Strapi local upload, χωρίς optimization | `config/plugins.ts:12-13` | **Σωστό** (`provider:'local'`, `sizeOptimization:false`) |

---

## Α. Δημόσιο site: routes, αρχεία, πηγές δεδομένων

*Πηγή αρχείου εργασίας: `01-public-site.md` (αποτέλεσμα read-only μελέτης).*

**Repo:** `D:/Projects/4-billiardtoday-frontend` (Next.js App Router, `src/app`, Tailwind).
**Μετρήσεις:** 94 `page.tsx`, 106 `route.ts` (`find src/app -name page.tsx | wc -l`).
Αφαιρώντας `account/*` (11), `admin/*` (2) και `test/*` (4) → **77 δημόσια routes**· από αυτά **18 είναι `embed/*`**.
**Strapi:** `D:/Projects/1-billiards-strapi` · **Admin:** `D:/Projects/2-billiardtoday-admin`.
**Μελέτη read-only**· δεν έγινε build, dev server, commit ή deploy.

---

### 1. Οι πέντε πηγές δεδομένων (και πού ορίζονται)

| # | Πηγή | Πώς φαίνεται στον κώδικα | Παραδείγματα |
|---|------|--------------------------|--------------|
| 1 | **Strapi Content API, server-side** (direct, όχι μέσω `/api/*`) | `fetchJson('/api/<ct>?...')` με `getServerEnv`/`STRAPI_API_URL` | `src/lib/cms/strapi.ts:64-85,229-248` · `src/lib/directory.ts:287,367,447` · `src/lib/publicSiteData.ts:580,770` · `src/lib/rankings.ts:141,158` · `src/lib/teamTournaments.ts:281,332` |
| 2 | **Strapi μέσω δικών μας `/api/*` routes** (proxy + normalization) | client `fetch('/api/...')` | `src/app/api/tournaments/route.ts:252,370` · `src/app/api/events/[id]/route.ts` · `src/app/api/stats/*` · `src/app/api/scoreboards/route.ts:10` |
| 3 | **Τοπικά JSON στο `public/data/`** (γράφονται από importers, όχι από CMS) | `import fs from "node:fs"` + `readFileSync` | `src/lib/cebRankingData.ts:1,33` · `src/lib/umbRankingData.ts:1,33` → `public/data/ceb-ranking/*.json`, `public/data/umb-ranking/*.json` |
| 4 | **Hardcoded στον κώδικα** | σταθερά arrays/strings, `DocumentPage`, landing defaults | `src/components/landing/content.ts:139-330` · `src/app/manual/page.tsx:20-42` · `src/app/tournaments/live/soop/page.tsx:29-35` · `src/app/teams/page.tsx` |
| 5 | **Proxy σε εξωτερικό provider** | route που κάνει fetch σε τρίτο host | `src/app/api/tournaments/[eventId]/external-live-tables/route.ts` (cueuny/UMB webtables) · `src/lib/wsPresence.ts:23` (`wss://ws.billiardtoday.com/ws`) · `src/lib/portalProxy.ts:22` |

Το `src/lib/api.ts:1-5` είναι ο κοινός τόπος για base URLs (`NEXT_PUBLIC_STRAPI_URL`, `NEXT_PUBLIC_SCOREBOARD_URL`, `SERVER_API_URL`), αλλά **δεν** χρησιμοποιείται από όλα τα libs — `cms/strapi.ts`, `tournaments.ts`, `rankings.ts`, `teamTournaments.ts` έχουν το δικό τους `STRAPI_URL` block.

---

### 2. Πίνακας route → αρχείο → πηγή δεδομένων → σημειώσεις

#### 2.1 CMS-driven σελίδες

| Route | Αρχείο | Πηγή | Σημειώσεις |
|---|---|---|---|
| `[...slug]` (κάθε CMS slug χωρίς dedicated route) | `src/app/[...slug]/page.tsx:42-56` | Strapi `page` μέσω `getCmsPageBySlug` (`src/lib/cms/strapi.ts:229-248` → `GET /api/pages?filters[slug][$eq]=…&populate[sections][populate]=*`) | `getCmsPageBySlug` + `getCmsSiteSettings` + `getCmsAppearance` σε `Promise.all`· αν λείψει η σελίδα → `notFound()`· εξυπηρετεί **μόνο μονο-segment** slug (`slugParts.length !== 1` → `notFound`, γραμμή 42) |
| `/tournaments` | `src/app/tournaments/page.tsx:45-58` | CMS page slug `"tournaments"` (γρ. 49) + **hardcoded fallback** `buildFallbackTournamentsPage()` (γρ. 6-30) | Το fallback περιέχει ένα `cms.tournament-list-section` με `itemsPerPage: 20`· δηλαδή αν ο πελάτης σβήσει τη σελίδα από το CMS το site δεν σπάει αλλά δείχνει το built-in block |
| `/embed/tournaments` | `src/app/embed/tournaments/page.tsx:35,49` | ίδια CMS page slug `"tournaments"` | Ίδιο component, embedded mode |
| `/embed/page/[slug]` | `src/app/embed/page/[slug]/page.tsx:15,30,36` | `getCmsPageBySlug(slug)` | Οποιαδήποτε CMS σελίδα ως iframe/embed |
| `/news/[slug]` | `src/app/news/[slug]/page.tsx:155` | Strapi `page` με `pageType=article` (`src/lib/cms/news.ts:90-107` → `GET /api/pages?filters[slug][$eq]=…&filters[pageType][$eq]=article`) | Επιστρέφει `null` αν το pageType ≠ `article` → 404 |

#### 2.2 Hybrid: `/` (αρχική)

| Route | Αρχείο | Πηγή | Σημειώσεις |
|---|---|---|---|
| `/` | `src/app/page.tsx:30-37` | Strapi page slug `"home"` **μόνο ως πηγή τιμών** + `listNewsArticles(3)` + `getCmsSiteSettings` | Η **δομή είναι κώδικας**: `Header/Hero/TrustedClubs/Features/HowItWorks/Screenshots/LatestNews/Benefits/CTA/Footer` (γρ. 41-52). Το `buildLandingPageContent` (`src/components/landing/content.ts:340`) παίρνει από τη σελίδα sections της μορφής `cms.hero-section`, `cms.feature-grid-section` κ.λπ. μόνο **πεδία κειμένου/εικόνας** (γρ. 133-137 `getSection`), με hardcoded defaults (`buildDefaultContent`, γρ. 139-330). Άρα ο διαχειριστής αλλάζει κείμενα, **όχι** σειρά/ενότητες |

#### 2.3 Τουρνουά

| Route | Αρχείο | Πηγή | Σημειώσεις |
|---|---|---|---|
| `/tournaments/[slug]` | `src/app/tournaments/[slug]/page.tsx:44-119` | Strapi `bt-events` + `tournaments` μέσω `resolveTournamentEventSummary` (`src/lib/tournaments.ts` → `/api/tournaments` & `/api/bt-events`, γρ. 390,464) + `getRankingSeriesData` (γρ. 86-88) | Δίνει `summary` σε `TournamentDetailPage`, που με τη σειρά του κάνει client polling στο `/event-data/<eventId>` (`src/components/tournaments/TournamentDetailPage.tsx:2077`) και `/api/event-stages/<id>/matches|standings` (γρ. 2088,2109). Πλήρης redirect σε `/tournaments/team/…` για team tournaments (γρ. 66-73) |
| `/tournaments/events` | `src/app/tournaments/events/page.tsx:3` → `TournamentEventsContent.tsx` (~8k γρ.) | Strapi μέσω `fetch('/api/events/<id>')` (`:3208`), `/api/tournaments/<id>/live-sessions` (`:3461`), `/api/event-stages/<id>/matches` (`:4870`) | Όλα client-side, `cache: "no-store"` |
| `/tournaments/events/draw` | `src/app/tournaments/events/draw/DoubleElimDrawPage.tsx:40` | `fetch('/api/events/<id>')` | Double-elimination ταμπλό, client |
| `/tournaments/live` | `src/app/tournaments/live/page.tsx:34-63` | `/api/admin/tournament/live-screens` μέσω `getLiveScreens` (`src/lib/api.ts:166`) — **polling κάθε 10s** | Καθαρά client (`'use client'`, γρ. 1) |
| `/tournaments/live/soop` | `src/app/tournaments/live/soop/page.tsx:29-35` | **Hardcoded εξωτερικό** — `https://play.sooplive.com/afbilliards<table>` | Ενσωμάτωση τρίτου streaming provider, χωρίς CMS |
| `/tournaments/team` | `src/app/tournaments/team/page.tsx:61` | Strapi `team-tournaments` (`src/lib/teamTournaments.ts:281`) | Server component, `fetchTeamTournaments()` |
| `/tournaments/team/[slug]` | `src/app/tournaments/team/[slug]/page.tsx:8-9` | `teamTournaments.ts` + `resolveTournamentEventSummary` | Strapi |
| `/tournaments/[slug]/flowchart` | `src/app/tournaments/[slug]/flowchart/page.tsx:4` | `resolveTournamentEventSummary` | Strapi |

#### 2.4 Παίκτες / Κλαμπ / Ομοσπονδίες

| Route | Αρχείο | Πηγή | Σημειώσεις |
|---|---|---|---|
| `/players` | `src/app/players/page.tsx:49-53` | `listPlayers(3000)` + `getPlayersTotalCount()` (`src/lib/publicSiteData.ts:770,783` → `/api/bt-players`) | Δείχνει 150 από σύνολο 3000· **τυχαία ημερήσια σειρά** με hash (`γρ. 19-30`) — όχι CMS |
| `/players/[id]` | `src/app/players/[id]/page.tsx:70-75` | `getPublicPlayerProfileSummary` (Strapi `bt-players`) + **τοπικό JSON**: `readCebPlayerRankings` (`cebRankingData.ts`) + `readUmbPlayerRanking` (`umbRankingData.ts`) | Τρεις διαφορετικές πηγές στην ίδια σελίδα· η CEB/UMB κάρτα από `public/data/**` |
| `/clubs` | `src/app/clubs/page.tsx:13` | `getClubs()` (`src/lib/directory.ts:367` → `/api/clubs`) | Server component → `ClubsDirectoryClient` |
| `/clubs/[slug]` | `src/app/clubs/[slug]/page.tsx:37,122-138` | `requireClubByIdentifier` (Strapi `clubs`) + `TournamentListSection` με **hardcoded `section` object** (γρ. 123-134, `itemsPerPage: 20`) | Ο πίνακας τουρνουά του κλαμπ είναι κώδικας, όχι CMS section |
| `/federations` | `src/app/federations/page.tsx:14-16` | `getFederations()` (`directory.ts:447` → `/api/federations`) | Φιλτράρει **hardcoded** τα slug `ceb` και `union-mondiale-de-billard` εκτός λίστας |
| `/federations/[id]` | `src/app/federations/[id]/page.tsx:65-116` | Strapi `federations` | **Δύο διαφορετικά renders** (γρ. 73-85): slug `ceb`/`confederation-europeenne-de-billard` → `CebFederationExperience` (branded, με `CEB_MEMBER_SLUGS` hardcoded map `src/components/public/cebFederationMapData.ts`)· όλα τα άλλα → `FederationDetailContent` + `TournamentListSection` (hardcoded section object γρ. 99-110). UMB παίρνει hardcoded action «UMB rankings» (γρ. 89-92) |

#### 2.5 Κατατάξεις / Στατιστικά

| Route | Αρχείο | Πηγή | Σημειώσεις |
|---|---|---|---|
| `/rankings` | `src/app/rankings/page.tsx:14` | `fetchRankingSeriesIndex()` (`src/lib/rankings.ts:141` → `/api/ranking-series/index`, Strapi) | Ο πίνακας «UMB» είναι **hardcoded κάρτα** (γρ. 44-62)· τα υπόλοιπα από Strapi series |
| `/rankings/[slug]` | `src/app/rankings/[slug]/page.tsx:7` | `getRankingSeriesData` (`rankings.ts:158` → `/api/ranking-series/by-slug/<slug>/standings`) | Strapi |
| `/rankings/ceb` | `src/app/rankings/ceb/page.tsx:6-7` | **Τοπικό JSON** `readCebRanking`/`readCebRankingIndex` (`src/lib/cebRankingData.ts:33` → `public/data/ceb-ranking/index.json`) | Καμία CMS· τα νούμερα/λίστες είναι mirror του επίσημου CEB PDF |
| `/rankings/ceb/[slug]`, `/rankings/ceb/3c-individual`, `…/[edition]` | `src/app/rankings/ceb/[slug]/page.tsx:15` κ.λπ. | `public/data/ceb-ranking/*.json` + `archive/` | Ο importer ξαναγράφει το JSON στο server χωρίς rebuild |
| `/rankings/umb`, `/rankings/umb/3c-individual`, `…/[edition]` | `src/app/rankings/umb/page.tsx:7` | `readUmbRankingIndex`/`readUmbRanking` (`umbRankingData.ts:33` → `public/data/umb-ranking/*.json`) | Ίδιο μοτίβο, ξεχωριστός κατάλογος |
| `/rankings/btr` | `src/app/rankings/btr/page.tsx:33-37` | `fetchBtrRankingPage` + `listBtrRankingCountries` (`src/lib/publicSiteData.ts`, Strapi `bt-players`) | `revalidate = 300`· paginated client component |
| `/rankings/btr/methodology` | `src/app/rankings/btr/methodology/page.tsx:5` | `getBtrCoverageStats` (Strapi `bt-players`) + κείμενο κώδικα | `revalidate = 3600` |
| `/stats` | `src/app/stats/page.tsx:4` | **Redirect** → `/stats/player-rankings` | — |
| `/stats/player-rankings` | `src/app/stats/player-rankings/page.tsx:68` | `fetch('/api/stats/player-rankings')` → `src/app/api/stats/player-rankings/route.ts:142` (`/api/bt-players`) | Client, φίλτρα metric/year/gameType |
| `/stats/tournament-comparison` | `src/app/stats/tournament-comparison/page.tsx:136` | `fetch('/api/stats/tournament-comparison')` → route `:115` (`/api/bt-events`) | Client + recharts |

#### 2.6 Live / Scoreboards / Overlays

| Route | Αρχείο | Πηγή | Σημειώσεις |
|---|---|---|---|
| `/live` | `src/app/live/page.tsx:15-19` | `getClubs()` (Strapi) + `CmsPageShell` | Λίστα κλαμπ με links σε `/live/<documentId>` |
| `/live/[clubId]` | `src/app/live/[clubId]/page.tsx:12-16` | `requireClubByIdentifier` (Strapi) → `LiveClubView` | Το `LiveClubView` κάνει **WebSocket** (`src/components/live/LiveClubView.tsx:773,1289`) + `/api/scoreboard/session-by-id/<id>` (`:916`) + `/api/clubs/<id>/sessions` (`:1020`) |
| `/live/remote` | `src/app/live/remote/page.tsx:1` → `RemoteScoreboardHome.tsx` | `/api/admin/tournament/live-screens` (client) | Λεξικό i18n **hardcoded στο αρχείο** (`RemoteScoreboardHome.tsx:9-40`) |
| `/live/remote/control` | `src/app/live/remote/control/page.tsx:3` | `RemoteScoreboardControl` (client) | — |
| `/live-overlay` | `src/app/live-overlay/page.tsx:19-28` | `LiveOverlayPage` (client), `dynamic = "force-dynamic"`, `robots.index = false` | Επικαλύψεις βίντεο |
| `/scoreboards` | `src/app/scoreboards/page.tsx:13-23` | `ScoreboardsMonitorPage` → `fetch('/api/presence')` (`ScoreboardsMonitorPage.tsx:207`) | `/api/presence` (`src/app/api/presence/route.ts`) διαβάζει το **εξωτερικό WS presence** (`src/lib/wsPresence.ts:23` `wss://ws.billiardtoday.com/ws`) |
| `/presence` | `src/app/presence/page.tsx:1-3` | `PresenceDashboard` + `CmsPageShell` | Ίδιο presence backend |

#### 2.7 Embed (`/embed/*`, 18 routes)

| Route | Αρχείο | Πηγή |
|---|---|---|
| `/embed/tournaments`, `/embed/tournaments/[slug]`, `/embed/tournaments/events` | `embed/tournaments/page.tsx:2-4`, `…/[slug]/page.tsx:4-9`, `…/events/page.tsx` | CMS page `tournaments` · `TournamentDetailPage` (Strapi) · `TournamentEventsContent` |
| `/embed/clubs`, `/embed/clubs/[slug]` | `embed/clubs/page.tsx:2`, `…/[slug]/page.tsx:4-5` | `getClubs` / `requireClubByIdentifier` (Strapi) |
| `/embed/federations`, `/embed/federations/[id]` | `embed/federations/page.tsx:2`, `…/[id]/page.tsx:4` | Strapi `federations` |
| `/embed/live`, `/embed/live/[clubId]` | `embed/live/page.tsx:2`, `…/[clubId]/page.tsx:4` | Strapi clubs → `LiveClubView` |
| `/embed/overlay`, `/embed/overlay/[screen]` | `embed/overlay/page.tsx:1`, `…/[screen]/page.tsx:1` | `ObsOverlayClient`, `revalidate = 0` |
| `/embed/rankings`, `/embed/rankings/[slug]` | `embed/rankings/page.tsx:1` (**re-export** του `@/app/rankings/page`), `…/[slug]/page.tsx:3` | Strapi ranking series |
| `/embed/rankings/ceb`, `…/ceb/[slug]`, `…/[slug]/[edition]` | `embed/rankings/ceb/page.tsx:5` | **Τοπικό JSON** `public/data/ceb-ranking/*` |
| `/embed/players/[id]` | `embed/players/[id]/page.tsx:1` | Re-export του `@/app/players/[id]/PlayerProfileClient` |
| `/embed/page/[slug]` | βλ. 2.1 | CMS page |

#### 2.8 Πόρταλ ομοσπονδίας, λογαριασμοί παικτών, admin

| Route | Αρχείο | Πηγή | Σημειώσεις |
|---|---|---|---|
| `/federation` | `src/app/federation/page.tsx:4` | **Redirect** → `/federation/submit` | — |
| `/federation/login`, `/submit`, `/submissions` | `federation/login/page.tsx:3` κ.λπ. | Client `federationPortal` (`src/lib/federationPortal.ts:133` → `/api/federation-access/*`) → `portalProxy` (`src/lib/portalProxy.ts:22` → Strapi `/api/federation-portal/*`) | JWT στο localStorage |
| `/federation/preview` | `src/app/federation/preview/page.tsx:4` | **Τοπικό αρχείο** `./players-gr.json` + `federationPortal` | Demo preview |
| `/account-access/*` (22 `route.ts`, **καμία σελίδα**) | π.χ. `account-access/login/route.ts:14` | Proxy → `SERVER_API_URL/api/player-accounts/*` | Είναι API-only· οι σελίδες UI ζουν στο `/account/*` (11 `page.tsx`) που μιλούν με `src/lib/player-account-auth.ts` |
| `/admin/player-enrollment-requests` | `src/app/admin/player-enrollment-requests/page.tsx:96,126,140,158,175` | `/api/admin/player-enrollment-requests/*` → Strapi | 2 admin σελίδες συνολικά στο frontend |
| `/admin/player-accounts/[id]/dashboard` | `src/app/admin/player-accounts/[id]/dashboard/page.tsx` | `/api/admin/player-accounts/[id]/dashboard` | — |
| `/claim`, `/enroll`, `/link-device`, `/me` | `claim/page.tsx:12`, `enroll/page.tsx:5`, `link-device/page.tsx:6-7`, `me/page.tsx:6` | Client, `src/lib/trusted-device.ts` + `player-account-auth` → `/api/account-access/*` | Ροή λογαριασμού/συσκευής, όχι CMS |

#### 2.9 Στατικές / τεκμηρίωση / υπόλοιπα

| Route | Αρχείο | Πηγή | Σημειώσεις |
|---|---|---|---|
| `/news` | `src/app/news/page.tsx:6` | `listNewsArticles()` (`src/lib/cms/news.ts:67-88` → Strapi `pages` με `pageType=article`) | Λίστα άρθρων CMS· η σελίδα-λίστα είναι κώδικας |
| `/docs`, `/docs/[...slug]` | `docs/page.tsx:1`, `docs/[...slug]/page.tsx:1` | **Filesystem markdown**: `src/lib/docs.ts:4` `DOCS_ROOT = src/content/docs`, `readFileSync` (`:29,45,50`) | Επεξεργασία = PR/αρχείο, **όχι CMS** |
| `/manual` | `src/app/manual/page.tsx:15-43` | **Πλήρως hardcoded** `DocumentPage` sections | — |
| `/contact` | `src/app/contact/page.tsx:3-4` | `ContactPageClient` → `/api/contact` (`src/app/api/contact/route.ts` — `sendContactEmail` + Turnstile) | — |
| `/privacy-policy`, `/terms-of-service`, `/cookie-policy` | `privacy-policy/page.tsx:4` κ.λπ. | `DocumentPage` (κείμενο κώδικα) | **Δεν** είναι CMS σελίδες παρόλο που θα μπορούσαν |
| `/handicap` | `src/app/handicap/page.tsx:2` | `HandicapToolContent` → `/api/players/handicap-recommendation` (`route.ts:2-4`, Strapi `bt-players`) | — |
| `/teams`, `/teams/[slug]` | `src/app/teams/page.tsx`, `teams/[slug]/page.tsx` | **«Coming soon…»** hardcoded placeholders | Νεκρά routes |
| `/test/*` (4) | `test/page.tsx` κ.λπ. | Πειραματικά | Δημόσια προσβάσιμα |

---

### 3. Το CMS section/page-builder σύστημα

#### 3.1 Στοιβασία

1. **Strapi:** content-type `page` → `src/api/page/content-types/page/schema.json` (`collectionName: cms_pages`, `draftAndPublish: true`, enumeration `pageType: landing|standard|legal|article`). Πεδίο `sections` = **dynamiczone** με 19 components, `layoutTree` = `json`, `seo` = component `cms.seo-meta`. Τα component definitions ζουν στο `src/components/cms/` (**30 αρχεία** — 19 sections + 11 items/nav/media helpers, π.χ. `hero-section.json`, `tournament-list-section.json`, `post-list-item.json`).
2. **Frontend lib:** `src/lib/cms/strapi.ts` (fetch + normalization), `mappers.ts` (921 γρ., Strapi JSON → `CmsPage`), `types.ts` (418 γρ., ο `CmsSection` union γρ. 349-368), `layout.ts` (29 γρ., πλάτη container: text/content/page/full, γρ. 8-13), `sectionStyles.ts` (84 γρ., background/padding/shadow/overlay, γρ. 4-84), `metadata.ts` (SEO), `news.ts` (άρθρα), `sanitize.ts`.
3. **Frontend components:** `CmsPageView` (`src/components/cms/CmsPageView.tsx:13-53`) → `CmsPageShell` (header/footer/menus) + `CmsSectionRenderer` (`src/components/cms/CmsSectionRenderer.tsx:164-453`) που κάνει switch στο `__component`.

#### 3.2 Τα 19 sections που μπορεί να συνθέσει ο διαχειριστής

`src/lib/cms/types.ts:349-368` (ίδια λίστα στο Strapi schema):

`cms.hero-section`, `cms.card-section`, `cms.layout-grid-canvas-section`, `cms.layout-flex-canvas-section`, `cms.spacer-section`, `cms.image-section`, `cms.gallery-section`, `cms.video-embed-section`, `cms.image-text-split-section`, `cms.rich-text-section`, `cms.feature-grid-section`, `cms.stats-section`, `cms.service-cards-section`, `cms.logo-strip-section`, `cms.testimonials-section`, `cms.posts-list-section`, `cms.tournament-list-section`, `cms.cta-banner`, `cms.faq-section`.

Κοινά props σε **όλα**: `visibility` (`all|page-only|embed-only`, φιλτράρεται στο `CmsSectionRenderer.tsx:13-17`), `backgroundStyle/Color/Image`, `paddingY`, `marginTop/Bottom`, `borderColor`, `radius`, `shadow`, `overlayStrength` (`types.ts:77-97`), και για τα marketing sections responsive `contentAlign/Width/titleSize/bodySize` + mobile variants (`types.ts:99-108`).

Οι υπο-ενότητες `grid-canvas`/`flex-canvas` είναι **nested** (`cells: CmsSection[][]`, `types.ts:154,164`) και το renderer κάνει recursion (`CmsSectionRenderer.tsx:192,268`).

#### 3.3 Τι είναι ΜΟΝΟ κώδικας

- **Οποιοδήποτε `__component` εκτός της λίστας** → fallback «Unsupported CMS section.» (`CmsSectionRenderer.tsx:447-453`).
- **Layout/δομή της αρχικής** (`src/app/page.tsx:41-52`) — δεν προέρχεται από sections.
- **`section` objects που περνιούνται hardcoded** σε `TournamentListSection` από κώδικα: `/clubs/[slug]` (`page.tsx:123-134`), `/federations/[id]` (`page.tsx:99-110`), `/tournaments` fallback (`page.tsx:14-25`).
- **Όλα τα `/rankings/ceb*`, `/rankings/umb*`** (τοπικό JSON), **`/docs/*`** (markdown), **`/manual`, `/teams`, `/privacy-policy`, `/terms-of-service`, `/cookie-policy`** (κείμενο κώδικα), **`/rankings/btr`**, **`/stats/*`**, **`/news` (λίστα)**, **`/players`, `/clubs`, `/federations`, `/live*`, `/scoreboards`, `/presence`, `/handicap`, `/federation/*`, `/account*`, `/admin/*`, `/test/*`** και όλα τα **`/embed/*`** πλην `embed/page/[slug]` & `embed/tournaments`.

#### 3.4 Ο editor στο admin app

Ο πραγματικός page-builder είναι στο `2-billiardtoday-admin`: `src/app/(protected-pages)/admin/cms/builder/page.tsx`, `…/admin/cms/pages/[id]/page.tsx`, `…/admin/cms/pages/new/page.tsx`, `…/admin/cms/templates`, `…/admin/cms/patterns`, `…/admin/cms/themes`.
Η παλέτα: `src/components/cms/puck/PuckPageEditor.tsx:1031-1054` — 19 `cms.*` sections + επιπλέον **Puck-only blocks** (`cms.button-block`, `cms.logo-block`, `cms.menu-block`, `cms.button-group-block`, `cms.social-links-block`, `cms.contact-info-block`, `cms.layout-section`) και 17 presets (`preset:intro-page` … `preset:layout-25-50-25`, γρ. 1013-1030).
Ο μετασχηματισμός Puck → Strapi: `src/components/cms/puck/mappers.ts:273-308` (`cms.layout-section` → αποθηκεύεται στο `layoutTree` ως `{type, props}`) και `:311-387` (`mapPuckNodesToStrapi`· τα `layout-grid/flex-canvas-section` παίρνουν `cells: [mapPuckNodesToCanvasStorage(column1..4)]`).
Το theme/εμφάνιση έρχεται στο frontend από **άλλο host**: `getCmsAppearance` (`src/lib/cms/strapi.ts:164-178`) χτυπά `CMS_ADMIN_URL/api/cms/theme` με fallback σε defaults (γρ. 106-162).

---

### 4. Νούμερα: CMS-driven vs κώδικας

| Κατηγορία | Πλήθος | Routes |
|---|---|---|
| **Πλήρως CMS-driven** (render μέσω `CmsPageView` από content-type `page`) | **5** | `/[...slug]`, `/tournaments`, `/embed/tournaments`, `/embed/page/[slug]`, `/news/[slug]` |
| **Hybrid** (CMS τιμές, hardcoded δομή) | **1** | `/` |
| **Μόνο κώδικας** (server components από Strapi/directory) | ~**38** | `/players*`, `/clubs*`, `/federations*`, `/rankings*`, `/rankings/btr*`, `/live*`, `/scoreboards`, `/presence`, `/news`, `/tournaments/[slug]`, `/tournaments/events*`, `/tournaments/team*`, `/tournaments/live*`, `/federation*`, `/handicap`, `/docs*`, `/manual`, `/contact`, `/teams*`, `/privacy-policy`, `/terms-of-service`, `/cookie-policy`, `/me`, `/claim`, `/enroll`, `/link-device`, `/admin/*` |
| **Μόνο τοπικά αρχεία** | **13 routes** | `/rankings/ceb*` (5), `/rankings/umb*` (3), `/embed/rankings/ceb*` (3), `/docs*` (2 — markdown) |
| **Embed re-exports** (χωρίς δική τους πηγή) | 5 | `/embed/rankings`, `/embed/rankings/[slug]`, `/embed/players/[id]`, `/embed/overlay*` |
| **Redirects / placeholders** | 4 | `/stats` → `/stats/player-rankings`, `/federation` → `/federation/submit`, `/teams`, `/teams/[slug]` |
| **Σύνολο δημόσιων** | **77** | (94 `page.tsx` − 11 `account` − 2 `admin` − 4 `test`) |
| **API routes** | **106** `route.ts` | από αυτά 22 στο `account-access/*` |

Δηλαδή **λιγότερο από 8% των δημόσιων σελίδων (6/77) είναι CMS-composed**· το υπόλοιπο χτίζεται σε κώδικα πάνω σε Strapi content-types ή τοπικά αρχεία.

---

### 5. Πώς υπολογίζονται/δημοσιεύονται οι κατατάξεις

| Κατάταξη | Πηγή αλήθειας | Υπολογισμός | Δημοσίευση |
|---|---|---|---|
| **CEB** (`/rankings/ceb*`) | `public/data/ceb-ranking/*.json` (+ `pdf/*.pdf`, `index.json`, `player-links*.json`) | **Mirror του επίσημου CEB PDF**, δεν ξαναϋπολογίζεται· offline scripts (`docs/ai/ceb-ranking/README.md`: `parse_final.py` → `verify_rows.py` → `build_ceb_data.py`) | Ξαναγράφεται το JSON στο server, χωρίς rebuild· `revalidate = 300` |
| **UMB** (`/rankings/umb*`) | `public/data/umb-ranking/*.json` (χωρις κάποιο `pdf/` dir — μόνο `archive/`) | Ίδιο μοτίβο importer | Ίδιο |
| **BTR** (`/rankings/btr`) | Strapi `bt-players` | `fetchBtrRankingPage` (`src/lib/publicSiteData.ts`, server-side pagination) | `revalidate = 300`, `s-maxage=300` (`/api/rankings/btr/route.ts:25`) |
| **Ranking series** (`/rankings/[slug]`) | Strapi `ranking-series` | `/api/ranking-series/index`, `/by-slug/<slug>/standings` (`src/lib/rankings.ts:141,158`) | Strapi δημοσιεύει (πεδία series) |
| **Event standings** (σελίδες event) | Strapi `bt-results` | Ξαναγράφεται από `standingsCalculator.calculateAndUpdateGroupStage` σε κάθε αποτέλεσμα· fallback `computed-stage-results` από `/api/event-stages/<id>/standings` | Live, χωρίς build |

**PDF export:** `/api/rankings/ceb/pdf` (`route.ts:2,25`) και `/api/rankings/umb/pdf` (`route.ts:2,26`) διαβάζουν τα **ίδια τοπικά JSON** και παράγουν PDF — άρα η «δημοσίευση» είναι θέμα αντικατάστασης αρχείων στο `public/data/`.

---

### 6. Κενά / χειροκίνητη δουλειά (συγκεκριμένα παραδείγματα)

1. **Οι κατατάξεις CEB/UMB είναι δουλειά developer.** `src/lib/cebRankingData.ts:33` και `src/lib/umbRankingData.ts:33` διαβάζουν `fs.readFileSync` από `public/data/**` και το path είναι **σταθερό στον κώδικα**: νέο edition = νέο JSON + `index.json` + `git commit` + `bt-sync frontend`. Δεν υπάρχει CMS content-type για ανέβασμα κατάταξης από UI (υπάρχουν `ceb-ranking-edition`, `ceb-ranking-entry` … στο Strapi API list, αλλά η δημόσια σελίδα **δεν** τα διαβάζει — διαβάζει το αρχείο).
2. **Τα κείμενα των σελίδων `/docs/*` είναι PR.** `src/lib/docs.ts:4` διαβάζει markdown από `src/content/docs` — ο διαχειριστής δεν έχει UI.
3. **Οι νομικές σελίδες δεν είναι CMS.** `/privacy-policy`, `/terms-of-service`, `/cookie-policy` χρησιμοποιούν `DocumentPage` με hardcoded `sections` (π.χ. `src/app/manual/page.tsx:20-42`), ενώ το CMS έχει `pageType: legal` που δεν χρησιμοποιείται εκεί.
4. **Κάθε λίστα τουρνουά εκτός CMS απαιτεί αλλαγή κώδικα** για να αλλάξει η συμπεριφορά της: `/clubs/[slug]/page.tsx:128`, `/federations/[id]/page.tsx:104` και το fallback `/tournaments/page.tsx:19` έχουν το **ίδιο literal `itemsPerPage: 20`** σε τρία αρχεία (αλλάζουν μαζί, αλλιώς ασυμφωνία).
5. **Η αρχική δεν είναι συνθέσιμη.** Νέο section στην αρχική = νέο component στο `src/components/landing/*` + νέα γραμμή στο `src/app/page.tsx:43-50` + νέο default στο `src/components/landing/content.ts:139-330`. Το CMS page «home» μπορεί να αλλάξει μόνο τα κείμενα που διαβάζει το `getSection` (γρ. 133-137).
6. **Το `/teams` και `/teams/[slug]` είναι «Coming soon…»** hardcoded (`src/app/teams/page.tsx`, `teams/[slug]/page.tsx`) — δημόσια routes χωρίς λειτουργία.
7. **Το `/tournaments/live/soop` δείχνει σε σταθερό εξωτερικό κανάλι** `https://play.sooplive.com/afbilliards<table>` (`src/app/tournaments/live/soop/page.tsx:29-35`) — αλλαγή provider = deploy.
8. **Τα Puck-only blocks δεν είναι εγγυημένο ότι φτάνουν στο frontend.** Η παλέτα του admin (`PuckPageEditor.tsx:1031-1054`) προσφέρει `cms.button-block`, `cms.logo-block`, `cms.menu-block`, `cms.social-links-block`, `cms.contact-info-block` που **δεν** υπάρχουν στον `CmsSection` union (`types.ts:349-368`) ούτε στο renderer → ένα τέτοιο section πέφτει στο «Unsupported CMS section.» (`CmsSectionRenderer.tsx:447-453`) εκτός αν το mapping (`mappers.ts:311-387`) το μετατρέψει πρώτα.
9. **Το `getCmsAppearance` εξαρτάται από τον admin host.** Αν το `CMS_ADMIN_URL` (`src/lib/cms/strapi.ts:10-13`) δεν οριστεί, το site δουλεύει με hardcoded defaults (`strapi.ts:106-162`) — δηλαδή «αλλαγή χρώματος/γραμματοσειράς» από το CMS απαιτεί και σωστό env στο frontend.
10. **Το `/federation/preview` διαβάζει τοπικό JSON** (`src/app/federation/preview/page.tsx:4` `./players-gr.json`) — demo δεδομένα μέσα στο repo.

### 7. Τι λείπει για αυτοεξυπηρέτηση χωρίς κώδικα (ελάχιστα)

- **Κατατάξεις:** ένα endpoint/CMS type που να σερβίρει το `public/data/*.json` (ή τα `ceb-ranking-*` content-types που ήδη υπάρχουν στο Strapi) + upload UI στο admin, ώστε ο importer να μη χρειάζεται deploy.
- **Νομικά/teams/manual:** μετατροπή σε CMS `page` με `pageType: legal` — το rendering υπάρχει ήδη (`CmsPageView`), λείπουν μόνο τα records.
- **Λίστες τουρνουά:** τα τρία hardcoded `section` objects να γίνουν CMS `cms.tournament-list-section` (ο renderer υποστηρίζει ήδη `clubSlug`/`federationId` μέσω props, αλλά το section schema δεν έχει τέτοια πεδία — `src/lib/cms/types.ts:313-324`).
- **Αρχική:** να περάσει από `[...slug]`/`CmsPageView` ή να αποκτήσει dynamiczone που να οδηγεί τη σειρά των ενοτήτων.
- **Puck palette:** να αφαιρεθούν ή να χαρτογραφηθούν πλήρως τα 5 blocks που παράγουν «Unsupported CMS section.».

---

## Β. Η αλυσίδα του «live»: πηγές, transport, ρυθμοί

*Πηγή αρχείου εργασίας: `02-live-chain.md` (αποτέλεσμα read-only μελέτης).*

**Σκοπός:** χάρτης της πραγματικής «ζωντανής» ροής με αποδείξεις κώδικα (αρχείο:γραμμή / endpoint).
**Μέθοδος:** static read-only ανάγνωση. Κάθε νούμερο προέρχεται από σταθερά (`const ..._MS`) ή literal `setInterval(...)` σε συγκεκριμένο αρχείο:γραμμή. Καμία εκτίμηση.
**Repos:** Frontend `D:/Projects/4-billiardtoday-frontend`, Strapi `D:/Projects/1-billiards-strapi`, Scoreboard `D:/Projects/3-BilliatdToday-Scoreboard`.

---

### 0. Σύνοψη transport (τι είναι τι)

| Transport | Τύπος | Πού χρησιμοποιείται | Πηγή |
|---|---|---|---|
| HTTP polling (fetch + `cache:"no-store"`) | **polling** | Όλα τα «live» δεδομένα που διαβάζονται από DB/Strapi (σκορ, κατατάξεις, live sessions, presence) | παντού στα components |
| WebSocket `wss://ws.billiardtoday.com/ws` (relay) | **WS (push)** | Άμεσο σκορ (`score:update`) σε overlays/ζωντανές κάρτες, lifecycle sessions (`SESSION_ASSIGNED/UPDATED`) και «dirty» σήματα κατατάξεων (`stage_standings_dirty` κ.λπ.) | `ws-server/server.js`, `src/lib/wsPublisher.ts` (scoreboard), `src/services/*WsPublisher.ts` (Strapi) |
| HTTP presence endpoint `GET /presence` (στον ίδιο WS host) | **polling** | Λίστα ενεργών scoreboard screens | `src/lib/wsPresence.ts:20,45-63` |
| SSE / `EventSource` | **ΔΕΝ υπάρχει** | — | πουθενά (grep: 0 hits) |

**Κρίσιμη διάκριση:** το WS relay **δεν** είναι πηγή αλήθειας. Είναι fan-out/relay: κρατά `lastState` ανά screen και το κάνει replay σε νέους subscribers. Η πηγή αλήθειας για τα δικά μας σκορ είναι ο Strapi πίνακας `scoreboard_sessions` (και `bt-results` για κατατάξεις).

---

### 1. Πηγές αλήθειας (πίνακες)

| Δεδομένο | Πηγή αλήθειας | Endpoint (Strapi custom) | Σημείωση |
|---|---|---|---|
| Τρέχουσα ζωντανή συνεδρία (σκορ καρέ/σειράς, innings, high run, run, timeouts, target points, φωτογραφίες, χώρες) | Πίνακας **`scoreboard_sessions`** | `GET /api/scoreboard/sessions` · `GET /api/scoreboard/sessions/:id` · `GET /api/scoreboard/screens/:screenIdentifier/sessions` | `collectionName: "scoreboard_sessions"` → `src/api/scoreboard-session/content-types/scoreboard-session/schema.json:3`. Routes: `src/api/scoreboard-session/routes/scoreboard-session.ts:4-56` |
| Ζωντανή κατάταξη stage (group standings) | Πίνακας **`bt-results`** (στην ουσία «αποθηκευμένα» standings) | `GET /api/bt-results?filters[event_stage][documentId][$eq]=...` (pagination pageSize=1000) | `src/app/api/event-stages/[stageId]/standings/route.ts:30-66` |
| Session lifecycle (ποια οθόνη ποιον αγώνα παίζει) | `scoreboard_sessions` + WS | `SESSION_ASSIGNED` / `SESSION_UPDATED` στο relay | Strapi: `src/services/scoreboardWsPublisher.ts:216,227` |
| External (Five&Six / cuesco-umbeu) live tables | **HTML scraping** από `http://umbeu.cueuny.com/tournament/live/webtables/<competitionIdx>` | Τοπικό route `GET /api/tournaments/[eventId]/external-live-tables` | `src/app/api/tournaments/[eventId]/external-live-tables/route.ts:316-338` |

---

### 2. Δικά μας scoreboards — πώς φτάνουν στο public site

#### 2.1 Live κάρτες club (`/live/[clubId]`, `/embed/live/[clubId]`, `/live`)

Component: `src/components/live/LiveClubView.tsx` (shared από `/live/[clubId]/page.tsx:2` και `/embed/live/[clubId]/page.tsx:2`).

| Ροή | Πηγή/endpoint | Transport | Ρυθμός | Αρχείο:γραμμή |
|---|---|---|---|---|
| Λίστα ενεργών sessions του club | `/api/clubs/<clubId>/sessions?status=in_progress,pending&fallback=true` | polling `no-store` | **20s** | `LiveClubView.tsx:1020` (fetch), `:1227-1229` (`setInterval(load, 20000)`) |
| Καθαρισμός stale καρτών | τοπικό state | ρολόι | **30s** | `LiveClubView.tsx:1235` (`setInterval(pruneItems, 30000)`) |
| Άμεσο σκορ (χωρίς poll) | WS `subscribe:club` + `score:update` | **WS** | push όταν έρθει update | `LiveClubView.tsx:1289-1298` (subscribe), `:1306` (onmessage) |
| WS ανά ενεργή οθόνη | WS `?screenId=<id>` | **WS** | push | `LiveClubView.tsx:1761-1786` |
| Delay replay (καθυστέρηση σκορ) | τοπικό ιστορικό + ρολόι | ρολόι | **500ms** | `LiveClubView.tsx:1830-1832` |

Πίσω από `/api/clubs/[clubId]/sessions`: `fetchScoreboardSessionRows(['pending','in_progress'])` → Strapi `/api/scoreboard/sessions?filters[$or][..][sessionStatus][$eq]=..&populate=*&sort=updatedAt:desc&pagination[pageSize]=100`, `cache:"no-store"` (`src/lib/liveSessions.ts:412-425`).

#### 2.2 `/live` (index) & `/tournaments/live` (monitor)

| Στοιχείο | Endpoint | Transport | Ρυθμός | Αρχείο:γραμμή |
|---|---|---|---|---|
| `/live` index | server-rendered, λίστα clubs + links (`/live/<id>`, `/embed/live/<id>`) | SSR | — | `src/app/live/page.tsx:14-63` |
| `/tournaments/live` (Live Tournaments) | `getLiveScreens()` → `/api/admin/tournament/live-screens` | polling | **10s** interval + `revalidate:5` στο fetch | `src/app/tournaments/live/page.tsx:61`· `src/lib/api.ts:165-169` |
| `/api/admin/tournament/live-screens` | `fetchScoreboardSessionRows(['pending','in_progress'])` | server fetch `no-store` | per-request | `src/app/api/admin/tournament/live-screens/route.ts:44` |

#### 2.3 `/scoreboards` (monitor) & `/presence`

| Στοιχείο | Endpoint | Transport | Ρυθμός | Αρχείο:γραμμή |
|---|---|---|---|---|
| `/scoreboards` monitor | `/api/presence` (`cache:"no-store"`) | polling | **30s** | `src/components/scoreboards/ScoreboardsMonitorPage.tsx:13,207,232` |
| `/presence` dashboard | `/api/presence` (`cache:"no-store"`) | polling | **10s** (UI label «Auto refresh: 10s») | `src/components/presence/PresenceDashboard.tsx:13,71,95,164` |
| `/api/presence` | `fetchPresenceEntries()` → `getPresenceEndpoint()` = `<ws-host>/presence` | server fetch | per-request | `src/app/api/presence/route.ts:2-8`· `src/lib/wsPresence.ts:45-63,138-142` |

Το presence endpoint είναι HTTP GET πάνω στον ίδιο host με το WS (`wss://ws.billiardtoday.com/ws` → `https://ws.billiardtoday.com/presence`), default `src/lib/wsPresence.ts:20`.

#### 2.4 `/live-overlay`, `/embed/overlay`, `/embed/overlay/[screen]` (OBS overlay)

Component: `src/components/overlay/ObsOverlayClient.tsx`.

| Στοιχείο | Endpoint | Transport | Ρυθμός | Αρχείο:γραμμή |
|---|---|---|---|---|
| Φόρτωση session by id | `/api/scoreboard/session-by-id/<sessionId>` | polling `no-store` | on-mount + σε κάθε WS lifecycle | `ObsOverlayClient.tsx:479-483` |
| Φόρτωση by screen | `/api/scoreboard/screens/<screenId>/sessions?status=pending,in_progress` | polling `no-store` | on-mount + σε lifecycle | `ObsOverlayClient.tsx:510-513` |
| Resolve overlay slug → screen | `/api/scoreboard/screens/by-overlay-slug/<slug>` | polling `no-store` | on-mount | `ObsOverlayClient.tsx:575-578` |
| Άμεσο σκορ + break stats | WS `?screenId=<id>` (`score:update`, `overlay:break:start/end`, `SESSION_ASSIGNED/UPDATED`, `LIVE_SYNC_DELAY_UPDATED`) | **WS** | push | `ObsOverlayClient.tsx:618-702`, reconnect **2500ms** `:148,682-689` |
| `/embed/overlay` & `/embed/overlay/[screen]` | `dynamic="force-dynamic"`, `revalidate=0` | SSR shell | — | `src/app/embed/overlay/page.tsx:7-11`· `[screen]/page.tsx` |
| `/live-overlay` | `dynamic="force-dynamic"`, `revalidate=0` | SSR shell | — | `src/app/live-overlay/page.tsx:8-9` |

> Σημ.: **κανένα `setInterval` polling στο ObsOverlayClient** — μετά το initial load, το live ανανεώνεται αποκλειστικά από WS push (ή reload σε lifecycle event). Αυτό είναι το πιο «πραγματικά live» κομμάτι του site.

#### 2.5 `/live/remote` & `/live/remote/control`

| Στοιχείο | Endpoint | Transport | Ρυθμός | Αρχείο:γραμμή |
|---|---|---|---|---|
| Remote home | `/api/scoreboard/screens` + `/api/scoreboard/screens/<id>/sessions` | polling `no-store` | per-action | `src/components/live/RemoteScoreboardHome.tsx:164,234-235` |
| Remote control | `/api/scoreboard/screens/<id>/sessions`, `/api/scoreboard/session-by-id/<id>`, `POST /api/scoreboards/<id>/events` | polling + POST εντολών | per-action | `src/components/live/RemoteScoreboardControl.tsx:146-147,192,217,257` |
| POST proxy εντολών | Strapi `POST /api/scoreboards/:id/events` → relay `REMOTE_COMMAND` | WS | push | `src/app/api/scoreboards/[id]/events/route.ts:47-55`· `src/services/scoreboardWsPublisher.ts:255` |

#### 2.6 Δύο components «LiveScoreBoardCard»

| Αρχείο | Χρήση | Σημείωση |
|---|---|---|
| `src/components/LiveScoreBoardCard.tsx` | **μόνο αυτό χρησιμοποιείται** — imported από `live/LiveClubView.tsx:20` (dynamic, ssr:false) και `tournaments/TournamentDetailPage.tsx:9` | `props: item` τύπου club-live |
| `src/components/live/LiveScoreBoardCard.tsx` | **αχρησιμοποίητο** (0 imports στο `src`) | dead code — δέχεται `LiveSessionItem` |

Απόδειξη: `grep -rn "LiveScoreBoardCard" src | grep import` → μόνο τα δύο imports προς `@/components/LiveScoreBoardCard`. Το `components/live/...` δεν εμφανίζεται πουθενά.

---

### 3. External provider (cuesco / umbeu Five&Six)

Route: `src/app/api/tournaments/[eventId]/external-live-tables/route.ts`.

| Στοιχείο | Τιμή | Αρχείο:γραμμή |
|---|---|---|
| Πηγή | HTML `http://umbeu.cueuny.com/tournament/live/webtables/<competitionIdx>` | `:316` |
| Fetch | `cache:"no-store"`, custom User-Agent | `:324-329` |
| Cache απόκρισης (in-memory Map) | **8000 ms** (`CACHE_TTL_MS = 8000`) | `:22,319-320,345` |
| Cache config playerMap | **60 000 ms** (`CONFIG_CACHE_TTL_MS = 60_000`) | `:33,59-78` |
| `runtime` / `dynamic` | `nodejs` / `force-dynamic` | `:6-7` |
| gating | αν δεν υπάρχει `competitionIdx` → `{data:[], configured:false}` | `:307-314` |
| Parsing | regex scraping panels `div.panel_box.top_info` (names, score `count`, INN, Avg/HR, video) | `:218-302` |
| Εμπλουτισμός χώρας | `playerMap[cuescoId] → btPlayer documentId` από `bt-events.timetable_config.externalResultSync.playerMap`, μετά `GET /api/bt-players` (fields=country) | `:61-95`, `:115-144` |
| Strip φωτογραφιών provider | `playerAPhotoUrl/B/... = null` (αποφυγή hotlink) | `:148-163` |

**Client πλευρά (poll + gating):** στο `TournamentDetailPage.tsx` το external poll τρέχει **μόνο** όταν `activeView === "live"` **και** `summary.externalLiveScoresEnabled`:

| Ροή | Ρυθμός | Αρχείο:γραμμή |
|---|---|---|
| `refreshExternalLiveTables()` → `/api/tournaments/<id>/external-live-tables?competitionIdx=...` `cache:"no-store"` | **10s** | `TournamentDetailPage.tsx:2363-2387` |
| gating (`externalLiveScoresEnabled`, `activeView!=="live"` → return) | — | `:2350-2359` |

Σημ.: το in-memory cache 8s σημαίνει ότι 10s client poll ≈ πραγματικό upstream fetch ~κάθε 10s (cache δεν προλαβαίνει να λήξει πριν το επόμενο· άρα **1 upstream hit / 10s** όταν ένας client, περισσότεροι clients μοιράζονται το cache).

**Config parsing:** `readExternalLiveScoresConfig` διαβάζει `timetable_config.externalResultSync.liveScores.enabled` + `externalResultSync.competitionIdx` (`src/lib/tournaments.ts:149-171,574-575`) και `readExternalLiveTablesHref` διαβάζει `externalResultSync.liveButton` (`:113-...`). `externalLiveTablesHref` δείχνει `/tournaments/live/soop?table=N` μόνο για το whitelisted event `ac6fd1dd-487b-409d-9424-606d8b683ed8` (`src/lib/externalLiveTables.ts:1-15`). **`getExternalLiveTablesCompetitionIdx()` επιστρέφει πάντα `null`** (`externalLiveTables.ts:17-19`) — οπότε η `competitionIdx` του route προέρχεται αποκλειστικά από το query param του wrapper.

---

### 4. Ζωντανές κατατάξεις (standings)

#### 4.1 Πού τρέχει ποιο poll

| Σελίδα | Wrapper/Component | Event-data poll | Live-sessions poll | Bracket poll |
|---|---|---|---|---|
| `/tournaments/<slug>` (και `/embed/tournaments/<slug>`) | `TournamentDetailPage.tsx` → εσωτερικά `TournamentEventsContent` με `disableAutoRefresh` (`:7142`) | **60s** (`EVENT_FALLBACK_POLL_MS = 60000`, `:953`, `:2425-2428`) + σε `focus`/`visibilitychange` (`:2416-2431`) | **30s** (`LIVE_SESSIONS_FALLBACK_POLL_MS = 30000`, `:954`, `:2560-2563`) | — |
| `/tournaments/events` (standalone) | `TournamentEventsContent` (= `app/tournaments/events/page.tsx:5`) χωρίς disableAutoRefresh | **10s** (`:3433-3436`) | **5s** (`:3493-3495`) + bursts **1.5s / 4s / 8s** (`:3484-3492`) | **5s** (`:4925`) |

`disableAutoRefresh` semantics (`TournamentEventsContent.tsx`):
- `isEventDataControlled = disableAutoRefresh` (`:3314`) → απενεργοποιεί το εσωτερικό 10s event-data poll (`:3414-3442` `if (!eventId || isEventDataControlled) return`) και χρησιμοποιεί το `eventDataOverride` (`:3369-3374`).
- `isLiveSessionsControlled = disableAutoRefresh || liveSessionsOverride !== null` (`:3315`) → απενεργοποιεί το εσωτερικό 5s live-sessions poll (`:3444-3448`) και χρησιμοποιεί το `liveSessionsOverride` (`wrapper: :7163 presentedEventLiveSessions`).

Άρα στο **public** `/tournaments/<slug>`: event-data=60s, live-sessions=30s, external tables=10s, live-screens=10s, WS push. Το εσωτερικό 10s/5s **δεν** τρέχει εκεί.

#### 4.2 Ποιος γράφει τα bt-results (πηγή για standings)

Ο υπολογισμός/εγγραφή των κατατάξεων γίνεται server-side στο Strapi (bt-results), όχι στο frontend:

| Ενέργεια | Συνάρτηση | Αρχείο:γραμμή |
|---|---|---|
| Υπολογισμός + εγγραφή standings group stage | `standingsCalculator.calculateAndUpdateGroupStage(eventStageId, config)` | `src/services/standingsCalculator.ts:1650` |
| Εγγραφή γραμμών `bt-results` (create/update) | `standingsCalculator.updateStandingsRecords` | `standingsCalculator.ts:1451-1586` |
| Κλήσεις από bt-event-stage controller | — | `src/api/bt-event-stage/controllers/bt-event-stage.ts:991,1370,3293` |
| Κλήσεις από άλλα services | bt-group, cuescoResultSync, finalResultsPublisher, groupOfFourAdvancer | `src/api/bt-group/services/bt-group.ts:59-79`, `src/services/cuescoResultSync.ts:3059,3179`, `src/services/finalResultsPublisher.ts:297`, `src/services/groupOfFourAdvancer.ts:86` |

#### 4.3 Endpoint `/api/event-stages/[stageId]/standings`

`src/app/api/event-stages/[stageId]/standings/route.ts` (server), `runtime="nodejs"`, όλα `cache:"no-store"`:

| Σειρά (fallback chain) | Προϋπόθεση | Πηγή απόκρισης |
|---|---|---|
| 1. `source:"stored-results"` | knockout χωρίς round/mode **ή** group stage → υπάρχουν bt-results | `fetchStoredStageResults` → `/api/bt-results?...&pagination[pageSize]=1000` `:30-66,463-484` |
| 2. `source:"computed-stage-results"` | group stage χωρίς bt-results αλλά υπάρχουν matches | `buildComputedGroupStandings` από `/api/bt-event-stages/:id/matches` `:486-495,176-287` |
| 3. direct Strapi | — | `/api/bt-event-stages/:id/standings` (+ `round`/`mode`) `:317-345,498` |
| 4. knockout normalization | knockout χωρίς round/mode | `normalizeKnockoutStandingsPayload` `:396-446,517-520` |

Το frontend διαβάζει `results|data|standings` από την απόκριση (`TournamentDetailPage.tsx:2116-2121`) — άρα το `stored-results` (bt-results) είναι το κανονικό μονοπάτι.

---

### 5. Realtime transport — λεπτομέρειες

#### 5.1 WS relay (`D:/Projects/3-BilliatdToday-Scoreboard/ws-server/server.js`)

| Λειτουργία | Λεπτομέρεια | Γραμμή |
|---|---|---|
| Client registries | `clientsByScreen`, `clientsByClub`, `clientsByEvent`, `lastState`, `lastStateByClub`, `presence` | `:90-97` |
| Presence HTTP | `GET /presence` στον ίδιο server | `:113` |
| Replay σε νέα σύνδεση | στέλνει `lastState.get(screenId)`/`lastDelay` μόλις συνδεθεί | `:382-389` |
| `subscribe:club` / `subscribe:event` | εγγραφή σε club/event κανάλι | `:436-468` |
| `score:update` | `lastState.set` + broadcast σε screen + `broadcastToClub` αν `clubId`, cache per club, clear σε `ended` | `:593-627` |
| `SESSION_ASSIGNED` / `SESSION_UPDATED` | relay σε screen + club + event, ενημέρωση `lastStateByClub` (delete αν `finished/cancelled`) | `:494-529` |
| `overlay:break:start/end` | relay σε screen (με screen validation) | `:552-560` |
| `LIVE_SYNC_DELAY_UPDATED` | relay + cache per screen, broadcast club/event | `:562-580` |
| «dirty» σήματα tournament | `stage_matches_dirty`, `stage_standings_dirty`, `final_results_dirty`, `match_updated` → `broadcastToEvent` | `:582-591` |
| `REMOTE_COMMAND` | relay σε screen | `:544-550` |
| Heartbeat ping/pong | κάθε 30s (cleanup dead connections) | `ws-server/README.md` |

#### 5.2 Ποιοι publishάρουν στο relay

| Publisher | Payload | Αρχείο:γραμμή |
|---|---|---|
| Strapi `scoreboardWsPublisher` | `SESSION_ASSIGNED` (:216), `SESSION_UPDATED` (:227), `REMOTE_COMMAND` (:255) | `src/services/scoreboardWsPublisher.ts` |
| Strapi `tournamentWsPublisher` | `stage_matches_dirty` (:118), `stage_standings_dirty` (:133), `final_results_dirty` (:147), `event_shell_dirty` (:160), `timetable_dirty` (:173) | `src/services/tournamentWsPublisher.ts` |
| Scoreboard client (`src/lib/wsPublisher.ts`) | `score:update`, `overlay:break:*`, delay updates; reconnect 2000ms, queue max 10 | `src/lib/wsPublisher.ts:17-101` (scoreboard repo) |
| Triggers (Strapi) | `emitStageDirty` από bt-event-stage controller (`:16-51`)· lifecycles (bt-event-stage→shell, timetable-slot→timetable, scoreboard-session→SESSION_UPDATED) | `bt-event-stage/controllers/bt-event-stage.ts:16-51`, `bt-event-stage/content-types/.../lifecycles.ts:63`, `scoreboard-session/content-types/.../lifecycles.ts:30` |

Ενεργοποίηση relay στο Strapi: env `SCOREBOARD_WS_URL`/`SCOREBOARD_WS_ENDPOINT`/`NEXT_PUBLIC_WS_ENDPOINT` — **αν κενό, ο publisher είναι no-op** (`tournamentWsPublisher.ts:3-13,88-89`; `scoreboardWsPublisher.ts:3-13,130`).

#### 5.3 Frontend WS subscriptions (ποιος ακούει τι)

| Σημείο | Subscription | payloads που χειρίζεται | Αρχείο:γραμμή |
|---|---|---|---|
| Tournament detail | `subscribe:event` (eventId) | `stage_matches_dirty`→refreshStageMatches, `stage_standings_dirty`→refreshStageStandings, `final_results_dirty`→refreshFinalResults, `event_shell_dirty`/`timetable_dirty`→refreshEventData (throttle 1500ms), `SESSION_*`→refreshEventLiveSessions, delay payload | `TournamentDetailPage.tsx:2580-2652` |
| Tournament detail (club) | `subscribe:club` (clubId) | `SESSION_ASSIGNED/UPDATED` → merge στο `wsLiveSessions` | `TournamentDetailPage.tsx:2694-2739` |
| Tournament detail (3ο socket) | (screenId) | delay payload | `TournamentDetailPage.tsx:3061-3074` |
| Club live view | `subscribe:club` | `score:update` + lifecycle | `LiveClubView.tsx:1289-1306` |
| Club live view (per screen) | `?screenId=` | delay payload | `LiveClubView.tsx:1761-1786` |
| OBS overlay | `?screenId=` | `score:update`, `overlay:break:*`, `SESSION_*`, delay | `ObsOverlayClient.tsx:618-667` |
| Hook | `?screenId=` | `score:update` | `src/hooks/useLiveScore.ts:44-192` (reconnect **3000ms**, max 5 attempts) |

WS token (frontend tournament): `WS_TOKEN = NEXT_PUBLIC_WS_TOKEN || "BT_WS_RELAY_TOKEN_2025"` (`TournamentDetailPage.tsx:897`) — hardcoded fallback token.

#### 5.4 Live screens feed (`/api/admin/tournament/live-screens`)

`src/app/api/admin/tournament/live-screens/route.ts:44` → `fetchScoreboardSessionRows(['pending','in_progress'])` (→ `scoreboard_sessions`), group-άρει ανά `eventId`, `isActive = sessionStatus === 'in_progress'`. Το `POST` του ίδιου route είναι **stub** (επιστρέφει echo χωρίς persistence) — `:112-148`.

---

### 6. Master πίνακας: «live στοιχείο → πηγή → transport → ρυθμός → αρχείο:γραμμή»

| Live στοιχείο | Πηγή αλήθειας | Transport | Ρυθμός ανανέωσης | Αρχείο:γραμμή |
|---|---|---|---|---|
| Σκορ κάρτας club (`/live/*`) | `scoreboard_sessions` (`/api/clubs/<id>/sessions`) | polling | 20s | `LiveClubView.tsx:1020,1227-1229` |
| Σκορ κάρτας club (άμεσο) | WS relay `score:update` | **WS push** | event-driven | `LiveClubView.tsx:1289-1306` |
| OBS overlay (`/embed/overlay`, `/live-overlay`) | `scoreboard_sessions` (initial) + WS | polling (initial) + **WS push** | WS: event-driven, reconnect 2.5s | `ObsOverlayClient.tsx:479-702` |
| Tournament live cards (`/tournaments/<slug>` live tab) | `scoreboard_sessions` (`/api/tournaments/<id>/live-sessions`) | polling | **30s** | `TournamentDetailPage.tsx:954,2307-2314,2560-2563` |
| Tournament live cards (standalone `/tournaments/events`) | ίδιο | polling | **5s** (+1.5/4/8s) | `TournamentEventsContent.tsx:3483-3495` |
| Tournament live screens (`/tournaments/live`) | `scoreboard_sessions` (`/api/admin/tournament/live-screens`) | polling | **10s** (+revalidate 5s) | `tournaments/live/page.tsx:61`· `lib/api.ts:169` |
| Live event data/κατατάξεις (`/tournaments/<slug>`) | `/event-data/<id>` + `/api/event-stages/<id>/standings` | polling + **WS dirty** | **60s** + focus/visibility | `TournamentDetailPage.tsx:953,2078,2416-2439` |
| Live κατατάξεις (standalone) | `/api/events/<id>` | polling | **10s** | `TournamentEventsContent.tsx:3433-3436` |
| Bracket matches (standalone, active) | `/api/event-stages/<id>/matches` | polling | **5s** | `TournamentEventsContent.tsx:4925` |
| Κατατάξεις που έγραψε backend | `bt-results` | — (WS invalidate) | push «dirty» → refetch | `standingsCalculator.ts:1451-1586`· `TournamentDetailPage.tsx:2603-2639` |
| External Five&Six live tables | `umbeu.cueuny.com` HTML | polling (server cache 8s) | **10s** client / 8s cache | `external-live-tables/route.ts:22,316`· `TournamentDetailPage.tsx:2387` |
| Σκορ Five&Six χωρίς χώρα/φωτό | provider | polling | 10s | `external-live-tables/route.ts:148-163` |
| Presence ενεργών screens (`/presence`) | WS server `/presence` | polling | **10s** | `PresenceDashboard.tsx:13,95` |
| Presence (`/scoreboards`) | WS server `/presence` | polling | **30s** | `ScoreboardsMonitorPage.tsx:13,232` |
| Session lifecycle (assign/update) | `scoreboard_sessions` + WS | **WS push** | event-driven | `scoreboardWsPublisher.ts:216-240` |
| Remote εντολές (`/live/remote/control`) | `POST /api/scoreboards/<id>/events` → WS `REMOTE_COMMAND` | polling (load) + **WS push** | per-action | `RemoteScoreboardControl.tsx:257`· `scoreboardWsPublisher.ts:255` |

---

### 7. Τι επιβεβαιώθηκε ρητά (checks κατά των σχολίων/docs)

1. **`EVENT_FALLBACK_POLL_MS = 60000`** στο `TournamentDetailPage.tsx:953` ✓ και χρησιμοποιείται στο interval `:2428` με guard `visibilityState==="hidden"` (`:2426`).
2. **`LIVE_SESSIONS_FALLBACK_POLL_MS = 30000`** στο `:954` ✓ (interval `:2560-2562`) — τρέχει ανεξαρτήτως `activeView`.
3. **external-live-tables poll ~10s** (`:2387`) ✓ με **cache 8000ms** server-side (`route.ts:22`) ✓ (σχόλιο «~10s / cache 8s» → επιβεβαιωμένο).
4. **`disableAutoRefresh`** απενεργοποιεί το εσωτερικό 10s event-data poll (`TournamentEventsContent.tsx:3314,3415`) και το 5s live-sessions poll (`:3315,3445`) ✓· `disableAutoRefresh` περνιέται από τον wrapper (`TournamentDetailPage.tsx:7142`) ✓.
5. **Καμία SSE/EventSource** ✓ (grep 0 hits).
6. **Το live score push είναι WS**, όχι polling ✓ (`wsPublisher.ts`, `useLiveScore.ts`, `ObsOverlayClient.tsx:665`).
7. **Ο πηγαίος πίνακας** για τα δικά μας σκορ είναι `scoreboard_sessions` ✓ (schema `collectionName`), ενώ για τις κατατάξεις `bt-results` ✓.

---

### 8. Κενά / τι σπάει / τι απαιτεί dev

#### 8.1 Ασυνέπειες & ρίσκα

1. **Hardcoded WS token** `"BT_WS_RELAY_TOKEN_2025"` στο `TournamentDetailPage.tsx:897`. Δεν είναι secret (μπαίνει σε client bundle) — αν το relay κάνει auth με αυτό, είναι ψευδο-ασφάλεια· αν αλλαχτεί το env χωρίς redeploy, το fallback μπορεί να αποτύχει σιωπηλά (το WS απλώς δεν συνδέεται και πέφτουμε στα αργά polls 60s/30s).
2. **Διπλό WS συνδεσμολογία στο tournament detail** — 3 ξεχωριστά `new WebSocket` (`:2580`, `:2694`, `:3074`). Κάθε φορά που αλλάζει `activeView`/`overviewMode`/`selectedStageDocumentId`, το useEffect dependency array (`:2662-2676`) ξαναδημιουργεί το socket. Κίνδυνος reconnect-storm σε γρήγορη πλοήγηση.
3. **Καθυστέρηση στο public tournament** = **60s** worst-case για event shell / 30s για live sessions χωρίς WS. Αν το WS πέσει, ο χρήστης βλέπει «live» που μπορεί να είναι 30-60s πίσω χωρίς ορατή ένδειξη stale.
4. **External (Five&Six) provider = scraping**. Εξαρτάται από CSS classes (`div.panel_box.top_info`, `div.count`, `tb_tit`) — κάθε redesign του umbeu σπάει τον parser **σιωπηλά** (το route επιστρέφει 200 με `data:[]`/`error` αντί να ρίχνει σφάλμα, `:330-355`). Χωρίς monitoring θα φαίνεται «νέкра〃 κενό.
5. **Το external cache 8000ms < client poll 10000ms** → σχεδόν κάθε poll είναι cache-miss· με πολλούς ταυτόχρονους viewers το upstream umbeu δέχεται συνεχή hits (ένα ανά 10s ανά instance, όχι ανά client — αλλά με πολλά server instances πολλαπλασιάζεται).
6. **`getExternalLiveTablesCompetitionIdx` επιστρέφει πάντα `null`** (`externalLiveTables.ts:17-19`) — υπολειμματικός κώδικας· η ροή λειτουργεί μόνο επειδή ο wrapper περνά `competitionIdx` στο query string (`TournamentDetailPage.tsx:2366`). Αν κάποιος καλέσει το route χωρίς `?competitionIdx=`, επιστρέφει κενό.
7. **Dead code:** `src/components/live/LiveScoreBoardCard.tsx` αχρησιμοποίητο. Σύγχυση για νέους devs.
8. **`POST /api/admin/tournament/live-screens` είναι stub** (`route.ts:112-148`) — επιστρέφει `success:true` χωρίς να γράψει τίποτα. Το UI του `/tournaments/live` που υποτίθεται «αλλάζει» live screen status δεν αποθηκεύει.
9. **Το `presence` είναι HTTP polling πάνω στον WS host** — δύο διαφορετικά ρυθμοί για ίδια πηγή: `/presence` 10s, `/scoreboards` 30s. Ο κάτοικος βλέπει διαφορετικά «ενεργά screens» ανά σελίδα.

#### 8.2 Πού απαιτείται dev (τι δεν διορθώνεται με config)

- **Stale indicator / WS health στο public tournament**: χρειάζεται UI για «Live (WS)» vs «Live (poll 30s/60s)» — σήμερα δεν υπάρχει (`TournamentDetailPage.tsx` δεν εκθέτει `socket.readyState` στο UI).
- **Scraping resilience**: retry/schema-detection για τον Five&Six parser + alert όταν `parseFiveSixLiveTables` επιστρέφει 0 panels ενώ η πηγή είναι 200. Χρειάζεται κώδικας στο `external-live-tables/route.ts`.
- **Bracket poll 5s στο standalone** μόνο· στο wrapper `/tournaments/<slug>` δεν υπάρχει αντίστοιχος live bracket refresh πέρα από το WS dirty σήμα — αν WS πέσει, τα brackets μένουν stale μέχρι το 60s event poll.
- **Ενοποίηση ρυθμών presence** (10s vs 30s) — είναι απόφαση προϊόντος + αλλαγή σε `PresenceDashboard.tsx`/`ScoreboardsMonitorPage.tsx`.
- **Ενιαία WS σύνδεση** στο tournament detail (ένα socket, πολλαπλά subscriptions αντί 3 sockets).

---

### 9. Πίνακας endpoints-κλειδιά (για γρήγορη αναφορά)

| Endpoint (frontend) | Proxy προς | Cache | Πηγή |
|---|---|---|---|
| `/api/clubs/[clubId]/sessions` | Strapi `/api/scoreboard/sessions` | `no-store` | `api/clubs/[clubId]/sessions/route.ts:9-10,36` |
| `/api/tournaments/[eventId]/live-sessions` | Strapi `/api/scoreboard/sessions?eventId=...&status=...` | `no-store` | `api/tournaments/[eventId]/live-sessions/route.ts:6-7,82` |
| `/api/tournaments/[eventId]/external-live-tables` | `umbeu.cueuny.com` HTML | in-mem 8s | `.../external-live-tables/route.ts:22,316` |
| `/api/admin/tournament/live-screens` | Strapi `/api/scoreboard/sessions` | `no-store` (fetch) | `api/admin/tournament/live-screens/route.ts:44` |
| `/api/scoreboard/session-by-id/[sessionId]` | Strapi `/api/scoreboard/sessions/:id` | `no-store` | `api/scoreboard/session-by-id/[sessionId]/route.ts:6-7` |
| `/api/scoreboard/screens/[screenIdentifier]/sessions` | Strapi `/api/scoreboard/screens/:id/sessions` (default `status=pending,in_progress`) | `no-store` | `api/scoreboard/screens/[screenIdentifier]/sessions/route.ts:11-12,23-24` |
| `/api/scoreboard/screens` | Strapi `/api/scoreboard/sessions` + `/api/screens` | `no-store` | `api/scoreboard/screens/route.ts:85-90` |
| `/api/scoreboards` | Strapi `/api/scoreboard/sessions` | `no-store` | `api/scoreboards/route.ts:4-5,18-21` |
| `/api/scoreboards/[id]/events` (POST) | Strapi `POST /api/scoreboards/:id/events` | `no-store` | `api/scoreboards/[id]/events/route.ts:16-17,47` |
| `/api/event-stages/[stageId]/standings` | Strapi `/api/bt-results` → `/api/bt-event-stages/:id/standings` | `no-store` | `api/event-stages/[stageId]/standings/route.ts:13-28` |
| `/event-data/[eventId]` | → `/api/events/[id]` → Strapi `/api/bt-events/:id` | `no-store`(client) | `event-data/[eventId]/route.ts:1-12`· `api/events/[id]/route.ts:1211` |
| `/api/events/[id]/final-results` | Strapi `/api/bt-events/:id/final-results/preview` | `no-store` | `api/events/[id]/final-results/route.ts:249-251` |
| `/api/presence` | `<ws-host>/presence` | `no-store` | `api/presence/route.ts:2-8` |

---

## Γ. Μοντέλο δεδομένων Strapi

*Πηγή αρχείου εργασίας: `03-strapi-data-model.md` (αποτέλεσμα read-only μελέτης).*

> Πηγή: `D:/Projects/1-billiards-strapi` (Strapi CMS, PostgreSQL), `D:/Projects/2-billiardtoday-admin` (admin UI), `D:/Projects/4-billiardtoday-frontend` (public site), `D:/Projects/3-BilliatdToday-Scoreboard` (scoreboard).
> Κάθε ισχυρισμός συνοδεύεται από `αρχείο:γραμμή`. Επιβεβαίωση πινάκων/πλήθους: **read-only** `psql` στο production (`billiard_pg`, 138.201.29.162).
> Σύνολο content types: **90** (`ls src/api | wc -l` = 90). Όλα `draftAndPublish:false` **εκτός** από `cms_pages` και `cms_site_settings` (`.../cms-page/schema.json`, `.../site-setting/schema.json`).

---

### 0. Σύνοψη αρχιτεκτονικής (ποιος μιλάει με ποιον)

```
Scoreboard ──POST /api/scoreboard/sessions/:id/result──► Strapi
   │  (Next.js proxy)                    └► scoreboard-session.applyResult
   │                                          └► bt-event-stage.reportMatch  → ενημέρωση bt_groups (match)
   │                                                └► bt-group lifecycle afterUpdate
   │                                                      ├► checkAndCalculateGroupStandings  (ΖΩΝΤΑΝΗ κατάταξη → bt_results)
   │                                                      ├► autoAdvanceBracketWinner
   │                                                      └► resolveTimetablePlaceholders
   │                                                            └► publishFinalRankingWhenComplete (ΤΕΛΙΚΗ → bt_results_final)

Admin  ─Auth(2/3)─► Strapi REST  ─ γράφει σχεδόν τα πάντα (events, stages, players, rulesets, CEB, commercial)
Frontend ──STRAPI_API_TOKEN─► Strapi REST  ─ διαβάζει (events, standings, players, clubs, cms, ceb static)
Importer/sync scripts ──► Strapi CLI/controller ή απευθείας PostgreSQL (setup_umb_world_cup_event.js)
```

Κεντρικό design: το **`bt-group` είναι το ίδιο το match** (group match ΚΑΙ knockout match) — `event_stage` relation + bracket πεδία (`round`, `bracket_type`, `global_match_number`, `winner_to_*`) στο ίδιο schema (`src/api/bt-group/content-types/bt-group/schema.json:131,134,142`).

---

### 1. Πίνακας ανά οντότητα/ομάδα

Στήλες: **Οντότητα** (Postgres table) — σκοπός — βασικά πεδία/σχέσεις — **Γράφει** — **Διαβάζει**.

#### 1.1 Πυρήνας event/tournament (bt-*)

| Οντότητα (table) | Σκοπός | Βασικά πεδία / σχέσεις | Γράφει | Διαβάζει |
|---|---|---|---|---|
| **bt-event** (`bt_events`) | Το "αγώνισμα" που φιλοξενεί stages/matches/results για ένα tournament | `tournament` (1:1, `bt_events_tournament_lnk`), `season`, `start/end_date`, `game_type`, `ruleset_key`, `ruleset_config`, `final_standings_published(_at)`, `autoOpenScoreboardSessions`, `timetable_config`, `ruleset_snapshot/_frozen_at/_re_resolve_log` (private) | Admin UI· importers (`bt-event.ts:36` umbWorldCupImport, `:215` observedImport)· `tournamentEventGenerator.ts`· ruleset freeze (`rulesetResolver.ts:378`)· final publish (`finalResultsPublisher.ts:352`) | Frontend (`listTournamentEvents`), admin, scoreboard (δημιουργία sessions) |
| **bt-event-stage** (`bt_event_stages`) | Φάση (όμιλοι/brackets) ενός event· φέρει το `bracket_config` ομίλων & κλείδωμα | `event` (M:1, `bt_event_stages_event_lnk`), `stage_type` (`groups`/`brackets`/…), `is_final`, `bracket_config` (`:71`), `locked` (`:74`), `locked_at/by`, `allow_result_edits` (`:84`), `allow_participant_changes`, `allow_bracket_changes`, `groups`, `results`, `ruleset_frozen_at` (`:142`) | Admin UI· `matchGenerator.ts`/`timetableGenerator.ts`· finalResultsPublisher (refresh standings) | Frontend (`bt-event-stages?...` `frontend/src/lib/api.ts:83`), scoreboard (`bt-event-stages/:id/matches`) |
| **bt-event-timetable-slot** (`bt_event_timetable_slots`) | Χρονοδιάγραμμα: μια ώρα/τραπέζι ανά αγώνα | `event`, `stage`, `match` (M:1 → bt-group), `slot_type`, `title`, `date_time`, `table_label`, `slot_status`, `is_published`, `metadata` | `timetableGenerator.ts`· `timetablePlaceholderResolver.ts`· sync jobs (external) | Frontend (πρόγραμμα), admin |
| **bt-group** (`bt_groups`) | **Ο ΑΓΩΝΑΣ** (όμιλος + νοκ-άουτ). Φέρει σκορ/ίννινγκς/μπαλονιές και bracket routing | `event_stage` (M:1, `bt_groups_event_stage_lnk`), `number`, `player1/player2` (`bt_groups_player_1/2_lnk`) + `*_local_key/name/country`, `player1/2_points/innings/match_points/high_run(_2)`, `penalty_winner`, `ff_type_player1/2` (`:163`), `manual_override` (`:150`), `global_match_number` (`:131`), `winner_to_global_match_number/slot` (`:134`), `loser_to_*` (`:142`) | **Scoreboard** (→ `scoreboard-session.applyResult` → `bt-event-stage.reportMatch` `:1836`/`:2648`), **Admin** (`bt-groups/:id/result` → `bt-group.updateResult` `:163`), **cuescoResultSync.ts** (εξωτερικός sync), importer | `standingsCalculator`, frontend (ζωντανά σκορ), admin |
| **bt-result** (`bt_results`) | **ΖΩΝΤΑΝΗ** κατάταξη ανά παίκτη/φάση (ξαναγράφεται σε κάθε αποτέλεσμα) | `event_stage` (M:1), `player` (M:1), `group_number`, `group_position` (`:36`), `final_position` (`:39`), `points/innings/high_run/match_points`, `qualified`/`qualification_type` (`:74`), `manual_override`, `stage_rank_override` (`:103`) | **`standingsCalculator.updateStandingsRecords`** (μέσω bt-group lifecycle / controller / sync) | Frontend (βαθμολογία ομίλου), `bt-event-stage.getStandings`, finalResultsPublisher (`refreshPersistedGroupStandings:279`) |
| **bt-result-bt** (`bt_results_bt`) | Legacy: τελικά αποτελέσματα ανά tournament/player (πριν το event-based μοντέλο) | `tournament` (M:1), `player` (M:1), `season`, `position`, `best_average/average/points/caroms/innings/high_run`, `source` | Αδρανές/import (μόνο `bt-player` controller το αναφέρει) | Admin `bt-results` route· όχι στο κύριο frontend flow |
| **bt-result-final** (`bt_results_final`) | **ΤΕΛΙΚΗ** κατάταξη event (κλειδώνει με publish) | `event` (M:1), `player` (M:1), `position`, `ranking_points` (`:56`), `penalty`, `final_points` (`:62`), `best_average/caroms/innings/high_run`, `is_final` (`:79`), `source` | **`finalResultsPublisher.publishFinalResults`** (`:3433`) + admin manual rows (`bt-event.publishFinalResults` `:418`) | Frontend (τελική κατάταξη event), `calculate-stats.ts` (career stats) |
| **bt-player** (`bt_players`) | Master μητρώο παικτών + Elo-like rating | `full_name(_en)`, `umb_id`, `country`, `club` (M:1, `bt_players_club_lnk`), `teams` (M:N), `btr_overall/deviation/volatility/matches`, `career_stats`, `playerAccount` (1:1) | Admin UI, importers, enrollment, `bt-player-change-request` approval | Τα πάντα (frontend, scoreboard, admin, standings, CEB) |
| **bt-user** (`bt_users`) | Legacy scoreboard users | `username/password/active/source` | Legacy | Legacy |

#### 1.2 Scoreboard

| Οντότητα (table) | Σκοπός | Βασικά πεδία / σχέσεις | Γράφει | Διαβάζει |
|---|---|---|---|---|
| **scoreboard-session** (`scoreboard_sessions`) | Ζωντανή κατάσταση αγώνα δεμένης με οθόνη (players, σκορ, video) | `screenIdentifier`, `sessionStatus`, `club` (M:1), `eventId/eventStageId`, `clubTournamentDocumentId`, `teamMatchDocumentId`, `player1/2Name(+DocumentId/Country/Photo)`, σκορ πεδία, `targetPoints/maxInnings`, `liveVideos`, `matchSheetJson` | **cron** `autoScoreboardSessions.ts` (κάθε 60s, `:302` από `src/index.ts` bootstrap `startAutoScoreboardSessions`)· scoreboard `createFromMatch`· `applyResult` (`:2242`) | Scoreboard (δική του session), frontend (live), admin `club-scoreboards` |
| **scoreboard-player-link** (`scoreboard_player_links`) | Nonce-claim που δένει player-account/device με θέση οθόνης | `screenIdentifier`, `slot`, `nonce`, `status`, `expiresAt`, `player` (M:1), `enrollmentRequest`, `claimed*` | Scoreboard claim API (`scoreboard/src/app/api/scoreboard/player-links/claim`) | Scoreboard, player accounts |

#### 1.3 Tournament (ομπρέλα) & σειρές

| Οντότητα (table) | Σκοπός | Βασικά πεδία / σχέσεις | Γράφει | Διαβάζει |
|---|---|---|---|---|
| **tournament** (`tournaments`) | Ομπρέλα διοργάνωσης· κρατά το `format_definition` (**εδώ ζει η δημοσίευση**) | `title/slug`, `startDate/endDate`, `tournament_status`, `game_type`, `organizer_type`, `format_definition` (`:65`) — JSON με `publication.state/pubAt`· `format_locked` (`:68`), `ranking_mode` (`:82`), `ruleset_key`, `custom_ruleset` (`:110` M:1), `club`/`organizer_federation`/`venue`, `participants`, `bt_event` (1:1), `series_entries` | Admin UI (club tournament wizard & setup tab· `format_definition`), importers | Frontend `isDraftTournament` (`frontend/src/app/api/tournaments/route.ts:142`, `src/lib/publicSiteData.ts:482`, `src/lib/tournaments.ts:300`) |
| **tournament-participant** (`tournament_participants`) | Εγγραφές παικτών/ομάδων | `tournament` (M:1), `player` (M:1), `seed/ranking/entry_stage`, `participant_status` (pending/confirmed/withdrawn/forfait), `source` (manual/public_form/import) | Admin UI, public_form, import | Admin, generators |
| **tournament-setting** (`tournament_settings`) | Taxonomies ανά organizer/χώρα (game types, tournament types, categories, scoring schemes) | component lists `tournament.taxo-item` / `tournament.scoring-scheme`, `organizer_type`, `country` | Admin UI | Admin UI (φόρμες διοργάνωσης) |
| **tournament-director-assignment** (`tournament_director_assignments`) | Ανάθεση tournament director | `club`, `tournament`, `permissions`, `accessState` | Admin UI | Admin (ρόλοι) |
| **ranking-series** (`ranking_series`) | Σειρά τουρνουά που παράγει κατάταξη (aggregate sum) | `title/slug`, `season`, `scope`, `game_type`, `category`, `status`, `aggregate_mode`, `default_scoring_scheme`, `stage_suggestions`, `final_stage`, `standings_published(_at)` (`:104`) | Admin UI (`/admin/series`) | Frontend `/api/ranking-series`· endpoint `ranking-series/by-slug/:slug/standings` (`ranking-series/routes`) |
| **series-tournament** (`series_tournaments`) | Join σειράς↔τουρνουά με σειρά/βάρος | `order`, `role` (ranking/final_ko), `weight`, `points_table_key`, `qualification_bonus_override`, `series`, `tournament`, `event` | Admin UI | Frontend (κατάταξη σειράς), admin |
| **event-group** (`event_groups`) | Ομάδα events μαζί (π.χ. EUROYOUTH) — **σχήμα Φάσης 1, χωρίς UI** | `title/slug`, `scope`, `owner_federation/club`, `members` | (χειροκίνητα/dev — χωρίς UI) | Admin (ομάδες τουρνουά) |
| **event-group-member** (`event_group_members`) | Μέλος ομάδας events με σειρά & label | `event_group`, `event`, `order`, `type_label` | όπως πάνω | Admin |

#### 1.4 CEB ranking & ομοσπονδίες

| Οντότητα (table) | Σκοπός | Βασικά πεδία / σχέσεις | Γράφει | Διαβάζει |
|---|---|---|---|---|
| **ceb-ranking-category** (`ceb_ranking_categories`) | Κατηγορία κατάταξης CEB (παράθυρο, κλίμακες, ισοπαλία) | `slug/title/discipline`, `status`, `window`, `scales`, `zones`, `penaltyPolicy`, `tieBreakPolicy`, `tieBreak`, `participation`, `currentEdition` (1:1) | Engine scripts (`scripts/*ceb*`), importers, admin | Engine, frontend (static), federation-portal |
| **ceb-ranking-event** (`ceb_ranking_events`) | Στήλη κατάταξης: δικό μας event ή national | `type` (ours/national), `kind` (european/worldCup/…), `columnKey`, `season`, `scale`, `zones`, `btEvent` (M:1), `submission` (M:1) | Engine, importers, admin | Engine |
| **ceb-ranking-entry** (`ceb_ranking_entries`) | Γραμμή αθλητή σε event (θέση/γύρος/πόντοι/ποινή) | `position/roundReached/points/penalty/finalPoints`, `origin` (computed/submitted/manual), `publishedRank`, `matchStatus`, `player`, `event`, `submission` | Engine· `ranking-submission.applyToRanking` (στην έγκριση) | Engine, frontend (μέσω static build) |
| **ceb-ranking-edition** (`ceb_ranking_editions`) | **Στιγμιότυπο έκδοσης** κατάταξης (αυτό διαβάζει το site) | `versionLabel`, `published` (`:18`), `publishedAt`, `isCurrent` (`:25`), `source`, `snapshot` (`:62` jsonb), `checksum` (`:65`), `events` | `scripts/import-ceb-ranking-edition-local.js`, engine | Frontend (static `public/data/ceb-ranking/*.json`), federation-portal |
| **ceb-ranking-sanction** (`ceb_ranking_sanctions`) | Αποκλεισμός/ποινή απουσίας CEB | `kind`, `color`, `status`, `decisionDate/startsAt/endsAt`, `points`, `columnKey`, `player` | Admin/importers | Engine |
| **ceb-ranking-change** (`ceb_ranking_changes`) | Ημερολόγιο αλλαγών κατάταξης (audit) | `field/oldValue/newValue/reason`, `actor/actorType`, `batchId`, `category/edition/entry/player/sanction` | Engine (`actorType:'engine'`), review apply | Admin (audit) |
| **ceb-ranking-publish** | **ΔΕΝ είναι content type** — controller+service των κουμπιών «Υπολόγισε/Δημοσίευσε» | routes `/ceb-ranking-publish/recompute|publish`, απαιτεί trusted server token | Admin app (server token) | — |
| **ranking-submission** (`ranking_submissions`) | Υποβολή εθνικών κατατάξεων από ομοσπονδία (στήλες B–D) | `status` (draft/in-review/approved/rejected/published/withdrawn), `slug/season/federationCode`, `rows` (component `ranking.submission-row`), `file`, `rawText` (private), `federation`, `account` | **federation-portal.submit** (ομοσπονδία) | CEB review (ranking-review) |
| **ranking-review** | **ΔΕΝ είναι content type** — controller+service της πλευράς CEB | routes `/ranking-review/submissions(/:id)` + `/review` + `/email` + `/mail-settings` | CEB (admin app) | — |
| **ranking-mail-setting** (`cms_ranking_mail_settings`, singleType) | Αποστολέας/παραλήπτες email κατάταξης | `enabled`, `fromName/fromEmail/replyTo`, `cebRecipients`, `testMode`, `adminSiteUrl` | Admin UI (`/admin/ranking-emails`) | ranking-review service |
| **federation-portal** | **ΔΕΝ είναι content type** — controller+service portal ομοσπονδιών | `/federation-portal/login|me|edition|rows/check|players|submissions` | Ομοσπονδίες (login) | — |
| **federation** (`bt_federations`) | Μητρώο ομοσπονδιών (δέντρο) | `name/slug/acronym/country`, `parent`/`children` (`bt_federations_parent_lnk`), `clubs`, `organized_tournaments` | Admin/importers (CCEB scripts) | Frontend `/api/federations`, admin |

#### 1.5 CMS, club, ads, οθόνες

| Οντότητα (table) | Σκοπός | Βασικά πεδία | Γράφει | Διαβάζει |
|---|---|---|---|---|
| **page** (`cms_pages`, **draft=True**) | Σελίδες CMS (sections/layout builder) | `title/slug/summary/coverImage`, `pageType`, `sections`, `layoutTree`, `seo` | Admin CMS (draft→publish) | Frontend `/api/pages` |
| **site-setting** (`cms_site_settings`, singleType, **draft=True**) | Header/footer/nav/SEO του site | `menus`, `activeHeader/FooterMenuKey`, `headerLinks/footerLinks`, `socialLinks`, `defaultSeo` | Admin CMS | Frontend `/api/site-setting` |
| **club** (`clubs`) | Σύλλογος: hub για players, teams, tournaments, screens | `name/slug/city/country`, `players`, `playerAccounts`, `teams`, `federation` (M:1), `tournaments`, `screens`, `playlists`, `scoreboard_sessions`, `moduleEntitlements` | Admin UI, enrollment | Frontend `/api/clubs`, admin |
| **club-** (`club_module_entitlements`, `club_player_memberships`, `club-user-access`=extension user, `club-player-membership`) | Entitlements, μέλη, access | `moduleKey/status/plan/paidUntil`, membership `role/accountStatus` | Admin UI | Admin, frontend (portal) |
| **team / team-*** (`bt_teams`, `team_tournaments`, `team_tournament_participants`, `team_groups`, `team_matches`, `team_match_sets`, `team_lineups`, `team_members`, `team_standings`, `team_bracket_nodes`) | Πρωταθλήματα ομάδων (σχοινάκι/ομαδικά) | βλ. §4 | Admin UI (`/admin/teams`, `team-*` routes) | Frontend `/api/team-tournaments|team-groups|team-matches` |
| **commercial-*** (`commercial_*` ×19) | Πλήρες POS/λέσχη (branches, tables, tabs, sessions, charges, payments, shifts, products, customers, waiting list…) | `clubDocumentId/branchDocumentId` scoping… | Admin operator UI + **Electron offline queue** (client-side λογική· Strapi CRUD stubs) | Admin commercial pages |
| **advertisement** (`advertisements`) | Διαφημίσεις που παίζουν σε οθόνες | `title/slug`, `media`, `durationSeconds`, `active`, `start/endDate` | Admin UI | Scoreboard (playlist player) |
| **playlist / playlist-item** (`playlists`, `playlist_items`) | Playlist ανά οθόνη/σύλλογο· items → advertisements | `isDefault`, `club`, `items`; item: `order`, `slot`, `advertisement` | Admin UI | Scoreboard |
| **screen** (`screens`) | Καταχωρημένη οθόνη | `identifier`, `overlaySlug`, `orientation`, `club`, `currentPlaylist`, `activation` (1:1) | Admin UI, provision flow | Scoreboard, admin |
| **screen-activation** (`screen_activations`) | Κωδικός/API token ενεργοποίησης οθόνης | `identifier`, `activationCodeHash`, `apiToken`, `expiresAt`, `screen` | Scoreboard activation API, admin | Scoreboard |
| **screen-provision-request** (`screen_provision_requests`) | Workflow παροχής νέας οθόνης | `deviceFingerprint`, `provisionStatus`, `paymentStatus`, `pollTokenHash`, `assignedScreen` | Scoreboard provision request, admin (approve) | Admin, scoreboard poll |
| **ad-impression** (`ad_impressions`) | Καταγραφή προβολής διαφήμισης | `impressionId`, `bannerId`, `playlistId`, `screenId`, `slot`, `shownAt`, `sessionId` | **Scoreboard** | Admin stats, backup scripts |
| **ad-impression-stat** (`ad_impression_stats`) | Aggregated προβολές ανά ημέρα/οθόνη/slot | `date`, `screenId`, `slot`, `bannerId`, `totalImpressions`, `uniqueSessions`, `hourlyBreakdown` | Aggregation script | Admin `/ad-impression-stats` |
| **admin-login-log** (`admin_login_logs`) | Audit log σύνδεσης admin | `adminUser`, `ip`, `country/city`, `userAgent` | Admin login hook (`ADMIN_LOGIN_LOG_SECRET`) | Admin |
| **account-device-link-request** (`account_device_link_requests`) | Σύνδεση player account ↔ device | `account`, `linkedDevice`, `linkToken`, `status`, `expiresAt` | Player portal/device flow | Player portal |
| **share-link** (`share_links`) | Short URLs | `shortId`, `url` | App | App |
| **friendly-*** (`friendly_matches`, `friendly_recordings`, `friendly_recording_commands/events`) | Φιλικοί αγώνες + εγγραφή/streaming (MediaMTX) | match scores/players, recording `streamPath/publishUrl/hlsUrl/status` | Scoreboard (`/api/friendly-matches/submit`, recording APIs) | Scoreboard, frontend |
| **player-*** (`player_accounts`, `player_devices`, `player_enrollment_requests`, `player_verification_events`) | Λογαριασμοί/συσκευές/εγγραφές παικτών (portal) | email/passwordHash, device tokens, enrollment status, verification | Player portal, admin (verify) | Frontend `/api/player-accounts|player-devices`, scoreboard |
| **venue** (`venues`) | Χώρος διεξαγωγής | `name/slug/city/country`, `club`, `tournaments` | Admin UI | Frontend, admin |

#### 1.6 Κανονισμοί (rulesets) — βλ. §3

| Οντότητα | Ρόλος | Σημείωση |
|---|---|---|
| **custom-ruleset** (`custom_rulesets`) | Template κανονισμών με live link στο tournament | Το `tournament.custom_ruleset` είναι «Phase 5 live link: template edits propagate **until the event freezes at start**» (`tournament/schema.json:110` description) |
| **standard-ruleset** (`standard_rulesets`) | Versioned standard κανονισμοί | `key`, `version`, `effective_from`/`effective_to`, `is_active`, `group_ranking_profile`, `final_ranking_mode`, `scoring_mode`, `sets_formats`, `supersedes_version` |
| **country-rule** (`country_rules`) | Κανόνες ανά χώρα (ομαδικά/scoring/forfeit/lineup) | `country_code`, `rules`, `team_tournament_formats`, `team_tournaments` (1:Many) |

---

### 2. Πού ζει η λογική υπολογισμού κατάταξης (ΖΩΝΤΑΝΟ vs ΤΕΛΙΚΟ)

#### 2.1 ΖΩΝΤΑΝΗ κατάταξη → `bt_results` (ξαναγράφεται σε κάθε αποτέλεσμα)

Μηχανή: **`src/services/standingsCalculator.ts`** (`calculateAndUpdateGroupStage` `:1650`, `calculateGroupStandings`, `updateStandingsRecords`, `updateStageFinalPositions`).

Καλείται από:
- **bt-group lifecycle `afterUpdate`** → `checkAndCalculateGroupStandings` (`src/api/bt-group/content-types/bt-group/lifecycles.ts:11-23` → `src/api/bt-group/services/bt-group.ts:12`). Τρέχει σε **κάθε** ενημέρωση αγώνα.
- Controller **POST `/bt-event-stages/:id/calculate-standings`** (`bt-event-stage/routes` γραμμή 27-29 → controller `:1370`).
- **GET `/bt-event-stages/:id/standings`** — αν υπάρχει "meaningful match data" ξαναϋπολογίζει on-the-fly (`bt-event-stage.ts:991`).
- **`cuescoResultSync.ts`** μετά από εξωτερικά αποτελέσματα (`:3059`, `:3179`) — ο 5-λεπτος sync γράφει `bt_groups` → lifecycle → standings.
- **`groupOfFourAdvancer.ts:86`**.
- **`finalResultsPublisher.refreshPersistedGroupStandings`** (`:279`) — πριν χτίσει τα τελικά.

Αποτέλεσμα: `bt_results` + `bt_groups.final_position`/`group_position` ενημερώνονται **συνεχώς**. Οι χειροκίνητες παρακάμψεις διατηρούνται με `manual_override`/`*_override` (`bt-result/schema.json:94,103`).

#### 2.2 ΤΕΛΙΚΗ κατάταξη → `bt_results_final` (κλειδώνει με publish)

Μηχανή: **`src/services/finalResultsPublisher.ts`** — `publishFinalResults` (`:3433`), `buildAutomaticStoredFinalResultRows` (`:679`), ανά-ruleset builders (`buildCebYouthFinalEntries:1122`, `buildUmbWorld3c… :2282/:2579`, `buildArtistic… :2646/:2810`, `buildFivePinsFinalEntries:1491`, `buildBiathlonTeamFinalEntries:1288`). Γράφει `bt_results_final` και σημειώνει `bt_events.final_standings_published(+_at)` (`markFinalStandingsPublished:352`).

Καλείται από:
- **Admin** POST `/bt-events/:id/publish-final-results` (`bt-event/routes` γρ.20-22 → controller `:418`). Τα **manual rows bypass** το cooldown.
- **Auto republish** μέσω bt-group afterUpdate → placeholder resolver → `publishFinalRankingWhenComplete`, με **cooldown 60s** για αποφυγή ατέρμονου loop (`finalResultsPublisher.ts:3446-3462`).
- `groupOfFourAdvancer.ts:219`.

Μετά το publish: `applyScoring` (`scoringService.ts` / `bt-event.applyScoring` `:445`) + προγραμματισμός recalc career stats (`calculate-stats.ts`, lifecycles `bt-result-final/content-types/.../lifecycles.js:100-106`).

> **Καθαρά:** ΖΩΝΤΑΝΟ = `bt_results` (group standings, ξαναγράφεται πάντα). ΤΕΛΙΚΟ = `bt_results_final` + flags `final_standings_published` / `standings_published` / `ceb_ranking_edition.published|isCurrent`. Προσοχή: το `bt_results_final` **delete+create** σε republish (σχόλιο `finalResultsPublisher.ts:3460` — γι' αυτό μπήκε cooldown).

---

### 3. Κλείδωμα/έκδοση κανονισμών & «δημοσίευση»

#### 3.1 Ruleset freeze (στο start του τουρνουά)

- Υλοποίηση: **`src/services/rulesetResolver.ts`** → `ensureRulesetFrozen` (`:378`). Idempotent (ελέγχει `ruleset_frozen_at`). Επανα-επιλύει "effective-at-competition-date" και, αν βγήκε νεότερη standard έκδοση μεταξύ generate-event και start, **ενημερώνει** το snapshot + προσθέτει audit entry σε `ruleset_re_resolve_log`. Μετά το freeze το snapshot είναι **immutable**.
- Καλείται από **`bt-group.updateResult`** στο πρώτο αποτέλεσμα (`src/api/bt-group/controllers/bt-group.ts:206` — σχόλιο `:201`: "the first result entry freezes the event's ruleset").
- Αποθηκεύονται σε **bt_event** και **bt_event_stage** (per-stage overrides): `ruleset_snapshot`, `ruleset_profile_versions`, `ruleset_resolved_at`, `ruleset_frozen_at` (private· `bt-event/schema.json:161`, `bt-event-stage/schema.json:142`).
- Ρητή επανα-επίλυση (Task 3.3): **POST `/bt-events/:id/ruleset-re-resolve`** (`bt-event/routes` γρ.38-40 → controller `:472`) — ενημερώνει event + όλα τα stages.
- Έκδοση standard: `standardRulesetVersions.ts` + `standard_rulesets.effective_from/effective_to` + `rulesetProfileRegistry.ts`.
- Το `bt_event.ruleset_key` είναι **enum** συγκεκριμένων keys (`bt-event/schema.json` enum) — άρα νέος κανονισμός = αλλαγή σχήματος/code.

#### 3.2 «Δημοσίευση» τουρνουά

- **`tournament.format_definition.publication.state`** (`tournament/schema.json:65` — JSON field). Γράφεται από το admin club-tournament wizard/setup (βλ. `2-billiardtoday-admin/src/app/api/admin/club-tournaments/[id]/run/route.ts:1761,1887`), όπου αποθηκεύεται `{publication:{state:'draft'|'published', publishedAt}}`.
- **Ανάγνωση/φιλτράρισμα:** frontend `isDraftTournament` — `frontend/src/app/api/tournaments/route.ts:142`, `frontend/src/lib/publicSiteData.ts:482`, `frontend/src/lib/tournaments.ts:300`. Λογική: `publication.state !== 'published'` ⇒ draft· fallback σε `clubRuntime`/`setupMode.startsWith('club_')`.
- **Επηρεάζει και τα career stats:** `calculate-stats.ts` `isStatsEligibleEvent` — αποκλείει `organizer_type:'club'` με `publication.state !== 'published'`.
- **`format_locked`** (`tournament/schema.json:68`): boolean κλείδωμα δομής format.
- Ξεχωριστά flags δημοσίευσης: `bt_event.final_standings_published` (`bt-event/schema.json:81`), `ranking_series.standings_published` (`ranking-series/schema.json:104`), `ceb_ranking_edition.published`/`isCurrent` (`ceb-ranking-edition/schema.json:18,25`).

#### 3.3 CEB publish / submission / review flow

1. **Υποβολή** (ομοσπονδία): `federation-portal.submit` → δημιουργεί `ranking_submission` (status `draft`/`in-review`)· email ειδοποίησης CEB (`federation-portal.ts:193`).
2. **Έλεγχος/έγκριση** (CEB): `ranking-review.review` → για `approve`/`publish` τρέχει `ranking-submission.applyToRanking` (γράφει `ceb_ranking_entries` με `origin='submitted'`, `ranking-review.ts:170-186`)· για `publish` **ξανατρέχει τη μηχανή + γράφει τα δημόσια αρχεία** μέσω `runCebRankingPublish` (`ranking-review.ts:191`).
3. **Μηχανή/δημοσίευση**: `cebRankingPublish.runCebRankingPublish` (`:135`) εκτελεί `scripts/run-ceb-ranking-engine.js` (+ `scripts/build-frontend-ceb-ranking.js` στο publish), `spawnSync` — **ίδια scripts με το CLI**. «ΚΑΝΟΝΑΣ ΠΗΓΗΣ»: αν δικές μας στήλες διαφέρουν από τη δημοσιευμένη λίστα, η ροή **σταματά** (exit≠0) εκτός `--allow-source-divergence` (`cebRankingPublish.ts:143-147,176-188`).
4. **Χειροκίνητα κουμπιά**: `POST /ceb-ranking-publish/recompute|publish` — απαιτεί trusted server token (`ceb-ranking-publish/controllers/ceb-ranking-publish.ts:16,35`).
5. **Δημόσιο αποτέλεσμα**: static αρχεία `frontend/public/data/ceb-ranking/*.json` (π.χ. `3c-individual.json`, `index.json`) — το frontend **δεν** διαβάζει live από Strapi, τα διαβάζει από `src/lib/cebRankingData.ts:23`.

---

### 4. Πίνακες PostgreSQL & junctions

Επιβεβαίωση (read-only `psql`, `billiard_pg`):

| Πίνακας | Rows | Σημείωση |
|---|---|---|
| `bt_events` | 400 | |
| `bt_event_stages` | 2084 | |
| `bt_groups` (matches) | 39519 | group + KO αγώνες |
| `bt_results` | 40086 | ΖΩΝΤΑΝΗ κατάταξη |
| `bt_results_final` | 22178 | ΤΕΛΙΚΗ κατάταξη |
| `tournaments` | 424 | |
| `ranking_series` | 3 | |
| `ceb_ranking_editions` | 1 | |
| `ranking_submissions` | 2 | |
| `scoreboard_sessions` | 0 | καθαρίζονται μετά τη λήξη |

**Ονόματα πινάκων** = `collectionName` από κάθε `schema.json` (snake_case, πληθυντικός ή ενικός κατά content type — π.χ. `bt_events`, `bt_groups`, `clubs`, `tournaments`, `scoreboard_sessions`, `ceb_ranking_editions`). Πλήρης λίστα με `SELECT tablename FROM pg_tables WHERE schemaname='public'` (94 content types + components + Strapi core + backups).

**Σχέσεις (junctions `*_lnk`)** — επιβεβαιωμένα ονόματα:

| Junction table | Σχέση |
|---|---|
| `bt_events_tournament_lnk` | bt_event ↔ tournament (1:1) |
| `bt_event_stages_event_lnk` | stage ↔ event |
| `bt_groups_event_stage_lnk` | match ↔ stage |
| `bt_groups_player_1_lnk`, `bt_groups_player_2_lnk` | match ↔ player1/player2 |
| `bt_event_timetable_slots_event_lnk` / `_stage_lnk` / `_match_lnk` | slot ↔ event/stage/match |
| `bt_results_event_stage_lnk`, `bt_results_player_lnk` | bt_result ↔ stage/player |
| `bt_results_final_event_lnk`, `bt_results_final_player_lnk` | final ↔ event/player |
| `bt_results_bt_tournament_lnk`, `bt_results_bt_player_lnk` | legacy |
| `tournaments_club_lnk`, `tournaments_organizer_federation_lnk`, `tournaments_venue_lnk`, `tournaments_custom_ruleset_lnk` | tournament relations |
| `clubs_federation_lnk`, `bt_federations_parent_lnk`, `bt_players_club_lnk`, `bt_teams_club_lnk`, `bt_teams_players_lnk` | club/federation/player/team |
| `series_tournaments_series_lnk` / `_tournament_lnk` / `_event_lnk` | series join |
| `ceb_ranking_editions_category_lnk`, `ceb_ranking_categories_current_edition_lnk` | CEB editions |
| `ceb_ranking_entries_player_lnk` / `_event_lnk` / `_category_lnk` / `_submission_lnk` | CEB entries |
| `ceb_ranking_events_bt_event_lnk` / `_category_lnk` / `_submission_lnk` | CEB events |
| `ceb_ranking_sanctions_player_lnk` / `_category_lnk` / `_event_lnk`, `ceb_ranking_changes_*_lnk` | sanctions/changes |
| `scoreboard_sessions_club_lnk`, `scoreboard_player_links_player_lnk` / `_enrollment_request_lnk` | scoreboard |
| `event_groups_owner_club_lnk` / `_owner_federation_lnk`, `event_group_members_event_lnk` | event groups |
| `team_tournaments_tournament_lnk`, `team_groups_team_tournament_lnk`/`_teams_lnk`, `team_matches_home/away/winner_team_lnk`, `team_match_sets_*_lnk`, `team_lineups_*_lnk`, `team_standings_*_lnk`, `team_bracket_nodes_*_lnk` | team-* |
| `screens_club_lnk` / `_current_playlist_lnk`, `playlists_club_lnk`, `playlist_items_playlist_lnk` / `_advertisement_lnk`, `screen_activations_screen_lnk`, `screen_provision_requests_*_lnk` | signage |
| `friendly_*_lnk`, `player_accounts_*_lnk`, `player_devices_*_lnk`, `player_enrollment_requests_*_lnk`, `player_verification_events_*_lnk` | friendly/player portal |

**Σχήματα components** (σχετικά): `components_ranking_submission_rows`, `components_tournament_scoring_schemes`, `components_tournament_taxo_items`, `components_cms_*`, `components_tournament_rank_points_rows`, `components_tournament_stage_type_labels`.

**Hub πίνακες τρίτων:** `up_users`, `admin_users`, `strapi_*`, `files`.

> Σημείωση: υπάρχουν επίσης **backup πίνακες** (`backup_*`, `migration_backup_*`, `mbk_umb_*`, `friendly_matches_placeholder_backup_*`) — αγνοούνται από το app, ιστορικά αντίγραφα.

---

### 5. Ροές end-to-end (ποιος γράφει → ποιος διαβάζει)

**A. Αποτέλεσμα από scoreboard**
`scoreboard POST /api/scoreboard/sessions/:id/result` (proxy → `getServerStrapiBaseUrl()/api/scoreboard/sessions/:id/result`, `scoreboard/src/app/api/scoreboard/sessions/[id]/result/route.ts:21`) → Strapi `scoreboard-session.applyResult` (`:2242`) → bridge σε `bt-event-stage.reportMatch` (`:2648`, `scoreboard-session.ts:2776`) → update `bt_groups` → **bt-group lifecycle afterUpdate** → standings (live) + bracket advance + placeholder resolve → auto publish finals (τελικό, με cooldown).

**B. Εξωτερικός sync (Cuesco)**
`cuescoResultSync.ts` (3247 γραμμές) τρέχει περιοδικά (ικανοποιείται μέσω `externalResultSync` config στο `bt_events.timetable_config`)· χειροκίνητα `POST /bt-events/:id/external-sync/run` (`bt-event/routes` γρ.110-112). Γράφει `bt_groups` + `bt_results`, και **ξαναγράφει `timetable_config.externalResultSync`** (κρατά `enabled`, `playerMap`).

**C. Admin χειροκίνητο αποτέλεσμα**
Admin UI → `PUT /bt-groups/:id/result` (`bt-group/routes`) → `bt-group.updateResult` (`:163`) → freeze ruleset (`:206`) → update → lifecycle.

**D. Τελική κατάταξη**
Admin «Publish final results» → `bt-event.publishFinalResults` (`:418`) → `finalResultsPublisher.publishFinalResults` (`:3433`) → builds `bt_results_final` + `final_standings_published=true` → `applyScoring` → recalc career stats.

**E. CEB κατάταξη**
Ομοσπονδία submit (federation-portal) → ranking_submission → CEB review (ranking-review) → applyToRanking (ceb_ranking_entries) → publish (runCebRankingPublish → engine + frontend static) → frontend διαβάζει `public/data/ceb-ranking/*.json`.

---

### 6. Κενά — τι δεν μπορεί να ρυθμίσει σήμερα ο διαχειριστής (χωρίς developer)

1. **Δημοσίευση event/tournament πέρα από club tournaments.** Το `format_definition.publication.state` γράφεται μόνο από το club-tournament wizard/setup του admin (`club-tournaments/[id]/run/route.ts:1761`). Για "κανονικά" (UMB/CEB) events δεν υπάρχει πεδίο/φόρμα δημοσίευσης — μόνο `bt_event.final_standings_published` (auto) και `format_locked` (boolean χωρίς ροή publish).
2. **Ruleset freeze.** Γίνεται **αυτόματα** στο πρώτο αποτέλεσμα (`bt-group.ts:206`) — ο διαχειριστής δεν μπορεί να το προκαλέσει/αναβάλει από UI. Τα `ruleset_snapshot`/`ruleset_frozen_at`/`ruleset_re_resolve_log` είναι `"private": true` — δεν φαίνονται στο admin panel. Η μόνη χειροκίνητη ενέργεια είναι το endpoint `/bt-events/:id/ruleset-re-resolve` (`:472`), που απαιτεί κλήση API.
3. **Νέος κανονισμός** απαιτεί νέο enum key στο `bt-event. ruleset_key` + κώδικα (`standingsCalculator` dispatch, `rulesetProfileRegistry`) — δεν είναι δεδομένο που προσθέτει ο admin.
4. **Παράμετροι κατάταξης** (window/scales/zones/tieBreakPolicy) ζουν σε JSON (`ceb_ranking_categories`) και αλλάζουν κυρίως μέσω engine scripts/admin API, όχι με ασφαλή φόρμα· ίδιο και το `timetable_config`/`bracket_config` JSON.
5. **`timetable_config.externalResultSync`** ξαναγράφεται από τον sync — χειροκίνητες αλλαγές χάνονται εκτός `enabled`/`playerMap` (preserve semantics, kill-switch μόνο).
6. **Republish τελικών:** auto cooldown 60s (`finalResultsPublisher.ts:3454`) · δεν υπάρχει UI να «κλειδώσει οριστικά» ή να απενεργοποιήσει το auto-republish.
7. **Event groups** (`event_groups`) είναι σχήμα-only «Φάση 1 — UI στη Φάση 3» (`schema.json` description) — καμία διαχείριση από admin.
8. **CEB publish απαιτεί server access**: το `runCebRankingPublish` τρέχει CLI scripts (`spawnSync`, `:111`) στον server· μια αποτυχία δεν αποτυγχάνει την απόφαση (επιστρέφει report) — χρειάζεται έλεγχος από τεχνικό.
9. **Career stats / Elo (`btr_*`)**: υπολογίζονται από `calculate-stats.ts` (debounced recalc via lifecycles) — δεν υπάρχει UI tuning (π.χ. παράθυρα/συντελεστές).
10. **ad-impression stats**: aggregation από script (`backup:ad-impressions` κ.λπ.), όχι live υπολογισμός από admin.
11. **Standings team (`team_standings`)**: υπολογίζονται μέσα στον `team-tournament` controller (server-side) — δεν υπάρχει override UI πέρα από το `manual_override` pattern των bt-results.

---

## Δ. Admin UI: τι μπορεί να διαχειριστεί ο διαχειριστής σήμερα

*Πηγή αρχείου εργασίας: `04-admin-ui.md` (αποτέλεσμα read-only μελέτης).*

**Repo:** `D:/Projects/2-billiardtoday-admin` (Next.js App Router)
**Ημερομηνία μελέτης:** 2026-10-08 · **Read-only** (καμία αλλαγή/commit/deploy)

### 0. Μεθοδολογία & νούμερα

- **115** αρχεία `page.tsx` συνολικά στο admin (`find src/app -name page.tsx`), από τα οποία:
  - `(protected-pages)`: **102**, `(public-pages)`: **5**, `(auth-pages)`: **4**, `ad-impression-stats`: **1**, root `page.tsx`: **1** (redirect).
- **70/115** σελίδες κάνουν κλήση σε `/api/...` ή `useSWR`/`fetcher` (Python scan όλων των `page.tsx`). Οι υπόλοιπες 45 είναι: pure UI/re-export/redirect, ή server components που φορτώνουν μέσω component.
- **202** `route.ts` handlers στο `src/app/api` (`find src/app/api -name route.ts | wc -l`).
- Το admin είναι **thin proxy**: τα περισσότερα API routes προωθούν σε **Strapi Content API** (`appConfig.strapiApiBase` = `<STRAPI_BASE>/api`, `src/configs/app.config.ts:34`).
- Δειγματοληψία: επιβεβαιώθηκαν endpoints σε αντιπροσωπευτικές σελίδες ανά ομάδα· η λίστα API calls per-page βγήκε **μηχανικά** (regex `/api/...` σε όλα τα page.tsx), οπότε καλύπτει και τις 115 σελίδες.

#### Ρόλοι (από `src/configs/navigation.config/index.ts`)
`admin`, `cms`, `ceb`, `federation`, `club`, `club_owner`, `club_operator`, `player` — ορίζονται στα `authority: [...]` κάθε nav item (π.χ. γραμμές 17, 27, 149, 403, 455, 496, 599, 659, 987). Το role→entry mapping γίνεται στο `src/middleware.ts:77-98` (π.χ. `club_operator`→`/admin/commercial/operator`, `ceb`→`/admin/ranking-review`).

---

### 1. Πίνακας περιοχών: τι επιτρέπει σήμερα το admin

Στήλες: **Περιοχή / Σελίδες (paths) / CRUD / Endpoint → Strapi οντότητα / Σημειώσεις**

#### 1.1 CMS (page builder, appearance, media, themes/patterns/plugins)

| Περιοχή | Σελίδες | CRUD | Endpoint → οντότητα | Σημειώσεις |
|---|---|---|---|---|
| CMS dashboard | `/admin/cms` | R | — (στατικός πλοηγός) | Links σε pages/header-footer/menu/themes/patterns/media/site-settings/plugins/builder (`admin/cms/page.tsx:20-79`). |
| Pages | `/admin/cms/pages`, `/new`, `/[id]` | **CRUD** | `/api/admin/cms/pages` (+`/[id]`) → Strapi **`pages`** | GET `publicationState=preview`, πεδία `title, slug, pageType, updatedAt, publishedAt` (`api/admin/cms/pages/route.ts:18-26`); POST create `:69`. Edit σελίδα φορτώνει `pages/[id]` (`admin/cms/pages/[id]/page.tsx:33`). |
| Page builder | `/admin/cms/builder` | **R+W** | pages + patterns + plugins + themes + media/upload | Φορτώνει pages/patterns/plugins/themes/media και αποθηκεύει `PUT pages/[id]` (`admin/cms/builder/page.tsx:788,821,875,901,939,1241,1299`). Χαρακτηρίζεται «Legacy Builder» (`admin/cms/page.tsx:76`). |
| Menus | `/admin/cms/appearance/menu` | **R+W** | `/api/admin/cms/appearance/menu` → re-export `site-settings` | Το menu route είναι alias του site-settings (`api/admin/cms/appearance/menu/route.ts:1-12`). WordPress-like editor. |
| Header/Footer (+ patterns) | `/admin/cms/appearance/header`, `/footer`, `/header-footer`, `/templates` | **R+W** | `/api/admin/cms/site-settings` → Strapi **`site-setting`** | Editor links/submenus/social (`site-settings/page.tsx`: `LinksEditor`). PUT sanitize πεδίων `menus, activeHeaderMenuKey, stickyHeader, headerAppearance, footerAppearance, headerLayout, footerLayout, headerLinks, footerLinks, socialLinks, defaultSeo` (`api/admin/cms/site-settings/route.ts:94-108`). |
| Site settings | `/admin/cms/site-settings` | **R+W** | `site-setting` | Ίδιο endpoint· `siteName, siteTagline, contactEmail` + defaults (`route.ts:16-33`). |
| Media library | `/admin/cms/media` | **CRU+D** | `/api/admin/media` → Strapi **upload/files** + τοπικό meta | Λίστα/upload/rename/delete (`admin/cms/media/page.tsx:135,190,258,295`). Φάκελοι/tags αποθηκεύονται σε **τοπικό JSON** `data/media-meta.json` (`api/admin/media/route.ts:35`), ΟΧΙ στη Strapi. |
| Themes | `/admin/cms/themes` | **CRUD** | `/api/admin/cms/themes` (+`/[id]`) → **τοπικό αρχείο** | Αποθηκεύει σε `data/cms-themes.json` + `src/server/cms-themes/storage` (`api/admin/cms/themes/route.ts:37`). **Δεν** είναι Strapi content type. |
| Patterns | `/admin/cms/patterns` | **CRUD** | `/api/admin/cms/patterns` (+`/[id]`) → **τοπικό αρχείο** `data/cms-patterns.json` | `api/admin/cms/patterns/route.ts:26`. |
| Plugins | `/admin/cms/plugins` | **CRUD** | `/api/admin/cms/plugins` (+upload/`[id]`) → **τοπικό config** | `cms-plugins.config` + `src/server/cms-plugins/storage` (`api/admin/cms/plugins/route.ts:5-17`). |

#### 1.2 Τουρνουά (events, stages, groups, participants, results, rulesets)

| Περιοχή | Σελίδες | CRUD | Endpoint → οντότητα | Σημειώσεις |
|---|---|---|---|---|
| Διοργανώσεις (tournament = competition) | `/admin/tournament`, `/new`, `/edit` | **CRUD** | `/api/admin/tournament` (+`/[id]`) → Strapi **`tournaments`** + `bt-events` + `tournament-participants` | `api/admin/tournament/[id]/route.ts` χτυπά `tournaments`, `bt-events`, `tournament-participants`. Create στο `new/page.tsx:849`. |
| Events | `/admin/tournament/events` | **CRUD (+υπο-λειτουργίες)** | `/api/admin/tournament/events` (+`/[id]`) → Strapi **`bt-events`** | Πολύ μεγάλο page (7000+ γραμμές)· διαχειρίζεται final-results, apply-scoring, external-sync, timetable, recalculate-player-stats. |
| Stages | `/admin/tournament/events/new-stage` | **C+R+U** | `/api/admin/tournament/event-stages` (+`/[stageId]`) → **`bt-event-stages`** | Create `new-stage/page.tsx:443`, generate-groups `stages/[stageId]/generate-groups` route. |
| Groups | (μέσα στο events page) | **CRUD** | `/api/admin/tournament?_action=create-group`, `/api/admin/stages/[id]?_action=delete-group` | `events/page.tsx:6310,6539,6554`. |
| Participants | (μέσα σε events/edit) | **CRUD** | `/api/admin/tournament/[id]/participants` (+`/[participantId]`) → `tournament-participants` | `edit/page.tsx:927,2469`. |
| Αποτελέσματα | `/admin/tournament/results` | **R+U** | `/api/admin/tournament/event-stages/[stageId]*`, `/api/admin/bt-results/[id]` → **`bt-results`**, **`bt-result-finals`** | ~1550 γραμμές· edits μέσω PUT `bt-results/[id]` (`results/page.tsx:720,845`). |
| Standings | (μέσα στα events/results) | **R/action** | `.../calculate-standings`, `.../recalculate-standings-legacy`, `.../standings` | `results/page.tsx:1464,1472`; `events/page.tsx:6953`. |
| Timetable | `/admin/tournament/events/timetable` (+embedded) | **CRUD+generate+publish** | `/api/admin/tournament/events/[id]/timetable*` → **`bt-event-timetable-slots`** | generate/publish/import (xlsx/json) `timetable/page.tsx:166-296`. |
| Brackets | `/admin/tournament/events/brackets` | **R+action** | `/api/admin/tournament/stages/[id]?_action=generate-double-elim` | `brackets/page.tsx:76`. |
| Gallery | `/admin/tournament/events/gallery` | **CRU** | `/api/admin/upload` + PUT `events/[id]` | `gallery/page.tsx:760,859,1106`. |
| UMB / World Cup import | `/admin/tournament/umb-import` | **C (import)** | `/api/admin/tournament/umb-world-cup-import`, `umb-world-cup-bundle`, `umb-verify` | Import από PDF/URL → Strapi custom `/bt-events/umb-world-cup-import` (`1-billiards-strapi/src/api/bt-event/routes/umb-world-cup-import.ts:5`). |
| Rulesets (standard) | `/admin/rulesets` | **CRUD+version** | `/api/admin/standard-rulesets` (+`/[id]/version`) → **`standard-rulesets`** | `StandardRulesetsManager.tsx:56,108`· AI draft `/api/admin/rulesets/ai-draft`. |
| Rulesets (custom) | `/clubs/rulesets`, `/federation/rulesets`, (tournament edit) | **CRUD** | `/api/admin/custom-rulesets` (+`/[id]`) → **`custom-rulesets`** | `CustomRulesetsManager`· create `tournament/edit/page.tsx:2036`. |
| Country rules | `/admin/tournament/country-rules`, `/new` | **CRUD (σελίδες) — αλλά** | `/api/admin/country-rules` → **ΔΕΝ ΥΠΑΡΧΕΙ route** | Οι σελίδες καλούν `/api/admin/country-rules` (`country-rules/page.tsx:33,56,84`; `new/page.tsx:128`) αλλά **δεν υπάρχει `route.ts`** (ούτε rewrite σε `next.config.mjs`). **Ορφανή/σπασμένη λειτουργία.** |
| Team tournaments | `/admin/team-tournaments` + `/[id]/groups|matches|schedule|editor` | **CRUD** | `/api/admin/team-tournaments`, `team-groups`, `team-matches`, `team-match-sets`, `team-tournament-participants`, `teams`, `team-standings` → Strapi **`team-*`** | π.χ. `groups/page.tsx:161,268,319`; `matches/page.tsx:620,669,1310`. |
| Series | `/admin/series`, `/[id]` | **CRUD+link** | `/api/admin/series`, `/api/admin/series-tournaments` → **`ranking-series`**, **`series-tournaments`** | `series/page.tsx:66`; `series/[id]/page.tsx:192,316`. |
| Ranking emails | `/admin/ranking-emails` | **R+W+test** | `/api/admin/ranking-review/mail-settings`, `/mail-test` → **`ranking-mail-setting`** | `ranking-emails/page.tsx:126,157,196`. |
| Players (tournament) | `/admin/tournament/players`, `/new` | **CRUD+merge+recalc+import** | `/api/admin/tournament/players/**` → Strapi **`bt-players`** | merge `players/page.tsx:1281`, recalculate-all `:416`, aggregates `:1244`, import route. |
| Venues | `/admin/venues` | **CRUD** | `/api/admin/venues` → **`venues`** | `venues/page.tsx:86,125`. |
| Tournament settings | (tournament new/edit, team editor) | **CRU** | `/api/admin/settings` (+`/[id]`) → Strapi **`tournament-settings`** | `tournament/new/page.tsx:615,622`; `edit/page.tsx:1620`. |

#### 1.3 Clubs + club tournaments

| Περιοχή | Σελίδες | CRUD | Endpoint → οντότητα | Σημειώσεις |
|---|---|---|---|---|
| Clubs list | `/clubs` | R | `/api/admin/club-context` | Λίστα/πρόσβαση ανά club. |
| New / Edit club | `/clubs/new`, `/clubs/[id]/edit` | **CR** | `/api/admin/clubs` → Strapi **`clubs`** | Server pages με `isAdminSession` guard (`clubs/new/page.tsx:5-13`), φόρμα `ClubForm` (endpoint `ClubForm.tsx:265`, upload `:336`). Ουσιαστικά CRU — **χωρίς UI delete** (delete μόνο από `AdminRegisteredClubsPanel`). |
| Registered clubs | `/clubs/registered` | **CRUD** | `/api/admin/clubs` | `AdminRegisteredClubsPanel.tsx:88`. |
| Club players | `/clubs/players` | **CRUD** | `/api/admin/club-player-memberships`, `teams`, `player-enrollment-requests`, `bt-player-change-requests`, `bt-players` | `ClubPlayersManager.tsx:462,466,492,512,657,757,810`. |
| Club tournaments | `/clubs/tournaments`, `/[id]`, `/custom-planner` | **CRUD+run+ai** | `/api/admin/club-tournaments` (+`/run`, `/ai-setup`) → Strapi **`tournaments`/`clubs`/`scoreboard`** | `club-tournaments/route.ts` (cascade delete report). AI setup `clubs/tournaments/page.tsx:2236`. |
| Club management | `/clubs/management` | **CRUD** | `/api/admin/club-modules` → **`club-module-entitlements`**; `/api/admin/club-employees` → **`clubs`+`users`+`users-permissions`** | `management/page.tsx:409,525,721,734,802`. |
| Club scoreboards | `/clubs/scoreboards` | **CRU** | `/api/admin/club-scoreboards` → **`club-module-entitlements`+`screens`** | `clubScoreboards.ts:116,173`; `clubs/scoreboards/page.tsx:381`. |
| Club teams | `/clubs/teams` | **CRUD** | `/api/admin/teams` (+`/[id]`) → **`teams`** (+`bt-players`, `clubs`) | `teams/route.ts`· `ClubPlayersManager.tsx:810,843`. |
| Club ads | `/clubs/ads` | (re-export) | ίδιο με `/admin/ads/campaigns` | `clubs/ads/page.tsx:3`. |
| (Club) commercial | `/clubs/commercial/*` | **CRUD** | `/api/admin/commercial/*` (club-scoped) | 11 σελίδες· βλ. 1.5. |

#### 1.4 Federation portal & ranking review

| Περιοχή | Σελίδες | CRUD | Endpoint → οντότητα | Σημειώσεις |
|---|---|---|---|---|
| Federation hub | `/federation` | R | `/api/admin/club-context` | Λίστα federations, links σε tournaments/clubs/rulesets (`federation/page.tsx:221-231`). |
| New / Edit federation | `/federation/new`, `/federation/[id]/edit` | **CRU** | `/api/federation` μέσω `/federation/save`, `/federation/remove` → Strapi **`federations`** | `federation/save/route.ts` (POST/PUT), `remove/route.ts` (DELETE)· φόρμα `FederationForm.tsx:376`. |
| Federation tournaments | `/federation/tournaments`, `/[id]/manage` | **CRU+participants** | `/api/admin/federation-tournaments` → Strapi **`tournaments`** | `tournaments/page.tsx:110`· manage `[id]/manage/page.tsx:95`. |
| Ranking review (CEB) | `/admin/ranking-review` | **R+review+email** | `/api/admin/ranking-review/submissions*` → Strapi custom `ranking-review/*` (**`ranking-review`**, **`ranking-submission`**) | `server/admin/rankingReview.ts:145`; `ranking-review/page.tsx:147,213`. |
| Ranking emails | `/admin/ranking-emails` | **R+W** | `ranking-mail-setting` | βλ. 1.2. |

#### 1.5 Ads

| Περιοχή | Σελίδες | CRUD | Endpoint → οντότητα | Σημειώσεις |
|---|---|---|---|---|
| Campaigns (screens) | `/admin/ads/campaigns` | **R+W** | `/api/admin/ads/campaigns` → **`clubs`**; `/api/admin/screens` + `/screens/settings` | `campaigns/page.tsx:374,585,682,830`. |
| Campaigns new | `/admin/ads/campaigns/new` | **τίποτα** | — | Στατικό placeholder «Create a new advertising campaign here» (`new/page.tsx:1-12`). |
| Banners | `/admin/ads/banners`, `/new`, `/[id]/edit` | **CRUD** | `/api/admin/ads/banners` (+`/upload`), `/api/admin/ads/playlists` → Strapi **`advertisements`+`playlist-items`+`playlists`** | `banners/route.ts`: GET/PUT/DELETE/POST, auto-heal, ffprobe/sharp validation· Strapi custom `/advertisements/create` (`1-billiards-strapi/src/api/advertisement/routes/custom-advertisement.ts:6`). |
| Analytics | `/admin/ads/analytics` | R | `/api/ad-impression-stats` **απευθείας σε Strapi** | Το `analytics/page.tsx:3` re-render του `ad-impression-stats/page.tsx`, που καλεί `${NEXT_PUBLIC_STRAPI_URL}/api/ad-impression-stats` (`page.tsx:9,66,93`) → Strapi custom routes `ad-impression`/`ad-impression-stat`. |

#### 1.6 Commercial (admin + club scope)

| Περιοχή | Σελίδες | CRUD | Endpoint → οντότητα | Σημειώσεις |
|---|---|---|---|---|
| Dashboard / sessions / presence | `/admin/commercial`, `/sessions`, `/presence` | R | `commercial/settings`, `commercial/sessions`, `commercial/presence` | presence = live 10s polling (`clubs/commercial/presence/page.tsx:67,102`). |
| Branches / tables | `/admin/commercial/branches`, `/tables` | **CRUD** | `commercial-branches`, `commercial-tables` (+`commercial-table-rate-rules`) | `forwardCollection*` helper· `commercial/settings/route.ts:7,11`. |
| Products / inventory | `/admin/commercial/products`, `/inventory` | **CRUD** | `commercial-products`, `commercial-product-categories`, `commercial-global-products`, `commercial-stock-movements` | `products/route.ts:7,11`. |
| Customers | `/admin/commercial/customers` | **CRUD** | `commercial-customers` | |
| Ταμείο / ταμεία | `/admin/commercial/operator`, `/tabs` | **CRUD** | `commercial-tabs`, `commercial-terminals`, `commercial-charges`, `commercial-payments` | `operator/page.tsx:4899,5088`. |
| Βάρδιες | `/clubs/commercial/shifts` | **CRUD** | `commercial-shifts`, `commercial-business-hours`, `commercial-staff-schedules` | `shifts/page.tsx:1021,1052,1096,1130,1224`. |
| Έξοδα | `/clubs/commercial/expenses` | **CRUD** | `commercial-expenses` | `expenses/page.tsx:395,432,454`. |
| Reports | `/clubs/commercial/reports` | R | `commercial/payments`, `commercial/expenses` | `reports/page.tsx:401`. |
| Τιμοκατάλογοι / settings | `/clubs/commercial/settings`, `/admin/commercial/settings` | **CRUD** | `commercial-settings`, `commercial-table-rate-rules` | `settings/page.tsx:206`. |
| Reset club data | `ResetClubData` component | **action** | `/api/admin/commercial/reset-club-data` | Destructive. |

#### 1.7 Screens / scoreboards / devices

| Περιοχή | Σελίδες | CRUD | Endpoint → οντότητα | Σημειώσεις |
|---|---|---|---|---|
| Screens | `/admin/screens`, `/new`, `/[id]` | **CRUD+activation** | `/api/admin/screens` (+`/[id]/activation/generate`, `/details`) → **`screens`**, **`screen-activations`** | `screens/page.tsx:144`. |
| Provisioning | `/admin/screens/provisioning` | **R+approve** | `/api/admin/screen-provision-requests` (+`/approve`,`/update`) → **`screen-provision-requests`** | `provisioning/page.tsx:84,175`. |
| Club scoreboards | `/admin/scoreboards` | R | `/api/admin/club-scoreboards` | `admin/scoreboard/page.tsx` = re-export του `scoreboards`. |
| RustDesk devices | `/admin/rustdesk-devices` | R | `/api/admin/rustdesk-devices` | `rustdesk-devices/page.tsx:83`. |
| Live send | (events, team matches) | action | `/api/admin/scoreboard/send-match`, `live-delay` | `events/page.tsx:3214,3336`. |

#### 1.8 Site settings, translations, accounts/permissions

| Περιοχή | Σελίδες | CRUD | Endpoint → οντότητα | Σημειώσεις |
|---|---|---|---|---|
| Platform settings | `/admin/settings` | **R+W(AI)** | `/api/admin/settings` → **`tournament-settings`**; `/api/admin/settings/ai` | Οι κάρτες «Authentication Policies» / «Notification Routing» είναι **TODO stubs** (`admin/settings/page.tsx:15-32`). |
| Translations | `/admin/settings/translations` | **R+W σε αρχεία** | `/api/translations/load`, `/api/translations/save` → **filesystem** `src/locales/<lang>/*.json` | Το save γράφει modular JSON στο repo του admin (`api/translations/save/route.ts:37-77`). |
| Account profile | `/account/profile` | **U (password only)** | `/api/auth/change-password` | `account/profile/page.tsx:125`. |
| Home / Player dashboard | `/home`, `/player` | — | — | Στατικά/marketing stubs (`home/page.tsx`, `player/page.tsx` «Replace with charts…»). |
| **Accounts / permissions** | — | **ΔΕΝ ΥΠΑΡΧΕΙ** | — | Καμία σελίδα χρηστών/ρόλων/δικαιωμάτων (grep σε `(protected-pages)` για user/role/permission → μόνο `account/profile`). |

---

### 2. Τι ΚΑΝΕΙΣ σήμερα ΜΟΝΟ με developer / χειροκίνητα

1. **Country-rules** — οι σελίδες `/admin/tournament/country-rules(/new)` καλούν `/api/admin/country-rules` το οποίο **δεν υπάρχει** (`country-rules/page.tsx:33`; `new/page.tsx:128`; καμία εγγραφή σε `src/app/api`). → Χρειάζεται developer για να φτιαχτεί το route (ή να δουλέψει μέσω Strapi `country-rule`).
2. **Θέματα / Patterns / Plugins CMS** — δεν ζουν στη Strapi αλλά σε **τοπικά αρχεία του admin**: `data/cms-themes.json`, `data/cms-patterns.json`, `cms-plugins.config` (`api/admin/cms/themes/route.ts:37`, `patterns/route.ts:26`, `plugins/route.ts:5-17`). Αν το admin redeploy-άρει χωρίς persistent volume, χάνονται· χρειάζεται developer/ops για backup & συγχρονισμό με το frontend.
3. **Media folders/tags** — στο `data/media-meta.json` (`api/admin/media/route.ts:35`), ίδιο ρίσκο.
4. **Μεταφράσεις admin** — γράφονται μέσα στον κώδικα (`src/locales/<lang>/*.json`, `api/translations/save/route.ts:37-77`). Αλλαγή = νέο build/deploy του admin.
5. **Χρήστες / ρόλοι / permissions** — **δεν υπάρχει καθόλου UI**. Νέος club/federation/ceb χρήστης ή αλλαγή `authority`/ρόλου γίνεται χειροκίνητα στη Strapi (users-permissions) — μόνο `club-employees` αγγίζει `users`/`users-permissions` (`api/admin/club-employees/route.ts`).
6. **Ads campaigns/new** — placeholder χωρίς λειτουργία (`admin/ads/campaigns/new/page.tsx:1-12`)· η δημιουργία screen/campaign γίνεται από το `/admin/ads/campaigns` list.
7. **Dead navigation targets** — το nav δείχνει σε σελίδες που δεν υπάρχουν: `/admin/concepts/customers`, `/admin/concepts/products` (`navigation.config/index.ts:960,970,1102,1112`), `/federation/calendar` (`:418,459`) → `find` επιστρέφει 0 pages. Ο διαχειριστής είτε σφάλμα 404 είτε «κρυφά» features που απαιτούν developer.
8. **Delete club από το UI** — η φόρμα club είναι CRU· διαγραφή μόνο μέσω registered panel/API. Επίσης το `/clubs/[id]/edit` και `/clubs/new` είναι admin-only server pages (`clubs/new/page.tsx:13`), άρα club managers δεν μπορούν να δημιουργήσουν/επεξεργαστούν club μόνοι τους.
9. **Raw advertisement entity** — δεν υπάρχει σελίδα CRUD για `advertisements` ως οντότητα· μόνο μέσω banners (playlist-items). Μαζική/χωρίς-playlist διαχείριση διαφημίσεων θέλει developer/Strapi admin.
10. **Screen activation / provisioning** — generate activation & approve requests απαιτούν σύνθετη λογική που ήδη υπάρχει, αλλά RustDesk/device pairing & κάποια screen settings είναι read-only.
11. **Player merge / recalculate-all** — λειτουργίες μεγάλου ρίσκου τρέχουν μόνο από συγκεκριμένες σελίδες (`players/page.tsx:416,1281`) και η αποκατάσταση σφαλμάτων απαιτεί developer/SQL.
12. **Frontend-only περιεχόμενο** — οτιδήποτε δεν είναι single-segment CMS page (βλ. §3) αλλάζει ΜΟΝΟ με κώδικα στο `4-billiardtoday-frontend`.

---

### 3. CMS-managed vs σκληρός κώδικας στο frontend (από τη σκοπιά του admin)

- Frontend `4-billiardtoday-frontend`: **94** αρχεία `page.tsx` συνολικά (`find src/app -name page.tsx | wc -l`).
- **CMS-managed σελίδες: 1 route** — το catch-all `src/app/[...slug]/page.tsx`, που σερβίρει Strapi `pages` μέσω `getCmsPageBySlug` (`[...slug]/page.tsx:49`) και απαιτεί **`slugParts.length === 1`** (`:18,42`) → δηλ. **μόνο μονο-segment slugs**, χωρίς nested CMS pages.
- **Σκληρός κώδικας: ~90 routes** — tournaments, players, rankings (umb/ceb/btr), clubs, teams, live, embed/*, stats, news, docs, federation, enroll, manual, handicap, κ.λπ.
- **Το admin εκθέτει** για το frontend:
  - Περιεχόμενο: CMS **pages** (Strapi) → μόνο το catch-all τα δείχνει.
  - Πλαίσιο/εμφάνιση (global): **site-setting** = header/footer links, menus, activeHeaderMenuKey, appearance, defaultSeo — αυτό τροφοδοτεί το layout όλου του frontend.
  - Θέματα: Strapi **δεν** έχει theme content type· το theme ζει στο admin filesystem και σερβίρεται μέσω `/api/cms/theme` (`api/cms/theme/route.ts`) — δηλαδή η εμφάνιση εξαρτάται από deployment του admin.
- **Συμπέρασμα:** ο διαχειριστής μπορεί να αλλάξει **κείμενο/σελίδες/μενού/header/footer/SEO defaults** χωρίς developer (CMS + site-setting). **Δεν** μπορεί να αλλάξει τη δομή των hardcoded routes (tournaments/players/rankings pages), ούτε να προσθέσει nested σελίδες, ούτε το theme πέρα από ό,τι εκθέτει ο theme editor.

#### 3.1 Κατανομή σελίδων ανά περιοχή (πληρότητα admin)

| Περιοχή | # page.tsx | Έχουν API call | Σχόλιο |
|---|---|---|---|
| `admin/cms` | 16 | 14 | Το πληρέστερο CRUD (pages/site-settings/media/themes/patterns/plugins). |
| `admin/tournament` | 15 | 14 | Βαθύ CRUD· το `country-rules` είναι orphan. |
| `clubs/commercial` | 11 | 9 | Πλήρες operational CRUD, club-scoped. |
| `admin/commercial` | 11 | 3 (άλλα re-export) | Πολλά είναι re-export/redirect σε club commercial ή `clubs/commercial/*`. |
| `admin/team-tournaments` | 6 | 5 | CRUD + schedule/editor. |
| `admin/ads` | 6 | 5 | `campaigns/new` placeholder. |
| `admin/screens` | 4 | 4 | CRUD + provisioning. |
| `clubs/tournaments` | 3 | 2 | CRUD + run/AI. |
| `federation/*` | 6 | 3 | CRUD + tournaments· hub read-only. |
| `admin/series` | 2 | 2 | CRUD. |
| `admin/settings` | 2 | 1 (+1 filesystem) | Stubs + translations. |
| Λοιπά (clubs root, players, teams, home, player, account) | ~20 | λίγα | Read-only/stubs/re-exports. |

Οι **45 σελίδες χωρίς** `/api/` είναι: 4 auth (7-γραμμες stubs), server components που φορτώνουν component (`clubs/new`, `clubs/[id]/edit`, `clubs/registered`, `federation/[id]/edit` → `ClubForm`/`FederationForm`/panels), ή re-export/redirect (`admin/scoreboard`, `clubs/commercial/cash-register`, `admin/commercial/presence`, κ.λπ. → 1-γραμμες `export { default }`).

---

### 4. Ελάχιστα για αυτοεξυπηρέτηση (τι θα έκλεινε τα κενά)

Ιεραρχημένα, μόνο **admin→frontend χωρίς αλλαγή κώδικα**:

1. **Φτιάξε/finalize το `/api/admin/country-rules` route** (ή σύνδεσέ το με Strapi `country-rule`) ώστε οι υπάρχουσες σελίδες να λειτουργούν — σήμερα είναι orphan.
2. **Χρήστες & ρόλοι UI** (`admin/users`): CRUD πάνω σε Strapi `users`/`users-permissions` με ανάθεση `authority` (club/federation/ceb/admin). Είναι το μεγαλύτερο κενό αυτοεξυπηρέτησης — σήμερα κάθε νέος λογαριασμός θέλει Strapi/developer.
3. **Μεταφορά CMS themes/patterns/plugins (+ media meta) από τοπικά JSON σε Strapi content types** (ή persistent, versioned store) ώστε «αποθηκεύω = ισχύει» χωρίς redeploy και χωρίς κίνδυνο απώλειας.
4. **Translations → Strapi** (ή τουλάχιστον export pipeline) αντί για εγγραφή σε `src/locales`, ώστε αλλαγές κειμένου admin/frontend να είναι live.
5. **Ολοκλήρωση `/admin/ads/campaigns/new`** ώστε η δημιουργία campaign/screen να γίνεται και από εκεί.
6. **Καθάρισμα nav**: αφαίρεση ή υλοποίηση των `/admin/concepts/*` και `/federation/calendar` dead links.
7. **Ένα generic «Content/Entity» CRUD generator** για οντότητες που λείπουν (π.χ. `advertisements` raw, `federation`, `venue`) ώστε ο admin να καλύπτει νέες ανάγκες χωρίς νέα σελίδα.
8. **CMS nested pages** (χαλάρωσε το `slugParts.length === 1` ή πρόσθεσε [slug]/[subslug]) ώστε ο διαχειριστής να φτιάχνει υπό-σελίδες χωρίς developer.
9. **Delete/disable flows** που λείπουν (club delete από τη φόρμα, screen deactivate) και audit/undo για destructive actions (`reset-club-data`).
10. **Καθαρισμός των TODO stubs** στο `/admin/settings` (Authentication Policies / Notification Routing) → σύνδεση με Strapi settings.

---

#### Πηγές-κλειδιά (αρχείο:γραμμή)
- Ρόλοι/nav: `src/configs/navigation.config/index.ts:17,27,149,403,455,496,599,659,987`; `src/middleware.ts:77-98`
- CMS pages: `src/app/api/admin/cms/pages/route.ts:18-26,39,69`
- Site settings: `src/app/api/admin/cms/site-settings/route.ts:16-33,53,94-108`; `.../appearance/menu/route.ts:1-12`
- Themes/Patterns/Plugins τοπικά: `.../cms/themes/route.ts:37`, `.../cms/patterns/route.ts:26`, `.../cms/plugins/route.ts:5-17`
- Media meta τοπικό: `src/app/api/admin/media/route.ts:35,82`
- Translations σε αρχεία: `src/app/api/translations/save/route.ts:37-77`
- Tournament endpoints: `src/app/api/admin/tournament/[id]/route.ts`; `events/page.tsx:6310,6539`; `results/page.tsx:720,1464`; `timetable/page.tsx:182,192,294`
- Country-rules orphan: `(protected-pages)/admin/tournament/country-rules/page.tsx:33,56,84` + `new/page.tsx:128` (χωρίς route)
- Clubs: `components/clubs/ClubForm.tsx:265,336`; `clubs/new/page.tsx:5-13`; `ClubPlayersManager.tsx:462,466,492,512,657`
- Ads: `admin/ads/banners/route.ts` (GET/PUT/DELETE/POST), `campaigns/page.tsx:374,585,830`, `analytics/page.tsx:3`, `ad-impression-stats/page.tsx:9,66`
- Commercial: `commercial/settings/route.ts:7,11`; `commercial/products/route.ts:7,11`; `shifts/page.tsx:1021,1052,1130`
- Federation/ranking-review: `federation/save/route.ts:1,69`; `src/server/admin/rankingReview.ts:145`
- Accounts: `account/profile/page.tsx:125`; `admin/settings/page.tsx:15-32`
- Frontend CMS: `4-billiardtoday-frontend/src/app/[...slug]/page.tsx:18,42,49`

---

## Ε. Scoreboard τραπεζιού: ροή αποτελέσματος

*Πηγή αρχείου εργασίας: `05-scoreboard-result-flow.md` (αποτέλεσμα read-only μελέτης).*

> Read-only χαρτογράφηση. Κάθε συμπέρασμα έχει πηγή `αρχείο:γραμμή`.
> Repos: `3-BilliatdToday-Scoreboard` (Electron+Next, αποκαλείται **SB**), `1-billiards-strapi` (**ST**),
> `4-billiardtoday-frontend` (**FE**), `2-billiardtoday-admin` (**AD**).

---

### 1. Αρχιτεκτονική: ποιος κάνει τι, ports, διανομή

| Συστατικό | Ρόλος | Ports / σημείο |
|---|---|---|
| `electron/main.js` (Electron **main**) | Εκκινεί **in-process** Next server (`next({dev:false})`), φορτώνει `.env`, κάνει kiosk fullscreen, auto-update, εκθέτει IPC | Δυναμικό port `PORT..PORT+100` (default 3000) σε `127.0.0.1` — `SB/electron/main.js:1040-1078`; `distDir=.next-build` `SB/electron/main.js:1041` + `SB/next.config.js:52` |
| Next **renderer** (`SB/src/**`) | UI scoreboard + Next **API routes** που κάνουν proxy στο Strapi· εκεί ζει η δημοσίευση αποτελέσματος | `SB/src/app/api/scoreboard/**` |
| `SB/server.js` | Εναλλακτικός Node server για `next start` (παραγωγή/δοκιμή): `PORT` ή 3000, bind `0.0.0.0` | `SB/server.js:4-11` |
| `SB/ws-server/server.js` | Αυτόνομος **WebSocket relay** (presence, live score, remote commands) | `PORT` default **3010** `SB/ws-server/server.js:80`; token auth `?token=` `SB/ws-server/server.js:81-85,321-325`; `SB/ws-server/.env` `TOKEN=BT_WS_...` |
| Strapi (`app.billiardtoday.com`) | Βάση + custom endpoints + lifecycles/standingsCalculator | `ST/src/api/**`, `ST/src/services/**` |
| Admin panel (`AD`) | Χειροκίνητο «Στείλε στο scoreboard» + live-delay + clear | `AD/src/app/api/admin/scoreboard/**` |

- Ο renderer μιλάει στον main μέσω `electron/preload.js` + `electron/ipc.js` (`SB/electron/ipc.js:382+`).
- Electron σημαδεύει το runtime: `SCOREBOARD_ELECTRON_RUNTIME=1` `SB/electron/main.js:95-96`; φορτώνει κρυπτογραφημένο activation token (DPAPI/AES) στο `SCREEN_ACTIVATION_TOKEN` `SB/electron/main.js:81-90,372-386` (store: `SB/electron/token-store.js`).
- **Δημόσια WS** = `wss://ws.billiardtoday.com` (path `/ws`) — `SB/.env:NEXT_PUBLIC_WS_ENDPOINT`, normalization `SB/src/lib/wsPublisher.ts:9-16`, `SB/src/lib/scoreboardWs.ts:1-16`. Το `ws-server` ακούει 3010 και προφανώς είναι πίσω από nginx (ο domain δείχνει εκεί).
- **Self-update / διανομή**:
  - `package.json` scripts: `dist:prod = build-with-env.js → electron-builder --config electron-builder.prod.js → sync-app-update.js → upload-updates.js` `SB/package.json:20-24`.
  - Feed `generic https://updates.billiardtoday.com/` `SB/package.json:114-119`; `electron-updater.checkForUpdates()` `SB/electron/main.js:720-726,865,974,1535`.
  - `build-local-prod.bat` = τρέχει `npm run dist:prod` και μετά υγεία-έλεγχο στο `updates.billiardtoday.com/latest.yml` `SB/build-local-prod.bat:39-70,84-89`; upload SFTP σε `138.201.29.162:/var/www/vhosts/billiardtoday.com/updates.billiardtoday.com/httpdocs` `SB/build-local-prod.bat:28-32`, `SB/scripts/upload-updates.js:20-52`.
  - `publish.bat` = `npm run dist` `SB/publish.bat:2`· `electron-builder.local.js`/`.prod.js` είναι τα configs.
  - `sync-app-update.js` αντιγράφει `latest.yml` → `app-update.yml` (χρειάζεται για in-place updater) `SB/scripts/sync-app-update.js:1`.

---

### 2. Ροή αποτελέσματος (endpoints, auth, σχήμα, content types, standings)

#### 2.1 Τι πυροδοτεί την αποστολή
- Ο χειριστής πατά **End game** → `endGame()` `SB/src/hooks/useGameState.ts:1533`.
- Δύο ανεξάρτητες έξοδοι:
  1. **Live WS** «`score:update`» με `ended:true` (για το κοινό) `SB/src/hooks/useGameState.ts:1643-1715,1725`.
  2. **Αποθήκευση αποτελέσματος** στο Strapi: **αν** υπάρχει `scoreboard.currentSession.id` → session path, **αλλιώς** → friendly path `SB/src/hooks/useGameState.ts:1536-1543,1758,1883`.

#### 2.2 Endpoints & auth
| Βήμα | Endpoint | Μέθοδος | Auth | Πηγή |
|---|---|---|---|---|
| Client → Next (session) | `/api/scoreboard/sessions/:id/result` | POST | κανένα (browser) | `SB/src/lib/scoreboardResultQueue.ts:70-79` |
| Client → Next (friendly) | `/api/friendly-matches/submit` | POST | κανένα | `SB/src/lib/scoreboardResultQueue.ts:74` |
| Next → Strapi (session) | `${STRAPI}/api/scoreboard/sessions/:id/result` | POST | `Authorization: Bearer <token>` | `SB/src/app/api/scoreboard/sessions/[id]/result/route.ts:21-33` |
| Next → Strapi (friendly session) | `${STRAPI}/api/scoreboard/sessions` (`source:'friendly'`) | POST | Bearer | `SB/src/app/api/scoreboard/friendly-session/route.ts:18-27` |
| Strapi handler | `/scoreboard/sessions/:id/result` **`auth:false`** | POST | — | `ST/src/api/scoreboard-session/routes/scoreboard-session.ts` (result route) |

- Το bearer προκύπτει από `getScoreboardApiToken()`: `STRAPI_API_TOKEN`, αλλιώς (σε Electron) `SCREEN_ACTIVATION_TOKEN` `SB/src/lib/server-token.ts:1-15`. Base URL: `getServerStrapiBaseUrl()` → `https://app.billiardtoday.com` όταν production χωρίς internal URL `SB/src/lib/server-strapi-base-url.ts:1-38`.

#### 2.3 Σχήμα body (session result) — `SB/src/hooks/useGameState.ts:1853-1872`
`winner` (`player1`|`player2`), `player1Name`, `player2Name`, `player1DocumentId`, `player2DocumentId`,
`player1_points`, `player2_points`, `player1_innings`, `player2_innings`, `player1_high_run`, `player2_high_run`,
`player1_high_run_2`, `player2_high_run_2`, `player1_match_points`, `player2_match_points`, `date_time`,
`inningsDetail`, `matchSheetJson`. (Το Strapi δέχεται και camelCase/`scores{}` aliases — `ST/.../scoreboard-session.ts:2248-2388`.)

#### 2.4 Τι κάνει το Strapi (`applyResult`) — `ST/src/api/scoreboard-session/controllers/scoreboard-session.ts:2242`
1. Βρίσκει session με οποιοδήποτε id `:2391`· **ενημερώνει `scoreboard-session`**: `sessionStatus:"finished"`, όλα τα `playerX_*`, `winner`, `reportedAt`, `inningsDetail`, `matchSheetJson` `:2415-2440`.
2. Δημοσιεύει WS `SESSION_UPDATED` `:2443`.
3. Αν `source==='friendly'` → δημιουργεί `friendly-match` `:2451-2571`.
4. `applyClubTournamentScoreboardResult` (club_tournament) `:2574`.
5. Ενημερώνει `team-match-set`/`team-match` αν έχει `teamMatchSetDocumentId` `:2589-2646`.
6. **Bridge**: αν υπάρχει `eventStageId`+`brMatchId` → καλεί `bt-event-stage.reportMatch` (με remap πλευρών βάσει documentId) `:2648-2779` (`resolveSessionPlayerSideMapping` `:651`).
7. **Διαγράφει** τη session + `publishSessionRemoved` `:2790-2801`.

#### 2.5 Content types στα οποία καταλήγει
| Content type | Τι γράφεται | Πηγή |
|---|---|---|
| `scoreboard-session` | `sessionStatus=finished` + όλα τα τελικά πεδία, `winner`, `matchSheetJson` | `ST/.../scoreboard-session.ts:2415-2440`; schema `ST/src/api/scoreboard-session/content-types/scoreboard-session/schema.json` |
| `bt-group` (= «match») | `player1_points/innings/high_run`, `result_winner`, `penalty_winner`, `ff_type_*`, `date_time` — **το canonical match record** | `ST/src/api/bt-event-stage/controllers/bt-event-stage.ts:1934-1954` |
| `friendly-match` | αντίστοιχη εγγραφή για φιλικά | `ST/.../scoreboard-session.ts:2497-2563` |
| `team-match-set` / `team-match` | set αποτελέσματα ομαδικών | `ST/.../scoreboard-session.ts:2614-2639` |
| `bt-result` | **κατάταξη/στατιστικά**: `group_number`, `group_position`, `final_position`, `best_average`, `points`, `innings`, `high_run`, `high_run_2`, `match_points`, `qualified`, `qualification_type` | schema `ST/src/api/bt-result/content-types/bt-result/schema.json`; γράφεται από `standingsCalculator.updateStandingsRecords/updateStageFinalPositions` |
| `bt-result-final` | δημοσιευμένα τελικά αποτελέσματα → recalc career stats | `ST/src/api/bt-result-final/content-types/bt-result-final/lifecycles.js` |

#### 2.6 Τι πυροδοτεί το `standingsCalculator`
Αλυσίδα (η σειρά έχει σημασία):

```
scoreboard endGame
  → POST /api/scoreboard/sessions/:id/result           (SB)
  → Strapi applyResult                                  ST/.../scoreboard-session.ts:2242
  → bt-event-stage.reportMatch → update bt-group        ST/.../bt-event-stage.ts:1953  ← γράφει το MATCH
  → emitStageDirty {matches,standings}                  ST/.../bt-event-stage.ts:2834-2843
  → WS: stage_matches_dirty / stage_standings_dirty     ST/src/services/tournamentWsPublisher.ts:118,133
```

- **Ο πραγματικός υπολογισμός standings ΔΕΝ γίνεται μέσα στο `reportMatch`.** Γίνεται από το **lifecycle `bt-group.afterUpdate`** που «βλέπει» το update του βήματος πριν:
  - `ST/src/api/bt-group/content-types/bt-group/lifecycles.ts:10-25` → `checkAndCalculateGroupStandings()`.
  - `ST/src/api/bt-group/services/bt-group.ts:12-91`: `calculateGroupStandings` → `updateStandingsRecords` (γράφει **bt-result**) → `calculateAllGroupStandings` → `updateStageFinalPositions` (`final_position`).
- Επίσης χειροκίνητα/αλλού: `POST /bt-event-stages/:id/calculate-standings` `ST/src/api/bt-event-stage/routes/01-custom.ts:26-31` & `ST/.../bt-event-stage.ts:1329,1370,3293`; `finalResultsPublisher` `ST/src/services/finalResultsPublisher.ts:297`.
- `bt-result-final` (δημοσιευμένα τελικά) παράγεται από `bt-event.finalResults` / `publishFinalResults` `ST/src/api/bt-event/controllers/bt-event.ts:392,418-433` & `ST/src/services/finalResultsPublisher.ts` — και το lifecycle του κάνει auto-recalc stats παίκτη `ST/src/api/bt-result-final/content-types/bt-result-final/lifecycles.js` (afterCreate/afterUpdate/afterDelete).

> Συνέπεια: το `standingsCalculator` τρέχει **μόνο όταν γίνει update σε `bt-group`**. Αν κάποιος αλλάξει αποτελέσματα με SQL (χωρίς lifecycle), τα standings ΔΕΝ ενημερώνονται αυτόματα — χρειάζεται `npm run stats:recalculate-production` (σχόλιο στο `bt-result-final/lifecycles.js`).

---

### 3. Lifecycle `scoreboard-session`

| Ερώτημα | Απάντηση | Πηγή |
|---|---|---|
| **Ποιος τη δημιουργεί** | Admin panel: κουμπί «Στείλε στο scoreboard» → `POST /api/admin/scoreboard/send-match` → Strapi `POST /api/scoreboard/sessions` (`createFromMatch`) | `AD/.../tournament/events/page.tsx:3214`; `AD/src/app/api/admin/scoreboard/send-match/route.ts:82+`; `ST/.../scoreboard-session.ts:1329` |
| **Auth δημιουργίας** | `authority.includes('admin')` + `STRAPI_API_TOKEN` ή session JWT | `AD/.../send-match/route.ts:26-38,84-89` |
| **QR/κωδικός** | ΔΕΝ δημιουργεί session· το QR (`scoreboard-player-link`) είναι *άλλο* flow (δέσιμο παίκτη σε slot, §4) | `SB/.../HomePage.tsx:1212-1245` |
| **Δέσιμο με event/stage/group/table** | Body: `screenIdentifier, eventId, eventStageId, stageType, brMatchId, brMatchDocumentId, groupNumber, matchNumber, tableNumber, player1/2Name, player1/2DocumentId, player1/2_match_points, matchDateTime, videoId/liveVideos` | `AD/.../events/page.tsx:3181-3213`; schema `scoreboard-session/schema.json` |
| **Metadata enrichment** | Το Strapi λύνει stage→event→tournament→club, φτιάχνει `eventTitle`, `stageTitle`, `orgName`, `groupLabel`, `matchNo`, target/innings/timeouts | `ST/.../scoreboard-session.ts:1367-1498,1550-1596` |
| **Club απαραίτητο** | Αν δεν βρεθεί club από event ούτε από screen → `badRequest` («Η οθόνη πρέπει να είναι συνδεδεμένη με κάποιο club…») | `ST/.../scoreboard-session.ts:1457-1504` |
| **Upsert** | Αν υπάρχει ενεργή session για ίδιο (eventStage+brMatch **ή** screen) → update, αλλιώς create· publish `SESSION_ASSIGNED`/`SESSION_UPDATED` | `ST/.../scoreboard-session.ts:1630-1706` |
| **Το scoreboard την «κατεβάζει»** | WS subscribe με `screenId` ή API polling `/api/scoreboard/screens/:id/sessions` + `/sessions-all` | `SB/src/app/scoreboard/hooks/useScoreboardSessions.tsx:342-424,217,257`; `SB/src/hooks/useGameState.ts:191,201` |
| **Πότε κλείνει** | `applyResult` → finished + **delete**· επίσης `clear` (screenIdentifier `'-'`) και `clear-by-club-tournament` | `ST/.../scoreboard-session.ts:2790-2801`; `AD/.../events/page.tsx:3278-3282`; routes `clear`, `clear-by-club-tournament` |
| **Αποσύνδεση (WS presence)** | `scoreboard_hello`/`scoreboard_heartbeat` → presence map· TTL από heartbeat· `GET /presence`· `lastStateByClub` καθαρίζεται σε `ended` ή offline screen | `SB/ws-server/server.js:473-492,180-187,657-676,112-121,608-627,667-675` |
| **Έλεγχος εγκυρότητας οθόνης** | Κάθε connection ελέγχεται στο Strapi `/api/screens` (`identifier`,`isActive`) — απενεργοποιήσιμο με `SCREEN_VALIDATION_ENABLED=false` | `SB/ws-server/server.js:25-72,108-110` |

#### Δέσιμο παίκτη σε slot (`scoreboard-player-link`)
- Το scoreboard ζητά link: `POST /api/scoreboard/player-links` με `{screenIdentifier, slot}` `SB/.../HomePage.tsx:1212-1216`· φτιάχνει `nonce` + `expiresAt` (+10′), reuse/expire logic `ST/src/api/scoreboard-player-link/controllers/scoreboard-player-link.ts:28-99`.
- QR URL: `https://billiardtoday.com/claim?nonce=…&slot=…&screenId=…` `SB/.../HomePage.tsx:1239-1245`.
- Το scoreboard **pollάρει** `GET /api/scoreboard/player-links?screenIdentifier=…` κάθε 3″ και εφαρμόζει τους `claimed*` παίκτες + κάνει `consume` του nonce `SB/.../HomePage.tsx:1268-1312`.
- **Ο legacy direct claim είναι ΚΛΕΙΣΤΟΣ (410)** `ST/.../scoreboard-player-link.ts:121-126` και `SB/src/app/api/scoreboard/player-links/claim/route.ts` (410).
- Το claim γίνεται πλέον από **trusted device**: `POST /api/player-devices/claim-scoreboard` → θέτει `status:'claimed'` + `claimedPlayerName/DocumentId/Country/PhotoUrl/…` `ST/src/api/player-device/controllers/player-device.ts:493-563`. H FE σελίδα `/claim` δρομολογεί σε `/enroll` αν η συσκευή δεν είναι δεμένη `FE/src/app/claim/page.tsx:71-76`.

---

### 4. Ίδιας πηγής live: τι στέλνει / πώς το διαβάζει το site

**Το scoreboard στέλνει** (μέσω `wss://ws.billiardtoday.com/ws?token=…&screenId=…`):
- `score:update` με `players[]`, `inningsDetail`, `liveRun`, `ended` `SB/src/hooks/useGameState.ts:1643-1715` → `sendLivePayload` `SB/src/lib/wsPublisher.ts:96-120`.
- `SESSION_ASSIGNED`/`SESSION_UPDATED` (από Strapi, `publishSession*`).
- `REMOTE_COMMAND`, `overlay:break:*`, `LIVE_SYNC_DELAY_UPDATED`, `*_dirty`, `stage_*` `SB/ws-server/server.js:544-591`.

**Ο `ws-server` δρομολογεί**: `broadcastToScreen` / `broadcastToClub` / `broadcastToEvent`· σε `subscribe:club` στέλνει αμέσως το τελευταίο state `SB/ws-server/server.js:137-178,436-470`.

**Το site διαβάζει** με **δύο τρόπους**:
1. **REST από τη βάση (SSR/route handlers)** — `fetchScoreboardSessionRows()` → `GET /api/scoreboard/sessions?filters[$or][…][sessionStatus][$eq]=pending|in_progress&populate=*&sort=updatedAt:desc` (Bearer) `FE/src/lib/liveSessions.ts:412-438`· normalize `normalizeLiveSessionRow` `FE/src/lib/liveSessions.ts:270-410`. Χρήστες: `/api/tournaments/[eventId]/live-sessions`, `/api/clubs/[clubId]/sessions`, `/api/admin/tournament/live-screens`, `/api/scoreboard/screens`, `/api/scoreboard/session-by-id/[sessionId]` (όλα `grep liveSessions` στο FE). Proxy: `FE/src/app/api/scoreboards/route.ts:10`.
2. **Live WS στο client** — `LiveClubView.tsx` ανοίγει WS και στέλνει `subscribe:club` `FE/src/components/live/LiveClubView.tsx:1277-1304`· `useLiveScore.ts` φιλτράρει `score:update` ανά `screenId` `FE/src/hooks/useLiveScore.ts:7,125`. Rendering: `LiveScoreBoardCard.tsx` (χρήστες: `LiveClubView.tsx`, `TournamentDetailPage.tsx`).
- Το `FE/src/app/api/scoreboards/[id]/events/route.ts` (POST → Strapi `/api/scoreboards/:id/events`, `auth:false` `postEvent`) είναι ξεχωριστό κανάλι εντολών/events, όχι η ροή αποτελέσματος.

> Το «live» στο site είναι **DB-driven** (scoreboard-sessions) για το card/list, και **WS-driven** για άμεση ενημέρωση μέσα στο club view. Όταν το session διαγραφεί στο `applyResult`, το live card εξαφανίζεται και τη θέση παίρνει το «επίσημο» αποτέλεσμα (bt-group/bt-result).

---

### 5. Πίνακας: βήμα → ποιος → endpoint/αρχείο:γραμμή → τι μπορεί να σπάσει

| # | Βήμα | Ποιος | Endpoint / αρχείο:γραμμή | Τι μπορεί να σπάσει |
|---|---|---|---|---|
| 1 | Εγκατάσταση/ενεργοποίηση οθόνης (identifier + activation code → apiToken) | Dev/Admin | `ST/src/api/screen-activation/**`; activate route `SB/src/app/api/scoreboard/activate/route.ts` | Λάθος `SCREEN_ACTIVATION_SECRET`, ληγμένο token, `identifier` χωρίς `screen`/`club` |
| 2 | Δέσιμο οθόνης με club | Admin | `ST/src/api/screen/content-types/screen/schema.json` (relation `club`) | Χωρίς club → `createFromMatch` αποτυγχάνει `ST/.../scoreboard-session.ts:1500-1504` |
| 3 | «Στείλε στο scoreboard» συγκεκριμένου αγώνα | Admin (χειροκίνητα) | `AD/.../events/page.tsx:3214`; `AD/.../send-match/route.ts:82+` | Λάθος/κενό screenId, μη-ενεργή session, λάθος stage/brMatch |
| 4 | Δημιουργία/ενημέρωση `scoreboard-session` | Admin→Strapi | `ST/.../scoreboard-session.ts:1329` | Έλλειψη `player1/2DocumentId` → fallback ονόματα· λάθος group/match labels |
| 5 | Λήψη session στο τραπέζι | Scoreboard | `SB/src/app/scoreboard/hooks/useScoreboardSessions.tsx:342-424` | WS token mismatch (`.env` vs `ws-server/.env`), offline mode, screen validation |
| 6 | Δέσιμο παικτών (QR) | Παίκτης (phone) | `SB/.../HomePage.tsx:1212-1245`; `ST/.../player-device.ts:493` | Ληγμένο nonce (10′), legacy claim 410, συσκευή χωρίς enrollment |
| 7 | End game → αποστολή | Χειριστής | `SB/src/hooks/useGameState.ts:1533,1853-1873` | Λείπει `scoreboard.currentSession.id` → πέφτει σε **friendly** path |
| 8 | Next proxy → Strapi result | Next route | `SB/src/app/api/scoreboard/sessions/[id]/result/route.ts:21-33` | Λάθος `STRAPI_API_URL`/token· `SCOREBOARD_ELECTRON_RUNTIME` χωρίς activation token |
| 9 | `applyResult` (γράφει session + bridged match) | Strapi | `ST/.../scoreboard-session.ts:2242-2810` | `brMatchDocumentId` που δεν λύνει σε bt-group `:2680-2688`· πλευρές παικτών ανάποδα `resolveSessionPlayerSideMapping:651` |
| 10 | `reportMatch` → update `bt-group` | Strapi | `ST/.../bt-event-stage.ts:1836-1954` | forfait/penalty λάθος· auto-advance σε λάθος επόμενο match |
| 11 | `bt-group.afterUpdate` → standings calculation | Strapi lifecycle | `ST/src/api/bt-group/content-types/bt-group/lifecycles.ts:10-25`; `bt-group.ts:12-91` | Group «ημπελές» (μερικά αποτελέσματα) δεν υπολογίζεται· σφάλμα config |
| 12 | WS dirty → ενημέρωση UI | Strapi→ws | `ST/src/services/tournamentWsPublisher.ts:118,133` | Πτώση WS server / token· stale cache |
| 13 | Live card στο site | FE | `FE/src/lib/liveSessions.ts:412-438`; `LiveClubView.tsx:1277-1304` | Strapi token λείπει → 401/κενά· WS χωρίς `clubId` |
| 14 | Δημοσίευση τελικών (bt-result-final) | Admin/Dev | `ST/src/api/bt-event/controllers/bt-event.ts:418-433` | Δεν αυτο-δημοσιεύεται· χειροκίνητο trigger |
| 15 | Διανομή app update | Dev | `SB/build-local-prod.bat:39-70`; `SB/package.json:20-24` | Version collision, SFTP auth, `latest.yml` mismatch |

---

### 6. «Απαιτεί σήμερα dev/χειροκίνητο» — με παράδειγμα

| # | Τι απαιτεί dev/χειροκίνητο | Παράδειγμα |
|---|---|---|
| 1 | **Καταχώριση/ενεργοποίηση κάθε οθόνης στο Strapi** (activation code, apiToken, relation screen↔club) | Νέο τραπέζι σε νέο club: πρέπει dev/admin να δημιουργήσει `screen-activation`, να το ενεργοποιήσει και να δέσει το `screen` στο `club` πριν δουλέψει η ροή `ST/.../scoreboard-session.ts:1500-1504` |
| 2 | **Χειροκίνητο «Στείλε στο scoreboard» ανά αγώνα** | Σε τουρνουά 40 αγώνων: κάποιος admin πατά το κουμπί για κάθε match (`AD/.../events/page.tsx:3214`). Δεν υπάρχει auto-assign βάσει timetable |
| 3 | **Token rotation = rebuild του app** | `STRAPI_API_TOKEN`/`NEXT_PUBLIC_WS_TOKEN` μπαίνουν στο build (`SB/package.json:89-113` γράφει `.env`/`.env.local` στο package)· αλλαγή token σημαίνει νέο `build-local-prod.bat` + republish |
| 4 | **Deploy του `ws-server` + nginx proxy + token match** | Αν το `ws.billiardtoday.com` proxy σπάσει ή το `TOKEN` σε `SB/ws-server/.env` δεν ταιριάζει με `SB/.env:NEXT_PUBLIC_WS_TOKEN`, «πεθαίνει» σιωπηλά το presence/live (`SB/ws-server/server.js:321-325`) |
| 5 | **Standings μετά από out-of-band αλλαγές** | Διόρθωση αποτελέσματος με SQL/Admin που δεν πυροδοτεί `bt-group` lifecycle → απαιτεί `npm run stats:recalculate-production` (σχόλιο `ST/src/api/bt-result-final/content-types/bt-result-final/lifecycles.js`) |
| 6 | **Χειροκίνητη δημοσίευση τελικών αποτελεσμάτων** | `publishFinalResults` δεν τρέχει αυτόματα στο τέλος event (`ST/src/api/bt-event/controllers/bt-event.ts:418-433`) |
| 7 | **Το πέρασμα session↔friendly εξαρτάται από orchestration** | Αν λείψει `scoreboard.currentSession.id`, ένας επίσημος αγώνας γράφεται ως **friendly** (`SB/src/hooks/useGameState.ts:1533-1543,1883`) |
| 8 | **Ενεργοποίηση/απενεργοποίηση screen validation** | `SCREEN_VALIDATION_ENABLED` (`SB/ws-server/server.js:108`) — η απενεργοποίηση ανοίγει/κλείνει αυθαίρετα connections, manual ops |
| 9 | **Publish Electron update** | `build-local-prod.bat` + SFTP credentials (`SB/build-local-prod.bat:28-32`) — dev-only, απαιτεί SSH key/κωδικά |
| 10 | **Έλεγχος live-delay ανά οθόνη** | `POST /api/admin/scoreboard/live-delay` (`AD/src/app/api/admin/scoreboard/live-delay/route.ts`) — χειροκίνητο, με WS token fallback `BT_WS_RELAY_TOKEN_2025` |

---

### Κενά

1. **`ws-server` & nginx**: δεν εντοπίστηκε μέσα στα repos το nginx conf για `ws.billiardtoday.com` (υπάρχουν hints σε `SB/docs`/`SB/scripts/fix-nginx-proxy.sh` αλλά δεν επιβεβαιώθηκε η ενεργή ρύθμιση).
2. **Referee/απουσία `brMatchId`**: αν μια session δημιουργηθεί χωρίς `eventStageId`+`brMatchId`, το αποτέλεσμα **δεν** φτάνει σε `bt-group` (μόνο ή friendly-match). Δεν τεκμηριώθηκε πού/αν καταγράφεται ειδοποίηση για αυτή την «αδιέξοδη» session.
3. **Έλεγχος διπλών/ορφανών**: το `applyResult` διαγράφει τη session — αν το HTTP response χαθεί πριν το delete, ο client retry από το queue (`scoreboardResultQueue.ts`) θα βρει 404 «Session not found». Το αν αυτό είναι idempotent ή χάνει αποτέλεσμα δεν αποδείχθηκε.
4. **Λεπτομέρειες `standingsCalculator`**: διαβάστηκε η αλυσίδα trigger και η schema του `bt-result`, αλλά **όχι** εξαντλητικά το εσωτερικό scoring (tie-breaks, artistic coefficients) — εκτός scope.
5. **FE live WS**: δεν επιβεβαιώθηκε αν το `useLiveScore`/`LiveClubView` χρησιμοποιείται σε production route ή είναι legacy (η DB-driven οδός `liveSessions.ts` φαίνεται η κύρια).
6. **Android/Alternative clients**: υπάρχει `SB/.env` RustDesk heartbeat & φάκελος `android` — δεν ερευνήθηκε ο ρόλος τους στη ροή αποτελέσματος.
7. **`commercial-*` scoreboard**: το `AD/src/app/api/admin/commercial/scoreboard-session/route.ts` δείχνει δεύτερο (εμπορικό/χρόνου) scoreboard — δεν χαρτογραφήθηκε αν επικαλύπτεται με το αγωνιστικό.

---

## Ζ. Media/CDN & δεδομένα σε αρχεία/κώδικα

*Πηγή αρχείου εργασίας: `06-media-and-files.md` (αποτέλεσμα read-only μελέτης).*

**Σκοπός:** Τεκμηρίωση (α) της ροής media/upload και (β) ποια δεδομένα του site ζουν σε αρχεία/κώδικα
(άρα απαιτούν importer/deploy) αντί σε CMS. **Read-only** — κανένα write σε server/CDN, καμία αλλαγή repo.

**Repos:** `D:/Projects/4-billiardtoday-frontend` (Next 15.0.7, PM2 `billiardtoday-frontend`),
`D:/Projects/1-billiards-strapi` (Strapi). Server: `138.201.29.162`, ομάδα Plesk user `billiardtoday_srv`.

> Τοπικές μετρήσεις: `public/data` = **29 αρχεία** σύνολο (CEB 21, UMB 8). Strapi content-types = **86**
> `schema.json`. Frontend: **94** `page.tsx`, **74** route handler (`src/app/api`), 70 components, 52 `src/lib/*.ts`.

---

### Α. Ροή media / upload (cdn.billiardtoday.com)

#### Α.1 Αλυσίδα με ένα βήμα λιγότερο απ' ό,τι φαίνεται

Η αποθήκευση είναι **τοπική (local), όχι S3/Cloudinary**, και το CDN σερβίρει **το ίδιο αρχείο** — δεν
υπάρχει ξεχωριστό βήμα αντιγραφής.

| Στάδιο | Τι συμβαίνει | Πηγή |
|---|---|---|
| Upload plugin | `provider: 'local'`, `sizeOptimization: false`, `breakpoints: {}` | `1-billiards-strapi/config/plugins.ts:12-16` |
| Πού γράφει το Strapi | `app.billiardtoday.com/httpdocs/public/uploads/` (815 αρχεία) | ssh: `ls` στο server |
| Πού σερβίρεται | `cdn.billiardtoday.com/httpdocs` = nginx `root` του vhost, με υποφάκελο `uploads/` | ssh: `cdn.billiardtoday.com/conf/nginx.conf:22,66,102,142` |
| Σχέση των δύο dirs | **Ίδιο αρχείο** (ίδιο inode/size/mtime, π.χ. `1000020921_5335d75209.jpg` → inode 1621767005 και στις δύο διαδρομές· και τα δύο dirs σε `/dev/sdc1`) | ssh: `stat`/`mount`/`df` |
| Backup/uploads watch | `bt-backup-uploads.sh` (καθημερινά 03:17) + `bt-watch-uploads.sh` (κάθε 5′) — παρακολουθούν το CDN dir, **δεν** αντιγράφουν | `/etc/cron.d/bt-backup-uploads`, `bt-watch-uploads`, `/usr/local/sbin/bt-watch-uploads.sh` |

Συμπέρασμα: το «CDN» είναι στην πράξη ένα Plesk vhost πάνω σε έναν κοινό data-disk (`/dev/sdc1`), όπου το
`public/uploads` του Strapi και το docroot του CDN δείχνουν στα ίδια δεδομένα. **Δεν χρειάζεται χειροκίνητη
αντιγραφή σε CDN φάκελο** — το βήμα που λείπει δεν υπάρχει.

#### Α.2 Ποιος ξαναγράφει το URL (frontend)

| Ρόλος | Τι κάνει | Πηγή |
|---|---|---|
| `resolveMediaUrl` | Αν το URL έχει hostname `app.billiardtoday.com`/`cdn.billiardtoday.com`/`NEXT_PUBLIC_STRAPI_URL` **και** path `/uploads/…` → ξαναγράφει τον host σε `NEXT_PUBLIC_MEDIA_URL` (default `https://cdn.billiardtoday.com`), κρατώντας path+query | `src/lib/mediaUrl.ts:2,15-23,35-50` |
| Τοπικές διαδρομές | `uploads/...` ή `/uploads/...` → μπροστά το media base | `src/lib/mediaUrl.ts:47-50` |
| `publicSiteData` wrapper | `resolveMediaUrl(entity.photo_main) || resolveMediaUrl(entity.photo_alt)` | `src/lib/publicSiteData.ts:201-210,274` |
| Env | `NEXT_PUBLIC_MEDIA_URL=https://cdn.billiardtoday.com` | `ecosystem.config.js:15`, `next.config.js:39` |
| next/image | `domains: ['app.billiardtoday.com','billiardtoday.com','cdn.billiardtoday.com']`, optimizer on | `next.config.js:19-22` |

Δηλαδή: το Strapi δίνει URL τύπου `https://app.billiardtoday.com/uploads/x.jpg` και το frontend το δείχνει ως
`https://cdn.billiardtoday.com/uploads/x.jpg` **στον browser** — το rewrite το κάνει το React layer, όχι nginx.

#### Α.3 OG images + social metadata

| Τι | Πηγή |
|---|---|
| Default social image (repo-τοπικό, **όχι** CMS): `/img/og/tournament-default.png` 1730×909 | `src/lib/socialMetadata.ts:12-18` |
| `toAbsoluteUrl` / `buildOpenGraphImage` (τυποποίηση URL+type) | `src/lib/socialMetadata.ts:20-58` |
| OG route (δυναμικό): render **τη στιγμή του request**, 1200×630 ×2 = 2400×1260, σε Node runtime | `src/app/api/og/tournament/[slug]/route.tsx:39-52,1417+` |
| Μετατροπή σε WebP q92 με `sharp` (fallback PNG) | `…route.tsx:1750-1774` |
| Cache 15′ σε μνήμη + δίσκο (`.og-render-cache`, εκτός `.next`) | `…route.tsx:132-289` |
| Background/logo από frontend static: `/img/og/tournament-default.png`, `/logo-billiardtoday.png` | `…route.tsx:60-62` |
| OG URL κατασκευή για social crawlers | `src/lib/tournamentShareMetadata.ts`, `socialMetadata.ts` |

Άρα οι εικόνες κοινοποίησης **παράγονται** από δεδομένα Strapi + repo artifacts· δεν ανεβαίνουν χειροκίνητα.

#### Α.4 Τι είναι χειροκίνητο / περιορισμοί

- **Χωρίς responsive breakpoints**: `breakpoints: {}` → το Strapi δεν φτιάχνει `small/medium/large`. Το μόνο
  παράγωγο που εμφανίζεται στον δίσκο είναι `thumbnail_<onoma>_<hash>.jpg` (ssh: `ls` uploads) — δηλ. οι
  διαστάσεις για cards/screens **δεν** παράγονται από το CMS.
- **Χειροποίητα «σπασμένα» ονόματα για διαφημίσεις**: π.χ. `1757766297758_ceb_adv_small_*.jpg`,
  `1757687604960_coca_adv_*.jpg` — το «adv_small» είναι σύμβαση που την έχει φτιάξει άνθρωπος, όχι resize
  του plugin (ssh: `ls` uploads).
- **Ένα OG default + brand logo** ζουν στον κώδικα/repo (`…route.tsx:60-62`), όχι στο CMS.
- **Καμία αυτόματη εξαγωγή video** προς CDN πέρα από ό,τι ανεβάζει ο χρήστης· το plugin είναι `local`.

---

### Β. Δεδομένα σε ΑΡΧΕΙΑ / ΚΩΔΙΚΑ

#### Β.1 Τι διαβάζει κάθε lib (και από πού)

| Αρχείο | Vad διαβάζει | Πηγή | CMS ή Αρχείο |
|---|---|---|---|
| `src/lib/cebRankingData.ts` | `public/data/ceb-ranking/index.json`, `pdf-sources.json`, `<slug>.json`, `archive/<slug>/index.json` + `<key>.json`/`<key>.computed.json`, `player-links*.json` | `cebRankingData.ts:23-24,39-147` | **Αρχείο (fs)** |
| `src/lib/umbRankingData.ts` | `public/data/umb-ranking/index.json`, `<slug>.json`, `archive/…`, `player-links-computed.json` | `umbRankingData.ts:23-103` | **Αρχείο (fs)** |
| `src/lib/cebRanking.ts` | Τύποι + pure helpers (χωρίς fs, το import-άρουν και client components) | `cebRanking.ts:1-11` | **Κώδικας** |
| `src/lib/cebPlayerNameIndex.ts` | Strapi `bt-players` (name→player index, cached 1h) | `cebPlayerNameIndex.ts:72-136` | **CMS** |
| `src/lib/publicSiteData.ts` | Strapi `/api/bt-players`, `/api/clubs`, `/api/federations`, `/api/bt-events` με `revalidate` 60/300/3600 | `publicSiteData.ts:125-138,567-1150` | **CMS** |
| `src/lib/directory.ts` | Strapi `/api/clubs`, `/api/federations` | `directory.ts:351-479` | **CMS** |
| `src/lib/portalProxy.ts` | Proxy προς Strapi `/api/federation-portal/<target>` (JWT μόνο στον browser) | `portalProxy.ts:11-42` | **CMS** |
| `src/lib/gameTypes.ts` | Καθαρός κώδικας: labels + κανονικοποίηση τύπων παιχνιδιού | `gameTypes.ts:13-123` | **Κώδικας** |

Στην πράξη: **κατάλογος (players/clubs/federations/BTR) = CMS.** **Οι κατατάξεις CEB/UMB = αρχεία JSON** που
παράγονται από scripts και μπαίνουν στο `public/data/…`.

#### Β.2 Ποιο script γράφει ποιο αρχείο

| Παραγόμενο | Script | Σημείωση |
|---|---|---|
| CEB `3c-individual.json` + `index.json` (+archive) | `docs/ai/ceb-ranking/build_ceb_data.py` (`OUT_DIR`, `json.dump(..., separators=(",",":"))`, `indent=1` για index) | `build_ceb_data.py:22-25,123-166,211-233` |
| CEB ενδιάμεσο `ceb16_clean.json` | `docs/ai/ceb-ranking/parse_final.py` | `docs/ai/ceb-ranking/README.md:14,23` |
| CEB έλεγχος | `docs/ai/ceb-ranking/verify_rows.py` (πρέπει 0 problems) | `README.md:15,24` |
| CEB από *δικά μας* αποτελέσματα (engine) | `1-billiards-strapi/scripts/build-frontend-ceb-ranking.js` → `<frontend>/public/data/ceb-ranking/<slug>.json` + `player-links-computed.json` | `build-frontend-ceb-ranking.js:5-24` |
| UMB `3c-individual.json` + `player-links-computed.json` + `index.json` | `1-billiards-strapi/scripts/build-frontend-umb-ranking.js` (από `data/umb-ranking/computed-umb-events.json` + `official-umb-events.json`) | `build-frontend-umb-ranking.js:8-13,35` |
| UMB parse PDF → (rank,name,fed,umb_id) | `docs/ai/umb-player-ids/parse_umb_ranking.py` | `parse_umb_ranking.py:1-13` |

**Πώς ξεχωρίζεις τον producer από το ύφος του JSON:**
- CEB `public/data/ceb-ranking/3c-individual.json` → **συμπαγές** (`{"slug":"…"`, χωρίς κενά) → `build_ceb_data.py`
  (`separators=(",",":")`).
- UMB `public/data/umb-ranking/3c-individual.json` → **pretty-printed** (indent 2) → `build-frontend-umb-ranking.js`.
- CEB events κουβαλούν `"ours": true/false` + `note` (engine/meta flags) — βλ. `editions/16-2026.json` (πηγή build).

**Σκληρά hardcoded σταθερές έκδοσης (πρέπει να τις πειράξει άνθρωπος):** `EDITION`, `UPDATED_AT`, `LAST_EVENT`,
`SOURCE_URL`, `SOURCE_LABEL` στο `build-frontend-umb-ranking.js:20-29`. Το αντίστοιχο design doc το επισημαίνει ως
ανοιχτό θέμα (`docs/ai/umb-ranking/2026-10-08-umb-ranking-auto-update-design-el.md:44-46`).

#### Β.3 Πώς φτάνει στον server

- **Deploy = `bt-sync frontend`** (`/usr/local/sbin/bt-sync`): `git pull` στο `/srv/git/billiardtoday/frontend` →
  `rsync -a --delete` στο `/var/www/vhosts/billiardtoday.com/httpdocs/` → `npm ci && npm run build` →
  `pm2 restart billiardtoday-frontend`. Άρα **τα `public/data/*.json` είναι committed στο git** και ταξιδεύουν με το
  rsync/build. Επιβεβαίωση: `git log -- public/data` δίνει commits τύπου `data(ceb-ranking): …`.
- **Live path σε PM2 = `/var/www/vhosts/billiardtoday.com/httpdocs`** (ssh `pm2 jlist`). Προσοχή: το
  `ecosystem.config.js:6` γράφει `cwd: …/tournaments-app` — **ξεπερασμένο**· το πραγματικό cwd είναι `httpdocs`.
- Οι σελίδες διαβάζουν το JSON στο **request time** με `fs.readFileSync` (server components), οπότε μια αλλαγή
  αρχείου **δεν** απαιτεί rebuild — απαιτεί μόνο αλλαγή περιεχομένου + `revalidate=300` (≤5′) ή restart.
  Πηγή: σχόλια `cebRankingData.ts:17-21`, `cebRanking.ts:7-10`, `README.md:198`.

#### Β.4 Τι cron υπάρχει **σήμερα** στον server (καθόλου importer κατατάξεων)

| Cron | Τι κάνει | Πηγή |
|---|---|---|
| `/etc/cron.d/bt-umb-audit` `*/30` | `bt-umb-audit.py --quiet` — έλεγχος συνέπειας UMB events (ζευγάρια/τραπέζια/ώρες) | ssh `cat /etc/cron.d/bt-umb-audit` |
| `/etc/cron.d/bt-backup-uploads` `17 3` | backup του CDN uploads | ssh |
| `/etc/cron.d/bt-watch-uploads` `*/5` | forensic watch μεταβολών uploads | ssh |
| root crontab | acme, aiseo-*, `bt-ads-retention.sh` (Δευτ 04:30) | ssh `crontab -l` |

**Δεν υπάρχει cron** που να κατεβάζει/παράγει CEB ή UMB κατατάξεις. Η ενημέρωσή τους σήμερα είναι **χειροκίνητη**
(τρέξε script → commit → `bt-sync frontend`). Το «αυτόματο» είναι ακόμη **σχέδιο** (design doc πάνω), που στηρίζεται
σε `POST …/publish-final-results` — ενώ το `ceb-ranking-publish` route **δεν υπάρχει** στον κώδικα σήμερα (0 hits στο
`D:/Projects`).

---

### Γ. Πόσο «περιεχόμενο» είναι hardcoded (θέλει deploy για αλλαγή)

Ενδεικτικά (όχι εξαντλητικά) — όλα απαιτούν **edit κώδικα + commit + bt-sync frontend**:

| Περιοχή | Παράδειγμα | Πηγή |
|---|---|---|
| Header/nav + brand logos | `SITE_HEADER_NAV_ITEMS` (Platform/Stats Lab/CEB/UMB κ.λπ.), `iconSrc: /img/logo/ceb.png` | `src/components/site/siteHeaderConfig.ts:3-57` |
| Landing/marketing fallback copy (≈9 ενότητες: header, hero, trustedClubs, features, howItWorks, screenshots, benefits, cta, footer) | defaults με αγγλικό κείμενο/λίστες (π.χ. `clubs:[…6…]`, `features.items:[…4…]`) | `src/components/landing/content.ts:139-338` |
| Landing merge (CMS over defaults) | `buildLandingPageContent()` — ό,τι λείπει από CMS πέφτει στα defaults | `landing/content.ts:340-469` |
| Σελίδα `/rankings` — κάρτα UMB | hardcoded τίτλος/κείμενο «Open ranking» | `src/app/rankings/page.tsx:44-62` |
| «Coming next» blocks | `eyebrow="Coming next"` σε 3 σελίδες | `src/app/rankings/ceb/page.tsx:126-128`, `src/app/rankings/umb/page.tsx:106-108`, `src/app/embed/rankings/ceb/page.tsx:120-122` |
| «Counting tournaments» | σταθερά label | `src/components/public/CebRankingContent.tsx:271-273`, `UmbRankingContent.tsx:186-188` |
| «Editions kept» | σταθερά label | `CebEditionStrip.tsx:30`, `UmbEditionStrip.tsx:25` |
| Κλίμακες πόντων UMB | `FINISH_HEADERS`, `POINT_ROWS` (80/54/36/26/…) hardcoded | `UmbRankingContent.tsx:40-45` |
| CEB suspension legend (αυτολεξεί) | `CEB_SUSPENSION_LEGEND` | `cebRanking.ts:74-75` |
| Game-type labels | `gameTypeLabels`, `extraGameTypeAliases` | `gameTypes.ts:52-90` |
| Σταθερές έκδοσης UMB | `EDITION/UPDATE_AT/LAST_EVENT` | `1-billiards-strapi/scripts/build-frontend-umb-ranking.js:20-29` |

Σύνολο: τουλάχιστον **~11 αρχεία** «περιεχομένου/παρουσίασης» με hardcoded κείμενο ή λίστες. Ειδικά:
- το **landing content.ts** ορίζει 9 sections με ~40 strings/λίστες (μερικά overridable από CMS, τα `panelDetails`,
  `panelNote` **όχι** — `landing/content.ts:381-383`).
- τα **CEB/UMB ranking UI** έχουν ~8 hardcoded labels + 2 πίνακες κλίμακας (UmbRankingContent) που κάθε νέα σεζόν
  μπορεί να θέλουν αλλαγή.

---

### Δ. Πίνακας: δεδομένο → αρχείο/πίνακας → ποιος γράφει → δημοσίευση → χρόνος εμφάνισης

| Δεδομένο | Πού ζει | Ποιος το γράφει | Πώς δημοσιεύεται | Χρόνος εμφάνισης |
|---|---|---|---|---|
| Παίκτες/Κλαμπ/Ομοσπονδίες/BTR | Strapi `bt-players`,`clubs`,`federations` (CMS) | Admin UI / scoreboard / importers | Strapi API + Next `revalidate` (60–3600s) | 1′–1h (ό,τι δηλώνει το `revalidate`) |
| CEB 3c-individual (+14 λίστες) | `public/data/ceb-ranking/<slug>.json` | `build_ceb_data.py` (ή `build-frontend-ceb-ranking.js`) | edit repo → commit → `bt-sync frontend` (rsync+build) | ≤5′ μετά το deploy (`revalidate=300`); άμεσα αν γραφτεί το αρχείο on-server |
| CEB index / «Coming next» | `public/data/ceb-ranking/index.json` (`upcoming`) | `build_ceb_data.py:38-68,215-228` | όπως πάνω | ≤5′ |
| CEB PDF-mode fallback | `public/data/ceb-ranking/pdf-sources.json` | χειροκίνητο/`CebPdfRankingContent` (σήμερα `categories: []`) | όπως πάνω | ≤5′ |
| CEB αρχειοθετημένες εκδόσεις | `public/data/ceb-ranking/archive/3c-individual/…` | `build_ceb_data.py:123-166` | όπως πάνω | ≤5′ |
| UMB Events Ranking | `public/data/umb-ranking/3c-individual.json` | `build-frontend-umb-ranking.js` | edit repo → commit → `bt-sync frontend` | ≤5′ |
| UMB player links | `public/data/umb-ranking/player-links-computed.json` | `build-frontend-umb-ranking.js` | όπως πάνω | ≤5′ |
| UMB PDF export | route `src/app/api/rankings/umb/pdf/route.ts` | — (σερβίρει από `public/data/umb-ranking`) | code deploy | μετά deploy |
| Σύνδεσμοι προφίλ CEB (DB) | in-memory index από `bt-players` | `cebPlayerNameIndex.ts` (read-only CMS) | αυτόματο | ≤1h cache (`INDEX_REVALIDATE_SECONDS=3600`) |
| Media uploads (εικόνες/βίντεο) | `/dev/sdc1` → `app…/public/uploads` == `cdn…/httpdocs/uploads` | Strapi upload plugin | **άμεσο** (ίδιο αρχείο, nginx crypto το σερβίρει) | ~άμεσο (Strapi cache/CDN TTL) |
| OG images | δυναμικά + `.og-render-cache` | `src/app/api/og/tournament/[slug]/route.tsx` | runtime | 15′ cache |
| Landing/marketing/nav copy | κώδικας: `landing/content.ts`, `siteHeaderConfig.ts` | developer | commit → `bt-sync frontend` | μετά το build+restart (min) |

---

### Κενά / τι απαιτεί dev

1. **Καμία αυτόματη ενημέρωση κατατάξεων.** CEB & UMB είναι χειροκίνητα scripts + commit + `bt-sync`· δεν υπάρχει
   importer cron. Το «αυτόματο» είναι σχέδιο (design doc) και εξαρτάται από route (`…/ceb-ranking-publish/publish`)
   που **δεν υπάρχει** στον κώδικα σήμερα → θέλει ανάπτυξη + Φάση Β στην παραγωγή (write-path προς `public/data`).
2. **Δεν υπάρχει self-serve ροή για τις κατατάξεις.** Μια νέα έκδοση CEB αλλάζει και όνομα αρχείου PDF· ο parser έχει
   hardcoded edition/positions (`README.md:178`), άρα κάθε νέα έκδοση απαιτεί developer + verify + rebuild/commit.
3. **Media χωρίς resize variants.** `breakpoints: {}` → μόνο `thumbnail_*`· οι διαφημίσεις/κάρτες θέλουν χειροποίητα
   παραγόμενα αρχεία. Αυτοματοποίηση (π.χ. Sharp στο upload ή CDN transforms) λείπει.
4. **Πολλαπλά hardcoded strings/labels** σε CEB/UMB UI (κλίμακες, «Counting tournaments», «Coming next», «Editions
   kept») — αλλαγές κανονισμού/διατύπωσης = deploy.
5. **Λανθασμένη τεκμηρίωση θέσης deploy**: `ecosystem.config.js:6` δείχνει `tournaments-app`, ενώ το live cwd είναι
   `httpdocs` — ρίσκο σε μελλοντικό script/CI.
6. **Media δεν έχουν CMS-driven metadata** (alt/caption/sizing) — δεν υπάρχει ενιαίος πίνακας media, μόνο αρχεία στον
   δίσκο + όνομα. Δεν υπάρχει `sizeOptimization`/variants ούτε καταγραφή χρήσης.
7. **Τα δεδομένα κατατάξεων είναι «κώδικας-repo»**: μόνο developer μπορεί να τα αλλάξει (git + build). Για
   αυτοεξυπηρέτηση χρειάζεται importer που γράφει απευθείας το `public/data` στον server (χωρίς deploy) ή μεταφορά
   των κατατάξεων σε CMS content type.

---

## Η. Ανοιχτά από το session των κατατάξεων (μεταφέρθηκαν από το brief, δεν χάθηκαν)

- 7 λίστες CEB σε αναμονή (5 Longoni + Εθνικές 5-Pins + Artistic Εθνικές) — περιμένουν αρχεία.
- `stefano-embed-credit-2026-10-08.txt` έτοιμο (ΔΕΝ έχει σταλεί) — περιμένει τη συμφωνία με CEB.
- `archive/3c-individual/16-2026.json` κρατά ένα «Individual — Men» (δεν φαίνεται δημόσια) — καθαρισμός στην επόμενη δημοσίευση.

---

## Θ. Τι ΔΕΝ έγινε (όρια αυτής της μελέτης)

- Καμία αλλαγή, commit ή deploy σε κανένα repo· καμία εγγραφή σε βάση/CDN/server. Στη production έγιναν μόνο `SELECT`/`ls`/`crontab -l` (read-only).
- Δεν μετρήθηκε απόδοση/φόρτος (π.χ. πραγματικά hits του εξωτερικού provider) — μόνο ό,τι ορίζει ο κώδικας.
- Τα 4 σκέλη βασίστηκαν σε αντιπροσωπευτική δειγματοληψία, όχι ανάγνωση και των 115 admin σελίδων μία-μία· όπου έγινε δειγματοληψία, δηλώνεται στο οικείο κεφάλαιο.
- Εκκρεμεί απόφαση του ιδιοκτήτη: ποια από τα §0.5 γίνονται έργο και με ποια σειρά (η μελέτη δεν προτείνει υλοποίηση).
