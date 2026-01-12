# Virtual Library Project Context

## Project Overview
This project is a real-time virtual library and collaboration platform. It features shared reading, real-time chat, and a cyberpunk-themed UI.

**Current Status:** ✅ **MVP Complete**
- **Client:** Next.js 16 (App Router) with MUI v7 + Tailwind v4.
- **Server:** Express.js + Socket.io + Redis.
- **Database:** PostgreSQL with Prisma ORM.
- **Theme:** "Super Black" Dark Mode with Neon Accents & Glitch Effects.

## Architecture & Tech Stack

### Client (`/client`)
- **Framework:** Next.js 16 (App Router)
- **Styling:** Material UI + Tailwind CSS v4 (Hybrid)
- **Real-time:** `socket.io-client`
- **Design:** Cyberpunk/Neon (Glitch effects, Holographic backgrounds)

### Server (`/server`)
- **Framework:** Express.js
- **ORM:** Prisma (PostgreSQL)
- **Real-time:** `socket.io` with `@socket.io/redis-adapter`
- **Scalability:** Redis Pub/Sub enabled for horizontal scaling.

## Setup & Development

### Prerequisites
- Node.js 20+
- Docker & Docker Compose (for DB/Redis)

### Running the App (Dev Mode)
To run both Client and Server simultaneously:

```bash
# 1. Start Infrastructure (Postgres + Redis)
docker-compose up -d

# 2. Start Application
npm run dev
# Client: http://localhost:3000
# Server: http://localhost:4000
```

## Deployment
- **Docker:** Production Dockerfiles exist for both `client` and `server`.
- **Guide:** See `COOLIFY_DEPLOYMENT.md` for VPS/Coolify instructions.
- **CI/CD:** GitHub Actions workflow configured in `.github/workflows/ci.yml`.

## Key Documentation Files
- **Architecture:** `architecture.md`
- **Security:** `SecurityChecklist.md`
- **Deployment:** `COOLIFY_DEPLOYMENT.md`