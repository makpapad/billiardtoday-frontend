# Google Search Console Handoff - 2026-04-23

## Scope

Work happened in the public frontend repo:

- Local path: `D:\Projects\5-billiardtoday-frontend`
- Production site: `https://billiardtoday.com`
- Production app path: `/var/www/vhosts/billiardtoday.com/httpdocs`
- Server deploy runbook: `docs/ai/06-server-sync.md`

The goal was to prepare the public frontend for Google Search Console ownership verification and sitemap submission.

## Implemented Code

Relevant files:

- `src/app/layout.tsx`
  - Adds Next metadata verification support:
    `process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`

- `src/app/robots.ts`
  - Serves `https://billiardtoday.com/robots.txt`
  - Allows public pages.
  - Disallows private/admin/API/embed/temporary operational routes.
  - Points Google to `https://billiardtoday.com/sitemap.xml`.

- `src/app/sitemap.ts`
  - Serves `https://billiardtoday.com/sitemap.xml`.
  - Includes static public routes plus dynamic clubs, federations, players, tournaments, and rankings.
  - Marked dynamic so it can fetch current Strapi-backed public data at request time.

- `.env.example`
  - Includes `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=`.

- `.env.production`
  - Includes a placeholder `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=`.
  - Important: the server `bt-sync frontend` deploy excludes `.env.production`, so the live production env is managed separately on the server.

Code commit originally deployed for this work:

- `91d75a4 Add Google indexing metadata`

The remote `main` may now have newer commits after this one. Do not reset history; just pull normally.

## Production Env Status

The live production env file was updated manually because `bt-sync frontend` preserves server env files:

```text
/var/www/vhosts/billiardtoday.com/httpdocs/.env.production
```

Current live Google verification env value:

```env
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=_ryuuy5hHIEsIEiY9W42wzYoa9DpRKVZLp_cxZzcVwA
```

This is the value from the Google HTML tag:

```html
<meta name="google-site-verification" content="_ryuuy5hHIEsIEiY9W42wzYoa9DpRKVZLp_cxZzcVwA" />
```

The token is visible in public HTML by design. Do not expose unrelated production secrets.

## Deployment Done

Production deploy followed `docs/ai/06-server-sync.md`:

```bash
bt-sync frontend
```

During deploy, the server-side repo at `/srv/git/billiardtoday/frontend` had a local `skip-worktree` tracked `.env.production` that blocked `git pull`. The repo copy was backed up, restored only inside the server-side git worktree, then fast-forwarded. The live env in `/var/www/vhosts/billiardtoday.com/httpdocs/.env.production` was not overwritten by `bt-sync`.

Old server-side repo env backups were moved out of the git worktree into `/root/` with `600` permissions.

After setting the verification token in live env, production was rebuilt and restarted:

```bash
cd /var/www/vhosts/billiardtoday.com/httpdocs
npm run build
su -s /bin/bash - billiardtoday_srv -c 'pm2 restart billiardtoday-frontend --update-env'
```

## Validation Done

Production checks passed:

- `https://billiardtoday.com/` returned `200`.
- `https://billiardtoday.com/robots.txt` returned `200`.
- `https://billiardtoday.com/sitemap.xml` returned `200`.
- Sitemap had `3252` `<url>` entries during the check.
- Public homepage HTML contained:

```html
<meta name="google-site-verification" content="_ryuuy5hHIEsIEiY9W42wzYoa9DpRKVZLp_cxZzcVwA" />
```

- PM2 app `billiardtoday-frontend` was `online`.

Useful verification commands:

```powershell
$html = (Invoke-WebRequest -Uri 'https://billiardtoday.com/' -UseBasicParsing -TimeoutSec 30).Content
$html -match '<meta name="google-site-verification" content="([^"]+)"'
$Matches[1]
```

```bash
curl -I https://billiardtoday.com/
curl -I https://billiardtoday.com/robots.txt
curl -I https://billiardtoday.com/sitemap.xml
curl -s https://billiardtoday.com/sitemap.xml | grep -c '<url>'
su -s /bin/bash - billiardtoday_srv -c 'pm2 status billiardtoday-frontend --no-color'
```

## Google Search Console Status

The property in Search Console is:

```text
https://billiardtoday.com/
```

The sitemap submitted was:

```text
/sitemap.xml
```

Search Console showed "sitemap submitted successfully". It may temporarily show "Could not fetch" while Google reprocesses; the live endpoint itself returns `200`.

Recommended next actions in Search Console:

1. Press Verify for the HTML tag ownership method if not already done.
2. In Sitemaps, keep `/sitemap.xml` submitted.
3. Use URL Inspection for:

```text
https://billiardtoday.com/
https://billiardtoday.com/tournaments
https://billiardtoday.com/players
https://billiardtoday.com/clubs
https://billiardtoday.com/federations
https://billiardtoday.com/rankings
```

4. Press Request indexing for the important public URLs.

## Working From Another Computer

Clone or update the frontend repo:

```bash
git clone https://github.com/makpapad/billiardtoday-frontend.git
cd billiardtoday-frontend
git pull origin main
npm ci
npm run build
```

Local env minimum:

```env
NEXT_PUBLIC_STRAPI_URL=https://app.billiardtoday.com
NEXT_PUBLIC_SITE_URL=http://localhost:3022
NEXT_PUBLIC_SCOREBOARD_URL=https://scoreboard.billiardtoday.com
NEXT_PUBLIC_ADMIN_URL=https://admin.billiardtoday.com
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=_ryuuy5hHIEsIEiY9W42wzYoa9DpRKVZLp_cxZzcVwA
```

For production deploys, do not copy repo `.env.production` over the server live env. Use the documented flow:

```bash
bt-sync frontend
curl -I http://127.0.0.1:3022/
su -s /bin/bash - billiardtoday_srv -c 'pm2 status billiardtoday-frontend --no-color'
```

## Notes

- `npm run build` passes. It may print existing warnings about outdated `baseline-browser-mapping` and `caniuse-lite`; those warnings are not deployment blockers.
- `npm ci` on production currently reports existing audit vulnerabilities. This was already present and was not addressed in the Search Console work.
- Do not run Node apps as `root`; PM2 belongs to `billiardtoday_srv`.
- Do not use ad-hoc deploy steps unless the documented `bt-sync` path is blocked and the reason is understood.
