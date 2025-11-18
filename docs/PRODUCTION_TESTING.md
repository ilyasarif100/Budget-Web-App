# Production Testing Guide

**Date:** November 17, 2025  
**Purpose:** Step-by-step guide for testing production deployment

---

## Quick Start

### 1. Run Production Readiness Test

```bash
npm run test:production
```

This script checks:
- ✅ `.env` file exists and is configured
- ✅ Production build exists
- ✅ Bundle size is optimized
- ✅ Node.js version is correct
- ✅ Server can start

### 2. Start Production Server

```bash
# Option A: Traditional deployment
NODE_ENV=production npm start

# Option B: Docker deployment
docker-compose up -d
```

### 3. Test Health Checks

```bash
# Run health check tests
npm run test:health

# Or manually:
curl http://localhost:3000/api/health
curl http://localhost:3000/api/health/detailed
curl http://localhost:3000/api/health/ready
```

---

## Detailed Testing Checklist

### Pre-Deployment Checks

- [ ] **Environment Variables**
  ```bash
  # Check .env file exists
  test -f .env && echo "✅ .env exists" || echo "❌ .env missing"
  
  # Verify no placeholder values
  grep -q "your_" .env && echo "⚠️  Contains placeholders" || echo "✅ Configured"
  ```

- [ ] **Production Build**
  ```bash
  npm run build:check
  # Should show bundle size < 100KB gzipped
  ```

- [ ] **Node.js Version**
  ```bash
  node -v
  # Should be v20.19.5 (see .nvmrc)
  ```

- [ ] **Dependencies**
  ```bash
  npm install
  # Ensure all dependencies are installed
  ```

---

### Server Startup Test

1. **Start Server**
   ```bash
   NODE_ENV=production npm start
   ```

2. **Verify Startup**
   - Check for errors in console
   - Server should start on port 3000 (or configured PORT)
   - No critical errors should appear

3. **Check Logs**
   ```bash
   tail -f logs/app.log
   # Should see successful startup messages
   ```

---

### Health Check Tests

#### Basic Health Check

```bash
curl http://localhost:3000/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-17T...",
  "checks": {
    "dataDirectory": { "healthy": true, ... },
    "diskSpace": { "healthy": true, ... },
    "memory": { "healthy": true, ... },
    "plaid": { "healthy": true, ... }
  }
}
```

**Status Codes:**
- `200` = Healthy ✅
- `503` = Unhealthy ❌

#### Detailed Health Check

```bash
curl http://localhost:3000/api/health/detailed
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "...",
  "checks": { ... },
  "system": {
    "nodeVersion": "v20.19.5",
    "platform": "...",
    "uptime": 123,
    "memory": { ... },
    "cpu": { ... }
  }
}
```

#### Readiness Probe

```bash
curl http://localhost:3000/api/health/ready
```

**Expected Response:**
```json
{
  "ready": true,
  "message": "Service is ready",
  "timestamp": "..."
}
```

**Status Codes:**
- `200` = Ready ✅
- `503` = Not Ready ❌

---

### Security Tests

#### Security Headers

```bash
curl -I http://localhost:3000
```

**Expected Headers:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1`
- `Content-Security-Policy: ...`
- `Strict-Transport-Security: ...` (production only)

#### Rate Limiting

```bash
# Test rate limiting (should fail after 5 attempts)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}' \
    -w "\nStatus: %{http_code}\n"
done
```

**Expected:**
- First 5 requests: `401` (unauthorized, but not rate limited)
- 6th request: `429` (too many requests) ✅

---

### Functionality Tests

#### 1. Frontend Loads

```bash
# Open in browser
open http://localhost:3000
# Or
curl http://localhost:3000
```

**Check:**
- [ ] Page loads without errors
- [ ] No console errors (except extension errors)
- [ ] UI is responsive
- [ ] Dark mode toggle works

#### 2. Authentication (if enabled)

- [ ] Can register new user
- [ ] Can login
- [ ] Can logout
- [ ] Protected routes require auth

#### 3. Plaid Integration

- [ ] Can open Plaid Link
- [ ] Can connect bank account
- [ ] Accounts appear in UI
- [ ] Can sync transactions

#### 4. Data Management

- [ ] Can add transactions
- [ ] Can edit transactions
- [ ] Can delete transactions
- [ ] Can create categories
- [ ] Can manage accounts
- [ ] Data persists after refresh

#### 5. Backup/Restore

- [ ] Can export data (Backup button)
- [ ] Can import data (Restore button)
- [ ] Data validates correctly
- [ ] Restore works with replace strategy
- [ ] Restore works with merge strategy

---

### Performance Tests

#### Bundle Size

```bash
npm run build:analyze
```

**Targets:**
- JavaScript: < 100KB gzipped ✅
- CSS: < 50KB gzipped ✅
- Total: < 150KB gzipped ✅

**Current:** 33.31KB gzipped ✅

#### Response Times

```bash
# Test API response times
time curl -s http://localhost:3000/api/health > /dev/null
time curl -s http://localhost:3000/api/config > /dev/null
```

**Targets:**
- Health check: < 100ms
- Config endpoint: < 50ms
- API endpoints: < 500ms

---

### Docker Tests (if using Docker)

#### Build Image

```bash
docker build -t budget-tracker:test .
```

**Check:**
- [ ] Build completes without errors
- [ ] Image size is reasonable
- [ ] No security vulnerabilities (run `docker scan`)

#### Run Container

```bash
docker-compose up -d
```

**Check:**
- [ ] Container starts successfully
- [ ] Health check passes
- [ ] Logs show no errors
- [ ] Application is accessible

#### Container Health

```bash
# Check container status
docker ps

