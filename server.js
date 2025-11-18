require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const crypto = require('crypto');
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
const logger = require('./utils/logger');
const { validateAndLog } = require('./utils/env-validator');
const { basicHealthCheck, detailedHealthCheck, readinessCheck } = require('./utils/health-check');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
const TOKENS_FILE = path.join(DATA_DIR, 'tokens.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ENV_FILE = path.join(__dirname, '.env');

// Secure memory utilities - clear sensitive data from memory
function secureClear(buffer) {
  if (Buffer.isBuffer(buffer)) {
    buffer.fill(0);
  } else if (typeof buffer === 'string') {
    // For strings, we can't fully clear them in JavaScript, but we can minimize exposure
    // The best practice is to minimize the time sensitive data exists in memory
    return null;
  }
  return null;
}

// Input validation and sanitization
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim()) && email.length <= 254;
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return false;
  }
  // At least 8 chars, max 128, must contain at least one letter and one number
  return (
    password.length >= 8 &&
    password.length <= 128 &&
    /[a-zA-Z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }
  // Remove null bytes and control characters
  return input.replace(/[\x00-\x1F\x7F]/g, '').trim();
}

// Process-level security checks
function checkProcessSecurity() {
  // Warn if running as root (security risk)
  if (process.getuid && process.getuid() === 0) {
    logger.warn('SECURITY WARNING: Server is running as root user!');
    logger.warn('This is a security risk. Consider running as a non-root user.');
  }

  // Check if we're in a secure environment
  if (process.env.NODE_ENV === 'production' && process.env.AUTH_REQUIRED === 'false') {
    logger.warn('SECURITY WARNING: Authentication disabled in production!');
  }
}

// Enhanced file path validation with additional checks
function validateFilePath(filePath, baseDir) {
  const resolved = path.resolve(filePath);
  const base = path.resolve(baseDir);

  // Prevent directory traversal
  if (!resolved.startsWith(base)) {
    throw new Error('Invalid file path: path traversal detected');
  }

  // Prevent null bytes
  if (filePath.includes('\0')) {
    throw new Error('Invalid file path: null byte detected');
  }

  // Prevent absolute paths outside base directory
  if (path.isAbsolute(filePath) && !resolved.startsWith(base)) {
    throw new Error('Invalid file path: absolute path outside base directory');
  }

  return resolved;
}

// Initialize data directory
async function initDataDir() {
  try {
    await fsPromises.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    logger.error('Error creating data directory', { error: error.message });
  }
}

// Ensure security keys exist in .env (auto-generate and save if missing)
async function ensureSecurityKeys() {
  try {
    let envContent = '';
    let envExists = false;

    // Read existing .env or create from template
    try {
      envContent = await fsPromises.readFile(ENV_FILE, 'utf8');
      envExists = true;
    } catch {
      // .env doesn't exist, try to copy from template
      try {
        const templatePath = path.join(__dirname, 'env.template');
        envContent = await fsPromises.readFile(templatePath, 'utf8');
        envExists = false;
      } catch {
        // Template doesn't exist, create minimal .env
        envContent = '';
      }
    }

    // Check if keys are set (not placeholder values)
    const hasJWT =
      envContent.includes('JWT_SECRET=') &&
      !envContent.match(/JWT_SECRET\s*=\s*(your_|placeholder|undefined|null)/i);
    const hasEncryption =
      envContent.includes('ENCRYPTION_KEY=') &&
      !envContent.match(/ENCRYPTION_KEY\s*=\s*(your_|placeholder|undefined|null)/i);

    // Generate keys if missing
    if (!hasJWT || !hasEncryption) {
      const jwtSecret = crypto.randomBytes(64).toString('hex');
      const encryptionKey = crypto.randomBytes(32).toString('hex');

      // Update or add keys to .env content
      if (envContent.includes('JWT_SECRET=')) {
        envContent = envContent.replace(/JWT_SECRET\s*=.*/g, `JWT_SECRET=${jwtSecret}`);
      } else {
        envContent += `\nJWT_SECRET=${jwtSecret}`;
      }

      if (envContent.includes('ENCRYPTION_KEY=')) {
        envContent = envContent.replace(/ENCRYPTION_KEY\s*=.*/g, `ENCRYPTION_KEY=${encryptionKey}`);
      } else {
        envContent += `\nENCRYPTION_KEY=${encryptionKey}`;
      }

      // Ensure .env file ends with newline
      if (!envContent.endsWith('\n')) {
        envContent += '\n';
      }

      // Save updated .env
      const safeEnvPath = validateFilePath(ENV_FILE, __dirname);
      await fsPromises.writeFile(safeEnvPath, envContent, {
        encoding: 'utf8',
        mode: 0o600, // Owner read/write only
      });

      // Ensure permissions (for Mac/Linux)
      if (process.platform !== 'win32') {
        await fsPromises.chmod(safeEnvPath, 0o600);
      }

      logger.info('Security keys auto-generated and saved to .env');

      // Reload environment variables
      require('dotenv').config({ override: true });
    }
  } catch (error) {
    logger.warn('Could not ensure security keys', { error: error.message });
    logger.info('Please manually set JWT_SECRET and ENCRYPTION_KEY in .env');
  }
}

