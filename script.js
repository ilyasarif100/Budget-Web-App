// Budget Tracker App - SECURE VERSION
// Transaction data arrays (initialized as empty)
let categories = [];
let accounts = [];
let transactions = [];

// Authentication State
let authToken = null;
let currentUser = null;

// Plaid Integration State
let plaidLinkHandler = null;
let plaidItemIds = new Map(); // Map of account_id -> { item_id, cursor } (NO ACCESS TOKENS)

// Plaid account subtypes mapping (global for use in editAccount)
const accountSubtypes = {
    depository: [
        { value: 'checking', label: 'Checking' },
        { value: 'savings', label: 'Savings' },
        { value: 'money market', label: 'Money Market' },
        { value: 'paypal', label: 'PayPal' },
        { value: 'cd', label: 'Certificate of Deposit' },
        { value: 'prepaid', label: 'Prepaid' }
    ],
    credit: [
        { value: 'credit card', label: 'Credit Card' },
        { value: 'paypal', label: 'PayPal Credit' },
        { value: 'all', label: 'All' }
    ],
    loan: [
        { value: 'auto', label: 'Auto Loan' },
        { value: 'business', label: 'Business Loan' },
        { value: 'commercial', label: 'Commercial Loan' },
        { value: 'construction', label: 'Construction Loan' },
        { value: 'consumer', label: 'Consumer Loan' },
        { value: 'home equity', label: 'Home Equity' },
        { value: 'line of credit', label: 'Line of Credit' },
        { value: 'loan', label: 'Loan' },
        { value: 'mortgage', label: 'Mortgage' },
        { value: 'overdraft', label: 'Overdraft' },
        { value: 'student', label: 'Student Loan' },
        { value: 'other', label: 'Other' }
    ],
    investment: [
        { value: '401a', label: '401(a)' },
        { value: '401k', label: '401(k)' },
        { value: '403b', label: '403(b)' },
        { value: '457b', label: '457(b)' },
        { value: '529', label: '529 Plan' },
        { value: 'brokerage', label: 'Brokerage' },
        { value: 'cash isa', label: 'Cash ISA' },
        { value: 'education savings account', label: 'Education Savings Account' },
        { value: 'fixed annuity', label: 'Fixed Annuity' },
        { value: 'gic', label: 'GIC' },
        { value: 'health reimbursement arrangement', label: 'Health Reimbursement Arrangement' },
        { value: 'hsa', label: 'HSA' },
        { value: 'ira', label: 'IRA' },
        { value: 'isa', label: 'ISA' },
        { value: 'keogh', label: 'Keogh' },
        { value: 'lif', label: 'LIF' },
        { value: 'life insurance', label: 'Life Insurance' },
        { value: 'lira', label: 'LIRA' },
        { value: 'lrsp', label: 'LRSP' },
        { value: 'mutual fund', label: 'Mutual Fund' },
        { value: 'non-taxable brokerage account', label: 'Non-Taxable Brokerage Account' },
        { value: 'other', label: 'Other' },
        { value: 'pension', label: 'Pension' },
        { value: 'prif', label: 'PRIF' },
        { value: 'profit sharing plan', label: 'Profit Sharing Plan' },
        { value: 'qshr', label: 'QSHR' },
        { value: 'rdsp', label: 'RDSP' },
        { value: 'resp', label: 'RESP' },
        { value: 'retirement', label: 'Retirement' },
        { value: 'rlif', label: 'RLIF' },
        { value: 'roth', label: 'Roth' },
        { value: 'roth 401k', label: 'Roth 401(k)' },
        { value: 'rrif', label: 'RRIF' },
        { value: 'rrsp', label: 'RRSP' },
        { value: 'sarsep', label: 'SARSEP' },
        { value: 'sep ira', label: 'SEP IRA' },
        { value: 'simple ira', label: 'SIMPLE IRA' },
        { value: 'sipp', label: 'SIPP' },
        { value: 'stock plan', label: 'Stock Plan' },
        { value: 'tfsa', label: 'TFSA' },
        { value: 'trust', label: 'Trust' },
        { value: 'ugma', label: 'UGMA' },
        { value: 'utma', label: 'UTMA' },
        { value: 'variable annuity', label: 'Variable Annuity' }
    ],
    other: [
        { value: 'other', label: 'Other' }
    ]
};

// Global function to update account subtype select dropdown
function updateAccountSubtypesForSelect(type) {
    const subtypeSelect = document.getElementById('account-subtype');
    if (!subtypeSelect) return;
    
    subtypeSelect.innerHTML = '';
    const subtypes = accountSubtypes[type] || accountSubtypes.other;
    subtypes.forEach(subtype => {
        const option = document.createElement('option');
        option.value = subtype.value;
        option.textContent = subtype.label;
        subtypeSelect.appendChild(option);
    });
}

// ============================================
// Authentication Functions
// ============================================

// Get auth token from localStorage
function getAuthToken() {
    return localStorage.getItem('authToken');
}

// Set auth token
function setAuthToken(token) {
    authToken = token;
    if (token) {
        localStorage.setItem('authToken', token);
    } else {
        localStorage.removeItem('authToken');
    }
}

// Make authenticated API request
async function authenticatedFetch(url, options = {}) {
    // Skip auth if disabled (check both boolean false and string "false")
    const authRequired = window.CONFIG?.FEATURES?.AUTH_REQUIRED;
    if (authRequired === false || authRequired === 'false' || authRequired === null || authRequired === undefined) {
        return fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
    }

    const token = getAuthToken();
    if (!token) {
        throw new Error('Not authenticated. Please log in.');
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status === 401) {
        // Token expired or invalid
        setAuthToken(null);
        currentUser = null;
        showAuthModal();
        throw new Error('Session expired. Please log in again.');
    }

    return response;
}

// User Registration
async function register(email, password) {
    const response = await fetch(`${window.CONFIG.API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
    }

    const data = await response.json();
    setAuthToken(data.token);
    currentUser = data.user;
    return data;
}

// User Login
async function login(email, password) {
    const response = await fetch(`${window.CONFIG.API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    setAuthToken(data.token);
    currentUser = data.user;
    return data;
}

// Verify token
async function verifyToken() {
    // Skip verification if auth is disabled
    const authRequired = window.CONFIG?.FEATURES?.AUTH_REQUIRED;
    if (authRequired === false || authRequired === 'false' || authRequired === null || authRequired === undefined) {
        return true;
    }
    
    const token = getAuthToken();
    if (!token) return false;

    try {
        const response = await authenticatedFetch(`${window.CONFIG.API_BASE_URL}/auth/verify`);
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            return true;
        }
    } catch (error) {
        return false;
    }
    return false;
}

// Show auth modal
function showAuthModal() {
    // For now, just show alert - can be enhanced with proper modal
    const email = prompt('Please log in with your email:');
    if (!email) return;
    
    const password = prompt('Enter your password:');
    if (!password) return;

    login(email, password).then(() => {
        showToast('Logged in successfully!', 'success');
        location.reload();
    }).catch(err => {
        showToast('Login failed: ' + err.message, 'error');
    });
}

// ============================================
// Plaid Integration Functions
// ============================================

// Initialize Plaid Link
async function initializePlaidLink() {
    try {
        // Ensure config is loaded
        await waitForConfig();
        
        // Validate config is loaded - check both window.CONFIG and CONFIG
        if ((!window.CONFIG || !window.CONFIG.API_BASE_URL) && (!CONFIG || !CONFIG.API_BASE_URL)) {
            // Try to use current origin as fallback
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
            
            // Show user-friendly error message
            if (errorCode === 'INVALID_API_KEYS') {
                throw new Error('Invalid Plaid credentials. Please check your .env file - production credentials are required for production mode.');
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
            document.getElementById('plaid-loading').style.display = 'none';
            document.getElementById('plaid-error').style.display = 'none';
            
            // Open Plaid Link
            handler.open();
        } else {
            throw new Error('Plaid SDK not loaded');
        }
    } catch (error) {
        console.error('Error initializing Plaid Link:', error);
        throw error;
    }
}

// Handle successful Plaid connection
async function handlePlaidSuccess(publicToken, metadata) {
    try {
        showToast('Account connected successfully!', 'success');
        
        // Exchange public token for access token (stored securely on backend)
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
        const itemId = tokenData.item_id; // Access token stored on backend, we only get item_id

        // Get accounts from Plaid (using item_id, backend will retrieve access token)
        const accountsResponse = await authenticatedFetch(`${window.CONFIG.API_BASE_URL}/accounts/get`, {
            method: 'POST',
            body: JSON.stringify({
                item_id: itemId,
            }),
        });

        if (!accountsResponse.ok) {
            const errorData = await accountsResponse.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Accounts fetch error:', errorData);
            throw new Error(errorData.error || errorData.message || 'Failed to get accounts');
        }

        const accountsData = await accountsResponse.json();
        
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
                    // NO plaidAccessToken - stored securely on backend only
                };

                accounts.push(newAccount);
                
                // Store item_id mapping (NO access token)
                plaidItemIds.set(newAccount.id, {
                    item_id: itemId,
                    cursor: null,
                });
                
                // Automatically include new account in total balance
                includedAccountIds.add(newAccount.id);
            }
        }

        // Save accounts
        saveData();
        saveIncludedAccounts();
        
        // Close Plaid modal
        const plaidModal = document.getElementById('plaid-modal');
        if (plaidModal) plaidModal.classList.remove('active');
        
        // Refresh UI
        buildAccountsMap();
        renderAccounts();
        updateTotalBalance();
        populateAccountFilters();
        if (window.populateTransactionAccountSelect) {
            window.populateTransactionAccountSelect();
        }
        
        showToast(`${accountsData.accounts.length} account(s) added successfully!`, 'success');
        
        // Automatically sync transactions
        await syncAllTransactions();
        
    } catch (error) {
        console.error('Error handling Plaid success:', error);
        showPlaidError(error.message || 'Failed to process account connection');
    }
}

// Handle Plaid exit
function handlePlaidExit(err, metadata) {
    if (err) {
        console.error('Plaid exit error:', err);
        showPlaidError(err.error_message || 'Connection cancelled');
    } else {
        // User closed without error
        const plaidModal = document.getElementById('plaid-modal');
        if (plaidModal) plaidModal.classList.remove('active');
    }
}

// Handle Plaid events
function handlePlaidEvent(eventName, metadata) {
    // Event handler (no logging)
}

// Show Plaid error
function showPlaidError(message) {
    document.getElementById('plaid-loading').style.display = 'none';
    document.getElementById('plaid-error').style.display = 'block';
    document.getElementById('plaid-error-message').textContent = message;
}

