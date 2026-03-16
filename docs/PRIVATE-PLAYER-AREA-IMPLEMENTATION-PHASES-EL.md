# Ιδιωτική Σελίδα Παίκτη: Φάσεις Υλοποίησης και Tickets

## Σκοπός

Το έγγραφο αυτό μετατρέπει το functional spec και το engineering blueprint σε πρακτικό πλάνο υλοποίησης με φάσεις και συγκεκριμένα tickets.

## Αρχές Εκτέλεσης

- Όλα τα user-facing labels θα είναι στα αγγλικά.
- Δεν σπάμε το υπάρχον `claim / enroll / /me` flow απότομα.
- Χτίζουμε πρώτα account foundation και μετά κάνουμε migration στο νέο private area.
- Τα public tournament pages συνεχίζουν να λειτουργούν όπως σήμερα.
- Τα friendly αποτελέσματα παραμένουν private-only.

## Phase 0: Preparation

### Στόχος

Να κλειδώσουν τα τεχνικά prerequisites πριν από code changes.

### Tickets

#### P0.1 Review τωρινού data model

- καταγραφή των υπαρχόντων Strapi content types:
  - `bt-player`
  - `player-device`
  - `player-enrollment-request`
  - `friendly-match`
  - tournament-related entities
- καταγραφή relations που ήδη υπάρχουν

#### P0.2 Review τωρινών frontend routes

- επιβεβαίωση των flows:
  - `/claim`
  - `/enroll`
  - `/me`
- αποτύπωση dependencies προς Strapi APIs

#### P0.3 Define auth direction

- απόφαση για τελικό auth mechanism στο private area
- session-based auth στο `billiardtoday.com`
- transition plan από trusted-device-only private access

## Phase 1: Account Foundation

### Στόχος

Να αποκτήσει το σύστημα κανονική έννοια private player account.

### Tickets

#### P1.1 Create `player-account` content type στο Strapi

Πεδία:

- email
- password hash
- status
- linked player
- linked enrollment request
- timestamps

#### P1.2 Add unique constraints

- 1 player = 1 account
- 1 account = 1 player
- unique email

#### P1.3 Add account service layer

- create account
- find by email
- find by player
- link account to player

#### P1.4 Build frontend auth scaffold

- private session handling
- protected route helpers
- shared account layout shell

#### P1.5 Create private route skeletons

- `/account`
- `/account/profile`
- `/account/tournaments`
- `/account/friendly`
- `/account/devices`

### Deliverable

Υπάρχει private route structure και λογαριασμός παίκτη, έστω χωρίς πλήρες data integration.

## Phase 2: Enrollment Completion Flow

### Στόχος

Να μπορεί ο παίκτης που έκανε enroll από scoreboard να ολοκληρώνει αργότερα το προφίλ του.

### Tickets

#### P2.1 Extend `player-enrollment-request`

Προσθήκη πεδίων:

- `profileClaimToken`
- `profileClaimExpiresAt`
- `accountCompletionStatus`
- `linkedAccount`

#### P2.2 Add claim token generation flow

- generate token on enroll
- generate token on request restart if needed
- expiration handling

#### P2.3 Create backend claim completion APIs

- `POST /api/account/claim/start`
- `GET /api/account/complete-profile`
- `POST /api/account/claim/complete`

#### P2.4 Build `/account/complete-profile`

Η σελίδα πρέπει να επιτρέπει:

- account creation
- login and attach
- completion of pending profile

#### P2.5 Update scoreboard-driven messaging

- μετά το enroll να εμφανίζεται guidance για completion later
- όλα τα labels στα αγγλικά

### Deliverable

Ο χρήστης μπορεί να ξεκινήσει από το scoreboard και να ολοκληρώσει αργότερα το account/profile flow.

## Phase 3: Friendly Match Persistence

### Στόχος

Να καταγράφονται σωστά τα φιλικά με full metadata όταν τελειώνει το παιχνίδι.

### Tickets

#### P3.1 Review current `friendly-match` schema

- εντοπισμός ελλείψεων
- επιβεβαίωση συνδέσεων με:
  - canonical players
  - enrollment requests

#### P3.2 Extend `friendly-match`

Αν λείπουν, προσθήκη:

- notes
- tags
- venue name
- club snapshot
- table label
- winner
- completed timestamp
- private flag if needed

#### P3.3 Define final match submission payload from scoreboard

Payload πρέπει να περιλαμβάνει:

- players
- score
- innings
- high runs
- session id
- screen id
- club / venue / table
- notes
- tags

#### P3.4 Implement end-of-match write flow

- scoreboard/backend sends final result
- Strapi creates `friendly-match`
- relation to player or enrollment request preserved

#### P3.5 Verify no public leakage

- confirm no public route returns friendly data

### Deliverable

Τα φιλικά αποθηκεύονται αξιόπιστα και είναι έτοιμα για private consumption.

## Phase 4: Private Friendly Area

### Στόχος

Να εμφανιστεί private-only ιστορικό φιλικών στο account area.

### Tickets

#### P4.1 Create `GET /api/account/friendly`

Να υποστηρίζει:

- date filters
- club filter
- opponent filter
- tag filter

#### P4.2 Build `/account/friendly` UI

Να δείχνει:

- completed friendly matches
- notes
- tags
- venue / table metadata

#### P4.3 Pending profile support

- if player is pending, show only matches attributable to pending identity

#### P4.4 Device-to-friendly consistency checks

