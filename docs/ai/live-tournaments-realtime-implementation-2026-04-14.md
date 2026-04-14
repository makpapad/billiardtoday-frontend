# Live Tournaments Realtime Implementation 2026-04-14

## Σκοπός

Σύντομο implementation note για το production rollout του live tournament scaling / realtime refresh flow.

Το αρχικό architecture handoff ήταν το:

- `docs/ai/live-tournaments-scaling-handoff.md`

Το παρόν αρχείο περιγράφει τι υλοποιήθηκε τελικά.

## Τι Υλοποιήθηκε

### 1. Event-level WebSocket subscriptions

Προστέθηκε event-scoped subscription στο WS relay:

- `subscribe:event`

και support για event fanout στο:

- `3-BilliatdToday-Scoreboard/ws-server/server.js`

### 2. Dirty events για targeted refresh

Προστέθηκαν τα εξής realtime contracts:

- `stage_matches_dirty`
- `stage_standings_dirty`
- `final_results_dirty`
- `event_shell_dirty`
- `timetable_dirty`

### 3. Event-driven session lifecycle refresh

Τα υπάρχοντα:

- `SESSION_ASSIGNED`
- `SESSION_UPDATED`

προωθούνται πλέον και στο event channel όταν υπάρχει `eventId`, ώστε το public tournament page να ανανεώνει τη live session list χωρίς να περιμένει μόνο το fallback polling.

### 4. Split endpoints στο frontend app

Προστέθηκαν:

- `/api/event-stages/[stageId]/standings`
- `/api/events/[id]/final-results`

Κρατήθηκε και το ήδη υπάρχον:

- `/api/event-stages/[stageId]/matches`

### 5. Frontend targeted refresh behavior

Στο public tournament page:

- stage updates -> targeted fetch μόνο του affected stage
- final standings updates -> targeted fetch μόνο των finals
- shell / timetable structural changes -> on-demand full event refresh
- `live-sessions` polling -> παραμένει μόνο ως slow fallback
- full `/event-data/:id` polling -> μειώθηκε σε slow fallback αντί για συχνό refetch

## Source Of Truth Ανά Repo

### Strapi

Κύρια files:

- `src/services/tournamentWsPublisher.ts`
- `src/services/scoreboardWsPublisher.ts`
- `src/services/finalResultsPublisher.ts`
- `src/services/scoringService.ts`
- `src/api/bt-event-stage/controllers/bt-event-stage.ts`
- `src/api/bt-event-stage/content-types/bt-event-stage/lifecycles.ts`
- `src/api/bt-event-timetable-slot/controllers/bt-event-timetable-slot.ts`
- `src/api/bt-event-timetable-slot/content-types/bt-event-timetable-slot/lifecycles.ts`

Κανόνας:

- Αν μια αλλαγή επηρεάζει stage matches / standings / finals / shell / timetable, πρέπει να εκπέμπει το σωστό dirty event.

### WS relay

Κύριο file:

- `ws-server/server.js`

Κανόνας:

- νέο event message type πρέπει να γίνεται broadcast σε `clientsByEvent`
- δεν αλλάζουμε το υπάρχον `screen` και `club` behavior αν δεν υπάρχει σοβαρός λόγος

### Frontend

Κύρια files:

- `src/components/tournaments/TournamentDetailPage.tsx`
- `src/app/tournaments/events/TournamentEventsContent.tsx`
- `src/app/api/event-stages/[stageId]/matches/route.ts`
- `src/app/api/event-stages/[stageId]/standings/route.ts`
- `src/app/api/events/[id]/final-results/route.ts`

Κανόνας:

- για `stage_*_dirty` κάνουμε stage-scoped fetch
- για `final_results_dirty` κάνουμε finals-only fetch
- για `event_shell_dirty` ή `timetable_dirty` κάνουμε full event refresh
- το fallback polling μένει safety net, όχι primary update path

## Production Rollout Που Έγινε

Deploy date:

- `2026-04-14`

Deployed commits:

- `1-billiards-strapi` -> `eb03379`
- `3-BilliatdToday-Scoreboard` -> `21fc9ff`
- `4-billiardtoday-frontend` -> `b777c59`

Deploy order:

1. `bt-sync app`
2. `bt-sync ws`
3. `bt-sync frontend`

Health checks που πέρασαν:

- `http://127.0.0.1:1337/admin/`
- `http://127.0.0.1:3010/presence`
- `http://127.0.0.1:3022/`

## Smoke Test Expectations

### Match / stage update

Αναμενόμενο:

- όχι άμεσο full `/event-data/:id`
- ναι σε targeted refresh για stage matches / standings

### Final standings publish

Αναμενόμενο:

- refresh μόνο από `/api/events/[id]/final-results`

### Structural admin change

Παραδείγματα:

- create/delete stage
- generate timetable
- clear timetable
- slot edit

Αναμενόμενο:

- on-demand full event refresh

## Τι Δεν Έχει Γίνει Ακόμα

- dedicated `event shell` endpoint
- πιο granular timetable-only public endpoint
- metrics / dashboards για counts ανά WS event type
- explicit replay / snapshot protocol για event subscribers μετά από reconnect

## Αν Εμφανιστεί Stale Behavior

Να ελεγχθούν πρώτα:

1. Αν το αντίστοιχο Strapi mutation path εκπέμπει dirty event.
2. Αν ο WS relay κάνει fanout στο `eventId`.
3. Αν το public page έχει ανοιχτό event socket.
4. Αν έγινε targeted fetch ή full event refresh όταν έπρεπε.
5. Αν το issue είναι recovery-only case μετά από reconnect, όπου ίσως χρειάζεται ισχυρότερο replay model.

## Σημαντική Σημείωση

Αν μελλοντικό task ξαναπειράξει live tournaments, αυτό το αρχείο πρέπει να διαβάζεται μαζί με:

- `docs/ai/BILLIARDTODAY-AGENT-RULES.md`
- `docs/ai/06-server-sync.md`
- `docs/ai/live-tournaments-scaling-handoff.md`
