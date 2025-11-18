/**
 * Environment Variable Validator
 * Validates all required and optional environment variables on startup
 */

const logger = require('./logger');

/**
 * Validation result
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether validation passed
 * @property {Array<string>} errors - Array of error messages
 * @property {Array<string>} warnings - Array of warning messages
 */

/**
 * Validates all environment variables
 * @returns {ValidationResult} Validation result with errors and warnings
 */
function validateEnvironment() {
  const errors = [];
  const warnings = [];

  // Required variables
  const required = {
    PLAID_CLIENT_ID: {
      validate: value => {
        if (!value || value === 'your_client_id_here') {
          return 'PLAID_CLIENT_ID is required and must not be a placeholder';
        }
        return null;
      },
    },
    PLAID_SECRET_KEY: {
      validate: value => {
        if (!value || value === 'your_secret_key_here') {
          return 'PLAID_SECRET_KEY is required and must not be a placeholder';
        }
        return null;
      },
    },
    PLAID_ENV: {
      validate: value => {
        const validEnvs = ['sandbox', 'development', 'production'];
        if (!value || !validEnvs.includes(value.toLowerCase())) {
          return `PLAID_ENV must be one of: ${validEnvs.join(', ')}`;
        }
        return null;
      },
    },
  };

  // Optional but recommended variables
  const recommended = {
    JWT_SECRET: {
      validate: value => {
        if (!value || value === 'your_jwt_secret_key_here') {
          return 'JWT_SECRET should be set (auto-generated if missing)';
        }
        if (value.length < 32) {
          return 'JWT_SECRET should be at least 32 characters long';
        }
        return null;
      },
      warning: true,
    },
    ENCRYPTION_KEY: {
      validate: value => {
        if (!value || value === 'your_encryption_key_here') {
          return 'ENCRYPTION_KEY should be set (auto-generated if missing)';
        }
        // Should be 64 hex characters (32 bytes)
        if (!/^[0-9a-fA-F]{64}$/.test(value)) {
          return 'ENCRYPTION_KEY must be exactly 64 hexadecimal characters';
        }
        return null;
      },
      warning: true,
    },
  };

  // Optional variables with format validation
  const optional = {
    PORT: {
      validate: value => {
        if (value) {
          const port = parseInt(value, 10);
          if (isNaN(port) || port < 1 || port > 65535) {
            return 'PORT must be a number between 1 and 65535';
          }
        }
        return null;
      },
    },
    NODE_ENV: {
      validate: value => {
        if (value) {
          const validEnvs = ['development', 'production', 'test'];
          if (!validEnvs.includes(value.toLowerCase())) {
            return `NODE_ENV should be one of: ${validEnvs.join(', ')}`;
          }
        }
        return null;
      },
    },
    AUTH_REQUIRED: {
      validate: value => {
        if (value) {
          const lower = value.toLowerCase();
          if (!['true', 'false', '1', '0', ''].includes(lower)) {
            return "AUTH_REQUIRED must be 'true', 'false', '1', '0', or empty";
          }
        }
        return null;
      },
    },
    ALLOWED_ORIGINS: {
      validate: value => {
        if (value) {
          // Should be comma-separated URLs
          const origins = value.split(',').map(o => o.trim());
          for (const origin of origins) {
            try {
              // eslint-disable-next-line no-undef
              new URL(origin);
            } catch {
              return `Invalid URL in ALLOWED_ORIGINS: ${origin}`;
            }
          }
        }
        return null;
      },
    },
  };

  // Validate required variables
  for (const [key, config] of Object.entries(required)) {
    const value = process.env[key];
    const error = config.validate(value);
    if (error) {
      errors.push(`${key}: ${error}`);
    }
  }

  // Validate recommended variables
  for (const [key, config] of Object.entries(recommended)) {
    const value = process.env[key];
    const error = config.validate(value);
    if (error) {
      if (config.warning) {
        warnings.push(`${key}: ${error}`);
      } else {
        errors.push(`${key}: ${error}`);
      }
    }
  }

  // Validate optional variables
  for (const [key, config] of Object.entries(optional)) {
    const value = process.env[key];
    const error = config.validate(value);
    if (error) {
      warnings.push(`${key}: ${error}`);
    }
  }

  // Production-specific checks
  if (process.env.NODE_ENV === 'production') {
    if (process.env.AUTH_REQUIRED === 'false') {
      errors.push('AUTH_REQUIRED must be true in production environment for security');
    }

    if (!process.env.ALLOWED_ORIGINS) {
      warnings.push('ALLOWED_ORIGINS should be set in production to restrict CORS');
    }

    if (process.env.PLAID_ENV === 'sandbox') {
      warnings.push('PLAID_ENV is set to sandbox in production - use production keys');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates environment and logs results
 * Exits process if validation fails in production
 * @returns {boolean} True if validation passed, false otherwise
 */
function validateAndLog() {
  const result = validateEnvironment();

  // Log warnings
  if (result.warnings.length > 0) {
    logger.warn('Environment variable warnings:');
    result.warnings.forEach(warning => {
      logger.warn(`  - ${warning}`);
    });
  }

  // Log errors
  if (result.errors.length > 0) {
    logger.error('Environment variable validation failed:');
    result.errors.forEach(error => {
      logger.error(`  - ${error}`);
    });

    logger.error(
      '\nPlease check your .env file and ensure all required variables are set correctly.'
    );
    logger.error('See env.template for required variables.');

    // In production, exit on validation errors
    if (process.env.NODE_ENV === 'production') {
      logger.error('Exiting due to environment validation errors in production.');
      process.exit(1);
    }

    return false;
  }

  if (result.warnings.length === 0 && result.errors.length === 0) {
    logger.info('Environment variables validated successfully.');
  }

  return result.isValid;
}

module.exports = {
  validateEnvironment,
  validateAndLog,
};
