# Τεχνικό teardown: kozoom.com (Kozoom)

Ημερομηνία ελέγχου: 28/10/2026. Μέθοδος: curl με browser-like headers (User-Agent Chrome, Accept, Accept-Language), ανάλυση HTML + Next.js flight payload (`self.__next_f`), sitemaps/robots. Ο browser (CDP) δεν ήταν διαθέσιμος, οπότε ό,τι είναι strictly client-side αναφέρεται ως «δεν επαληθεύτηκε».

| Φάκελος | Τι είναι |
|---|---|
| `www.kozoom.com`, `kozoom.com` | 301 → `https://home.kozoom.com/{lang}/all-cue-sports` |
| `home.kozoom.com` | Landing/portal (Next.js App Router) |
| `tv.kozoom.com` | Πλατφόρμα: live, replay, news, players, event pages, premium pass |
| `store.kozoom.com` | E-shop (Magento 2), 5 γλώσσες |
| `help.kozoom.com` | Help center (Knowledge-base SaaS), 1 γλώσσα (en) |

---

## 1) Τι είναι (σύνοψη)

Το Kozoom είναι γαλλικό media company που λειτουργεί streaming πλατφόρμα μπιλιάρδου (Kozoom TV) με συνδρομές, news/άρθρα και προφίλ παικτών, καλύπτοντας carom, pool, snooker, 5-pin και blackball. Έχει 4 γλωσσικές εκδόσεις (en/fr/es/nl) με πρόθεμα μονοπατιού και **μεταφρασμένα slugs ανά κατηγορία**, αλλά **δεν έχει ούτε σελίδες κατατάξεων/ομίλων/πρόκρισης ούτε hreflang στα άρθρα** — η οργάνωση αγώνων (όμιλοι, play-off, πρόκριση) παραμένει έξω από την πλατφόρμα, σε δελτία τύπου των ομοσπονδιών.

---

## 2) Γλώσσα & SEO

