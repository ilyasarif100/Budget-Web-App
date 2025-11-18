# Docker Deployment Guide

**Last Updated:** November 17, 2025

---

## Overview

This guide covers deploying the Budget Tracker application using Docker and Docker Compose for both development and production environments.

---

## Prerequisites

- Docker Engine 20.10+ or Docker Desktop
- Docker Compose 2.0+ (optional, for docker-compose)
- Basic knowledge of Docker commands

---

## Quick Start

### Production Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build and run manually
docker build -t budget-tracker .
docker run -d -p 3000:3000 --name budget-tracker budget-tracker
```

### Development Deployment

```bash
# Run with development configuration
docker-compose -f docker-compose.dev.yml up
```

---

## Dockerfile

### Production Dockerfile

The production Dockerfile uses a multi-stage build for optimization:

**Stage 1: Builder**
- Installs dependencies
- Builds production assets
- Creates optimized bundle

**Stage 2: Production**
- Copies only production dependencies
- Uses non-root user (security)
- Includes health check
- Minimal image size

**Key Features:**
- Multi-stage build (reduces final image size)
- Non-root user (security best practice)
- Health check built-in
- Alpine Linux base (smaller image)

### Development Dockerfile

The development Dockerfile:
- Includes all dependencies (dev + production)
- Installs nodemon for hot reload
- Mounts source code as volume
- Suitable for local development

---

## Docker Compose

### Production Configuration (`docker-compose.yml`)

**Features:**
- Production-optimized build
- Volume mounts for data persistence
- Health checks
- Restart policy
- Network isolation

**Usage:**
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Development Configuration (`docker-compose.dev.yml`)

**Features:**
- Hot reload with nodemon
- Source code mounted as volume
- Development dependencies included
- Faster iteration

**Usage:**
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# Stop development environment
docker-compose -f docker-compose.dev.yml down
```

---

## Environment Variables

### Required Variables

Set these in `.env` file or docker-compose.yml:

```bash
# Plaid Configuration
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET_KEY=your_secret_key
PLAID_ENV=sandbox  # or 'development' or 'production'

# Security
JWT_SECRET=your_jwt_secret_min_32_chars
ENCRYPTION_KEY=your_64_char_hex_encryption_key

# Server Configuration
NODE_ENV=production
PORT=3000

# Authentication
AUTH_REQUIRED=true  # Must be true in production

# CORS (Production)
ALLOWED_ORIGINS=https://yourdomain.com
```

### Using .env File

Create `.env` file in project root:

```bash
cp .env.example .env
# Edit .env with your values
```

Docker Compose will automatically load `.env` file.

### Passing Environment Variables

**Docker Compose:**
```yaml
environment:
  - PLAID_CLIENT_ID=${PLAID_CLIENT_ID}
  - PLAID_SECRET_KEY=${PLAID_SECRET_KEY}
```

**Docker Run:**
```bash
docker run -d \
  -p 3000:3000 \
  -e PLAID_CLIENT_ID=your_id \
  -e PLAID_SECRET_KEY=your_key \
  -e NODE_ENV=production \
  budget-tracker
```

---

## Volumes

### Data Persistence

The application requires persistent storage for:
- `data/` - Encrypted tokens and user data
- `logs/` - Application logs

**Docker Compose (automatic):**
```yaml
volumes:
  - ./data:/app/data
  - ./logs:/app/logs
```

**Docker Run (manual):**
```bash
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  budget-tracker
```

### Volume Permissions

Ensure volumes have correct permissions:

```bash
# Create directories
mkdir -p data logs

# Set permissions (Linux/Mac)
chmod 700 data
chmod 755 logs
chmod 600 data/*.json 2>/dev/null || true
```

---

## Building Images

### Production Build

```bash
# Build image
docker build -t budget-tracker:latest .

# Build with tag
docker build -t budget-tracker:v1.0.0 .

# Build with no cache
docker build --no-cache -t budget-tracker:latest .
```

### Development Build

```bash
# Build development image
docker build -f Dockerfile.dev -t budget-tracker:dev .
```

---

## Running Containers

### Production

```bash
# Run in background
docker run -d \
  --name budget-tracker \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  --env-file .env \
  --restart unless-stopped \
  budget-tracker:latest

# View logs
docker logs -f budget-tracker

# Stop container
docker stop budget-tracker

# Remove container
docker rm budget-tracker
```

### Development

```bash
# Run with hot reload
docker run -d \
  --name budget-tracker-dev \
  -p 3000:3000 \
  -v $(pwd):/app \
  -v /app/node_modules \
  --env-file .env \
  budget-tracker:dev
```

---

## Health Checks

### Built-in Health Check

The Dockerfile includes a health check:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', ...)"
```

### Check Container Health

```bash
# View health status
docker ps

# Inspect health check
docker inspect --format='{{.State.Health.Status}}' budget-tracker

# View health check logs
docker inspect --format='{{json .State.Health}}' budget-tracker | jq
```

### Manual Health Check

```bash
# From host
curl http://localhost:3000/api/health

# From container
docker exec budget-tracker curl http://localhost:3000/api/health
```

---

## Networking

### Default Network

Docker Compose creates a bridge network automatically.

### Custom Network

```bash
# Create network
docker network create budget-tracker-network

