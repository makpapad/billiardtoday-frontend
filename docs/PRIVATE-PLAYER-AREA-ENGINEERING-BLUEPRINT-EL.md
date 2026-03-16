# Τεχνικό Blueprint Υλοποίησης Ιδιωτικής Σελίδας Παίκτη

## Σκοπός του εγγράφου

Το παρόν έγγραφο μετατρέπει το functional spec της ιδιωτικής σελίδας παίκτη σε πρακτικό τεχνικό πλάνο υλοποίησης.

Εστιάζει στα εξής:

- content types / collections
- ροές δεδομένων
- frontend routes
- backend API contracts
- αλλαγές ανά repo
- rollout plan

## Επιβεβαιωμένες Παραδοχές

- Όλα τα user-facing labels σε `billiardtoday.com`, `scoreboard`, `admin` και συναφείς εφαρμογές θα είναι στα αγγλικά.
- Δημόσια θα είναι μόνο τα αποτελέσματα τουρνουά.
- Τα φιλικά παιχνίδια θα είναι μόνο private.
- Τα φιλικά δεν θα είναι live.
- Τα φιλικά θα αποθηκεύονται μόνο όταν ολοκληρώνεται το παιχνίδι.
- Ένας παίκτης αντιστοιχεί σε έναν λογαριασμό.
- Οι pending χρήστες θα βλέπουν partial data πριν από το approval.
- Το scoreboard enroll δεν θα απαιτεί πλήρες registration την ίδια στιγμή.

## Υφιστάμενη Κατάσταση στο Codebase

Σήμερα υπάρχουν ήδη:

- trusted device flow
- `/claim`
- `/enroll`
- `/me`
- Strapi APIs για:
  - `player-device`
  - `player-enrollment-request`
  - `friendly-match`
  - `scoreboard-player-link`
- frontend proxy routes για:
  - register
  - resolve
  - enrollment request
  - claim
  - my devices
  - my friendly matches

Άρα δεν ξεκινάμε από το μηδέν. Το σωστό είναι να επεκτείνουμε το υπάρχον μοντέλο, όχι να το πετάξουμε.

## Στόχος Αρχιτεκτονικής

Να μετατραπεί το σημερινό device-centric private flow σε account-centric private player area, χωρίς να χαθεί η ταχύτητα του scoreboard QR flow.

### Τελικό σχήμα

1. `BT Player`
2. `Player Account`
3. `Trusted Device`
4. `Player Enrollment Request`
5. `Friendly Match Result`

## Προτεινόμενη Αρχιτεκτονική Ανά Επίπεδο

### 1. Αγωνιστική Ταυτότητα

Η αγωνιστική ταυτότητα θα παραμένει το `BT Player`.

Εκεί συνδέονται:

- tournament results
- canonical player identity
- public player profile

### 2. Ιδιωτική Ταυτότητα

Η ιδιωτική ταυτότητα θα είναι ένα `Player Account`.

Ο λογαριασμός:

- κάνει login
- έχει 1:1 σχέση με player
- ανοίγει πρόσβαση στο private area

### 3. Συσκευή

Το `Trusted Device` παραμένει:

- operational convenience layer
- scoreboard claim flow
- όχι primary auth layer

### 4. Pending / προσωρινές εγγραφές

Το `Player Enrollment Request` παραμένει ο μηχανισμός εισόδου για:

- temporary enrollments
- later profile completion
- admin approval / merge

### 5. Ιστορικό φιλικών

Το `Friendly Match` γίνεται η canonical private εγγραφή φιλικού αγώνα.

## Προτεινόμενα Strapi Content Types

## A. Νέο content type: `player-account`

### Σκοπός

Να κρατά το ιδιωτικό account του παίκτη.

### Πεδία

- `email`
  - string
  - unique
- `passwordHash`
  - password ή private string
- `status`
  - enum:
    - `active`
    - `pending_verification`
    - `disabled`
- `player`
  - relation one-to-one προς `bt-player`
- `enrollmentRequest`
  - optional relation one-to-one προς `player-enrollment-request`
- `lastLoginAt`
  - datetime
- `profileCompletedAt`
  - datetime

### Constraints

- unique `email`
- unique `player`

## B. Επέκταση `player-enrollment-request`

### Υφιστάμενος ρόλος

Χρησιμοποιείται ήδη για προσωρινές εγγραφές από scoreboard.

### Νέα πεδία

- `profileClaimToken`
  - string
  - indexed
- `profileClaimExpiresAt`
  - datetime
