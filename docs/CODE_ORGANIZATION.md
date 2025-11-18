# Code Organization Analysis and Migration Plan

**Date:** November 17, 2025  
**File:** `script.js` (3,915 lines)  
**Goal:** Break down monolithic file into feature-based modules

---

## Executive Summary

`script.js` is a 3,915-line monolithic file containing all frontend application logic. While the codebase already has good modularization in the `js/` directory, `script.js` remains the largest file and contains multiple feature domains that could be better organized.

**Current State:**
- 3,915 lines of code
- Mix of UI logic, business logic, event handlers, and initialization
- Heavy reliance on global variables
- Functions are well-organized by comments but not by modules

**Target State:**
- Feature-based modules in `js/` directory
- Clear separation of concerns
- Reduced global state
- Easier to test and maintain

---

## Feature Boundaries Analysis

### 1. **Transaction Management** (~800 lines)
**Functions:**
- `addTransaction()`
- `editTransaction()`
- `deleteTransaction()`
- `filterTransactions()`
- `sortTransactions()`
- `renderTransactions()`
- `setupVirtualScrolling()`
- Transaction-related event handlers

**Dependencies:**
- `transactions` array (global)
- `filteredTransactions` array (global)
- `transactionsMap`, `transactionsByAccountMap`, etc. (from `js/data.js`)
- `db` operations (from `js/db.js`)
- `saveData()` (from `js/data.js`)

**Extraction Priority:** High (self-contained, clear boundaries)

---

### 2. **Account Management** (~600 lines)
**Functions:**
- `addAccount()`
- `editAccount()`
- `deleteAccount()`
- `renderAccounts()`
- `updateAccountSubtypesForSelect()`
- `calculateAccountBalances()`
- Account-related event handlers

**Dependencies:**
- `accounts` array (global)
- `accountsMap` (from `js/data.js`)
- `transactions` array (for balance calculation)
- `db` operations

**Extraction Priority:** High (self-contained, clear boundaries)

---

### 3. **Category Management** (~500 lines)
**Functions:**
- `addCategory()`
- `editCategory()`
- `deleteCategory()`
- `renderCategories()`
- `getCategorySpending()`
- `updateTotalSpent()`
- Category-related event handlers

**Dependencies:**
- `categories` array (global)
- `transactions` array (for spending calculations)
- `filteredTransactions` array
- `db` operations

**Extraction Priority:** High (self-contained, clear boundaries)

---

### 4. **Dashboard/Summary** (~400 lines)
**Functions:**
- `initializeDashboard()`
- `updateTotalBalance()`
- `updateTotalSpent()`
- `renderCategoriesSummary()`
- `renderCategoriesExpanded()`
- `updateCurrentMonth()`

**Dependencies:**
- `accounts`, `transactions`, `categories` arrays
- `filteredTransactions` array
- Various calculation functions

**Extraction Priority:** Medium (depends on other features)

---

### 5. **Filtering & UI Controls** (~300 lines)
**Functions:**
- `filterTransactions()` (already partially in `js/ui-filters.js`)
- `populateCategoryFilters()`
- `populateAccountFilters()`
- Date range filtering logic
- Filter-related event handlers

**Dependencies:**
- `transactions`, `accounts`, `categories` arrays
- `filteredTransactions` array
- UI elements

**Extraction Priority:** Medium (some overlap with `js/ui-filters.js`)

---

### 6. **Initialization & Setup** (~200 lines)
**Functions:**
- `initializeDefaultData()`
- `initializeTheme()`
- `initializeIncludedAccounts()`
- `initializeIncludedSpent()`
- `setupEventListeners()`
- DOMContentLoaded handler

**Dependencies:**
- All other modules
- Global state initialization

**Extraction Priority:** Low (keep in `script.js` as orchestrator)

---

### 7. **Utility Functions** (~200 lines)
**Functions:**
- `formatCurrency()`
- `formatDate()`
- `escapeHTML()`
- `debounce()`
- `throttle()`
- `getAccountSyncTime()`
- `getSyncStatusColor()`
- `formatTimeAgo()`

**Dependencies:**
- Minimal (mostly pure functions)

**Extraction Priority:** High (already partially in `js/utils.js`, can consolidate)

---

### 8. **Plaid Sync** (~300 lines)
**Functions:**
- `syncAllTransactions()`
- `syncAccountTransactions()`
- `updateSyncButtonStatus()`
- `populateSyncAccountsModal()`
- `canSync()`
- `getLastSyncTime()`
- `saveAccountSyncTime()`

**Dependencies:**
- `js/plaid.js` (Plaid Link)
- `js/auth.js` (authenticated requests)
- `transactions`, `accounts` arrays
- `db` operations

**Extraction Priority:** Medium (some overlap with `js/plaid.js`)

---

### 9. **Validation** (~150 lines)
**Functions:**
- Transaction validation
- Account validation
- Category validation
- Date validation

**Dependencies:**
- `js/validation.js` (already exists)
- Can consolidate here

**Extraction Priority:** Low (already modularized)

---

### 10. **Theme & UI Helpers** (~100 lines)
**Functions:**
- `toggleTheme()`
- `setLoading()`
- `showToast()`
- Various UI helper functions

**Dependencies:**
- Minimal (UI only)

**Extraction Priority:** Low (already in `js/ui-helpers.js`)

---

## Global State Analysis

### Global Variables (Current)
```javascript
// Data arrays
let transactions = [];
const accounts = [];
const categories = [];
let filteredTransactions = [];

// State tracking
let editingTransactionId = null;
let editingAccountId = null;
let editingCategoryId = null;
let includedAccountIds = new Set();
let isSyncing = false;

// Configuration
const accountSubtypes = { ... };
```