// Sync all transactions from Plaid
async function syncAllTransactions() {
    try {
        showToast('Syncing transactions...', 'info');
        
        let syncedCount = 0;
        
        // Sync transactions for each account (using item_id, backend retrieves access token)
        for (const [accountId, plaidData] of plaidItemIds.entries()) {
            try {
                const account = accounts.find(acc => acc.id === accountId);
                if (!account || !account.plaidItemId) continue;
                
                // Get transactions from Plaid (backend handles access token)
                const response = await authenticatedFetch(`${window.CONFIG.API_BASE_URL}/transactions/sync`, {
                    method: 'POST',
                    body: JSON.stringify({
                        item_id: account.plaidItemId,
                        cursor: plaidData.cursor || null,
                    }),
                });

                if (!response.ok) {
                    console.error(`Failed to sync transactions for account ${accountId}`);
                    continue;
                }

                const syncData = await response.json();
                
                // Process added transactions
                for (const plaidTransaction of syncData.transactions) {
                    // Check if transaction already exists
                    const existingTransaction = transactions.find(
                        t => t.plaidTransactionId === plaidTransaction.transaction_id
                    );
                    
                    if (!existingTransaction && plaidTransaction.account_id === account.plaidAccountId) {
                        // Map Plaid transaction to our transaction format
                        const newTransaction = {
                            id: transactions.length > 0 ? Math.max(...transactions.map(t => t.id)) + 1 : 1,
                            date: plaidTransaction.date, // Plaid returns YYYY-MM-DD format - keep as string
                            merchant: plaidTransaction.merchant_name || plaidTransaction.name || 'Unknown',
                            amount: plaidTransaction.amount, // Plaid convention: positive = expense, negative = income
                            category: plaidTransaction.category ? plaidTransaction.category[0] : '',
                            status: plaidTransaction.pending ? 'pending' : 'posted',
                            accountId: accountId,
                            accountType: (account.type === 'credit' || account.type === 'loan') ? 'credit' : 'debit',
                            plaidTransactionId: plaidTransaction.transaction_id,
                            plaidAccountId: plaidTransaction.account_id,
                            updated: false,
                        };
                        
                        transactions.push(newTransaction);
                        syncedCount++;
                    }
                }
                
                // Process modified transactions
                for (const plaidTransaction of syncData.modified) {
                    const existingTransaction = transactions.find(
                        t => t.plaidTransactionId === plaidTransaction.transaction_id
                    );
                    
                    if (existingTransaction) {
                        existingTransaction.date = plaidTransaction.date;
                        existingTransaction.merchant = plaidTransaction.merchant_name || plaidTransaction.name || 'Unknown';
                        existingTransaction.amount = plaidTransaction.amount;
                        existingTransaction.category = plaidTransaction.category ? plaidTransaction.category[0] : '';
                        existingTransaction.status = plaidTransaction.pending ? 'pending' : 'posted';
                        existingTransaction.updated = true;
                    }
                }
                
                // Process removed transactions
                for (const removedTransaction of syncData.removed) {
                    const existingTransaction = transactions.find(
                        t => t.plaidTransactionId === removedTransaction.transaction_id
                    );
                    
                    if (existingTransaction) {
                        existingTransaction.status = 'removed';
                    }
                }
                
                // Update cursor in account data
                account.plaidCursor = syncData.next_cursor;
                
                // Update cursor
                plaidItemIds.set(accountId, {
                    ...plaidData,
                    cursor: syncData.next_cursor,
                });
                
                // Update account balance from Plaid (especially important for credit cards)
                // Fetch latest account balances after syncing transactions
                try {
                    const accountsResponse = await authenticatedFetch(`${window.CONFIG.API_BASE_URL}/accounts/get`, {
                        method: 'POST',
                        body: JSON.stringify({
                            item_id: account.plaidItemId,
                        }),
                    });
                    
                    if (accountsResponse.ok) {
                        const accountsData = await accountsResponse.json();
                        const plaidAccount = accountsData.accounts.find(a => a.account_id === account.plaidAccountId);
                        if (plaidAccount && plaidAccount.balances) {
                            // Update balance from Plaid
                            account.balance = plaidAccount.balances.current || account.balance;
                            // Update initialBalance to track the latest balance from Plaid
                            if (account.type === 'credit' || account.type === 'loan') {
                                account.initialBalance = plaidAccount.balances.current || account.initialBalance;
                            }
                        }
                    }
                } catch (balanceError) {
                    // Silently fail balance update - not critical
                }
                
            } catch (error) {
                console.error(`Error syncing account ${accountId}:`, error);
            }
        }
        
        // Save transactions
        if (syncedCount > 0) {
            saveData();
            invalidateCache();
            calculateAccountBalances();
            filterTransactions();
            initializeDashboard();
            showToast(`Synced ${syncedCount} transaction(s)`, 'success');
        } else {
            showToast('No new transactions to sync', 'info');
        }
        
    } catch (error) {
        console.error('Error syncing transactions:', error);
        showToast('Error syncing transactions: ' + error.message, 'error');
    }
}

// ============================================
// IndexedDB Database Manager
// ============================================
const DB_NAME = 'budgetAppDB';
const DB_VERSION = 1;
const STORES = {
    TRANSACTIONS: 'transactions',
    ACCOUNTS: 'accounts',
    CATEGORIES: 'categories'
};

let db = null;

// Initialize IndexedDB
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Create object stores if they don't exist
            if (!db.objectStoreNames.contains(STORES.TRANSACTIONS)) {
                const transactionStore = db.createObjectStore(STORES.TRANSACTIONS, { keyPath: 'id', autoIncrement: false });
                transactionStore.createIndex('date', 'date', { unique: false });
                transactionStore.createIndex('accountId', 'accountId', { unique: false });
                transactionStore.createIndex('category', 'category', { unique: false });
            }
            
            if (!db.objectStoreNames.contains(STORES.ACCOUNTS)) {
                db.createObjectStore(STORES.ACCOUNTS, { keyPath: 'id', autoIncrement: false });
            }
            
            if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
                db.createObjectStore(STORES.CATEGORIES, { keyPath: 'id', autoIncrement: false });
            }
        };
    });
}

// Migrate data from localStorage to IndexedDB (one-time migration)
async function migrateFromLocalStorage() {
    try {
        // Check if migration already happened
        const migrationKey = await getFromStore(STORES.ACCOUNTS, 'migration_complete');
        if (migrationKey) return; // Already migrated
        
        // Check if localStorage has data
        const savedTransactions = localStorage.getItem('budgetTransactions');
        const savedAccounts = localStorage.getItem('budgetAccounts');
        const savedCategories = localStorage.getItem('budgetCategories');
        
        if (savedTransactions || savedAccounts || savedCategories) {
            // Migrate transactions
            if (savedTransactions) {
                const transactions = JSON.parse(savedTransactions);
                await Promise.all(transactions.map(t => saveToStore(STORES.TRANSACTIONS, t)));
            }
            
            // Migrate accounts
            if (savedAccounts) {
                const accounts = JSON.parse(savedAccounts);
                await Promise.all(accounts.map(a => saveToStore(STORES.ACCOUNTS, a)));
            }
            
            // Migrate categories
            if (savedCategories) {
                const categories = JSON.parse(savedCategories);
                await Promise.all(categories.map(c => saveToStore(STORES.CATEGORIES, c)));
            }
            
            // Mark migration as complete
            await saveToStore(STORES.ACCOUNTS, { id: 'migration_complete', value: true });
        }
    } catch (error) {
        console.error('Migration error:', error);
    }
}

// Save to IndexedDB store
async function saveToStore(storeName, data) {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Get from IndexedDB store
async function getFromStore(storeName, key) {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Get all from IndexedDB store
async function getAllFromStore(storeName) {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        
        request.onsuccess = () => {
            // Filter out migration marker
            const results = request.result.filter(item => item.id !== 'migration_complete');
            resolve(results);
        };
        request.onerror = () => reject(request.error);
    });
}

// Delete from IndexedDB store
async function deleteFromStore(storeName, key) {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Get cached category spending (calculated once, reused)
function getCategorySpending() {
    if (categorySpendingCache && !cacheInvalidated) {
        return categorySpendingCache;
    }
    
    // Calculate category spending
    const spending = {};
    filteredTransactions
        .filter(t => t.status !== 'removed' && t.category)
        .forEach(t => {
            spending[t.category] = (spending[t.category] || 0) + Math.abs(t.amount);
        });
    
    categorySpendingCache = spending;
    cacheInvalidated = false;
    return spending;
}

// Performance Optimization: Cached data structures
let accountsMap = new Map(); // O(1) account lookups
let categorySpendingCache = null; // Cache category spending calculations
let cacheInvalidated = true; // Track if cache needs refresh

// Throttle/debounce helpers
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Build accounts map for O(1) lookups
function buildAccountsMap() {
    accountsMap.clear();
    accounts.forEach(acc => {
        accountsMap.set(acc.id, acc);
    });
}

// Invalidate cache when data changes
function invalidateCache() {
    cacheInvalidated = true;
    categorySpendingCache = null;
}

// Transaction data arrays and state variables
let filteredTransactions = [];
let sortConfig = { column: 'date', direction: 'desc' };
let editingCategoryId = null;
let editingTransactionId = null;
let editingAccountId = null;
let deletingTransactionId = null; // Track which transaction is being deleted
let dateFilter = { type: 'current-month', startDate: null, endDate: null };

// Clear All Data Function
async function clearAllData() {
    try {
        if (!db) await initDB();
        
        // Delete all data from IndexedDB
        const transaction = db.transaction(
            [STORES.TRANSACTIONS, STORES.ACCOUNTS, STORES.CATEGORIES], 
            'readwrite'
        );
        
        // Clear transactions
        const transactionStore = transaction.objectStore(STORES.TRANSACTIONS);
        const transactionRequest = transactionStore.clear();
        
        // Clear accounts
        const accountStore = transaction.objectStore(STORES.ACCOUNTS);
        const accountRequest = accountStore.clear();
        
        // Clear categories
        const categoryStore = transaction.objectStore(STORES.CATEGORIES);
        const categoryRequest = categoryStore.clear();
        
        await Promise.all([
            new Promise((resolve, reject) => {
                transactionRequest.onsuccess = resolve;
                transactionRequest.onerror = reject;
            }),
            new Promise((resolve, reject) => {
                accountRequest.onsuccess = resolve;
                accountRequest.onerror = reject;
            }),
            new Promise((resolve, reject) => {
                categoryRequest.onsuccess = resolve;
                categoryRequest.onerror = reject;
            }),
            new Promise((resolve, reject) => {
                transaction.oncomplete = resolve;
                transaction.onerror = reject;
            })
        ]);
        
        // Close and delete IndexedDB database completely
        db.close();
        await new Promise((resolve, reject) => {
            const deleteRequest = indexedDB.deleteDatabase('BudgetTrackerDB');
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
            deleteRequest.onblocked = () => resolve(); // Continue even if blocked
        });
        
        // Reinitialize IndexedDB
        await initDB();
        
        // Clear arrays in memory
        transactions = [];
        accounts = [];
        categories = [];
        filteredTransactions = [];
        
        // Clear Plaid data
        plaidItemIds.clear();
        
        // Reset editing states
        editingCategoryId = null;
        editingTransactionId = null;
        editingAccountId = null;
        
        // Clear all localStorage items (except theme preference - user might want to keep that)
        const themePreference = localStorage.getItem('theme'); // Save theme
        localStorage.clear();
        if (themePreference) {
            localStorage.setItem('theme', themePreference); // Restore theme
        }
        
        // Reset included accounts
        includedAccountIds.clear();
        
        // Clear cache
        invalidateCache();
        buildAccountsMap();
        
        // Re-render everything
        initializeDashboard();
        renderCategories();
        renderAccounts();
        filterTransactions();
        populateCategoryFilters();
        populateAccountFilters();
        
        if (window.populateTransactionAccountSelect) {
            window.populateTransactionAccountSelect();
        }
        
        showToast('All data cleared successfully', 'success');
        
        // Close modal
        document.getElementById('clear-data-modal').classList.remove('active');
        
    } catch (error) {
        showToast('Error clearing data: ' + error.message, 'error');
        console.error('Clear data error:', error);
    }
}

// Delete Functions (Updated for IndexedDB)
async function deleteTransaction(id) {
    deletingTransactionId = id;
    showDeleteTransactionModal(id);
}

// Show Delete Transaction Modal
function showDeleteTransactionModal(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    
    const modal = document.getElementById('delete-transaction-modal');
    const detailsEl = document.getElementById('delete-transaction-details');
    
    // Get account info
    const account = accountsMap.get(transaction.accountId);
    const accountName = account ? `${account.name} ••••${account.mask}` : 'Unknown Account';
    
    // Format date
    const transactionDate = new Date(transaction.date);
    const formattedDate = transactionDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Format amount: Plaid convention - positive = expense (red), negative = income (green)
    const amountColor = transaction.amount >= 0 ? 'var(--danger-color)' : 'var(--success-color)';
    
    detailsEl.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-secondary);">Merchant:</span>
                <span style="font-weight: 600; color: var(--text-primary);">${transaction.merchant || 'N/A'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-secondary);">Date:</span>
                <span style="font-weight: 600; color: var(--text-primary);">${formattedDate}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-secondary);">Amount:</span>
                <span style="font-weight: 600; color: ${amountColor};">${formatCurrency(transaction.amount)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-secondary);">Category:</span>
                <span style="font-weight: 600; color: var(--text-primary);">${transaction.category || 'Exempt'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-secondary);">Account:</span>
                <span style="font-weight: 600; color: var(--text-primary);">${accountName}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-secondary);">Status:</span>
                <span style="font-weight: 600; color: var(--text-primary); text-transform: capitalize;">${transaction.status || 'Posted'}</span>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

