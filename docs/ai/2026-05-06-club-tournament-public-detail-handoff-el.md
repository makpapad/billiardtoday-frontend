# Club Tournament Public Results Handoff

Ημερομηνία: 2026-05-06

Τελευταία διόρθωση: 2026-05-08

Αυτό το document αντικαθιστά την προηγούμενη λανθασμένη κατεύθυνση για ξεχωριστό public detail renderer των club-local tournaments.

## Διορθωμένη απόφαση

Τα αποτελέσματα των club tournaments πρέπει να δημοσιεύονται με τον ίδιο τρόπο που δημοσιεύονται τα επίσημα tournaments.

Δεν θέλουμε δεύτερο public results model.

Σωστή κατεύθυνση:

- το public frontend διαβάζει published tournament results από `bt-events`
- τα official tournaments και τα club-published tournaments ανοίγουν από την ίδια public detail route
- τα groups, matches, standings και results εμφανίζονται από το ίδιο data shape
- το club-local JSON runtime δεν είναι public results source
- το club-local JSON runtime μπορεί να μείνει μόνο σαν προσωρινό draft/manage state μέχρι να παραχθεί κανονικό event structure

## Τι ήταν λάθος στο προηγούμενο handoff

Το προηγούμενο document πρότεινε:

- public support για δύο data sources:
  - `bt_event`
  - `club_tournament`
- νέο public detail endpoint για `club_tournament`
- renderer που θα διάβαζε `tournaments.format_definition.clubRuntime`

Αυτό δεν είναι σωστό για παραγωγή.

Αν το public site αρχίσει να δημοσιεύει αποτελέσματα από JSON μέσα στο `tournaments.format_definition`, τότε:

- θα έχουμε δύο διαφορετικούς τρόπους δημοσίευσης αποτελεσμάτων
- τα club tournaments δεν θα έχουν ίδια συμπεριφορά με τα official tournaments
- θα δυσκολέψουν τα live results, τα standings, τα brackets, το SEO και τα player statistics
- θα χρειαστεί αργότερα ακριβό refactor

## Κανόνας δημοσίευσης

Ένα club tournament εμφανίζεται δημόσια ως αναλυτικό tournament μόνο όταν έχει κανονικό `bt_event`.

Το public club tournaments section πρέπει να δείχνει μόνο rows που έρχονται από:

```text
bt_events
```

με relation:

```text
bt_events.tournament.club
```

Δεν πρέπει να εμφανίζει ως public result page τα `tournaments` που δεν έχουν `bt_event`.

## Ρόλος του `tournaments`

Ο πίνακας `tournaments` παραμένει το parent record.

Για club tournaments:

```text
tournaments.organizer_type = "club"
tournaments.club = relation προς clubs
tournaments.bt_event = relation προς bt_events όταν το tournament δημοσιευτεί/παραχθεί
```

Το `format_definition` μπορεί να χρησιμοποιείται για:

- wizard setup
- draft επιλογές διοργάνωσης
- προσωρινό club manage/runtime state
- backward compatibility για τα πρώτα test tournaments

Δεν πρέπει να είναι το τελικό public results store.

## Σωστό public club tournaments section

Στο public club page:

```text
/clubs/{clubSlug}
```

το section `Club tournaments` πρέπει να φορτώνει μόνο tournaments που έχουν published event data.

Η σωστή πηγή είναι:

```text
GET /api/tournaments?clubSlug={clubSlug}
```

και αυτό το endpoint πρέπει να επιστρέφει μόνο normalized `bt_event` rows για το συγκεκριμένο club.

Δεν πρέπει να κάνει merge `tournaments` rows χωρίς `bt_event`.

Αν ένα club έχει μόνο draft/local tournaments, το public section πρέπει να δείχνει empty state:

```text
No published tournaments found for this club.
```

## Detail pages

Η detail page παραμένει η ίδια:

```text
/tournaments/{slug}
```

και συνεχίζει να δουλεύει με:

```text
src/app/tournaments/[slug]/page.tsx
src/lib/tournaments.ts
src/components/tournaments/TournamentDetailPage.tsx
```

