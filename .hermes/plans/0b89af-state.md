# 0b89af — Badges έναρξης (PQ / Q / 1-16 / MAIN) & seeded-wildcard στις κατατάξεις ομίλων

**Repo:** `D:\Projects\5-billiardtoday-frontend` · branch `main`
**Session:** `20260927_152657_0b89af` (προηγούμενη: `20260926_202244_63c687`)
**Ημερομηνία σύνταξης:** 27/9/2026
**Site:** https://billiardtoday.com (GLOBAL, αγγλικό) · Strapi: app.billiardtoday.com · server 138.201.29.162

> Σημείωση ακρίβειας: όλα τα παρακάτω στοιχεία (git, αρχεία, server config) επιβεβαιώθηκαν με εντολές στις 27/9/2026. Οι αριθμοί γραμμών δίνονται με `≈` — είναι από το τρέχον worktree και μπορεί να μετακινηθούν με τις επόμενες αλλαγές.

---

## 1. Ποια δουλειά κάνουμε και γιατί

Στις σελίδες τουρνουά (`/tournaments/events/...`) ο θεατής βλέπει κατατάξεις. Το πρόβλημα: **δεν ξέρει από πού μπήκε ο κάθε παίκτης στο τουρνουά**. Σε ένα UMB World Cup οι παίκτες δεν ξεκινούν όλοι από την ίδια φάση — άλλοι προκρίνονται από προκριματικά (PQ), άλλοι από qualifying group (Q), άλλοι μπαίνουν απευθείας στους 1/16 (1-16) ή στο main draw (MAIN). Επίσης δεν φαίνεται ποιοι είναι **seeded** (προστατευμένοι/κατά σειρά ισχύος) και ποιοι μπήκαν με **wild card**.

Ζητούμενο: δίπλα στο όνομα του παίκτη, μέσα στις κατατάξεις (φάση/όμιλος), να εμφανίζονται:
1. **Badge φάσης έναρξης** — από πού ξεκίνησε ο παίκτης (`PQ`, `Q`, `PPQ`, `PPPQ`, `1/16`, `MAIN`), με tooltip «Started in <full stage title>».
2. **Badge tier εισόδου** — `S` (seeded) ή `WC` (wild card), χρωματιστά (S = μπλε, WC = πορτοκαλί).

**Λογική (κρίσιμη):** το badge φάσης έναρξης εμφανίζεται **μόνο** όταν ο παίκτης ξεκίνησε σε *προηγούμενη* φάση από αυτή που βλέπει ο χρήστης. Αν βλέπεις τη φάση που είναι και η αφετηρία του, το badge θα ήταν πλεονασμός (θα επαναλάμβανε τον τίτλο της φάσης σε κάθε γραμμή). Γι' αυτό ο έλεγχος είναι: `entryStage.order === null || currentStageOrder === null || entryStage.order < currentStageOrder`.

---

## 2. Τι έχει ολοκληρωθεί

### 2.1 Commit `a0c7a04` — ΜΟΝΟ για τον πίνακα κατάταξης φάσης (StageRankingTable)

```
a0c7a04  2026-09-27 15:52:16 +0300
feat(events): show where each player started (PQ/Q/1-16) and the seeded/wildcard entry tier in group rankings
```

| Στοιχείο | Τιμή |
|---|---|
| Αρχείο που άλλαξε | `src/app/tournaments/events/TournamentEventsContent.tsx` **μόνο** (432.646 bytes, 8.828 γραμμές) |
| Μέγεθος | +189 γραμμές, 0 αφαιρέσεις |
| Push | ✅ `git status -sb` → `## main...origin/main` (χωρίς ahead/behind) |
| Προηγούμενο commit | `58672c7` (23/9) «ranking Group column shows the group label (A, B, …)» |
| Deploy | ❌ **ΔΕΝ έχει γίνει deploy** (βλ. §2.4) |

Τι υλοποιεί (όλα μέσα στο `TournamentEventsContent.tsx`):

