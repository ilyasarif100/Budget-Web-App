# Budget Tracker - Personal Budgeting Application

A modern, full-stack budgeting application with Plaid integration for automatic transaction syncing.

## ✨ Features

- 🔗 **Plaid Integration** - Connect bank accounts automatically
- 💰 **Transaction Management** - View, edit, and categorize transactions
- 📊 **Budget Categories** - Track spending by category
- 📈 **Dashboard** - Visual overview of your finances
- 🔐 **Secure** - Encrypted token storage, authentication, security headers
- 📱 **Responsive** - Works on desktop and mobile
- 🌙 **Dark Mode** - Built-in dark theme
- 📤 **Export** - Export transactions to CSV

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
├── server.js           # Express backend server
├── config.js           # Frontend configuration loader
├── index.html          # Main HTML file
├── script.js           # Frontend application logic
├── styles.css          # Application styles
├── package.json        # Dependencies
├── .env                # Environment variables (not committed)
├── env.template        # Environment template
├── data/               # Encrypted data storage (not committed)
│   ├── tokens.json     # Encrypted Plaid tokens
│   └── users.json      # User data
└── docs/               # Documentation
    ├── README.md       # This file
    ├── QUICKSTART.md   # Quick start guide
    ├── README-ENV.md   # Environment variables guide
    └── SECURITY.md     # Security documentation
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
- **Vanilla JavaScript** - No framework dependencies
- **IndexedDB** - Client-side data storage
- **Plaid Link SDK** - Secure account connection
- **CSS3** - Modern styling with CSS variables

### Data Storage
- **Backend**: Encrypted file-based storage (`data/`)
- **Frontend**: IndexedDB for transactions and accounts
- **Secrets**: `.env` file (never committed)

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

### Docker Deployment

See [Docker documentation](./docs/DOCKER.md) for containerized deployment.

---

## 📝 Development

### Development Mode
```bash
npm run dev
```
Uses nodemon for auto-reload on file changes.

### Code Structure
- `server.js` - Backend API and Plaid integration
- `script.js` - Frontend application logic
- `config.js` - Configuration management
- `styles.css` - Application styles

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