Δεν πρέπει να φτιαχτεί ξεχωριστό:

```text
/club-tournament-data/{id}
/api/club-tournaments/[id]/public-data
```

εκτός αν στο μέλλον αποφασιστεί να γίνει μόνο σαν internal migration/debug endpoint, όχι σαν public canonical source.

## Live αποτελέσματα

Τα live αποτελέσματα πρέπει να έρχονται από το ίδιο operational/live layer που χρησιμοποιούν και τα official matches.

Για αγώνα που παίζεται σε club screen:

```text
scoreboard_sessions
```

είναι το live source.

Όταν τελειώνει ο αγώνας, το αποτέλεσμα πρέπει να καταλήγει στο κανονικό match/result structure:

```text
bt_groups
bt_results / calculated standings
```

ή στο αντίστοιχο υπάρχον official engine path.

Δεν πρέπει το public live/results UI να βασίζεται σε parsing του `format_definition.clubRuntime`.

## Club-local players

Τα club tournaments μπορούν να δεχτούν:

- official BT Players
- player accounts
- club-local/guest players

Για public προβολή αποτελέσματος, όλοι πρέπει να εμφανίζονται κανονικά στο match.

Για statistics:

- αν participant είναι linked σε BT Player, το αποτέλεσμα μπορεί να μετρήσει στα αντίστοιχα official/overall stats όταν το rules policy το επιτρέπει
- αν participant είναι μόνο club-local/guest, το αποτέλεσμα εμφανίζεται στο tournament αλλά δεν γράφεται σε official BT Player statistics

Αυτό πρέπει να λυθεί στο participant/result model του engine, όχι με ξεχωριστό public renderer.

## Απαιτούμενο backend/admin refactor

Το σημερινό club-local runtime είναι χρήσιμο ως bridge για να δοκιμαστεί το club UX.

Πριν ανοίξει μαζικά σε clubs, χρειάζεται refactor ώστε το `Prepare structure` ή το `Publish tournament` να δημιουργεί κανονικά:

```text
bt_event
bt_event_stages
bt_groups
bt_results / standings
tournament_participants
```

ή να χρησιμοποιεί τον ίδιο υπάρχοντα engine path που χρησιμοποιεί το internal admin.

Το club UI μπορεί να μείνει απλό/wizard-based, αλλά από κάτω πρέπει να γράφει στο ίδιο results model.

## Frontend αλλαγή που έγινε

Το public endpoint:

```text
src/app/api/tournaments/route.ts
```

διορθώθηκε ώστε, όταν υπάρχει `clubSlug`, να επιστρέφει μόνο `bt-events` filtered με:

```text
filters[tournament][club][slug][$eq] = clubSlug
```

και να μη συγχωνεύει πλέον `tournaments` χωρίς `bt_event`.

Τα public club pages ενημερώθηκαν ώστε το section να μιλά για published tournaments/results:

```text
src/app/clubs/[slug]/page.tsx
src/app/embed/clubs/[slug]/page.tsx
```

## Verification

Το σωστό αποτέλεσμα είναι:

- club page δείχνει μόνο tournaments που ανοίγουν σε public detail route
- δεν εμφανίζονται JSON-only local draft tournaments σαν public results
- όλα τα clickable tournament links οδηγούν σε `/tournaments/{slug}`
- η detail page χρησιμοποιεί την υπάρχουσα official results παρουσίαση
- τα groups/matches/results δημοσιεύονται με τον ίδιο τρόπο όπως τα official tournaments

Local checks:

```bash
npx tsc --noEmit --pretty false
npm run build
```

Production deploy:

```bash
bt-sync frontend
```

Smoke checks:

```text
https://www.billiardtoday.com/clubs/dev
https://www.billiardtoday.com/api/tournaments?clubSlug=dev&page=1&pageSize=10
```

Expected:

- δεν υπάρχουν rows με `source: "club_tournament"`
- όλα τα rows έχουν `source: "bt_event"`
- όλα τα rows είναι clickable
- τα results εμφανίζονται από το ίδιο public tournament detail UI

