# Coolify / VPS Deployment Guide

This project is containerized and ready for deployment using Docker with **PostgreSQL 17** support.

## Architecture

- **Client:** Next.js (Standalone Mode) - Port 3000
- **Server:** Express.js + Socket.io - Port 4000
- **Database:** PostgreSQL 17 (Internal Coolify Database)
- **Cache:** Redis 7+

---

## ✅ PostgreSQL 17 Compatibility

This application is **fully compatible** with PostgreSQL 17. The Prisma schema includes:

- Multi-platform binary targets for Linux/ARM deployments
- PostgreSQL-specific features and data types
- Optimized connection pooling for VPS environments

---

## Deployment via Coolify

### Step 1: Create PostgreSQL 17 Internal Database

In your Coolify dashboard:

1. Go to **Databases** → **Add New Database**
2. Select **PostgreSQL 17**
3. Choose **Internal** (recommended for same-server deployment)
4. Name it: `vlib-postgres`
5. Set credentials and note the internal connection string

**Connection Format:**

```
postgresql://username:password@postgres-service-name:5432/database_name
```

### Step 2: Create Redis Cache (Optional but Recommended)

1. Go to **Databases** → **Add New Database**
2. Select **Redis 7**
3. Choose **Internal**
4. Name it: `vlib-redis`
5. Note the internal connection string

### Step 3: Deploy Server Application

1. **Create New Resource** → **Public Repository**
2. **Repository:** Your GitHub repo URL
3. **Build Configuration:**

   - **Build Pack:** Dockerfile
   - **Dockerfile Location:** `server/Dockerfile`
   - **Build Context:** `server`

4. **Environment Variables:**

   ```env
   PORT=4000
   NODE_ENV=production

   # Database (Internal PostgreSQL 17)
   DATABASE_URL=postgresql://username:password@vlib-postgres:5432/virtuallib

   # Redis Cache (Internal)
   REDIS_URL=redis://vlib-redis:6379

   # Security
   JWT_SECRET=<generate-strong-secret-min-32-chars>
   JWT_EXPIRES_IN=15m

   # Client URL (will be your client domain)
   CLIENT_URL=https://your-client-domain.com

   # Optional: Email & External Services
   RESEND_API_KEY=<your-resend-key>
   HUNTER_API_KEY=<your-hunter-key>
   ABSTRACT_API_KEY=<your-abstract-key>

   # Optional: LiveKit (for video rooms)
   LIVEKIT_API_KEY=<your-key>
   LIVEKIT_API_SECRET=<your-secret>
   LIVEKIT_URL=<your-livekit-url>

   # Optional: AWS S3 (for file uploads)
   AWS_S3_BUCKET=<bucket-name>
   AWS_REGION=<region>
   AWS_ACCESS_KEY_ID=<key>
   AWS_SECRET_ACCESS_KEY=<secret>
   AWS_ENDPOINT=<endpoint>
   ```

5. **Port Mapping:**

   - Container Port: `4000`
   - Expose Publicly: Yes
   - Custom Domain: `api.yourdomain.com` (recommended)

6. **Health Check:**
   - Path: `/health` or `/api/health`
   - Interval: 30s

### Step 4: Run Database Migration

After server is deployed, run migrations:

1. **Connect to Server Container** in Coolify
2. Run:
   ```bash
   npx prisma migrate deploy
   ```

Or use Coolify's **One-off Command** feature:

```bash
npx prisma migrate deploy
```

### Step 5: Deploy Client Application

1. **Create New Resource** → **Public Repository**
2. **Build Configuration:**

   - **Build Pack:** Dockerfile
   - **Dockerfile Location:** `client/Dockerfile`
   - **Build Context:** `client`

3. **Build Arguments (CRITICAL - set before build):**

   ```env
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
   NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
   NEXT_PUBLIC_LIVEKIT_URL=<your-livekit-url>
   ```

4. **Environment Variables:**

   ```env
   NODE_ENV=production
   ```

5. **Port Mapping:**
   - Container Port: `3000`
   - Expose Publicly: Yes
   - Custom Domain: `yourdomain.com`

---

## PostgreSQL 17 Optimizations

### Connection Pooling (Production)

The server uses Prisma's built-in connection pooling. For PostgreSQL 17 on VPS, recommended settings:

**In your DATABASE_URL, add connection pooling parameters:**

```
postgresql://user:pass@host:5432/db?connection_limit=5&pool_timeout=10&connect_timeout=10
```

### Recommended Coolify PostgreSQL 17 Settings

For a basic VPS (2GB RAM):

