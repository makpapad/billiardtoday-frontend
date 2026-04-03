# U21 CEB Youth Implementation Plan

Σκοπός: να υποστηριχθεί ειδικό tournament preset για:

- `Federation: CEB`
- `Tournament type / series: EURO GRAND PRIX`
- `Category: Youth`

χωρίς να επηρεαστούν τα υπόλοιπα tournament flows.

Το preset αυτό πρέπει να ακολουθεί τους κανονισμούς του U21 event family και να μπορεί να καλύψει και extended participation counts όπως `28` και `32` παίκτες.

---

## 1. Scope

Το ειδικό ruleset ενεργοποιείται μόνο όταν το tournament ανήκει ταυτόχρονα σε:

- `CEB`
- `EURO GRAND PRIX`
- `Youth`

Σε κάθε άλλο tournament:

- παραμένει το υπάρχον generic behavior
- δεν αλλάζουν comparator rules
- δεν αλλάζει το qualification flow
- δεν αλλάζει το admin UI

---

## 2. Supported formats

Με βάση τη λογική της CEB, το preset πρέπει να υποστηρίζει:

- `10 players: 2 groups of 5 + semifinals`
- `12 players: 2 groups of 6 + semifinals`
- `14 players: 2 groups of 7 + quarterfinals`
- `15 players: 3 groups of 5 + quarterfinals`
- `16 players: 2 groups of 8 + quarterfinals`
- `17 players: 2 groups of 6 and 1 group of 5 + quarterfinals`
- `18 players: 3 groups of 6 + quarterfinals`
- `19 players: 1 group of 4 and 3 groups of 5 + quarterfinals`
- `20 players: 4 groups of 5 + quarterfinals`
- `21 players: 3 groups of 5 and 1 group of 6 + quarterfinals`
- `22 players: 2 groups of 5 and 2 groups of 6 + quarterfinals`
- `23 players: 1 group of 5 and 3 groups of 6 + quarterfinals`
- `24 players: 6 groups of 4 + last 16`
- `28 players: 7 groups of 4 + last 16`
- `32 players: 8 groups of 4 + last 16`

Σημείωση:

- τα `28` και `32` είναι platform extension που συνεχίζει τη λογική της CEB

---

## 3. Qualification logic

Ο qualification engine για αυτό το preset δεν πρέπει να είναι generic.

Η λογική είναι:

1. περνάνε όλοι οι `1οι` των groups
2. μετά όλοι οι `2οι` των groups
3. αν δεν έχει συμπληρωθεί το required knockout bracket, μπαίνουν οι καλύτεροι `3οι` μέχρι να συμπληρωθεί

### Παραδείγματα

#### 24 players

- `6 groups x 4`
- `6 winners + 6 seconds = 12`
- χρειάζονται άλλοι `4`
- μπαίνουν `4 best third placed`
- knockout target: `last 16`

#### 28 players

- `7 groups x 4`
- `7 winners + 7 seconds = 14`
- χρειάζονται άλλοι `2`
- μπαίνουν `2 best third placed`
- knockout target: `last 16`

#### 32 players

- `8 groups x 4`
- `8 winners + 8 seconds = 16`
- δεν χρειάζονται τρίτοι
- knockout target: `last 16`

---

## 4. Group standings rules

Για τις κατατάξεις μέσα στους ομίλους:

- `MP`
- `AVG`
- `Best AVG`
- `HR1`
- `HR2`

Κανόνες:

- το `AVG` κόβεται στο 3ο δεκαδικό
- δεν γίνεται round
- το `Best AVG` ισχύει μόνο σε νίκες
- παίκτης με μόνο ήττες δεν έχει `Best AVG`

---

## 5. Cross-group qualification ranking

Για να συγκρίνονται:

- οι `2οι` μεταξύ groups για seeding
- οι `3οι` όταν χρειάζονται best thirds

χρησιμοποιούμε qualification comparator:

- `group place`
- `game points`
- `general average`
- `best game average`
- `HR1`
- `HR2`

### Special case

Αν οι groups έχουν unequal size:

- τα `game points` αγνοούνται στο cross-group ranking

Άρα:

