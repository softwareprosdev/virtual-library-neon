#!/bin/bash

# Simple Production API Test Script
# Usage: ./test-production-api.sh

API_URL="${API_URL:-https://api.indexbin.com/api}"

echo "🚀 Testing Production API at: $API_URL"
echo "================================"
echo ""

# Test 1: Health Check
echo "1️⃣  Testing health endpoint..."
HEALTH=$(curl -s -w "\n%{http_code}" "$API_URL/../health" 2>/dev/null | tail -n 1)
if [ "$HEALTH" = "200" ]; then
    echo "   ✅ Health check passed (200)"
else
    echo "   ❌ Health check failed (Status: $HEALTH)"
fi
echo ""

# Test 2: Registration
echo "2️⃣  Testing registration..."
TIMESTAMP=$(date +%s)
EMAIL="test${TIMESTAMP}@example.com"
PASSWORD="SecurePass123"

REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"name\": \"Test User\",
    \"ageVerified\": true
  }")

REGISTER_STATUS=$(echo "$REGISTER_RESPONSE" | tail -n 1)
REGISTER_BODY=$(echo "$REGISTER_RESPONSE" | sed '$d')

if [ "$REGISTER_STATUS" = "201" ]; then
    echo "   ✅ Registration successful (201)"
    TOKEN=$(echo "$REGISTER_BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "   📝 Token: ${TOKEN:0:20}..."
else
    echo "   ❌ Registration failed (Status: $REGISTER_STATUS)"
    echo "   Response: $REGISTER_BODY"
fi
echo ""

# Test 3: Login (if registration succeeded)
if [ "$REGISTER_STATUS" = "201" ]; then
    echo "3️⃣  Testing login with same credentials..."
    LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/login" \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$EMAIL\",
        \"password\": \"$PASSWORD\"
      }")

    LOGIN_STATUS=$(echo "$LOGIN_RESPONSE" | tail -n 1)
    LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

    if [ "$LOGIN_STATUS" = "200" ]; then
        echo "   ✅ Login successful (200)"
    else
        echo "   ❌ Login failed (Status: $LOGIN_STATUS)"
        echo "   Response: $LOGIN_BODY"
    fi
    echo ""

    # Test 4: Protected route
    if [ -n "$TOKEN" ]; then
        echo "4️⃣  Testing protected route (/auth/me)..."
        ME_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/auth/me" \
          -H "Authorization: Bearer $TOKEN")

        ME_STATUS=$(echo "$ME_RESPONSE" | tail -n 1)
        ME_BODY=$(echo "$ME_RESPONSE" | sed '$d')

        if [ "$ME_STATUS" = "200" ]; then
            echo "   ✅ Protected route successful (200)"
            echo "   User data: $ME_BODY"
        else
            echo "   ❌ Protected route failed (Status: $ME_STATUS)"
            echo "   Response: $ME_BODY"
        fi
        echo ""
    fi
fi

# Test 5: Invalid email format
echo "5️⃣  Testing validation (invalid email)..."
INVALID_EMAIL_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"invalid-email\",
    \"password\": \"SecurePass123\",
    \"name\": \"Test User\",
    \"ageVerified\": true
  }")

INVALID_EMAIL_STATUS=$(echo "$INVALID_EMAIL_RESPONSE" | tail -n 1)
INVALID_EMAIL_BODY=$(echo "$INVALID_EMAIL_RESPONSE" | sed '$d')

if [ "$INVALID_EMAIL_STATUS" = "400" ]; then
    echo "   ✅ Correctly rejected invalid email (400)"
else
    echo "   ❌ Should reject invalid email (Status: $INVALID_EMAIL_STATUS)"
    echo "   Response: $INVALID_EMAIL_BODY"
fi
echo ""

# Test 6: Short password
echo "6️⃣  Testing validation (short password)..."
SHORT_PASSWORD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"test@example.com\",
    \"password\": \"short\",
    \"name\": \"Test User\",
    \"ageVerified\": true
  }")

SHORT_PASSWORD_STATUS=$(echo "$SHORT_PASSWORD_RESPONSE" | tail -n 1)
SHORT_PASSWORD_BODY=$(echo "$SHORT_PASSWORD_RESPONSE" | sed '$d')

if [ "$SHORT_PASSWORD_STATUS" = "400" ]; then
    echo "   ✅ Correctly rejected short password (400)"
else
    echo "   ❌ Should reject short password (Status: $SHORT_PASSWORD_STATUS)"
    echo "   Response: $SHORT_PASSWORD_BODY"
fi
echo ""

echo "================================"
echo "✅ API Test Complete"
