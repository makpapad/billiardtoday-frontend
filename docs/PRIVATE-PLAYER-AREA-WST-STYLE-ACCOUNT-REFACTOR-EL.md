# Private Player Area - WST Style Account Refactor

## Στόχος

Να επανασχεδιαστεί το `/account` ώστε να μοιάζει περισσότερο με premium player profile / sports dashboard, εμπνευσμένο από τη δομή της WST player page, αλλά με δεδομένα και ανάγκες του Billiard Today.

Η υπάρχουσα σελίδα δεν αλλάζει άμεσα. Πρώτα δουλεύουμε σε mockup:

```text
/account/mockup
```

Production mockup:

```text
https://billiardtoday.com/account/mockup
```

## Τι Κρατάμε Από Τη Λογική WST

Δεν κάνουμε αντιγραφή UI. Κρατάμε τη λογική:

- μεγάλο hero player profile
- έντονη παρουσία παίκτη
- βασικά career stats αμέσως κάτω από το hero
- season stats με δυνατό visual rhythm
- career history / narrative blocks
- performance timeline
- στατιστικά που διαβάζονται σαν αθλητικό προφίλ, όχι σαν απλό account settings page

## Νέα Δομή Σελίδας

Προτεινόμενη σειρά sections:

```text
1. Hero / Player Identity
2. Career Stats Band
3. Season Stats
4. Training vs Official Comparison
5. Friendly Matches
6. Career History
7. Tournament Snapshot
8. Devices / Account Settings secondary area
```

Το `/account` πρέπει να γίνει πρώτα player dashboard και μετά account management.

## Hero / Player Identity

Περιεχόμενο:

- display name
- nickname / private nickname
- country
- city / club, αν υπάρχει
- official verification status
- photo

Αν υπάρχει φωτογραφία:

```text
Μεγάλη portrait/cutout εικόνα στο hero.
```

Αν δεν υπάρχει:

```text
Fallback με initials ή styled silhouette.
```

Ιδανική φωτογραφία:

```text
portrait image
transparent background ή καθαρό dark background
minimum height 700-900px
```

## Career Stats Band

Πάνω από όλα πρέπει να φαίνονται 5-6 μεγάλα metrics.

Παραδείγματα:

```text
Official Matches
Friendly Matches
Wins
Win Rate
Overall AVG
Highest Run
Best AVG
Trusted Tables
```

Για official player:

```text
official stats from bt_players.career_stats
```

Για unlinked/private account:

```text
friendly stats only
```

## Season Stats

Season selector:

```text
2025/2026
2024/2025
Career
```

Metrics:

```text
Matches
Points Scored
Average
High Run
Best Match AVG
Current Streak
```

### Current Streak

Παράδειγμα:

```text
W3
```

Σημαίνει:

```text
3 συνεχόμενες νίκες στα πιο πρόσφατα παιχνίδια.
```

Κανόνες:

```text
W = win
L = loss
W3 = 3 wins in a row
L2 = 2 losses in a row
```

Στο ελληνικό UI μπορεί να εμφανιστεί ως:

```text
Τρέχον σερί: 3 νίκες
```

ή compact:

```text
Streak: W3
```

## Friendly Matches

Τα friendly matches δεν πρέπει να είναι απλή λίστα chips.

Προτεινόμενη μορφή:

```text
Result badge
Opponent
Score
Date
Venue / club / table
AVG
INN
H.R.
Notes / tags ως expandable details
```

Παράδειγμα row:

```text
W
Opponent: Avraam Papadopoulos
Score: 40-29
AVG: 1.739
INN: 23
H.R.: 11
Athens Arena · Table 1 · 25 Apr 2026
```

Filters:

```text
All
Wins
Losses
Training
Official
Season
```

## Training Vs Official Comparison

Να υπάρχει section που συγκρίνει:

```text
Friendly / training matches
Official tournament matches
```

Με line chart ανά μήνα ή season.

Προτεινόμενα metrics:

```text
AVG
Win %
Highest Run
Matches
Points per match
Consistency
```

Παράδειγμα chart data:

```json
[
  {
    "label": "Jan 2026",
    "trainingAvg": 1.31,
    "officialAvg": 1.14,
    "trainingMatches": 8,
    "officialMatches": 3
  }
]
```

