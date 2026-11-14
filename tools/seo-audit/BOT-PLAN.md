# seo-auditor — bot του Hermes για το billiardtoday.com

> Σχέδιο υλοποίησης (design doc). Δεν εκτελέστηκε τίποτα: καμία εγκατάσταση, καμία αλλαγή σε `config.yaml`, κανένα write σε παραγωγή.
> Βάση τεκμηρίωσης: `tools/seo-audit/audit.py` (ο πραγματικός crawler, 302 γραμμές), το σημερινό report `reports/20261028-1151-audit.json|md`, `23-aiSEO-Studio/gsc/fetch-gsc.mjs`, `23-aiSEO-Studio/studio/lib/gsc.mjs`, `23-aiSEO-Studio/serp.mjs`, skills `hermes-bot-team-setup`, `hermes-model-config` / `references/cheaperinference.md`, `devops/aiseo-audit-runbook`.

---

## 1. Ρόλος — τι κάνει ο bot

**`seo-auditor` = εβδομαδιαίος ελεγκτής τεχνικού SEO + ορατότητας για το billiardtoday.com.** Δεν «φτιάχνει» τίποτα. Διαβάζει μετρήσεις και βγάζει **ιεραρχημένη λίστα προτάσεων με αποδείξεις**.

Είσοδοι (όλες διαβασμένες, καμία γραμμένη από τον bot):
1. `tools/seo-audit/reports/<stamp>-audit.json` — 126 σελίδες, 2216 sitemap URLs, 21 μετρικές/σελίδα (status, ms, title, description, canonical, robots, h1, jsonld_types, text_chars, player_links…).
2. GSC (`searchAnalytics`) — πραγματικά impressions/clicks/θέσεις ανά query και ανά σελίδα, 28 και 90 ημέρες.
3. SerpApi — θέση για 6–10 head queries, ΜΗΝΙΑΙΑ (όχι εβδομαδιαία), γιατί είναι το μόνο επί πληρωμή κανάλι.

Έξοδοι:
- **Weekly digest** (markdown, ~1 σελίδα) στο bot chat του `seo-auditor`.
- **Diff vs προηγούμενης εβδομάδας**: τι χειροτέρεψε (νέα timeouts, νέα missing titles, σελίδες που έπεσαν θέση), τι διορθώθηκε.
- **Top-5 προτεινόμενες ενέργειες**, κάθε μία με: απόδειξη (path+κλειδί του JSON ή GSC query+ημερομηνία), εκτίμηση κόστους σε ανθρωποώρες, ρίσκο, και «ποιος το κάνει» (άνθρωπος).
- **Kanban drafts** (`hermes kanban create ... --assignee dev-2`) — ΜΟΝΟ προσχέδια σε κατάσταση `ready` για ανθρώπινη έγκριση, ποτέ auto-dispatch σε deploy.

Κανόνας απόδειξης (δανεισμένος από το `aiseo-audit-runbook` trust spec, γιατί είναι ήδη δοκιμασμένος): κάθε πρόταση φέρει ετικέτα **✅ μετρημένο (πηγή+ημερομηνία)** · **⚠️ εκτίμηση** · **❓ δεν ελέγχθηκε**. Απαγορεύεται claim απουσίας («δεν έχει καθόλου…») χωρίς μέτρηση.

---

## 2. Μοντέλα — ποιο κάνει τι και γιατί

Ο πάροχος είναι ένας (`custom:cheaperinference` — μέτρηση καταλόγου 28/10/2026: **535 μοντέλα**, επιβεβαιωμένα ids `deepseek-v4.1-flash`, `gpt-5.6-terra`, `claude-sonnet-5`), άρα η επιλογή μοντέλου είναι **ρύθμιση ανά job**, όχι νέα συνδρομή. Το `hermes cron create` δέχει `--model` / `--provider` / `--reasoning-effort`, και το `hermes chat` δέχει `-m` / `--provider`: αυτό επιτρέπει δύο στάδια με διαφορετικό μοντέλο χωρίς αλλαγή config.

