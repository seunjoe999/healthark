import { Router, Request, Response, NextFunction } from 'express';
import { query as qv } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import jwt from 'jsonwebtoken';

const router = Router();
router.use(authenticate);

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return (req.staff as any)?.[field] || '';
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const OFFICE_ROLES = new Set([
  'home_manager', 'group_admin', 'deputy_manager', 'admin', 'recruitment_admin',
  'registered_manager', 'service_manager', 'director', 'auditor', 'super_admin',
]);

const MODULE_LABELS: Record<string, string> = {
  service_user: 'Service User Profile',
  service_users: 'Service User Profile',
  staff: 'Staff Profile',
  staff_member: 'Staff Profile',
  care_plan: 'Support Plan',
  care_plans: 'Support Plan',
  risk_assessment: 'Risk Assessment',
  risk_assessments: 'Risk Assessment',
  daily_record: 'Daily Care Record',
  daily_records: 'Daily Care Record',
  task: 'Care Task',
  tasks: 'Care Task',
  medication: 'Medication',
  su_medications: 'Medication',
  mar: 'MAR Administration',
  mar_record: 'MAR Administration',
  mar_records: 'MAR Administration',
  medication_stock: 'Medication Stock',
  assessment: 'Clinical / Staff Assessment',
  assessments: 'Clinical / Staff Assessment',
  review: 'Service User Review',
  su_reviews: 'Service User Review',
  safeguarding: 'Safeguarding Concern',
  safeguarding_concerns: 'Safeguarding Concern',
  incident: 'Incident Report',
  records_incidents: 'Incident Report',
  calendar_event: 'Calendar & Appointment',
  calendar_events: 'Calendar & Appointment',
  shift: 'Staff Shift / Rota',
  staff_shifts: 'Staff Shift / Rota',
  clock_in: 'Clock In / Out',
  clockin: 'Clock In / Out',
  clock_events: 'Clock In / Out',
  leave: 'Staff Leave Request',
  staff_leave: 'Staff Leave Request',
  'staff-hr': 'Staff Leave / HR',
  training: 'Staff Training Record',
  staff_training: 'Staff Training Record',
  policy: 'Policy Document',
  policies: 'Policy Document',
  home: 'Service / Home Settings',
  homes: 'Service / Home Settings',
  auth: 'Authentication',
  session: 'Authentication',
};

const HIDDEN_DIFF_FIELDS = new Set([
  'id', 'home_id', 'su_id', 'staff_id', 'user_id', 'organisation_id',
  'created_at', 'updated_at', 'password_hash', 'pin_hash',
  'created_by', 'updated_by', 'logged_by', 'recorded_by', 'completed_by', 'reviewed_by', 'conducted_by',
  'parent_shift_id', 'template_id', 'daily_record_id', 'medication_id',
  'signature_data', 'staff_signature', 'su_signature', 'su_signature_dataurl', 'staff_signature_dataurl',
]);

