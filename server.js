require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const NODE_ENV = process.env.NODE_ENV || 'development';

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
const TOKENS_FILE = path.join(DATA_DIR, 'tokens.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Initialize data directory
async function initDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
        console.error('Error creating data directory:', error);
    }
}

// Encryption functions for access tokens
function encrypt(text) {
    const iv = crypto.randomBytes(16);
    // AES-256-CBC requires 32 bytes (256 bits) key
    // If ENCRYPTION_KEY is hex string, it should be 64 hex chars (32 bytes)
    // If it's not hex, use it directly as buffer
    let keyBuffer;
    try {
        // Try to parse as hex (should be 64 hex chars for 32 bytes)
        if (ENCRYPTION_KEY.length === 64 && /^[0-9a-fA-F]+$/.test(ENCRYPTION_KEY)) {
            keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
        } else {
            // Not hex, use first 32 bytes directly
            keyBuffer = Buffer.from(ENCRYPTION_KEY.substring(0, 32), 'utf8');
        }
    } catch (e) {
        // Fallback: use first 32 bytes as UTF-8
        keyBuffer = Buffer.from(ENCRYPTION_KEY.substring(0, 32), 'utf8');
    }
    
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    // AES-256-CBC requires 32 bytes (256 bits) key
    let keyBuffer;
    try {
        // Try to parse as hex (should be 64 hex chars for 32 bytes)
        if (ENCRYPTION_KEY.length === 64 && /^[0-9a-fA-F]+$/.test(ENCRYPTION_KEY)) {
            keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
        } else {
            // Not hex, use first 32 bytes directly
            keyBuffer = Buffer.from(ENCRYPTION_KEY.substring(0, 32), 'utf8');
        }
    } catch (e) {
        // Fallback: use first 32 bytes as UTF-8
        keyBuffer = Buffer.from(ENCRYPTION_KEY.substring(0, 32), 'utf8');
    }
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// Secure token storage (encrypted file-based)
class SecureTokenStorage {
    constructor() {
        this.tokens = new Map(); // In-memory cache: userId -> { itemId -> encryptedToken }
        this.loadTokens();
    }

    async loadTokens() {
        try {
            const data = await fs.readFile(TOKENS_FILE, 'utf8');
            const tokens = JSON.parse(data);
            for (const [userId, userTokens] of Object.entries(tokens)) {
                this.tokens.set(userId, new Map(Object.entries(userTokens)));
            }
        } catch (error) {
            // File doesn't exist yet, start fresh
            this.tokens = new Map();
        }
    }

    async saveTokens() {
        try {
            const data = {};
            for (const [userId, userTokens] of this.tokens.entries()) {
                data[userId] = Object.fromEntries(userTokens);
            }
            await fs.writeFile(TOKENS_FILE, JSON.stringify(data, null, 2), 'utf8');
        } catch (error) {
            console.error('Error saving tokens:', error);
        }
    }

    async storeToken(userId, itemId, accessToken) {
        if (!this.tokens.has(userId)) {
            this.tokens.set(userId, new Map());
        }
        const userTokens = this.tokens.get(userId);
        userTokens.set(itemId, encrypt(accessToken));
        await this.saveTokens();
    }

    async getToken(userId, itemId) {
        const userTokens = this.tokens.get(userId);
        if (!userTokens || !userTokens.has(itemId)) {
            return null;
        }
        const encrypted = userTokens.get(itemId);
        return decrypt(encrypted);
    }

    async getAllTokens(userId) {
        const userTokens = this.tokens.get(userId);
        if (!userTokens) return {};
        const tokens = {};
        for (const [itemId, encrypted] of userTokens.entries()) {
            tokens[itemId] = decrypt(encrypted);
        }
        return tokens;
    }

    async deleteToken(userId, itemId) {
        const userTokens = this.tokens.get(userId);
        if (userTokens) {
            userTokens.delete(itemId);
            await this.saveTokens();
        }
    }
}

// User storage
class UserStorage {
    constructor() {
        this.users = new Map();
        this.loadUsers();
    }

    async loadUsers() {
        try {
            const data = await fs.readFile(USERS_FILE, 'utf8');
            const users = JSON.parse(data);
            for (const [id, user] of Object.entries(users)) {
                this.users.set(id, user);
            }
        } catch (error) {
            // File doesn't exist yet, start fresh
            this.users = new Map();
        }
    }

    async saveUsers() {
        try {
            const data = Object.fromEntries(this.users);
            await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2), 'utf8');
        } catch (error) {
            console.error('Error saving users:', error);
        }
    }

    async createUser(email, password) {
        const id = crypto.randomBytes(16).toString('hex');
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = {
            id,
            email,
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };
        this.users.set(id, user);
        await this.saveUsers();
        return { id, email, createdAt: user.createdAt };
    }

    async findUserByEmail(email) {
        for (const [id, user] of this.users.entries()) {
            if (user.email === email) {
                return { id, ...user };
            }
        }
        return null;
    }

    async findUserById(id) {
        const user = this.users.get(id);
        if (!user) return null;
        return { id, ...user };
    }

    async verifyPassword(email, password) {
        const user = await this.findUserByEmail(email);
        if (!user) return null;
        const isValid = await bcrypt.compare(password, user.password);
        return isValid ? { id: user.id, email: user.email } : null;
    }
}

