# Cuescore.com — Τεχνικό teardown (γλώσσα/SEO + ομαδικά πρωταθλήματα/πρόκριση)

Ημερομηνία έρευνας: 28/10/2026. Όλα τα ευρήματα προέρχονται από ζωντανά HTTP αιτήματα (curl με browser-like headers) και ένα render με browser. Ό,τι δεν επαληθεύτηκε σημειώνεται ρητά.

---

## 1) Τι είναι

Το Cuescore είναι SaaS πλατφόρμα για μπιλιάρδο (τουρνουά, λίγκες, ομαδικά, scoreboard, streaming, rankings) που το χρησιμοποιούν σωματεία, εθνικές ομοσπονδίες και διεθνείς ομοσπονδίες. Κάθε οργανισμός αποκτά δημόσια «Cuescore Page» (κατάλογος τουρνουά/λίγκ/κατατάξεων/άρθρων) και η πλατφόρμα παρουσιάζει δημόσια αποτελέσματα, βαθμολογίες και brackets.

---

## 2) Γλώσσα & SEO ανά χώρα/ομοσπονδία

| Τι κάνουν | Στοιχείο που το αποδεικνύει |
|---|---|
| **22 γλώσσες**, χωρίς πρόθεμα μονοπατιού ή υποτομέα — η γλώσσα είναι **query param + cookie** | `<a href="/language/?lang=el">Ελληνικά</a>` (και cs, da, de, en, es, fi, fr, hr, hu, it, ja, mk, nl, no, pl, pt, ru, se, sk, sq, zh) |
| Εναλλαγή γλώσσας = PHP endpoint που βάζει cookie και κάνει 302 | `GET /language/?lang=el` → `302 Found`, `Set-Cookie: locale=el_GR.utf8; ...domain=.cuescore.com`, `Location: https://cuescore.com` |
| `<html lang>` αλλάζει server-side ανάλογα με query/cookie | `/KNBB?lang=el` → `<html lang="el">`, `/KNBB?lang=de` → `<html lang="de">`, σκέτο `/` → `<html lang="en">` |
| **Κάθε οντότητα έχει ένα URL** (χωρίς /en/ ή /el/ μονοπάτι)· η γλωσσική εκδοχή = ίδιο URL + `?lang=xx` | `/KNBB` και `/KNBB?lang=el` είναι το ίδιο περιεχόμενο |
| **hreflang σελίδας**: 1 `x-default` + 1 ανά γλώσσα (22 συνολικά), όλα με `?lang=` | `<link rel="alternate" href="//cuescore.com/KNBB" hreflang="x-default" />` … `<link rel="alternate" href="//cuescore.com/KNBB?lang=el" hreflang="el" />` |
| **canonical self**, χωρίς lang param (δείχνει πάντα στη «default» εκδοχή) | `<link rel="canonical" href="https://cuescore.com/KNBB" />` |
| **Το homepage ΔΕΝ έχει hreflang και ΔΕΝ έχει canonical** (ασυνέπεια) | `grep 'rel="alternate"'` → 0, `grep 'rel="canonical"'` → 0 στο `/` |
| Κωδικοί γλωσσών με σφάλμα: Σουηδικά ως **`se`** (αντί `sv`) και Νορβηγικά ως `no` | `hreflang="se"` στο KNBB (το `se` είναι Βόρεια Σάμι, όχι Σουηδικά) |
| **Δεν υπάρχει XML sitemap** | `sitemap.xml`, `sitemap_index.xml`, `sitemap-index.xml`, `sitemap/sitemap.xml` → όλα **404** |
| robots.txt χωρίς γραμμή `Sitemap:` | `robots.txt`: Disallow `/ajax/*`, `/user/*`, `/test/*`, `/manage/*`, `/home/*`, `/font/*`; `Crawl-delay: 8`; `PetalBot: Disallow: /` |

