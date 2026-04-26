SCRIPT_DIR="$(dirname "${BASH_SOURCE[0]}")"

COMPOSE_PATH="${SCRIPT_DIR}/../docker-compose.yml"
ENV_FILE=${SCRIPT_DIR}/../../.env.dev

# Stop services
docker compose --env-file ${ENV_FILE} -f ${COMPOSE_PATH} down -v

# Restart services
docker compose --env-file ${ENV_FILE} -f ${COMPOSE_PATH} up -d