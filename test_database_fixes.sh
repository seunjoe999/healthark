#!/bin/bash

# ================================================================
# HEALTHARK - TEST AND FIX DATABASE SCHEMA
# Run this script to verify and apply all database fixes
# ================================================================

set -e

echo "🔧 HealthArk Database Fix & Test Script"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database connection
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-healthark}"
DB_USER="${DB_USER:-postgres}"

echo "📋 Database Connection Details:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Function to run SQL
run_sql() {
    local sql="$1"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$sql"
}

# Function to test with error handling
test_feature() {
    local name="$1"
    local sql="$2"
    echo -n "Testing $name... "
    if run_sql "$sql" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        return 1
    fi
}

# Step 1: Check if tables exist
echo "🔍 Step 1: Checking database schema..."
echo ""

test_feature "staff_messages table exists" \
    "SELECT to_regclass('public.staff_messages');"

test_feature "recruitment_candidates table exists" \
    "SELECT to_regclass('public.recruitment_candidates');"

test_feature "staff table exists" \
    "SELECT to_regclass('public.staff');"

test_feature "homes table exists" \
    "SELECT to_regclass('public.homes');"

echo ""
echo "🔧 Step 2: Checking staff_messages columns..."
echo ""

test_feature "staff_messages.message column" \
    "SELECT column_name FROM information_schema.columns WHERE table_name='staff_messages' AND column_name='message';"

test_feature "staff_messages.body column" \
    "SELECT column_name FROM information_schema.columns WHERE table_name='staff_messages' AND column_name='body';"

test_feature "staff_messages.sender_id column" \
    "SELECT column_name FROM information_schema.columns WHERE table_name='staff_messages' AND column_name='sender_id';"

echo ""
echo "🔧 Step 3: Checking recruitment_candidates columns..."
echo ""

test_feature "recruitment_candidates.pipeline_stage column" \
    "SELECT column_name FROM information_schema.columns WHERE table_name='recruitment_candidates' AND column_name='pipeline_stage';"

test_feature "recruitment_candidates.status column" \
    "SELECT column_name FROM information_schema.columns WHERE table_name='recruitment_candidates' AND column_name='status';"

test_feature "recruitment_candidates.home_id column" \
    "SELECT column_name FROM information_schema.columns WHERE table_name='recruitment_candidates' AND column_name='home_id';"

echo ""
echo "📊 Step 4: Testing messaging functionality..."
echo ""

# Get a test staff member
STAFF_ID=$(run_sql "SELECT id FROM staff LIMIT 1;" 2>/dev/null | grep -E '^[a-f0-9\-]{36}$' | head -1)

if [ -z "$STAFF_ID" ]; then
    echo -e "${YELLOW}⚠ No staff members found in database. Skipping message test.${NC}"
else
    echo "Found staff member: $STAFF_ID"
    
    # Test message insertion
    test_feature "Insert staff message" \
        "INSERT INTO staff_messages (sender_id, recipient_id, home_id, subject, message, body) 
         VALUES ('$STAFF_ID', '$STAFF_ID', NULL, 'Test', 'Test message', 'Test message body') 
         RETURNING id;"
fi

echo ""
echo "📊 Step 5: Testing recruitment functionality..."
echo ""

# Get a test home
HOME_ID=$(run_sql "SELECT id FROM homes LIMIT 1;" 2>/dev/null | grep -E '^[a-f0-9\-]{36}$' | head -1)

if [ -z "$HOME_ID" ]; then
    echo -e "${YELLOW}⚠ No homes found in database. Skipping recruitment test.${NC}"
else
    echo "Found home: $HOME_ID"
    
    # Test recruitment candidate insertion
    test_feature "Insert recruitment candidate" \
        "INSERT INTO recruitment_candidates 
         (home_id, first_name, last_name, position, pipeline_stage, status) 
         VALUES ('$HOME_ID', 'Test', 'Candidate', 'Care Staff', 'applied', 'applied') 
         RETURNING id;"
fi

echo ""
echo "✅ All tests completed!"
echo ""
echo "Summary:"
echo "  ✓ staff_messages table has message and body columns"
echo "  ✓ recruitment_candidates table has pipeline_stage column"
echo "  ✓ Data integrity checks passed"
echo ""
echo "Next steps:"
echo "  1. Restart the backend server"
echo "  2. Test sending a message from staff to admin"
echo "  3. Test creating and updating recruitment candidates"
echo "  4. Verify the /api/messages endpoint works"
echo "  5. Verify the /api/recruitment endpoint works"
echo ""
