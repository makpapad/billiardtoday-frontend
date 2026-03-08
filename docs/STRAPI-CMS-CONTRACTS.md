# Strapi CMS Contracts

## Purpose

Αυτό το document ορίζει τα canonical contracts που θα χρησιμοποιούν:

- το `2-billiardtoday-admin` ως CMS UI
- το `5-billiardtoday-frontend` ως public renderer

Το backend source of truth είναι το Strapi project `1-BilliardTodayAdmin`.

## Contract 1: Page By Slug

### Strapi Source

- `api::page.page`

### Required Fields

- `title`
- `slug`
- `summary`
- `pageType`
- `sections`
- `seo`
- `updatedAt`
- `publishedAt`

### Section Components Supported In Strapi

#### `cms.hero-section`

- `eyebrow`
- `title`
- `subtitle`
- `primaryCtaLabel`
- `primaryCtaUrl`
- `secondaryCtaLabel`
- `secondaryCtaUrl`
- `backgroundImage`

#### `cms.rich-text-section`

- `title`
- `content`

#### `cms.feature-grid-section`

- `title`
- `subtitle`
- `items`

#### `cms.cta-banner`

- `title`
- `description`
- `buttonLabel`
- `buttonUrl`
- `theme`

#### `cms.faq-section`

- `title`
- `items`

### Frontend Contract Shape

```ts
type CmsPage = {
  title: string
  slug: string
  summary?: string | null
  pageType: 'landing' | 'standard' | 'legal'
  sections: CmsSection[]
  seo?: CmsSeo | null
  updatedAt?: string
  publishedAt?: string | null
}
```

## Contract 2: Site Settings

### Strapi Source

- `api::site-setting.site-setting`

### Required Fields

- `siteName`
- `siteTagline`
- `logo`
- `contactEmail`
- `headerLinks`
- `footerLinks`
- `socialLinks`
- `defaultSeo`

### Navigation Contract

#### Header Link

- `label`
- `url`
- `openInNewTab`
- `children`

#### Footer Link

- `label`
- `url`
- `openInNewTab`

#### Social Link

- `platform`
- `label`
- `url`

### Frontend Contract Shape

```ts
type CmsSiteSettings = {
  siteName: string
  siteTagline?: string | null
  logo?: CmsMedia | null
  contactEmail?: string | null
  headerLinks: CmsNavLink[]
  footerLinks: CmsFooterLink[]
  socialLinks: CmsSocialLink[]
  defaultSeo?: CmsSeo | null
}
```

## Contract 3: SEO

### Strapi Source

- `cms.seo-meta`

### Required Fields

- `metaTitle`
- `metaDescription`
- `canonicalUrl`
- `noIndex`
- `ogImage`

### Frontend Contract Shape

```ts
type CmsSeo = {
  metaTitle: string
  metaDescription?: string | null
  canonicalUrl?: string | null
  noIndex?: boolean
  ogImage?: CmsMedia | null
}
```

## Contract 4: Appearance

### Current Reality

Το active theme σήμερα εκτίθεται από το `2-billiardtoday-admin` μέσω file-backed theme storage.

### Phase 1 Rule

Αυτό επιτρέπεται προσωρινά ως admin-side appearance system.

### Final Direction

Το public frontend πρέπει να λαμβάνει ένα και μόνο appearance contract:

- `id`
- `name`
- `tokens.primary`
- `tokens.accent`
- `tokens.background`
- `tokens.surface`
- `tokens.text`
- `tokens.radius`
- `tokens.headingFont`
- `tokens.bodyFont`

## Contract 5: Public Fetching Boundaries

### Allowed Public Frontend Reads

- Strapi pages
- Strapi site settings
- Strapi media
- Strapi public tournament/player/club/team read models
- frontend BFF routes that proxy stable Strapi/custom API reads

### Forbidden Public Frontend Writes

- direct page create/update
- direct site settings update
- direct `landing-contents` writes
- editor-specific mutation flows

## Recommended Frontend Type Skeleton

```ts
type CmsMedia = {
  url: string
  alternativeText?: string | null
  width?: number | null
  height?: number | null
}

type CmsNavLink = {
  label: string
  url: string
  openInNewTab: boolean
  children?: CmsNavChildLink[]
}

type CmsNavChildLink = {
  label: string
  url: string
  openInNewTab: boolean
}

type CmsFooterLink = {
  label: string
  url: string
  openInNewTab: boolean
}

type CmsSocialLink = {
  platform: 'facebook' | 'instagram' | 'x' | 'youtube' | 'tiktok' | 'linkedin' | 'other'
  label?: string | null
  url: string
}
```

## Phase 1 Notes

- Το `2-billiardtoday-admin` είναι το CMS UI για τους χρήστες.
- Το Strapi παραμένει η canonical storage layer.
- Το `5-billiardtoday-frontend` θα καταναλώνει μόνο αυτά τα contracts όταν ξεκινήσει η migration του public rendering.
