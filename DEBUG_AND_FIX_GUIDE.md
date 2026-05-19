# HealthArk Project - Complete Fix Guide

## Table of Contents
1. [Quick Start](#quick-start)
2. [Issues Found & Fixed](#issues-found--fixed)
3. [Troubleshooting](#troubleshooting)
4. [Detailed Setup](#detailed-setup)

---

## Quick Start

### Prerequisites
- PostgreSQL 12+ installed and running
- Node.js 18+ and npm installed
- Windows/WSL or Linux/Mac terminal

### 5-Minute Setup

```bash
# 1. Backend setup
cd backend
npm install
npm run migrate
npm run seed  # or: node src/database/init-db.js
npm run dev

# 2. In another terminal, frontend setup
cd frontend
npm install
npm run dev
```

**Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Backend Health: http://localhost:3001/health

**Login with:**
```
Email: admin@healthark.co.uk
Password: Admin1234
```

---

## Issues Found & Fixed

### ✅ Issue 1: Inconsistent Email Addresses
**Problem:** README and code referenced `compcarehub.co.uk` domain, but database seed used `healthark.co.uk`

**Fixed:**
- Updated README.md with correct credentials using `healthark.co.uk` domain
- Updated `backend/src/database/seed.ts` to use `healthark.co.uk` 
- Updated `backend/src/database/resetPassword.ts` email addresses
- All seed files now consistent

### ✅ Issue 2: Incorrect Test Passwords
**Problem:** README listed different passwords than what was actually hashed in the database

**Fixed:**
- Standardized all test credentials:
  - admin@healthark.co.uk → Admin1234
  - manager@healthark.co.uk → Manager1234
  - senior@healthark.co.uk → Admin1234
  - care1@healthark.co.uk → Admin1234
  - care2@healthark.co.uk → Admin1234

### ✅ Issue 3: Multiple Seed Systems
**Problem:** Two different seed systems (TypeScript in `backend/src/database/seed.ts` and SQL in `database/*.sql`)

**Fixed:**
- Identified that SQL migrations (`npm run migrate`) is the primary system
- SQL migrations run automatically and create proper test data
- TypeScript seed file updated for consistency
- Created helper script `init-db.js` for manual database setup

### ✅ Issue 4: Missing Database Initialization Guide
**Fixed:**
- Created `SETUP_AND_TEST.md` with comprehensive setup instructions
- Created `backend/diagnose.js` for system health checks
- Created `backend/src/database/init-db.js` for manual database initialization

---

## Troubleshooting

### Symptom: "Can't Login"

**Check 1: Database is running**
```bash
# Windows: Check if PostgreSQL service is running
Get-Service | Select-String postgres

# Mac/Linux
brew services list | grep postgres
# or
sudo service postgresql status
```

**Check 2: Database exists and is populated**
```sql
-- Connect to PostgreSQL and run:
\c healthark
SELECT COUNT(*) FROM staff;
SELECT email, role FROM staff LIMIT 5;
```

**Check 3: Backend is running at http://localhost:3001**
```bash
# In another terminal, test:
curl http://localhost:3001/health
# Should return: {"status":"ok","db":"connected"}
```

**Check 4: Correct credentials**
```sql
-- Check what accounts exist:
SELECT email, role FROM staff;

-- Get a specific bcrypt hash to verify:
SELECT email, password_hash FROM staff WHERE email='admin@healthark.co.uk';
```

**Check 5: Clear browser cache and login again**
```javascript
// In browser console:
localStorage.clear()
sessionStorage.clear()
document.cookie.split(";").forEach(c => document.cookie = c.split("=")[0] + "=; max-age=0")
```

---

### Symptom: "Data Not Loading / 401 Unauthorized"

**Check:**
1. Are you logged in? Look for token in browser localStorage
   ```javascript
   localStorage.getItem('ha_token')  // Should not be null
   ```

2. Is the frontend connecting to the backend?
   - Open DevTools → Network tab
   - Try to load a page with data
   - Check if `/api/*` requests are being made
   - Check the response status code

3. Reset your session:
   ```bash
   # Backend: reset a password if needed
   cd backend
   npm run reset-password
   ```

---

### Symptom: "Backend won't start"

**Common causes:**

1. **DB_PASSWORD not set in .env**
   ```bash
   # Copy the example:
   cp backend/.env.example backend/.env
   
   # Edit .env and set your PostgreSQL password
   ```

2. **Dependencies not installed**
   ```bash
   cd backend
   npm install
   ```

3. **JWT_SECRET not configured**
   ```bash
   # Ensure backend/.env has:
   JWT_SECRET=healthark-super-secret-jwt-key-minimum-64-characters-long-aabbccdd
   JWT_REFRESH_SECRET=healthark-refresh-secret-different-from-above-aabbccddeeffgg
   ```

4. **Port 3001 already in use**
   ```bash
   # Windows: Find process using port 3001
   netstat -ano | findstr :3001
   
   # Kill the process
   taskkill /PID <PID> /F
   ```

---

### Symptom: "Database doesn't exist"

```bash
# Create the database and user (in psql or pgAdmin):
CREATE USER healthark_user WITH PASSWORD 'HealthArk2024';
CREATE DATABASE healthark OWNER healthark_user;
GRANT ALL PRIVILEGES ON DATABASE healthark TO healthark_user;

# Then run migrations:
cd backend
npm run migrate
npm run seed
```

---

## Detailed Setup

### Step 1: Install PostgreSQL

**Windows:**
- Download from https://www.postgresql.org/download/windows/
- During installation, remember the password you set for the `postgres` user
- Install pgAdmin for easy database management

**Mac:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Step 2: Create Database & User

```sql
-- Connect to PostgreSQL as postgres user
-- Then run:

CREATE USER healthark_user WITH PASSWORD 'HealthArk2024';
CREATE DATABASE healthark OWNER healthark_user;
GRANT ALL PRIVILEGES ON DATABASE healthark TO healthark_user;
```

Or use Window → SQL Query in pgAdmin:
1. Right-click on postgres server
2. Select "Query Tool"
3. Paste the above SQL
4. Click Execute

### Step 3: Verify .env Configuration

```bash
# In backend folder:
cat .env

# Should show:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=healthark
# DB_USER=healthark_user
# DB_PASSWORD=HealthArk2024  ← Match your PostgreSQL password
# JWT_SECRET=healthark-super-secret-jwt-key-minimum-64-characters-long-aabbccdd
# JWT_REFRESH_SECRET=healthark-refresh-secret-different-from-above-aabbccddeeffgg
```

### Step 4: Run Migrations & Seeds

```bash
cd backend

# Install dependencies
npm install

# Run database migrations
npm run migrate
# ✓ Each .sql file will apply in order
# ✓ Tables and schema created
# ✓ Test data inserted

# If migrations don't create test users properly:
node src/database/init-db.js
# ✓ Ensures test accounts exist with correct credentials
```

### Step 5: Start Backend

```bash
cd backend
npm run dev
# ✓ Server starts on http://localhost:3001
# ✓ Logs to console and backend/logs/
# ✓ Press Ctrl+C to stop
```

### Step 6: Start Frontend (New Terminal)

```bash
cd frontend
npm install  # if not done
npm run dev
# ✓ Dev server on http://localhost:3000
# ✓ Auto-reloads on code changes
# ✓ Proxies /api requests to http://localhost:3001
```

### Step 7: Login

1. Open http://localhost:3000 in browser
2. You should see the login page
3. Enter credentials:
   - Email: `admin@healthark.co.uk`
   - Password: `Admin1234`
4. Click Login
5. You should see the dashboard with homes and service users

---

## Useful Commands

```bash
# Backend commands
cd backend
npm run dev         # Start dev server with hot reload
npm run build       # Compile TypeScript to JavaScript
npm start           # Run compiled version
npm run migrate     # Run database migrations
npm run seed        # Seed test data (runs after migrate)
npm run test        # Run tests
npm run lint        # Check code style

# Reset everything
npm run reset-password  # Reset all test passwords
node src/database/init-db.js  # Full database re-init

# Frontend commands
cd frontend
npm run dev         # Start dev server (http://localhost:3000)
npm run build       # Build for production
npm run preview     # Preview production build
npm run lint        # Check code style
```

---

## Health Checks

### API Health Endpoint
```bash
curl http://localhost:3001/health
# Expected response:
# {"status":"ok","db":"connected"}
```

### Database Connection
```bash
# Test from backend directory:
npm run migrate  # If this succeeds, DB is accessible

# Or connect directly:
psql -U healthark_user -d healthark -c "SELECT COUNT(*) FROM staff;"
```

### Frontend Loading
1. Open http://localhost:3000
2. Open DevTools (F12)
3. Check Console for any errors
4. Check Network tab for failed requests
5. Check Application tab → Storage → localStorage for `ha_token`

---

## File Structure

```
healthark/
├── backend/
│   ├── .env                          ← Database credentials (keep private!)
│   ├── src/
│   │   ├── index.ts                  ← Main server file
│   │   ├── routes/                   ← API endpoints
│   │   ├── middleware/               ← Auth, error handling
│   │   ├── services/                 ← Business logic
│   │   ├── config/                   ← Database, logger
│   │   └── database/
│   │       ├── migrate.ts            ← Runs SQL migrations
│   │       ├── seed.ts               ← Creates test data
│   │       └── init-db.js            ← Manual DB setup helper
│   └── package.json                  ← Dependencies
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                   ← Main app component
│   │   ├── context/                  ← Auth, notifications
│   │   ├── pages/                    ← Page components
│   │   ├── api/                      ← API client
│   │   └── types/                    ← TypeScript types
│   ├── vite.config.ts                ← Build & proxy config
│   └── package.json                  ← Dependencies
│
├── database/
│   ├── 001_schema.sql                ← Create tables
│   ├── 002_add_missing_columns.sql  ← Add columns
│   ├── 003_missing_tables.sql       ← Create missing tables
│   ├── 004_demo_data.sql            ← Demo data
│   └── 005_fix_and_seed.sql         ← Final fixes & test data
│
└── README.md                          ← Project overview
```

---

## Still Having Issues?

1. **Check Logs**
   ```bash
   # Backend logs
   cat backend/logs/error.log
   cat backend/logs/compcarehub.log
   ```

2. **Run Diagnostic Tool**
   ```bash
   cd backend
   node diagnose.js
   ```

3. **Verify Environment**
   ```bash
   node --version    # Should be 18+
   npm --version     # Should be 8+
   psql --version    # Should be 12+
   ```

4. **Check if Ports are Free**
   ```bash
   # Windows
   netstat -ano | findstr :3000
   netstat -ano | findstr :3001
   netstat -ano | findstr :5432
   ```

5. **Clear Everything and Start Fresh**
   ```bash
   # Delete node_modules and reinstall
   cd backend
   rm -r node_modules  # or del /S node_modules
   npm install
   npm run migrate
   npm run seed
   npm run dev
   
   # In another terminal
   cd frontend
   rm -r node_modules
   npm install
   npm run dev
   ```

---

*Last Updated: May 2026*
*HealthArk - Care Home Management Platform*
