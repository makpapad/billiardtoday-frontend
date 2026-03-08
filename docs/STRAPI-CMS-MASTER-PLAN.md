# BilliardToday Strapi CMS Master Plan

## Goal

Να οριστικοποιηθεί μια ενιαία αρχιτεκτονική CMS για το BilliardToday, ώστε:

- το `1-BilliardTodayAdmin` να είναι το canonical content/data backend,
- το `2-billiardtoday-admin` να είναι το operator/editor console,
- το `5-billiardtoday-frontend` να είναι το public delivery frontend,
- και να σταματήσει η παράλληλη ύπαρξη πολλών ισότιμων CMS flows.

Το παρόν plan είναι το τελικό baseline που θα ακολουθήσουμε μέχρι completion.

## Final Decision

Επιλέγουμε **Strapi-first CMS**.

Δεν θα συνεχίσουμε με διπλό μοντέλο `Headless WordPress + Strapi CMS`.

Το WordPress μένει μόνο ως legacy source για προσωρινές υπάρχουσες public pages μέχρι να μεταφερθούν στο Strapi. Δεν επενδύουμε άλλο σε νέο headless WordPress integration.

## Project Roles

### 1. `D:\Projects\1-BilliardTodayAdmin`

Ρόλος: **Canonical backend και CMS source of truth**

Θα φιλοξενεί:

- tournament / player / result / scoreboard data
- CMS content types
- media library
- site settings
- SEO data
- public read models για frontend consumption

Υπάρχει ήδη βάση για αυτό:

- `page` collection type
- `site-setting` single type
- reusable CMS components
- tournament engine και custom APIs

### 2. `D:\Projects\2-billiardtoday-admin`

Ρόλος: **Admin console / editorial shell / BFF**

Θα φιλοξενεί:

- protected admin UI
- το CMS UI που θα χρησιμοποιούν οι business users / editors
- CMS page list / page editor / settings editor
- operational admin UI για tournaments, results, screens
- proxy routes προς Strapi
- auth / permissions / operator workflows

Δεν είναι canonical CMS database.

Το CMS layer που υπάρχει εδώ παραμένει, αλλά λειτουργεί ως UI πάνω από το Strapi, όχι ως ανεξάρτητο CMS product.

### 3. `D:\Projects\5-billiardtoday-frontend`

Ρόλος: **Public website / public app**

Θα φιλοξενεί:

- public pages
- tournament listings
- results / players / clubs / teams public views
- SSR / SEO rendering
- public CMS rendering από Strapi
- selective consumption των admin APIs όπου υπάρχει operational ανάγκη

Δεν γράφει CMS content. Μόνο διαβάζει.

## What We Found

## `1-BilliardTodayAdmin`

Υπάρχει ήδη σωστή CMS βάση:

- `src/api/page/content-types/page/schema.json`
- `src/api/site-setting/content-types/site-setting/schema.json`
- `src/components/cms/*`
- `docs/cms-phase1-runbook.md`

Άρα το Strapi είναι ήδη ο φυσικός owner για pages, sections, SEO, navigation και site settings.

## `2-billiardtoday-admin`

Υπάρχει ήδη σημαντική CMS υποδομή:

- protected CMS area στο `/admin/cms`
- CRUD API routes για `pages` και `site-setting`
- public handoff route `/api/public/cms/[slug]`
- page templates
- themes / patterns / plugin registry

Σημαντικό: το υπάρχον CMS UI μιλάει ήδη απευθείας με τα Strapi `pages` και `site-setting`.

Άρα δεν χρειάζεται νέο CMS admin από το μηδέν. Χρειάζεται καθάρισμα και ξεκάθαρα boundaries.

## `5-billiardtoday-frontend`

Υπάρχει usable public βάση, αλλά σήμερα είναι mixed:

- WordPress-driven home / catch-all pages
- Strapi tournament/player API usage
- legacy `landing-contents` flow
- placeholder tournament detail pages
- mock admin/live endpoints

