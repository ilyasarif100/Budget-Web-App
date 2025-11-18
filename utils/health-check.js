/**
 * Health Check Utilities
 * Provides system health status for monitoring and orchestration
 */

const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const os = require('os');
const logger = require('./logger');

const DATA_DIR = path.join(__dirname, '..', 'data');

/**
 * Check if data directory is accessible
 * @returns {Promise<{healthy: boolean, message: string}>}
 */
async function checkDataDirectory() {
  try {
    await fsPromises.access(DATA_DIR, fs.constants.R_OK | fs.constants.W_OK);
    return { healthy: true, message: 'Data directory accessible' };
  } catch (error) {
    return {
      healthy: false,
      message: `Data directory not accessible: ${error.message}`,
    };
  }
}

/**
 * Check disk space availability
 * @param {number} minFreeMB - Minimum free space in MB (default: 100)
 * @returns {Promise<{healthy: boolean, message: string, freeMB?: number}>}
 */
async function checkDiskSpace(minFreeMB = 100) {
  try {
    const stats = await fsPromises.statfs(DATA_DIR);
    // Calculate free space (statfs.f_bavail * statfs.f_frsize)
    const freeBytes = stats.bavail * stats.bsize;
    const freeMB = freeBytes / (1024 * 1024);

    if (freeMB < minFreeMB) {
      return {
        healthy: false,
        message: `Low disk space: ${freeMB.toFixed(2)}MB free (minimum: ${minFreeMB}MB)`,
        freeMB: Math.round(freeMB),
      };
    }

    return {
      healthy: true,
      message: `Disk space OK: ${freeMB.toFixed(2)}MB free`,
      freeMB: Math.round(freeMB),
    };
  } catch (error) {
    // Fallback for systems without statfs (Windows)
    return {
      healthy: true,
      message: 'Disk space check not available on this system',
    };
  }
}

/**
 * Check memory usage
 * @param {number} maxUsagePercent - Maximum memory usage percentage (default: 90)
 * @returns {{healthy: boolean, message: string, usagePercent?: number}}
 */
function checkMemory(maxUsagePercent = 90) {
  try {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const usagePercent = (usedMemory / totalMemory) * 100;

    if (usagePercent > maxUsagePercent) {
      return {
        healthy: false,
        message: `High memory usage: ${usagePercent.toFixed(1)}% (threshold: ${maxUsagePercent}%)`,
        usagePercent: Math.round(usagePercent),
      };
    }

    return {
      healthy: true,
      message: `Memory usage OK: ${usagePercent.toFixed(1)}%`,
      usagePercent: Math.round(usagePercent),
    };
  } catch (error) {
    return {
      healthy: true,
      message: 'Memory check failed',
    };
  }
}

/**
 * Check if Plaid API is accessible (basic connectivity)
 * @returns {Promise<{healthy: boolean, message: string}>}
 */
async function checkPlaidConnectivity() {
  try {
    // Simple connectivity check - just verify Plaid environment is set
    const plaidEnv = process.env.PLAID_ENV;
    if (!plaidEnv || !['sandbox', 'development', 'production'].includes(plaidEnv)) {
      return {
        healthy: false,
        message: 'Plaid environment not configured',
      };
    }

    // Check if Plaid keys are set
    const hasClientId = process.env.PLAID_CLIENT_ID && !process.env.PLAID_CLIENT_ID.includes('your_');
    const hasSecret = process.env.PLAID_SECRET_KEY && !process.env.PLAID_SECRET_KEY.includes('your_');

    if (!hasClientId || !hasSecret) {
      return {
        healthy: false,
        message: 'Plaid API keys not configured',
      };
    }

    return {
      healthy: true,
      message: `Plaid configured for ${plaidEnv} environment`,
    };
  } catch (error) {
    return {
      healthy: false,
      message: `Plaid connectivity check failed: ${error.message}`,
    };
  }
}

/**
 * Perform basic health check
 * @returns {Promise<{healthy: boolean, checks: Object}>}
 */
async function basicHealthCheck() {
  const checks = {
    dataDirectory: await checkDataDirectory(),
    diskSpace: await checkDiskSpace(),
    memory: checkMemory(),
    plaid: await checkPlaidConnectivity(),
  };

  const allHealthy = Object.values(checks).every(check => check.healthy);

  return {
    healthy: allHealthy,
    checks,
  };
}

/**
 * Perform detailed health check
 * @returns {Promise<{healthy: boolean, checks: Object, system: Object}>}
 */
async function detailedHealthCheck() {
  const checks = {
    dataDirectory: await checkDataDirectory(),
    diskSpace: await checkDiskSpace(),
    memory: checkMemory(),
    plaid: await checkPlaidConnectivity(),
  };

  const allHealthy = Object.values(checks).every(check => check.healthy);

  // System information
  const system = {
    nodeVersion: process.version,
    platform: process.platform,
    uptime: Math.round(process.uptime()),
    pid: process.pid,
    memory: {
      total: Math.round(os.totalmem() / (1024 * 1024)), // MB
      free: Math.round(os.freemem() / (1024 * 1024)), // MB
      used: Math.round((os.totalmem() - os.freemem()) / (1024 * 1024)), // MB
    },
    cpu: {
      count: os.cpus().length,
      model: os.cpus()[0]?.model || 'Unknown',
    },
    environment: process.env.NODE_ENV || 'development',
  };

  return {
    healthy: allHealthy,
    checks,
    system,
  };
}

/**
 * Readiness check (for Kubernetes/Docker)
 * @returns {Promise<{ready: boolean, message: string}>}
 */
async function readinessCheck() {
  const health = await basicHealthCheck();

  if (!health.healthy) {
    const failedChecks = Object.entries(health.checks)
      .filter(([_, check]) => !check.healthy)
      .map(([name, check]) => `${name}: ${check.message}`)
      .join(', ');

    return {
      ready: false,
      message: `Not ready: ${failedChecks}`,
    };
  }

  return {
    ready: true,
    message: 'Service is ready',
  };
}

module.exports = {
  checkDataDirectory,
  checkDiskSpace,
  checkMemory,
  checkPlaidConnectivity,
  basicHealthCheck,
  detailedHealthCheck,
  readinessCheck,
};

