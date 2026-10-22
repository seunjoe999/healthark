import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { logAudit, sanitizeAuditSnapshot } from '../routes/auditTrail.routes';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PATH_TABLES: Record<string, { table: string; targetType: string }> = {
  residents: { table: 'service_users', targetType: 'service_user' },
  'service-users': { table: 'service_users', targetType: 'service_user' },
  staff: { table: 'staff', targetType: 'staff' },
  homes: { table: 'homes', targetType: 'home' },
  'care-plans': { table: 'care_plans', targetType: 'care_plan' },
  'risk-assessments': { table: 'risk_assessments', targetType: 'risk_assessment' },
  reviews: { table: 'su_reviews', targetType: 'review' },
  'service-feedback': { table: 'service_user_feedback', targetType: 'service_user_feedback' },
  incidents: { table: 'records_incidents', targetType: 'incident' },
  confidential: { table: 'confidential_info', targetType: 'confidential_info' },
  calendar: { table: 'calendar_events', targetType: 'calendar_event' },
  'gp-referrals': { table: 'gp_referrals', targetType: 'gp_referral' },
  'daily-records': { table: 'daily_records', targetType: 'daily_record' },
  tasks: { table: 'tasks', targetType: 'task' },
  'medicine-risk': { table: 'medicine_risk_assessments', targetType: 'medicine_risk' },
  safeguarding: { table: 'safeguarding_concerns', targetType: 'safeguarding' },
  policies: { table: 'policies', targetType: 'policy' },
};

const SKIP_DIFF_KEYS = new Set([
  'id', 'home_id', 'su_id', 'staff_id', 'user_id',
  'created_at', 'updated_at', 'organisation_id', 'password_hash', 'pin_hash',
  'created_by', 'updated_by', 'logged_by', 'recorded_by', 'completed_by', 'reviewed_by', 'conducted_by',
  'parent_shift_id', 'template_id', 'daily_record_id', 'medication_id',
  'signature_data', 'staff_signature', 'su_signature', 'su_signature_dataurl', 'staff_signature_dataurl',
]);

function humanizeField(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function normalizeVal(val: any): string {
  if (val === null || val === undefined || val === '') return '';
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T00:00:00/.test(val)) return val.slice(0, 10);
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val).trim();
}

export function computeFieldDiffs(
  oldRow: Record<string, any> | null,
  newRow: Record<string, any> | null,
  reqBody?: Record<string, any>
): Array<{ field: string; label: string; before: any; after: any }> {
  const diffs: Array<{ field: string; label: string; before: any; after: any }> = [];

  if (oldRow && newRow) {
    const allKeys = new Set([...Object.keys(oldRow), ...Object.keys(newRow)]);
    for (const k of allKeys) {
      if (SKIP_DIFF_KEYS.has(k)) continue;
      if (/password|pin|secret|token|signature/i.test(k)) continue;
      const before = oldRow[k];
      const after = newRow[k];
      const bNorm = normalizeVal(before);
      const aNorm = normalizeVal(after);
      if (bNorm !== aNorm && !UUID_RE.test(bNorm) && !UUID_RE.test(aNorm)) {
        diffs.push({
          field: k,
          label: humanizeField(k),
          before: before ?? null,
          after: after ?? null,
        });
      }
    }
    return diffs;
  }

  if (reqBody && typeof reqBody === 'object') {
    for (const [k, v] of Object.entries(reqBody)) {
      if (SKIP_DIFF_KEYS.has(k)) continue;
      if (/password|pin|secret|token|signature/i.test(k)) continue;
      if (typeof v === 'string' && v.startsWith('data:image/')) continue;
      if (typeof v === 'string' && UUID_RE.test(v.trim())) continue;
      diffs.push({
        field: k,
        label: humanizeField(k),
        before: null,
        after: v,
      });
    }
  }
  return diffs;
}

