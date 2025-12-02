// ============================================
// UI Filters Module
// ============================================

// Populate Account Filters
function populateAccountFilters() {
  const filterSelect = document.getElementById('filter-account');
  if (!filterSelect) {
    return;
  }

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
  if (!filterSelect) {
    return;
  }

  // Clear existing options except "All Categories"
  filterSelect.innerHTML =
    '<option value="">All Categories</option><option value="exempt">Exempt</option>';
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.name;
    // Escape category name to prevent XSS
    option.textContent = typeof escapeHTML !== 'undefined' ? escapeHTML(cat.name) : cat.name;
    filterSelect.appendChild(option);
  });
}

// Populate Sync Accounts Modal
function populateSyncAccountsModal() {
  const accountsList = document.getElementById('sync-accounts-list');

  if (!accountsList) {
    return;
  }

  accountsList.innerHTML = '';

  // Get only Plaid-connected accounts
  const plaidAccounts = accounts.filter(
    acc =>
      acc.plaidItemId && (typeof plaidItemIds !== 'undefined' ? plaidItemIds.has(acc.id) : false)
  );

  if (plaidAccounts.length === 0) {
    accountsList.innerHTML =
      '<p style="color: var(--text-secondary); padding: 1rem; text-align: center;">No Plaid accounts connected</p>';
    return;
  }

  // Create checkboxes for each Plaid account with last sync time
  plaidAccounts.forEach(acc => {
    const accountItem = document.createElement('div');
    accountItem.style.cssText =
      'display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border-radius: var(--radius-md); margin-bottom: 0.5rem; background: var(--bg-secondary); transition: background 0.2s ease;';
    accountItem.style.border = '1px solid var(--border-color)';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `sync-account-${acc.id}`;
    checkbox.checked = true; // All selected by default
    checkbox.style.cssText =
      'width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary-color);';

    const lastSyncTime =
      typeof getAccountSyncTime !== 'undefined' ? getAccountSyncTime(acc.id) : null;
    const syncStatusColor =
      typeof getSyncStatusColor !== 'undefined'
        ? getSyncStatusColor(lastSyncTime)
        : 'var(--text-secondary)';
    const timeAgo = typeof formatTimeAgo !== 'undefined' ? formatTimeAgo(lastSyncTime) : 'Never';

    const label = document.createElement('label');
    label.htmlFor = `sync-account-${acc.id}`;
    label.style.cssText =
      'flex: 1; cursor: pointer; display: flex; flex-direction: column; gap: 0.25rem;';
    label.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 500; color: var(--text-primary);">${typeof escapeHTML !== 'undefined' ? escapeHTML(acc.name) : acc.name} ••••${acc.mask}</span>
                <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: capitalize;">${acc.type}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${syncStatusColor};"></span>
                <span style="font-size: 0.75rem; color: var(--text-secondary);">Last synced: ${timeAgo}</span>
            </div>
        `;

    accountItem.appendChild(checkbox);
    accountItem.appendChild(label);
    accountsList.appendChild(accountItem);
  });
}

// Confirm Sync Selected Accounts
async function confirmSyncSelectedAccounts() {
  const selectedIds = [];

  accounts.forEach(acc => {
    if (
      acc.plaidItemId &&
      (typeof plaidItemIds !== 'undefined' ? plaidItemIds.has(acc.id) : false)
    ) {
      const checkbox = document.getElementById(`sync-account-${acc.id}`);
      if (checkbox && checkbox.checked) {
        selectedIds.push(acc.id);
      }
    }
  });

  if (selectedIds.length === 0) {
    if (typeof showToast !== 'undefined') {
      showToast('Please select at least one account to sync', 'error');
    }
    return;
  }

  // Close modal
  const modal = document.getElementById('sync-accounts-modal');
  if (modal) {
    modal.classList.remove('active');
  }

  // Sync selected accounts
  if (typeof syncAllTransactions !== 'undefined') {
    await syncAllTransactions(selectedIds);
  }
}

// Export for use in other modules (if using modules)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    populateAccountFilters,
    populateCategoryFilters,
    populateSyncAccountsModal,
    confirmSyncSelectedAccounts,
  };
}
