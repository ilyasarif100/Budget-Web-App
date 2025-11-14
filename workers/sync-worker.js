// ============================================
// Web Worker for Background Transaction Syncing
// ============================================

// Listen for sync requests
self.addEventListener('message', async (event) => {
    const { type, payload } = event.data;

    if (type === 'SYNC_ACCOUNTS') {
        const { accountIds, apiBaseUrl, authToken } = payload;
        
        try {
            const results = await syncAccounts(accountIds, apiBaseUrl, authToken);
            self.postMessage({
                type: 'SYNC_SUCCESS',
                payload: results
            });
        } catch (error) {
            self.postMessage({
                type: 'SYNC_ERROR',
                payload: { error: error.message }
            });
        }
    }
});

// Sync accounts in background
async function syncAccounts(accountIds, apiBaseUrl, authToken) {
    const results = [];
    const BATCH_SIZE = 3; // Sync 3 accounts concurrently

    for (let i = 0; i < accountIds.length; i += BATCH_SIZE) {
        const batch = accountIds.slice(i, i + BATCH_SIZE);
        
        const batchPromises = batch.map(async (accountId) => {
            try {
                const response = await fetch(`${apiBaseUrl}/transactions/sync`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({
                        account_id: accountId,
                        cursor: null
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    return {
                        accountId,
                        success: true,
                        added: data.transactions?.length || 0,
                        modified: data.modified?.length || 0,
                        removed: data.removed?.length || 0
                    };
                } else {
                    return {
                        accountId,
                        success: false,
                        error: `HTTP ${response.status}`
                    };
                }
            } catch (error) {
                return {
                    accountId,
                    success: false,
                    error: error.message
                };
            }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Send progress update
        self.postMessage({
            type: 'SYNC_PROGRESS',
            payload: {
                completed: Math.min(i + BATCH_SIZE, accountIds.length),
                total: accountIds.length
            }
        });
    }

    return results;
}

