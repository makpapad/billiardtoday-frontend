# Players Page Performance Handoff - 2026-04-23

## Scope

Work happened in the frontend repo:

- Local path: `D:\Projects\4-billiardtoday-frontend`
- Main page: `src/app/players/[id]/page.tsx`
- Related API route: `src/app/api/players/[id]/history/route.ts`
- Deploy notes: `docs/ai/06-server-sync.md`

The goal was to make the player profile page feel fast when opening a player's statistics.

## User Requirements

- Initial player page load must be fast.
- The first screen should show player identity and overall stats.
- Tournament history should load only after the user selects a season.
- Performance chart should appear after selecting a game type.
- H2H should appear after selecting a game type.
- The `Events` card should still show a value after selecting a game type and should not wait unnecessarily for the slow history request.

## Implemented Commits

- `96cfadf Speed up player profile initial stats load`
  - Removed the expensive full history load from the initial page load.
  - Initial page now relies on `career_stats` from the player lookup.
  - Game type options and chart data can be derived from `career_stats`.
  - Tournament history remains hidden until a more specific selection.

- `e8013c8 Load player H2H after game selection`
  - H2H/history fetch starts after selecting a game type.
  - H2H no longer requires selecting a season first.
  - Tournament list still waits for season selection.

- `b632810 Show player event count from career stats`
  - `Events` count now uses `career_stats.events.bySeason` immediately when it can be calculated reliably.
  - The history `totalCount` can replace it when the slower request finishes.
  - Previous `historyTotalCount` is cleared when changing filters to avoid showing stale counts.

## Current Behavior

- Opening `/players/218-JASPERS-Dick` responds server-side in about `0.02s` in production health checks.
- With `All games`, overall stats display from precomputed `career_stats`.
- After selecting a game type:
  - Stats cards use precomputed career stats where possible.
  - Chart appears from `career_stats.byYear`.
  - H2H/history starts loading in the background.
  - `Events` attempts to show immediately from career stats and then can update from history.
- After selecting a season:
  - Tournament history list is fetched and shown.

## Follow-up Completed

Implemented after the handoff:

- Backend repo: `D:\Projects\1-billiards-strapi`
- Backend file: `src/api/bt-player/services/calculate-stats.ts`
- Frontend file: `src/app/players/[id]/page.tsx`

`career_stats.events` now includes exact per-game event counts:

```json
{
  "events": {
    "byGameType": {
      "Three-Cushion": 91
    },
    "byGameTypeBySeason": {
      "2026": {
        "Three-Cushion": 1
      }
    }
  }
}
```

The frontend now prefers these fields for the `Events` card and only falls back to the previous `bySeason`/`byYear` inference for older cached `career_stats` payloads.

## Validation Done

Local:

```powershell
npm run build
```

Production deploy and checks:

```powershell
plink -batch -i D:\.ssh\billiard_admin.ppk root@138.201.29.162 "bt-sync frontend && sleep 10 && curl -I http://127.0.0.1:3022/ && su -s /bin/bash - billiardtoday_srv -c 'pm2 status billiardtoday-frontend --no-color' && curl -s -o /dev/null -w 'player_page_status=%{http_code} time=%{time_total}\n' http://127.0.0.1:3022/players/218-JASPERS-Dick"
```

Last production status after `b632810`:

- Build passed.
- `billiardtoday-frontend` PM2 app online.
- `/` returned `200 OK`.
- `/players/218-JASPERS-Dick` returned `200`, about `0.022s`.

## Next Useful Step

Recalculate existing player `career_stats` records after deploying the backend change so production rows receive the new `events.byGameType` and `events.byGameTypeBySeason` fields.
