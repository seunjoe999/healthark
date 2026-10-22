import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import jwt from 'jsonwebtoken';
import https from 'https';
import { evaluateGeofence, GeofenceCheckPoint } from '../utils/geofence';
import { getDueTodayTasks } from '../utils/medicationDue';
import { getMyPendingTasksToday } from '../utils/taskDue';
import { ukDateStr, ukTimeHHMM } from '../utils/ukTime';
import { logger } from '../config/logger';
import { createAlert } from '../services/alerts.service';

const router = Router();

// Each clock event now records WHICH of today's rota shifts it belongs to.
// Without this, a staff member with two shifts on the same date (a short
// day shift and a night shift) had a single global "am I clocked in"
// state — one clock-in silently covered both shifts, there was no way to
// tell which shift a clock-out was closing, and the clock-out gate's
// "pending tasks/medication due" checks were scoped to the combined window
// of ALL of today's shifts instead of just the one being closed, which
// could block closing shift 1 over something only due during shift 2.
async function ensureClockEventShiftColumn() {
  await query(`ALTER TABLE staff_clock_events ADD COLUMN IF NOT EXISTS shift_id UUID`, []);
}
router.use(async (_req, _res, next) => { try { await ensureClockEventShiftColumn(); } catch (_) {} next(); });

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7);
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || ''; }
  return '';
}

// Base URL for QR codes / clock-in links. FRONTEND_URL overrides when the
// frontend is served from a different host than the API; otherwise derive
// it from the request (trust proxy is on, so this reflects the public
// compcarehub.co.uk host behind nginx, not the container's internal one).
function frontendBase(req: Request): string {
  return process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
}

