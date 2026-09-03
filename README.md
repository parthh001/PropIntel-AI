<div align="center">

# 🏠 PropIntel

### AI-Powered Property Intelligence Platform

A full-stack property intelligence platform for Indian land records — survey numbers, owner/court/government records, and risk matching — built with **Next.js**, **TypeScript**, and **Prisma**.

<p>

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?logo=sqlite)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38BDF8?logo=tailwindcss)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)

</p>

</div>

---

## Status

Built for a hackathon (Round 3 finalist). All external data providers (OCR, government records, court records, news, AI matching, risk engine, notifications) are currently **mocked** — see [Provider Status](#provider-status) below. The app runs end-to-end on mock data; nothing here talks to a real government/court/news API yet.

---

## Overview

PropIntel combines property records, document upload + OCR, court/news/gov-record lookups, risk matching, notifications, and an admin panel into one Next.js application. Auth, property CRUD, and the dashboard are functional against a local SQLite database; the "intelligence" providers are pluggable and swap from mock to real implementations via environment variables, without touching the calling code.

---

## Features

**Authentication** — registration, login, JWT access/refresh tokens, role-based access control, session management

**Property Management** — create, edit, delete, search/filter, property detail pages, map view (Leaflet)

**Document Handling** — upload, OCR (Tesseract.js), validation, property attachments

**Analytics** — dashboard, property stats, reports (Recharts)

**Intelligent Matching** — property matching engine, risk analysis, recommendation logic (mock provider)

**Notifications** — notification center, preferences, alerts

**Admin Panel** — user management, broker/owner management, system monitoring

---

## Tech Stac

| Category | Technologies |
|----------|--------------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | SQLite (via `better-sqlite3` + Prisma driver adapter) |
| ORM | Prisma 6 |
| Auth | Hand-rolled JWT (access + refresh tokens), bcryptjs |
| Maps | Leaflet / react-leaflet |
| OCR | Tesseract.js |
| Testing | Vitest (unit / integration / e2e folders) |
| DevOps | Docker, Docker Compose |
| CI/CD | GitHub Actions |

> Earlier drafts of this README described a PostgreSQL backend — that was inaccurate. The project runs on SQLite via Prisma's `better-sqlite3` adapter (see `prisma/schema.prisma`); `DATABASE_URL` points at a local `.db` file, not a Postgres connection string.

---

## Provider Status

External integrations are behind a provider registry (`src/lib/providers/registry.ts`) so they can be swapped from mock to real without code changes. Right now, every one of them defaults to mock unless overridden in `.env`:

| Provider | Env var | Current default |
|---|---|---|
| OCR | `PROVIDER_OCR` | mock |
| Government records | `PROVIDER_GOV_RECORDS` | mock |
| Court records | `PROVIDER_COURT_RECORDS` | mock |
| News | `PROVIDER_NEWS` | mock |
| AI agent / matching | `PROVIDER_AI_AGENT` | mock |
| Risk engine | `PROVIDER_RISK_ENGINE` | mock |
| Notifications | `PROVIDER_NOTIFICATION` | mock |
| Storage | `PROVIDER_STORAGE` | local |

Be upfront about this when presenting or demoing — the UI and data flow are real, the external data sources behind them are not (yet).

---

## Project Structure

```text
propintel/
├── .github/workflows/
├── prisma/               # schema, seed scripts, dev.db (gitignored)
├── src/
│   ├── app/               # Next.js App Router pages/routes
│   ├── components/
│   ├── lib/                # auth, providers, validation, db client
│   ├── modules/            # domain services (properties, notifications, ...)
│   └── context/
├── __tests__/             # unit / integration / e2e
├── data/seed/
├── scripts/setup.sh
├── Dockerfile
├── docker-compose.yml
└── package.json
```

---

## Getting Started

### Install dependencies

```bash
npm install
```

### Configure environment variables

```bash
cp .env.example .env
```

At minimum, set real values for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` before deploying anywhere beyond your own machine — see [Security Notes](#security-notes).

### Set up the database

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### Start the dev server

```bash
npm run dev
```

Open http://localhost:3000

---

## Testing

```bash
npm test           # watch mode
npm run test:run   # single run
npm run test:coverage
```

---

## Docker

```bash
docker-compose up --build
```

---

## Security Notes

- `src/lib/auth/jwt.ts` falls back to hardcoded default secrets (`dev-access-secret-change-in-production-min-32-chars` / `dev-refresh-...`) when `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` are unset. Fine for local dev, **not safe to deploy as-is** — anyone who reads this file knows the default token-signing key. Always set real secrets via environment variables before deploying.
- `.env`, `.env.local`, and `*.db` are gitignored — keep it that way. Don't commit real provider API keys or the local SQLite file.
- Both `bcrypt` and `bcryptjs` are listed as dependencies; only `bcryptjs` is actually imported in `src`. `bcrypt` can be removed to cut install size/native-build overhead.

---

## Roadmap

- Replace mock providers with real government/court/news data sources
- Real-time risk scoring
- Mobile application
- Multi-tenant support

---

## Team

Built for a hackathon by team **Hackathon Hang**.

---

## License

MIT
