# Billiard Today Public Site Architecture

## Overview

This frontend is the main public website for Billiard Today.

- `billiardtoday.com` -> Next.js public frontend on port `3022`
- `app.billiardtoday.com` -> Strapi CMS and structured data APIs
- `admin.billiardtoday.com` -> internal admin and presentation tooling
- `scoreboard.billiardtoday.com` -> separate live scoreboard application

## Public route surface

Core public routes:

- `/`
- `/tournaments`
- `/tournaments/[slug]`
- `/players`
- `/players/[id]`
- `/clubs`
- `/clubs/[slug]`
- `/federations`
- `/federations/[slug]`

Embed routes:

- `/embed/page/[slug]`
- `/embed/tournaments/[slug]`
- `/embed/tournaments/events`
- `/embed/players/[id]`
- `/embed/clubs/[slug]`
- `/embed/federations/[slug]`

## Data flow

1. Editors and admins manage content and structured data in Strapi and the internal admin tools.
2. This frontend fetches CMS pages, site settings, and entity data from Strapi-backed endpoints.
3. Public pages render full-site experiences.
4. Embed routes render iframe-safe variants with limited chrome.

## Rendering model

- `Next.js App Router`
- `Strapi` for CMS pages, site settings, and entity-backed content
- `CmsPageView` and shared presentation components for reusable page sections
- entity-specific routes for tournaments, players, clubs, and federations

The intended long-term direction is a template-driven presentation system, not a fully free-form page builder on the public site.

## Deployment model

- public frontend process on `localhost:3022`
- Nginx reverse proxy at the root domain
- PM2 for process supervision
- Strapi remains the API origin

## Security and embed policy

- normal public routes should not be embeddable cross-origin
- `/embed/*` routes can be allowed by CSP `frame-ancestors`
- the allowlist is driven by `EMBED_ALLOWED_ORIGINS`

## Current migration baseline

This repo has been moved away from a `/tournaments`-only deployment assumption and is now structured to serve the entire public site from the domain root.
