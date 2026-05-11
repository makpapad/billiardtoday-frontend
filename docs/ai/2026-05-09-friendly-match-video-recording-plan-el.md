# Friendly Match Video Recording Plan

Αυτό το σημείωμα ξεχωρίζει τα **official live streams** από τα **friendly match recordings** και προτείνει πρακτική αρχιτεκτονική για να γράφει ένας παίκτης το παιχνίδι του χωρίς να βλέπει OBS.

## 1. Δύο διαφορετικά use cases

### Official matches

Τα official matches στέλνονται από admin/διοργάνωση.

Προτεινόμενη ροή:

```text
OBS ή BTDroitCamera
-> live.billiardtoday.com / MediaMTX
-> admin συνδέει Stream URL στο match
-> public live page
```

Εδώ το OBS είναι αποδεκτό, γιατί τα official streams θέλουν παραγωγή, σκηνές, overlays, έλεγχο ποιότητας και operator.

### Friendly matches

Τα friendly matches ξεκινούν από παίκτη ή από scoreboard PC.

Προτεινόμενη ροή:

```text
Scoreboard Electron
-> hidden FFmpeg process
-> live.billiardtoday.com / MediaMTX
-> server recording
-> video συνδέεται με player account
-> κρατάμε τα 5 τελευταία videos για Χ ημέρες
```

Εδώ δεν θέλουμε να φαίνεται OBS και δεν θέλουμε βαριά εφαρμογή.

## 2. Γιατί όχι OBS για friendly recordings

Το OBS είναι δυνατό, αλλά μπορεί να είναι βαρύ για scoreboard PCs.

Μειονεκτήματα για friendly:

- έχει UI που δεν θέλουμε να βλέπει ο παίκτης
- θέλει setup/profiles/scenes
- μπορεί να καταναλώνει αρκετή CPU/GPU/RAM
- είναι πιο κατάλληλο για production streaming παρά για απλό “γράψε το παιχνίδι μου”

Μπορούμε να το κρύψουμε/minimize και να το ελέγξουμε με OBS WebSocket, αλλά πάλι τρέχει OBS.

## 3. Προτεινόμενη λύση για friendly

Χρησιμοποιούμε **FFmpeg κρυφά μέσα από το Electron scoreboard app**.

Ο παίκτης βλέπει μόνο:

```text
[Start recording]
[Stop recording]
```

Από πίσω το Electron:

1. ξέρει ποιος χρήστης είναι συνδεδεμένος
2. ξέρει ποιο friendly match παίζεται
3. διαλέγει κάμερα/μικρόφωνο
4. ξεκινά FFmpeg hidden
5. στέλνει RTMP stream στο MediaMTX
6. ενημερώνει backend ότι ξεκίνησε video
7. στο stop ενημερώνει backend ότι τελείωσε

## 4. Παράδειγμα stream path

Για friendly match δεν χρησιμοποιούμε απλό `table1`.

Χρησιμοποιούμε path συνδεδεμένο με χρήστη/match:

```text
friendly/user-123/match-456
```

RTMP publish URL:

```text
rtmp://live.billiardtoday.com/friendly/user-123/match-456
```

Playback URL:

```text
https://live.billiardtoday.com/friendly/user-123/match-456/
```

HLS playlist:

```text
https://live.billiardtoday.com/friendly/user-123/match-456/index.m3u8
```

## 5. FFmpeg στα Windows

Στα Windows, FFmpeg μπορεί να πάρει κάμερα και ήχο με `dshow`.

Παράδειγμα:

```powershell
ffmpeg ^
  -f dshow -i video="Camera Name":audio="Microphone Name" ^
  -c:v h264_qsv -b:v 2500k -maxrate 2500k -bufsize 5000k ^
  -r 30 -s 1280x720 -g 60 ^
  -c:a aac -b:a 128k -ar 48000 ^
  -f flv rtmp://live.billiardtoday.com/friendly/user-123/match-456
```

