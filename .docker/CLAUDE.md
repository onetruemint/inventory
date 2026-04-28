# .docker/CLAUDE.md

Docker Compose configuration for local backing services.

## Services

| Service   | Image                  | Port(s)    | Notes                        |
|-----------|------------------------|------------|------------------------------|
| `db`      | postgres:18            | 5432       | Data volume: `postgres_data` |
| `adminer` | adminer:5.4.2          | 8080       | DB admin UI                  |
| `redis`   | redis:8.6.2            | 6379       | AOF persistence enabled; data volume: `redis_data` |
| `caddy`   | caddy:2.11.2-alpine    | 80, 443    | Reverse proxy; TLS config pending |

PgBouncer is not yet in the compose file — it will be added on branch `2-add-pgbouncer-and-redis-aof-persistence`.

## Starting services

```bash
# Convenience script (stops then restarts all services)
bash .docker/scripts/start-services.sh

# Or directly:
docker compose --env-file .env.dev -f .docker/docker-compose.yml up -d
docker compose --env-file .env.dev -f .docker/docker-compose.yml down -v
```

The compose file reads image tags and Postgres credentials from `/.env.dev` at the repo root. Copy `.env.dev.example` and fill in values before first run.

## Environment variables consumed

| Variable        | Used by          |
|-----------------|------------------|
| `POSTGRES_IMG`  | `db` image tag   |
| `POSTGRES_USER` | Postgres + `DATABASE_URL` |
| `POSTGRES_PASS` | Postgres + `DATABASE_URL` |
| `POSTGRES_DB`   | Postgres + `DATABASE_URL` |
| `ADMINER_IMG`   | `adminer` image tag |
| `REDIS_IMG`     | `redis` image tag |
| `CADDY_IMG`     | `caddy` image tag |