- ensure claimed devices and stored matches align correctly

### Deliverable

Ο παίκτης βλέπει πλήρες private history φιλικών στο account area.

## Phase 5: Private Tournament Area

### Στόχος

Να υπάρχει ιδιωτική προβολή tournament history ξεχωριστά από τα φιλικά.

### Tickets

#### P5.1 Create `GET /api/account/tournaments`

Να επιστρέφει:

- tournament-only results
- filters by year/game type/event

#### P5.2 Build `/account/tournaments`

- separate tab/page
- clear separation from friendly
- all labels in English

#### P5.3 Pending behavior

- pending user sees only what is safely attributable
- full canonical tournament history only after correct verified linking

### Deliverable

Υπάρχει ξεκάθαρος διαχωρισμός private tournaments και private friendlies.

## Phase 6: Account Dashboard and Profile

### Στόχος

Να δημιουργηθεί usable private dashboard.

### Tickets

#### P6.1 Create `GET /api/account/summary`

Includes:

- player identity
- approval state
- counts
- recent activity summary

#### P6.2 Create `GET /api/account/profile`

Includes:

- email
- mobile
- player link
- pending / approved state
- completion state

#### P6.3 Build `/account`

Dashboard with:

- summary cards
- latest activity
- approval badge

#### P6.4 Build `/account/profile`

- profile details
- completion prompts
- account status

### Deliverable

Ο private player area αποκτά πραγματικό dashboard και profile page.

## Phase 7: Device Management

### Στόχος

Να μπορεί ο χρήστης να βλέπει και να διαχειρίζεται τις trusted devices του.

### Tickets

#### P7.1 Create / adapt account devices API

- `GET /api/account/devices`
- `POST /api/account/devices/revoke`

#### P7.2 Build `/account/devices`

- current device
- active devices
- revoke action

#### P7.3 Cross-check with existing `/api/me/devices`

- decide migration path
- deprecate when ready

### Deliverable

Ο παίκτης διαχειρίζεται συσκευές από το account area.

## Phase 8: Pending Review, Approval, Merge

### Στόχος

Να υπάρχει ασφαλής διαχείριση pending identities.

### Tickets

#### P8.1 Extend admin review tools

- pending queue
- request details
- linked devices
- linked matches

#### P8.2 Approve flow hardening

- approve pending identity
- link to canonical player

#### P8.3 Reject flow hardening

- reject invalid enrollments

#### P8.4 Merge flow

- merge pending profile to canonical `bt-player`
- preserve friendly history
- preserve device associations where needed

#### P8.5 Audit trail

- who approved
- when
- what was merged

### Deliverable

Pending identities μπορούν να γίνουν canonical χωρίς απώλεια private history.

## Phase 9: Migration from `/me`

### Στόχος

Να περάσουμε από το σημερινό device-centric `/me` σε account-centric `/account`.

### Tickets

#### P9.1 Repoint internal links

- `/claim`
- `/enroll`
- redirects after successful flows

#### P9.2 Make `/me` a compatibility shell

- προσωρινά φορτώνει account summary

#### P9.3 Convert `/me` to redirect

- όταν το νέο account area είναι stable

### Deliverable

Το παλιό private entry point δεν μένει ως τεχνικό χρέος.

## Phase 10: Cleanup and Hardening

### Στόχος

Να σταθεροποιηθεί το νέο σύστημα.

### Tickets

#### P10.1 Permissions audit

- public vs private routes
- no friendly exposure

#### P10.2 Data integrity checks

- no duplicate accounts per player
- no orphan pending records
- no split friendly history after merge

#### P10.3 UI language audit

- όλα τα labels παραμένουν στα αγγλικά

#### P10.4 Logging and monitoring

- enroll completion errors
- account linking failures
- merge failures

### Deliverable

Production-ready private player area with safe boundaries.

## Προτεινόμενη Σειρά Υλοποίησης Ανά Repo

## `1-billiards-strapi`

1. `player-account`
2. extend `player-enrollment-request`
3. extend `friendly-match`
4. account APIs
5. approval / merge logic

## `4-billiardtoday-frontend`

1. auth/private route shell
2. `/account/complete-profile`
3. `/account`
4. `/account/friendly`
5. `/account/profile`
6. `/account/tournaments`
7. `/account/devices`
8. `/me` migration

## `3-BilliatdToday-Scoreboard`

1. final match persistence payload review
2. notes/tags/venue support
3. delayed profile completion messaging

## `2-billiardtoday-admin`

1. pending review improvements
2. approval flow
3. merge flow
4. audit trail

## Προτεινόμενο MVP Cut

Αν θέλουμε γρήγορο αλλά σωστό MVP:

- Phase 1
- Phase 2
- Phase 3
- Phase 4
- Phase 6
- Phase 7

Δηλαδή:

- account foundation
- profile completion after scoreboard enroll
- friendly persistence
- private friendly page
- basic dashboard
- device management

Το private tournaments section μπορεί να ακολουθήσει αμέσως μετά, αν θέλουμε να κόψουμε scope στην πρώτη παράδοση.

## Άμεσο Επόμενο Βήμα

Το επόμενο πρακτικό βήμα προτείνεται να είναι:

1. να ανοίξει η `Phase 1`
2. να γραφτεί ακριβές schema για `player-account`
3. να χαρτογραφηθούν τα υπάρχοντα `player-device`, `player-enrollment-request`, `friendly-match`
4. να ξεκινήσει η backend υλοποίηση στο Strapi
