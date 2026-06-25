# Server Sync

## Στόχος

Να τραβάμε τις τελευταίες αλλαγές από το GitHub στον production server `138.201.29.162` και να γίνεται σωστό deploy χωρίς να πειράζουμε χειροκίνητα τα production env files.

## SSH Στον Server

Παράδειγμα:

```powershell
plink -i D:\.ssh\priv.ppk root@138.201.29.162
```

ή με OpenSSH:

```powershell
ssh root@138.201.29.162
```

## Current Root Key

Current PuTTY/WinSCP root key:

```text
D:\.ssh\billiard_admin.ppk
```

Current OpenSSH root key:

```text
D:\.ssh\billiard_admin_openssh.key
```

Notes:

- active root key comment on server: `rsa-key-20260126`
- previous root key `rsa-key-20240807` was removed from `/root/.ssh/authorized_keys`
- backup kept on server: `/root/.ssh/authorized_keys.bak-20260320-before-old-key-removal`

## Σημερινή Παρατήρηση

Τα Node apps δεν τρέχουν πλέον ως `root`.

Τρέχουν μέσω PM2 του user:

```text
billiardtoday_srv
```

Άρα:

- δεν κάνουμε manual deploy με root-owned PM2
- δεν σηκώνουμε Node apps ως `root`
- τα restarts γίνονται μέσω του PM2 environment του `billiardtoday_srv`

## Git Working Copies Στον Server

Τα server-side repos βρίσκονται εδώ:

```text
/srv/git/billiardtoday/strapi
/srv/git/billiardtoday/frontend
/srv/git/billiardtoday/admin
/srv/git/billiardtoday/scoreboard
```

## Live Paths

Τα production paths είναι:

```text
/var/www/vhosts/billiardtoday.com/app.billiardtoday.com/httpdocs
/var/www/vhosts/billiardtoday.com/httpdocs
/var/www/vhosts/billiardtoday.com/admin.billiardtoday.com/httpdocs
/var/www/vhosts/billiardtoday.com/scoreboard.billiardtoday.com/httpdocs
/var/www/vhosts/billiardtoday.com/ws.billiardtoday.com/httpdocs
```

## Ο Σωστός Τρόπος Deploy

Ο βασικός τρόπος deploy παραμένει με το helper:

```bash
bt-sync frontend
bt-sync app
bt-sync admin
bt-sync scoreboard
bt-sync ws
bt-sync all
```

## Τι Κάνει Το `bt-sync`

- κάνει `git pull` από `origin/main` στο σωστό server-side repo
- περνάει τον κώδικα στο σωστό live path
- τρέχει `npm ci` όπου χρειάζεται
- κάνει build όπου χρειάζεται
- κάνει restart το αντίστοιχο PM2 app
- κρατάει τα production `.env` του server

## Mapping

- `bt-sync frontend` -> `billiardtoday.com`
- `bt-sync app` -> `app.billiardtoday.com`
- `bt-sync admin` -> `admin.billiardtoday.com`
- `bt-sync scoreboard` -> `scoreboard.billiardtoday.com`
- `bt-sync ws` -> `ws.billiardtoday.com`
- `bt-sync all` -> όλα μαζί

## Κανονική Ροή Deploy

1. Κάνεις local αλλαγές.
2. Κάνεις `commit` και `push` στο GitHub.
3. Μπαίνεις στον server.
4. Τρέχεις το αντίστοιχο `bt-sync`.
5. Κάνεις health check.

Παράδειγμα:

```bash
bt-sync frontend
curl -I http://127.0.0.1:3022/
su -s /bin/bash - billiardtoday_srv -c 'pm2 status billiardtoday-frontend --no-color'
```

## Health Checks Ανά Service

### Frontend

```bash
bt-sync frontend
curl -I http://127.0.0.1:3022/
su -s /bin/bash - billiardtoday_srv -c 'pm2 status billiardtoday-frontend --no-color'
```

### Strapi

```bash
bt-sync app
curl -I http://127.0.0.1:1337/admin/
su -s /bin/bash - billiardtoday_srv -c 'pm2 status strapi-prod --no-color'
```

### Admin

```bash
bt-sync admin
curl -I http://127.0.0.1:3002/
su -s /bin/bash - billiardtoday_srv -c 'pm2 status billiardtoday-admin --no-color'
```

