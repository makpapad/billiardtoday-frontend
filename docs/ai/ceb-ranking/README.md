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
