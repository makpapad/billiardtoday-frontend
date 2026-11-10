# Αναφορά διορθώσεων — CEB 3-Cushion Individual (λίστα + κάρτες παικτών)

**Repo:** `D:\Projects\4-billiardtoday-frontend` · **Ημερομηνία:** 2026-10-07
**Scope:** (α) τοπικές διορθώσεις δεδομένων μέσα στο repo, (β) προετοιμασία (χωρίς εκτέλεση) για διορθώσεις στις κάρτες παικτών στο production.
**Δεν έγινε** commit / push / deploy. **Καμία εγγραφή** σε production βάση/API.

---

## Σύνοψη (τι έγινε με μια ματιά)

- **Διπλοεγγραφές λίστας:** ΕΠΙΒΕΒΑΙΩΜΕΝΑ ΚΑΘΑΡΗ. Και στα 3 αρχεία (ζωντανό, `ceb16_clean.json`, archive) υπάρχει **μία γραμμή ανά αθλητή** για τα 7 ονόματα. Σύνολα τώρα: **1471 γραμμές / 6993 πόντοι** (σωστά).
- **BOUCHAT Fabrice (λίστα/μητρώο):** η χώρα **είναι ήδη BE** και το UMB ID **3635** επιβεβαιώθηκε από το μητρώο UMB → **καμία τοπική αλλαγή δεν χρειαζόταν**. Το λάθος (FR, κενό UMB) ζει **μόνο στο production**.
- **GROOT Raymon:** το λανθασμένο `US` εντοπίστηκε σε **12 σημεία** του `lier9.json` (snapshot του event Lier). **Δεν άλλαξε** — η σωστή τιμή είναι **αμφίσημη** στα δεδομένα μας (CEB=NL, UMB=US). Τεκμηριώνεται παρακάτω.
- **Production:** καταγράφηκε ο πλήρης δρόμος εγγραφής (endpoint/πεδίο/merge/ token), γράφτηκε **dry-run script** (`fix_production_players.py`) και **δεν εκτελέστηκε**.
- **REFASSI Badreddine:** ΔΕΝ αφαιρέθηκε (εκκρεμεί έγκριση). Γράφτηκε ξεχωριστά το **τι θα αλλάξει στα σύνολα** + έτοιμο script (`apply_remove_players.py`, dry-run).

---

## Α. ΤΟΠΙΚΕΣ ΔΙΟΡΘΩΣΕΙΣ (μόνο αρχεία μέσα στο repo)

### Α.1 Διπλοεγγραφές → ΕΠΙΒΕΒΑΙΩΜΕΝΑ ΚΑΘΑΡΗ ✅

Έλεγχος διπλών **ονομάτων** στα τρία αρχεία της ροής:

| Αρχείο | HEAD («πριν») | Τώρα («μετά») | Διπλά ονόματα |
|---|---|---|---|
| `public/data/ceb-ranking/3c-individual.json` (ζωντανό) | 1476 γραμμές / 7001 πόντοι | **1471 / 6993** | 7 → **0** |
| `docs/ai/ceb-ranking/ceb16_clean.json` | 1482 / 7023 | **1471 / 6993** | 8 → **0** |
| `public/data/ceb-ranking/archive/3c-individual/16-2026.json` | 1482 / 7023 | **1471 / 6993** | 8 → **0** |

Έλεγχος ανά όνομα — **ακριβώς 1 γραμμή** στο καθένα, σε ΚΑΙ τα 3 αρχεία:

| Αθλητής | Γραμμές τώρα | Θέση/χώρα/πόντοι |
|---|---|---|
| OZDEMIR Fadil | 1 | (βλ. ζωντανό αρχείο) |
| OZDEMIR Bulent | 1 | — |
| VAZ Carlos | 1 | — |
| HENDRIKSEN Rene | 1 | — |
| FACQUET Vincent | 1 | — |
| LEB Balazs | 1 | — |
| DERELI Ferhat | 1 | — |
| ANDERSEN Thomas *(8ο όνομα, υπήρχε στο `ceb16_clean`/archive)* | 1 | — |

