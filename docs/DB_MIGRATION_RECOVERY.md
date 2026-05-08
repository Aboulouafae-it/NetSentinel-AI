# Database Migration Recovery

NetSentinel AI v2.0.0-alpha uses Alembic as the only supported schema creation
and migration path. The backend must not create or alter tables at application
startup.

## Golden Rule

Back up before touching schema state.

For appliance installs, run:

```bash
scripts/backup.sh --dry-run
scripts/backup.sh
```

For Docker Compose development environments, also preserve the PostgreSQL volume
or create a `pg_dump` before experimenting.

## Clean Install Path

A clean public-alpha database should be initialized with:

```bash
cd backend
DATABASE_URL=postgresql+asyncpg://netsentinel:<password>@postgres:5432/netsentinel \
  python -m alembic upgrade head
```

You can validate the clean migration chain without touching the default dev or
production volumes:

```bash
scripts/validate_clean_migrations.sh
```

That script starts an isolated temporary PostgreSQL container, runs
`alembic upgrade head`, verifies key tables and columns, and removes the
temporary container afterward.

## Detect Schema Drift

Check Alembic state:

```bash
docker compose exec backend python -m alembic current
docker compose exec backend python -m alembic history
```

Inspect important columns:

```bash
docker compose exec postgres psql -U netsentinel -d netsentinel -c "\d assets"
docker compose exec postgres psql -U netsentinel -d netsentinel -c "\d field_measurements"
docker compose exec postgres psql -U netsentinel -d netsentinel -c "select * from alembic_version;"
```

Known drift symptoms from pre-alpha development databases include:

- tables exist but `alembic_version` is missing or stale
- `assets.last_seen` is missing
- `field_measurements` is missing organization or wireless link columns
- PostgreSQL enum types exist but Alembic has not recorded the revision that
  created them

## When Stamping Is Safe

`alembic stamp head` is only safe when all of these are true:

- you have a verified backup
- the live schema has been manually compared with the current model/migration
  schema
- every required table, column, index, foreign key, and enum exists
- you are intentionally telling Alembic that the database already matches head

Do not stamp a database just to silence migration errors. Stamping a broken
schema hides the problem and can cause later data loss or API failures.

## When Stamping Is Not Safe

Do not stamp when:

- required columns such as `assets.last_seen` are missing
- required tables such as `field_measurements` are missing
- enum/type collisions happen during upgrade
- you are unsure whether old development startup-time `create_all` created a
  partial schema
- the database contains production or customer data and has not been backed up

## Development / RC Rebuild

For local RC databases with no important data, the safest recovery is usually to
create a fresh database or a separate Compose project name and run migrations
from zero:

```bash
docker compose -p netsentinel-rc2 up --build -d postgres redis
docker compose -p netsentinel-rc2 run --rm backend python -m alembic upgrade head
```

Only remove development volumes when you are certain they contain no data worth
preserving.

## Production / Appliance Recovery

For appliance-like deployments:

1. Stop writes if possible.
2. Run and verify a backup.
3. Record `alembic current`, `alembic history`, and table definitions.
4. Compare the schema against a clean validation database.
5. Decide whether to repair missing columns/tables with explicit migrations or
   rebuild from backup.
6. Stamp only after the schema is confirmed to match the target revision.

Never delete PostgreSQL volumes casually on an installed appliance.