Το Electron θα το τρέχει ως hidden child process, όχι ως ορατό παράθυρο.

## 6. Encoder επιλογές

Θέλουμε H.264 hardware encoding όπου γίνεται.

Προτεινόμενη σειρά:

```text
Intel Quick Sync: h264_qsv
NVIDIA: h264_nvenc
AMD: h264_amf
Fallback CPU: libx264 veryfast ή ultrafast
```

Για friendly matches προτείνεται συντηρητικό preset:

```text
720p30
2500 Kbps
AAC audio 128 Kbps
Keyframe interval 2 sec
```

Όχι 1080p60 ως default για παλιά scoreboard PCs.

## 7. Server recording

Για να κρατάμε video μετά το live, το MediaMTX πρέπει να γράφει το stream στον server.

Προτεινόμενο:

```text
MediaMTX record: enabled για paths friendly/*
record format: fMP4
record path: /var/lib/mediamtx/recordings/%path/%Y-%m-%d_%H-%M-%S-%f
```

Μετά το τέλος του recording, backend αποθηκεύει metadata:

```text
userId
friendlyMatchId
streamPath
playbackUrl
recordingPath
startedAt
endedAt
status
expiresAt
```

## 8. Retention policy

Απαίτηση:

```text
κρατάμε τα 5 τελευταία videos ανά χρήστη
και μόνο για συγκεκριμένο χρονικό διάστημα
```

Προτεινόμενο αρχικό policy:

```text
max videos per user: 5
retention: 30 ημέρες
```

Cleanup job:

1. βρίσκει videos παλιότερα από 30 ημέρες
2. βρίσκει videos πέρα από τα 5 πιο πρόσφατα ανά user
3. διαγράφει αρχεία από disk
4. μαρκάρει DB record ως deleted/expired

## 9. Privacy / consent

Πριν ξεκινήσει recording, το scoreboard πρέπει να δείχνει confirm:

```text
This match will be recorded and linked to your BilliardToday account.
```

Αν παίζουν δύο παίκτες:

- owner του video είναι ο χρήστης που ξεκίνησε το recording
- το match μπορεί να συνδεθεί και με τους δύο παίκτες
- χρειάζεται ξεκάθαρο UI/όροι για το ποιος μπορεί να δει ή να διαγράψει το video

## 10. Τι χρειάζεται να φτιάξουμε

### Electron scoreboard

- login/device link με player account
- camera/microphone device detection
- settings για preferred camera/mic
- Start recording button
- Stop recording button
- FFmpeg child process hidden
- live status/error display
- retry/cleanup αν πέσει το process

### Backend

- API: create friendly recording session
- API: mark recording started
- API: mark recording stopped
- API: list last videos for user
- API: delete/expire video
- DB model για video metadata
- cleanup scheduled job

### MediaMTX server

- allow publish για `friendly/*`
- enable recording για `friendly/*`
- storage path και cleanup permissions
- monitoring/logging

### Frontend / Player account

- “My match videos”
- λίστα με 5 τελευταία videos
- video playback
- delete button αν το επιτρέπουμε
- expiry info

## 11. Τελική πρόταση

Για official:

```text
OBS / BTDroitCamera -> MediaMTX -> Admin Stream URL -> live page
```

Για friendly:

```text
Scoreboard Electron -> hidden FFmpeg -> MediaMTX recording -> player account videos
```

Έτσι κρατάμε το OBS μόνο εκεί που πραγματικά χρειάζεται, και τα friendly recordings γίνονται πιο ελαφριά και πιο απλά για τον παίκτη.

## 12. Πιθανό billing model

Η υπηρεσία μπορεί να χρεωθεί είτε στον τελικό χρήστη είτε στο club. Τα δύο μοντέλα καλύπτουν διαφορετική αξία.

### Χρέωση στον παίκτη

Ταιριάζει όταν το video είναι προσωπικό αρχείο του παίκτη.

