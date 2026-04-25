-- NetSentinel AI — PostgreSQL Initialization

-- The database is automatically created by the POSTGRES_DB env var in docker-compose.
-- This script runs after creation to set up extensions.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