| Τι κάνουν | Στοιχείο (URL/HTML) — κυριολεκτικά |
|---|---|
| Γλώσσες = 4, μόνο με **πρόθεμα μονοπατιού** (ούτε υποτομέας, ούτε query) | `home.kozoom.com/{en,fr,es,nl}/…`, `tv.kozoom.com/{en,fr,es,nl}/…` |
| **Μεταφρασμένα slugs** για τις κατηγορίες «όλα τα μπιλιάρδα» και «carom» | `/en/all-cue-sports` · `/fr/tous-les-billards` · `/es/todos-los-billares` · `/nl/alle-biljart` · `/en/billiard-carom` · `/fr/billard-carambole` · `/es/billar-carambola` · `/nl/biljart-carambole` |
| **Ίδιο (αγγλικά) slug** σε όλες τις γλώσσες για pool, snooker, player, premium-pass | `/fr/pool-billiard/news`, `/nl/snooker/replay`, `/es/player`, `/de/...` → `pool-billiard`, `snooker`, `player`, `premium-pass` αμετάφραστα |
| Άγνωστη γλώσσα πέφτει στο en με 200 (όχι 404) | `kozoom.com/de/` → 200 `home.kozoom.com/en/all-cue-sports` · `/el/` → 200 ίδιο |
| `<html lang>` σωστό σε όλες τις εκδόσεις | `<html lang="en">`, `<html lang="fr">`, `<html lang="nl">`, `<html lang="es">` |
| **hreflang ΜΟΝΟ σε detail pages** (event, player) — 4 locales, **χωρίς x-default** | `<link rel="alternate" hrefLang="en" href="https://tv.kozoom.com/en/event/40187"/>` (+fr, +es, +nl) |
| **Κανένα hreflang στα άρθρα** — μόνο canonical | `/en/.../news/amir-ibraimov-retains-european-u25-three-cushion-title`: `grep -i alternate` = **0 hits**; υπάρχει `<link rel="canonical" href="…/en/all-cue-sports/news/…">` |
| Άρθρα με **μεταφρασμένα slugs ανά γλώσσα** (ίδιο άρθρο, 3 slugs) | en `…three-cushion-title` · fr `amir-ibraimov-conserve-son-titre-europeen-u25` · es `amir-ibraimov-repite-como-campeon-europeo-sub-25-de-tres-bandas` |
| Ίδιο άρθρο προσβάσιμο και από **άλλη κατηγορία**, canonical δείχνει το ένα → duplicate | `/fr/billard-carambole/news/<en-slug>` → 200, `lang="fr"`, canonical → `/fr/tous-les-billards/news/…` |
| Listing/landing σελίδες: **ούτε canonical ούτε hreflang** | `home.kozoom.com/en/all-cue-sports`, `tv.kozoom.com/en/billiard-carom/live`, `tv.kozoom.com/en/player`: `<link rel=canonical>` = **0 hits** |
| sitemap: μικρά, **χωρίς events και χωρίς άρθρα** | `home.kozoom.com/sitemap.xml` = **4** URLs · `tv.kozoom.com/sitemap.xml` = **56** URLs (μόνο `/{lang}/{κατηγορία}/{live,news,replay}` + player + premium-pass) · 0 URLs με `/event/` · 0 URLs με `news/<slug>` |
| `robots.txt` | `www.kozoom.com`: `User-Agent: * Allow: /` + `Sitemap: https://home.kozoom.com/sitemap.xml` · `tv.kozoom.com`: allow all · `help.kozoom.com`: allow all, `Crawl-delay: 5` |
| **Store (Magento)**: 5 γλώσσες, **μεταφρασμένα paths + hreflang + x-default** | `hreflang="fr" href="https://store.kozoom.com/fr/livres-videos/pass-premium-kozoom-tv.html"`, `hreflang="de" …/de/bucher-videos/premium-pass-billard.html`, `hreflang="es"`, `hreflang="nl"`, `hreflang="x-default" …/en/…` |
| Store sitemaps: ~1.600 URLs/γλώσσα, σε 5 αρχεία (χωρίς index) | en 1668 · fr 1671 · de 1620 · nl 1617 · es 1673 · `robots.txt`: 5 `Sitemap:` lines |
| Store robots: πολλές απαγορεύσεις | `Disallow: /catalogsearch/`, `/checkout/`, `/customer/`, `/ajax/`, `/*?q=*`, `User-agent: FacebookBot Disallow: /` |
| **Structured data** | TV event: `SportsEvent` + `Place` + `PostalAddress` (π.χ. `"@type":"SportsEvent","name":"European Cup Final Club Team - Porto - 3-Cushion","startDate":"2026-07-26T08:45:00.000Z"`) · άρθρο: `NewsArticle` · player: `Person` (+ `Organization`, `Store`) · home/tv lists: `WebSite` · store: `Product`+`Offer`+`BreadcrumbList`+`SiteNavigationElement`-οικογένεια+`SportingGoodsStore`+`SpeakableSpecification` · help: `TechArticle`+`BreadcrumbList` |
| help center: 1 γλώσσα αλλά **σωστό hreflang + x-default** | `hreflang="en"` + `hreflang="x-default"`, `<html lang="en">`, `TechArticle`, sitemap 69 URLs με `xhtml:link rel="alternate"` |
| **Παλιές διευθύνσεις (indexed στο Google) → 404** | `www.kozoom.com/en/billiard-carom/results/20084/rankings.html` → 301 → `home.kozoom.com/…` → **404** · `…/players/sanchez-daniel/palmares.html` ίδιο |
| Sitemap freshness | `lastmod` 2026-10-28, `changefreq` daily/weekly, priority 1.0 στις live/news/replay |

---

## 3) Διοργανώσεις, κατατάξεις, πρόκριση

