# Environment Variables Setup Guide

## Overview

This app uses environment variables stored in `.env` file for all sensitive configuration. The `.env` file is never committed to git.

---

## Quick Setup

### Step 1: Create `.env` File

Copy the template:
```bash
cp env.template .env
```

### Step 2: Edit `.env` File

Open `.env` in a text editor and fill in your values:

```env
# Plaid API Configuration
PLAID_ENV=sandbox
PLAID_CLIENT_ID=your_client_id_here
PLAID_SECRET_KEY=your_secret_key_here

# Server Configuration
PORT=3000
NODE_ENV=development

# Security Configuration
JWT_SECRET=your_jwt_secret_key_here
ENCRYPTION_KEY=your_64_character_hex_encryption_key

# Authentication (set to false for local development)
AUTH_REQUIRED=false

# Features
SYNC_ENABLED=true
EXPORT_ENABLED=true
DARK_MODE_ENABLED=true
APP_NAME=Budget Tracker
APP_VERSION=1.0.0
```

---

## Required Variables

### Plaid API Keys

**Get from:** https://dashboard.plaid.com/developers/keys

- `PLAID_CLIENT_ID` - Your Plaid client ID
- `PLAID_SECRET_KEY` - Your Plaid secret key
- `PLAID_ENV` - Environment: `sandbox`, `development`, or `production`

### Security Keys

**Generate secure keys:**

```bash
# Generate JWT_SECRET (64+ characters)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate ENCRYPTION_KEY (64 hex characters = 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Important:**
- `JWT_SECRET` - Must be at least 32 characters (recommended: 64+)
- `ENCRYPTION_KEY` - Must be exactly 64 hex characters (32 bytes)

---

## Optional Variables

### Server Configuration
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - `development` or `production` (default: development)

### Authentication
- `AUTH_REQUIRED` - Set to `false` to disable authentication for local use (default: false)

### Frontend Features
- `SYNC_ENABLED` - Enable transaction syncing (default: true)
- `EXPORT_ENABLED` - Enable CSV export (default: true)
- `DARK_MODE_ENABLED` - Enable dark mode (default: true)
- `APP_NAME` - Application name (default: "Budget Tracker")
- `APP_VERSION` - Application version (default: "1.0.0")

### CORS (Production)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed origins (e.g., `https://yourdomain.com,https://www.yourdomain.com`)

---

## Environment Types

### Sandbox (Testing)
- ✅ Free, unlimited use
- ✅ Test data only
- ✅ Perfect for development
- ✅ No real bank connections

### Development (Limited)
- ⚠️ Real bank connections
- ⚠️ Limited use
- ⚠️ Requires Plaid approval

### Production
- ⚠️ Full access
- ⚠️ Real transactions
- ⚠️ Requires compliance review
- ⚠️ Requires HTTPS

---

## Security Best Practices

### ✅ DO:
- ✅ Store all secrets in `.env` file
- ✅ Add `.env` to `.gitignore` (already done)
- ✅ Use different keys for dev/prod
- ✅ Generate random, secure keys
- ✅ Keep `.env` file private
- ✅ Use strong passwords for JWT_SECRET
- ✅ Use exactly 64 hex characters for ENCRYPTION_KEY

### ❌ DON'T:
- ❌ Commit `.env` to git
- ❌ Share `.env` file
- ❌ Use weak keys
- ❌ Use same keys for dev/prod
- ❌ Hardcode values in code
- ❌ Expose `.env` file contents

---

## Getting Plaid API Keys

1. Sign up at https://dashboard.plaid.com
2. Go to **Team Settings** → **Keys**
3. Copy your `client_id` and `secret`
4. Use **Sandbox** keys for testing
5. Add to `.env` file

---

## Troubleshooting

### "Cannot find module 'dotenv'"
```bash
npm install
```

### "PLAID_CLIENT_ID is undefined"
- ✅ Check `.env` file exists in root directory
- ✅ Verify `require('dotenv').config()` is called in `server.js`
- ✅ Check `.env` file syntax (no spaces around `=`)
- ✅ Restart server after changing `.env`

### "Invalid key length"
- ✅ `ENCRYPTION_KEY` must be exactly 64 hex characters
- ✅ Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Environment variables not loading
- ✅ Ensure `.env` is in project root (same level as `server.js`)
- ✅ No spaces around `=` sign
- ✅ No quotes needed around values
- ✅ Restart server after changes

---

## File Structure

```
project-root/
├── .env              # Your secrets (NOT committed)
├── env.template      # Template (IS committed)
├── server.js         # Loads .env with dotenv
└── config.js         # Frontend config (loads from backend)
```

---

## Production Deployment

For production:

1. ✅ Set `NODE_ENV=production`
2. ✅ Set `AUTH_REQUIRED=true`
3. ✅ Use production Plaid keys
4. ✅ Use strong, unique keys
5. ✅ Set `ALLOWED_ORIGINS` for CORS
6. ✅ Ensure HTTPS is configured
7. ✅ Set secure file permissions on `.env`

---

## Next Steps

1. ✅ Create `.env` from `env.template`
2. ✅ Add your Plaid credentials
3. ✅ Generate security keys
4. ✅ Start server: `npm start`
5. ✅ Open `http://localhost:3000`

**That's it!** Your app is ready to use.
