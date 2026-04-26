# Home Inventory — MVP Build TODO

Target: production-ready MVP across **API + web + mobile (iOS/Android)**, built solo, part-time.

Phases are ordered so that each one leaves you with something working end-to-end. Don't skip ahead — each phase de-risks the next. Rough pacing assumes ~8–12 hrs/week; adjust to taste.

---

## Phase 0 — Foundations (week 1)

Get the skeleton up so you can ship code on day one of real feature work.

- [x] Register a domain (Namecheap/Cloudflare); park it for now
- [x] Create a private GitHub monorepo: `/api`, `/web`, `/mobile`, `/infra`, `/shared`
- [x] Set up [pnpm workspaces](https://pnpm.io/workspaces) so shared TS types work across packages
- [x] Add root `.editorconfig`, `.prettierrc`, ESLint config shared across packages
- [x] Configure GitHub Actions: lint + typecheck on every PR (no tests yet, that's fine)
- [x] Write a one-page `README.md` with the architecture summary and local-dev steps (update as you go)
- [x] Pick a project management tool — GitHub Projects is enough; don't over-engineer
- [x] Create three milestones in GH: `MVP-Alpha`, `MVP-Beta`, `MVP-Launch`

---

## Phase 1 — Local infra & API skeleton (week 2)

End state: `docker compose up` gives you Postgres, Redis, and a Fastify server that returns `{ok:true}` on `/v1/health`.

- [x] Write `docker-compose.yml` with `postgres:16`, `redis:7`, `api` (Node 20), `worker`, `caddy`
- [x] Add volumes for Postgres data and Caddy certs
- [x] Add `.env.example` and a loader (`dotenv` or Fastify's env plugin) — never commit real `.env`
- [x] Scaffold `/api`: Fastify + TypeScript + `tsx` for dev reload
- [ ] Install Prisma; create initial schema file (empty models for now)
- [ ] Wire Prisma client; run `prisma migrate dev` against local Postgres
- [ ] Add PgBouncer to `docker-compose.yml` and point Prisma's `DATABASE_URL` at it — Prisma opens one connection per query worker and will exhaust Postgres connections under any real load without a pooler
- [ ] Configure Redis with AOF persistence (`appendonly yes`) so BullMQ jobs survive a Redis restart
- [ ] Add `/v1/health` endpoint
- [ ] Add `@fastify/swagger` + `@fastify/swagger-ui` — OpenAPI docs live at `/docs`
- [ ] Add `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit`
- [ ] Add structured logging (Pino is built in; set log levels per env)
- [ ] Configure Caddy to reverse-proxy `api.localhost` → `api:3000` with local TLS
- [ ] Scaffold Vitest + Supertest; write one smoke test against `/v1/health` — sets up the test harness before you write real business logic
- [ ] Commit; verify `curl https://api.localhost/v1/health` works

---

## Phase 2 — Auth & tenancy (week 3)

End state: users can register, log in, get a JWT, and every request is scoped to their household.

- [ ] Prisma models: `User`, `Household`, `HouseholdMember` (with role enum)
- [ ] Migration + seed script that creates a test user + household
- [ ] `POST /v1/auth/register` — creates user + default household in one transaction
- [ ] `POST /v1/auth/login` — returns access + refresh token pair
- [ ] `POST /v1/auth/refresh` — rotate on use: issue a new refresh token, invalidate the old one; a reused refresh token should invalidate the entire family (detect theft)
- [ ] `POST /v1/auth/logout` — invalidates refresh token (store refresh tokens in Redis)
- [ ] Fastify `preHandler` that verifies JWT, attaches `req.user` and `req.householdId`
- [ ] Household-scoping helper: every query goes through a function that injects `household_id` — don't rely on developers remembering
- [ ] `POST /v1/households/:id/invite` — creates an invite token (email delivery comes later)
- [ ] `POST /v1/households/join` — accepts invite token
- [ ] Write a few integration tests with Vitest + Supertest covering auth happy paths and one failure case per endpoint
- [ ] Rate-limit `/auth/*` aggressively (5 req/min per IP)

---

## Phase 3 — Core inventory domain (weeks 4–5)

End state: full CRUD for products and inventory items via API, with a real product catalog growing from barcode scans.

- [ ] Prisma models: `Product`, `InventoryItem`, `UsageEvent` (see architecture doc)
- [ ] Migrations, plus indexes on `products.barcode`, `inventory_items.household_id`, `inventory_items.expiry_date`
- [ ] `GET /v1/products/:barcode` — cache-first lookup:
  - [ ] Check local `products` table
  - [ ] Fall back to Open Food Facts API
  - [ ] Fall back to UPCitemdb (needs free API key)
  - [ ] Persist result to `products`, return normalized shape
- [ ] Wrap external lookups in a `ProductLookupService` class with a clean interface — easy to swap/mock
- [ ] Handle external API failures gracefully (timeout, retry once, then return "unknown product, enter manually")
- [ ] `POST /v1/inventory` — create item (accepts product_id OR raw fields for manual entry)
- [ ] `GET /v1/inventory` — list with filters: `?location=`, `?low_stock=true`, `?expiring_within_days=7`
- [ ] `GET /v1/inventory/:id`
- [ ] `PATCH /v1/inventory/:id` — partial update
- [ ] `DELETE /v1/inventory/:id` — soft delete (add `deleted_at`); hard-delete only via admin path
- [ ] `POST /v1/inventory/scan` — accepts barcode + quantity + location, looks up product, creates item
- [ ] `POST /v1/inventory/:id/consume` — body `{delta}`; writes a `UsageEvent`, updates quantity atomically in a transaction
- [ ] Validate everything with JSON schemas (Fastify does this for you; you get free OpenAPI + request validation)
- [ ] Integration tests for each endpoint, including tenancy isolation (user A can't touch user B's items)

---

## Phase 4 — Reminder engine (week 6)

End state: reminders are generated on schedule and queryable. Delivery comes next phase.

- [ ] Prisma model: `Reminder` with type enum, status enum, `payload_json`
- [ ] Scaffold `/worker` as a separate entrypoint (same codebase, different npm script)
- [ ] Install BullMQ; connect to Redis
- [ ] Define a single `reminders-sweep` cron job, runs every hour
- [ ] Implement `lowStockCheck(householdId)` — flag items where `quantity <= low_stock_threshold`
- [ ] Implement `expiringCheck(householdId)` — flag items expiring within household's configured window (default 7 days)
- [ ] Implement `predictedRestockCheck(householdId)`:
  - [ ] Pull last 30 days of `usage_events` per item
  - [ ] Compute daily average consumption
  - [ ] Predict days-until-empty
  - [ ] Flag if below configured lead time (default 3 days)
- [ ] Dedup logic: don't create a new pending reminder if one already exists for the same `(item, type)`
- [ ] `GET /v1/reminders` — list pending for the household
- [ ] `PATCH /v1/reminders/:id` — dismiss or snooze (push `trigger_at` forward)
- [ ] Unit tests for the three checker functions against fixture data
- [ ] Add a `POST /v1/dev/run-sweep` endpoint (behind a dev flag) so you can trigger the job manually while testing

---

## Phase 5 — Notifications (week 7)

End state: reminders actually reach the user via push and email.

- [ ] Prisma model: `NotificationChannel` (type, address, verified)
- [ ] `POST /v1/me/channels` — register a push token or email
- [ ] `POST /v1/me/channels/:id/verify` — email verification flow
- [ ] Set up [Resend](https://resend.com) or [Postmark](https://postmarkapp.com) for email (free tiers are plenty)
- [ ] Build email templates with [react-email](https://react.email): verify address, reminder digest, household invite
- [ ] Integrate [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/) — server-side sender
- [ ] Extend the reminder sweep: after creating reminder rows, enqueue a `deliver-reminder` job per user
- [ ] `deliver-reminder` worker: fan out to the user's verified channels
- [ ] Handle Expo push failures (invalid token → mark channel inactive)
- [ ] Add user preference: digest frequency (immediate / daily / off) per reminder type
- [ ] Add quiet hours (no notifications 10pm–7am local time; store user's TZ)
- [ ] Test end-to-end: set an item to expire tomorrow, trigger sweep, confirm push + email arrive

---

## Phase 6 — Web app (weeks 8–9)

End state: a usable web UI covering every core flow. Design can be plain — Tailwind + a component library.

- [ ] Scaffold `/web`: Vite + React + TypeScript + React Router
- [ ] Install Tailwind + [shadcn/ui](https://ui.shadcn.com) (copy-in components, no lock-in)
- [ ] Decide on client-side state management (Zustand recommended — lightweight, no boilerplate); you need this before building protected routes and auth state
- [ ] Lock the OpenAPI spec shape: mark the backend's routes as stable before generating the shared client — mid-Phase-7 endpoint changes will break mobile
- [ ] Generate a typed API client from the backend's OpenAPI spec (`openapi-typescript` + `openapi-fetch`)
- [ ] Put the generated types in `/shared` so mobile uses the same client
- [ ] Add Sentry to the web app now — you want error visibility before handing it to beta users, not after
- [ ] Auth screens: login, register, forgot password
- [ ] Protected route wrapper; token refresh on 401
- [ ] Dashboard: low-stock count, expiring count, recent activity
- [ ] Inventory list with filters (location chips, search, sort)
- [ ] Inventory detail/edit drawer
- [ ] Add item flow: manual entry form with product autocomplete (calls `/products/:barcode` on paste)
- [ ] Web barcode scan: [ZXing-JS](https://github.com/zxing-js/library) with webcam; falls back to manual if no camera
- [ ] Consume flow: one-tap "used one" button on list items; optimistic update
- [ ] Reminders page: list, dismiss, snooze
- [ ] Household settings: members, invites, default reminder thresholds
- [ ] User settings: notification channels, quiet hours, TZ
- [ ] Empty states and error states for every screen (don't skip these — cheapest UX win)
- [ ] Make sure it's responsive on a phone browser; it's not the mobile app, but people will try
- [ ] Deploy preview on every PR (Netlify/Cloudflare Pages free tier)

---

## Phase 7 — Mobile app (weeks 10–11)

End state: iOS + Android app with native barcode scanning, push notifications, and the core inventory flows.

- [ ] Scaffold `/mobile` with Expo (SDK 51+), TypeScript, Expo Router
- [ ] Configure EAS Build (`eas build:configure`) early — building for a real device requires it; Expo Go is not a substitute for validating native modules like `expo-camera`
- [ ] Reuse the generated API client from `/shared`
- [ ] Add Sentry to the mobile app now (same rationale as web — errors before beta are invisible without it)
- [ ] Auth screens (login, register) with secure token storage ([expo-secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/))
- [ ] Bottom tab nav: Scan • Inventory • Reminders • Settings
- [ ] Scan tab: `expo-camera` barcode scanner → confirm quantity/location → save. This is the hero flow; make it fast (< 3 taps from app open to item saved)
- [ ] Inventory list with pull-to-refresh, swipe-to-consume, swipe-to-delete
- [ ] Inventory detail/edit screen
- [ ] Reminders list with inline actions
- [ ] Settings: notification prefs, household, logout
- [ ] Register push token on login; un-register on logout
- [ ] Handle offline: queue scans when offline, flush when reconnected (use [TanStack Query](https://tanstack.com/query/latest) with a persister)
- [ ] Deep link from push notification → relevant item
- [ ] Test on at least one real iOS + one real Android device
- [ ] App icons, splash screen, metadata

---

## Phase 8 — Hardening (week 12)

End state: not embarrassing under light adversarial conditions.

- [ ] Add [Sentry](https://sentry.io) to the **api** (web + mobile Sentry was added in Phases 6–7)
- [ ] Add uptime monitoring (UptimeRobot or Better Stack) against `/v1/health`
- [ ] Confirm rate limits make sense per endpoint — auth, scan, and writes should be stricter than reads
- [ ] Audit SQL: every household-scoped query must filter by `household_id` — write a Prisma middleware to enforce this and log violations
- [ ] Add `pg_dump` backup cron (daily, 7-day retention); test a restore on a throwaway box
- [ ] Add CSP and security headers via Caddy
- [ ] Review dependencies: `pnpm audit`, remove anything unused
- [ ] Load-test with [k6](https://k6.io): 50 concurrent users hitting common endpoints on your target host; fix anything that melts
- [ ] Write a privacy policy and terms of service (plain boilerplate is fine for MVP; put them on the marketing site)
- [ ] GDPR basics: `POST /v1/me/export` (data download) and `DELETE /v1/me` (full account deletion, cascades)
- [ ] Verify no PII in logs (Pino redaction config)
- [ ] Write a `RUNBOOK.md`: how to restart services, rotate secrets, restore from backup, handle a compromised token

---

## Phase 9 — Production deploy (week 13)

End state: users at your real domain, TLS, monitoring, and you can sleep at night.

- [ ] Pick a host. For self-hosted: a VPS (Hetzner CX22 ~€4/mo, or a Pi on your home network + Cloudflare Tunnel)
- [ ] Provision with a short bash script (or [Dokploy](https://dokploy.com) / [Coolify](https://coolify.io) if you want a GUI)
- [ ] DNS: point your domain at the host; configure Caddy with production TLS
- [ ] Set real production env vars (secrets via Doppler or the host's secret manager, not in `.env`)
- [ ] Run migrations against prod DB — for any migration that adds a NOT NULL column or drops/renames one, ensure it's backward-compatible with the running code before deploying (expand/contract pattern); a bad migration on a live DB is hard to undo
- [ ] Configure daily automated backups to off-host storage (Backblaze B2 is cheap)
- [ ] Deploy pipeline: GH Action builds images, SSHes to host, `docker compose pull && up -d`
- [ ] Set up staging env on same host (different compose project, different subdomain) so you can test deploys
- [ ] Submit mobile app to TestFlight (iOS) and Play Console Internal Testing (Android)
- [ ] Seed a few real products via scans; confirm the full flow end-to-end in production
- [ ] Send invite to 3–5 friends for closed beta

---

## Phase 10 — Launch (week 14)

End state: publicly available.

- [ ] Landing page (one static HTML or a small Next.js site) with screenshots, download links, privacy/ToS
- [ ] Submit iOS app for App Store review (expect 1–3 days, sometimes rejections; budget extra time)
- [ ] Submit Android app to Play Store production track
- [ ] Announce to 2–3 communities you actually belong to — not a spam blast
- [ ] Watch Sentry + uptime for the first week; fix anything loud
- [ ] Collect feedback in a single inbox (a shared email or a Canny board)

---

## What's intentionally NOT in the MVP

Resist adding these until post-launch — each one is a rabbit hole:

- Recipe integration / meal planning
- Shopping list export to other apps
- Shared family-member real-time updates (WebSockets) — polling is fine at MVP
- ML-based usage prediction (simple moving average is enough)
- Multi-language / i18n
- Dark mode theming beyond the default
- Admin panel (use a DB GUI like TablePlus for now)
- Fancy analytics dashboard

---

## Definition of Done for MVP

Before you call it launched, confirm:

- [ ] A new user can: sign up → scan a real barcode → save an item → receive a reminder → dismiss it → log out, all without your help
- [ ] Every destructive action has a confirm step or an undo
- [ ] Every screen has a reasonable empty state and error state
- [ ] You've restored a backup successfully at least once
- [ ] Sentry is catching errors and you've fixed (or triaged) each one
- [ ] You have a written plan for what you'll build next based on beta feedback, not based on what seems fun
