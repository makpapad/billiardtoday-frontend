# Server Sync

## Στόχος

Να τραβάς τις τελευταίες αλλαγές από το GitHub στον νέο server `138.201.29.162` και να γίνεται σωστό deploy χωρίς να πειράζεις χειροκίνητα τα production env files.

## SSH Στον Server

Παράδειγμα:

```powershell
plink -i D:\.ssh\priv.ppk root@138.201.29.162
```

ή με κανονικό OpenSSH αν το χρησιμοποιείς:

```powershell
ssh root@138.201.29.162
```

## Git Working Copies Στον Server

Τα repos υπάρχουν εδώ:

```text
/srv/git/billiardtoday/strapi
/srv/git/billiardtoday/frontend
/srv/git/billiardtoday/admin
/srv/git/billiardtoday/scoreboard
```

## Γρήγορος Τρόπος

Ο σωστός τρόπος deploy είναι με το helper command:

```bash
bt-sync frontend
bt-sync app
bt-sync admin
bt-sync scoreboard
bt-sync ws
bt-sync all
```

## Τι Κάνει Το `bt-sync`

- κάνει `git pull` από `origin/main`
- περνάει τον κώδικα στο σωστό live path
- τρέχει `npm ci`
- κάνει build όπου χρειάζεται
- κάνει `pm2 restart`
- κρατάει τα production `.env` του server

## Mapping

- `bt-sync frontend` -> `billiardtoday.com`
- `bt-sync app` -> `app.billiardtoday.com`
- `bt-sync admin` -> `admin.billiardtoday.com`
- `bt-sync scoreboard` -> `scoreboard.billiardtoday.com`
- `bt-sync ws` -> `ws.billiardtoday.com`
- `bt-sync all` -> όλα μαζί

## Συνήθης Ροή

1. Κάνεις local αλλαγές.
2. Κάνεις `commit` και `push` στο GitHub.
3. Μπαίνεις στον server.
4. Τρέχεις το αντίστοιχο `bt-sync`.
5. Κάνεις health check.

Παράδειγμα για frontend:

```bash
bt-sync frontend
curl -I http://127.0.0.1:3022/
pm2 status billiardtoday-frontend --no-color
```

Παράδειγμα για Strapi:

```bash
bt-sync app
curl -I http://127.0.0.1:1337/admin/
pm2 status strapi-prod --no-color
```

Παράδειγμα για admin:

```bash
bt-sync admin
curl -I http://127.0.0.1:3002/
pm2 status billiardtoday-admin --no-color
```

Παράδειγμα για scoreboard:

```bash
bt-sync scoreboard
curl -I http://127.0.0.1:3001/
pm2 status scoreboard --no-color
```

Παράδειγμα για ws:

```bash
bt-sync ws
curl -I http://127.0.0.1:3010/presence
pm2 status billiardtoday-ws --no-color
```

## Αν Θες Να Δεις Το Repo Πριν Το Deploy

Παράδειγμα:

```bash
cd /srv/git/billiardtoday/frontend
git status
git log --oneline -5
git pull origin main
```

Μετά πάλι κάνεις:

```bash
bt-sync frontend
```

## PM2 Processes

Τα live processes είναι:

```text
billiardtoday-frontend
strapi-prod
billiardtoday-admin
scoreboard
billiardtoday-ws
```

Γενικός έλεγχος:

```bash
pm2 list
```

## Σημαντικό

- Μην κάνεις deploy με σκέτο `git pull` μέσα στα `httpdocs`.
- Μην πειράζεις τα production env files από τα repos.
- Το `bt-sync` κρατάει τον server-side production config χωριστά από το source code.


## Για αρχείο host
138.201.29.162 billiardtoday.com
138.201.29.162 app.billiardtoday.com
138.201.29.162 admin.billiardtoday.com
138.201.29.162 scoreboard.billiardtoday.com
138.201.29.162 ws.billiardtoday.com
138.201.29.162 updates.billiardtoday.com
138.201.29.162 pgadmin.billiardtoday.com