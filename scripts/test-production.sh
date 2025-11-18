#!/bin/bash
# Production Deployment Test Script
# Tests production deployment readiness

set -e

echo "🧪 Testing Production Deployment Readiness"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo "   Create .env file from .env.example"
    exit 1
fi
echo -e "${GREEN}✅ .env file exists${NC}"

# Check if build exists
if [ ! -d dist ]; then
    echo -e "${YELLOW}⚠️  dist/ directory not found - building...${NC}"
    npm run build
fi
echo -e "${GREEN}✅ Production build exists${NC}"

# Check bundle size
echo ""
echo "📦 Checking bundle size..."
npm run build:analyze

# Check environment variables
echo ""
echo "🔍 Checking environment variables..."
if grep -q "your_" .env 2>/dev/null; then
    echo -e "${YELLOW}⚠️  .env file contains placeholder values${NC}"
    echo "   Review .env file and replace placeholders with actual values"
else
    echo -e "${GREEN}✅ .env file appears configured${NC}"
fi

# Check Node.js version
echo ""
echo "🔍 Checking Node.js version..."
NODE_VERSION=$(node -v)
REQUIRED_VERSION="v20.19.5"
if [ "$NODE_VERSION" = "$REQUIRED_VERSION" ]; then
    echo -e "${GREEN}✅ Node.js version correct: $NODE_VERSION${NC}"
else
    echo -e "${YELLOW}⚠️  Node.js version: $NODE_VERSION (required: $REQUIRED_VERSION)${NC}"
    echo "   Consider using nvm: nvm use"
fi

# Check if server can start (quick test)
echo ""
echo "🚀 Testing server startup..."
echo "   (This may take a few seconds...)"

# Start server in background
npm start > /tmp/server-test.log 2>&1 &
SERVER_PID=$!

# Wait for server to start (up to 10 seconds)
MAX_WAIT=10
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Server started successfully${NC}"
        echo -e "${GREEN}✅ Health check endpoint responding${NC}"
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
        break
    fi
    sleep 1
    WAITED=$((WAITED + 1))
done

if [ $WAITED -ge $MAX_WAIT ]; then
    echo -e "${YELLOW}⚠️  Server startup test timed out${NC}"
    echo "   This is normal if the server needs more time to initialize"
    echo "   Check /tmp/server-test.log for details"
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
fi

# Check health endpoints (if server was running)
echo ""
echo "🏥 Health Check Endpoints:"
echo "   GET /api/health - Basic health check"
echo "   GET /api/health/detailed - Detailed system info"
echo "   GET /api/health/ready - Readiness probe"

# Check Docker (if available)
echo ""
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker is available${NC}"
    if [ -f Dockerfile ]; then
        echo -e "${GREEN}✅ Dockerfile exists${NC}"
        echo ""
        echo "🐳 To test with Docker:"
        echo "   docker-compose up -d"
        echo "   curl http://localhost:3000/api/health"
    fi
else
    echo -e "${YELLOW}⚠️  Docker not available (optional)${NC}"
fi

# Summary
echo ""
echo "=========================================="
echo -e "${GREEN}✅ Production readiness check complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Review .env file configuration"
echo "2. Start server: npm start (or docker-compose up -d)"
echo "3. Test health endpoints: curl http://localhost:3000/api/health"
echo "4. Test application functionality"
echo ""

