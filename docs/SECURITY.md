# Security Documentation

**Last Updated:** November 17, 2025

---

## Overview

This document describes the security measures implemented in the Budget Tracker application, security best practices, and incident response procedures.

---

## Security Features

### ✅ Implemented Security Measures

1. **Encrypted Token Storage**
   - Plaid access tokens encrypted at rest using AES-256-CBC
   - Encryption key stored in `.env` (never committed to git)
   - File permissions set to 600 (owner read/write only)

2. **Authentication**
   - JWT-based authentication system
   - Password hashing with bcrypt (10 rounds)
   - Token expiration and validation
   - Optional authentication (can be disabled for local use)

3. **Security Headers (Helmet.js)**
   - Content Security Policy (CSP)
   - HTTP Strict Transport Security (HSTS) in production
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY
   - X-XSS-Protection: enabled
   - Referrer-Policy: strict-origin-when-cross-origin
   - Permissions-Policy configured

4. **CORS Protection**
   - Restricted origins in production
   - Configurable via `ALLOWED_ORIGINS` environment variable
   - Credentials support for authenticated requests

5. **Rate Limiting**
   - General API: 100 requests per 15 minutes per IP
   - Authentication: 5 requests per 15 minutes per IP
   - Plaid endpoints: 10 requests per minute per IP
   - Prevents brute force attacks and API abuse

6. **Input Validation & Sanitization**
   - Email validation
   - Password strength requirements
   - Input sanitization (removes control characters)
   - File path validation (prevents directory traversal)

7. **HTTPS Enforcement**
   - Automatic HTTPS redirect in production
   - HSTS headers with preload support

8. **Request Size Limits**
   - JSON payloads: 10MB max
   - URL-encoded: 10MB max
   - Prevents DoS attacks via large payloads

9. **Process Security**
   - Warnings if running as root user
   - Security checks on startup

10. **Environment Variable Validation**
    - Validates all required variables on startup
    - Exits in production if validation fails
    - Warns in development

---

## Production Security Checklist

Before deploying to production, ensure:

- [ ] `NODE_ENV=production` is set
- [ ] `AUTH_REQUIRED=true` is set
- [ ] Strong `JWT_SECRET` (minimum 64 characters)
- [ ] Strong `ENCRYPTION_KEY` (exactly 64 hex characters)
- [ ] Production Plaid keys (not sandbox)
- [ ] `ALLOWED_ORIGINS` configured with your domain(s)
- [ ] HTTPS/TLS certificate configured
- [ ] Server running as non-root user
- [ ] File permissions set correctly (`.env` and `data/` directory)
- [ ] Rate limiting enabled (default: enabled)
- [ ] Security headers enabled (default: enabled)
- [ ] Regular backups of `data/` directory
- [ ] `.env` file not accessible via web server

---

## Security Headers

### Content Security Policy (CSP)

The application uses a strict CSP in production:

```
default-src 'self'
script-src 'self' 'unsafe-inline' https://cdn.plaid.com
style-src 'self' 'unsafe-inline'
img-src 'self' data: https:
connect-src 'self' https://*.plaid.com
frame-src https://cdn.plaid.com
font-src 'self' data:
object-src 'none'
base-uri 'self'
form-action 'self'
frame-ancestors 'none'
```

**Note:** `'unsafe-inline'` is required for Plaid Link SDK compatibility. This is a known limitation.

### HTTP Strict Transport Security (HSTS)

In production:
- Max age: 1 year (31536000 seconds)
- Include subdomains: Yes
- Preload: Enabled

---

## Rate Limiting

### General API Endpoints
- **Limit:** 100 requests per 15 minutes per IP
- **Applies to:** All `/api/` routes

### Authentication Endpoints
- **Limit:** 5 requests per 15 minutes per IP
- **Applies to:** `/api/auth/` routes
- **Purpose:** Prevent brute force attacks

### Plaid Endpoints
- **Limit:** 10 requests per minute per IP
- **Applies to:** `/api/link/`, `/api/accounts/`, `/api/transactions/`
- **Purpose:** Prevent API abuse and cost overruns

### Customization

To customize rate limits, edit `server.js`:

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Time window
  max: 100, // Max requests per window
});
```

---

## Encryption

### Token Encryption

Plaid access tokens are encrypted using:
- **Algorithm:** AES-256-CBC
- **Key:** 32 bytes (256 bits) from `ENCRYPTION_KEY`
- **IV:** Random 16 bytes per encryption
- **Format:** `iv:encryptedData` (both hex-encoded)

### Key Management

**DO NOT:**
- Commit encryption keys to git
- Share encryption keys
- Use weak or predictable keys
- Store keys in code

**DO:**
- Generate keys using secure random number generator
- Store keys in `.env` file (excluded from git)
- Use different keys for each environment
- Rotate keys periodically
- Backup keys securely (separate from data)

### Key Generation

```bash
# Generate JWT_SECRET (64 bytes = 128 hex characters)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate ENCRYPTION_KEY (32 bytes = 64 hex characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Authentication

### JWT Tokens

- **Algorithm:** HS256 (HMAC SHA-256)
- **Secret:** From `JWT_SECRET` environment variable
- **Expiration:** Configured per token
- **Storage:** Client-side (localStorage)

### Password Requirements