Παράδειγμα:

```text
Player pays for personal match video history.
```

Πιθανά plans:

```text
Free:
  1 τελευταίο video
  retention 7 ημέρες

Premium:
  5 τελευταία videos
  retention 30 ημέρες

Pro:
  περισσότερα videos
  μεγαλύτερο retention
  πιθανό download/export
```

Πλεονέκτημα:

- καθαρή σύνδεση με player account
- ο παίκτης πληρώνει για το προσωπικό του ιστορικό
- δεν χρειάζεται το club να διαχειριστεί billing για κάθε παίκτη

Μειονέκτημα:

- ο παίκτης πρέπει να έχει account/payment
- ίσως δυσκολέψει το adoption στην αρχή

### Χρέωση στο club

Ταιριάζει όταν το club θέλει να προσφέρει recording ως υπηρεσία στα τραπέζια του.

Παράδειγμα:

```text
Club pays for recording-enabled tables.
```

Πιθανά plans:

```text
Club Basic:
  1-2 recording-enabled tables
  limited monthly recording hours

Club Pro:
  περισσότερα tables
  περισσότερες ώρες
  retention 30 ημέρες

Club Sponsor:
  branding/sponsor overlays
  club video page
```

Πλεονέκτημα:

- πιο εύκολο rollout σε οργανωμένο χώρο
- το club μπορεί να το πουλάει ως παροχή
- καλύτερο για σταθερά scoreboard PCs/cameras

Μειονέκτημα:

- χρειάζεται quota ανά club/table
- αν οι παίκτες θέλουν προσωπικό ιστορικό, πάλι χρειάζεται σύνδεση με user account

### Hybrid model

Πιο δυνατό εμπορικά μακροπρόθεσμα:

```text
Club plan:
  ενεργοποιεί recording στα τραπέζια

Player plan:
  ξεκλειδώνει προσωπικό ιστορικό, μεγαλύτερο retention ή downloads
```

Παράδειγμα:

```text
Το club πληρώνει για να υπάρχει η δυνατότητα recording.
Ο παίκτης πληρώνει αν θέλει να κρατάει τα videos στο προσωπικό του αρχείο.
```

Αυτό κρατάει χαμηλό friction στο club και δίνει upsell στον παίκτη.

## 13. MVP billing πρόταση

Για πρώτη έκδοση δεν προτείνεται σύνθετη χρέωση.

Προτεινόμενο pilot:

```text
Free pilot για επιλεγμένα clubs/users
5 τελευταία videos ανά user
retention 14 ή 30 ημέρες
χωρίς downloads στην αρχή
```

Στόχος του pilot:

- να μετρήσουμε πραγματική χρήση
- να δούμε αν οι παίκτες ξαναβλέπουν τα videos
- να δούμε κόστος storage/bandwidth
- να δούμε αν το club το θεωρεί selling point

Μετά το pilot αποφασίζουμε τιμολόγηση με βάση δεδομένα.

## 14. Metrics που πρέπει να κρατάμε

Για να αποφασίσουμε σωστή χρέωση, χρειαζόμαστε μετρήσεις:

```text
recordings ανά ημέρα
recordings ανά club
recordings ανά player
μέση διάρκεια video
μέσο μέγεθος αρχείου
storage ανά user/club
playback views ανά video
bandwidth playback
πόσα videos λήγουν χωρίς να παιχτούν ξανά
πόσοι χρήστες πατάνε Start recording
πόσοι χρήστες ολοκληρώνουν enrollment για να κρατήσουν video
```

Αυτές οι μετρήσεις πρέπει να συνδεθούν με backend metadata και cleanup job.

## 15. Billing συμπέρασμα

Για την αρχή:

```text
Build feature first.
Measure usage.
Keep 5 latest videos for limited time.
Do not add payment in MVP.
```

Μετά:

```text
Friendly personal archive -> player billing
Recording-enabled tables -> club billing
Best long-term option -> hybrid
```
