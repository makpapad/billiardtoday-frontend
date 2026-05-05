# Competition Rules Engine Handoff

Ημερομηνία: 2026-05-04

Αυτό το σημείωμα είναι handoff για να συνεχιστεί η δουλειά από άλλο υπολογιστή. Αφορά το αρχικό refactor για competition rules/rulesets και τις αλλαγές που έγιναν για το CEB Youth KO ranking.

## Repos

- Backend / Strapi: `D:\Projects\1-billiards-strapi`
- Frontend / public site: `D:\Projects\4-billiardtoday-frontend`
- Production deploy helper: `bt-sync app`, `bt-sync frontend`
- Server docs: `D:\Projects\4-billiardtoday-frontend\docs\ai\06-server-sync.md`

## Production Tournament Context

- Public page: `https://billiardtoday.com/tournaments/longoni-next-gen-grand-prix-3-cushion-u21-2026`
- Event `documentId`: `v8nc64onx1l242seiui2wjng`
- Final/KO stage `documentId`: `lgbl18foiq4k54vwqn0706ol`
- CEB classification: `https://www.eurobillard.org/events/Youth%20gp%20u21-497.html#classification`
- CEB matches: `https://www.eurobillard.org/events/Youth%20gp%20u21-497.html#matches`

## Τι Έχει Γίνει

### Backend rules foundation

Στο Strapi έγινε το πρώτο foundation για rulesets:

- Προστέθηκε `src/services/competitionRules.ts`.
- Υπάρχουν rulesets:
  - `default`
  - `ceb_youth`
  - `artistic_ceb`
- Προστέθηκαν fields σε content types:
  - `ruleset_key`
  - `ruleset_config`
- Τα fields υπάρχουν σε:
  - tournament
  - bt-event
  - bt-event-stage
- Υπάρχει resolver που αποφασίζει ruleset από stage/event/tournament και fallback heuristics.
- Τα παρακάτω χρησιμοποιούν πλέον τον resolver:
  - group standings calculator
  - knockout standings builder
  - final results publisher

Σχετικά backend files:

- `src/services/competitionRules.ts`
- `src/services/knockoutStandingsBuilder.ts`
- `src/services/standingsCalculator.ts`
- `src/services/finalResultsPublisher.ts`
- `src/api/bt-event-stage/controllers/bt-event-stage.ts`

### CEB Youth KO standings

Για CEB Youth single KO έγιναν ειδικές αλλαγές:

- Η default KO classification για CEB Youth δείχνει opening round only, δηλαδή για 16άδα δείχνει μόνο τους αγώνες R16.
- Το endpoint δέχεται `round` για per-round classifications:
  - `round=r16`
  - `round=qf`
  - `round=sf`
  - `round=final`
- Προστέθηκε ξεχωριστό cumulative mode:
  - `mode=round16_final_standing`
- Το `mode=round16_final_standing`:
  - βρίσκει τους 16 παίκτες του opening round
  - αθροίζει όλα τα KO παιχνίδια αυτών των παικτών
  - δεν περιλαμβάνει qualification/groups
  - ενημερώνεται live, επειδή χτίζεται από τα τρέχοντα KO matches

Production API checks:

```text
https://billiardtoday.com/api/event-stages/lgbl18foiq4k54vwqn0706ol/standings?round=r16
https://billiardtoday.com/api/event-stages/lgbl18foiq4k54vwqn0706ol/standings?mode=round16_final_standing
```

Expected behavior:

- `round=r16`: μόνο R16 stats.
- `round=qf`: μόνο Quarter Finals stats.
- `mode=round16_final_standing`: cumulative KO stats των 16 παικτών.

### Frontend behavior

Στη δημόσια tournament page:

- Το κουμπί `Round 16 Final Standing` εμφανίζεται δίπλα αριστερά από το dropdown.
- Το `Round 16 Final Standing` είναι default selected mode.
- Όταν είναι ενεργό:
  - ο πίνακας δείχνει cumulative live KO ranking των 16 παικτών
  - το live polling/WebSocket targeted refresh συνεχίζει να ζητά `mode=round16_final_standing`
