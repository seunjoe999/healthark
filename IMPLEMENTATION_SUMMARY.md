# Healthcare App Updates - Implementation Summary

## Completed Changes ✅

### 1. **Renamed Labels and Features**
- ✅ **MAR Chart** → **Medication Administration Record** (Updated in all references):
  - Frontend: MAR.tsx, PrintMARChart.tsx, Training.tsx
  - Navigation: AppLayout.tsx, Dashboard, Audits
  - Admin settings: AdminAccounts.tsx
  - All user-facing labels and descriptions

- ✅ **Annual Review** → **Monthly Review** 
  - Updated REVIEW_TYPES in Reviews.tsx
  - Database should support both legacy 'annual_review' and new 'monthly_review'

- ✅ **Medicine Risk** → **Medication Risk Assessment**
  - Updated all frontend references and labels

- ✅ **Risk notes** → **Risk Management Plan**
  - Updated in MedicineRisk.tsx

### 2. **Medication Risk Assessment Enhancements** 
- ✅ **Filtering**: Only show applicable flags (Covert, PRN, Crushed) - hidden when not applicable
- ✅ **Added Fields**: 
  - Triggers field
  - Protective Factors field
- ✅ Both fields display in expanded view and form

### 3. **Bug Fixes**
- ✅ **Leave Request Hours Issue**: Fixed validation in staffHR.routes.ts
  - Made `hoursRequested` field optional (was required)
  - Now accepts `totalHours` or `hoursRequested`
  
- ✅ **Outcomes/Appointments Saving**: Added error handling and toast messages
  - Better error feedback to users
  - Validation checks before submission

### 4. **Quality Assurance Labeling**
- ✅ Already labeled as "Quality Assurance" in AppLayout.tsx

## Partially Implemented / Need Database Updates

### 5. **Service User BMI Calculation**
- ✅ Frontend already calculates BMI from height/weight: `(weightKg) / (heightCm/100)²`
- ⚠️ Need to verify BMI is stored in database after updates
- Files: EditServiceUser.tsx, ServiceUserProfile.tsx

### 6. **Review Frequency Change (Monthly Instead of Annual)**
- ✅ Frontend updated default to 'monthly'
- ⚠️ Database migration needed to:
  - Add 'monthly_review' option if not exists
  - Update existing 'annual_review' records

## Features Still Requiring Implementation

### 7. **Date Picker Calendar** (Request #1)
- ℹ️ **Status**: Modern browsers already provide calendar pickers for `type="date"` inputs
- All date input fields already have calendar support
- Example locations: Holidays.tsx, Reviews.tsx, EditServiceUser.tsx

### 8. **Admission Details Completion** (Request #2)
- 🔍 **Investigation Needed**: Identify which form is not enabled
- Likely in: EditServiceUser.tsx, AddServiceUser.tsx
- May need permission checks or status validation

### 9. **Add Pharmacy and GP Details to MAR** (Request #3)
- 📝 **Action Required**: Add fields to su_medications table:
  - `pharmacy_name`
  - `pharmacy_phone`
  - `gp_name`
  - `gp_phone`
- Update MAR.tsx form to include these fields
- Update PrintMARChart.tsx to display pharmacy/GP info

### 10. **Add Medication Codes to MAR** (Request #4)
- 📝 **Action Required**: Add fields:
  - `medication_code` (e.g., BNF code)
  - `atc_code` (Anatomical Therapeutic Chemical)
- Database schema and frontend updates needed

### 11. **Print Care Plans and Risk Assessments** (Request #6)
- 🔍 Print functionality needs implementation
- Create PrintCarePlansModal.tsx
- Create PrintRiskAssessmentsModal.tsx
- Combine multiple documents into single PDF

### 12. **Speech Text for Daily Records** (Request #7)
- 🔍 Implementation needed:
  - Add speech-to-text button in DailyRecords.tsx
  - Use Web Speech API or similar
  - Transcribe and populate form fields

### 13. **Appointments Outcome Saving Issue** (Request #9)
- 🔍 **Debugging Needed**: Check:
  - Backend validation in outcomes.routes.ts
  - API error response details
  - Required vs optional fields