Cards:

```text
Training AVG
Official AVG
Pressure Gap
```

### Pressure Gap

Υπολογισμός:

```text
pressureGap = (officialAvg - trainingAvg) / trainingAvg
```

Παράδειγμα:

```text
trainingAvg = 1.51
officialAvg = 1.36
pressureGap = -10%
```

## Automated Insights

Κείμενα όπως:

```text
Official average is still lower than training average, but the gap is shrinking over the last three months.
```

μπορούν να είναι αυτοματοποιημένα.

Δεν χρειάζεται ελεύθερο AI στην πρώτη φάση. Προτιμάμε deterministic rule-based generator.

### Insight Inputs

```text
latest training AVG
latest official AVG
previous training AVG
previous official AVG
current pressure gap
previous pressure gap
official match count
training match count
trend direction
```

### Example Rules

```ts
if (notEnoughOfficialMatches) {
  return "More official matches are needed before comparing pressure performance reliably.";
}

if (officialAvg < trainingAvg && gapIsShrinking) {
  return "Official average is still lower than training average, but the gap is shrinking over the last three months.";
}

if (officialAvg < trainingAvg && gapIsGrowing) {
  return "Official average is lower than training average and the gap has increased recently.";
}

if (officialAvg >= trainingAvg) {
  return "Official performance is matching or exceeding training form.";
}
```

Ελληνικά:

```text
Ο μέσος όρος στους επίσημους αγώνες παραμένει χαμηλότερος από την προπόνηση, αλλά η διαφορά μικραίνει τους τελευταίους 3 μήνες.
```

## Career History

Το WST-style `Career History` μπορεί να μπει και να αυτοματοποιηθεί.

Στο Billiard Today πρέπει να βασίζεται σε structured facts:

```text
bt_players.career_stats.byYear
bt_events
bt_event_stages
bt_groups
bt_results
bt_results_final
tournament_participants
friendly_matches
```

## Career History Περιεχόμενο

Ανά χρονιά:

```text
official matches
friendly matches
official AVG
training AVG
wins / losses
win %
highest run
best average
tournament participations
best finish, αν είναι αξιόπιστο
notable achievements, αν είναι αξιόπιστα
```

Παράδειγμα ασφαλούς summary:

```text
2025
37 official matches · AVG 1.507 · H.R. 14 · Best AVG 3.077
48 friendly matches · Training AVG 1.430 · H.R. 16
```

Παράδειγμα narrative:

```text
In 2025 he played 37 official matches, averaging 1.507 with a high run of 14 and a best match average of 3.077.
```

Ελληνικά:

```text
Το 2025 αγωνίστηκε σε 37 επίσημους αγώνες, με μέσο όρο 1.507, μεγαλύτερη σειρά 14 και καλύτερο μέσο όρο αγώνα 3.077.
```

## Περιγραφικά Κείμενα Για Κάθε Παίκτη

Μπορούμε να παράγουμε πιο περιγραφικά κείμενα όπως στη WST, αλλά πρέπει να είναι ελεγχόμενα.

Προτείνεται:

```text
templates + rules
```

όχι ελεύθερη παραγωγή κειμένου στην πρώτη έκδοση.

### Career Summary Object

Το backend πρώτα δημιουργεί structured summary:

```json
{
  "firstSeason": 2012,
  "latestSeason": 2026,
  "totalOfficialMatches": 464,
  "totalFriendlyMatches": 128,
  "bestSeason": {
    "year": 2023,
    "avg": 1.632,
    "wins": 33,
    "matches": 53
  },
  "recentTrend": "improving",
  "highestRun": 25,
  "bestAverage": 4.444,
  "notableResults": [
    {
      "year": 2025,
      "event": "Greek Championship",
      "finish": "Semi-final"
    }
  ]
}
```

Μετά παράγει narrative text.

Παράδειγμα:

```text
Polychronopoulos has been active in recorded competition since 2012, with more than 460 official matches in the Billiard Today database. His strongest recorded season came in 2023, when he posted a 1.632 average across 53 matches.
```

Ελληνικά:

```text
Ο Πολυχρονόπουλος εμφανίζεται σε καταγεγραμμένους αγώνες από το 2012, με περισσότερους από 460 επίσημους αγώνες στη βάση του Billiard Today. Η πιο δυνατή καταγεγραμμένη σεζόν του ήταν το 2023, με μέσο όρο 1.632 σε 53 αγώνες.
```

## Τύποι Narrative Blocks

### Career Intro

```text
Active since 2012, with 464 official matches recorded.
```

### Best Season

```text
His best recorded season was 2023, based on average and match volume.
```

### Recent Form

```text
His recent official average is below his career level, while training results remain stronger.
```

### Playing Profile

```text
A consistent scorer with a career average above 1.6 and a highest run of 25.
```

### Training Vs Official

```text
Friendly match performance is currently ahead of official match performance, suggesting a pressure gap.
```

### Year Summary

```text
In 2025 he played 37 official matches, averaging 1.507 with a high run of 14 and a best match average of 3.077.
```

## Ασφάλεια Κειμένων

Δεν πρέπει να γράφουμε:

```text
won
finalist
semi-finalist
ranking title
national champion
```

εκτός αν υπάρχει αξιόπιστο structured δεδομένο.

Αν δεν είμαστε σίγουροι, χρησιμοποιούμε ασφαλή facts:

```text
matches
AVG
wins
highest run
best average
active years
```

## Backend API Πρόταση

Νέο ή επεκταμένο endpoint:

```http
GET /api/player-accounts/dashboard
```

ή ξεχωριστά:

```http
GET /api/player-accounts/performance-summary
GET /api/player-accounts/career-history
GET /api/player-accounts/narratives
```

Προτεινόμενο response shape:

```json
{
  "player": {},
  "careerStats": {},
  "seasonStats": {},
  "trainingVsOfficial": {
    "periods": [
      {
        "label": "Apr 2026",
        "trainingAvg": 1.51,
        "officialAvg": 1.36,
        "trainingMatches": 9,
        "officialMatches": 4
      }
    ],
    "insight": {
      "severity": "info",
      "text": "Official average is still lower than training average, but the gap is shrinking over the last three months.",
      "textEl": "Ο μέσος όρος στους επίσημους αγώνες παραμένει χαμηλότερος από την προπόνηση, αλλά η διαφορά μικραίνει τους τελευταίους 3 μήνες."
    }
  },
  "careerHistory": [
    {
      "year": 2025,
      "official": {
        "matches": 37,
        "avg": 1.507,
        "highestRun": 14,
        "bestAverage": 3.077
      },
      "friendly": {
        "matches": 48,
        "avg": 1.43,
        "highestRun": 16
      },
      "narrative": "In 2025 he played 37 official matches, averaging 1.507 with a high run of 14.",
      "narrativeEl": "Το 2025 αγωνίστηκε σε 37 επίσημους αγώνες, με μέσο όρο 1.507 και μεγαλύτερη σειρά 14."
    }
  ],
  "narratives": {
    "careerIntro": "...",
    "recentForm": "...",
    "playingProfile": "..."
  }
}
```

## Frontend Υλοποίηση

Προτεινόμενα components:

```text
AccountHero
AccountCareerStatsBand
AccountSeasonStats
TrainingVsOfficialChart
AutomatedInsight
FriendlyMatchHistory
CareerHistoryTimeline
AccountSecondaryActions
```

Το `/account/mockup` θα μείνει σαν design reference μέχρι να μεταφερθεί η λογική στο πραγματικό `/account`.

## Mockup Status

Έχει υλοποιηθεί:

```text
/account/mockup
```

Περιλαμβάνει:

- WST-inspired hero
- career stats band
- season stats
- win-rate dial
- Training vs Official comparison
- static SVG line chart
- automated-insight placeholder text
- friendly match history

Commits:

```text
43b2eb0 Add account mockup page
9bd0ae3 Add account comparison chart mockup
```

## Επόμενα Βήματα

1. Να αποφασιστεί αν το mockup direction εγκρίνεται.
2. Να προστεθεί Career History section στο mockup.
3. Να σχεδιαστεί backend response για dashboard/performance.
4. Να υλοποιηθεί rule-based narrative generator.
5. Να συνδεθεί το πραγματικό `/account` με τα νέα components.
6. Να μεταφερθούν settings/devices σε δευτερεύουσα θέση.
