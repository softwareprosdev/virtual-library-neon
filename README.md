# IndexBin - Virtual Library Platform

A modern, real-time collaborative book discussion platform with WebRTC video/audio capabilities. Users can join rooms to discuss books with live video, audio, and chat powered by LiveKit.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 16, React 19, Material-UI 7, TypeScript |
| **Backend** | Express 5, TypeScript, Prisma 7, Socket.io |
| **Real-time** | LiveKit (WebRTC), Socket.io with Redis Adapter |
| **Database** | PostgreSQL 17, Redis 7 |
| **Auth** | JWT with bcrypt password hashing |
| **Deployment** | Docker, Coolify |

## Features

- **Real-time Video/Audio Rooms** - WebRTC-powered discussions via LiveKit
- **Live Chat** - Socket.io-based messaging with content moderation
- **PDF Book Reader** - 3D flip-book style PDF viewer
- **Book Library** - Upload, search, and manage personal book collections
- **Personalized Recommendations** - Genre-based room suggestions
- **Role-based Permissions** - Host, Moderator, and Participant roles

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 17 (or use Docker)
- Redis 7 (or use Docker)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/indexbin.git
cd indexbin

# Install dependencies
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# Start databases with Docker
docker-compose up -d

# Run database migrations
cd server && npx prisma migrate dev && cd ..

# Start development servers
npm run dev
```

The app will be available at:
- **Client**: http://localhost:3000
- **Server**: http://localhost:4000

## Project Structure

```
indexbin/
├── client/                 # Next.js 16 frontend
│   ├── app/               # App Router pages
│   ├── components/        # React components
│   └── lib/               # Utilities (api, socket, auth)
├── server/                # Express 5 backend
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── middlewares/   # Auth middleware
│   │   └── socket.ts      # Socket.io handlers
│   └── prisma/            # Database schema
├── docker-compose.yml     # Development Docker config
└── docker-compose.prod.yml # Production Docker config
```

## Environment Variables

### Server Environment (`.env`)

```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

# Redis
REDIS_URL="redis://HOST:PORT"

# JWT Authentication
JWT_SECRET="your-256-bit-secret-key-minimum-32-characters"
JWT_EXPIRES_IN="15m"

# CORS
CLIENT_URL="https://indexbin.com"

# LiveKit (WebRTC)
LIVEKIT_API_KEY="your-livekit-api-key"
LIVEKIT_API_SECRET="your-livekit-api-secret"
LIVEKIT_URL="wss://your-livekit-url"

# Email (Optional)
RESEND_API_KEY="your-resend-api-key"

# Server
PORT=4000
NODE_ENV="production"
```

### Client Environment (`.env.local`)

```env
NEXT_PUBLIC_API_URL="https://api.indexbin.com/api"
NEXT_PUBLIC_SOCKET_URL="https://api.indexbin.com"
NEXT_PUBLIC_LIVEKIT_URL="wss://your-livekit-url"
```

## Production Deployment (Coolify)

### 1. Configure Environment Variables in Coolify

Set all environment variables from `.env.example` in your Coolify dashboard.

### 2. Deploy with Docker Compose

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 3. Run Database Migrations

```bash
docker exec -it indexbin-server npx prisma migrate deploy
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/rooms` | List live rooms |
| POST | `/api/rooms` | Create a room |
| GET | `/api/rooms/:id` | Get room details |
| GET | `/api/rooms/genres` | List genres |
| GET | `/api/books` | List user's books |
| POST | `/api/books/upload` | Upload a book |
| GET | `/api/books/search` | Search books |
| GET | `/api/livekit/token` | Get LiveKit token |
| GET | `/health` | Health check |

## Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `joinRoom` | Client → Server | Join a room |
| `leaveRoom` | Client → Server | Leave a room |
| `chat` | Client → Server | Send message |
| `message` | Server → Client | Receive message |
| `userJoined` | Server → Client | User joined notification |
| `userLeft` | Server → Client | User left notification |
| `deleteMessage` | Client → Server | Delete message (mod only) |

## Security Features

- **Helmet.js** - Security headers
- **Rate Limiting** - 100 req/15min general, 10 req/15min for auth
- **JWT Authentication** - Short-lived tokens (15m default)
- **Password Hashing** - bcrypt with 10 rounds
- **Input Validation** - Email format, password length
- **CORS** - Configured for specific origins
- **Content Moderation** - Basic toxicity filtering

## Scripts

```bash
# Development
npm run dev          # Run client + server concurrently
npm run client       # Run client only
npm run server       # Run server only

# Build
cd client && npm run build    # Build client
cd server && npm run build    # Build server

# Database
cd server && npx prisma migrate dev      # Run migrations
cd server && npx prisma generate         # Regenerate client
cd server && npx prisma studio           # Database GUI

# Linting
cd client && npm run lint     # Lint client code
```

## Database Models

- **User** - Authentication and profile
- **Room** - Discussion rooms
- **Book** - Book metadata and content
- **Message** - Chat messages
- **Participant** - Room participants
- **Genre** - Room categories
- **Interaction** - User activity tracking

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary. All rights reserved.

---

Built with modern web technologies for the future of collaborative reading.
