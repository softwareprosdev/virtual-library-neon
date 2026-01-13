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

// Ensure we're using internal PostgreSQL, not Prisma Accelerate
if (rawConnectionString.startsWith('prisma+postgres://')) {
  console.error("FATAL: This app is configured to use internal PostgreSQL database, not Prisma Accelerate. Please update DATABASE_URL to use a standard PostgreSQL connection string.");
  process.exit(1);
}

// Strip SSL certificate file references from connection string
function sanitizeConnectionString(connStr: string): string {
  try {
    const url = new URL(connStr);
    // Remove SSL cert file params that may not exist in container
    url.searchParams.delete('sslrootcert');
    url.searchParams.delete('sslcert');
    url.searchParams.delete('sslkey');
    // For internal Docker networks, remove sslmode unless explicitly required
    if (process.env.DATABASE_TLS !== 'true') {
      url.searchParams.delete('sslmode');
    }
    return url.toString();
  } catch {
    // If URL parsing fails, try regex fallback
    return connStr
      .replace(/[?&]sslrootcert=[^&]*/g, '')
      .replace(/[?&]sslcert=[^&]*/g, '')
      .replace(/[?&]sslkey=[^&]*/g, '')
      .replace(/[?&]sslmode=[^&]*/g, process.env.DATABASE_TLS === 'true' ? '$&' : '');
  }
}

const connectionString = sanitizeConnectionString(rawConnectionString);

// Determine TLS configuration
const requiresTls = process.env.DATABASE_TLS === 'true';

console.log(`[db]: Using internal PostgreSQL database (NOT Prisma Accelerate)`);
console.log(`[db]: Connecting to PostgreSQL (TLS: ${requiresTls ? 'enabled' : 'disabled'})`);

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  datasources: {
    db: {
      url: connectionString,
    },
  },
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'info', 'warn', 'error'],
  // PostgreSQL 17 Connection Pool Optimization for Coolify/VPS
  // Optimized for efficient resource usage on limited VPS environments
  __internal: {
    engine: {
      connection_limit: parseInt(process.env.DB_CONNECTION_LIMIT || '5'),
      pool_timeout: parseInt(process.env.DB_POOL_TIMEOUT || '10'),
      connect_timeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10'),
    }
  }
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Test database connection on startup
prisma.$connect()
  .then(() => {
    console.log('[db]: PostgreSQL connection successful');
  })
  .catch(err => {
    console.error('[db]: PostgreSQL connection failed:', err.message);
  });

export default prisma;