- equal-size groups:
  - `place -> MP -> AVG -> Best AVG -> HR1 -> HR2`
- unequal-size groups:
  - `place -> AVG -> Best AVG -> HR1 -> HR2`

---

## 6. KO seeding

Μετά την επιλογή qualifiers, το seeding του knockout πρέπει να είναι tier-based:

1. πρώτα όλοι οι `group winners`
2. μετά όλοι οι `group seconds`
3. μετά οι `best third placed` που μπήκαν για completion

Εντός κάθε tier γίνεται sort με τον qualification comparator.

### Example for 28 players

- seeds `1-7`: όλοι οι πρώτοι
- seeds `8-14`: όλοι οι δεύτεροι
- seeds `15-16`: οι `2 best third placed`

---

## 7. Strapi changes

### 7.1 Tournament preset detection

Αρχείο:

- [tournament.ts](D:/Projects/1-billiards-strapi/src/api/tournament/controllers/tournament.ts)

Να προστεθεί helper που ανιχνεύει:

- `isCebEuroGrandPrixYouthTournament`

και να χρησιμοποιείται σε:

- create / update tournament
- generate groups
- qualification handling
- stage generation

### 7.2 Shared rules helper

Αρχείο:

- [standingsCalculator.ts](D:/Projects/1-billiards-strapi/src/services/standingsCalculator.ts)

Να προστεθεί shared U21 rules helper για:

- group comparator
- qualification comparator
- equal vs unequal groups logic
- best thirds selection

Να ενοποιηθούν εδώ:

- group standings
- best runners-up / best third-place selection
- qualification ranking

### 7.3 Qualification resolver

Αρχείο:

- [tournamentEventGenerator.ts](D:/Projects/1-billiards-strapi/src/services/tournamentEventGenerator.ts)

Να μπει preset-aware resolver που:

- διαβάζει stage results / standings
- επιλέγει winners
- μετά seconds
- μετά best thirds αν λείπουν slots
- επιστρέφει ordered qualifier list για KO generation

### 7.4 Generator validation

Αρχείο:

- [matchGenerator.ts](D:/Projects/1-billiards-strapi/src/services/matchGenerator.ts)

Ο core generator μπορεί να μείνει generic, αλλά να υπάρχουν validations upstream ώστε:

- να μη δημιουργούνται invalid group sizes/counts για αυτό το preset

### 7.5 Final ranking consistency

Αρχείο:

- [finalResultsPublisher.ts](D:/Projects/1-billiards-strapi/src/services/finalResultsPublisher.ts)

Να χρησιμοποιεί τον ίδιο comparator helper ώστε να μην υπάρχει divergence με:

- standings
- qualification preview
- final publish

---

## 8. Admin changes

### 8.1 Tournament edit page

Αρχείο:

- [page.tsx](D:/Projects/2-billiardtoday-admin/src/app/(protected-pages)/admin/tournament/edit/page.tsx)

Όταν ενεργοποιείται το preset:

- να κρύβονται invalid generic options
- να εμφανίζεται guidance για supported formats
- να εμφανίζεται help text για qualification logic

### 8.2 Generate groups modal

Αρχείο:

- [GenerateGroupsModal.tsx](D:/Projects/2-billiardtoday-admin/src/components/tournament/GenerateGroupsModal.tsx)

Για το preset:

- να μη φαίνεται generic `top_overall`
- να μη φαίνεται generic `top_per_group`
- να μη φαίνονται free numeric inputs για `best_runners_up`
- να μη φαίνεται free `best_third_place`

Αντί αυτών να δείχνει computed summary:

- group format
- knockout target
- direct qualifiers
- extra best third placed if needed

### 8.3 Stage generation / fallback paths

Αρχεία:

- [group-match route](D:/Projects/2-billiardtoday-admin/src/app/api/admin/tournament/event-stages/[stageId]/group-match/route.ts)
- [stages route](D:/Projects/2-billiardtoday-admin/src/app/api/admin/tournament/stages/[id]/route.ts)

Να διασφαλιστεί ότι:

- τα fallback generation paths χρησιμοποιούν τον ίδιο qualification order
- δεν μένει παλιό generic runner-up logic που θα συγκρούεται με το preset