| Τι κάνουν | Στοιχείο |
|---|---|
| Events με **αριθμητικό id σε μη-μεταφρασμένο slug**, ίδιο id σε όλες τις γλώσσες | `/en/event/40187` · `/fr/event/40187` · `/es/event/40187` · `/nl/event/40187` |
| Λίστες ανά κατηγορία με 3 όψεις: **live / news / replay** | `/en/billiard-carom/live`, `/en/billiard-carom/news`, `/en/billiard-carom/replay` (ίδιο μοτίβο σε 4 γλώσσες × 4 κατηγορίες) |
| Ημερολόγιο στη λίστα live: μήνας/ημέρα + countdown ημερών | `### 4 Días may. 08 may. 10 ### Predator 3-Cushion Women Grand Prix Gandia (ESP)` |
| **Ομαδικά** αναγνωρίζονται ως πεδίο του event | `"isTeam":true` σε Kozoom League (40309), FFB Top Ligue 1 (40291), European Cup Final Club Team (40187) — 3 από 19 στο live listing |
| **Λίγκα = parent event + στρογγυλοί αγώνες ως children** | `{"id":40309,"eventTypeName":"Kozoom League Round 8",…,"isTeam":true,"level":"club","parentEventId":40301}` → parent `40301` = `Kozoom League • 3-Cushion` |
| Ιεράρχηση περιεχομένου με `level` (δωρεάν vs συνδρομητικό) | `"level":"club"` (16/19) vs `"level":"premium"` (3/19, π.χ. 40187) |
| Πρόκριση/play-off **δεν υπάρχει στην πλατφόρμα** — μόνο σε δελτία τύπου της KNBB | Δομή Kozoom League: 12 ομάδες, 22 αγωνιστικές, οι 4 πρώτοι στα play-off: ο #4 εκτός έδρας στον #3 → ο νικητής εκτός στον #2 → ο νικητής με τον #1 (εντός/εκτός + 3ο ματς ίδια βραδιά στο γήπεδο του #1). Πηγή: δελτία τύπου knbb.nl — όχι σελίδα στο kozoom.com |
| Δεν βρήκαμε σελίδες ομίλων/pinaka/bracket/standings — σχεδόν όλα τα σχετικά URLs = 404 | 404: `/en/ranking`, `/en/rankings`, `/en/federation`, `/en/federations`, `/en/country`, `/en/clubs`, `/en/league`, `/en/competition`. Το HTML της σελίδας event έχει **0** εμφανίσεις `group`, `bracket`, `schedule`, `table`, `qualification`, `semifinal` |
| Υπάρχει **υποδοχή για εξωτερική κατάταξη** στο μοντέλο δεδομένων, αλλά κενή | Στο flight του `/en/event/40187`: `"isRankingOnline":null,"externalRankingUrl":null` — το πεδίο υπάρχει, η τιμή όχι |
| Σελίδες «ζωντανών»: scoreboard flag ανά event, multi-table | `"newScoreboard":true`, `"nextStreamingTime":"2026-07-26T15:00:00+00:00"`, `"nbSets":0`, `"timezone":"Europe/Lisbon"` |
| Player pages με αριθμητικό δείκτη δίπλα στο όνομα | `/en/player` → `Frédéric CAUDRON … 781`, `Dick JASPERS … 723`, `Eddy MERCKX 604`; profile: `/en/player/kim-haeng-jik`, `Person` schema. **Σημασία του αριθμού δεν επαληθεύτηκε** |
| **Αθλητικές κατηγορίες (rulesets) ως λεξιλόγιο** | `3-Cushion`, `1-Cushion`, `Balk-Line 35/2 42/2 45/1 45/2 47/1 47/2 71/2`, `Free game`, `5-Pin`, `Pentathlon`, `Biathlon`, `Artistic`, `Snooker`, `Pool: 8-Ball 9-Ball 10-Ball 7-Ball Straight(14.1) One Pocket Black ball Heyball Speed Pool Pyramid` |
| Σχέση με ομοσπονδίες: **εμπορική, όχι σελίδες ανά χώρα** | Στο premium-pass: «Since over 10 years, Kozoom has built broadcasting partnerships with many Federations and promoters»; homepage link → `https://www.eurobillard.org`; events φέρουν χώρα/πόλη στο όνομα (Bottrop (DEU), Porto (PRT), Vinh…). Δεν υπάρχει σελίδα «ανά ομοσπονδία/χώρα» |
| Community section dead | `community.kozoom.com` δεν απάντησε (curl 000) — **δεν επαληθεύτηκε** |

---

## 4) Χρέωση (ακριβή νούμερα, όπως εμφανίζονται)

