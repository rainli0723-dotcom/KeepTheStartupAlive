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

Run the LLM worker as a separate process:

```bash
KTSA_APP_URL="https://your-domain.example.com" npm run worker:llm
```

For smoke testing one queued job:

```bash
KTSA_APP_URL="https://your-domain.example.com" npm run worker:llm:once
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

## Production Acceptance Checklist

Before selling or delivering KTSA as a To B product, verify the following in a real PostgreSQL staging environment:

- `DATABASE_URL` uses `postgresql://` or `postgres://`, not SQLite.
- `npm run prisma:generate:prod` completes successfully.
- `npm run db:prod:migrate` applies all migrations without drift.
- `npm run db:prod:status` reports the database is up to date.
- `/api/health` returns healthy database and application status.
- A new enterprise account can register and log in.
- A second enterprise account cannot see the first tenant's workspaces, team members, meetings, reports, or share links.
- Viewer users cannot create, update, delete, import, distill, or export protected business data.
- Company document upload returns immediately and creates an `LlmJob` for background analysis.
- The LLM worker can process `organization.analyze_profile` jobs and update the organization profile.
- `npm run worker:llm:once` can process one queued job without relying on a user page request.
- Simulation cycle generation creates one business event, one meeting, and 2-3 decision options.
- PDF, Word, PPT, and Markdown exports work against PostgreSQL data.
- Backup restore has been tested into a separate staging database.

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

Recommended environment split:

- `staging`: test migrations, LLM worker, report export, backup restore, and customer demos with non-production data.
- `production`: customer data only, restricted admin access, managed backups, and separate LLM key.
- `local`: SQLite demo database only. Never copy `prisma/dev.db` into staging or production.

## Connection Pooling

Use a managed PostgreSQL pooler or platform connection pool. For early pilots:

- Web app pool: 2-10 connections.
- LLM worker pool: 1-3 connections.
- Migration connection: direct database connection, not transaction-pooling mode when migrations require DDL.

Monitor connection saturation before increasing worker concurrency.

## Data Migration From SQLite

For early customers, export from SQLite using Prisma or a one-off script, then import into PostgreSQL after mapping tenant IDs. Do not reuse the local `prisma/dev.db` file in production.

## Tenant Data Export

Export a single tenant for backup, migration, or customer handoff:

```bash
npm run tenant:export -- --tenant=<tenantId> --out=tenant-export.json
```

The export includes tenant members, users without password hashes, workspaces, organization documents, team members, meetings, finales, share links, audit logs, LLM logs, jobs, and prompt versions.