# Check health status
docker inspect --format='{{.State.Health.Status}}' budget-tracker

# View logs
docker-compose logs -f
```

---

### Monitoring Setup

#### 1. Health Check Monitoring

**Uptime Robot:**
1. Create account at https://uptimerobot.com
2. Add new monitor
3. Type: HTTP(s)
4. URL: `http://your-domain.com/api/health`
5. Interval: 5 minutes
6. Alert contacts: Your email

**Pingdom:**
1. Create account at https://www.pingdom.com
2. Add new check
3. URL: `http://your-domain.com/api/health`
4. Interval: 1 minute
5. Alert: Email/SMS

#### 2. Log Monitoring

```bash
# Monitor logs in real-time
tail -f logs/app.log
tail -f logs/error.log

# Check for errors
grep -i error logs/app.log | tail -20
```

#### 3. Performance Monitoring

**Optional Tools:**
- New Relic
- Datadog
- Prometheus + Grafana

---

## Troubleshooting

### Server Won't Start

1. **Check environment variables:**
   ```bash
   cat .env | grep -v "^#" | grep -v "^$"
   ```

2. **Check port availability:**
   ```bash
   lsof -i :3000
   # If port is in use, change PORT in .env
   ```

3. **Check logs:**
   ```bash
   tail -50 logs/app.log
   tail -50 logs/error.log
   ```

4. **Check Node.js version:**
   ```bash
   node -v
   nvm use  # If using nvm
   ```

### Health Checks Fail

1. **Check data directory:**
   ```bash
   ls -la data/
   # Should have read/write permissions
   ```

2. **Check disk space:**
   ```bash
   df -h
   # Should have > 100MB free
   ```

3. **Check Plaid configuration:**
   ```bash
   grep PLAID .env
   # Should have valid keys (not placeholders)
   ```

### Docker Issues

1. **Container won't start:**
   ```bash
   docker-compose logs
   # Check for errors
   ```

2. **Permission errors:**
   ```bash
   sudo chown -R $USER:$USER data/ logs/
   chmod 700 data/
   chmod 755 logs/
   ```

3. **Port conflicts:**
   ```bash
   # Change port in docker-compose.yml
   ports:
     - '3001:3000'  # Use different host port
   ```

---

## Production Deployment Checklist

Before deploying to production:

- [ ] All tests pass
- [ ] Health checks working
- [ ] Security headers present
- [ ] Rate limiting working
- [ ] Environment variables configured
- [ ] Production build optimized
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] HTTPS/TLS configured
- [ ] CORS configured correctly
- [ ] File permissions set
- [ ] Logs directory exists
- [ ] Error tracking configured (optional)

---

## Post-Deployment Verification

After deployment:

1. **Verify health:**
   ```bash
   curl https://your-domain.com/api/health
   ```

2. **Test functionality:**
   - All features work
   - No console errors
   - Performance is acceptable

3. **Monitor:**
   - Watch logs for first hour
   - Check monitoring alerts
   - Verify health checks

4. **Document:**
   - Note any issues
   - Update deployment docs
   - Record configuration

---

## Quick Reference

```bash
# Production readiness test
npm run test:production

# Health check tests
npm run test:health

# Build and analyze
npm run build:check

# Start production server
NODE_ENV=production npm start

# Docker deployment
docker-compose up -d

# View logs
tail -f logs/app.log

# Check health
curl http://localhost:3000/api/health
```

---

## Related Documentation

- [Docker Deployment](./DOCKER.md)
- [Monitoring Guide](./MONITORING.md)
- [Security Guide](./SECURITY.md)
- [Build Documentation](./BUILD.md)

---

**Last Updated:** November 17, 2025

