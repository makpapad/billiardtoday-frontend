---
description: WordPress στο / και Next.js στο /tournaments (production routing + headless content + i18n)
---

# WordPress στο `/` και Next.js στο `/tournaments`

Στόχος:
- Το **WordPress** να είναι το κύριο site στο `/` (landing/marketing, CMS, translations).
- Το **Next.js app** να ζει στο **`/tournaments`** (εφαρμογή/λειτουργικότητα).

## 1) Κρίσιμο: HTTP vs HTTPS (Mixed Content)

Αν το Next σερβίρεται από `https://billiardtoday.com/tournaments` και το WP είναι μόνο σε `http://billiardtoday.com/`:
- Το browser **μπλοκάρει** requests από HTTPS σε HTTP (mixed content).
- Θα έχεις προβλήματα σε fetch προς `http://.../wp-json/...`.

Απαραίτητο για production:
- **WP και Next πρέπει να είναι και τα δύο σε HTTPS** στο ίδιο domain `billiardtoday.com`.

## 2) Routing στο ίδιο domain

Επιθυμητή συμπεριφορά:
- `https://billiardtoday.com/` -> WordPress
- `https://billiardtoday.com/tournaments` -> Next.js
- `https://billiardtoday.com/tournaments/_next/*` -> Next.js assets

Αυτό γίνεται με reverse proxy (Nginx/Apache/Cloudflare) που κάνει path-based routing.

### 2.1 Nginx (ενδεικτικό)

- `/` -> PHP-FPM / WordPress
- `/tournaments` και `/tournaments/_next/` -> upstream Next server

Σημείωση:
- Το ακριβές config εξαρτάται από το πού τρέχει το Next (VM, container, platform).

## 3) Headless WordPress content για Next (χωρίς CORS)

Προτεινόμενο pattern:
- Το Next app **να μην κάνει fetch από browser** κατευθείαν σε WP endpoints.
- Να υπάρχει **Next API route** (proxy) μέσα στο `/tournaments`.

Παράδειγμα:
- Frontend: `GET /tournaments/api/wp/landing?locale=el`
- Next server-side: κάνει fetch `https://billiardtoday.com/wp-json/...` και επιστρέφει JSON

Πλεονεκτήματα:
- Αποφεύγεις CORS.
- Αποφεύγεις mixed-content (εφόσον WP είναι HTTPS).
- Μπορείς να βάλεις caching/revalidate.

## 4) Multi-language (EL/EN τώρα, πολλές αργότερα)

Κανόνας:
- Κάθε piece content πρέπει να έχει **locale-aware** εκδοχή.

Πρακτικές επιλογές στο WP:
- **Polylang** ή **WPML**

Το Next:
- Κρατάει `locale` (π.χ. `el`, `en`).
- Κάνει mapping στο WP language.

### 4.1 Locale mapping (ενδεικτικά)
- `el` -> Greek
- `en` -> English
- future: `de`, `fr`, `it`, `es`, `nl`, ...

## 5) Μοντελοποίηση περιεχομένου (ώστε να “κουμπώνει” με components)

### Επιλογή A (recommended): 1 WP Page + ACF fields
- WP page: `landing`
- ACF fields π.χ.:
  - `how_it_works_title`
  - `how_it_works_step_1_title`
  - `how_it_works_step_1_desc`
  - κλπ
- Με Polylang/WPML υπάρχουν translations ανά γλώσσα.

### Επιλογή B: Custom Post Type `landing_block` με `key`
- Κάθε block έχει:
  - `key` (string)
  - `content` (string)
  - `page` (string)
  - `component` (string)
  - (implicit locale μέσω WPML/Polylang)

## 6) Cache / Revalidate

Για να είναι γρήγορο:
- Στο Next API proxy route βάλε caching.
- Αν το content αλλάζει συχνά, χρησιμοποίησε:
  - revalidate (ISR) ή
  - on-demand revalidation (webhook από WP).

## 7) Open questions (για να κλειδώσει η υλοποίηση)

- Το WordPress θα σερβίρεται τελικά σε **`https://billiardtoday.com/`**;
- Polylang ή WPML;
- REST API ή WPGraphQL;
- Θέλουμε απλά WP-admin editing ή και “inline save” από το Next προς WP (συνήθως όχι).
