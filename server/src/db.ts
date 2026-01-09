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

// Strip SSL certificate file references from connection string
// pg-connection-string tries to read cert files which may not exist in container
function sanitizeConnectionString(connStr: string): string {
  try {
    const url = new URL(connStr);
    // Remove SSL cert file params that pg-connection-string tries to read
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

console.log(`[db]: Connecting to PostgreSQL (TLS: ${requiresTls ? 'enabled' : 'disabled'})`);

// Create PostgreSQL connection pool with error handling
const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // TLS configuration - only enable if DATABASE_TLS=true
  ssl: requiresTls ? {
    rejectUnauthorized: false, // Allow self-signed certs
  } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

const adapter = new PrismaPg(pool);

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'info', 'warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Test database connection on startup
pool.connect()
  .then(client => {
    console.log('[db]: PostgreSQL connection successful');
    client.release();
  })
  .catch(err => {
    console.error('[db]: PostgreSQL connection failed:', err.message);
  });

export default prisma;