| Στάδιο | Μοντέλο | Γιατί |
|---|---|---|
| **A. Εκτέλεση + περίληψη** (crawl, diff, digest, «τι άλλαξε») | `deepseek-v4.1-flash` (φθηνό, γρήγορο, ίδιο με το default προφίλ) | Μηχανική δουλειά: σύγκριση JSON, διατύπωση πινάκων, ελληνικό κείμενο. Δεν χρειάζεται κρίση — χρειάζεται συνέπεια και χαμηλό κόστος. Τρέχει σε κάθε weekly run. |
| **B. Κρίση + ιεράρχηση** (top-5, ρίσκο, σειρά υλοποίησης) | δυνατό, ένα σταθερό: **`gpt-5.6-terra`** (εναλλακτικά `claude-sonnet-5`· και τα δύο επιβεβαιωμένα στον κατάλογο του παρόχου, το `gpt-5.6-terra` είναι ήδη το μοντέλο του προφίλ `designer`) | Εδώ κρίνεται «τι πληρώνει»: π.χ. 32 timeouts σε σελίδες αθλητών vs 103 σελίδες χωρίς JSON-LD — ποιο πρώτο; Αυτό είναι trade-off, όχι άθροισμα. Λίγα tokens, μία κλήση/εβδομάδα. |
| **Γ. Ταξινόμηση/φιλτράρισμα μεγάλου JSON** | *κανένα* — deterministic Python | Ο diff ΔΕΝ περνά από LLM. 133 KB JSON → 8 KB diff με κώδικα. Κόβει κόστος και παραισθήσεις. |
| **Δ. Vision (προαιρετικό, μελλοντικό)** | `gpt-4.1-nano` (vision:true, verified) | Μόνο αν ζητηθεί screenshot-based έλεγχος. Δεν ανήκει στο v1. |

**Γιατί όχι ένα δυνατό μοντέλο για όλα:** το crawl output είναι 133 KB και 126 rows· η «ανάγνωση» του είναι σύγκριση, όχι σκέψη. Βάζοντας `claude-opus` στο στάδιο A πληρώνεις κρίση για δουλειά που κάνει η Python. Αντίστροφα, βάζοντας flash στο B παίρνεις γενικόλογες λίστες («βελτίωσε τα titles») — ακριβώς αυτό που θέλουμε να αποφύγουμε.

---

## 3. Εργαλεία

| Εργαλείο | Κατάσταση | Χρήση | Σημείωση |
|---|---|---|---|
| `tools/seo-audit/audit.py` | ✅ υπάρχει, read-only, stdlib | Weekly crawl: `cd /d/Projects/5-billiardtoday-frontend/tools/seo-audit && python audit.py --out reports --max-tournaments 60 --max-players 40` (~142 s, 126 σελίδες) | **Δεν τροποποιείται.** Γνωστοί περιορισμοί που ο bot πρέπει να αναφέρει: timeout 25 s (παράγει ψευδή «broken»), δεν διαβάζει `robots.txt`, δεν κάνει JS render. |
| **`tools/seo-audit/diff.py`** | ❌ προς δημιουργία (ο μόνος νέος κώδικας του v1) | Παίρνει τα δύο τελευταία `*-audit.json` → regressions/fixes, μόνο deltas | ~80 γραμμές, stdlib, deterministic. Έξοδος `reports/<stamp>-diff.json` (μικρό). |
| **`tools/seo-audit/gsc-report.mjs`** | ❌ προς δημιουργία — **επανάχρηση** λογικής από `23-aiSEO-Studio/studio/lib/gsc.mjs` (`gscQuery`, `discoverProperty`, `refreshAccessToken`) | GSC 28/90 ημερών: queries, pages, CTR, θέσεις, «striking distance» 8–20 | Το υπάρχον `gsc/fetch-gsc.mjs` έχει **hardcoded** `SITE="https://mobilerepairs.gr/"` και ελληνικό φίλτρο επισκευών — δεν κάνει για billiardtoday. Χρειάζεται `--site sc-domain:billiardtoday.com` και ουδέτερο φίλτρο. |
| `23-aiSEO-Studio/serp.mjs` (`searchGoogle`) | ✅ υπάρχει | Μηνιαίος έλεγχος 6–10 head queries (π.χ. «world cup 3 cushion», «umb ranking», «carom billiards results») | Διαβάζει `SERPAPI_KEY` από `23-aiSEO-Studio/.env` (παρόν). **Read-only χρήση** — ο bot δεν τρέχει `mass-run.mjs`, δεν γράφει άρθρα. |
| `hermes kanban` | ✅ υπάρχει | Draft tasks για εγκεκριμένες ενέργειες | Χωρίς gateway τα tasks μένουν `ready` — αυτό είναι το επιθυμητό (human gate). |

Απαιτούμενη προϋπόθεση προς επαλήθευση πριν το πρώτο run: το property `billiardtoday.com` (ή `sc-domain:`) να υπάρχει στο GSC του λογαριασμού — αν όχι, ο bot τρέχει σε degraded mode (μόνο crawl) και το δηλώνει ρητά στο digest ως `❓ GSC μη συνδεδεμένο`.

