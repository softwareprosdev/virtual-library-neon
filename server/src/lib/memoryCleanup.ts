/**
 * Memory Cleanup Utility
 * Prevents memory leaks from in-memory Maps by running periodic cleanup
 */

interface CleanableMap<K, V extends { expires?: number; resetTime?: number; lastAttempt?: number; timestamp?: number }> {
  map: Map<K, V>;
  name: string;
  getExpiry: (value: V) => number;
}

// Registry of maps to clean
const mapsToClean: CleanableMap<any, any>[] = [];

/**
 * Register a Map for periodic cleanup
 */
export function registerForCleanup<K, V extends { expires?: number; resetTime?: number; lastAttempt?: number; timestamp?: number }>(
  map: Map<K, V>,
  name: string,
  getExpiry: (value: V) => number
) {
  mapsToClean.push({ map, name, getExpiry });
  console.log(`[Memory] Registered "${name}" for cleanup (${map.size} entries)`);
}

/**
 * Run cleanup on all registered maps
 */
export function runCleanup(): number {
  const now = Date.now();
  let totalCleaned = 0;

  for (const { map, name, getExpiry } of mapsToClean) {
    let cleaned = 0;
    const initialSize = map.size;

    map.forEach((value, key) => {
      const expiry = getExpiry(value);
      if (now > expiry) {
        map.delete(key);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      console.log(`[Memory] Cleaned ${cleaned} expired entries from "${name}" (${initialSize} -> ${map.size})`);
    }
    totalCleaned += cleaned;
  }

  return totalCleaned;
}

/**
 * Get memory stats
 */
export function getMemoryStats() {
  const stats: Record<string, number> = {};
  for (const { map, name } of mapsToClean) {
    stats[name] = map.size;
  }
  return {
    maps: stats,
    heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
  };
}

// Maximum entries per map to prevent unbounded growth
const MAX_MAP_ENTRIES = 10000;

/**
 * Force limit map size (emergency cleanup)
 */
export function enforceMapLimits(): number {
  let totalRemoved = 0;

  for (const { map, name } of mapsToClean) {
    if (map.size > MAX_MAP_ENTRIES) {
      const toRemove = map.size - MAX_MAP_ENTRIES;
      let removed = 0;
      
      // Remove oldest entries (first added)
      for (const key of map.keys()) {
        if (removed >= toRemove) break;
        map.delete(key);
        removed++;
      }
      
      console.warn(`[Memory] Force-cleaned ${removed} entries from "${name}" (exceeded ${MAX_MAP_ENTRIES} limit)`);
      totalRemoved += removed;
    }
  }

  return totalRemoved;
}

// Start periodic cleanup (every 5 minutes)
let cleanupInterval: NodeJS.Timeout | null = null;

export function startMemoryCleanup(intervalMs = 5 * 60 * 1000) {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    runCleanup();
    enforceMapLimits();
  }, intervalMs);

  // Run initial cleanup after 30 seconds
  setTimeout(() => {
    runCleanup();
  }, 30000);

  console.log(`[Memory] Started cleanup interval (every ${intervalMs / 1000}s)`);
}

export function stopMemoryCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
