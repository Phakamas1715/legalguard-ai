# Database Migrations

## Running Migrations

Apply the initial schema migration against your PostgreSQL database:

```bash
psql -h <host> -U <user> -d <database> -f backend/migrations/001_initial_schema.sql
```

Or via Supabase CLI:

```bash
supabase db push
```

## pg_cron Setup

After running the migration, set up the materialized view refresh schedule (requires the `pg_cron` extension):

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('refresh_dashboard_stats', '*/5 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_case_stats');
```

## Notes

- The migration creates all tables, indexes, and the `dashboard_case_stats` materialized view.
- `user_id` columns are plain UUIDs (not foreign keys to `auth.users`) to keep the schema portable across environments.
- The `REFRESH MATERIALIZED VIEW CONCURRENTLY` command requires a unique index on the view. If concurrent refresh is needed, create one first:

```sql
CREATE UNIQUE INDEX ON dashboard_case_stats (court_type, year, document_type);
```
