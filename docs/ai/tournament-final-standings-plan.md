# Τελική κατάταξη: email και σελίδα να δείχνουν το ίδιο πράγμα

*Σημείωση για μένα: αυτό είναι το επόμενο κομμάτι δουλειάς στις ειδοποιήσεις
τουρνουά. Το γράφω για να το συνεχίσω από άλλον υπολογιστή χωρίς να ξαναψάχνω
όσα βρήκα. Διαβάζεται μαζί με το `docs/ai/tournament-alerts.md` (πώς δουλεύει
συνολικά το σύστημα).*

Ημερομηνία: 11 Νοεμβρίου 2026. Κατάσταση: **δεν έχει ξεκινήσει**. Μέγεθος: ~3 ώρες,
με το ρίσκο στο Βήμα 1.

---

## 1. Το πρόβλημα

Το email «Final standings» δεν συμφωνεί με την καρτέλα «Final standings» της
σελίδας του τουρνουά. Δεν είναι μόνο τα νούμερα — είναι και η σειρά.

Παράδειγμα: Pulderbos 2026 (event id 542, slug `the-future-of-billiards-2026-pulderbos-2026`).

| Θέση | Σελίδα (επίσημη) | Email (σήμερα) |
|---|---|---|
| 1 | VAN ZELFDEN Joris — 15 MP, 243 καραμπόλες, 217 innings, AVG 1.119 | VAN ZELFDEN — MP 6, Avg 1.458 |
| 2 | SANTOS Gonçalo — 13 MP, 217, 244, AVG 0.889 | SANTOS — MP 4, Avg 1.071 |
| 3 | TSOKANTAS Georgios — 12 MP, 188, 226, AVG 0.831 | DAVID Noah — MP 2, Avg 1.304 |
| 4 | DAVID Noah — 10 MP, 187, 239, AVG 0.782 | ΤΣΟΚΑΝΤΑΣ — MP 2, Avg 0.833 |
| 5 | BOLLANSEE Toon — 8 MP, 159, 155, AVG 1.025 | FALANGAS — (κενά) |
| 6 | FALANGAS Christos — 14 MP, 193, 211, AVG 0.914 | IBRAIMOV — (κενά) |

## 2. Γιατί συμβαίνει

1. **Το email διαβάζει `bt_results.final_position` της τελευταίας φάσης.** Αυτό
   είναι η θέση μέσα στο bracket, όχι η επίσημη τελική κατάταξη. Στο Pulderbos το
   knockout δίνει 1-8, αλλά ο 3ος και ο 4ος (ημιτελικοί) είναι ισοπαλία βάθους.
2. **Η σελίδα χτίζει την κατάταξη από το bracket**: βάθος πορείας (`phaseScore`) και
   μετά tie-break σε καραμπόλες/innings. Γι' αυτό ο TSOKANTAS (188 καραμπόλες)
   βγαίνει 3ος μπροστά από τον DAVID (187).
3. **Η σελίδα αθροίζει ΟΛΕΣ τις φάσεις** για τα στατιστικά. Το `bt_results` κρατά
   γραμμή ανά φάση, άρα το email διαβάζει ένα κομμάτι και φαίνεται «λίγο».
4. Επιπλέον παγίδα που ήδη λύθηκε αλλά εξηγεί παλιά λάθη: το `final_position`
   γράφεται σε **κάθε** φάση ξεκινώντας από το 1 (QUAL 1-22, Ranking 9-22,
   Knockout 1-8). Επίπεδη ταξινόμηση ανακάτευε φάσεις.

## 3. Στόχος / κριτήρια αποδοχής

- Το email δείχνει τις **ίδιες θέσεις, με την ίδια σειρά και τα ίδια νούμερα** με
  την καρτέλα «Final standings» της σελίδας, για κάθε τελειωμένο event.
