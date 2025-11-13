# 🔄 What is a Cursor? (Plaid Transaction Syncing)

## Simple Explanation

A **cursor** is like a bookmark that tells Plaid "I've already fetched transactions up to this point, give me only the new ones after this."

Think of it like reading a book:
- **Without cursor**: You'd have to re-read the entire book every time to find new pages
- **With cursor**: You remember "I read up to page 50" and only read pages 51+ next time

---

## How Plaid Uses Cursors

### First Sync (No Cursor)
```
You: "Give me transactions"
Plaid: "Here are transactions 1-500" + cursor: "abc123"
```

### Second Sync (With Cursor)
```
You: "Give me transactions after cursor 'abc123'"
Plaid: "Here are transactions 501-1000" + cursor: "xyz789"
```

### Third Sync (With Updated Cursor)
```
You: "Give me transactions after cursor 'xyz789'"
Plaid: "No new transactions" + cursor: "xyz789" (same)
```

---

## Why Cursors Are Important

### ✅ Efficiency
- **Without cursor**: Plaid sends ALL transactions every time (slow, wasteful)
- **With cursor**: Plaid sends ONLY new/modified transactions (fast, efficient)

### ✅ Accuracy
- Cursor tracks exactly where you left off
- No duplicate transactions
- No missed transactions

### ✅ Performance
- Faster syncs (less data to transfer)
- Less API calls (Plaid has rate limits)
- Better user experience

---

## How It Works in Your App

### 1. **First Time Connecting Account**
```javascript
// No cursor yet
cursor: null

// Plaid returns:
{
  transactions: [...], // All transactions
  next_cursor: "abc123" // Save this!
}
```

### 2. **Storing the Cursor**
```javascript
// Save cursor for next sync
account.plaidCursor = "abc123"
plaidItemIds.set(accountId, {
  item_id: itemId,
  cursor: "abc123" // ← This is the bookmark
})
```

### 3. **Next Sync**
```javascript
// Use saved cursor
cursor: "abc123"

// Plaid returns:
{
  transactions: [...], // Only NEW transactions since cursor
  modified: [...], // Transactions that changed
  removed: [...], // Transactions that were removed
  next_cursor: "xyz789" // Update cursor
}
```

### 4. **Updating Cursor**
```javascript
// Always update cursor (even if no new transactions)
account.plaidCursor = "xyz789" // New bookmark position
```

---

## Real-World Example

### Day 1: Connect Account
```
You connect your bank account
Plaid sends: 1,000 transactions
Cursor saved: "cursor_day1"
```

### Day 2: Make a Payment
```
You make a $50 payment
You sync transactions
Plaid sends: 1 new transaction (your $50 payment)
Cursor updated: "cursor_day2"
```

### Day 3: No Activity
```
You sync transactions
Plaid sends: 0 new transactions
Cursor stays: "cursor_day2" (no change)
```

---

## What Happens If Cursor Is Lost?

### ❌ Without Cursor Saved
```
You sync → Plaid sends ALL transactions again
- Duplicate transactions
- Slow sync
- Wasted API calls
```

### ✅ With Cursor Saved
```
You sync → Plaid sends ONLY new transactions
- No duplicates
- Fast sync
- Efficient API usage
```

---

## Cursor Format

Plaid cursors are **opaque strings** - you don't need to understand them:

```javascript
// Examples of Plaid cursors (you don't parse these)
"abc123xyz789"
"eyJjdXJzb3IiOiAiYWJjMTIzIn0="
"cursor_1234567890_abcdef"
```

**You just:**
1. Save it when Plaid gives it to you
2. Send it back on next sync
3. Update it when Plaid gives you a new one

---

## In Your Code

### Where Cursor Is Stored
```javascript
// In memory (for current session)
plaidItemIds = Map {
  accountId => {
    item_id: "item_123",
    cursor: "abc123" // ← Current cursor
  }
}

// In IndexedDB (persisted)
account.plaidCursor = "abc123" // Saved with account
```

### How Cursor Is Used
```javascript
// When syncing
const response = await fetch('/api/transactions/sync', {
  body: JSON.stringify({
    item_id: account.plaidItemId,
    cursor: plaidData.cursor || null // ← Send cursor to Plaid
  })
})

// After syncing
account.plaidCursor = syncData.next_cursor // ← Save new cursor
```

---

## Key Points

1. **Cursor = Bookmark**: Tracks where you left off
2. **Always Save**: Even if no new transactions
3. **Always Send**: Send cursor on every sync
4. **Always Update**: Update cursor after every sync
5. **Opaque String**: You don't parse it, just store it

---

## Why You Had to Delete/Re-add Account

**The Problem:**
- Cursor wasn't being saved properly
- On next sync, cursor was `null` (lost)
- Plaid sent ALL transactions again
- But your app thought it already had them
- Result: Missing transactions

**The Fix:**
- ✅ Cursor is now always saved (even if no new transactions)
- ✅ Cursor persists in IndexedDB
- ✅ Cursor is restored on app load
- ✅ Proper pagination handles large transaction lists

---

## Summary

**Cursor = "I've synced up to here, give me what's new"**

- 📍 **Bookmark** for where you left off
- 🚀 **Efficiency** - only fetch new data
- ✅ **Accuracy** - no duplicates or missed transactions
- 💾 **Persistent** - saved in your database

That's it! Simple concept, but critical for efficient syncing. 🎉

