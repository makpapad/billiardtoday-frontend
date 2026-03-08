# Strapi CMS Puck Migration Plan

## Snapshot Date

- 2026-03-07

## Decision

The current visual builder in `2-billiardtoday-admin` will be fully replaced for public CMS pages.

We will move to a schema-first visual editor built around `Puck`, with Strapi sections as the canonical save format.

## Why We Are Replacing The Current Builder

The current builder is not aligned with the architecture we have locked:

- public pages are now rendered from structured Strapi sections
- the frontend expects typed CMS sections
- the current builder still thinks in exported HTML/CSS blobs
- non-technical users need a safer and simpler editing model

The current builder can still preview content, but it is not a reliable canonical editor for public pages because:

- it can flatten structured pages into one `cms.rich-text-section`
- it has an HTML-first mental model
- it exposes too much low-level editing freedom for editorial users
- it increases the chance of schema drift and rendering regressions

## Target End State

For public CMS pages, the editorial flow will become:

1. user opens a page in `2-billiardtoday-admin`
2. user edits the page in a visual block editor powered by `Puck`
3. the editor loads and saves Strapi `sections`
4. the public frontend renders exactly those sections

There will be no canonical raw-HTML publish path for public CMS pages.

## Scope Of Replacement

The Puck-based editor will replace the current builder only for public CMS page authoring.

It will cover these section types first:

- `cms.hero-section`
- `cms.rich-text-section`
- `cms.feature-grid-section`
- `cms.cta-banner`
- `cms.faq-section`

This is enough to cover the current homepage and the first generation of editorial pages.

## What We Keep

We keep:

- Strapi page/site-setting schema
- Next admin CMS routes and auth
- frontend section renderer
- structured page form as temporary fallback

We do not keep the current builder as the canonical editor for protected public pages.

## Implementation Strategy

## Phase A. Freeze The Old Builder

Goal:

- stop further investment in the current GrapesJS-based public page builder

Actions:

- keep current server-side protection that blocks destructive flattening
- mark the old builder as legacy for public pages
- remove its role from the primary CMS user journey

Definition of done:

- users are not expected to publish public pages from the old builder anymore

## Phase B. Build Puck Section Registry

Goal:

- create a one-to-one mapping between Strapi sections and visual editor blocks

Actions:

- define Puck components for each supported section type
- define editor field schema for each section type
- define default props and validation rules
- define preview rendering for each block inside the editor

Required output:

- one Puck config registry that mirrors Strapi section contracts

Definition of done:

- a page can be represented as a list of Puck blocks without losing section fidelity

## Phase C. Load Existing Strapi Pages Into Puck

Goal:

- existing pages can open visually without manual recreation

Actions:

- create mapper: `Strapi page -> Puck editor data`
- support all currently seeded section types
- preserve SEO state alongside the page content

Definition of done:

- `home`, `about`, and `contact` open in the new editor from real Strapi data

## Phase D. Save Puck Output Back To Strapi

Goal:

- publish safely in canonical structured format

Actions:

- create mapper: `Puck editor data -> Strapi sections`
- validate before save
- preserve `publishedAt`
- preserve `seo`
- reject unsupported block shapes

Definition of done:

- a user edits a page visually and Strapi still stores structured sections only

## Phase E. Replace CMS Page Edit Route

Goal:

- the new visual structured editor becomes the default CMS experience

Actions:

- replace the current primary page edit experience with the Puck editor
- keep the structured form behind an advanced/fallback mode if needed
- remove the old public-page builder entry point from normal navigation

Definition of done:

- public CMS users edit pages from one clear visual structured editor

## Phase F. Remove Old Builder From Public CMS Flow

Goal:

- fully retire the old builder for public pages

Actions:

- remove page-level links that point users to the legacy builder
- keep old builder only if still needed for unrelated internal/non-canonical experiments
- otherwise delete it entirely

Definition of done:

- no public CMS page depends on GrapesJS builder publish logic

## Technical Contracts

## Canonical Page Save Contract

The only valid canonical page save shape for protected public pages is:

- `title`
- `slug`
- `summary`
- `pageType`
- `sections[]`
- `seo`
- `publishedAt`

No save flow should convert the page into a single builder HTML blob.

## Editor Data Model Rule

The Puck editor state is an authoring representation.

Strapi `sections` remain the persistence format.

This means:

- frontend renders Strapi sections
- admin saves Strapi sections
- Puck is the UX layer, not the source of truth

## User Experience Rules

The replacement editor must be:

- block-based
- obvious for non-technical users
- safe by default
- impossible to use in a way that breaks the public page model

Users should edit content like:

- heading
- subtitle
- CTA labels/links
- cards
- FAQ items
- rich text

They should not think about:

- HTML export
- wrappers
- IDs
- classes
- raw CSS

## Immediate Next Order

1. Add this migration decision to the CMS status docs.
2. Remove the old builder from the primary CMS page edit flow.
3. Add `Puck` dependency and create a first section registry.
4. Build `Strapi <-> Puck` mappers.
5. Replace the page edit route for `home/about/contact`.
6. Expand to the rest of public CMS pages.

## Definition Of Done

This migration is complete when:

1. public CMS pages no longer rely on the old builder
2. the default editor is visual and schema-first
3. pages save back to Strapi sections only
4. non-technical users can safely edit without breaking the page model