Αυτό το project πρέπει να γίνει το τελικό public frontend, αλλά με Strapi-first content sourcing.

## Canonical Ownership Matrix

| Concern | Canonical Owner | Notes |
|---|---|---|
| CMS pages | Strapi | `page` content type |
| Site settings / nav / footer / default SEO | Strapi | `site-setting` single type |
| Media | Strapi | one media library |
| Tournaments / players / results / standings | Strapi + custom APIs | ήδη εκεί |
| Admin workflows | Next admin | UI + protected proxy routes |
| Public page rendering | Frontend | SSR/SEO in `5-billiardtoday-frontend` |
| WordPress content | Legacy only | migrate out progressively |
| Themes / patterns | Transitional in Next admin, final data exposed from Strapi-backed config | see Phase 4 |

## Architecture We Will Follow

## A. Content Flow

1. Editors δουλεύουν στο `2-billiardtoday-admin`
2. Το admin γράφει στο Strapi `pages`, `site-setting`, media και related CMS models
3. Το `5-billiardtoday-frontend` διαβάζει μόνο από Strapi-oriented public contracts
4. Οι public pages γίνονται SSR στο frontend

## B. Operational Data Flow

1. Tournament operators δουλεύουν στο `2-billiardtoday-admin`
2. Το admin μιλάει με Strapi tournament APIs / custom endpoints
3. Το `5-billiardtoday-frontend` διαβάζει read-only public tournament data
4. Live/volatile data γίνεται fetch μέσω dedicated frontend server routes

## C. Rendering Rule

Public rendering owner είναι μόνο το `5-billiardtoday-frontend`.

Το `2-billiardtoday-admin` μπορεί να κρατήσει preview routes και editor preview, αλλά δεν είναι το production public CMS frontend.

## Why This Decision

1. Το Strapi ήδη περιέχει το domain data και έχει έτοιμο CMS schema.
2. Το Next admin ήδη δουλεύει ως proxy/editor shell πάνω στο Strapi.
3. Το public frontend είναι ήδη Next.js app και είναι σωστή βάση για SEO/public delivery.
4. Το WordPress σήμερα προσθέτει δεύτερο content model και αυξάνει drift.
5. Το υπάρχον duplication (`WordPress pages`, `Strapi landing-contents`, `Strapi pages`, admin CMS templates) θα γίνει χειρότερο αν δεν σταματήσει τώρα.

## Non-Negotiable Rules

1. Κάθε public CMS page πρέπει να έχει ένα canonical slug στο Strapi.
2. Δεν δημιουργούμε νέο content στο WordPress.
3. Δεν δημιουργούμε δεύτερο CMS schema μέσα στο `5-billiardtoday-frontend`.
4. Οι CMS χρήστες δουλεύουν μόνο μέσα από το `2-billiardtoday-admin`, όχι από το frontend και όχι από ad-hoc flows.
5. Κάθε public page render περνά από typed server-side mapping layer.
6. Το production public route δεν θα εξαρτάται από το `2-billiardtoday-admin`.
7. Το frontend δεν αποθηκεύει CMS content απευθείας.

## Current Gaps We Must Fix

## Gap 1: WordPress είναι ακόμα owner του public content

Σήμερα:

- `src/app/page.tsx` στο frontend τραβάει WordPress landing data
- `src/app/[...slug]/page.tsx` τραβάει WordPress pages

Αυτό πρέπει να αντικατασταθεί από Strapi page rendering.

## Gap 2: Υπάρχει legacy CMS flow `landing-contents`

Σήμερα:

- `src/lib/strapi-content.ts` στο frontend γράφει/διαβάζει `landing-contents`

Αυτό είναι δεύτερο, παράλληλο content model και πρέπει να αποσυρθεί.

## Gap 3: Το admin CMS public rendering είναι incomplete

Σήμερα στο `2-billiardtoday-admin`:

