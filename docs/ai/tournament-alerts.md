# Ειδοποιήσεις διοργάνωσης — «Follow this tournament»

Τελευταία ενημέρωση: 11/11/2026.

Η λειτουργία επιτρέπει σε έναν επισκέπτη να ακολουθήσει **ΜΙΑ διοργάνωση** (ποτέ «όλο το site») και
να παίρνει ειδοποιήσεις με email (και προαιρετικά Web Push) όταν συμβαίνει κάτι σε αυτήν. Είναι
**LIVE** στην παραγωγή: κουμπί 🔔 στο hero της σελίδας διοργάνωσης → φόρμα → email επιβεβαίωσης
(double opt-in) → cron της Strapi κάθε 5 λεπτά που αποφασίζει τι στέλνεται.

Δύο αρχές που δεν παραβιάζονται:

1. **Double opt-in.** Χωρίς κλικ στον σύνδεσμο επιβεβαίωσης δεν στέλνεται καμία ειδοποίηση. Είναι ο
   λόγος που δεν θεωρείται spam.
2. **Per-tournament unsubscribe.** Κάθε εγγραφή κρατά δικό της token· η διαγραφή αφορά μόνο αυτό το
   τουρνουά, ποτέ τον λογαριασμό ή τα υπόλοιπα.

---

## 1. Αρχιτεκτονική & ροή δεδομένων

```
Επισκέπτης (billiardtoday.com/tournaments/<slug>)
   │  🔔 κουμπί στο hero → φόρμα
   ▼
POST /api/tournament-follow            (Next.js route, D:\Projects\4-billiardtoday-frontend)
   │  proxy → Strapi
   ▼
POST /api/tournament-subscriptions/subscribe      (Strapi: 1-billiards-strapi)
   │  • επικύρωση email/events/player
   │  • upsert εγγραφής (status = "pending") + tokens
   │  • email επιβεβαίωσης μέσω Resend
   ▼
Email: «Confirm your alerts» → /tournament-alerts/confirm?t=<confirmToken>
   │  GET /api/tournament-subscriptions/confirm?t=…   → status = "confirmed"
   ▼
Strapi cron «tournamentAlerts» (κάθε 5′) → runTournamentAlerts(strapi)
   │  για κάθε confirmed εγγραφή αποφασίζει ΤΙ είναι ώριμο να σταλεί
   ├─ email μέσω Resend (utils/resend.ts + utils/emailShell.ts)
   └─ Web Push μέσω VAPID (web-push)  →  public/sw.js → ειδοποίηση συσκευής
```

- **Ποιος αποφασίζει τι στέλνεται:** το `src/services/tournamentAlerts.ts` (Strapi). Η frontend δεν
  αποφασίζει τίποτα — μόνο συλλέγει την εγγραφή.
- **Πού ζει η κατάσταση:** πίνακας `tournament_subscriptions` (content type
  `api::tournament-subscription.tournament-subscription`, `draftAndPublish: false`).
- **Κάθε πέρασμα γράφει πίσω «σφραγίσματα»** πάνω στην ίδια την εγγραφή, ώστε το cron των 5 λεπτών να
  μη ξαναστέλνει. Χωρίς αυτά, κάθε πέρασμα = spam.

---

## 2. Ποιο αρχείο κάνει τι

### Frontend (`D:\Projects\4-billiardtoday-frontend`)

