#!/bin/bash
# Health Check Test Script
# Tests all health check endpoints

set -e

BASE_URL="${1:-http://localhost:3000}"

echo "🏥 Testing Health Check Endpoints"
echo "=================================="
echo "Base URL: $BASE_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test basic health check
echo "1. Testing GET /api/health"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/health" || echo -e "\n000")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Status: $HTTP_CODE${NC}"
    echo "   Response: $(echo "$BODY" | jq -r '.status // "unknown"' 2>/dev/null || echo "healthy")"
else
    echo -e "${RED}❌ Status: $HTTP_CODE${NC}"
    echo "   Response: $BODY"
fi
echo ""

# Test detailed health check
echo "2. Testing GET /api/health/detailed"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/health/detailed" || echo -e "\n000")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Status: $HTTP_CODE${NC}"
    if command -v jq &> /dev/null; then
        echo "   Status: $(echo "$BODY" | jq -r '.status')"
        echo "   Checks: $(echo "$BODY" | jq -r '.checks | keys | join(", ")')"
    else
        echo "   Response received (install jq for formatted output)"
    fi
else
    echo -e "${RED}❌ Status: $HTTP_CODE${NC}"
fi
echo ""

# Test readiness probe
echo "3. Testing GET /api/health/ready"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/health/ready" || echo -e "\n000")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Status: $HTTP_CODE${NC}"
    if command -v jq &> /dev/null; then
        echo "   Ready: $(echo "$BODY" | jq -r '.ready')"
        echo "   Message: $(echo "$BODY" | jq -r '.message')"
    else
        echo "   Response received"
    fi
else
    echo -e "${RED}❌ Status: $HTTP_CODE${NC}"
fi
echo ""

# Test security headers
echo "4. Testing Security Headers"
HEADERS=$(curl -s -I "$BASE_URL" | grep -iE "(x-content-type-options|x-frame-options|x-xss-protection|content-security-policy)" || echo "")
if [ -n "$HEADERS" ]; then
    echo -e "${GREEN}✅ Security headers present${NC}"
    echo "$HEADERS" | sed 's/^/   /'
else
    echo -e "${YELLOW}⚠️  Security headers not found${NC}"
fi
echo ""

echo "=================================="
echo -e "${GREEN}✅ Health check tests complete!${NC}"
echo ""

