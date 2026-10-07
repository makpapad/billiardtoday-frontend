# CEB — Ανοιχτά θέματα & συνέχεια (07/10/2026)

**Σκοπός:** ένα σημείο αναφοράς για τα θέματα που μένουν ανοιχτά γύρω από την κατάταξη CEB,
ώστε η δουλειά να συνεχιστεί **και σε αυτό το PC και στο άλλο** (το αρχείο είναι στο git, άρα
ταξιδεύει με `git pull`).

**Αντίγραφο:** το ίδιο αρχείο υπάρχει σε δύο σημεία — αν αλλάξεις κάτι, άλλαξέ το και στα δύο:

| PC / repo | Διαδρομή |
|---|---|
| Strapi (μηχανή) | `1-billiards-strapi/docs/ai/2026-10-07-ceb-ranking-open-items-handoff-el.md` |
| Frontend (λίστα/σελίδα) | `4-billiardtoday-frontend/docs/ai/ceb-ranking/2026-10-07-ceb-ranking-open-items-handoff-el.md` |

> ⚠️ **Προσοχή πριν γράψεις:** το θέμα CEB το δουλεύει **και άλλο session/μηχάνημα ταυτόχρονα**.
> Πριν από κάθε `push` κάνε `git pull --ff-only`. Το `19c77bc` του Strapi (μηχανή CEB ranking)
> είναι **pushed αλλά ΔΕΝ είναι στην παραγωγή** — απόφαση χρήστη (07/10): *μην το πειράξεις, το
> χειρίζεται άλλος*. Το ίδιο ισχύει για τα `data/ceb-ranking/*` του frontend.

---

## 1. Τι είναι ΚΛΕΙΣΤΟ (μην το ξανακάνεις)

