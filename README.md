# Billiard Today Public Frontend

Next.js public frontend for Billiard Today. This repo is the main public site and renders root-level routes such as `/`, `/tournaments`, `/players`, `/clubs`, `/federations`, and `/embed/*`.

## Local development

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3022`.

## Environment

Create `.env.local`:

```env
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
NEXT_PUBLIC_SITE_URL=http://localhost:3022
NEXT_PUBLIC_SCOREBOARD_URL=http://localhost:3001
NEXT_PUBLIC_ADMIN_URL=http://localhost:3000
```

Optional:

```env
NEXT_PUBLIC_BASE_PATH=
EMBED_ALLOWED_ORIGINS=*
STRAPI_API_TOKEN=
CMS_ADMIN_URL=http://localhost:3000
```

`NEXT_PUBLIC_BASE_PATH` is empty by default because the app is now intended to run at the root of the public domain. Set it only if the site is deliberately reverse-proxied under a subpath.

## Route model

- `/`
- `/tournaments`
- `/tournaments/[slug]`
- `/players`
- `/players/[id]`
- `/clubs`
- `/clubs/[slug]`
- `/federations`
- `/federations/[slug]`
- `/embed/page/[slug]`
- `/embed/tournaments/[slug]`
- `/embed/tournaments/events`
- `/embed/players/[id]`
- `/embed/clubs/[slug]`
- `/embed/federations/[slug]`

## Architecture summary

- `Strapi` is the canonical content and structured data source.
- `admin.billiardtoday.com` manages data and presentation configuration.
- This repo renders the public site and iframe-safe embed pages.
- `scoreboard.billiardtoday.com` remains a separate product and deployment target.

## Commands

```bash
npm run dev
npm run build
npm start
npm run lint
```

## Deployment notes

- Default hosting target: `https://billiardtoday.com`
- Process manager: PM2
- Reverse proxy: Nginx
- Public app port: `3022`
- Strapi API: `https://app.billiardtoday.com`

Use [nginx-plesk.conf](./nginx-plesk.conf) as the baseline reverse proxy config for root hosting.