| Τι | Πού (≈) | Τι κάνει |
|---|---|---|
| `playerSeedByDocumentId` (useMemo) | 3385-3395 | Από `eventData.data.players` → `normalizeEntity<{seed}>` → `Map<documentId, seed>` |
| Νέο prop `playerSeedByDocumentId` στο `StageRankingTable` | 2079 / 2095 | Περνάει το map στον πίνακα |
| memo `entryStageByPlayerKey` | 2120-2123 | `buildEntryStageByPlayerKey(allStages.length > 0 ? allStages : [stage])` |
| memo `entryTierRule` | 2124 | `resolveEntryTierRule(eventRulesetKey)` |
| Υπολογισμός ανά γραμμή | 2737-2741 | `lookupEntryStage(...)`, `playerSeedByDocumentId?.get(result.playerDocumentId)`, `entryTierFromSeed(playerSeed, entryTierRule)` |
| Render badges | 2779-2783 | `<PlayerEntryBadges entryStage entryTier currentStageOrder={stage.order} />` |
| Block helpers | 2931-3097 | Βλ. πίνακα παρακάτω |
| Call site του `StageRankingTable` | 6378-6403 | Περνάει `playerSeedByDocumentId` |

Helpers που γράφτηκαν (≈2931-3097):

- `type EntryStageInfo = { order: number \| null; title: string \| null; label: string \| null }`
- `type EntryTier = "seeded" | "wildcard"`
- `type EntryTierRule = { seededThrough: number; wildcardThrough: number }`
- `const ENTRY_TIER_RULES: Record<string, EntryTierRule>` ≈2957 — **μόνο δύο rulesets**:
  - `umb_world_cup_3c_v1` → `{ seededThrough: 14, wildcardThrough: 17 }`
  - `umb_world_3c_v1` → `{ seededThrough: 46, wildcardThrough: 48 }`
- `resolveEntryTierRule(eventRulesetKey)` ≈2962-2965 → rule ή `null` (καμία default συμπεριφορά)
- `entryTierFromSeed(seed, rule)` → `"seeded"` αν `seed <= seededThrough`, `"wildcard"` αν `seed <= wildcardThrough`, αλλιώς `null`
- `collectStagePlayerKeys(stage)` ≈2978 → `Set` με keys `doc:<documentId>`, `id:<numericId>`, `name:<normalized name>`
- `shortEntryStageLabel(title)` → σύντομο label: `PQ`, `Q`, `PPQ`, `PPPQ`, `1/16`, `MAIN`, αλλιώς πρώτη λέξη (max ~6 χαρ., uppercase)
- `buildEntryStageByPlayerKey(stages)` ≈3023 → `Map<key, EntryStageInfo>`; κερδίζει το **μικρότερο** stage order (δηλαδή η πραγματική αφετηρία)
- `lookupEntryStage(map, result)` → δοκιμάζει `doc:` → `id:` → `name:`
- `PlayerEntryBadges({ entryStage, entryTier, currentStageOrder })` ≈3052-3097 → component: badge φάσης ( 회색, `title="Started in <title>"`) + badge tier (`S` μπλε / `WC` πορτοκαλί)· επιστρέφει `null` αν δεν έχει τίποτα να δείξει

### 2.2 Αλλαγές στο worktree — ΑΔΕΜΙΣΕΥΤΕΣ (uncommitted, ημιτελείς)

Τρέχουσα κατάσταση (επιβεβαιωμένη με `git status --short`):

```
 M src/app/tournaments/events/GroupStandingsTable.tsx     (+57)
 M src/app/tournaments/events/types.ts                    (+6)
 M src/app/tournaments/events/utils.ts                    (+1)
?? src/app/tournaments/events/entryBadges.tsx              (νέο, 2.457 bytes, untracked)
```

| Αρχείο | Αλλαγή |
|---|---|
| `types.ts` | `GroupStanding` απέκτησε: `playerDocumentId?: string`, `entryStage?: { order; label; title } \| null`, `entryTier?: "A" \| "B" \| "C" \| null` |
| `utils.ts` | `buildGroupStandings()` (γρ. ≈522-740): στο `acc[key] = {...}` προστέθηκε `playerDocumentId: entry.player.documentId ?? undefined` (≈676) |
| `GroupStandingsTable.tsx` | Νέο prop `showEntryBadges?: boolean` (default `false`, γρ. 13/22) + inline rendering badge **σε δύο σημεία** (≈82-108 smartphone/compact κελί, ≈126-152 desktop κελί): δείχνει `entryStage` (label, με order prefix αν υπάρχει) και `entryTier` (A = amber, B = sky, άλλο = γκρι, αλλιώς placeholder «—») |
| `entryBadges.tsx` (ΝΕΟ) | Types/helpers με **διαφορετικό** σύστημα tier: `EntryTier = "A" \| "B" \| "C"`, `TIER_RULES` **βάσει rating** (3-cushion: 1100 → A, 700 → B, αλλιώς C · 3-cushion-women: 400 → A, 200 → B), `DEFAULT_TIER_RULES`, `lookupEntryStage`, `resolveEntryTierRule`, `getEntryTier`, `buildEntryStageLookup` |

