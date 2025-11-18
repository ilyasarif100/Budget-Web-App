# Budget Tracker - Production Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Build stage
FROM node:20.19.5-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application files
COPY . .

# Build production assets
RUN npm run build

# Stage 2: Production stage
FROM node:20.19.5-alpine

# Create app user (security: don't run as root)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Copy application files (excluding node_modules, dist will be from builder)
COPY server.js ./
COPY utils ./utils
COPY scripts ./scripts

# Create necessary directories
RUN mkdir -p data logs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Start application
CMD ["node", "server.js"]