# Run container on network
docker run -d \
  --network budget-tracker-network \
  --name budget-tracker \
  budget-tracker:latest
```

### Port Mapping

```bash
# Map to different host port
docker run -d -p 8080:3000 budget-tracker

# Map to specific interface
docker run -d -p 127.0.0.1:3000:3000 budget-tracker
```

---

## Troubleshooting

### Container Won't Start

1. **Check logs:**
   ```bash
   docker logs budget-tracker
   ```

2. **Check environment variables:**
   ```bash
   docker exec budget-tracker env
   ```

3. **Verify health check:**
   ```bash
   docker exec budget-tracker curl http://localhost:3000/api/health
   ```

### Permission Errors

1. **Fix data directory permissions:**
   ```bash
   sudo chown -R $USER:$USER data/ logs/
   chmod 700 data/
   chmod 755 logs/
   ```

2. **Run with correct user:**
   ```bash
   docker run -u $(id -u):$(id -g) ...
   ```

### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Use different port
docker run -d -p 3001:3000 budget-tracker
```

### Out of Disk Space

```bash
# Clean up Docker
docker system prune -a

# Remove unused volumes
docker volume prune
```

### Build Fails

1. **Clear build cache:**
   ```bash
   docker builder prune
   ```

2. **Rebuild without cache:**
   ```bash
   docker build --no-cache -t budget-tracker .
   ```

---

## Production Deployment

### Best Practices

1. **Use specific image tags:**
   ```bash
   docker build -t budget-tracker:v1.0.0 .
   ```

2. **Use secrets management:**
   - Docker Secrets (Swarm)
   - Kubernetes Secrets
   - External secret managers (AWS Secrets Manager, HashiCorp Vault)

3. **Enable resource limits:**
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '1'
         memory: 512M
   ```

4. **Use reverse proxy:**
   - Nginx
   - Traefik
   - Caddy

5. **Enable logging:**
   ```yaml
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

### Example Production Setup

```yaml
version: '3.8'

services:
  budget-tracker:
    image: budget-tracker:v1.0.0
    restart: always
    ports:
      - '127.0.0.1:3000:3000'  # Only localhost
    environment:
      - NODE_ENV=production
    volumes:
      - ./data:/app/data:ro  # Read-only if possible
      - ./logs:/app/logs
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    healthcheck:
      test: ['CMD', 'node', '-e', "require('http').get('http://localhost:3000/api/health/ready', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"]
      interval: 30s
      timeout: 3s
      retries: 3
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Push Docker Image

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker build -t budget-tracker:${{ github.ref_name }} .
      
      - name: Push to registry
        run: |
          echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
          docker push budget-tracker:${{ github.ref_name }}
```

---

## Security Considerations

### Image Security

1. **Use official base images:**
   - `node:20.19.5-alpine` (official, maintained)

2. **Keep images updated:**
   ```bash
   docker pull node:20.19.5-alpine
   docker build --pull -t budget-tracker .
   ```

3. **Scan for vulnerabilities:**
   ```bash
   docker scan budget-tracker
   ```

### Container Security

1. **Run as non-root user:**
   - Already configured in Dockerfile

2. **Limit capabilities:**
   ```bash
   docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE ...
   ```

3. **Use read-only filesystem:**
   ```bash
   docker run --read-only --tmpfs /tmp ...
   ```

4. **Set resource limits:**
   - Prevents resource exhaustion attacks

---

## Backup and Restore

### Backup Data

```bash
# Backup data directory
docker exec budget-tracker tar czf /tmp/backup.tar.gz /app/data
docker cp budget-tracker:/tmp/backup.tar.gz ./backup-$(date +%Y%m%d).tar.gz

# Or from host
tar czf backup-$(date +%Y%m%d).tar.gz data/
```

### Restore Data

```bash
# Extract backup
tar xzf backup-20251117.tar.gz

# Restore to container
docker cp data/ budget-tracker:/app/
```

---

## Monitoring

### Container Metrics

```bash
# View container stats
docker stats budget-tracker

# View resource usage
docker stats --no-stream budget-tracker
```

### Log Monitoring

```bash
# Follow logs
docker logs -f budget-tracker

# View last 100 lines
docker logs --tail 100 budget-tracker

# Export logs
docker logs budget-tracker > app.log
```

---

## Related Documentation

- [Production Deployment](./PRODUCTION.md)
- [Monitoring](./MONITORING.md)
- [Security](./SECURITY.md)
- [Environment Configuration](./ENVIRONMENT.md)

---

## Quick Reference

### Common Commands

```bash
# Build
docker build -t budget-tracker .

# Run
docker-compose up -d

# Logs
docker-compose logs -f

# Stop
docker-compose down

# Restart
docker-compose restart

# Rebuild
docker-compose up -d --build

# Shell access
docker exec -it budget-tracker sh

# Health check
curl http://localhost:3000/api/health
```

---

## Next Steps

1. Set up environment variables
2. Build Docker image
3. Configure volumes for persistence
4. Set up reverse proxy (Nginx/Traefik)
5. Configure monitoring and alerting
6. Set up automated backups
7. Review security settings