// Load security keys (after ensuring they exist)
let JWT_SECRET = process.env.JWT_SECRET;
let ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// If keys are still missing, generate temporary ones (will be saved on next run)
if (!JWT_SECRET || JWT_SECRET.includes('your_')) {
  JWT_SECRET = crypto.randomBytes(64).toString('hex');
  logger.warn('JWT_SECRET not set in .env - using temporary key (will be lost on restart)');
}
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.includes('your_')) {
  ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
  logger.warn('ENCRYPTION_KEY not set in .env - using temporary key (will be lost on restart)');
}

// Encryption functions for access tokens
/**
 * Encrypts plain text using AES-256-CBC encryption
 * @param {string} text - Plain text to encrypt
 * @returns {string} Encrypted string in format "iv:encryptedData" (both hex encoded)
 * @throws {Error} If encryption fails
 */
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
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts encrypted text using AES-256-CBC decryption
 * @param {string} text - Encrypted string in format "iv:encryptedData" (both hex encoded)
 * @returns {string} Decrypted plain text
 * @throws {Error} If decryption fails (invalid format, wrong key, etc.)
 */
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
      const safePath = validateFilePath(TOKENS_FILE, DATA_DIR);
      const data = await fsPromises.readFile(safePath, 'utf8');
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
      const jsonData = JSON.stringify(data, null, 2);
      const safePath = validateFilePath(TOKENS_FILE, DATA_DIR);
      await fsPromises.writeFile(safePath, jsonData, {
        encoding: 'utf8',
        mode: 0o600, // Owner read/write only
      });
      // Ensure permissions (for Mac/Linux)
      if (process.platform !== 'win32') {
        await fsPromises.chmod(safePath, 0o600);
      }
    } catch (error) {
      logger.logError(error, { context: 'Save Tokens' });
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
    const decrypted = decrypt(encrypted);

    // Note: In JavaScript, we can't fully clear the decrypted token from memory
    // However, we minimize exposure by only decrypting when needed
    // The token is used immediately and not stored in long-lived variables

    return decrypted;
  }

  async getAllTokens(userId) {
    const userTokens = this.tokens.get(userId);
    if (!userTokens) {
      return {};
    }
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
      const safePath = validateFilePath(USERS_FILE, DATA_DIR);
      const data = await fsPromises.readFile(safePath, 'utf8');
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
      const jsonData = JSON.stringify(data, null, 2);
      const safePath = validateFilePath(USERS_FILE, DATA_DIR);
      await fsPromises.writeFile(safePath, jsonData, {
        encoding: 'utf8',
        mode: 0o600, // Owner read/write only
      });
      // Ensure permissions (for Mac/Linux)
      if (process.platform !== 'win32') {
        await fsPromises.chmod(safePath, 0o600);
      }
    } catch (error) {
      logger.logError(error, { context: 'Save Users' });
    }
  }

  async createUser(email, password) {
    // Validate input
    if (!validateEmail(email)) {
      throw new Error('Invalid email format');
    }
    if (!validatePassword(password)) {
      throw new Error('Password must be at least 8 characters with letters and numbers');
    }

    const id = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Clear password from memory immediately after hashing
    secureClear(password);

    const user = {
      id,
      email: sanitizeInput(email),
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    };
    this.users.set(id, user);
    await this.saveUsers();
    return { id, email: user.email, createdAt: user.createdAt };
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
    if (!user) {
      return null;
    }
    return { id, ...user };
  }

  async verifyPassword(email, password) {
    const user = await this.findUserByEmail(email);
    if (!user) {
      // Clear password from memory immediately
      secureClear(password);
      return null;
    }

    // Use bcrypt.compare which is timing-safe
    const isValid = await bcrypt.compare(password, user.password);

    // Clear password from memory after use
    secureClear(password);

    return isValid ? { id: user.id, email: user.email } : null;
  }
}

const tokenStorage = new SecureTokenStorage();
const userStorage = new UserStorage();

