# Monitoring Documentation

**Last Updated:** November 17, 2025

---

## Overview

This document describes the monitoring and health check capabilities of the Budget Tracker application, including health check endpoints, logging, and monitoring recommendations.

---

## Health Check Endpoints

### Basic Health Check

**Endpoint:** `GET /api/health`

**Description:** Basic health check for service availability

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-17T12:00:00.000Z",
  "checks": {
    "dataDirectory": {
      "healthy": true,
      "message": "Data directory accessible"
    },
    "diskSpace": {
      "healthy": true,
      "message": "Disk space OK: 5000MB free",
      "freeMB": 5000
    },
    "memory": {
      "healthy": true,
      "message": "Memory usage OK: 45.2%",
      "usagePercent": 45
    },
    "plaid": {
      "healthy": true,
      "message": "Plaid configured for sandbox environment"
    }
  }
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "unhealthy",
  "timestamp": "2025-11-17T12:00:00.000Z",
  "checks": {
    "dataDirectory": {
      "healthy": false,
      "message": "Data directory not accessible: EACCES"
    }
  }
}
```

**Use Cases:**
- Load balancer health checks
- Basic service monitoring
- Uptime monitoring

---

### Detailed Health Check

**Endpoint:** `GET /api/health/detailed`

**Description:** Detailed health check with system information

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-17T12:00:00.000Z",
  "checks": {
    "dataDirectory": { "healthy": true, "message": "..." },
    "diskSpace": { "healthy": true, "message": "...", "freeMB": 5000 },
    "memory": { "healthy": true, "message": "...", "usagePercent": 45 },
    "plaid": { "healthy": true, "message": "..." }
  },
  "system": {
    "nodeVersion": "v20.19.5",
    "platform": "linux",
    "uptime": 3600,
    "pid": 12345,
    "memory": {
      "total": 8192,
      "free": 4096,
      "used": 4096
    },
    "cpu": {
      "count": 4,
      "model": "Intel Core i7"
    },
    "environment": "production"
  }
}
```

**Use Cases:**
- Detailed system monitoring
- Debugging performance issues
- Capacity planning
- System diagnostics

---

### Readiness Probe

**Endpoint:** `GET /api/health/ready`

**Description:** Kubernetes/Docker readiness probe

**Response (200 OK):**
```json
{
  "ready": true,
  "message": "Service is ready",
  "timestamp": "2025-11-17T12:00:00.000Z"
}
```

**Response (503 Service Unavailable):**
```json
{
  "ready": false,
  "message": "Not ready: dataDirectory: Data directory not accessible",
  "timestamp": "2025-11-17T12:00:00.000Z"
}
```

**Use Cases:**
- Kubernetes readiness probes
- Docker health checks
- Deployment orchestration
- Service startup verification

---

## Health Check Components

### Data Directory Check

- **What it checks:** File system access to `data/` directory
- **Failure conditions:** Directory not accessible, permission denied
- **Impact:** Service cannot read/write user data or tokens

### Disk Space Check

- **What it checks:** Available disk space
- **Threshold:** 100MB minimum (configurable)
- **Failure conditions:** Less than 100MB free
- **Impact:** Service may fail to write data

### Memory Check

- **What it checks:** System memory usage
- **Threshold:** 90% maximum (configurable)
- **Failure conditions:** Memory usage exceeds 90%
- **Impact:** Service may become unresponsive

### Plaid Connectivity Check

- **What it checks:** Plaid API configuration
- **Failure conditions:** Missing or invalid Plaid keys
- **Impact:** Cannot connect bank accounts

---

## Logging

### Structured Logging

The application uses Winston for structured logging:

**Log Files:**
- `logs/app.log` - All application logs
- `logs/error.log` - Error logs only
- `logs/exceptions.log` - Uncaught exceptions
- `logs/rejections.log` - Unhandled promise rejections

**Log Levels:**
- `error` - Error conditions
- `warn` - Warning conditions
- `info` - Informational messages
- `debug` - Debug messages (development only)

### Request Logging

All HTTP requests are logged with:
- Request ID (for tracking)
- Method and URL
- Status code
- Response time
- IP address
- User agent

**Example log entry:**
```json
{
  "level": "info",
  "message": "HTTP Request",
  "requestId": "abc123...",
  "method": "GET",
  "url": "/api/health",
  "statusCode": 200,
  "responseTime": "5ms",
  "ip": "127.0.0.1",
  "userAgent": "Mozilla/5.0..."
}
```

### Error Logging

Errors are logged with:
- Error message
- Stack trace
- Context information
- Request ID (if available)

**Example error log:**
```json
{
  "level": "error",
  "message": "Error message",
  "errorName": "TypeError",
  "errorMessage": "Cannot read property...",
  "errorStack": "...",
  "context": "Health Check",
  "requestId": "abc123..."
}
```

---

## Monitoring Recommendations

### 1. Health Check Monitoring

**Setup:**
- Monitor `/api/health` endpoint every 30-60 seconds
- Alert if status is not "healthy" for > 2 minutes
- Monitor `/api/health/ready` for deployment orchestration

**Tools:**
- Uptime Robot
- Pingdom
- Datadog
- New Relic
- Custom monitoring script

### 2. Log Monitoring

**Setup:**
- Aggregate logs from `logs/` directory
- Monitor error rates
- Alert on critical errors
- Track response times

**Tools:**
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Splunk
- Datadog Logs
- CloudWatch Logs
- Papertrail

### 3. Performance Monitoring

