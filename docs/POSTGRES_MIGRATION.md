# Supabase migration status

The PostgreSQL migration is being developed on `feature/supabase-postgres-migration`. It is intentionally separate from `main`.

## Foundation added

- `migrations/001_initial_schema.sql`: PostgreSQL schema for the current CampusFlow entities.
- `src/config/postgres.js`: PostgreSQL connection pool and transaction helper.
- `src/scripts/migrate.js`: SQL migration runner.
- `src/services/submissionStorage.js`: private Supabase Storage upload/download/delete helper.
- Supabase environment variable examples in the root `.env.example`.

## Not ready to deploy

The application routes, middleware, repositories, seed script, and integration tests still use the synchronous SQLite interface. They have **not** yet been migrated to asynchronous PostgreSQL queries. Submission upload/download routes also still use local disk storage.

Do not deploy this branch as a PostgreSQL-backed application and do not run it against production data yet. The PostgreSQL schema runner only prepares the database; it does not migrate existing SQLite records.

## Remaining work

1. Convert all database access to parameterized asynchronous PostgreSQL queries.
2. Preserve transaction boundaries and role/department authorization checks.
3. Convert upload handling to memory-backed Multer, retain signature and malware validation, and persist objects in the private Supabase Storage bucket.
4. Convert file downloads to authorized server-side Storage downloads.
5. Update seed and integration tests for PostgreSQL.
6. Verify the full test suite and production build.
7. Document the one-time SQLite data export/import path, if existing local records need to be retained.

Never commit `DATABASE_URL`, `SUPABASE_SECRET_KEY`, or any other credentials.
