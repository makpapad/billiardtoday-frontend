# Headless WordPress → Next.js (BilliardToday) — Notes

## Goal
- WordPress acts as **CMS only** (Admin + REST API for Landing/Blog/News).
- Next.js (`d:\Projects\5-billiardtoday-frontend`) renders the public UI and fetches content from WP.

---

## WordPress custom code (implemented)

### MU plugin (headless endpoints)
- File:
  - `d:\laragon\www\billiardtoday\wp-content\mu-plugins\billiardtoday-headless.php`
- Endpoint:
  - `GET /wp-json/billiardtoday/v1/options`
- Output:
  - `{ "acf": get_fields('option') }` (empty array if ACF not available)

### Fix: REST responses corrupted by theme meta output
Some themes were outputting meta tags during `init` via `echo`, which corrupts REST JSON output.
We moved meta tag output to `wp_head` in:
- `wp-content/themes/billiardtoday-original-light/inc/template-functions.php`
- `wp-content/themes/billiardtoday-dark-modern/inc/template-functions.php`
- `wp-content/themes/billiardtoday-corporate/inc/template-functions.php`
- `wp-content/themes/billiardtoday-sport-fun/inc/template-functions.php`

## Local setup (chosen)
- **WP (Laragon)** stays at:
  - URL: `http://billiardtoday.test/`
  - Admin: `http://billiardtoday.test/wp-admin`
  - REST: `http://billiardtoday.test/wp-json/wp/v2/...`
- **Next.js** runs at:
  - URL: `http://localhost:3022/`

Important: `http://billiardtoday.test/` will continue to show the **WordPress theme**. This is expected, because in local setup the public UI is served by **Next** on `localhost:3022`.

---

## WordPress (ACF)
### What was done
- Created ACF Field Group: `Landing - Home`
- Added tabs/sections `Hero` and `Features` (≈42 fields).
- Enabled **Show in REST API** so `acf` is returned in REST responses.

### Navigation menu (ACF Options Page)
- Implemented menu as ACF Pro **Options Page** repeater:
  - field: `navigation_menu`
  - subfields:
    - `label_key` (Text)
    - `href` (Text)
    - `new_tab` (True/False)

Note: labels are stored as **translation keys** (e.g. `nav.about`) and rendered in Next via i18n.

### REST check
- Endpoint:
  - `http://billiardtoday.test/wp-json/wp/v2/pages?slug=home`
- Confirmed: response contains `acf` (not empty).

### REST check (ACF Options)
- Custom endpoint (MU plugin):
  - `http://billiardtoday.test/wp-json/billiardtoday/v1/options`
- Expected response shape:
  - `{ "acf": { "navigation_menu": [...] } }`

Reason: ACF Options endpoint `/wp-json/acf/v3/options/options` returned `rest_no_route` in our setup.

---

## Next.js changes (implemented)

### New files
- `src/lib/wordpress.ts`
  - Typed WordPress REST client (no `any`).
  - `fetchWordpressHomeLanding()` fetches `/wp-json/wp/v2/pages?slug=home`.
  - `mapLandingAcfToData()` maps `acf` → `WordpressLandingData` using safe type guards.
  - Default base URL: `http://billiardtoday.test` if env is missing.
  - `fetchWordpressNavMenu()`:
    - Primary: `/wp-json/billiardtoday/v1/options` (ACF Options repeater)
    - Fallback: Home page repeater (`navigation_menu`)
    - Fallback: legacy fixed slots `menu_item_1_* ... menu_item_8_*`
  - `fetchWordpressPageBySlug()` fetches `/wp-json/wp/v2/pages?slug=...` for headless WP pages.

- `src/app/components/landing/wordpressLanding.tsx`
  - Client Context/Provider:
    - `WordpressLandingProvider`
    - `useWordpressLanding()`

### Updated files
- `src/app/page.tsx`
  - Converted to `async` server component.
  - Fetches WordPress landing data server-side and wraps the app with the provider:
    - `const wordpressLanding = await fetchWordpressHomeLanding();`
    - `<WordpressLandingProvider value={wordpressLanding}>...`

- `src/app/[...slug]/page.tsx`
  - Headless WordPress pages route.
  - Fetches page HTML + nav menu server-side:
    - `fetchWordpressPageBySlug(slug)`
    - `fetchWordpressNavMenu()`
  - Fix for Next dynamic API warning:
    - `params` treated as async (`params: Promise<Params>`) and awaited before reading `params.slug`.

- `src/app/components/wp/WpPageTemplate.tsx`
  - Accepts optional `navItems` and renders `WpNavigation` when present.

- `src/app/components/wp/WpNavigation.tsx`
  - Uses `label_key` translation keys via `tWp(...)` (no hard-coded labels).

- `src/app/components/landing/Hero.tsx`
  - Reads overrides from `useWordpressLanding()`.
  - Uses WP hero background image + CTA links.
  - Uses WP values for the 3 hero stat cards.
  - Removed hardcoded UI text:
    - replaced `"Live"` with `t("hero.live")`
    - replaced `alt="Billiard table"` with `alt={t("hero.backgroundAlt")}`

- `src/app/components/landing/Stats.tsx`
  - Reads overrides from `useWordpressLanding()`.
  - Uses WP values for the 3 stats (with fallbacks).

- `src/app/components/landing/i18n.tsx`
  - Added translation keys:
    - `hero.live`
    - `hero.backgroundAlt`

- `src/app/components/LandingSwitcher.tsx`
  - Removed the landing theme switcher panel UI.

---

## Env required (Next.js)
In `d:\Projects\5-billiardtoday-frontend\.env.local`:

```env
NEXT_PUBLIC_WORDPRESS_URL=http://billiardtoday.test
```

---

## ACF field names currently used by the mapper
These keys are read from `acf` in `src/lib/wordpress.ts`:

### Hero
- `hero_background_image` → `heroBackgroundImageUrl`
- `hero_primary_cta_href` → `heroPrimaryCtaHref`
- `hero_secondary_cta_href` → `heroSecondaryCtaHref`

### Stats
- `stats_active_tournaments_value` → `statsActiveTournamentsValue`
- `stats_registered_players_value` → `statsRegisteredPlayersValue`
- `stats_completed_matches_value` → `statsCompletedMatchesValue`

If actual ACF field names differ, update the keys inside `mapLandingAcfToData()`.

---

## Production target (requested)
- WordPress at: `https://billiardtoday.com`
- Next.js at: `https://billiardtoday.com/tournaments`

This requires:
- Next.js configured with `basePath: "/tournaments"`
- Reverse proxy / rewrites on the web server:
  - `/tournaments` and `/tournaments/_next/*` routed to the Next server

(Not a WordPress setting.)

---

## Next TODO
1. **Local run confirmation**
   - Confirmed WP → Next data flow for:
     - Landing hero/stats via ACF home page.
     - WP pages rendering via `/[...slug]`.
     - Navigation menu via ACF Options endpoint (`/wp-json/billiardtoday/v1/options`).

2. **Production routing**
   - Confirm hosting stack (Vercel vs VPS, Nginx vs Apache/cPanel).
   - Apply `basePath` + proxy rules.

3. **Blog/News routes (WP REST)**
   - Implement `/blog`, `/blog/[slug]`, `/news`, `/news/[slug]`.
   - Add revalidation endpoint / webhook.

4. **Cleanup (optional)**
   - Ensure there are no duplicate ACF fields on Options Page (avoid extra root keys like `acf.href`, `acf.label_key`, `acf.new_tab`).