// Confirm Delete Transaction
async function confirmDeleteTransaction() {
    if (!deletingTransactionId) return;
    
    const id = deletingTransactionId;
    deletingTransactionId = null;
    
    const index = transactions.findIndex(t => t.id === id);
    if (index !== -1) {
        const transaction = transactions[index];
        transactions.splice(index, 1);
        
        // Delete from IndexedDB
        await deleteFromStore(STORES.TRANSACTIONS, id);
        
        saveData(); // Immediate save for deletion
        invalidateCache();
        buildAccountsMap(); // Rebuild in case account changed
        calculateAccountBalances();
        filterTransactions();
        showToast('Transaction deleted successfully', 'success');
    }
    
    // Close modal
    document.getElementById('delete-transaction-modal').classList.remove('active');
}

async function deleteCategory(id) {
    const category = categories.find(c => c.id === id);
    if (!category) return;
    
    // Check if category has transactions
    const hasTransactions = transactions.some(t => t.category === category.name && t.status !== 'removed');
    
    if (hasTransactions) {
        if (!confirm(`This category has transactions. Are you sure you want to delete "${category.name}"? Transactions will be set to Exempt.`)) {
            return;
        }
        // Set transactions to exempt
        transactions.forEach(t => {
            if (t.category === category.name) {
                t.category = '';
            }
        });
        // Save updated transactions
        await saveData();
    } else {
        if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
            return;
        }
    }
    
    const index = categories.findIndex(c => c.id === id);
    if (index !== -1) {
        categories.splice(index, 1);
        
        // Delete from IndexedDB
        await deleteFromStore(STORES.CATEGORIES, id);
        
        saveData(); // Immediate save for deletion
        invalidateCache(); // Invalidate spending cache
        renderCategories();
        populateCategoryFilters();
        showToast('Category deleted successfully', 'success');
    }
}

async function deleteAccount(id) {
    const account = accounts.find(a => a.id === id);
    if (!account) return;
    
    // Check if account has transactions
    const hasTransactions = transactions.some(t => t.accountId === id && t.status !== 'removed');
    
    if (hasTransactions) {
        if (!confirm(`This account has transactions. Are you sure you want to delete "${account.name}"? This action cannot be undone.`)) {
            return;
        }
    } else {
        if (!confirm(`Are you sure you want to delete "${account.name}"?`)) {
            return;
        }
    }
    
    const index = accounts.findIndex(a => a.id === id);
    if (index !== -1) {
        accounts.splice(index, 1);
        
        // Remove from included accounts if present
        includedAccountIds.delete(id);
        saveIncludedAccounts();
        
        // Delete from IndexedDB
        await deleteFromStore(STORES.ACCOUNTS, id);
        
        saveData(); // Immediate save for deletion
        buildAccountsMap(); // Rebuild map
        renderAccounts();
        updateTotalBalance(); // Update total balance when account deleted
        populateAccountFilters();
        if (window.populateTransactionAccountSelect) {
            window.populateTransactionAccountSelect();
        }
        showToast('Account deleted successfully', 'success');
    }
}

// CSV Export Function
function exportToCSV() {
    if (filteredTransactions.length === 0) {
        showToast('No transactions to export', 'error');
        return;
    }
    
    const headers = ['Date', 'Merchant', 'Amount', 'Category', 'Status', 'Account'];
    const rows = filteredTransactions.map(t => {
        const account = accounts.find(a => a.id === t.accountId);
        const accountName = account ? `${account.name} ••••${account.mask}` : 'Unknown';
        
        return [
            t.date,
            t.merchant,
            t.amount.toFixed(2),
            t.category || 'Exempt',
            t.status,
            accountName
        ];
    });
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const dateRange = getDateRange();
    let filename = 'transactions';
    if (dateRange.startDate && dateRange.endDate) {
        const start = dateRange.startDate.toISOString().split('T')[0];
        const end = dateRange.endDate.toISOString().split('T')[0];
        filename = `transactions_${start}_to_${end}`;
    }
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Transactions exported successfully', 'success');
}

// Throttled IndexedDB save (prevents excessive writes)
const throttledSaveData = throttle(async () => {
    await saveData();
}, 1000); // Save max once per second

// Regular saveData (for immediate saves when needed) - IndexedDB
async function saveData() {
    try {
        if (!db) await initDB();
        
        // Save transactions
        const transactionPromises = transactions.map(t => saveToStore(STORES.TRANSACTIONS, t));
        await Promise.all(transactionPromises);
        
        // Save accounts
        const accountPromises = accounts.map(a => saveToStore(STORES.ACCOUNTS, a));
        await Promise.all(accountPromises);
        
        // Save categories
        const categoryPromises = categories.map(c => saveToStore(STORES.CATEGORIES, c));
        await Promise.all(categoryPromises);
    } catch (error) {
        showToast('Error saving data: ' + error.message, 'error');
        console.error('Save error:', error);
    }
}

// Load all data from IndexedDB
async function loadData() {
    try {
        if (!db) await initDB();
        
        // Migrate from localStorage if needed
        await migrateFromLocalStorage();
        
        // Load transactions
        const savedTransactions = await getAllFromStore(STORES.TRANSACTIONS);
        if (savedTransactions.length > 0) {
            transactions = savedTransactions;
            // Ensure accountId is set for all transactions
            transactions.forEach((t, index) => {
                if (!t.accountId && t.accountType) {
                    if (t.accountType === 'debit') {
                        t.accountId = index % 5 === 0 ? 'acc_4' : 'acc_1';
                    } else {
                        t.accountId = index % 2 === 0 ? 'acc_2' : 'acc_3';
                    }
                }
            });
        }
        
        // Load accounts
        const savedAccounts = await getAllFromStore(STORES.ACCOUNTS);
        if (savedAccounts.length > 0) {
            accounts = savedAccounts;
            // Ensure all accounts have initialBalance for backward compatibility
            accounts.forEach(acc => {
                if (acc.initialBalance === undefined) {
                    acc.initialBalance = acc.balance || 0;
                }
            });
            // Build accounts map after loading
            buildAccountsMap();
        }
        
        // Load categories
        const savedCategories = await getAllFromStore(STORES.CATEGORIES);
        if (savedCategories.length > 0) {
            categories = savedCategories;
        }
        
        // Restore Plaid item IDs from accounts (NO access tokens stored)
        accounts.forEach(acc => {
            if (acc.plaidItemId) {
                plaidItemIds.set(acc.id, {
                    item_id: acc.plaidItemId,
                    cursor: acc.plaidCursor || null,
                });
            }
        });
        
        // Don't initialize filteredTransactions here - let filterTransactions() handle it
        // filteredTransactions will be set by filterTransactions() when it's called
        filteredTransactions = [];
    } catch (error) {
        showToast('Error loading data: ' + error.message, 'error');
        console.error('Load error:', error);
    }
}

// Initialize default data (check IndexedDB instead of localStorage)
async function initializeDefaultData() {
    try {
        if (!db) await initDB();
        
        // Check if data already exists
        const existingTransactions = await getAllFromStore(STORES.TRANSACTIONS);
        const existingAccounts = await getAllFromStore(STORES.ACCOUNTS);
        const existingCategories = await getAllFromStore(STORES.CATEGORIES);
        
        // Only initialize if IndexedDB is empty
        if (existingTransactions.length === 0 && 
            existingAccounts.length === 0 && 
            existingCategories.length === 0) {
            // Save default data on first load
            await saveData();
        }
    } catch (error) {
        console.error('Initialize default data error:', error);
    }
}

// Toast Notification System
function showToast(message, type = 'success') {
    // Remove existing toast if any
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Calculate Account Balances from Transactions (Optimized - single pass)
// Note: Credit cards and loans use balances directly from Plaid, not calculated from transactions
function calculateAccountBalances() {
    // Create account balance map for single-pass calculation
    const accountBalances = new Map();
    
    // Initialize balances with starting balances
    accounts.forEach(acc => {
        // For credit cards and loans, use the balance directly from Plaid (don't recalculate)
        // For other account types (depository, investment, etc.), recalculate from transactions
        if (acc.type === 'credit' || acc.type === 'loan') {
            // Use the balance that Plaid provides (stored in initialBalance or balance)
            const startingBalance = acc.plaidAccountId ? (acc.initialBalance !== undefined ? acc.initialBalance : acc.balance) : acc.balance;
            accountBalances.set(acc.id, startingBalance);
        } else {
            // For depository and other accounts, calculate from initial balance + transactions
            const startingBalance = acc.initialBalance !== undefined ? acc.initialBalance : acc.balance;
            accountBalances.set(acc.id, startingBalance);
        }
    });
    
    // Single pass through transactions (only for non-credit/non-loan accounts)
    transactions.forEach(t => {
        if (t.status !== 'removed' && t.accountId && accountBalances.has(t.accountId)) {
            const account = accounts.find(a => a.id === t.accountId);
            // Only recalculate balances for accounts that aren't credit cards or loans
            // OR for credit cards/loans that are manually created (not from Plaid)
            if (account && ((account.type !== 'credit' && account.type !== 'loan') || !account.plaidAccountId)) {
                accountBalances.set(t.accountId, accountBalances.get(t.accountId) + t.amount);
            }
        }
    });
    
    // Update account balances
    accounts.forEach(acc => {
        // For credit cards and loans from Plaid, keep the balance from Plaid
        // For other accounts, use calculated balance
        if ((acc.type === 'credit' || acc.type === 'loan') && acc.plaidAccountId) {
            // Keep the balance from Plaid (don't overwrite it)
            // The balance will be updated when syncing transactions from Plaid
        } else {
            acc.balance = accountBalances.get(acc.id) || 0;
        }
    });
    
    // Throttled save
    throttledSaveData();
    renderAccounts();
    updateTotalBalance(); // Update total balance when accounts change
}

// Input Validation Functions
function validateAccountForm() {
    const name = document.getElementById('account-name').value.trim();
    const mask = document.getElementById('account-mask').value.trim();
    const balance = parseFloat(document.getElementById('account-balance').value);
    
    if (!name) {
        showToast('Account name is required', 'error');
        return false;
    }
    
    // Check for duplicate account names
    const existingAccount = accounts.find(a => a.name.toLowerCase() === name.toLowerCase() && a.id !== editingAccountId);
    if (existingAccount) {
        showToast('An account with this name already exists', 'error');
        return false;
    }
    
    if (!mask || mask.length !== 4 || !/^\d{4}$/.test(mask)) {
        showToast('Account mask must be exactly 4 digits', 'error');
        return false;
    }
    
    if (isNaN(balance)) {
        showToast('Balance must be a valid number', 'error');
        return false;
    }
    
    return true;
}

function validateCategoryForm() {
    const name = document.getElementById('category-name').value.trim();
    const allocation = parseFloat(document.getElementById('category-allocation').value);
    
    if (!name) {
        showToast('Category name is required', 'error');
        return false;
    }
    
    // Check for duplicate category names
    const existingCategory = categories.find(c => c.name.toLowerCase() === name.toLowerCase() && c.id !== editingCategoryId);
    if (existingCategory) {
        showToast('A category with this name already exists', 'error');
        return false;
    }
    
    if (isNaN(allocation) || allocation < 0) {
        showToast('Allocation must be a positive number', 'error');
        return false;
    }
    
    return true;
}

function validateTransactionForm() {
    const date = document.getElementById('transaction-date').value;
    const merchant = document.getElementById('transaction-merchant').value.trim();
    const amount = parseFloat(document.getElementById('transaction-amount').value);
    const accountId = document.getElementById('transaction-account').value;
    
    if (!date) {
        showToast('Date is required', 'error');
        return false;
    }
    
    if (!merchant) {
        showToast('Merchant name is required', 'error');
        return false;
    }
    
    if (isNaN(amount) || amount <= 0) {
        showToast('Amount must be a positive number', 'error');
        return false;
    }
    
    if (!accountId) {
        showToast('Account is required', 'error');
        return false;
    }
    
    return true;
}

function validateDateRange() {
    const filterType = document.getElementById('filter-date-range').value;
    
    if (filterType === 'custom') {
        const startDate = document.getElementById('filter-date-start').value;
        const endDate = document.getElementById('filter-date-end').value;
        
        if (!startDate || !endDate) {
            return true; // Let user select dates first
        }
        
        if (new Date(startDate) > new Date(endDate)) {
            showToast('End date must be after start date', 'error');
            return false;
        }
    }
    
    return true;
}

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    await waitForConfig();
    
    // Check authentication first (only if enabled)
    const authRequired = window.CONFIG?.FEATURES?.AUTH_REQUIRED;
    if (authRequired === true) {
        const token = getAuthToken();
        if (!token) {
            // Try to verify existing token
            const isValid = await verifyToken();
            if (!isValid) {
                // No valid token - prompt for login
                showAuthModal();
                return;
            }
        } else {
            // Verify token is still valid
            const isValid = await verifyToken();
            if (!isValid) {
                showAuthModal();
                return;
            }
        }
    }

    // Initialize IndexedDB first
    await initDB();
    
    // Initialize default data if IndexedDB is empty
    await initializeDefaultData();
    
    // Load data from IndexedDB
    await loadData();
    
    // Initialize included accounts (all accounts by default)
    initializeIncludedAccounts();
    
    // Set default date filter to current month
    document.getElementById('filter-date-range').value = 'current-month';
    
    // Set default month filter to current month (for select-month option)
    const now = new Date();
    document.getElementById('filter-month').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Initialize theme (dark mode by default)
    initializeTheme();
    
    initializeDashboard();
    renderCategories();
    setupEventListeners();
    updateCurrentMonth();
    
    // Build accounts map for optimized lookups
    buildAccountsMap();
    
    // Setup virtual scrolling FIRST (before filtering)
    setupVirtualScrolling();
    
    // Then filter and render transactions
    filterTransactions();
    
    // Calculate account balances from transactions (this will update balances based on initialBalance + transactions)
    calculateAccountBalances();
});