| Τι | Ποσό | Πηγή |
|---|---|---|
| Kozoom TV **Annual Premium Pass** | **€99.99** / έτος (ίδια τιμή en/de/nl: `"price" content="99.99"`) | `store.kozoom.com/en/kozoom-tv-annual-premium-pass-for-the-english-version.html` |
| **Event Pass** (ανά διοργάνωση) | **€9.99** — `"subscriptionPrice":"9.99"` στο event 40187 | flight payload `tv.kozoom.com/en/event/40187` |
| Event Pass: διάρκεια πρόσβασης replay | «Livestream + Replay videos **up to 14 days** after the end of the event» | `help.kozoom.com/help/how-do-i-choose-a-premium-pass` |
| Annual Pass: τι περιλαμβάνει | «unlimited access to every Livestream and Replay», multitable, on-demand, Masterclass (webinars/video lessons από το 2023) | `tv.kozoom.com/en/premium-pass` |
| **K Points** (store loyalty) | **10 K Points = 1 € έκπτωση** | `help.kozoom.com/help/premium-pass` collection («K Points») |
| Δωρεάν μεταφορικά (store) | **€100** Γαλλία · **€150** zones 1-3 · **€200** zones 4-6 · **€300** zone 7 | `help…/which-countries-do-we-deliver-to` |
| Δωρεάν περιεχόμενο στην TV | events με `level:"club"` (16/19 στο live δείγμα), όλα τα news/άρθρα, ημερολόγιο/πρόγραμμα, προφίλ παικτών, λίστες replay metadata | live flight + `/en/player` |
| Ξεπερασμένος σύνδεσμος αγοράς στο help | `/en/premium-pre-checkout` → **404** (το help doc το προτείνει ακόμα) | curl |
| Store: μόνο το Annual Pass ως προϊόν συνδρομής | το search «premium pass» επιστρέφει 1 προϊόν pass + «Kozoom TV Magazine Premium Passes» category (€99.99) | `store.kozoom.com/en/catalogsearch/result/?q=premium+pass` |
| **Δεν επαληθεύτηκε**: μηνιαίο/οικογενειακό πακέτο, τιμές ανά χώρα, «Save Money» tier πέραν του annual | η σελίδα premium-pass είναι client-rendered (0 τιμές στο HTML) | — |

---

## 5) Τι παίρνουμε εμείς (μόνο σχήμα/δομή)

1. **Γλώσσα = πρόθεμα μονοπατιού + μεταφρασμένο slug ανά κατηγορία, και ίδιο slug όπου δεν υπάρχει μετάφραση.** Δίνει δυνατότητα για `billiardtoday.com/{el,fr,nl,…}` με `/…/kanonismos` vs `/…/rules` αντί για τεχνητές μεταφράσεις.
2. **hreflang ανά ζεύγος σελίδων, όχι global.** Το δικό μας ανάλογο: για κάθε «γλώσσα ανά ομοσπονδία» να παράγεται hreflang **μόνο** για τις ομοσπονδίες/χώρες που πραγματικά υπάρχουν, με **x-default** (το Kozoom το ξεχνά στα events/άρθρα — εκεί κερδίζουμε).
3. **Το event id ως σταθερό κλειδί στο URL** (`/event/{id}`) ανεξάρτητο γλώσσας: ένα canonical id, N γλωσσικές όψεις. Καθαρίζει το πρόβλημα «ίδιος αγώνας σε 3 γλώσσες».
4. **Λίγκα ως parent + αγωνιστική ως child** (`parentEventId`), με `isTeam` και `level` (δωρεάν/συνδρομητικό) πάνω στο event: μας δίνει δωρεάν την ομαδοποίηση «Α1 → αγωνιστικές» και το «τι πληρώνεται».
5. **Δομή προβολής: live / news / replay + προφίλ + λεξιλόγιο ruleset** (3-Cushion, Balk-Line 47/2, 5-Pin…) ως ταξινομία, όχι ως ελεύθερο κείμενο.

---

## 6) Τι ΔΕΝ αντιγράφεται

