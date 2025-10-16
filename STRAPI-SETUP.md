# Strapi Configuration για Billiard Today Frontend

## CORS Settings

Στο Strapi project (`app.billiardtoday.com`), ρυθμίστε το CORS για να επιτρέπει requests από το frontend.

### 1. Ανοίξτε το αρχείο: `config/middlewares.js` (ή `.ts`)

```javascript
module.exports = [
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            'dl.airtable.com',
            'billiardtoday.com',
            'app.billiardtoday.com',
          ],
          'media-src': [
            "'self'",
            'data:',
            'blob:',
            'dl.airtable.com',
            'billiardtoday.com',
            'app.billiardtoday.com',
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      origin: [
        'https://billiardtoday.com',
        'https://www.billiardtoday.com',
        'https://admin.billiardtoday.com',
        'https://scoreboard.billiardtoday.com',
        'http://localhost:3022', // Frontend development
        'http://localhost:3000', // Admin development
        'http://localhost:3001', // Scoreboard development
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
      keepHeaderOnError: true,
    },
  },
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
```

## API Permissions

Βεβαιωθείτε ότι τα εξής endpoints είναι public (Settings → Users & Permissions Plugin → Public):

### BT Tournament
- ✅ `find` - GET /api/bt-tournaments
- ✅ `findOne` - GET /api/bt-tournaments/:id

### BT Event Stage
- ✅ `find` - GET /api/bt-event-stages
- ✅ `findOne` - GET /api/bt-event-stages/:id

### BT Player (αν χρειάζεται)
- ✅ `find` - GET /api/bt-players
- ✅ `findOne` - GET /api/bt-players/:id

## Environment Variables στο Strapi

Στο `.env` του Strapi:

```env
# Frontend URLs
FRONTEND_URL=https://billiardtoday.com
TOURNAMENTS_URL=https://billiardtoday.com/tournaments
ADMIN_URL=https://admin.billiardtoday.com
SCOREBOARD_URL=https://scoreboard.billiardtoday.com

# CORS Origins (comma separated)
CORS_ORIGINS=https://billiardtoday.com,https://admin.billiardtoday.com,https://scoreboard.billiardtoday.com
```

## Webhooks (προαιρετικό)

Για real-time updates, μπορείτε να ρυθμίσετε webhooks:

Settings → Webhooks → Create new webhook

**URL**: `https://billiardtoday.com/tournaments/api/revalidate`

**Events**:
- `entry.create` - bt-tournament
- `entry.update` - bt-tournament
- `entry.delete` - bt-tournament
- `entry.update` - bt-event-stage

## API Response Format

Το Strapi v5 επιστρέφει data σε αυτό το format:

```json
{
  "data": [
    {
      "id": 1,
      "documentId": "abc123",
      "title": "Tournament Title",
      "description": "Description",
      "startDate": "2025-01-15",
      "status": "ongoing",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 1,
      "total": 1
    }
  }
}
```

## Testing API

### Test από command line:

```bash
# Get all tournaments
curl https://app.billiardtoday.com/api/bt-tournaments

# Get single tournament
curl https://app.billiardtoday.com/api/bt-tournaments/abc123

# Get with population
curl "https://app.billiardtoday.com/api/bt-tournaments?populate=*"
```

### Test από browser:

Ανοίξτε:
- https://app.billiardtoday.com/api/bt-tournaments
- https://app.billiardtoday.com/api/bt-event-stages

Θα πρέπει να δείτε JSON response (όχι 403 ή CORS error).

## Image URLs

Τα images από το Strapi θα έχουν URLs όπως:

```
https://app.billiardtoday.com/uploads/image_name_123abc.jpg
```

Βεβαιωθείτε ότι το `uploads` folder είναι accessible.

## Rate Limiting (προαιρετικό)

Για production, προσθέστε rate limiting:

```javascript
// config/middlewares.js
{
  name: 'strapi::ratelimit',
  config: {
    interval: { min: 1 },
    max: 100, // 100 requests per minute
    delayAfter: 50,
    timeWait: 1000,
    prefixKey: 'billiardtoday:',
  },
}
```

## Monitoring

Ελέγξτε τα Strapi logs για API requests:

```bash
pm2 logs strapi
```

## Troubleshooting

### CORS Errors στο Browser

1. Ελέγξτε το `config/middlewares.js`
2. Κάντε restart το Strapi: `pm2 restart strapi`
3. Clear browser cache
4. Ελέγξτε τα Network tab στο DevTools

### 403 Forbidden

1. Ελέγξτε τα API permissions (Settings → Users & Permissions)
2. Βεβαιωθείτε ότι τα endpoints είναι public
3. Ελέγξτε αν χρειάζεται authentication

### Images δεν φορτώνουν

1. Ελέγξτε το `public/uploads` folder permissions
2. Ελέγξτε το nginx/apache config για το `/uploads` path
3. Βεβαιωθείτε ότι το domain είναι στο `images.domains` του Next.js

## Security Checklist

- ✅ CORS ρυθμισμένο σωστά
- ✅ Μόνο απαραίτητα endpoints είναι public
- ✅ Rate limiting ενεργοποιημένο
- ✅ HTTPS enabled
- ✅ API tokens secured
- ✅ Regular backups
- ✅ Monitoring enabled

## Next Steps

Μετά τη ρύθμιση του Strapi:

1. Test τα API endpoints
2. Deploy το frontend
3. Test την ολοκληρωμένη εφαρμογή
4. Setup monitoring
5. Configure backups
