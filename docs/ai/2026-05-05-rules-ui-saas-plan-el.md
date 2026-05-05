# Rules UI SaaS Plan

Ημερομηνία: 2026-05-05

Αυτό το document ανοίγει νέο scope μετά το κλείσιμο του αρχικού Competition Rules Engine task.

Σκοπός του νέου scope:

- να μετατρέψει το σημερινό internal rules UI σε SaaS-friendly experience
- να γίνει κατάλληλο για μελλοντικά admin surfaces για `club` και `federation` χρήστες
- να κρατήσει τον ίδιο backend rules engine, αλλά με πολύ πιο απλό και καθοδηγούμενο UI
- να ξεκινήσει η club SaaS εμπειρία με dashboard, player onboarding και καθαρό permission model

## Repos

- Backend / Strapi: `D:\Projects\1-billiards-strapi`
- Public frontend: `D:\Projects\4-billiardtoday-frontend`
- Admin app: `D:\Projects\2-billiardtoday-admin`
- Scoreboard app: `D:\Projects\3-BilliatdToday-Scoreboard`

## Current State

Υπάρχει ήδη working internal admin UI στο:

- `https://admin.billiardtoday.com/admin/tournament/edit?tid=...`

και στο repo:

- `D:\Projects\2-billiardtoday-admin\src\app\(protected-pages)\admin\tournament\edit\page.tsx`

Το σημερινό UI υποστηρίζει:

- tournament-level rules
- event-level rules
- phase-level overrides
- explicit / inherited visibility
- structured `ruleset_config` editing

Αυτό είναι σωστό για internal operators, αλλά είναι πολύ βαρύ για νέο χρήστη ή SaaS customer.

## Product Decision

Ο backend rules engine παραμένει κοινός.

Δεν θα φτιαχτεί διαφορετικός engine για club / federation.

Θα χτιστούν διαφορετικά admin experiences πάνω στον ίδιο engine:

- `Internal Admin`
  - full visibility
  - full overrides
  - debugging and exception workflows

- `Federation Admin`
  - preset-based configuration
  - controlled overrides
  - limited advanced settings

- `Club Admin`
  - very simple setup flow
  - mostly templates / recommended defaults
  - no raw engine language

## UX Problem To Solve

Ο νέος χρήστης δεν πρέπει να ξεκινά με:

- `ruleset_key`
- inheritance hierarchy
- phase override complexity
- low-level ranking terminology

Ο νέος χρήστης πρέπει να απαντά εύκολα:

1. Τι είδους διοργάνωση φτιάχνω;
2. Ποιο rules profile ταιριάζει;
3. Θέλω default behavior ή κάποια εξαίρεση;

## Target UX Direction

### 1. Basic / Advanced split

Το rules UI πρέπει να έχει δύο modes:

- `Basic`
- `Advanced`

Default view:

- `Basic`

Το `Advanced` ανοίγει μόνο όταν ο χρήστης το ζητήσει.

### 2. Basic mode structure

Προτεινόμενη ροή:

1. `Competition Type`
   - Standard tournament
   - CEB Youth / U21
   - Artistic
   - Other / custom

2. `Competition Rules Profile`
   - human-readable labels
   - μικρό explanatory text κάτω από κάθε επιλογή

3. `Final Standings Behavior`
   - use default
   - publish manually
   - custom behavior

4. `Phase-specific Exceptions`
   - collapsed by default
   - hidden unless really needed

### 3. Advanced mode structure

Το σημερινό internal model μπορεί να μείνει σχεδόν όπως είναι:

- Tournament
- Linked Event
- Phases
- structured config overrides

Αλλά θα πρέπει να εμφανίζεται μόνο σε:

- internal admins
- power users
- federation roles με elevated permissions

## Language / Guidance Requirements

Οι οδηγίες πρέπει να υπάρχουν inline, χωρίς να φεύγει ο χρήστης από τη σελίδα.

Απαιτήσεις:

- multilingual help με βάση τη γλώσσα UI
- short helper text κάτω από fields
- expandable `What is this?` sections
- optional side panel / drawer with longer explanations

Το help content πρέπει να μπει σε translation/messages keys και όχι hardcoded.

