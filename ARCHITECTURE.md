# Billiard Today - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    billiardtoday.com (WordPress)                 │
│                                                                   │
│  ┌─────────────────┐  ┌──────────────────────────────────────┐ │
│  │  WordPress Site │  │  /tournaments/* (Reverse Proxy)      │ │
│  │  (Main Content) │  │  → Next.js Frontend (port 3022)      │ │
│  └─────────────────┘  └──────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    │ API Calls
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│              app.billiardtoday.com (Strapi CMS)                  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Content Types:                                           │  │
│  │  - bt-tournaments                                         │  │
│  │  - bt-event-stages                                        │  │
│  │  - bt-players                                             │  │
│  │  - bt-groups (matches)                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                    │                           │
                    │                           │
        ┌───────────┴────────┐     ┌───────────┴────────────┐
        │                    │     │                        │
        ▼                    ▼     ▼                        ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ admin.billiard   │  │ scoreboard.      │  │ billiardtoday.   │
│ today.com        │  │ billiardtoday.   │  │ com/tournaments  │
│                  │  │ com              │  │                  │
│ Next.js Admin    │  │                  │  │ Next.js Frontend │
│ Backend          │  │ Live Scoreboard  │  │ (Public View)    │
│                  │  │ App              │  │                  │
│ - Καταχώρηση    │  │ - Real-time      │  │ - Tournament     │
│   αποτελεσμάτων │  │   scores         │  │   listings       │
│ - Διαχείριση    │  │ - Match updates  │  │ - Results        │
│   τουρνουά      │  │                  │  │ - SEO optimized  │
│ - Auth required │  │                  │  │                  │
│                  │  │                  │  │                  │
│ Port: 3000       │  │ Port: 3001       │  │ Port: 3022       │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

## Data Flow

### 1. Admin Creates/Updates Tournament
```
Admin User → admin.billiardtoday.com → Strapi API → Database
```

### 2. Public Views Tournament
```
User → billiardtoday.com/tournaments → Next.js Frontend → Strapi API → Data
```

### 3. Live Scoreboard
```
Viewer → scoreboard.billiardtoday.com → Strapi API → Real-time Updates
```

## Technology Stack

### Frontend (billiardtoday.com/tournaments)
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Deployment**: PM2 + Nginx Reverse Proxy
- **Port**: 3022

### Admin Backend (admin.billiardtoday.com)
- **Framework**: Next.js (existing)
- **Purpose**: Καταχώρηση αποτελεσμάτων, διαχείριση τουρνουά
- **Auth**: NextAuth.js (assumed)
- **Port**: 3000

### Scoreboard (scoreboard.billiardtoday.com)
- **Framework**: Next.js (assumed)
- **Purpose**: Live scores display
- **Port**: 3001

### CMS (app.billiardtoday.com)
- **Framework**: Strapi v5
- **Database**: PostgreSQL/MySQL (assumed)
- **Port**: 1337

### WordPress (billiardtoday.com)
- **CMS**: WordPress
- **Purpose**: Main website content
- **Integration**: Nginx reverse proxy για /tournaments

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Plesk Server                            │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    Nginx (Reverse Proxy)               │ │
│  │                                                        │ │
│  │  billiardtoday.com/*        → WordPress              │ │
│  │  billiardtoday.com/tournaments/* → localhost:3022    │ │
│  │  admin.billiardtoday.com    → localhost:3000         │ │
│  │  scoreboard.billiardtoday.com → localhost:3001       │ │
│  │  app.billiardtoday.com      → localhost:1337         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    PM2 Process Manager                 │ │
│  │                                                        │ │
│  │  - billiardtoday-frontend (port 3022)                │ │
│  │  - billiardtoday-admin (port 3000)                   │ │
│  │  - billiardtoday-scoreboard (port 3001)              │ │
│  │  - strapi (port 1337)                                │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Security

### CORS Configuration
Strapi CORS allows:
- `https://billiardtoday.com`
- `https://admin.billiardtoday.com`
- `https://scoreboard.billiardtoday.com`

### Authentication
- **Admin Backend**: Protected με NextAuth
- **Frontend**: Public access
- **Scoreboard**: Public access
- **Strapi Admin**: Protected με Strapi auth

### API Access
- **Public endpoints**: Tournament listings, results (read-only)
- **Protected endpoints**: Create/Update/Delete (admin only)

## SEO Strategy

### Frontend (/tournaments)
- ✅ Server-Side Rendering (SSR)
- ✅ Dynamic metadata per tournament
- ✅ Canonical URLs
- ✅ Open Graph tags
- ✅ Sitemap generation (ready to implement)
- ✅ Structured data (ready to implement)

### URL Structure
```
billiardtoday.com/tournaments              → Tournament listings
billiardtoday.com/tournaments/[id]         → Tournament detail
billiardtoday.com/tournaments/[id]/results → Tournament results
```

## Performance Optimization

### Caching Strategy
- **Static assets**: 365 days cache
- **API responses**: 60 seconds revalidation
- **Images**: Next.js Image Optimization
- **Nginx**: Gzip compression

### CDN (Optional)
- Cloudflare για static assets
- Edge caching για API responses

## Monitoring & Logging

### PM2 Monitoring
```bash
pm2 monit                    # Real-time monitoring
pm2 logs [app-name]          # Application logs
pm2 status                   # Process status
```

### Log Rotation
- Automatic με pm2-logrotate
- Keep 7 days of logs
- Max 10MB per log file

## Backup Strategy

### Database Backups
- Daily automated backups
- Keep 30 days
- Store offsite

### Code Backups
- Git repository
- Tagged releases
- Deployment artifacts

## Scalability Considerations

### Horizontal Scaling (Future)
- Load balancer για multiple frontend instances
- Redis για session storage
- CDN για static assets

### Vertical Scaling (Current)
- PM2 cluster mode
- Nginx caching
- Database optimization

## Development Workflow

```
Local Development → Git Push → Server Pull → Build → PM2 Restart
```

### Environments
- **Development**: localhost με local Strapi
- **Staging**: (optional) staging.billiardtoday.com
- **Production**: billiardtoday.com

## API Endpoints

### Strapi API (app.billiardtoday.com)
```
GET  /api/bt-tournaments              # List tournaments
GET  /api/bt-tournaments/:id          # Get tournament
GET  /api/bt-event-stages             # List stages
GET  /api/bt-event-stages/:id         # Get stage
POST /api/bt-tournaments              # Create (admin only)
PUT  /api/bt-tournaments/:id          # Update (admin only)
```

### Admin API (admin.billiardtoday.com)
```
GET  /api/admin/tournament/...        # Admin operations
PUT  /api/admin/tournament/...        # Update operations
```

## Future Enhancements

- [ ] Real-time updates με WebSockets
- [ ] Push notifications για live matches
- [ ] Mobile app (React Native)
- [ ] Advanced analytics
- [ ] Player profiles & statistics
- [ ] Tournament brackets visualization
- [ ] Social media integration
- [ ] Multi-language support