async function resolveActorAndTarget(
  staffId?: string | null,
  tableInfo?: { table: string; targetType: string } | null,
  targetId?: string | null,
  row?: Record<string, any> | null,
  reqBody?: Record<string, any> | null
) {
  let staffName: string | null = null;
  let staffRole: string | null = null;
  let homeId: string | null = row?.home_id || reqBody?.homeId || reqBody?.home_id || null;
  let targetName: string | null = null;

  if (staffId && UUID_RE.test(staffId)) {
    try {
      const sRows = await query<any>('SELECT first_name, last_name, role, home_id FROM staff WHERE id = $1', [staffId]);
      if (sRows[0]) {
        staffName = `${sRows[0].first_name || ''} ${sRows[0].last_name || ''}`.trim() || null;
        staffRole = sRows[0].role || null;
        if (!homeId) homeId = sRows[0].home_id || null;
      }
    } catch {}
  }

  const suId = row?.su_id || reqBody?.suId || reqBody?.su_id || (tableInfo?.table === 'service_users' ? targetId : null);
  if (suId && UUID_RE.test(String(suId))) {
    try {
      const suRows = await query<any>('SELECT first_name, last_name, home_id FROM service_users WHERE id = $1', [suId]);
      if (suRows[0]) {
        const residentName = `${suRows[0].first_name || ''} ${suRows[0].last_name || ''}`.trim();
        const itemTitle = row?.title || row?.custom_name || row?.assessment_name || row?.review_type || reqBody?.title;
        targetName = itemTitle ? `${residentName} — ${itemTitle}` : residentName;
        if (!homeId) homeId = suRows[0].home_id || null;
      }
    } catch {}
  } else if (tableInfo?.table === 'staff' && targetId && UUID_RE.test(targetId)) {
    try {
      const stRows = await query<any>('SELECT first_name, last_name FROM staff WHERE id = $1', [targetId]);
      if (stRows[0]) targetName = `${stRows[0].first_name || ''} ${stRows[0].last_name || ''}`.trim();
    } catch {}
  } else if (row?.title || reqBody?.title) {
    targetName = String(row?.title || reqBody?.title);
  }

  return { staffName, staffRole, homeId, targetName };
}

export function auditMutationMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    next();
    return;
  }

  const cleanPath = req.path.replace(/^\/api\//, '').replace(/^\//, '');
  const parts = cleanPath.split('/').filter(Boolean);
  const rootSeg = parts[0] || '';

  if (rootSeg === 'health' || (rootSeg === 'auth' && parts[1] === 'refresh')) {
    next();
    return;
  }

  const tableInfo = PATH_TABLES[rootSeg] || null;
  const targetUuid = [...parts].reverse().find(seg => UUID_RE.test(seg)) || null;

  let beforeRow: Record<string, any> | null = null;
  const preFetch = (async () => {
    if (tableInfo && targetUuid && ['PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      try {
        const rows = await query<any>(`SELECT * FROM ${tableInfo.table} WHERE id = $1`, [targetUuid]);
        beforeRow = rows[0] || null;
      } catch {
        beforeRow = null;
      }
    }
  })();

  let responsePayload: any = null;
  const origJson = res.json.bind(res);
  res.json = ((body: any) => {
    responsePayload = body;
    return origJson(body);
  }) as any;

  preFetch.finally(() => {
    res.on('finish', () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      if (!req.staff && rootSeg !== 'auth') return;

      void (async () => {
        try {
          let afterRow: Record<string, any> | null = null;
          const createdOrTargetId =
            targetUuid ||
            (responsePayload?.data?.id && UUID_RE.test(String(responsePayload.data.id))
              ? String(responsePayload.data.id)
              : null);

          if (tableInfo && createdOrTargetId && req.method !== 'DELETE') {
            try {
              const rows = await query<any>(`SELECT * FROM ${tableInfo.table} WHERE id = $1`, [createdOrTargetId]);
              afterRow = rows[0] || null;
            } catch {
              afterRow = null;
            }
          }

          const action =
            rootSeg === 'auth' && parts[1] === 'login'
              ? 'LOGIN'
              : req.method === 'POST'
              ? 'CREATE'
              : req.method === 'DELETE'
              ? 'DELETE'
              : 'UPDATE';

          const staffId = req.staff?.staffId || responsePayload?.data?.staff?.id || null;
          const resolved = await resolveActorAndTarget(
            staffId,
            tableInfo,
            createdOrTargetId,
            afterRow || beforeRow,
            req.body
          );

          const changes =
            action === 'UPDATE'
              ? computeFieldDiffs(beforeRow, afterRow, req.body)
              : action === 'CREATE'
              ? computeFieldDiffs(null, null, afterRow ? sanitizeAuditSnapshot(afterRow) || req.body : req.body)
              : [];

          await logAudit({
            organisationId: req.staff?.organisationId || responsePayload?.data?.staff?.organisation_id || null,
            homeId: resolved.homeId || req.staff?.homeId || null,
            staffId,
            staffName: resolved.staffName,
            staffEmail: req.staff?.email || responsePayload?.data?.staff?.email || null,
            staffRole: resolved.staffRole || req.staff?.role || null,
            action,
            targetType: tableInfo?.targetType || rootSeg || 'system',
            targetId: createdOrTargetId,
            targetName: resolved.targetName,
            oldData: beforeRow,
            newData: afterRow || (req.body && Object.keys(req.body).length ? req.body : null),
            changes,
            notes: `${req.method} /api/${cleanPath}`,
            ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || null,
            userAgent: req.headers['user-agent'] || null,
          });
        } catch {
          // Never interrupt user requests
        }
      })();
    });

    next();
  });
}

export const auditLog = auditMutationMiddleware;