### Scoreboard

```bash
bt-sync scoreboard
curl -I http://127.0.0.1:3001/scoreboard
su -s /bin/bash - billiardtoday_srv -c 'pm2 status scoreboard --no-color'
```

### WS

```bash
bt-sync ws
curl -I http://127.0.0.1:3010/presence
su -s /bin/bash - billiardtoday_srv -c 'pm2 status billiardtoday-ws --no-color'
```

## WS Redirect Fix (Safe Runbook)

Χρήση μόνο όταν το WebSocket handshake αποτυγχάνει και βλέπουμε `301` αντί για `101` στο:

```bash
curl -I https://ws.billiardtoday.com/ws
```

### 1) Βρες το σωστό nginx vhost file

```bash
grep -R "server_name ws.billiardtoday.com" /etc/nginx /var/www/vhosts/system 2>/dev/null
```

### 2) Backup πριν από κάθε αλλαγή

```bash
cp /path/to/ws-vhost.conf /path/to/ws-vhost.conf.bak-$(date +%Y%m%d-%H%M%S)
```

### 3) Βάλε ΜΟΝΟ location για `/ws` μέσα στο `server { listen 443 ssl; ... }`

```nginx
location /ws {
    proxy_pass http://127.0.0.1:3010;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;
    proxy_send_timeout 86400;
}
```

Σημειώσεις ασφαλείας:

- Μην αλλάξεις global redirects/canonical rules.
- Μην προσθέσεις redirect από `https` σε `http`.
- Μην κάνεις rewrite από `/ws` σε `/ws/`.
- Η αλλαγή αφορά μόνο το path `/ws` για να μη επηρεαστούν live score/ads routes.

### 4) Validate + Reload

```bash
nginx -t && systemctl reload nginx
```

### 5) Verify

```bash
curl -I https://ws.billiardtoday.com/ws
curl -I "https://ws.billiardtoday.com/ws?screenId=US-ATH-STORE1-S1-31cc-1445&token=YOUR_WS_TOKEN"
```

Αναμενόμενο:

- όχι `301`
- στο browser DevTools `Network > WS` το handshake να γυρίζει `101 Switching Protocols`

### 6) Rollback (αν κάτι πάει στραβά)

```bash
cp /path/to/ws-vhost.conf.bak-YYYYMMDD-HHMMSS /path/to/ws-vhost.conf
nginx -t && systemctl reload nginx
```

## Αν Θες Να Δεις Το Repo Πριν Το Deploy

Παράδειγμα για frontend:

```bash
cd /srv/git/billiardtoday/frontend
git status
git log --oneline -5
git pull origin main
bt-sync frontend
```

## PM2 Processes

Τα live PM2 apps είναι:

```text
billiardtoday-frontend
strapi-prod
billiardtoday-admin
scoreboard
billiardtoday-ws
```

Γενικός έλεγχος:

```bash
su -s /bin/bash - billiardtoday_srv -c 'pm2 list'
```

## Manual Deploy Χωρίς `bt-sync`

Μόνο αν χρειάζεται ειδικό fix.

### Frontend

```bash
cd /var/www/vhosts/billiardtoday.com/httpdocs
npm run build
su -s /bin/bash - billiardtoday_srv -c 'pm2 restart billiardtoday-frontend'
```

### Admin

```bash
cd /var/www/vhosts/billiardtoday.com/admin.billiardtoday.com/httpdocs
rm -rf .next .next-local
su -s /bin/bash - billiardtoday_srv -c 'cd /var/www/vhosts/billiardtoday.com/admin.billiardtoday.com/httpdocs && npm run build && pm2 restart billiardtoday-admin'
```

### Strapi

```bash
cd /var/www/vhosts/billiardtoday.com/app.billiardtoday.com/httpdocs
su -s /bin/bash - billiardtoday_srv -c 'pm2 restart strapi-prod'
```

### Scoreboard

```bash
cd /var/www/vhosts/billiardtoday.com/scoreboard.billiardtoday.com/httpdocs
su -s /bin/bash - billiardtoday_srv -c 'pm2 restart scoreboard'
```

### WS

```bash
cd /var/www/vhosts/billiardtoday.com/ws.billiardtoday.com/httpdocs
su -s /bin/bash - billiardtoday_srv -c 'pm2 restart billiardtoday-ws'
```

