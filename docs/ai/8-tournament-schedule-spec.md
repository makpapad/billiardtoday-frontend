# Tournament Schedule (Admin-First) - Technical Spec

## Στόχος

Να υλοποιηθεί timetable αγώνων ανά tournament stage, που:

- ξεκινά από admin configuration,
- βασίζεται στους αγώνες που παράγονται από groups/bracket,
- υποστηρίζει ημερομηνία, ώρα έναρξης, διάρκεια, τραπέζι,
- επιτρέπει manual edits μετά το auto-generation,
- δημοσιεύεται για read-only προβολή στο frontend.

## Repos που αγγίζονται

1. `1-billiards-strapi` (αν χρειαστεί persistence schema)
2. `2-billiardtoday-admin` (editor + admin API)
3. `4-billiardtoday-frontend` (public schedule view)

## Κύριες Αρχές

- Source of truth για επεξεργασία: Admin.
- Public προβολή μόνο από `published` schedule.
- Re-generation χωρίς απώλεια manual αλλαγών όπου είναι εφικτό.
- Deterministic mapping μεταξύ bracket/group match και schedule entry.

## Domain Model

### `ScheduleEntry`

Προτεινόμενα πεδία:

- `id`
- `tournamentId`
- `stageId`
- `phaseKey` (π.χ. `PPQ`, `PQ`, `QUAL`, `L32`, `FINAL`)
- `matchRef` (σταθερό reference από group/bracket match)
- `groupLabel` (π.χ. `A`, `B`, `R16-1`)
- `player1Ref` / `player2Ref` (ή team refs όπου χρειάζεται)
- `startsAt` (ISO datetime)
- `durationMinutes`
- `tableCode` (π.χ. `T1`, `T2`)
- `status` (`draft` | `published` | `completed`)
- `isManual` (boolean lock για χειροκίνητο override)
- `notes` (optional)
- `updatedBy`, `updatedAt`

### `StageScheduleSettings`

Ρυθμίσεις ανά stage:

- `stageId`
- `stageStartAt`
- `defaultDurationMinutes`
- `breakMinutes`
- `tables` (λίστα: `T1`, `T2`, ...)
- `schedulingMode` (`sequential` | `parallel-by-table`)

## Auto-Generation Λογική

Είσοδος:

- λίστα matches του stage με σταθερά `matchRef`
- stage settings (`start`, `duration`, `break`, `tables`)

Έξοδος:

- draft `ScheduleEntry` για κάθε match

Βασικός αλγόριθμος:

1. Ταξινόμηση matches με deterministic order (group order + round order + match order).
2. Δημιουργία time slots:
   - `slotDuration = durationMinutes + breakMinutes`
   - ανάθεση στο επόμενο διαθέσιμο table/slot.
3. Γέμισμα `startsAt`, `tableCode` ανά match.
4. Save ως `draft`.

## Re-Generation / Merge Policy

Όταν ξαναγίνεται generate μετά από αλλαγές στο bracket/groups:

1. Match by `matchRef`.
2. Αν βρεθεί υπάρχον entry με `isManual = true`, διατηρείται (δεν overwritten).
3. Αν βρεθεί υπάρχον entry χωρίς manual lock, μπορεί να γίνει update.
4. Νέα matches δημιουργούνται.
5. Obsolete matches επισημαίνονται ως archived/removed.

## Validations

- `durationMinutes > 0`
- `startsAt` απαιτεί valid datetime
- `tableCode` απαιτείται
- No overlap στο ίδιο τραπέζι:
  - για κάθε table, `(startA, endA)` δεν πρέπει να τέμνει `(startB, endB)`
- `matchRef` μοναδικό ανά `stageId`
- `published` απαιτεί όλα τα entries του stage να είναι valid

## Admin API Contracts (προτεινόμενα)

### `GET /api/admin/tournament/schedule`

Query:

- `eventId`
- `stageId` (optional)
- `phaseKey` (optional)
- `playerId` (optional)
- `status` (default: `draft`)

Response:

- `data: ScheduleEntry[]`
- `meta: { pagination, stageSettings, conflictsCount }`

### `POST /api/admin/tournament/schedule/generate`

Body:

- `eventId`
- `stageId`
- `forceRegenerate` (boolean)

Response:

- `data: { generated: number, reusedManual: number, removed: number }`

### `PATCH /api/admin/tournament/schedule/:id`

Body (partial):

- `startsAt`
- `durationMinutes`
- `tableCode`
- `isManual`
- `notes`

### `PATCH /api/admin/tournament/schedule/bulk`

Body:

- `ids: string[]`
- `patch: { startsAt?, durationMinutes?, tableCode?, isManual? }`

### `POST /api/admin/tournament/schedule/publish`

Body:

- `eventId`
- `stageId` (optional για publish ανά stage)

Response:

- `data: { published: number }`
- `errors` αν υπάρχουν conflicts/invalid rows

## Admin UI (2-billiardtoday-admin)

Νέο tab: `Schedule` στο tournament management.

### Layout

- Phase tabs: `PPQ`, `PQ`, `Qual`, `L32`, `Final`
- Filters:
  - Player select
  - Date filter
  - Table filter
  - Search
- Table columns:
  - `Group/Round`
  - `Player1`
  - `Player2`
  - `Date`
  - `Time`
  - `Duration`
  - `Table`
  - `Status`

### Actions

- `Generate from stage`
- `Recalculate times`
- `Save draft`
- `Publish`
- `Bulk update`

### UX λεπτομέρειες

- Inline editing για date/time/table/duration.
- Conflict indicators (overlap στο ίδιο table).
- Sticky toolbar με unsaved changes counter.

## Frontend Read Model (4-billiardtoday-frontend)

Δημόσιο endpoint/route καταναλώνει μόνο `published` schedule.

Προβολή κοντά στο reference screenshot:

- phase tabs
- player filter + search
- schedule table (`Group`, `Player1`, `Player2`, `Date`, `Time`, `Table`)
- local timezone formatting

## States & Lifecycle

1. `draft` δημιουργείται/επεξεργάζεται από admin.
2. validation + conflict-free check.
3. `publish`.
4. frontend εμφανίζει published δεδομένα.
5. νέα edit στο admin δημιουργεί νέο draft revision (προτεινόμενο).

## Permissions

- Μόνο tournament admins/editors μπορούν να γράφουν.
- Public/anonymous access μόνο σε published read endpoints.

## Logging / Audit

Για κάθε update:

- `updatedBy`
- `updatedAt`
- optional `changeReason`

Προαιρετικά history table για rollback.

## Edge Cases

- Unknown player placeholders πριν οριστικοποιηθεί bracket.
- Match reschedule που αλλάζει table και σπάει constraints.
- Stage με μηδενικά tables configured.
- Cancellation/postponed match με `status` extension.

## MVP Scope (Phase 1)

- Stage settings + generate
- Inline edit start/duration/table
- Overlap validation
- Draft save + publish
- Frontend read-only view ανά phase

## Phase 2

- Drag-and-drop rescheduling
- Smart auto-balance μεταξύ τραπεζιών
- Export PDF/CSV
- Notifications για αλλαγές schedule

## Προτεινόμενη Σειρά Υλοποίησης

1. Οριστικοποίηση schema/contracts.
2. Admin API + validations.
3. Admin schedule editor UI.
4. Publish/read endpoint.
5. Frontend schedule page.
6. End-to-end tests + deploy runbook update.
