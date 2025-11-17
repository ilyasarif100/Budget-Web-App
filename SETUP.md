# Development Environment Setup Guide

This guide will help you set up the Budget Tracker development environment from scratch.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 20.19.5 (or compatible version)
  - Check your version: `node --version`
  - If you don't have Node.js, download from [nodejs.org](https://nodejs.org/)
  - Or use [nvm](https://github.com/nvm-sh/nvm) to manage Node.js versions

- **npm**: Comes with Node.js (version 10+ recommended)
  - Check your version: `npm --version`

- **Git**: For version control
  - Check if installed: `git --version`
  - Download from [git-scm.com](https://git-scm.com/)

- **Plaid Account**: For API access
  - Sign up at [dashboard.plaid.com](https://dashboard.plaid.com)
  - Get API keys from the Plaid dashboard

## Quick Setup (5 Minutes)

### Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd budgeting-web-app
```

### Step 2: Install Node.js Version

If you're using nvm (recommended):

```bash
# Install and use the correct Node.js version
nvm install
nvm use
```

Or manually ensure you have Node.js 20.19.5 installed.

### Step 3: Install Dependencies

```bash
npm install
```

This will install all required packages listed in `package.json`.

### Step 4: Configure Environment Variables

```bash
# Copy the environment template
cp env.template .env

# Edit .env with your actual values
# Use your preferred text editor
nano .env
# or
code .env
# or
vim .env
```

**Required values in `.env`:**

1. **Plaid API Credentials** (from Plaid Dashboard):
   ```
   PLAID_ENV=sandbox
   PLAID_CLIENT_ID=your_actual_client_id
   PLAID_SECRET_KEY=your_actual_secret_key
   ```

2. **Security Keys** (generate new ones):
   ```bash
   # Generate JWT_SECRET (64+ characters)
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   
   # Generate ENCRYPTION_KEY (64 hex characters = 32 bytes)
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   
   Copy the output into `.env`:
   ```
   JWT_SECRET=<paste_generated_value>
   ENCRYPTION_KEY=<paste_generated_value>
   ```

3. **Server Configuration**:
   ```
   PORT=3000
   NODE_ENV=development
   AUTH_REQUIRED=false
   ```

### Step 5: Verify Setup

```bash
# Check Node.js version
node --version
# Should output: v20.19.5 (or compatible)

# Check npm version
npm --version

# Verify dependencies installed
npm list --depth=0

# Test server starts (will fail without Plaid credentials, but should start)
npm start
# Press Ctrl+C to stop
```

## First-Time Setup Checklist

- [ ] Node.js 20.19.5 (or compatible) installed
- [ ] npm installed and working
- [ ] Repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created from `env.template`
- [ ] Plaid API credentials added to `.env`
- [ ] Security keys generated and added to `.env`
- [ ] Server starts successfully (`npm start`)
- [ ] Can access `http://localhost:3000` in browser

## Development Workflow

### Starting the Development Server

```bash
# Start with auto-reload (recommended for development)
npm run dev

# Or start normally
npm start
```

The server will start on `http://localhost:3000`

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Building for Production

```bash
# Build production bundle
npm run build
```

### Creating Backups

```bash
# Create backup of .env and data/
npm run backup
```

## Project Structure

```
budgeting-web-app/
├── server.js              # Express backend server
├── script.js              # Main frontend orchestrator
├── config.js              # Frontend configuration loader
├── index.html             # Main HTML (development)
├── index.prod.html        # Production HTML (minified)
├── .env                   # Environment variables (not in git)
├── .nvmrc                 # Node.js version specification
├── package.json            # Dependencies and scripts
├── BACKUP.md              # Backup and recovery guide
├── SETUP.md              # This file
├── README.md              # Project documentation
├── QUICKSTART.md          # Quick start guide
├── css/
│   └── styles.css         # Application styles
├── js/                    # Frontend modules
│   ├── auth.js            # Authentication
│   ├── plaid.js           # Plaid integration
│   ├── data.js            # Data management
│   ├── db.js              # IndexedDB operations
│   └── ...                # Other modules
├── scripts/               # Utility scripts
│   └── backup.js          # Backup script
├── data/                  # Backend data storage (not in git)
│   ├── tokens.json        # Encrypted Plaid tokens
│   └── users.json         # User data
└── tests/                 # Test files
    └── setup.test.js      # Smoke tests
```

## Common Issues

### "Node.js version mismatch"

**Problem:** Wrong Node.js version

**Solution:**
```bash
# If using nvm
nvm install
nvm use

# Or install Node.js 20.19.5 manually
```

### "Cannot find module"

**Problem:** Dependencies not installed

**Solution:**
```bash
npm install
```

### "Port 3000 already in use"

**Problem:** Another process is using port 3000

**Solution:**
```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9

# Or change PORT in .env
PORT=3001
```

### "Failed to fetch" or "Cannot connect to server"

**Problem:** Backend server not running

**Solution:**
```bash
# Start the server
npm start
# or
npm run dev
```

### "Invalid Plaid credentials"

**Problem:** Wrong API keys in `.env`

**Solution:**
- Verify keys in Plaid Dashboard
- Ensure `PLAID_ENV` matches the environment (sandbox/development/production)
- Check for typos in `.env` file

### "ENCRYPTION_KEY invalid length"

**Problem:** Encryption key must be exactly 64 hex characters

**Solution:**
```bash
# Generate a new key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy the output (should be 64 characters) to .env
```

## Environment Variables Reference

See `env.template` for all available environment variables and their descriptions.

## Next Steps

After setup is complete:

1. Read [QUICKSTART.md](./QUICKSTART.md) for app usage
2. Read [BACKUP.md](./BACKUP.md) for backup procedures
3. Read [README.md](./README.md) for full documentation
4. Start developing!

## Getting Help

- Check [README.md](./README.md) for full documentation
- Check [QUICKSTART.md](./QUICKSTART.md) for quick start guide
- Check [BACKUP.md](./BACKUP.md) for backup/recovery help
- Review error messages in browser console and server logs

