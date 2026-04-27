# api/CLAUDE.md

Fastify + TypeScript backend for the home inventory app.

## Current state

- Fastify and Prisma installed; no routes implemented yet
- Prisma schema at [prisma/schema.prisma](prisma/schema.prisma) — stub `User` model only; one migration applied (`20260426232125_init`)
- No `dev` script yet; no test harness yet

## Scripts

```bash
# From the repo root:
pnpm --filter api db:migrate   # prisma migrate dev
pnpm --filter api db:push      # prisma db push (no migration file)
pnpm --filter api db:studio    # open Prisma Studio
pnpm --filter api db:generate  # regenerate Prisma client
```

## Environment

Prisma reads `DATABASE_URL` from `/.env.dev` at the repo root (loaded via `prisma.config.ts`). Make sure that file exists and points at the running `db` container before running any `db:*` command.

Example value (matches `.env.dev.example`):

```
DATABASE_URL="postgresql://johndoe:password@localhost:5432/database"
```

## Planned Phase 1 additions

- `GET /v1/health`
- `@fastify/swagger` + `@fastify/swagger-ui` at `/docs`
- `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit`
- Pino structured logging with per-env log levels
- Vitest + Supertest smoke test against `/v1/health`
- PgBouncer connection pooling (Prisma `DATABASE_URL` will point at PgBouncer, not Postgres directly)
