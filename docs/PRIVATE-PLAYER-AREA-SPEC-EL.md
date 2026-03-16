# Ιδιωτική Σελίδα Προφίλ Παίκτη

## Στόχος

Να δημιουργηθεί μια ιδιωτική ενότητα παίκτη μέσα στο `billiardtoday.com`, όπου κάθε παίκτης θα μπορεί, μετά από login, να βλέπει το προσωπικό του ιστορικό και τα αποτελέσματά του.

Βασικός κανόνας:

- δημόσια θα είναι μόνο τα αποτελέσματα από τουρνουά
- ιδιωτικά θα είναι τα φιλικά παιχνίδια και τα υπόλοιπα προσωπικά δεδομένα

Η εμπειρία πρέπει να παραμένει ενιαία μέσα από το `billiardtoday.com`, χωρίς να απαιτείται ξεχωριστό domain για τον παίκτη.

## Βασικές Αποφάσεις

- Ένας παίκτης αντιστοιχεί σε έναν λογαριασμό.
- Τα αποτελέσματα φιλικών δεν θα είναι live.
- Τα φιλικά θα αποθηκεύονται μόνο όταν ολοκληρώνεται το παιχνίδι.
- Στην ιδιωτική σελίδα θα υπάρχει καθαρός διαχωρισμός ανάμεσα σε:
  - τουρνουά
  - φιλικά παιχνίδια
- Τα φιλικά παιχνίδια θα υποστηρίζουν από την αρχή:
  - notes
  - tags
  - venue / club / table metadata
- Οι pending χρήστες θα βλέπουν partial data πριν το τελικό approval.
- Το enroll/claim από το scoreboard δεν θα απαιτεί πλήρη εγγραφή εκείνη τη στιγμή.
- Ο παίκτης θα μπορεί αργότερα, από κινητό ή υπολογιστή, να συνδέσει τη συσκευή/εγγραφή του με τον λογαριασμό του και να δει το ιδιωτικό προφίλ του.

## Τι Είναι Δημόσιο και Τι Ιδιωτικό

### Δημόσιο

- προφίλ παίκτη με στοιχεία που αφορούν μόνο τουρνουά
- συμμετοχές σε τουρνουά
- αποτελέσματα και στατιστικά τουρνουά
- δημόσιες σελίδες διοργανώσεων και αποτελεσμάτων

### Ιδιωτικό

- φιλικά παιχνίδια
- notes και tags φιλικών
- venue / club / table metadata
- συνδεδεμένες συσκευές
- προσωπική σελίδα λογαριασμού
- κατάσταση σύνδεσης / pending / approval
- ιδιωτικό activity feed

## Βασικό Μοντέλο Ταυτότητας

Το σύστημα θα βασίζεται σε τρία επίπεδα:

### 1. BT Player

Η βασική αγωνιστική οντότητα του παίκτη.

Εκεί συνδέονται:

- δημόσια ιστορικά τουρνουά
- ιδιωτικά φιλικά αποτελέσματα
- στατιστικά

### 2. Trusted Device

Λειτουργική ταυτότητα για το scoreboard flow.

Χρησιμοποιείται για:

- claim από QR
- γρήγορο enroll
- σύνδεση παίκτη με συσκευή

Δεν αποτελεί το κύριο auth για το private profile.

### 3. Player Account

Ο λογαριασμός login του χρήστη.

Χρησιμοποιείται για:

- πρόσβαση στο private area
- προβολή φιλικών
- προβολή προσωπικών δεδομένων
- διαχείριση συσκευών

Κανόνας:

- 1 λογαριασμός = 1 παίκτης
- 1 παίκτης = 1 λογαριασμός

## Κεντρική Λογική Προϊόντος

Το scoreboard enroll πρέπει να παραμένει γρήγορο και ελαφρύ.

Άρα:

- ο παίκτης μπορεί να κάνει enroll/claim από το scoreboard χωρίς πλήρη εγγραφή
- το σύστημα καταγράφει την ταυτότητα της συσκευής και τη σχέση με τον παίκτη
- αργότερα, ο παίκτης μπορεί να επιστρέψει στο `billiardtoday.com` και να ολοκληρώσει το account/profile flow

Με αυτόν τον τρόπο:

- δεν μπλοκάρουμε τη ροή του αγώνα
- δεν αναγκάζουμε τον χρήστη να ολοκληρώσει registration πάνω στο scoreboard
- μπορούμε να ενώσουμε αργότερα τα δεδομένα του σε ένα private profile

