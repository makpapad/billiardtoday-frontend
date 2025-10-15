# Setup Summary - Billiard Today Frontend

## Αρχιτεκτονική Συστήματος

```
billiardtoday.com/tournaments → Frontend (port 3022) ─┐
admin.billiardtoday.com → Admin Backend (port 3000) ──┼→ app.billiardtoday.com (Strapi)
scoreboard.billiardtoday.com → Scoreboard (port 3001) ┘
```

## Τι έχει γίνει

### 1. Next.js Configuration
- next.config.js ρυθμισμένο με basePath /tournaments
- SEO optimization
- Image optimization για Strapi
- Environment variables

### 2. SEO & Metadata
- layout.tsx με πλήρες SEO metadata
- Open Graph και Twitter Cards
- Greek locale
- Canonical URLs

### 3. API Integration
- lib/api.ts με Strapi helpers
- TypeScript interfaces
- Helper functions
- Scoreboard integration

### 4. Deployment Files
- .env.production
- ecosystem.config.js για PM2
- nginx-plesk.conf
- deploy.sh script

### 5. Documentation
- README.md
- DEPLOYMENT.md
- STRAPI-SETUP.md

## Επόμενα Βήματα

### Local Development

1. npm install
2. Create .env.local
3. npm run dev
4. Open http://localhost:3022/tournaments

### Production Deployment

1. Upload code στον server
2. npm ci --production
3. npm run build
4. pm2 start ecosystem.config.js
5. Configure Nginx στο Plesk (χρησιμοποιήστε nginx-plesk.conf)
6. Configure Strapi CORS (δείτε STRAPI-SETUP.md)
7. Test https://billiardtoday.com/tournaments

## Αρχεία που δημιουργήθηκαν

- next.config.js (updated)
- src/app/layout.tsx (updated)
- src/lib/api.ts (updated)
- .env.production (new)
- ecosystem.config.js (new)
- nginx-plesk.conf (new)
- deploy.sh (new)
- README.md (new)
- DEPLOYMENT.md (new)
- STRAPI-SETUP.md (new)
- SETUP-SUMMARY.md (new)

## Ports & Services

- Frontend: 3022 (billiardtoday.com/tournaments)
- Admin: 3000 (admin.billiardtoday.com)
- Scoreboard: 3001 (scoreboard.billiardtoday.com)
- Strapi: 1337 (app.billiardtoday.com)

## URLs

- Frontend: https://billiardtoday.com/tournaments
- Admin Backend: https://admin.billiardtoday.com
- Strapi API: https://app.billiardtoday.com/api
- Scoreboard: https://scoreboard.billiardtoday.com
