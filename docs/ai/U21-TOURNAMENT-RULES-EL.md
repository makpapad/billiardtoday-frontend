# Longoni Next Gen Grand Prix 3-Cushion U21

Σημείωση: αυτό το αρχείο είναι λειτουργική σύνοψη των βασικών κανονισμών και απαιτήσεων που μας ενδιαφέρουν για υλοποίηση σε `Strapi`, `Next admin` και `frontend`, με βάση το PDF:

- `docs/ai/c17-ceb-gp-3c-u21-25-26.pdf`

Δεν είναι πλήρης νομική/επίσημη αναπαραγωγή του κανονισμού. Αν υπάρξει αμφιβολία, το PDF υπερισχύει.

## 1. Τι event είναι

- Διοργάνωση νέων U-21 για 3-Cushion.
- Χρησιμοποιείται group phase και στη συνέχεια knockout phase.
- Η διοργάνωση δίνει και Longoni Next Gen ranking points.

## 2. Βασικό format ομίλων

- Οι όμιλοι του event family είναι επιτρεπτοί μόνο σε μεγέθη:
  - `4`
  - `5`
  - `6`
  - `7`
- Από κάθε όμιλο προκρίνονται οι πρώτοι `2`.
- Η λογική seeding / distribution είναι τύπου `system Z`.

## 3. Qualification προς knockout

- Η πρόκριση από τους ομίλους βασίζεται πρώτα στη θέση μέσα στον όμιλο.
- Μετά χρησιμοποιείται qualification ranking για να στηθεί το knockout.
- Το qualification ranking ακολουθεί:
  - `group place`
  - `game points`
  - `general average`
  - `best game average`
  - `HR1`
  - `HR2`

Ειδικός κανόνας:

- Αν οι όμιλοι δεν έχουν όλοι ίδιο αριθμό παικτών, τότε τα `game points` δεν λαμβάνονται υπόψη στο qualification ranking.

## 4. Group standings / tie-breaks

Για τις κατατάξεις ομίλου που έχουμε υλοποιήσει στο σύστημα, το order που θέλουμε να ακολουθούμε είναι:

- `MP`
- `AVG`
- `Best AVG`
- `HR1`
- `HR2`

Διευκρινίσεις:

- Το `AVG` κόβεται στο 3ο δεκαδικό, δεν γίνεται round.
- Το `Best AVG` μετρά μόνο σε νίκες.
- Αν παίκτης έχει μόνο ήττες, δεν έχει `Best AVG`.

## 5. Knockout structure

Το knockout δεν είναι completely generic. Ανάλογα με τον αριθμό συμμετεχόντων / group output:

- το event οδηγείται σε `quarterfinals`
- ή σε `semifinals`
- και σε συγκεκριμένες περιπτώσεις 24 παικτών απαιτείται `last 16`

Άρα το U21 mode δεν πρέπει να επιτρέπει αυθαίρετο bracket structure.

## 6. Αγωνιστικοί χρόνοι / match regulations

Το PDF περιλαμβάνει operational κανόνες διεξαγωγής που δεν είναι απλώς cosmetic:

- `40"` shot clock
- `2` time-outs
- το time-out επεκτείνει τον διαθέσιμο χρόνο στα `80"` όταν εφαρμόζεται
- υποχρεωτικό διάλειμμα `5` λεπτών σε συγκεκριμένο σημείο του αγώνα

Η λογική αυτή είναι σημαντική τουλάχιστον ως tournament rule reference, ακόμη κι αν δεν έχει πλήρως αυτοματοποιηθεί στο scoring flow.

## 7. Longoni Next Gen ranking points

- Η διοργάνωση αποδίδει ranking points.
- Άρα χρειάζεται να ξεχωρίζουμε:
  - αγωνιστική κατάταξη event
  - τελικά βαθμολογικά points / ranking points

Στο UI δεν πρέπει να γίνεται fallback από άσχετα στατιστικά σε ranking-related fields.

## 8. Τι σημαίνει αυτό για το σύστημα

Για strict U21 support, το platform πρέπει ιδανικά να κλειδώνει:

- group size μόνο σε `4|5|6|7`
- qualifiers μόνο `2 per group`
- qualification ranking με special handling όταν οι όμιλοι έχουν unequal sizes
- shared comparator logic σε όλα τα paths
- ίδιο truncation logic στο `AVG` και `Best AVG` παντού
- restricted knockout shapes

## 9. Known implementation implications

Από τα checks που έχουν γίνει μέχρι τώρα:

- Το σύστημα έχει σωστό core comparator σε αρκετά σημεία.
- Δεν είναι όμως από default strict U21 preset.
- Υπάρχουν generic flows που επιτρέπουν invalid U21 setup αν δεν μπουν guardrails.

Άρα, αν θέλουμε πλήρη συμβατότητα με το event:

- χρειάζεται `U21 preset/profile`
- validation σε backend/admin
- και shared ranking helper για να μη διαφωνούν preview, standings, final publishing και frontend views

## 10. Practical checklist για μελλονικά tasks

Όταν προκύπτει bug ή feature σχετικό με αυτό το tournament family, να ελέγχουμε πάντα:

- αν το ranking path είναι `group standings`, `stage ranking`, `qualification ranking` ή `final standings`
- αν το `AVG` είναι truncated και όχι rounded
- αν το `Best AVG` υπολογίζεται μόνο σε νίκες
- αν εμφανίζονται ranking points μόνο όταν υπάρχει πραγματικό scoring signal
- αν οι όμιλοι είναι ίσοι ή άνισοι σε μέγεθος
- αν το συγκεκριμένο UI path είναι strict U21 ή generic tournament flow
