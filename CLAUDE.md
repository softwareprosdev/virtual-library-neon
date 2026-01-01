# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack monorepo for a collaborative book discussion platform with real-time video/audio and chat. Users join rooms to discuss books using LiveKit WebRTC.

## Commands

### Development
```bash
# Run both client and server concurrently
npm run dev

# Run only server (port 4000)
npm run server

# Run only client (port 3000)
npm run client
```

### Build
```bash
# Build client
cd client && npm run build

# Build server
cd server && npm run build
```

### Linting
```bash
cd client && npm run lint
```

### Database
```bash
cd server && npx prisma migrate dev     # Run migrations
cd server && npx prisma generate        # Regenerate client
cd server && npx prisma studio          # Database GUI
```

### Docker
```bash
docker-compose up -d                    # Development
docker-compose -f docker-compose.prod.yml up -d  # Production
```

## Architecture

```
/
├── client/          # Next.js 16 + React 19 frontend
│   ├── app/         # App Router pages
│   ├── components/  # React components
│   └── lib/         # Utilities (socket.ts, api.ts, auth.ts, google-books.ts)
├── server/          # Express 5 backend
│   ├── src/
│   │   ├── routes/  # API routes (auth, rooms, books, livekit, ai)
│   │   ├── middlewares/  # Auth middleware (JWT)
│   │   └── socket.ts     # Socket.io event handlers
│   └── prisma/      # Database schema
└── MDFiles/         # Detailed documentation
```

## Tech Stack

- **Frontend**: Next.js 16, React 19, Material-UI 7, TypeScript, Socket.io-client
- **Backend**: Express 5, TypeScript, Prisma 7, Socket.io with Redis adapter
- **Real-time**: LiveKit (WebRTC), Socket.io
- **Database**: PostgreSQL 15, Redis 7
- **Auth**: JWT with refresh tokens (15m access, 7d refresh)

## Key Patterns

### API Calls (Client)
```typescript
import { api } from '@/lib/api';
const res = await api('/rooms');  // Adds auth header automatically
```

### Socket Connection (Client)
```typescript
import { connectSocket, getSocket } from '@/lib/socket';
const socket = connectSocket();
socket.emit('joinRoom', { roomId });
socket.on('message', (msg) => { ... });
```

### Auth Middleware (Server)
Routes use `authenticateToken` middleware which adds `req.user` with decoded JWT payload.

### LiveKit Integration
- Token generated via `/api/livekit/token?roomId=xxx`
- Client uses `@livekit/components-react` with custom `CustomPublisher` component
- Audio/video effects processed via canvas/Web Audio API

## Database Models

Core models: `User`, `Room`, `Book`, `Message`, `Participant`, `Genre`

Rooms can have associated books (from Google Books API) for discussion context.

## Environment Variables

See `.env.example` for required variables:
- `DATABASE_URL`, `REDIS_URL`
- `JWT_SECRET`, `NEXTAUTH_SECRET`
- `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `NEXT_PUBLIC_LIVEKIT_URL`
- `AWS_*` (S3 for file storage)
