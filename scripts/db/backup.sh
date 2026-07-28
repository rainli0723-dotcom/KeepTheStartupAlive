#!/bin/bash
# KTSA Production Database Backup Script
# Usage: ./scripts/db/backup.sh [staging|production]
# Requires: pg_dump (PostgreSQL client), DATABASE_URL env var or .env.production

set -euo pipefail

ENV="${1:-production}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/../../backups"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/ktsa-${ENV}-${TIMESTAMP}.sql.gz"

# Load env
if [ -f "${SCRIPT_DIR}/../../.env.production" ]; then
  export $(grep -v '^#' "${SCRIPT_DIR}/../../.env.production" | xargs)
fi

DATABASE_URL="${DATABASE_URL:-}"

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL not set. Please set it in .env.production or export it."
  exit 1
fi

# Parse DATABASE_URL
# postgresql://user:pass@host:5432/dbname?schema=public
DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:/]*\).*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
DB_PORT="${DB_PORT:-5432}"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup: ${ENV} → ${BACKUP_FILE}"

PGPASSWORD="$DB_PASS" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-acl \
  --compress=9 \
  > "$BACKUP_FILE"

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup complete: ${BACKUP_FILE} (${SIZE})"

# Keep last 30 days of backups
find "$BACKUP_DIR" -name "ktsa-${ENV}-*.sql.gz" -mtime +30 -delete

echo "[$(date)] Cleanup complete. Remaining backups for ${ENV}: $(find "$BACKUP_DIR" -name "ktsa-${ENV}-*.sql.gz" | wc -l)"
