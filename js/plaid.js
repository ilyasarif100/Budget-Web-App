// ============================================
// Plaid Integration Module
// ============================================

// Plaid Integration State
let plaidLinkHandler = null;
let plaidItemIds = new Map(); // Map of account_id -> { item_id, cursor } (NO ACCESS TOKENS)

// Lazy load Plaid SDK
let plaidSDKLoaded = false;
async function loadPlaidSDK() {
    if (plaidSDKLoaded || typeof Plaid !== 'undefined') {
        plaidSDKLoaded = true;
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        // Check if script already exists
        if (document.querySelector('script[src*="plaid.com/link"]')) {
            // Wait for Plaid to be available
            const checkPlaid = setInterval(() => {
                if (typeof Plaid !== 'undefined') {
                    clearInterval(checkPlaid);
                    plaidSDKLoaded = true;
                    resolve();
                }
            }, 100);
            
            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkPlaid);
                reject(new Error('Plaid SDK failed to load'));
            }, 10000);
            return;
        }

        // Load Plaid SDK dynamically
        const script = document.createElement('script');
        script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
        script.async = true;
        script.onload = () => {
            // Wait for Plaid to be available
            const checkPlaid = setInterval(() => {
                if (typeof Plaid !== 'undefined') {
                    clearInterval(checkPlaid);
                    plaidSDKLoaded = true;
                    resolve();
                }
            }, 100);
            
            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkPlaid);
                reject(new Error('Plaid SDK failed to initialize'));
            }, 10000);
        };
        script.onerror = () => reject(new Error('Failed to load Plaid SDK'));
        document.head.appendChild(script);
    });
}

// Initialize Plaid Link
async function initializePlaidLink() {
    try {
        // Lazy load Plaid SDK first
        await loadPlaidSDK();
        
        // Ensure config is loaded
        await waitForConfig();
        
        // Validate config is loaded
        if ((!window.CONFIG || !window.CONFIG.API_BASE_URL) && (!CONFIG || !CONFIG.API_BASE_URL)) {
            const fallbackUrl = window.location.origin ? `${window.location.origin}/api` : 'http://localhost:3000/api';
            console.warn('Config not fully loaded, using fallback URL:', fallbackUrl);
            window.CONFIG = window.CONFIG || CONFIG || {};
            window.CONFIG.API_BASE_URL = fallbackUrl;
        }
        
        const apiUrl = window.CONFIG?.API_BASE_URL || CONFIG?.API_BASE_URL;
        if (!apiUrl) {
            throw new Error('Configuration not loaded. Please refresh the page.');
        }
        
        // Get link token from backend (authenticated)
        const response = await authenticatedFetch(`${apiUrl}/link/token/create`, {
            method: 'POST',
            body: JSON.stringify({})
        });

        if (!response.ok) {
            const error = await response.json();
            const errorMessage = error.message || 'Failed to create link token';
            const errorCode = error.error_code || 'UNKNOWN';
            
            if (errorCode === 'INVALID_API_KEYS') {
                throw new Error('Invalid Plaid credentials. Please check your .env file.');
            }
            
            throw new Error(errorMessage);
        }

        const data = await response.json();
        const linkToken = data.link_token;

        // Initialize Plaid Link
        if (typeof Plaid !== 'undefined') {
            const handler = Plaid.create({
                token: linkToken,
                onSuccess: handlePlaidSuccess,
                onExit: handlePlaidExit,
                onEvent: handlePlaidEvent,
            });

            plaidLinkHandler = handler;
            
            // Hide loading, show Plaid Link
            const loadingEl = document.getElementById('plaid-loading');
            const errorEl = document.getElementById('plaid-error');
            if (loadingEl) loadingEl.style.display = 'none';
            if (errorEl) errorEl.style.display = 'none';
            
            // Open Plaid Link
            handler.open();
        } else {
            throw new Error('Plaid SDK not loaded');
        }
    } catch (error) {
        console.error('Error initializing Plaid Link:', error);
        if (typeof errorHandler !== 'undefined') {
            errorHandler.handle(error, 'Plaid Initialization', true);
        }
        throw error;
    }
}

