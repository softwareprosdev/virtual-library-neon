# Migrating to Prisma Accelerate

This guide will help you migrate from your Coolify PostgreSQL database to Prisma Accelerate for better performance.

## Prerequisites

You need:
1. ✅ Your database dump file (you already have this: `C:\Users\cooki\Downloads\pg-dump-all-1767972387`)
2. ✅ Your Prisma Accelerate URL (you already have this)
3. 🔄 A PostgreSQL database (see options below)

## Important: Prisma Accelerate Requires a PostgreSQL Database

⚠️ **Prisma Accelerate is NOT a database** - it's a connection pooler and caching layer that sits **in front of** your PostgreSQL database.

You need to create/use a PostgreSQL database, then point Accelerate to it.

## Step 1: Get a PostgreSQL Database

Choose one of these options:

### Option A: Use Prisma's Console (Recommended - Easiest)

1. Go to https://console.prisma.io/
2. Find your project (you already have an Accelerate key)
3. Look for **"Direct Database URL"** or **"Connection String"**
4. Copy the `postgresql://...` URL (NOT the `prisma+postgres://` one)

### Option B: Use Neon (Free, Fast)

1. Go to https://neon.tech/
2. Sign up and create a new project
3. Copy the connection string
4. In Prisma Console, update Accelerate to point to this Neon database

### Option C: Use Supabase (Free)

1. Go to https://supabase.com/
2. Create a new project
3. Get the direct PostgreSQL URL from Settings > Database
4. Configure Accelerate to use this database

## Step 1: Export Your Current Database

**From your Coolify server container:**

```bash
# Export the database to a SQL file
pg_dump $DATABASE_URL --no-owner --no-acl > backup.sql

# Check the file size
ls -lh backup.sql
```

**Or from your local machine:**

```bash
cd server
npm run db:export
```

This will create a backup in `server/backups/backup-TIMESTAMP.sql`.

## Step 2: Get Your Prisma Accelerate Connection Ready

You already have your Accelerate URL:
```
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGci..."
```

## Step 2: Import Your Database Dump

Once you have a PostgreSQL database URL, import your data:

```bash
# On Windows (using psql)
psql "YOUR_POSTGRES_URL" < C:\Users\cooki\Downloads\pg-dump-all-1767972387

# Example with Neon:
psql "postgresql://user:pass@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb" < C:\Users\cooki\Downloads\pg-dump-all-1767972387
```

If you don't have `psql` installed on Windows:
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Or use an online tool like pgAdmin
3. Or use Neon's SQL Editor in their web console

## Step 3: Configure Accelerate (If Needed)

If you're using Neon, Supabase, or another provider:

1. Go to https://console.prisma.io/
2. Find your Accelerate project
3. Update the database connection to point to your new PostgreSQL URL
4. Save the configuration

Your Accelerate URL stays the same:
```
prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGci...
```

## Step 4: Update Your Application Code

Replace `server/src/db.ts` with the auto-detecting version:

```bash
cd server/src
mv db.ts db.old.ts
mv db.new.ts db.ts
```

## Step 5: Update Environment Variables

**In your Coolify deployment**, update the DATABASE_URL:

```env
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=YOUR_API_KEY"
```

## Step 6: Deploy and Test

```bash
# Build the server
cd server
npm run build

# Test locally first (optional)
DATABASE_URL="prisma+postgres://..." npm start

# Or deploy to Coolify and let it restart
```

## Step 7: Verify Performance

Check your application logs for:
- `[db]: Using Prisma Accelerate ⚡ connection`
- Faster query times
- Reduced database load

## Important Notes

⚠️ **Prisma Accelerate is NOT a database** - it's a connection pooler and query accelerator. You still need a PostgreSQL database behind it.

✅ **What Accelerate does:**
- Connection pooling (handles 1000s of connections)
- Global edge caching
- Query result caching
- Reduced latency

❌ **What causes slow performance:**
- Large database queries without indexes
- N+1 query problems
- Unoptimized frontend code
- Too many re-renders in React

## Troubleshooting Slow Website

If your site is still slow after migration, check:

1. **Frontend issues:**
   ```bash
   cd client
   npm run build
   # Check build size - should be < 2MB
   ```

2. **Database queries:**
   - Enable Prisma query logging
   - Look for slow queries (> 100ms)
   - Add indexes if needed

3. **Network issues:**
   - Check if Coolify has resource limits
   - Monitor CPU/Memory usage

4. **React DevTools:**
   - Check for unnecessary re-renders
   - Use React.memo() for expensive components

## Rollback Plan

If something goes wrong:

```bash
cd server/src
mv db.ts db.accelerate.ts
mv db.old.ts db.ts
```

Then change DATABASE_URL back to your Coolify PostgreSQL URL.
