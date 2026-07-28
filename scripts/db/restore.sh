#!/bin/bash
# KTSA Production Database Restore Script
# Usage: ./scripts/db/restore.sh <backup-file.sql.gz>
# WARNING: This will OVERWRITE the target database!

set -euo pipefail

BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  echo "Available backups:"
  ls -lh "$(dirname "$0")/../../backups/"*.sql.gz 2>/dev/null || echo "  (none found)"
  exit 1
fi

if [ -f .env.production ]; then
  export $(grep -v '^#' .env.production | xargs)
fi

DATABASE_URL="${DATABASE_URL:-}"
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL not set."
  exit 1
fi

DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:/]*\).*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
DB_PORT="${DB_PORT:-5432}"

echo "WARNING: This will overwrite database '$DB_NAME' on $DB_HOST!"
echo "Backup file: $BACKUP_FILE"
read -rp "Type 'yes' to confirm: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo "[$(date)] Starting restore..."

# Disconnect existing connections
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
  "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$DB_NAME' AND pid <> pg_backend_pid();" 2>/dev/null || true

# Drop and recreate
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
  "DROP DATABASE IF EXISTS ${DB_NAME}_restore;" 2>/dev/null || true

PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
  "CREATE DATABASE ${DB_NAME}_restore OWNER $DB_USER;" 2>/dev/null || true

gunzip -c "$BACKUP_FILE" | PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "${DB_NAME}_restore"

echo "[$(date)] Restore complete to ${DB_NAME}_restore."
echo "To swap, run: psql -c 'ALTER DATABASE ${DB_NAME} RENAME TO ${DB_NAME}_old; ALTER DATABASE ${DB_NAME}_restore RENAME TO ${DB_NAME};'"
