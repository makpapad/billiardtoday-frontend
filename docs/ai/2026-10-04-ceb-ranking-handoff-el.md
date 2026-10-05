# CEB ranking — κατάσταση & συνέχεια (04/10/2026)

Παραδοτέο για συνέχεια από **άλλο υπολογιστή**. Ό,τι χρειάζεται είναι μέσα στο repo (έχει γίνει push
στο `origin` = GitHub `makpapad/billiardtoday-frontend`). Η συνομιλία του Hermes **δεν** ταξιδεύει
ανάμεσα στα PC — αυτό το αρχείο είναι η μνήμη της δουλειάς.

---

## 1. Τι είναι ζωντανό τώρα (production)

| Commit | Τι άλλαξε | Πού φαίνεται |
|---|---|---|
| `4876248` | Κείμενο: «The points are reported by the national federations and directly to CEB.» (αντί του παλιού «…entered from the official CEB list — we do not recalculate them»). Διαγράφηκε η πρόταση «A negative cell (a deduction) takes no part in that comparison.» | `/rankings/ceb/3c-individual` → ενότητα *How this list is built* |
| `ecbfa9b` | Το πλακίδιο του λογότυπου CEB πήρε **ίδιο χρώμα** με τα meta πλακίδια (βλ. Παγίδα 2) | `3c-individual`, hero |
| `48a4344` | **Σκούρο header** στον πίνακα της κατάταξης + **εναλλάξ δύο χρώματα** στις γραμμές | `3c-individual` → Standings |
| `8882134` | Οι δύο αποχρώσεις έγιναν **μπλε**: `bg-blue-50` / `bg-blue-100`, hover `bg-sky-200/60` | `3c-individual` → Standings |
| `bcf9a41` | Στη σελίδα `/rankings/ceb`: διαγράφηκε η φράση «Only tournaments held in Europe count towards the CEB lists» και **προστέθηκε το λογότυπο CEB** πάνω από τα meta πλακίδια (ίδιο πλακίδιο με τη σελίδα 3c-individual) | `/rankings/ceb` hero |

Όλα ελέγχθηκαν **στο live** με `curl` (η λίστα είναι server-rendered, οπότε οι κλάσεις και τα κείμενα
φαίνονται στο HTML) — όχι μόνο με `tsc`.

## 2. Τι μένει: τα εθνικά πρωταθλήματα (στήλες B–D)

Σήμερα οι στήλες B/C/D της κατάταξης μπαίνουν **χειροκίνητα** και για τις 23 ομοσπονδίες δεν έχουμε
ακόμη δεδομένα. Στο `docs/ai/ceb-ranking/national/` υπάρχουν **6 αρχεία** που έστειλαν 5 ομοσπονδίες
(Δανία ×2, Ισπανία, Ελλάδα, Νορβηγία, Γαλλία) — και είναι **5 διαφορετικές διατάξεις**:

| Ομοσπονδία | Αρχείο | Δομή | Προβλήματα |
|---|---|---|---|
| Δανία (Άνδρες) | `Danish Championship 2026 3-Cushion (Mens).xlsx` | κεφαλίδα γραμμή 5: `Rank: / Name: / … / Player ID` | 17/24 IDs με μηδενικό μπροστά (`0273`) |
| Δανία (Γυναίκες) | `Danish Championship 2026 3-Cushion (Ladies).xlsx` | ίδια | 4η γραμμή = «Cancellation», όχι όνομα |
| Ισπανία | `General Classification National Championship Ladies 3 Cushions June 2026.xlsx` | κεφαλίδα γραμμή **14**: `# / ID / NOMBRE / FED / CAR. / ENT. / PROM.` | ισοβαθμίες, 2 IDs = `0000` |
| Ελλάδα | `Greece national 3C.xlsx` | μπλοκ ανά κατηγορία (`3C LADIES`, μετά `3C U21`…) 3 στήλες | 1 ID = `0000` |
| Νορβηγία | `UMB Ranking Points 2026 Norway.xlsx` | κεφαλίδα γραμμή 1: `Rank / SURNAME Name / UMB Player ID` | ισοβαθμίες (3,3,7,7), **9/25 IDs = `0`** |
| Γαλλία | `Résultats 2025-2026 pour CEB.xls` | **4 φύλλα**, ενότητες με επαναλαμβανόμενη κεφαλίδα, θέση ως `1.0`, ονόματα ΚΕΦΑΛΑΙΑ | **καμία στήλη UMB ID** |

**Χρειαζόμαστε 3 πράγματα ανά παίκτη: θέση, όνομα, UMB ID.** Τίποτε άλλο (πόντοι, μέσοι όροι, κλαμπ,
ημερομηνία γέννησης) δεν χρησιμοποιείται στη βαθμολογία.

### Απόφαση (04/10/2026): φόρμα εισαγωγής με paste, όχι parsers ανά ομοσπονδία

Αιτιολόγηση: 23 ομοσπονδίες × 3 σεζόν = μέχρι **69 διατάξεις** που αλλάζουν κάθε χρόνο, ενώ το
περιεχόμενο είναι 3 πεδία. Μία φόρμα με ένα σταθερό format μειώνει τη δουλειά σε «paste» ανά ομοσπονδία.

Προδιαγραφές (συμφωνημένες σε επίπεδο σχεδίου, **δεν έχει γραφτεί κώδικας**):

