# HealthArk — Care Home Management Platform
**Your Care Our Priority**

## Quick Start (5 minutes)

### Prerequisites
- PostgreSQL 12+ running locally
- Node.js 18+ and npm
- **First time?** See [DEBUG_AND_FIX_GUIDE.md](DEBUG_AND_FIX_GUIDE.md)

### Setup & Run

```bash
# Backend Setup
cd backend
npm install
npm run migrate
npm run seed
npm run dev          # Runs on http://localhost:3001

# Frontend Setup (in new terminal)
cd frontend
npm install
npm run dev          # Runs on http://localhost:3000
```

### Login with Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@healthark.co.uk | Admin1234 |
| Manager | manager@healthark.co.uk | Manager1234 |

### Health Check

```bash
curl http://localhost:3001/health
# Expected: {"status":"ok","db":"connected"}
```

---

## Troubleshooting

**Can't login?** → See [DEBUG_AND_FIX_GUIDE.md](DEBUG_AND_FIX_GUIDE.md#symptom-cant-login)

**Data not loading?** → See [DEBUG_AND_FIX_GUIDE.md](DEBUG_AND_FIX_GUIDE.md#symptom-data-not-loading--401-unauthorized)

**Backend won't start?** → See [DEBUG_AND_FIX_GUIDE.md](DEBUG_AND_FIX_GUIDE.md#symptom-backend-wont-start)

**More help:** Run `npm run diagnose` in the backend folder

---

## Project Structure

- **Backend:** Express.js API with PostgreSQL (`backend/src`)
- **Frontend:** React + Vite with TailwindCSS (`frontend/src`)
- **Database:** SQL migrations in `database/` folder
- **Documentation:** `DEBUG_AND_FIX_GUIDE.md` for comprehensive troubleshooting

---

## Useful Commands

```bash
cd backend

# Startup
npm run dev              # Start with hot reload
npm run migrate          # Setup database schema
npm run seed             # Add test data
npm run init-db          # Manual DB initialization

# Maintenance
npm run reset-password   # Reset test account passwords
npm run diagnose         # Check system health
npm run build            # Build for production
npm start                # Run production build
```

---

## Database Setup

If you haven't set up PostgreSQL yet:

```sql
-- Create user and database
CREATE USER healthark_user WITH PASSWORD 'HealthArk2024';
CREATE DATABASE healthark OWNER healthark_user;
GRANT ALL PRIVILEGES ON DATABASE healthark TO healthark_user;
```

Then verify your `.env` file in the backend folder has the matching credentials.

---

## Features

- ✅ Care home resident management
- ✅ Staff scheduling & time tracking
- ✅ Care plans & daily records
- ✅ Medication management
- ✅ Incident tracking & reporting
- ✅ Role-based access control
- ✅ Real-time notifications
- ✅ Document management

---

**Need help?** See [DEBUG_AND_FIX_GUIDE.md](DEBUG_AND_FIX_GUIDE.md) for detailed troubleshooting.
| Care Staff | staff@compcarehub.co.uk | Staff1234 |

---

### Technology Stack
- **Frontend:** React + TypeScript + Tailwind CSS (Vite)
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL
- **AI Engine:** Anthropic Claude API
- **Hosting:** AWS / DigitalOcean (UK region)