function titleize(s: string): string {
  return String(s || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function cleanLabel(val?: string | null): string {
  if (!val) return '';
  const trimmed = String(val).trim();
  if (!trimmed || UUID_RE.test(trimmed)) return '';
  return trimmed;
}

export function classifyActorSource(role?: string | null): 'office' | 'staff' {
  return OFFICE_ROLES.has(String(role || '').toLowerCase().trim()) ? 'office' : 'staff';
}

export function formatRoleLabel(role?: string | null): string {
  return titleize(role || 'Staff');
}

export function sanitizeAuditSnapshot(row: Record<string, any> | null | undefined): Record<string, any> | null {
  if (!row || typeof row !== 'object') return null;
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    if (HIDDEN_DIFF_FIELDS.has(k)) continue;
    if (/password|pin|secret|token|signature/i.test(k)) continue;
    if (typeof v === 'string' && (v.startsWith('data:image/') || UUID_RE.test(v.trim()))) continue;
    clean[k] = v;
  }
  return clean;
}

export interface LogAuditOptions {
  organisationId?: string | null;
  homeId?: string | null;
  staffId?: string | null;
  staffName?: string | null;
  staffEmail?: string | null;
  staffRole?: string | null;
  action: string;
  resourceType?: string | null;
  targetType?: string | null;
  resourceId?: string | null;
  targetId?: string | null;
  resourceLabel?: string | null;
  targetName?: string | null;
  oldData?: any;
  newData?: any;
  changes?: any;
  notes?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAudit(opts: LogAuditOptions): Promise<void> {
  try {
    const rType = opts.resourceType || opts.targetType || 'system';
    const rId = opts.resourceId || opts.targetId || null;
    const rLabel = opts.resourceLabel || opts.targetName || null;
    const safeId = rId && UUID_RE.test(String(rId)) ? String(rId) : null;
    await query(
      `INSERT INTO audit_trail
        (home_id, staff_id, staff_name, action, resource_type, resource_id, resource_label, old_data, new_data, changes, notes, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        opts.homeId || null,
        opts.staffId && UUID_RE.test(String(opts.staffId)) ? opts.staffId : null,
        opts.staffName || null,
        opts.action,
        rType,
        safeId,
        rLabel,
        opts.oldData ? JSON.stringify(sanitizeAuditSnapshot(opts.oldData) ?? opts.oldData) : null,
        opts.newData ? JSON.stringify(sanitizeAuditSnapshot(opts.newData) ?? opts.newData) : null,
        opts.changes ? JSON.stringify(opts.changes) : null,
        opts.notes || null,
        opts.ipAddress || null,
        opts.userAgent || null,
      ],
    );
  } catch {
    // Audit logging must never interrupt primary clinical/operational requests
  }
}

function safeJsonObj(v: any): Record<string, any> | null {
  if (!v) return null;
  if (typeof v === 'object' && !Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      return p && typeof p === 'object' && !Array.isArray(p) ? p : null;
    } catch {
      return null;
    }
  }
  return null;
}

function sanitizeChanges(
  rawChanges: any,
  oldObj: Record<string, any> | null,
  newObj: Record<string, any> | null,
): Array<{ field: string; label: string; before: string | null; after: string | null }> {
  const out: Array<{ field: string; label: string; before: string | null; after: string | null }> = [];
  let parsed = rawChanges;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { parsed = null; }
  }
  if (Array.isArray(parsed)) {
    for (const c of parsed) {
      if (!c) continue;
      const field = String(c.field || '').trim();
      if (HIDDEN_DIFF_FIELDS.has(field)) continue;
      const bStr = c.before != null ? String(c.before).trim() : '';
      const aStr = c.after != null ? String(c.after).trim() : '';
      if (UUID_RE.test(bStr) || UUID_RE.test(aStr)) continue;
      if (bStr === aStr) continue;
      out.push({
        field: field || 'detail',
        label: c.label || titleize(field || 'Detail'),
        before: bStr || null,
        after: aStr || null,
      });
    }
  }
  if (!out.length && oldObj && newObj) {
    const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    for (const k of keys) {
      if (HIDDEN_DIFF_FIELDS.has(k)) continue;
      if (/password|pin|secret|token|signature/i.test(k)) continue;
      const bv = oldObj[k];
      const av = newObj[k];
      const bStr = bv == null ? '' : typeof bv === 'object' ? JSON.stringify(bv) : String(bv).trim();
      const aStr = av == null ? '' : typeof av === 'object' ? JSON.stringify(av) : String(av).trim();
      if (bStr === aStr) continue;
      if (UUID_RE.test(bStr) || UUID_RE.test(aStr)) continue;
      out.push({
        field: k,
        label: titleize(k),
        before: bStr ? bStr.slice(0, 200) : null,
        after: aStr ? aStr.slice(0, 200) : null,
      });
    }
  }
  return out;
}

const RECORD_TYPE_LABELS: Record<string, string> = {
  food_drink: 'Food & Drink',
  food_intake: 'Food Intake',
  fluid_intake: 'Fluid & Drinks',
  comfort_check: 'Comfort Check',
  welfare_check: 'Welfare Check',
  personal_care: 'Personal Care',
  general_support: 'General Support',
  housekeeping: 'Housekeeping',
  vitals_bp: 'Blood Pressure',
  vitals_oxygen: 'Oxygen (SpO2)',
  vitals_temp: 'Temperature',
  vitals_weight: 'Weight & MUST',
  one_to_one: '1-to-1 Conversation',
  prn_medication: 'PRN Medication',
  oral_care: 'Oral Care',
  body_map: 'Body Map / Skin',
  bowel_movement: 'Bowel Movement',
};

function formatRecordType(raw?: string | null): string {
  const key = String(raw || '').toLowerCase().trim();
  if (!key) return 'Daily Care Entry';
  return RECORD_TYPE_LABELS[key] || titleize(key);
}

function buildSpecificActionDescription(params: {
  rawAction: string;
  resourceType: string;
  personName: string;
  recordDetail: string;
  newObj: Record<string, any> | null;
  changes: Array<{ field: string; label: string; before: string | null; after: string | null }>;
}): string {
  const act = String(params.rawAction || '').toLowerCase().trim();
  const rType = String(params.resourceType || '').toLowerCase().trim();
  const modLabel = MODULE_LABELS[rType] || titleize(rType || 'System Record');
  const person = cleanLabel(params.personName);
  const detail = cleanLabel(params.recordDetail);
  const newObj = params.newObj || {};
  const changes = params.changes || [];

  if (act === 'pin_login') return 'Signed in to CompCare Hub (Quick PIN)';
  if (act === 'login' || act === 'sign_in' || rType === 'auth' || rType === 'session') {
    if (act.includes('logout') || act.includes('sign_out')) return 'Signed out of CompCare Hub';
    return 'Signed in to CompCare Hub';
  }
  if (act === 'clock_in' || rType === 'clockin' || rType === 'clock_in') {
    if (String(newObj.event_type || '').toLowerCase() === 'clock_out' || act === 'clock_out') {
      return person ? `Clocked out from shift (${person})` : 'Clocked out from shift';
    }
    return person ? `Clocked in on shift (${person})` : 'Clocked in on shift';
  }
  if (act === 'clock_out') return person ? `Clocked out from shift (${person})` : 'Clocked out from shift';

  if (rType === 'task' || rType === 'tasks') {
    const taskTitle = cleanLabel(newObj.title || newObj.task_title || detail) || 'Care Task';
    const isHouseWide = !person || person === 'House / All Residents' || person.toLowerCase() === taskTitle.toLowerCase();
    const status = String(newObj.status || '').toLowerCase();
    if (act === 'complete' || act === 'completed' || status === 'completed') {
      return isHouseWide ? `Completed House Task "${taskTitle}"` : `Completed Task "${taskTitle}" for ${person}`;
    }
    if (act === 'create' || act === 'created') {
      return isHouseWide ? `Created House Task "${taskTitle}"` : `Created Task "${taskTitle}" for ${person}`;
    }
    if (act === 'delete' || act === 'deleted') {
      return isHouseWide ? `Deleted House Task "${taskTitle}"` : `Deleted Task "${taskTitle}" (${person})`;
    }
    const changedLabels = changes.slice(0, 3).map(c => c.label).join(', ');
    return !isHouseWide
      ? `Updated Task "${taskTitle}" for ${person}${changedLabels ? ` (${changedLabels})` : ''}`
      : `Updated House Task "${taskTitle}"${changedLabels ? ` (${changedLabels})` : ''}`;
  }

  if (rType === 'daily_record' || rType === 'daily_records') {
    const recType = formatRecordType(newObj.record_type || detail);
    if (act === 'delete' || act === 'deleted') return person ? `Deleted ${recType} entry for ${person}` : `Deleted ${recType} entry`;
    if (act === 'update' || act === 'updated') return person ? `Updated ${recType} entry for ${person}` : `Updated ${recType} entry`;
    return person ? `Recorded ${recType} for ${person}` : `Recorded ${recType}`;
  }

  if (rType === 'mar' || rType === 'mar_record' || rType === 'mar_records') {
    const drug = cleanLabel(newObj.drug_name || newObj.medication_name || detail);
    const outcome = titleize(newObj.outcome || newObj.status || 'Administered');
    return person
      ? `${outcome} Medication${drug ? ` (${drug})` : ''} for ${person}`
      : `${outcome} Medication${drug ? ` (${drug})` : ''}`;
  }

  if (rType === 'care_plan' || rType === 'care_plans') {
    const planName = titleize(newObj.custom_name || newObj.plan_type || detail || 'Support Plan');
    const changedLabels = changes.slice(0, 3).map(c => c.label).join(', ');
    if (act === 'create' || act === 'created') return person ? `Created Support Plan "${planName}" for ${person}` : `Created Support Plan "${planName}"`;
    if (act === 'delete' || act === 'deleted') return person ? `Archived Support Plan "${planName}" for ${person}` : `Archived Support Plan "${planName}"`;
    return person
      ? `Updated Support Plan "${planName}" for ${person}${changedLabels ? ` — changed ${changedLabels}` : ''}`
      : `Updated Support Plan "${planName}"${changedLabels ? ` — changed ${changedLabels}` : ''}`;
  }

  if (rType === 'risk_assessment' || rType === 'risk_assessments') {
    const riskName = titleize(newObj.custom_name || newObj.risk_type || detail || 'Risk Assessment');
    const changedLabels = changes.slice(0, 3).map(c => c.label).join(', ');
    if (act === 'create' || act === 'created') return person ? `Created Risk Assessment "${riskName}" for ${person}` : `Created Risk Assessment "${riskName}"`;
    return person
      ? `Updated Risk Assessment "${riskName}" for ${person}${changedLabels ? ` — changed ${changedLabels}` : ''}`
      : `Updated Risk Assessment "${riskName}"${changedLabels ? ` — changed ${changedLabels}` : ''}`;
  }

  if (rType === 'staff' || rType === 'staff_member') {
    const roleTxt = newObj.role ? titleize(newObj.role) : '';
    if (act === 'create' || act === 'created') {
      return person ? `Added Staff Profile — ${person}${roleTxt ? ` (${roleTxt})` : ''}` : `Added Staff Profile${roleTxt ? ` (${roleTxt})` : ''}`;
    }
    if (act === 'delete' || act === 'deleted') {
      return person ? `Removed / Deactivated Staff Profile — ${person}` : 'Removed / Deactivated Staff Profile';
    }
    if (changes.length > 0) {
      const summaryParts = changes.slice(0, 3).map(c => (c.after && c.after.length <= 32 ? `${c.label}: ${c.after}` : c.label));
      return person ? `Updated Staff Profile (${person}) — ${summaryParts.join(', ')}` : `Updated Staff Profile — ${summaryParts.join(', ')}`;
    }
    const hintFields: string[] = [];
    if (newObj.role) hintFields.push(`Role: ${titleize(newObj.role)}`);
    if (newObj.is_active === false) hintFields.push('Deactivated account');
    else if (newObj.is_active === true) hintFields.push('Profile saved');
    return person
      ? `Updated Staff Profile — ${person}${hintFields.length ? ` (${hintFields.join(', ')})` : ' (Profile / Access Settings)'}`
      : `Updated Staff Profile${hintFields.length ? ` (${hintFields.join(', ')})` : ''}`;
  }

  if (rType === 'service_user' || rType === 'service_users') {
    const changedLabels = changes.slice(0, 3).map(c => c.label).join(', ');
    if (act === 'create' || act === 'created') return person ? `Created Service User Profile — ${person}` : 'Created Service User Profile';
    if (act === 'delete' || act === 'deleted') return person ? `Archived Service User Profile — ${person}` : 'Archived Service User Profile';
    return person
      ? `Updated Service User Profile (${person})${changedLabels ? ` — changed ${changedLabels}` : ''}`
      : `Updated Service User Profile${changedLabels ? ` — changed ${changedLabels}` : ''}`;
  }

  const verb =
    act === 'create' || act === 'created' ? 'Created'
    : act === 'update' || act === 'updated' ? 'Updated'
    : act === 'delete' || act === 'deleted' ? 'Deleted'
    : act === 'approve' || act === 'approved' ? 'Approved'
    : act === 'decline' || act === 'declined' ? 'Declined'
    : titleize(act || 'Recorded');

  const changedLabels = changes.slice(0, 3).map(c => c.label).join(', ');
  const subject = person && detail && person !== detail ? `${person} (${detail})` : (person || detail);
  return `${verb} ${modLabel}${subject ? ` — ${subject}` : ''}${changedLabels ? ` [${changedLabels}]` : ''}`;
}

// GET /api/audit-trail — unified System Activity & Audit Trail with 100% UUID-to-Name resolution
router.get('/',
  requireRole('home_manager', 'group_admin', 'admin', 'recruitment_admin', 'deputy_manager', 'registered_manager', 'service_manager', 'director', 'auditor', 'super_admin'),
  [
    qv('from').optional().isISO8601(),
    qv('to').optional().isISO8601(),
    qv('limit').optional().isInt({ min: 1, max: 1000 }),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
      const { from, to, staffId, action, entityType, resourceType, actorSource, search } = req.query as Record<string, string>;
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 300, 1000);

      const trailParams: unknown[] = [homeId];
      let trailSql = `
        SELECT at.id, at.home_id, at.staff_id,
               COALESCE(NULLIF(at.staff_name, ''), st.first_name || ' ' || st.last_name, 'System') AS resolved_staff_name,
               COALESCE(st.role, '') AS resolved_staff_role,
               at.action, at.resource_type, at.resource_id::text AS resource_id, at.resource_label,
               at.old_data, at.new_data, at.changes, at.notes, at.ip_address, at.created_at
        FROM audit_trail at
        LEFT JOIN staff st ON st.id = at.staff_id
        WHERE at.home_id = $1`;
      if (from) { trailParams.push(from); trailSql += ` AND at.created_at >= $${trailParams.length}::date`; }
      if (to) { trailParams.push(to); trailSql += ` AND at.created_at < ($${trailParams.length}::date + INTERVAL '1 day')`; }
      if (staffId) { trailParams.push(staffId); trailSql += ` AND at.staff_id = $${trailParams.length}`; }
      trailSql += ` ORDER BY at.created_at DESC LIMIT ${limit}`;

      const logParams: unknown[] = [homeId];
      let logSql = `
        SELECT al.id::text AS id, al.home_id, al.staff_id,
               COALESCE(st.first_name || ' ' || st.last_name, 'System') AS resolved_staff_name,
               COALESCE(st.role, '') AS resolved_staff_role,
               al.action, al.table_name AS resource_type, al.record_id::text AS resource_id,
               NULL::text AS resource_label,
               NULL::jsonb AS old_data, al.new_values AS new_data, NULL::jsonb AS changes, NULL::text AS notes,
               al.ip_address, al."timestamp" AS created_at
        FROM audit_log al
        LEFT JOIN staff st ON st.id = al.staff_id
        WHERE al.home_id = $1`;
      if (from) { logParams.push(from); logSql += ` AND al."timestamp" >= $${logParams.length}::date`; }
      if (to) { logParams.push(to); logSql += ` AND al."timestamp" < ($${logParams.length}::date + INTERVAL '1 day')`; }
      if (staffId) { logParams.push(staffId); logSql += ` AND al.staff_id = $${logParams.length}`; }
      logSql += ` ORDER BY al."timestamp" DESC LIMIT ${limit}`;

      const [
        trailRows,
        legacyRows,
        suLookupRows,
        staffLookupRows,
        carePlanLookupRows,
        riskLookupRows,
        taskLookupRows,
        dailyLookupRows,
        medLookupRows,
        policyLookupRows,
        homeLookupRows,
      ] = await Promise.all([
        query<any>(trailSql, trailParams).catch(() => []),
        query<any>(logSql, logParams).catch(() => []),
        query<any>(`SELECT su.id::text AS id, su.first_name || ' ' || su.last_name AS name FROM service_users su WHERE su.home_id = $1`, [homeId]).catch(() => []),
        query<any>(`SELECT id::text AS id, first_name || ' ' || last_name AS name, role FROM staff`, []).catch(() => []),
        query<any>(
          `SELECT cp.id::text AS id, su.first_name || ' ' || su.last_name AS su_name,
                  COALESCE(NULLIF(cp.custom_name, ''), cp.plan_type) AS detail
           FROM care_plans cp JOIN service_users su ON su.id = cp.su_id WHERE cp.home_id = $1`,
          [homeId],
        ).catch(() => []),
        query<any>(
          `SELECT ra.id::text AS id, su.first_name || ' ' || su.last_name AS su_name,
                  COALESCE(NULLIF(ra.custom_name, ''), ra.risk_type) AS detail
           FROM risk_assessments ra JOIN service_users su ON su.id = ra.su_id WHERE ra.home_id = $1`,
          [homeId],
        ).catch(() => []),
        query<any>(
          `SELECT t.id::text AS id, su.first_name || ' ' || su.last_name AS su_name, t.title AS detail
           FROM tasks t LEFT JOIN service_users su ON su.id = t.su_id WHERE t.home_id = $1`,
          [homeId],
        ).catch(() => []),
        query<any>(
          `SELECT dr.id::text AS id, su.first_name || ' ' || su.last_name AS su_name, dr.record_type AS detail
           FROM daily_records dr LEFT JOIN service_users su ON su.id = dr.su_id WHERE dr.home_id = $1
           ORDER BY dr.recorded_at DESC LIMIT 2000`,
          [homeId],
        ).catch(() => []),
        query<any>(
          `SELECT m.id::text AS id, su.first_name || ' ' || su.last_name AS su_name, m.drug_name AS detail
           FROM su_medications m JOIN service_users su ON su.id = m.su_id WHERE su.home_id = $1`,
          [homeId],
        ).catch(() => []),
        query<any>(`SELECT id::text AS id, title AS detail FROM policies WHERE home_id = $1`, [homeId]).catch(() => []),
        query<any>(`SELECT id::text AS id, name FROM homes`, []).catch(() => []),
      ]);

      const suMap = new Map<string, string>(suLookupRows.map((r: any) => [r.id, r.name]));
      const staffMap = new Map<string, string>(staffLookupRows.map((r: any) => [r.id, r.name]));
      const homeMap = new Map<string, string>(homeLookupRows.map((r: any) => [r.id, r.name]));
      const recordMap = new Map<string, { person?: string; detail?: string }>();
      for (const r of carePlanLookupRows) recordMap.set(r.id, { person: r.su_name, detail: titleize(r.detail) });
      for (const r of riskLookupRows) recordMap.set(r.id, { person: r.su_name, detail: titleize(r.detail) });
      for (const r of taskLookupRows) recordMap.set(r.id, { person: r.su_name, detail: r.detail });
      for (const r of dailyLookupRows) recordMap.set(r.id, { person: r.su_name, detail: titleize(r.detail) });
      for (const r of medLookupRows) recordMap.set(r.id, { person: r.su_name, detail: r.detail });
      for (const r of policyLookupRows) recordMap.set(r.id, { detail: r.detail });

      const seenKeys = new Set<string>();
      const recentLoginTimestampsByStaff = new Map<string, number[]>();
      const combinedRaw = [...trailRows, ...legacyRows];
      const filterType = (entityType || resourceType || '').toLowerCase();

      const enriched = [];
      for (const row of combinedRaw) {
        const tsMs = row.created_at ? new Date(row.created_at).getTime() : 0;
        const rawActLower = String(row.action || '').toLowerCase().trim();
        const isLoginEvent = rawActLower === 'login' || rawActLower === 'pin_login' || rawActLower === 'sign_in' || String(row.resource_type || '').toLowerCase() === 'auth';

        if (isLoginEvent && row.staff_id && tsMs > 0) {
          const prevTimes = recentLoginTimestampsByStaff.get(String(row.staff_id)) || [];
          if (prevTimes.some(prev => Math.abs(prev - tsMs) < 5000)) continue;
          prevTimes.push(tsMs);
          recentLoginTimestampsByStaff.set(String(row.staff_id), prevTimes);
        } else {
          const tsSec = Math.floor(tsMs / 2000);
          const dedupeKey = `${row.staff_id || ''}|${rawActLower}|${row.resource_id || ''}|${tsSec}`;
          if (seenKeys.has(dedupeKey)) continue;
          seenKeys.add(dedupeKey);
        }

        const oldObj = safeJsonObj(row.old_data);
        const newObj = safeJsonObj(row.new_data);
        const resId = String(row.resource_id || '').trim();
        const rType = String(row.resource_type || (isLoginEvent ? 'auth' : '')).toLowerCase().trim();

        let personName = cleanLabel(row.resource_label);
        let recordDetail = '';

        // Split compound labels such as "Declan Charlick — House Keeping" into Person ("Declan Charlick") + Detail ("House Keeping")
        if ((rType === 'task' || rType === 'tasks') && personName.includes(' — ')) {
          const [leftPart, ...restParts] = personName.split(' — ');
          personName = leftPart.trim();
          recordDetail = restParts.join(' — ').trim();
        }

        const mappedRec = resId ? recordMap.get(resId) : undefined;
        if (mappedRec) {
          if (mappedRec.person) personName = mappedRec.person;
          if (mappedRec.detail && !recordDetail) recordDetail = mappedRec.detail;
        }
        if ((rType === 'task' || rType === 'tasks') && personName && newObj && !newObj.su_id && personName.toLowerCase() === String(newObj.title || recordDetail || '').toLowerCase()) {
          recordDetail = personName;
          personName = 'House / All Residents';
        }
        if (!personName && resId) {
          personName = suMap.get(resId) || staffMap.get(resId) || homeMap.get(resId) || '';
        }
        if (!personName && newObj) {
          if (newObj.su_id && suMap.has(String(newObj.su_id))) personName = suMap.get(String(newObj.su_id))!;
          else if (newObj.staff_id && staffMap.has(String(newObj.staff_id))) personName = staffMap.get(String(newObj.staff_id))!;
          else if (newObj.first_name || newObj.last_name) personName = `${newObj.first_name || ''} ${newObj.last_name || ''}`.trim();
          else if (newObj.su_name) personName = cleanLabel(newObj.su_name);
          else if (newObj.staff_name) personName = cleanLabel(newObj.staff_name);
        }
        if (!personName && oldObj && (oldObj.first_name || oldObj.last_name)) {
          personName = `${oldObj.first_name || ''} ${oldObj.last_name || ''}`.trim();
        }
        if (!recordDetail && newObj) {
          recordDetail = cleanLabel(newObj.title || newObj.course_name || newObj.drug_name || newObj.custom_name || (newObj.record_type ? titleize(newObj.record_type) : ''));
        }
        if (!personName && (String(row.action || '').toLowerCase().includes('login') || rType === 'auth' || rType === 'session')) {
          personName = cleanLabel(row.resolved_staff_name) || 'Staff Member';
        }
        if (!personName) {
          personName = recordDetail || MODULE_LABELS[rType] || titleize(rType || 'System');
        }

        const changes = sanitizeChanges(row.changes, oldObj, newObj);
        const actionDescription = buildSpecificActionDescription({
          rawAction: row.action,
          resourceType: rType,
          personName,
          recordDetail,
          newObj,
          changes,
        });

        const moduleLabel = MODULE_LABELS[rType] || titleize(rType || 'System');
        const actorName = cleanLabel(row.resolved_staff_name) || 'System';
        const actorRole = String(row.resolved_staff_role || '').trim();
        const resolvedActorSource = OFFICE_ROLES.has(actorRole) ? 'office' : 'staff';

        if (action && String(row.action || '').toLowerCase() !== action.toLowerCase()) continue;
        if (filterType && rType !== filterType) continue;
        if (actorSource && resolvedActorSource !== actorSource) continue;
        if (search && search.trim()) {
          const q = search.trim().toLowerCase();
          const hay = `${actorName} ${actorRole} ${personName} ${moduleLabel} ${actionDescription}`.toLowerCase();
          if (!hay.includes(q)) continue;
        }

        const roleLabel = actorRole ? titleize(actorRole) : 'System';
        enriched.push({
          id: row.id,
          created_at: row.created_at,
          staff_name: actorName,
          actor_name: actorName,
          staff_role: actorRole,
          actor_role: actorRole,
          staff_role_label: roleLabel,
          actor_source: resolvedActorSource,
          actor_source_label: resolvedActorSource === 'office' ? 'Office / Management' : 'Care Staff',
          role_label: roleLabel,
          action: String(row.action || 'update').toLowerCase(),
          raw_action: String(row.action || 'update').toLowerCase(),
          action_description: actionDescription,
          entity_type: moduleLabel,
          resource_type: rType || 'system',
          target_type: rType || 'system',
          module_label: moduleLabel,
          person_affected: personName,
          target_person_name: personName,
          entity_label: actionDescription,
          resource_label: actionDescription,
          target_name: personName,
          record_detail: recordDetail || null,
          old_data: sanitizeAuditSnapshot(oldObj),
          new_data: sanitizeAuditSnapshot(newObj),
          changes,
          ip_address: row.ip_address || null,
        });
      }

      enriched.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      res.json({ success: true, data: enriched.slice(0, limit) });
    } catch (err) { next(err); }
  },
);

export default router;