- Μία πηγή αλήθειας: η λογική υπολογισμού ζει σε **ένα** σημείο, όχι σε δύο.
- Χωρίς σπάσιμο: αν το endpoint αποτύχει, το email φεύγει με την τωρινή (fallback)
  λογική και το γράφει στο log — δεν χάνεται ειδοποίηση.
- Tests: ένα test που συγκρίνει το email με σταθερό δείγμα γραμμών από το endpoint.

## 4. Πλάνο

### Βήμα 1 — Βγάλε τον υπολογισμό από το component (60-90′)

Αρχείο: `src/app/tournaments/events/TournamentEventsContent.tsx` (~7.000 γραμμές).

Σημεία που μετράνε:
- `publishedFinalResults` (γύρω στη γραμμή 3975) — το memo που φτιάχνει τις γραμμές.
- `finalStandingsBracketStatsByPlayerKey` — τα στατιστικά bracket ανά παίκτη
  (totalMatchPoints, phaseScore). Είναι η καρδιά της σειράς.
- Η ταξινόμηση/θέση: `compareBracketRankedResults`, `compareNullableNumbersDesc`,
  `getFinalResultAverageValue`, `rankingFinalResultMatchKey` (γύρω στις 4160-4270).
- Ειδικές περιπτώσεις που ΔΕΝ πρέπει να χαλάσουν: Longoni U21 (`LONGONI_U21_*`),
  artistic events, five-pins, biathlon (`isBiathlonEvent`).

Ζητούμενο: ένα καθαρό module, π.χ. `src/lib/finalStandings.ts`, με συνάρτηση
`buildFinalStandings({ eventData, eventStages })` που επιστρέφει
`Array<{ position, playerName, matchPoints, caroms, innings, average, highRun, highRun2, bestAverage }>`.
Το component καλεί την ίδια συνάρτηση (καμία διπλή λογική).

**Πύλη απόφασης:** αν σε 45′ το memo δεν βγαίνει καθαρά (κρυφές εξαρτήσεις από
state/DOM), σταματάω και το ξανασυζητάμε — εναλλακτική είναι να υπολογίζει το
endpoint από τα bracket nodes απευθείας (άλλη δουλειά, ίδιο αποτέλεσμα).

### Βήμα 2 — Endpoint στο site (20-30′)

Νέο route: `src/app/api/tournament-final-standings/[documentId]/route.ts`
→ `{ ok: true, rows: [...] }`. Δημόσιο (είναι ήδη δημόσια δεδομένα), με
`Cache-Control: public, max-age=300`.

### Βήμα 3 — Strapi να το διαβάζει (30-40′)

Αρχείο: `D:\Projects\1-billiards-strapi\src\services\tournamentAlerts.ts`, στο
block της τελικής κατάταξης (σχόλιο «Η τελική κατάταξη ΔΕΝ ζει πάντα στο
`bt_results_final`»).

Σειρά προτεραιότητας:
1. `bt_results_final` (αν υπάρχει — καλύπτει τα events που τη δημοσιεύουν).
2. **Νέο:** `GET ${siteBaseUrl()}/api/tournament-final-standings/<event.documentId>`
   με timeout ~5s.
3. Fallback: η σημερινή λογική (μία γραμμή ανά θέση, φάση με το μεγαλύτερο `order`).

Το email δείχνει τότε: θέση, όνομα, `MP <matchPoints>`, `Avg <average>` — με το
υπάρχον υπόμνημα «MP = match points · Avg = average per inning».

### Βήμα 4 — Έλεγχος και deploy (45-60′)

- `npx tsx --test tests/tournamentAlerts.test.ts` και `npx tsc --noEmit` και στα δύο repos.
- Deploy: `bt-sync app` (Strapi) και `bt-sync frontend` (Next) στον 138.201.29.162.
- Καθάρισμα σφραγίσματος για νέο email:
  `UPDATE tournament_subscriptions SET final_sent_at = NULL WHERE id = 4;`
