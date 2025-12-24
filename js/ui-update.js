// ============================================
// UI Update Functions Module
// ============================================

// Sync Time Tracking (for cost optimization)
function saveAccountSyncTime(accountId, timestamp) {
  const syncTimes = JSON.parse(localStorage.getItem('accountSyncTimes') || '{}');
  syncTimes[accountId] = timestamp;
  localStorage.setItem('accountSyncTimes', JSON.stringify(syncTimes));
}

function getAccountSyncTime(accountId) {
  const syncTimes = JSON.parse(localStorage.getItem('accountSyncTimes') || '{}');
  return syncTimes[accountId] || null;
}

function getLastSyncTime() {
  // Get the most recent sync time across all accounts
  const syncTimes = JSON.parse(localStorage.getItem('accountSyncTimes') || '{}');
  const timestamps = Object.values(syncTimes);
  return timestamps.length > 0 ? Math.max(...timestamps) : null;
}

function formatTimeAgo(timestamp) {
  if (!timestamp) {
    return 'Never';
  }
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) {
    return 'Just now';
  }
  if (minutes < 60) {
    return `${minutes} min${minutes !== 1 ? 's' : ''} ago`;
  }
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

function getSyncStatusColor(timestamp) {
  if (!timestamp) {
    return 'var(--text-secondary)';
  } // Gray - never synced
  const now = Date.now();
  const diff = now - timestamp;
  const hours = diff / 3600000;

  if (hours < 1) {
    return 'var(--success-color)';
  } // Green - fresh
  if (hours < 6) {
    return 'var(--warning-color)';
  } // Yellow - getting old
  return 'var(--danger-color)'; // Red - needs sync
}

function canSync() {
  // Cooldown removed - always allow sync
  return true;
}

// Update Sync Button Status
function updateSyncButtonStatus() {
  const syncBtn = document.getElementById('sync-btn');
  const syncBtnText = document.getElementById('sync-btn-text');
  const syncLastTime = document.getElementById('sync-last-time');
  const syncIndicator = document.getElementById('sync-status-indicator');

  if (!syncBtn || !syncBtnText || !syncLastTime || !syncIndicator) {
    return;
  }

  const lastSync = getLastSyncTime();
  const canSyncNow = canSync();
  const statusColor = getSyncStatusColor(lastSync);

  // Update indicator color
  syncIndicator.style.background = statusColor;

  // Update last sync time text
  if (lastSync) {
    syncLastTime.textContent = `Last synced: ${formatTimeAgo(lastSync)}`;
  } else {
    syncLastTime.textContent = 'Never synced';
  }

  // Button always enabled (cooldown removed)
  syncBtn.disabled = false;
  syncBtn.style.opacity = '1';
  syncBtn.style.cursor = 'pointer';
  syncBtnText.textContent = 'Sync Transactions';
}

// Calculate Total Balance (sum of selected accounts)
function updateTotalBalance() {
  const totalBalanceEl = document.getElementById('total-balance');
  if (!totalBalanceEl) {
    return;
  }

  let total = 0;

  if (typeof includedAccountIds !== 'undefined') {
    accounts.forEach(acc => {
      if (includedAccountIds.has(acc.id)) {
        total += acc.balance || 0;
      }
    });
  } else {
    // Fallback: sum all accounts
    accounts.forEach(acc => {
      total += acc.balance || 0;
    });
  }

  totalBalanceEl.textContent =
    typeof formatCurrency !== 'undefined' ? formatCurrency(total) : `$${total.toFixed(2)}`;
}

// Update balance display in modal (sum of selected accounts)
function updateBalanceDisplay() {
  const accountsSumDisplay = document.getElementById('accounts-sum-display');
  if (!accountsSumDisplay) {
    return;
  }

  let total = 0;
  accounts.forEach(acc => {
    const checkbox = document.getElementById(`balance-account-${acc.id}`);
    if (checkbox && checkbox.checked) {
      total += acc.balance || 0;
    }
  });

  accountsSumDisplay.textContent =
    typeof formatCurrency !== 'undefined' ? formatCurrency(total) : `$${total.toFixed(2)}`;
}

