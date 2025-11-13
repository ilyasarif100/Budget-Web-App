/**
 * Error Handler Module
 * Provides comprehensive error handling with user-friendly messages
 */

class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.maxLogSize = 100;
    }

    /**
     * Handle and display errors with user-friendly messages
     * @param {Error|string} error - Error object or message
     * @param {string} context - Context where error occurred
     * @param {boolean} showToUser - Whether to show toast to user
     */
    handle(error, context = 'Unknown', showToUser = true) {
        const errorInfo = this.parseError(error, context);
        
        // Log error
        this.logError(errorInfo);
        
        // Show to user if requested
        if (showToUser && typeof showToast === 'function') {
            showToast(errorInfo.userMessage, 'error');
        }
        
        // Console error for debugging
        console.error(`[${context}]`, errorInfo);
        
        return errorInfo;
    }

    /**
     * Parse error into structured format
     */
    parseError(error, context) {
        let message = 'An unexpected error occurred';
        let userMessage = 'Something went wrong. Please try again.';
        let code = 'UNKNOWN_ERROR';
        let details = null;

        if (error instanceof Error) {
            message = error.message;
            details = {
                stack: error.stack,
                name: error.name
            };
        } else if (typeof error === 'string') {
            message = error;
        } else if (error && error.message) {
            message = error.message;
            code = error.code || error.error_code || code;
            details = error;
        }

        // Map common errors to user-friendly messages
        userMessage = this.getUserFriendlyMessage(message, code, context);

        return {
            message,
            userMessage,
            code,
            context,
            timestamp: new Date().toISOString(),
            details
        };
    }

    /**
     * Get user-friendly error message
     */
    getUserFriendlyMessage(message, code, context) {
        // Network errors
        if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
            return 'Unable to connect to server. Please check your internet connection.';
        }

        if (message.includes('ERR_CONNECTION_REFUSED')) {
            return 'Server is not running. Please start the server and try again.';
        }

        // Authentication errors
        if (message.includes('Not authenticated') || message.includes('401')) {
            return 'Please log in to continue.';
        }

        if (message.includes('Invalid credentials') || message.includes('403')) {
            return 'Invalid email or password. Please try again.';
        }

        // Plaid errors
        if (code === 'INVALID_API_KEYS' || message.includes('INVALID_API_KEYS')) {
            return 'Invalid Plaid credentials. Please check your .env file.';
        }

        if (message.includes('Plaid') && message.includes('error')) {
            return 'Unable to connect to your bank. Please try again later.';
        }

        // Database errors
        if (message.includes('IndexedDB') || message.includes('database')) {
            return 'Unable to save data. Please refresh the page.';
        }

        // Validation errors
        if (message.includes('required') || message.includes('invalid')) {
            return message; // Validation messages are usually user-friendly
        }

        // Context-specific messages
        if (context.includes('sync')) {
            return 'Failed to sync transactions. Please try again.';
        }

        if (context.includes('save')) {
            return 'Failed to save data. Please try again.';
        }

        if (context.includes('load')) {
            return 'Failed to load data. Please refresh the page.';
        }

        // Default
        return 'An error occurred. Please try again or refresh the page.';
    }

    /**
     * Log error to internal log
     */
    logError(errorInfo) {
        this.errorLog.push(errorInfo);
        
        // Keep log size manageable
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.shift();
        }

        // Optionally send to backend for monitoring
        if (window.CONFIG?.FEATURES?.ERROR_LOGGING) {
            this.sendToBackend(errorInfo).catch(() => {
                // Silently fail - don't break app if logging fails
            });
        }
    }

    /**
     * Send error to backend for monitoring
     */
    async sendToBackend(errorInfo) {
        try {
            if (typeof authenticatedFetch === 'function') {
                await authenticatedFetch(`${window.CONFIG.API_BASE_URL}/api/errors/log`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: errorInfo.message,
                        code: errorInfo.code,
                        context: errorInfo.context,
                        timestamp: errorInfo.timestamp,
                        userAgent: navigator.userAgent,
                        url: window.location.href
                    })
                });
            }
        } catch (err) {
            // Silently fail - don't break app
        }
    }

    /**
     * Get recent errors
     */
    getRecentErrors(limit = 10) {
        return this.errorLog.slice(-limit);
    }

    /**
     * Clear error log
     */
    clearLog() {
        this.errorLog = [];
    }

    /**
     * Wrap async function with error handling
     */
    wrapAsync(fn, context) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.handle(error, context, true);
                throw error; // Re-throw for caller to handle if needed
            }
        };
    }
}

// Create global error handler instance
const errorHandler = new ErrorHandler();

// Global error handler for unhandled errors
window.addEventListener('error', (event) => {
    errorHandler.handle(event.error, 'Unhandled Error', true);
});

// Global promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    errorHandler.handle(event.reason, 'Unhandled Promise Rejection', true);
});

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ErrorHandler, errorHandler };
}

