import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth';
import roomRoutes from './routes/rooms';
import bookRoutes from './routes/books';
import livekitRoutes from './routes/livekit';
import newsletterRoutes from './routes/newsletter';
import aiRoutes from './routes/ai';
import gamificationRoutes from './routes/gamification';
import readingListRoutes from './routes/readingList';
import { setupSocket } from './socket';
import path from 'path';

dotenv.config();

// Fail fast if JWT_SECRET is missing
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not defined in environment variables.');
  process.exit(1);
}

const app: Express = express();
const port = process.env.PORT || 4000;

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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  res.sendStatus(204);
});

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 auth requests per windowMs
  message: { message: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use(limiter as any);
app.use(express.json({ limit: '10mb' }));

// Serve Static Uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use('/api/auth', authLimiter as any, authRoutes);
app.use('/auth', authLimiter as any, authRoutes); // Fallback for old clients
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

// Diagnostics endpoint (Protected by simple key or open for now if critical)
app.get('/diagnostics', async (req: Request, res: Response) => {
    try {
        // Check DB connection by running a simple query
        const userCount = await prisma.user.count();
        const tableList = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
        
        res.json({
            status: 'ok',
            database: {
                connected: true,
                userCount,
                tables: tableList
            },
            env: {
                node_env: process.env.NODE_ENV,
                database_url_set: !!process.env.DATABASE_URL,
                client_url: process.env.CLIENT_URL,
            }
        });
    } catch (error) {
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