// Initialize data directory and security keys on startup
// This MUST complete before server starts
let serverInitialized = false;
const initPromise = (async () => {
  try {
    // Check process security first
    checkProcessSecurity();

    await initDataDir();
    await ensureSecurityKeys();

    // Reload .env after ensuring keys exist
    delete require.cache[require.resolve('dotenv')];
    require('dotenv').config({ override: true });

    // Update keys from .env after ensuring they exist
    if (process.env.JWT_SECRET && !process.env.JWT_SECRET.includes('your_')) {
      JWT_SECRET = process.env.JWT_SECRET;
    }
    if (process.env.ENCRYPTION_KEY && !process.env.ENCRYPTION_KEY.includes('your_')) {
      ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    }

    serverInitialized = true;
  } catch (error) {
    logger.error('Failed to initialize server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
})();

// Security middleware
const cspConnectSrc = ["'self'", 'https://*.plaid.com'];
if (NODE_ENV === 'development') {
  cspConnectSrc.push('http://localhost:3000');
  cspConnectSrc.push('http://localhost:3001');
  cspConnectSrc.push('http://localhost:8000');
  cspConnectSrc.push('http://127.0.0.1:3000');
  cspConnectSrc.push('http://127.0.0.1:3001');
  cspConnectSrc.push('http://127.0.0.1:8000');
}

app.use(
  helmet({
    contentSecurityPolicy:
      NODE_ENV === 'production'
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.plaid.com'],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: cspConnectSrc,
              frameSrc: ['https://cdn.plaid.com'],
              fontSrc: ["'self'", 'data:'],
              objectSrc: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
              frameAncestors: ["'none'"],
              upgradeInsecureRequests: [],
            },
          }
        : false,
    hsts:
      NODE_ENV === 'production'
        ? {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
          }
        : false,
    permissionsPolicy: {
      accelerometer: ['*'],
      'encrypted-media': ['*'],
      geolocation: [],
      microphone: [],
      camera: [],
    },
    // Additional security headers
    xContentTypeOptions: true, // Prevent MIME type sniffing
    xFrameOptions: { action: 'deny' }, // Prevent clickjacking
    xXssProtection: true, // Enable XSS filter
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginEmbedderPolicy: false, // Disabled for Plaid compatibility
    crossOriginOpenerPolicy: false, // Disabled for Plaid compatibility
  })
);

// Additional Permissions-Policy header for Plaid Link SDK compatibility
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'accelerometer=*, encrypted-media=*');
  next();
});

// Request ID middleware for tracking
app.use((req, res, next) => {
  req.id = crypto.randomBytes(16).toString('hex');
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  // Log response when finished
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    logger.logRequest(req, res, responseTime);
  });

  next();
});

// Handle Chrome DevTools .well-known requests (prevents 404 warnings)
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.status(204).send();
});

// CORS configuration - restrict to localhost for local use
const isLocalOnly = process.env.LOCAL_ONLY === 'true' || NODE_ENV === 'development';

// Skip CORS for health check endpoints (for monitoring tools, curl, etc.)
app.use((req, res, next) => {
  if (req.path && req.path.startsWith('/api/health')) {
    // Set CORS headers for health checks
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    // Skip CORS middleware for health checks by calling next() without going through CORS
    return next();
  }
  // For non-health routes, continue to CORS middleware
  next();
});

// CORS middleware - only runs for non-health-check routes
const corsMiddleware = cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests) in development
    if (!origin && NODE_ENV === 'development') {
      return callback(null, true);
    }

    // Explicitly allow localhost origins
    if (
      origin &&
      (origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.startsWith('http://[::1]:'))
    ) {
      return callback(null, true);
    }

    // In production or if ALLOWED_ORIGINS is set, use configured origins
    const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
    if (allowedOriginsEnv) {
      const allowed = allowedOriginsEnv.split(',').map(o => o.trim());
      if (allowed.includes(origin)) {
        return callback(null, true);
      }
    }

    // Allow all origins in development (for flexibility)
    if (NODE_ENV === 'development' && !isLocalOnly) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// Apply CORS only to non-health-check routes
app.use((req, res, next) => {
  if (req.path && req.path.startsWith('/api/health')) {
    return next(); // Skip CORS for health checks
  }
  corsMiddleware(req, res, next); // Apply CORS for other routes
});

// Rate limiting - general API protection
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for Plaid endpoints (cost protection)
const plaidLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per minute
  message: 'Too many Plaid API requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);
app.use('/api/link/', plaidLimiter);
app.use('/api/accounts/', plaidLimiter);
app.use('/api/transactions/', plaidLimiter);