## Βασικά User Journeys

### Journey A: Παίκτης ξεκινά από το scoreboard

1. Σκανάρει το QR.
2. Κάνει claim/enroll συσκευής.
3. Επιλέγει υπάρχον παίκτη ή κάνει προσωρινή εγγραφή.
4. Παίζει φιλικό παιχνίδι.
5. Με τη λήξη του αγώνα, το αποτέλεσμα αποθηκεύεται.
6. Αργότερα μπαίνει από κινητό ή υπολογιστή στο `billiardtoday.com`.
7. Κάνει account creation ή login.
8. Συνδέει τον λογαριασμό του με την εγγραφή που δημιουργήθηκε από το scoreboard.
9. Βλέπει το ιδιωτικό προφίλ και το προσωπικό ιστορικό του.

### Journey B: Παίκτης έχει ήδη account

1. Έχει ήδη λογαριασμό στο `billiardtoday.com`.
2. Χρησιμοποιεί το scoreboard QR.
3. Το trusted device συνδέεται με τον παίκτη του.
4. Όταν ολοκληρώνεται φιλικό παιχνίδι, το αποτέλεσμα καταχωρείται.
5. Μπαίνει αργότερα στο private profile και το βλέπει κανονικά.

### Journey C: Pending παίκτης

1. Γίνεται enroll από scoreboard με προσωρινά στοιχεία.
2. Τα φιλικά αποτελέσματα αρχίζουν να καταχωρούνται πάνω στο pending identity.
3. Ο χρήστης δημιουργεί αργότερα account.
4. Συνδέει το account του με το pending profile.
5. Βλέπει partial data άμεσα.
6. Μετά από admin approval ή merge συνδέεται με canonical BT Player.
7. Ενοποιούνται τα δεδομένα του πλήρως.

## Τι Σημαίνει Partial Data Πριν το Approval

Ο pending χρήστης πρέπει να βλέπει:

- το private dashboard shell
- τα trusted devices του
- τα φιλικά παιχνίδια που έχουν ήδη αποδοθεί στο pending profile
- την κατάσταση της αίτησης / σύνδεσης
- prompts για ολοκλήρωση προφίλ

Ο pending χρήστης δεν πρέπει να βλέπει:

- πλήρες canonical tournament history άλλου verified player
- merged ιστορικά πριν ολοκληρωθεί το approval
- admin-only εσωτερικά δεδομένα συγχώνευσης

## Δομή Σελίδων

### Δημόσιες Σελίδες

- `/players/[id]`
  - δημόσιο προφίλ παίκτη
  - δείχνει μόνο tournament αποτελέσματα και στατιστικά
- `/tournaments`
- `/tournaments/[slug]`
- `/tournaments/events`

### Ιδιωτικές Σελίδες

- `/account`
  - dashboard / σύνοψη
- `/account/tournaments`
  - ιδιωτική προβολή αποτελεσμάτων τουρνουά
- `/account/friendly`
  - ιδιωτική προβολή φιλικών αγώνων
- `/account/devices`
  - διαχείριση trusted devices
- `/account/profile`
  - στοιχεία λογαριασμού και προφίλ
- `/account/complete-profile`
  - σελίδα ολοκλήρωσης προφίλ μετά από scoreboard enroll

Σημείωση:

- το σημερινό `/me` μπορεί να διατηρηθεί προσωρινά ως redirect ή alias προς `/account`

## UX Ιδιωτικής Σελίδας

### `/account`

Θα περιλαμβάνει:

- card παίκτη
- κατάσταση λογαριασμού:
  - approved
  - pending verification
- quick stats:
  - tournament matches
  - friendly matches
  - wins
  - average
  - high run
- πρόσφατη δραστηριότητα με labels:
  - `Tournament`
  - `Friendly`

### `/account/tournaments`

Θα περιλαμβάνει:

- μόνο tournament history
- φίλτρα ανά:
  - έτος
  - game type
  - event
- αναλυτική προβολή συμμετοχών και αγώνων

### `/account/friendly`

Θα περιλαμβάνει:

- μόνο friendly history
- φίλτρα ανά:
  - ημερομηνία
  - club
  - table
  - tags
  - αντίπαλο
- notes
- metadata venue / club / table
- καμία live πληροφορία, μόνο ολοκληρωμένα παιχνίδια

