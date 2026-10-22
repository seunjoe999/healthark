import fs from 'fs';
import path from 'path';

const FRONTEND_SRC = path.resolve(__dirname, '../../../frontend/src');
const BACKEND_ROUTES = path.resolve(__dirname, '../routes');

describe('Batch 5 Client Walkthrough Fixes (WA0010–WA0019)', () => {
  test('1. Global & component white-on-white contrast protection (Videos 1 & 3)', () => {
    const indexCss = fs.readFileSync(path.join(FRONTEND_SRC, 'index.css'), 'utf8');
    expect(indexCss).toContain(':where(.bg-white)');
    expect(indexCss).toContain('color: #0f172a');

    const uiIndex = fs.readFileSync(path.join(FRONTEND_SRC, 'components/ui/index.tsx'), 'utf8');
    expect(uiIndex).toContain("color: '#0f172a'");
    expect(uiIndex).toContain("color: '#f5f0e8'");

    const rota = fs.readFileSync(path.join(FRONTEND_SRC, 'pages/rota/Rota.tsx'), 'utf8');
    expect(rota).toContain('Shift Auditor (');
    expect(rota).toContain('bg-white text-slate-900 rounded-xl p-3 border border-slate-200');
    expect(rota).toContain('divide-y divide-slate-200 bg-white text-slate-900');

    const oral = fs.readFileSync(path.join(FRONTEND_SRC, 'pages/clinical/OralHygiene.tsx'), 'utf8');
    expect(oral).toContain('bg-white text-slate-900 rounded-2xl border border-slate-200');
    expect(oral).toContain('divide-y divide-slate-200 bg-white text-slate-900');
  });

  test('2. Rota desktop & mobile layout optimization with Week/Day & Clashes in top bar (Video 2)', () => {
    const rota = fs.readFileSync(path.join(FRONTEND_SRC, 'pages/rota/Rota.tsx'), 'utf8');
    expect(rota).toContain('h-[calc(100dvh-116px)] md:h-full');
    expect(rota).toContain('Compact Single-Row Top Bar (Week/Day + Date Nav + Clashes + Actions)');
    expect(rota).toContain('clashCount > 0');
    expect(rota).toContain('setMobileFiltersOpen');
    expect(rota).toContain('setToolsMenuOpen');
  });

  test('3. Uniform Filter Bars deployed across all 7 operational & clinical dashboards (Videos 4, 6, 7, 8, 9, 10)', () => {
    const filterBar = fs.readFileSync(path.join(FRONTEND_SRC, 'components/ui/FilterBar.tsx'), 'utf8');
    expect(filterBar).toContain('export function UniformFilterBar');
    expect(filterBar).toContain('Clear Filters');

    const dashboards = [
      'pages/timesheets/Timesheets.tsx',
      'pages/clinical/OralHygiene.tsx',
      'pages/clinical/AbbeyPainScale.tsx',
      'pages/clinical/PainAssessment.tsx',
      'pages/weight-tracker/WeightTracker.tsx',
      'pages/wound-care/WoundCare.tsx',
      'pages/hospital-admissions/HospitalAdmissions.tsx',
    ];
    for (const rel of dashboards) {
      const src = fs.readFileSync(path.join(FRONTEND_SRC, rel), 'utf8');
      expect(src).toContain('<UniformFilterBar');
    }
  });

  test('4. Completed Pain Assessments & Oral Care persist home-wide and open full editable modals (Videos 5, 6, 7)', () => {
    const clinicalRoutes = fs.readFileSync(path.join(BACKEND_ROUTES, 'clinical.routes.ts'), 'utf8');
    expect(clinicalRoutes).toContain("router.get('/oral-hygiene'");
    expect(clinicalRoutes).toContain("router.put('/oral-hygiene/:id'");
    expect(clinicalRoutes).toContain("router.get('/abbey-pain'");
    expect(clinicalRoutes).toContain("router.put('/abbey-pain/:id'");
    expect(clinicalRoutes).toContain("router.get('/pain-assessments'");
    expect(clinicalRoutes).toContain("router.put('/pain-assessment/:id'");

    const abbey = fs.readFileSync(path.join(FRONTEND_SRC, 'pages/clinical/AbbeyPainScale.tsx'), 'utf8');
    expect(abbey).toContain('export function AbbeyAssessmentDetailModal');
    expect(abbey).toContain('api.put(`/clinical/abbey-pain/${record.id}`');

    const pain = fs.readFileSync(path.join(FRONTEND_SRC, 'pages/clinical/PainAssessment.tsx'), 'utf8');
    expect(pain).toContain("api.get('/clinical/pain-assessments'");
    expect(pain).toContain("api.get('/clinical/abbey-pain'");
    expect(pain).toContain('StructuredPainDetailModal');
    expect(pain).toContain('AbbeyAssessmentDetailModal');
    expect(pain).toContain('api.put(`/clinical/pain-assessment/${record.id}`');
  });

  test('5. Weight/BMI Tracker loads home-wide history immediately with clickable editable rows (Video 8)', () => {
    const wt = fs.readFileSync(path.join(FRONTEND_SRC, 'pages/weight-tracker/WeightTracker.tsx'), 'utf8');
    expect(wt).toContain('onClick={() => openEdit(r)}');
    expect(wt).not.toContain('if (!selectedSU) { setRecords([]); return; }');

    const wtRoutes = fs.readFileSync(path.join(BACKEND_ROUTES, 'weightTracker.routes.ts'), 'utf8');
    expect(wtRoutes).toContain('LEFT JOIN staff s ON s.id = wr.recorded_by');
    expect(wtRoutes).toContain('LEFT JOIN service_users su ON su.id = wr.su_id');
  });
});