---

## 4. Στήσιμο σε Hermes

### 4.1 Profile + SOUL

```bash
hermes profile create seo-auditor --clone-from dev-2
# SOUL: C:\Users\Makis\AppData\Local\hermes\profiles\seo-auditor\SOUL.md
```

SOUL (σύντομο, ~25 γραμμές — ο χαρακτήρας που κρατάει τους κανόνες όταν το prompt είναι ασαφές):
- «Είσαι ο seo-auditor του billiardtoday.com. Μετράς, δεν κατασκευάζεις.»
- «Κάθε πρόταση έχει απόδειξη από `reports/*.json`, GSC ή SerpApi, με ημερομηνία. Αλλιώς είναι ❓ και δεν μπαίνει στο top-5.»
- «Δεν αλλάζεις τίποτα σε site, Strapi, WordPress, DNS, config. Προτείνεις σε άνθρωπο.»
- «Δεν υπόσχεσαι κατάταξη. Λες τι μετρήθηκε και πότε ξαναμετριέται.»
- «Γράφεις ελληνικά, στεγνά, χωρίς επιθέτα ποσότητας χωρίς μέτρηση.»

### 4.2 Scripts (κάτω από `~/.hermes/scripts/`, ΠΑΝΤΑ σχετικό path)

⚠️ Pitfall επιβεβαιωμένο στο `hermes-bot-team-setup`: το `--script` πρέπει να είναι **σχετικό** όνομα κάτω από `C:\Users\Makis\AppData\Local\hermes\scripts\` — absolute Windows paths χάνουν τα backslashes και το job πεθαίνει με exit 127.

- `seo-auditor-crawl.sh` → τρέχει `audit.py` + `diff.py`, τυπώνει μόνο το diff (μικρό) στο stdout.
- `seo-auditor-gsc.sh` → τρέχει `gsc-report.mjs`, τυπώνει σύνοψη GSC (top queries, striking distance, σελίδες που έχασαν θέσεις).

### 4.3 Cron — δύο jobs, μία εβδομάδα

```bash
# A) Πέμπτη 08:30 — μέτρηση + digest (φθηνό μοντέλο)
hermes cron create '30 8 * * 4' \
  --name "SEO audit billiardtoday — μέτρηση+digest" \
  --skill seo-auditor-billiardtoday \
  --script seo-auditor-crawl.sh \
  --model deepseek-v4.1-flash --provider custom:cheaperinference \
  --deliver bot-chat:seo-auditor \
  "<σύντομο prompt: διάβασε το diff, γράψε digest με ετικέτες αποδείξεων>"

# B) Πέμπτη 09:15 — κρίση + top-5 (δυνατό μοντέλο, μόνο το digest ως input)
hermes cron create '15 9 * * 4' \
  --name "SEO audit billiardtoday — ιεράρχηση" \
  --skill seo-auditor-billiardtoday \
  --model gpt-5.6-terra --provider custom:cheaperinference --reasoning-effort medium \
  --deliver bot-chat:seo-auditor \
  "<prompt: από το σημερινό digest βγάλε top-5 με κόστος/ρίσκο/απόδειξη>"