Παραδείγματα message groups:

- `rules.intro.title`
- `rules.intro.body`
- `rules.profile.default.help`
- `rules.profile.ceb_youth.help`
- `rules.profile.artistic.help`
- `rules.advanced.title`
- `rules.phases.optionalHelp`

## Naming Changes

Ορολογία που πρέπει να γίνει πιο ανθρώπινη στο simplified UI:

- `Ruleset Key` -> `Competition Rules Profile`
- `Inherited / heuristic` -> `Using default tournament rules`
- `Explicit ruleset` -> `Custom rules for this section`
- `Stage overrides` -> `Phase-specific exceptions`
- `Stages` -> `Φάσεις` στα ελληνικά user-facing labels
- `Groups` -> `Όμιλοι` όταν μιλάμε για tournament groups, όχι `Ομάδες`
- `Advance per Group` -> `Προκρίνονται ανά όμιλο`
- `Group size` -> `Μέγεθος ομίλου`

## Permission Strategy

Το νέο scope πρέπει να σχεδιαστεί μαζί με permission model.

Προτεινόμενη κατεύθυνση:

- Internal admin:
  - full rules editor
  - full club/federation visibility

- Federation admin:
  - basic mode by default
  - advanced mode only for approved capabilities
  - visibility only inside federation scope

- Club Owner:
  - full club management inside own club
  - can manage club players, guests, teams and club tournaments
  - cannot select another club

- Club Manager:
  - operational club management inside own club
  - can manage club players, guests, teams and club tournaments
  - cannot select another club

## Federation Roles

Federation roles should be prepared alongside club roles.

Initial role names:

- `Federation President`
- `Federation Manager`

Avoid `Federation Owner`.

## Club SaaS Dashboard

Ξεκινάμε το club-facing SaaS surface από απλό dashboard στο admin app.

Αρχική σελίδα:

- `/clubs`

Boxes:

- `Players`
- `Tournaments`
- `Club Management`
- `Ads`

Απαιτήσεις:

- EL / EN translations από την αρχή
- όχι internal admin table ως πρώτη εμπειρία
- κάθε box οδηγεί σε καθαρή περιοχή εργασίας
- το Club UI πρέπει να μπορεί αργότερα να γίνει wizard-based, ειδικά για tournaments

## Player Identity Model

Δεν πρέπει να γεμίσει το official `BT Players` registry με casual ή internal club players.

Χωρίζουμε τα concepts:

### `player-account`

Η προσωπική ταυτότητα/login του ανθρώπου.

Χρησιμοποιείται για:

- login
- trusted devices
- private account dashboard
- friendly/internal match history
- player-facing subscription status
- σύνδεση με official BT Player όταν εγκριθεί

Η συνδρομή προς BilliardToday αφορά τον παίκτη και το `player-account`. Δεν αφορά τον club manager και δεν πρέπει να τη διαχειρίζεται το club.

### `bt-player`

Το official/canonical αγωνιστικό προφίλ στο BilliardToday.

Χρησιμοποιείται για:

- official tournaments
- public player profile
- rankings
- overall official statistics
- federation/BT verified player identity

Δεν δημιουργείται αυτόματα από club manager.

Αλλαγές σε official BT Player από club user πρέπει να μπαίνουν σε approval flow. Η έγκριση θα γίνεται αργότερα από την αντίστοιχη ομοσπονδία ή από internal admin.

### `club-player-membership`

Η σχέση ενός παίκτη με ένα club.

Δεν είναι duplicate player.

Παράδειγμα:

- ίδιο `player-account`
- optional linked `bt-player`
- membership στο Club A ως `member`
- guest participation στο Club B ως `guest`

Προτεινόμενα fields:

- `club`
- `playerAccount`
- optional `btPlayer` ή derived από `playerAccount.player`
- `membershipStatus`: `active`, `invited`, `pending`, `blocked`
- `role`: `member`, `guest`, `staff`
- `accountStatus`: system-managed summary, όχι club-editable business field
- `joinedAt`
- `createdByClub`

Να μην χρησιμοποιηθεί νέο πεδίο `status` σε Strapi 5 schemas. Για νέα models προτιμάμε ονόματα όπως `membershipStatus`, `requestState`, `subscriptionState`.