**Πώς διορθώθηκε:** το `docs/ai/ceb-ranking/apply_phase0_v16.py` (untracked) έχει **ήδη εκτελεστεί** και παρήγαγε την τρέχουσα κατάσταση. Δεν χρειάστηκε νέα δική μου ενέργεια στη λίστα· επιβεβαίωσα ότι το αποτέλεσμα είναι καθαρό και ότι τα σύνολα (1471 / 6993) είναι αυτά που πρέπει.

**⚠ Παρατηρήσεις / ρίσκα (προς ενημέρωση, χωρίς αλλαγή):**
1. **Δύο νέα ονόματα** εμφανίστηκαν στο ζωντανό αρχείο έναντι του HEAD: **OZEN Mohamed**, **CELIK Sabir** (+2 γραμμές). Δεν είναι διπλοεγγραφές — πιθανόν από τον επανυπολογισμό του engine (`computedAt: 2026-10-06T23:18`). **Προς επιβεβαίωση.**
2. Το `ceb16_clean.json` HEAD→τώρα άλλαξε **και τη σειρά/ορθογραφία των ονομάτων** (κανονικοποίηση «Επώνυμο Όνομα», π.χ. `Bjørnstad Jo`, `ÖZCELIK Adem`), όχι μόνο αφαίρεση διπλών — γι' αυτό η διαφορά −11 γραμμές (όχι −8).
3. **ΝΕΑ ΕΥΡΕΣΗ — πιθανή 8η διπλοεγγραφή:** ζεύγος με **ίδια ονόματα-tokens, διαφορετική σειρά**:
   `JOSE Torrisco Enrique` (#1231, ES, 0 πόντοι) και `TORRISCO Enrique Jose` (#1232, ES, 0 πόντοι).
   Ίδια χώρα, 0 πόντοι, ίδια σύνολα tokens → πολύ πιθανόν **ίδιος αθλητής**. **Δεν άλλαξε** (δεν περιλαμβανόταν στα 7, εκκρεμεί απόφαση χρήστη).
4. **Ρίσκο ροής:** αν ξανατρέξει το `parse_final.py`, παράγει ξανά γραμμές από το PDF (με τα διπλά) και ο dedup του `apply_phase0_v16.py` δεν είναι ενσωματωμένος στον parser. Η διόρθωση είναι σε επίπεδο **δεδομένων**, όχι parser.

### Α.2 BOUCHAT Fabrice — ΗΔΗ ΣΩΣΤΟ, καμία αλλαγή ✅

Ελέγχθηκαν όλα τα τοπικά σημεία όπου ζει το πεδίο:

| Πηγή (αρχείο) | country | umb_id |
|---|---|---|
| `public/data/ceb-ranking/3c-individual.json` (λίστα) | **BE** | — (η λίστα δεν κρατά UMB ID) |
| `docs/ai/ceb-ranking/ceb16_clean.json` / `ceb15_clean.json` | **BE** | — |
| `docs/ai/umb-player-ids/data/umb-ids.json` (μητρώο UMB, `players["3635"]`) | **BE** | **3635** |

→ **Η τιμή 3635 ΕΠΙΒΕΒΑΙΩΘΗΚΕ** από το μητρώο μας (`umb-ids.json`, που παράγεται από το umb-carom.org — βλ. `meta.generated_at: 2026-10-05`, 4261 παίκτες).
→ Μέσα στο repo **δεν υπάρχει λανθασμένο `FR`** για τον BOUCHAT· άρα **δεν εφαρμόστηκε καμία τοπική αλλαγή** (ήταν ήδη σωστό).
→ Το λάθος (`country=FR`, `umb_id=null`) ζει **μόνο στο production** (καρτέλα Strapi) — βλ. ενότητα **Β**.

**Πριν/μετά (λίστα + μητρώο):** χώρα `BE` → `BE` (αμετάβλητη), UMB `3635` → `3635` (αμετάβλητο).

### Α.3 GROOT Raymon — εντοπίστηκε το `US`, ΔΕΝ άλλαξε (τεκμηρίωση) ⚠

**Πού ακριβώς:** αρχείο **`lier9.json`** στη ρίζα του repo (tracked, committed — snapshot εξαγωγής Strapi του event **Lier 2026**). Ο GROOT εμφανίζεται **12 φορές με `"US"`**, σε αυτές τις διαδρομές JSON:

```
/data/players[89]/country
/data/tournament/participants[89]/player/country
/data/event_stages[1]/results[19]/player/country
/data/results_final[88]/player/country
/data/event_stages[1]/groups[31]/player1_local_country
/data/event_stages[1]/groups[31]/player1/country
/data/event_stages[1]/groups[47]/player1_local_country
/data/event_stages[1]/groups[47]/player1/country
/data/timetable_slots[79]/metadata/resolvedPlayer1Country
/data/timetable_slots[79]/match/player1/country
/data/timetable_slots[95]/metadata/resolvedPlayer1Country
/data/timetable_slots[95]/match/player1/country
```

**Ποια είναι η σωστή τιμή; — ΑΜΦΙΣΗΜΗ στα δεδομένα μας:**

| Πηγή | Χώρα |
|---|---|
| Κατάταξη CEB μας (`3c-individual.json` + archive) | **NL** |
| Κάρτα production (scan `player-scan.json`, 07/10/2026) | **NL** (ήδη σωστό) |
| Μητρώο UMB (`umb-ids.json`, `players["1845"]`) | **US** |
| Εξωτερικά (USBA/KNBB/Kozoom) | γεννημένος Μιλάνο, μεγάλωσε Ολλανδία, παίζει Νέα Υόρκη → **NL καταγωγή / US εκπροσώπηση** |

**Απόφαση: ΔΕΝ το άλλαξα.** Λόγοι:
1. Η σωστή τιμή **δεν επιβεβαιώνεται μονοσήμαντα** από τα δεδομένα μας (CEB=NL, UMB=US) → ισχύει το «αλλιώς μόνο τεκμηρίωση».
2. Το `lier9.json` είναι **snapshot** (αποτύπωση του τι είχε το Strapi τότε) — αν το ξαναγράψω, παραποιώ το ιστορικό, χωρίς λειτουργικό όφελος.
3. **Κανένας κώδικας δεν διαβάζει** το `lier9.json` (δεν βρέθηκε reference σε `src/`/`public/`).
4. Η **κάρτα production είναι ήδη NL** — άρα δεν υπάρχει ενεργό σφάλμα προς τον χρήστη.
5. Υπάρχει **σύγκρουση και μέσα στο μητρώο UMB** (λέει US), οπότε το «US» μπορεί να μην είναι απλό λάθος αλλά άλλη ομοσπονδία.

**Αν εγκρίνεις τη διόρθωση** (US→NL στις 12 παραπάνω διαδρομές του `lier9.json`), είναι μεμονωμένο, αναστρέψιμο edit — ένα `sed`/python replace στο συγκεκριμένο αρχείο. Πες μου και το κάνω.

---

## Β. PRODUCTION — κάρτες παικτών (προετοιμασία, ΧΩΡΙΣ εκτέλεση)

### Β.1 Πού «ζουν» οι κάρτες και πώς γράφονται

- **Content-type:** Strapi **`bt-players`** @ `https://app.billiardtoday.com/api`
  Πεδία (από `1-billiards-strapi/src/api/bt-player/.../schema.json`): `full_name`, `first_name`, `last_name`, **`country`**, **`umb_id`**, `date_of_birth`, `slug`, `documentId`.
- **Ανάγνωση:** δημόσια, **χωρίς** token → δουλεύει (200). Παρήγα και ενημερωμένη εικόνα: **3253 κάρτες**.
- **Διόρθωση πεδίου:** `PUT /api/bt-players/<documentId>` body `{"data": {"country":"BE","umb_id":"3635"}}` — θέλει Bearer token με δικαίωμα **update** στο `bt-player`. (Ίδιος μηχανισμός με το υπάρχον `apply_umb_ids.py`.)
- **Συγχώνευση διπλών καρτελών:** custom route **`POST /api/bt-players/merge`** body `{"source":"<docId>","target":"<docId>","hardDelete":false}`.
  **⚠ ΚΡΙΣΙΜΟ:** το merge **μετακινεί τις σχέσεις** (αποτελέσματα/συμμετοχές) από το `source` στο `target` και μετά **διαγράφει (hardDelete) ή απενεργοποιεί (`active:false`)** το `source`. **ΔΕΝ αντιγράφει πεδία** (`country`/`umb_id`). Άρα: **πρώτα γράφουμε στο target** ό,τι θέλουμε να κρατήσουμε (UMB ID/χώρα), **μετά** κάνουμε merge.
- **Admin UI δρόμος:** `POST /api/admin/players/merge` (Next route στο `2-billiardtoday-admin`) — απαιτεί admin session (`authority: ['admin']`) και προωθεί στο Strapi `/bt-players/merge` με `process.env.STRAPI_API_TOKEN`.

### Β.2 Τι ακριβώς θα αλλάξει (στόχοι, από live ανάγνωση 07/10/2026)

| Κάρτα | documentId | Τώρα | Μετά |
|---|---|---|---|
| **BOUCHAT Fabrice** | `m54kz0j093le3tqykzwkxc4k` (id 1636) | `country="FR"`, `umb_id=null` | `country="BE"`, `umb_id="3635"` |
| **GROOT Raymon** | `cee55730-23e6-42c3-8259-3f1cdcc5de66` | `country="NL"`, `umb_id="1845"` | **αμετάβλητο (ήδη σωστό)** |

**Διπλές κάρτες στο production** (πραγματικές, από `player-scan.json`) — υποψήφιες για merge, **κρατάμε το UMB ID**:

| Ομάδα | Κρατάμε (target) | Φεύγει (source) |
|---|---|---|
| KIM Bo Mi | `be2b5de1-42f7-4610-bcae-c9857a92dd88` (KIM Bo Mi 2, KR) | `8cd60682-479c-4a19-a7f5-1c851ea60b27` (χωρίς χώρα) |
| ANDERSEN Thomas | `tncisa5ocsfuqyukwid3tkii` (ANDERSEN Thomas, DK) | `68526e8d-1e52-4e34-bb72-46a7f2541df0` (ANDERSEN Thomas K) |
| NARANJO Andres | `608644e6-cc85-4ce7-8f71-eaf7099872e0` (CO, **UMB 0539**) | `4ce05fa2-8bb7-472d-9db0-c83665fef7fd` (NARANJO Andres F) |
| BJORNSTAD Jo | `df093f7e-38c7-47ea-9e49-792544364a69` (NO) | `7a580d40-3fa7-4b7a-959c-b806aec2e289` (χωρίς χώρα) |

> **Σημείωση σχετικά με την αρχική υπόθεση:** Τα 7 ονόματα με διπλοεγγραφές στη **λίστα** **ΔΕΝ** αντιστοιχούν σε διπλές **κάρτες** production. Ελέγχθηκε ανά όνομα: OZDEMIR Bulent, VAZ Carlos, HENDRIKSEN Rene, DERELI Ferhat → **1 κάρτα**· οι OZDEMIR Fadil, FACQUET Vincent, LEB Balazs → **δεν έχουν καθόλου κάρτα**. Οι πραγματικές διπλές κάρτες είναι οι 4 του πίνακα πάνω.

### Β.3 Το script (dry-run, δεν εκτελέστηκε)

**Αρχείο:** `docs/ai/umb-player-ids/fix_production_players.py` — **προεπιλογή = ΔΟΚΙΜΗ** (`--apply` για εκτέλεση).

Τρέχει ασφαλώς τώρα (μόνο δημόσια ανάγνωση) — πραγματική έξοδος:

```
token από: ...\2-billiardtoday-admin\.env.local · παρόν: True · μήκος: 41
καρτέλες στο production: 3253
===== ΔΟΚΙΜΗ (dry-run) =====
Α) ΔΙΟΡΘΩΣΕΙΣ ΠΕΔΙΩΝ (PUT /bt-players/<documentId>)
  > BOUCHAT Fabrice (m54kz0j0): χώρα FR->BE και κενό UMB ID -> 3635
      πριν : country='FR' umb_id=None
      μετά : {'country': 'BE', 'umb_id': '3635'}
  = GROOT Raymon: ήδη σωστό ({'country': 'NL'}) — καμία αλλαγή
Β) ΣΥΓΧΩΝΕΥΣΗ ΔΙΠΛΩΝ ΚΑΡΤΕΛΩΝ (POST /bt-players/merge)
  > KIM Bo Mi ... / ANDERSEN Thomas ... / NARANJO Andres ... / BJORNSTAD Jo ...
(ΔΟΚΙΜΗ — δεν στάλθηκε κανένα αίτημα. Βάλε --apply για εκτέλεση με έγκριση.)
```

**Βήματα εκτέλεσης (όταν εγκριθεί):**
```bash
cd D:/Projects/4-billiardtoday-frontend/docs/ai/umb-player-ids
python fix_production_players.py                       # 1) δοκιμή (δείχνει τι θα αλλάξει)
python fix_production_players.py --check-token         # 2) επιβεβαίωση ότι το token γράφει (200)
python fix_production_players.py --apply               # 3) εκτέλεση (με φρέσκο token — βλ. Β.4)
```

### Β.4 Τι χρειάζεται για να δουλέψει το production write (token) ⚠

Τα υπάρχοντα admin tokens είναι **ληγμένα**: το read-with-auth γυρίζει **HTTP 401** (επιβεβαιώθηκε). Η **δημόσια** ανάγνωση δουλεύει χωρίς token.

**Για να λειτουργήσει η εγγραφή χρειάζεται:**
1. Σύνδεση στο **Strapi admin** (`https://app.billiardtoday.com/admin`).
2. **Settings → API Tokens → Create new API Token**.
   - Type: **Custom**, Duration: **Unlimited** (ή ημερομηνία λήξης που θα ισχύει).
   - Permissions στο content-type **`bt-player`**: **`find`, `update`, `delete`** (το `delete` για hard-delete merge).
   - (Εναλλακτικά: Full-access token — λιγότερο ασφαλές.)
3. Copy του token μία φορά (δεν ξαναφαίνεται).
4. Τοποθέτηση: `D:\Projects\2-billiardtoday-admin\.env.local` → `STRAPI_API_TOKEN=<token>` **ή** `export STRAPI_API_TOKEN=<token>`.
   **Να ΜΗΝ μπει σε git / commit.**
5. Έλεγχος: `python fix_production_players.py --check-token` → πρέπει «✓ το token διαβάζει με auth (200)».

---

## Γ. ΕΚΚΡΕΜΕΙ ΕΓΚΡΙΣΗ: αφαίρεση REFASSI (έτοιμο για «μία εντολή»)

**Νέα ενημέρωση CEB:** ο **REFASSI Badreddine** (FR) άλλαξε εθνικότητα μετά το Porto World Cup (παίζει πλέον για **Αλγερία**) και **ακυρώθηκε**. Αναμένεται να βγει από τη λίστα· εκκρεμεί απάντηση για **GOKSU Volkan** + **REFASSI Abdelghani**. **ΔΕΝ έγινε η αφαίρεση.**

**Τι θα αλλάξει στα σύνολα (υπολογισμένα από τα αρχεία):**

| Σενάριο | Γραμμές | Πόντοι | Μεταβολή |
|---|---|---|---|
| **Τώρα** | 1471 | 6993 | — |
| − REFASSI Badreddine (#459, FR, **2 πόντοι**, στην J/Lier) | **1470** | **6991** | −1 γραμμή, −2 πόντοι |
| − Badreddine **+** GOKSU Volkan (#458, TR, 2) **+** REFASSI Abdelghani (#707, FR, 0) | **1468** | **6989** | −3 γραμμές, −4 πόντοι |
| *(προαιρετικά)* − TORRISCO διπλό (βλ. Α.1.3) | −1 ακόμη | −0 | — |

> Η αφαίρεση **ξαναριθμεί** τις θέσεις (rank = index) — το script το κάνει αυτόματα.

**Έτοιμο script:** `docs/ai/ceb-ranking/apply_remove_players.py` — **προεπιλογή ΔΟΚΙΜΗ**, γράφει μόνο με `--apply` (και κρατά backup στο `D:/tmp/ceb/`). Ενημερώνει ζωντανό + archive + `ceb16_clean.json` + `index.json`/archive index (players/federations/suspended).

Πραγματική έξοδος δοκιμής:
```bash
# σενάριο Badreddine μόνο:
python apply_remove_players.py
#   πριν : 1471 γραμμές | 6993 πόντοι
#   - #459 REFASSI Badreddine (FR) 2 πόντοι
#   μετά : 1470 γραμμές | 6991 πόντοι
# σενάριο και οι 3:
python apply_remove_players.py --also "GOKSU Volkan,REFASSI Abdelghani"
#   μετά : 1468 γραμμές | 6989 πόντοι
# εφαρμογή (ΜΟΝΟ μετά από έγκριση):
python apply_remove_players.py --also "..." --apply
```

---

## Δ. Τι πρέπει να εγκρίνει ο χρήστης

1. **[Α.1.3] TORRISCO:** είναι ο `JOSE Torrisco Enrique` (#1231) **ίδιος** με τον `TORRISCO Enrique Jose` (#1232); → αν ναι, έγκριση να αφαιρεθεί η μία γραμμή.
2. **[Α.1.1] OZEN Mohamed / CELIK Sabir:** επιβεβαίωση ότι τα 2 νέα ονόματα είναι σωστά (δεν είναι σφάλματα).
3. **[Α.3] GROOT:** απόφαση αν θέλεις να αλλάξω το `US`→`NL` στις 12 διαδρομές του `lier9.json` (ή να το αφήσω ως έχει, αφού είναι snapshot & το production είναι ήδη NL).
4. **[Β.2] BOUCHAT production:** έγκριση για `PUT` χώρας `FR→BE` και UMB `null→3635`.
5. **[Β.2] Merge 4 διπλών καρτελών:** έγκριση για συγχώνευση (και **hardDelete ή soft**;). Ιδίως: επιβεβαίωση ότι τα ζεύγη (`ANDERSEN Thomas K` / `ANDERSEN Thomas`, κ.λπ.) είναι **ίδιο πρόσωπο** — αλλιώς δεν γίνεται merge.
6. **[Β.4] Token:** δημιουργία φρέσκου Strapi API token (find/update/delete στο `bt-player`) — **απαραίτητο** πριν από οποιαδήποτε εγγραφή.
7. **[Γ] Αφαίρεση REFASSI:** έγκριση σεναρίου (μόνο Badreddine, ή και οι 3;) → μετά «μία εντολή».
8. **[Α.1.4] Ρίσκο ροής:** απόφαση αν θα ενσωματωθεί ο dedup/normalize **στον parser** (ώστε να μην επανεμφανιστούν σε επόμενο `parse_final.py`).

---

## Πηγές / αρχεία που ελέγχθηκαν

**Λίστα & ροή:** `public/data/ceb-ranking/3c-individual.json`, `public/data/ceb-ranking/archive/3c-individual/16-2026.json` (+ `index.json`), `docs/ai/ceb-ranking/ceb16_clean.json`, `ceb15_clean.json`, `editions/16-2026.json`, `apply_phase0_v16.py`, `parse_final.py`, `build_ceb_data.py`, `verify_rows.py`, `README.md`.
**UMB μητρώο:** `docs/ai/umb-player-ids/data/umb-ids.json` (`generated_at 2026-10-05`, 4261 παίκτες — BOUCHAT `3635`/BE, GROOT `1845`/US), `data/player-scan.json`, `fix_players.py`, `README.md`.
**Snapshot GROOT:** `lier9.json` (root, tracked).
**Strapi/Admin (production):** `1-billiards-strapi/src/api/bt-player/**` (schema, custom controller/routes με merge), `2-billiards-strapi` — route `POST /bt-players/merge`; `2-billiardtoday-admin/src/app/api/admin/players/merge/route.ts`, `.../admin/commercial/bt-players/route.ts`, `src/configs/app.config.ts`.

**Νέα αρχεία που δημιουργήθηκαν (untracked, χωρίς commit):**
- `docs/ai/umb-player-ids/fix_production_players.py` (dry-run διορθώσεων production καρτελών)
- `docs/ai/ceb-ranking/apply_remove_players.py` (dry-run αφαίρεσης αθλητών, έτοιμο για έγκριση)
- `docs/ai/ceb-ranking/report-fixes-el.md` (αυτή η αναφορά)