### 2.3 ΓΙΑΤΙ ΔΕΝ ΦΑΙΝΕΤΑΙ ΤΙΠΟΤΑ ΑΚΟΜΑ (το κρίσιμο εύρημα)

Δύο ανεξάρτητα εμπόδια — **και τα δύο ανοιχτά**:

1. **Κανείς δεν γεμίζει τα πεδία.** Το `buildGroupStandings()` δέχεται μόνο `matches`. Δεν έχει πρόσβαση στα stages του event, ούτε στο `playerSeedByDocumentId`, ούτε στο `entryTierRule` → τα `entryStage` / `entryTier` μένουν `undefined` σε **κάθε** γραμμή ομίλου. Άρα το rendering του `GroupStandingsTable` δεν έχει τι να δείξει.
2. **Το call site δεν ενεργοποιεί το feature.** Στο `TournamentEventsContent.tsx` ≈8575:
   ```tsx
   <GroupStandingsTable standings={groupStandings} ... />
   ```
   Δεν περνάει `showEntryBadges` (default `false`) ούτε κάποιο data map.
3. **Το `entryBadges.tsx` είναι ορφανό.** `grep -rn "entryBadges" src/` → **0 αποτελέσματα**. Δεν το κάνει import κανείς (το import αφαιρέθηκε, γιατί το rendering έγινε inline μέσα στο `GroupStandingsTable`). Είναι νεκρός κώδικας — ή θα χρησιμοποιηθεί ή θα διαγραφεί.
4. **Ασυμβατότητα τύπων:** το `type.ts` δηλώνει `entryTier?: "A" | "B" | "C"` (συμβατό με `entryBadges.tsx`), ενώ ο committed κώδικας του `a0c7a04` δουλεύει με `"seeded" | "wildcard"` (συμβατό με `ENTRY_TIER_RULES` του `TournamentEventsContent.tsx`). **Δύο διαφορετικά συστήματα tier συνυπάρχουν.**

### 2.4 Deploy — ΔΕΝ έχει γίνει

| Έλεγχος | Αποτέλεσμα |
|---|---|
| Prod source clone `/srv/git/billiardtoday/frontend` | `58672c7` (23/9) → το `a0c7a04` **δεν** έχει φτάσει |
| Live bundle `https://billiardtoday.com/tournaments/events` (14 chunks) | `grep` για `umb_world_cup_3c_v1` και `Started in` → **0 hits** (τα `Final Pts` / `Rank Pts` → 1 hit, άρα ο έλεγχος όντως έτρεξε σωστά) |

**Ο χρήστης δεν βλέπει τίποτα σε production.** Ο λόγος: το «δες το live» δεν έχει νόημα πριν το deploy.

### 2.5 Το `414 Request-URI Too Large` στο local dev (blocker για τοπικό έλεγχο)

| Στοιχείο | Τιμή |
|---|---|
| Εντολή | `curl "http://localhost:3022/api/events/<documentId>"` |
| Αποτέλεσμα | `414 Request-URI Too Large`, JSON `{"error": "...Apache...414..."}` (το Next route προωθεί το status του upstream) |
| Αιτία | Το `.env.local` έχει `NEXT_PUBLIC_STRAPI_URL=https://app.billiardtoday.com` → το route χτίζει ένα **πολύ μεγάλο URL** (Strapi populate) που περνά nginx → Apache |
| Μετρημένο όριο | 8.000 / 8.150 χαρ. → **403** (περνά στο app) · 8.185 χαρ. και πάνω → **414**. Όριο ≈ **8.190** = το default `LimitRequestLine` του Apache |
| Τι δοκιμάστηκε | `large_client_header_buffers 8 32k` σε `vhost_nginx.conf:56` · `LimitRequestLine 32768` + `LimitRequestFieldSize 32768` σε `vhost.conf:7-8`, `vhost_ssl.conf:7-8` και `/etc/apache2/apache2.conf:233-234` · `nginx -s reload` + `systemctl restart apache2` |
| Αποτέλεσμα | **ΑΚΟΜΑ 414** σε 10.000 / 20.000 / 30.000 χαρ. (τόσο μέσω 443 όσο και απευθείας στο Apache `:7081`) → **δεν λύθηκε** |
| Backups (για revert) | `vhost_nginx.conf.bak-20260927`, `vhost.conf.bak-20260927-162210`, `vhost_ssl.conf.bak-20260927-162210`, `apache2.conf.bak-<timestamp>` (όλα στο `conf/` του `app.billiardtoday.com` / `/etc/apache2/`) |