// Theme Management
function initializeTheme() {
    // Check localStorage for saved theme preference, default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
}

function setTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-mode');
        document.getElementById('theme-icon-sun').style.display = 'block';
        document.getElementById('theme-icon-moon').style.display = 'none';
    } else {
        document.body.classList.remove('light-mode');
        document.getElementById('theme-icon-sun').style.display = 'none';
        document.getElementById('theme-icon-moon').style.display = 'block';
    }
    localStorage.setItem('theme', theme);
}

function toggleTheme() {
    const isLight = document.body.classList.contains('light-mode');
    setTheme(isLight ? 'dark' : 'light');
}

// Update Current Month
function updateCurrentMonth() {
    const now = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const monthYear = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    document.getElementById('current-month').textContent = monthYear;
}

// Initialize Dashboard
function initializeDashboard() {
    updateTotalBalance();
    updateTotalSpent();
    recalculateCategorySpent(); // Recalculate from transactions to ensure accuracy
    populateCategoryFilters();
    populateAccountFilters();
    renderAccounts();
    renderCategories();
}

// Render Accounts
function renderAccounts() {
    renderAccountsSummary();
    renderAccountsExpanded();
}

// Render Accounts Summary (compact view)
function renderAccountsSummary() {
    const summaryEl = document.getElementById('accounts-summary');
    if (!summaryEl) return;
    
    summaryEl.innerHTML = '';

    if (accounts.length === 0) {
        summaryEl.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.875rem;">No accounts</span>';
        return;
    }

    // Show compact chips for all accounts
    accounts.forEach(acc => {
        const chip = document.createElement('div');
        chip.className = 'account-chip';
        const balanceClass = acc.balance < 0 ? 'negative' : 'positive';
        chip.innerHTML = `
            <span class="account-chip-name">${acc.name} ••••${acc.mask}</span>
            <span class="account-chip-balance ${balanceClass}">${formatCurrency(acc.balance)}</span>
        `;
        summaryEl.appendChild(chip);
    });
}

// Render Accounts Expanded (detailed view)
function renderAccountsExpanded() {
    const container = document.getElementById('accounts-list-expanded');
    if (!container) return;
    
    container.innerHTML = '';

    accounts.forEach(acc => {
        const accountEl = document.createElement('div');
        accountEl.className = 'account-item';
        
        // Format account type label based on type and subtype
        let accountTypeLabel = '';
        if (acc.type === 'credit') {
            accountTypeLabel = acc.subtype === 'credit card' ? 'Credit Card' : 'Credit';
        } else if (acc.type === 'loan') {
            // Capitalize loan subtypes properly
            accountTypeLabel = acc.subtype.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        } else if (acc.type === 'investment') {
            // Keep investment subtypes as-is (they're already formatted)
            accountTypeLabel = acc.subtype;
        } else {
            // Depository and other types
            accountTypeLabel = acc.subtype.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        }
        
        // Determine balance color - loans and credit typically show negative
        const balanceClass = (acc.type === 'credit' || acc.type === 'loan') 
            ? (acc.balance <= 0 ? 'negative' : 'positive')
            : (acc.balance < 0 ? 'negative' : 'positive');
        
        accountEl.innerHTML = `
            <div class="account-item-header">
                <div>
                    <span class="account-item-name">${acc.name}</span>
                    <span class="account-item-mask">••••${acc.mask}</span>
                </div>
                <span class="account-item-type">${accountTypeLabel}</span>
            </div>
            <div class="account-item-balance ${balanceClass}">
                ${formatCurrency(acc.balance)}
            </div>
            <div class="account-item-actions" style="margin-top: 0.5rem; display: flex; gap: 0.5rem;">
                <button class="btn-small edit-account" data-id="${acc.id}">Edit</button>
                <button class="btn-small delete-account" data-id="${acc.id}" style="color: var(--danger-color);">Delete</button>
            </div>
        `;
        container.appendChild(accountEl);
    });
    
    // Add edit/delete event listeners
    container.querySelectorAll('.edit-account').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.closest('.edit-account').dataset.id;
            editAccount(id);
        });
    });
    
    container.querySelectorAll('.delete-account').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.closest('.delete-account').dataset.id;
            deleteAccount(id);
        });
    });
}

// Check if current filter is a monthly view
function isMonthlyView() {
    const filterType = document.getElementById('filter-date-range').value;
    return filterType === 'current-month' || filterType === 'select-month';
}

// Recalculate category spent amounts from transactions
function recalculateCategorySpent() {
    // Reset all category spent amounts
    categories.forEach(cat => {
        cat.spent = 0;
    });

    // Only calculate spent from filtered transactions if it's a monthly view
    if (isMonthlyView()) {
        const categorySpending = getCategorySpending();
        // Update category.spent values
        categories.forEach(cat => {
            cat.spent = categorySpending[cat.name] || 0;
        });
    }
    
    // Invalidate cache since we're updating
    invalidateCache();
}

// Total Balance Configuration
let includedAccountIds = new Set(); // Set of account IDs to include in total balance

// Initialize included accounts (all accounts by default)
function initializeIncludedAccounts() {
    if (accounts.length === 0) {
        includedAccountIds.clear();
        return;
    }
    
    // Check if we have saved preferences
    const saved = localStorage.getItem('includedAccountIds');
    if (saved) {
        try {
            const savedIds = JSON.parse(saved);
            includedAccountIds = new Set(savedIds);
            // Only include accounts that still exist
            includedAccountIds = new Set([...includedAccountIds].filter(id => accounts.some(acc => acc.id === id)));
        } catch (e) {
            console.error('Error loading included accounts:', e);
            includedAccountIds = new Set(accounts.map(acc => acc.id));
        }
    } else {
        // Default: all accounts included
        includedAccountIds = new Set(accounts.map(acc => acc.id));
    }
    
    // Save default if needed
    saveIncludedAccounts();
}

// Save included accounts preference
function saveIncludedAccounts() {
    localStorage.setItem('includedAccountIds', JSON.stringify([...includedAccountIds]));
}

// Calculate Total Balance (sum of selected accounts)
function updateTotalBalance() {
    let total = 0;
    
    accounts.forEach(acc => {
        if (includedAccountIds.has(acc.id)) {
            total += (acc.balance || 0);
        }
    });
    
    document.getElementById('total-balance').textContent = formatCurrency(total);
}

// Update balance display in modal (sum of selected accounts)
function updateBalanceDisplay() {
    const accountsSumDisplay = document.getElementById('accounts-sum-display');
    if (!accountsSumDisplay) return;
    
    let total = 0;
    accounts.forEach(acc => {
        const checkbox = document.getElementById(`balance-account-${acc.id}`);
        if (checkbox && checkbox.checked) {
            total += (acc.balance || 0);
        }
    });
    
    accountsSumDisplay.textContent = formatCurrency(total);
}

// Edit Total Balance
function editTotalBalance() {
    const balanceModal = document.getElementById('edit-balance-modal');
    const accountsList = document.getElementById('balance-accounts-list');
    
    if (!accountsList) return;
    
    accountsList.innerHTML = '';
    
    if (accounts.length === 0) {
        accountsList.innerHTML = '<p style="color: var(--text-secondary); padding: 1rem; text-align: center;">No accounts available</p>';
        document.getElementById('accounts-sum-display').textContent = formatCurrency(0);
        balanceModal.classList.add('active');
        return;
    }
    
    // Create checkboxes for each account
    accounts.forEach(acc => {
        const accountItem = document.createElement('div');
        accountItem.style.cssText = 'display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border-radius: var(--radius-md); margin-bottom: 0.5rem; background: var(--bg-secondary); transition: background 0.2s ease;';
        accountItem.style.border = '1px solid var(--border-color)';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `balance-account-${acc.id}`;
        checkbox.checked = includedAccountIds.has(acc.id);
        checkbox.style.cssText = 'width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary-color);';
        checkbox.addEventListener('change', updateBalanceDisplay);
        
        const label = document.createElement('label');
        label.htmlFor = `balance-account-${acc.id}`;
        label.style.cssText = 'flex: 1; cursor: pointer; display: flex; justify-content: space-between; align-items: center;';
        label.innerHTML = `
            <span style="font-weight: 500; color: var(--text-primary);">${acc.name} ••••${acc.mask}</span>
            <span style="font-weight: 600; color: ${acc.balance < 0 ? 'var(--danger-color)' : 'var(--success-color)'};">${formatCurrency(acc.balance)}</span>
        `;
        
        accountItem.appendChild(checkbox);
        accountItem.appendChild(label);
        accountsList.appendChild(accountItem);
    });
    
    // Update initial display
    updateBalanceDisplay();
    
    balanceModal.classList.add('active');
}

// Save Total Balance
function saveTotalBalance() {
    const selectedIds = new Set();
    
    accounts.forEach(acc => {
        const checkbox = document.getElementById(`balance-account-${acc.id}`);
        if (checkbox && checkbox.checked) {
            selectedIds.add(acc.id);
        }
    });
    
    if (selectedIds.size === 0) {
        showToast('Please select at least one account', 'error');
        return;
    }
    
    includedAccountIds = selectedIds;
    saveIncludedAccounts();
    updateTotalBalance();
    document.getElementById('edit-balance-modal').classList.remove('active');
    showToast('Total balance updated', 'success');
}

// Calculate Total Spent (for filtered transactions)
function updateTotalSpent() {
    const total = filteredTransactions
        .filter(t => t.status !== 'removed')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    document.getElementById('total-spent').textContent = formatCurrency(total);
}