**Δομή URLs (μοτίβα)**
- Οργανισμός / Cuescore Page: `/{slug}` (π.χ. `/KNBB`, `/billiardsambandslands`) με tabs `/about`, `/leagues`, `/posts`, `/rankings`, `/ratings`, `/tournaments`
- Τουρνουά/Λίγκα: `/tournament/{Name}/{id}` (+ `/mvp`)
- Γήπεδο/Venue: `/venue/{Name}/{id}`
- Παίκτης: `/player/{Name}/{id}`
- Άρθρο: `/{org}/posts/{Title}/{id}`
- Κατάλογοι: `/organizations` (κατηγοριοποιεί σε **«Nexus and networks»** = ομοσπονδίες και **«Nodes»** = σωματεία/γήπεδα), `/tournaments`, `/leagues` (η λίστα λίγκ φορτώνεται με JS — δεν υπάρχει στο server HTML)

---

## 3) Ομαδικά πρωταθλήματα, βαθμολογίες, πρόκριση

| Τι κάνουν | Στοιχείο που το αποδεικνύει |
|---|---|
| Λίγκα = «τουρνουά» με δικό του τύπο («League» / «Round Robin»), σελίδα `/tournament/.../{id}` | `/tournament/Eredivisie+2026-2027/85428022` (KNBB λίγκα snooker) |
| Κεφαλίδα διοργάνωσης: ονόμα, οργανωτής, υπεύθυνοι με email/μερικώς κρυμμένο τηλέφωνο, πίνακας ρυθμίσεων | `<th>Starts</th> <th>Organizer</th> <th>Contact</th> <th>Format</th> <th>Race to</th> <th>Handicap</th> <th>Dresscode</th>` |
| **Πίνακας βαθμολογίας — στήλες** (με tooltip σε κάθε στήλη) | `Pos` (Position), `Name`, `Played` (Matches played), `Win` (Matches won), `Tie` (Tied), `Lose` (Matches lost), `ws` (Win score), `ls` (Lose score), `sd` (Score difference +/-), `RO` (Runouts), `Lags` (Lags won), `Bonus`, `avg` (Average), `Pts`, `Rank` |
| **ΔΕΝ σημειώνουν ποιοι προκρίνονται** — κανένα χρώμα, κανένα κείμενο στη βαθμολογία | Σάρωση στη σελίδα Eredivisie: `qualified`=0, `promote`=0, `relegat`=0, `next round`=0, `playoff`=0, `1-4`=0, `2-3`=0· οι γραμμές είναι `<tr>` σκέτες χωρίς κλάση κατάταξης |
| Η πρόκριση ρυθμίζεται ως **format**, όχι ως σήμανση στη βαθμολογία: «Round Robin → Single Elimination» («Qualification & Seeding») | Manual «Format - League and Round Robin»: *«Advanced Round Robin variation: groups into a Single Elimination (SE) bracket… Qualification & Seeding… Single Elimination bracket»* |
| Διάταξη βαθμολογίας διαμορφώνεται από τον διοργανωτή (πολλαπλά κριτήρια) | Manual «Ranking order for standings»: Points (PTS), Wins (WIN), H2H, Frames won (FW/WS), Frames lost (FL/LS), Framescore/Score difference (FS/SD), Innings average, Highbreak, Frame win average, Runouts, Lag wins, Set score |
| Πίνακας αποτελεσμάτων τουρνουά: podium για τους 3 πρώτους + στατιστικά | Results table: `Name`, `Matches (won/lost)`, `Frames (won/lost)`, `Win percentage`, `Highest break`, `Points` |
| Ξεχωριστή σελίδα **MVP** ανά λίγκα (best performing player) | `/tournament/Eredivisie.../mvp`· Manual «Standings and MVP»: κριτήρια «% matches won, matches played, % matches played, >60% συμμετοχή» |
| Δεν υπάρχει δημόσιο bracket για τη λίγκα (μόνο nav link «Bracket» → `/schema/`) | Το `Brackets` εμφανίζεται μόνο ως nav item, όχι ως περιεχόμενο στη σελίδα λίγκας |
| Structured data **μόνο σε σελίδες τουρνουά** (όχι σε org/rankings/homepage) | `SportsEvent` + `Organization` (organizer, με url+address) + `SportsActivityLocation` + `GeoCoordinates` (venue). Δεν υπάρχει `SportsOrganization`, `Person`, `BreadcrumbList`, ούτε σήμανση βαθμολογίας |