## CMS / Homepage Deploy Σημείωση

Για αλλαγές που αφορούν homepage CMS flow, συνήθως αγγίζονται 3 repos:

- `1-billiards-strapi`
- `2-billiardtoday-admin`
- `4-billiardtoday-frontend`

Συνήθης σειρά:

1. `commit` / `push` και στα 3 repos
2. `bt-sync app`
3. `bt-sync admin`
4. `bt-sync frontend`
5. αν χρειάζεται, run homepage seed στο Strapi

Παράδειγμα homepage seed:

```bash
cd /var/www/vhosts/billiardtoday.com/app.billiardtoday.com/httpdocs
node scripts/restore-cms-home.js
```

## Stats Comparison / UMB World Cup Deploy Σημείωση

Για αλλαγές που αφορούν `format_definition.statsComparison`, UMB World Cup import ή `/stats/tournament-comparison`, συνήθως αγγίζονται 3 repos:

- `1-billiards-strapi`
- `2-billiardtoday-admin`
- `4-billiardtoday-frontend`

Δεν χρειάζεται Strapi schema migration όταν το metadata γράφεται μέσα στο υπάρχον JSON `tournament.format_definition`.

Σωστή σειρά:

1. `commit` / `push` και στα 3 repos
2. `bt-sync app`
3. `bt-sync admin`
4. `bt-sync frontend`

Για UMB World Cup import, το Strapi script πρέπει να είναι live πριν χρησιμοποιηθεί το admin import:

```bash
bt-sync app
bt-sync admin
```

Μετά το frontend deploy, έλεγξε ότι το stats endpoint ομαδοποιεί με `statsComparison` όπου υπάρχει και κάνει fallback στον παλιό title-based τρόπο όπου δεν υπάρχει:

```bash
bt-sync frontend
curl -s "http://127.0.0.1:3022/api/stats/tournament-comparison?metric=stageAverage&tournament=PORTO%20World-Cup" | head -c 500
```

Checks μετά το deploy:

- νέο UMB import για `PORTO / Portugal 2026` να γράφει `world-cup:porto`
- στο admin edit, το Format tab να δείχνει/σώζει `Comparison series`
- το `/stats/tournament-comparison` να κρατά την υπάρχουσα σειρά `PORTO World-Cup`
- παλιά tournaments χωρίς `statsComparison` να συνεχίζουν να εμφανίζονται με fallback από τίτλο

## Organizer / Venue Migration Runbook

Για το redesign των `federations / organizers / venues`, το απλό `bt-sync` δεν αρκεί μόνο του, γιατί υπάρχει και production data migration.

Σωστή σειρά:

1. `commit` / `push` και στα 3 repos
2. `bt-sync app`
3. μπες στο live Strapi path:

```bash
cd /var/www/vhosts/billiardtoday.com/app.billiardtoday.com/httpdocs
```

4. τρέξε verification πριν το migration:

```bash
node scripts/verify-organizer-venue-migration.js
```

5. τρέξε dry-run:

```bash
node scripts/production-migrate-organizers-and-venues.js
```

6. αν το summary είναι σωστό, τρέξε apply:

```bash
node scripts/production-migrate-organizers-and-venues.js --apply
```

7. ξανατρέξε verification:

```bash
node scripts/verify-organizer-venue-migration.js
```

8. μετά μόνο:

```bash
bt-sync admin
bt-sync frontend
```

Checks μετά το migration:

- η `CEB` να έχει federation-owned tournaments και όχι club-owned imports
- η `UMB` να συνεχίζει να δείχνει μόνο τα δικά της tournaments
- η `Hellenic Billiard Union` να δείχνει `ACROPOLIS 2018`, `ACROPOLIS 2023`, `3k investment partner`
- το `League 2 II` να παραμείνει club-owned test tournament
- να μην αλλάξουν player stats totals

## Σημαντικό

- Δεν κάνουμε deploy με σκέτο `git pull` μέσα στα `httpdocs`.
- Δεν πειράζουμε production `.env` αρχεία από τα repos.
- Δεν τρέχουμε Node apps ως `root`.
- Για PM2 χρησιμοποιούμε τον user `billiardtoday_srv`.
- Αν υπάρχει ύποπτο build cache στο admin, καθαρίζουμε πρώτα `.next` και `.next-local`.
