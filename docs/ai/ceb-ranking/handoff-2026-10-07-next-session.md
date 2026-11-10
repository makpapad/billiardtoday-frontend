# CEB Κατάταξη 3-Cushion — Handoff για το επόμενο session (07/10/2026)

## ΟΛΟΚΛΗΡΩΜΕΝΑ ΣΗΜΕΡΑ (μη τα ξανακάνεις)
- Η λίστα δημοσιεύτηκε ζωντανή και είναι **byte-ίδια** με τη συμφωνημένη V16 του Stefano:
  `https://billiardtoday.com/data/ceb-ranking/3c-individual.json` — sha256 `b31ef34a…`, 196.558 B, **1.467 εγγραφές / 6.989 πόντοι**
  - #22 WEISS Alexander 50 (A:4) · #42 Pinto Luis 35 (A:4) · #23 VAN ERP Jean / #24 BEHZAT Cetin · DANIELSSON Torsten = **DK**
  - Commit frontend: `e1c9491` → deploy `bt-sync frontend` → health 200 (αρχική, σελίδα κατάταξης, JSON)
  - Backup πριν το deploy (rollback): `/root/ceb-list-before-deploy-20261007-144530.json`
- Strapi (engine: source rule + guard STOP + sorter με σειρά προηγούμενης δημοσίευσης): commit **`19c77bc`**, 4 αρχεία, +508/−83, **ανηρτημένο** στο GitHub. Τα `data/ceb-ranking/*` (computed, name-maps, logs) έμειναν τοπικά, άθικτα.
- Διαφορά από το προηγούμενο live: −9 γραμμές / −12 πόντοι (4 ονόματα έφυγαν: GROOT Raymon, REFASSI Badreddine, REFASSI Abdelghani, JOSE Torrisco · 7 διπλοεγγραφές καθάρισαν · OZEN Mohamed, CELIK Sabir πήραν −4).

## ΑΝΟΙΧΤΗ ΑΠΟΦΑΣΗ ΧΡΗΣΤΗ (μόνη εκκρεμότητα από αυτόν)
**26 ονόματα** διαφέρουν από τη γραφή της CEB. Επιλογή: **(α)** ταιριάζω σειρά + κεφαλαία, κρατώ τα σωστά διακριτικά/τυπογραφικά [προτεινόμενο], ή **(β)** byte-ίδια 100% με CEB (μαζί με ASCII και τα διπλά κενά).
Ονόματα/τύπος: #24 CETIN Behzat↔BEHZAT Cetin (σειρά) · #27 MELING Sebastian↔Sebastian MELING (σειρά) · #202 DE KOK Joey↔**Kok de Joey** (σειρά, λάθος μας) · #491 Dominique JANVIER↔DOMINIQUE Janvier (σειρά) · #65 Truong Tay Dien↔TRUONG Tay Dien (σειρά+κεφαλαία) · #28/42/71/73/111/116/185/193/203/435 κεφαλαία επωνύμου (AHOLA/PINTO/HJORT/PALLUCCA/EBELING/DEMMING/ALIEVSKI/VAN HEES/BACK/IDE έναντι Ahola/Pinto/Hjort/Pallucca/Ebeling/Demming/Alievski/Van Hees/Back/Ide) · #183/445 κεφαλαία+διακριτικά (SANTOS Goncalo↔Santos Gonçalo, ANDALUZ BLAZQUEZ↔ANDALUZ Blazquez) · #114/427/457/469/184 διακριτικά, τα δικά μας σωστά (ÖZCELIK, STEINER Gábor, ÖZBAS, PINTO Vítor, Bjørnstad) · #68/106/886/1267 τυπογραφικά **του CEB** (SAINZ PARDO↔SAINZ-PARDO, D AGATA↔D'AGATA, αόρατο κενό, διπλό κενό).

