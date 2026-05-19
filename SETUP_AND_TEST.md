# HealthArk Setup & Testing Guide

## Quick Setup (Windows)

### 1. Prerequisites
- **PostgreSQL** installed and running on `localhost:5432`
- **Node.js** 18+ installed
- **npm** installed

### 2. Database Setup

```powershell
# Using psql or pgAdmin, create the database and user:
CREATE USER healthark_user WITH PASSWORD 'HealthArk2024';
CREATE DATABASE healthark OWNER healthark_user;
GRANT ALL PRIVILEGES ON DATABASE healthark TO healthark_user;
```

### 3. Backend Setup

```powershell
cd backend
npm install
npm run migrate
npm run seed
npm run dev
```

The backend should start on `http://localhost:3001`

Check health endpoint:
```
curl http://localhost:3001/health
```

### 4. Frontend Setup (new terminal)

```powershell
cd frontend  
npm install
npm run dev
```

The frontend will run on `http://localhost:3000` with API proxying to `http://localhost:3001`

## Test Credentials

After running migrations and seeding, use these credentials to login:

| Role | Email | Password |
|------|-------|----------|
| Group Admin | admin@healthark.co.uk | Admin1234 |
| Home Manager | manager@healthark.co.uk | Manager1234 |
| Senior Carer | senior@healthark.co.uk | Admin1234 |
| Care Staff | care1@healthark.co.uk | Admin1234 |
| Care Staff | care2@healthark.co.uk | Admin1234 |

## Troubleshooting

### Database Connection Error
- Ensure PostgreSQL is running: Check Task Manager or Services
- Verify credentials in `backend/.env` match your PostgreSQL setup
- Check if database exists: `\l` in psql

### Backend won't start
- Check NODE_ENV is set to `development`
- Verify all dependencies installed: `npm install`
- Check logs in `backend/logs/` directory

### Frontend shows blank screen
- Check browser console for errors (F12)
- Ensure backend is running on port 3001
- Clear browser cache and refresh

### Can't login
- Verify you're using correct email address (healthark.co.uk domain)
- Check database has test data: query `SELECT * FROM staff;`
- Try resetting passwords: `npm run reset-password` (in backend)

### Data not loading
- Check browser network tab for failed API requests
- Verify JWT token is being stored (check localStorage)
- Check backend logs for 401/403 errors

## Reset Commands

### Reset Test Passwords

```powershell
cd backend
npm run reset-password
```

### Full Reset (Delete and Recreate Database)

```powershell
# In psql or pgAdmin:
DROP DATABASE IF EXISTS healthark;
DROP USER IF EXISTS healthark_user;

# Then run setup again
CREATE USER healthark_user WITH PASSWORD 'HealthArk2024';
CREATE DATABASE healthark OWNER healthark_user;
GRANT ALL PRIVILEGES ON DATABASE healthark TO healthark_user;

# Then in backend folder:
npm run migrate
npm run seed
```

## Key Files

- **Backend Config**: `backend/.env`
- **Database Schema**: `database/001_schema.sql`
- **Test Data**: `database/005_fix_and_seed.sql`
- **Frontend API Config**: `frontend/src/api/index.ts`
- **Vite Proxy**: `frontend/vite.config.ts`