### 8.4 Results page

Αρχείο:

- [results page](D:/Projects/2-billiardtoday-admin/src/app/(protected-pages)/admin/tournament/results/page.tsx)

Να εμφανίζει σωστά:

- `group_winner`
- `group_2nd`
- `best_third_place`

και να είναι σαφές ποιοι μπήκαν ως extra third qualifiers.

### 8.5 Final results preview

Αρχείο:

- [final-results preview route](D:/Projects/2-billiardtoday-admin/src/app/api/admin/tournament/events/[id]/final-results/preview/route.ts)

Να ευθυγραμμιστεί με:

- shared comparator
- Best AVG
- truncation logic

---

## 9. Frontend changes

### 9.1 Tournament events display

Αρχείο:

- [TournamentEventsContent.tsx](D:/Projects/4-billiardtoday-frontend/src/app/tournaments/events/TournamentEventsContent.tsx)

Να μπορεί να εμφανίσει καθαρά:

- winners
- seconds
- best thirds

αν αυτά δημοσιεύονται στο qualification stage.

### 9.2 Shared tournament utilities

Αρχείο:

- [utils.ts](D:/Projects/4-billiardtoday-frontend/src/app/tournaments/events/utils.ts)

Να μείνει display-oriented.

Δεν θέλουμε δεύτερο ανεξάρτητο qualification engine στο frontend αν το backend ήδη δίνει σωστά rows.

### 9.3 Tournament detail summary

Αρχείο:

- [TournamentDetailPage.tsx](D:/Projects/4-billiardtoday-frontend/src/components/tournaments/TournamentDetailPage.tsx)

Αν χρειαστεί overview text για qualification / KO:

- να έρχεται από backend/published stage data
- όχι από ad hoc client-side inference

---

## 10. Validation matrix

Για το preset πρέπει να υπάρχει explicit validation table:

- `10 -> 2x5 -> SF`
- `12 -> 2x6 -> SF`
- `14 -> 2x7 -> QF`
- `15 -> 3x5 -> QF`
- `16 -> 2x8 -> QF`
- `17 -> 2x6 + 1x5 -> QF`
- `18 -> 3x6 -> QF`
- `19 -> 1x4 + 3x5 -> QF`
- `20 -> 4x5 -> QF`
- `21 -> 3x5 + 1x6 -> QF`
- `22 -> 2x5 + 2x6 -> QF`
- `23 -> 1x5 + 3x6 -> QF`
- `24 -> 6x4 -> L16 with 4 best thirds`
- `28 -> 7x4 -> L16 with 2 best thirds`
- `32 -> 8x4 -> L16`

Αν το tournament δεν ταιριάζει σε supported combination:

- το preset πρέπει να δίνει validation error
- όχι να πέφτει σε generic behavior silently

---

## 11. Recommended implementation order

### Phase 1: backend safety

- preset detection
- validation matrix
- shared comparator helper
- qualification resolver
- KO qualifier seeding

### Phase 2: admin UX

- preset-aware create/edit UI
- generate groups modal restrictions
- results/preview alignment

### Phase 3: frontend display

- qualification labels
- published ranking/qualification display cleanup

---

## 12. Minimum viable version

Αν θέλουμε το πιο ασφαλές πρώτο release:

### Must have

- backend validation
- backend qualification resolver
- shared comparator everywhere
- admin restricted UI for this preset

### Can follow after

- richer frontend explanation
- polished qualification badges / legends

---

## 13. Known risks

- αν δεν ενοποιηθεί ο comparator, θα διαφωνούν standings / preview / final publish
- αν το preset μείνει μόνο στο UI, το backend θα συνεχίσει να επιτρέπει invalid formats
- αν το frontend ξαναϋπολογίζει qualification independently, μπορεί να δείξει άλλη εικόνα από published backend data

---

## 14. Next implementation step

Προτεινόμενο πρώτο coding step:

1. `Strapi`
   - helper για preset detection
   - shared comparator helper
   - validation matrix

2. μετά:
   - qualification resolver για `24 / 28 / 32`

Αυτό θα μας δώσει τη σωστή βάση πριν πειραχτεί το admin UI.
