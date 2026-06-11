# KTSA Production PostgreSQL Deployment

This project keeps SQLite as the local demo database and provides a separate PostgreSQL profile for production.

## Local Development

Use the default Prisma schema:

```bash
npm install
cp .env.example .env
npm run db:push
npm run dev
```

Default local database:

```env
DATABASE_URL="file:./dev.db"
```

## Production Database

Use the PostgreSQL schema in `prisma-postgres/schema.prisma`.

Required production environment:

```env
DATABASE_URL="postgresql://ktsa_user:change-me@db.example.com:5432/ktsa?schema=public"
NODE_ENV="production"
LLM_BASE_URL="https://api.deepseek.com/v1"
LLM_API_KEY="your-production-llm-api-key"
LLM_MODEL="deepseek-chat"
LLM_TIMEOUT_MS="120000"
LLM_MAX_RETRIES="2"
LLM_WORKER_TOKEN="change-me-worker-token"
```

Deploy production migrations:

```bash
npm run prisma:generate:prod
npm run db:prod:migrate
npm run build
npm start
```

Check migration status:

```bash
npm run db:prod:status
```

## Notes

- `src/lib/bootstrap-db.ts` only bootstraps SQLite for local demo usage. It skips bootstrap when `DATABASE_URL` starts with `postgres://` or `postgresql://`.
- Production must use `prisma-postgres/migrations`, not the SQLite migrations under `prisma/migrations`.
- Use a managed PostgreSQL service with connection pooling enabled. Start with 2-10 pooled connections for a small pilot and scale after observing request concurrency.
- Keep backups outside the application process. Recommended minimum: daily full backup, point-in-time recovery, and a restore drill before selling to enterprise customers.

## Migration Flow

1. Apply migrations in staging with `npm run db:prod:migrate`.
2. Run `npm run build` and a smoke test against staging.
3. Snapshot production database.
4. Apply migrations in production.
5. Run `npm run db:prod:status` and `/api/health`.

## Backup and Restore

Recommended minimum:

- Daily full backup.
- Point-in-time recovery if the database provider supports it.
- Monthly restore drill into a disposable staging database.
- Backup retention: 30 days for pilot customers, 90+ days for contracted enterprise customers unless the DPA states otherwise.

## Data Retention

Default recommendation:

- Active workspace data: retained while the customer account is active.
- Deleted workspace data: hard-deleted through the tenant deletion controls.
- Audit logs: retained for at least 365 days.
- LLM call logs: retained for at least 180 days, with request content represented by hashes and metadata instead of full prompts.
- Share links: default expiry of 30 days.

## Staging and Production

Use separate databases, environment variables, LLM keys, and worker tokens for staging and production. Never point staging at the production database.

## Data Migration From SQLite

For early customers, export from SQLite using Prisma or a one-off script, then import into PostgreSQL after mapping tenant IDs. Do not reuse the local `prisma/dev.db` file in production.
