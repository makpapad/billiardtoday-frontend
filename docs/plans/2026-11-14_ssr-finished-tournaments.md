# SSR / cached δεδομένα για τελειωμένα τουρνουά — Πλάνο υλοποίησης

**Repo:** `D:\Projects\5-billiardtoday-frontend`
**Ημερομηνία:** 2026-11-14
**Στόχος:** Όταν ένα τουρνουά έχει τελειώσει, οι συμμετοχές / τελική κατάταξη / όμιλοι να έρχονται από τον server (και cached), χωρίς client `fetch`, χωρίς live σύνδεση.

---

## 1. Τι ισχύει σήμερα (μετρημένο, όχι εκτίμηση)

| Γεγονός | Πού φαίνεται |
|---|---|
| Η σελίδα είναι `dynamic` (όχι ISR) | `src/app/tournaments/[slug]/page.tsx:28` (σχόλιο: το `useSearchParams()` κάνει CSR bailout) |
| Ο server στέλνει μόνο «σκελετό» + SEO block | `page.tsx:159` → `initialEventData={null}` |
| Ο browser ζητά τα δεδομένα μετά το άνοιγμα | `TournamentDetailPage.tsx:2203` → `/event-data/<documentId>` |
| Μέγεθος πλήρους payload (League 2, 311 αγώνες) | **6,40 MB**, από τα οποία **6,35 MB είναι `event_stages` (αγώνες)** |
| Μικρά, σταθερά κομμάτια | `players` 57 KB, `results_final` 78 KB |

**Συμπέρασμα:** δεν στέλνουμε ποτέ ολόκληρο το payload στον HTML. Στέλνουμε τα μικρά (συμμετοχές, τελική κατάταξη) **και την υπολογισμένη κατάταξη ανά φάση** — η κατάταξη υπολογίζεται server-side από τους αγώνες και βγαίνει λίγα KB, ενώ οι αγώνες μένουν όπως τώρα (fetch όταν πατήσεις τη φάση).

**Κριτήριο «τελειωμένο»:** `summary.endDate` στο παρελθόν **ή** `final_standings_published === true`. Και τα δύο υπάρχουν ήδη στο `TournamentEventSummary` (`src/lib/tournaments.ts:5,20`).

---

## 2. Προτεινόμενη αρχιτεκτονική (80/20 — χωρίς route splitting)

1. Νέος server-side loader `loadFinishedEventSnapshot(documentId)` που επιστρέφει **μικρό** αντικείμενο:
   ```ts
   type FinishedEventSnapshot = {
     players: ParticipantRow[];        // όπως τα φτιάχνει σήμερα το component
     resultsFinal: NormalizedFinalResult[];
     stageStandings: Record<stageDocumentId, GroupStanding[]>;  // υπολογισμένα, όχι raw matches
   };
   ```
2. Τα δεδομένα περνούν από `unstable_cache(..., { revalidate: 3600, tags: ['event:'+documentId] })`.
   Έτσι **δεν αγγίζουμε το `useSearchParams()`** (δεν χρειάζεται ISR/route split) — η σελίδα μένει dynamic αλλά χωρίς κλήση στη Strapi ανά επισκέπτη.
3. `TournamentDetailPage` δέχεται νέο prop `initialSnapshot`; όταν υπάρχει:
   - γεμίζει συμμετοχές/τελική κατάταξη/κατατάξεις φάσεων,
   - **δεν** καλεί `/event-data/<id>`,
   - **δεν** ανοίγει websocket (καμία live ενημέρωση),
   - οι αγώνες φορτώνουν με κλικ στη φάση (υπάρχουσα διαδρομή `refreshStageMatches`).
4. On-demand invalidation: όταν ο admin δημοσιεύει/αλλάζει αποτέλεσμα σε τελειωμένο event → `revalidateTag('event:<documentId>')`. Αν δεν προλάβουμε, το 1 ώρας revalidate καλύπτει.