// Update Category Summary (shows all budget categories with their spent amounts)
function updateCategorySummary() {
    // Calculate spent amounts from filtered transactions
    const categorySpending = {};
    filteredTransactions
        .filter(t => t.status !== 'removed' && t.category)
        .forEach(t => {
            categorySpending[t.category] = (categorySpending[t.category] || 0) + Math.abs(t.amount);
        });

    const summaryEl = document.getElementById('category-summary');
    if (!summaryEl) return; // Safety check
    
    summaryEl.innerHTML = '';

    if (categories.length === 0) {
        summaryEl.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.875rem;">No categories yet</span>';
        return;
    }

    // Show all categories from the categories array, sorted by spent amount
    const sortedCategories = [...categories].sort((a, b) => {
        const aSpent = categorySpending[a.name] || 0;
        const bSpent = categorySpending[b.name] || 0;
        return bSpent - aSpent;
    });

    sortedCategories.forEach(cat => {
        const spent = categorySpending[cat.name] || 0;
        const chip = document.createElement('div');
        chip.className = 'category-chip';
        chip.innerHTML = `
            <span class="category-chip-name">${cat.name}</span>
            <span class="category-chip-amount">${formatCurrency(spent)}</span>
        `;
        summaryEl.appendChild(chip);
    });
}

// Update Accounts Summary (shows all accounts with balances)
function updateAccountsSummary() {
    const summaryEl = document.getElementById('accounts-summary');
    if (!summaryEl) return; // Safety check
    
    summaryEl.innerHTML = '';

    if (accounts.length === 0) {
        summaryEl.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.875rem;">No accounts</span>';
        return;
    }

    accounts.forEach(acc => {
        const chip = document.createElement('div');
        chip.className = 'account-chip';
        const balanceClass = acc.balance < 0 ? 'negative' : 'positive';
        chip.innerHTML = `
            <span class="account-chip-name">${acc.name} ••••${acc.mask}</span>
            <span class="account-chip-balance ${balanceClass}">${formatCurrency(acc.balance)}</span>
        `;
        summaryEl.appendChild(chip);
    });
}

// Update dashboard based on filtered transactions
function updateDashboardForFilteredTransactions() {
    updateTotalBalance();
    updateTotalSpent();
    recalculateCategorySpent();
    renderCategoriesSummary(); // Update summary view
    renderCategoriesExpanded(); // Update expanded view
}

// Populate Account Filters
function populateAccountFilters() {
    const filterSelect = document.getElementById('filter-account');
    filterSelect.innerHTML = '<option value="">All Accounts</option>';
    accounts.forEach(acc => {
        const option = document.createElement('option');
        option.value = acc.id;
        option.textContent = `${acc.name} ••••${acc.mask}`;
        filterSelect.appendChild(option);
    });
}

// Populate Category Filters
function populateCategoryFilters() {
    const filterSelect = document.getElementById('filter-category');
    // Clear existing options except "All Categories"
    filterSelect.innerHTML = '<option value="">All Categories</option><option value="exempt">Exempt</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        filterSelect.appendChild(option);
    });
}

// Render Categories
function renderCategories() {
    renderCategoriesSummary();
    renderCategoriesExpanded();
}

// Render Categories Summary (compact view) - Uses cached spending
function renderCategoriesSummary() {
    const summaryEl = document.getElementById('categories-summary');
    if (!summaryEl) return;
    
    summaryEl.innerHTML = '';

    if (categories.length === 0) {
        summaryEl.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.875rem;">No categories yet</span>';
        return;
    }

    // Use cached category spending
    const categorySpending = getCategorySpending();

    // Show compact chips for all categories
    const sortedCategories = [...categories].sort((a, b) => {
        const aSpent = categorySpending[a.name] || 0;
        const bSpent = categorySpending[b.name] || 0;
        return bSpent - aSpent;
    });

    sortedCategories.forEach(cat => {
        const spent = categorySpending[cat.name] || 0;
        const chip = document.createElement('div');
        chip.className = 'category-chip';
        chip.innerHTML = `
            <span class="category-chip-name">${cat.name}</span>
            <span class="category-chip-amount">${formatCurrency(spent)}</span>
        `;
        summaryEl.appendChild(chip);
    });
}

// Render Categories Expanded (detailed view) - Uses cached spending
function renderCategoriesExpanded() {
    const container = document.getElementById('categories-list-expanded');
    if (!container) return;
    
    container.innerHTML = '';

    // Check if we're in monthly view
    const isMonthly = isMonthlyView();
    
    if (!isMonthly) {
        // Show message for non-monthly views
        const messageEl = document.createElement('div');
        messageEl.style.cssText = 'padding: 1rem; text-align: center; color: var(--text-secondary); font-size: 0.875rem;';
        messageEl.innerHTML = `
            <p style="margin-bottom: 0.5rem;"><strong>Budget tracking is only available for monthly views.</strong></p>
            <p>Use "Current Month" or "Select Month" to view budget allocations and remaining amounts.</p>
        `;
        container.appendChild(messageEl);
        return;
    }

    // Use cached category spending
    const categorySpending = getCategorySpending();

    // Sort categories by spent amount (descending) to match summary order
    const sortedCategories = [...categories].sort((a, b) => {
        const aSpent = categorySpending[a.name] || 0;
        const bSpent = categorySpending[b.name] || 0;
        return bSpent - aSpent;
    });

    sortedCategories.forEach(cat => {
        const categoryEl = document.createElement('div');
        categoryEl.className = 'category-item';
        const spent = categorySpending[cat.name] || 0;
        const spentPercent = (spent / cat.allocation) * 100;
        const isOverBudget = spent > cat.allocation;

        categoryEl.innerHTML = `
            <div class="category-item-header">
                <span class="category-item-name">${cat.name}</span>
                <div class="category-item-actions">
                    <button class="btn-small edit-category" data-id="${cat.id}">Edit</button>
                    <button class="btn-small delete-category" data-id="${cat.id}" style="color: var(--danger-color);">Delete</button>
                </div>
            </div>
            <div class="category-item-details">
                <div class="category-item-detail">
                    <span>Allocation:</span>
                    <strong>${formatCurrency(cat.allocation)}</strong>
                </div>
                <div class="category-item-detail">
                    <span>Spent:</span>
                    <strong style="color: ${isOverBudget ? 'var(--danger-color)' : 'var(--text-primary)'}">
                        ${formatCurrency(spent)}
                    </strong>
                </div>
                <div class="category-item-detail">
                    <span>Remaining:</span>
                    <strong style="color: ${(cat.allocation - spent) < 0 ? 'var(--danger-color)' : 'var(--success-color)'}">
                        ${formatCurrency(cat.allocation - spent)}
                    </strong>
                </div>
            </div>
        `;
        container.appendChild(categoryEl);
    });

    // Add edit event listeners
    container.querySelectorAll('.edit-category').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id);
            editCategory(id);
        });
    });
    
    container.querySelectorAll('.delete-category').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.closest('.delete-category').dataset.id);
            deleteCategory(id);
        });
    });
}

// Virtual Scrolling State
let virtualScrollState = {
    rowHeight: 60, // Approximate height of each row in pixels
    buffer: 10, // Number of rows to render above/below viewport
    startIndex: 0,
    endIndex: 0,
    visibleCount: 0,
    scrollTop: 0
};

// Calculate visible rows for virtual scrolling (with fallback)
function calculateVisibleRows() {
    const tbody = document.getElementById('transactions-body');
    if (!tbody || filteredTransactions.length === 0) {
        // Set defaults if no transactions
        virtualScrollState.startIndex = 0;
        virtualScrollState.endIndex = 0;
        virtualScrollState.visibleCount = 0;
        return;
    }
    
    const container = tbody.closest('.table-container');
    if (!container) {
        // Fallback: render first 50 rows if container not found
        virtualScrollState.startIndex = 0;
        virtualScrollState.endIndex = Math.min(50, filteredTransactions.length);
        virtualScrollState.visibleCount = virtualScrollState.endIndex;
        return;
    }
    
    // Force container to have a height if it doesn't
    const containerHeight = container.clientHeight || container.offsetHeight;
    const scrollTop = container.scrollTop || 0;
    
    // If container has no height yet, try to use parent height or fallback
    if (containerHeight === 0 || containerHeight < 100) {
        const parent = container.parentElement;
        if (parent) {
            const parentHeight = parent.clientHeight;
            if (parentHeight > 200) {
                // Use parent height minus header and padding
                const estimatedHeight = parentHeight - 250; // Account for header and padding
                if (estimatedHeight > 100) {
                    virtualScrollState.visibleCount = Math.ceil(estimatedHeight / virtualScrollState.rowHeight);
                    virtualScrollState.startIndex = Math.max(0, Math.floor(scrollTop / virtualScrollState.rowHeight) - virtualScrollState.buffer);
                    virtualScrollState.endIndex = Math.min(
                        filteredTransactions.length,
                        virtualScrollState.startIndex + virtualScrollState.visibleCount + (virtualScrollState.buffer * 2)
                    );
                    return;
                }
            }
        }
        // Final fallback: render first 50 rows to ensure visibility
        virtualScrollState.startIndex = 0;
        virtualScrollState.endIndex = Math.min(50, filteredTransactions.length);
        virtualScrollState.visibleCount = virtualScrollState.endIndex;
        return;
    }
    
    virtualScrollState.scrollTop = scrollTop;
    virtualScrollState.visibleCount = Math.ceil(containerHeight / virtualScrollState.rowHeight) + 5; // Add buffer
    virtualScrollState.startIndex = Math.max(0, Math.floor(scrollTop / virtualScrollState.rowHeight) - virtualScrollState.buffer);
    virtualScrollState.endIndex = Math.min(
        filteredTransactions.length,
        virtualScrollState.startIndex + virtualScrollState.visibleCount + (virtualScrollState.buffer * 2)
    );
    
    // Ensure we always show at least some rows
    if (virtualScrollState.endIndex <= virtualScrollState.startIndex) {
        virtualScrollState.startIndex = 0;
        virtualScrollState.endIndex = Math.min(
            Math.max(20, virtualScrollState.visibleCount),
            filteredTransactions.length
        );
    }
}

// Render single transaction row
function renderTransactionRow(transaction) {
    const row = document.createElement('tr');
    if (transaction.status === 'pending') row.classList.add('pending');
    if (transaction.status === 'removed') row.classList.add('removed');
    if (transaction.updated) row.classList.add('updated');

    // Build category select HTML
    const selectedCategory = transaction.category || '';
    const categorySelectHTML = categories.map(cat => 
        `<option value="${cat.name}" ${cat.name === selectedCategory ? 'selected' : ''}>${cat.name}</option>`
    ).join('');
    const categorySelect = `
        <select class="category-select" data-transaction-id="${transaction.id}">
            <option value="" ${!selectedCategory ? 'selected' : ''}>Exempt</option>
            ${categorySelectHTML}
        </select>
    `;

    // Get account info using Map (O(1) lookup)
    const account = accountsMap.get(transaction.accountId);
    const accountDisplay = account ? `${account.name} ••••${account.mask}` : `Unknown (${transaction.accountId || 'N/A'})`;
    const accountTypeBadge = account 
        ? (account.type === 'credit' ? 'Credit Card' : account.subtype.charAt(0).toUpperCase() + account.subtype.slice(1))
        : 'Unknown';

    row.innerHTML = `
        <td>${formatDate(transaction.date)}</td>
        <td>${transaction.merchant}</td>
        <td class="amount ${transaction.amount >= 0 ? 'negative' : 'positive'}">${formatCurrency(transaction.amount)}</td>
        <td>${categorySelect}</td>
        <td><span class="transaction-status ${transaction.status}">${transaction.status}</span></td>
        <td>
            <div class="transaction-account-display">
                <div class="transaction-account-name">${accountDisplay}</div>
                <span class="transaction-account-badge">${accountTypeBadge}</span>
            </div>
        </td>
        <td class="actions-cell">
            <button class="action-btn edit-btn" data-id="${transaction.id}" aria-label="Edit transaction" title="Edit">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
            </button>
            <button class="action-btn delete-btn" data-id="${transaction.id}" aria-label="Delete transaction" title="Delete">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        </td>
    `;
    
    return row;
}

// Render Transactions
function renderTransactions() {
    const tbody = document.getElementById('transactions-body');
    if (!tbody) return;
    
    // CLEAR the tbody completely - remove all child nodes
    while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
    }
    
    // Also set innerHTML to empty string as backup
    tbody.innerHTML = '';

    if (filteredTransactions.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No transactions found</td>';
        tbody.appendChild(emptyRow);
        updateSortIndicators();
        return;
    }

    // Render all transactions - ensure we're using filteredTransactions
    filteredTransactions.forEach(t => {
        const row = renderTransactionRow(t);
        tbody.appendChild(row);
    });
    
    // Update sort indicators
    updateSortIndicators();
}

