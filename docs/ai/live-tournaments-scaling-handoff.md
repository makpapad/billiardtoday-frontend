# Live Tournaments Scaling Handoff

## Status

`Implemented / rolled out on 2026-04-14`

Το αρχικό handoff task αυτού του αρχείου θεωρείται κλεισμένο.

Για το production rollout και το τελικό implemented contract, το source of truth είναι πλέον το:

- `docs/ai/live-tournaments-realtime-implementation-2026-04-14.md`

## Σκοπός

Να ξεκινήσει νέο chat για architecture / scaling task σχετικά με:

- `150` ενεργά tournaments
- `200` live παιχνίδια
- αποφυγή κατάρρευσης σε `live score`, `live results`, `public tournament pages`
- δραστική μείωση του polling
- σταδιακή μετάβαση σε πιο `push / WebSocket` μοντέλο

Δεν ξεκινάμε υλοποίηση από το μηδέν στο νέο chat.
Πρώτα θέλουμε καθαρό τεχνικό σχέδιο ανά repo και ανά φάση.

## Υποχρεωτική Ανάγνωση Στο Νέο Chat

Πριν από οτιδήποτε:

1. `docs/ai/BILLIARDTODAY-AGENT-RULES.md`
2. `docs/ai/06-server-sync.md`
3. Αυτό το αρχείο

## Repos Που Εμπλέκονται

- `1-billiards-strapi`
- `3-BilliatdToday-Scoreboard`
- `4-billiardtoday-frontend`
- πιθανώς και `2-billiardtoday-admin` για manual update flows

## Τωρινή Εικόνα

### Public frontend

Το public tournament page κάνει polling:

- full `/event-data/:id`
- live sessions
- live screens σε live mode

Relevant files:

- `src/components/tournaments/TournamentDetailPage.tsx`
- `src/app/api/events/[id]/route.ts`
- `src/app/event-data/[eventId]/route.ts`

### Scoreboard / WS

Υπάρχει ήδη WebSocket flow για live sessions / updates.

Relevant files:

- `3-BilliatdToday-Scoreboard/ws-server/server.js`
- `3-BilliatdToday-Scoreboard/src/lib/wsPublisher.ts`
- `1-billiards-strapi/src/services/scoreboardWsPublisher.ts`

### Σημαντικό Συμπέρασμα

Το μεγαλύτερο scaling risk σήμερα δεν φαίνεται να είναι ο απλός WS relay server.

Το μεγαλύτερο ρίσκο είναι:

- repeated polling full tournament/event payloads
- πολλοί viewers σε public tournament pages
- Strapi / frontend workload από άσκοπα refetches

## Τι Θέλουμε Να Πετύχουμε

1. Να μειωθεί δραστικά το polling.
2. Να μη χρειάζεται full event refetch κάθε λίγα δευτερόλεπτα.
3. Να περάσουν τα truly-live updates σε push model.
4. Να μείνει μόνο safety fallback polling.
5. Να κρατήσουμε συμβατότητα με:
   - live scoreboard updates
   - manual admin updates
   - published standings / final results

## Τεχνική Κατεύθυνση Που Θέλουμε Να Συζητηθεί

### Επιθυμητή κατεύθυνση

- `WebSocket / push` για live score και stage dirtiness
- `targeted refresh` για ένα stage ή ένα subset δεδομένων
- όχι full `/event-data` reload σε κάθε update

### Πιθανό μοντέλο

Διαχωρισμός δεδομένων σε:

- `static-ish`
  - event shell
  - stage list
  - timetable skeleton

- `semi-dynamic`
  - stage standings
  - stage results
  - final results

- `live`
  - active score
  - innings
  - runs
  - session state

### Επιθυμητό behavior

- WS event `match_updated`
- WS event `stage_standings_dirty`
- WS event `final_results_dirty`

και μετά το frontend να κάνει:

- targeted fetch μόνο του affected stage
- ή μόνο των affected standings/results

όχι full event payload refresh

## Constraints / Πραγματικές Ανάγκες

- Πρέπει να συνεχίσουν να δουλεύουν:
  - manual results από Next admin
  - live updates από scoreboard
  - timetable placeholder rows
  - ranking / standings updates

- Δεν θέλουμε big bang rewrite.
- Θέλουμε phased rollout με χαμηλό production risk.
- Θέλουμε fallback behavior αν χαθεί το WS.

## Τι Να Ζητηθεί Στο Νέο Chat

Στο νέο chat θέλουμε:

1. architecture review του current live/update flow
2. bottleneck analysis
3. phased migration plan
4. προτεινόμενα event contracts για WS messages
5. ξεκάθαρο mapping:
   - τι μένει polling
   - τι πάει σε WS
   - τι endpoints χρειάζονται split

## Προτεινόμενο Prompt Για Το Νέο Chat

Χρησιμοποίησε αυτό:

```text
Διάβασε πρώτα το docs/ai/BILLIARDTODAY-AGENT-RULES.md και το docs/ai/06-server-sync.md.
Μετά διάβασε το docs/ai/live-tournaments-scaling-handoff.md.

Θέλω architecture task, όχι άμεση υλοποίηση.

Στόχος:
να δούμε πώς θα αντέξει το σύστημα αν έχουμε περίπου 150 ενεργά tournaments και 200 live παιχνίδια,
με όσο γίνεται λιγότερο polling και χωρίς να καταρρεύσουν live score, public tournament pages και standings updates.

Θέλω:
1. ανάλυση του σημερινού flow στα repos
2. εντοπισμό των πραγματικών bottlenecks
3. phased migration plan
4. πρόταση για WS/push contracts και targeted refresh strategy
5. τι μπορούμε να κάνουμε χωρίς big bang rewrite

Μην ξεκινήσεις implementation πριν συμφωνήσουμε στο σχέδιο.
```

## Αναμενόμενο Output Από Το Νέο Chat

Ιδανικά το νέο chat να καταλήξει σε:

- `Phase 1`
  - safe reductions / low risk improvements

- `Phase 2`
  - targeted live updates / stage dirty strategy

- `Phase 3`
  - cleaner event architecture με ελάχιστο polling

και μετά μόνο να αποφασίσουμε ποια φάση υλοποιούμε πρώτη.