---

## 3. Βήματα (bite-sized)

### Task 1 — Helper «τελειωμένο τουρνουά» + test
- **Create:** `src/lib/eventState.ts`
  ```ts
  export const isEventFinished = (
    input: { endDate?: string | null; finalStandingsPublished?: boolean | null },
    now: Date = new Date(),
  ): boolean => {
    if (input.finalStandingsPublished === true) return true;
    const raw = input.endDate;
    if (!raw) return false;
    const end = new Date(raw);
    if (Number.isNaN(end.getTime())) return false;
    // +1 ημέρα: μια διοργάνωση «τελειώνει» στο τέλος της τελευταίας ημέρας.
    return end.getTime() + 24 * 60 * 60 * 1000 < now.getTime();
  };
  ```
- **Test:** το repo **δεν έχει** test runner (`package.json` scripts: dev/build/start/lint μόνο) → γράφω `scripts/test-event-state.mjs` με `node:assert` και 4 περιπτώσεις (χωρίς ημερομηνία, χθες, αύριο, `final_standings_published`).
- **Run:** `node scripts/test-event-state.mjs` → expected `4/4 ok`. Αν θέλεις μόνιμο runner, ξεχωριστή απόφαση (vitest ≈ 20΄ setup + εξαρτήσεις).
- **Commit:** `feat(events): helper isEventFinished`

### Task 2 — Server loader με cache
- **Create:** `src/lib/finishedEventSnapshot.ts`
  - `loadFinishedEventSnapshot(documentId)`:
    1. Μία κλήση Strapi για το event: `players` (tournament participants — ίδιο query με `getTournamentSeoData`), `results_final`, `event_stages[].{documentId,title,order,is_final,stage_type}`.
    2. Για κάθε φάση: `bt-event-stages/<id>/matches` → `normalizeGroupMatches` → `buildGroupStandings(matches, options)` (υπάρχουσες συναρτήσεις, καμία νέα λογική).
    3. Επιστρέφει `FinishedEventSnapshot` (μέγεθος στόχος < 400 KB).
  - Τυλίγεται σε `unstable_cache` με `revalidate: 3600` και tag `event:<documentId>`.
- **Έλεγχος:** `node -e` script που τυπώνει μέγεθος JSON και πλήθος γραμμών για το League 2 (`cqqccrkdod3l0gctjoqvomjr`).
- **Commit:** `feat(events): server snapshot για τελειωμένα τουρνουά`

### Task 3 — Πέρασμα στον client
- **Modify:** `src/app/tournaments/[slug]/page.tsx`
  ```ts
  const finished = isEventFinished({ endDate: summary.endDate, finalStandingsPublished: summary.finalStandingsPublished });
  const snapshot = finished ? await loadFinishedEventSnapshot(summary.documentId) : null;
  ...
  <TournamentDetailPage initialSnapshot={snapshot} ... />
  ```
- **Modify:** `TournamentDetailPage.tsx`
  - Νέο prop `initialSnapshot`.
  - `useEffect` που καλεί `/event-data` → `if (initialSnapshot) return;`
  - Το websocket hook → `if (initialSnapshot) skip`.
  - `tournamentParticipants` / final results / stage standings → αρχική τιμή από το snapshot.
- **Commit:** `feat(events): τελειωμένο event χωρίς client fetch`

### Task 4 — Invalidation από το admin (προαιρετικό, αν το επιτρέπει το CMS)
- Route `POST /api/revalidate/event` με secret header → `revalidateTag('event:<documentId>')`.
- Κλήση από το admin όταν δημοσιεύεται τελική κατάταξη.
- **Commit:** `feat(api): on-demand revalidate τελειωμένου event`