1. Τοπική σελίδα HTML (ανοίγει με διπλό κλικ, χωρίς server) — θέση: `docs/ai/ceb-ranking/national/tool/`.
2. **Ένα κουτί paste**, ένας παίκτης ανά γραμμή: `θέση<κενό/tab>όνομα<κενό/tab>UMB ID` (ανεκτικό σε
   `1.`, κόμμα, ΚΕΦΑΛΑΙΑ, tab από Excel).
3. **Ζωντανός πίνακας** από κάτω + σημάνσεις για: ID `0`/`0000` (δεν το ξέρει η ομοσπονδία), ισοβαθμία,
   ID που δεν υπάρχει στη βάση μας, γραμμές τύπου «Cancellation».
4. Κουμπί **«Κατέβασε JSON»** → το κομμάτι που τροφοδοτεί το `build_ceb_data.py` (στήλες B/C/D).
5. Έλεγχος αντιστοίχισης με τον master κατάλογο παικτών (UMB ID) — για σύνδεσμο στη σελίδα παίκτη.

Εκτίμηση: **~1,5 ώρα** εργαλείο + έλεγχοι · **~30′** δοκιμή στα 6 υπάρχοντα αρχεία · **~30′** η πρώτη
λίστα (π.χ. Δανία) end-to-end μέχρι το live.

### Ανοιχτές αποφάσεις πριν γραφτεί κώδικας

1. **Go** για το εργαλείο (δεν έχει δοθεί ακόμη).
2. Να πιάνει **μόνο 3-Cushion Άνδρες** στην αρχή, ή και Γυναίκες/άλλες κατηγορίες από την πρώτη έκδοση;
3. Οι ομοσπονδίες χωρίς UMB ID (Γαλλία όλα, Νορβηγία 9/25): αντιστοίχιση με **όνομα** ή χωρίς σύνδεσμο;

## 3. Πώς συνεχίζουμε από άλλο PC

```bash
# 1) κώδικας (όλα είναι pushed στο origin)
cd D:/Projects/5-billiardtoday-frontend      # ή όπου είναι στο άλλο PC
git pull origin main
git status -sb                                # πρέπει: ## main...origin/main, χωρίς ?? docs/ai/ceb-ranking/*

# 2) τοπικό περιβάλλον (το .env.local ΔΕΝ είναι στο git — βλ. .env.example)
npm install
npm run dev                                   # http://localhost:3022

# 3) έλεγχος αλλαγής
curl -s http://localhost:3022/rankings/ceb/3c-individual | grep -c "bg-blue-100"

# 4) deploy στο production (ίδιο με πριν)
git push origin main
ssh -i D:/.ssh/billiard_admin_openssh.key root@138.201.29.162 "bt-sync frontend"   # ~2-4′
# μετά: έλεγχος στο live
curl -s https://billiardtoday.com/rankings/ceb/3c-individual | grep -c "bg-blue-100"
```

Σημειώσεις:

- Οι σελίδες έχουν `revalidate = 300`, αλλά το `bt-sync frontend` κάνει νέο build → η αλλαγή φαίνεται
  αμέσως μετά το restart του PM2 (`billiardtoday-frontend`).
- Ο τοπικός dev server στο PC όπου έγινε η δουλειά **έμεινε ανοιχτός** στη θύρα 3022 (δεν πειράζει).
- Το `.env.local` (gitignored) θέλει: `NEXT_PUBLIC_STRAPI_URL`, `NEXT_PUBLIC_SITE_URL`,
  `NEXT_PUBLIC_SCOREBOARD_URL`, `NEXT_PUBLIC_ADMIN_URL` — οι προεπιλογές είναι στο `.env.example`.

## 4. Παγίδες που κοστίζουν χρόνο

1. **Ο πίνακας ΔΕΝ είναι client-rendered**: η λίστα (50 γραμμές/σελίδα) βγαίνει στο HTML, οπότε
   `curl` αρκεί για έλεγχο. Τα links των παικτών όμως δεν φαίνονται στο HTML — μέτρησέ τα από το
   `public/data/ceb-ranking/player-links.json`.
2. **Το δικό του `backdrop-blur` σε ένα πλακίδιο αλλάζει το χρώμα του.** Το λογότυπο CEB ήταν
   `bg-slate-950/25` + δικό του `backdrop-blur-sm` πάνω στο `bg-white/10` του γονέα → θόλωνε τη
   διαβάθμιση του hero πριν πέσει από πάνω το χρώμα και έβγαινε **#213b6d**. Λύση: ίδιες ακριβώς
   κλάσεις με τα πλακίδια από κάτω, **χωρίς δικό του blur** (το blur μένει μόνο στον κοινό γονέα).
3. **Το εναλλάξ των γραμμών μετριέται στη σειρά που βλέπεις** (`visible.map((row, rowIndex) => …)`),
   αλλιώς «σπάει» σε κάθε σελίδα/φίλτρο. Οι τιμωρημένοι κρατούν το δικό τους γκρι.
4. **Το slug `world-cup-3-cushion-porto-matosinhos-2026-undefined`** είναι λάθος στο Strapi: το καθαρό
   URL κάνει 308 redirect σε αυτό, άρα ο σύνδεσμος της στήλης I δουλεύει. Μην τον «διορθώσεις».
5. **Μην χρησιμοποιείς browser tool** σε αυτές τις σελίδες: το API payload φτάνει 7,9 MB και το
   page 475 KB → timeout. `curl` + `grep` είναι ο γρήγορος δρόμος.
6. Στα ελληνικά αρχεία/σενάρια: τα Windows γράφουν **CRLF** — όταν κάνεις αντικατάσταση κειμένου σε
   αυτό το repo, δούλεψε με τα πραγματικά line endings (και πάντα `assert count == 1` πριν γράψεις).