Δείγμα ld+json (τουρνουά):
```
"@type":"SportsEvent", "name":"Eredivisie 2026-2027", "startDate":"2026-09-01T11:00:00+0000",
"organizer":{"@type":"Organization","name":"Koninklijke Nederlandse Biljartbond","url":"https://cuescore.com/KNBB"}
```

---

## 4) Χρέωση (δωρεάν vs πληρωμή)

**Δεν δημοσιεύονται τιμές.** Η σελίδα `/upgrade/` δίνει μόνο ονόματα πακέτων και «Request free trial» / «Contact us» — πουθενά ποσό, νόμισμα ή διάρκεια.

| Πακέτο | Κοινό | Τι περιλαμβάνει (κατά τη σελίδα /upgrade/ & manual) |
|---|---|---|
| **Nano** | Άτομα/παίκτες | Ad-free εμπειρία σε όλο το Cuescore, υποστήριξη ανάπτυξης, μικρά ιδιωτικά τουρνουά **έως 8 παίκτες** |
| **Node** | Σωματεία/γήπεδα | Πλήρες dashboard: τουρνουά, **λίγκες & round robin**, draw tools/standings/results, παίκτες, ομάδες, venues/tables, βασικά rankings & point systems, handicaps, scoreboard & livestream, Pay & Play, posts |
| **Network** | Εθνικές ομοσπονδίες / περιφερειακές λίγκες | Όλα του Node + κεντρικός έλεγχος πολλών club dashboards, εθνικά/περιφερειακά rankings, advanced handicaps, **rating system (ELO)** & περιορισμοί, API (JavaScript) & integrations, extended reporting, Priority Support |
| **Nexus** | Διεθνείς ομοσπονδίες / confederations | Όλα του Network + cross-border membership, multi-nation calendar, **ANA (Authorised Neutral Athletes) compliant** athlete presentation, Premium API, automation, Priority Plus Support, custom development |

- Δωρεάν: εγγραφή παίκτη («Join for free»), παρακολούθηση/κοινοποίηση τουρνουά, δημόσια προβολή.
- Δοκιμή: «Request free trial» (Node) μέσω dialog `node-free-trial-request` → `sales@cuescore.com`.
- Δεν επαληθεύτηκε: **οποιοδήποτε ακριβές ποσό/τιμολόγιο** — δεν το δημοσιεύουν (πρέπει να στείλεις email· δεν το κάναμε).

---

## 5) Τι παίρνουμε εμείς (σχήμα/δομή μόνο)

1. **Μοντέλο γλώσσας με ένα URL ανά οντότητα + `?lang=xx` + cookie** αντί για προθέματα μονοπατιού. Αντιγράψιμο το σχήμα: ίδιο URL, εναλλαγή μέσω query/cookie, `hreflang` + `x-default` αυτόματα παραγόμενα, canonical self χωρίς lang param.
2. **Οργανισμός = «Cuescore Page»** με σταθερά tabs: `/tournaments`, `/leagues`, `/rankings`, `/ratings`, `/posts`, `/about`. Έτοιμη αρχιτεκτονική πληροφορίας για site ομοσπονδίας.
3. **Σχήμα πίνακα βαθμολογίας** με tooltips σε κάθε στήλη: Pos, Played, Win, Tie, Lose, ws, ls, sd, RO, Lags, Bonus, avg, Pts, Rank — και **ρυθμιζόμενη σειρά κατάταξης** (PTS/WIN/H2H/Frames/AVG/Runouts/…).
4. **Πρόκριση ως «format», όχι ως ετικέτα στη βαθμολογία**: Round Robin (όμιλοι) → Single Elimination bracket με «Qualification & Seeding». Δεν χρωματίζουν/επισημαίνουν τους προκρινόμενους στον πίνακα.
5. **Structured data σε επίπεδο τουρνουά**: `SportsEvent` + `Organization` (organizer) + `SportsActivityLocation`/`GeoCoordinates` (venue). Λείπει ό,τι αφορά βαθμολογία/person — δικό μας κενό που μπορούμε να καλύψουμε καλύτερα.

