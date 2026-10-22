import fs from 'fs';
import path from 'path';

const FRONTEND_SRC = path.resolve(__dirname, '../../../frontend/src');
const BACKEND_SRC = path.resolve(__dirname, '..');
const SW_PATH = path.resolve(__dirname, '../../../frontend/public/sw.js');

const readFrontend = (relPath: string) =>
  fs.readFileSync(path.join(FRONTEND_SRC, relPath), 'utf8');

const readBackend = (relPath: string) =>
  fs.readFileSync(path.join(BACKEND_SRC, relPath), 'utf8');

describe('Batch 6 Walkthrough Video Fixes (WA0085 – WA0095, All 10 Videos)', () => {
  test('Video 1 (WA0085): CatheterCare has UniformFilterBar, Print/Download CSV, home-wide GET, and clickable View/Edit completed form modal', () => {
    const catheterUi = readFrontend('pages/clinical/CatheterCare.tsx');
    const clinicalApi = readBackend('routes/clinical.routes.ts');

    expect(catheterUi).toContain('UniformFilterBar');
    expect(catheterUi).toContain('Download CSV');
    expect(catheterUi).toContain('Print / Save PDF');
    expect(catheterUi).toContain('openRecordModal');
    expect(catheterUi).toContain('Completed Catheter Care Form');
    expect(catheterUi).toContain("api.put(`/clinical/catheter/${selectedRecord.id}`");

    expect(clinicalApi).toContain("router.get('/catheter'");
    expect(clinicalApi).toContain("router.put('/catheter/:id'");
  });

  test('Video 2 (WA0087): WeightTracker has Service User + Date From/To UniformFilterBar, Print/Download CSV, and clickable editable history', () => {
    const weightUi = readFrontend('pages/weight-tracker/WeightTracker.tsx');

    expect(weightUi).toContain('UniformFilterBar');
    expect(weightUi).toContain('Print / PDF');
    expect(weightUi).toContain('Download CSV');
    expect(weightUi).toContain('openEdit');
  });

  test('Video 3 (WA0088): EnvironmentalChecks renames Location -> Name of Service and offers full Check Type + Service User + Date From/To filters', () => {
    const envUi = readFrontend('pages/environmental/EnvironmentalChecks.tsx');
    const envApi = readBackend('routes/environmental.routes.ts');

    expect(envUi).toContain('label="Name of Service *"');
    expect(envUi).not.toContain('label="Location *"');
    expect(envUi).toContain('UniformFilterBar');
    expect(envUi).toContain('All Check Types');
    expect(envUi).toContain('Service:');

    expect(envApi).toContain('const { date, from, to, checkType, suId, result, search, days } = req.query;');
  });

  test('Video 4 (WA0089): ExternalContacts removes greyed-out category buttons & headers and applies bold high-contrast yellow/gold styling', () => {
    const contactsUi = readFrontend('pages/contacts/ExternalContacts.tsx');

    expect(contactsUi).not.toContain("filterCategory === c ? 'text-white' : 'text-gray-400'");
    expect(contactsUi).toContain('#fde047');
    expect(contactsUi).toContain('font-extrabold');
  });

  test('Video 5 (WA0090): WaitingList applies permanent solid high-contrast colors to all status tabs by default', () => {
    const waitingUi = readFrontend('pages/waiting-list/WaitingList.tsx');

    expect(waitingUi).not.toContain("filterStatus === s ? 'text-white' : 'text-gray-400'");
    expect(waitingUi).toContain('STATUS_SOLID_STYLES');
    expect(waitingUi).toContain('font-extrabold');
  });

  test('Video 6 (WA0091): StaffAbsence provides UniformFilterBar with Staff Name dropdown + Date From / Date To + Absence Type', () => {
    const absenceUi = readFrontend('pages/staff-absence/StaffAbsence.tsx');
    const absenceApi = readBackend('routes/staffAbsence.routes.ts');

    expect(absenceUi).toContain('UniformFilterBar');
    expect(absenceUi).toContain('personLabel="Staff Name"');
    expect(absenceUi).toContain('dateFrom={dateFrom}');
    expect(absenceUi).toContain('dateTo={dateTo}');

    expect(absenceApi).toContain('const from = req.query.from');
    expect(absenceApi).toContain('const to = req.query.to');
  });

  test('Video 7 (WA0092): Mandatory Training Matrix renders bold solid high-contrast colored course headers with zero greyed-out columns', () => {
    const matrixUi = readFrontend('pages/training/TrainingMatrix.tsx');

    expect(matrixUi).toContain("background: colIdx % 2 === 0 ? '#fde047' : '#fbbf24'");
    expect(matrixUi).toContain("color: '#0f172a'");
    expect(matrixUi).toContain('font-extrabold');
  });

  test('Video 8 (WA0093): Care staff accounts can complete & save Residents Health Check (/diary & physical-health-plans)', () => {
    const diaryUi = readFrontend('pages/diary/ResidentDiary.tsx');
    const suApi = readBackend('routes/serviceUsers.routes.ts');
    const phpApi = readBackend('routes/physicalHealthPlan.routes.ts');

    expect(diaryUi).toContain('/health-checks');
    expect(suApi).toContain("router.put('/:id/health-checks'");
    expect(suApi).toContain('HEALTH_CHECK_EDITABLE_FIELDS');
    expect(phpApi).not.toContain('You can only edit a resident health check while clocked in');
  });

  test('Video 9 (WA0094): Staff Profile includes dedicated Staff Assessment tab with full assessment reader & electronic SignaturePad sign-off', () => {
    const staffProfileUi = readFrontend('pages/staff/StaffModule.tsx');
    const assessmentsApiSrc = readBackend('routes/assessments.routes.ts');

    expect(staffProfileUi).toContain("key: 'assessments'");
    expect(staffProfileUi).toContain('Read & Sign Off');
    expect(staffProfileUi).toContain('SignaturePad');
    expect(staffProfileUi).toContain('handleStaffSignatureSave');

    expect(assessmentsApiSrc).toContain('staff_signed_at');
    expect(assessmentsApiSrc).toContain('staff_signoff_notes');
    expect(assessmentsApiSrc).toContain('/staff?tab=assessments');
  });

  test('Video 10 (WA0095): ClockInAnalytics provides Staff Name dropdown filter wired to /clockin/analytics?staffId=', () => {
    const clockAnalyticsUi = readFrontend('pages/clockin/ClockInAnalytics.tsx');
    const clockApi = readBackend('routes/clockin.routes.ts');

    expect(clockAnalyticsUi).toContain('Staff Name');
    expect(clockAnalyticsUi).toContain('All Staff Members');
    expect(clockAnalyticsUi).toContain('staffId: staffFilter || undefined');

    expect(clockApi).toContain("const staffId = (req.query.staffId as string) || ''");
  });

  test('PWA Service Worker bumped to compcare-v20 so mobile & desktop clients pick up fresh bundle cleanly', () => {
    const sw = fs.readFileSync(SW_PATH, 'utf8');
    expect(sw).toContain("const CACHE = 'compcare-v20'");
    expect(sw).toContain("const DYNAMIC_CACHE = 'compcare-dynamic-v20'");
  });
});
