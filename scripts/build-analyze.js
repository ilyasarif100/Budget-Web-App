/**
 * Build Analysis Script
 * Analyzes bundle size and provides optimization recommendations
 */

const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const MINIFIED_JS = path.join(DIST_DIR, 'app.min.js');
const CSS_FILE = path.join(DIST_DIR, 'css', 'styles.css');

function formatBytes(bytes) {
  if (bytes === 0) {return '0 Bytes';}
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100  } ${  sizes[i]}`;
}

function analyzeFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${label}: File not found`);
    return null;
  }

  const stats = fs.statSync(filePath);
  const content = fs.readFileSync(filePath);
  const gzipped = gzipSync(content);

  return {
    label,
    original: stats.size,
    gzipped: gzipped.length,
    path: filePath,
  };
}

function analyzeBuild() {
  console.log('\n📊 Build Analysis\n');
  console.log('='.repeat(60));

  const files = [
    analyzeFile(MINIFIED_JS, 'JavaScript (minified)'),
    analyzeFile(CSS_FILE, 'CSS'),
  ].filter(Boolean);

  if (files.length === 0) {
    console.log('❌ No build files found. Run `npm run build` first.');
    process.exit(1);
  }

  let totalOriginal = 0;
  let totalGzipped = 0;

  files.forEach(file => {
    totalOriginal += file.original;
    totalGzipped += file.gzipped;

    console.log(`\n${file.label}:`);
    console.log(`  Original:  ${formatBytes(file.original)}`);
    console.log(`  Gzipped:   ${formatBytes(file.gzipped)}`);
    console.log(`  Reduction: ${((1 - file.gzipped / file.original) * 100).toFixed(1)}%`);
  });

  console.log(`\n${  '='.repeat(60)}`);
  console.log('\nTotal Bundle Size:');
  console.log(`  Original:  ${formatBytes(totalOriginal)}`);
  console.log(`  Gzipped:   ${formatBytes(totalGzipped)}`);
  console.log(`  Reduction: ${((1 - totalGzipped / totalOriginal) * 100).toFixed(1)}%`);

  // Recommendations
  console.log('\n📋 Recommendations:');
  if (totalGzipped > 100 * 1024) {
    console.log('  ⚠️  Bundle size exceeds 100KB (gzipped)');
    console.log('  💡 Consider code splitting or lazy loading');
  } else {
    console.log('  ✅ Bundle size is good (< 100KB gzipped)');
  }

  if (totalGzipped > 200 * 1024) {
    console.log('  ⚠️  Bundle size exceeds 200KB (gzipped)');
    console.log('  💡 Consider tree-shaking or removing unused dependencies');
  }

  // Check for source maps
  const sourceMap = path.join(DIST_DIR, 'app.min.js.map');
  if (fs.existsSync(sourceMap)) {
    const mapSize = fs.statSync(sourceMap).size;
    console.log(`\n  📦 Source map: ${formatBytes(mapSize)}`);
    console.log('  ℹ️  Source maps are not served in production');
  }

  console.log('\n');
}

analyzeBuild();
