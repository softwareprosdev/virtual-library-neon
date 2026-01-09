import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Explicitly load .env from server directory if available
dotenv.config({ path: path.join(__dirname, '../.env') });

const rawConnectionString = process.env.DATABASE_URL;

if (!rawConnectionString) {
  console.error("FATAL: DATABASE_URL is not defined.");
  process.exit(1);
}

const isAccelerateUrl = rawConnectionString.startsWith('prisma+postgres://');

console.log(`[db]: Using ${isAccelerateUrl ? 'Prisma Accelerate' : 'Direct PostgreSQL'} connection`);

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// For Accelerate, we use a simple PrismaClient without the pg adapter
export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'info', 'warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Test database connection on startup
prisma.$connect()
  .then(() => {
    console.log('[db]: Database connection successful');
  })
  .catch((err) => {
    console.error('[db]: Database connection failed:', err.message);
  });

export default prisma;