- `accountCompletionStatus`
  - enum:
    - `not_started`
    - `started`
    - `completed`
- `linkedAccount`
  - optional relation προς `player-account`
- `approvalStatus`
  - αν χρειάζεται ξεχωριστά από το υπάρχον `status`
- `source`
  - enum ή string
  - π.χ. `scoreboard_qr`, `manual_enrollment`

### Χρήση

Θα επιτρέπει:

- delayed completion από mobile/desktop
- re-entry στο flow με ασφαλές token
- linking pending identity με κανονικό account

## C. Επέκταση `player-device`

### Νέα πεδία / relations

- `linkedAccount`
  - optional relation προς `player-account`
- `lastClaimedAt`
  - datetime
- `lastScreenIdentifier`
  - string

### Χρήση

Για να μπορούμε:

- να δείχνουμε trusted devices στον λογαριασμό
- να συσχετίζουμε device activity με private account

## D. Επέκταση `friendly-match`

Υπάρχει ήδη schema. Χρειάζεται να καλύπτει πλήρως private ιστορικό.

### Απαιτούμενα πεδία

- `sessionId`
- `playedAt`
- `player1`
  - relation σε `bt-player`
- `player2`
  - relation σε `bt-player`
- `player1EnrollmentRequest`
  - relation
- `player2EnrollmentRequest`
  - relation
- `player1NameSnapshot`
- `player2NameSnapshot`
- `score1`
- `score2`
- `innings`
- `highRun1`
- `highRun2`
- `winnerPlayer`
  - optional relation σε `bt-player`
- `club`
  - relation σε `club`
- `clubNameSnapshot`
- `venueName`
- `tableLabel`
- `notes`
  - text
- `tags`
  - JSON array ή component / relation, ανάλογα το Strapi μοντέλο που θέλουμε
- `status`
  - `completed`
  - `voided`
- `submittedByScreenId`
- `isPrivate`
  - boolean, default `true`

### Κανόνας

Τα `friendly-match` δεν πρέπει να επιστρέφονται ποτέ από public endpoints.

## E. Προαιρετικό νέο content type: `player-activity`

### Σκοπός

Να έχουμε unified feed.

### Πρόταση

Όχι στην πρώτη φάση.

Καλύτερα να υπολογίζεται aggregation layer από:

- tournament results
- friendly matches

και αν αργότερα χρειαστεί performance optimization, τότε να γίνει denormalized feed table.

## Frontend Route Map

## Public

- `/players/[id]`
  - public profile
  - tournament-only
- `/tournaments`
- `/tournaments/[slug]`
- `/tournaments/events`

## Private

- `/account`
  - dashboard
- `/account/tournaments`
  - private tournaments
- `/account/friendly`
  - private friendly matches
- `/account/devices`
  - device management
- `/account/profile`
  - account and profile details
- `/account/complete-profile`
  - finish later flow after scoreboard enrollment

## Transitional

- `/me`
  - προσωρινά redirect σε `/account`

## Frontend Component Plan

## `src/app/account/page.tsx`

Dashboard page:

- player summary
- approval state
- quick stats
- recent activity

## `src/app/account/tournaments/page.tsx`

- year filters
- game type filters
- tournament cards or table
- details link

## `src/app/account/friendly/page.tsx`

- list of completed friendly matches
- filters:
  - date
  - club
  - tags
  - opponent
- notes and metadata rendering

## `src/app/account/devices/page.tsx`

- current device
- all active devices
- revoke action

## `src/app/account/profile/page.tsx`

- account email
- player identity
- approval state
- completion prompts

## `src/app/account/complete-profile/page.tsx`

- consumes `claim` token
- allows account creation or login
- links pending scoreboard enrollment with player account

## Backend API Blueprint

## Public APIs

### `GET /api/public/players/:id/tournaments`

### Response

- public tournament participations only

### `GET /api/public/tournaments/...`

As-is or via existing routes.

## Private APIs

### `GET /api/account/summary`

#### Επιστρέφει

- player basic identity
- approval state
- counts:
  - tournament matches
  - friendly matches
  - wins
  - devices
- last activity entries

### `GET /api/account/profile`

#### Επιστρέφει

- email
- player link
- enrollment request state
- profile completion state
- approval state

### `GET /api/account/tournaments`

#### Επιστρέφει

- tournament-only results για τον logged-in player
- φίλτρα:
  - year
  - game type
  - page

### `GET /api/account/friendly`

#### Επιστρέφει

- private friendly results
- φίλτρα:
  - date range
  - club
  - opponent
  - tags