// Setup virtual scrolling listener
function setupVirtualScrolling() {
    // Virtual scrolling disabled - render all transactions at once
    // Can be re-enabled if performance becomes an issue with large datasets
}

// Edit Transaction Function
function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    
    editingTransactionId = id;
    
    // Format date for HTML date input (YYYY-MM-DD)
    let dateValue = transaction.date;
    if (typeof dateValue === 'string') {
        // If it's already in YYYY-MM-DD format, use it
        if (!dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // Try to parse and format
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
                dateValue = date.toISOString().split('T')[0];
            }
        }
    } else if (dateValue instanceof Date) {
        dateValue = dateValue.toISOString().split('T')[0];
    }
    
    document.getElementById('transaction-date').value = dateValue;
    document.getElementById('transaction-merchant').value = transaction.merchant || '';
    // Plaid convention: stored as-is (positive = expense, negative = income)
    document.getElementById('transaction-amount').value = transaction.amount;
    document.getElementById('transaction-status').value = transaction.status || 'posted';
    
    // Populate account dropdown before setting value
    const accountSelect = document.getElementById('transaction-account');
    if (accountSelect) {
        // Ensure accounts are populated
        if (accountSelect.options.length === 0 || (accountSelect.options.length === 1 && accountSelect.options[0].value === '')) {
            if (window.populateTransactionAccountSelect) {
                window.populateTransactionAccountSelect();
            }
        }
        // Set the account value after populating
        accountSelect.value = transaction.accountId || '';
    }
    
    // Set category - make sure category options are populated first
    const categorySelect = document.getElementById('transaction-category');
    // Ensure categories are populated
    if (categorySelect && (categorySelect.options.length <= 1)) {
        if (window.populateTransactionCategorySelect) {
            window.populateTransactionCategorySelect();
        }
    }
    if (categorySelect) {
        categorySelect.value = transaction.category || '';
    }
    
    // Update modal title and button text
    const modalTitle = document.querySelector('#transaction-modal h2');
    if (modalTitle) modalTitle.textContent = 'Edit Transaction';
    
    const transactionForm = document.getElementById('transaction-form');
    const submitBtn = transactionForm ? transactionForm.querySelector('button[type="submit"]') : null;
    if (submitBtn) submitBtn.textContent = 'Save Transaction';
    
    document.getElementById('transaction-modal').classList.add('active');
}

// Update Transaction Category
function updateTransactionCategory(transactionId, newCategory) {
    const transaction = transactions.find(t => t.id === transactionId);
    if (transaction) {
        const oldCategory = transaction.category;
        // Set to empty string if "Exempt" was selected
        transaction.category = newCategory || '';
        transaction.updated = true;

        saveData(); // Immediate save for category change
        invalidateCache(); // Invalidate spending cache
        initializeDashboard(); // This will recalculate everything from transactions
        renderCategoriesSummary(); // Update both views
        renderCategoriesExpanded();
        renderTransactions();
    }
}

// Sort Transactions
function sortTransactions(column) {
    // If clicking the same column, toggle direction
    if (sortConfig.column === column) {
        sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
        // New column - default to descending for date, ascending for others
        sortConfig.column = column;
        sortConfig.direction = column === 'date' ? 'desc' : 'asc';
    }

    filteredTransactions.sort((a, b) => {
        let aVal, bVal;

        switch (column) {
            case 'date':
                // For date sorting, use string comparison if both are strings to avoid timezone issues
                if (typeof a.date === 'string' && typeof b.date === 'string') {
                    aVal = a.date;
                    bVal = b.date;
                } else {
                    aVal = new Date(a.date);
                    bVal = new Date(b.date);
                }
                break;
            case 'merchant':
                aVal = a.merchant.toLowerCase();
                bVal = b.merchant.toLowerCase();
                break;
            case 'amount':
                aVal = Math.abs(a.amount);
                bVal = Math.abs(b.amount);
                break;
            default:
                return 0;
        }

        if (column === 'date' && typeof aVal === 'string' && typeof bVal === 'string') {
            // String comparison for dates (YYYY-MM-DD format)
            if (sortConfig.direction === 'asc') {
                return aVal.localeCompare(bVal);
            } else {
                return bVal.localeCompare(aVal);
            }
        } else {
            // Numeric comparison
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        }
    });

    // Reset scroll position when sorting
    const container = document.querySelector('.table-container');
    if (container) {
        container.scrollTop = 0;
    }

    renderTransactions();
    updateSortIndicators();
}

// Update Sort Indicators
function updateSortIndicators() {
    document.querySelectorAll('.sort-icon').forEach(icon => {
        icon.textContent = '↕';
    });

    if (sortConfig.column) {
        const header = document.querySelector(`th[data-sort="${sortConfig.column}"]`);
        if (header) {
            header.classList.add('active');
            const icon = header.querySelector('.sort-icon');
            icon.textContent = sortConfig.direction === 'asc' ? '↑' : '↓';
        }
    }
}

// Get Date Range Based on Filter
function getDateRange() {
    const now = new Date();
    const range = { startDate: null, endDate: null };
    const filterType = document.getElementById('filter-date-range').value;

    switch (filterType) {
        case 'current-month':
            // Get first day of current month at 00:00:00
            range.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            range.startDate.setHours(0, 0, 0, 0);
            // Get last day of current month at 23:59:59.999
            // Day 0 of next month = last day of current month
            range.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
        case 'last-7-days':
            range.startDate = new Date(now);
            range.startDate.setDate(now.getDate() - 7);
            range.endDate = new Date(now);
            range.endDate.setHours(23, 59, 59);
            break;
        case 'last-30-days':
            range.startDate = new Date(now);
            range.startDate.setDate(now.getDate() - 30);
            range.endDate = new Date(now);
            range.endDate.setHours(23, 59, 59);
            break;
        case 'last-90-days':
            range.startDate = new Date(now);
            range.startDate.setDate(now.getDate() - 90);
            range.endDate = new Date(now);
            range.endDate.setHours(23, 59, 59);
            break;
        case 'select-month':
            const monthInput = document.getElementById('filter-month').value;
            if (monthInput) {
                const [year, month] = monthInput.split('-');
                const yearNum = parseInt(year, 10);
                const monthNum = parseInt(month, 10); // 1-12
                // First day of selected month at 00:00:00.000
                range.startDate = new Date(yearNum, monthNum - 1, 1, 0, 0, 0, 0);
                // Last day of selected month at 23:59:59.999
                // Day 0 of next month = last day of current month
                const lastDayOfMonth = new Date(yearNum, monthNum, 0);
                range.endDate = new Date(yearNum, monthNum - 1, lastDayOfMonth.getDate(), 23, 59, 59, 999);
            }
            break;
        case 'custom':
            const startInput = document.getElementById('filter-date-start').value;
            const endInput = document.getElementById('filter-date-end').value;
            
            if (startInput && endInput) {
                // Use custom date range
                range.startDate = new Date(startInput);
                range.endDate = new Date(endInput);
                range.endDate.setHours(23, 59, 59);
            }
            break;
    }

    return range;
}

// Debounced filter function (optimized for rapid filter changes)
const debouncedFilterTransactions = debounce(filterTransactions, 300);

// Filter Transactions
function filterTransactions() {
    // Validate date range first
    if (!validateDateRange()) {
        return;
    }
    
    const categoryFilter = document.getElementById('filter-category').value;
    const statusFilter = document.getElementById('filter-status').value;
    const accountFilter = document.getElementById('filter-account').value;
    const dateRange = getDateRange();
    const filterType = document.getElementById('filter-date-range').value;

    filteredTransactions = transactions.filter(t => {
        const categoryMatch = !categoryFilter || t.category === categoryFilter || (!t.category && categoryFilter === 'exempt');
        const statusMatch = !statusFilter || t.status === statusFilter;
        const accountMatch = !accountFilter || t.accountId === accountFilter;
        
        // Date filter - STRICT month boundaries
        let dateMatch = true;
        if (dateRange.startDate && dateRange.endDate) {
            // Parse transaction date - ALWAYS extract year/month/day directly from string
            let txYear, txMonth, txDay;
            
            if (typeof t.date === 'string') {
                // Parse date string directly (YYYY-MM-DD format)
                const parts = t.date.split('-');
                if (parts.length === 3) {
                    txYear = parseInt(parts[0], 10);
                    txMonth = parseInt(parts[1], 10); // 1-12 (not 0-indexed)
                    txDay = parseInt(parts[2], 10);
                } else {
                    // Try ISO format or other formats - use UTC to avoid timezone issues
                    const txDate = new Date(t.date);
                    if (!isNaN(txDate.getTime())) {
                        txYear = txDate.getUTCFullYear();
                        txMonth = txDate.getUTCMonth() + 1; // Convert to 1-12
                        txDay = txDate.getUTCDate();
                    } else {
                        dateMatch = false;
                        return categoryMatch && statusMatch && accountMatch && dateMatch;
                    }
                }
            } else if (t.date instanceof Date) {
                // Date object - use UTC to avoid timezone issues
                txYear = t.date.getUTCFullYear();
                txMonth = t.date.getUTCMonth() + 1; // Convert to 1-12
                txDay = t.date.getUTCDate();
            } else {
                // Try to parse as Date - use UTC to avoid timezone issues
                const txDate = new Date(t.date);
                if (!isNaN(txDate.getTime())) {
                    txYear = txDate.getUTCFullYear();
                    txMonth = txDate.getUTCMonth() + 1; // Convert to 1-12
                    txDay = txDate.getUTCDate();
                } else {
                    dateMatch = false;
                    return categoryMatch && statusMatch && accountMatch && dateMatch;
                }
            }
            
            // Validate parsed date components
            if (isNaN(txYear) || isNaN(txMonth) || isNaN(txDay) || txMonth < 1 || txMonth > 12 || txDay < 1 || txDay > 31) {
                dateMatch = false;
                return categoryMatch && statusMatch && accountMatch && dateMatch;
            }
            
            // Get date range values - use explicit year/month/day for month filters
            let startYear, startMonth, startDay;
            let endYear, endMonth, endDay;
            
            if (filterType === 'current-month') {
                // Current month: Use explicit year/month/day
                const now = new Date();
                const currentYear = now.getFullYear();
                const currentMonth0Indexed = now.getMonth(); // 0-11
                const currentMonth1Indexed = currentMonth0Indexed + 1; // 1-12
                
                startYear = currentYear;
                startMonth = currentMonth1Indexed;
                startDay = 1;
                
                const lastDayOfMonth = new Date(currentYear, currentMonth0Indexed + 1, 0);
                endYear = currentYear;
                endMonth = currentMonth1Indexed;
                endDay = lastDayOfMonth.getDate();
            } else if (filterType === 'select-month') {
                // Select month: Use explicit year/month/day from selected month
                const monthInput = document.getElementById('filter-month').value;
                if (monthInput) {
                    const [year, month] = monthInput.split('-');
                    const yearNum = parseInt(year, 10);
                    const monthNum = parseInt(month, 10); // 1-12
                    
                    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
                        dateMatch = false;
                        return categoryMatch && statusMatch && accountMatch && dateMatch;
                    }
                    
                    startYear = yearNum;
                    startMonth = monthNum;
                    startDay = 1;
                    
                    // Get last day of selected month (Day 0 of next month = last day of current month)
                    const lastDayOfMonth = new Date(yearNum, monthNum, 0);
                    endYear = yearNum;
                    endMonth = monthNum;
                    endDay = lastDayOfMonth.getDate();
                } else {
                    // No month selected, skip date filter
                    dateMatch = true;
                    return categoryMatch && statusMatch && accountMatch && dateMatch;
                }
            } else {
                // For other filters (last-7-days, last-30-days, last-90-days, custom)
                // Parse dates using Date object but extract components explicitly
                const startDate = new Date(dateRange.startDate);
                startDate.setHours(0, 0, 0, 0);
                startYear = startDate.getFullYear();
                startMonth = startDate.getMonth() + 1; // Convert to 1-12
                startDay = startDate.getDate();
                
                const endDate = new Date(dateRange.endDate);
                endDate.setHours(23, 59, 59, 999);
                endYear = endDate.getFullYear();
                endMonth = endDate.getMonth() + 1; // Convert to 1-12
                endDay = endDate.getDate();
            }
            
            // Create comparable date values (YYYYMMDD format - integers)
            const txValue = txYear * 10000 + txMonth * 100 + txDay;
            const startValue = startYear * 10000 + startMonth * 100 + startDay;
            const endValue = endYear * 10000 + endMonth * 100 + endDay;
            
            // STRICT comparison - transaction must be >= start AND <= end
            // For month filters, this ensures ONLY transactions from that exact month
            dateMatch = txValue >= startValue && txValue <= endValue;
        }

        return categoryMatch && statusMatch && accountMatch && dateMatch;
    });

    // POST-FILTER VALIDATION: For select-month, double-check and remove any transactions from other months
    if (filterType === 'select-month') {
        const monthInput = document.getElementById('filter-month').value;
        if (monthInput) {
            const [year, month] = monthInput.split('-');
            const yearNum = parseInt(year, 10);
            const monthNum = parseInt(month, 10); // 1-12
            
            if (!isNaN(yearNum) && !isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
                filteredTransactions = filteredTransactions.filter(t => {
                    // Parse transaction date string directly
                    if (typeof t.date === 'string' && t.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        const [txYear, txMonth] = t.date.split('-').map(Number);
                        // STRICT match - must be exact year AND month
                        return txYear === yearNum && txMonth === monthNum;
                    }
                    // If not a valid date string, exclude it
                    return false;
                });
            }
        }
    }

    // Always sort by date descending (newest first) after filtering
    sortConfig.column = 'date';
    sortConfig.direction = 'desc';
    filteredTransactions.sort((a, b) => {
        // Parse dates using string comparison to avoid timezone issues
        // For YYYY-MM-DD format strings, we can compare directly
        if (typeof a.date === 'string' && typeof b.date === 'string') {
            return b.date.localeCompare(a.date); // Descending (newest first)
        }
        // Fallback to Date objects
        const aDate = new Date(a.date);
        const bDate = new Date(b.date);
        return bDate - aDate; // Descending order (newest first)
    });

    // Invalidate cache when filtering changes
    invalidateCache();

    // Reset scroll position when filtering
    const container = document.querySelector('.table-container');
    if (container) {
        container.scrollTop = 0;
    }

    // Re-render transactions - ensure DOM is cleared and refreshed
    renderTransactions();
    updateDashboardForFilteredTransactions();
}

