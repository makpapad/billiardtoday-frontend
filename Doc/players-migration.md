# Players Pages Migration – Summary

## Τι υλοποιήθηκε

- **Players list (`/players`)**
  - Χρήση admin API route: `GET /api/admin/tournament/players` (Strapi `bt-players`).
  - Επιστροφή βασικών πεδίων: `full_name`, `country`, `city`, `photo_main`.
  - Προστέθηκε helper `getPhotoUrl` για Strapi V4 image structures.
  - Προστέθηκαν country flags μέσω `getCountryFlagPath` και `public/img/countries/*`.
  - Navigation σε profile page με URL μορφής:
    - `/players/{id}-{ΟΝΟΜΑ-ΠΑΙΚΤΗ}` (π.χ. `/players/797-ΠΑΠΑΔΟΠΟΥΛΟΣ-Αβραάμ`).

- **Player profile (`/players/[id]`)**
  - Διαβάζει το `id` από το path (μέρος πριν το πρώτο `-`).
  - Κλήσεις backend:
    - `GET /api/admin/tournament/players?filters[id][$eq]={id}` για βασικά στοιχεία παίκτη + `career_stats`.
    - `GET /api/players/{id}/history` για ιστορικό συμμετοχών.
  - Αποθήκευση history σε:
    - `participations` (τρέχον φίλτρο).
    - `allParticipations` (όλο το ιστορικό για charts/H2H/στατιστικά).
  - Υπολογισμός συνολικών στατιστικών (Events, Matches, Wins, Draws, Losses, Win %, AVG, H.R.) dynamic, με βάση:
    - Επιλεγμένο `Game Type`.
    - Επιλεγμένο `Year`.
    - Fallback σε `career_stats` όταν `Game Type = all`.

- **Filters & pagination**
  - Game type dropdown με labels από `getGameTypeLabel` / `GameType` enum.
  - Year dropdown ανά game type (`filteredAvailableYears`).
  - Frontend pagination:
    - `yearsToShow` για φόρτωση περισσότερων ετών.
    - `tournamentsToShow` για περισσότερα τουρνουά ανά έτος.

- **Head-to-Head (H2H)**
  - Opponent autocomplete:
    - Βάσει `baseParticipationsForH2H` (filtered participations για τα τρέχοντα φίλτρα).
    - Search input `Head-to-Head: Search Opponent` με keyboard navigation.
  - H2H summary cards:
    - Matches, Wins, Losses, Win %, AVG, H.R.
  - H2H matches list:
    - Χρωματισμός WIN/DRAW/LOSS.
    - Δεξιά: Score, Innings, AVG, H.R., Tournament • Year.
    - Κουμπί `View details` που ανοίγει το match modal (`setSelectedMatch`).

- **Performance chart (Recharts)**
  - Imports από `recharts` και dependency στο `package.json`.
  - Chart `Performance Over Time`:
    - X axis: `year`.
    - Lines: `avg` (AVG per inning), `winPct` (Win %), `wins` (Wins ανά έτος).
    - Δεδομένα από `allParticipations` φιλτραρισμένα στο επιλεγμένο game type.

- **Match details modal**
  - Ανοίγει από:
    - Βασικό ιστορικό (`View details` σε κάθε match).
    - H2H matches list (`View details`).
  - Εμφανίζει:
    - Score, AVG ανά παίκτη, Innings, High Run.
    - Stage, ημερομηνία, opponent με link στο profile (αν υπάρχει `opponentId`).

- **Tournament history list**
  - Κάρτες ανά participation με:
    - Τίτλο τουρνουά, Year, Position.
    - Αγώνες, Wins, Losses, AVG, H.R.
  - Λίστα αγώνων με νέο layout:
    - Αριστερά: WIN/LOSS/ΙΣΟΠΑΛΙΑ badge, Stage, Date, Opponent (link αν έχει `opponentId`).
    - Δεξιά: Score, Innings, AVG, H.R., Tournament • Year, link `View details`.

## Helpers & Assets

- **`src/lib/countryFlags.ts`**
  - `getCountryFlagPath(countryName)` → path τύπου `/img/countries/GR.png`.
  - Υποστηρίζει aliases/παραλλαγές ονομάτων χωρών.
- **`src/constants/countries.constant.ts`**
  - Πλήρης λίστα χωρών + aliases (copied από admin).
- **`src/lib/gameTypes.ts`**
  - `GameType` enum.
  - `getGameTypeLabel`, `getGameTypeOptions`.
- **`public/img/countries/*`**
  - PNG flags για όλες τις χώρες.

## URL & Routing

- Λίστα παικτών → profile:
  - Path: `/players/{id}-{ΟΝΟΜΑ-ΠΑΙΚΤΗ}`.
  - Δεν χρησιμοποιείται πλέον `documentId` στο URL.
- Profile page:
  - Αναλύει `params.id` → `playerId = id` (πριν το πρώτο `-`).
  - Όλα τα API calls (player info + history) δουλεύουν με Strapi `id`.

## Εκκρεμότητες / Επόμενα βήματα

- Προσθήκη global search bar στο πάνω μέρος του profile (όπως στο admin) για γρήγορη αλλαγή παίκτη.
- Sticky header για τα overall stats (header + φίλτρα να μένουν ορατά στο scroll).
- Βελτίωση performance σε μεγάλα histories (ίσως server-side pagination / caching).
- Ενοποίηση UI κειμένων (οριστική επιλογή ανάμεσα σε ελληνικά vs αγγλικά labels).