## Club Player / Guest Tournament Flow

Ένας παίκτης άλλου συλλόγου πρέπει να μπορεί να παίξει σε club tournament χωρίς να αλλάζει ιδιοκτησία ή official affiliation.

Προτεινόμενες ροές:

### 1. Search / Invite

Ο club manager προσθέτει guest player με:

- email
- phone
- existing player account search
- existing BT Player search

Αν υπάρχει account, δημιουργείται tournament participation ως guest.

Αν δεν υπάρχει account, δημιουργείται invite / temporary enrollment.

### 2. Self-registration link

Το club tournament έχει registration link.

Ο παίκτης:

- κάνει login με player account
- ή δημιουργεί player account
- ή μπαίνει προσωρινά ως temporary player

### 3. Scoreboard QR / on-site registration

Ο παίκτης σκανάρει QR στο club.

Το σύστημα ξέρει το club από το screen και αργότερα μπορεί να ξέρει και το tournament/session.

Η υπάρχουσα ροή ήδη υποστηρίζει temporary enrollment μέσω:

- `/claim`
- `/enroll`
- `player-enrollment-request`
- `player-device`
- `player-account`
- admin approval queue

Χρειάζεται επέκταση ώστε να αποθηκεύεται `club` relation, όχι μόνο `clubName`.

## Player Enrollment Requests

Οι διαχειριστές club πρέπει να μπορούν να βλέπουν και να εγκρίνουν Player Enrollment Requests μόνο για το δικό τους club.

Αρχική υλοποίηση:

- νέο tab μέσα στο `Club Players`
- scoped λίστα pending requests
- approve action για requests του ίδιου club
- το approve πρέπει να περνάει από το υπάρχον Strapi custom endpoint, όχι από χειροκίνητο update fields
- η παλιά approval σελίδα στο public frontend πρέπει να σταματήσει αργότερα ή να μεταφερθεί πλήρως στο admin app

Σημαντικό:

- το υπάρχον Strapi approval endpoint δημιουργεί/συνδέει BT Player
- ενημερώνει Player Account
- μεταφέρει Player Devices
- ενημερώνει friendly matches
- γράφει verification event / history

Δεν πρέπει να παρακαμφθεί αυτή η ροή.

## BT Player Change Requests

Οι club users μπορούν να ζητήσουν αλλαγές για official BT Players, αλλά όχι να ενημερώνουν απευθείας το official profile.

Προτεινόμενο model:

- `bt-player-change-request`
- `requestState`: `pending`, `approved`, `rejected`, `cancelled`
- `requestSource`: `club_manager`, `club_owner`, `federation_manager`, `federation_president`, `admin`
- `submittedByEmail`
- `currentSnapshot`
- `requestedChanges`
- `reviewNotes`
- `reviewedAt`
- relations: `club`, `federation`, `btPlayer`

Η έγκριση θα υλοποιηθεί σε επόμενη φάση από federation/internal admin surface.

## Existing Player Account Flow To Extend

Σήμερα υπάρχουν ήδη:

- Strapi `player-account`
- Strapi `player-enrollment-request`
- Strapi `player-device`
- public frontend `/claim`
- public frontend `/enroll`
- public frontend `/account`
- admin approval queue `/admin/player-enrollment-requests`

Σημερινή ροή:

1. Ο παίκτης σκανάρει scoreboard QR.
2. Αν δεν έχει trusted device, πάει στο `/enroll`.
3. Δημιουργείται temporary `player-enrollment-request`.
4. Δημιουργείται `player-device`.
5. Ο παίκτης μπορεί να παίξει ως temporary identity.
6. Αν ολοκληρώσει account, δημιουργείται `player-account`.
7. Αν ζητηθεί official verification, ο admin εγκρίνει ή απορρίπτει.
8. Μόνο μετά από approval γίνεται link/create σε `bt-player`.

Αυτό είναι σωστή βάση και πρέπει να επεκταθεί, όχι να αντικατασταθεί.

Νέα tasks:

- προσθήκη `club` relation στο `player-enrollment-request`
- προσθήκη `homeClub` ή `createdByClub` στο `player-account`
- δημιουργία `club-player-membership`
- όταν enrollment γίνεται από scoreboard screen, να αποθηκεύεται το πραγματικό `club.id`
- όταν account δημιουργείται από enrollment, να μεταφέρεται το club context
- club players page να δείχνει memberships/player accounts scoped στο current club
- tournament registration να μπορεί να προσθέτει members και guests

## Tournament Participation / Statistics Scope

Τα club tournaments πρέπει να μπορούν να δεχτούν:

- club members
- guest player accounts από άλλα clubs
- linked BT Players
- local/temporary player identities

Τα στατιστικά δεν πρέπει να γράφονται πάντα στο official overall BT stats.

Προτεινόμενο field:

`statisticsScope`

Τιμές:

- `private_club`
- `player_account`
- `bt_overall_eligible`
- `official`

Default για internal club tournament:

- `player_account`

Κανόνας:

- Αν participant έχει linked `BT Player` και το tournament είναι eligible, τότε τα αποτελέσματα μπορούν να γράφονται και στο overall statistics.
- Αν participant έχει μόνο `player-account`, τότε τα αποτελέσματα φαίνονται στο account του και στο club tournament history.
- Αν αργότερα γίνει link σε `BT Player`, να υπάρχει δυνατότητα backfill/merge για eligible stats.

## Club Tournament Management

Το club-facing tournament surface πρέπει να ξεκινήσει πολύ πιο απλά από το internal tournament admin.

Αρχική υλοποίηση:

- `/clubs/tournaments`
- scoped λίστα τουρνουά ανά club
- οι `Club Owner` και `Club Manager` βλέπουν μόνο το δικό τους club
- δεν υπάρχει επιλογή club για scoped club χρήστες
- δημιουργία τουρνουά με wizard οθόνες
- ασφαλείς default τιμές για rules / format / statistics scope

Προτεινόμενα wizard βήματα:

1. Βασικά στοιχεία
   - όνομα τουρνουά
   - ημερομηνία έναρξης / λήξης
   - τύπος παιχνιδιού
   - κατηγορία

2. Μορφή διοργάνωσης
   - Όμιλοι + Νοκ άουτ
   - Όλοι με όλους
   - Μόνο νοκ άουτ

3. Έλεγχος και δημιουργία
   - περίληψη επιλογών
   - δημιουργία με recommended defaults

Default για club-created tournament:

- `organizer_type`: `club`
- `competitionScope`: `club`
- `participantMode`: `club_members_and_guests`
- `statisticsScope`: `player_account`
- `ruleset_key`: default engine profile
- advanced phase/rules editing να μην εμφανίζεται στο πρώτο wizard

### Federation Tournament Hosted In Clubs

Υπάρχει μελλοντική περίπτωση μια ομοσπονδία να διοργανώνει τουρνουά σε πολλά clubs.

Σε αυτή την περίπτωση:

- το tournament ownership ανήκει στην ομοσπονδία
- το club δεν πρέπει να βλέπει ή να αλλάζει federation-level setup
- το club πρέπει να μπορεί να διαχειριστεί μόνο το operational κομμάτι που γίνεται στο χώρο του
- παραδείγματα operational access:
  - αποστολή αγώνα σε οθόνες του club
  - καταγραφή αποτελεσμάτων
  - διαχείριση table/screen assignment για τους αγώνες που φιλοξενεί

Πιθανή μελλοντική απαίτηση στο data model:

- `hostClub` ή venue/screen scoped relation σε match/session/timetable slot
- permission rule: club user μπορεί να κάνει operate μόνο matches/sessions με `hostClub` το δικό του club
- federation/internal users κρατούν το full tournament configuration

## Player Account Subscription

Μελλοντικά όσοι έχουν `player-account` μπορεί να έχουν υποχρεωτική ετήσια συνδρομή.

Η συνδρομή δεν μπαίνει υποχρεωτικά από την αρχή.

Πρέπει όμως να προβλεφθεί από τώρα στο data model και στο player-facing UX.

Σημαντικό product boundary:

- η συνδρομή είναι σχέση παίκτη με το BilliardToday
- ο club manager δεν βλέπει και δεν διαχειρίζεται συνδρομές προς το BilliardToday
- το club UI βλέπει μόνο αν ο παίκτης είναι usable για club/tournament operations
- subscription status εμφανίζεται μόνο στο player account dashboard και σε internal BilliardToday billing/admin surfaces