| Τι | Κατάσταση | Απόδειξη |
|---|---|---|
| Η λίστα CEB 3-Cushion Individual (V16) δημοσιευμένη | **live**, byte-ίδια με τη συμφωνημένη V16 | `https://billiardtoday.com/data/ceb-ranking/3c-individual.json`, sha256 `b31ef34a…`, 196.558 B, **1.467 εγγραφές / 6.989 πόντοι** |
| Frontend commit δημοσίευσης | `e1c9491` (VAN ERP #23 / CETIN #24 / DANIELSSON = DK) | backup rollback: `/root/ceb-list-before-deploy-20261007-144530.json` |
| Μηχανή CEB ranking (source rule + STOP guard + σειρά ισοπαλίας) | commit **`19c77bc`**, pushed | **δεν είναι στην παραγωγή** (βλ. §2.2) |
| Career stats (ενοποίηση ιστορικού) | **έγινε** — είναι η βάση για το BTR (§2.1) | — |
| CEB Artistic 2026-2027 «σετ» (άλλο θέμα, ζωντανό) | frontend `0a28f83` (build 15:24), strapi `1c4b6ad`, admin `9a9ed24c`, scoreboard `27105d8`, ruleset row 15 `artistic_ceb_2026_2027_v1` | 0 τουρνουά το χρησιμοποιούν — η ροή σετ→κατάταξη **δεν έχει αποδειχθεί με πραγματικά δεδομένα** |

---

## 2. Τα 6 ανοιχτά θέματα

### 2.1 BTR — ξαναϋπολογισμός βαθμού από το ενοποιημένο ιστορικό

- **Τι:** αφού τα career stats ενοποιήθηκαν, ο βαθμός BTR πρέπει να ξαναβγεί από την **ενιαία**
  ιστορία (αλλιώς παλιά/διπλά αποτελέσματα μετράνε λάθος φορές).
- **Πού:** `1-billiards-strapi/scripts/btr-recompute-glicko2.js` — Glicko-2, seed 1500, K 40/20,
  απομείωση αδράνειας 24 μήνες· **γράφει κατευθείαν** `bt_players.btr_overall / btr_deviation /
  btr_last_calculated_at`.
- **Προσοχή:** το script **δεν έχει dry-run και δεν έχει guard** — η βάση είναι δηλωμένη μέσα στον
  κώδικα (`127.0.0.1:5432`, `billiard_pg`), που στην παραγωγή σημαίνει **παραγωγή**.
- **Απαραίτητο βήμα πριν:** αντίγραφο της βάσης + τρέξιμο εκεί, σύγκριση «πριν/μετά»
  (πόσοι παίκτες αλλάζουν, ποιοι >20 μονάδες, top-12 συνολικά/Ελλάδα).
- **Ιδέα/κανόνες:** `4-billiardtoday-frontend/Doc/btr-history-and-recompute.md` (full recompute:
  replay των αγώνων από το 2013 με σωστή σειρά ημερομηνίας).
- **Θέλει από τον χρήστη:** ΟΚ **μετά** το dry-run, με τα νούμερα στο τραπέζι.

### 2.2 Φάση Β — κουμπιά «Υπολόγισε / Δημοσίευσε» στην παραγωγή

- **Σχέδιο:** `1-billiards-strapi/docs/ai/2026-10-06-ceb-ranking-admin-run-plan-el.md` (φάσεις Α→Δ).
  Στόχος: ο υπολογισμός και η δημοσίευση να γίνονται **από τον admin με δύο κουμπιά**, χωρίς τερματικό.
- **Δοκιμασμένο:** ολόκληρο το runbook έχει τρέξει σε **αντίγραφο** της παραγωγής
  (`billiard_pg_prodtest`, Postgres 16, `127.0.0.1:5433`, log `%LOCALAPPDATA%\Temp\rehearse.log`) —
  **καμία εντολή δεν έτρεξε στην παραγωγή**.
- **Τι λείπει:** (α) το Strapi της παραγωγής να πάρει το μοντέλο + τη μηχανή (5 content types
  `ceb-ranking-*`, `src/services/cebRankingEngine.ts`, τα `scripts/*-ceb-*.js`, το block δημόσιας
  ανάγνωσης στο `src/index.ts`) — σήμερα ζουν μόνο τοπικά· (β) εισαγωγή της έκδοσης 16 στη βάση
  της παραγωγής (ίδιο script, `--dry` πρώτα)· (γ) τρέξιμο μηχανής + σύγκριση με τα τοπικά νούμερα·
  (δ) μετά τα κουμπιά στη νέα σελίδα `admin/ceb-ranking` του `2-billiardtoday-admin`.
- **Νούμερα ελέγχου (πρέπει να βγουν ίδια):** **1.476 γραμμές, 22 ομοσπονδίες, 15 suspended,
  σύνολο πόντων 7.019, καμία γραμμή VN**.
- **Φράγμα ασφαλείας:** τα scripts με `--allow-production` **αρνούνται** να γράψουν σε μη-τοπικό host
  χωρίς ρητή έγκριση. Χρειάζεται το ΟΚ του χρήστη.
- **Λυμένο:** το FK trap — η σειρά **ΟΝΟΜΑΤΑ → ΕΙΣΑΓΩΓΗ → ΕΝΟΠΟΙΗΣΗ** (αλλιώς σκάει με FK violation
  στο `ceb_ranking_entries_player_lnk_ifk`).
- **Θέλει από τον χρήστη:** ΟΚ για `--allow-production` στην παραγωγή.

### 2.3 Εθνικοί βαθμοί B–D — να βγαίνουν από τη μηχανή μας

- **Σήμερα:** οι στήλες **B/C/D** (εθνικά πρωταθλήματα 2024/25, 2025/26, 2026/27) μπαίνουν
  **με το χέρι**, όπως τις δίνει η CEB. Πλήρης κατάσταση: `4-billiardtoday-frontend/docs/ai/ceb-ranking/README.md`
  §«Εθνικά πρωταθλήματα (στήλες B–D) — ΕΚΚΡΕΜΕΙ».
- **Θέλουμε:** να τις υπολογίζει **η δική μας μηχανή** από τα δικά μας αποτελέσματα, όπως κάνουμε
  ήδη για τις στήλες A και E–J.
- **Δεδομένα/κανόνες που ισχύουν:** πίνακας πόντων εθνικών (θέση 1/2/3-4/5-8/9-16/17-32 → **40/27/19/13/8/4**)·
  6 αρχεία από 5 ομοσπονδίες στο `docs/ai/ceb-ranking/national/` (5 διαφορετικές διατάξεις)·
  απόφαση 04/10: **φόρμα εισαγωγής με paste** (ένας παίκτης ανά γραμμή), όχι parser ανά ομοσπονδία.
- **Εμπόδια που ξέρουμε:** από 79 ονόματα τα **44 (56%)** ταιριάζουν μοναδικά, 14 διφορούμενα,
  21 δεν υπάρχουν· το `bt-players` **δεν έχει πεδίο UMB ID**· η βάση έχει **29 διπλές εγγραφές** παίκτη.
- **Ζωντανό preview:** `/federation/preview`. Πλήρεις προδιαγραφές/ανοιχτές αποφάσεις:
  `4-billiardtoday-frontend/docs/ai/2026-10-04-ceb-ranking-handoff-el.md`.
- **Θέλει από τον χρήστη:** απόφαση — συνεχίζουμε με τη φόρμα paste ή περιμένουμε τις ομοσπονδίες
  μέσω της πύλης;

### 2.4 Τα 26 ονόματα — ΑΝΟΙΧΤΗ ΑΠΟΦΑΣΗ (μία λέξη)

26 ονόματα γράφονται αλλιώς από τη CEB (σειρά ονόματος/επωνύμου, κεφαλαία, διακριτικά, τυπογραφικά
του CEB όπως `SAINZ-PARDO`, `D'AGATA`, αόρατο/διπλό κενό). Επιλογή:

- **(α)** ταιριάζω σειρά + κεφαλαία, **κρατώ τα σωστά διακριτικά/τυπογραφικά** — *προτεινόμενο*
- **(β)** **byte-ίδια 100%** με τη CEB (μαζί με ASCII και τα διπλά κενά)

Αναλυτική λίστα με αριθμούς θέσης: `4-billiardtoday-frontend/docs/ai/ceb-ranking/handoff-2026-10-07-next-session.md`
§«ΑΝΟΙΧΤΗ ΑΠΟΦΑΣΗ ΧΡΗΣΤΗ» (τοπικό αρχείο, εκτός git).

### 2.5 Τα 3 rig fixes + dry-run

To rig (η μηχανή που βγάζει τη λίστα μόνη της) έχει τρεις γνωστές διαφορές:

1. **Χαρτογράφηση εθνικών στηλών:** το rig γράφει τους εθνικούς πόντους στη **στήλη B**, η
   δημοσιευμένη λίστα τους έχει στη **C** → 8 αθλητές (CETIN, RECH, CANTURK, GRETILLAT, BOULAZ, …).
   Μία γραμμή στο `scripts/build-frontend-ceb-ranking.js`.
2. **Στην πηγή του rig (όχι στο δημοσιευμένο αρχείο):**
   - οι **+4 πόντοι** του Ευρωπαϊκού για **WEISS Alexander** και **PINTO Luis** (η διόρθωση 44/50
     έγινε στη dev βάση, δεν πέρασε στο rig)
   - `fed=DK` για **DANIELSSON Torsten** — σήμερα διαβάζεται από το imported CEB entry
     (`src/services/cebRankingEngine.ts:1182`, `en.raw_federation_code AS "fed"`)
3. **Ποινές −4 (suspended) της CEB** να περνούν στο rig — 7 αθλητές (WEISS Adrian, PINTO Vítor,
   DE KRUIJF Jordy, KABAK Gurhan, GENC Burhan, NAPOLONI Theo, …).

**Dry-run μετά τις διορθώσεις:** το `data/ceb-ranking/computed-3c-individual.json` πρέπει να βγάλει
**100%** τη δημοσιευμένη λίστα. Σημερινή μέτρηση (πριν τις διορθώσεις): **470/489 = 96%**
ίδιοι αριθμοί· 10 αθλητές δεν υπάρχουν στη λίστα (4 Έλληνες + μη εγγεγραμμένοι: GROOT, REFASSI,
CEYLAN · 2 με άλλη γραφή: SØRENSEN/MINAOGLU).

### 2.6 Οι άλλες 14 λίστες

3-Cushion Ladies · 3-Cushion National Teams · 3-Cushion Ladies National Teams · 5-Pins National Teams ·
Artistic Individual · Artistic National Teams · Cadre 47/2 · Cadre 71/2 · 1-Cushion ·
Longoni Next Gen U21 3-Cushion (2025/26, 2024/25, 2023/24, 2022/23) · 5-Pins U21 2022/23.

**Θέλει από τον χρήστη:** **ποια κατηγορία** + **το αρχείο της CEB** (PDF/Excel) της αντίστοιχης έκδοσης.

---

## 3. Runbook δημοσίευσης της λίστας (4 βήματα — μετρημένος χρόνος ~1 μέρα/λίστα)

1. **Υπολογισμός (rig):** οι δικές μας στήλες **μόνο από τα δικά μας αποτελέσματα**· εθνικά + roster
   από το αρχείο της CEB (μέχρι να στέλνουν οι ομοσπονδίες μέσω της πύλης).
2. **Έλεγχος:** διαφορά στα δικά μας → **STOP** + αναφορά (`CebRankingSourceRuleError`, δεν
   δημοσιεύεται τίποτα).
3. **`scripts/build-frontend-ceb-ranking.js`** → commit → push (μόνο το αρχείο της λίστας).
4. **Deploy:** `ssh -i D:/.ssh/billiard_admin_openssh.key root@138.201.29.162 "bt-sync frontend"` →
   επαλήθευση με `curl` + **sha256 byte-σύγκριση** + HTTP 200 στη σελίδα.

## 4. Κανόνες ασφάλειας / παγίδες

- **Κανένα deploy χωρίς ρητή έγκριση** του χρήστη. Το `bt-sync` κάνει `rsync --delete` — ποτέ
  χειροκίνητα αρχεία μέσα στο `httpdocs`, τα σβήνει.
- Σειρά εισαγωγής δεδομένων έκδοσης: **ΟΝΟΜΑΤΑ → ΕΙΣΑΓΩΓΗ → ΕΝΟΠΟΙΗΣΗ** (FK trap).
- Μη-Ευρωπαίοι έξω (κανονισμός CEB). Οι διορθώσεις ονομάτων **μόνο** στο `full_name_en`.
- Τα δεδομένα του CEB δίνουν **μόνο** τη λίστα εγγεγραμμένων (μηδενικοί στο τέλος) + τη σήμανση
  suspended — **οι πόντοι βγαίνουν μόνο από τα δικά μας αποτελέσματα**.
- Στο `data/ceb-ranking/3c-individual.json` (πηγή του import) υπάρχει χειροκίνητη διόρθωση:
  **GUSTAFSSON Bosse (SE) εθνικά = 13** (όχι 31, απόφαση χρήστη). Μην το ξαναφτιάξεις από το
  `ceb16_clean.json` χωρίς να ξαναβάλεις τη διόρθωση.

## 5. Διαδρομές & εργαλεία

| Τι | Πού |
|---|---|
| Frontend repo | `D:/Projects/4-billiardtoday-frontend` — λίστα: `public/data/ceb-ranking/3c-individual.json` · index: `public/data/ceb-ranking/index.json` |
| Strapi repo | `D:/Projects/1-billiards-strapi` — `src/services/cebRankingEngine.ts`, `src/services/cebRankingPublish.ts`, `scripts/run-ceb-ranking-engine.js`, `scripts/build-frontend-ceb-ranking.js` |
| Δεδομένα rig (τοπικά, εκτός git) | `D:/Projects/1-billiards-strapi/data/ceb-ranking/` (computed, player-name-map, merge-log) |
| Admin | `D:/Projects/2-billiardtoday-admin` (νέα σελίδα `admin/ceb-ranking`) |
| Server | `ssh -i D:/.ssh/billiard_admin_openssh.key root@138.201.29.162` · PM2 χρήστης **billiardtoday_srv** · Strapi root: `/var/www/vhosts/billiardtoday.com/app.billiardtoday.com/httpdocs` (προσοχή: `app.billiardtoday.com`) · Frontend root: `/var/www/vhosts/billiardtoday.com/httpdocs` |
| Deploy | `bt-sync {frontend\|app\|admin\|scoreboard\|all}` στον server |
| Σύμβαση ονομάτων CEB | **ΕΠΩΝΥΜΟ κεφαλαία + Όνομα κανονικά**, χωρίς διακριτικά (ASCII), με εξαιρέσεις/τυπογραφικά λάθη |

## 6. Πώς συνεχίζεις σε άλλο PC

1. `git pull --ff-only` σε `1-billiards-strapi` και `4-billiardtoday-frontend` (τα commits με το
   παρόν αρχείο ταξιδεύουν από το GitHub — `makpapad/billiards-strapi`, `makpapad/billiardtoday-frontend`).
2. Διάβασε αυτό το αρχείο **και** τα: `1-billiards-strapi/docs/ai/2026-10-06-ceb-ranking-admin-run-plan-el.md`,
   `4-billiardtoday-frontend/docs/ai/ceb-ranking/README.md`,
   `4-billiardtoday-frontend/docs/ai/2026-10-04-ceb-ranking-handoff-el.md`.
3. Πριν γράψεις σε βάση: αντίγραφο της βάσης (`billiard_pg_prodtest` υπάρχει σε αυτό το PC στο `127.0.0.1:5433`).
4. Πριν push: `git pull --ff-only` ξανά — το ίδιο repo το δουλεύει και άλλο μηχάνημα.

**Τι θέλει από τον χρήστη (σύνοψη εκκρεμοτήτων):** (2.2) ΟΚ για `--allow-production` στην παραγωγή ·
(2.4) επιλογή (α) ή (β) για τα 26 ονόματα · (2.6) ποια κατηγορία + αρχείο CEB · (2.3) απόφαση για τη
φόρμα paste · (2.1) ΟΚ μετά το dry-run του BTR.
