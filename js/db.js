// ============================================
// IndexedDB Database Manager
// ============================================

// Database constants - defined in global scope
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

// Clear all data from a store
async function clearStore(storeName) {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DB_NAME,
        DB_VERSION,
        STORES,
        initDB,
        migrateFromLocalStorage,
        saveToStore,
        getFromStore,
        getAllFromStore,
        deleteFromStore,
        clearStore
    };
}

