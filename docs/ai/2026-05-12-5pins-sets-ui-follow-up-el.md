# 5 Pins / Sets UI Follow-up

Ημερομηνία: 2026-05-12

## Πλαίσιο

Στο production admin ελέγχθηκε το event:

```text
https://admin.billiardtoday.com/admin/tournament/events?eventId=e95efffe-9882-49a5-bfad-2e1fe628d880
```

Το event είναι:

```text
title: 5-pins individual U-21
documentId: e95efffe-9882-49a5-bfad-2e1fe628d880
game_type: 5 Pins
```

Όμως τα production δεδομένα του event δεν έχουν ακόμα πλήρες sets metadata:

```text
ruleset_key: null
ruleset_config: null
set_matches: 0
match_sheet_json.scoring_mode: null
match_sheet_json.sets_result: null
match_sheet_json.setScore: null
```

Άρα το admin UI δεν είχε αρκετή πληροφορία από τα δεδομένα για να ξέρει ότι πρέπει να ανοίξει 5-pins / sets modal.

## Τι έγινε προσωρινά

Στο admin repo έγινε UI fallback ώστε τα events με:

```text
game_type = "5 Pins"
```

να θεωρούνται sets UI, ακόμα και αν τα παλιά imported matches δεν έχουν `sets_result`.

Σχετικά commits στο `D:\Projects\2-billiardtoday-admin`:

```text
ecb24af Use sets UI for five pins events
d074d40 Fix five pins scoring mode type
```

Το deploy πέρασε με:

```text
bt-sync admin
```

και το production URL επέστρεψε `200`.

## Γιατί δεν το θεωρούμε τελικό

Το fallback με βάση μόνο το `game_type: 5 Pins` είναι χρήσιμο για να δούμε το UI, αλλά δεν είναι πλήρης λύση.

Τα παλιά 5-pins matches στο production έχουν αποθηκευτεί σαν απλά distance matches, με συνολικά `points`, `innings`, `match_points`, χωρίς set-by-set rows. Αυτό σημαίνει ότι το sets modal ανοίγει, αλλά δεν έχει πραγματικά set δεδομένα για να αναπαραστήσει σωστά τον αγώνα.

## Τι πρέπει να γίνει όταν επανέλθουμε

1. Να αποφασιστεί αν τα παλιά 5-pins imports θα μείνουν ως distance-style historical records ή αν θα γίνει migration σε πραγματικό sets schema.
2. Να οριστεί canonical shape για 5-pins `match_sheet_json`, π.χ.:

```json
{
  "scoring_mode": "sets",
  "resultFormat": "sets",
  "sets_result": [
    {
      "set_number": 1,
      "player1_points": 60,
      "player2_points": 40,
      "player1_innings": 1,
      "player2_innings": 1,
      "winner": "player1",
      "finished": true
    }
  ],
  "setScore": {
    "player1": 2,
    "player2": 1
  }
}
```

3. Να γίνει mapping από CEB / UMB 5-pins PDFs ή Excel exports προς το παραπάνω shape.
4. Να ελεγχθεί αν το `match_points` για 5 Pins πρέπει να είναι πάντα `1-0` στον νικητή σε group ranking ή αν υπάρχουν exceptions ανά ruleset.
5. Να ξεχωρίσουμε καθαρά:

```text
Three-Cushion sets
5 Pins sets
distance games
```

ώστε το modal και τα labels να μη βασίζονται μόνο στο `game_type`.

## Προσοχή

Μην θεωρηθεί ότι το προσωρινό fallback λύνει το data model. Η σωστή λύση είναι να περάσουν ruleset/scoring metadata στα events/stages/matches και να υποστηριχθεί migration ή re-import για παλιά 5-pins αποτελέσματα.
