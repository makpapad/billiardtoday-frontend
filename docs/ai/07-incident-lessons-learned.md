# Incident Lessons Learned

## Περίληψη

Ο server `138.201.29.162` θεωρήθηκε πλήρως compromised ως `root`.

Βρέθηκαν:

- miner / malware execution
- cron persistence
- udev persistence
- systemd sabotage
- zero-byte binaries / service masks
- αλλοίωση root dotfiles

Το πιο κρίσιμο operational λάθος ήταν ότι τα Node services έτρεχαν ως `root`.

## Τι Μάθαμε

### 1. Node apps ως `root` είναι απαράδεκτο

Αν ένα Node app έχει RCE ή runtime compromise και τρέχει ως `root`, τότε:

- ο attacker παίρνει αμέσως full-root access
- μπορεί να γράψει σε `/etc`
- μπορεί να βάλει cron/systemd/udev persistence
- μπορεί να σαμποτάρει άλλα services

Αυτό ακριβώς έκανε το incident πολύ πιο σοβαρό.

### 2. Δεν αρκεί να “καθαρίσεις” μόνο process/cron

Η persistence μπορεί να υπάρχει σε πολλά σημεία:

- `/etc/cron*`
- `/etc/systemd/system`
- `/run/systemd/system`
- `/etc/udev/rules.d`
- `/root/.profile`
- `/root/.bashrc`
- `/tmp` running deleted binaries

Άρα κάθε incident θέλει πλήρες sweep.

### 3. Το sabotage μπορεί να είναι εξίσου σοβαρό με το malware

Στο incident δεν υπήρχε μόνο miner.

Υπήρχε και sabotage:

- zero-byte `php-fpm` binary
- zero-byte systemd units
- masked services
- broken perms

Άρα κάθε compromise πρέπει να ελέγχεται και για availability impact.

### 4. Τα co-hosted apps αυξάνουν το συνολικό ρίσκο

Ακόμα κι αν ένα συγκεκριμένο app δεν είναι το entry point:

- WordPress
- Plesk
- Strapi
- Next.js admin
- scoreboard

όλα μοιράζονται τον ίδιο host risk surface.

Ένα compromise σε ένα σημείο μπορεί να επηρεάσει όλο το host.

### 5. Το deploy workflow πρέπει να είναι deterministic

Χρειαζόμαστε:

- GitHub ως source of truth
- server-side sync με συγκεκριμένο flow
- όχι ad-hoc edits σε production trees
- όχι root-run PM2

## Hardening Rules

### Runtime

- Κανένα Node app δεν τρέχει ως `root`
- Όλα τα Node apps τρέχουν ως `billiardtoday_srv`
- Κανένα app user δεν έχει `sudo`
- Κάθε app έχει μόνο τα απολύτως απαραίτητα write permissions

### PM2

- PM2 μόνο για non-root user
- systemd startup για `pm2-billiardtoday_srv`
- όχι root PM2 daemon
- έλεγχος μετά από κάθε reboot ότι τα apps σηκώθηκαν ως σωστός user

### Deploy

- `commit` / `push` πρώτα
- μετά `bt-sync`
- όχι `git pull` μέσα στα `httpdocs`
- όχι overwrite production `.env`

### SSH

- `PasswordAuthentication no`
- `PermitRootLogin prohibit-password` ή καλύτερα πλήρες disable αν γίνει operationally εφικτό
- rotate keys μετά από κάθε σοβαρό incident
- έλεγχος `authorized_keys`

### Cron / systemd / udev

- συχνός έλεγχος:
  - `/etc/cron.d`
  - `/etc/cron.daily`
  - `/etc/systemd/system`
  - `/run/systemd/system`
  - `/etc/udev/rules.d`
- σωστά permissions / owners
- άμεσο alert για νέα αρχεία εκεί

### File Integrity

- έλεγχος για:
  - world-writable αρχεία
  - zero-byte binaries
  - unexpected file mtimes
  - immutable flags σε κρίσιμα paths

### Monitoring

- alert για deleted-running executables
- alert για outbound προς mining pools / ύποπτα ports
- alert για νέα systemd units
- alert για αλλαγές σε root dotfiles

## Operational Rules Μετά Το Incident

### Πριν σηκωθεί ξανά service

Να ελέγχεται:

- ποιος user το τρέχει
- από ποιο path τρέχει
- αν το tree είναι trusted
- αν χρειάζεται rebuild
- αν υπάρχουν cached artifacts που πρέπει να σβηστούν

### Μετά από reboot

Να ελέγχεται:

- `pm2-billiardtoday_srv`
- `plesk-php83-fpm`
- `postgresql`
- WordPress domains
- Node domains
- absence of suspicious processes / connections

### Πριν θεωρηθεί “resolved”

Πρέπει να έχουν γίνει:

- persistence sweep
- service integrity check
- secret rotation
- SSH key rotation
- deploy path verification

## Secret Rotation Rules

Θεωρούνται καμένα μετά από root compromise:

- app secrets
- API tokens
- DB passwords
- SMTP credentials
- panel credentials
- SSH keys

Δεν αρκεί cleanup χωρίς rotate.

## Rebuild Policy

Μετά από confirmed root compromise, ο host δεν πρέπει να θεωρείται ξανά έμπιστος μόνο επειδή “δεν φαίνεται κάτι”.

Η σωστή τελική στάση είναι:

- clean rebuild
- restore μόνο verified code/config/data
- redeploy με hardened runtime model

## Προτεινόμενο Επόμενο Βήμα

Να στηθεί σταδιακά:

- basic file integrity monitoring
- server security agent / detection helper
- regular hardening audit checklist
- documented recovery runbook