Συνέπεια: **ο τοπικός dev server δεν μπορεί να φορτώσει σελίδα event** (τα δεδομένα έρχονται από το API route που σκάει στα 414). Η επαλήθευση πρέπει να γίνει αλλιώς (βλ. §3, βήμα 7).

---

## 3. Τι μένει — επόμενα βήματα με σειρά

### Βήμα 0 — ΑΠΟΦΑΣΗ (blocking, μία ερώτηση)
Ποιο σύστημα tier κρατάμε;
- **(Α) seeded / wildcard από seed number** — όπως στο committed `a0c7a04` (`S` / `WC`). Δουλεύει ήδη για `umb_world_cup_3c_v1` και `umb_world_3c_v1`, ταιριάζει με ό,τι βλέπει ο χρήστης στο stage ranking.
- **(Β) A / B / C από rating** — όπως στο `entryBadges.tsx` (thresholds). **Δεν** είναι το ζητημένο feature· θα ήταν ξεχωριστό (κατηγοριοποίηση δυναμικότητας).
- **(Γ) Και τα δύο** — `S`/`WC` + rating tier.

*Σύσταση:* **(Α)**. Είναι το ζητούμενο, είναι ήδη γραμμένο και δοκιμασμένο στη λογική του, και τα tier rules είναι ρητά ανά ruleset. Αν πάμε (Α), το `entryBadges.tsx` **διαγράφεται** και το `entryTier` type αλλάζει σε `"seeded" | "wildcard"`.

### Βήμα 1 — Ενοποίηση τύπων
- `types.ts`: `GroupStanding.entryTier` → `"seeded" | "wildcard" | null` (αν επιλεγεί Α).
- Απόφαση: κρατάμε **μία** πηγή για `EntryStageInfo` / `EntryTier`: ή τα helpers του `TournamentEventsContent.tsx` (υπάρχουν, δουλεύουν) ή το ξεχωριστό module. Αν κρατήσουμε τα υπάρχοντα, τα κάνουμε export από `TournamentEventsContent.tsx` **ή** τα μεταφέρουμε σε δικό τους module και τα δύο αρχεία τα κάνουν import (καθαρότερο — αποφεύγει circular import).

### Βήμα 2 — Γέμισμα δεδομένων στο `buildGroupStandings()`
Επέκταση signature (π.χ. `options` object) ώστε να δέχεται:
- `entryStageByPlayerKey: Map<string, EntryStageInfo>` (από `buildEntryStageByPlayerKey(allStages)`)
- `playerSeedByDocumentId: Map<string, number>`
- `entryTierRule: EntryTierRule | null`

και στο `acc[key] = {...}` να υπολογίζονται:
```ts
playerDocumentId: entry.player.documentId ?? undefined,
entryStage: lookupEntryStage(entryStageByPlayerKey, entry.player),   // ή αντίστοιχο key resolution
entryTier: entryTierFromSeed(playerSeedByDocumentId?.get(entry.player.documentId ?? ""), entryTierRule),
```
⚠️ **Προσοχή:** το `buildGroupStandings` έχει πολλαπλά call sites. Πριν αλλάξεις το signature τρέξε:
```bash
grep -rn "buildGroupStandings" src/
```
Γνωστά: `TournamentEventsContent.tsx` ×2 (≈2188 — υπολογισμός αποτελεσμάτων φάσης, και ≈8575 — κάρτες ομίλων) και `TournamentDetailPage.tsx` (≈1220). Τα νέα options πρέπει να είναι **προαιρετικά** ώστε τα call sites που δεν τα περνούν να μη σπάσουν.

