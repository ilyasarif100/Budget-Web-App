// ============================================
// Data Management Module
// ============================================

// Performance Optimization: Cached data structures
let accountsMap = new Map(); // O(1) account lookups
let transactionsMap = new Map(); // O(1) transaction lookups by ID
let transactionsByAccountMap = new Map(); // O(1) transactions by accountId
let transactionsByPlaidIdMap = new Map(); // O(1) transactions by plaidTransactionId
let transactionsByCategoryMap = new Map(); // O(1) transactions by category
let transactionsByDateMap = new Map(); // O(1) transactions by date (YYYY-MM-DD)
let categorySpendingCache = null; // Cache category spending calculations
let cacheInvalidated = true; // Track if cache needs refresh

// Change tracking for incremental saves (only save what changed)
let dirtyTransactions = new Set(); // Track which transactions changed
let dirtyAccounts = new Set(); // Track which accounts changed
let dirtyCategories = new Set(); // Track which categories changed
let forceFullSave = false; // Flag to force full save when needed

// Build accounts map for O(1) lookups
function buildAccountsMap() {
    accountsMap.clear();
    accounts.forEach(acc => {
        accountsMap.set(acc.id, acc);
    });
}

// Build transaction maps for O(1) lookups
function buildTransactionsMaps() {
    transactionsMap.clear();
    transactionsByAccountMap.clear();
    transactionsByPlaidIdMap.clear();
    transactionsByCategoryMap.clear();
    transactionsByDateMap.clear();
    
    transactions.forEach(t => {
        // Map by ID
        transactionsMap.set(t.id, t);
        
        // Map by accountId (store as array for multiple transactions per account)
        if (!transactionsByAccountMap.has(t.accountId)) {
            transactionsByAccountMap.set(t.accountId, []);
        }
        transactionsByAccountMap.get(t.accountId).push(t);
        
        // Map by Plaid transaction ID (if exists)
        if (t.plaidTransactionId) {
            transactionsByPlaidIdMap.set(t.plaidTransactionId, t);
        }
        
        // Map by category (store as array for multiple transactions per category)
        if (t.category) {
            if (!transactionsByCategoryMap.has(t.category)) {
                transactionsByCategoryMap.set(t.category, []);
            }
            transactionsByCategoryMap.get(t.category).push(t);
        }
        
        // Map by date (store as array for multiple transactions per date)
        if (t.date) {
            if (!transactionsByDateMap.has(t.date)) {
                transactionsByDateMap.set(t.date, []);
            }
            transactionsByDateMap.get(t.date).push(t);
        }
    });
}

// Invalidate cache when data changes
function invalidateCache() {
    cacheInvalidated = true;
    categorySpendingCache = null;
    // Rebuild transaction maps when data changes
    buildTransactionsMaps();
}

// Get category spending (cached and memoized for performance)
const getCategorySpendingMemoized = typeof memoize !== 'undefined' 
    ? memoize(function() {
        if (categorySpendingCache && !cacheInvalidated) {
            return categorySpendingCache;
        }
        
        // Calculate category spending - only count expenses (positive amounts), not income
        // Use Map for O(1) category lookups if available
        const spending = {};
        const transactionsToProcess = typeof transactionsByCategoryMap !== 'undefined' && transactionsByCategoryMap
            ? Array.from(transactionsByCategoryMap.entries()).flatMap(([category, txs]) => 
                txs.filter(t => t.status !== 'removed' && t.amount > 0).map(t => ({ category, amount: t.amount }))
              )
            : filteredTransactions.filter(t => t.status !== 'removed' && t.category && t.amount > 0);
        
        transactionsToProcess.forEach(t => {
            const category = t.category || t.category;
            spending[category] = (spending[category] || 0) + (t.amount || t.amount);
        });
        
        categorySpendingCache = spending;
        cacheInvalidated = false;
        return spending;
    }, { maxAge: 5000 }) // Cache for 5 seconds
    : function() {
        if (categorySpendingCache && !cacheInvalidated) {
            return categorySpendingCache;
        }
        
        const spending = {};
        filteredTransactions
            .filter(t => t.status !== 'removed' && t.category && t.amount > 0)
            .forEach(t => {
                spending[t.category] = (spending[t.category] || 0) + t.amount;
            });
        
        categorySpendingCache = spending;
        cacheInvalidated = false;
        return spending;
    };

function getCategorySpending() {
    return getCategorySpendingMemoized();
}

