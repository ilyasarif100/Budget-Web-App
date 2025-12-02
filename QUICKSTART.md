# Budget Tracker - Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Plaid account with API keys ([Plaid Dashboard](https://dashboard.plaid.com))
  - **Pricing**: Pay as You Go plan (~$0.50-$1.00 per account/month)
  - **API Calls**: Unlimited (no per-call fees)

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment Variables

Copy `env.template` to `.env`:

```bash
cp env.template .env
```

Edit `.env` and add your Plaid credentials:

```env
PLAID_ENV=sandbox
PLAID_CLIENT_ID=your_client_id_here
PLAID_SECRET_KEY=your_secret_key_here
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_64_character_hex_encryption_key
PORT=3000
NODE_ENV=development
AUTH_REQUIRED=false
```

**Generate secure keys:**

```bash
# Generate JWT_SECRET (64+ characters)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate ENCRYPTION_KEY (64 hex characters = 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3: Start the Application

```bash
npm start
```

The server will start on `http://localhost:3000`

**That's it!** The app automatically serves both frontend and backend from the same server.

### Step 4: Open the App

Open your browser and navigate to:

```
http://localhost:3000
```

The frontend is automatically served from the same server - no separate frontend server needed!

---

## 🔐 Initial Setup

### First Launch

1. **Open** `http://localhost:3000`
2. **Add Account** → Choose "Connect via Plaid" or "Manual Entry"
3. **Complete** Plaid Link flow (if using Plaid)
4. **Accounts** and transactions will sync automatically!
5. **Create Categories** → Set up budget categories with monthly allocations
6. **Sync Transactions** → Click "Sync Transactions" to fetch latest data

### Key Features

- **Multiple Accounts**: Connect multiple bank accounts, credit cards, etc.
- **Transaction Management**: View, edit, categorize, and delete transactions
- **Budget Tracking**: Set monthly allocations and track spending by category
- **Smart Filtering**: Filter by date range, category, status, and account
- **Daily Syncing**: Sync as often as you want - no additional API call costs!
- **Export Data**: Export filtered transactions to CSV

---

## ✅ Verification

**Check if server is running:**

```bash
curl http://localhost:3000/api/config
```

Should return configuration JSON with Plaid environment info.

---

## 🔧 Development Mode

For development with auto-reload:

```bash
npm run dev
```

(Uses nodemon to restart on file changes)

---

## 🐛 Troubleshooting

### "Failed to fetch" or Connection Errors

- ✅ Backend server running? (`npm start`)
- ✅ Check `.env` file exists and has correct values
- ✅ Verify Plaid credentials are correct
- ✅ Check browser console for specific errors

### "Plaid SDK not loaded"

- ✅ Check internet connection
- ✅ Verify Plaid script loads in browser console
- ✅ Check browser isn't blocking scripts

### "Authentication required"

- ✅ Set `AUTH_REQUIRED=false` in `.env` for local development
- ✅ Or create an account via `/api/auth/register`

### "Invalid key length"

- ✅ `ENCRYPTION_KEY` must be exactly 64 hex characters
- ✅ Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### CORS Errors

- ✅ Backend should be running on `http://localhost:3000`
- ✅ Frontend accessed via `http://localhost:3000` (not `file://`)
- ✅ Check `config.js` is detecting backend correctly

---

## 📚 Next Steps

1. **Connect Accounts**: Add your bank accounts via Plaid or manual entry
2. **Create Categories**: Set up budget categories with monthly allocations
3. **Sync Transactions**: Click "Sync Transactions" to fetch latest data
4. **Categorize Transactions**: Assign categories to transactions
5. **Review Dashboard**: See your spending breakdown and category summaries
6. **Set Filters**: Use date range, category, and account filters
7. **Export Data**: Export filtered transactions to CSV when needed

## 💰 Cost Information

### Monthly Costs (Local Use)

- **Plaid API**: $3.00-$6.00/month (6 accounts × $0.50-$1.00)
- **Hosting**: $0.00/month (runs locally)
- **API Calls**: $0.00/month (unlimited)
- **Total**: **$3.00-$6.00/month**

### Daily Syncing

- ✅ **Unlimited syncing** - No additional cost per sync
- ✅ **Sync as often as you want** - Same monthly price
- ✅ **Only pay for account connections** - Not per API call

---

## 🆘 Need Help?

- Check `SECURITY.md` for security configuration
- Check `README-ENV.md` for environment variable details
- Check `README.md` for full documentation
