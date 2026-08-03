---
title: "🏗 Αρχιτεκτονική Συστήματος"
sidebar_position: 1
---

# 🏗 Αρχιτεκτονική Συστήματος

Το BilliardToday αποτελείται από **6 services** (5 σε production) που επικοινωνούν μεταξύ τους μέσω REST, GraphQL και WebSocket.

## Services Overview

| # | Service | URL | Port | Τεχνολογία |
|---|---------|-----|------|------------|
| 1 | **Strapi CMS** | app.billiardtoday.com | 1337 | Strapi + PostgreSQL |
| 2 | **Next.js Admin** | admin.billiardtoday.com | 3002 | Next.js + NextAuth |
| 3 | **Scoreboard** | scoreboard.billiardtoday.com | 3001 | Next.js + Electron |
| 4 | **Public Frontend** | billiardtoday.com | 3022 | Next.js |
| 5 | **WebSocket Server** | ws.billiardtoday.com | 3010 | Node.js |
| — | **MediaMTX** | live.billiardtoday.com | 1935/8554/8889 | Docker/systemd |

## Αρχιτεκτονικό Διάγραμμα

👉 [Άνοιγμα διαγράμματος σε νέα καρτέλα](/diagrams/billiardtoday-system-overview.html)

## Data Flow

- **REST/GraphQL:** Όλα τα apps (Admin, Scoreboard, Frontend) → Strapi CMS για CRUD
- **WebSocket:** Scoreboard ↔ WS Server ↔ Frontend για real-time updates
- **Streaming:** Scoreboard (Electron/Android/Browser) → MediaMTX → Frontend (θεατές)

## Auth Tokens

| Token | Χρήση |
|-------|-------|
| `STRAPI_API_TOKEN` | Διαφορετικό ανά app για πρόσβαση στο Strapi API |
| `NEXT_PUBLIC_WS_TOKEN` | WebSocket authentication |
| `SCREEN_ACTIVATION_SECRET` | Ενεργοποίηση οθονών scoreboard |
| `NEXTAUTH_SECRET` | NextAuth session encryption (Admin) |

## Production Deploy

```bash
# Primary deploy method: bt-sync helper
bt-sync frontend   # → billiardtoday.com
bt-sync app        # → app.billiardtoday.com
bt-sync admin      # → admin.billiardtoday.com
bt-sync scoreboard # → scoreboard.billiardtoday.com
bt-sync ws         # → ws.billiardtoday.com
```

**Server:** 138.201.29.162 (Hetzner)  
**PM2 processes:** strapi-prod, billiardtoday-admin, scoreboard, billiardtoday-frontend, billiardtoday-ws