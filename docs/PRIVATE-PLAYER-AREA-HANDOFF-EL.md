# Private Player Area Handoff

Ημερομηνία: 2026-03-16

## Τι έχει ολοκληρωθεί

Έχει στηθεί και ανέβει live το βασικό private player area στο `billiardtoday.com`.

Υλοποιήθηκαν:

- account system σε Strapi 5
- account endpoints:
  - `register`
  - `login`
  - `me`
  - `dashboard`
  - `devices`
  - `friendly-matches`
  - `tournaments`
- email verification με Resend
- partial access mode για pending accounts
- private frontend pages:
  - `/account`
  - `/account/tournaments`
  - `/account/friendly`
  - `/account/devices`
- account linking με πραγματικό player
- QR/device pairing flow για σύνδεση account με ήδη enrolled τηλέφωνο
- trusted device flows:
  - `/claim`
  - `/enroll`
  - `/link-device`
- fixes για mobile/browser regressions
- full unlink/reset flow:
  - local cleanup
  - backend revoke της current trusted device
- `Full name` support:
  - αποθήκευση στο `player-account`
  - prefill από enrollment όταν υπάρχει matching email
  - editable στο register
  - editable στο complete-profile flow

## Πρόσφατα σημαντικά fixes

- mobile application error:
  - έγινε hardening του trusted-device storage access
  - αφαιρέθηκαν fragile App Router navigations από mobile flows
  - χρησιμοποιούνται direct `window.location` redirects στα:
    - `/claim`
    - `/enroll`
    - `/link-device`
- standalone pairing route:
  - το account pairing page μεταφέρθηκε από `/account/link-device` σε `/link-device`
- full unlink:
  - το `Reset` στο `/enroll` κάνει πλέον και backend revoke στο Strapi

## Τρέχουσα κατάσταση

Το foundation λειτουργεί live.

Σήμερα δουλεύουν:

- enroll από scoreboard
- claim από trusted device
- account creation/login
- private account navigation
- device linking με QR από ήδη enrolled τηλέφωνο
- device revoke/reset
- viewing private tournaments/friendly/devices

## Σημαντική παρατήρηση

Το `Full name` prefill από μόνο του δεν λύνει γενικά το linking.

Λειτουργεί μόνο όταν:

- υπάρχει `claim token`
- ή υπάρχει enrollment request με αποθηκευμένο `email`

Δεν αρκεί για το βασικό scoreboard flow όταν ο χρήστης δεν έχει δώσει email.

## Τι απομένει

Για να θεωρηθεί το task πραγματικά ολοκληρωμένο, απομένουν κυρίως UX και linking refinements:

1. Να οριστεί ξεκάθαρα ως primary linking flow το QR pairing από ήδη enrolled τηλέφωνο.
2. Να κρατηθεί το email/full-name prefill μόνο σαν βοηθητικό enhancement.
3. Να βελτιωθούν τα messages για expired/invalid scoreboard claim links.
4. Να γίνει πιο καθαρό το register/linking UX για χρήστες χωρίς email στο enrollment.
5. Να γίνει ένα τελικό pass στο account profile/details experience.
6. Να μειωθούν κι άλλο τα edge cases από mobile browser cache/site data.

## Προτεινόμενο επόμενο βήμα

Το πιο σωστό επόμενο βήμα είναι:

- να καθαρίσουμε το linking UX
- και να κάνουμε το QR/device pairing το canonical flow

Συγκεκριμένα:

1. `Register`
   - `Email`
   - `Full name`
   - `Password`
   - `Confirm password`

2. `After register`
   - αν υπάρχει known enrollment by email, γίνεται soft prefill/help
   - το βασικό linking να γίνεται από:
     - `Link your enrolled phone`
     - QR pairing

3. `Claim errors`
   - να δείχνουμε καθαρό μήνυμα τύπου:
   - `This scoreboard link expired. Return to the scoreboard and scan the new QR code.`

## Repos που επηρεάζονται

- Strapi:
  - [1-billiards-strapi](D:/Projects/1-billiards-strapi)
- Frontend:
  - [4-billiardtoday-frontend](D:/Projects/4-billiardtoday-frontend)

## Σημείωση για αύριο

Αν συνεχίσουμε αύριο, η σωστή αφετηρία είναι:

- όχι άλλο foundation work
- όχι άλλο auth rewrite
- μόνο UX cleanup και completion του linking flow
