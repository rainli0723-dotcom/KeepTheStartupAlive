#!/bin/bash
# SQLite to PostgreSQL data migration
# Usage: ./scripts/db/migrate-sqlite-to-pg.sh
# Requires: sqlite3, psql, DATABASE_URL pointing to PostgreSQL

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}/../.."
SQLITE_DB="${PROJECT_DIR}/prisma/dev.db"
BACKUP_DIR="${PROJECT_DIR}/backups"

if [ ! -f "$SQLITE_DB" ]; then
  echo "ERROR: SQLite database not found at $SQLITE_DB"
  exit 1
fi

# Load PostgreSQL DATABASE_URL
if [ -f "${PROJECT_DIR}/.env" ]; then
  export $(grep -v '^#' "${PROJECT_DIR}/.env" | xargs)
fi

PG_URL="${DATABASE_URL:-}"
if [ -z "$PG_URL" ] || [[ "$PG_URL" != postgresql://* ]]; then
  echo "ERROR: DATABASE_URL must point to PostgreSQL."
  echo "Current: ${PG_URL:0:20}..."
  echo "Uncomment the PostgreSQL DATABASE_URL in .env first."
  exit 1
fi

echo "=== SQLite → PostgreSQL Data Migration ==="
echo "Source: $SQLITE_DB"
echo "Target: ${PG_URL:0:40}..."
echo ""

# Step 1: Export SQLite data as SQL dump
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
DUMP_FILE="${BACKUP_DIR}/sqlite-export-${TIMESTAMP}.sql"

echo "[1/4] Exporting SQLite data..."
sqlite3 "$SQLITE_DB" <<SQL > "$DUMP_FILE"
.mode insert
.output '${DUMP_FILE}'
.dump
.quit
SQL
echo "       Exported to $DUMP_FILE ($(wc -l < "$DUMP_FILE") lines)"

# Step 2: Convert SQLite SQL to PostgreSQL-compatible SQL
PG_DUMP="${BACKUP_DIR}/pg-import-${TIMESTAMP}.sql"
echo "[2/4] Converting SQLite SQL to PostgreSQL format..."
cat "$DUMP_FILE" | \
  sed 's/INTEGER PRIMARY KEY AUTOINCREMENT/SERIAL PRIMARY KEY/g' | \
  sed 's/DATETIME/TIMESTAMP/g' | \
  sed "s/'t'/TRUE/g" | sed "s/'f'/FALSE/g" | \
  sed 's/\\/\\\\/g' \
  > "$PG_DUMP"
echo "       Converted to $PG_DUMP"

# Step 3: Apply Prisma migrations to PostgreSQL (schema only)
echo "[3/4] Applying Prisma migrations to PostgreSQL..."
cd "$PROJECT_DIR"
npx prisma migrate deploy --schema prisma-postgres/schema.prisma
echo "       Schema migrations applied."

# Step 4: Import data
echo "[4/4] Importing data into PostgreSQL..."
# Extract PG connection details
PG_USER=$(echo "$PG_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
PG_PASS=$(echo "$PG_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
PG_HOST=$(echo "$PG_URL" | sed -n 's|.*@\([^:/]*\).*|\1|p')
PG_PORT=$(echo "$PG_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
PG_DB=$(echo "$PG_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
PG_PORT="${PG_PORT:-5432}"

# Import only INSERT statements (skip CREATE TABLE — Prisma handles schema)
grep "^INSERT INTO" "$PG_DUMP" | \
  PGPASSWORD="$PG_PASS" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" \
  --set ON_ERROR_STOP=0 2>&1 | tail -5

echo ""
echo "=== Migration Complete ==="
echo "Verify: psql \"$PG_URL\" -c \"SELECT COUNT(*) FROM \\\"EnterpriseTenant\\\";\""
echo "If successful, update .env DATABASE_URL to: $PG_URL"
