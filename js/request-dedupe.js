// ============================================
// Request Deduplication Module
// ============================================

// Track pending requests to prevent duplicates
const pendingRequests = new Map();

// Generate request key
function generateRequestKey(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.stringify(JSON.parse(options.body)) : '';
  const headers = options.headers ? JSON.stringify(options.headers) : '';
  return `${method}:${url}:${body}:${headers}`;
}

// Deduplicate fetch requests
async function deduplicatedFetch(url, options = {}) {
  const key = generateRequestKey(url, options);

  // If request is already pending, return the same promise
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  // Create new request promise
  const requestPromise = fetch(url, options)
    .then(response => {
      // Remove from pending after completion
      pendingRequests.delete(key);
      return response;
    })
    .catch(error => {
      // Remove from pending on error
      pendingRequests.delete(key);
      throw error;
    });

  // Store pending request
  pendingRequests.set(key, requestPromise);

  return requestPromise;
}

// Clear pending requests (useful for cleanup)
function clearPendingRequests() {
  pendingRequests.clear();
}

// Get pending request count
function getPendingRequestCount() {
  return pendingRequests.size;
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.deduplicatedFetch = deduplicatedFetch;
  window.clearPendingRequests = clearPendingRequests;
  window.getPendingRequestCount = getPendingRequestCount;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    deduplicatedFetch,
    clearPendingRequests,
    getPendingRequestCount,
  };
}