**Metrics to Track:**
- Response times (p50, p95, p99)
- Request rates
- Error rates
- Memory usage
- CPU usage
- Disk I/O

**Tools:**
- New Relic
- Datadog APM
- Prometheus + Grafana
- CloudWatch Metrics

### 4. Alerting

**Recommended Alerts:**

1. **Service Down**
   - Condition: Health check fails for > 2 minutes
   - Severity: Critical
   - Action: Page on-call engineer

2. **High Error Rate**
   - Condition: Error rate > 5% for 5 minutes
   - Severity: High
   - Action: Notify team

3. **High Memory Usage**
   - Condition: Memory usage > 90% for 10 minutes
   - Severity: Medium
   - Action: Investigate memory leaks

4. **Low Disk Space**
   - Condition: Free space < 100MB
   - Severity: High
   - Action: Clean up or expand storage

5. **Rate Limit Violations**
   - Condition: Multiple 429 responses
   - Severity: Medium
   - Action: Review rate limit configuration

---

## Kubernetes/Docker Integration

### Kubernetes Deployment

**Liveness Probe:**
```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

**Readiness Probe:**
```yaml
readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

### Docker Health Check

**Dockerfile:**
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1
```

---

## Custom Monitoring Scripts

### Example: Simple Health Check Script

```bash
#!/bin/bash
# health-check.sh

HEALTH_URL="http://localhost:3000/api/health"
MAX_RETRIES=3
RETRY_DELAY=5

for i in $(seq 1 $MAX_RETRIES); do
  response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)
  
  if [ "$response" = "200" ]; then
    echo "Health check passed"
    exit 0
  fi
  
  echo "Health check failed (attempt $i/$MAX_RETRIES)"
  sleep $RETRY_DELAY
done

echo "Health check failed after $MAX_RETRIES attempts"
exit 1
```

### Example: Node.js Monitoring Script

```javascript
const http = require('http');

async function checkHealth() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3000/api/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const health = JSON.parse(data);
        resolve(health.status === 'healthy');
      });
    });
    
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

// Run check every 60 seconds
setInterval(async () => {
  try {
    const healthy = await checkHealth();
    console.log(`Health check: ${healthy ? 'OK' : 'FAILED'}`);
  } catch (error) {
    console.error('Health check error:', error.message);
  }
}, 60000);
```

---

## Metrics Collection

### Request Metrics

The application logs request metrics that can be collected:

- **Request count:** Total requests per endpoint
- **Response times:** P50, P95, P99 percentiles
- **Error rates:** Errors per endpoint
- **Status codes:** Distribution of HTTP status codes

### System Metrics

Available via `/api/health/detailed`:

- **Memory:** Total, free, used (MB)
- **CPU:** Count, model
- **Disk:** Free space (MB)
- **Uptime:** Process uptime (seconds)

### Custom Metrics

Consider adding:
- Plaid API call counts
- Transaction sync success/failure rates
- Authentication success/failure rates
- Database operation times

---

## Troubleshooting

### Health Check Fails

1. **Check logs:**
   ```bash
   tail -f logs/app.log
   tail -f logs/error.log
   ```

2. **Check specific component:**
   ```bash
   curl http://localhost:3000/api/health/detailed
   ```

3. **Verify environment:**
   - Check `.env` file exists
   - Verify environment variables are set
   - Check file permissions

4. **Check system resources:**
   - Disk space: `df -h`
   - Memory: `free -h` (Linux) or `vm_stat` (Mac)
   - Process: `ps aux | grep node`

### High Memory Usage

1. **Check for memory leaks:**
   - Monitor memory over time
   - Review code for closures holding references
   - Check for large data structures

2. **Review logs:**
   - Look for repeated errors
   - Check for large request payloads

3. **Consider:**
   - Restart service periodically
   - Increase available memory
   - Optimize data structures

### Disk Space Issues

1. **Check disk usage:**
   ```bash
   du -sh data/
   du -sh logs/
   ```

2. **Clean up:**
   - Rotate old log files
   - Remove old backups
   - Archive old data

3. **Monitor:**
   - Set up alerts for low disk space
   - Automate log rotation
   - Regular cleanup scripts

---

## Best Practices

1. **Monitor Health Checks:**
   - Set up automated monitoring
   - Configure alerts
   - Review health status regularly

2. **Log Management:**
   - Rotate logs regularly
   - Archive old logs
   - Monitor log sizes

3. **Metrics Collection:**
   - Collect key metrics
   - Set up dashboards
   - Track trends over time

4. **Alerting:**
   - Set appropriate thresholds
   - Avoid alert fatigue
   - Escalate critical issues

5. **Documentation:**
   - Document monitoring setup
   - Keep runbooks updated
   - Document troubleshooting steps

---

## Related Documentation

- [Production Deployment](./PRODUCTION.md)
- [Security Documentation](./SECURITY.md)
- [Environment Configuration](./ENVIRONMENT.md)

---

## Monitoring Tools Comparison

| Tool | Type | Best For |
|------|------|----------|
| Uptime Robot | Uptime | Simple uptime monitoring |
| Pingdom | Uptime | Website monitoring |
| Datadog | Full Stack | Comprehensive monitoring |
| New Relic | APM | Application performance |
| Prometheus | Metrics | Self-hosted metrics |
| Grafana | Visualization | Metrics visualization |
| ELK Stack | Logging | Log aggregation and analysis |

---

## Next Steps

1. Set up health check monitoring
2. Configure log aggregation
3. Set up performance monitoring
4. Configure alerting
5. Create monitoring dashboards
6. Document runbooks

