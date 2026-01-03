# Database Configuration Guide

## Current Setup Analysis

### Coolify Production (What You're Using)

Your production environment uses **Coolify's managed PostgreSQL service**:

```
Database Name: postgres
Host: mcs0sww0cwg4kgok4owkcwo0
Port: 5432
Connection String: postgres://postgres:***@mcs0sww0cwg4kgok4owkcwo0:5432/postgres
```

**Important:** Coolify does NOT use `docker-compose.prod.yml`. It manages containers separately.

### Docker Compose (Local/Self-Hosted)

The `docker-compose.prod.yml` file is for:
- Local testing with production-like setup
- Self-hosted deployments (not Coolify)
- Development teams who want to replicate production locally

## Issues Fixed

### 1. Prisma Schema Missing URL
**Before:**
```prisma
datasource db {
  provider = "postgresql"
}
```

**After:** ✅
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 2. Database Name Mismatch
**Before:**
- docker-compose defaulted to: `vlib`
- Coolify actual database: `postgres`
- Unused env var: `POSTGRES_DB=vlib`

**After:** ✅
- docker-compose now defaults to: `postgres`
- Matches Coolify setup
- Remove `POSTGRES_DB=vlib` from Coolify env vars (not needed)

## Environment Variables Cleanup

### Keep These (Currently Correct):
```bash
# Database connection (Coolify managed PostgreSQL)
DATABASE_URL=postgres://postgres:***@mcs0sww0cwg4kgok4owkcwo0:5432/postgres

# Database credentials (for reference, but not directly used in Coolify)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=***

# Redis connection (Coolify managed Redis)
REDIS_URL=rediss://default:***@mkwww8so8o88s8wo4c4wso08:6380/0
```

### Remove These (Not Used in Coolify):
```bash
POSTGRES_DB=vlib  # ❌ Remove - Coolify uses managed DB with fixed name
```

## How It Works

### In Coolify (Production)
1. Coolify provides managed PostgreSQL service
2. You get a connection string: `DATABASE_URL`
3. Your app connects using this URL
4. Database name is `postgres` (Coolify default)
5. Docker Compose files are **ignored**

### In Docker Compose (Local)
1. Spins up PostgreSQL container
2. Uses environment variables to configure
3. Creates database named `${POSTGRES_DB:-postgres}` (defaults to `postgres`)
4. Your app connects to `localhost:5432`

## Testing Your Setup

### Check Production Database
```bash
# Should return database name: postgres
echo $DATABASE_URL | grep -o '/[^/]*$' | cut -c 2-
```

### Test Connection
```bash
# From Coolify terminal or shell
psql $DATABASE_URL -c "SELECT current_database();"
```

Expected output:
```
 current_database
------------------
 postgres
(1 row)
```

## Migration Guide

Your Prisma migrations should work with either setup since they're database-agnostic.

### Run Migrations in Coolify
Migrations run automatically on startup via `start:prod` script:
```bash
npx prisma migrate deploy && node dist/index.js
```

### Run Migrations Locally (Docker Compose)
```bash
cd server
npx prisma migrate deploy
```

## Troubleshooting

### Error: "Can't reach database server"
- Check DATABASE_URL is correct
- Verify database service is running in Coolify
- Check firewall rules

### Error: "Database does not exist"
Your DATABASE_URL should end with `/postgres`, not `/vlib`:
```bash
# Correct ✅
postgres://user:pass@host:5432/postgres

# Wrong ❌
postgres://user:pass@host:5432/vlib
```

### Error: "Role does not exist"
Check POSTGRES_USER matches the username in DATABASE_URL.

## Best Practices

1. **Never hardcode database names** - Use environment variables
2. **Keep docker-compose and Coolify in sync** - Same defaults
3. **Use DATABASE_URL** - Single source of truth for connection
4. **Remove unused env vars** - Reduces confusion
5. **Test locally with Docker Compose** - Before deploying to Coolify

## Summary

✅ **Fixed Issues:**
- Updated docker-compose to use `postgres` as default database name
- Added missing `url` field to Prisma schema
- Identified unused `POSTGRES_DB` environment variable

✅ **Action Required:**
1. Remove `POSTGRES_DB=vlib` from Coolify environment variables
2. Current setup is working with DATABASE_URL pointing to `postgres` database
3. docker-compose.prod.yml now matches Coolify setup for consistency

Your production database is correctly configured and working. The changes just ensure consistency between local and production setups.