- **max_connections:** 100
- **shared_buffers:** 256MB
- **effective_cache_size:** 1GB
- **work_mem:** 4MB

For a medium VPS (4GB RAM):

- **max_connections:** 200
- **shared_buffers:** 512MB
- **effective_cache_size:** 2GB
- **work_mem:** 8MB

These are automatically handled by Coolify's PostgreSQL 17 image.

---

## Database Migration Guide

### Initial Setup (Fresh Deployment)

```bash
# Inside server container
npx prisma migrate deploy
```

### Updating Schema (After Code Changes)

```bash
# Development: Create new migration
npx prisma migrate dev --name your_migration_name

# Production: Deploy migrations
npx prisma migrate deploy
```

### Reset Database (Development Only!)

```bash
npx prisma migrate reset
```

---

## Performance Optimizations for VPS

### 1. Enable Redis Caching

Ensure `REDIS_URL` is set. The server will automatically cache:

- User sessions
- Socket.io adapter (for horizontal scaling)

### 2. Database Indexes

Prisma schema already includes optimized indexes for:

- Email lookups (`@@index([email])`)
- Username searches (`@unique`)
- Post queries (`@@index([userId, createdAt])`)

### 3. Connection Management

- Prisma automatically handles connection pooling
- Maximum connections per instance: 5 (configurable)
- Idle timeout: 10 seconds

### 4. Docker Resource Limits (Optional)

In Coolify, set resource limits:

- **Server Container:** 1GB RAM, 1 CPU
- **Client Container:** 512MB RAM, 0.5 CPU

---

## Monitoring & Logs

### View Logs in Coolify

1. Go to your application
2. Click **Logs** tab
3. Enable **Real-time logs**

### Health Checks

Server exposes health endpoint:

```bash
curl https://api.yourdomain.com/health
```

### Database Status

```bash
# Inside server container
npx prisma db --version
```

---

## Troubleshooting

### Issue: Migration Fails

**Solution:** Ensure DATABASE_URL is correct and database is accessible.

```bash
# Test connection
npx prisma db execute --stdin <<< "SELECT NOW();"
```

### Issue: Client Can't Connect to Server

**Solution:** Verify `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` are set correctly **before** building the client.

### Issue: PostgreSQL Connection Pool Exhausted

**Solution:** Increase connection limit in DATABASE_URL:

```
?connection_limit=10
```

### Issue: High Memory Usage

**Solution:**

1. Reduce Prisma connection pool size
2. Enable Redis caching
3. Implement response caching middleware

---

## Backup & Recovery

### Automated Backups (Coolify)

Coolify automatically backs up internal PostgreSQL databases daily.

### Manual Backup

```bash
# Export database
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

---

## Security Checklist

- [ ] `JWT_SECRET` is strong (min 32 characters)
- [ ] Database credentials are unique and strong
- [ ] `NODE_ENV=production` is set
- [ ] CORS is configured correctly in server
- [ ] Rate limiting is enabled
- [ ] SSL/TLS certificates are configured in Coolify
- [ ] Environment variables are not committed to git

---

## Scaling Considerations

### Horizontal Scaling

To run multiple server instances:

1. Deploy multiple server containers
2. Redis adapter automatically handles Socket.io synchronization
3. Use Coolify's load balancer

### Vertical Scaling

- Increase VPS resources (CPU/RAM)
- Adjust PostgreSQL `shared_buffers` accordingly
- Increase connection pool limits

---

## Cost Optimization

**Recommended VPS Specs:**

- **Minimum:** 2GB RAM, 2 vCPU, 50GB SSD
- **Recommended:** 4GB RAM, 2 vCPU, 100GB SSD
- **Heavy Load:** 8GB RAM, 4 vCPU, 200GB SSD

**Coolify Pricing:** ~$5-20/month depending on VPS provider

---

## Quick Reference

### Common Commands

```bash
# View Prisma schema
npx prisma format

# Generate Prisma Client
npx prisma generate

# View database in browser
npx prisma studio

# Apply migrations
npx prisma migrate deploy

# Check migration status
npx prisma migrate status
```

### Environment Variables Quick Copy

```env
# Server
PORT=4000
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@postgres:5432/db
REDIS_URL=redis://redis:6379
JWT_SECRET=your-secret-min-32-chars
CLIENT_URL=https://yourdomain.com

# Client Build Args
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
```

---

## Support

For Coolify-specific issues, see: https://coolify.io/docs
For Prisma issues, see: https://www.prisma.io/docs

**PostgreSQL 17 is fully supported!** ✅
