/**
 * Redis Cache Utility
 * Fast caching layer for frequently accessed data
 */
import { createClient } from 'redis';

// Redis client singleton
let redisClient: ReturnType<typeof createClient> | null = null;

// Cache TTL defaults (in seconds)
export const CACHE_TTL = {
  SHORT: 60,           // 1 minute - for volatile data
  MEDIUM: 300,         // 5 minutes - for semi-static data  
  LONG: 3600,          // 1 hour - for static data
  VERY_LONG: 86400,    // 24 hours - for rarely changing data
} as const;

/**
 * Get Redis client instance
 */
export const getRedisClient = async () => {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = createClient({ url: redisUrl });
    
    redisClient.on('error', (err) => {
      console.error('[Redis Cache] Connection error:', err);
    });
    
    redisClient.on('connect', () => {
      console.log('[Redis Cache] Connected successfully');
    });

    await redisClient.connect().catch((err) => {
      console.error('[Redis Cache] Failed to connect:', err);
      redisClient = null;
    });
  }
  return redisClient;
};

/**
 * Get cached value
 */
export const cacheGet = async <T>(key: string): Promise<T | null> => {
  try {
    const client = await getRedisClient();
    if (!client) return null;
    
    const cached = await client.get(key);
    if (!cached) return null;
    
    return JSON.parse(cached) as T;
  } catch (err) {
    console.error('[Redis Cache] Get error:', err);
    return null;
  }
};

/**
 * Set cached value with TTL
 */
export const cacheSet = async <T>(key: string, value: T, ttlSeconds: number = CACHE_TTL.MEDIUM): Promise<boolean> => {
  try {
    const client = await getRedisClient();
    if (!client) return false;
    
    await client.setEx(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error('[Redis Cache] Set error:', err);
    return false;
  }
};

/**
 * Delete cached value
 */
export const cacheDel = async (key: string): Promise<boolean> => {
  try {
    const client = await getRedisClient();
    if (!client) return false;
    
    await client.del(key);
    return true;
  } catch (err) {
    console.error('[Redis Cache] Delete error:', err);
    return false;
  }
};

/**
 * Delete all cached values matching a pattern
 */
export const cacheDelPattern = async (pattern: string): Promise<boolean> => {
  try {
    const client = await getRedisClient();
    if (!client) return false;
    
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
    return true;
  } catch (err) {
    console.error('[Redis Cache] Delete pattern error:', err);
    return false;
  }
};

/**
 * Cache key generators for consistent naming
 */
export const CacheKeys = {
  // Room caching
  roomsList: () => 'rooms:list',
  roomById: (id: string) => `room:${id}`,
  roomMessages: (id: string) => `room:${id}:messages`,
  
  // User caching
  userProfile: (id: string) => `user:${id}:profile`,
  userProgress: (id: string) => `user:${id}:progress`,
  
  // Book caching
  bookList: () => 'books:list',
  bookById: (id: string) => `book:${id}`,
  
  // Leaderboard
  leaderboard: () => 'gamification:leaderboard',
} as const;

/**
 * Wrapper for caching function results
 * Usage: const data = await withCache('key', 300, () => expensiveFunction());
 */
export const withCache = async <T>(
  key: string, 
  ttlSeconds: number, 
  fetchFn: () => Promise<T>
): Promise<T> => {
  // Try to get from cache first
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  // Fetch fresh data
  const freshData = await fetchFn();
  
  // Cache it for next time (don't await, fire and forget)
  cacheSet(key, freshData, ttlSeconds);
  
  return freshData;
};