### Βήμα 3 — Ενεργοποίηση στο call site των ομίλων
Στο `TournamentEventsContent.tsx` ≈8575:
```tsx
<GroupStandingsTable
  standings={...}
  showEntryBadges
  ... />
```
(τα δεδομένα θα έρχονται πλέον μέσα από το `standings` array, οπότε δεν χρειάζεται να περάσουμε ξεχωριστά maps).

### Βήμα 4 — Έλεγχος τύπων
```bash
cd /d/Projects/5-billiardtoday-frontend && npx tsc --noEmit
```
(Το project είναι Next 16 — **όχι** `next lint`, μόνο `tsc --noEmit`. Build μόνο αν ζητηθεί.)

### Βήμα 5 — Commit + push
Νέο commit (δεν έχει σχέση με το `a0c7a04`): π.χ.
`feat(events): entry start-stage + seeded/wildcard badges in group standings`
Μαζί: `types.ts`, `utils.ts`, `GroupStandingsTable.tsx`, και **ό,τι αποφασιστεί** για το `entryBadges.tsx` (delete ή χρήση).

### Βήμα 6 — Deploy (manual — ΔΕΝ υπάρχει `bt-sync frontend`)
```bash
# 1. clone: ΔΕΝ έχει upstream — ρητά:
cd /srv/git/billiardtoday/frontend && git fetch origin main && git merge --ff-only origin/main

# 2. copy source → httpdocs (rsync κρατά ownership)
rsync -rc --itemize-changes --chown=billiardtoday_srv:psacln \
  /srv/git/billiardtoday/frontend/src/ \
  /var/www/vhosts/billiardtoday.com/httpdocs/src/

# 3. καθαρό build (σβήνει ISR cache)
rm -rf /var/www/vhosts/billiardtoday.com/httpdocs/.next

# 4. build ως app user (~2-3 λεπτά — background, όχι blocking ssh)
su -s /bin/bash - billiardtoday_srv -c 'cd /var/www/vhosts/billiardtoday.com/httpdocs && npm run build'

# 5. restart
su -s /bin/bash - billiardtoday_srv -c 'pm2 restart billiardtoday-frontend --update-env'
```
⚠️ Το build **πρέπει** να τρέξει στον server (το SSG κάνει fetch από `127.0.0.1:1337`).

### Βήμα 7 — Επαλήθευση (στον server, ΟΧΙ local — λόγω 414)
```bash
curl -s http://127.0.0.1:3022/tournaments/events/<eventSlug> | grep -c 'Started in'
curl -s -L https://billiardtoday.com/tournaments/events/<eventSlug> | grep -o 'Started in' | wc -l
# + έλεγχος compiled chunk:
grep -l 'Started in' /var/www/vhosts/billiardtoday.com/httpdocs/.next/static/chunks/*.js
```
Και **απαραίτητα** ένα συγκεκριμένο παράδειγμα που θα δείξει ο χρήστης: event + όμιλος + όνομα παίκτη + τι badge περιμένει. (Ο χρήστης ζητά πάντα συγκεκριμένο παράδειγμα, όχι «κάποιοι».)

### Βήμα 8 (προαιρετικό) — Λύση/παράκαμψη του 414 για local dev
Επιλογές:
- (α) Στρέψε το local dev **απευθείας** στο Strapi (tunnel/port-forward, ή τοπικό Strapi) ώστε να μη μεσολαβεί ο Apache των 8.190 χαρ.
- (β) Μίκρυνε το query (λιγότερα populate/fields στο `/api/events/<id>` route).
- (γ) Άφησε το local testing και δούλευε/επαληθεύεις στον server.
- (δ) **Revert** τις αλλαγές config στον server (δεν έλυσαν τίποτα): `vhost_nginx.conf.bak-20260927`, `vhost.conf.bak-20260927-162210`, `vhost_ssl.conf.bak-20260927-162210`, `apache2.conf.bak-*`.

---

## 4. Ανοιχτά ερωτήματα / ρίσκα