// Body parsing
// Request size limits (security: prevent DoS attacks)
const MAX_REQUEST_SIZE = '10mb';
app.use(express.json({ limit: MAX_REQUEST_SIZE }));
app.use(express.urlencoded({ extended: true, limit: MAX_REQUEST_SIZE }));

// Additional security: Remove X-Powered-By header
app.disable('x-powered-by');

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
  let password = null;
  try {
    const { email: rawEmail, password: rawPassword } = req.body;

    // Sanitize inputs
    const email = sanitizeInput(rawEmail);
    password = rawPassword; // Keep reference for clearing

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters and contain both letters and numbers',
      });
    }

    // Check if user already exists
    const existingUser = await userStorage.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Create user (password will be cleared inside createUser)
    const user = await userStorage.createUser(email, password);

    // Clear password from memory
    secureClear(password);
    password = null;

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    if (password) {
      secureClear(password);
    }
    logger.logError(error, { context: 'User Registration' });
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  let password = null;
  try {
    const { email: rawEmail, password: rawPassword } = req.body;

    // Sanitize inputs
    const email = sanitizeInput(rawEmail);
    password = rawPassword; // Keep reference for clearing

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Verify credentials (password will be cleared inside verifyPassword)
    const user = await userStorage.verifyPassword(email, password);

    // Clear password from memory
    secureClear(password);
    password = null;

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    if (password) {
      secureClear(password);
    }
    logger.logError(error, { context: 'User Login' });
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Verify Token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: { id: req.user.userId, email: req.user.email },
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
      transactions: {
        days_requested: 730, // Request 24 months (730 days) of transaction history
      },
    };

    const response = await plaidClient.linkTokenCreate(request);
    res.json({ link_token: response.data.link_token });
  } catch (error) {
    logger.logError(error, { context: 'Create Link Token', userId: req.user?.userId });

    const plaidError = error.response?.data || {};
    const errorMessage = plaidError.error_message || error.message;
    const errorCode = plaidError.error_code || 'UNKNOWN_ERROR';

    res.status(500).json({
      error: 'Failed to create link token',
      message: errorMessage,
      error_code: errorCode,
      suggestion:
        errorCode === 'INVALID_API_KEYS'
          ? 'Please verify your Plaid credentials in .env match the selected environment (sandbox/development/production)'
          : 'Check server logs for more details',
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
      message: 'Access token stored securely',
    });
  } catch (error) {
    logger.logError(error, { context: 'Exchange Public Token', userId: req.user?.userId });
    res.status(500).json({
      error: 'Failed to exchange public token',
      message: error.message,
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
        message: 'Make sure you have connected this account via Plaid',
      });
    }

    const response = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    res.json({
      accounts: response.data.accounts,
    });
  } catch (error) {
    logger.logError(error, { context: 'Get Accounts', userId: req.user?.userId });
    res.status(500).json({
      error: 'Failed to get accounts',
      message: error.message,
    });
  }
});

// Get All User's Access Tokens
app.get('/api/access-tokens', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tokens = await tokenStorage.getAllTokens(userId);

    res.json({
      items: Object.keys(tokens).map(itemId => ({ item_id: itemId })),
    });
  } catch (error) {
    logger.logError(error, { context: 'Get Access Tokens', userId: req.user?.userId });
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
    logger.logError(error, { context: 'Get Transactions', userId: req.user?.userId });
    res.status(500).json({
      error: 'Failed to get transactions',
      message: error.message,
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
    logger.logError(error, { context: 'Sync Transactions', userId: req.user?.userId });
    res.status(500).json({
      error: 'Failed to sync transactions',
      message: error.message,
    });
  }
});

