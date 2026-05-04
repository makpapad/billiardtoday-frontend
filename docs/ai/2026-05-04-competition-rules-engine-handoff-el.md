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