// Regular saveData (optimized - only saves changed items)
async function saveData(forceAll = false) {
    try {
        if (!db) await initDB();
        
        // Use single transaction for all saves (more efficient)
        const transaction = db.transaction(
            [STORES.TRANSACTIONS, STORES.ACCOUNTS, STORES.CATEGORIES],
            'readwrite'
        );
        
        const transactionStore = transaction.objectStore(STORES.TRANSACTIONS);
        const accountStore = transaction.objectStore(STORES.ACCOUNTS);
        const categoryStore = transaction.objectStore(STORES.CATEGORIES);
        
        const savePromises = [];
        
        // Save only changed transactions (or all if forced)
        // Batch operations for better performance
        if (forceAll || forceFullSave || dirtyTransactions.size > 0) {
            const transactionsToSave = forceAll || forceFullSave 
                ? transactions 
                : Array.from(dirtyTransactions).map(id => transactionsMap.get(id)).filter(Boolean);
            
            // Batch save in chunks of 100 for better performance
            const BATCH_SIZE = 100;
            for (let i = 0; i < transactionsToSave.length; i += BATCH_SIZE) {
                const batch = transactionsToSave.slice(i, i + BATCH_SIZE);
                batch.forEach(t => {
                    savePromises.push(
                        new Promise((resolve, reject) => {
                            const request = transactionStore.put(t);
                            request.onsuccess = () => resolve();
                            request.onerror = () => reject(request.error);
                        })
                    );
                });
            }
            
            dirtyTransactions.clear();
        }
        
        // Save only changed accounts (or all if forced)
        // Batch operations using Map for O(1) lookups
        if (forceAll || forceFullSave || dirtyAccounts.size > 0) {
            const accountsToSave = forceAll || forceFullSave
                ? accounts
                : Array.from(dirtyAccounts).map(id => accountsMap.get(id)).filter(Boolean);
            
            accountsToSave.forEach(a => {
                savePromises.push(
                    new Promise((resolve, reject) => {
                        const request = accountStore.put(a);
                        request.onsuccess = () => resolve();
                        request.onerror = () => reject(request.error);
                    })
                );
            });
            
            dirtyAccounts.clear();
        }
        
        // Save only changed categories (or all if forced)
        if (forceAll || forceFullSave || dirtyCategories.size > 0) {
            const categoriesToSave = forceAll || forceFullSave
                ? categories
                : categories.filter(c => dirtyCategories.has(c.id));
            
            categoriesToSave.forEach(c => {
                savePromises.push(
                    new Promise((resolve, reject) => {
                        const request = categoryStore.put(c);
                        request.onsuccess = () => resolve();
                        request.onerror = () => reject(request.error);
                    })
                );
            });
            
            dirtyCategories.clear();
        }
        
        // Wait for all saves to complete
        await Promise.all(savePromises);
        
        // Clear force flag after save
        forceFullSave = false;
        
    } catch (error) {
        if (typeof showToast !== 'undefined') {
            showToast('Error saving data: ' + error.message, 'error');
        }
        console.error('Save error:', error);
    }
}