- public CMS rendering διαβάζει Strapi page
- αλλά πρακτικά αποδίδει μόνο `cms.rich-text-section`

Ενώ το Strapi schema υποστηρίζει:

- `cms.hero-section`
- `cms.rich-text-section`
- `cms.feature-grid-section`
- `cms.cta-banner`
- `cms.faq-section`

Άρα το renderer/model mapping είναι ελλιπές.

## Gap 4: Themes / patterns είναι file-backed στο Next admin

Αυτό είναι αποδεκτό προσωρινά για editor UX, αλλά δεν είναι τελικό CMS persistence model.

Για production completion, το active appearance state πρέπει να εκτίθεται με σταθερό contract προς το public frontend, κατά προτίμηση από Strapi-backed configuration.

## Gap 5: Public frontend data layer έχει drift

Σήμερα υπάρχουν:

- duplicate API access patterns
- mixed entity naming
- mock endpoints
- placeholder public pages

Πρέπει να μπει ενιαίο BFF/data access layer.

## Final Target State

Όταν το plan ολοκληρωθεί:

- το homepage θα είναι Strapi page
- τα static marketing/legal/about/contact pages θα είναι Strapi pages
- τα site settings θα έρχονται από Strapi
- το navigation/footer/SEO defaults θα έρχονται από Strapi
- τα tournaments/results/players/clubs/teams θα εμφανίζονται στο public frontend με καθαρό typed data layer
- το `2-billiardtoday-admin` θα είναι ο μόνος editorial/operator console
- το WordPress δεν θα είναι dependency για public content rendering

## Execution Plan

## Phase 1: Freeze And Canonicalize

Στόχος: να σταματήσει το drift πριν γίνουν άλλα features.

### Tasks

1. Ορίζουμε επίσημα ότι canonical CMS είναι το Strapi.
2. Freeze σε νέο public content μέσα στο WordPress.
3. Freeze σε νέο usage του `landing-contents`.
4. Το `2-billiardtoday-admin` κρατιέται ως CMS editor shell μόνο για Strapi models.
5. Γράφουμε και ακολουθούμε ένα κοινό schema contract για pages/site settings/render data.

### Deliverables

- architecture decision recorded
- source-of-truth matrix accepted
- no new WordPress-based pages
- no new frontend direct-write CMS logic

## Phase 2: Stabilize Strapi CMS Model

Στόχος: να σφίξουμε το Strapi schema και να καλύψουμε τα πραγματικά page needs.

### Tasks

1. Review και finalize των `page` και `site-setting` models.
2. Επιβεβαίωση ότι τα reusable components καλύπτουν:
   - hero
   - rich text
   - feature grid
   - CTA
   - FAQ
   - SEO
   - nav links
   - social links
3. Προσθήκη missing fields μόνο αν είναι πραγματικά απαραίτητα.
4. Καθαρό permission model:
   - public read μόνο όπου χρειάζεται
   - editor/admin write μόνο μέσω authenticated roles
5. Προσθήκη stable query contracts για public frontend consumption.

### Required Decision

Για header navigation children υπάρχει ήδη ένδειξη schema mismatch στο Next admin fallback logic. Αυτό πρέπει να λυθεί οριστικά στο Strapi schema, όχι με μόνιμα fallbacks.

### Deliverables

- finalized Strapi CMS schema
- stable permissions
- stable public query contract

## Phase 3: Make Next Admin The Only Editor Console

Στόχος: να κρατήσουμε όλο το editorial UX στο `2-billiardtoday-admin`, αλλά πάντα με Strapi ως backend.

### Tasks

1. Καθαρισμός `/admin/cms` routes ώστε να είναι strictly Strapi-backed.
2. Pages list / create / edit / publish flow να δουλεύουν πλήρως.
3. Site settings editor να δουλεύει πάνω στο Strapi single type.
4. Media picker να μιλάει στο Strapi upload/media.
5. Builder / templates να παράγουν valid Strapi `sections`.
6. Preview route να χρησιμοποιείται μόνο για preview/editor use.

