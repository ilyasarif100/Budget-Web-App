#!/usr/bin/env node

/**
 * Backup Script for Budget Tracker
 *
 * Creates backups of critical files:
 * - .env file (environment variables)
 * - data/ directory (encrypted tokens and user data)
 *
 * Backups are stored in ~/backups/budget-tracker/ with timestamps
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BACKUP_BASE_DIR = path.join(require('os').homedir(), 'backups', 'budget-tracker');
const PROJECT_ROOT = path.resolve(__dirname, '..');
const TIMESTAMP = `${new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]}_${new Date()
  .toTimeString()
  .split(' ')[0]
  .replace(/:/g, '-')}`;

const BACKUP_DIR = path.join(BACKUP_BASE_DIR, `backup-${TIMESTAMP}`);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_BASE_DIR)) {
    fs.mkdirSync(BACKUP_BASE_DIR, { recursive: true });
    log(`Created backup base directory: ${BACKUP_BASE_DIR}`, 'blue');
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    log(`Created backup directory: ${BACKUP_DIR}`, 'blue');
  }
}

function backupFile(sourcePath, backupName) {
  const source = path.join(PROJECT_ROOT, sourcePath);
  const dest = path.join(BACKUP_DIR, backupName);

  if (!fs.existsSync(source)) {
    log(`⚠️  ${sourcePath} not found, skipping...`, 'yellow');
    return false;
  }

  try {
    fs.copyFileSync(source, dest);
    const stats = fs.statSync(source);
    log(`✅ Backed up ${sourcePath} (${(stats.size / 1024).toFixed(2)} KB)`, 'green');
    return true;
  } catch (error) {
    log(`❌ Failed to backup ${sourcePath}: ${error.message}`, 'red');
    return false;
  }
}

function backupDirectory(sourcePath, backupName) {
  const source = path.join(PROJECT_ROOT, sourcePath);
  const dest = path.join(BACKUP_DIR, backupName);

  if (!fs.existsSync(source)) {
    log(`⚠️  ${sourcePath} not found, skipping...`, 'yellow');
    return false;
  }

  try {
    // Use cp -r for directory copying (works on Unix/Mac)
    if (process.platform !== 'win32') {
      execSync(`cp -r "${source}" "${dest}"`, { stdio: 'ignore' });
    } else {
      // Windows: use xcopy or robocopy
      execSync(`xcopy "${source}" "${dest}\\*" /E /I /Y`, { stdio: 'ignore' });
    }

    const stats = getDirSize(source);
    log(`✅ Backed up ${sourcePath}/ (${(stats / 1024).toFixed(2)} KB)`, 'green');
    return true;
  } catch (error) {
    log(`❌ Failed to backup ${sourcePath}/: ${error.message}`, 'red');
    return false;
  }
}

function getDirSize(dirPath) {
  let size = 0;
  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        size += getDirSize(filePath);
      } else {
        size += stats.size;
      }
    }
  } catch (error) {
    // Ignore errors
  }
  return size;
}

function createManifest() {
  const manifest = {
    timestamp: new Date().toISOString(),
    backupLocation: BACKUP_DIR,
    files: [],
  };

  // List all files in backup directory
  try {
    const files = fs.readdirSync(BACKUP_DIR, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(BACKUP_DIR, file.name);
      const stats = fs.statSync(filePath);
      manifest.files.push({
        name: file.name,
        size: stats.size,
        isDirectory: stats.isDirectory(),
        modified: stats.mtime.toISOString(),
      });
    }
  } catch (error) {
    log(`⚠️  Could not create manifest: ${error.message}`, 'yellow');
  }

  const manifestPath = path.join(BACKUP_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  log(`✅ Created manifest: manifest.json`, 'green');
}

function main() {
  log('\n📦 Starting backup process...\n', 'blue');

  ensureBackupDir();

  let backedUp = 0;
  let skipped = 0;

  // Backup .env file
  if (backupFile('.env', 'env.backup')) {
    backedUp++;
  } else {
    skipped++;
  }

  // Backup data directory
  if (backupDirectory('data', 'data')) {
    backedUp++;
  } else {
    skipped++;
  }

  // Create manifest
  createManifest();

  // Summary
  log('\n📊 Backup Summary:', 'blue');
  log(`   ✅ Backed up: ${backedUp} item(s)`, 'green');
  if (skipped > 0) {
    log(`   ⚠️  Skipped: ${skipped} item(s)`, 'yellow');
  }
  log(`   📁 Location: ${BACKUP_DIR}\n`, 'blue');

  if (backedUp > 0) {
    log('✅ Backup completed successfully!', 'green');
  } else {
    log('⚠️  No files were backed up. Check if files exist.', 'yellow');
  }
}

// Run backup
main();