### Product Decision Pending

Υπάρχουν δύο πιθανές go-to-market επιλογές:

1. Να ενημερώνονται από την αρχή:
   - "Σου δίνουμε 1 χρόνο δωρεάν χρήση."
   - Πλεονέκτημα: διαφάνεια, χτίζει εμπιστοσύνη.
   - Μειονέκτημα: μπορεί να δημιουργήσει friction πριν δουν αξία.

2. Να μη δοθεί εμπορική έμφαση στην αρχή και να ενημερωθούν 5-6 μήνες πριν τη λήξη:
   - Πλεονέκτημα: πρώτα δένονται με το προϊόν και βλέπουν αξία.
   - Μειονέκτημα: αν δεν έχει αναφερθεί καθόλου, μπορεί να φανεί αιφνιδιαστικό.

Προτεινόμενη μέση λύση:

- από την αρχή να υπάρχει ήπιο μήνυμα `Early access / free period`
- να μην εμφανίζεται επιθετικό payment CTA στην αρχή
- στο account dashboard να φαίνεται subscription status ως informational
- 5-6 μήνες πριν τη λήξη να ξεκινά structured reminder campaign

Παράδειγμα copy:

> Ο λογαριασμός σου είναι σε δωρεάν περίοδο γνωριμίας. Θα ενημερωθείς έγκαιρα πριν χρειαστεί ανανέωση.

Όχι:

> Σε 12 μήνες πρέπει να πληρώσεις.

### Subscription Model

Η συνδρομή αφορά `player-account`, όχι απαραίτητα `bt-player`.

Πιθανά content types:

`subscription-plan`

- `code`: `bt_player_annual`
- `name`
- `scope`: `bt`, `club`, `federation`
- `period`: `annual`
- `amount`
- `currency`
- `isActive`

`player-subscription`

- `playerAccount`
- `plan`
- optional `club`
- optional `federation`
- `subscriptionState`: `trial`, `active`, `pending`, `expired`, `grace_period`, `waived`
- `startsAt`
- `expiresAt`
- `amount`
- `currency`
- `paymentState`: `not_required`, `unpaid`, `paid`, `failed`, `refunded`
- `paymentProvider`
- `paymentReference`
- `notifiedAt`
- `reminderCount`

Στο `player-account` μπορεί να υπάρχει denormalized summary:

- `subscriptionState`
- `subscriptionExpiresAt`

### Subscription UX

Στο player account dashboard:

- `Membership / Subscription`
- status badge
- expiration date
- renewal information
- later payment CTA

Στο club manager:

- `Account missing`
- `Account invited`
- `Account active`
- `BT Player linked`
- `BT Player not linked`

Δεν εμφανίζεται BT subscription status στο club manager.

## Automatic Player Account Onboarding Email

Το player account onboarding είναι BilliardToday-owned automation.

Δεν υπάρχει club action τύπου `Send invite`.

Το club δεν πρέπει να έχει καμία ανάμειξη στη δημιουργία, ενεργοποίηση, συνδρομή ή ownership verification του BilliardToday account.

Μελλοντική ροή:

- όταν δημιουργείται player identity / participation / membership με email, για οποιονδήποτε λόγο, το σύστημα ελέγχει αν υπάρχει ήδη `player-account`
- αν δεν υπάρχει `player-account`, δημιουργείται onboarding token και στέλνεται αυτόματα email από BilliardToday
- το email οδηγεί τον παίκτη σε BilliardToday-owned account creation / account linking page
- μετά τη δημιουργία account, το σύστημα συνδέει το account με την αρχική εγγραφή όπου είναι ασφαλές
- το club UI βλέπει μόνο passive operational ένδειξη όπως `Account missing`, `Account invited`, `Account active`

Πιθανά trigger points:

- δημιουργία `club-player-membership` με email
- δημιουργία `player-enrollment-request` με email
- tournament registration με email
- scoreboard / enroll flow με email
- μελλοντικές public registration φόρμες

Απαιτήσεις:

- central Strapi service για onboarding email
- reusable email template
- token expiration
- cooldown / anti-spam, π.χ. όχι πάνω από ένα email ανά email/source ανά 24 ώρες
- audit fields όπως `sentAt`, `acceptedAt`, `lastReminderAt`
- καμία έκθεση subscription status ή account billing στο club manager

## Proposed Implementation Phases

### Phase 1

Refactor current internal admin rules tab:

- add `Basic / Advanced` toggle
- improve labels
- collapse phase overrides by default
- add inline help

### Phase 2

Add multilingual guidance:

- EL / EN content
- field hints
- helper drawer / accordion content

### Phase 3

Prepare role-based simplified views:

- federation-oriented layout
- club-oriented layout
- permission gating

### Phase 4

Start Club SaaS surface:

- `/clubs` dashboard with Players, Tournaments, Club Management, Ads
- EL / EN translations
- club players area as scoped club roster
- avoid exposing internal admin tables as first screen

### Phase 5

Player account / club membership foundation:

- add club context to enrollment requests
- add created/home club context to player accounts
- create `club-player-membership`
- design club players page around memberships and player accounts
- add guest participation concept for tournaments

### Phase 6

Club player management actions:

- edit club-local members and guests
- submit BT Player change requests instead of direct official edits
- approve scoped Player Enrollment Requests through the existing Strapi approval flow

### Phase 7

Automatic player account onboarding:

- central BilliardToday-owned onboarding email service
- automatic trigger from player identity creation flows with email
- public account creation/linking page from secure token
- no club manager action or subscription visibility

### Phase 8

Club tournament creation:

- scoped club tournament list
- wizard-based creation
- safe defaults for club tournaments
- no club selector for `Club Owner` / `Club Manager`
- document future federation-hosted-in-clubs operational model

### Phase 9

Tournament registration for clubs:

- members registration
- guest registration
- invite links
- player account onboarding prompt
- temporary participation allowed
- clear stats scope per tournament

### Phase 10

Subscription readiness:

- add subscription data model
- show subscription status in player account dashboard
- show account readiness / BT Player link status in club manager
- keep BT subscription status out of the club manager workflow
- keep payment enforcement disabled during initial free/early-access period
- decide exact free-period messaging before public launch

### Phase 11

Potential future extraction:

- reusable rules form components
- reusable presets card selector
- reusable club dashboard widgets
- shared role-based rules UI module
- shared player onboarding components

## Non-Goals For This New Task

This new UI scope should not reopen the already closed engine work unless a real bug appears.

Out of scope unless needed by a discovered blocker:

- changing the backend rules engine design again
- reworking production ruleset backfills
- changing existing verified CEB Youth ranking behavior
- redesigning the public tournament pages
- enforcing paid subscriptions immediately
- auto-creating BT Players from club-created players
- exposing BilliardToday player subscriptions to club managers

## Success Criteria

Το νέο UI θα θεωρηθεί επιτυχημένο όταν:

- ένας νέος χρήστης μπορεί να διαλέξει σωστό rules profile χωρίς να ξέρει τον engine
- ο internal admin δεν χάνει advanced control
- οι οδηγίες είναι διαθέσιμες inline στη σωστή γλώσσα
- το club/federation SaaS surface μπορεί να στηριχτεί στον ίδιο engine χωρίς να εκθέτει περιττή πολυπλοκότητα
- το club μπορεί να διαχειρίζεται δικούς του παίκτες χωρίς να μολύνει το official BT Players registry
- παίκτης άλλου club μπορεί να παίξει ως guest σε club tournament
- player account onboarding γίνεται φυσικά μέσα από tournament/scoreboard/club flows
- μελλοντική συνδρομή προβλέπεται στο model και στο player-facing UX, χωρίς να μπαίνει στο club manager workflow ή να μπλοκάρει το αρχικό adoption

## Starting Point

The original Competition Rules Engine task is closed.

This document is the new starting point for:

- simplified rules UX
- club / federation future admin flows
- multilingual operator guidance
- club SaaS dashboard
- player account onboarding
- club player memberships
- BT Player change requests
- scoped Player Enrollment Request approval
- automatic player account onboarding email
- future player subscription readiness