### `/account/devices`

Θα περιλαμβάνει:

- λίστα trusted devices
- current device
- revoke / unlink
- timestamps τελευταίας χρήσης

### `/account/profile`

Θα περιλαμβάνει:

- email
- mobile
- linked player identity
- κατάσταση approval
- prompts για συμπλήρωση στοιχείων
- ιστορικό enroll/claim όπου χρειάζεται

## Data Model

### PlayerAccount

Προτεινόμενα πεδία:

- `id`
- `email`
- `passwordHash`
- `status`
  - `active`
  - `pending_verification`
- `btPlayerDocumentId`
- `createdAt`
- `updatedAt`

Κανόνες:

- μοναδικό account ανά player
- μοναδικός player ανά account

### PlayerEnrollmentRequest

Χρησιμοποιείται για enroll από scoreboard και μεταγενέστερη ολοκλήρωση προφίλ.

Πεδία:

- `id`
- `fullName`
- `country`
- `clubName`
- `mobile`
- `email`
- `screenIdentifier`
- `trustedDeviceToken`
- `linkedPlayerDocumentId`
- `status`
  - `pending`
  - `approved`
  - `rejected`
  - `merged`
- `profileClaimToken`
- `profileClaimExpiresAt`
- `notes`
- `createdAt`
- `updatedAt`

### FriendlyMatchResult

Η βασική οντότητα ιδιωτικού friendly history.

Πεδία:

- `id`
- `sessionId`
- `playedAt`
- `player1DocumentId`
- `player2DocumentId`
- `player1NameSnapshot`
- `player2NameSnapshot`
- `score1`
- `score2`
- `innings`
- `highRun1`
- `highRun2`
- `winnerDocumentId`
- `clubDocumentId`
- `clubNameSnapshot`
- `venueName`
- `tableLabel`
- `notes`
- `tags`
- `status`
  - `completed`
  - `voided`
- `submittedByScreenId`

### TrustedDevice

Η υπάρχουσα λογική επεκτείνεται όπου χρειάζεται.

Πεδία ή συσχετίσεις:

- trusted device token
- linked player
- optional linked account
- last used at
- active / revoked state

## Καταγραφή Φιλικών Αγώνων

Βασικός κανόνας:

- τα friendly matches δεν είναι live content
- καταχωρούνται μόνο με την ολοκλήρωση του παιχνιδιού

Όταν τελειώνει ένα φιλικό:

1. Το scoreboard ή ο backend service στέλνει το τελικό αποτέλεσμα.
2. Δημιουργείται `FriendlyMatchResult`.
3. Το αποτέλεσμα γίνεται διαθέσιμο μόνο στο private area των εμπλεκόμενων παικτών.

Από την πρώτη έκδοση πρέπει να αποθηκεύονται:

- τελικό σκορ
- innings
- high runs
- παίκτες
- χρονική στιγμή λήξης
- club / venue / table
- notes
- tags

## Public και Private Tournament Data

Τα tournament αποτελέσματα παραμένουν δημόσια.

Public χρήση:

- δημόσια player profiles
- public tournament pages

Private χρήση:

- ίδιο history αλλά φιλτραρισμένο στον logged-in παίκτη
- πιο personalized dashboard εμπειρία

Άρα:

- δεν αλλάζει ο δημόσιος χαρακτήρας των tournament results
- αλλά στο private area θα υπάρχουν ως ξεχωριστή ενότητα από τα φιλικά

## Σύνδεση Enroll από Scoreboard με Μελλοντικό Προφίλ

Αυτό είναι κρίσιμο μέρος του workflow.

Όταν ο χρήστης κάνει enroll από scoreboard, πρέπει να δημιουργείται τρόπος για μεταγενέστερη σύνδεση με account.

### Προτεινόμενη λύση

Μετά το enroll να δημιουργείται:

- `profileClaimToken`
- record enrollment request
- σύνδεση με trusted device token

Αργότερα ο χρήστης θα μπορεί να ανοίξει:

- `/account/complete-profile?claim=...`

Εκεί θα μπορεί να:

- δημιουργήσει λογαριασμό
- κάνει login αν έχει ήδη
- επιβεβαιώσει email ή στοιχεία
- ολοκληρώσει το προφίλ του
- συνδέσει τον λογαριασμό με την εγγραφή που ήρθε από το scoreboard

### UX μετά το scan