// Setup Event Listeners
function setupEventListeners() {
    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    
    // Edit Total Balance
    document.getElementById('edit-total-balance').addEventListener('click', editTotalBalance);
    
    // Expand/Collapse Accounts
    const toggleAccountsBtn = document.getElementById('toggle-accounts');
    toggleAccountsBtn.addEventListener('click', () => {
        const summaryEl = document.getElementById('accounts-summary');
        const expandedEl = document.getElementById('accounts-list-expanded');
        const icon = toggleAccountsBtn.querySelector('.expand-icon');
        
        if (expandedEl.style.display === 'none') {
            expandedEl.style.display = 'block';
            summaryEl.style.display = 'none';
            icon.style.transform = 'rotate(180deg)';
        } else {
            expandedEl.style.display = 'none';
            summaryEl.style.display = 'block';
            icon.style.transform = 'rotate(0deg)';
        }
    });
    
    // Expand/Collapse Categories
    const toggleCategoriesBtn = document.getElementById('toggle-categories');
    toggleCategoriesBtn.addEventListener('click', () => {
        const summaryEl = document.getElementById('categories-summary');
        const expandedEl = document.getElementById('categories-list-expanded');
        const icon = toggleCategoriesBtn.querySelector('.expand-icon');
        
        if (expandedEl.style.display === 'none') {
            expandedEl.style.display = 'block';
            summaryEl.style.display = 'none';
            icon.style.transform = 'rotate(180deg)';
        } else {
            expandedEl.style.display = 'none';
            summaryEl.style.display = 'block';
            icon.style.transform = 'rotate(0deg)';
        }
    });
    
    // Sortable headers
    document.querySelectorAll('.sortable').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            sortTransactions(column);
        });
    });

    // Filters
    const dateRangeFilter = document.getElementById('filter-date-range');
    const monthSelector = document.getElementById('month-selector');
    const customDateRange = document.getElementById('custom-date-range');
    const monthFilter = document.getElementById('filter-month');
    const dateStartFilter = document.getElementById('filter-date-start');
    const dateEndFilter = document.getElementById('filter-date-end');

    // Show/hide custom date inputs and month selector
    dateRangeFilter.addEventListener('change', (e) => {
        const filterType = e.target.value;
        
        // Hide both by default
        monthSelector.style.display = 'none';
        customDateRange.style.display = 'none';
        
        // Show appropriate input based on selection
        if (filterType === 'select-month') {
            monthSelector.style.display = 'flex';
            monthSelector.style.alignItems = 'center';
        } else if (filterType === 'custom') {
            customDateRange.style.display = 'flex';
            customDateRange.style.flexDirection = 'column';
            customDateRange.style.gap = '0.5rem';
        }
        
        filterTransactions();
    });

    // Date filter listeners (with debouncing)
    monthFilter.addEventListener('change', debouncedFilterTransactions);
    dateStartFilter.addEventListener('change', debouncedFilterTransactions);
    dateEndFilter.addEventListener('change', debouncedFilterTransactions);
    
    document.getElementById('filter-category').addEventListener('change', debouncedFilterTransactions);
    document.getElementById('filter-status').addEventListener('change', debouncedFilterTransactions);
    document.getElementById('filter-account').addEventListener('change', debouncedFilterTransactions);
    
    // Event delegation for transaction table (prevents memory leaks)
    const transactionsTable = document.getElementById('transactions-table');
    if (transactionsTable) {
        transactionsTable.addEventListener('change', (e) => {
            if (e.target.classList.contains('category-select')) {
                const transactionId = parseInt(e.target.dataset.transactionId);
                const newCategory = e.target.value;
                updateTransactionCategory(transactionId, newCategory);
            }
        });
        
        transactionsTable.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-btn');
            if (editBtn) {
                const id = parseInt(editBtn.dataset.id);
                editTransaction(id);
                return;
            }
            
            const deleteBtn = e.target.closest('.delete-btn');
            if (deleteBtn) {
                const id = parseInt(deleteBtn.dataset.id);
                deleteTransaction(id);
            }
        });
    }

    // Category modal
    const addCategoryBtn = document.getElementById('add-category-btn');
    const categoryModal = document.getElementById('category-modal');
    const closeModal = document.getElementById('close-modal');
    const cancelCategory = document.getElementById('cancel-category');
    const categoryForm = document.getElementById('category-form');

    addCategoryBtn.addEventListener('click', () => {
        editingCategoryId = null;
        document.getElementById('modal-title').textContent = 'Add Category';
        document.getElementById('category-name').value = '';
        document.getElementById('category-allocation').value = '';
        categoryModal.classList.add('active');
    });

    closeModal.addEventListener('click', () => {
        categoryModal.classList.remove('active');
    });

    cancelCategory.addEventListener('click', () => {
        editingCategoryId = null;
        categoryModal.classList.remove('active');
    });

    categoryModal.addEventListener('click', (e) => {
        if (e.target === categoryModal) {
            categoryModal.classList.remove('active');
        }
    });

    categoryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!validateCategoryForm()) {
            return;
        }
        
        const name = document.getElementById('category-name').value.trim();
        const allocation = parseFloat(document.getElementById('category-allocation').value);

        if (editingCategoryId) {
            const category = categories.find(c => c.id === editingCategoryId);
            if (category) {
                category.name = name;
                category.allocation = allocation;
                showToast('Category updated successfully', 'success');
            }
        } else {
            const newCategory = {
                id: categories.length > 0 ? Math.max(...categories.map(c => c.id)) + 1 : 1,
                name,
                allocation,
                spent: 0
            };
            categories.push(newCategory);
            showToast('Category added successfully', 'success');
        }

        saveData(); // Immediate save for add/edit
        invalidateCache(); // Invalidate spending cache
        editingCategoryId = null;
        categoryModal.classList.remove('active');
        document.getElementById('modal-title').textContent = 'Add Category';
        renderCategoriesSummary();
        renderCategoriesExpanded();
        populateCategoryFilters();
        renderTransactions();
    });

    // Account modal
    const addAccountBtn = document.getElementById('add-account-btn');
    const chooseMethodModal = document.getElementById('choose-account-method-modal');
    const closeChooseMethodModal = document.getElementById('close-choose-method-modal');
    const connectPlaidBtn = document.getElementById('connect-plaid-btn');
    const manualEntryBtn = document.getElementById('manual-entry-btn');
    
    const plaidModal = document.getElementById('plaid-modal');
    const closePlaidModal = document.getElementById('close-plaid-modal');
    const cancelPlaid = document.getElementById('cancel-plaid');
    
    const accountModal = document.getElementById('account-modal');
    const closeAccountModal = document.getElementById('close-account-modal');
    const cancelAccount = document.getElementById('cancel-account');
    const accountForm = document.getElementById('account-form');
    // editingAccountId is already declared globally, don't redeclare here

    // Sync account type and subtype dropdowns - supporting all Plaid account types
    const accountTypeSelect = document.getElementById('account-type');
    const accountSubtypeSelect = document.getElementById('account-subtype');

    // Use global function for updating subtypes
    accountTypeSelect.addEventListener('change', (e) => {
        updateAccountSubtypesForSelect(e.target.value);
    });

    addAccountBtn.addEventListener('click', () => {
        editingAccountId = null;
        // Show choose method modal first
        chooseMethodModal.classList.add('active');
    });

    // Choose Method Modal handlers
    closeChooseMethodModal.addEventListener('click', () => {
        chooseMethodModal.classList.remove('active');
    });

    chooseMethodModal.addEventListener('click', (e) => {
        if (e.target === chooseMethodModal) {
            chooseMethodModal.classList.remove('active');
        }
    });

    // Connect via Plaid button
    connectPlaidBtn.addEventListener('click', async () => {
        chooseMethodModal.classList.remove('active');
        plaidModal.classList.add('active');
        
        // Show loading state
        document.getElementById('plaid-loading').style.display = 'block';
        document.getElementById('plaid-error').style.display = 'none';
        document.getElementById('plaid-link-container').style.display = 'none';
        
        try {
            await initializePlaidLink();
        } catch (error) {
            showPlaidError(error.message || 'Failed to initialize Plaid connection');
        }
    });

    // Manual Entry button
    manualEntryBtn.addEventListener('click', () => {
        chooseMethodModal.classList.remove('active');
        // Reset form and show manual entry modal
        document.getElementById('account-modal-title').textContent = 'Add Account';
        document.getElementById('account-name').value = '';
        document.getElementById('account-type').value = 'depository';
        updateAccountSubtypesForSelect('depository');
        document.getElementById('account-mask').value = '';
        document.getElementById('account-balance').value = '';
        accountModal.classList.add('active');
    });

    // Plaid Modal handlers
    closePlaidModal.addEventListener('click', () => {
        plaidModal.classList.remove('active');
        chooseMethodModal.classList.add('active');
    });

    cancelPlaid.addEventListener('click', () => {
        plaidModal.classList.remove('active');
        chooseMethodModal.classList.add('active');
    });

    plaidModal.addEventListener('click', (e) => {
        if (e.target === plaidModal) {
            plaidModal.classList.remove('active');
            chooseMethodModal.classList.add('active');
        }
    });

    closeAccountModal.addEventListener('click', () => {
        accountModal.classList.remove('active');
    });

    cancelAccount.addEventListener('click', () => {
        editingAccountId = null;
        accountModal.classList.remove('active');
    });

    accountModal.addEventListener('click', (e) => {
        if (e.target === accountModal) {
            accountModal.classList.remove('active');
        }
    });

    accountForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!validateAccountForm()) {
            return;
        }
        
        const name = document.getElementById('account-name').value.trim();
        const type = document.getElementById('account-type').value;
        const subtype = document.getElementById('account-subtype').value;
        const mask = document.getElementById('account-mask').value.trim();
        const balance = parseFloat(document.getElementById('account-balance').value);

        if (editingAccountId) {
            const account = accounts.find(a => a.id === editingAccountId);
            if (account) {
                account.name = name;
                account.type = type;
                account.subtype = subtype;
                account.mask = mask;
                account.initialBalance = balance;
                // Recalculate balance from transactions
                calculateAccountBalances();
                showToast('Account updated successfully', 'success');
            }
        } else {
            const newAccount = {
                id: `acc_${Date.now()}`,
                name,
                type,
                subtype,
                initialBalance: balance,
                balance: balance,
                mask
            };
            accounts.push(newAccount);
            // Automatically include new account in total balance
            includedAccountIds.add(newAccount.id);
            saveIncludedAccounts();
            showToast('Account added successfully', 'success');
        }

        saveData(); // Immediate save for add/edit
        buildAccountsMap(); // Rebuild map after account changes
        editingAccountId = null;
        accountModal.classList.remove('active');
        document.getElementById('account-modal-title').textContent = 'Add Account';
        renderAccountsSummary();
        renderAccountsExpanded();
        updateTotalBalance(); // Update total balance when account added/edited
        populateAccountFilters();
        if (window.populateTransactionAccountSelect) {
            window.populateTransactionAccountSelect();
        }
    });

    // Footer buttons
    document.getElementById('sync-btn').addEventListener('click', async () => {
        if (plaidItemIds.size === 0) {
            showToast('No Plaid accounts connected. Please connect an account first.', 'error');
            return;
        }
        await syncAllTransactions();
    });

    document.getElementById('export-btn').addEventListener('click', () => {
        exportToCSV();
    });

    // Clear Data Modal
    const clearDataBtn = document.getElementById('clear-data-btn');
    const clearDataModal = document.getElementById('clear-data-modal');
    const closeClearModal = document.getElementById('close-clear-modal');
    const cancelClearData = document.getElementById('cancel-clear-data');
    const confirmClearData = document.getElementById('confirm-clear-data');

    clearDataBtn.addEventListener('click', () => {
        clearDataModal.classList.add('active');
    });

    closeClearModal.addEventListener('click', () => {
        clearDataModal.classList.remove('active');
    });

    cancelClearData.addEventListener('click', () => {
        clearDataModal.classList.remove('active');
    });

    confirmClearData.addEventListener('click', async () => {
        await clearAllData();
    });

    clearDataModal.addEventListener('click', (e) => {
        if (e.target === clearDataModal) {
            clearDataModal.classList.remove('active');
        }
    });

    // Delete Transaction Modal
    const deleteTransactionModal = document.getElementById('delete-transaction-modal');
    const closeDeleteTransactionModal = document.getElementById('close-delete-transaction-modal');
    const cancelDeleteTransaction = document.getElementById('cancel-delete-transaction');
    const confirmDeleteTransactionBtn = document.getElementById('confirm-delete-transaction');

    closeDeleteTransactionModal.addEventListener('click', () => {
        deletingTransactionId = null;
        deleteTransactionModal.classList.remove('active');
    });

    cancelDeleteTransaction.addEventListener('click', () => {
        deletingTransactionId = null;
        deleteTransactionModal.classList.remove('active');
    });

    confirmDeleteTransactionBtn.addEventListener('click', async () => {
        await confirmDeleteTransaction();
    });

    deleteTransactionModal.addEventListener('click', (e) => {
        if (e.target === deleteTransactionModal) {
            deletingTransactionId = null;
            deleteTransactionModal.classList.remove('active');
        }
    });

    // Edit Total Balance Modal
    const balanceModal = document.getElementById('edit-balance-modal');
    const closeBalanceModal = document.getElementById('close-balance-modal');
    const cancelBalanceEdit = document.getElementById('cancel-balance-edit');
    const saveBalance = document.getElementById('save-balance');

    closeBalanceModal.addEventListener('click', () => {
        balanceModal.classList.remove('active');
    });

    cancelBalanceEdit.addEventListener('click', () => {
        balanceModal.classList.remove('active');
    });

    saveBalance.addEventListener('click', () => {
        saveTotalBalance();
    });

    balanceModal.addEventListener('click', (e) => {
        if (e.target === balanceModal) {
            balanceModal.classList.remove('active');
        }
    });

    // Select All / Deselect All for balance accounts
    const selectAllAccounts = document.getElementById('select-all-accounts');
    const deselectAllAccounts = document.getElementById('deselect-all-accounts');
    
    if (selectAllAccounts) {
        selectAllAccounts.addEventListener('click', () => {
            accounts.forEach(acc => {
                const checkbox = document.getElementById(`balance-account-${acc.id}`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
            updateBalanceDisplay();
        });
    }
    
    if (deselectAllAccounts) {
        deselectAllAccounts.addEventListener('click', () => {
            accounts.forEach(acc => {
                const checkbox = document.getElementById(`balance-account-${acc.id}`);
                if (checkbox) {
                    checkbox.checked = false;
                }
            });
            updateBalanceDisplay();
        });
    }

    // Transaction modal
    const addTransactionBtn = document.getElementById('add-transaction-btn');
    const transactionModal = document.getElementById('transaction-modal');
    const closeTransactionModal = document.getElementById('close-transaction-modal');
    const cancelTransaction = document.getElementById('cancel-transaction');
    const transactionForm = document.getElementById('transaction-form');

    // Populate category dropdown in transaction modal
    function populateTransactionCategorySelect() {
        const select = document.getElementById('transaction-category');
        select.innerHTML = '<option value="">Exempt</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.name;
            option.textContent = cat.name;
            select.appendChild(option);
        });
    }
    
    // Make function accessible globally for editing
    window.populateTransactionCategorySelect = populateTransactionCategorySelect;

    // Populate account dropdown in transaction modal
    function populateTransactionAccountSelect() {
        const select = document.getElementById('transaction-account');
        if (!select) return; // Safety check
        select.innerHTML = '';
        accounts.forEach(acc => {
            const option = document.createElement('option');
            option.value = acc.id;
            option.textContent = `${acc.name} ••••${acc.mask}`;
            select.appendChild(option);
        });
    }

    // Make function accessible globally for account creation
    window.populateTransactionAccountSelect = populateTransactionAccountSelect;

    addTransactionBtn.addEventListener('click', () => {
        editingTransactionId = null;
        populateTransactionCategorySelect();
        populateTransactionAccountSelect();
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('transaction-date').value = today;
        document.getElementById('transaction-merchant').value = '';
        document.getElementById('transaction-amount').value = '';
        document.getElementById('transaction-category').value = '';
        document.getElementById('transaction-status').value = 'posted';
        const modalTitle = document.querySelector('#transaction-modal h2');
        if (modalTitle) modalTitle.textContent = 'Add Transaction';
        document.getElementById('transaction-account').value = accounts[0]?.id || '';
        
        // Reset button text
        const submitBtn = transactionForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.textContent = 'Add Transaction';
        
        transactionModal.classList.add('active');
    });

    closeTransactionModal.addEventListener('click', () => {
        // Reset button text
        const submitBtn = transactionForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.textContent = 'Add Transaction';
        
        transactionModal.classList.remove('active');
    });

    cancelTransaction.addEventListener('click', () => {
        editingTransactionId = null;
        transactionModal.classList.remove('active');
        const modalTitle = document.querySelector('#transaction-modal h2');
        if (modalTitle) modalTitle.textContent = 'Add Transaction';
        
        // Reset button text
        const submitBtn = transactionForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.textContent = 'Add Transaction';
    });

    transactionModal.addEventListener('click', (e) => {
        if (e.target === transactionModal) {
            transactionModal.classList.remove('active');
        }
    });

    transactionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!validateTransactionForm()) {
            return;
        }
        
        const date = document.getElementById('transaction-date').value;
        const merchant = document.getElementById('transaction-merchant').value.trim();
        const amount = parseFloat(document.getElementById('transaction-amount').value);
        const category = document.getElementById('transaction-category').value;
        const status = document.getElementById('transaction-status').value;
        const accountId = document.getElementById('transaction-account').value;

        // Process amount: Plaid convention - negative = income, positive = expense
        // User enters: positive = expense (stored as positive), negative = income (stored as negative)
        const finalAmount = amount; // Keep as-is: positive = expense, negative = income

        // Get account info to determine accountType (for backward compatibility)
        const account = accountsMap.get(accountId); // Use Map for O(1) lookup
        // Map Plaid account types to legacy accountType field
        // depository = debit, credit/loan = credit, investment/other = debit
        const accountType = (account?.type === 'credit' || account?.type === 'loan') ? 'credit' : 'debit';

        if (editingTransactionId) {
            // Edit existing transaction
            const transaction = transactions.find(t => t.id === editingTransactionId);
            if (transaction) {
                transaction.date = date;
                transaction.merchant = merchant;
                transaction.amount = finalAmount;
                transaction.category = category || '';
                transaction.status = status;
                transaction.accountId = accountId;
                transaction.accountType = accountType;
                transaction.updated = true;
                showToast('Transaction updated successfully', 'success');
            }
        } else {
            // Add new transaction
            const newTransaction = {
                id: transactions.length > 0 ? Math.max(...transactions.map(t => t.id)) + 1 : 1,
                date,
                merchant,
                amount: finalAmount,
                category: category || '', // Empty string if exempt
                status,
                accountId,
                accountType, // Keep for backward compatibility
                updated: false
            };
            transactions.push(newTransaction);
            showToast('Transaction added successfully', 'success');
        }

        saveData(); // Immediate save for add/edit
        invalidateCache(); // Invalidate spending cache
        calculateAccountBalances(); // Recalculate balances
        filterTransactions(); // Re-filter and re-render
        initializeDashboard(); // Update dashboard
        
        editingTransactionId = null;
        transactionModal.classList.remove('active');
        const modalTitle = document.querySelector('#transaction-modal h2');
        if (modalTitle) modalTitle.textContent = 'Add Transaction';
        
        // Reset button text
        const submitBtn = transactionForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.textContent = 'Add Transaction';
        
        renderCategoriesSummary();
        renderCategoriesExpanded();
    });
}

