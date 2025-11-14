// ============================================
// Service Worker for Offline Support
// ============================================

const CACHE_NAME = 'budget-tracker-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/config.js',
    '/dist/app.min.js',
    '/js/utils.js',
    '/js/db.js',
    '/js/data.js',
    '/js/auth.js',
    '/js/plaid.js',
    '/js/error-handler.js',
    '/js/validation.js',
    '/js/ui-helpers.js',
    '/js/ui-filters.js',
    '/js/ui-update.js',
    '/js/ui-render.js',
    '/js/cache.js',
    '/js/request-dedupe.js',
    '/js/memoize.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(STATIC_ASSETS.filter(url => {
                    // Only cache assets that exist
                    return true; // Will fail gracefully if asset doesn't exist
                })).catch(err => {
                    console.log('Some assets failed to cache:', err);
                });
            })
    );
    self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle GET requests and same-origin requests
    if (request.method !== 'GET' || url.origin !== location.origin) {
        return; // Let browser handle it
    }

    // For API calls, use network-first strategy
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Cache successful GET responses
                    if (response.ok && request.method === 'GET') {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Network failed, try cache
                    return caches.match(request).then(cachedResponse => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // Return offline response
                        return new Response(
                            JSON.stringify({ error: 'Offline', message: 'No internet connection' }),
                            {
                                status: 503,
                                statusText: 'Service Unavailable',
                                headers: { 'Content-Type': 'application/json' }
                            }
                        );
                    });
                })
        );
        return;
    }

    // For static assets, use cache-first strategy
    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(request).then(response => {
                    // Cache the response
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                });
            })
    );
});

// Background sync for transactions (if supported)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-transactions') {
        event.waitUntil(
            // Sync transactions in background
            fetch('/api/transactions/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }).catch(err => {
                console.log('Background sync failed:', err);
            })
        );
    }
});

