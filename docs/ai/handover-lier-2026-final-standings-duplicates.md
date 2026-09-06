# HANDOVER — Lier 2026 World Cup 3-Cushion: final standings show duplicate names (after polling)

> Prepared 2026-09-06 ~21:15 EEST (laptop battery died mid-session — continue here).
> Context: user report — "κοιτα την κατάταξη στο frontend για το World Cup 3-Cushion, Lier 2026.
> Όταν κάνει polling τη χαλάει και βγάζει διπλά ονόματα." + user rule: "η τελική δεν πρέπει να
> δημιουργείται στο frontend" (final standing must come from the BACKEND published finals,
> never be built client-side).

## Live facts (verified)

- Page: https://billiardtoday.com/tournaments/world-cushion-3-cushion-lier-2026 → canonical
  `https://billiardtoday.com/tournaments/world-cup-3-cushion-lier-2026` (HTTP 200).
- Event (DB, server 138.201.29.162, db `billiard_pg`):
  `bt_events.document_id = e8e9634d-7f81-429c-8e08-ada646adc353`, `final_standings_published = t`.
- UMB event id 365 (Lier/Belgium). Final played 2026-09-06 19:00 (CHO Myung Woo 50-18 JASPERS Dick).
- Frontend polls the full event payload every 10 s
  (`TournamentEventsContent.tsx` ~L3180: `window.setInterval(refreshEventData, 10000)`) and
  bracket matches every 5 s (~L4464).

## Database anomaly (likely root cause)

```
SELECT COUNT(*) FROM bt_results_final rf
JOIN bt_results_final_event_lnk el ON el.bt_result_final_id = rf.id
JOIN bt_events e ON e.id = el.bt_event_id
WHERE e.document_id = 'e8e9634d-7f81-429c-8e08-ada646adc353';
-- => 425  (link rows)

SELECT COUNT(DISTINCT rf.id) FROM ...same joins...;
-- => 70   (distinct final-result rows)
```

→ the junction table `bt_results_final_event_lnk` contains ~6 link rows per result id
(425 vs 70). If Strapi returns the `results_final` relation by joining the junction, each
result (player) comes back ~6× → the frontend "Final standings" table (`publishedFinalResults`
in `TournamentEventsContent.tsx`, rendered ~L5397) shows every name duplicated → matches the
user report, and it appears/gets worse right after a poll picks up a fresh publish.
(Old publishes from earlier today are the likely origin: publish-final-results INSERTs without
dedup/cleanup of prior link rows.)

## Where the frontend renders the final standing (5-billiardtoday-frontend)

- `src/app/tournaments/events/TournamentEventsContent.tsx` (398 KB, CRLF):
  - `fetchEvent` ~L2977 → `GET /api/events/{documentId}` (event doc id, not slug).
  - polling ~L3180 (10 s, only when `document.visibilityState !== 'hidden'`), replaces
    `eventData` state when JSON differs.
  - `publishedFinalResults` useMemo ~L3544-3787: maps `data.results_final` →
    `normalizeFinalResult` → filter `hasMeaningfulFinalResult`; **no dedupe by id/player**.
    If `final_standings_published === true` (early return ~L3637) rows are sorted by
    `position` — otherwise Longoni-U21 client-side builders / `finalStandingsBracketStatsByPlayerKey`
    phaseScore overrides kick in (user rule: remove/avoid these frontend builders — finals
    come from the backend).
  - "Final standings" table ~L5308-5700, headers `# | Player | Match Pts | Caroms | Innings |
    AVG | 1st H.R. | 2nd H.R. | Best AVG | Rank Pts`; maps `publishedFinalResults`
    (React key = `result.id` — duplicate ids would also break React reconciliation).
- `src/app/api/events/[id]/route.ts` — check what it returns for `results_final` (fields /
  sort) and whether it re-queries Strapi (`app.billiardtoday.com/api/bt-events/{id}`) with a
  populate that surfaces junction dupes.

## Suggested fix order

1. DB cleanup (server): dedupe the junction —
   ```sql
   DELETE FROM bt_results_final_event_lnk a USING bt_results_final_event_lnk b
   WHERE a.bt_result_final_id = b.bt_result_final_id
     AND a.bt_event_id = b.bt_event_id
     AND a.id > b.id;
   ```
   (verify against `bt_results_final_event_lnk` PK/columns first — Strapi v5 link tables may
   have `id`; confirm schema). Then re-check 425 → 70.
2. Backend (1-BilliardTodayAdmin): find `publish-final-results` path (controllers/services,
   `finalResultsPublisher.ts` mentioned in skills; POST `/api/bt-events/{docId}/publish-final-results`)
   — make it replace/upsert links instead of blindly INSERTing new junction rows on every publish.
3. Frontend guard (cheap, do regardless): dedupe `publishedFinalResults` by
   `documentId/id/playerDocumentId` in the useMemo before render, and drop the
   client-side final builders (Longoni/phaseScore) for events where
   `final_standings_published === true` (user rule).
4. Deploy: `bt-sync frontend` (+ `bt-sync app` if backend touched). Verify page after
   ~2 poll cycles (11-20 s) — names must appear exactly once.

## DB access

`ssh root@138.201.29.162` (key `D:\.ssh\billiard_admin_openssh.key`),
`PGPASSWORD='M@k154550' psql -h 127.0.0.1 -U postgres -d billiard_pg -t -A -c "SQL"`.
Strapi app dir: `/var/www/vhosts/billiardtoday.com/app.billiardtoday.com/httpdocs`.
Repos: `/srv/git/billiardtoday/{frontend,admin,strapi}`. bt-sync deploys as user
`billiardtoday_srv`. Frontend build gate: `npx tsc --noEmit` (no local next build).