const tokenStorage = new SecureTokenStorage();
const userStorage = new UserStorage();

// Initialize data directory on startup
initDataDir();

// Security middleware
const cspConnectSrc = ["'self'", "https://*.plaid.com"];
if (NODE_ENV === 'development') {
    cspConnectSrc.push("http://localhost:3000");
    cspConnectSrc.push("http://localhost:3001");
    cspConnectSrc.push("http://localhost:8000");
    cspConnectSrc.push("http://127.0.0.1:3000");
    cspConnectSrc.push("http://127.0.0.1:3001");
    cspConnectSrc.push("http://127.0.0.1:8000");
}

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.plaid.com"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: cspConnectSrc,
            frameSrc: ["https://cdn.plaid.com"],
        },
    },
    hsts: NODE_ENV === 'production' ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    } : false,
}));

// Handle Chrome DevTools .well-known requests (prevents 404 warnings)
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
    res.status(204).send();
});

// CORS configuration - dynamically allow based on request origin
app.use(cors({
    origin: function (origin, callback) {
        if (!origin && NODE_ENV === 'development') {
            return callback(null, true);
        }
        if (!origin) {
            return callback(null, true);
        }
        const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
        if (allowedOriginsEnv) {
            const allowed = allowedOriginsEnv.split(',').map(o => o.trim());
            if (allowed.includes(origin)) {
                return callback(null, true);
            }
        }
        if (NODE_ENV === 'development') {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many authentication attempts, please try again later.'
});

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTPS enforcement (in production)
if (NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            res.redirect(`https://${req.header('host')}${req.url}`);
        } else {
            next();
        }
    });
}

// JWT Authentication Middleware
function authenticateToken(req, res, next) {
    if (process.env.AUTH_REQUIRED === 'false') {
        req.user = { userId: 'dev_user', email: 'dev@example.com' };
        return next();
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Initialize Plaid client
const configuration = new Configuration({
    basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
    baseOptions: {
        headers: {
            'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
            'PLAID-SECRET': process.env.PLAID_SECRET_KEY,
        },
    },
});

const plaidClient = new PlaidApi(configuration);

// ============================================
// Authentication Endpoints
// ============================================

// User Registration
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        // Check if user already exists
        const existingUser = await userStorage.findUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Create user
        const user = await userStorage.createUser(email, password);

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: { id: user.id, email: user.email }
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Verify credentials
        const user = await userStorage.verifyPassword(email, password);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, email: user.email }
        });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// Verify Token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({
        valid: true,
        user: { id: req.user.userId, email: req.user.email }
    });
});

// ============================================
// Plaid API Endpoints (Protected)
// ============================================

// Create Link Token
app.post('/api/link/token/create', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const request = {
            user: {
                client_user_id: userId,
            },
            client_name: 'Budget Tracker',
            products: ['transactions'],
            country_codes: ['US'],
            language: 'en',
        };

        const response = await plaidClient.linkTokenCreate(request);
        res.json({ link_token: response.data.link_token });
    } catch (error) {
        console.error('Error creating link token:', error);

        const plaidError = error.response?.data || {};
        const errorMessage = plaidError.error_message || error.message;
        const errorCode = plaidError.error_code || 'UNKNOWN_ERROR';

        res.status(500).json({
            error: 'Failed to create link token',
            message: errorMessage,
            error_code: errorCode,
            suggestion: errorCode === 'INVALID_API_KEYS'
                ? 'Please verify your Plaid credentials in .env match the selected environment (sandbox/development/production)'
                : 'Check server logs for more details'
        });
    }
});

// Exchange Public Token for Access Token
app.post('/api/item/public_token/exchange', authenticateToken, async (req, res) => {
    try {
        const { public_token } = req.body;
        const userId = req.user.userId;

        if (!public_token) {
            return res.status(400).json({ error: 'Public token is required' });
        }

        const response = await plaidClient.itemPublicTokenExchange({
            public_token: public_token,
        });

        const accessToken = response.data.access_token;
        const itemId = response.data.item_id;

        await tokenStorage.storeToken(userId, itemId, accessToken);

        res.json({
            item_id: itemId,
            message: 'Access token stored securely'
        });
    } catch (error) {
        console.error('Error exchanging public token:', error);
        res.status(500).json({
            error: 'Failed to exchange public token',
            message: error.message
        });
    }
});