// Load all data from IndexedDB
async function loadData() {
    try {
        if (!db) await initDB();
        
        // Clear dirty sets when loading (fresh start)
        dirtyTransactions.clear();
        dirtyAccounts.clear();
        dirtyCategories.clear();
        
        // Migrate from localStorage if needed
        await migrateFromLocalStorage();
        
        // Load transactions
        const savedTransactions = await getAllFromStore(STORES.TRANSACTIONS);
        if (savedTransactions.length > 0) {
            transactions = savedTransactions;
            // Remove isNew flags from loaded transactions (only show new for freshly synced ones)
            transactions.forEach(t => {
                if (t.isNew) {
                    delete t.isNew;
                }
            });
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
            // Build transaction maps after loading
            buildTransactionsMaps();
        }
        
        // Load accounts
        const savedAccounts = await getAllFromStore(STORES.ACCOUNTS);
        if (savedAccounts.length > 0) {
            accounts = savedAccounts;
            // Ensure all accounts have initialBalance and order for backward compatibility
            accounts.forEach((acc, index) => {
                if (acc.initialBalance === undefined) {
                    acc.initialBalance = acc.balance || 0;
                }
                // Initialize order if missing
                if (acc.order === undefined) {
                    acc.order = index;
                }
            });
            // Build accounts map after loading
            buildAccountsMap();
            // Rebuild transaction maps (account references may have changed)
            buildTransactionsMaps();
        }
        
        // Load categories
        const savedCategories = await getAllFromStore(STORES.CATEGORIES);
        if (savedCategories.length > 0) {
            categories = savedCategories;
        }
        
        // Restore Plaid item IDs from accounts (NO access tokens stored)
        if (typeof plaidItemIds !== 'undefined') {
            accounts.forEach(acc => {
                if (acc.plaidItemId) {
                    plaidItemIds.set(acc.id, {
                        item_id: acc.plaidItemId,
                        cursor: acc.plaidCursor || null,
                    });
                }
            });
        }
        
        // Don't initialize filteredTransactions here - let filterTransactions() handle it
        // filteredTransactions will be set by filterTransactions() when it's called
        filteredTransactions = [];
    } catch (error) {
        if (typeof showToast !== 'undefined') {
            showToast('Error loading data: ' + error.message, 'error');
        }
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

// Clear All Data Function
async function clearAllData() {
    const clearBtn = document.getElementById('clear-data-btn');
    
    try {
        // Set loading state
        if (typeof setLoading !== 'undefined') {
            setLoading('clear', true, clearBtn);
        }
        if (clearBtn) {
            clearBtn.textContent = 'Clearing...';
        }
        
        if (!db) await initDB();
        
        // Clear dirty sets
        dirtyTransactions.clear();
        dirtyAccounts.clear();
        dirtyCategories.clear();
        
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
        if (typeof plaidItemIds !== 'undefined') {
            plaidItemIds.clear();
        }
        
        // Reset editing states (if defined)
        if (typeof editingCategoryId !== 'undefined') editingCategoryId = null;
        if (typeof editingTransactionId !== 'undefined') editingTransactionId = null;
        if (typeof editingAccountId !== 'undefined') editingAccountId = null;
        
        // Clear all localStorage items (except theme preference - user might want to keep that)
        const themePreference = localStorage.getItem('theme'); // Save theme
        localStorage.clear();
        if (themePreference) {
            localStorage.setItem('theme', themePreference); // Restore theme
        }
        
        // Reset included accounts (if defined)
        if (typeof includedAccountIds !== 'undefined') {
            includedAccountIds.clear();
        }
        
        // Clear cache
        invalidateCache();
        buildAccountsMap();
        
        // Re-render everything (if functions are available)
        if (typeof initializeDashboard !== 'undefined') {
            initializeDashboard();
        }
        if (typeof renderCategories !== 'undefined') {
            renderCategories();
        }
        if (typeof renderAccounts !== 'undefined') {
            renderAccounts();
        }
        if (typeof filterTransactions !== 'undefined') {
            filterTransactions();
        }
        if (typeof populateCategoryFilters !== 'undefined') {
            populateCategoryFilters();
        }
        if (typeof populateAccountFilters !== 'undefined') {
            populateAccountFilters();
        }
        
        if (typeof window !== 'undefined' && window.populateTransactionAccountSelect) {
            window.populateTransactionAccountSelect();
        }
        
        if (typeof showToast !== 'undefined') {
            showToast('All data cleared successfully', 'success');
        }
        
        // Close modal (if exists)
        const modal = document.getElementById('clear-data-modal');
        if (modal) {
            modal.classList.remove('active');
        }
        
    } catch (error) {
        if (typeof showToast !== 'undefined') {
            showToast('Error clearing data: ' + error.message, 'error');
        }
        console.error('Clear data error:', error);
    } finally {
        // Clear loading state
        if (typeof setLoading !== 'undefined') {
            setLoading('clear', false, clearBtn);
        }
        if (clearBtn) {
            clearBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
                Clear All Data
            `;
        }
    }
}

// Calculate Account Balances from Transactions
// Note: ALL Plaid-connected accounts use balances directly from Plaid, not calculated from transactions
// Only manually created accounts calculate balances from transactions
function calculateAccountBalances() {
    // Create account balance map for single-pass calculation
    const accountBalances = new Map();
    
    // Initialize balances with starting balances
    accounts.forEach(acc => {
        // For ALL Plaid-connected accounts, use the balance directly from Plaid (don't recalculate)
        // For manually created accounts, calculate from initial balance + transactions
        if (acc.plaidAccountId) {
            // Use the balance that Plaid provides (stored in balance or initialBalance)
            const plaidBalance = acc.balance !== undefined ? acc.balance : (acc.initialBalance !== undefined ? acc.initialBalance : 0);
            accountBalances.set(acc.id, plaidBalance);
        } else {
            // For manually created accounts, calculate from initial balance + transactions
            const startingBalance = acc.initialBalance !== undefined ? acc.initialBalance : acc.balance;
            accountBalances.set(acc.id, startingBalance);
        }
    });
    
    // Single pass through transactions (only for manually created accounts, NOT Plaid accounts)
    transactions.forEach(t => {
        if (t.status !== 'removed' && t.accountId && accountBalances.has(t.accountId)) {
            const account = accounts.find(a => a.id === t.accountId);
            // Only recalculate balances for manually created accounts (not from Plaid)
            if (account && !account.plaidAccountId) {
                accountBalances.set(t.accountId, accountBalances.get(t.accountId) + t.amount);
            }
        }
    });
    
    // Update account balances
    accounts.forEach(acc => {
        // For ALL Plaid-connected accounts, keep the balance from Plaid (don't overwrite it)
        // The balance will be updated when syncing transactions from Plaid
        if (acc.plaidAccountId) {
            // Keep the balance from Plaid (don't overwrite it)
            // Balance is updated from Plaid during sync
        } else {
            // For manually created accounts, use calculated balance
            acc.balance = accountBalances.get(acc.id) || 0;
        }
    });
    
    // Throttled save
    if (typeof throttledSaveData !== 'undefined') {
        throttledSaveData();
    }
    if (typeof renderAccounts !== 'undefined') {
        renderAccounts();
    }
    if (typeof updateTotalBalance !== 'undefined') {
        updateTotalBalance(); // Update total balance when accounts change
    }
}

// Export for use in other modules (if using modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        buildAccountsMap,
        invalidateCache,
        getCategorySpending,
        saveData,
        loadData,
        initializeDefaultData,
        clearAllData,
        calculateAccountBalances,
        // Expose dirty sets for external marking
        dirtyTransactions,
        dirtyAccounts,
        dirtyCategories,
        forceFullSave,
        accountsMap,
        categorySpendingCache,
        cacheInvalidated
    };
}