### Global State Plan
1. **Keep in `script.js` (orchestrator):**
   - Initialization state
   - UI state (editing IDs, modals)

2. **Move to feature modules:**
   - Data arrays → `js/data.js` (already there)
   - Feature-specific state → respective modules

3. **Create state management:**
   - Consider a simple state object for shared state
   - Or use module exports for controlled access

---

## Dependency Graph

```
script.js (orchestrator)
├── js/data.js (data management)
│   ├── js/db.js (IndexedDB)
│   └── js/memoize.js (caching)
├── js/auth.js (authentication)
├── js/plaid.js (Plaid integration)
│   └── js/auth.js
├── js/ui-helpers.js (UI utilities)
├── js/ui-filters.js (filtering UI)
├── js/ui-render.js (rendering)
├── js/ui-update.js (UI updates)
├── js/error-handler.js (error handling)
├── js/validation.js (validation)
└── js/utils.js (utilities)

Proposed new modules:
├── js/transactions.js (transaction management)
│   ├── js/data.js
│   └── js/ui-render.js
├── js/accounts.js (account management)
│   ├── js/data.js
│   └── js/ui-render.js
├── js/categories.js (category management)
│   ├── js/data.js
│   └── js/ui-render.js
└── js/dashboard.js (dashboard/summary)
    ├── js/data.js
    └── js/ui-render.js
```

---

## Migration Strategy

### Phase 1: Low-Risk Extractions (Week 1)
**Goal:** Extract pure utility functions with no dependencies

1. **Extract utility functions to `js/utils.js`**
   - `formatCurrency()`
   - `formatDate()`
   - `escapeHTML()`
   - `debounce()`
   - `throttle()`
   - `getAccountSyncTime()`
   - `getSyncStatusColor()`
   - `formatTimeAgo()`

2. **Test:** Ensure all functions work after extraction
3. **Commit:** After each successful extraction

---

### Phase 2: Transaction Module (Week 2)
**Goal:** Extract transaction management to `js/transactions.js`

1. **Create `js/transactions.js`**
   - Move transaction CRUD functions
   - Move transaction filtering/sorting
   - Move transaction rendering
   - Move virtual scrolling setup

2. **Update `script.js`**
   - Import transaction functions
   - Keep event listeners in `script.js` (orchestrator)
   - Update function calls

3. **Test:** Full transaction workflow
4. **Commit:** After successful extraction

---

### Phase 3: Account Module (Week 3)
**Goal:** Extract account management to `js/accounts.js`

1. **Create `js/accounts.js`**
   - Move account CRUD functions
   - Move account rendering
   - Move balance calculation
   - Move account subtype logic

2. **Update `script.js`**
   - Import account functions
   - Update function calls

3. **Test:** Full account workflow
4. **Commit:** After successful extraction

---

### Phase 4: Category Module (Week 4)
**Goal:** Extract category management to `js/categories.js`

1. **Create `js/categories.js`**
   - Move category CRUD functions
   - Move category rendering
   - Move spending calculations
   - Move category summary

2. **Update `script.js`**
   - Import category functions
   - Update function calls

3. **Test:** Full category workflow
4. **Commit:** After successful extraction

---

### Phase 5: Dashboard Module (Week 5)
**Goal:** Extract dashboard/summary to `js/dashboard.js`

1. **Create `js/dashboard.js`**
   - Move dashboard initialization
   - Move summary calculations
   - Move dashboard rendering

2. **Update `script.js`**
   - Import dashboard functions
   - Update function calls

3. **Test:** Full dashboard workflow
4. **Commit:** After successful extraction

---

### Phase 6: Cleanup (Week 6)
**Goal:** Final cleanup and optimization

1. **Review `script.js`**
   - Should be ~500-800 lines (orchestrator only)
   - Contains: initialization, event listeners, coordination

2. **Consolidate utilities**
   - Merge duplicate functions
   - Remove unused code

3. **Update documentation**
   - Update README with new structure
   - Document module responsibilities

4. **Final testing**
   - Full application test
   - Performance check

---

## Testing Strategy

### For Each Extraction:

1. **Unit Tests (if time permits)**
   - Test extracted functions in isolation
   - Mock dependencies

2. **Integration Tests**
   - Test function interactions
   - Test with real data

3. **Manual Testing Checklist**
   - [ ] All CRUD operations work
   - [ ] UI updates correctly
   - [ ] Data persists correctly
   - [ ] No console errors
   - [ ] Performance is maintained

4. **Regression Testing**
   - Test all existing features
   - Verify no breaking changes

---

## Risk Assessment

### Low Risk
- Utility function extraction (Phase 1)
- Pure functions with no side effects

### Medium Risk
- Transaction module (Phase 2)
- Account module (Phase 3)
- Category module (Phase 4)
- **Mitigation:** Extract incrementally, test after each function

### High Risk
- Dashboard module (Phase 5)
- **Mitigation:** Extract last, after other modules are stable

---

## Success Criteria

- [ ] `script.js` reduced to <1000 lines
- [ ] Each feature module <500 lines
- [ ] All tests pass
- [ ] No performance regression
- [ ] Code is more maintainable
- [ ] Clear module boundaries
- [ ] Reduced global state

---

## Notes

- **Incremental approach:** Extract one feature at a time
- **Test frequently:** After each extraction
- **Keep backups:** Git commits after each successful step
- **Document changes:** Update this document as we go
- **Don't rush:** Quality over speed

---

## Next Steps

1. Start with Phase 1 (utility functions)
2. Test thoroughly
3. Commit and move to Phase 2
4. Repeat for each phase

**Estimated Total Time:** 6 weeks (1 week per phase)

**Priority:** Medium (code quality improvement, not critical for functionality)

