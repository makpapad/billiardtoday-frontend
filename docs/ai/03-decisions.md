# Decisions

## Commercial module

- Η εμπορική διαχείριση χτίζεται μέσα στο υπάρχον `2-billiardtoday-admin`.
- Τα business entities παραμένουν στο `1-billiards-strapi`.
- Δεν φτιάχνουμε τρίτο ξεχωριστό app για την εμπορική διαχείριση.

## Billing model

- Δεν βασιζόμαστε μόνο σε table sessions.
- Χρησιμοποιούμε λογική `open tab / visit`.
- Πολλαπλά sessions και παραγγελίες μπορούν να ανήκουν στην ίδια καρτέλα.
- Το checkout μπορεί να είναι ολικό ή μερικό.
- Το υπόλοιπο μπορεί να μείνει ανοιχτό στην καρτέλα πελάτη.

## Credit policy

- Το σύστημα πρέπει να υποστηρίζει πίστωση πελάτη.
- Πρέπει να υπάρχουν `allowCredit`, `creditLimit`, `openBalance`.
- Το υπόλοιπο πελάτη πρέπει να είναι ορατό και ελέγξιμο.

## UI and localization

- Όλο το commercial UI πρέπει να είναι μεταφράσιμο.
- Υποστηρίζουμε τουλάχιστον `el` και `en`.
- Δεν αφήνουμε hardcoded labels στις σελίδες του admin.

## Future extensions

- Φωτισμός ανά τραπέζι με relay/gateway.
- Παραγγελιοληψία από τραπέζι μέσω tablet ή συσκευής πελάτη.
