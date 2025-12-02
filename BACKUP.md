# Backup and Recovery Guide

This document describes how to backup and restore your Budget Tracker application data.

## Critical Files to Backup

### 1. Environment Variables (`.env`)

**Location:** Root directory of the project

**Why Critical:** Contains:

- Plaid API credentials
- JWT secret for authentication
- Encryption key for Plaid tokens (CRITICAL - if lost, all encrypted tokens become unrecoverable)

**Backup Method:**

```bash
# Copy .env to a secure location (NOT in the project directory)
cp .env ~/backups/budget-tracker/.env.backup-$(date +%Y%m%d)
```

**Security Note:**

- NEVER commit `.env` to git (already in `.gitignore`)
- Store backups in a secure, encrypted location
- Use a password manager to store backup locations

**Recovery:**

```bash
# Restore from backup
cp ~/backups/budget-tracker/.env.backup-YYYYMMDD .env
```

### 2. Data Directory (`data/`)

**Location:** `data/` directory in project root

**Contains:**

- `tokens.json` - Encrypted Plaid access tokens
- `users.json` - User account data

**Backup Method:**

```bash
# Backup entire data directory
cp -r data/ ~/backups/budget-tracker/data-backup-$(date +%Y%m%d)/
```

**Recovery:**

```bash
# Restore data directory
cp -r ~/backups/budget-tracker/data-backup-YYYYMMDD/* data/
```

### 3. Frontend Data (IndexedDB)

**Location:** Browser IndexedDB (client-side)

**Contains:**

- All transactions
- All accounts
- All categories
- User preferences

**Backup Method:**

- Use the "Export All Data" button in the application UI
- This creates a JSON file with all frontend data

**Recovery:**

- Use the "Import/Restore Data" button in the application UI
- Select the exported JSON file

## Automated Backup Script

Run the automated backup script:

```bash
npm run backup
```

This script will:

1. Create a timestamped backup directory
2. Backup `.env` file (if exists)
3. Backup `data/` directory (if exists)
4. Create a manifest of backed up files

Backups are stored in: `~/backups/budget-tracker/`

## Environment Variables Structure

The `.env` file should contain the following variables (without actual values):

```
# Plaid API Configuration
PLAID_ENV=sandbox|development|production
PLAID_CLIENT_ID=<your_client_id>
PLAID_SECRET_KEY=<your_secret_key>

# Server Configuration
PORT=3000
NODE_ENV=development|production

# Security Configuration (CRITICAL - BACKUP THESE!)
JWT_SECRET=<64+ character hex string>
ENCRYPTION_KEY=<64 character hex string>

# CORS Configuration (production only)
ALLOWED_ORIGINS=<comma-separated URLs>

# Frontend Configuration
AUTH_REQUIRED=false|true
SYNC_ENABLED=true|false
EXPORT_ENABLED=true|false
DARK_MODE_ENABLED=true|false
APP_NAME=Budget Tracker
APP_VERSION=1.0.0
DEFAULT_PAGE_SIZE=50
VIRTUAL_SCROLL_BUFFER=5
```

## Recovery Procedures

### Complete System Recovery

If you need to recover everything:

1. **Restore `.env` file:**

   ```bash
   cp ~/backups/budget-tracker/.env.backup-YYYYMMDD .env
   ```

2. **Restore `data/` directory:**

   ```bash
   cp -r ~/backups/budget-tracker/data-backup-YYYYMMDD/* data/
   ```

3. **Restore frontend data:**
   - Start the application
   - Use "Import/Restore Data" button
   - Select the exported JSON file

### Partial Recovery

**If only `.env` is lost:**

- Restore from backup (see above)
- If backup unavailable, you'll need to:
  - Re-enter Plaid credentials
  - Generate new JWT_SECRET and ENCRYPTION_KEY
  - **WARNING:** If ENCRYPTION_KEY changes, all encrypted Plaid tokens become unrecoverable
  - You'll need to reconnect all Plaid accounts

**If only `data/` is lost:**

- Restore from backup (see above)
- If backup unavailable, you'll need to reconnect all Plaid accounts

**If only frontend data is lost:**

- Use "Import/Restore Data" button
- If no export available, you'll need to re-sync all transactions from Plaid

## Best Practices

1. **Regular Backups:**
   - Backup `.env` and `data/` weekly (or before major changes)
   - Export frontend data monthly (or before major refactoring)

2. **Before Major Changes:**
   - Always backup before:
     - Updating dependencies
     - Refactoring code
     - Database migrations
     - Production deployments

3. **Multiple Backup Locations:**
   - Keep backups in at least 2 locations:
     - Local (external drive)
     - Cloud storage (encrypted)

4. **Test Recovery:**
   - Periodically test your recovery procedure
   - Ensure backups are actually restorable

## Emergency Recovery

If you've lost everything and have no backups:

1. **Recreate `.env`:**
   - Copy `env.template` to `.env`
   - Fill in Plaid credentials from Plaid dashboard
   - Generate new security keys:

     ```bash
     # JWT_SECRET
     node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

     # ENCRYPTION_KEY
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```

2. **Reconnect Plaid Accounts:**
   - Use "Add Account" → "Connect via Plaid"
   - Reconnect all accounts

3. **Re-sync Transactions:**
   - Use "Sync Transactions" button
   - This will fetch all historical transactions from Plaid

## Backup Verification

After creating a backup, verify it:

```bash
# Check backup directory exists
ls -la ~/backups/budget-tracker/

# Verify .env backup
cat ~/backups/budget-tracker/.env.backup-YYYYMMDD

# Verify data directory backup
ls -la ~/backups/budget-tracker/data-backup-YYYYMMDD/
```

## Notes

- Backups are stored outside the project directory to avoid accidental deletion
- The backup script creates timestamped directories for versioning
- Keep at least 3 recent backups (delete older ones manually)
- Never store backups in the same location as the project (risk of deletion)
