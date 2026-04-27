# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Pre-alpha home inventory app. The build plan lives in `home-inventory-todo.md`.

**Phase 0** — complete (monorepo scaffolding, CI, root tooling).

**Phase 1** — in progress (local infra & API skeleton):
- Docker Compose written with postgres, redis, adminer, caddy — see [.docker/](.docker/)
- Prisma installed in `api/`; initial migration run; stub `User` model only
- Fastify installed in `api/`; no routes implemented yet
- PgBouncer and Redis AOF persistence pending (branch `2-add-pgbouncer-and-redis-aof-persistence`)
- `/v1/health`, Swagger, CORS, helmet, rate-limit, Pino, Caddy config, Vitest not yet done

`web/`, `mobile/`, `shared/`, `infra/` are empty stubs.

## Repository layout

```
.docker/        docker-compose.yml + startup scripts
api/            Fastify + Prisma backend
web/            React + Vite (stub)
mobile/         Expo React Native (stub)
shared/         Shared TS types + API client (stub)
infra/          Caddyfile + deploy scripts (stub)
```

## Root commands

Run from the repo root.

```bash
pnpm lint          # gts lint
pnpm run compile   # tsc
pnpm fix           # gts fix (auto-correct style)
pnpm test          # placeholder — exits 1 until tests exist
pnpm clean         # remove build/
```

CI runs `compile` then `lint` on every PR against `main`.

## Architecture

pnpm workspaces monorepo:

- **`api/`** — Fastify + TypeScript; Prisma ORM against PostgreSQL; Pino logging
- **`worker/`** — BullMQ worker (planned); shares code with `api/`; Redis-backed cron sweeps
- **`web/`** — React + Vite + Tailwind + shadcn/ui
- **`mobile/`** — Expo React Native (iOS + Android); `expo-camera` for barcode scanning
- **`shared/`** — shared TS types + typed API client from OpenAPI spec (`openapi-typescript`)

Auth: JWT access tokens + refresh tokens in Redis. Multi-tenancy via `household_id` on every tenant table — every household-scoped query must filter by it.

## Tooling

- TypeScript config extends `gts/tsconfig-google.json`; output goes to `build/`
- **gts** handles linting and formatting
- ESLint config: [eslint.config.js](eslint.config.js), ignores: [eslint.ignores.js](eslint.ignores.js)

## Local dev

```bash
# 1. Copy and fill in env vars
cp .env.dev.example .env.dev

# 2. Start backing services
bash .docker/scripts/start-services.sh

# 3. Run DB migrations (from repo root)
pnpm --filter api db:migrate

# 4. Start API (script TBD)
pnpm --filter api dev
```

Web: http://localhost:5173 · API docs: https://api.localhost/docs · Health: https://api.localhost/v1/health

After changing the OpenAPI spec, regenerate the typed client:

```bash
pnpm --filter shared generate
```