- Το dropdown `R16 / Quarter Finals / Semi Finals / Final`:
  - εμφανίζεται μόνο όταν υπάρχουν published `Final Standings`
  - δεν βασίζεται στο `tournament_status`, επειδή στο production το συγκεκριμένο tournament έχει `tournament_status=scheduled` παρότι υπάρχουν final standings
  - όταν δεν πρέπει να φαίνεται, το UI γυρίζει αυτόματα στο `Round 16 Final Standing`

Σχετικά frontend files:

- `src/components/tournaments/TournamentDetailPage.tsx`
- `src/app/tournaments/events/TournamentEventsContent.tsx`
- `src/app/api/event-stages/[stageId]/standings/route.ts`
- `src/app/api/events/[id]/route.ts`
- `src/app/tournaments/events/types.ts`
- `src/lib/tournaments.ts`

### Highlight rule

Άλλαξε ο κανόνας highlight για H.R.:

- Το H.R. μπορεί να εμφανίζεται σε πορτοκαλί πλαίσιο χωρίς minimum 10.
- Δεν πρέπει να ξαναμπεί implicit minimum για HR highlight χωρίς explicit rule.

### Commits

Backend:

- `69ec96e Fix CEB youth knockout standings`
- `fa640a7 Sort CEB knockout rounds by average`
- `590cde4 Add competition ruleset registry`
- `5972fd6 Add cumulative round 16 standing mode`

Frontend:

- `9bf01b2 Add CEB knockout round rankings`
- `0726e45 Expose tournament ruleset fields`
- `1b84487 Add round 16 standing shortcut`
- `1658ca2 Use cumulative round 16 standings mode`
- `72ced46 Allow R16 selection from cumulative standing`
- `03050cc Hide KO round dropdown until final standings`
- `5f8f0cf Show KO round dropdown with final standings`

## Τι Δεν Έχει Τελειώσει

Δεν έχουμε ακόμη πλήρες Competition Rules Engine. Έχουμε foundation/registry και μερικά consumers.

Εκκρεμότητες:

- Κεντρικό typed contract για όλα τα rule decisions.
- Versioned rulesets, π.χ. `ceb_youth_v1`, `umb_world_cup_v1`, `national_gr_v1`.
- Validation schema για κάθε `ruleset_config`.
- Admin UI για επιλογή ruleset σε tournament/event/stage.
- UI ή structured editor στο Next Admin για κανόνες.
- Migration/assignment των υπαρχόντων tournaments σε explicit rulesets.
- Automated tests ανά ruleset.
- Documentation για το πώς προσθέτουμε νέο ruleset.
- Πλήρης απομόνωση CEB/UMB/National logic σε καθαρά modules/services.
- Καλύτερο lifecycle: πότε ένα tournament θεωρείται live, completed, final, published.
- Explicit published/final flag για final standings, αντί να βασιζόμαστε μόνο στο ότι υπάρχουν `results_final`.

## Προτεινόμενη Συνέχεια

1. Να οριστεί `CompetitionRules` interface με όλα τα decisions που χρησιμοποιούνται σήμερα.
2. Να μεταφερθούν οι τρέχοντες hardcoded checks σε methods του ruleset.
3. Να προστεθούν tests για:
   - CEB Youth KO opening round classification
   - CEB Youth per-round KO standings
   - CEB Youth round 16 cumulative final standing
   - default/group ranking behavior
   - artistic CEB behavior
4. Να δημιουργηθεί Strapi/Next Admin selection flow:
   - dropdown ruleset_key
   - JSON/structured config
   - validation πριν αποθήκευση
5. Να οριστεί `final standings published` state στο backend.
6. Να γίνει migration των γνωστών tournaments σε explicit `ruleset_key`.

## Προσοχές

- Μην απενεργοποιηθεί το live polling στη public tournament page.
- Το `Round 16 Final Standing` πρέπει να παραμένει live.
- Τα per-round dropdown rankings δεν πρέπει να αντικαταστήσουν το cumulative mode.
- Τα groups/live rankings δεν πρέπει να επηρεαστούν από KO-specific logic.
- Το CEB Youth `round=r16` πρέπει να δείχνει μόνο R16 stats, όχι cumulative.
- Το `mode=round16_final_standing` πρέπει να δείχνει cumulative KO stats μόνο για τους 16.
- Το production `tournament_status` μπορεί να μην είναι αξιόπιστο για completed/final display logic.

## 2026-05-04 Follow-up Update

This section records the work completed after the original handoff.

### Completed

