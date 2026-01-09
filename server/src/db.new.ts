import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Explicitly load .env from server directory if available
dotenv.config({ path: path.join(__dirname, '../.env') });

const rawConnectionString = process.env.DATABASE_URL;

if (!rawConnectionString) {
  console.error("FATAL: DATABASE_URL is not defined.");
  process.exit(1);
}

// Detect if using Prisma Accelerate
const isAccelerateUrl = rawConnectionString.startsWith('prisma+postgres://');

console.log(`[db]: Using ${isAccelerateUrl ? 'Prisma Accelerate ⚡' : 'Direct PostgreSQL'} connection`);

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

let prisma: PrismaClient;

if (isAccelerateUrl) {
  // For Prisma Accelerate, use simple PrismaClient without adapter
  prisma = globalForPrisma.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['info', 'warn', 'error'],
  });
} else {
  // For direct PostgreSQL connection, use the pg adapter

  // Strip SSL certificate file references from connection string
  function sanitizeConnectionString(connStr: string): string {
    try {
      const url = new URL(connStr);
      url.searchParams.delete('sslrootcert');
      url.searchParams.delete('sslcert');
      url.searchParams.delete('sslkey');
      if (process.env.DATABASE_TLS !== 'true') {
        url.searchParams.delete('sslmode');
      }
      return url.toString();
    } catch {
      return connStr
        .replace(/[?&]sslrootcert=[^&]*/g, '')
        .replace(/[?&]sslcert=[^&]*/g, '')
        .replace(/[?&]sslkey=[^&]*/g, '')
        .replace(/[?&]sslmode=[^&]*/g, process.env.DATABASE_TLS === 'true' ? '$&' : '');
    }
  }

  const connectionString = sanitizeConnectionString(rawConnectionString);
  const requiresTls = process.env.DATABASE_TLS === 'true';

  console.log(`[db]: PostgreSQL TLS: ${requiresTls ? 'enabled' : 'disabled'}`);

  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: requiresTls ? { rejectUnauthorized: false } : false,
  });

  pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err);
  });

  const adapter = new PrismaPg(pool);

  prisma = globalForPrisma.prisma || new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'info', 'warn', 'error'],
  });

  // Test pool connection
  pool.connect()
    .then(client => {
      console.log('[db]: PostgreSQL pool connection successful');
      client.release();
    })
    .catch(err => {
      console.error('[db]: PostgreSQL pool connection failed:', err.message);
    });
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Test Prisma connection
prisma.$connect()
  .then(() => {
    console.log('[db]: Prisma client connected successfully ✅');
  })
  .catch((err) => {
    console.error('[db]: Prisma client connection failed:', err.message);
  });

export { prisma };
export default prisma;
