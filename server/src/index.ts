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

// Security Middleware
app.use(helmet());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: { message: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use(limiter as any);

// CORS Configuration
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',')
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Serve Static Uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use('/api/auth', authLimiter as any, authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/livekit', livekitRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/ai', aiRoutes);

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

// Health check endpoint for Coolify/Docker
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start Server
httpServer.listen(port, () => {
  console.log(`[server]: Server is running on port ${port}`);
});