Backend / Strapi:

- Added Strapi Admin ruleset selection for `ruleset_key` on tournament, bt-event, and bt-event-stage.
- Changed `ruleset_key` schema fields from free string to enum: `default`, `ceb_youth`, `artistic_ceb`.
- Added shared ruleset payload normalization/validation in `src/services/competitionRules.ts`.
- Added lifecycle validation for tournament/event/stage writes.
- Extended `ruleset_config` validation for known rule decisions: `groupRankingProfile`, `knockoutClassificationMode`, `knockoutRoundSort`, `finalRankingMode`.
- Added explicit final standings publish state on `bt-event`: `final_standings_published`, `final_standings_published_at`.
- Updated `finalResultsPublisher` so successful final result publishing sets the explicit state.
- Updated custom final-results endpoint to return publish metadata without changing the existing `data` rows.
- Added `scripts/backfill-final-standings-published.js`.
- Production backfill was verified directly in PostgreSQL: 362 events with final-result rows have `final_standings_published=true`.

Frontend / public site:

- Updated `src/app/api/events/[id]/route.ts` to fetch and expose `final_standings_published` and `final_standings_published_at`.
- Updated `src/app/tournaments/events/types.ts`.
- Updated `src/app/tournaments/events/TournamentEventsContent.tsx` so published final standings / KO round dropdown gating uses `final_standings_published === true`, not only `results_final.length`.
- Kept `Round 16 Final Standing` live/cumulative mode separate from per-round final breakdown rankings.

### New Commits

Backend:

- `5898229 Add competition ruleset admin validation`
- `47e1c01 Add final standings published flag`
- `3107d0f Optimize final standings published backfill`

Frontend:

- `7714c50 Use explicit final standings published flag`

### Production Deploys

Backend:

```powershell
plink -batch -i D:\.ssh\billiard_admin.ppk root@138.201.29.162 "bt-sync app"
```

Frontend:

```powershell
plink -batch -i D:\.ssh\billiard_admin.ppk root@138.201.29.162 "bt-sync frontend"
```

Note: the OpenSSH key path in the original handoff was missing locally. The working production key on this machine is:

```text
D:\.ssh\billiard_admin.ppk
```

Use PuTTY `plink.exe` unless an OpenSSH-converted key is recreated.

### Verification Completed

Local builds:

- Backend `npm run build`: passed.
- Frontend `npm run build`: passed.

Production health:

- `frontend:200`
- `strapi:200`
- `strapi-prod`: online
- `billiardtoday-frontend`: online

Targeted production API check:

```text
https://billiardtoday.com/api/events/v8nc64onx1l242seiui2wjng
```

Observed:

```json
{
  "final_standings_published": true,
  "finalRows": 28
}
```

CEB comparison for:

- BilliardToday: `https://billiardtoday.com/tournaments/longoni-next-gen-grand-prix-3-cushion-u21-2026`
- CEB: `https://www.eurobillard.org/events/Youth%20gp%20u21-497.html#classification`

Result:

- General final classification matches CEB for all 28 rows.
- Qualification structure matches CEB: 7 groups of 4, 42 qualification matches.
- KO stage matches CEB: 15 KO matches.
- `Round 16 Final Standing` is correct as KO-only cumulative standing for the 16 KO players.
- Per-round rankings (`round=r16`, `round=qf`, `round=sf`, `round=final`) are correct and remain separate from cumulative mode.
- Minor display-only name differences remain:
  - CEB `KOZLUCA Engin ali` vs BT `KOZLUCA Engin Ali`
  - CEB `BOTIS Nikos` vs BT English name `BOTIS Nikolaos`
  - Some Greek `full_name` values have encoding/mojibake, but `full_name_en` is correct.

### Current State

The scoped task is complete and deployed:

- Ruleset selection/validation exists.
- Explicit final standings published state exists and is used by frontend.
- Longoni U21 rankings have been verified against CEB.
- Backend and frontend working trees were clean after deploy.

### Remaining Future Scope

The larger Competition Rules Engine is still not fully complete. Remaining items:

- Versioned rulesets, e.g. `ceb_youth_v1`, `umb_world_cup_v1`, `national_gr_v1`.
- Full modular isolation of CEB/UMB/National rule logic.
- Automated tests per ruleset.
- Structured editor for `ruleset_config` beyond raw JSON.
- Migration/assignment of known tournaments to explicit rulesets where still missing.
- More formal lifecycle model for live/completed/final/published tournament state.
- Documentation for adding a new ruleset.