- Minimum 8 characters
- Maximum 128 characters
- Must contain at least one letter
- Must contain at least one number

### Password Hashing

- **Algorithm:** bcrypt
- **Rounds:** 10 (configurable)
- **Salt:** Auto-generated by bcrypt

---

## Input Validation

### Email Validation
- Format validation (RFC 5322 compliant)
- Maximum length: 254 characters
- Trimmed and normalized

### Password Validation
- Length: 8-128 characters
- Must contain letter and number
- No other restrictions (to avoid user frustration)

### Input Sanitization
- Removes null bytes (`\x00`)
- Removes control characters (`\x00-\x1F`, `\x7F`)
- Trims whitespace

### File Path Validation
- Prevents directory traversal attacks
- Validates against base directory
- Rejects null bytes and absolute paths outside base

---

## CORS Configuration

### Development
- Allows all origins (for flexibility)
- Allows requests with no origin

### Production
- Restricted to `ALLOWED_ORIGINS` environment variable
- Must be comma-separated list of URLs
- Example: `https://yourdomain.com,https://www.yourdomain.com`

### Configuration

Set in `.env`:
```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## File Permissions

### Recommended Permissions

- `.env` file: `600` (owner read/write only)
- `data/` directory: `700` (owner read/write/execute only)
- `data/tokens.json`: `600` (owner read/write only)
- `data/users.json`: `600` (owner read/write only)

### Setting Permissions

**Linux/Mac:**
```bash
chmod 600 .env
chmod 700 data/
chmod 600 data/*.json
```

**Windows:**
- Use file properties to restrict access
- Ensure only your user account has access

---

## Security Best Practices

### 1. Environment Variables

- Never commit `.env` to git
- Use different keys for each environment
- Rotate keys periodically
- Store production keys securely

### 2. Dependencies

- Keep dependencies up to date
- Review security advisories regularly
- Use `npm audit` to check for vulnerabilities
- Pin dependency versions in production

### 3. Logging

- Don't log sensitive information (passwords, tokens)
- Use structured logging (Winston)
- Monitor logs for suspicious activity
- Rotate log files regularly

### 4. Backups

- Backup `data/` directory regularly
- Encrypt backups if stored off-site
- Test backup restoration
- Store backups securely

### 5. Monitoring

- Monitor failed authentication attempts
- Monitor rate limit violations
- Monitor error rates
- Set up alerts for suspicious activity

### 6. Updates

- Keep Node.js updated
- Keep dependencies updated
- Review security patches
- Test updates in staging first

---

## Incident Response

### If Security Breach Suspected

1. **Immediately:**
   - Rotate all encryption keys
   - Rotate JWT secret
   - Revoke all Plaid access tokens
   - Change all user passwords

2. **Investigate:**
   - Review server logs
   - Check for unauthorized access
   - Identify affected users/data
   - Document the incident

3. **Remediate:**
   - Fix security vulnerability
   - Update affected systems
   - Notify affected users (if required)
   - Update security measures

4. **Prevent:**
   - Review security measures
   - Update security documentation
   - Conduct security audit
   - Implement additional safeguards

### Security Contact

For security issues:
1. Review this documentation
2. Check logs for details
3. Document the issue
4. Implement fixes
5. Update this document

---

## Known Security Considerations

### 1. Plaid Link SDK

- Requires `'unsafe-inline'` in CSP for scripts
- Requires `'unsafe-inline'` in CSP for styles
- Uses iframe for secure connection
- This is a known limitation of Plaid's SDK

### 2. Local Development

- Authentication can be disabled (`AUTH_REQUIRED=false`)
- CORS allows all origins
- Security headers relaxed
- **Never use development settings in production**

### 3. File-Based Storage

- Tokens stored in encrypted files (not database)
- Suitable for single-user or small deployments
- For multi-user production, consider database storage

### 4. Memory Security

- JavaScript cannot fully clear strings from memory
- Tokens decrypted only when needed
- Minimize time sensitive data exists in memory

---

## Security Testing

### Manual Testing

1. **Test rate limiting:**
   - Make multiple rapid requests
   - Verify rate limit responses

2. **Test authentication:**
   - Try invalid credentials
   - Verify rate limiting on auth endpoints

3. **Test input validation:**
   - Try SQL injection (should be safe - no SQL)
   - Try XSS attacks (should be sanitized)
   - Try path traversal (should be blocked)

4. **Test CORS:**
   - Try requests from unauthorized origins
   - Verify CORS headers

### Automated Testing

Consider adding security tests:
- Rate limiting tests
- Authentication tests
- Input validation tests
- Security header tests

---

## Compliance

### Data Protection

- Plaid access tokens encrypted at rest
- User passwords hashed (never stored in plain text)
- No sensitive data in logs
- Secure file permissions

### Financial Data

- Follows Plaid security best practices
- Encrypted token storage
- Secure API communication (HTTPS)
- Access control via authentication

---

## Related Documentation

- [Environment Configuration](./ENVIRONMENT.md)
- [Production Deployment](./PRODUCTION.md)
- [Backup and Recovery](./BACKUP.md)

---

## Security Updates

This document should be updated when:
- New security features are added
- Security vulnerabilities are discovered
- Security best practices change
- Compliance requirements change

**Last Reviewed:** November 17, 2025

