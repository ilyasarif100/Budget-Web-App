// Frontend Configuration
// All values loaded from backend (.env via /api/config endpoint)
// No hardcoded values - everything comes from server.js reading .env

// Config object (will be populated from backend .env)
let CONFIG = {
  API_BASE_URL: null, // Will be loaded from backend
  PLAID_ENV: null, // Will be loaded from backend .env
  FEATURES: {
    SYNC_ENABLED: null,
    EXPORT_ENABLED: null,
    DARK_MODE_ENABLED: null,
    AUTH_REQUIRED: null,
  },
  APP_NAME: null,
  APP_VERSION: null,
  DEFAULT_PAGE_SIZE: null,
  VIRTUAL_SCROLL_BUFFER: null,
};

// Config loaded promise
let configLoadedPromise = null;

// Load config from backend (uses .env values with sensible defaults)
async function loadConfig() {
  try {
    // Use window.location to dynamically detect API URL - works on any computer/IP
    let baseUrl = window.location.origin;

    // If running from file:// protocol, try to detect backend dynamically
    if (window.location.protocol === 'file:' || !window.location.hostname) {
      // Try common ports dynamically
      const portsToTry = [3000, 3001, 8000];
      let found = false;

      for (const port of portsToTry) {
        try {
          // Use current location's hostname or try localhost
          const hostname = window.location.hostname || 'localhost';
          const protocol =
            window.location.protocol === 'file:' ? 'http:' : window.location.protocol;
          const testUrl = `${protocol}//${hostname}:${port}`;
          const response = await fetch(`${testUrl}/api/config`, {
            method: 'GET',
            signal: AbortSignal.timeout(1000), // 1 second timeout
          });
          if (response.ok) {
            baseUrl = testUrl;
            found = true;
            break;
          }
        } catch (e) {
          // Try next port
          continue;
        }
      }

      if (!found) {
        // Use current origin or default
        baseUrl = window.location.origin || 'http://localhost:3000';
      }
    }

    const response = await fetch(`${baseUrl}/api/config`);
    if (response.ok) {
      const backendConfig = await response.json();
      CONFIG = backendConfig;
      // Update global reference
      window.CONFIG = CONFIG;
    } else {
      throw new Error('Failed to fetch config');
    }
  } catch (error) {
    console.error('Failed to load config from backend, using defaults:', error.message);
    // Use sensible defaults if backend not available - use current origin dynamically
    const defaultOrigin = window.location.origin || 'http://localhost:3000';
    CONFIG = {
      API_BASE_URL: `${defaultOrigin}/api`,
      PLAID_ENV: 'sandbox',
      FEATURES: {
        SYNC_ENABLED: true,
        EXPORT_ENABLED: true,
        DARK_MODE_ENABLED: true,
        AUTH_REQUIRED: false,
      },
      APP_NAME: 'Budget Tracker',
      APP_VERSION: '1.0.0',
      DEFAULT_PAGE_SIZE: 50,
      VIRTUAL_SCROLL_BUFFER: 5,
    };
    // Update global reference
    window.CONFIG = CONFIG;
  }
}

// Wait for config to load
function waitForConfig() {
  if (!configLoadedPromise) {
    configLoadedPromise = loadConfig();
  }
  return configLoadedPromise;
}

// Load config immediately
loadConfig();

// Make config available globally
window.CONFIG = CONFIG;
window.waitForConfig = waitForConfig;
