import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { ipBlockMiddleware, createAdvancedRateLimit, detectSuspiciousActivity } from './middleware/security';
import { validateRequest } from './middleware/validation';
import { csrfProtection, provideCSRFToken, csrfRateLimit } from './middleware/csrf';
import { securityLogger, detectPotentialDoS, detectDataExfiltration } from './middleware/monitoring';
import { blockExternalRequests, protectPasswordData, blockSystemPaths } from './middleware/securityEnhanced';
import authRoutes from './routes/auth';
import roomRoutes from './routes/rooms';
import bookRoutes from './routes/books';
import livekitRoutes from './routes/livekit';
import newsletterRoutes from './routes/newsletter';
import aiRoutes from './routes/ai';
import gamificationRoutes from './routes/gamification';
import readingListRoutes from './routes/readingList';
import userRoutes from './routes/users';
import adminRoutes from './routes/admin';
import bookPostsRoutes from './routes/bookPosts';
import freeBooksRoutes from './routes/freeBooks';
import followsRoutes from './routes/follows';
import activityRoutes from './routes/activity';
import friendRequestRoutes from './routes/friendRequests';
import directMessageRoutes from './routes/directMessages';
import storiesRoutes from './routes/stories';
import postsRoutes from './routes/posts';
import notificationsRoutes from './routes/notifications';
import proxyRoutes from './routes/proxy';
import marketplaceRoutes from './routes/marketplace';
import videosRoutes from './routes/videos';
import soundsRoutes from './routes/sounds';
import pexelsRoutes from './routes/pexels';
import { setupSocket } from './socket';
import path from 'path';

dotenv.config();

// Ensure correct sender email is used (fix for placeholder)
if (!process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM_EMAIL === 'noreply@yourdomain.com') {
  process.env.RESEND_FROM_EMAIL = 'noreply@mail.softwarepros.org';
  console.log('[Config] Enforcing RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL);
}

// Fail fast if JWT_SECRET is missing
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not defined in environment variables.');
  process.exit(1);
}

const app: Express = express();
const port = process.env.PORT || 4000;

// Body parsing middleware - CRITICAL for API routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust Proxy for Coolify/Traefik
app.set('trust proxy', 1);

// CORS Configuration - MUST be before helmet and other middleware
const defaultAllowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://www.indexbin.com',
  'https://indexbin.com',
  'https://api.indexbin.com'
];

const allowedOrigins = process.env.CLIENT_URL
  ? [...defaultAllowedOrigins, ...process.env.CLIENT_URL.split(',').map(url => url.trim())]
  : defaultAllowedOrigins;

// Explicit preflight handler - MUST be first to ensure CORS works
// Express 5 requires '{*path}' instead of '*' for wildcards
app.options('{*path}', (req: Request, res: Response) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Session-Token');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  res.sendStatus(204);
});

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Session-Token'],
  exposedHeaders: ['X-CSRF-Token', 'X-Session-Token'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Security Middleware with advanced headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'", "https://cdn.livekit.io", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      mediaSrc: ["'self'", "blob:", "https://cdn.livekit.io"],
      connectSrc: ["'self'", "wss:", "https:", "ws:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: false,
  ieNoOpen: true,
  xssFilter: true
}));

// Advanced Rate Limiting with IP blocking
const limiter = createAdvancedRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  blockDurationMinutes: 30
});

// Strict rate limit for auth routes
const authLimiter = limiter;

// Very strict rate limit for sensitive operations
const strictLimiter = createAdvancedRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5,
  blockDurationMinutes: 120
});

// Enhanced security middleware
app.use(blockSystemPaths);
app.use(blockExternalRequests);
app.use(securityLogger);
app.use(detectPotentialDoS);
app.use(detectDataExfiltration);

// IP blocking middleware
app.use(ipBlockMiddleware);

// CSRF protection for state-changing requests
app.use(csrfRateLimit);
app.use(provideCSRFToken);
app.use(csrfProtection);

