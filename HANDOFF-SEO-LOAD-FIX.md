# HANDOFF — Διόρθωση φορτίου (Strapi → 502/504 σε όλο το site)

## Τι συνέβη (με νούμερα, 27/10 19:00-19:40)

- Το Strapi (pm2 `strapi-prod`, 1 process) δεν δεχόταν συνδέσεις: `UND_ERR_CONNECT_TIMEOUT` στο 127.0.0.1:1337, 86 συνδέσεις στην ουρά, ακόμα και `/_health` αργούσε.
- nginx: **425 × 502 + 115 × 504** στα τελευταία 1.500 requests. Σελίδες τουρνουά/αθλητών έβγαιναν μισές (φαινόταν μόνο το Time table) ή 504.
- Ποια URLs σφάλλουν: `/api/players/*/history` **150**, `/players/*` **131**, `/tournaments/*` **32**, `/api/tournaments/*/live-sessions` **24**.
- Η βάση ΔΕΝ φταίει: Postgres 18/100 συνδέσεις, καμία μεγάλη ή μπλοκαρισμένη query. Τα δεδομένα είναι μικρά (402 events, 426 τουρνουά, 3.336 αθλητές).
- Το restart του Strapi έδωσε ~2 λεπτά ανάσα (αρχική 0,4s) και μετά ξανακόλλησε → το πρόβλημα είναι το **μοτίβο φόρτωσης**, όχι μια στοιβαγμένη ουρά.

## Αιτία

Το commit `457da74` (server-rendered SEO περιεχόμενο) έβαλε **fetch προς το Strapi σε κάθε render**:

1. `src/lib/playerHistoryServer.ts` καλεί το **δικό μας** `/api/players/[id]/history` με `cache: "no-store"` και timeout **20s** → κάθε σελίδα αθλητή (3.336 σελίδες, τις οποίες σαρώνουν και bots) χτυπούσε το route, και το route χτυπούσε το Strapi με 2-3 queries, **χωρίς cache**.
2. `src/lib/tournamentSeoServer.ts` δοκίμαζε **3 base URLs × 15s timeout** = έως **45s** αναμονής μέσα στο render μιας σελίδας διοργάνωσης, με βαριά nested populate (συμμετέχοντες + αθλητές + τα json πεδία του tournament).
3. Το route `src/app/api/players/[id]/history/route.ts` είχε `cache: 'no-store'` σε όλα τα fetch προς Strapi.

Αποτέλεσμα: λίγες δεκάδες σελίδες/λεπτό φτάνουν για να πνίξουν το μονονηματικό Strapi (8 cores στο κουτί, load 14,5, δίπλα php-fpm + MariaDB από τα άλλα sites).

## Το patch

`seo-load-fix.patch` (εφαρμόζεται καθαρά στο HEAD, `npx tsc --noEmit` καθαρό). Αντίγραφα ολόκληρων των αρχείων στο `seo-load-fix/`.

| Αρχείο | Αλλαγή |
|---|---|
| `src/lib/playerHistoryServer.ts` | `cache: "no-store"` → `next: { revalidate: 300 }`· timeout 20s → **4s**. Μία κλήση ανά 5 λεπτά ανά αθλητή αντί για κάθε render. |
| `src/lib/tournamentSeoServer.ts` | 3 απόπειρες × 15s → **1 απόπειρα × 3s**· `populate[tournament][fields]` = documentId/title/slug, ώστε να μη σειριοποιούνται τα βαριά json του τουρνουά. Το `revalidate: 300` έμενε ήδη. |
| `src/app/api/players/[id]/history/route.ts` | `cache: 'no-store'` → `next: { revalidate: 60 }` (και τα 3 fetch)· `export const revalidate = 60`. |

Χειρότερη αναμονή ανά σελίδα: **SEO διοργάνωσης ≤3s** (ήταν 45s), **ιστορικό αθλητή ≤4s** (ήταν 20s), και μετά την πρώτη επιτυχία σερβίρεται από cache.

## Εφαρμογή

```bash
cd /path/to/4-billiardtoday-frontend
git apply seo-load-fix.patch      # ή: git apply --3way
npx tsc --noEmit
npm run build
# deploy: bt-sync frontend  (στον server 138.201.29.162)
```

## Επαλήθευση μετά το deploy

```bash
# 1. σελίδες: 200 σε < 5s (όχι 45-60s)
for u in "/" "/tournaments" "/players/5207" "/tournaments/team/3-cushion-2026-2027-g-katigoria" \
         "/tournaments/world-cup-3-cushion-ho-chi-minh-city-2026"; do
  curl -sL -o /dev/null -w "%{http_code} %{time_total}s $u\n" --max-time 30 "https://billiardtoday.com$u"
done

# 2. Strapi απαντά τοπικά
ssh root@138.201.29.162 'curl -s -o /dev/null -w "health=%{http_code} %{time_total}s\n" http://127.0.0.1:1337/_health'

# 3. nginx: καθόλου 502/504 στα τελευταία 200
ssh root@138.201.29.162 'tail -200 /var/www/vhosts/billiardtoday.com/logs/access_ssl_log | grep -oE "\" [0-9]{3} " | sort | uniq -c'
```

## Αν ξανακολλήσει

1. Ανάσα αμέσως: `su - billiardtoday_srv -c "pm2 restart strapi-prod --update-env"` (δεν αλλάζει κώδικα, αδειάζει την ουρά — κρατά λίγα λεπτά).
2. Βαθύτερη λύση (προαιρετική, μεγαλύτερη αλλαγή): το SEO section να μη μπλοκάρει το render — `<Suspense>` γύρω από το `TournamentSeoSection`/`PlayerHistorySeoSection` ώστε η σελίδα να στέλνεται αμέσως και το SEO κομμάτι να «ρέει» μετά, ή `export const revalidate = 300` στις σελίδες διοργάνωσης/αθλητή για ISR.
3. Ξεχωριστό θέμα προς έλεγχο: γιατί μια λίστα 1 γραμμής στο `/api/bt-events` ή `/api/tournaments` αργεί δεκάδες δευτερόλεπτα όταν το Strapi είναι ζεστό (τα δεδομένα είναι μικρά — υποψία: μέγεθος payload/σειριοποίηση, όχι βάση).