- **Δεν αντιγράφουμε την απουσία hreflang στα άρθρα** — το Kozoom έχει 3 μεταφρασμένα slugs για το ίδιο άρθρο και κανένα hreflang, δηλαδή αφήνει canonical/hreflang να μαντέψει η Google. Είναι ζημιά, όχι pattern.
- **Δεν αντιγράφουμε την έλλειψη σελίδων πρόκρισης/ομίλων.** Εκεί που το Kozoom σταματά (τοποθέτηση σε όμιλο, «πόσοι προκρίνονται», χιαστί, μπαράζ), εμείς έχουμε ουσιαστικό προϊόν. Το δικό μας πλεονέκτημα είναι ακριβώς το κενό τους.
- **Δεν αντιγράφουμε το slug-less / μεταβλητό «κατηγορία = αγγλικό slug σε ξενόγλωσσο URL»** (`/fr/pool-billiard/…`) — ρίχνει τη σχετικότητα στη γλώσσα.
- **Δεν αντιγράφουμε το sitemap που δεν έχει events/άρθρα** (4 και 56 URLs) ούτε την εγκατάλειψη παλιών indexed διευθύνσεων σε 404 — εμείς θέλουμε 301 σε ισοδύναμη σελίδα.
- **Δεν αντιγράφουμε το χωρισμό σε 5 hosts** (home/tv/store/help) με 3 διαφορετικές στοίβες και 3 διαφορετικές πολιτικές hreflang (x-default μόνο στο store/help, πουθενά στο tv) — ασυνεπές authority.
- **Δεν αντιγράφουμε το «πληρωμένο vs δωρεάν» που φαίνεται μόνο μέσα στα δεδομένα** (`level: premium`) χωρίς σήμανση στη σελίδα/στο schema.

---

## 7) URLs που άνοιξα

**Sitemaps / robots**
- https://www.kozoom.com/robots.txt · https://www.kozoom.com/sitemap.xml
- https://home.kozoom.com/sitemap.xml · https://tv.kozoom.com/sitemap.xml · https://tv.kozoom.com/robots.txt
- https://store.kozoom.com/sitemap.xml · https://store.kozoom.com/{en,fr,de,nl,es}/sitemap.xml · https://store.kozoom.com/robots.txt
- https://help.kozoom.com/sitemap.xml · https://help.kozoom.com/robots.txt

**Portal / canonical / redirects**
- https://kozoom.com/ · https://www.kozoom.com/ · https://home.kozoom.com/ · https://home.kozoom.com/en/all-cue-sports
- https://home.kozoom.com/{es,fr,nl}/… (todos-los-billares, tous-les-billards, alle-biljart)
- https://www.kozoom.com/{de,el,nl,es,fr}/ · https://www.kozoom.com/en/billiard-carom/
- https://www.kozoom.com/en/billiard-carom/results/20084/rankings.html (→404)

**TV**
- https://tv.kozoom.com/ · https://tv.kozoom.com/en/all-cue-sports/{live,news,replay}
- https://tv.kozoom.com/en/billiard-carom/{live,news,replay} · /fr/billard-carambole/{live,news} · /fr/tous-les-billards/news · /es/todos-los-billares/news · /es/billar-carambola/news · /nl/alle-biljart/news
- https://tv.kozoom.com/en/event/{40187,40196,40272,40280,40291,40301,40309,40115}
- https://tv.kozoom.com/en/all-cue-sports/news/amir-ibraimov-retains-european-u25-three-cushion-title
- https://tv.kozoom.com/fr/billard-carambole/news/amir-ibraimov-conserve-son-titre-europeen-u25
- https://tv.kozoom.com/fr/billard-carambole/news/amir-ibraimov-retains-european-u25-three-cushion-title
- https://tv.kozoom.com/en/player · https://tv.kozoom.com/en/player/kim-haeng-jik · https://tv.kozoom.com/en/premium-pass
- 404 probes: /en/ranking, /en/rankings, /en/federation(s), /en/country, /en/countries, /en/club(s), /en/league, /en/competition(s), /en/results, /en/premium-pre-checkout

**Store / Help**
- https://store.kozoom.com/ · /en/kozoom-tv-annual-premium-pass-for-the-english-version.html · /{de,nl}/ίδιο · /en/books-videos/kozoom-magazine-premium-passes.html · /en/catalogsearch/result/?q=premium+pass · /en/catalogsearch/result/?q=events+pass
- https://help.kozoom.com/ · /help/premium-pass · /help/how-do-i-choose-a-premium-pass

**Δεν επαληθεύτηκε**: `community.kozoom.com` (χωρίς απάντηση), ο μηχανισμός εναλλαγής γλώσσας (client-side), η σημασία του αριθμού στις player cards, τυχόν εσωτερικό API/GraphQL των scores, περιεχόμενο που απαιτεί σύνδεση.
