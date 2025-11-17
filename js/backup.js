/**
 * Data Backup Module
 * 
 * Provides functions to export all application data to JSON format
 * for backup and recovery purposes.
 */

/**
 * Export all frontend data (transactions, accounts, categories)
 * @returns {Object} Complete data export object
 */
async function exportAllData() {
    try {
        // Ensure data is loaded
        if (typeof loadData === 'function') {
            await loadData();
        }
        
        // Get Plaid item IDs metadata (not actual tokens - those are backend only)
        const plaidMetadata = [];
        if (typeof plaidItemIds !== 'undefined' && plaidItemIds instanceof Map) {
            plaidItemIds.forEach((value, key) => {
                plaidMetadata.push({
                    accountId: key,
                    itemId: value.item_id,
                    cursor: value.cursor || null
                });
            });
        }
        
        // Build export object
        const exportData = {
            version: '1.0.0',
            exportDate: new Date().toISOString(),
            data: {
                transactions: typeof transactions !== 'undefined' ? transactions : [],
                accounts: typeof accounts !== 'undefined' ? accounts : [],
                categories: typeof categories !== 'undefined' ? categories : [],
                plaidMetadata: plaidMetadata
            },
            metadata: {
                transactionCount: typeof transactions !== 'undefined' ? transactions.length : 0,
                accountCount: typeof accounts !== 'undefined' ? accounts.length : 0,
                categoryCount: typeof categories !== 'undefined' ? categories.length : 0,
                plaidAccountCount: plaidMetadata.length
            }
        };
        
        return exportData;
    } catch (error) {
        console.error('Error exporting data:', error);
        if (typeof errorHandler !== 'undefined') {
            errorHandler.handle(error, 'Data Export', true);
        } else if (typeof showToast !== 'undefined') {
            showToast('Error exporting data: ' + error.message, 'error');
        }
        throw error;
    }
}

/**
 * Export data to downloadable JSON file
 * @param {Object} data - Data to export (from exportAllData())
 * @param {string} filename - Optional filename (default: budget-backup-YYYY-MM-DD.json)
 */
function exportToFile(data, filename = null) {
    try {
        // Generate filename if not provided
        if (!filename) {
            const date = new Date().toISOString().split('T')[0];
            filename = `budget-backup-${date}.json`;
        }
        
        // Convert to JSON string with pretty formatting
        const jsonString = JSON.stringify(data, null, 2);
        
        // Create blob
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // Show success message
        if (typeof showToast !== 'undefined') {
            showToast(`Data exported successfully: ${filename}`, 'success');
        }
        
        return true;
    } catch (error) {
        console.error('Error exporting to file:', error);
        if (typeof errorHandler !== 'undefined') {
            errorHandler.handle(error, 'File Export', true);
        } else if (typeof showToast !== 'undefined') {
            showToast('Error exporting file: ' + error.message, 'error');
        }
        return false;
    }
}

/**
 * Export all data and download as file
 * Main function to call from UI
 */
async function exportAllDataToFile() {
    try {
        if (typeof showToast !== 'undefined') {
            showToast('Exporting data...', 'info');
        }
        
        const data = await exportAllData();
        const success = exportToFile(data);
        
        if (success) {
            console.log('Data export completed successfully');
            console.log(`Exported ${data.metadata.transactionCount} transactions, ${data.metadata.accountCount} accounts, ${data.metadata.categoryCount} categories`);
        }
        
        return success;
    } catch (error) {
        console.error('Error in exportAllDataToFile:', error);
        if (typeof errorHandler !== 'undefined') {
            errorHandler.handle(error, 'Data Export', true);
        }
        return false;
    }
}

