# Rules UI SaaS Plan

Ημερομηνία: 2026-05-05

Αυτό το document ανοίγει νέο scope μετά το κλείσιμο του αρχικού Competition Rules Engine task.

Σκοπός του νέου scope:

- να μετατρέψει το σημερινό internal rules UI σε SaaS-friendly experience
- να γίνει κατάλληλο για μελλοντικά admin surfaces για `club` και `federation` χρήστες
- να κρατήσει τον ίδιο backend engine, αλλά με πολύ πιο απλό και καθοδηγούμενο UI

## Repos

- Backend / Strapi: `D:\Projects\1-billiards-strapi`
- Public frontend: `D:\Projects\4-billiardtoday-frontend`
- Admin app: `D:\Projects\2-billiardtoday-admin`

## Current State

Υπάρχει ήδη working internal admin UI στο:

- `https://admin.billiardtoday.com/admin/tournament/edit?tid=...`

και στο repo:

- `D:\Projects\2-billiardtoday-admin\src\app\(protected-pages)\admin\tournament\edit\page.tsx`

Το σημερινό UI υποστηρίζει:

- tournament-level rules
- event-level rules
- stage-level overrides
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
- stage override complexity
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
   - small explanatory text κάτω από κάθε επιλογή

3. `Final Standings Behavior`
   - use default
   - publish manually
   - custom behavior

4. `Stage-specific Exceptions`
   - collapsed by default
   - hidden unless really needed

### 3. Advanced mode structure

Το σημερινό internal model μπορεί να μείνει σχεδόν όπως είναι:

- Tournament
- Linked Event
- Stages
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
- `rules.stages.optionalHelp`

## Naming Changes

Ορολογία που πρέπει να γίνει πιο ανθρώπινη στο simplified UI:

- `Ruleset Key` -> `Competition Rules Profile`
- `Inherited / heuristic` -> `Using default tournament rules`
- `Explicit ruleset` -> `Custom rules for this section`
- `Stage overrides` -> `Stage-specific exceptions`

## Permission Strategy

Το νέο scope πρέπει να σχεδιαστεί μαζί με permission model.

Προτεινόμενη κατεύθυνση:

- Internal admin:
  - full rules editor

- Federation admin:
  - basic mode by default
  - advanced mode only for approved capabilities

- Club admin:
  - only basic mode
  - no raw stage/event/tournament hierarchy exposure
  - no low-level config field editing

## Proposed Implementation Phases

### Phase 1

Refactor current internal admin rules tab:

- add `Basic / Advanced` toggle
- improve labels
- collapse stage overrides by default
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

Potential future extraction:

- reusable rules form components
- reusable presets card selector
- shared role-based rules UI module

## Non-Goals For This New Task

This new UI scope should not reopen the already closed engine work unless a real bug appears.

Out of scope unless needed by a discovered blocker:

- changing the backend rules engine design again
- reworking production ruleset backfills
- changing existing verified CEB Youth ranking behavior
- redesigning the public tournament pages

## Success Criteria

Το νέο UI θα θεωρηθεί επιτυχημένο όταν:

- ένας νέος χρήστης μπορεί να διαλέξει σωστό rules profile χωρίς να ξέρει τον engine
- ο internal admin δεν χάνει advanced control
- οι οδηγίες είναι διαθέσιμες inline στη σωστή γλώσσα
- το club/federation SaaS surface μπορεί να στηριχτεί στον ίδιο engine χωρίς να εκθέτει περιττή πολυπλοκότητα

## Starting Point

The original Competition Rules Engine task is closed.

This document is the new starting point for:

- simplified rules UX
- club / federation future admin flows
- multilingual operator guidance
