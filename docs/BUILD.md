# Build Documentation

**Last Updated:** November 17, 2025

---

## Overview

This document describes the build process, optimization techniques, and how to analyze and optimize the production bundle.

---

## Build Process

### Development Build

No build step required for development. The application runs directly from source files:

```bash
npm run dev
```

### Production Build

Create optimized production bundle:

```bash
npm run build
```

This command:

1. Minifies JavaScript with Terser
2. Copies assets (CSS, config, service worker, etc.)
3. Creates production HTML file
4. Generates source maps for debugging

**Output:** `dist/` directory with all production assets

---

## Build Scripts

### `npm run build`

Complete production build (minify + copy assets + create HTML)

### `npm run minify`

Minify JavaScript files only

### `npm run copy-assets`

Copy CSS, config, service worker, and other assets

### `npm run build-prod-html`

Create production HTML file

### `npm run build:analyze`

Analyze bundle size and provide recommendations

### `npm run build:compress`

Create gzip compressed versions of assets

### `npm run build:check`

Build and analyze in one command

---

## Bundle Analysis

### Current Bundle Size

After running `npm run build:analyze`:

```
JavaScript (minified): 125.23 KB
  Gzipped: 28.42 KB (77.3% reduction)

CSS: 29.77 KB
  Gzipped: 4.78 KB (84.0% reduction)

Total Bundle: 155 KB
  Gzipped: 33.2 KB (78.6% reduction)
```

**Status:** ✅ Excellent (< 100KB gzipped)

### Optimization Recommendations

The build analysis script provides recommendations based on bundle size:

- **< 100KB gzipped:** ✅ Good
- **100-200KB gzipped:** ⚠️ Consider code splitting
- **> 200KB gzipped:** ⚠️ Consider tree-shaking or removing dependencies

---

## Compression

### Gzip Compression

The build process can create gzip-compressed versions of assets:

```bash
npm run build:compress
```

This creates `.gz` files for:

- `app.min.js.gz`
- `css/styles.css.gz`
- `index.html.gz`

### Serving Compressed Files

To serve compressed files, configure your web server or Express middleware:

**Express Example:**

```javascript
const express = require('express');
const app = express();

// Serve gzipped files with proper headers
app.get('*.js.gz', (req, res, next) => {
  res.setHeader('Content-Encoding', 'gzip');
  res.setHeader('Content-Type', 'application/javascript');
  next();
});

app.get('*.css.gz', (req, res, next) => {
  res.setHeader('Content-Encoding', 'gzip');
  res.setHeader('Content-Type', 'text/css');
  next();
});

app.use(
  express.static('dist', {
    extensions: ['gz', 'html', 'js', 'css'],
  })
);
```

**Nginx Example:**

```nginx
location ~* \.(js|css)$ {
    gzip_static on;
    add_header Content-Encoding gzip;
}
```

---

## Optimization Techniques

### 1. Minification

JavaScript is minified using Terser with:

- Variable name mangling
- Dead code elimination
- Source map generation

### 2. Source Maps

Source maps are generated for debugging production issues:

- File: `dist/app.min.js.map`
- Not served in production (excluded from HTML)
- Useful for error tracking services

### 3. Asset Organization

Assets are organized in `dist/`:

```
dist/
├── app.min.js          # Minified JavaScript
├── app.min.js.map     # Source map (not served)
├── index.html         # Production HTML
├── css/
│   └── styles.css     # Styles
├── config.js          # Configuration
├── sw.js             # Service Worker
└── js/               # Unminified modules (for debugging)
```

---

## Build Troubleshooting

### Build Fails

**Error:** "Cannot find module 'terser'"

- **Solution:** Run `npm install`

**Error:** "Permission denied"

- **Solution:** Check file permissions on `dist/` directory

### Bundle Too Large

If bundle size exceeds recommendations:

1. **Check for unused code:**

   ```bash
   npm run build:analyze
   ```

2. **Review dependencies:**
   - Check `package.json` for unused packages
   - Consider removing large dependencies

3. **Code splitting:**
   - Split large modules into smaller chunks
   - Lazy load non-critical features

4. **Tree shaking:**
   - Use ES modules instead of CommonJS
   - Configure bundler for tree shaking

### Source Maps Not Working

Source maps are generated but may not work if:

- File paths are incorrect
- Source files moved after build
- Browser dev tools not configured

**Solution:** Ensure source files are in the same relative location as during build.

---

## Performance Metrics

### Target Metrics

- **JavaScript:** < 100KB gzipped ✅
- **CSS:** < 50KB gzipped ✅
- **Total:** < 150KB gzipped ✅

### Current Performance

- **JavaScript:** 28.42KB gzipped ✅
- **CSS:** 4.78KB gzipped ✅
- **Total:** 33.2KB gzipped ✅

**Status:** Excellent performance, well below targets.

---

## Build Configuration

### Terser Configuration

Minification is configured in `package.json`:

```json
"minify": "terser script.js js/*.js -o dist/app.min.js -c -m --source-map"
```

Options:

- `-c`: Compress
- `-m`: Mangle variable names
- `--source-map`: Generate source map

### Customization

To customize minification, edit the `minify` script in `package.json`:

```json
"minify": "terser script.js js/*.js -o dist/app.min.js -c -m --source-map --compress passes=3"
```

See [Terser documentation](https://terser.org/docs/cli-usage) for options.

---

## Continuous Integration

### Pre-deployment Checks

Before deploying, run:

```bash
npm run build:check
```

This ensures:

- Build completes successfully
- Bundle size is within limits
- All assets are present

### Automated Builds

For CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Build
  run: npm run build

- name: Analyze Bundle
  run: npm run build:analyze

- name: Check Bundle Size
  run: |
    SIZE=$(npm run build:analyze | grep "Gzipped:" | awk '{print $2}')
    if [ "$SIZE" -gt 100000 ]; then
      echo "Bundle too large!"
      exit 1
    fi
```

---

## Best Practices

1. **Always analyze after build:**

   ```bash
   npm run build:analyze
   ```

2. **Test production build locally:**

   ```bash
   npm run build
   npm start
   # Test at http://localhost:3000
   ```

3. **Keep source maps out of production:**
   - Source maps are generated but not served
   - Useful for error tracking services

4. **Monitor bundle size:**
   - Track bundle size over time
   - Set alerts for size increases

5. **Use compression:**
   - Enable gzip/brotli on server
   - Serve pre-compressed files when possible

---

## Future Optimizations

Potential future improvements:

1. **Tree shaking:**
   - Remove unused code from dependencies
   - Use ES modules throughout

2. **Code splitting:**
   - Split by route/feature
   - Lazy load non-critical features

3. **Brotli compression:**
   - Better compression than gzip
   - Requires server support

4. **HTTP/2 Server Push:**
   - Push critical assets
   - Reduce round trips

---

## Related Documentation

- [Production Deployment Guide](./PRODUCTION.md)
- [Performance Optimization](./OPTIMIZATION-RATING.md)
- [Environment Configuration](./ENVIRONMENT.md)