### `GET /api/account/activity`

#### Επιστρέφει

- normalized feed entries:
  - `type: tournament`
  - `type: friendly`

### `GET /api/account/devices`

#### Επιστρέφει

- active devices
- revoked devices αν θέλουμε ιστορικό
- current device flag

### `POST /api/account/devices/revoke`

#### Input

- `deviceId`

#### Result

- revoke trusted device

## Completion / Linking APIs

### `POST /api/account/claim/start`

#### Χρήση

Ξεκινά account completion πάνω σε enrollment request ή trusted device context.

#### Input

- `enrollmentRequestId` ή `trustedDeviceToken`

#### Output

- `claimToken`
- `expiresAt`

### `GET /api/account/complete-profile`

#### Query

- `claim`

#### Result

- validates token
- loads pending profile summary

### `POST /api/account/claim/complete`

#### Input

- `claimToken`
- `email`
- `password`
- optional extra profile fields

#### Result

- creates or links account
- marks profile completion as started/completed
- signs in user

## Admin APIs

### `GET /api/admin/player-enrollment-requests`

Pending queue.

### `POST /api/admin/player-enrollment-requests/:id/approve`

Approve and link to canonical player.

### `POST /api/admin/player-enrollment-requests/:id/reject`

Reject request.

### `POST /api/admin/player-enrollment-requests/:id/merge`

Merge pending identity into canonical BT player.

## Προτεινόμενη Αντιστοίχιση σε Υπάρχοντα Routes

## Σήμερα

Υπάρχουν ήδη:

- `src/app/api/player-devices/register/route.ts`
- `src/app/api/player-devices/resolve/route.ts`
- `src/app/api/player-devices/enrollment-request/route.ts`
- `src/app/api/player-devices/claim/route.ts`
- `src/app/api/me/friendly-matches/route.ts`
- `src/app/api/me/devices/route.ts`

## Πρόταση μετάβασης

### Βραχυπρόθεσμα

Κρατάμε τα υπάρχοντα routes για backward compatibility.

### Μεσοπρόθεσμα

Προσθέτουμε:

- `src/app/api/account/summary/route.ts`
- `src/app/api/account/profile/route.ts`
- `src/app/api/account/tournaments/route.ts`
- `src/app/api/account/friendly/route.ts`
- `src/app/api/account/activity/route.ts`
- `src/app/api/account/devices/route.ts`
- `src/app/api/account/claim/start/route.ts`
- `src/app/api/account/claim/complete/route.ts`

### Μεταβατική στρατηγική

- το `/me` να συνεχίσει να λειτουργεί
- τα δεδομένα του `/me` να αντλούνται σταδιακά από account-based endpoints
- όταν ολοκληρωθεί η μετάβαση, `/me` να γίνει redirect ή simple compatibility shell

## Authentication Strategy

## Κανόνας

Το private area δεν πρέπει να βασίζεται μόνο σε device token.

### Προτεινόμενος μηχανισμός

- account session
- cookie-based auth
- player linked to session
- trusted device ως secondary claim helper

## Μεταβατική λειτουργία

Μέχρι να ολοκληρωθεί το full auth layer:

- μπορούμε να χρησιμοποιούμε trusted device στο `/me`
- αλλά τα νέα `/account/*` routes πρέπει να σχεδιαστούν για session auth

## Friendly Match Write Flow

## Trigger

Η καταχώριση γίνεται μόνο στο τέλος φιλικού αγώνα.

## Flow

1. Το scoreboard ολοκληρώνει session.
2. Το scoreboard ή ws/backend service στέλνει τελικό payload.
3. Το Strapi δημιουργεί `friendly-match`.
4. Το αποτέλεσμα συνδέεται:
  - με `bt-player` όπου υπάρχει canonical player
  - με `player-enrollment-request` όπου υπάρχει temporary identity
5. Το αποτέλεσμα γίνεται διαθέσιμο μόνο στα private account endpoints.

## Required payload

- session id
- players
- scores
- innings
- high runs
- finished timestamp
- screen id
- club / venue / table
- notes
- tags

## Tournament Data Read Flow

Τα tournament δεδομένα δεν χρειάζονται νέο source of truth.

Θα διαβάζονται από το υπάρχον tournament/event μοντέλο και θα εκτίθενται:

- public από public endpoints
- private από filtered account endpoints

## Pending User Data Strategy

Pending account μπορεί να συνδέεται με:

- `player-enrollment-request`
- temporary device identity

### Τι βλέπει

