# How to Clear HSTS (HTTP Strict Transport Security) Cache

If you're seeing `ERR_SSL_PROTOCOL_ERROR` on localhost, your browser has cached HSTS settings that force HTTPS. Here's how to clear it:

## Chrome/Edge

1. **Open Chrome Settings:**
   - Go to `chrome://net-internals/#hsts`
   - Or `edge://net-internals/#hsts` for Edge

2. **Delete HSTS for localhost:**
   - Scroll down to "Delete domain security policies"
   - Enter: `localhost`
   - Click "Delete"
   - Also delete: `127.0.0.1`

3. **Clear browser cache:**
   - Press `Cmd+Shift+Delete` (Mac) or `Ctrl+Shift+Delete` (Windows)
   - Select "Cached images and files"
   - Click "Clear data"

4. **Restart browser completely**

## Firefox

1. **Open Firefox Settings:**
   - Go to `about:config`
   - Search for: `security.tls.insecure_fallback_hosts`
   - Add `localhost` and `127.0.0.1` to the list

2. **Or clear HSTS:**
   - Go to `about:networking#hsts`
   - Find `localhost` and delete it

3. **Clear cache and restart**

## Safari

1. **Clear HSTS:**
   - Close Safari completely
   - Delete: `~/Library/Cookies/HSTS.plist`
   - Restart Safari

2. **Or use Terminal:**
   ```bash
   rm ~/Library/Cookies/HSTS.plist
   killall Safari
   ```

## Quick Fix: Use Incognito/Private Window

The easiest solution is to use an **incognito/private window** which doesn't use cached HSTS:

- **Chrome/Edge:** `Cmd+Shift+N` (Mac) or `Ctrl+Shift+N` (Windows)
- **Firefox:** `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows)
- **Safari:** `Cmd+Shift+N` (Mac)

Then navigate to: `http://localhost:3000`

## Verify Server is HTTP Only

After clearing HSTS, verify the server is not sending HTTPS headers:

```bash
curl -I http://localhost:3000 | grep -i "strict-transport\|upgrade"
```

Should return nothing (no HTTPS headers).

---

**Note:** The server is now configured to NOT send HSTS or upgrade headers for localhost. Once you clear your browser's HSTS cache, the error should be resolved.

