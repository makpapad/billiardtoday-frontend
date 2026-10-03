# CEB 3-Cushion Individual ranking — pipeline & σημειώσεις

Η επίσημη κατάταξη 3-cushion (individual) της CEB, όπως δημοσιεύεται στο BilliardToday
(`/rankings/ceb` → `/rankings/ceb/3c-individual`).

- Πηγή PDF: <https://www.eurobillard.org/medias/rankings/ceb-ranking-2026-v16.pdf> (έκδοση **16/2026**, ενημ. 06/09/2026)
- Σελίδα με όλες τις κατατάξεις CEB: <https://www.eurobillard.org/pages/rankings-42.html>
- Ιστορικό: το παλιό PDF της έκδοσης 06 υπάρχει ήδη στο `docs/ai/` (`ceb-ranking-2026-v06.pdf`).

## Ροή δεδομένων

```
PDF (CEB)                                    docs/ai/ceb-ranking/
  └─ parse_final.py      → ceb16_clean.json   (rank, name, fed, Pnts, στήλες A–J, ημ/νίες)
  └─ verify_rows.py      → έλεγχος 1482/1482  (ανεξάρτητο ξαναδιάβασμα από το words layer)
  └─ build_ceb_data.py   → public/data/ceb-ranking/3c-individual.json  +  index.json
                                        └─ σελίδες: src/app/rankings/ceb/**
```

Εκτέλεση (από αυτόν τον φάκελο):

```bash
uv run --python 3.12 --with "pymupdf==1.24.14" python parse_final.py     # PDF -> ceb16_clean.json
uv run --python 3.12 --with "pymupdf==1.24.14" python verify_rows.py     # ΠΡΕΠΕΙ να βγει 0 problems
uv run --python 3.12 python build_ceb_data.py                            # -> public/data/ceb-ranking/
```

## Κανόνες της κατάταξης (επιβεβαιωμένοι με τον χρήστη)

