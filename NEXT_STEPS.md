# Action Plan for Remaining Healthcare App Updates

## Quick Wins (Low Effort, High Impact)

### ✅ COMPLETED
1. **Medication Administration Record (MAR)** - Renamed from MAR Chart
2. **Medication Risk Assessment** - Updated labels and filtering
3. **Monthly Reviews** - Changed from Annual to Monthly
4. **Leave Request Hours Fix** - Made hours optional in backend validation
5. **Better Error Messages** - Added to Outcomes saving
6. **Triggers & Protective Factors** - Added to Medicine Risk form

---

## Medium Priority - Database Required

### 1. Pharmacy & GP Details on MAR
**Files to Update:**
- `backend/src/routes/mar.routes.ts` - Add fields to medication insert
- `frontend/src/pages/mar/MAR.tsx` - Add form inputs for pharmacy/GP
- `frontend/src/pages/mar/PrintMARChart.tsx` - Display pharmacy/GP on print

**Database Migration:**
```sql
ALTER TABLE su_medications ADD COLUMN IF NOT EXISTS pharmacy_name VARCHAR(255);
ALTER TABLE su_medications ADD COLUMN IF NOT EXISTS pharmacy_phone VARCHAR(20);
ALTER TABLE su_medications ADD COLUMN IF NOT EXISTS gp_name VARCHAR(255);
ALTER TABLE su_medications ADD COLUMN IF NOT EXISTS gp_phone VARCHAR(20);
```

### 2. Medication Codes on MAR
**Database Migration:**
```sql
ALTER TABLE su_medications ADD COLUMN IF NOT EXISTS medication_code VARCHAR(50);
ALTER TABLE su_medications ADD COLUMN IF NOT EXISTS atc_code VARCHAR(50);
```

### 3. BMI Auto-Calculation (Already Showing)
- Frontend calculates BMI: `(weight_kg) / (height_cm/100)²`
- Verify it saves to database after update
- Check: `service_users.bmi` field exists

---

## Medium-High Priority Features

### 4. Print Care Plans & Risk Assessments
**New Files:**
```
frontend/src/pages/care-plans/PrintCarePlans.tsx
frontend/src/pages/risk-assessments/PrintRiskAssessments.tsx
frontend/src/utils/pdfGenerator.ts (helper for combining PDFs)
```

**Implementation Steps:**
1. Create print modals for multiple documents
2. Use libraries like jsPDF or react-pdf
3. Auto-combine care plan + risk assessment + MAR into single PDF

### 5. Admission Details Completion
**Investigation Needed:**
- Find which field prevents completion in EditServiceUser.tsx
- Check for required field validation
- May need to remove required flag or fix validation logic

### 6. Speech-to-Text for Daily Records
**New File:**
```
frontend/src/components/SpeechInput.tsx
```

**Implementation:**
- Use Web Speech API (native browser feature)
- Add button to DailyRecords form
- Transcribe and populate text fields

---

## High Priority - New Features

### 7. CQC Notifications for Safeguarding
**Files to Update:**
- `frontend/src/pages/safeguarding/Safeguarding.tsx` - Add button
- `backend/src/routes/safeguarding.routes.ts` - Add CQC log endpoint

**Database Table:**
```sql
CREATE TABLE cqc_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES homes(id),
  su_id UUID NOT NULL REFERENCES service_users(id),
  notification_date TIMESTAMP DEFAULT NOW(),
  notification_type VARCHAR(50),
  details TEXT,
  notified_by UUID REFERENCES staff(id)
);
```

### 8. Invoicing Section
**New Files:**
```
frontend/src/pages/invoicing/Invoicing.tsx
backend/src/routes/invoicing.routes.ts
frontend/src/pages/invoicing/InvoiceList.tsx
```

**Features:**
- Display invoices by resident/month
- Auto-generate based on commissioned hours
- Manual invoice creation option
- Export to PDF

**Database Table:**
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES homes(id),
  su_id UUID NOT NULL REFERENCES service_users(id),
  month_date DATE NOT NULL,
  commissioned_hours DECIMAL(10,2),
  hourly_rate DECIMAL(10,2),
  invoice_amount DECIMAL(12,2),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(home_id, su_id, month_date)
);
```

### 9. Daily Task Popup
**Updates:**
- Dashboard or Staff Login component
- Check for pending tasks
- Show as dismissible modal on login
- Set reminder preference (show/hide)

### 10. Team Leaders Access Level
**Files to Update:**
- `backend/src/middleware/auth.ts` - Add team_leader role
- `backend/src/types/index.ts` - Add role type
- Various routes - Add role check for team leader features

**Database Updates:**
```sql
INSERT INTO staff_roles (role_name, description) 
VALUES ('team_leader', 'Team Leader - Can supervise staff and manage their team')
ON CONFLICT DO NOTHING;
```

### 11. Standby Shift to Rota
**Files to Update:**
- `frontend/src/pages/rota/Rota.tsx` - Add shift type selector
- `backend/src/routes/shifts.routes.ts` - Allow standby type

**Database Update:**
```sql
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS shift_type VARCHAR(50) DEFAULT 'regular';
-- Valid types: 'regular', 'standby', 'on_call', etc.
```

### 12. Supervision & Appraisal Section
**New Files:**
```
frontend/src/pages/supervision-appraisal/SupervisionAppraisal.tsx
backend/src/routes/supervision.routes.ts
```

**Database Table:**
```sql
CREATE TABLE supervisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id),
  supervisor_id UUID NOT NULL REFERENCES staff(id),
  supervision_date DATE NOT NULL,
  type VARCHAR(50),
  summary TEXT,
  strengths TEXT,
  areas_for_improvement TEXT,
  action_points TEXT,
  next_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE appraisals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id),
  appraiser_id UUID NOT NULL REFERENCES staff(id),
  appraisal_date DATE NOT NULL,
  rating VARCHAR(20),
  comments TEXT,
  goals TEXT,
  next_review_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Test Checklist

- [ ] All date pickers work (Chrome, Safari, Firefox)
- [ ] MAR renamed everywhere in UI and navigation
- [ ] Medication Risk Assessment shows only applicable flags
- [ ] Leave requests accept hours as optional
- [ ] Outcomes save with toast notifications
- [ ] Reviews default to monthly
- [ ] BMI calculates and saves
- [ ] Pharmacy/GP fields display in MAR
- [ ] Medication codes display in MAR
- [ ] Print functionality works for care plans
- [ ] CQC notification button appears in Safeguarding
- [ ] Invoicing page loads and displays invoices
- [ ] Tasks popup appears on dashboard
- [ ] Team leader role restrictions work
- [ ] Standby shifts appear in rota
- [ ] Supervision/Appraisal section accessible

---

## Database Rollout Checklist

Before running migrations:
1. ✅ Backup production database
2. ✅ Test migrations on staging
3. ✅ Have rollback plan ready
4. ✅ Schedule during low-traffic periods
5. ✅ Monitor app logs after deployment

---

## Deployment Order

1. **Phase 1** (Backend changes only - backward compatible):
   - Add new fields to database
   - Deploy new backend routes
   - No breaking changes

2. **Phase 2** (Frontend UI updates):
   - Add new form fields
   - Update displays
   - Test with existing data

3. **Phase 3** (New features):
   - Launch new pages/components
   - Enable feature flags if available
   - Monitor usage

---

Last Updated: May 25, 2026
Status: **8 items completed, 13 items pending**
Estimated remaining effort: **2-3 weeks** for full implementation
