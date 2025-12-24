# Fix ERR_SSL_PROTOCOL_ERROR on localhost

## The Problem

Your browser has cached HSTS (HTTP Strict Transport Security) for localhost, forcing it to use HTTPS even though the server only serves HTTP.

## Quick Fix (Recommended)

### Use Incognito/Private Window

1. Open a new **incognito/private window**:
   - **Chrome/Edge:** Press `Cmd+Shift+N` (Mac) or `Ctrl+Shift+N` (Windows)
   - **Firefox:** Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows)
   - **Safari:** Press `Cmd+Shift+N` (Mac)

2. Navigate to: `http://localhost:3000`

This bypasses the HSTS cache completely.

---

## Permanent Fix: Clear HSTS Cache

### Chrome/Edge (Recommended Method)

1. **Open HSTS Settings:**
   - Type in address bar: `chrome://net-internals/#hsts`
   - (For Edge: `edge://net-internals/#hsts`)

2. **Delete localhost HSTS:**
   - Scroll down to **"Delete domain security policies"**
   - Enter: `localhost`
   - Click **"Delete"**
   - Enter: `127.0.0.1`
   - Click **"Delete"**

3. **Clear Browser Cache:**
   - Press `Cmd+Shift+Delete` (Mac) or `Ctrl+Shift+Delete` (Windows)
   - Select **"Cached images and files"**
   - Time range: **"All time"**
   - Click **"Clear data"**

4. **Close ALL browser windows completely**
5. **Restart browser**
6. **Navigate to:** `http://localhost:3000`

### Firefox

1. **Open HSTS Settings:**
   - Type in address bar: `about:networking#hsts`

2. **Delete localhost:**
   - Find `localhost` in the list
   - Click **"Delete"**

3. **Or use about:config:**
   - Go to: `about:config`
   - Search: `security.tls.insecure_fallback_hosts`
   - Add: `localhost,127.0.0.1`

4. **Clear cache and restart**

### Safari

1. **Close Safari completely**

2. **Delete HSTS file:**

   ```bash
   rm ~/Library/Cookies/HSTS.plist
   ```

3. **Or manually:**
   - Open Finder
   - Press `Cmd+Shift+G`
   - Enter: `~/Library/Cookies/`
   - Delete: `HSTS.plist`

4. **Restart Safari**

---

## Verify Server is Working

After clearing HSTS, verify the server is accessible:

```bash
curl http://localhost:3000/api/config
```

Should return JSON (not an error).

---

## Why This Happens

When a server sends HSTS headers, browsers cache them to force HTTPS for security. Even though we've disabled HSTS for localhost, your browser still has the old cache.

**The server is correctly configured** - it's not sending HSTS headers anymore. You just need to clear your browser's cache.

---

## Still Having Issues?

1. **Try a different browser** (one you haven't used for localhost)
2. **Check if server is running:**
   ```bash
   ps aux | grep "node server.js"
   ```
3. **Verify server is on HTTP (not HTTPS):**
   ```bash
   curl -I http://localhost:3000 | grep -i "strict-transport"
   ```
   Should return nothing (no HSTS header).

---

**Note:** The server configuration is correct. This is purely a browser cache issue.
