/**
 * @fileoverview Type definitions for the Budget Tracker application
 * These types are used for JSDoc annotations throughout the codebase
 */

/**
 * @typedef {Object} Transaction
 * @property {string} id - Unique transaction identifier
 * @property {string} accountId - ID of the account this transaction belongs to
 * @property {string} categoryId - ID of the category this transaction belongs to
 * @property {number} amount - Transaction amount (positive for income, negative for expenses)
 * @property {string} date - Transaction date in ISO format (YYYY-MM-DD)
 * @property {string} description - Transaction description/memo
 * @property {string} [plaidId] - Plaid transaction ID (if synced from Plaid)
 * @property {string} [plaidAccountId] - Plaid account ID
 * @property {Date} [createdAt] - Creation timestamp
 * @property {Date} [updatedAt] - Last update timestamp
 */

/**
 * @typedef {Object} Account
 * @property {string} id - Unique account identifier
 * @property {string} name - Account name
 * @property {string} type - Account type (depository, credit, loan, investment, other)
 * @property {string} subtype - Account subtype (checking, savings, credit card, etc.)
 * @property {number} balance - Current account balance
 * @property {string} [plaidItemId] - Plaid item ID (if connected via Plaid)
 * @property {string} [plaidAccountId] - Plaid account ID
 * @property {boolean} [included] - Whether account is included in calculations
 * @property {Date} [lastSyncTime] - Last successful sync timestamp
 * @property {Date} [createdAt] - Creation timestamp
 * @property {Date} [updatedAt] - Last update timestamp
 */

/**
 * @typedef {Object} Category
 * @property {string} id - Unique category identifier
 * @property {string} name - Category name
 * @property {string} [color] - Category color (hex code)
 * @property {string} [icon] - Category icon identifier
 * @property {number} [budget] - Monthly budget amount
 * @property {boolean} [exempt] - Whether category is exempt from spending calculations
 * @property {Date} [createdAt] - Creation timestamp
 * @property {Date} [updatedAt] - Last update timestamp
 */

/**
 * @typedef {Object} PlaidAccount
 * @property {string} account_id - Plaid account ID
 * @property {string} name - Account name
 * @property {string} type - Account type
 * @property {string} subtype - Account subtype
 * @property {number} balances.current - Current balance
 */

/**
 * @typedef {Object} PlaidTransaction
 * @property {string} transaction_id - Plaid transaction ID
 * @property {string} account_id - Plaid account ID
 * @property {number} amount - Transaction amount
 * @property {string} date - Transaction date (YYYY-MM-DD)
 * @property {string} name - Transaction name/description
 * @property {string} [category] - Transaction category
 */

/**
 * @typedef {Object} APIResponse
 * @property {boolean} success - Whether the request was successful
 * @property {*} [data] - Response data
 * @property {string} [error] - Error message (if unsuccessful)
 * @property {string} [requestId] - Request ID for tracking
 */

/**
 * @typedef {Object} AuthResponse
 * @property {boolean} success - Whether authentication was successful
 * @property {string} [token] - JWT token (if successful)
 * @property {string} [error] - Error message (if unsuccessful)
 */

/**
 * @typedef {Object} SyncResponse
 * @property {boolean} success - Whether sync was successful
 * @property {number} [added] - Number of transactions added
 * @property {number} [updated] - Number of transactions updated
 * @property {string} [error] - Error message (if unsuccessful)
 */
