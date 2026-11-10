# Έλεγχος στήλης A (Ευρωπαϊκό Πρωτάθλημα, Antalya 2026) — πλήρες audit

- **Ημερομηνία ελέγχου:** 2026-10-07
- **Αντικείμενο:** `public/data/ceb-ranking/3c-individual.json` (repo `4-billiardtoday-frontend`) — **στήλη A** = `ev[0]` = Ευρωπαϊκό Πρωτάθλημα 3-Cushion Individual, Antalya TR, 15/03/2026 (edition `16-2026`, `"ours": true`).
- **Ζητούμενο:** έλεγχος ΟΛΗΣ της στήλης A έναντι των **δικών μας** αποτελεσμάτων· εντοπισμός τυχόν άλλων λάθος αντιστοιχισμένων πόντων πέραν των Weiss.
- **Λειτουργία:** μόνο ανάγνωση (τοπικά + production SELECT). Καμία εγγραφή, κανένα commit/push/deploy.

---

## 1. Απάντηση στο «δικό μας λάθος ή της CEB;»

**Το λάθος ξεκίνησε από τη λίστα της CEB — τα ΔΙΚΑ ΜΑΣ αρχικά αποτελέσματα ήταν σωστά.**

Αλυσίδα τεκμηρίων:

| Στάδιο | Θέση 44 | Θέση 50 | Πηγή |
|---|---|---|---|
| **ΔΙΚΟ ΜΑΣ αρχικό** (dump παραγωγής 05/2026) | **WEISS Alexander** (bt_player **3164**, AT) | **PINTO Luis** (bt_player **2311**, PT) | `billiard_pg_production.sql.gz` |
| Λίστα CEB (στήλη A) | WEISS Adrian (SE, #297) = 4 | Pinto Vítor (PT, #325) = 4 | `3c-individual.json` |
| **ΔΙΚΟ ΜΑΣ σήμερα** (production, 07/10/2026) | **WEISS Adrian** (bt_player **5124**, SE) | **Pinto Vítor** (bt_player **3539**, PT) | production Postgres, event 320 |

Δηλαδή: η δική μας τελική κατάταξη στο Ευρωπαϊκό είχε **σωστά** τον `WEISS Alexander` και τον `PINTO Luis` στις θέσεις των 4 πόντων. Αργότερα **αντιγράψαμε τη λανθασμένη λίστα της CEB** στα δικά μας αποτελέσματα — μέσω του script `scripts/fix-ec-2026-links.js` (commit `005e6d8`, **2026-10-07 01:57**, μήνυμα «…διορθώσεις παραγωγής»), του οποίου ο ρητός σκοπός ήταν «οι πόντοι της στήλης A να συμφωνούν με την **επίσημη λίστα CEB 16/2026**». Το σχόλιο του script γράφει κατά λέξη: `WEISS Adrian SE = 4 ← γραμμή EC θέση 44 (στην παραγωγή: WEISS Alexander)` και `PINTO Vitor PT = 4 ← γραμμή EC θέση 50 (στην παραγωγή: PINTO Luis)`.

**Συμπέρασμα:** το σφάλμα είναι της λίστας της CEB· εμείς το «υιοθετήσαμε» για να ταιριάξουμε με αυτήν, χαλώντας τα σωστά μας δεδομένα.

---

## 2. Πηγές που ελέγχθηκαν

- **Production Postgres** `138.201.29.162` (SSH, **μόνο SELECT**): event `bt_event` id **320** = European Championship 2026 Antalya. Πίνακες `bt_results_final` + link tables `bt_results_final_event_lnk`, `bt_results_final_player_lnk` + `bt_players`. 62 τελικές γραμμές· **`ranking_points` = NULL σε όλες** → οι πόντοι CEB βγαίνουν από **θέση + κλίμακα**.
- **Τοπική dev DB** `billiard_pg` @ `127.0.0.1:5433` → ίδια 62 γραμμές (parity με production).
- **Dump παραγωγής 05/2026** `1-billiards-strapi/.tmp/billiard_pg_production.sql.gz` → η **προ-fix** κατάσταση (αρχικά links).
- **Λίστα CEB** `public/data/ceb-ranking/3c-individual.json` (αντίγραφο: `D:/tmp/ceb/colA/3c-individual.snapshot.json`).
- **Script/commit** `1-billiards-strapi/scripts/fix-ec-2026-links.js` @ `005e6d8`.

**Κλίμακα στήλης A** (από θέση): θέση 1→**80**, 2→**54**, 3-4→**38**, 5-8→**26**, 9-16→**16**, 17-32→**8**, 33-62→**4**.
Κατανομή στη λίστα: **80×1, 54×1, 38×2, 26×4, 16×8, 8×16, 4×30** = **62** αθλητές. ✔ (επιβεβαιώνεται ακριβώς)

---

## 3. Πίνακας ελέγχου ΟΛΩΝ των 62 θέσεων — ΔΙΚΟ ΜΑΣ (αρχικό, 05/2026) vs στήλη A

**Αποτέλεσμα: 60/62 ταυτίζονται (τα 6 από αυτά ως παραλλαγή γραφής του ίδιου προσώπου). Μόνο 2 πραγματικές διαφορές: θέσεις 44 και 50.**

| θέση | πόντοι | ΔΙΚΟ ΜΑΣ (αρχικό dump 05/2026) | χώρα | bt_player | στήλη A (CEB list) | εκτίμηση |
|---|---|---|---|---|---|---|
| 1 | 80 | CEULEMANS Peter | BE | 245 | CEULEMANS Peter (BE) | ✔ |
| 2 | 54 | MERCKX Eddy | BE | 216 | MERCKX Eddy (BE) | ✔ |
| 3 | 38 | TASDEMIR Tayfun | TR | 231 | TASDEMIR Tayfun (TR) | ✔ |
| 3 | 38 | HORN Martin | DE | 342 | HORN Martin (DE) | ✔ |
| 5 | 26 | KARAKURT Berkay | TR | 329 | KARAKURT Berkay (TR) | ✔ |
| 6 | 26 | BLOMDAHL Torbjörn | SE | 212 | BLOMDAHL Torbjorn (SE) | ✔ |
| 7 | 26 | JIMENEZ Sergio | ES | 349 | JIMENEZ Sergio (ES) | ✔ |
| 8 | 26 | LEGAZPI Ruben | ES | 438 | LEGAZPI Ruben (ES) | ✔ |
| 9 | 16 | GLENN Hofman | NL | 3168 | HOFMAN Glenn (NL) | ✔ |
| 10 | 16 | BURY Jeremy | FR | 214 | BURY Jeremy (FR) | ✔ |
| 11 | 16 | VAN Etten Sam | NL | 1543 | VAN ETTEN Sam (NL) | ✔ |
| 12 | 16 | DEVOGELAERE Mikael | FR | 1510 | DEVOGELAERE Mikael (FR) | ✔ |
| 13 | 16 | CAUDRON Frederic | BE | 213 | CAUDRON Frederic (BE) | ✔ |
| 14 | 16 | UYMAZ Birol | TR | 369 | UYMAZ Birol (TR) | ✔ |
| 15 | 16 | ΠΟΛΥΧΡΟΝΟΠΟΥΛΟΣ Νικολαος | GR | 142 | POLYCHRONOPOULOS Nikos (GR) | ≈ ίδιο πρόσωπο (γραφή) |
| 16 | 16 | FORTHOMME Roland | BE | 246 | FORTHOMME Roland (BE) | ✔ |
| 17 | 8 | VAN Erp Jean | NL | 2238 | VAN ERP Jean (NL) | ✔ |
| 18 | 8 | DE Bruijn Jean Paul | NL | 240 | DE BRUIJN Jean Paul (NL) | ✔ |
| 19 | 8 | KIRAZ Tolgahan | TR | 538 | KIRAZ Tolgahan (TR) | ✔ |
| 20 | 8 | SAINZ-PARDO Daniel | ES | 2484 | SAINZ-PARDO Daniel (ES) | ✔ |
| 21 | 8 | ANDERSEN Thomas | DK | 1512 | ANDERSEN Thomas (DK) | ✔ |
| 22 | 8 | LOWE Tom | DE | 1509 | LOWE Tom (DE) | ✔ |
| 23 | 8 | KAHOFER Arnim | AT | 1532 | KAHOFER Arnim (AT) | ✔ |
| 24 | 8 | MORALES Marcos | ES | 1589 | MORALES Marcos (ES) | ✔ |
| 25 | 8 | ORAK Turgay | TR | 1541 | ORAK Turgay (TR) | ✔ |
| 26 | 8 | COSTA Rui Manuel | PT | 434 | COSTA Rui Manuel (PT) | ✔ |
| 27 | 8 | NOVAK Radek | CZ | 1560 | NOVAK Radek (CZ) | ✔ |
| 28 | 8 | ΣΕΛΕΒΕΝΤΑΣ Δημητριος | GR | 151 | SELEVENTAS Dimitrios (GR) | ≈ ίδιο πρόσωπο (γραφή) |
| 29 | 8 | EBELING Tommy | DK | 2646 | Ebeling Tommy (DK) | ✔ |
| 30 | 8 | OLSSON Nalle | SE | 597 | OLSSON Nalle (SE) | ✔ |
| 31 | 8 | EGERT Lucas | DE | 2866 | EGERT Lucas (DE) | ✔ |
| 32 | 8 | BEHZAT Cetin | CH | 2194 | BEHZAT Cetin (CH) | ✔ |
| 33 | 4 | ANGUITA Carlos | ES | 544 | ANGUITA Carlos (ES) | ✔ |
| 34 | 4 | IBRAIMOV Amir | DE | 3070 | IBRAIMOV Amir (DE) | ✔ |
| 35 | 4 | KLOMPENHOUWER Therese | NL | 418 | KLOMPENHOUWER Therese (NL) | ✔ |
| 36 | 4 | ΠΑΠΑΚΩΝΣΤΑΝΤΙΝΟΥ Κωνσταντινος | GR | 127 | PAPAKONSTANTINOU Kostas (GR) | ≈ ίδιο πρόσωπο (γραφή) |
| 37 | 4 | OZCAN Yilmaz | TR | 1511 | OZCAN Yilmaz (TR) | ✔ |
| 38 | 4 | SOARES Jose Miguel | PT | 1533 | SOARES Jose Miguel (PT) | ✔ |
| 39 | 4 | CEYLAN Mustafa | TR | 3182 | CEYLAN Mustafa Oguz (TR) | ≈ ίδιο πρόσωπο (γραφή) |
| 40 | 4 | PENNOR David | SE | 1566 | PENNOR David (SE) | ✔ |
| 41 | 4 | HJORT Timo | FI | 2996 | Hjort Timo (FI) | ✔ |
| 42 | 4 | KNUDSEN Brian | DK | 2614 | KNUDSEN Brian (DK) | ✔ |
| 43 | 4 | MAKIK Karl | AT | 406 | MAKIK Karl (AT) | ✔ |
| **44** | **4** | **WEISS Alexander** | **AT** | **3164** | **WEISS Adrian (SE) = 4** | ❌ **ΔΙΑΦΟΡΑ** |
| 45 | 4 | SEBASTIAN Meling | NO | 2634 | Sebastian MELING (NO) | ✔ |
| 46 | 4 | NAPOLONI Theo | AL | 1618 | NAPOLONI Theo (AL) | ✔ |
| 47 | 4 | KOSTISTANSKY Gerhard | AT | 1542 | KOSTISTANSKY Gerhard (AT) | ✔ |
| 48 | 4 | ΤΣΟΚΑΝΤΑΣ Διονυσης | GR | 2426 | TSOKANTAS Dionisis (GR) | ≈ ίδιο πρόσωπο (γραφή) |
| 49 | 4 | BOUERDICK Tobias | DE | 1570 | BOUERDICK Tobias (DE) | ✔ |
| **50** | **4** | **PINTO Luis** | **PT** | **2311** | **Pinto Vítor (PT) = 4** | ❌ **ΔΙΑΦΟΡΑ** |
| 51 | 4 | JORISSEN Jeffrey | NL | 1540 | JORISSEN Jeffrey (NL) | ✔ |
| 52 | 4 | LEGAZPI Adrian | ES | 3162 | LEGAZPI Adrian (ES) | ✔ |
| 53 | 4 | BOHAC Martin | CZ | 347 | BOHAC Martin (CZ) | ✔ |
| 54 | 4 | VARGA Peter | HU | 2186 | VARGA Peter (HU) | ✔ |
| 55 | 4 | SØRENSEN Charlotte | DK | 2530 | SOERENSEN Charlotte (DK) | ≈ ίδιο πρόσωπο (γραφή) |
| 56 | 4 | CANTURK Kenan | CH | 1514 | CANTURK Kenan (CH) | ✔ |
| 57 | 4 | TEMPELERS Bryan | LU | 3163 | TEMPELERS Bryan (LU) | ✔ |
| 58 | 4 | ALIEVSKI Ratcha | SE | 3010 | Alievski Ratcha (SE) | ✔ |
| 59 | 4 | STEINER Gábor | HU | 3006 | Steiner Gábor (HU) | ✔ |
| 60 | 4 | BJØRNSTAD Jo | NO | 3008 | Bjørnstad Jo (NO) | ✔ |
| 61 | 4 | AHOLA Jarno | FI | 2735 | Ahola Jarno (FI) | ✔ |
| 62 | 4 | PALLUCCA Carlo | LU | 3178 | Pallucca Carlo (LU) | ✔ |

> Σημείωση: οι 6 «≈» είναι το ίδιο πρόσωπο με διαφορετική γραφή (ελληνικά↔λατινικά: ΠΟΛΥΧΡΟΝΟΠΟΥΛΟΣ/SELEVENTAS/ΠΑΠΑΚΩΝΣΤΑΝΤΙΝΟΥ/ΤΣΟΚΑΝΤΑΣ, `CEYLAN Mustafa`↔`Mustafa Oguz`, `SØRENSEN`↔`SOERENSEN`). Δεν είναι λάθη αντιστοίχισης.

**Καμία άλλη λάθος αντιστοίχιση πόντων πέραν των θέσεων 44 (Weiss) και 50 (Pinto).**

---

## 4. Εσωτερικός έλεγχος «σύγχυσης επωνύμου» (όλα τα υποψήφια ζεύγη)

Όλα τα επώνυμα που εμφανίζονται **2+ φορές** στη λίστα και έχουν **ασύμμετρη** στήλη A (ο ένας έχει πόντο, ο άλλος όχι):

🔴 = ο κάτοχος της στήλης A κρατά την **ελάχιστη βαθμίδα (4)** — το πιο ύποπτο μοτίβο · 🟠 = κάτοχος με 8+ · ⚪ = χωρίς πόντο στήλης A.

| επώνυμο | αθλητής | #θέση | ομ/δία | σύνολο | στήλη A (ev[0]) |
|---|---|---|---|---|---|
| **ANDERSEN** | ANDERSEN Thomas | 50 | DK | 29 | 🟠 8 |
|  | ANDERSEN Velle | 406 | NO | 4 | ⚪ — |
| **CEULEMANS** | CEULEMANS Peter | 2 | BE | 157 | 🟠 80 |
|  | CEULEMANS Kurt | 133 | BE | 13 | ⚪ — |
| **COSTA** | COSTA Rui Manuel | 30 | PT | 43 | 🟠 8 |
|  | COSTA Jorge | 470 | PT | 2 | ⚪ — |
| **IBRAIMOV** | IBRAIMOV Amir | 40 | DE | 35 | 🔴 4 |
|  | IBRAIMOV Bajram | 112 | DE | 15 | ⚪ — |
|  | IBRAIMOV Ali | 216 | DE | 8 | ⚪ — |
| **JIMENEZ** | JIMENEZ Sergio | 14 | ES | 72 | 🟠 26 |
|  | JIMENEZ Jesus | 589 | ES | 0 | ⚪ — |
| **KARAKURT** | KARAKURT Berkay | 7 | TR | 115 | 🟠 26 |
|  | KARAKURT Omer | 47 | TR | 30 | ⚪ — |
| **KNUDSEN** | KNUDSEN Brian | 46 | DK | 31 | 🔴 4 |
|  | KNUDSEN Thomas | 34 | DK | 40 | ⚪ — |
|  | KNUDSEN Thomas Thorhauge | 662 | DK | 0 | ⚪ — |
| **MORALES** | MORALES Marcos | 60 | ES | 26 | 🟠 8 |
|  | MORALES Robinson / Javier Jesus / Jose Maria | 647/842/1246 | ES | 0 | ⚪ — |
| **OZCAN** | OZCAN Yilmaz | 67 | TR | 23 | 🔴 4 |
|  | OZCAN Gazi | 231 | NO | 8 | ⚪ — |
| **PINTO** | Pinto Vítor | 325 | PT | 6 | 🔴 4 ← **ΛΑΘΟΣ** |
|  | Pinto Luis | 45 | PT | 31 | ⚪ — (σωστός κάτοχος) |
|  | PINTO Ricardo | 1076 | PT | 0 | ⚪ — |
| **SELEVENTAS** | SELEVENTAS Dimitrios | 16 | GR | 66 | 🟠 8 |
|  | SELEVENTAS Charis | 494 | GR | 0 | ⚪ — |
| **TASDEMIR** | TASDEMIR Tayfun | 10 | TR | 93 | 🟠 38 |
|  | TASDEMIR Baris | 1409 | TR | 0 | ⚪ — |
| **TSOKANTAS** | TSOKANTAS Dionisis | 110 | GR | 16 | 🔴 4 |
|  | TSOKANTAS Georgios | 327 | GR | 6 | ⚪ — |
| **WEISS** | WEISS Adrian | 297 | SE | 8 | 🔴 4 ← **ΛΑΘΟΣ** |
|  | WEISS Alexander | 26 | AT | 46 | ⚪ — (σωστός κάτοχος) |

**Ερμηνεία:** το μοτίβο «ίδιο επώνυμο, ο ένας έχει 4 = ο άλλος 0» εμφανίζεται σε **14 επώνυμο-ομάδες**, αλλά **μόνο σε WEISS και PINTO** αποδεικνύεται πραγματική ανταλλαγή προσώπου — διότι αυτές είναι οι **μοναδικές** θέσεις όπου το ΔΙΚΟ ΜΑΣ αρχικό αποτέλεσμα διαφέρει από τη λίστα CEB (βλ. §3). Στις υπόλοιπες 12 ομάδες ο «άλλος» επώνυμος απλώς **δεν αγωνίστηκε** στο συγκεκριμένο Ευρωπαϊκό (σύμπτωση επωνύμου), οπότε δεν υπάρχει σύγχυση.

---

## 5. Συμπεράσματα

1. **Μόνο 2 λάθος αντιστοιχίσεις** σε ολόκληρη τη στήλη A: θέση **44** (WEISS) και θέση **50** (PINTO) — ακριβώς ό,τι εντόπισε η CEB.
2. **Δεν βρέθηκαν άλλοι** λάθος αντιστοιχισμένοι πόντοι: και οι 62 θέσεις ελέγχθηκαν έναν-προς-έναν.
3. **Η προέλευση είναι η λίστα της CEB.** Τα ΔΙΚΑ ΜΑΣ αρχικά αποτελέσματα (dump 05/2026) είχαν τους **σωστούς** αθλητές στις θέσεις 44/50 (`WEISS Alexander` #3164, `PINTO Luis` #2311). Στις **07/10/2026** τα ξανα-συνδέσαμε στους λάθος αθλητές (`WEISS Adrian` #5124, `Pinto Vítor` #3539) μέσω `scripts/fix-ec-2026-links.js`, για να «ταιριάξουμε» με την (λανθασμένη) επίσημη λίστα CEB.
4. Σήμερα **production** (event 320) και **λίστα** (`3c-individual.json`) είναι συνεπή μεταξύ τους — αλλά **και τα δύο λανθασμένα** ως προς τους δύο αθλητές.
5. Συνέπεια κλίμακας/κατανομής: απόλυτα σωστή (62 κάτοχοι, 80×1/54×1/38×2/26×4/16×8/8×16/4×30). Το πρόβλημα είναι **καθαρά θέμα ταυτοποίησης προσώπου**, όχι θέσης/πόντων.

---

## 6. Πρόταση επόμενου βήματος

1. **Επαναφορά σωστών links στην παραγωγή** (event 320): θέση 44 → `bt_player` **3164** (WEISS Alexander, AT), θέση 50 → `bt_player` **2311** (PINTO Luis, PT). Τα σωστά ζεύγη υπάρχουν στο dump `05/2026` (`bt_results_final_player_lnk`) — χρήση ως πηγή επαναφοράς. (Η θέση 9 → HOFMAN #3168 είναι ήδη σωστή.)
2. **Διόρθωση λίστας/παραγώγου:** `public/data/ceb-ranking/3c-individual.json` (στήλη A) και `computed-3c-individual.json` — μεταφορά των 4 πόντων από `WEISS Adrian`→`WEISS Alexander` και `Pinto Vítor`→`Pinto Luis`, και rebuild.
3. **Guard για το μέλλον:** για editions με `"ours": true`, η στήλη A να παράγεται **από τα δικά μας αποτελέσματα**, **ποτέ** με «ευθυγράμμιση» προς δημοσιευμένη λίστα CEB (όπως έκανε το `fix-ec-2026-links.js`). Κατάργηση/απενεργοποίηση της λογικής ευθυγράμμισης.
4. **Ενημέρωση CEB** με τα στοιχεία (§3/§6.1) ώστε να διορθώσει τη λίστα της.

---
_Τα προσωρινά αρχεία ελέγχου (αντίγραφα, exports, dump-analysis) βρίσκονται στο `D:/tmp/ceb/colA/`. Καμία αλλαγή σε αρχεία δεδομένων ή στη βάση._