// Enhanced security middleware with bot detection
app.use((req: Request, res: Response, next: express.NextFunction) => {
  const url = req.originalUrl || req.url;
  const suspicious = detectSuspiciousActivity(req);

  // Log suspicious activity
  if (suspicious.isBot || suspicious.hasNoUserAgent || suspicious.isSuspiciousUserAgent) {
    console.warn(`[SECURITY] Suspicious request detected: ${req.method} ${url} from IP: ${suspicious.ip}, UA: ${suspicious.userAgent}`);
  }

  // Block path traversal attempts
  if (url.includes('..') || url.includes('%2E%2E') || url.includes('%2e%2e')) {
    console.warn(`[SECURITY] Path traversal attempt blocked: ${req.method} ${url} from IP: ${suspicious.ip}`);
    res.status(400).json({ message: 'Invalid request' });
    return;
  }

  // Block common attack patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\(/i,
    /expression\(/i,
    /union\s+select/i,
    /drop\s+table/i,
    /insert\s+into/i,
    /delete\s+from/i,
    /exec\s*\(/i
  ];

  if (dangerousPatterns.some(pattern => pattern.test(url))) {
    console.warn(`[SECURITY] Attack attempt blocked: ${req.method} ${url} from IP: ${suspicious.ip}`);
    res.status(400).json({ message: 'Invalid request' });
    return;
  }

  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
});


// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use(authLimiter as any);

// Request validation middleware
app.use(validateRequest({
  // Define validation rules for common fields
  email: { maxLength: 254, allowEmpty: false, customPattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  name: { maxLength: 100, allowEmpty: false },
  title: { maxLength: 200, allowEmpty: false },
  description: { maxLength: 1000, allowHTML: true },
  message: { maxLength: 2000, allowHTML: true }
}));

// Serve Static Uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes with enhanced security
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use('/api/auth', protectPasswordData as any, authLimiter as any, authRoutes);
app.use('/auth', protectPasswordData as any, authLimiter as any, authRoutes); // Fallback for old clients
app.use('/api/admin', strictLimiter as any, adminRoutes);
app.use('/admin', strictLimiter as any, adminRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/rooms', roomRoutes);
app.use('/api/books', bookRoutes);
app.use('/books', bookRoutes);
app.use('/api/livekit', livekitRoutes);
app.use('/livekit', livekitRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/newsletter', newsletterRoutes);
app.use('/api/ai', aiRoutes);
app.use('/ai', aiRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/gamification', gamificationRoutes);
app.use('/api/reading-list', readingListRoutes);
app.use('/reading-list', readingListRoutes);
app.use('/api/users', userRoutes);
app.use('/users', userRoutes);
app.use('/api/profiles', userRoutes); // For compatibility with some frontend calls
app.use('/profiles', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/admin', adminRoutes);
app.use('/api/book-posts', bookPostsRoutes);
app.use('/book-posts', bookPostsRoutes);
app.use('/api/free-books', freeBooksRoutes);
app.use('/free-books', freeBooksRoutes);
app.use('/api/follows', followsRoutes);
app.use('/follows', followsRoutes);
app.use('/api/activity', activityRoutes);
app.use('/activity', activityRoutes);
app.use('/api/friend-requests', friendRequestRoutes);
app.use('/friend-requests', friendRequestRoutes);
app.use('/api/direct-messages', directMessageRoutes);
app.use('/direct-messages', directMessageRoutes);
app.use('/api/stories', storiesRoutes);
app.use('/stories', storiesRoutes);
app.use('/api/posts', postsRoutes);
app.use('/posts', postsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/proxy', proxyRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/marketplace', marketplaceRoutes);
app.use('/api/videos', videosRoutes);
app.use('/videos', videosRoutes);
app.use('/api/sounds', soundsRoutes);
app.use('/sounds', soundsRoutes);
app.use('/api/pexels', pexelsRoutes);
app.use('/pexels', pexelsRoutes);

// HTTP Server & Socket.io
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

const isProduction = process.env.NODE_ENV === 'production';

// Initialize Socket Logic
setupSocket(io).catch(err => {
  console.error('Socket setup failed:', err);
});

// Basic Health Check
app.get('/', (req: Request, res: Response) => {
  res.send('Virtual Library Server is Running');
});

// Status page - works without database
app.get('/status', (req: Request, res: Response) => {
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV || 'development',
    cors: {
      allowedOrigins: allowedOrigins
    }
  });
});

import prisma from './db';

// Health check endpoint for Coolify/Docker
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Run database migrations (for emergency use)
app.post('/admin/migrate', async (req: Request, res: Response) => {
    try {
        const { execSync } = require('child_process');
        const result = execSync('cd /home/rogue/Documents/ding/virtual-library-neon/server && npx prisma migrate deploy', {
            encoding: 'utf8'
        });

        res.json({
            status: 'success',
            message: 'Migrations completed',
            output: result
        });
    } catch (error) {
        console.error('Migration failed:', error);
        res.status(500).json({
            status: 'error',
            message: 'Migration failed',
            error: error.message
        });
    }
});

// Diagnostics endpoint (Protected by simple key or open for now if critical)
app.get('/diagnostics', async (req: Request, res: Response) => {
    try {
        // Check DB connection by running a simple query
        const userCount = await prisma.user.count();
        const roomCount = await prisma.room.count();
        const marketplaceCount = await prisma.marketplaceListing.count().catch(() => 0);
        const messageCount = await prisma.message.count();

        // Check specific tables that are failing
        const tables = [
            'User', 'Room', 'MarketplaceListing', 'Message',
            'Book', 'Genre', 'Participant'
        ];

        const tableCounts = {};
        for (const table of tables) {
            try {
                const count = await prisma[table.toLowerCase()].count();
                tableCounts[table] = count;
            } catch (error) {
                tableCounts[table] = `ERROR: ${error.message}`;
            }
        }

        res.json({
            status: 'ok',
            database: {
                connected: true,
                counts: tableCounts,
                summary: {
                    users: userCount,
                    rooms: roomCount,
                    marketplaceListings: marketplaceCount,
                    messages: messageCount
                }
            },
            env: {
                node_env: process.env.NODE_ENV,
                database_url_set: !!process.env.DATABASE_URL,
                client_url: process.env.CLIENT_URL,
            }
        });
    } catch (error) {
        console.error('Diagnostics failed:', error);
        res.status(500).json({
            status: 'error',
            message: 'Diagnostics failed',
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

// Global error handler - ensures CORS headers are sent even on errors
app.use((err: Error, req: Request, res: Response, _next: express.NextFunction) => {
  console.error('Global error handler:', err);

  // Ensure CORS headers are set
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV !== 'production' ? err.message : undefined
  });
});

// Catch-all 404 handler (Must be last)
app.use((req: Request, res: Response) => {
  console.log(`[404] Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
    method: req.method
  });
});

// Start Server
httpServer.listen(port, () => {
  console.log(`[server]: Server is running on port ${port}`);
});
