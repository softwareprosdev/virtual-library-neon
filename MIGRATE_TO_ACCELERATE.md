# Migrating to Prisma Accelerate

This guide will help you migrate from your Coolify PostgreSQL database to Prisma Accelerate for better performance.

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

## Step 3: Import Data to Prisma Accelerate

Prisma Accelerate is a connection pooler and caching layer - it **sits in front of** your actual PostgreSQL database. You need to:

### Option A: Create a new PostgreSQL database on Prisma's platform

1. Go to https://console.prisma.io/
2. Create a new project
3. Get the **direct PostgreSQL URL** (not the Accelerate URL)
4. Import your data:

```bash
psql "YOUR_DIRECT_POSTGRES_URL" < backup.sql
```

### Option B: Use Accelerate with your existing Coolify database

Prisma Accelerate can also connect to your existing Coolify PostgreSQL! You need to:

1. Make sure your Coolify PostgreSQL is accessible from the internet (or whitelist Prisma's IPs)
2. In Prisma Console, configure Accelerate to point to your Coolify database
3. Use the Accelerate URL in your app

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
