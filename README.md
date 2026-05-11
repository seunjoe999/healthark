# CompCare Hub — Backend API
## Care Home Management Platform
**Your Care Our Priority**

### Setup

**1. Install dependencies**
```bash
cd backend && npm install
```

**2. Create your .env file**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

**3. Create the PostgreSQL database**
```sql
CREATE USER compcare_user WITH PASSWORD 'your_password';
CREATE DATABASE compcarehub OWNER compcare_user;
GRANT ALL PRIVILEGES ON DATABASE compcarehub TO compcare_user;
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
| Group Admin | admin@compcarehub.co.uk | Admin1234 |
| Home Manager | manager@compcarehub.co.uk | Manager1234 |
| Care Staff | staff@compcarehub.co.uk | Staff1234 |

---

### Technology Stack
- **Frontend:** React + TypeScript + Tailwind CSS (Vite)
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL
- **AI Engine:** Anthropic Claude API
- **Hosting:** AWS / DigitalOcean (UK region)