### Important Rule

Το `2-billiardtoday-admin` δεν πρέπει να γίνει δεύτερο public CMS site. Είναι admin/editor app.

### Deliverables

- stable editorial workflow
- preview flow
- no schema drift between admin UI and Strapi

## Phase 4: Finalize Appearance Strategy

Στόχος: να αποφασίσουμε ποια CMS appearance δεδομένα μένουν και πού.

### Final Direction

Για production completion:

- page content παραμένει στο Strapi
- site settings παραμένουν στο Strapi
- active theme tokens πρέπει να εκτίθενται από Strapi-backed configuration
- patterns/templates μπορούν να μείνουν admin-side utilities, όχι canonical public content storage

### Practical Choice

Δεν μετατρέπουμε templates/patterns σε public source of truth.

Τα templates είναι authoring accelerators.
Το canonical output είναι το τελικό Strapi page record.

### Deliverables

- appearance contract finalized
- public frontend reads one active appearance source

## Phase 5: Migrate Public Frontend To Strapi CMS

Στόχος: το `5-billiardtoday-frontend` να γίνει ο production public renderer του Strapi CMS.

### Tasks

1. Δημιουργία νέου typed CMS layer στο frontend:
   - `src/lib/cms/strapi.ts`
   - `src/lib/cms/mappers.ts`
   - `src/lib/cms/types.ts`
2. Fetch site settings από Strapi.
3. Fetch page by slug από Strapi.
4. SSR rendering για CMS pages.
5. Metadata generation από Strapi SEO.
6. Δημιουργία section renderer για:
   - hero
   - rich text
   - feature grid
   - CTA banner
   - FAQ
7. Αντικατάσταση WordPress home page.
8. Αντικατάσταση WordPress catch-all pages.
9. Αφαίρεση dependency στο `src/lib/wordpress.ts` για production public routes.
10. Αφαίρεση dependency στο `src/lib/strapi-content.ts`.

### Deliverables

- homepage from Strapi
- dynamic CMS pages from Strapi
- nav/footer/default SEO from Strapi
- WordPress no longer needed for public rendering

## Phase 6: Unify Public Sports Data Layer

Στόχος: το frontend να έχει καθαρό separation ανάμεσα σε CMS content και sports data.

### Tasks

1. Ξεχωριστό layer για CMS content.
2. Ξεχωριστό layer για tournaments/results/players/clubs/teams.
3. Rewrite των frontend API routes ώστε να έχουν consistent naming/contracts.
4. Remove mock endpoints από public flow.
5. Replace placeholder routes με πραγματικά public pages.
6. Prefer server components / server fetching όπου υπάρχει SEO ανάγκη.
7. Use client-side polling μόνο για live data.

### Deliverables

- clean public data architecture
- no duplicated entity contracts
- real tournament detail pages

## Phase 7: WordPress Retirement

Στόχος: να φύγει το WordPress από το critical path του public frontend.

### Tasks

1. Καταγραφή όλων των public pages που σήμερα εξαρτώνται από WordPress.
2. Μεταφορά τους σε Strapi pages.
3. Redirect policy όπου χρειάζεται.
4. Removal of WordPress fetches from production routes.

### Deliverables

- WordPress removed from public content path

## Route Strategy

## Public CMS Routes In Frontend

Προτείνεται:

- `/` -> Strapi page slug `home`
- `/{slug}` για standard CMS pages
- reserved namespaces για app areas:
  - `/tournaments`
  - `/players`
  - `/clubs`
  - `/teams`
  - `/rankings`
  - `/live`

Το catch-all route δεν πρέπει να “καταπίνει” app namespaces.

## Admin Routes

Παραμένουν στο `2-billiardtoday-admin`:

- `/admin/cms/pages`
- `/admin/cms/pages/new`
- `/admin/cms/pages/[id]`
- `/admin/cms/site-settings`
- `/admin/cms/themes`
- `/admin/cms/patterns`
- `/admin/cms/templates`
- `/admin/cms/builder`

## Data Contracts To Standardize

## Contract 1: Page By Slug

Το frontend πρέπει να παίρνει:

- slug
- title
- summary
- pageType
- sections
- seo
- updatedAt

## Contract 2: Site Settings

Το frontend πρέπει να παίρνει:

- siteName
- siteTagline
- logo
- headerLinks
- footerLinks
- socialLinks
- defaultSeo

## Contract 3: Appearance

Το frontend πρέπει να παίρνει:

- theme tokens
- fonts
- any page-level overrides μόνο αν είναι explicit requirement

## Contract 4: Tournament Public Read Models

Το frontend πρέπει να παίρνει separate, stable read models για:

- tournament listing
- tournament detail
- stages
- standings
- final results
- player public profile
- club public profile

## What We Will Keep

## From `1-BilliardTodayAdmin`

- page/site-setting models
- CMS components
- media
- tournament engine
- custom sports APIs

## From `2-billiardtoday-admin`

- CMS admin shell
- CRUD routes over Strapi
- page templates as editor accelerators
- builder UX
- theme/pattern management UX where useful

## From `5-billiardtoday-frontend`

- Next.js public app foundation
- tournament/player/club/team public sections
- deployment setup
- reverse proxy/public route direction

## What We Will Remove Or Deprecate

- WordPress as primary public content source
- `landing-contents` flow
- public CMS rendering ownership inside `2-billiardtoday-admin`
- mock live CMS/admin endpoints in production path
- duplicated frontend API shapes for same entities

## Risks

1. Schema drift ανάμεσα σε Strapi components και frontend renderers.
2. Theme system drift αν μείνει μόνιμα file-based μόνο στο Next admin.
3. Temporary coexistence με WordPress μπορεί να παρατείνει την αβεβαιότητα.
4. Public routes μπορεί να σπάσουν αν δεν οριστούν ξεκάθαρα reserved namespaces.
5. SEO regressions αν η migration γίνει χωρίς metadata parity.

## How We Control Risk

1. Canonical contracts first.
2. Feature freeze σε νέο WordPress content.
3. Incremental migration ανά route.
4. Preview before publish.
5. Redirect map for migrated pages.
6. SSR-first for public CMS pages.

## Definition Of Done

Το πρόγραμμα θεωρείται ολοκληρωμένο όταν:

1. Όλες οι public CMS pages σερβίρονται από το `5-billiardtoday-frontend`.
2. Όλο το public CMS content διαβάζεται από Strapi.
3. Το `2-billiardtoday-admin` είναι ο μόνος editor/operator console.
4. Το WordPress δεν είναι dependency για public content pages.
5. Δεν υπάρχει active χρήση του `landing-contents`.
6. Το navigation/footer/default SEO προέρχονται από Strapi.
7. Το frontend έχει typed section renderer για όλα τα supported CMS components.
8. Τα tournaments/results/players/clubs/teams έχουν καθαρό public data layer.

## Immediate Next Work Order

Αυτή είναι η σειρά που πρέπει να ακολουθήσουμε χωρίς απόκλιση:

1. Finalize Strapi CMS schema and permissions.
2. Stabilize Next admin CMS editor flows against Strapi.
3. Build Strapi CMS rendering layer in `5-billiardtoday-frontend`.
4. Replace WordPress homepage and catch-all pages.
5. Remove `landing-contents`.
6. Unify public sports data contracts.
7. Retire WordPress from public CMS path.

## Final Call

Δεν ξεκινάμε νέο project.

Προχωράμε με τα τρία υπάρχοντα projects, με ξεκάθαρους ρόλους:

- **Strapi = source of truth**
- **Next admin = editor and operations console**
- **Frontend = public renderer**

Αυτό είναι το baseline plan που θα ακολουθήσουμε μέχρι completion.
