---
description: WordPress theme guidelines (look & feel συμβατό με το Next landing)
---

# WordPress Theme Guidelines (matching Next landing)

Στόχος:
- Το WordPress (στο `/`) να έχει **ίδιο look & feel** με το Next landing/components.
- Να είναι εύκολο να συντηρηθεί και να επεκταθεί (και multi-language).

## 1) Design tokens

### 1.1 Χρώματα (από το landing που έχουμε)
- Backgrounds:
  - `#0a0e1a` (very dark)
  - `#111827` (dark)
  - `#1a2235` (card background)
  - `#1e293b` (borders)
- Text:
  - `#ffffff` (primary)
  - `#94a3b8` (muted)
  - `#64748b` (secondary muted)
- Accents:
  - `#00ff88` (green)
  - `#00d9ff` (cyan)
  - `#ffd600` (yellow)

### 1.2 Gradients
- Primary gradient (CTA): `from #00ff88 to #00d9ff`
- Decorative line: `#00ff88 -> #00d9ff -> #ffd600`

### 1.3 Typography
- Headings:
  - `h2`: **semibold** (όχι extrabold)
  - `h3`: semibold
- Body:
  - muted text color `#94a3b8`

## 2) Layout rules

- Max width container: ~`max-w-7xl`
- Sections με generous spacing (`py-24` αντί για tight spacing)
- Cards:
  - border 1px `#1e293b`
  - background `rgba(#1a2235, 0.5)` ή solid `#1a2235`
  - subtle blur/backdrop όπου γίνεται

## 3) Components to replicate in WP

### 3.1 Header / Navigation
- Σκούρο navbar, links με hover σε white
- Smooth anchor scrolling (όπου υπάρχει one-page layout)
- Language switcher (EL/EN)

### 3.2 Hero
- Badge capsule (border `#00d9ff/30`, bg `#00d9ff/10`)
- Headline + highlighted gradient keywords
- CTA buttons:
  - primary: gradient
  - secondary: dark outline

### 3.3 Feature cards
- 3-column grid (desktop)
- icon + title + description

### 3.4 How it works
- 3 steps, centered icons, numbered circles, connecting gradient line

### 3.5 Footer
- dark footer, columns, muted links

## 4) WordPress implementation approach

### 4.1 Theme base
- Custom theme (όχι page builder).
- Ελαφρύ CSS framework approach:
  - είτε Tailwind build pipeline μέσα στο theme, είτε
  - CSS variables + utility classes.

### 4.2 Gutenberg blocks / ACF blocks
Προτείνεται:
- ACF Blocks για sections:
  - `Hero`
  - `Stats`
  - `Features`
  - `HowItWorks`
  - `FinalCTA`

Κάθε block να έχει fields που αντιστοιχούν στα props του Next component.

### 4.3 Multi-language
- Polylang ή WPML
- Κάθε page/block να έχει translation.
- Προσοχή σε:
  - slugs
  - menus
  - SEO meta per language

## 5) Content API readiness (headless)

Αν το Next τραβάει content από WP:
- Τα blocks/fields πρέπει να είναι προσβάσιμα via:
  - WP REST API (+ ACF to REST plugin), ή
  - WPGraphQL (+ WPGraphQL for ACF)

## 6) Performance
- Server-side caching (WP plugin / host)
- Image optimization
- Minify assets

## 7) QA checklist
- Responsive checks (mobile/tablet/desktop)
- Contrast readability (white on dark)
- Hover/focus states
- Smooth scroll behavior
- Language switch correctness (EL/EN)

## 8) Open questions
- Θα γίνει Tailwind στο WP theme ή CSS variables;
- Polylang ή WPML;
- Θα είναι το WP content source για το Next ή ξεχωριστό;