### Task 5 — Επαλήθευση (υποχρεωτική, πριν πούμε «έτοιμο»)
1. `curl -s -w "%{time_starttransfer}\n" -o /tmp/p.html https://billiardtoday.com/tournaments/league-2-1o-toyrnoya-2025-26-2025` → TTFB πριν/μετά.
2. Στο `/tmp/p.html`: `grep -c "BRELLOS\|Registered players"` → πρέπει >0 (σήμερα 0).
3. Άνοιγμα σε browser: DevTools → Network → **καμία** κλήση `/event-data/...`, κανένα websocket.
4. `grep -c "event-data" /tmp/p.html` → 0.
5. Έλεγχος σε 2 ακόμη τελειωμένα (World Cup Ankara 2026, 2025-26-1) και σε 1 **τρέχον** (πρέπει να συνεχίσει να φορτώνει με fetch + live).

---

## 4. Κόστος

### Χρόνος (μετρημένος ρυθμός, όχι αισιόδοξος)
Κάθε deploy `bt-sync frontend` = **~2,5–3 λεπτά** (npm ci + build + restart, μετρημένο σήμερα 3 φορές).

| Εργασία | Εκτίμηση |
|---|---|
| Task 1 (helper + test) | 10΄ |
| Task 2 (loader + cache + μέτρηση μεγέθους) | 45–60΄ |
| Task 3 (πέρασμα σε client, προσοχή στα 4 σημεία) | 60–90΄ |
| Task 4 (invalidation) | 20–30΄ |
| Task 5 (επαλήθευση σε 4 σελίδες) | 20΄ |
| Deploys (3 × ~3΄) | 10΄ |
| **Σύνολο** | **2,5 – 4 ώρες δικής μου δουλειάς**, σε 1 συνεδρία (με 1–2 διακοπές για build) |

### Χρήματα / υποδομή
| Τι | Κόστος |
|---|---|
| Νέες υπηρεσίες | **0 €** |
| Server (CPU για build) | αμελητέο, ίδιος server 138.201.29.162 |
| Strapi φορτίο | **μειώνεται** (από 1 κλήση 6,4 MB ανά επισκέπτη → 1 ανά ώρα ανά event) |
| Cache/Storage | 0 (in-memory του Next) |

### Ρίσκο
| Ρίσκο | Επίπεδο | Μετριασμός |
|---|---|---|
| Τελειωμένο event να «κολλήσει» σε παλιά δεδομένα | Μέσο | `revalidateTag` από admin + TTL 1 ώρα |
| Λάθος κριτήριο «τελειωμένο» (π.χ. endDate πέρασε αλλά εκκρεμεί αποτέλεσμα) | Μέσο | `final_standings_published` πρώτο κριτήριο· flag `?preview=1` που αναγκάζει client fetch |
| Διπλή λογική κατάταξης (server + client) να δίνει διαφορετικά νούμερα | **Υψηλό αν ξαναγραφτεί** | Χρήση των **ίδιων** `buildGroupStandings`/normalizers, καμία νέα formula |
| Μεγάλο snapshot | Χαμηλό | Στέλνουμε κατάταξη (μικρή), όχι αγώνες· μέτρηση μεγέθους στο Task 2 |

### Τι ΔΕΝ περιλαμβάνεται
- Αλλαγή των live σελίδων (μένουν ως έχουν).
- ISR / route splitting (δεν χρειάζεται με το `unstable_cache`).
- PDF/print view τελικής κατάταξης.

---

## 5. Σειρά με ό,τι είναι ήδη ανοιχτό

1. (σε εξέλιξη, subagent) φωτογραφίες αθλητών στις κατατάξεις.
2. SSR συμμετοχών **μόνο** (μικρό, 30–45΄): περνάμε `players` από το ήδη υπάρχον SEO query → η λίστα φαίνεται με το πρώτο byte, παύει το ψευδές «No participants».
3. Το παρόν πλάνο (Tasks 1–5) — το (2) είναι υποσύνολο του Task 3, άρα δεν πάει χαμένο.
