# Strapi CMS Phase 1 Checklist

## Scope

Phase 1 σημαίνει `Freeze And Canonicalize`.

Δεν κάνουμε ακόμα migration του public rendering. Κλειδώνουμε ownership, παγώνουμε legacy directions και ορίζουμε τα contracts που θα ακολουθήσουν οι επόμενες φάσεις.

## Phase 1 Decision

### Canonical Setup

- `1-BilliardTodayAdmin` = Strapi source of truth
- `2-billiardtoday-admin` = CMS UI που χρησιμοποιούν οι editors/users
- `5-billiardtoday-frontend` = public renderer

### Editor Rule

Οι CMS χρήστες θα δουλεύουν στο Next admin.

Το Strapi admin παραμένει technical/admin tool, όχι το κύριο editorial UI για καθημερινούς χρήστες.

## Freeze Rules

### Allowed

- Strapi schema stabilization
- Next admin CMS UX improvements που γράφουν σε Strapi
- documentation/contracts/typed models
- read-only legacy support για υπάρχον WordPress pages μέχρι migration

### Forbidden From Now On

- νέο public content authored στο WordPress
- νέο frontend code που αποθηκεύει CMS content απευθείας
- νέο usage του `landing-contents`
- νέο public rendering logic που εξαρτάται από το `2-billiardtoday-admin`
- νέο parallel CMS schema εκτός Strapi

## Legacy Inventory To Migrate Later

### WordPress-Dependent Frontend Files

- `src/app/page.tsx`
- `src/app/[...slug]/page.tsx`
- `src/lib/wordpress.ts`
- `src/app/components/landing/wordpressLanding.tsx`
- `src/app/components/landing/Hero.tsx`
- `src/app/components/landing/Stats.tsx`
- `src/app/components/wp/WpPageTemplate.tsx`
- `src/app/components/wp/WpNavigation.tsx`

### Legacy Strapi CMS Flow

- `src/lib/strapi-content.ts`

Αυτό το flow θεωρείται deprecated από τη Phase 1 και μετά.

## Canonical Ownership Checklist

- [x] `page` lives in Strapi
- [x] `site-setting` lives in Strapi
- [x] media lives in Strapi
- [x] tournaments/results/players/stages live in Strapi/custom Strapi APIs
- [x] CMS authoring UI lives in `2-billiardtoday-admin`
- [x] public rendering target is `5-billiardtoday-frontend`
- [ ] WordPress removed from public content path
- [ ] `landing-contents` removed from active usage

## Contracts That Must Exist Before Phase 2 Ends

- [x] page-by-slug contract defined
- [x] site-settings contract defined
- [x] appearance contract defined
- [x] CMS section inventory defined
- [ ] final typed frontend mapping layer implemented

## Open Issues Identified In Phase 1

### 1. Header link children schema mismatch

Το `2-billiardtoday-admin` έχει fallback logic για `headerLinks.children`.

Αυτό δείχνει ότι το contract δεν έχει κλειδώσει πλήρως ανάμεσα σε admin UI και Strapi schema. Πρέπει να λυθεί σε schema/query level στη Phase 2.

### 2. Public CMS rendering in Next admin is incomplete

Το `2-billiardtoday-admin` public CMS flow αυτή τη στιγμή αποδίδει κυρίως `cms.rich-text-section`.

Δεν είναι production-ready renderer για όλα τα Strapi components.

### 3. Frontend still depends on WordPress for homepage and catch-all pages

Αυτό είναι αποδεκτό μόνο προσωρινά ως legacy bridge.

## Acceptance Criteria For Phase 1

Η Phase 1 θεωρείται done όταν:

1. Υπάρχει ξεκάθαρη αποδοχή του owner matrix.
2. Το Next admin αναγνωρίζεται ως το CMS UI για τους χρήστες.
3. Υπάρχει freeze σε νέα WordPress-authoring work.
4. Υπάρχει freeze σε νέο `landing-contents` usage.
5. Υπάρχει explicit contract document για public frontend consumption.
6. Υπάρχουν code-level markers που δείχνουν τι είναι legacy και τι όχι.

## Next Step After Phase 1

Μετά τη Phase 1 προχωράμε σε:

1. Strapi schema stabilization
2. Next admin CMS flow hardening
3. frontend Strapi CMS rendering layer