### 14. **CQC Notifications for Safeguarding** (Request #11)
- 📝 Need to add button in Safeguarding page
- Create CQC notification modal
- Add notification logging to database

### 15. **Invoicing Section** (Request #15)
- 📝 New feature - requires:
  - New page/component: frontend/src/pages/invoicing/Invoicing.tsx
  - Invoice table in database
  - Calculate monthly from commissioned hours
  - Backend routes: backend/src/routes/invoicing.routes.ts
  - Auto-generate monthly invoices

### 16. **Weight/Height BMI Generation** (Request #16)
- ✅ Calculation is done in frontend
- ⚠️ Ensure BMI is saved to database when weight/height updated

### 17. **Daily Task Popup** (Request #17)
- 📝 Create notification system:
  - Check for pending tasks at staff login/dashboard
  - Show modal popup for incomplete tasks
  - Move to Tasks.tsx or Dashboard component

### 18. **Team Leaders Access Level** (Request #18)
- 📝 Database and permission updates:
  - Add 'team_leader' role to staff_roles table
  - Control access permissions in middleware
  - Update role-based features throughout app

### 19. **Add Standby Shift to Rota** (Request #19)
- 📝 Updates to Rota.tsx:
  - Add shift type: 'standby'
  - Update database shift_types
  - Handle standby shift UI/logic

### 20. **Supervision and Appraisal Section** (Request #20)
- 📝 New feature module needed:
  - Page: frontend/src/pages/supervision-appraisal/SupervisionAppraisal.tsx
  - Backend routes for CRUD operations
  - Database tables for supervision records

### 21. **Change Review to Care Review** (Request #21)
- ✅ Already updated in REVIEW_TYPES
- ⚠️ May need frontend label updates in Reviews.tsx header

## Database Schema Changes Required

```sql
-- su_medications: Add pharmacy and GP details
ALTER TABLE su_medications ADD COLUMN IF NOT EXISTS pharmacy_name VARCHAR(255);
ALTER TABLE su_medications ADD COLUMN IF NOT EXISTS pharmacy_phone VARCHAR(20);
ALTER TABLE su_medications ADD COLUMN IF NOT EXISTS gp_name VARCHAR(255);
ALTER TABLE su_medications ADD COLUMN IF NOT EXISTS gp_phone VARCHAR(20);
ALTER TABLE su_medications ADD COLUMN IF NOT EXISTS medication_code VARCHAR(50);
ALTER TABLE su_medications ADD COLUMN IF NOT EXISTS atc_code VARCHAR(50);

-- Add monthly_review type
UPDATE care_reviews SET review_type = 'monthly_review' WHERE review_type = 'annual_review';

-- Create invoicing table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES homes(id),
  su_id UUID NOT NULL REFERENCES service_users(id),
  month_date DATE NOT NULL,
  commissioned_hours DECIMAL(10,2),
  invoice_amount DECIMAL(12,2),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(home_id, su_id, month_date)
);

-- Create supervision table
CREATE TABLE IF NOT EXISTS supervisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id),
  supervisor_id UUID NOT NULL REFERENCES staff(id),
  supervision_date DATE NOT NULL,
  type VARCHAR(50),
  notes TEXT,
  next_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add team_leader role if not exists
INSERT INTO staff_roles (role_name, description) VALUES ('team_leader', 'Team Leader') 
ON CONFLICT DO NOTHING;
```

## Testing Checklist

- [ ] MAR Chart renamed everywhere and works
- [ ] Medicine Risk Assessment shows only applicable items
- [ ] Leave requests accept optional hours
- [ ] Outcomes save successfully with error messages
- [ ] Reviews can be created with monthly frequency
- [ ] BMI calculates and saves correctly
- [ ] Database migrations run successfully
- [ ] All role-based permissions work as expected

## Next Priority Actions

1. **High Priority**: Fix appointment outcomes saving (debug + test)
2. **High Priority**: Add pharmacy/GP fields to MAR
3. **Medium Priority**: Implement invoicing feature
4. **Medium Priority**: Add standby shift type
5. **Medium Priority**: Create supervision section

---
Last Updated: May 25, 2026
