# HealthArk — Backend API
## Phase 1: Infrastructure, Database & Authentication

### Setup

**1. Install dependencies**
```bash
cd backend && npm install
```

**2. Create your .env file**
```bash
cp .env.example .env
# Edit .env with your database credentials and secrets
```

**3. Create the PostgreSQL database**
```sql
CREATE USER healthark_user WITH PASSWORD 'your_password';
CREATE DATABASE healthark OWNER healthark_user;
GRANT ALL PRIVILEGES ON DATABASE healthark TO healthark_user;
```

**4. Run the database migration**
```bash
npm run migrate
```

**5. Seed test data**
```bash
npm run seed
```

**6. Start the development server**
```bash
npm run dev
```

API runs on: `http://localhost:3001`
Health check: `http://localhost:3001/health`

---

### Test accounts (after seed)

| Role | Email | Password |
|------|-------|----------|
| Group Admin | admin@healthark.co.uk | Admin123!@# |
| Home Manager | manager@healthark.co.uk | Manager123!@# |
| Care Staff | staff@healthark.co.uk | CareStaff123! |

---

### API Endpoints — Phase 1

#### Authentication
- `POST /api/auth/login` — Login, returns JWT + refresh token
- `POST /api/auth/refresh` — Exchange refresh token for new access token
- `POST /api/auth/logout` — Invalidate session
- `PUT /api/auth/change-password` — Change own password
- `GET /api/auth/me` — Get current staff profile

#### Homes
- `GET /api/homes` — List accessible homes
- `GET /api/homes/:id` — Get home details
- `POST /api/homes` — Create home (group_admin)
- `PUT /api/homes/:id` — Update home
- `GET /api/homes/:id/qr` — Get QR token for clock-in
- `GET /api/homes/:id/dashboard` — Admin dashboard data

#### Staff
- `GET /api/staff` — List staff
- `GET /api/staff/:id` — Get staff profile
- `POST /api/staff` — Create staff member
- `PUT /api/staff/:id` — Update staff profile
- `GET /api/staff/:id/access` — Get home access permissions
- `PUT /api/staff/:id/access/:homeId` — Set permissions
- `POST /api/staff/:id/clock` — Clock in or out (geo-validated)
- `GET /api/staff/:id/clock` — Clock history

#### Business Alerts
- `GET /api/alerts` — Get active/resolved alerts
- `PUT /api/alerts/:id/resolve` — Resolve an alert
- `POST /api/alerts` — Create alert (internal/AI engine)

---

### Architecture notes for your developer

- **Every endpoint enforces authentication** via `authenticate` middleware
- **Role-based access** is enforced server-side — never trust the client
- **Multi-home isolation** — every DB table has home_id, every query is scoped
- **Audit log** — every mutation writes to audit_log automatically
- **Geo clock-in** — Haversine formula validates GPS vs postcode radius
- **Fluid trigger** — PostgreSQL trigger auto-totals drinks and flags below-threshold
- **BMI trigger** — PostgreSQL trigger auto-calculates BMI on weight entry
- **Scheduler** — node-cron jobs run background AI checks every hour/day

**Phase 2 routes are stubbed in index.ts** — uncomment each as the phase is built.