// Handle successful Plaid connection
async function handlePlaidSuccess(publicToken, metadata) {
    try {
        // Check server health before proceeding - CRITICAL CHECK
        const checkHealth = window.checkServerHealth || (typeof checkServerHealth !== 'undefined' ? checkServerHealth : null);
        if (checkHealth) {
            const serverHealthy = await checkHealth();
            if (!serverHealthy) {
                throw new Error('Cannot connect to server. Please make sure the backend server is running on port 3000.');
            }
        }
        
        showToast('Account connected successfully!', 'success');
        
        // Exchange public token for access token (stored securely on backend)
        // NO RETRY - if server is down, fail fast with clear error
        const tokenResponse = await authenticatedFetch(`${window.CONFIG.API_BASE_URL}/item/public_token/exchange`, {
            method: 'POST',
            body: JSON.stringify({
                public_token: publicToken,
            }),
        });

        if (!tokenResponse.ok) {
            const error = await tokenResponse.json();
            throw new Error(error.message || 'Failed to exchange token');
        }

        const tokenData = await tokenResponse.json();
        const itemId = tokenData.item_id;

        // Get accounts from Plaid (using item_id, backend will retrieve access token)
        // NO RETRY - if server is down, fail fast with clear error
        const accountsResponse = await authenticatedFetch(`${window.CONFIG.API_BASE_URL}/accounts/get`, {
            method: 'POST',
            body: JSON.stringify({
                item_id: itemId,
            }),
        });

        if (!accountsResponse.ok) {
            const error = await accountsResponse.json();
            throw new Error(error.message || 'Failed to get accounts');
        }

        const accountsData = await accountsResponse.json();
        
        // Track newly added account IDs for efficient syncing
        const newlyAddedAccountIds = [];
        
        // Add accounts to our system
        for (const plaidAccount of accountsData.accounts) {
            // Check if account already exists
            const existingAccount = accounts.find(acc => acc.plaidAccountId === plaidAccount.account_id);
            
            if (!existingAccount) {
                // Map Plaid account to our account format (NO ACCESS TOKEN STORED)
                const newAccount = {
                    id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    name: plaidAccount.name,
                    type: plaidAccount.type,
                    subtype: plaidAccount.subtype || 'other',
                    mask: plaidAccount.mask || '0000',
                    balance: plaidAccount.balances.current || 0,
                    initialBalance: plaidAccount.balances.current || 0,
                    plaidAccountId: plaidAccount.account_id,
                    plaidItemId: itemId,
                    order: accounts.length, // Set order for new account
                    // NO plaidAccessToken - stored securely on backend only
                };

                accounts.push(newAccount);
                if (typeof dirtyAccounts !== 'undefined') {
                    dirtyAccounts.add(newAccount.id); // Mark as changed
                }
                newlyAddedAccountIds.push(newAccount.id); // Track for syncing
                
                // Store item_id mapping (NO access token)
                plaidItemIds.set(newAccount.id, {
                    item_id: itemId,
                    cursor: null,
                });
                
                // Automatically include new account in total balance
                if (typeof includedAccountIds !== 'undefined') {
                    includedAccountIds.add(newAccount.id);
                }
            } else {
                // Update existing account balance
                existingAccount.balance = plaidAccount.balances.current || existingAccount.balance;
                existingAccount.initialBalance = plaidAccount.balances.current || existingAccount.initialBalance;
                
                if (typeof dirtyAccounts !== 'undefined') {
                    dirtyAccounts.add(existingAccount.id);
                }
            }
        }

        // Save accounts
        if (typeof saveData !== 'undefined') {
            await saveData();
        }
        if (typeof saveIncludedAccounts !== 'undefined') {
            saveIncludedAccounts();
        }
        
        // Close Plaid modal
        const plaidModal = document.getElementById('plaid-modal');
        if (plaidModal) plaidModal.classList.remove('active');
        
        // Refresh UI
        if (typeof buildAccountsMap !== 'undefined') {
            buildAccountsMap();
        }
        if (typeof renderAccounts !== 'undefined') {
            renderAccounts();
        }
        if (typeof updateTotalBalance !== 'undefined') {
            updateTotalBalance();
        }
        if (typeof populateAccountFilters !== 'undefined') {
            populateAccountFilters();
        }
        
        // OPTIMIZATION: Sync only newly added accounts, not all accounts
        // Check server health again before syncing (server might have crashed)
        if (newlyAddedAccountIds.length > 0 && typeof syncAllTransactions !== 'undefined') {
            const checkHealth = window.checkServerHealth || (typeof checkServerHealth !== 'undefined' ? checkServerHealth : null);
            if (checkHealth) {
                const serverHealthy = await checkHealth();
                if (!serverHealthy) {
                    showToast('Accounts added, but server is unavailable for syncing. Please restart the server and sync manually.', 'warning');
                    return; // Exit early - don't try to sync if server is down
                }
            }
            showToast(`Syncing ${newlyAddedAccountIds.length} new account(s)...`, 'info');
            await syncAllTransactions(newlyAddedAccountIds);
        }
        if (typeof window !== 'undefined' && window.populateTransactionAccountSelect) {
            window.populateTransactionAccountSelect();
        }
        
        if (newlyAddedAccountIds.length > 0) {
            showToast(`${newlyAddedAccountIds.length} account(s) added and synced successfully!`, 'success');
        } else {
            showToast(`${accountsData.accounts.length} account(s) added successfully!`, 'success');
        }
    } catch (error) {
        // Don't log Plaid SDK internal errors to console (they're already logged by browser)
        if (!error.message.includes('runtime.lastError') && !error.message.includes('message port closed')) {
            console.error('Error handling Plaid success:', error);
        }
        
        // Provide user-friendly error messages
        let userMessage = 'Error connecting account';
        if (error.message.includes('Cannot connect to server') || error.message.includes('ERR_CONNECTION_REFUSED')) {
            userMessage = 'Cannot connect to server. Please make sure the backend is running on port 3000.';
        } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
            userMessage = 'Plaid service temporarily unavailable. Please try again in a moment.';
        } else if (error.message) {
            userMessage = error.message;
        }
        
        if (typeof errorHandler !== 'undefined') {
            errorHandler.handle(error, 'Plaid Success Handler', true);
        } else if (typeof showToast !== 'undefined') {
            showToast(userMessage, 'error');
        }
    }
}

// Handle Plaid exit
function handlePlaidExit(err, metadata) {
    if (err) {
        console.error('Plaid exit error:', err);
        if (err.error_code !== 'USER_EXIT') {
            showPlaidError(err.error_message || 'Connection cancelled or failed');
        }
    }
}

// Handle Plaid events
function handlePlaidEvent(eventName, metadata) {
    // Log events for debugging (optional)
    // console.log('Plaid event:', eventName, metadata);
}

// Show Plaid error
function showPlaidError(message) {
    const errorEl = document.getElementById('plaid-error');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
    if (typeof showToast !== 'undefined') {
        showToast(message, 'error');
    }
}

// Make functions globally accessible for use in other modules
if (typeof window !== 'undefined') {
    window.showPlaidError = showPlaidError;
    window.initializePlaidLink = initializePlaidLink;
    window.handlePlaidSuccess = handlePlaidSuccess;
    window.handlePlaidExit = handlePlaidExit;
    window.handlePlaidEvent = handlePlaidEvent;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializePlaidLink,
        handlePlaidSuccess,
        handlePlaidExit,
        handlePlaidEvent,
        showPlaidError
    };
}