// Edit Account Function
function editAccount(id) {
    const account = accounts.find(a => a.id === id);
    if (!account) return;
    
    editingAccountId = id;
    document.getElementById('account-name').value = account.name;
    document.getElementById('account-type').value = account.type;
    document.getElementById('account-subtype').value = account.subtype;
    document.getElementById('account-mask').value = account.mask;
    // Show initial balance for editing (current balance might be calculated)
    const balanceToShow = account.initialBalance !== undefined ? account.initialBalance : account.balance;
    document.getElementById('account-balance').value = balanceToShow;
    
    // Update subtype options based on type using the global function
    updateAccountSubtypesForSelect(account.type);
    
    // Set the subtype value after options are populated
    const subtypeSelect = document.getElementById('account-subtype');
    if (subtypeSelect) {
        subtypeSelect.value = account.subtype || '';
    }
    
    document.getElementById('account-modal-title').textContent = 'Edit Account';
    document.getElementById('account-modal').classList.add('active');
}

// Edit Category
function editCategory(id) {
    const category = categories.find(c => c.id === id);
    if (category) {
        editingCategoryId = id;
        document.getElementById('modal-title').textContent = 'Edit Category';
        document.getElementById('category-name').value = category.name;
        document.getElementById('category-allocation').value = category.allocation;
        document.getElementById('category-modal').classList.add('active');
    }
}

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function formatDate(dateString) {
    // Parse date string directly to avoid timezone conversion issues
    // If dateString is already YYYY-MM-DD format, parse it directly
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day); // month is 0-indexed
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
    
    // Fallback for other date formats
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return dateString; // Return as-is if invalid
    }
    
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

