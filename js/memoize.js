// ============================================
// Memoization Utility Module
// ============================================

// Simple memoization function
function memoize(fn, options = {}) {
  const {
    maxAge = Infinity, // Cache expiration time in ms
    maxSize = 100, // Maximum cache size
    keyGenerator = (...args) => JSON.stringify(args), // Key generator function
  } = options;

  const cache = new Map();
  const timestamps = new Map();

  return function (...args) {
    const key = keyGenerator(...args);
    const now = Date.now();

    // Check if cached and not expired
    if (cache.has(key)) {
      const timestamp = timestamps.get(key);
      if (now - timestamp < maxAge) {
        return cache.get(key);
      } else {
        // Expired, remove it
        cache.delete(key);
        timestamps.delete(key);
      }
    }

    // Enforce max size (LRU eviction)
    if (cache.size >= maxSize) {
      // Remove oldest entry
      let oldestKey = null;
      let oldestTime = Infinity;

      for (const [k, timestamp] of timestamps.entries()) {
        if (timestamp < oldestTime) {
          oldestTime = timestamp;
          oldestKey = k;
        }
      }

      if (oldestKey) {
        cache.delete(oldestKey);
        timestamps.delete(oldestKey);
      }
    }

    // Compute and cache result
    const result = fn.apply(this, args);
    cache.set(key, result);
    timestamps.set(key, now);

    return result;
  };
}

// Clear memoization cache
function clearMemoCache(memoizedFn) {
  if (memoizedFn && memoizedFn.cache) {
    memoizedFn.cache.clear();
    if (memoizedFn.timestamps) {
      memoizedFn.timestamps.clear();
    }
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.memoize = memoize;
  window.clearMemoCache = clearMemoCache;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    memoize,
    clearMemoCache,
  };
}
