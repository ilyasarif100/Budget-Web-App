/**
 * Data Restore Module
 * 
 * Provides functions to import and restore application data from JSON backup files.
 */

/**
 * Read JSON file from file input
 * @param {File} file - File object from file input
 * @returns {Promise<Object>} Parsed JSON data
 */
function importFromFile(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('No file provided'));
            return;
        }
        
        if (!file.name.endsWith('.json')) {
            reject(new Error('File must be a JSON file'));
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);
                resolve(jsonData);
            } catch (error) {
                reject(new Error('Invalid JSON file: ' + error.message));
            }
        };
        
        reader.onerror = () => {
            reject(new Error('Error reading file'));
        };
        
        reader.readAsText(file);
    });
}

/**
 * Validate imported data structure
 * @param {Object} data - Imported data object
 * @returns {Object} Validation result with isValid and errors
 */
function validateImportData(data) {
    const errors = [];
    
    if (!data || typeof data !== 'object') {
        errors.push('Invalid data format: must be an object');
        return { isValid: false, errors };
    }
    
    // Check for version
    if (!data.version) {
        errors.push('Missing version field');
    }
    
    // Check for data object
    if (!data.data || typeof data.data !== 'object') {
        errors.push('Missing data object');
        return { isValid: false, errors };
    }
    
    // Validate transactions
    if (data.data.transactions) {
        if (!Array.isArray(data.data.transactions)) {
            errors.push('Transactions must be an array');
        } else {
            data.data.transactions.forEach((t, index) => {
                if (!t.id) {
                    errors.push(`Transaction at index ${index} missing id`);
                }
                if (!t.date) {
                    errors.push(`Transaction at index ${index} missing date`);
                }
                if (typeof t.amount === 'undefined') {
                    errors.push(`Transaction at index ${index} missing amount`);
                }
            });
        }
    }
    
    // Validate accounts
    if (data.data.accounts) {
        if (!Array.isArray(data.data.accounts)) {
            errors.push('Accounts must be an array');
        } else {
            data.data.accounts.forEach((a, index) => {
                if (!a.id) {
                    errors.push(`Account at index ${index} missing id`);
                }
                if (!a.name) {
                    errors.push(`Account at index ${index} missing name`);
                }
            });
        }
    }
    
    // Validate categories
    if (data.data.categories) {
        if (!Array.isArray(data.data.categories)) {
            errors.push('Categories must be an array');
        } else {
            data.data.categories.forEach((c, index) => {
                if (!c.id) {
                    errors.push(`Category at index ${index} missing id`);
                }
                if (!c.name) {
                    errors.push(`Category at index ${index} missing name`);
                }
            });
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        stats: {
            transactionCount: data.data.transactions?.length || 0,
            accountCount: data.data.accounts?.length || 0,
            categoryCount: data.data.categories?.length || 0
        }
    };
}

/**
 * Handle conflicts between existing and imported data
 * @param {Array} existing - Existing items
 * @param {Array} imported - Imported items
 * @param {string} strategy - 'replace' (default) or 'merge'
 * @returns {Array} Resolved items
 */
function handleConflicts(existing, imported, strategy = 'replace') {
    if (strategy === 'replace') {
        return imported;
    }
    
    if (strategy === 'merge') {
        // Create map of existing items by ID
        const existingMap = new Map();
        existing.forEach(item => {
            existingMap.set(item.id, item);
        });
        
        // Merge: imported items override existing ones
        const merged = [...existing];
        imported.forEach(item => {
            const existingIndex = merged.findIndex(e => e.id === item.id);
            if (existingIndex >= 0) {
                merged[existingIndex] = item; // Replace existing
            } else {
                merged.push(item); // Add new
            }
        });
        
        return merged;
    }
    
    return imported;
}

/**
 * Restore all data from imported backup
 * @param {Object} importData - Validated import data
 * @param {string} strategy - 'replace' (default) or 'merge'
 * @returns {Promise<boolean>} Success status
 */
async function restoreAllData(importData, strategy = 'replace') {
    try {
        if (typeof showToast !== 'undefined') {
            showToast('Restoring data...', 'info');
        }
        
        // Ensure data is loaded first
        if (typeof loadData === 'function') {
            await loadData();
        }
        
        // Restore transactions
        if (importData.data.transactions) {
            if (typeof transactions !== 'undefined') {
                transactions.length = 0; // Clear existing
                transactions.push(...importData.data.transactions);
                
                // Rebuild transaction maps
                if (typeof buildTransactionsMaps === 'function') {
                    buildTransactionsMaps();
                }
                
                // Mark all as dirty for saving
                if (typeof dirtyTransactions !== 'undefined') {
                    transactions.forEach(t => {
                        dirtyTransactions.add(t.id);
                    });
                }
            }
        }
        
        // Restore accounts
        if (importData.data.accounts) {
            if (typeof accounts !== 'undefined') {
                accounts.length = 0; // Clear existing
                accounts.push(...importData.data.accounts);
                
                // Rebuild accounts map
                if (typeof buildAccountsMap === 'function') {
                    buildAccountsMap();
                }
                
                // Mark all as dirty for saving
                if (typeof dirtyAccounts !== 'undefined') {
                    accounts.forEach(a => {
                        dirtyAccounts.add(a.id);
                    });
                }
            }
        }
        
        // Restore categories
        if (importData.data.categories) {
            if (typeof categories !== 'undefined') {
                categories.length = 0; // Clear existing
                categories.push(...importData.data.categories);
                
                // Mark all as dirty for saving
                if (typeof dirtyCategories !== 'undefined') {
                    categories.forEach(c => {
                        dirtyCategories.add(c.id);
                    });
                }
            }
        }
        
        // Restore Plaid metadata
        if (importData.data.plaidMetadata && typeof plaidItemIds !== 'undefined') {
            plaidItemIds.clear();
            importData.data.plaidMetadata.forEach(meta => {
                plaidItemIds.set(meta.accountId, {
                    item_id: meta.itemId,
                    cursor: meta.cursor
                });
            });
        }
        
        // Save all data to IndexedDB
        if (typeof saveData === 'function') {
            await saveData(true); // Force full save
        }
        
        // Invalidate cache
        if (typeof invalidateCache === 'function') {
            invalidateCache();
        }
        
        // Re-render UI
        if (typeof filterTransactions === 'function') {
            filterTransactions();
        }
        if (typeof initializeDashboard === 'function') {
            initializeDashboard();
        }
        if (typeof renderCategories === 'function') {
            renderCategories();
        }
        if (typeof renderAccounts === 'function') {
            renderAccounts();
        }
        
        if (typeof showToast !== 'undefined') {
            showToast('Data restored successfully!', 'success');
        }
        
        console.log('Data restore completed successfully');
        return true;
    } catch (error) {
        console.error('Error restoring data:', error);
        if (typeof errorHandler !== 'undefined') {
            errorHandler.handle(error, 'Data Restore', true);
        } else if (typeof showToast !== 'undefined') {
            showToast('Error restoring data: ' + error.message, 'error');
        }
        return false;
    }
}

/**
 * Main restore function - handles file selection and restoration
 * @param {File} file - File object from file input
 * @param {string} strategy - 'replace' (default) or 'merge'
 * @returns {Promise<boolean>} Success status
 */
async function importAndRestoreData(file, strategy = 'replace') {
    try {
        // Read file
        const importData = await importFromFile(file);
        
        // Validate data
        const validation = validateImportData(importData);
        
        if (!validation.isValid) {
            const errorMsg = 'Invalid backup file:\n' + validation.errors.join('\n');
            if (typeof showToast !== 'undefined') {
                showToast(errorMsg, 'error');
            } else {
                alert(errorMsg);
            }
            console.error('Validation errors:', validation.errors);
            return false;
        }
        
        // Show confirmation with stats
        const confirmMsg = `Restore backup?\n\n` +
            `Transactions: ${validation.stats.transactionCount}\n` +
            `Accounts: ${validation.stats.accountCount}\n` +
            `Categories: ${validation.stats.categoryCount}\n\n` +
            `This will ${strategy === 'replace' ? 'replace' : 'merge with'} your current data.`;
        
        if (!confirm(confirmMsg)) {
            return false;
        }
        
        // Restore data
        const success = await restoreAllData(importData, strategy);
        
        return success;
    } catch (error) {
        console.error('Error in importAndRestoreData:', error);
        if (typeof errorHandler !== 'undefined') {
            errorHandler.handle(error, 'Data Import', true);
        } else if (typeof showToast !== 'undefined') {
            showToast('Error importing data: ' + error.message, 'error');
        }
        return false;
    }
}

