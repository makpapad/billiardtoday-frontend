---
title: "🔄 Data Flow & API Contracts"
sidebar_position: 2
---

# 🔄 Data Flow & API Contracts

Πώς ρέουν τα δεδομένα μεταξύ των services του BilliardToday.

👉 [Άνοιγμα διαγράμματος Data Flow](/diagrams/billiardtoday-data-flow.html)

## REST / GraphQL Flow

Όλα τα client apps (Admin, Scoreboard, Frontend) επικοινωνούν με το **Strapi CMS** μέσω REST/GraphQL:

```
Client App → Strapi API (STRAPI_API_TOKEN) → PostgreSQL
```

- **Read:** `GET /api/{content-type}` — φόρτωση δεδομένων
- **Write:** `POST/PUT /api/{content-type}` — αποθήκευση σκορ, παικτών κ.λπ.

## WebSocket Events

### Server → Client (broadcasts)
| Event | Περιγραφή |
|-------|-----------|
| `score:update` | Live score updates (player stats, innings, time) |
| `match:end` | Ολοκλήρωση αγώνα + τελικά stats |
| `SESSION_ASSIGNED` | Room/session assignment κατά τη σύνδεση |
| `LIVE_SYNC_DELAY_UPDATED` | Sync delay για live θεατές |
| `presence:*` | Online χρήστες, club rooms |

### Client → Server (commands)
| Command | Περιγραφή |
|---------|-----------|
| `subscribe:club` | Εγγραφή σε club room για live updates |
| `unsubscribe:club` | Αποχώρηση από club room |
| `score:submit` | Υποβολή score data από το scoreboard |

## Type Generation

Όταν αλλάζουν τα content-types στο Strapi:
```bash
cd 1-BilliardTodayAdmin
npm run generate-types
```
Τα TypeScript types διανέμονται στα apps 2, 3, 4.

## Critical Rules
- ⚠️ Ποτέ μην επεξεργάζεσαι production `.env` από το repo
- ⚠️ Το `bt-sync` διατηρεί το server-side `.env`
- ⚠️ Διαφορετικό `STRAPI_API_TOKEN` ανά app
- ⚠️ Τα WS events είναι contracts — συντόνισε αλλαγές σε όλα τα apps