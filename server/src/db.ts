import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Explicitly load .env from server directory if available
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("FATAL: DATABASE_URL is not defined.");
  process.exit(1);
}

// Determine TLS configuration based on DATABASE_URL or environment
// For internal Coolify/Docker networks, TLS is typically not needed
const requiresTls = connectionString.includes('sslmode=require') ||
                    connectionString.includes('sslmode=verify') ||
                    connectionString.includes('ssl=true') ||
                    process.env.DATABASE_TLS === 'true';

console.log(`[db]: Connecting to PostgreSQL (TLS: ${requiresTls ? 'enabled' : 'disabled'})`);

// Create PostgreSQL connection pool with error handling
const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // TLS configuration - disabled by default for internal Docker networks
  // Enable with DATABASE_TLS=true or sslmode in connection string
  ssl: requiresTls ? {
    rejectUnauthorized: false, // Allow self-signed certs
  } : undefined,
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