### Ανοιχτά ερωτήματα
1. **Tier σύστημα:** seeded/wildcard (seed number) ή A/B/C (rating); → blocking για όλα τα υπόλοιπα (βλ. Βήμα 0).
2. **Tier rules για άλλα rulesets:** σήμερα υπάρχουν μόνο για `umb_world_cup_3c_v1` και `umb_world_3c_v1`. Για `ceb_youth_v1`, `ceb_ladies_v1`, `default_v1`, `artistic_ceb_v1` κλπ → **δεν** θα βγαίνει badge tier (σωστά, «δεν ξέρουμε» αντί για λάθος). Χρειάζεται επιβεβαίωση από τον χρήστη αν θέλει rules και για τα υπόλοιπα.
3. **Seeds στα δεδομένα:** το `playerSeedByDocumentId` χτίζεται από `eventData.data.players[].seed`. Πρέπει να επιβεβαιωθεί ότι τα seeds είναι όντως συμπληρωμένα στο Strapi για τα events που μας νοιάζουν (αλλιώς κανένα `S`/`WC`).
4. **Badge φάσης & tooltip:** το `shortEntryStageLabel` παράγει `PQ` / `Q` / `PPQ` / `PPPQ` / `1/16` / `MAIN`. Αυτά τα ονόματα είναι σύμβαση — θέλει επιβεβαίωση ορολογίας.
5. **Ορφανό `entryBadges.tsx`:** διαγραφή ή χρήση; Αν μείνει, κινδυνεύει να μπει σε commit ως dead code.

### Ρίσκα
1. **⚠️ Δύο ασύμβατα συστήματα tier συνυπάρχουν** (`"seeded"|"wildcard"` vs `"A"|"B"|"C"`). Αν μπουν και τα δύο σε ένα commit χωρίς απόφαση, το `tsc` θα σκάσει ή θα μπει λάθος badge.
2. **⚠️ Μη-αποθηκευμένη δουλειά:** οι αλλαγές σε `GroupStandingsTable.tsx` / `types.ts` / `utils.ts` είναι **uncommitted** — ένα `git checkout` / `git stash drop` τις χάνει. Το `entryBadges.tsx` είναι **untracked** (ούτε σε stash δεν πάει χωρίς `-u`).
3. **⚠️ Ο χρήστης δεν βλέπει τίποτα:** δεν έχει γίνει deploy, και το local dev είναι μπλοκαρισμένο από 414. Μέχρι να λυθεί ένα από τα δύο, κάθε αναφορά «έτοιμο» θα είναι λάθος. (Κανόνας: report μόνο μετά deploy, με ζωντανή επαλήθευση.)
4. **Server config edits είναι ζωντανά αλλά άχρηστα:** `large_client_header_buffers` + `LimitRequestLine` 32768 παραμένουν εφαρμοσμένα (nginx reload / apache restart) χωρίς να λύσουν το 414. Αν αφεθούν, είναι ακίνδυνα αλλά είναι *αλλαγές σε production config* χωρίς αποτέλεσμα — καλύτερα revert από τα backups ή τεκμηρίωση ότι μένουν σκόπιμα.
5. **Reverting αλλαγών του `a0c7a04`:** μεμονωμένο commit, revert είναι εύκολο, αλλά προσοχή — το `TournamentEventsContent.tsx` είναι 8.828 γραμμές και τα επόμενα βήματα το αγγίζουν ξανά (πιθανά conflicts).
6. **Κόστος/χρόνος deploy:** το build θέλει ~2-3 λεπτά στον VPS ως `billiardtoday_srv`. Πρέπει να τρέξει background και μετά poll — όχι blocking ssh.
7. **Δίσκος server:** `/` = md2 (460G), `/data` = sdc1 (954G) και γεμίζει — να μη μείνουν παλιά `.next.backup.*` directories.

---

## 5. Γρήγοροι έλεγχοι (copy-paste)

```bash
# Κατάσταση worktree / commit
cd /d/Projects/5-billiardtoday-frontend && git status -sb && git log --oneline -3

# Πού εμφανίζονται τα badges σήμερα
grep -rn "PlayerEntryBadges\|entryTierFromSeed\|ENTRY_TIER_RULES" src/app/tournaments/events/

# Είναι ορφανό το entryBadges.tsx;
grep -rn "entryBadges" src/ || echo "(κανένας importer)"

# Call sites του buildGroupStandings (πριν αλλάξεις signature)
grep -rn "buildGroupStandings" src/

# Call site των ομίλων
grep -n "<GroupStandingsTable" src/app/tournaments/events/TournamentEventsContent.tsx

# Type check
npx tsc --noEmit
```

---

## 6. Χάρτης αρχείων

