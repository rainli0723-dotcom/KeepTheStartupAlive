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
- Keep backups outside the application process. Recommended minimum: daily full backup, point-in-time recovery, and a restore drill before selling to enterprise customers.