- Ανάκτηση του **πραγματικού** html από το Resend:
  `GET https://api.resend.com/emails/{id}` (Bearer `$RESEND_API_KEY` από το `.env`).
  Ταίριαξέ το με την εγγραφή μέσω του `unsubscribe_token`, ΟΧΙ με ώρα.
- Σύγκριση γραμμής-γραμμής με την καρτέλα `?panel=finals`.

## 5. Τεχνικά στοιχεία που θα χρειαστώ

| Τι | Πού |
|---|---|
| Server | `ssh -i D:/.ssh/billiard_admin_openssh.key root@138.201.29.162` |
| Live Strapi .env | `/var/www/vhosts/billiardtoday.com/app.billiardtoday.com/httpdocs/.env` |
| Logs cron | `/var/www/vhosts/billiardtoday.com/.pm2/logs/strapi-prod-out.log` |
| Βάση | `set -a && . ./.env && set +a` μετά `PGPASSWORD=$DATABASE_PASSWORD psql -U $DATABASE_USERNAME -d $DATABASE_NAME -h $DATABASE_HOST -p $DATABASE_PORT` |
| Event δείγμα | id 542, documentId `vyocu5hdyx3as17rlc9yaqot` |
| Στήλες `bt_results` | `points` = **καραμπόλες**, `match_points` = βαθμοί αγώνα (2/νίκη), `innings`, `best_average`, `high_run`, `high_run_2`, `final_position`, `stage_rank_override` |

## 6. Παγίδες που κόστισαν χρόνο

- **`final_position` ανά φάση** — βλ. §2.4.
- **`bt_results.points` ≠ βαθμοί κατάταξης**· είναι καραμπόλες. Γι' αυτό δεν
  εμφανίζεται σκέτο στο email.
- **Redirect που πετάει το query**: το παλιό slug `...-pulderbos-mw0r7dtl` κάνει
  308 στο canonical και **έχανε** το `?panel=finals`. Διορθώθηκε (commit `cb7b28b`),
  μην το ξανασπάσεις.
- **Τρία `.env` της Strapi** (`/srv/git/.../strapi/.env`, live httpdocs, `/root/bt-app.env`)
  — τα VAPID χάνονταν σε κάθε deploy.
- **Ρολόι server ~4′ μπροστά** από τα `created_at` του Resend → μη ταιριάζεις
  emails με ώρα.
- **iOS push**: μόνο όταν το site είναι στην αρχική οθόνη. Η εγγραφή χωρίς endpoint
  (π.χ. id 5, `tremoulis@me.com`) είναι σωστή συμπεριφορά, όχι bug.

## 7. Τι έχει ήδη γίνει (μην το ξανακάνεις)

| Commit | Τι |
|---|---|
| Strapi `66ffd45` | μία γραμμή ανά θέση (φάση με το μεγαλύτερο order) + MP/Avg αντί καραμπολών |
| Strapi `cd6a6ca` | deep links: final → `?panel=finals`, υπόλοιπα → `?panel=timetable` |
| Frontend `a880b31` | `?panel=` στην `TournamentDetailPage` |
| Frontend `cb7b28b` | το redirect slug κρατά το query string |
| Frontend `443c41b` | αυτό το doc + το `tournament-alerts.md` |

Όλα είναι deployed και ζωντανά.

## 8. Ανοιχτά που δεν είναι αυτό το θέμα

1. **Push στο iPhone** — περιμένει από τον χρήστη: Κοινοποίηση → Προσθήκη στην
   αρχική οθόνη → άνοιγμα από το εικονίδιο → 🔔. Χωρίς αυτό δεν υπάρχει endpoint.
2. **Ερώτηση χρήστη**: «δεν θα έπρεπε να κάνει την ενημέρωση πριν πατήσει Get
   alerts?» — δεν έχει διευκρινίσει αν εννοεί (α) άδεια/εγγραφή push νωρίτερα,
   (β) φρέσκα δεδομένα πριν προσφερθούν ειδοποιήσεις.
