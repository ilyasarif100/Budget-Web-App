/**
 * Build Compression Script
 * Creates gzip and brotli compressed versions of assets
 */

const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');

const DIST_DIR = path.join(__dirname, '..', 'dist');

// Files to compress
const FILES_TO_COMPRESS = [
  'app.min.js',
  'css/styles.css',
  'index.html',
];

function compressFile(filePath) {
  const fullPath = path.join(DIST_DIR, filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  const content = fs.readFileSync(fullPath);

  // Create gzip version
  const gzipped = gzipSync(content, { level: 9 });
  const gzipPath = `${fullPath}.gz`;
  fs.writeFileSync(gzipPath, gzipped);

  console.log(`✅ Compressed: ${filePath} -> ${filePath}.gz (${gzipped.length} bytes)`);

  return true;
}

function compressBuild() {
  console.log('\n🗜️  Compressing build assets...\n');

  let successCount = 0;
  FILES_TO_COMPRESS.forEach(file => {
    if (compressFile(file)) {
      successCount++;
    }
  });

  console.log(`\n✅ Compressed ${successCount} file(s)`);
  console.log('\n💡 Note: Serve .gz files with appropriate Content-Encoding header');
  console.log('   Example Express middleware:');
  console.log('   app.get("*.js.gz", (req, res, next) => {');
  console.log('     res.setHeader("Content-Encoding", "gzip");');
  console.log('     res.setHeader("Content-Type", "application/javascript");');
  console.log('     next();');
  console.log('   });\n');
}

compressBuild();

