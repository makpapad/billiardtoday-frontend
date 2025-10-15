# Οδηγίες Deployment για Billiard Today Frontend

## Προαπαιτούμενα στον Server

1. **Node.js** (v18 ή νεότερο)
2. **PM2** για process management
3. **Nginx** reverse proxy (μέσω Plesk)

## Βήματα Deployment

### 1. Ανέβασμα Κώδικα στον Server

```bash
# Στον local υπολογιστή
cd d:\Projects\billiardtoday-frontend
npm run build

# Upload στον server (χρησιμοποιήστε FTP ή git)
# Προτείνεται git για version control
```

### 2. Εγκατάσταση Dependencies στον Server

```bash
cd /var/www/vhosts/billiardtoday.com/billiardtoday-frontend
npm ci --production
```

### 3. Ρύθμιση Environment Variables

Δημιουργήστε το αρχείο `.env.production`:

```
NEXT_PUBLIC_STRAPI_URL=https://app.billiardtoday.com
NEXT_PUBLIC_SITE_URL=https://billiardtoday.com
NEXT_PUBLIC_ADMIN_URL=https://admin.billiardtoday.com
NEXT_PUBLIC_SCOREBOARD_URL=https://scoreboard.billiardtoday.com
NODE_ENV=production
PORT=3022
```

### 4. Εκκίνηση με PM2

```bash
# Πρώτη φορά
pm2 start ecosystem.config.js

# Για restart
pm2 restart billiardtoday-frontend

# Για monitoring
pm2 monit

# Για logs
pm2 logs billiardtoday-frontend

# Αυτόματη εκκίνηση μετά από reboot
pm2 startup
pm2 save
```

### 5. Nginx Configuration στο Plesk

Πηγαίνετε στο Plesk → billiardtoday.com → Apache & nginx Settings → Additional nginx directives:

```nginx
# Reverse proxy για το /tournaments path
location /tournaments {
    proxy_pass http://localhost:3022;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    
    # Timeout settings
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}

# Static assets για Next.js
location /_next/static {
    proxy_pass http://localhost:3022/_next/static;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    
    # Cache static assets
    expires 365d;
    add_header Cache-Control "public, immutable";
}

location /_next/image {
    proxy_pass http://localhost:3022/_next/image;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}
```

### 6. Έλεγχος Λειτουργίας

```bash
# Τοπικά στον server
curl http://localhost:3022/tournaments

# Από browser
https://billiardtoday.com/tournaments
```

## Update/Redeploy

```bash
# 1. Pull νέο κώδικα
cd /var/www/vhosts/billiardtoday.com/billiardtoday-frontend
git pull origin main

# 2. Install dependencies (αν χρειάζεται)
npm ci --production

# 3. Build
npm run build

# 4. Restart
pm2 restart billiardtoday-frontend
```

## Troubleshooting

### Το app δεν ξεκινάει
```bash
pm2 logs billiardtoday-frontend --lines 100
```

### Port 3022 είναι σε χρήση
```bash
lsof -i :3022
# ή
netstat -tulpn | grep 3022
```

### Nginx errors
```bash
tail -f /var/log/nginx/error.log
```

### Clear PM2 logs
```bash
pm2 flush
```

## Performance Optimization

### 1. Enable Gzip στο Nginx (στο Plesk)
Ενεργοποιήστε το gzip compression για text/html, text/css, application/javascript

### 2. CDN (προαιρετικό)
Για static assets μπορείτε να χρησιμοποιήσετε Cloudflare

### 3. Monitoring
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## Security Checklist

- ✅ Firewall: Μόνο port 80, 443 exposed
- ✅ Port 3022 accessible μόνο από localhost
- ✅ SSL Certificate εγκατεστημένο
- ✅ Environment variables σε .env (όχι στο git)
- ✅ Regular updates: `npm audit fix`

## Σύνδεση με WordPress

Το Next.js app θα είναι διαθέσιμο στο:
- https://billiardtoday.com/tournaments

Το WordPress site θα συνεχίσει να λειτουργεί κανονικά σε όλα τα άλλα paths.

## Σύνδεση με Strapi

Το app συνδέεται αυτόματα με το Strapi API στο:
- https://app.billiardtoday.com

Βεβαιωθείτε ότι το Strapi έχει τα σωστά CORS settings:
```js
// config/middlewares.js στο Strapi
cors: {
  enabled: true,
  origin: ['https://billiardtoday.com', 'https://scoreboard.billiardtoday.com']
}
```
