# Home Inventory

Track what you own, get reminded before you run out, and stop buying duplicate ketchup.

A self-hostable home inventory app with barcode scanning, expiry tracking, and smart restock reminders based on your actual usage patterns. Runs on a Raspberry Pi today, scales to the cloud when you need it to.

> **Status:** 🚧 Pre-alpha. Building toward MVP. See [TODO.md](./TODO.md) for the roadmap.

---

## Features (MVP scope)

- 📷 **Barcode scanning** on mobile (camera) and web (webcam), with lookups against Open Food Facts + UPCitemdb
- 📦 **Inventory CRUD** scoped to a household, with locations (pantry, fridge, garage, etc.)
- 🔔 **Three kinds of reminders:**
  - Low-stock when an item drops below your threshold
  - Predicted restock based on your average usage rate
  - Expiry warnings before food goes bad
- 👨‍👩‍👧 **Household sharing** — invite family members, everyone sees the same inventory
- 📱 **iOS + Android + Web** — same data, three clients
- 🔐 **Self-hostable** with `docker compose up`, or deploy to a managed cloud when you outgrow one box

---

## Architecture

Three tiers, deliberately boring:

```
┌──────────────────────────────────────────────────────────────┐
│                          Clients                             │
│   React Native (iOS/Android)    │    React + Vite (web)      │
└──────────────────────────────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                       Caddy (reverse proxy + TLS)            │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│              Fastify API (Node.js + TypeScript)              │
│   auth · inventory · products · reminders · notifications    │
│         OpenAPI docs at /docs · WebSockets ready             │
└──────────────────────────────────────────────────────────────┘
       │                        │                       │
       ▼                        ▼                       ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│  Postgres 16 │        │   Redis 7    │        │ BullMQ Worker│
│ (source of   │        │ (cache +     │        │ (reminder    │
│  truth)      │        │  job queue)  │        │  sweeps)     │
└──────────────┘        └──────────────┘        └──────────────┘
                                                       │
                                                       ▼
                                          ┌────────────────────────┐
                                          │ Push (Expo) + Email    │
                                          │ (Resend / Postmark)    │
                                          └────────────────────────┘
```

For a full architectural rationale see [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) *(coming soon)*.

---

## Repository layout

