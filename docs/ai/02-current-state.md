# Current State

Τρέχουσα κατάσταση του commercial module:

Backend:
- έχουν προστεθεί content types για branches, tables, customers, products, sessions
- έχουν προστεθεί επίσης tabs, charges, payments, settings
- τα tables έχουν πεδία layout για floor plan

Admin:
- υπάρχουν protected routes και navigation για το commercial module
- υπάρχουν usable σελίδες για branches, tables, customers, products, sessions, tabs, settings
- υπάρχει visual floor view για τα τραπέζια
- υπάρχει floor plan με αποθηκευμένες θέσεις
- υπάρχει move mode και αποθήκευση θέσης τραπεζιού

Business model:
- η σωστή χρέωση δεν είναι `1 session = 1 λογαριασμός`
- η σωστή βάση είναι `open tab / visit / ledger`
- ο πελάτης μπορεί να αλλάζει τραπέζι, να παραγγέλνει εκτός παιχνιδιού και να πληρώνει στο τέλος
- πρέπει να υποστηρίζονται πίστωση και ανοιχτά υπόλοιπα

i18n:
- έχει ξεκινήσει και περαστεί στο commercial module
- βασικός κανόνας: δεν βάζουμε καρφωμένα labels μέσα στον κώδικα
- όλα τα labels πρέπει να περνάνε από locale files

Κατάσταση ποιότητας:
- το admin lint έχει περάσει στο τελευταίο βήμα
- το Strapi build είχε περάσει στα προηγούμενα βήματα
