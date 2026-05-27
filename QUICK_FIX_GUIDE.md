# HealthArk - Quick Start Guide for Database Fixes

## 🚀 Quick Fix Instructions

### Prerequisites
- Node.js and PostgreSQL running
- Backend dependencies installed: `cd backend && npm install`

### Step 1: Apply Database Migration (1 minute)

```bash
cd backend
node run_migration.js
```

**What it does:**
- ✅ Adds missing `body` column to `staff_messages` table
- ✅ Adds missing `pipeline_stage` column to `recruitment_candidates` table
- ✅ Creates proper indexes for performance
- ✅ Validates data integrity

### Step 2: Restart Backend (30 seconds)

```bash
npm restart
# or if npm restart doesn't work:
# npm stop && npm start
```

### Step 3: Verify Fixes Applied (30 seconds)

Run the test script (requires bash and psql):

```bash
# Make script executable
chmod +x ../test_database_fixes.sh

# Run tests
../test_database_fixes.sh
```

Expected output:
```
✓ staff_messages table exists
✓ recruitment_candidates table exists
✓ staff_messages.body column
✓ recruitment_candidates.pipeline_stage column
✓ All tests completed
```

---

## 🧪 Manual Testing

### Test 1: Send a Staff Message

**Via API:**
```bash
curl -X POST http://localhost:3001/api/messages \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "recipient-staff-id",
    "subject": "Test",
    "message": "Hello"
  }'
```

**Expected:** 201 Created with message ID

### Test 2: Create Recruitment Candidate

**Via API:**
```bash
curl -X POST http://localhost:3001/api/recruitment \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "homeId": "home-id",
    "firstName": "Jane",
    "lastName": "Doe",
    "position": "Care Staff",
    "pipelineStage": "applied"
  }'
```

**Expected:** 201 Created with candidate ID

### Test 3: Update Recruitment Candidate Pipeline

**Via API:**
```bash
curl -X PUT http://localhost:3001/api/recruitment/candidate-id \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pipelineStage": "interview_scheduled"
  }'
```

**Expected:** 200 OK with updated candidate

---

## ❌ If You Get Errors

### Error: "column does not exist"

```bash
# Re-run the migration
cd backend
node run_migration.js

# Check the backend logs
npm logs
```

### Error: "Messages table doesn't have body column"

```bash
# Manually apply migration via psql
psql -U postgres -d healthark -f migrations/004_fix_missing_columns.sql

# Restart backend
npm restart
```

### Error: "recruitment table not found"

```bash
# Start backend in debug mode
NODE_DEBUG=* npm start

# Check database connection
psql -U postgres -d healthark -c "SELECT 1;"
```

---

## 📊 Features Now Working

### Staff Messaging ✅
- Send messages from staff to admin
- Send messages from admin to staff
- Mark messages as read
- View inbox and sent folders
- Delete messages

### Recruitment ✅
- Create recruitment candidates
- Track pipeline stages:
  - `applied` - Initial application
  - `interview_scheduled` - Awaiting interview
  - `interview_completed` - Interview done
  - `offer_extended` - Job offer sent
  - `onboarding` - Being onboarded
  - `hired` - Successfully hired
  - `rejected` - Application rejected
- Update candidate status
- Track compliance (DBS, references, training)
- Send recruitment emails

---

## 📝 Additional Commands

### View Migration Status

```bash
psql -U postgres -d healthark -c "
  SELECT version(), datname FROM pg_database WHERE datname = 'healthark';"
```

### Check Table Structure

```bash
psql -U postgres -d healthark -c "\d staff_messages"
psql -U postgres -d healthark -c "\d recruitment_candidates"
```

### Count Messages

```bash
psql -U postgres -d healthark -c "SELECT COUNT(*) FROM staff_messages;"
```

### Count Recruitment Candidates

```bash
psql -U postgres -d healthark -c "SELECT COUNT(*) FROM recruitment_candidates;"
```

---

## 🔍 Logging

To see what's happening during fixes:

```bash
# Terminal 1: Watch backend logs
cd backend
npm start

# Terminal 2: Run tests (in another terminal)
bash ../test_database_fixes.sh
```

---

## 📞 Support

If issues persist:

1. **Check logs:** `npm logs` or check browser console
2. **Verify database:** `psql -U postgres -d healthark -c "SELECT 1;"`
3. **Reset migrations:** Delete your database and restore from backup
4. **Contact:** Review `DATABASE_FIXES.md` for detailed troubleshooting

---

**✅ All fixes are now applied!** Your app should be working perfectly.