## ΕΠΟΜΕΝΑ ΒΗΜΑΤΑ — RIG (για να βγαίνει η λίστα μόνη της)
1. **Χαρτογράφηση εθνικών στηλών**: το rig γράφει τους εθνικούς πόντους στη στήλη **B**, η δημοσιευμένη λίστα στη **C** → 8 αθλητές (CETIN, RECH, CANTURK, GRETILLAT, BOULAZ, …). Μία γραμμή στο `build-frontend-ceb-ranking.js`.
2. **Στην πηγή του rig, όχι στο δημοσιευμένο αρχείο** (ίδια κατηγορία με το DK του DANIELSSON):
   - οι 4 πόντοι του Ευρωπαϊκού για WEISS Alexander + PINTO Luis (η διόρθωση 44/50 έγινε στη **dev** βάση, δεν πέρασε στο rig) — 2 αθλητές.
   - `fed=DK` για DANIELSSON Torsten (σήμερα διαβάζεται από `cebRankingEngine.ts:1182` → `en.raw_federation_code AS "fed"`, δηλ. από το imported CEB entry).
3. **Ποινές −4 (suspended) της CEB** να περνούν στο rig — 7 αθλητές (WEISS Adrian, PINTO Vítor, DE KRUIJF Jordy, KABAK Gurhan, GENC Burhan, NAPOLONI Theo, …).

**Dry-run μετά τις διορθώσεις**: `data/ceb-ranking/computed-3c-individual.json` πρέπει να βγάλει **100%** τη δημοσιευμένη λίστα.
Σημερινή μέτρηση (πριν τις διορθώσεις): **470/489 = 96%** ταυτόσημοι αριθμοί· 10 αθλητές δεν υπάρχουν στη λίστα (4 Έλληνες + μη εγγεγραμμένοι: GROOT, REFASSI, CEYLAN · 2 με άλλη γραφή: SØRENSEN/MINAOGLU).

## RUNBOOK ημέρας δημοσίευσης (4 βήματα)
1. Rig: υπολογισμός — δικές μας στήλες **μόνο από τα αποτελέσματά μας**, εθνικά + roster από το αρχείο της CEB (μέχρι να στέλνουν οι ομοσπονδίες μέσω της πύλης).
2. Έλεγχος: διαφορά στα δικά μας → **STOP** + αναφορά (`CebRankingSourceRuleError`, δεν δημοσιεύεται τίποτα).
3. `build-frontend-ceb-ranking.js` → commit → push (μόνο το αρχείο της λίστας).
4. `ssh -i D:/.ssh/billiard_admin_openssh.key root@138.201.29.162 "bt-sync frontend"` → επαλήθευση: `curl` + **sha256 byte-σύγκριση** + 200 στη σελίδα.
**Μετρημένος χρόνος: ~1 μέρα** (δείγμα σημερινό), αν το αρχείο της CEB έρθει σε μορφή σαν το V16.

## ΑΛΛΕΣ ΛΙΣΤΕΣ (14) — αντικείμενο του νέου session
3-Cushion Ladies · 3-Cushion National Teams · 3-Cushion Ladies National Teams · 5-Pins National Teams · Artistic Individual · Artistic National Teams · Cadre 47/2 · Cadre 71/2 · 1-Cushion · Longoni Next Gen U21 3-Cushion (2025/26, 2024/25, 2023/24, 2022/23) · 5-Pins U21 2022/23.
Χρειάζομαι: **ποια κατηγορία** + **το αρχείο της CEB** (PDF/Excel) της αντίστοιχης έκδοσης.

## ΣΤΟΙΧΕΙΑ / ΔΙΑΔΡΟΜΕΣ
- Frontend: `D:/Projects/4-billiardtoday-frontend` — λίστα: `public/data/ceb-ranking/3c-individual.json` · index: `public/data/ceb-ranking/index.json`
- Strapi: `D:/Projects/1-billiards-strapi` — engine: `src/services/cebRankingEngine.ts` · publish: `src/services/cebRankingPublish.ts` · scripts: `scripts/run-ceb-ranking-engine.js`, `scripts/build-frontend-ceb-ranking.js`
- Rig data: `D:/Projects/1-billiards-strapi/data/ceb-ranking/` (computed, player-name-map, merge-log)
- Server: `ssh -i D:/.ssh/billiard_admin_openssh.key root@138.201.29.162` · PM2 φαίνεται ως χρήστης **billiardtoday_srv** · deploy: `bt-sync <target>` (`rsync --delete` — ποτέ αρχεία μέσα στο httpdocs, τα σβήνει)
- Σύμβαση CEB για ονόματα: **ΕΠΩΝΥΜΟ κεφαλαία + Όνομα κανονικά**, χωρίς διακριτικά (ASCII), με 2 ανάποδα (Dominique JANVIER, Truong Tay Dien) και τυπογραφικά λάθη.