// Calculate Total Spent (for filtered transactions)
// Only count expenses (positive amounts), not income (negative amounts)
// Respects user preferences for categories, accounts, and exempt transactions
function updateTotalSpent() {
  const totalSpentEl = document.getElementById('total-spent');
  if (!totalSpentEl) {
    return;
  }

  const total = filteredTransactions
    .filter(t => {
      // Only expenses
      if (t.status === 'removed' || t.amount <= 0) {
        return false;
      }

      // Check account filter
      if (
        typeof includedSpentAccountIds !== 'undefined' &&
        includedSpentAccountIds.size > 0 &&
        !includedSpentAccountIds.has(t.accountId)
      ) {
        return false;
      }

      // Check category filter
      if (t.category) {
        // Has category - check if category is included
        const category = categories.find(c => c.name === t.category);
        if (
          category &&
          typeof includedSpentCategoryIds !== 'undefined' &&
          includedSpentCategoryIds.size > 0 &&
          !includedSpentCategoryIds.has(category.id)
        ) {
          return false;
        }
      } else {
        // No category (exempt) - check if exempt is included
        if (typeof includeExemptInSpent !== 'undefined' && !includeExemptInSpent) {
          return false;
        }
      }

      return true;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  totalSpentEl.textContent =
    typeof formatCurrency !== 'undefined' ? formatCurrency(total) : `$${total.toFixed(2)}`;
}

// Update Category Summary (shows all budget categories with their spent amounts)
function updateCategorySummary() {
  // Calculate spent amounts from filtered transactions - only expenses, not income
  const categorySpending = {};
  filteredTransactions
    .filter(t => t.status !== 'removed' && t.category && t.amount > 0) // Only expenses
    .forEach(t => {
      categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
    });

  const summaryEl = document.getElementById('category-summary');
  if (!summaryEl) {
    return;
  } // Safety check

  summaryEl.innerHTML = '';

  if (categories.length === 0) {
    summaryEl.innerHTML =
      '<span style="color: var(--text-secondary); font-size: 0.875rem;">No categories yet</span>';
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
    const safeCategoryName = typeof escapeHTML !== 'undefined' ? escapeHTML(cat.name) : cat.name;
    chip.innerHTML = `
            <span class="category-chip-name">${safeCategoryName}</span>
            <span class="category-chip-amount">${typeof formatCurrency !== 'undefined' ? formatCurrency(spent) : `$${spent.toFixed(2)}`}</span>
        `;
    summaryEl.appendChild(chip);
  });
}

// Update Accounts Summary (shows all accounts with balances)
function updateAccountsSummary() {
  const summaryEl = document.getElementById('accounts-summary');
  if (!summaryEl) {
    return;
  } // Safety check

  summaryEl.innerHTML = '';

  if (accounts.length === 0) {
    summaryEl.innerHTML =
      '<span style="color: var(--text-secondary); font-size: 0.875rem;">No accounts</span>';
    return;
  }

  accounts.forEach(acc => {
    const chip = document.createElement('div');
    chip.className = 'account-chip';
    const balanceClass = acc.balance < 0 ? 'negative' : 'positive';
    chip.innerHTML = `
            <span class="account-chip-name">${typeof escapeHTML !== 'undefined' ? escapeHTML(acc.name) : acc.name} ••••${acc.mask}</span>
            <span class="account-chip-balance ${balanceClass}">${typeof formatCurrency !== 'undefined' ? formatCurrency(acc.balance) : `$${acc.balance.toFixed(2)}`}</span>
        `;
    summaryEl.appendChild(chip);
  });
}

// Update dashboard based on filtered transactions
function updateDashboardForFilteredTransactions() {
  updateTotalBalance();
  updateTotalSpent();
  if (typeof recalculateCategorySpent !== 'undefined') {
    recalculateCategorySpent();
  }
  if (typeof renderCategoriesSummary !== 'undefined') {
    renderCategoriesSummary(); // Update summary view
  }
  if (typeof renderCategoriesExpanded !== 'undefined') {
    renderCategoriesExpanded(); // Update expanded view
  }
}

// Update Total Spent display in modal
function updateSpentDisplay() {
  // Get selected categories
  const selectedCategories = new Set();
  categories.forEach(cat => {
    const checkbox = document.getElementById(`spent-category-${cat.id}`);
    if (checkbox && checkbox.checked) {
      selectedCategories.add(cat.id);
    }
  });

  // Get selected accounts
  const selectedAccounts = new Set();
  accounts.forEach(acc => {
    const checkbox = document.getElementById(`spent-account-${acc.id}`);
    if (checkbox && checkbox.checked) {
      selectedAccounts.add(acc.id);
    }
  });

  // Get exempt preference
  const includeExemptEl = document.getElementById('include-exempt-spent');
  const includeExempt = includeExemptEl ? includeExemptEl.checked : true;

  // Calculate total with current selections
  const total = filteredTransactions
    .filter(t => {
      if (t.status === 'removed' || t.amount <= 0) {
        return false;
      }
      if (selectedAccounts.size > 0 && !selectedAccounts.has(t.accountId)) {
        return false;
      }
      if (t.category) {
        const category = categories.find(c => c.name === t.category);
        if (category && selectedCategories.size > 0 && !selectedCategories.has(category.id)) {
          return false;
        }
      } else {
        if (!includeExempt) {
          return false;
        }
      }
      return true;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const spentSumDisplay = document.getElementById('spent-sum-display');
  if (spentSumDisplay) {
    spentSumDisplay.textContent =
      typeof formatCurrency !== 'undefined' ? formatCurrency(total) : `$${total.toFixed(2)}`;
  }
}

// Update Transaction Category
function updateTransactionCategory(transactionId, newCategory) {
  const transaction = transactions.find(t => t.id === transactionId);
  if (transaction) {
    const oldCategory = transaction.category || '';
    const newCategoryValue = newCategory || '';
    
    // Update the transaction category FIRST
    transaction.category = newCategoryValue;
    transaction.updated = true;
    if (typeof dirtyTransactions !== 'undefined') {
      dirtyTransactions.add(transactionId); // Mark as changed
    }

    // CRITICAL: Rebuild maps IMMEDIATELY after category change
    // This ensures the transaction is removed from old category map and added to new category map
    if (typeof buildTransactionsMaps !== 'undefined') {
      buildTransactionsMaps();
    }

    // Save scroll position before re-rendering - find the scrollable container
    const tbody = document.getElementById('transactions-body');
    const scrollContainer = tbody?.closest('.table-container') || document.querySelector('.table-container');
    const scrollPosition = scrollContainer
      ? scrollContainer.scrollTop
      : window.pageYOffset || document.documentElement.scrollTop;
    
    // Also save the row index to restore to the same transaction
    const rowIndex = filteredTransactions.findIndex(t => t.id === transactionId);

    // CRITICAL: Rebuild filteredTransactions with updated category
    // This ensures category spending reflects the change immediately
    if (typeof filterTransactions !== 'undefined') {
      filterTransactions();
    }

    // Invalidate cache to force recalculation
    if (typeof invalidateCache !== 'undefined') {
      invalidateCache(); // This will rebuild maps again (redundant but safe)
    }

    if (typeof saveData !== 'undefined') {
      saveData(); // Immediate save for category change
    }
    if (typeof initializeDashboard !== 'undefined') {
      initializeDashboard(); // This will recalculate everything from transactions
    }
    if (typeof renderCategoriesSummary !== 'undefined') {
      renderCategoriesSummary(); // Update both views
    }
    if (typeof renderCategoriesExpanded !== 'undefined') {
      renderCategoriesExpanded();
    }
    if (typeof renderTransactions !== 'undefined') {
      renderTransactions();
    }

    // Restore scroll position after all rendering is complete
    // Use double requestAnimationFrame to ensure all DOM updates are finished
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollPosition;
          // Also try to scroll the specific row into view if possible
          if (rowIndex >= 0) {
            const row = tbody?.querySelector(`[data-transaction-id="${transactionId}"]`)?.closest('tr');
            if (row) {
              row.scrollIntoView({ behavior: 'instant', block: 'nearest' });
            }
          }
        } else {
          // Fallback to window scroll if container not found
          window.scrollTo({ top: scrollPosition, behavior: 'instant' });
        }
      });
    });
  }
}

// Update Sort Indicators
function updateSortIndicators() {
  document.querySelectorAll('.sort-icon').forEach(icon => {
    icon.textContent = '↕';
  });

  if (typeof sortConfig !== 'undefined' && sortConfig.column) {
    const header = document.querySelector(`th[data-sort="${sortConfig.column}"]`);
    if (header) {
      header.classList.add('active');
      const icon = header.querySelector('.sort-icon');
      if (icon) {
        icon.textContent = sortConfig.direction === 'asc' ? '↑' : '↓';
      }
    }
  }
}

// Export for use in other modules (if using modules)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    saveAccountSyncTime,
    getAccountSyncTime,
    getLastSyncTime,
    formatTimeAgo,
    getSyncStatusColor,
    canSync,
    updateSyncButtonStatus,
    updateTotalBalance,
    updateBalanceDisplay,
    updateTotalSpent,
    updateCategorySummary,
    updateAccountsSummary,
    updateDashboardForFilteredTransactions,
    updateSpentDisplay,
    updateTransactionCategory,
    updateSortIndicators,
  };
}