// "HH:MM" / "HH:MM:SS" -> minutes since midnight, or null if unset.
function hhmmToMins(t?: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.slice(0, 5).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// Which of today's rota shifts a clock event should be tied to right now:
// whichever shift is actually in progress, else the next one still to
// come today, else (everything already ended) the last one of the day.
// Mirrors the same "which shift is this really about" logic used on the
// staff dashboard, so the clock-in flow and the dashboard never disagree
// about which shift "now" belongs to.
function pickShiftForNow(shifts: any[], nowMins: number): any | null {
  const windows = shifts
    .map(sh => {
      const s = hhmmToMins(sh.start_time);
      let e = hhmmToMins(sh.end_time);
      if (s != null && e != null && e <= s) e += 1440; // overnight shift
      return { sh, s, e };
    })
    .filter((w): w is { sh: any; s: number; e: number } => w.s != null && w.e != null);
  if (!windows.length) return shifts[0] || null;
  const inProgress = windows.find(w => nowMins >= w.s && nowMins <= w.e);
  if (inProgress) return inProgress.sh;
  const upcoming = windows.filter(w => w.s > nowMins).sort((a, b) => a.s - b.s)[0];
  if (upcoming) return upcoming.sh;
  return windows.sort((a, b) => b.s - a.s)[0].sh;
}

function geocodePostcode(postcode: string): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    const clean = postcode.replace(/\s+/g, '');
    https.get(`https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 200 && json.result) {
            resolve({ latitude: json.result.latitude, longitude: json.result.longitude });
          } else {
            resolve(null);
          }
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

// International geocoding via OpenStreetMap Nominatim (works worldwide)
function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    https.get(url, { headers: { 'User-Agent': 'HealthArk-CareManagement/1.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.length > 0) {
            resolve({ latitude: parseFloat(json[0].lat), longitude: parseFloat(json[0].lon) });
          } else {
            resolve(null);
          }
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

// ── Home-based clock-in (new) ──────────────────────────────────────

// GET /api/clockin/home/:token — public, get home info by home qr_token
router.get('/home/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await query<any>(
      `SELECT h.id, h.name, h.qr_token FROM homes h WHERE h.qr_token = $1`,
      [req.params.token]
    );
    if (!rows.length) throw new AppError('Invalid QR code', 404);
    const home = rows[0];
    const postcodes = await query<any>(
      'SELECT id, postcode, label, latitude, longitude FROM home_postcodes WHERE home_id = $1',
      [home.id]
    );
    res.json({
      success: true,
      data: {
        homeId: home.id,
        homeName: home.name,
        hasPostcodes: postcodes.length > 0,
        geofenceRadius: 200,
      }
    } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/clockin/event — staff clocks in/out with GPS, checked against home postcodes
router.post('/event', authenticate,
  // Location is required to clock IN. Clock-OUT is never location-checked, so
  // it must not be refused just because the phone could not get a GPS fix —
  // that left staff unable to clock out at all and stuck "clocked in".
  [body('homeId').isUUID(),
   body('staffLat').if((_: any, { req }: any) => req.body.eventType !== 'clock_out').isNumeric(),
   body('staffLng').if((_: any, { req }: any) => req.body.eventType !== 'clock_out').isNumeric()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = fromToken(req, 'staffId');
      const { homeId, suId, eventType } = req.body;
      const staffLat = Number.isFinite(Number(req.body.staffLat)) ? Number(req.body.staffLat) : 0;
      const staffLng = Number.isFinite(Number(req.body.staffLng)) ? Number(req.body.staffLng) : 0;
      const gpsAccuracy = parseFloat(req.body.accuracy) || null;

      // Build list of valid check points. Which QR the staff member happened to
      // scan does NOT decide where they must be — the rota does. If today's rota
      // has them assigned to a specific resident (a supported-living/outreach
      // placement, say), they must clock in at THAT resident's address, even if
      // they scanned the general home QR because that's the only one they have.
      // Only when the rota has no resident tied to today's shift do we fall back
      // to the office/home address (and any extra postcodes configured in
      // Clock-In Admin). The suId the client sends (from a resident-specific QR)
      // is still honoured as an extra check point, never as the sole source of
      // truth, so scanning the "right" QR is never required to pass — only to be
      // physically in the right place.
      const checkPoints: GeofenceCheckPoint[] = [];
      const suIdsChecked = new Set<string>();

      const addServiceUserCheckPoint = async (id: string) => {
        if (!id || suIdsChecked.has(id)) return;
        suIdsChecked.add(id);
        const suRows = await query<any>(
          'SELECT first_name, last_name, room_number, latitude, longitude, geofence_radius FROM service_users WHERE id = $1 AND home_id = $2',
          [id, homeId]
        );
        const su = suRows[0];
        if (su?.latitude && su?.longitude) {
          const label = [`${su.first_name} ${su.last_name}`, su.room_number].filter(Boolean).join(', ');
          checkPoints.push({ lat: parseFloat(su.latitude), lng: parseFloat(su.longitude), label, radius: su.geofence_radius || 200 });
        }
      };

      // Same "trim + collapse whitespace + case-insensitive" normalization used
      // when de-duplicating near-identical rota service labels ("KENNEDY ROAD"
      // vs "KENNEDY  ROAD ") — a service's saved geofence postcode label has to
      // survive that same messiness to actually match its shifts.
      const normalizeLabel = (l?: string | null) => (l || '').trim().replace(/\s+/g, ' ').toUpperCase();

      // UK date, not the server's own UTC clock — see getMyPendingTasksToday for
      // why this class of bug matters most right around UK midnight during BST.
      const todayStr = ukDateStr();
      // These four reads are independent of each other, so they are fired
      // together, not one after another. At busy changeovers each one can
      // wait seconds for a database connection, and awaited one-by-one those
      // waits stack past the phone's 15-second timeout even when nothing is
      // actually broken — the phone gives up while the server is still
      // working, which surfaces as "Failed to clock out". Batched, the set
      // costs roughly one wait instead of four. Behaviour on failure is
      // unchanged: a failed rota lookup still fails the request, and the two
      // optional-column reads keep their own fallbacks (see below).
      const rotaShiftsP = query<any>(
        `SELECT id, su_id, su_ids, label, start_time, end_time FROM staff_shifts WHERE staff_id = $1 AND home_id = $2 AND shift_date = $3`,
        [staffId, homeId, todayStr]
      );
      const staffRowsP = query<any>('SELECT first_name, last_name, role FROM staff WHERE id = $1', [staffId]);
      // shift_id may not exist yet on a database whose boot migrations haven't
      // run (fresh deploy ordering) — read it when present, NULL when absent,
      // so this lookup (which every clock request runs) can never 500 for
      // want of an optional column.
      const lastEventP: Promise<any[]> = (async () => {
        try {
          return await query<any>(
            `SELECT id, event_type, event_time, home_id, auto_closed, shift_id FROM staff_clock_events WHERE staff_id = $1 ORDER BY event_time DESC LIMIT 1`,
            [staffId]
          );
        } catch (colErr) {
          logger.error('Clock last-event lookup without shift_id (column not yet migrated) — continuing without shift scoping', colErr);
          return await query<any>(
            `SELECT id, event_type, event_time, home_id, auto_closed, NULL::uuid AS shift_id FROM staff_clock_events WHERE staff_id = $1 ORDER BY event_time DESC LIMIT 1`,
            [staffId]
          );
        }
      })();
      const shiftColP: Promise<boolean> = (async () => {
        try {
          const clockCols = await query<any>(
            `SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_clock_events' AND column_name = 'shift_id' LIMIT 1`
          );
          return clockCols.length > 0;
        } catch (colErr) {
          logger.error('Clock shift_id column check failed — proceeding as if the column is present', colErr);
          return true;
        }
      })();
      const [rotaShifts, staffRows, lastEventRows, hasShiftIdCol] = await Promise.all([rotaShiftsP, staffRowsP, lastEventP, shiftColP]);
      const staffRole = staffRows[0]?.role;
      // Which shift "now" actually belongs to — used by clock-in below to tie
      // the event to a specific shift, and by the fast clock-out path above to
      // link the clock-out to a shift where possible.
      const nowMins = hhmmToMins(ukTimeHHMM())!;
      const targetShift = pickShiftForNow(rotaShifts, nowMins);

      // ── CLOCK-OUT FAST PATH ──────────────────────────────────────────
      // Owner instruction (explicit, repeated): clock-out is now AUTOMATIC
      // and immediate — no checks, no gates, no waiting. The tap writes the
      // clock-out record straight away and answers, full stop, no matter how
      // busy the system is or what is outstanding. Everything that used to
      // run BEFORE the record was written (geofence evaluation, medication /
      // tasks outstanding checks, shift scoping, override bookkeeping) now
      // either is skipped entirely (geofence — clock-out is never
      // location-checked anyway) or runs AFTER the response has gone out, as
      // fire-and-forget, purely to inform managers. A clock-out therefore
      // cannot time out, cannot 500 on a check, and cannot be refused — there
      // is no code path below this block that a clock-out can reach.
      if (eventType === 'clock_out') {
        const closingShiftId: string | null = lastEventRows[0]?.shift_id || null;
        const eventShiftId: string | null = closingShiftId || targetShift?.id || null;
        const reasonText = typeof req.body.overrideReason === 'string' && req.body.overrideReason.trim().length >= 5
          ? req.body.overrideReason.trim().slice(0, 500) : '';
        const wasClockedIn = lastEventRows[0]?.event_type === 'clock_in';
        const lastWasAutoClosedOut = lastEventRows[0]?.event_type === 'clock_out' && lastEventRows[0]?.auto_closed === true;
        // Single INSERT, then answer immediately. shift_id tolerance preserved:
        // write with the column when it's there, without it when it isn't.
        let stored: any;
        try {
          const inserted = hasShiftIdCol
            ? await query<any>(
                `INSERT INTO staff_clock_events
                   (staff_id, home_id, event_type, event_time, geofence_passed, punctuality, shift_id)
                 VALUES ($1,$2,'clock_out',NOW(),true,'on_time',$3) RETURNING *`,
                [staffId, homeId, eventShiftId]
              )
            : await query<any>(
                `INSERT INTO staff_clock_events
                   (staff_id, home_id, event_type, event_time, geofence_passed, punctuality)
                 VALUES ($1,$2,'clock_out',NOW(),true,'on_time') RETURNING *`,
                [staffId, homeId]
              );
          stored = inserted[0];
        } catch (insertErr) {
          // The record is the whole point of the tap — if even the INSERT
          // itself fails, say exactly that (with the real reason) instead of
          // the empty "Failed to clock out", so the next report is diagnosable
          // instead of a dead end.
          logger.error('Clock-out INSERT failed', insertErr);
          const why = (insertErr as any)?.message || 'could not be saved';
          return res.status(500).json({ success: false, reason: 'clock_out_not_saved',
            error: `Your clock-out could not be saved (${why}). Please try again — if this keeps happening, tell your manager the time you finished.` });
        }
        // Outstanding-work bookkeeping happens after the answer, never before
        // it. Medication/tasks are computed here only to inform managers — they
        // can never change this response, which has already gone out by the
        // time any of this runs.
        const storedRow = stored;
        const bgStaffName = staffRows[0] ? `${staffRows[0].first_name} ${staffRows[0].last_name}` : 'A staff member';
        void (async () => {
          try {
            const bgNowHHMM = ukTimeHHMM();
            const closingShift = closingShiftId ? rotaShifts.find((s: any) => s.id === closingShiftId) : null;
            const shiftsForClose = closingShift ? [closingShift] : rotaShifts;
            const closeSuIds = Array.from(new Set(
              shiftsForClose.flatMap((sh: any) => [sh.su_id, ...(Array.isArray(sh.su_ids) ? sh.su_ids : [])].filter(Boolean))
            ));
            let wStart: number | null = null;
            let wEnd: number | null = null;
            for (const sh of shiftsForClose) {
              const s = hhmmToMins(sh.start_time);
              let e = hhmmToMins(sh.end_time);
              if (s != null && e != null) {
                if (e <= s) e += 1440;
                wStart = wStart == null ? s : Math.min(wStart, s);
                wEnd = wEnd == null ? e : Math.max(wEnd, e);
              }
            }
            const bgNowMins = hhmmToMins(bgNowHHMM)!;
            const cutoff = wEnd != null ? Math.min(bgNowMins, wEnd) : bgNowMins;
            const outstanding: string[] = [];
            try {
              if (shiftsForClose.length > 0) {
                const dueTasks = await getDueTodayTasks(homeId, staffId, staffRole, closeSuIds.length ? closeSuIds : undefined);
                const overdue = dueTasks.filter(t => {
                  if (t.status !== 'pending') return false;
                  const raw = hhmmToMins(t.scheduledTime);
                  if (raw == null) return false;
                  if (raw > bgNowMins && (wEnd == null || wEnd <= 1440)) return false;
                  const cands = [raw, raw + 1440];
                  const sched = cands.find(c => wStart == null || (c >= wStart && c <= (wEnd ?? Infinity))) ?? raw;
                  if (wStart != null && sched < wStart) return false;
                  if (wEnd != null && sched >= wEnd) return false;
                  return sched <= cutoff;
                });
                if (overdue.length > 0) {
                  outstanding.push(`${overdue.length} medication${overdue.length > 1 ? 's' : ''} still due (${Array.from(new Set(overdue.map(t => t.suName))).join(', ')})`);
                }
              }
            } catch (medErr) {
              logger.error('Post-clock-out medication note failed (clock-out itself already stored)', medErr);
            }
            try {
              const pending = await getMyPendingTasksToday(homeId, staffId, staffRole, closingShiftId || undefined);
              if (pending.length > 0) {
                outstanding.push(`${pending.length} task${pending.length > 1 ? 's' : ''} not completed (${pending.slice(0, 3).map(t => t.title).join(', ')}${pending.length > 3 ? ', …' : ''})`);
              }
            } catch (taskErr) {
              logger.error('Post-clock-out task note failed (clock-out itself already stored)', taskErr);
            }
            if (!wasClockedIn && !lastWasAutoClosedOut) {
              outstanding.push('No matching clock-in was found on record for this clock-out');
            }
            if (outstanding.length) {
              const cols: any[] = await query(
                `SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_clock_events' AND column_name = 'override_reason' LIMIT 1`).catch(() => []);
              if (cols.length) {
                await query('UPDATE staff_clock_events SET override_reason = $1, override_of = $2 WHERE id = $3',
                  [reasonText, outstanding.join(' | ').slice(0, 1500), (storedRow as any).id]).catch(() => {});
              }
              await createAlert({
                homeId, alertType: 'clock_out_with_reason', severity: 'warning', staffId,
                recordId: (storedRow as any).id, recordType: 'clock_event',
                title: `${bgStaffName} clocked out with work outstanding`,
                description: `Outstanding: ${outstanding.join('; ')}.${reasonText ? ` Their reason: "${reasonText}"` : ''}`.slice(0, 1800),
              });
            }
          } catch (bgErr) {
            logger.warn('Post-clock-out bookkeeping failed (clock-out itself already stored): ' + (bgErr as any)?.message);
          }
        })();
        return res.status(201).json({
          success: true,
          data: {
            ...(stored as object),
            geofencePassed: true,
            distanceMetres: null,
            punctuality: 'on_time',
            staffName: bgStaffName,
          }
        } as ApiResponse);
      }
      // ── END CLOCK-OUT FAST PATH — everything below is clock-in only ──
      // Clock-out is never location-checked (evaluateGeofence passes it
      // unconditionally further down), so working out where the staff member
      // should be can never change a clock-out's outcome — it only costs DB
      // pool waits that, at busy shift changes, are what time clock-outs out.
      // Skipped entirely for clock-out.
      const resolvingCheckpoints = eventType !== 'clock_out';
      if (resolvingCheckpoints) {
        for (const sh of rotaShifts) {
          if (sh.su_id) await addServiceUserCheckPoint(sh.su_id);
          if (Array.isArray(sh.su_ids)) for (const id of sh.su_ids) await addServiceUserCheckPoint(id);
        }
        if (suId) await addServiceUserCheckPoint(suId);
      }

      // Only needed to build clock-IN checkpoints — skipped for clock-out
      // (see resolvingCheckpoints above), which never distance-checks.
      const allPostcodes = resolvingCheckpoints ? await query<any>(
        'SELECT postcode, label, latitude, longitude, radius FROM home_postcodes WHERE home_id = $1',
        [homeId]
      ) : [];

      // A rota shift built around a Service (e.g. "KENNEDY SERVICE", a specific
      // house) rather than a named resident has no resident lat/lng to check
      // against at all — this is now the common case since the rota redesign made
      // residents optional on service shifts. Without this, those shifts silently
      // fell back to the office address, blocking staff who are legitimately at a
      // service-user's house miles away. Match today's shift label(s) against any
      // postcode a manager has set for that exact service via Manage Services.
      // Clock-in only — clock-out skips checkpoint resolution entirely (above),
      // so the label matching that feeds it is skipped too.
      const todaysLabels = resolvingCheckpoints
        ? new Set(rotaShifts.map((sh: any) => normalizeLabel(sh.label)).filter(Boolean))
        : new Set<string>();
      for (const pc of allPostcodes) {
        if (todaysLabels.has(normalizeLabel(pc.label)) && pc.latitude && pc.longitude) {
          checkPoints.push({ lat: parseFloat(pc.latitude), lng: parseFloat(pc.longitude), label: pc.label || pc.postcode, radius: pc.radius || 200 });
        }
      }

      const usingResidentCheckpoints = checkPoints.length > 0;

      if (checkPoints.length === 0 && resolvingCheckpoints) {
        // No resident, and no service-label match, tied to today's rota shift (or
        // no shift found yet) — check against the office/home address + every
        // configured postcode instead, as a last resort.
        const homeRows = await query<any>(
          'SELECT address1, postcode, latitude, longitude, geofence_radius FROM homes WHERE id = $1',
          [homeId]
        );
        const home = homeRows[0];
        if (home?.latitude && home?.longitude) {
          const label = [home.address1, home.postcode].filter(Boolean).join(', ');
          checkPoints.push({ lat: parseFloat(home.latitude), lng: parseFloat(home.longitude), label, radius: home.geofence_radius || 200 });
        }
        for (const pc of allPostcodes) {
          if (pc.latitude && pc.longitude) {
            checkPoints.push({ lat: parseFloat(pc.latitude), lng: parseFloat(pc.longitude), label: pc.label || pc.postcode, radius: pc.radius || 200 });
          }
        }
      }

      const outcome = evaluateGeofence({ eventType, staffLat, staffLng, gpsAccuracy, checkPoints });
      // Owner instruction (repeated, explicit): nothing may stop a clock-out,
      // full stop. Weak GPS or being outside the geofence used to 403 a
      // clock-out exactly like a clock-in — someone leaving early, stepping
      // outside for signal, or clocking out from home after forgetting
      // earlier could be blocked here with no way through. Clock-out now
      // always proceeds; the distance/GPS outcome is still recorded on the
      // event for managers to see, it just never blocks.
      if (!outcome.geofencePassed && eventType !== 'clock_out') {
        const placeLabel = usingResidentCheckpoints ? "today's assigned resident" : 'the care home';
        const messages: Record<string, string> = {
          weak_gps: `GPS signal too weak (±${gpsAccuracy ? Math.round(gpsAccuracy) : '?'}m accuracy). Please use a mobile device or move outdoors.`,
          no_location: `No verified location has been set up for ${placeLabel}. Ask your manager to set it in Clock-In Management.`,
          too_far: `You are too far from ${placeLabel}. You are ${outcome.distanceMetres}m from ${outcome.closestLabel} (must be within ${checkPoints[0]?.radius || 200}m${gpsAccuracy ? `, GPS accuracy ±${Math.round(gpsAccuracy)}m` : ''}).`,
        };
        return res.status(403).json({
          success: false,
          error: messages[outcome.reason],
          distanceMetres: outcome.distanceMetres,
          requiredRadius: checkPoints[0]?.radius || 200,
          locationLabel: outcome.closestLabel,
          geofencePassed: false,
        });
      }
      const geofencePassed = eventType === 'clock_out' ? outcome.geofencePassed : true;
      const closestDistance = outcome.distanceMetres;

      // Previously blocked home_manager/group_admin from clocking in at all — but
      // any staff member whose actual work location is the office (not a
      // resident's home) needs to clock in too, managers included, for accurate
      // time tracking. They pass through the same geofence check as everyone
      // else (falls back to the office/home address when no resident is
      // assigned to their shift), so this doesn't skip the location check.
      // (The actual staff lookup is batched with the rota lookup above.)

      // A clock-out must follow an open clock-in, and you cannot clock in again while already clocked in.
      // (The last-event and shift_id-column lookups are batched above; their
      // missing-column fallbacks live up there too.)
      // NOTE: a clock-out never reaches past the fast path above — everything
      // from here to the end of this handler is clock-in only.
      let isClockedIn = lastEventRows[0]?.event_type === 'clock_in';

      // A session left open from an EARLIER day — app crashed, phone died, nobody
      // force-clocked them out — used to block every single later clock-in with
      // "You are already clocked in. Try again", permanently. Several staff
      // reported this as an everyday problem they could not get past. Close the
      // stale session honestly (a clock_out stamped now, no invented end time)
      // and let them clock in for the shift they're actually standing at.
      // Only when they are trying to clock IN. If they are clocking OUT of a
      // shift that began yesterday (a night shift, or a late clock-out) the
      // open session is exactly the one they want to close — closing it for
      // them here and then answering "you need to clock in before you can
      // clock out" refused a perfectly valid clock-out.
      // Remainder of the handler is CLOCK-IN ONLY — clock-out returned via the
      // fast path above and never reaches here, so none of the gates below
      // (stale sessions, already-clocked-in, no-shift-today, rota scoping) can
      // ever touch a clock-out again, whatever state the account is in.
      // The two clock-out branches kept below are dead code (unreachable), left
      // in place only so the history of those cases stays visible; both cases
      // are handled by the fast path's single INSERT instead.
      if (eventType !== 'clock_out' && isClockedIn && lastEventRows[0]?.event_time) {
        const openedAt = lastEventRows[0].event_time instanceof Date
          ? lastEventRows[0].event_time : new Date(lastEventRows[0].event_time);
        if (!isNaN(openedAt.getTime()) && ukDateStr(openedAt) !== ukDateStr()) {
          logger.warn('Closing a stale clock-in session left open from an earlier day', {
            staffId, openedAt: openedAt.toISOString(),
          });
          await query(
            `INSERT INTO staff_clock_events (staff_id, home_id, event_type, event_time, geofence_passed, punctuality, auto_closed)
             VALUES ($1, $2, 'clock_out', NOW(), true, 'on_time', TRUE)`,
            [staffId, lastEventRows[0].home_id || homeId]
          );
          isClockedIn = false;
        }
      }

      // (The old automatic-clock-out UPDATE and the old no-matching-clock-in
      // 400 used to live here. Both cases are now handled by the fast path's
      // single INSERT above — clock-out returns long before reaching this
      // line, so they are deleted rather than kept as dead code.)
      // INSERTs that mention shift_id would 500 outright on a database where
      // the migration hasn't landed yet — write with the column when it's
      // there, without it when it isn't. hasShiftIdCol was checked once in
      // the batch above and is shared by every INSERT here; a clock event
      // must never fail to store because of a missing optional column,
      // whether the request is a clock-in or a clock-out.
      if (eventType !== 'clock_out' && isClockedIn) {
        const openedAt = new Date(lastEventRows[0].event_time);
        const hoursOpen = (Date.now() - openedAt.getTime()) / 3600000;
        const openShiftId: string | null = lastEventRows[0].shift_id || null;
        // Known to be a DIFFERENT shift from the one "now" belongs to (both
        // sides known, and they don't match) — e.g. still clocked in to an
        // earlier day shift while trying to clock in to tonight's night
        // shift. These must never be silently merged: the earlier shift has
        // to be explicitly clocked out of first, so each shift gets its own
        // clock-in and clock-out, not one clock-in covering both.
        const knownDifferentShift = !!openShiftId && !!targetShift?.id && openShiftId !== targetShift.id;
        if (knownDifferentShift) {
          const openShift = rotaShifts.find((s: any) => s.id === openShiftId);
          const at = openedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
          const openShiftLabel = openShift ? ` (${String(openShift.start_time).slice(0, 5)}–${String(openShift.end_time).slice(0, 5)})` : '';
          return res.status(400).json({
            success: false, reason: 'clock_out_required_first',
            error: `You're still clocked in to your earlier shift${openShiftLabel} — clocked in at ${at}. Please clock out of that shift before clocking in to this one.`,
          });
        }
        if (hoursOpen >= 3) {
          // Forgot to clock out of the SAME shift (or shift_id isn't known
          // for this older session) and it's been a while — close it
          // (marked automatic) and let this clock-in through rather than
          // trapping them. Same missing-column tolerance as the last-event
          // lookup and the main INSERT below.
          await query(
            hasShiftIdCol
              ? `INSERT INTO staff_clock_events (staff_id, home_id, event_type, event_time, geofence_passed, punctuality, auto_closed, shift_id)
                 VALUES ($1, $2, 'clock_out', NOW(), true, 'on_time', TRUE, $3)`
              : `INSERT INTO staff_clock_events (staff_id, home_id, event_type, event_time, geofence_passed, punctuality, auto_closed)
                 VALUES ($1, $2, 'clock_out', NOW(), true, 'on_time', TRUE)`,
            hasShiftIdCol ? [staffId, lastEventRows[0].home_id || homeId, openShiftId] : [staffId, lastEventRows[0].home_id || homeId]);
          isClockedIn = false;
        } else {
          // A second tap shortly after a successful clock-in: tell them it worked.
          const at = openedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
          return res.status(400).json({ success: false, reason: 'already_clocked_in',
            error: `You are already clocked in — your clock-in was recorded at ${at}. There is nothing more you need to do.` });
        }
      }

      // A staff member can belong to — and clock in at — multiple services
      // (homes), but only where their rota actually has them working today.
      // Clocking in isn't gated by which service the QR happens to be for;
      // it's gated by whether today's rota puts them there at all. (rotaShifts
      // was already fetched above, for the same staffId/homeId/today, to
      // resolve the geofence check points — reused here instead of re-querying.)
      if (eventType !== 'clock_out') {
        if (!rotaShifts.length) {
          return res.status(403).json({
            success: false,
            reason: 'no_shift_today',
            error: 'You have no shift scheduled here today — check the rota or ask your manager if this looks wrong.',
          });
        }
      }

      // (The medication/tasks outstanding section that used to live here now
      // runs AFTER the clock-out answer, in the fast path above. The scoping
      // rules live on there as the background note. What executes below is
      // the clock-in write only.)


      // The column's presence was already checked once in the batch above
      // (hasShiftIdCol) — reused here rather than checking again.

      // A clock-in records whichever shift "now" belongs to. (Clock-out used
      // to share this INSERT; it now writes through the fast path above and
      // never reaches here.)
      const eventShiftId: string | null = targetShift?.id || null;

      const punctuality = 'on_time';
      const rows = hasShiftIdCol
        ? await query(
            `INSERT INTO staff_clock_events
               (staff_id, home_id, event_type, event_time, geofence_passed, distance_metres, punctuality, shift_id)
             VALUES ($1,$2,$3,NOW(),$4,$5,$6,$7) RETURNING *`,
            [staffId, homeId, eventType || 'clock_in', geofencePassed, closestDistance, punctuality, eventShiftId]
          )
        : await query(
            `INSERT INTO staff_clock_events
               (staff_id, home_id, event_type, event_time, geofence_passed, distance_metres, punctuality)
             VALUES ($1,$2,$3,NOW(),$4,$5,$6) RETURNING *`,
            [staffId, homeId, eventType || 'clock_in', geofencePassed, closestDistance, punctuality]
          );

      res.status(201).json({
        success: true,
        data: {
          ...(rows[0] as object),
          geofencePassed,
          distanceMetres: closestDistance,
          punctuality,
          staffName: staffRows[0] ? `${staffRows[0].first_name} ${staffRows[0].last_name}` : '',
        }
      } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/clockin/analytics — clock-in analytics for a home and date range
router.get('/analytics', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const startDate = (req.query.startDate as string) || ukDateStr();
    const endDate = (req.query.endDate as string) || ukDateStr();

    // Total events + clock-ins + unique staff
    const summaryRows = await query<any>(
      `SELECT
         COUNT(*) as total_events,
         COUNT(*) FILTER (WHERE event_type = 'clock_in') as total_clock_ins,
         COUNT(DISTINCT staff_id) as unique_staff
       FROM staff_clock_events
       WHERE home_id = $1 AND event_time::date BETWEEN $2 AND $3`,
      [homeId, startDate, endDate]
    );

    // By staff — includes currently_clocked_in (their most recent event overall,
    // not just within this date range) so managers can spot and force-clock-out
    // anyone stuck clocked in from a shift where they couldn't complete/save a
    // task and the app wouldn't let them clock out.
    const byStaffRows = await query<any>(
      `SELECT ce.staff_id,
         s.first_name || ' ' || s.last_name as staff_name,
         COUNT(*) FILTER (WHERE ce.event_type='clock_in') as clock_ins,
         COUNT(*) FILTER (WHERE ce.event_type='clock_out') as clock_outs,
         COUNT(*) as total_events,
         MAX(ce.event_time) as last_event,
         (SELECT ce2.event_type FROM staff_clock_events ce2 WHERE ce2.staff_id = ce.staff_id AND ce2.home_id = $1 ORDER BY ce2.event_time DESC LIMIT 1) = 'clock_in' as currently_clocked_in
       FROM staff_clock_events ce
       JOIN staff s ON s.id = ce.staff_id
       WHERE ce.home_id = $1 AND ce.event_time::date BETWEEN $2 AND $3
       GROUP BY ce.staff_id, s.first_name, s.last_name
       ORDER BY total_events DESC`,
      [homeId, startDate, endDate]
    );

    // By day
    const byDayRows = await query<any>(
      `SELECT
         event_time::date as date,
         COUNT(*) FILTER (WHERE event_type='clock_in') as clock_ins,
         COUNT(*) FILTER (WHERE event_type='clock_out') as clock_outs
       FROM staff_clock_events
       WHERE home_id = $1 AND event_time::date BETWEEN $2 AND $3
       GROUP BY event_time::date
       ORDER BY date ASC`,
      [homeId, startDate, endDate]
    );

    // Late arrivals — clock_in after 08:00
    const lateRows = await query<any>(
      `SELECT ce.staff_id,
         s.first_name || ' ' || s.last_name as staff_name,
         ce.event_time,
         EXTRACT(HOUR FROM ce.event_time)::int as hour,
         EXTRACT(MINUTE FROM ce.event_time)::int as minute
       FROM staff_clock_events ce
       JOIN staff s ON s.id = ce.staff_id
       WHERE ce.home_id = $1
         AND ce.event_type = 'clock_in'
         AND ce.event_time::date BETWEEN $2 AND $3
         AND EXTRACT(HOUR FROM ce.event_time) >= 8
         AND (EXTRACT(HOUR FROM ce.event_time) > 8 OR EXTRACT(MINUTE FROM ce.event_time) > 0)
       ORDER BY ce.event_time DESC`,
      [homeId, startDate, endDate]
    );

    // Recent clock-outs, with their actual time — the "By staff" table only ever
    // showed a clock-out COUNT plus a single "last event" timestamp, so a manager
    // could see someone clocked out but not when, unlike clock-ins (which already
    // had this exact list via lateRows above). Mirrors lateRows' shape.
    const clockOutRows = await query<any>(
      `SELECT ce.staff_id,
         s.first_name || ' ' || s.last_name as staff_name,
         ce.event_time
       FROM staff_clock_events ce
       JOIN staff s ON s.id = ce.staff_id
       WHERE ce.home_id = $1
         AND ce.event_type = 'clock_out'
         AND ce.event_time::date BETWEEN $2 AND $3
       ORDER BY ce.event_time DESC`,
      [homeId, startDate, endDate]
    );

    // Staff in home who have NO clock events in range
    const neverClockedInRows = await query<any>(
      `SELECT s.id as staff_id, s.first_name || ' ' || s.last_name as staff_name, s.role
       FROM staff s
       WHERE s.home_id = $1
         AND s.status = 'active'
         AND s.role NOT IN ('home_manager', 'group_admin')
         AND s.id NOT IN (
           SELECT DISTINCT staff_id
           FROM staff_clock_events
           WHERE home_id = $1 AND event_time::date BETWEEN $2 AND $3
         )`,
      [homeId, startDate, endDate]
    );

    const summary = summaryRows[0] || {};

    res.json({
      success: true,
      data: {
        totalEvents: parseInt(summary.total_events || '0'),
        totalClockIns: parseInt(summary.total_clock_ins || '0'),
        uniqueStaff: parseInt(summary.unique_staff || '0'),
        byStaff: byStaffRows,
        byDay: byDayRows,
        lateArrivals: lateRows,
        clockOuts: clockOutRows,
        neverClockedIn: neverClockedInRows,
      }
    } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/clockin/force-clockout/:staffId — manager override for staff stuck
// clocked in because the app's normal clock-out gate (complete all pending
// tasks) couldn't be satisfied — e.g. a task/handover form that wouldn't save,
// or a task from the next shift still showing as theirs. Bypasses that gate
// entirely; this is a deliberate escape hatch, not a fix for the underlying
// task-completion bug, which is handled separately.
router.post('/force-clockout/:staffId', authenticate,
  requireRole('home_manager', 'group_admin', 'deputy_manager', 'admin', 'recruitment_admin', 'director', 'registered_manager', 'service_manager'),
  param('staffId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const homeId = req.body.homeId || fromToken(req, 'homeId');
      const staffRows = await query<any>('SELECT id FROM staff WHERE id = $1 AND home_id = $2', [req.params.staffId, homeId]);
      if (!staffRows.length) throw new AppError('Staff member not found', 404);

      const lastEvent = await query<any>(
        `SELECT event_type FROM staff_clock_events WHERE staff_id = $1 ORDER BY event_time DESC LIMIT 1`,
        [req.params.staffId]
      );
      if (lastEvent[0]?.event_type !== 'clock_in') {
        throw new AppError('This staff member is not currently clocked in', 400);
      }

      await query(
        `INSERT INTO staff_clock_events (staff_id, home_id, event_type, event_time, geofence_passed, punctuality)
         VALUES ($1,$2,'clock_out',NOW(),true,'on_time')`,
        [req.params.staffId, homeId]
      );
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/clockin/postcodes/:homeId — list postcodes for a home
router.get('/postcodes/:homeId', authenticate, param('homeId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query<any>(
        'SELECT * FROM home_postcodes WHERE home_id = $1 ORDER BY created_at ASC',
        [req.params.homeId]
      );
      res.json({ success: true, data: rows } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/clockin/postcodes — add postcode (auto-geocodes via postcodes.io)
router.post('/postcodes', authenticate,
  [body('homeId').isUUID(), body('postcode').notEmpty()],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { homeId, postcode, label, radius } = req.body;
      const coords = await geocodePostcode(postcode);
      const rows = await query(
        `INSERT INTO home_postcodes (home_id, postcode, label, latitude, longitude, radius)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (home_id, postcode) DO UPDATE SET label = EXCLUDED.label, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, radius = EXCLUDED.radius
         RETURNING *`,
        [homeId, postcode.trim().toUpperCase(), label || null, coords?.latitude || null, coords?.longitude || null, parseInt(radius) || 200]
      );
      res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/clockin/postcodes/:id — remove a postcode
router.delete('/postcodes/:id', authenticate, param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM home_postcodes WHERE id = $1', [req.params.id]);
      res.json({ success: true, message: 'Postcode removed' } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// GET /api/clockin/home-qr/:homeId — get home QR URL + token + address info
router.get('/home-qr/:homeId', authenticate, param('homeId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query<any>(
        'SELECT id, name, qr_token, address1, address2, postcode, latitude, longitude, geofence_radius FROM homes WHERE id = $1',
        [req.params.homeId]
      );
      if (!rows.length) throw new AppError('Home not found', 404);
      let home = rows[0];
      // Auto-generate qr_token if missing
      if (!home.qr_token) {
        const crypto = require('crypto');
        const newToken = crypto.randomBytes(16).toString('hex');
        await query('UPDATE homes SET qr_token = $1 WHERE id = $2', [newToken, req.params.homeId]);
        home = { ...home, qr_token: newToken };
      }
      const base = frontendBase(req);
      const qrUrl = `${base}/clockin/home/${home.qr_token}`;
      res.json({
        success: true,
        data: {
          homeId: home.id,
          homeName: home.name,
          qrToken: home.qr_token,
          qrUrl,
          address1: home.address1,
          address2: home.address2,
          postcode: home.postcode,
          latitude: home.latitude,
          longitude: home.longitude,
          geofenceRadius: home.geofence_radius || 200,
          isGeocoded: !!(home.latitude && home.longitude),
        }
      } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// POST /api/clockin/geocode-home/:homeId — geocode home address (UK postcode or international)
router.post('/geocode-home/:homeId', authenticate, param('homeId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query<any>('SELECT address1, address2, address3, postcode FROM homes WHERE id = $1', [req.params.homeId]);
      if (!rows.length) throw new AppError('Home not found', 404);
      const { address1, address2, address3, postcode } = rows[0];
      if (!postcode && !address1) throw new AppError('Home has no address set', 400);

      // Try UK postcode first
      let coords = postcode ? await geocodePostcode(postcode) : null;

      // Fall back to full address via Nominatim (international)
      if (!coords) {
        const fullAddress = [address1, address2, address3, postcode].filter(Boolean).join(', ');
        coords = await geocodeAddress(fullAddress);
      }

      if (!coords) throw new AppError('Could not geocode this address. Please enter coordinates manually.', 422);

      await query('UPDATE homes SET latitude = $1, longitude = $2 WHERE id = $3', [coords.latitude, coords.longitude, req.params.homeId]);
      res.json({ success: true, data: { latitude: coords.latitude, longitude: coords.longitude } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PUT /api/clockin/home-location/:homeId — manually set coordinates
router.put('/home-location/:homeId', authenticate, param('homeId').isUUID(),
  [body('latitude').isFloat({ min: -90, max: 90 }), body('longitude').isFloat({ min: -180, max: 180 })],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { latitude, longitude } = req.body;
      await query('UPDATE homes SET latitude = $1, longitude = $2 WHERE id = $3', [latitude, longitude, req.params.homeId]);
      res.json({ success: true, data: { latitude, longitude } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// ── Resident apartment clock-in management ─────────────────────────

// GET /api/clockin/residents/:homeId — list all live service users with QR and location data
router.get('/residents/:homeId', authenticate, param('homeId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const base = frontendBase(req);
      const rows = await query<any>(
        `SELECT id, first_name, last_name, room_number, qr_token, latitude, longitude, geofence_radius
         FROM service_users WHERE home_id = $1 AND status = 'live' ORDER BY room_number NULLS LAST, first_name`,
        [req.params.homeId]
      );
      const residents = rows.map((su: any) => ({
        ...su,
        qrUrl: `${base}/clockin/${su.qr_token}`,
        hasLocation: !!(su.latitude && su.longitude),
      }));
      res.json({ success: true, data: residents } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// PUT /api/clockin/resident-location/:suId — set lat/lng geofence for a resident apartment
router.put('/resident-location/:suId', authenticate, param('suId').isUUID(),
  [body('latitude').isFloat({ min: -90, max: 90 }), body('longitude').isFloat({ min: -180, max: 180 })],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { latitude, longitude, geofenceRadius } = req.body;
      await query(
        'UPDATE service_users SET latitude=$1, longitude=$2, geofence_radius=$3 WHERE id=$4',
        [latitude, longitude, parseInt(geofenceRadius) || 200, req.params.suId]
      );
      res.json({ success: true, data: { latitude, longitude } } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// ── Legacy per-SU routes (kept for backward compatibility) ─────────

router.get('/qr/:token', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query<any>(
        `SELECT su.id, su.first_name, su.last_name, su.latitude, su.longitude,
                su.geofence_radius, su.address1, su.postcode,
                h.name as home_name, h.id as home_id
         FROM service_users su JOIN homes h ON h.id = su.home_id
         WHERE su.qr_token = $1 AND su.status = 'live'`,
        [req.params.token]
      );
      if (!rows.length) throw new AppError('Invalid or expired QR code', 404);
      const su = rows[0];
      res.json({
        success: true,
        data: {
          suId: su.id, name: `${su.first_name} ${su.last_name}`,
          homeName: su.home_name, homeId: su.home_id,
          address: [su.address1, su.postcode].filter(Boolean).join(', '),
          hasLocation: !!(su.latitude && su.longitude),
          geofenceRadius: su.geofence_radius || 200,
        }
      } as ApiResponse);
    } catch (err) { next(err); }
  }
);

router.get('/generate/:suId', authenticate, param('suId').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await query<any>('SELECT qr_token, first_name, last_name, latitude, longitude FROM service_users WHERE id = $1', [req.params.suId]);
      if (!rows.length) throw new AppError('Service user not found', 404);
      const su = rows[0];
      const qrUrl = `${frontendBase(req)}/clockin/${su.qr_token}`;
      res.json({ success: true, data: { qrToken: su.qr_token, qrUrl, hasLocation: !!(su.latitude && su.longitude) } } as ApiResponse);
    } catch (err) { next(err); }
  }
);


// GET /api/clockin/sessions?homeId=&date=YYYY-MM-DD — clock-in/out sessions for a date
router.get('/sessions', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || fromToken(req, 'homeId');
    const date = (req.query.date as string) || ukDateStr();
    const rows = await query<any>(
      `SELECT ce.id, ce.staff_id, ce.event_type, ce.event_time, ce.geofence_passed,
              ce.distance_metres, ce.punctuality,
              s.first_name || ' ' || s.last_name as staff_name, s.role
       FROM staff_clock_events ce
       JOIN staff s ON s.id = ce.staff_id
       WHERE ce.home_id = $1 AND ce.event_time::date = $2
       ORDER BY ce.event_time ASC`,
      [homeId, date]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/clockin/status — is the current staff member currently clocked in?
router.get('/status', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staffId = fromToken(req, 'staffId');
    const rows = await query<any>(
      `SELECT event_type, event_time FROM staff_clock_events WHERE staff_id = $1 ORDER BY event_time DESC LIMIT 1`,
      [staffId]
    );
    res.json({
      success: true,
      data: {
        clockedIn: rows[0]?.event_type === 'clock_in',
        lastEventType: rows[0]?.event_type || null,
        lastEventTime: rows[0]?.event_time || null,
      }
    } as ApiResponse);
  } catch (err) { next(err); }
});

router.post('/generate-qr', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { homeId } = req.body;
    const crypto = require('crypto');
    const token = crypto.randomBytes(16).toString('hex');
    await query('UPDATE homes SET qr_token=$1 WHERE id=$2', [token, homeId]);
    res.json({ success: true, data: { token } } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
