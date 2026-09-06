# Lier 2026 World Cup 3-Cushion — duplicate names in the final standings: RESOLVED 2026-09-06

## Symptom
Frontend "Final standings" (γενική κατάταξη) of https://billiardtoday.com/tournaments/world-cup-3-cushion-lier-2026
showed the same player multiple times; it appeared/aggravated whenever the page polled
(event payload poll every 10 s).

## Root cause (verified)
**An automatic publish loop in the backend kept deleting+recreating `bt_results_final` rows
for the event every ~60 s** (observed live: count oscillated 0 → 260 → 628 → 13 in loops;
rows created with `source='umb-world-3c-final-ranking'`, `created_by NULL`).

Chain:
1. Event Lier (id 514, documentId `e8e9634d-7f81-429c-8e08-ada646adc353`) finished its KO stage.
2. `bt-group` `afterUpdate` lifecycle → `checkAndCalculateGroupStandings` + `autoAdvanceBracketWinner` + `resolveTimetablePlaceholdersForMatch`.
3. `timetablePlaceholderResolver` → `publishFinalRankingWhenComplete` (groupOfFourAdvancer) → `publishFinalResults` (delete all + recreate).
4. Inside `publishFinalResults` → `refreshPersistedGroupStandings` writes bt_groups rows → fires `afterUpdate` again → loop forever.
5. Frontend poll lands on mid-publish states → duplicate rows in `/api/events/{docId}` → double names.

**Critical trap:** the Strapi app (`npm run start` = `strapi start`) runs the **compiled `dist/`**
build (built 2026-09-06 21:00), NOT `src/`. Source-only patches have NO effect until rebuilt.
Verify before debugging server behavior: `grep -c 'guard string' httpdocs/dist/src/services/...js`.

Why only Lier / only the final ranking: only an event whose KO stage is complete triggers the
auto-publish chain; per-stage rankings come from bt_results and are untouched. Older finished
tournaments settle after one publish because nothing writes their groups again — Lier's own
republish was self-sustaining.

## Fixes applied (ALL live 2026-09-06 ~23:20)

1. **Frontend (deployed, commit on billiardtoday-frontend):** dedupe of `publishedFinalResults`
   by player (doc id → numeric id → normalized name), keep the richest row, ties prefer lower
   position — `TournamentEventsContent.tsx` `publishedFinalResults` useMemo (~L3552).
2. **Backend `dist/` hotfix + `src/` (committed on billiards-strapi, `main`):**
   - `finalResultsPublisher.ts` `publishFinalResults`: auto-republish (no manual rows) is
     skipped when `final_standings_published_at` is < 60 s old (cooldown). Manual admin
     publishes always bypass.
   - `groupOfFourAdvancer.ts` `publishFinalRankingWhenComplete`: skips when finals were
     published AFTER the latest KO-stage bt_groups update (raw SQL on
     `bt_groups_event_stage_lnk` by koStageId) — only a real KO result change republishes.
3. DB cleaned: single set of 107 stored rows for the event; `/api/events/{docId}` now returns
   107 rows, 0 duplicate names, correct order (1 CHO … shared 3rd BAO/KARAKURT).

## Verification
- 28 consecutive 6 s samples (~2.8 min) with a fixed count (107/107) after the dist patch + restart.
- API: `results_final` 107 rows / 107 distinct / 0 dup names.
- The publish endpoint POST `/api/bt-events/{docId}/publish-final-results` (`smallFinal:false`)
  works and now reports `cooldownSkipped:true` on repeated quick calls.

## Reminders
- Re-publishing finals for Lier later (real data change) still works via the admin Publish button.
- If a future `bt-sync app`/`strapi build` runs, the src guards (committed) rebuild into dist —
  do NOT revert; if dist is rebuilt manually, ensure both guards exist in dist afterwards.
- External cuesco sync for Lier is disabled in the admin (`externalResultSync.enabled=false`) —
  re-enable only when the tournament data is final if needed.
