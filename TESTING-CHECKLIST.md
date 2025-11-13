# 🧪 Testing Checklist - Priority Fixes

## ✅ Test 1: API Call Efficiency (Sync Only New Accounts)

### Setup:
1. Have at least 2-3 existing Plaid accounts connected
2. Open browser DevTools → Network tab
3. Filter for requests to `/transactions/sync`

### Test Steps:
1. **Add a new Plaid account**
   - Click "Add Account" → "Connect via Plaid"
   - Connect a new bank account
   - **Expected**: Only the NEW account should sync (check Network tab)
   - **Before fix**: Would sync ALL accounts (wasteful)
   - **After fix**: Should see only 1-2 sync calls for the new account

2. **Verify sync worked**
   - Check if transactions from new account appear
   - Check if existing accounts' transactions are still there
   - **Expected**: New account transactions appear, old accounts unchanged

### ✅ Pass Criteria:
- [ ] Only new account syncs when adding
- [ ] Existing accounts' data remains intact
- [ ] No unnecessary API calls in Network tab

---

## ✅ Test 2: Authentication Modal

### Setup:
1. Set `AUTH_REQUIRED=true` in `.env` (or test with auth enabled)
2. Clear browser localStorage/auth token
3. Refresh the page

### Test Steps:
1. **Modal appears on load**
   - **Expected**: Auth modal appears (not browser prompt)
   - **Check**: Modal has email/password fields, "Login" button

2. **Login functionality**
   - Enter valid email/password
   - Click "Login"
   - **Expected**: 
     - Button shows "Logging in..." with spinner
     - Button is disabled during login
     - Success toast appears
     - Page reloads and shows app

3. **Register functionality**
   - Click "Need to register?"
   - **Expected**: Modal switches to "Register" mode
   - Enter new email/password
   - Click "Register"
   - **Expected**: 
     - Button shows "Registering..." with spinner
     - Success toast appears
     - Page reloads

4. **Error handling**
   - Try invalid credentials
   - **Expected**: Error message appears in red box below form
   - Button re-enables

5. **Modal close**
   - Click X button or outside modal
   - **Expected**: Modal closes

### ✅ Pass Criteria:
- [ ] Modal appears instead of prompt()
- [ ] Login works correctly
- [ ] Register works correctly
- [ ] Loading states show during auth
- [ ] Error messages display properly
- [ ] Modal can be closed

---

## ✅ Test 3: Loading States

### Test A: Sync Transactions Loading
1. Click "Sync Transactions" button
2. **Expected**:
   - Button shows spinner + "Syncing..." text
   - Button is disabled
   - Toast notification appears
   - After sync: Button returns to normal, shows last sync time

### Test B: Export CSV Loading
1. Have some transactions visible
2. Click "Export CSV / Excel" button
3. **Expected**:
   - Button shows spinner
   - Button is disabled
   - After export: Button returns to normal, CSV downloads

### Test C: Clear Data Loading
1. Click "Clear All Data" button
2. Confirm in warning modal
3. **Expected**:
   - Button shows "Clearing..." text
   - Button is disabled
   - After clear: Button returns to normal, data is cleared

### ✅ Pass Criteria:
- [ ] All buttons show loading states
- [ ] Buttons are disabled during operations
- [ ] Loading states clear after operation completes
- [ ] Spinner animation works smoothly

---

## ✅ Test 4: XSS Protection

### Test A: Transaction Merchant Names
1. **Manually add a transaction** with malicious content:
   - Merchant: `<script>alert('XSS')</script>`
   - Merchant: `<img src=x onerror=alert('XSS')>`
   - Merchant: `Test & "Special" <Chars>`
2. **Expected**: 
   - Content displays as plain text (not executed)
   - Special characters are escaped properly
   - No JavaScript alerts appear

### Test B: Account Names
1. **Edit an account** with malicious name:
   - Name: `<script>alert('XSS')</script>`
   - Name: `Test & "Special" <Chars>`
