# Μελέτη billiardtoday.com — οδηγός για νέο session

**Σκοπός:** χάρτης του site (frontend) και της αλυσίδας Strapi ↔ admin UI ↔ scoreboard ↔ live,
ώστε μετά να αποφασιστεί τι χρειάζεται διαχειριστικό/αυτοματοποίηση. Καθαρά **read-only** μελέτη.
Το session του Στέφανου/κατατάξεων CEB μένει ξεχωριστό.

## Τι ελέγχουμε (με σειρά)

| # | Περιοχή | Πού |
|---|---|---|
| 1 | Δημόσιο site: αρχική, τουρνουά, αγώνες, παίκτες, όμιλοι/κλαμπ, κατατάξεις (CEB/UMB/BTR), embed, portal | `D:/Projects/4-billiardtoday-frontend` (Next 16) |
| 2 | Τι τραβάει από CMS vs τι από αρχεία/κώδικα | `src/lib/api.ts`, `publicSiteData.ts`, `directory.ts`, `liveSessions.ts`, `portalProxy.ts` vs `public/data/*` |
| 3 | Μοντέλο δεδομένων: `bt-*` content types | `D:/Projects/1-billiards-strapi` |
| 4 | Admin UI (115 σελίδες): cms (pages/menu/templates/themes/media/builder), τουρνουά, αγγελίες/ads, commercial | `D:/Projects/2-billiardtoday-admin` |
| 5 | Scoreboard τραπεζιού (Electron/Next) — πώς στέλνει αποτελέσματα | `D:/Projects/3-BilliatdToday-Scoreboard` (τρέχων φάκελος) |
| 6 | Media/upload ροή | `cdn.billiardtoday.com` |
| 7 | «Live»: πώς φτάνουν live scores + ζωντανές κατατάξεις στο site (polling / WS / SSE, ποιος είναι ο πηγαίος πίνακας) | frontend + Strapi + scoreboard |

## Ερωτήματα-κλειδιά

1. Ποια δεδομένα είναι **CMS-driven** και ποια είναι **κώδικας/αρχεία** — με νούμερα ανά περιοχή.
2. Ποια είναι η **δομή παρουσίασης ενός τουρνουά** (σελίδες, φάσεις, όμιλοι, αγώνες, κατάταξη) και **πού ορίζεται** (CMS ή κώδικας).
3. Πώς **υπολογίζονται και δημοσιεύονται** οι κατατάξεις — ποιο κομμάτι είναι live και ποιο τελικό.
4. Ποια βήματα **σήμερα** απαιτούν developer/χειροκίνητη δουλειά (καταγραφή με παράδειγμα για το καθένα).
5. Ποια είναι τα **ελάχιστα** που θα κάνουν το site αυτοεξυπηρετούμενο (admin → frontend) χωρίς αλλαγή κώδικα.

## Μέθοδος & κανόνες

- Διάβασμα κώδικα (routes, lib) + live κλήσεις API **μόνο ανάγνωση**.
- Για κάθε συμπέρασμα: πηγή (αρχείο:γραμμή ή endpoint) — όχι γενικά «κάποιοι/κάπου».
- Παραδοτέο: **ένα γραπτό doc** με πίνακες ανά περιοχή + λίστα κενών, στο `docs/ai/` του frontend repo.
- **Καμία αλλαγή, κανένα commit, κανένα deploy** χωρίς ρητή έγκριση.

## Ανοιχτά από το session των κατατάξεων (να μη χαθούν)

- 7 λίστες CEB σε αναμονή (5 Longoni + Εθνικές 5-Pins + Artistic Εθνικές) — περιμένουν αρχεία.
- `stefano-embed-credit-2026-10-08.txt` έτοιμο (ΔΕΝ έχει σταλεί) — περιμένει τη συμφωνία με CEB.
- Αρχείο: `archive/3c-individual/16-2026.json` κρατά ένα «Individual — Men» (δεν φαίνεται δημόσια) — καθαρισμός στην επόμενη δημοσίευση.