| Αρχείο | Ρόλος | Κατάσταση |
|---|---|---|
| `src/app/tournaments/events/TournamentEventsContent.tsx` | Η μεγάλη σελίδα event (8.828 γρ.). Περιέχει τα badges helpers + το `StageRankingTable` + το call site των ομίλων | ✅ committed (`a0c7a04`), ❌ χωρίς deploy |
| `src/app/tournaments/events/GroupStandingsTable.tsx` | Ο mini πίνακας κατάταξης κάθε ομίλου (κάρτες ομίλων) | 🟡 uncommitted (+57), rendering έτοιμο αλλά **ανενεργό** |
| `src/app/tournaments/events/types.ts` | `GroupStanding` type | 🟡 uncommitted (+6) |
| `src/app/tournaments/events/utils.ts` | `buildGroupStandings()` | 🟡 uncommitted (+1, μόνο `playerDocumentId`) |
| `src/app/tournaments/events/entryBadges.tsx` | Εναλλακτικό σύστημα tier (A/B/C από rating) | 🟠 untracked & **ορφανό** — απόφαση εκκρεμεί |
| `docs/ai/06-server-sync.md`, skill `billiardtoday-ops` → `references/frontend-build-and-deploy.md` | Διαδικασία deploy | αναφορά |

---

## 7. Άμεση επόμενη ενέργεια (αυτό που περιμένει απάντηση)

**Ερώτηση στον χρήστη:** seeded/wildcard (Α) ή A/B/C (Β) ή και τα δύο (Γ);
Με την απάντηση, εκτελούνται τα Βήματα 1→5 σερί, μετά deploy (Βήμα 6) και επαλήθευση (Βήμα 7) — χωρίς νέες ερωτήσεις ενδιάμεσα.

**(Α)** → διαγράφεται το `entryBadges.tsx`, `entryTier` = `"seeded" | "wildcard"`, γεμίζουν τα δύο πεδία στο `buildGroupStandings`, ανάβει το `showEntryBadges` στο call site.

---

## 8. STATUS — ΟΛΟΚΛΗΡΩΘΗΚΕ & LIVE (2026-09-28)

Επιλέχθηκε το **(Α)**. Τα Βήματα 1→7 εκτελέστηκαν και είναι **deployed στο billiardtoday.com**.

**Commits (branch `main`, όλα pushed):**

| SHA | Τι |
|---|---|
| `d0ddb52` | feature: entry start-stage + seeded/wildcard badges στους ομίλους |
| `5a8fadc` | style: badges δεξιά του ονόματος, έντονα χρώματα, hover popup |
| `2ec35ee` | style: το tooltip υιοθετεί το υπάρχον σκούρο κουτί του site |
| `9194237` | fix: εφαρμογή των κανόνων του πλάνου (§line 17 + line 20) |

**Αρχεία (τελική κατάσταση):** `entryHelpers.ts` (καθαρό TS, χωρίς React), `EntryBadges.tsx` (client, badges + tooltip), `GroupStandingsTable.tsx`, `TournamentEventsContent.tsx`, `types.ts`, `utils.ts`. Το `entryBadges.tsx` διαγράφηκε.

**Κανόνες που ισχύουν τώρα:**
- Label badge φάσης = σκέτος κωδικός φάσης (`PPPQ`, `Q`, `1/16`) — **χωρίς** πρόθεμα σειράς φάσης.
- Το badge φάσης έναρξης κρύβεται όταν ο χρήστης βλέπει την ίδια φάση (§line 20), τόσο στο RANKING όσο και στους ομίλους.
- Tooltip: `Started from <stage title>`, `Seeded player — qualified directly by ranking`, `Wildcard — invited entry, not seeded`.
- Το tooltip χρησιμοποιεί `position: fixed` ώστε να μην κόβεται από το `overflow-x-auto` του πίνακα.

**Deploy:** rsync στο docroot → `npm run build` → `pm2 restart billiardtoday-frontend`.

**Επαλήθευση (live DOM, Lier 2026):** όμιλος 1/16 MAIN — `CHO Myung Woo` = `S`, `THAI Hong Chiem` = `WC`, `CHA Myeong Jong` / `UYMAZ Birol` = `Q`, όλα δεξιά στοιχισμένα· όμιλος PPPQ = κανένα badge· tooltips επιβεβαιωμένα.