2. **Expected**:
   - Name displays as plain text
   - No script execution
   - Special characters escaped

### Test C: Category Names
1. **Add a category** with malicious name:
   - Name: `<script>alert('XSS')</script>`
2. **Expected**:
   - Category displays safely
   - No script execution

### ✅ Pass Criteria:
- [ ] Script tags don't execute
- [ ] Special characters display correctly (not broken HTML)
- [ ] No console errors
- [ ] Content appears as intended text

---

## ✅ Test 5: General Functionality (Regression Tests)

### Ensure nothing broke:

1. **Transaction Management**
   - [ ] Add transaction manually
   - [ ] Edit transaction
   - [ ] Delete transaction
   - [ ] Change transaction category
   - [ ] Filter transactions by date/category/account

2. **Account Management**
   - [ ] Add account (Plaid)
   - [ ] Add account (manual)
   - [ ] Edit account
   - [ ] Delete account
   - [ ] Reorder accounts (drag & drop)

3. **Category Management**
   - [ ] Add category
   - [ ] Edit category
   - [ ] Delete category

4. **Dashboard**
   - [ ] Total balance updates correctly
   - [ ] Total spent updates correctly
   - [ ] Category summary shows correct amounts
   - [ ] Account summary shows correct balances

5. **Data Persistence**
   - [ ] Refresh page - data persists
   - [ ] Close browser - data persists
   - [ ] Transactions saved correctly
   - [ ] Accounts saved correctly

### ✅ Pass Criteria:
- [ ] All existing features work as before
- [ ] No console errors
- [ ] No broken UI elements
- [ ] Data persists correctly

---

## 🐛 Common Issues to Watch For

### Issue 1: Sync Button Stuck in Loading
- **Symptom**: Button shows "Syncing..." forever
- **Check**: Network tab for failed requests
- **Fix**: Check server is running, check Plaid credentials

### Issue 2: Auth Modal Doesn't Appear
- **Symptom**: Still seeing prompt() or no modal
- **Check**: Browser console for errors
- **Fix**: Verify `auth-modal` exists in HTML, check event listeners

### Issue 3: XSS Content Breaks Layout
- **Symptom**: Long malicious strings break UI
- **Check**: CSS overflow handling
- **Fix**: Add text truncation if needed

### Issue 4: Loading States Don't Clear
- **Symptom**: Button stays disabled after operation
- **Check**: Error handling in try/catch blocks
- **Fix**: Ensure `finally` blocks always run

---

## 📊 Quick Test Script

Run this in browser console to test XSS protection:

```javascript
// Test XSS protection
const testXSS = () => {
    // Add transaction with XSS attempt
    const testTx = {
        id: 999999,
        date: '2025-11-06',
        merchant: '<script>alert("XSS")</script><img src=x onerror=alert(1)>',
        amount: 100,
        category: 'Test',
        status: 'posted',
        accountId: accounts[0]?.id || 'test'
    };
    
    transactions.push(testTx);
    saveData();
    filterTransactions();
    renderTransactions();
    
    console.log('✅ Check transaction table - should show escaped text, no alerts');
};

// Test loading states
const testLoading = () => {
    const syncBtn = document.getElementById('sync-btn');
    setLoading('test', true, syncBtn);
    setTimeout(() => setLoading('test', false, syncBtn), 2000);
    console.log('✅ Check sync button - should show spinner for 2 seconds');
};
```

---

## ✅ Final Checklist

Before considering fixes complete:

- [ ] All 4 priority fixes tested and working
- [ ] No console errors
- [ ] No broken functionality
- [ ] XSS protection verified
- [ ] Loading states work smoothly
- [ ] Auth modal is user-friendly
- [ ] API calls are optimized

---

## 🚨 If Something Breaks

1. **Check browser console** for errors
2. **Check Network tab** for failed requests
3. **Check server logs** for backend errors
4. **Revert changes** if critical issue found
5. **Report specific error** with steps to reproduce

---

**Happy Testing! 🎉**