```

- Cron εκτελείται **μόνο με gateway running** (και τα δύο jobs: `--deliver bot-chat:seo-auditor`).
- Το job B δεν ξαναδιαβάζει JSON — μόνο το digest του A (φθηνό input, δυνατή κρίση).
- Εβδομαδιαίο, όχι ημερήσιο: το site αλλάζει με tournaments/rankings, όχι με ώρες· και το crawl είναι 126 requests.

### 4.4 Όρια tokens / κόστους

| Στάδιο | Input cap | Output cap |
|---|---|---|
| A — digest | ~40k tokens (μόνο το diff + summary, **ποτέ** τα 133 KB) | 4k |
| B — κρίση | 25k (digest + λίστα regressions) | 2.5k |
| SerpApi | 10 queries/μήνα max | — |

- Ο bot γράφει στο digest το πλήθος tokens του run (το δείχνει το `/usage`). Αν το στάδιο A ξεπεράσει τα 60k input, **κόβει** και αναφέρει «budget stop» αντί να συνεχίσει.
- Πραγματικό κόστος σε €: επιβεβαιώνεται από `hermes -p seo-auditor usage` / Project sidebar — δεν το εκτιμώ εδώ με τιμές που δεν έχω ελέγξει για το cheaperinference.
- `fallback_providers` (ήδη `custom:cheaperinference` / `deepseek-v4-flash`): αν πέσει το δυνατό μοντέλο, το B τρέχει σε flash και **το δηλώνει** («ιεράρχηση από fallback μοντέλο»).

### 4.5 Read-only, τεχνικά επιβεβλημένο (όχι μόνο ευχή)

1. Toolset περιορισμός στο cron: εκτέλεση με περιορισμένα toolsets (terminal, read_file, search_files, web) — χωρίς browser, χωρίς `deploy`/Strapi εργαλεία.
2. Ο crawler είναι read-only by construction (`urllib` GET, UA `BilliardToday-SEO-Audit/1.0`).
3. GSC scope: `webmasters.readonly` (ήδη έτσι στο `lib/gsc.mjs`).
4. Εγγραφές επιτρέπονται **μόνο** σε `tools/seo-audit/reports/` (νέα reports/digests) — πουθενά αλλού.
5. Καμία εντολή `hermes config set`, κανένα edit σε `.env`/`config.yaml`, κανένα `git push`, κανένα restart υπηρεσίας — από τον bot. Ποτέ.

---

## 5. Τι ΔΕΝ κάνει

- ❌ **Content generation** — δεν γράφει άρθρα/titles/descriptions προς δημοσίευση. Αυτό είναι του aiSEO Studio (`mass-run.mjs`, `contentclaw`) και είναι review-gated εκεί.
- ❌ **Καμία αλλαγή σε παραγωγή** — όχι Strapi edits, όχι WP, όχι redirects, όχι DNS, όχι deploys. Ούτε «μικρή διόρθωση».
- ❌ **Καμία υπόσχεση κατάταξης** — ούτε «θα ανέβεις», ούτε «θα σε βρουν». Μόνο μετρημένη θέση + ημερομηνία επανελέγχου.
- ❌ **Δεν κάνει client-facing PDF decks** — αυτό είναι το `aiseo-audit-runbook` (άλλο job, άλλο κοινό, trust rules για πελάτη). Δεν διπλασιάζουμε: εδώ το κοινό είναι εσωτερικό.
- ❌ **Δεν αγγίζει μετρήσεις που δεν ελέγχει** — δεν εκτιμά traffic/έσοδα, δεν «προβλέπει» CTR lift.
- ❌ **Δεν κάνει auto-dispatch kanban → deploy.** Drafts μόνο.
- ❌ **Δεν τρέχει πιο συχνά από εβδομαδιαία**: όχι ωριαίο crawl — 126 req/ώρα για δεδομένα που δεν αλλάζουν είναι φόρτος χωρίς πληροφορία.
- ❌ **Δεν αποφασίζει μόνος του για delete/noindex** σελίδων — προτείνει, άνθρωπος εκτελεί.

---

## 6. Βήματα υλοποίησης (εκτίμηση: ~3,5 ώρες)

| # | Βήμα | Χρόνος | Παραδοτέο / έλεγχος |
|---|---|---|---|
| 1 | Επαλήθευση προϋποθέσεων: GSC property billiardtoday, `SERPAPI_KEY`, node/python διαθέσιμα, gateway running | 20' | Σημείωση «τι λείπει» (μία λίστα, όχι υποθέσεις) |
| 2 | `diff.py` (ντετερμινιστικό) + δοκιμή στα δύο υπάρχοντα JSON | 60' | `reports/<stamp>-diff.json`, έλεγχος σε 1 τεχνητό regression |
| 3 | `gsc-report.mjs` με `--site` (reuse `lib/gsc.mjs`) | 60' | Ένα GSC query 28 ημερών για `sc-domain:billiardtoday.com` με πραγματικά νούμερα (impressions/clicks/θέση) |
| 4 | Profile `seo-auditor` + `SOUL.md` (κλωνοποίηση από `dev-2`, μετά αντικατάσταση SOUL) | 20' | `hermes profile list` δείχνει το προφίλ· ένα `chat -q "ποιος είσαι;"` απαντά με τον σωστό ρόλο |
| 5 | Scripts κάτω από `~/.hermes/scripts/` (σχετικά paths) + δοκιμή με το χέρι | 30' | Και τα δύο scripts τρέχουν και τυπώνουν μικρό stdout (<8 KB) |
| 6 | Τα δύο cron jobs + ένα manual `hermes cron run` για επαλήθευση | 15' | `hermes cron list` δείχνει και τα δύο· το run παραδίδει digest στο `bot-chat:seo-auditor` |
| 7 | Πρώτο πραγματικό run + ανθρώπινη κριτική του digest (κόβονται τα generic ευρήματα) | 30' | Digest που στέκεται σε έλεγχο: κάθε γραμμή με απόδειξη |

**Σύνολο ≈ 3,5 ώρες**, από τις οποίες το 60% είναι κώδικας (βήματα 2–3) και το 40% στήσιμο/δοκιμές. Το βήμα 7 είναι το πιο σημαντικό: αν το πρώτο digest δεν είναι καλύτερο από το σημερινό `*-audit.md`, ο bot δεν αξίζει cron.


---

## Παράρτημα Α — Baseline μετρήσεων (28/10/2026 11:51, πραγματικό run)

Πηγή: `reports/20261028-1151-audit.json` — 126 σελίδες από 2216 sitemap URLs, 142,4 s.

| Εύρημα | Πλήθος | Τι σημαίνει |
|---|---|---|
| Σελίδες με `status 0` (read timeout) | **32/126** | Ο server δεν απαντά σε 25 s — κυρίως `/players/*` και δύο `/rankings/ceb/*`. **Πρώτο εύρημα προς διερεύνηση**, αλλά με επιφύλαξη: το timeout του audit είναι 25 s και 51 σελίδες είναι >5 s. |
| Χωρίς JSON-LD | 103/126 | Μόνο `ProfilePage`×20, `ItemList`×2, `CollectionPage`×1. Τα tournament pages δεν δηλώνουν δομημένα δεδομένα. |
| Χωρίς link σε προφίλ αθλητή | 118/126 | Εσωτερικό linking σχεδόν ανύπαρκτο — coverage/orphan κίνδυνος. |
| Λεπτό HTML (<1200 χαρ.) | 40 | Κυρίως ταυτίζεται με τα timeouts — **δεν είναι ανεξάρτητο εύρημα** πριν επαναληφθεί η μέτρηση. |
| `lang="en"` σε 94/126 | — | Το site σερβίρεται ως αγγλόφωνο· σωστό για κοινό UMB/CEB, λάθος αν κυνηγάμε ελληνικά queries — απόφαση ανθρώπου, όχι bot. |
| Διπλά titles / noindex | 0 / 0 | Καθαρό — να αναφέρεται ως «✅ τι πάει καλά» (strengths first). |

**Ερμηνευτικός κανόνας για τον bot:** τα `status 0` ΔΕΝ είναι 404. Πριν γραφτούν ως «σπασμένες σελίδες», γίνεται ένα retry με μεγαλύτερο timeout· αν αποτύχει ξανά → `✅ επιβεβαιωμένο timeout`, αλλιώς → `⚠️ παροδικό (server load)`.

## Παράρτημα Β — Μορφή digest (συμβόλαιο εξόδου)

```markdown
# SEO digest billiardtoday.com — YYYY-MM-DD
Μετρήθηκαν: 126 σελίδες / 2216 URLs · GSC: 28ημ + 90ημ · Διάρκεια: 142s
## Τι χειροτέρεψε (delta vs προηγούμενη εβδομάδα)
- ✅ νέα timeouts: N σελίδες → [urls] (retry: αποτυχία/επιτυχία)
## Τι διορθώθηκε
## Top-5 ενέργειες (για έγκριση ανθρώπου)
1. [τι] · απόδειξη: reports/x.json → findings.key[i] · εκτίμηση: ⚠️ · κόστος: Xh · ρίσκο: χαμηλό/μέσο/υψηλό
## Τι δεν ελέγχθηκε και γιατί (❓)
## Κανάλια που δεν χρησιμοποιήθηκαν (SerpApi: 0/10 queries αυτόν τον μήνα)
```

## Παράρτημα Γ — Γιατί δεν διπλώνει το aiSEO Studio

| | aiSEO Studio (`aiseo-audit-runbook`) | seo-auditor bot |
|---|---|---|
| Κοινό | Πελάτης (μη τεχνικός) | Εμείς |
| Έξοδος | PDF deck με trust rules | Digest + kanban drafts |
| Εύρος | Ένα site, μία φορά ανά job | Σταθερό site, κάθε εβδομάδα (trend) |
| Κρίση | Narrative για πώληση | Trade-off για εκτέλεση |
| Κοινός κώδικας | `gsc.mjs`, `serp.mjs`, trust labels | ίδιος — **χωρίς** νέο fetcher |