| Αρχείο | Ρόλος |
|---|---|
| `src/components/tournaments/TournamentFollowButton.tsx` | Το κουμπί 🔔 + η φόρμα (πορτάλ, mobile sheet). **ΤΕΛΕΥΤΑΙΟ** στη σειρά `heroMenuRow` του `TournamentDetailPage` (γραμμή ~7714), ώστε η σειρά των υπόλοιπων κουμπιών να μη μετακινηθεί. Διαχειρίζεται email, επιλογή αθλητή («I'm playing in this tournament»), τα 4 είδη, και το checkbox push. |
| `src/lib/webPush.ts` | Web Push: `pushSupported()`, `isIosDevice()`, `isStandalone()`, `iosPushHint()`, `enablePushAlerts()`, `disablePushAlerts()`. |
| `src/app/api/tournament-follow/route.ts` | `POST` — επικυρώνει την είσοδο και κάνει proxy στο Strapi `subscribe`. |
| `src/app/api/tournament-follow/participants/route.ts` | `GET` — ελαφρύς κατάλογος συμμετεχόντων (μόνο ονόματα) για το «παίζω εδώ». Φορτώνει **μόνο** όταν ο χρήστης τσεκάρει το κουτί. `revalidate = 300`. |
| `src/app/tournament-alerts/confirm/page.tsx` | Server component — σελίδα επιβεβαίωσης (από το email). `robots: noindex`. |
| `src/app/tournament-alerts/unsubscribe/page.tsx` | Server component — σελίδα διαγραφής (από κάθε email). `robots: noindex`. |
| `public/sw.js` | Service worker: μόνο `install`/`activate`/`push`/`notificationclick`. **Χωρίς cache/offline** — ένα λάθος cache εδώ θα κόλλαγε παλιές σελίδες σε όλο το site. |
| `src/app/manifest.ts` | Web app manifest — απαραίτητο για push και για «Add to Home Screen» στο iPhone. |

### Strapi (`D:\Projects\1-billiards-strapi`)

| Αρχείο | Ρόλος |
|---|---|
| `src/api/tournament-subscription/content-types/tournament-subscription/schema.json` | Το σχήμα. Πεδία: `email`, `events` (json), `status` (pending/confirmed/unsubscribed), `confirmToken`/`confirmExpiresAt`, `unsubscribeToken`, `drawSentAt`/`finalSentAt`/`lastRecapDate`/`lastNextMatchKey`, `pushEnabled`/`pushEndpoint`/`pushP256dh`/`pushAuth`/`pushLastError`, σχέσεις `event`/`tournament`/`player`. |
| `src/api/tournament-subscription/controllers/tournament-subscription.ts` | `subscribe` / `confirm` / `unsubscribe`. Στέλνει το email επιβεβαίωσης. |
| `src/api/tournament-subscription/routes/tournament-subscription.ts` | Τα 3 routes, **`auth: false`** (δημόσια, καλούνται από το site/email). |
| `src/api/tournament-subscription/services/tournament-subscription.ts` | Core service (stub). |
| `src/services/tournamentAlerts.ts` | **Η καρδιά.** `runTournamentAlerts(strapi, { now })` — αποφασίζει τι στέλνεται ανά εγγραφή. Δέχεται σταθερή `now` για έλεγχο χωρίς αναμονή. |
| `config/cron-tasks.ts` | Cron `tournamentAlerts` → `dispatchTournamentAlerts`. Rule: `TOURNAMENT_ALERTS_CRON` ή `*/5 * * * *`. Αν `TOURNAMENT_ALERTS_ENABLED === "0"` δεν τρέχει καθόλου. |
| `src/utils/resend.ts` | `sendResendEmail` — αποστολή μέσω Resend API. |
| `src/utils/emailShell.ts` | `buildEmail`, `buildResultRows`, `escapeHtml` — το κοινό «κέλυφος» των email (ίδια εμφάνιση με τα υπόλοιπα transactional email). |
| `tests/tournamentAlerts.test.ts` | 6 tests — αποδεικνύουν μία αποστολή ανά είδος, κανένα διπλό στο δεύτερο πέρασμα, και τη σύνοψη μετά τις 21:00. |

---

## 3. Τα 4 είδη ειδοποίησης και πότε στέλνονται

Κάθε εγγραφή δηλώνει ποια είδη θέλει (πεδίο `events`, json array). Προεπιλογή στη φόρμα:
`draw`, `daily`, `final`. Το `nextMatch` μπαίνει μόνο όταν ο χρήστης δηλώσει αθλητή.

| Είδος | Κλειδί | Πότε στέλνεται | «Σφράγισμα» |
|---|---|---|---|
| Κλήρωση / πρόγραμμα | `draw` | Μία φορά, όταν υπάρχει πρόγραμμα με ώρες: τουλάχιστον ένα `bt_event_timetable_slot` με `date_time`, `is_visible=true`, `slot_type=match`. | `drawSentAt` |
| Σύνοψη ημέρας | `daily` | Μία φορά ανά ημερομηνία, **μόνο μετά τις 21:00 ώρα Αθήνας** (`hour >= 21`), και μόνο αν υπάρχει κάτι: αγώνες που παίχτηκαν σήμερα **ή** αγώνες για αύριο (εντός 36 ωρών). | `lastRecapDate` (μορφή `YYYY-MM-DD`) |
| Τελική κατάταξη | `final` | Μία φορά, όταν βγει τελική κατάταξη (βλ. §6 για την πηγή). | `finalSentAt` |
| Ο επόμενος αγώνας μου | `nextMatch` | Όταν ο αγώνας του δηλωμένου αθλητή είναι **5–50 λεπτά** μπροστά (`NEXT_MATCH_MIN_LEAD_MIN=5`, `NEXT_MATCH_WINDOW_MIN=50`) — στην πράξη «~45′ πριν». Απαιτεί `player` στην εγγραφή **και** πρόγραμμα. | `lastNextMatchKey` (= slot id) |

Λεπτομέρειες:

- **`draw`** — παίρνει το πρώτο slot με `date_time` και γράφει «First match: <ημέρα> at <ώρα>».
  Χωρίς πρόγραμμα η ειδοποίηση **δεν στέλνεται** (ποτέ δεν εφευρίσκω ώρα/τραπέζι).
- **`daily`** — «τι έγινε σήμερα» (έως 10 γραμμές) + «Tomorrow: N matches …». Αν δεν παίχτηκε
  τίποτα και δεν υπάρχει πρόγραμμα για αύριο, το email **δεν** φεύγει, αλλά το `lastRecapDate`
  γράφεται ούτως ή άλλως (ώστε να μη ξαναδοκιμάσει το ίδιο βράδυ).
- **`final`** — βλ. §6. Δύο πηγές: `bt_results_final` (κανονική) και `bt_results.final_position`
  (εναλλακτική, μόνο για **τελειωμένο** event).
- **`nextMatch`** — ταιριάζει `match.player1.id` ή `player2.id` με τον δηλωμένο αθλητή. Αγώνας που
  έχει ήδη σκορ (`player1_points`/`player2_points` μη null) ή slot `cancelled`/`completed` δεν
  μετράει. Γράφει ώρα + `table_label` (αν υπάρχει).

Όριο: **`MAX_EMAILS_PER_RUN = 300`** email ανά πέρασμα.

### Deep links: κάθε είδος ανοίγει τη σελίδα στη σωστή καρτέλα

Κάθε email/push κουβαλά `?panel=` ώστε ο χρήστης να μη ψάχνει πού να πατήσει. Το frontend
(`TournamentDetailPage.tsx`) το διαβάζει **μία φορά μετά το hydration** και ενεργοποιεί την καρτέλα.

| Είδος | `?panel=` | Τι βλέπει ο χρήστης |
|---|---|---|
| `final` | `?panel=finals` | Η καρτέλα «Final standings» με την τελική κατάταξη |
| `draw` | `?panel=timetable` | Το πρόγραμμα (Time Table) |
| `daily` | `?panel=timetable` | Το πρόγραμμα, για τα ματς που αναφέρει η σύνοψη |
| `nextMatch` | `?panel=timetable` | Το πρόγραμμα, στο τραπέζι/ώρα του αγώνα |

Δεκτές τιμές: `finals`, `timetable`, `stages`, `participants`, `info`, `gallery`. Άγνωστη τιμή =
αγνοείται σιωπηλά και μένει η προεπιλεγμένη καρτέλα. Ο σύνδεσμος χρησιμοποιεί το `tournament.slug`
της Strapi (π.χ. `…-pulderbos-mw0r7dtl`), που κάνει 308 στο canonical slug του frontend — δουλεύει, μη
το «διορθώσεις».

---

## 4. Μεταβλητές περιβάλλοντος

### Strapi (`1-billiards-strapi`)

| Μεταβλητή | Τι κάνει | Αν λείπει |
|---|---|---|
| `VAPID_PUBLIC_KEY` | Δημόσιο κλειδί Web Push. | **Push δεν στέλνεται** (ο dispatcher γράφει `VAPID keys missing — push skipped`), το email δουλεύει κανονικά. |
| `VAPID_PRIVATE_KEY` | Ιδιωτικό κλειδί Web Push. | Ίδιο με πάνω. |
| `VAPID_SUBJECT` | Subject του VAPID (π.χ. `mailto:info@…`). | Fallback `mailto:info@billiardtoday.com`. |
| `RESEND_API_KEY` | Κλειδί αποστολής email. | Το `sendResendEmail` πετά `RESEND_API_KEY is not configured` → κάθε αποστολή αποτυγχάνει. |
| `PUBLIC_SITE_URL` | Βάση για τους συνδέσμους στα email (confirm/unsubscribe/tournament). | Fallback `SITE_URL`, μετά `https://billiardtoday.com`. |
| `EMAIL_FROM` | Από-διεύθυνση. | Fallback `Billiard Today <contact@mail.billiardtoday.com>`. |
| `EMAIL_REPLY_TO` | Reply-To. | Fallback `info@billiardtoday.com`. |
| `TOURNAMENT_ALERTS_ENABLED` | Αν είναι `"0"` ο cron **δεν** τρέχει καθόλου. | Οτιδήποτε άλλο (ή κενό) = ενεργό. |
| `TOURNAMENT_ALERTS_CRON` | Ωράριο cron. | `*/5 * * * *`. |

### Frontend (`4-billiardtoday-frontend`)

| Μεταβλητή | Τι κάνει | Αν λείπει |
|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | **Build-time**. Χωρίς αυτό το checkbox push δεν εμφανίζεται καθόλου. | Το push κουτί κρύβεται· μόνο email. |
| `NEXT_PUBLIC_SITE_URL` | Public URL. | — |
| `RESEND_API_KEY` | Χρησιμοποιείται από άλλα transactional email του site. | — |

### ⚠️ Παγίδα: το deploy αντικαθιστά το `.env` της Strapi

Το `.env` της Strapi ζει σε **τρία** σημεία και το `bt-sync app` κάνει rsync:

1. `/srv/git/billiardtoday/strapi/.env` — **η πηγή που κερδίζει στο deploy**.
2. `/var/www/vhosts/billiardtoday.com/app.billiardtoday.com/httpdocs/.env` — το live.
3. `/root/bt-app.env` — fallback (αντιγράφεται μόνο αν λείπει το `.env`).

**Κάθε νέο κλειδί (π.χ. VAPID) πρέπει να μπει ΚΑΙ στα τρία.** Αλλιώς ένα επόμενο deploy φέρνει πίσω
την παλιά έκδοση και το push σταματά. Μετά την αλλαγή χρειάζεται **restart του `strapi-prod`** — η
διεργασία διαβάζει το `.env` στο startup, όχι σε κάθε κλήση.

---

## 5. Πώς το δοκιμάζω βήμα-βήμα

### Α) Τοπικά, χωρίς καμία αποστολή (τα tests)

```bash
cd D:\Projects\1-billiards-strapi
npx tsx --test tests/tournamentAlerts.test.ts      # 6 tests, όλα ok
```

Τα tests περνούν σταθερή `now` και stub-άρουν το Resend (`globalThis.fetch`), οπότε αποδεικνύουν τη
λογική απόφασης χωρίς να φύγει ούτε ένα email. Ελέγχουν: μία αποστολή ανά είδος, **κανένα** διπλό
στο δεύτερο πέρασμα, το παράθυρο του `nextMatch`, τη σύνοψη μετά τις 21:00, την τελική κατάταξη από
`bt_results` (Pulderbos) και την **απουσία** «Final standings» σε ζωντανό τουρνουά.

### Β) Typecheck (και τα δύο repos)

```bash
cd D:\Projects\1-billiards-strapi && npx tsc --noEmit
cd D:\Projects\4-billiardtoday-frontend && npx tsc --noEmit
```

Μετά από αλλαγή content type το typegen θέλει dummy env:

```bash
cd D:\Projects\1-billiards-strapi
APP_KEYS=k1,k2 API_TOKEN_SALT=s ADMIN_JWT_SECRET=s TRANSFER_TOKEN_SALT=s JWT_SECRET=s ENCRYPTION_KEY=s DATABASE_CLIENT=sqlite npx strapi ts:generate-types
```

### Γ) Πραγματική εγγραφή (στην παραγωγή, read-only εκτός από την ίδια την εγγραφή)

1. Άνοιξε τη σελίδα μιας διοργάνωσης με πρόγραμμα και πάτα 🔔.
2. Βάλε email, διάλεξε είδη, πάτα «Get alerts».
3. Στο inbox πάτα «Confirm alerts». Θα προσγειωθείς στο `/tournament-alerts/confirm?t=…` και θα δεις
   «Alerts are on».
4. Ο cron θα στείλει το πρώτο ώριμο είδος στο επόμενο πέρασμα των 5 λεπτών.

### Δ) Έλεγχος της αποστολής (χωρίς να στείλεις τίποτα)

```bash
# Λίστα των τελευταίων email που έστειλε το Resend
ssh -i D:/.ssh/billiard_admin_openssh.key root@138.201.29.162 \
  'set -a && . /var/www/vhosts/billiardtoday.com/app.billiardtoday.com/httpdocs/.env && set +a && \
   curl -s -H "Authorization: Bearer $RESEND_API_KEY" "https://api.resend.com/emails?limit=20"'
```

`last_event: delivered` = στάλθηκε. Τα timestamps είναι UTC.

```bash
# Οι γραμμές του cron (μόνο όταν sent>0 ή failed>0)
ssh -i D:/.ssh/billiard_admin_openssh.key root@138.201.29.162 \
  "grep -a '\[tournament-alerts\]' /var/www/vhosts/billiardtoday.com/.pm2/logs/strapi-prod-out.log | tail -30"
```

```bash
# Κατάσταση εγγραφών (read-only)
ssh -i D:/.ssh/billiard_admin_openssh.key root@138.201.29.162 \
  'cd /var/www/vhosts/billiardtoday.com/app.billiardtoday.com/httpdocs && set -a && . ./.env && set +a && \
   PGPASSWORD=$DATABASE_PASSWORD psql -U $DATABASE_USERNAME -d $DATABASE_NAME -h $DATABASE_HOST -p $DATABASE_PORT \
   -c "SELECT id, email, status, events, draw_sent_at, final_sent_at, last_recap_date, last_next_match_key, push_enabled FROM tournament_subscriptions ORDER BY id;"'
```

### Ε) Έλεγχος push

Το checkbox «Also notify this device» εμφανίζεται μόνο όταν υπάρχει `PushManager` **και**
`NEXT_PUBLIC_VAPID_PUBLIC_KEY` στο build. Στο headless Edge χρειάζεται `--enable-automation` +
`Browser.grantPermissions` (ΟΧΙ `Browser.setPermission` — αφήνει την άδεια σε `default`) και **φρέσκο**
`--user-data-dir` σε κάθε απόπειρα (αλλιώς μένει αποθηκευμένο «denied» για το origin).

---

## 6. Τελική κατάταξη: από πού βγαίνει (και γιατί μόνο σε τελειωμένο event)

Το `final` χρησιμοποιεί **δύο** πηγές, με σειρά:

1. **`bt_results_final`** (κανονική πηγή): γραμμές με `position > 0`. Στέλνεται όταν υπάρχουν.
2. **`bt_results` με `final_position > 0`** (εναλλακτική): τη χρησιμοποιώ **μόνο όταν το event έχει
   τελειώσει** — δηλαδή `event.end_date` (ή `endDate`) < σημερινή ημερομηνία Αθήνας.
   Γιατί: το `final_position` το γράφει ο υπολογιστής βαθμολογίας σε **κάθε** φάση, άρα υπάρχει και σε
   ζωντανό τουρνουά. Χωρίς τον έλεγχο ημερομηνίας θα έστελνα «τελική κατάταξη» ενώ ακόμη παίζεται.

Παράδειγμα που το επέβαλε: το **Pulderbos** έχει 44 θέσεις στο `bt_results` (`final_position`) με
`final_standings_published = false` και **μηδέν** γραμμές στο `bt_results_final`. Η «Master League»
αντίθετα είναι ζωντανή (`end_date` στο μέλλον) → σωστά **δεν** στέλνει.

Το `hasFinal` = `final_standings_published` **ή** γραμμές `bt_results_final` **ή** (τελειωμένο event
**και** γραμμές `bt_results`). Η ειδοποίηση δείχνει τις 5 πρώτες θέσεις.

### Παγίδα: το `final_position` γράφεται σε ΚΑΘΕ φάση — κρατάω μία γραμμή ανά θέση

Ο υπολογισμός βαθμολογίας ξαναγράφει `final_position` ξεκινώντας **από το 1 σε κάθε φάση**. Το Pulderbos
το δείχνει καθαρά: QUAL έχει θέσεις 1–22, το Ranking 9–22, το Knockout 1–8 — δηλαδή 44 γραμμές με
`final_position > 0` για 22 αθλητές, και η θέση «1» υπάρχει **τρεις** φορές. Αν διαλέξω απλώς
`ORDER BY final_position LIMIT 5`, παίρνω τυχαίους αθλητές από διαφορετικές φάσεις.

Κανόνας: **μία γραμμή ανά θέση, από τη φάση με το μεγαλύτερο `order`** (την τελευταία/κρίσιμη φάση —
στο Pulderbos το Knockout, `order = 3`). Ταξινομώ τις φάσεις κατά `order` φθίνουσα, κρατώ την πρώτη που
έχει γραμμές και από αυτήν παίρνω τις θέσεις 1…N.

### Τι δείχνει η κάθε γραμμή: `MP` και `Avg`, όχι σκέτες καραμπόλες

Δύο διαφορετικά πεδία στο `bt_results` που μπερδεύονται εύκολα:

| Πεδίο | Τι είναι | Παράδειγμα (Pulderbos, νικητής) |
|---|---|---|
| `bt_results.points` | **Καραμπόλες** (συνολικές μπάλες του αθλητή στη φάση) | `95` |
| `bt_results.match_points` | **Βαθμοί αγώνα**, `2` ανά νίκη (`1`/`1` σε ισοπαλία) | `6` (= 3 νίκες × 2) |
| `bt_results.average` (ή innings/caroms) | Μέσος όρος ανά επίθεση | `1.458` |

Το email δείχνει **`MP 6` + `Avg 1.458`** και **όχι** `95`: το `points` είναι ακατανόητο εκτός
συμφραζομένου (95 τι; από 300;), ενώ το MP λέει αμέσως «πόσους αγώνες κέρδισε» και το Avg «πόσο
αποδοτικά έπαιξε». Το υπόμνημα του email το κλειδώνει: «MP = match points (2 per win) · Avg = average
per inning.» — μην το αφαιρέσεις, χωρίς αυτό το `MP` είναι αίνιγμα.

Αληθινό δείγμα (Pulderbos, τελικό email): `1. VAN ZELFDEN Joris MP 6 Avg 1.458`, `2. SANTOS Gonçalo
MP 4 Avg 1.071`, `3. DAVID Noah MP 2 Avg 1.304`, `4. ΤΣΟΚΑΝΤΑΣ Γεώργιος MP 2 Avg 0.833`, `5. FALANGAS
Christos` (χωρίς MP/Avg — ο 5ος δεν έχει γραμμή στην τελευταία φάση, βγαίνει μόνο με το όνομα).

Προσοχή: η **δημόσια σελίδα** (`?panel=finals`) δείχνει δικό της, πλουσιότερο πίνακα (Match Pts /
Caroms / Innings / AVG / 1st H.R. / Best AVG) και **αθροίζει σε όλες τις φάσεις** — γι' αυτό εκεί ο
νικητής έχει Match Pts `15` ενώ το email γράφει `MP 6`. Δεν είναι σφάλμα του email· είναι άλλο
ερώτημα (σύνολο τουρνουά vs τελευταία φάση).

---

## 7. Πώς το σβήνω

### Επίπεδο 1 — «παγώνω» τις αποστολές (αναστρέψιμο, χωρίς deploy)

```bash
# Σε ΟΛΑ τα .env της Strapi (τα τρία σημεία)
# Πρόσθεσε:
TOURNAMENT_ALERTS_ENABLED=0
# και restart:
su -s /bin/bash billiardtoday_srv -c 'PM2_HOME=/var/www/vhosts/billiardtoday.com/.pm2 pm2 restart strapi-prod'
```

Έτσι ο cron δεν τρέχει καθόλου. Οι εγγραφές μένουν άθικτες και οι σελίδες confirm/unsubscribe
δουλεύουν — μόνο δεν φεύγει τίποτα. Αυτό θέλει το `.env` σε **τρία** σημεία (βλ. §4), αλλιώς το
επόμενο deploy το επαναφέρει.

### Επίπεδο 2 — απόκρυψη του κουμπιού (frontend, θέλει deploy)

Αφαίρεσε το `<TournamentFollowButton … />` από το `heroMenuRow` του `TournamentDetailPage`
(γραμμή ~7714) και κάνε `bt-sync frontend`. Οι υπόλοιπες σελίδες/route μένουν και δεν πειράζουν τίποτα.

### Επίπεδο 3 — πλήρης αφαίρεση (κώδικας)

Σειρά που δουλεύει:

1. Frontend: σβήσε `TournamentFollowButton.tsx`, `webPush.ts`, `src/app/api/tournament-follow/`,
   `src/app/tournament-alerts/`, `public/sw.js`, `src/app/manifest.ts` και το import/χρήση στο
   `TournamentDetailPage`.
2. Strapi: σβήσε τον φάκελο `src/api/tournament-subscription/`, το cron block `tournamentAlerts`
   από το `config/cron-tasks.ts`, το `src/services/tournamentAlerts.ts` και το test.
3. Αν θέλεις να φύγει και το περιεχόμενο: `DELETE FROM tournament_subscriptions;` — **πρόσεξε** τις
   εγγραφές του χρήστη (βλ. §8).

---

## 8. Περιορισμοί & παγίδες

- **iPhone θέλει «Add to Home Screen».** Το Safari στο iOS **δεν** έχει Push API μέσα στη σελίδα·
  μόνο όταν το site έχει προστεθεί στην αρχική οθόνη (iOS 16.4+). Γι' αυτό, όταν ο χρήστης είναι σε
  iOS χωρίς εγκατάσταση, το push κουτί **δεν** κρύβεται σιωπηλά — εμφανίζεται μήνυμα
  (`iosPushHint() === "needs-install"`) που του λέει: Share → Add to Home Screen → άνοιξέ το από το
  νέο εικονίδιο. Σε παλιότερο iOS λέει «θέλει iOS 16.4+». Το email δουλεύει σε όλα.
- **Events χωρίς πρόγραμμα δεν στέλνουν `draw` ούτε `nextMatch`.** Και τα δύο απαιτούν
  `bt_event_timetable_slots` με `date_time`. Παράδειγμα: «Master League» έχει 0 slots → σιωπή.
  Πριν πεις «χάλασε», μέτρα slots/matches του event. **Ποτέ μην εφεύρεις ώρα/τραπέζι.**
- **Τελική κατάταξη μόνο όταν το event έχει τελειώσει** (για την πηγή `bt_results.final_position`).
  Ζωντανό event με `final_position` γεμάτο δεν στέλνει «Final standings» — βλ. §6.
- **Το deploy αντικαθιστά το `.env` της Strapi.** Κάθε κλειδί και στα τρία αρχεία (βλ. §4).
  Στο log φαίνεται ως `VAPID keys missing — push skipped` — αν το δεις, έλεγξε τα τρία `.env` **και**
  ότι έγινε restart μετά την προσθήκη.
- **Re-subscribe.** Αν ένας χρήστης ξαναϋποβάλει τη φόρμα, η εγγραφή ξαναγράφεται. Για **confirmed**
  εγγραφή η Strapi απαντά `already_confirmed` και **δεν** την πειράζει. Αν είναι ακόμη `pending`,
  ξαναγράφεται (νέα tokens, μηδενισμένα σφραγίσματα) — φυσιολογικό.
- **`nextMatch` χωρίς αθλητή** δεν αποθηκεύεται καθόλου: το route και ο controller το απορρίπτουν
  (`NEXT_MATCH_NEEDS_PLAYER`).
- **Ο σύνδεσμος του email** δουλεύει και με το `tournament.slug` της Strapi (κάνει 308 στο κανονικό
  slug) και με το `bt-event documentId`. Μη αντιγράφεις χειροκίνητα το canonical slug του frontend
  (`buildTournamentSlug`) στη Strapi — δεν ταυτίζονται.

### Εγγραφές του χρήστη στην παραγωγή (ΜΗΝ τις σβήσεις/αλλάξεις)

Στις 11/11/2026 υπάρχουν 2 εγγραφές για `makpapad@gmail.com`, και οι δύο `confirmed`:

| id | Event | events | Σφραγίσματα | push |
|---|---|---|---|---|
| 2 | Master League - 1ο Τουρνουά 2026-2027 (0 slots) | draw, daily, final | κανένα (σωστή σιωπή) | όχι |
| 4 | The future of Billiards 2026 - Pulderbos (84 slots) | draw, daily, final, nextMatch | draw 14:35, final 16:00 | ναι |

Είναι δοκιμαστικές εγγραφές του χρήστη — μένουν ως έχουν.

---

## 9. Απόδειξη ότι δουλεύει

- **Tests:** `npx tsx --test tests/tournamentAlerts.test.ts` → `# pass 6 / # fail 0`.
- **Typecheck:** `npx tsc --noEmit` σε frontend και Strapi → exit 0.
- **Log:** `[tournament-alerts] sent=… skipped=… failed=…` (γράφεται μόνο όταν `sent>0` ή `failed>0`).
- **Email:** Resend `emails?limit=20` → `last_event: delivered`.
- **Το ΠΡΑΓΜΑΤΙΚΟ περιεχόμενο του email** (όχι μόνο «στάλθηκε»): το `GET /emails` δίνει μόνο metadata —
  το `GET https://api.resend.com/emails/{id}` επιστρέφει **`html` και `text`**. Έτσι ελέγχω τι βλέπει ο
  παραλήπτης:

```bash
ssh -i D:/.ssh/billiard_admin_openssh.key root@138.201.29.162 \
  'cd /var/www/vhosts/billiardtoday.com/app.billiardtoday.com/httpdocs && set -a && . ./.env && set +a && \
   curl -s -H "Authorization: Bearer $RESEND_API_KEY" "https://api.resend.com/emails/<ID>" \
   | python3 -c "import json,sys;d=json.load(sys.stdin);print(d[\"subject\"]);print(d[\"text\"])"'
```

  Για να είμαι σίγουρος **ποιας εγγραφής** είναι το email, ταιριάζω το `unsubscribe` token του `text` με
  το `tournament_subscriptions.unsubscribe_token` (μοναδικό ανά εγγραφή). Οι ώρες του Resend είναι UTC,
  του server Αθήνα (+2) — μη μπερδευτείς με 2ωρη/μικρή διαφορά στα λεπτά.
- **Push:** η συνδρομή επιστρέφει πραγματικό endpoint (π.χ. `wns2-*.notify.windows.com` στο Windows).
- **Η καρτέλα του deep link** (frontend): headless Edge + CDP, `?panel=finals` → το κουμπί
  `button[aria-label="Final standings"]` πρέπει να έχει **ακριβώς** το class `bg-white` (τα υπόλοιπα
  έχουν `bg-white/10` — το `includes("bg-white")` δίνει ψευδώς true, έλεγξε tokens) και ο πίνακας να
  περιέχει «VAN ZELFDEN».
