# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Pre-alpha home inventory app. Phase 0 (monorepo scaffolding, CI, root tooling) is complete. All sub-packages (`api/`, `web/`, `mobile/`, `shared/`, `infra/`) are empty stubs — Phase 1+ work has not started. The build plan lives in `home-inventory-todo.md`.

## Commands

Run from the repo root unless noted.

```bash
# Lint (gts)
pnpm lint

# Typecheck
pnpm run compile

# Fix lint issues automatically
pnpm fix

# Run all tests (no tests yet; placeholder exits 1)
pnpm test

# Run tests for a specific package (once packages exist)
pnpm --filter api test

# Clean build output
pnpm clean
```

CI runs `compile` then `lint` on every PR against `main`.

## Architecture

pnpm workspaces monorepo. Planned tiers:

- **`api/`** — Fastify + TypeScript backend; Prisma ORM against PostgreSQL 16; structured logging via Pino
- **`worker/`** — BullMQ worker sharing code with `api/`; runs reminder sweeps on a cron schedule via Redis
- **`web/`** — React + Vite + Tailwind + shadcn/ui
- **`mobile/`** — Expo React Native (iOS + Android); uses `expo-camera` for barcode scanning
- **`shared/`** — shared TS types + typed API client generated from the backend's OpenAPI spec (`openapi-typescript`); imported by both `web/` and `mobile/`
- **`infra/`** — `docker-compose.yml`, Caddyfile, deploy scripts

Auth uses JWT access tokens + refresh tokens stored in Redis. Multi-tenancy is enforced via `household_id` on every tenant table — every household-scoped query must filter by it.

## Tooling

- **TypeScript** config extends `gts/tsconfig-google.json` (Google TypeScript Style); output goes to `build/`
- **gts** handles both linting and formatting; `pnpm fix` auto-corrects style issues
- **ESLint** config is at `eslint.config.js` with ignores in `eslint.ignores.js`

## Local dev (once infra is scaffolded)

```bash
# Start backing services
docker compose up -d postgres redis caddy

# Run DB migrations and seed
pnpm --filter api db:migrate
pnpm --filter api db:seed          # creates dev@example.com / password123

# Start API, worker, web in separate terminals
pnpm --filter api dev
pnpm --filter worker dev
pnpm --filter web dev
```

Web: http://localhost:5173 · API docs: https://api.localhost/docs · Health: https://api.localhost/v1/health

After generating or changing the OpenAPI spec, regenerate the typed client:

```bash
pnpm --filter shared generate
```
