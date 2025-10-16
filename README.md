# Billiard Today - Frontend Application

Next.js frontend application για τουρνουά μπιλιάρδου, ενσωματωμένο στο WordPress site στο path `/tournaments`.

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Το app θα τρέχει στο: `http://localhost:3022/tournaments`

### Production Build

```bash
# Build για production
npm run build

# Start production server
npm start
```

## 🏗️ Αρχιτεκτονική

```
billiardtoday.com (WordPress)
└── /tournaments/* → Next.js Frontend (port 3022)

app.billiardtoday.com → Strapi CMS API
admin.billiardtoday.com → Next.js Admin Backend (καταχώρηση αποτελεσμάτων)
scoreboard.billiardtoday.com → Scoreboard App (live scores)
```

## 📁 Δομή Project

```
billiardtoday-frontend/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── layout.tsx    # Root layout με SEO metadata
│   │   ├── page.tsx      # Home page (/tournaments)
│   │   └── ...
│   └── lib/
│       └── api.ts        # Strapi API helpers
├── next.config.js        # Next.js configuration
├── server.js             # Custom server
├── ecosystem.config.js   # PM2 configuration
└── DEPLOYMENT.md         # Deployment instructions
```

## 🔧 Configuration

### Environment Variables

Δημιουργήστε `.env.local` για development:

```env
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
NEXT_PUBLIC_SITE_URL=http://localhost:3022
NEXT_PUBLIC_SCOREBOARD_URL=http://localhost:3001
NEXT_PUBLIC_ADMIN_URL=http://localhost:3000
```

Για production, χρησιμοποιήστε `.env.production`:

```env
NEXT_PUBLIC_STRAPI_URL=https://app.billiardtoday.com
NEXT_PUBLIC_SITE_URL=https://billiardtoday.com
NEXT_PUBLIC_SCOREBOARD_URL=https://scoreboard.billiardtoday.com
NEXT_PUBLIC_ADMIN_URL=https://admin.billiardtoday.com
```

### Next.js Config

Το `next.config.js` έχει ρυθμιστεί με:

- **basePath**: `/tournaments` - Όλα τα routes θα είναι κάτω από αυτό το path
- **assetPrefix**: `/tournaments` - Για σωστό loading των static assets
- **Image optimization**: Για images από Strapi
- **SEO headers**: Security και performance headers

## 🔌 API Integration

### Strapi API

Χρησιμοποιήστε τα helpers από `src/lib/api.ts`:

```typescript
import { getTournaments, getTournament, getTournamentStages } from '@/lib/api'

// Fetch all tournaments
const { data: tournaments } = await getTournaments()

// Fetch single tournament
const { data: tournament } = await getTournament('tournament-id')

// Fetch tournament stages/groups
const stages = await getTournamentStages('tournament-id')
```

### Scoreboard Integration

```typescript
import { getScoreboardUrl, getAdminUrl } from '@/lib/api'

// Link to live scoreboard
const scoreboardUrl = getScoreboardUrl('tournament-id')
// Returns: https://scoreboard.billiardtoday.com/tournament-id

// Link to admin panel
const adminUrl = getAdminUrl('/tournament/event-stages')
// Returns: https://admin.billiardtoday.com/tournament/event-stages
```

## 🎨 Styling

Το project χρησιμοποιεί **Tailwind CSS** για styling.

```tsx
<div className="container mx-auto px-4 py-8">
  <h1 className="text-3xl font-bold text-gray-900">
    Τουρνουά
  </h1>
</div>
```

## 📱 SEO

Το app είναι SEO-optimized με:

- ✅ Server-Side Rendering (SSR)
- ✅ Metadata API για dynamic meta tags
- ✅ Canonical URLs
- ✅ Open Graph tags
- ✅ Twitter Cards
- ✅ Structured data (JSON-LD) - ready to add
- ✅ Sitemap generation - ready to add

### Παράδειγμα Dynamic Metadata

```typescript
// app/[tournamentId]/page.tsx
export async function generateMetadata({ params }) {
  const { data: tournament } = await getTournament(params.tournamentId)
  
  return {
    title: tournament.title,
    description: tournament.description,
    openGraph: {
      title: tournament.title,
      description: tournament.description,
    }
  }
}
```

## 🚀 Deployment

Δείτε το [DEPLOYMENT.md](./DEPLOYMENT.md) για λεπτομερείς οδηγίες deployment.

### Quick Deploy

```bash
# 1. Build
npm run build

# 2. Upload to server
# (χρησιμοποιήστε git, FTP, ή rsync)

# 3. Install dependencies στον server
npm ci --production

# 4. Start με PM2
pm2 start ecosystem.config.js
```

## 🔒 Security

- Όλα τα API calls γίνονται server-side όπου είναι δυνατόν
- Environment variables δεν εκτίθενται στον client (εκτός από NEXT_PUBLIC_*)
- Security headers ενεργοποιημένα στο next.config.js
- CORS ρυθμίσεις στο Strapi

## 🧪 Testing

```bash
# Run linter
npm run lint

# Type checking
npx tsc --noEmit
```

## 📊 Monitoring

Με PM2:

```bash
# Real-time monitoring
pm2 monit

# Logs
pm2 logs billiardtoday-frontend

# Status
pm2 status
```

## 🐛 Troubleshooting

### Το app δεν φορτώνει στο /tournaments

1. Ελέγξτε ότι το PM2 process τρέχει: `pm2 status`
2. Ελέγξτε τα logs: `pm2 logs billiardtoday-frontend`
3. Ελέγξτε το Nginx config στο Plesk

### Images δεν φορτώνουν

Βεβαιωθείτε ότι το domain του Strapi είναι στο `images.domains` στο `next.config.js`

### 404 errors για static assets

Ελέγξτε ότι το `assetPrefix` είναι σωστά ρυθμισμένο στο `next.config.js`

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Strapi Documentation](https://docs.strapi.io)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [PM2 Documentation](https://pm2.keymetrics.io/docs)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test locally
4. Submit PR

## 📝 License

Private project - Billiard Today
