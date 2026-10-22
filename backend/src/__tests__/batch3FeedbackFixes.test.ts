import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'batch3-test-secret-key-compcare-hub';
process.env.NODE_ENV = 'test';

const mockQuery = jest.fn();

jest.mock('../config/database', () => ({
  query: (...args: any[]) => mockQuery(...args),
  pool: { query: (...args: any[]) => mockQuery(...args) },
}));

jest.mock('../middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false });
    try {
      const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET!) as any;
      req.staff = {
        id: decoded.staffId,
        staffId: decoded.staffId,
        homeId: decoded.homeId,
        role: decoded.role,
        email: decoded.email,
      };
      next();
    } catch {
      return res.status(401).json({ success: false });
    }
  },
  requireRole: (...roles: string[]) => (req: any, res: any, next: any) => {
    if (!req.staff || !roles.includes(req.staff.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  },
  authorize: (...roles: string[]) => (req: any, res: any, next: any) => {
    if (!req.staff || !roles.includes(req.staff.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  },
}));

import reportsRouter from '../routes/reports.routes';
import auditTrailRouter from '../routes/auditTrail.routes';
import meetingTrackerRouter from '../routes/meetingTracker.routes';
import invoicingRouter from '../routes/invoicing.routes';
import financeTrackingRouter from '../routes/financeTracking.routes';
import { computeFieldDiffs } from '../middleware/auditLog';

const HOME_ID = '11111111-1111-4111-8111-111111111111';
const STAFF_ID = '22222222-2222-4222-8222-222222222222';
const SU_ID_1 = '33333333-3333-4333-8333-333333333333';
const SU_ID_2 = '44444444-4444-4444-8444-444444444444';
const TASK_ID = '55555555-5555-4555-8555-555555555555';
const DAILY_ID = '66666666-6666-4666-8666-666666666666';
const MEETING_ID = '77777777-7777-4777-8777-777777777777';

function makeToken(role = 'group_admin') {
  return jwt.sign(
    { staffId: STAFF_ID, homeId: HOME_ID, role, email: 'admin@compcarehub.co.uk' },
    process.env.JWT_SECRET!,
    { expiresIn: '2h' },
  );
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/reports', reportsRouter);
  app.use('/api/audit-trail', auditTrailRouter);
  app.use('/api/meeting-tracker', meetingTrackerRouter);
  app.use('/api/invoicing', invoicingRouter);
  app.use('/api/finance-tracking', financeTrackingRouter);
  return app;
}

describe('Batch-3 Production Fixes Verification (All 10 Client Feedback Items)', () => {
  const repoRoot = path.resolve(__dirname, '../../..');
  const token = makeToken('group_admin');
  const superToken = makeToken('super_admin');

  beforeEach(() => {
    mockQuery.mockReset();
  });

  test('1 & 2. Meeting Tracker supports Edit (PATCH), Delete (incl. super_admin), Download PDF/CSV, and Date/Type/Search filters', async () => {
    const app = buildApp();
    mockQuery.mockResolvedValueOnce([
      {
        id: MEETING_ID,
        home_id: HOME_ID,
        meeting_date: '2026-10-20',
        meeting_type: 'management',
        minutes_taker: 'Sarah Jenkins',
        notes: 'Reviewed staffing levels',
        action_plan: 'Recruit two night carers',
        follow_up: 'Review next Monday',
        status: 'open',
      },
    ]);

    const getRes = await request(app)
      .get(`/api/meeting-tracker?homeId=${HOME_ID}&from=2026-10-01&to=2026-10-31&meetingType=management&status=open&search=staffing`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data).toHaveLength(1);

    mockQuery.mockResolvedValueOnce([{ id: MEETING_ID, notes: 'Updated minutes content', status: 'in_progress' }]);
    const patchRes = await request(app)
      .patch(`/api/meeting-tracker/${MEETING_ID}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ notes: 'Updated minutes content', status: 'in_progress', actionPlan: 'Updated action plan' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.status).toBe('in_progress');

    mockQuery.mockResolvedValueOnce([]);
    const delRes = await request(app)
      .delete(`/api/meeting-tracker/${MEETING_ID}`)
      .set('Authorization', `Bearer ${superToken}`);
    expect(delRes.status).toBe(200);

    const uiSrc = fs.readFileSync(path.join(repoRoot, 'frontend/src/pages/meeting-tracker/MeetingTracker.tsx'), 'utf8');
    expect(uiSrc).toContain('openEditModal');
    expect(uiSrc).toContain('downloadSingleMeetingPdf');
    expect(uiSrc).toContain('Date From');
    expect(uiSrc).toContain('Date To');
  });

  test('3. Management Meetings & shared MeetingsSection expose Search, Select Meeting, Date From, Date To & Download PDF', () => {
    const src = fs.readFileSync(path.join(repoRoot, 'frontend/src/components/MeetingsSection.tsx'), 'utf8');
    expect(src).not.toContain('if (!isBriefing) return meetings');
    expect(src).toContain('Select Meeting');
    expect(src).toContain('Date From');
    expect(src).toContain('Date To');
    expect(src).toContain('downloadMeetingPdf');
  });

  test('4. Leave & Global Calendars replace static +N overflow tags with interactive full-name modals', () => {
    const holidaysSrc = fs.readFileSync(path.join(repoRoot, 'frontend/src/pages/holidays/Holidays.tsx'), 'utf8');
    expect(holidaysSrc).not.toContain('<p className="text-xs text-slate-400 pl-1">+{dayLeaves.length-2}</p>');
    expect(holidaysSrc).toContain('setDayModal({ date: day, items: dayLeaves })');
    expect(holidaysSrc).toContain('Staff on Leave —');

    const staffCalSrc = fs.readFileSync(path.join(repoRoot, 'frontend/src/pages/calendar/StaffCalendar.tsx'), 'utf8');
    expect(staffCalSrc).toContain('setDayOverflowModal({ date: day, items: dayEvents })');

    const calSrc = fs.readFileSync(path.join(repoRoot, 'frontend/src/pages/calendar/Calendar.tsx'), 'utf8');
    expect(calSrc).toContain('setDayOverflowModal({ date: day, items: dayEvents })');
  });

  test('5. Invoicing supports Service User, Date From, Date To, Search, and Pending/Approved/Paid status filters', async () => {
    const app = buildApp();
    mockQuery.mockResolvedValueOnce([
      {
        id: MEETING_ID,
        su_id: SU_ID_1,
        first_name: 'Jason Frank',
        last_name: 'Tindall',
        month_date: '2026-10-01',
        commissioned_hours: 160,
        invoice_amount: 3200,
        status: 'pending',
      },
    ]);

    const res = await request(app)
      .get(`/api/invoicing?homeId=${HOME_ID}&status=pending&suId=${SU_ID_1}&from=2026-10-01&to=2026-10-31&search=Jason`)
      .set('Authorization', `Bearer ${superToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);

    const invSrc = fs.readFileSync(path.join(repoRoot, 'frontend/src/pages/invoicing/Invoicing.tsx'), 'utf8');
    expect(invSrc).toContain('All Service Users');
    expect(invSrc).toContain('Date From');
    expect(invSrc).toContain('Date To');
  });

  test('6. Finance Tracking supports Service User, Date From, Date To, Payment Type & Search filters', async () => {
    const app = buildApp();
    mockQuery.mockResolvedValueOnce([
      {
        id: MEETING_ID,
        su_id: SU_ID_1,
        su_name: 'Jahura Bibi',
        payment_type: 'rent',
        payment_date: '2026-10-15',
        amount: 245.5,
      },
    ]);

    const res = await request(app)
      .get(`/api/finance-tracking?homeId=${HOME_ID}&suId=${SU_ID_1}&from=2026-10-01&to=2026-10-31&paymentType=rent&search=Jahura`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);

    const finSrc = fs.readFileSync(path.join(repoRoot, 'frontend/src/pages/finance-tracking/FinanceTracking.tsx'), 'utf8');
    expect(finSrc).toContain('All Service Users');
    expect(finSrc).toContain('Date From');
    expect(finSrc).toContain('Date To');
  });

  test('7. Well Being Report pulls Weight across weight_records/MUST/profile, adds Height (cm), and completely removes Pulse & Temperature', async () => {
    const app = buildApp();
    mockQuery
      // 1. service_users
      .mockResolvedValueOnce([
        { id: SU_ID_1, service_user: 'Jason Frank Tindall', age: 42, weight_kg: null, height_cm: 175.0 },
        { id: SU_ID_2, service_user: 'Jahura Bibi', age: 68, weight_kg: 79.5, height_cm: 157.0 },
      ])
      // 2. records_vitals
      .mockResolvedValueOnce([
        { su_id: SU_ID_1, rec_date: '2026-10-18', systolic: 122, diastolic: 78, spo2_percent: 98, weight_kg: null, height_cm: null },
      ])
      // 3. weight_records
      .mockResolvedValueOnce([
        { su_id: SU_ID_1, rec_date: '2026-10-15', weight_kg: 70.8, height_cm: 176.0 },
      ])
      // 4. must_scores
      .mockResolvedValueOnce([])
      // 5. records_must
      .mockResolvedValueOnce([])
      // 6. observations
      .mockResolvedValueOnce([])
      // 7. physical_health_plans
      .mockResolvedValueOnce([]);

    const res = await request(app)
      .get(`/api/reports/wellbeing?homeId=${HOME_ID}&from=2026-10-01&to=2026-10-22`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);

    const jason = res.body.data.find((r: any) => r.service_user === 'Jason Frank Tindall');
    const jahura = res.body.data.find((r: any) => r.service_user === 'Jahura Bibi');

    expect(jason.weight_kg).toBe('70.8 kg');
    expect(jason.height_cm).toBe('176.0 cm');
    expect(jason.average_blood_pressure).toBe('122/78 mmHg');
    expect(jason.average_oxygen_percent).toBe('98%');

    // Profile fallback works cleanly even when no range reading exists yet
    expect(jahura.weight_kg).toBe('79.5 kg');
    expect(jahura.height_cm).toBe('157.0 cm');

    // Average Pulse and Average Temperature MUST NOT exist anywhere on wellbeing rows
    for (const row of res.body.data) {
      expect(row).not.toHaveProperty('average_pulse');
      expect(row).not.toHaveProperty('average_temperature');
    }
  });

  test('8. Compiled production JS chunks contain ZERO synchronous TDZ references & self-healing PWA recovery is wired', () => {
    const distAssets = path.join(repoRoot, 'frontend/dist/assets');
    expect(fs.existsSync(distAssets)).toBe(true);
    const jsFiles = fs.readdirSync(distAssets).filter(f => f.endsWith('.js'));
    expect(jsFiles.length).toBeGreaterThan(0);

    const chunkGraph = new Map<string, string[]>();
    const bundleTdzIssues: string[] = [];
    for (const fileName of jsFiles) {
      const code = fs.readFileSync(path.join(distAssets, fileName), 'utf8');
      const sf = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);

      const deps: string[] = [];
      for (const st of sf.statements) {
        if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier)) {
          const target = path.basename(st.moduleSpecifier.text);
          if (jsFiles.includes(target)) deps.push(target);
        }
        if (ts.isExportDeclaration(st) && st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier)) {
          const target = path.basename(st.moduleSpecifier.text);
          if (jsFiles.includes(target)) deps.push(target);
        }
      }
      chunkGraph.set(fileName, deps);

      const scanScope = (scopeNode: any) => {
        const stmts: readonly ts.Statement[] | undefined = scopeNode.statements;
        if (!stmts) return;
        const declMap = new Map<string, number>();
        for (const st of stmts) {
          if (ts.isVariableStatement(st) && (st.declarationList.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let))) {
            const collect = (n: ts.BindingName) => {
              if (ts.isIdentifier(n)) declMap.set(n.text, st.pos);
              else if (ts.isObjectBindingPattern(n) || ts.isArrayBindingPattern(n)) {
                for (const el of n.elements) if (ts.isBindingElement(el)) collect(el.name);
              }
            };
            for (const d of st.declarationList.declarations) collect(d.name);
          } else if (ts.isClassDeclaration(st) && st.name) {
            declMap.set(st.name.text, st.pos);
          }
        }
        const walkSync = (n: ts.Node) => {
          if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) return;
          if (n !== scopeNode && (ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) || ts.isMethodDeclaration(n))) {
            const p = n.parent;
            const sync = Boolean(p && ts.isCallExpression(p) && (p.expression === n || (ts.isParenthesizedExpression(p.expression) && p.expression.expression === n)));
            if (!sync) return;
          }
          if (n !== scopeNode && ts.isBlock(n)) {
            scanScope(n);
            return;
          }
          if (ts.isIdentifier(n) && declMap.has(n.text) && n.pos < declMap.get(n.text)!) {
            const p = n.parent;
            const isProp = (ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isPropertyAssignment(p) && p.name === n) || (ts.isParameter(p) && p.name === n);
            if (!isProp) bundleTdzIssues.push(`${fileName}:${n.text}`);
          }
          ts.forEachChild(n, walkSync);
        };
        for (const st of stmts) walkSync(st);
      };
      scanScope(sf);
    }

    const visited = new Set<string>();
    const stack = new Set<string>();
    const chunkCycles: string[] = [];
    const dfs = (u: string, trail: string[]) => {
      visited.add(u);
      stack.add(u);
      for (const v of chunkGraph.get(u) || []) {
        if (!visited.has(v)) dfs(v, [...trail, v]);
        else if (stack.has(v)) chunkCycles.push(trail.slice(trail.indexOf(v)).concat(v).join(' -> '));
      }
      stack.delete(u);
    };
    for (const f of jsFiles) if (!visited.has(f)) dfs(f, [f]);

    expect(chunkCycles).toEqual([]);
    expect(bundleTdzIssues).toEqual([]);

    const sw = fs.readFileSync(path.join(repoRoot, 'frontend/public/sw.js'), 'utf8');
    expect(sw).toContain("const CACHE = 'compcare-v19'");
    const indexHtml = fs.readFileSync(path.join(repoRoot, 'frontend/index.html'), 'utf8');
    expect(indexHtml).toContain('purgeCompCareCachesAndReload');
    const serverIndex = fs.readFileSync(path.join(repoRoot, 'backend/src/index.ts'), 'utf8');
    expect(serverIndex).toContain("app.get('/sw.js'");
  });

  test('9. Training Compliance & CSS enforce high-contrast dark slate text on white surfaces', () => {
    const css = fs.readFileSync(path.join(repoRoot, 'frontend/src/index.css'), 'utf8');
    expect(css).toContain('.app-shell:not(.theme-dark)');
    expect(css).toContain('color: #0f172a;');

    const reportsSrc = fs.readFileSync(path.join(repoRoot, 'frontend/src/pages/reports/Reports.tsx'), 'utf8');
    expect(reportsSrc).toContain('function TrainingCompliance({ data }: { data: any[] })');
    expect(reportsSrc).toContain('font-semibold text-slate-900 whitespace-nowrap">{r.staff_name');
  });

  test('10. System Activity & Audit Trail resolve UUIDs to real names, strip UUID diffs, and emit specific action descriptions', async () => {
    const diffs = computeFieldDiffs(
      { su_id: SU_ID_1, status: 'pending', title: 'House Keeping' },
      { su_id: SU_ID_1, completed_by: STAFF_ID, status: 'completed', title: 'House Keeping' },
    );
    expect(diffs.find(d => d.field === 'su_id')).toBeUndefined();
    expect(diffs.find(d => d.field === 'completed_by')).toBeUndefined();
    expect(diffs.find(d => d.field === 'status')?.after).toBe('completed');

    const app = buildApp();
    mockQuery
      // 1. audit_trail rows
      .mockResolvedValueOnce([
        {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          home_id: HOME_ID,
          staff_id: STAFF_ID,
          resolved_staff_name: 'Chidozie Maduka',
          resolved_staff_role: 'senior_carer',
          action: 'UPDATE',
          resource_type: 'task',
          resource_id: TASK_ID,
          resource_label: null,
          old_data: { status: 'pending', title: 'House Keeping', su_id: SU_ID_1 },
          new_data: { status: 'completed', title: 'House Keeping', su_id: SU_ID_1 },
          changes: [
            { field: 'su_id', label: 'Su Id', before: null, after: SU_ID_1 },
            { field: 'status', label: 'Status', before: 'pending', after: 'completed' },
          ],
          ip_address: '127.0.0.1',
          created_at: '2026-10-22T09:15:00.000Z',
        },
        {
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          home_id: HOME_ID,
          staff_id: STAFF_ID,
          resolved_staff_name: 'Jane Doe',
          resolved_staff_role: 'care_staff',
          action: 'CREATE',
          resource_type: 'daily_record',
          resource_id: DAILY_ID,
          resource_label: SU_ID_2, // Raw UUID previously leaked in resource_label!
          old_data: null,
          new_data: { su_id: SU_ID_2, record_type: 'comfort_check' },
          changes: [],
          ip_address: '127.0.0.1',
          created_at: '2026-10-22T08:00:00.000Z',
        },
      ])
      // 2. audit_log legacy rows
      .mockResolvedValueOnce([])
      // 3. service_users lookup
      .mockResolvedValueOnce([
        { id: SU_ID_1, name: 'Declan Charlick' },
        { id: SU_ID_2, name: 'Thomas Johnson' },
      ])
      // 4. staff lookup
      .mockResolvedValueOnce([{ id: STAFF_ID, name: 'Chidozie Maduka', role: 'senior_carer' }])
      // 5–10. care_plans, risk_assessments, tasks, daily_records, su_medications, policies, homes
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: TASK_ID, su_name: 'Declan Charlick', detail: 'House Keeping' }])
      .mockResolvedValueOnce([{ id: DAILY_ID, su_name: 'Thomas Johnson', detail: 'comfort_check' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: HOME_ID, name: 'CompCare Manchester' }]);

    const res = await request(app)
      .get(`/api/audit-trail?homeId=${HOME_ID}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);

    const taskEntry = res.body.data[0];
    expect(taskEntry.person_affected).toBe('Declan Charlick');
    expect(taskEntry.action_description).toBe('Completed Task "House Keeping" for Declan Charlick');
    expect(JSON.stringify(taskEntry.changes)).not.toContain(SU_ID_1);

    const dailyEntry = res.body.data[1];
    expect(dailyEntry.person_affected).toBe('Thomas Johnson');
    expect(dailyEntry.action_description).toBe('Recorded Comfort Check for Thomas Johnson');
    expect(dailyEntry.person_affected).not.toMatch(/^[0-9a-f]{8}-/i);
  });
});