// Health check
// Health check endpoints (defined before other routes to ensure CORS bypass works)
app.get('/api/health', async (req, res) => {
  try {
    const health = await basicHealthCheck();
    const statusCode = health.healthy ? 200 : 503;
    res.status(statusCode).json({
      status: health.healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: health.checks,
    });
  } catch (error) {
    logger.logError(error, { context: 'Health Check' });
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

// Detailed health check endpoint
app.get('/api/health/detailed', async (req, res) => {
  try {
    const health = await detailedHealthCheck();
    const statusCode = health.healthy ? 200 : 503;
    res.status(statusCode).json({
      status: health.healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: health.checks,
      system: health.system,
    });
  } catch (error) {
    logger.logError(error, { context: 'Detailed Health Check' });
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

// Readiness probe (for Kubernetes/Docker)
app.get('/api/health/ready', async (req, res) => {
  try {
    const readiness = await readinessCheck();
    const statusCode = readiness.ready ? 200 : 503;
    res.status(statusCode).json({
      ready: readiness.ready,
      message: readiness.message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.logError(error, { context: 'Readiness Check' });
    res.status(503).json({
      ready: false,
      message: 'Readiness check failed',
      timestamp: new Date().toISOString(),
    });
  }
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

// Error tracking endpoint for frontend errors
app.post('/api/errors', (req, res) => {
  try {
    const { error, context, userAgent, url } = req.body;
    logger.logError(new Error(error.message || error), {
      context: context || 'Frontend Error',
      userAgent,
      url,
      stack: error.stack,
      ...error,
    });
    res.status(200).json({ success: true });
  } catch (err) {
    logger.logError(err, { context: 'Error Tracking Endpoint' });
    res.status(500).json({ error: 'Failed to log error' });
  }
});

// Global error handler middleware (must be before static files)
app.use((err, req, res, next) => {
  logger.logError(err, { context: 'Unhandled Route Error', requestId: req.id });
  res.status(500).json({
    error: 'Internal server error',
    message: NODE_ENV === 'development' ? err.message : 'An error occurred',
    requestId: req.id,
  });
});

// Serve static files (HTML, CSS, JS) - must be after all API routes
// In production, serve from dist folder if it exists
const distPath = path.join(__dirname, 'dist');
const staticPath =
  fs.existsSync(distPath) && process.env.NODE_ENV === 'production' ? distPath : __dirname;
app.use(express.static(staticPath));

// Serve service worker from root
app.get('/sw.js', (req, res) => {
  const swPath = path.join(__dirname, 'sw.js');
  res.type('application/javascript');
  res.sendFile(swPath);
});

// Global error handlers to prevent crashes
process.on('uncaughtException', error => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  // In development, continue running to help debug
  // In production, exit and let process manager restart
  if (NODE_ENV === 'production') {
    logger.error('Exiting due to uncaught exception in production');
    process.exit(1);
  } else {
    logger.warn('Continuing in development mode (server may be unstable)');
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise?.toString(),
  });
  // Log but don't exit - most unhandled rejections are recoverable
  // Only exit in production for critical errors
  if (
    NODE_ENV === 'production' &&
    reason &&
    typeof reason === 'object' &&
    reason.code === 'ECONNREFUSED'
  ) {
    logger.error('Critical connection error in production, exiting');
    process.exit(1);
  }
});

// Handle server errors
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server - bind to localhost for local-only use
// Wait for initialization to complete before starting server
const SERVER_HOST =
  process.env.SERVER_HOST || (NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');

// Ensure initialization completes before starting server
initPromise
  .then(() => {
    // Validate environment variables before starting server
    if (!validateAndLog()) {
      logger.error('Environment validation failed. Please fix the errors above.');
      if (NODE_ENV === 'production') {
        process.exit(1);
      }
      // In development, continue with warnings but log the issues
    }

    if (!serverInitialized) {
      logger.error('Server initialization failed');
      process.exit(1);
      return;
    }

    // Wrap server startup in try-catch to handle port binding errors
    try {
      const server = app.listen(PORT, SERVER_HOST, () => {
        if (NODE_ENV === 'development') {
          logger.info(`Server running on http://localhost:${PORT}`);
          if (SERVER_HOST === '127.0.0.1') {
            logger.info('Local-only mode: Server accessible only from localhost');
          } else {
            const networkInterfaces = require('os').networkInterfaces();
            const localIP = Object.values(networkInterfaces)
              .flat()
              .find(i => i.family === 'IPv4' && !i.internal)?.address;
            if (localIP) {
              logger.warn(`Server also accessible at http://${localIP}:${PORT}`);
              logger.info('Set SERVER_HOST=127.0.0.1 in .env for local-only access');
            }
          }
          logger.info(`Plaid environment: ${process.env.PLAID_ENV || 'sandbox'}`);
        }
        // Production: minimal logging
        if (NODE_ENV === 'production') {
          logger.info(`Server started on port ${PORT}`);
        }
      });

      // Handle server errors
      server.on('error', error => {
        if (error.code === 'EADDRINUSE') {
          logger.error(
            `Port ${PORT} is already in use. Please kill the process using that port or use a different port.`
          );
          logger.error(`To kill existing process: lsof -ti:${PORT} | xargs kill -9`);
          process.exit(1);
        } else {
          logger.logError(error, { context: 'Server Error' });
          // Don't exit on other errors - let it try to recover
        }
      });
    } catch (error) {
      logger.logError(error, { context: 'Server Startup' });
      process.exit(1);
    }
  })
  .catch(error => {
    logger.logError(error, { context: 'Server Initialization' });
    process.exit(1);
  });