- **Μόνο Ευρωπαίοι παίκτες** — νικητές World Cup εκτός Ευρώπης δεν παίρνουν πόντους.
  Εξαίρεση που υπάρχει στο επίσημο PDF: ο **LE HOANG Kim (VN, #797, 0 πόντοι)** — 22 ευρωπαϊκές
  ομοσπονδίες + VN. Δεν είναι σφάλμα ανάγνωσης, είναι στο PDF.
- **Μόνο World Cups που έγιναν στην Ευρώπη** + το Ευρωπαϊκό Πρωτάθλημα + τα εθνικά πρωταθλήματα
  (στήλες A–J). Τα εθνικά μπαίνουν **με το χέρι** όπως τα δίνει η CEB.
- Τιμωρημένοι: **φαίνονται** (γκρι γραμμή + σημείωση με ημερομηνία).

### Επιβεβαίωση από τη CEB (03/10/2026)

Ο Stefano Malacrita (CEB) διευκρίνισε τον κανόνα: **6 World Cups + 1 εθνικό πρωτάθλημα + 1 Ευρωπαϊκό = 8
διοργανώσεις** ανά παίκτη. Δηλαδή: μετράνε **μόνο τα 6 νεότερα World Cups** (κάθε νέο αντικαθιστά το
παλιότερο από τα έξι) και **μόνο ένα εθνικό πρωτάθλημα** (όχι και τα τρία).

Τα δεδομένα του PDF το επιβεβαιώνουν (`check_events2.py`): **0** παίκτες με πόντους σε >1 στήλη εθνικού
πρωταθλήματος (B/C/D), μέγιστο **6** στήλες World Cup, μέγιστο σύνολο **8** στήλες, και άθροισμα A..J = Pnts
σε όλες τις 1482 γραμμές. Σε αυτή την έκδοση η στήλη D (26/27) είναι εντελώς κενή.

### Ισοβαθμία (κανόνας CEB, 03/10/2026)

Σε ισοβαθμία η σειρά σύγκρισης (επιβεβαιωμένη με CEB, 03/10/2026): **πρώτα το πιο πρόσφατο CEB World Cup**,
μετά World Cup προς World Cup προς τα πίσω (ως το παλαιότερο), **μετά το εθνικό πρωτάθλημα** και **τελευταίο
το European Championship** — παρότι δίνει τους περισσότερους πόντους. Στo PDF καμία ισοβαθμία δεν κρίθηκε
από τη στήλη A (EC), άρα η σειρά αυτή δεν έρχεται σε αντίθεση με τα δεδομένα.

Έλεγχος στα δεδομένα (`check_ties.py`): από τις **31** ομάδες ισοβαθμίας με πόντους > 0, οι **30** βγαίνουν
στην ίδια σειρά με το PDF όταν η σύγκριση γίνεται με τη σειρά J→A (World Cups → εθνικό → EC) **αγνοώντας τα αρνητικά κελιά**
(ποινές, υπάρχουν σε 9 παίκτες). Αν μετρηθούν και οι ποινές: 29/31. Η μία εξαίρεση είναι η ομάδα των 6
πόντων (**GENC Burhan #320**: 8 σε εθνικό + 2 σε WC + ποινή -4) — μοιάζει εσωτερική επιλογή της CEB.
Οι μεγάλες «τυφλές» ισοβαθμίες (π.χ. 99 παίκτες με 8 πόντους, όλοι με 8 στο εθνικό) δεν κρίνονται από
αποτελέσματα — στο PDF είναι ομαδοποιημένες ανά ομοσπονδία.

### Στοιχεία σελίδας (03/10/2026)

- Κουμπί **«Jump to the list ↓»** στο hero → `#list`· η ενότητα Standings έχει `id="list"` + `scroll-mt-24`
  (το `html { scroll-behavior: smooth }` υπάρχει ήδη στο globals.css).
- **Λογότυπο CEB** (`https://cdn.billiardtoday.com/uploads/CEB_150_fa0cdec244.png`, 150×147) στο πάνω μέρος του
  δεξιού πλαισίου του hero, με το prop `asideHeader` του `PresentationHero` (νέο, προαιρετικό) — όχι δίπλα στα
  κουμπιά, για να μη στριμώχνονται.
- **Εξωτερικά links** → `newTab: true` στο hero action (CEB PDF, πηγή): `target="_blank" rel="noopener noreferrer"`.
  Εσωτερικά links (στήλες τουρνουά, «All CEB rankings») μένουν στην ίδια καρτέλα.

### Πίνακας πόντων (πάνω μέρος του PDF)

| Θέση | 1 | 2 | 3-4 | 5-8 | 9-16 | 17-32 | ** |
|---|---|---|---|---|---|---|---|
| Ευρωπαϊκό Πρωτάθλημα (A) | 80 | 54 | 38 | 26 | 16 | 8 | 4 |
| Εθνικά πρωταθλήματα (B-D) | 40 | 27 | 19 | 13 | 8 | 4 | – |
| World Cups (E-J) | 40 | 27 | 19 | 13 | 8 | 4 | 2 |

Στο PDF, η στενή στήλη δεξιά του πίνακα έχει ετικέτες ανά γραμμή: A=EC, B+C=Prelim.-Round, D=GP,
E+F=Qualif.-Round. Στη σελίδα εξηγούνται: EC = European Championship, GP = τα Q (qualifying rounds) στα
World Cups της UMB, Preliminary/Qualification Round = οι εναρκτήριοι γύροι (διευκρίνιση χρήστη 03/10/2026 —
δεν υπάρχει γραπτή εξήγηση στο PDF).

| Στήλη | Διοργάνωση | Σελίδα στο site |
|---|---|---|
| A | European Championship 3-Cushion Individual, Antalya 15/03/2026 | `/tournaments/european-championship-3-cushion-individual-2026` |
| B/C/D | National Championships 2024/25, 2025/26, 2026/27 | — (χειροκίνητα) |
| E | World Cup Ankara 15/06/2025 | `/tournaments/world-cup-3-cushion-ankara-2025` |
| F | World Cup Porto 05/07/2025 | `/tournaments/world-cup-3-cushion-porto-2025` |
| G | World Cup Antwerp 12/10/2025 | `/tournaments/world-cup-3-cushion-antwerp-2025` |
| H | World Cup Ankara 14/06/2026 | `/tournaments/world-cup-3-cushion-ankara-2026` |
| I | World Cup Porto / Matosinhos 18/07/2026 | `/tournaments/world-cup-3-cushion-porto-matosinhos-2026` |
| J | World Cup Lier 06/09/2026 | `/tournaments/world-cup-3-cushion-lier-2026` |

## Τι έχει επαληθευτεί (03/10/2026)

- 1482 γραμμές, 23 ομοσπονδίες (22 ευρωπαϊκές + VN), 15 τιμωρημένοι, 498 παίκτες με πόντους.
- `verify_rows.py`: **0 διαφορές** σε rank / όνομα / ομοσπονδία / πόντους (ανεξάρτητη ανάγνωση).
- Άθροισμα στηλών A–J = Pnts για κάθε γραμμή (0 mismatches).
- Οι 7 σύνδεσμοι τουρνουά δοκιμάστηκαν ζωντανά στο billiardtoday.com → **HTTP 200**.

## Παγίδες

- **Μη χρησιμοποιείς `pdftotext -layout` για έλεγχο**: οι γραμμές του PDF είναι πολύ κοντά και ο
  text layer κολλάει τη ομοσπονδία/πόντους της διπλανής γραμμής (π.χ. δίνει `NL` στον #797 αντί `VN`).
  Η αλήθεια είναι το **words layer με x-θέσεις** (`pymupdf`, στήλη fed ≈ x 313–328) — δες `probe_rows.py`.
- Το `parse_final.py` διαβάζει τις στήλες A–J από x-θέσεις, όχι σειριακά: πολλά κενά κελιά δεν
  υπάρχουν ως λέξεις, οπότε η σειρά των αριθμών σε μια γραμμή κειμένου ΔΕΝ δίνει τη στήλη.
- Οι τιμωρημένοι έχουν `Pnts = 0` και εμφανίζονται από τη θέση 551 και κάτω.

## Επόμενα

- Οι υπόλοιπες 14 κατατάξεις CEB: η λίστα με τα ονόματα/αρχεία είναι στο `index.json`
  (`upcoming`) και εμφανίζεται στη σελίδα `/rankings/ceb` ως «Coming next».
- Αυτόματη ενημέρωση (cron): με νέα έκδοση PDF αλλάζει το όνομα του αρχείου — χρειάζεται
  έλεγχος της σελίδας `rankings-42.html` για το τρέχον link, μετά τα 3 βήματα παραπάνω.
  Οι σελίδες `revalidate = 300`, οπότε το νέο JSON εμφανίζεται μόνο του σε ≤5 λεπτά.
