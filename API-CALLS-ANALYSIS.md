# 📊 API Call Analysis - How Many Calls Does Your App Make?

## API Call Breakdown

### 🔵 When Adding a New Account

**Per account added:**
1. `/item/public_token/exchange` - 1 call
2. `/accounts/get` - 1 call (get account info)
3. `syncAllTransactions()` - triggers sync for ALL accounts:
   - For each account: Multiple `/transactions/sync` calls (pagination)
   - For each account: 1 `/accounts/get` call (get balance)

**Total for adding 1 account:**
- Minimum: **3 calls** (if no other accounts, 1 page of transactions)
- Maximum: **2 + (N accounts × pages × 2)** calls
  - Where N = number of accounts
  - Pages = transaction pages per account (500 transactions per page)

---

### 🔵 When Syncing Transactions

**Per account synced:**
- `/transactions/sync` - **1 call per page** (up to 100 pages max)
- `/accounts/get` - **1 call** (get balance)

**Example scenarios:**

| Scenario | Accounts | Transactions | Pages | API Calls |
|----------|----------|--------------|-------|-----------|
| Small account | 1 | 200 | 1 | 2 |
| Medium account | 1 | 1,500 | 3 | 4 |
| Large account | 1 | 10,000 | 20 | 21 |
| Multiple accounts | 3 | 500 each | 1 each | 6 |
| First sync (all history) | 1 | 50,000 | 100 | 101 |

---

### 🔵 On App Load (Auto-Sync)

**Same as syncing transactions:**
- Syncs ALL accounts automatically
- Same API call pattern as manual sync

---

## ⚠️ Potential Issues

### 1. **Too Many Calls on Account Add**

**Current behavior:**
```javascript
// When adding account
await syncAllTransactions(); // Syncs ALL accounts, not just new one
```

**Problem:**
- If you have 5 accounts and add a 6th account
- It syncs all 6 accounts (including the 5 you already synced)
- Unnecessary API calls for accounts that don't need syncing

**Impact:**
- More API calls than needed
- Slower account addition
- Potential rate limiting issues

---

### 2. **Pagination Can Create Many Calls**

**Current behavior:**
```javascript
// Loops until has_more is false (up to 100 pages)
while (hasMore && pageCount < maxPages) {
    // API call here
}
```

**Example:**
- Account with 50,000 transactions = 100 API calls
- Multiple accounts = multiplied calls

**Impact:**
- Many API calls for large transaction histories
- But necessary to get all transactions

---

### 3. **Balance Fetch Per Account**

**Current behavior:**
```javascript
// After syncing transactions, fetch balance
await authenticatedFetch('/accounts/get', ...)
```

**Impact:**
- 1 extra call per account per sync
- But ensures balances are accurate

---

## 📈 Real-World Examples

### Example 1: Adding First Account
```
1. Exchange token: 1 call
2. Get accounts: 1 call
3. Sync transactions (1 account, 500 transactions): 1 call
4. Get balance: 1 call
Total: 4 calls ✅ Reasonable
```

### Example 2: Adding Account When You Have 5 Accounts
```
1. Exchange token: 1 call
2. Get accounts: 1 call
3. Sync ALL 6 accounts:
   - Account 1: 1 call (no new transactions)
   - Account 2: 1 call (no new transactions)
   - Account 3: 1 call (no new transactions)
   - Account 4: 1 call (no new transactions)
   - Account 5: 1 call (no new transactions)
   - Account 6: 3 calls (1,500 transactions = 3 pages)
4. Get balances: 6 calls
Total: 16 calls ⚠️ Could be optimized
```

### Example 3: Syncing 3 Accounts Daily
```
Account 1: 1 sync call + 1 balance call = 2 calls
Account 2: 1 sync call + 1 balance call = 2 calls
Account 3: 1 sync call + 1 balance call = 2 calls
Total: 6 calls ✅ Reasonable
```

---

## ✅ Optimizations Needed

### 1. **Sync Only New Account on Add**

**Current:**
```javascript
await syncAllTransactions(); // Syncs ALL accounts
```

**Better:**
```javascript
// Get IDs of newly added accounts
const newAccountIds = accountsData.accounts
    .filter(acc => !existingAccount)
    .map(acc => newAccount.id);

await syncAllTransactions(newAccountIds); // Sync only new accounts
```

**Saves:** (N-1) × 2 API calls per account addition

---

### 2. **Batch Balance Updates**

**Current:**
```javascript
// Fetch balance for each account separately
for (const accountId of accountsToSync) {
    await authenticatedFetch('/accounts/get', ...)
}
```

**Better:**
```javascript
// Fetch all balances in one call (if Plaid supports it)
// Or at least batch them
```

**Saves:** (N-1) API calls per sync

---

### 3. **Skip Balance Fetch If No New Transactions**

**Current:**
```javascript
// Always fetch balance after sync
await authenticatedFetch('/accounts/get', ...)
```

**Better:**
```javascript
// Only fetch balance if transactions changed
if (syncedCount > 0 || modifiedCount > 0) {
    await authenticatedFetch('/accounts/get', ...)
}
```

**Saves:** 1 API call per account when no changes

---

## 🎯 Recommendations

### Immediate Fixes:

1. **Sync only new account on add** ✅ High priority
   - Saves many unnecessary calls
   - Faster account addition

2. **Skip balance fetch if no changes** ✅ Medium priority
   - Saves calls on daily syncs with no new transactions

3. **Add rate limiting protection** ✅ Medium priority
   - Prevent hitting Plaid rate limits
   - Queue requests if needed

---

## 📊 Current API Call Summary

| Operation | Min Calls | Max Calls | Typical |
|-----------|-----------|-----------|---------|
| Add account (first) | 4 | 4 | 4 |
| Add account (5 existing) | 16 | 100+ | 16-30 |
| Daily sync (3 accounts) | 6 | 6 | 6 |
| First sync (large account) | 2 | 101 | 20-50 |

---

## 💡 Bottom Line

**Current state:**
- ✅ Reasonable for small accounts
- ⚠️ Could be optimized for multiple accounts
- ⚠️ Many calls on first sync (but necessary)

**Main issue:**
- Syncing ALL accounts when adding a new one
- Should only sync the newly added account

**Recommendation:**
- Fix account addition to sync only new account
- This will significantly reduce API calls

