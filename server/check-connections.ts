import prisma from './src/db';
import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

async function check() {
  console.log("--- Checking Infrastructure ---");
  console.log("Using DATABASE_URL:", process.env.DATABASE_URL);

  // 1. Check Postgres
  try {
    console.log("1. Connecting to Database...");
    await prisma.$connect();
    const userCount = await prisma.user.count();
    console.log(`✅ Database Connected! User count: ${userCount}`);
  } catch (e) {
    console.error("❌ Database Connection Failed:", e);
  } finally {
    await prisma.$disconnect();
  }

  // 2. Check Redis
  try {
    console.log("2. Connecting to Redis...");
    const client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    client.on('error', (err) => console.error('Redis Client Error', err));
    await client.connect();
    console.log("✅ Redis Connected!");
    await client.disconnect();
  } catch (e) {
    console.error("❌ Redis Connection Failed:", e);
  }
}

check();