- friendly matches που σχετίζονται με το enrollment request
- devices
- profile completion state

### Τι δεν βλέπει

- full verified tournament profile άλλου canonical player

### Μετά το approval / merge

Τα private endpoints πρέπει να επιστρέφουν:

- unified canonical player data
- migrated / connected friendly results

## Migration Strategy

## Βήμα 1

Κρατάμε τα υπάρχοντα:

- `/claim`
- `/enroll`
- `/me`

και προσθέτουμε account-aware metadata.

## Βήμα 2

Προσθέτουμε `player-account` και session auth.

## Βήμα 3

Υλοποιούμε `/account/*`.

## Βήμα 4

Συνδέουμε scoreboard enrollment με delayed profile completion.

## Βήμα 5

Κάνουμε το `/me` redirect σε `/account`.

## Repo-by-Repo Work Plan

## Repo: `1-billiards-strapi`

### Αλλαγές

- νέο content type `player-account`
- επέκταση `player-enrollment-request`
- πιθανή επέκταση `player-device`
- επέκταση `friendly-match`
- νέα account APIs
- νέα claim completion APIs
- admin merge / approval flow refinement

### Ενδεικτικά tasks

- add schemas
- add controllers/services/routes
- add permissions
- add validation

## Repo: `4-billiardtoday-frontend`

### Αλλαγές

- νέες private pages `/account/*`
- νέο profile completion route
- μετάβαση από `/me`
- νέοι API proxy routes
- auth session integration

### Ενδεικτικά tasks

- build account layout
- build dashboard
- build friendly tab
- build tournaments tab
- build devices tab
- build profile completion page

## Repo: `3-BilliatdToday-Scoreboard`

### Αλλαγές

- διατήρηση current claim/enroll flow
- enrich completion payload at end-of-match
- include notes/tags/venue metadata where applicable
- support later account completion hints

### Ενδεικτικά tasks

- final session result payload normalization
- completion message / optional follow-up CTA
- ensure linked identities are persisted correctly

## Repo: `2-billiardtoday-admin`

### Αλλαγές

- admin queue for enrollment requests
- merge tooling
- approval tooling
- visibility into pending profiles and linked results

### Ενδεικτικά tasks

- pending player review screen
- merge with canonical BT player
- audit trail for approvals

## Φάσεις Rollout

## Phase 1

- backend account model
- frontend account auth scaffold
- no breaking change to claim/enroll

## Phase 2

- friendly result storage hardening
- account completion token flow

## Phase 3

- `/account`
- `/account/friendly`
- `/account/devices`

## Phase 4

- `/account/tournaments`
- pending state handling
- profile completion UI

## Phase 5

- admin approval / merge tooling
- `/me` migration

## Risks

### 1. Duplicate player identities

Υπάρχει ρίσκο ένας pending user να αντιστοιχεί σε υπάρχον canonical BT player.

Αντιμετώπιση:

- merge tooling
- explicit approval workflow

### 2. Friendly results tied only to temporary enrollments

Αν δεν γίνει σωστό link μετά το approval, υπάρχει κίνδυνος split history.

Αντιμετώπιση:

- πάντα store relation και σε canonical player και σε enrollment request όπου γίνεται
- merge migration on approval

### 3. Over-reliance on trusted device

Αν παραμείνει το private access device-based, θα είναι δύσκολη η σωστή διαχείριση λογαριασμών.

Αντιμετώπιση:

- account session as primary auth

### 4. Public/private leakage

Friendly results δεν πρέπει να διαρρεύσουν σε public profile.

Αντιμετώπιση:

- strict endpoint separation
- no friendly joins in public routes

## MVP Υλοποίησης

Για πρώτη τεχνική υλοποίηση προτείνεται:

- νέο `player-account`
- επέκταση `player-enrollment-request`
- account completion token flow
- private dashboard
- private friendly tab
- private tournaments tab
- private devices tab
- pending partial access

## Προτεινόμενη Σειρά Υλοποίησης

1. Strapi content types και relations
2. backend account / claim APIs
3. frontend auth-private routes scaffold
4. `/account/friendly`
5. `/account/profile`
6. `/account/tournaments`
7. admin approval / merge tools
8. migration `/me` -> `/account`

## Άμεσα Παραδοτέα για την επόμενη φάση

Από αυτό το blueprint, το επόμενο πρακτικό τεχνικό βήμα είναι να παραχθούν:

- αναλυτικά API schemas ανά route
- exact Strapi schema definitions
- migration checklist ανά repo
- breakdown σε implementation tickets