This is a [pnpm workspace](https://pnpm.io/workspaces) monorepo.

```
home-inventory/
├── api/             # Fastify + Prisma backend
├── worker/          # BullMQ worker (shares code with api)
├── web/             # React + Vite web client
├── mobile/          # Expo React Native app
├── shared/          # Shared TS types + generated API client
├── infra/           # docker-compose, Caddyfile, deploy scripts
├── docs/            # Architecture, runbook, ADRs
├── TODO.md          # The build plan
└── README.md
```

Anything that needs to be shared between clients (e.g. the typed API client generated from the backend's OpenAPI spec) lives in `shared/` so it can be imported by both `web/` and `mobile/`.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Backend | Node.js 20 + TypeScript + [Fastify](https://fastify.dev) | Fast, schema-first, free OpenAPI |
| ORM | [Prisma](https://prisma.io) | Type-safe queries, painless migrations |
| Database | PostgreSQL 16 | Boring, durable, multi-tenant via `household_id` |
| Cache + queue | Redis 7 + [BullMQ](https://docs.bullmq.io) | Cron jobs for reminder sweeps |
| Web | React + Vite + Tailwind + [shadcn/ui](https://ui.shadcn.com) | Fast iteration, no lock-in |
| Mobile | [Expo](https://expo.dev) (React Native) | Single codebase, OTA updates, easy native APIs |
| Auth | JWT + refresh tokens (refresh stored in Redis) | Simple, stateless on the hot path |
| Reverse proxy | [Caddy](https://caddyserver.com) | Automatic Let's Encrypt, one-line config |
| Notifications | [Expo Push](https://docs.expo.dev/push-notifications/overview/) + [Resend](https://resend.com) | Free tiers cover the MVP |
| Monitoring | [Sentry](https://sentry.io) + uptime checks | Free tiers cover the MVP |

See [`docs/adr/`](./docs/adr) for the reasoning behind each major choice *(ADRs to be added as decisions are made)*.

---

## Quick start (local development)

### Prerequisites

- [Node.js 20+](https://nodejs.org)
- [pnpm 9+](https://pnpm.io/installation)
- [Docker](https://www.docker.com) + Docker Compose
- An [Open Food Facts](https://world.openfoodfacts.org) account is *not* required (read-only API)
- A free [UPCitemdb](https://www.upcitemdb.com/api/) API key for non-food fallback lookups

### Set up

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USERNAME/home-inventory.git
cd home-inventory
pnpm install

# 2. Copy environment file and fill in secrets
cp .env.example .env

# 3. Start Postgres, Redis, Caddy
docker compose up -d postgres redis caddy

# 4. Run database migrations and seed a test user
pnpm --filter api db:migrate
pnpm --filter api db:seed

# 5. Start the API and worker (in separate terminals)
pnpm --filter api dev
pnpm --filter worker dev

# 6. Start the web app
pnpm --filter web dev

# 7. (Optional) Start the mobile app
pnpm --filter mobile dev
```

Then visit:

- Web app: <http://localhost:5173>
- API docs (Swagger UI): <https://api.localhost/docs>
- Health check: <https://api.localhost/v1/health>

> **First time?** You'll need to trust Caddy's local CA. Run `caddy trust` once.

### Test credentials

The seed script creates a sample household with one user:

- Email: `dev@example.com`
- Password: `password123`

Don't ship this to prod. The seed only runs in `NODE_ENV=development`.

---

## Common scripts

Run from the repo root unless noted.

```bash
# Lint and typecheck everything
pnpm lint
pnpm typecheck

# Run all tests
pnpm test

# Run tests for one package
pnpm --filter api test

# Generate the typed API client for web/mobile from the backend's OpenAPI spec
pnpm --filter shared generate

# Create a new Prisma migration after editing schema.prisma
pnpm --filter api db:migrate-dev -- --name your_migration_name

# Reset the local database (destroys data)
pnpm --filter api db:reset

# Trigger a reminder sweep manually (dev only)
curl -X POST https://api.localhost/v1/dev/run-sweep
```

---

## Environment variables

See [`.env.example`](./.env.example) for the full list with comments. The essentials:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Signing secret for access tokens (rotate via env, no code change) |
| `JWT_REFRESH_SECRET` | Separate secret for refresh tokens |
| `UPCITEMDB_API_KEY` | Fallback product lookups |
| `RESEND_API_KEY` | Email delivery |
| `EXPO_ACCESS_TOKEN` | Push notifications |
| `SENTRY_DSN` | Error tracking (optional in dev) |

**Never commit a real `.env` file.** Secrets in production live in a secret manager (Doppler, the host's vault, etc.), not in version control.

---

## Testing strategy

- **Unit tests** for pure logic — reminder math, date helpers, product lookup parsers
- **Integration tests** (Vitest + Supertest) for every API endpoint, including tenancy isolation checks
- **E2E** comes post-MVP; for now, the manual smoke test in [`docs/SMOKE_TEST.md`](./docs/SMOKE_TEST.md) is the gate before deploy *(coming soon)*

CI runs lint + typecheck on every PR; tests on every push to `main`.

---

## Deployment

Two supported paths:

### Self-hosted (default)

A single VPS or home server running `docker compose up -d`. Caddy handles TLS via Let's Encrypt. Daily `pg_dump` to off-host storage. Suitable for a single household up to ~thousands of items.

See [`infra/README.md`](./infra/README.md) for the full deploy runbook *(coming soon)*.

### Cloud-managed

When usage outgrows one box, the migration path is mechanical because no part of the app assumes local disk:

- Postgres → managed (Neon, Supabase, RDS, Cloud SQL)
- Redis → Upstash, ElastiCache, Memorystore
- API + worker containers → Fly.io, Cloud Run, ECS/Fargate
- Caddy → load balancer + (optionally) a managed API gateway for WAF/quotas

Multi-tenancy is already in the schema (`household_id` on every tenant table), so you don't have to refactor to onboard external users.

---

## Contributing

This is currently a solo project, but if that changes:

- Branch from `main`; PRs require passing lint + typecheck + tests
- Conventional commits (`feat:`, `fix:`, `chore:`...) — used to generate the changelog
- Architectural decisions go in [`docs/adr/`](./docs/adr) as numbered markdown files
- One feature per PR; keep them small enough to review in one sitting

---

## Privacy

Your inventory data lives in your database. The app makes outbound calls only to:

- **Open Food Facts** and **UPCitemdb** — sends only the barcode, not your inventory
- **Expo Push** and your email provider — sends notification payloads to your registered devices/addresses
- **Sentry** (if configured) — error reports with PII redacted via Pino's redaction rules

Full privacy policy at `/privacy` once the marketing site is up.

---

## License

TBD. Likely AGPL-3.0 (so commercial forks must contribute back) but not finalized. Until a `LICENSE` file is committed, all rights reserved.

---

## Acknowledgments

- [Open Food Facts](https://world.openfoodfacts.org) for an extraordinary open product database
- The Fastify, Prisma, and Expo teams for tools that make this kind of project possible solo
