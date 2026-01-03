# Environment Variables Configuration Guide

This document explains all environment variables needed for deploying IndexBin to production (Coolify).

## Server Environment Variables

These variables are required for the **server** service in Coolify.

### Database Configuration

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| `DATABASE_URL` | `postgresql://postgres:PASSWORD@postgres:5432/vlib` | Yes | PostgreSQL connection string |
| `POSTGRES_DB` | `vlib` | Yes | Database name |
| `POSTGRES_USER` | `postgres` | Yes | Database user |
| `POSTGRES_PASSWORD` | `your-secure-password` | Yes | Database password |

**For Coolify Internal Database:**
```
DATABASE_URL=postgresql://postgres:JlaEHsNSZjV9l3rddc3iFI14TDsMul8n4SUoNxCSaeuerzorsYSEaA9mF6efuRCX@mcs0sww0cwg4kgok4owkcwo0:5432/postgres
```

### Redis Configuration

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| `REDIS_URL` | `redis://redis:6379` | Yes | Redis connection string |

**For Coolify Internal Redis:**
```
REDIS_URL=redis://your-redis-service:6379
```

### JWT Authentication

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| `JWT_SECRET` | `your-256-bit-secret-minimum-32-characters-long` | Yes | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | `15m` | No | Token expiration (default: 15m) |

**Generate a secure JWT secret:**
```bash
openssl rand -base64 32
```

### CORS & URLs

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| `CLIENT_URL` | `https://indexbin.com` | Yes | Frontend URL for CORS |
| `PORT` | `4000` | No | Server port (default: 4000) |
| `NODE_ENV` | `production` | Yes | Environment mode |

### LiveKit (WebRTC Video/Audio)

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| `LIVEKIT_API_KEY` | `APIxxxxxxxxx` | Yes | LiveKit API key |
| `LIVEKIT_API_SECRET` | `xxxxxxxxxxxxxx` | Yes | LiveKit API secret |
| `LIVEKIT_URL` | `wss://your-project.livekit.cloud` | Yes | LiveKit WebSocket URL |

**Get LiveKit credentials at:** https://cloud.livekit.io

### Email Service (Optional)

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| `RESEND_API_KEY` | `re_xxxxxxxxxxxx` | No | Resend API key for emails |

**Get Resend API key at:** https://resend.com

---

## Client Environment Variables

These variables are required for the **client** service in Coolify (set as **build arguments**).

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://api.indexbin.com/api` | Yes | Backend API URL |
| `NEXT_PUBLIC_SOCKET_URL` | `https://api.indexbin.com` | Yes | Socket.io URL |
| `NEXT_PUBLIC_LIVEKIT_URL` | `wss://your-project.livekit.cloud` | Yes | LiveKit WebSocket URL |

---

## Production Setup for indexbin.com

### Server Service Variables

```env
# Database (use your Coolify internal PostgreSQL URL)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@your-postgres-host:5432/postgres

# Redis (use your Coolify internal Redis URL)
REDIS_URL=redis://your-redis-host:6379

# JWT
JWT_SECRET=generate-a-secure-32-character-minimum-secret
JWT_EXPIRES_IN=15m

# URLs
CLIENT_URL=https://indexbin.com
PORT=4000
NODE_ENV=production

# LiveKit
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
LIVEKIT_URL=wss://your-project.livekit.cloud

# Email (optional)
RESEND_API_KEY=your-resend-key
```

### Client Service Build Args

```env
NEXT_PUBLIC_API_URL=https://api.indexbin.com/api
NEXT_PUBLIC_SOCKET_URL=https://api.indexbin.com
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
```

---

## Coolify Deployment Architecture

```
                    ┌─────────────────────────────────────┐
                    │           Coolify VPS               │
                    │                                     │
    indexbin.com    │  ┌─────────────────────────────┐   │
         │          │  │      Client (Next.js)       │   │
         ▼          │  │         Port 3000           │   │
    ┌─────────┐     │  └─────────────────────────────┘   │
    │ Traefik │────▶│                                     │
    │  Proxy  │     │  ┌─────────────────────────────┐   │
    └─────────┘     │  │      Server (Express)       │   │
         │          │  │         Port 4000           │   │
api.indexbin.com───▶│  └──────────┬──────────────────┘   │
                    │             │                       │
                    │  ┌──────────▼──────────────────┐   │
                    │  │  PostgreSQL    │    Redis   │   │
                    │  │   Port 5432    │  Port 6379 │   │
                    │  └─────────────────────────────┘   │
                    └─────────────────────────────────────┘
```

---

## Domain Configuration

For `indexbin.com`, you'll need two DNS records:

| Type | Name | Value |
|------|------|-------|
| A | `indexbin.com` | Your Coolify VPS IP |
| A | `api.indexbin.com` | Your Coolify VPS IP |

In Coolify:
- **Client service**: Domain = `indexbin.com`
- **Server service**: Domain = `api.indexbin.com`

---

## Security Checklist

- [ ] Use strong, unique `JWT_SECRET` (32+ characters)
- [ ] Use strong `POSTGRES_PASSWORD`
- [ ] Set `NODE_ENV=production` on server
- [ ] Enable HTTPS on both domains in Coolify
- [ ] Rotate LiveKit credentials if compromised
- [ ] Keep `.env` files out of version control
