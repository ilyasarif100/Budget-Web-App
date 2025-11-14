# Budget Tracker - Personal Budgeting Application

A modern, full-stack budgeting application with Plaid integration for automatic transaction syncing. Optimized for local use with unlimited daily syncing.

## ✨ Features

- 🔗 **Plaid Integration** - Connect multiple bank accounts automatically via Plaid Link
- 💰 **Transaction Management** - View, edit, categorize, and delete transactions
- 📊 **Budget Categories** - Create and manage custom budget categories with monthly allocations
- 📈 **Dashboard** - Real-time overview with account balances, spending summaries, and category breakdowns
- 🔄 **Smart Syncing** - Cursor-based incremental sync (only fetches new transactions)
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- 🌙 **Dark Mode** - Built-in dark theme with light mode toggle
- 📤 **CSV Export** - Export filtered transactions to CSV
- 🗄️ **IndexedDB Storage** - Efficient client-side storage for large datasets
- ⚡ **Virtual Scrolling** - Smooth performance with thousands of transactions
- 🔐 **Secure** - Encrypted token storage, JWT authentication, security headers
- 🎯 **Advanced Filtering** - Filter by date range, category, status, and account
- 📅 **Date Range Options** - Current month, select month, last 7/30/90 days, custom range
- 💳 **Multiple Account Types** - Supports checking, savings, credit cards, loans, and investments
- 🔄 **Account Management** - Add, edit, delete, and reorder accounts
- 📊 **Category Summary** - Track spending vs. budget allocations
- 🎨 **Modern UI** - Clean, minimal design with smooth animations

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Plaid account ([Get free API keys](https://dashboard.plaid.com))

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd budgeting-web-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp env.template .env
# Edit .env and add your Plaid credentials
```

4. **Start the server**
```bash
npm start
```

5. **Open the app**
Navigate to `http://localhost:3000` in your browser

**That's it!** The app serves both frontend and backend from the same server.

For detailed setup instructions, see [QUICKSTART.md](./QUICKSTART.md)

---

## 📁 Project Structure

```
budgeting-web-app/
├── server.js              # Express backend server
├── config.js              # Frontend configuration loader
├── index.html             # Main HTML file (development)
├── index.prod.html        # Production HTML (minified bundle)
├── script.js              # Main frontend application logic
├── css/
│   └── styles.css         # Application styles
├── js/                    # Modular JavaScript files
│   ├── auth.js            # Authentication & API requests
│   ├── plaid.js           # Plaid Link integration
│   ├── data.js            # Data management & IndexedDB
│   ├── db.js              # IndexedDB operations
│   ├── ui-helpers.js      # UI helper functions
│   ├── ui-filters.js      # Filter UI components
│   ├── ui-render.js       # Rendering functions
│   ├── ui-update.js       # UI update functions
│   ├── cache.js           # API response caching
│   ├── request-dedupe.js  # Request deduplication
│   ├── memoize.js         # Memoization utilities
│   ├── error-handler.js   # Error handling
│   ├── utils.js           # Utility functions
│   └── validation.js      # Input validation
├── workers/
│   └── sync-worker.js     # Web Worker for background syncing
├── dist/                  # Production build output
│   ├── app.min.js         # Minified bundle
│   └── index.html         # Production HTML
├── package.json           # Dependencies & scripts
├── webpack.config.js      # Webpack bundling config
├── .env                   # Environment variables (not committed)
├── env.template           # Environment template
└── data/                  # Encrypted data storage (not committed)
    ├── tokens.json        # Encrypted Plaid tokens
    └── users.json         # User data
```

---

## 🔧 Configuration

### Environment Variables

All configuration is done via `.env` file. See [README-ENV.md](./README-ENV.md) for details.

**Required:**
- `PLAID_CLIENT_ID` - Plaid API client ID
- `PLAID_SECRET_KEY` - Plaid API secret key
- `PLAID_ENV` - Environment (sandbox/development/production)
- `JWT_SECRET` - Secret for JWT tokens
- `ENCRYPTION_KEY` - 64-character hex key for token encryption

**Optional:**
- `PORT` - Server port (default: 3000)
- `AUTH_REQUIRED` - Enable authentication (default: false for local)
- `NODE_ENV` - Environment (development/production)

---

## 🛡️ Security

This application implements industry-standard security practices:

- ✅ **Encrypted Token Storage** - Plaid access tokens encrypted at rest
- ✅ **Authentication** - JWT-based authentication system
- ✅ **Security Headers** - Helmet.js configured
- ✅ **CORS Protection** - Restricted origins
- ✅ **Rate Limiting** - API rate limiting enabled
- ✅ **HTTPS Enforcement** - Automatic HTTPS redirect in production
- ✅ **Password Hashing** - bcrypt with 10 rounds

See [SECURITY.md](./SECURITY.md) for detailed security documentation.

---

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify token

### Plaid Integration
- `POST /api/link/token/create` - Create Plaid Link token
- `POST /api/item/public_token/exchange` - Exchange public token
- `POST /api/accounts/get` - Get accounts
- `POST /api/transactions/sync` - Sync transactions

### Configuration
- `GET /api/config` - Get public configuration

All Plaid endpoints require authentication (unless `AUTH_REQUIRED=false`).

---

## 🏗️ Architecture

### Backend
- **Express.js** - Web framework
- **Plaid API** - Financial data integration
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing

### Frontend
- **Vanilla JavaScript** - No framework dependencies, modular architecture
- **IndexedDB** - Client-side data storage with indexes for efficient queries
- **Virtual Scrolling** - Smooth rendering of large transaction lists
- **Plaid Link SDK** - Secure account connection (lazy-loaded)
- **CSS3** - Modern styling with CSS variables for theming
- **Web Workers** - Background processing for large sync operations
- **Service Worker** - Offline support and caching
- **Request Deduplication** - Prevents duplicate API calls
- **Response Caching** - Reduces redundant network requests
- **Memoization** - Caches expensive calculations

### Data Storage
- **Backend**: Encrypted file-based storage (`data/`) for Plaid tokens and user data
- **Frontend**: IndexedDB for transactions, accounts, and categories with indexes
- **Secrets**: `.env` file (never committed, excluded via `.gitignore`)
- **Optimization**: Incremental saves, batched operations, dirty flags

---

## 💰 Pricing & Costs

### Plaid API Costs (Pay as You Go Plan)

- **Account Connections**: $0.50-$1.00 per account per month
- **API Calls**: Unlimited (no per-call fees)
- **Transaction Syncs**: Included with account connection
- **6 Accounts**: Approximately $3.00-$6.00/month
- **Daily Syncing**: No additional cost - sync as often as you want!

**Note**: Check your Plaid dashboard for exact per-account pricing.

### Local-Only Use

- **Hosting**: $0.00/month (runs on your computer)
- **Plaid API**: $3.00-$6.00/month (6 accounts)
- **Total**: **$3.00-$6.00/month** for local use

---

## 🚢 Deployment

### Production Checklist

1. ✅ Set `NODE_ENV=production` in `.env`
2. ✅ Set `AUTH_REQUIRED=true` in `.env`
3. ✅ Use production Plaid keys
4. ✅ Generate strong security keys
5. ✅ Configure HTTPS (TLS certificate)
6. ✅ Set `ALLOWED_ORIGINS` for CORS
7. ✅ Set secure file permissions
8. ✅ Enable monitoring/logging
9. ✅ Run `npm run build` to create production bundle

---

## 📝 Development

### Development Mode
```bash
npm run dev
```
Uses nodemon for auto-reload on file changes.

### Code Structure
- `server.js` - Backend API and Plaid integration
- `script.js` - Main frontend orchestrator
- `js/` - Modular frontend modules (auth, plaid, data, UI, etc.)
- `config.js` - Configuration management
- `css/styles.css` - Application styles
- `workers/` - Web Workers for background processing

### Build Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload
- `npm run build` - Build production bundle (minify, copy assets)
- `npm run minify` - Minify JavaScript bundle
- `npm run build-webpack` - Webpack build with tree-shaking
- `npm run analyze` - Analyze bundle size and dependencies

---

## 🐛 Troubleshooting

### Common Issues

**"Failed to fetch"**
- Check backend server is running (`npm start`)
- Verify `.env` file has correct values
- Check browser console for errors

**"Authentication required"**
- Set `AUTH_REQUIRED=false` for local development
- Or create account via `/api/auth/register`

**"Invalid key length"**
- `ENCRYPTION_KEY` must be exactly 64 hex characters
- Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

See [QUICKSTART.md](./QUICKSTART.md) for more troubleshooting tips.

---

## 📄 License

ISC

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📞 Support

For issues, questions, or contributions:
- Check documentation in `/docs` folder
- Review [SECURITY.md](./SECURITY.md) for security questions
- See [QUICKSTART.md](./QUICKSTART.md) for setup help

---

**Built with ❤️ for personal finance management**