// Get Accounts
app.post('/api/accounts/get', authenticateToken, async (req, res) => {
    try {
        const { item_id } = req.body;
        const userId = req.user.userId;

        if (!item_id) {
            return res.status(400).json({ error: 'Item ID is required' });
        }

        const accessToken = await tokenStorage.getToken(userId, item_id);
        if (!accessToken) {
            return res.status(404).json({ 
                error: 'Access token not found for this item',
                message: 'Make sure you have connected this account via Plaid'
            });
        }

        const response = await plaidClient.accountsGet({
            access_token: accessToken,
        });

        res.json({
            accounts: response.data.accounts,
        });
    } catch (error) {
        console.error('Error getting accounts:', error);
        res.status(500).json({
            error: 'Failed to get accounts',
            message: error.message
        });
    }
});

// Get All User's Access Tokens
app.get('/api/access-tokens', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const tokens = await tokenStorage.getAllTokens(userId);
        
        res.json({
            items: Object.keys(tokens).map(itemId => ({ item_id: itemId }))
        });
    } catch (error) {
        console.error('Error getting access tokens:', error);
        res.status(500).json({ error: 'Failed to get access tokens' });
    }
});

// Get Transactions
app.post('/api/transactions/get', authenticateToken, async (req, res) => {
    try {
        const { item_id, start_date, end_date } = req.body;
        const userId = req.user.userId;

        if (!item_id) {
            return res.status(400).json({ error: 'Item ID is required' });
        }

        const accessToken = await tokenStorage.getToken(userId, item_id);
        if (!accessToken) {
            return res.status(404).json({ error: 'Access token not found for this item' });
        }

        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        const request = {
            access_token: accessToken,
            start_date: start_date || thirtyDaysAgo.toISOString().split('T')[0],
            end_date: end_date || today.toISOString().split('T')[0],
        };

        const response = await plaidClient.transactionsGet(request);

        res.json({
            transactions: response.data.transactions,
            total_transactions: response.data.total_transactions,
        });
    } catch (error) {
        console.error('Error getting transactions:', error);
        res.status(500).json({
            error: 'Failed to get transactions',
            message: error.message
        });
    }
});

// Sync Transactions
app.post('/api/transactions/sync', authenticateToken, async (req, res) => {
    try {
        const { item_id, cursor } = req.body;
        const userId = req.user.userId;

        if (!item_id) {
            return res.status(400).json({ error: 'Item ID is required' });
        }

        const accessToken = await tokenStorage.getToken(userId, item_id);
        if (!accessToken) {
            return res.status(404).json({ error: 'Access token not found for this item' });
        }

        const request = {
            access_token: accessToken,
            cursor: cursor || null,
            count: 500,
        };

        const response = await plaidClient.transactionsSync(request);

        res.json({
            transactions: response.data.added,
            modified: response.data.modified,
            removed: response.data.removed,
            has_more: response.data.has_more,
            next_cursor: response.data.next_cursor,
        });
    } catch (error) {
        console.error('Error syncing transactions:', error);
        res.status(500).json({
            error: 'Failed to sync transactions',
            message: error.message
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        plaid_env: process.env.PLAID_ENV || 'sandbox',
        auth_enabled: true
    });
});

// Frontend Config Endpoint
app.get('/api/config', (req, res) => {
    res.json({
        API_BASE_URL: `${req.protocol}://${req.get('host')}/api`,
        PLAID_ENV: process.env.PLAID_ENV || 'sandbox',
        FEATURES: {
            SYNC_ENABLED: process.env.SYNC_ENABLED !== 'false',
            EXPORT_ENABLED: process.env.EXPORT_ENABLED !== 'false',
            DARK_MODE_ENABLED: process.env.DARK_MODE_ENABLED !== 'false',
            AUTH_REQUIRED: process.env.AUTH_REQUIRED !== 'false',
        },
        APP_NAME: process.env.APP_NAME || 'Budget Tracker',
        APP_VERSION: process.env.APP_VERSION || '1.0.0',
        DEFAULT_PAGE_SIZE: parseInt(process.env.DEFAULT_PAGE_SIZE) || 50,
        VIRTUAL_SCROLL_BUFFER: parseInt(process.env.VIRTUAL_SCROLL_BUFFER) || 5,
    });
});

// Serve static files (HTML, CSS, JS) - must be after all API routes
app.use(express.static(path.join(__dirname)));

// Start server
app.listen(PORT, '0.0.0.0', () => {
    if (NODE_ENV === 'development') {
        const networkInterfaces = require('os').networkInterfaces();
        const localIP = Object.values(networkInterfaces)
            .flat()
            .find(i => i.family === 'IPv4' && !i.internal)?.address;
        
        console.log(`Server running on http://localhost:${PORT}`);
        if (localIP) {
            console.log(`Also accessible at http://${localIP}:${PORT}`);
        }
        console.log(`Plaid environment: ${process.env.PLAID_ENV || 'sandbox'}`);
    }
    // Production: minimal logging
    if (NODE_ENV === 'production') {
        console.log(`Server started on port ${PORT}`);
    }
});
