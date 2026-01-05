import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import path from 'path';

// Explicitly load .env from server directory if available
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("FATAL: DATABASE_URL is not defined.");
  // Don't exit here to allow build to pass if DB not needed for build, but runtime will fail
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ 
  adapter,
  log: ['query', 'info', 'warn', 'error'], // Enable more logging
});

// Test connection on startup
if (process.env.NODE_ENV !== 'test') {
    pool.connect().then(client => {
        console.log("✅ Database connection pool established.");
        client.release();
    }).catch(err => {
        console.error("❌ Database connection failed:", err);
    });
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
