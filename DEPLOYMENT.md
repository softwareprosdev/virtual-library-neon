# Deployment Configuration

## Server Setup
1. Copy server/.env.example to server/.env
2. Add your environment variables:
   - DATABASE_URL (PostgreSQL connection string)
   - REDIS_URL (Redis connection string) 
   - JWT_SECRET (secure random string)
   - NEXTAUTH_SECRET (for Next.js auth if needed)
   - LIVEKIT_API_KEY and LIVEKIT_API_SECRET
   - RESEND_API_KEY and RESEND_FROM_EMAIL
   - HUNTER_API_KEY and ABSTRACT_API_KEY (for email validation)
   - CLIENT_URL (your frontend URL)
   - AWS_* variables for S3 file storage

## Database Setup
```bash
cd server
npx prisma migrate deploy
npx prisma generate
```

## Build & Deploy
```bash
# Build server
cd server && npm run build

# Build client  
cd client && npm run build

# The server will serve client static files from production
```

## Docker Deployment
Use the provided docker-compose files:
- `docker-compose.yml` for development
- `docker-compose.prod.yml` for production

## Environment Variables Required
### Production:
- NODE_ENV=production
- PORT=4000
- DATABASE_URL=postgresql://...
- REDIS_URL=redis://...
- JWT_SECRET=your-secret-here
- CLIENT_URL=https://yourdomain.com

### Email Validation (Optional but Recommended):
- HUNTER_API_KEY=your_hunter_key
- ABSTRACT_API_KEY=your_abstract_key

### File Storage:
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY  
- AWS_REGION
- AWS_S3_BUCKET

### LiveKit (Video/Audio):
- LIVEKIT_API_KEY
- LIVEKIT_API_SECRET
- NEXT_PUBLIC_LIVEKIT_URL