---

## 6) Τι ΔΕΝ αντιγράφεται

- Ο **όγκος δεδομένων**: ιστορικό αγώνων, αποτελέσματα, ELO rating συσσωρευμένο από εκατομμύρια παιχνίδια (το «data moat»).
- Το **δίκτυο**: χιλιάδες σωματεία + εθνικές/διεθνείς ομοσπονδίες που ήδη δημοσιεύουν εκεί (network effect).
- Το **οικοσύστημα API/integrations** και οι έτοιμες ζώνες streaming overlays.
- Η **πλήρης πλατφόρμα διαχείρισης & billing** (Pay & Play, license management, ANA compliance, custom reports/development) — είναι προϊόν ετών.
- Η **SEO ιστορία/φήμη** (κάθε ομοσπονδία έχει ήδη δικές της σελίδες με καλή κατάταξη).

---

## 7) URLs που ανοίχτηκαν

- https://cuescore.com/
- https://cuescore.com/robots.txt
- https://cuescore.com/sitemap.xml, /sitemap_index.xml, /sitemap-index.xml, /sitemap/sitemap.xml, /sitemaps.xml (όλα 404)
- https://cuescore.com/about
- https://cuescore.com/support
- https://cuescore.com/upgrade/
- https://cuescore.com/organizations (render με browser)
- https://cuescore.com/leagues (render με browser)
- https://cuescore.com/KNBB
- https://cuescore.com/KNBB?lang=el, /KNBB?lang=de
- https://cuescore.com/KNBB/leagues, /KNBB/rankings
- https://cuescore.com/billiardsambandslands
- https://cuescore.com/tournament/Eredivisie+2026-2027/85428022
- https://cuescore.com/tournament/Haags+Open+KO/90243898
- https://cuescore.com/language/?lang=el
- https://cuescore.com/cuescore/posts/Cuescore+manual+-+index/56176114
- https://cuescore.com/cuescore/posts/Format+-+League+and+Round+Robin/56918023
- https://cuescore.com/cuescore/posts/Ranking+order+for+standings/57913465
- https://cuescore.com/cuescore/posts/Standings+and+MVP/57982612
- https://cuescore.com/cuescore/posts/Tournament+-+Teams++League+%26+Cup/57843061
- https://cuescore.com/cuescore/posts/Cuescore+Premium/58029583
- https://cuescore.com/cuescore/posts/Upgrade+plans/74129359
- https://cuescore.com/cuescore/posts/Tournament+Results+Table/58009843

**Δεν επαληθεύτηκαν**: (α) ακριβείς τιμές/πακέτα χρέωσης (δεν δημοσιεύονται)· (β) το δημόσιο bracket μιας λίγκας σε λειτουργία (η Eredivisie δεν είχε ολοκληρωμένο knockout· τα brackets φορτώνονται πιθανώς με JS)· (γ) η λίστα `/leagues` (αδειάζει χωρίς JS/ajax — το `/ajax/*` το απαγορεύει το robots.txt)· (δ) το πλήρες περιεχόμενο των `/rankings`/`/ratings` tabs πέραν του δείγματος κορυφής.
