# Public Site Migration Plan

Plan for evolving `4-billiardtoday-frontend` from a `/tournaments`-scoped app into the main public BilliardToday site.

## Goal

Use this Next.js app as the single public frontend for:

- Homepage
- Tournaments and events
- Player pages
- Club pages
- Federation pages
- Embed / iframe variants

Data remains in Strapi. The scoreboard remains separate on its own subdomain and is out of scope for this phase.

## Current State

Today the app is strongly shaped around a `/tournaments` base path:

- [`next.config.js`](D:/Projects/4-billiardtoday-frontend/next.config.js)
- [`README.md`](D:/Projects/4-billiardtoday-frontend/README.md)
- [`nginx-plesk.conf`](D:/Projects/4-billiardtoday-frontend/nginx-plesk.conf)
- [`ARCHITECTURE.md`](D:/Projects/4-billiardtoday-frontend/ARCHITECTURE.md)

Existing app routes already include useful starting points:

- [`src/app/tournaments`](D:/Projects/4-billiardtoday-frontend/src/app/tournaments)
- [`src/app/players`](D:/Projects/4-billiardtoday-frontend/src/app/players)
- [`src/app/clubs`](D:/Projects/4-billiardtoday-frontend/src/app/clubs)
- [`src/app/embed`](D:/Projects/4-billiardtoday-frontend/src/app/embed)

## Target Route Model

Recommended public route structure:

- `/`
- `/tournaments`
- `/tournaments/[slug]`
- `/tournaments/[slug]/results`
- `/players`
- `/players/[slug]`
- `/clubs`
- `/clubs/[slug]`
- `/federations`
- `/federations/[slug]`
- `/embed/tournaments/[slug]`
- `/embed/players/[slug]`
- `/embed/clubs/[slug]`
- `/embed/federations/[slug]`

## Product Rules

- Next.js remains the only public renderer.
- Strapi remains the canonical backend for content and structured data.
- The scoreboard stays on its own subdomain and is only linked or embedded where needed.
- Public pages should use template-driven sections, not a free-form page builder.
- Embed pages should use dedicated routes, not a query-flag-only layout.

## Architecture Direction

### Full Pages

Used for normal public visitors:

- shared site layout
- global navigation
- footer
- SEO metadata
- richer storytelling sections

### Embed Pages

Used for iframe integrations:

- minimal shell
- no global navigation/footer
- compact spacing
- stable aspect-ratio-friendly layout
- CSP / frame-ancestors compatible with allowed origins

## Strapi Content Direction

Do not model this as arbitrary page-builder content.

Prefer structured presentation config per entity type:

- tournament presentation
- player presentation
- club presentation
- federation presentation

Typical configurable concerns:

- template key
- visible sections
- section order
- hero mode
- featured stats
- sponsor strip on/off
- embed mode variant
- accent/theme selection

## Delivery Phases

### Phase 1: Remove `/tournaments`-Only Assumption

Update:

- [`next.config.js`](D:/Projects/4-billiardtoday-frontend/next.config.js)
- [`README.md`](D:/Projects/4-billiardtoday-frontend/README.md)
- [`nginx-plesk.conf`](D:/Projects/4-billiardtoday-frontend/nginx-plesk.conf)
- [`ARCHITECTURE.md`](D:/Projects/4-billiardtoday-frontend/ARCHITECTURE.md)

Tasks:

- make root-level hosting the default model
- stop assuming production `basePath` is `/tournaments`
- keep embed headers/CSP support
- document the new deployment topology

### Phase 2: Establish Public Shells

Create or refine:

- root homepage
- shared public layout
- shared theme tokens
- entity page layout primitives
- embed layout primitive

### Phase 3: Build First Vertical Slice

Build this first:

- homepage
- tournaments listing
- tournament detail
- tournament embed

Reason:

- highest immediate value
- validates data flow
- validates full + embed dual rendering
- gives a reusable pattern for players/clubs/federations

### Phase 4: Extend to Entity Pages

Add:

- players
- clubs
- federations

Each should follow the same structure:

- full page template
- compact embed template
- shared data loading helpers

## Recommended UI System

Do not build these pages as generic CMS output.

Use a presentation system built from:

- curated templates
- reusable sections
- entity-aware components
- strong visual themes

Examples of sections:

- hero
- profile summary
- stats band
- standings/results block
- recent matches
- gallery/media
- federation or club identity
- sponsors
- CTA

## Immediate Technical Tasks

1. Remove default production `basePath` from [`next.config.js`](D:/Projects/4-billiardtoday-frontend/next.config.js)
2. Redefine deployment docs around root-level public hosting
3. Audit existing routes under [`src/app`](D:/Projects/4-billiardtoday-frontend/src/app)
4. Choose final URL naming:
   - recommended: `/tournaments`
5. Build one shared public design system layer before new page rewrites
6. Ship tournament full + embed as the reference implementation

## Decision Summary

- Keep this repo
- Do not create a new public frontend repo
- Promote this app into the main public site
- Keep scoreboard separate
- Use Strapi + Next only
- Prefer structured presentation over a free-form CMS editor
