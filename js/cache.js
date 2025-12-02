// ============================================
// API Response Caching Module
// ============================================

// Cache configuration
const CACHE_CONFIG = {
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
  MAX_SIZE: 100, // Maximum number of cached responses
  ENABLED: true,
};

// In-memory cache store
const apiCache = new Map();
const cacheTimestamps = new Map();

// Cache entry structure: { data, timestamp, ttl }
class CacheEntry {
  constructor(data, ttl = CACHE_CONFIG.DEFAULT_TTL) {
    this.data = data;
    this.timestamp = Date.now();
    this.ttl = ttl;
  }

  isExpired() {
    return Date.now() - this.timestamp > this.ttl;
  }
}

// Generate cache key from URL and options
function generateCacheKey(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.stringify(JSON.parse(options.body)) : '';
  return `${method}:${url}:${body}`;
}

// Get cached response
function getCachedResponse(url, options = {}) {
  if (!CACHE_CONFIG.ENABLED) {
    return null;
  }

  const key = generateCacheKey(url, options);
  const entry = apiCache.get(key);

  if (!entry) {
    return null;
  }

  if (entry.isExpired()) {
    apiCache.delete(key);
    cacheTimestamps.delete(key);
    return null;
  }

  return entry.data;
}

// Set cached response
function setCachedResponse(url, options = {}, data, ttl = null) {
  if (!CACHE_CONFIG.ENABLED) {
    return;
  }

  // Enforce max cache size (LRU eviction)
  if (apiCache.size >= CACHE_CONFIG.MAX_SIZE) {
    // Remove oldest entry
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, timestamp] of cacheTimestamps.entries()) {
      if (timestamp < oldestTime) {
        oldestTime = timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      apiCache.delete(oldestKey);
      cacheTimestamps.delete(oldestKey);
    }
  }

  const key = generateCacheKey(url, options);
  const entry = new CacheEntry(data, ttl || CACHE_CONFIG.DEFAULT_TTL);

  apiCache.set(key, entry);
  cacheTimestamps.set(key, entry.timestamp);
}

// Clear cache for specific URL pattern
function clearCache(urlPattern = null) {
  if (!urlPattern) {
    apiCache.clear();
    cacheTimestamps.clear();
    return;
  }

  // Clear entries matching pattern
  for (const key of apiCache.keys()) {
    if (key.includes(urlPattern)) {
      apiCache.delete(key);
      cacheTimestamps.delete(key);
    }
  }
}

// Clear expired entries
function clearExpiredEntries() {
  for (const [key, entry] of apiCache.entries()) {
    if (entry.isExpired()) {
      apiCache.delete(key);
      cacheTimestamps.delete(key);
    }
  }
}

// Cleanup expired entries periodically
setInterval(clearExpiredEntries, 60000); // Every minute

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.apiCache = {
    get: getCachedResponse,
    set: setCachedResponse,
    clear: clearCache,
    clearExpired: clearExpiredEntries,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getCachedResponse,
    setCachedResponse,
    clearCache,
    clearExpiredEntries,
  };
}
