# Club Tournament Public Detail Handoff

Ημερομηνία: 2026-05-06

Αυτό το document είναι handoff για να συνεχιστεί αργότερα η δουλειά από άλλο μηχάνημα.

## Context

Ξεκίνησε το νέο club SaaS scope στο admin και στο public frontend.

Έχουν ήδη υλοποιηθεί:

- club dashboard στο admin
- club players / memberships
- club tournament creation wizard
- club tournament run page
- επιλογή παικτών με smart search
- group setup πιο κοντά στη λογική του internal admin
- αποστολή αγώνα σε club screens
- χρήση του shared `MatchEditorModal` για καταχώρηση / διόρθωση αποτελέσματος σε club tournament matches
- εμφάνιση club-local tournaments στη public σελίδα του club

Σημαντικό: Δεν αλλάχτηκαν production env files.

## Latest Commits

Admin repo:

- `D:\Projects\2-billiardtoday-admin`
- commit: `79c36a3 Use match editor modal for club results`

Public frontend repo:

- `D:\Projects\4-billiardtoday-frontend`
- commit: `30c34ad Show club-local tournaments on club pages`

Έγινε deploy με:

- `bt-sync admin`
- `bt-sync frontend`

## Current Problem

Τα club-local tournaments εμφανίζονται πλέον στη σελίδα του club, αλλά δεν ανοίγουν σε αναλυτική public σελίδα όπως τα official tournaments.

Ο λόγος είναι ότι το public detail page των tournaments είναι φτιαγμένο γύρω από `bt-events`.

Σήμερα:

- official tournament detail: φορτώνει από `bt-events`
- club-local tournament list item: φορτώνει από `tournaments`
- club-local tournament detail: δεν υπάρχει ακόμα

Άρα ένα club-local tournament μπορεί να εμφανιστεί στη λίστα, αλλά δεν έχει ακόμη public detail route που να ξέρει να το διαβάσει.

## Relevant Files

Public tournament detail route:

- `src/app/tournaments/[slug]/page.tsx`

Tournament summary resolver:

- `src/lib/tournaments.ts`

Public club / tournament list data:

- `src/lib/publicSiteData.ts`
- `src/app/api/tournaments/route.ts`
- `src/components/tournaments/TournamentListSection.tsx`

Existing tournament detail component:

- `src/components/tournaments/TournamentDetailPage.tsx`

Existing event data API used by detail page:

- `src/app/api/events/[id]/route.ts`
- server-side detail page currently fetches:
  - `http://127.0.0.1:3022/event-data/{eventDocumentId}`

## Current Behavior

`src/app/api/tournaments/route.ts` now supports `clubSlug`.

For club pages it returns a merged list:

- official `bt_event` rows
- local `tournaments` rows without `bt_event`

Local club tournaments are returned with:

- `source: "club_tournament"`
- `canOpen: false`

This was intentional as a temporary safe state, because the detail page cannot yet render them correctly.

## Desired Behavior

Club-local tournaments should appear under the organizing club and should be clickable.

When opened, they should show an analytical page similar to official tournaments:

- title
- dates
- game type
- organizer / club
- phases
- groups
- matches
- standings
- results

If the tournament has only local players without official BT Player links, it must still display correctly.

Important distinction:

- If a player is linked to a BT Player, results may later be written to official / overall statistics.
- If a player is only club-local, results should remain visible inside that club tournament but should not be written to official BT statistics.

## Product Decision

Do not create fake `bt_event` records just to make club-local tournaments public.

Correct direction:

- keep official tournaments as `bt_event`
- keep club-local tournaments as `tournaments`
- make the public frontend support both data sources:
  - `bt_event`
  - `club_tournament`

This keeps the engine and public model honest.

## Implementation Plan

### 1. Extend the public tournament resolver

File:

- `src/lib/tournaments.ts`

Today `resolveTournamentEventSummary()` only resolves from `bt-events`.

Add fallback lookup for club-local tournaments:

- by `tournament.slug`
- by `tournament.documentId`
- optionally by canonical slug if needed

Suggested new helper:

- `fetchClubTournamentSummaryBySlug(slug: string)`
- `fetchClubTournamentSummaryById(documentId: string)`

The helper should fetch from:

- `/api/tournaments`

and populate:

- `club`
- `venue`
- `stages`
- relations needed for matches / groups if available

The returned shape should match `TournamentEventSummary` as much as possible, with an added source flag if needed:

- `source: "club_tournament"`

If changing the `TournamentEventSummary` type is too risky, add an optional field:

- `source?: "bt_event" | "club_tournament"`

### 2. Build a summary mapper for club-local tournaments

Map Strapi `tournaments` fields to `TournamentEventSummary`:

- `documentId`
- `slug`
- `title`
- `description`
- `startDate`
- `endDate`
- `game_type`
- `season`
- `club.name`
- `club.city`
- `club.country`
- `venue.name`
- `venue.city`
- `venue.country`

For title:

- use `tournament.title`

For `tournamentTitle`:

- also use `tournament.title`

For stages:

- use existing club tournament phases / generated stages if exposed
- if not available yet, return an empty stages array and let the detail UI show a graceful empty state

### 3. Make detail page canonical slug work for both sources

File:

- `src/app/tournaments/[slug]/page.tsx`

Current canonical slug is built from:

- empty canonical id
- `summary.title`
- `summary.season`

That is okay for old official pages, but for club-local tournaments we should prefer their real `tournamentSlug`.

For club-local tournaments:

- canonical URL should probably be `/tournaments/{tournament.slug}`

For official tournaments:

- keep existing behavior unless changing it is required.

### 4. Add public data endpoint for club-local tournament details

The current detail page fetches:

- `/event-data/{btEventDocumentId}`

That endpoint is for official `bt-events`.

Club-local tournaments need one of these:

Option A:

- create a new endpoint:
  - `/api/club-tournaments/[id]/public-data`
  - or `/club-tournament-data/{tournamentDocumentId}` if following the current internal style

Option B:

- extend existing `/event-data/[eventId]` logic to also recognize club tournament document ids

Preferred:

- Option A, because it keeps official event data and club-local tournament data separate.

The public data endpoint should return a shape close to `EventApiResponse`, because `TournamentDetailPage` already knows how to render that.

Needed data:

- stages / phases
- groups
- matches
- players
- results
- standings

### 5. Update `TournamentDetailPage` only where needed

File:

- `src/components/tournaments/TournamentDetailPage.tsx`

Try not to fork the whole page.

Preferred approach:

- keep one shared detail component
- pass `summary.source`
- pass `initialEventData` or `initialTournamentData` in a compatible shape

If data shape can match `EventApiResponse`, the component may need very few changes.

### 6. Make club-local list items clickable

Files:

- `src/app/api/tournaments/route.ts`
- `src/components/tournaments/TournamentListSection.tsx`
- `src/lib/publicSiteData.ts`

When detail support is ready:

- set `canOpen: true` for `source: "club_tournament"`
- set href to `/tournaments/{tournament.slug}`

For club page cards, `mapTournamentCard()` currently sets `href: null` if there is no `bt_event`.

Change it so local tournaments get:

- `href: /tournaments/{tournament.slug}`

only after the resolver/detail endpoint can handle them.

## Important Data Caveat

Official tournaments and club-local tournaments may not have exactly the same backend structure.

Before implementing the public detail endpoint, inspect actual Strapi records:

- a club-local tournament with generated groups/matches
- an official tournament with `bt_event`

Compare where the following are stored:

- phases / stages
- group memberships
- matches
- match results
- standings

Do not assume that `bt_event` relations exist for club-local tournaments.

## Expected Result

After implementation:

- club page lists both official and local club tournaments
- local club tournaments are clickable
- public detail page opens for local club tournaments
- groups, matches and results are visible
- local-only players display correctly
- official BT statistics are not affected by local-only players

## Suggested Verification

Local checks:

- `npx tsc --noEmit --pretty false`
- `npm run build`

Production deploy:

- `bt-sync frontend`

Smoke checks:

- `https://www.billiardtoday.com/clubs/dev`
- `https://www.billiardtoday.com/api/tournaments?clubSlug=dev&page=1&pageSize=10`
- click/open a club-local tournament such as:
  - `L' AMORTI OPEN`
  - `test123`
  - another current local tournament under club `dev`

Expected:

- no 404
- detail page renders
- groups/matches/results appear if tournament structure has been prepared

## Open Decision

Public detail URL for club-local tournaments:

Recommended:

- `/tournaments/{tournament.slug}`

Avoid:

- `/clubs/{clubSlug}/tournaments/{slug}`

Reason:

- keeps public tournament URLs consistent with official tournaments
- club relationship is already shown in the detail page

