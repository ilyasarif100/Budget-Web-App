/**
 * Structured Logging Utility
 * 
 * Provides centralized logging with Winston for consistent log format
 * and file-based log storage.
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Console format (more readable for development)
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
    })
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    format: logFormat,
    defaultMeta: { service: 'budget-tracker' },
    transports: [
        // Write all logs to app.log
        new winston.transports.File({
            filename: path.join(logsDir, 'app.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            format: logFormat
        }),
        // Write errors to error.log
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            format: logFormat
        })
    ],
    // Handle exceptions and rejections
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'exceptions.log')
        })
    ],
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'rejections.log')
        })
    ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: consoleFormat
    }));
}

// Helper function to create request context
function createRequestContext(req) {
    return {
        requestId: req.id || req.headers['x-request-id'] || 'unknown',
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent')
    };
}

// Helper function to sanitize sensitive data
function sanitizeData(data) {
    if (!data || typeof data !== 'object') {
        return data;
    }
    
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization', 'cookie'];
    const sanitized = { ...data };
    
    for (const key in sanitized) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
            sanitized[key] = '[REDACTED]';
        } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
            sanitized[key] = sanitizeData(sanitized[key]);
        }
    }
    
    return sanitized;
}

// Enhanced logging methods with context
logger.logRequest = function(req, res, responseTime = null) {
    const context = createRequestContext(req);
    const logData = {
        ...context,
        statusCode: res.statusCode,
        responseTime: responseTime ? `${responseTime}ms` : null
    };
    
    if (res.statusCode >= 400) {
        this.warn('HTTP Request', logData);
    } else {
        this.info('HTTP Request', logData);
    }
};

logger.logError = function(error, context = {}) {
    const errorData = {
        message: error.message,
        stack: error.stack,
        ...sanitizeData(context)
    };
    
    this.error('Error occurred', errorData);
};

logger.logApiCall = function(service, method, data = {}) {
    this.info(`API Call: ${service}.${method}`, sanitizeData(data));
};

module.exports = logger;

