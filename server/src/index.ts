import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
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

const app: Express = express();
const port = process.env.PORT || 4000;

// Middleware
const allowedOrigins = process.env.CLIENT_URL 
  ? process.env.CLIENT_URL.split(',') 
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Serve Static Uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
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

// Initialize Socket Logic
setupSocket(io).catch(err => console.error('Socket setup failed:', err));

// Basic Health Check
app.get('/', (req: Request, res: Response) => {
  res.send('Virtual Library Server is Running');
});

// Start Server
httpServer.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