## Quick Verification Commands

Frontend build:

```powershell
cd D:\Projects\4-billiardtoday-frontend
npm run build
```

Backend build:

```powershell
cd D:\Projects\1-billiards-strapi
npm run build
```

Production health:

```powershell
ssh -i D:\.ssh\billiard_admin_openssh.key root@138.201.29.162 "curl -s -o /dev/null -w 'frontend:%{http_code}\n' http://127.0.0.1:3022/; curl -s -o /dev/null -w 'strapi:%{http_code}\n' http://127.0.0.1:1337/admin/; su -s /bin/bash - billiardtoday_srv -c 'pm2 status strapi-prod billiardtoday-frontend --no-color'"
```

Production deploy:

```powershell
ssh -i D:\.ssh\billiard_admin_openssh.key root@138.201.29.162 "bt-sync app"
ssh -i D:\.ssh\billiard_admin_openssh.key root@138.201.29.162 "bt-sync frontend"
```

## 2026-05-05 Closure Update

This section closes the scoped Competition Rules Engine task that started in this handoff.

### What Was Completed After The Original Handoff

Backend / Strapi:

- Migrated rulesets to canonical versioned keys:
  - `default_v1`
  - `ceb_youth_v1`
  - `artistic_ceb_v1`
- Added normalization so legacy keys still resolve correctly.
- Added tests for:
  - ruleset resolution / normalization
  - knockout standings builder
  - final results publisher
- Rewrote `scripts/backfill-ruleset-keys.js` to a lighter set-based PostgreSQL backfill flow.
- Deployed the backend updates to production.
- Ran production data backfill for safe explicit non-default rulesets:
  - CEB Youth records
  - Artistic CEB records
- Verified production event behavior for:
  - Longoni U21 / CEB Youth
  - Artistic sample events

Public frontend:

- Added tournament slug fallback resolution so backend/legacy tournament slugs resolve and redirect to the canonical public slug instead of returning `404`.
- Deployed the frontend fix to production.
- Verified:
  - `https://billiardtoday.com/tournaments/european-championship-artistic-individual-cceb-522`
  - now redirects to the canonical public slug and returns `200`

Admin app:

- Repo used: `D:\Projects\2-billiardtoday-admin`
- Added a new `Rules` tab in the existing tournament editor:
  - tournament-level ruleset selection
  - event-level ruleset selection
  - stage-level ruleset selection
  - explicit/inherited visibility
  - structured editor for `ruleset_config`
  - `final_standings_published` event control
- Fixed the initial `414 Request-URI Too Large` issue by reducing the payload requested by the event edit route.
- Fixed tab label fallback so missing translations do not render raw translation keys.
- Deployed the admin updates to production.

### Production References

Public frontend:

- Commit: `877e8b9` - `Resolve tournament pages by tournament slug fallback`

Admin app:

- Commit: `8b1ba37` - `Add rules management to tournament admin`
- Commit: `0fc2ea2` - `Reduce tournament admin event payload size`
- Commit: `576f313` - `Fix tournament admin tab label fallback`

Backend:

- Production already updated earlier in the same workstream with the versioned rules engine, tests, and backfill support.

### Final Scoped Status

The scoped task from this handoff is now complete in production.

Completed and verified:

- versioned competition rules engine foundation
- explicit ruleset assignment for supported cases
- final standings published state
- production backfill for safe non-default rulesets
- Longoni U21 verification against CEB
- public frontend slug fallback / redirect
- internal admin rules management UI

### What Is Explicitly Out Of Scope For This Closed Task

These are not blockers for the completed engine task, but remain future product work:

- simplified SaaS-facing rules UI for club and federation users
- role-based admin surfaces with different complexity levels
- inline multilingual guidance for non-technical operators
- broader ruleset coverage beyond current supported profiles
- additional ruleset versions such as future `*_v2`
- deeper lifecycle/product workflows around publish/final/live states

### Decision

Mark this handoff as closed for the original Competition Rules Engine scope.

Next work should continue in a new document focused on:

- simplified rules UX
- club/federation role flows
- multilingual inline guidance
- SaaS-ready admin ergonomics