Μετά το enroll/claim μπορούμε να δείχνουμε μήνυμα τύπου:

- `Η συσκευή σου συνδέθηκε. Μπορείς αργότερα να ολοκληρώσεις το προφίλ σου στο billiardtoday.com.`

Αν υπάρχουν email/mobile στοιχεία, το σύστημα μπορεί αργότερα να στείλει completion link.

## API Σχεδιασμός

### Public APIs

- `GET /api/public/players/:id/tournaments`
- `GET /api/public/tournaments/...`

### Private APIs

- `GET /api/account/summary`
- `GET /api/account/profile`
- `GET /api/account/tournaments`
- `GET /api/account/friendly`
- `GET /api/account/activity`
- `GET /api/account/devices`
- `POST /api/account/devices/revoke`

### APIs Ολοκλήρωσης Προφίλ

- `POST /api/account/claim/start`
- `POST /api/account/claim/complete`
- `GET /api/account/complete-profile?claim=...`

### Admin APIs

- `GET /api/admin/player-enrollment-requests`
- `POST /api/admin/player-enrollment-requests/:id/approve`
- `POST /api/admin/player-enrollment-requests/:id/reject`
- `POST /api/admin/player-enrollment-requests/:id/merge`

## Κανόνες Πρόσβασης

- Public routes δεν επιστρέφουν friendly results.
- Private routes απαιτούν login.
- Pending users βλέπουν partial private data.
- Tournament history στο private area γίνεται πλήρως διαθέσιμο όταν ολοκληρώνεται η σωστή σύνδεση με canonical player identity.
- Friendly history που έχει ήδη καταγραφεί για το pending profile πρέπει να παραμένει ορατό στον ίδιο χρήστη.

## Προτεινόμενες Φάσεις Υλοποίησης

### Φάση 1: Βάση λογαριασμού και private area

- καθορισμός account model
- 1 player = 1 account
- login / register / reset
- δημιουργία `/account`
- προσωρινή σύνδεση του υπάρχοντος `/me` με το νέο flow

### Φάση 2: Scoreboard continuation flow

- επέκταση του claim/enroll flow
- δημιουργία `profileClaimToken`
- υλοποίηση `/account/complete-profile`
- μεταγενέστερη σύνδεση του scoreboard enroll με account

### Φάση 3: Friendly match persistence

- δημιουργία `FriendlyMatchResult`
- καταχώριση με τη λήξη κάθε φιλικού
- αποθήκευση notes, tags, venue metadata

### Φάση 4: Private APIs

- account summary
- tournaments
- friendly matches
- devices
- activity feed

### Φάση 5: UI ολοκλήρωση

- `/account`
- `/account/tournaments`
- `/account/friendly`
- `/account/devices`
- `/account/profile`
- pending-state UX

### Φάση 6: Approval / merge εργαλεία

- admin queue
- approve / reject / merge
- ενοποίηση pending profile με canonical BT Player

### Φάση 7: Βελτιώσεις

- notifications
- profile completion reminders
- richer stats
- καλύτερο activity timeline

## MVP Πρόταση

Για πρώτη έκδοση προτείνεται:

- account login
- 1 player = 1 account
- private dashboard
- private tournaments tab
- private friendly matches tab
- devices tab
- completion flow μετά από scoreboard enroll
- partial data για pending users

Να μείνουν εκτός πρώτης φάσης:

- εξελιγμένα notifications
- σύνθετα social στοιχεία
- extra gamification

## Τεχνική Κατεύθυνση

Η προτεινόμενη κατεύθυνση είναι:

- το `billiardtoday.com` να είναι το μοναδικό player-facing domain
- το scoreboard flow να παραμένει γρήγορο και λειτουργικό
- το account να είναι το κεντρικό σημείο ιδιωτικής πρόσβασης
- τα public player pages να δείχνουν μόνο tournament data
- τα friendly αποτελέσματα να παραμένουν ιδιωτικά
- το private area να διαχωρίζει ρητά:
  - τουρνουά
  - φιλικά παιχνίδια

## Επόμενο Βήμα

Με βάση αυτό το spec, το επόμενο πρακτικό βήμα είναι να γραφτεί engineering blueprint με:

- ακριβή content types / collections
- route map frontend
- request / response schemas
- migration plan από το υπάρχον `/me`, `claim`, `enroll`, trusted-device flow
- rollout plan ανά repo και service
