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
      const rotaShifts = await query<any>(
        `SELECT id, su_id, su_ids, label, start_time, end_time FROM staff_shifts WHERE staff_id = $1 AND home_id = $2 AND shift_date = $3`,
        [staffId, homeId, todayStr]
      );
      // Which shift "now" actually belongs to — used below to tie this clock
      // event to a specific shift, and to require closing a DIFFERENT shift's
      // still-open clock-in before this one can start.
      const nowMins = hhmmToMins(ukTimeHHMM())!;
      const targetShift = pickShiftForNow(rotaShifts, nowMins);
      for (const sh of rotaShifts) {
        if (sh.su_id) await addServiceUserCheckPoint(sh.su_id);
        if (Array.isArray(sh.su_ids)) for (const id of sh.su_ids) await addServiceUserCheckPoint(id);
      }
      if (suId) await addServiceUserCheckPoint(suId);

      // Every postcode configured for this home — fetched once, used both to match
      // today's service-shift label(s) below and as the office-area fallback further
      // down, so a location set specifically for "KENNEDY SERVICE" only ever applies
      // to staff actually rostered on a Kennedy Service shift today, not to everyone.
      const allPostcodes = await query<any>(
        'SELECT postcode, label, latitude, longitude, radius FROM home_postcodes WHERE home_id = $1',
        [homeId]
      );

      // A rota shift built around a Service (e.g. "KENNEDY SERVICE", a specific
      // house) rather than a named resident has no resident lat/lng to check
      // against at all — this is now the common case since the rota redesign made
      // residents optional on service shifts. Without this, those shifts silently
      // fell back to the office address, blocking staff who are legitimately at a
      // service-user's house miles away. Match today's shift label(s) against any
      // postcode a manager has set for that exact service via Manage Services.
      const todaysLabels = new Set(rotaShifts.map((sh: any) => normalizeLabel(sh.label)).filter(Boolean));
      for (const pc of allPostcodes) {
        if (todaysLabels.has(normalizeLabel(pc.label)) && pc.latitude && pc.longitude) {
          checkPoints.push({ lat: parseFloat(pc.latitude), lng: parseFloat(pc.longitude), label: pc.label || pc.postcode, radius: pc.radius || 200 });
        }
      }

      const usingResidentCheckpoints = checkPoints.length > 0;

      if (checkPoints.length === 0) {
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
      const staffRows = await query<any>('SELECT first_name, last_name, role FROM staff WHERE id = $1', [staffId]);
      const staffRole = staffRows[0]?.role;

      // A clock-out must follow an open clock-in, and you cannot clock in again while already clocked in.
      const lastEventRows = await query<any>(
        `SELECT id, event_type, event_time, home_id, auto_closed, shift_id FROM staff_clock_events WHERE staff_id = $1 ORDER BY event_time DESC LIMIT 1`,
        [staffId]
      );
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

      // The system clocked them out automatically (left clocked in 16+ hours)
      // and they are now clocking out themselves: treat this as their real
      // clock-out and replace the automatic one with the true time.
      if (eventType === 'clock_out' && !isClockedIn && lastEventRows[0]?.event_type === 'clock_out' && lastEventRows[0]?.auto_closed === true
          && (Date.now() - new Date(lastEventRows[0].event_time).getTime()) < 24 * 3600 * 1000) {
        const fixed = await query(
          'UPDATE staff_clock_events SET event_time = NOW(), auto_closed = FALSE WHERE id = $1 RETURNING *', [lastEventRows[0].id]);
        return res.status(201).json({
          success: true,
          data: { ...(fixed[0] as object), geofencePassed: true, distanceMetres: null, punctuality: 'on_time',
                  staffName: staffRows[0] ? `${staffRows[0].first_name} ${staffRows[0].last_name}` : '' },
        });
      }
      // Set below when a clock-out is let through with no matching open
      // clock-in on record — flagged to managers via the same override-alert
      // path as outstanding medication/tasks, rather than refused outright.
      let noMatchingClockIn = false;
      if (eventType === 'clock_out' && !isClockedIn) {
        // Already clocked out recently: say so plainly instead of the confusing
        // "you need to clock in" — there is nothing left for them to do. This
        // is purely informational (nothing is actually outstanding to action),
        // not a barrier, so it's fine to still return here.
        const last = lastEventRows[0];
        if (last?.event_type === 'clock_out' && (Date.now() - new Date(last.event_time).getTime()) < 14 * 3600 * 1000) {
          const at = new Date(last.event_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
          return res.status(400).json({ success: false, reason: 'already_clocked_out',
            error: `You are already clocked out — your clock-out was recorded at ${at}. There is nothing more you need to do.` });
        }
        // Owner instruction: clock-out must never be refused, even when there
        // is no open clock-in to close (forgot to clock in, or it was never
        // recorded). Record it anyway and flag it for a manager to reconcile
        // by hand, rather than leaving the staff member with no way through.
        noMatchingClockIn = true;
      }
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
          // trapping them.
          await query(
            `INSERT INTO staff_clock_events (staff_id, home_id, event_type, event_time, geofence_passed, punctuality, auto_closed, shift_id)
             VALUES ($1, $2, 'clock_out', NOW(), true, 'on_time', TRUE, $3)`,
            [staffId, lastEventRows[0].home_id || homeId, openShiftId]);
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

      // Medication due during this shift must be signed off before clocking out — a
      // resident's medication silently going unrecorded because a shift ended is a
      // real safety gap, not just a missed task. Only counts medication whose scheduled
      // time has already passed (an evening dose isn't "overdue" on an early shift), AND
      // only for residents this staff member was actually rostered with today — not their
      // whole standing caseload.
      // Owner decision: staff are no longer trapped at clock-out. If medication,
      // the medication count or tasks are outstanding they are still told, but
      // they may clock out by giving a reason — recorded on the clock-out and
      // sent to managers as an alert, so every exception is seen and the
      // clock-out time is the real one (not an automatic one hours later).
      const overrideReason = typeof req.body.overrideReason === 'string' && req.body.overrideReason.trim().length >= 5
        ? req.body.overrideReason.trim().slice(0, 500) : '';
      const overridden: string[] = [];
      if (eventType === 'clock_out') {
        const nowHHMM = ukTimeHHMM();

        // Scope every check below to the SPECIFIC shift this clock-out is
        // closing (the one the open clock-in recorded), not every shift the
        // staff member has today — otherwise closing shift 1 could be
        // blocked by a task or medication that's only due during shift 2.
        // Falls back to every shift today when the closing shift isn't
        // known (an older clock-in from before shift_id existed), same
        // fail-open behaviour as before for that edge case.
        const closingShiftId: string | null = lastEventRows[0]?.shift_id || null;
        const closingShift = closingShiftId ? rotaShifts.find((s: any) => s.id === closingShiftId) : null;
        const shiftsForClose = closingShift ? [closingShift] : rotaShifts;

        // The residents tied to the shift being closed — reused from the geofence
        // check-point lookup above. When known, this scopes the clock-out medication
        // check to just those residents (see getDueTodayTasks), so a morning shift
        // worker isn't blocked over an evening dose for a resident on their general
        // caseload (or on a later shift) they weren't rostered with on this shift.
        const todayShiftSuIds = Array.from(new Set(
          shiftsForClose.flatMap((sh: any) => [sh.su_id, ...(Array.isArray(sh.su_ids) ? sh.su_ids : [])].filter(Boolean))
        ));

        // Cap the "due by" cutoff at this shift's own end time (not the live clock) — a
        // dose that only looks overdue because staff forgot to clock out after their
        // shift genuinely ended belongs to whoever is on shift when it actually comes
        // due, not to this shift. Handles an overnight shift (end time before start
        // time) by treating its end as the following day.
        let shiftStartMins: number | null = null;
        let shiftEndMins: number | null = null;
        for (const sh of shiftsForClose) {
          const s = hhmmToMins(sh.start_time);
          let e = hhmmToMins(sh.end_time);
          if (s != null && e != null) {
            if (e <= s) e += 1440;
            shiftStartMins = shiftStartMins == null ? s : Math.min(shiftStartMins, s);
            shiftEndMins = shiftEndMins == null ? e : Math.max(shiftEndMins, e);
          }
        }
        const nowMins = hhmmToMins(nowHHMM)!;
        const cutoffMins = shiftEndMins != null ? Math.min(nowMins, shiftEndMins) : nowMins;

        // Fails OPEN, not closed: a bug or edge case in this computation must never
        // permanently trap a staff member clocked in on a real shift — that's a worse
        // outcome than occasionally missing a genuinely overdue dose (which the
        // separate 30-minute missed-medication alert, unrelated to clock-out, still
        // catches). Logged so a silent miss is still visible to whoever checks logs.
        //
        // No staff_shifts row for today at all (ad-hoc cover, a swap that didn't
        // transfer the row, or the rota just wasn't filled in) is one such edge case:
        // shiftStartMins/shiftEndMins both stay null and todayShiftSuIds is empty, so
        // BOTH narrowing checks below (resident scope and the shift-window bounds)
        // silently become no-ops — getDueTodayTasks falls back to this staff member's
        // WHOLE standing caseload and the time filter falls back to "due by right
        // now", so a resident's later dose completely outside today's actual working
        // hours (e.g. a 20:00 medication for someone on their broader caseload, well
        // after their real shift ended) still trapped them. Treated the same as the
        // internal-error case: with no rota record to scope against, don't block.
        let overdue: any[] = [];
        try {
          if (shiftsForClose.length === 0) throw new Error('no rota shift on record for today — nothing reliable to scope the check against');
          const dueTasks = await getDueTodayTasks(homeId, staffId, staffRole, todayShiftSuIds.length ? todayShiftSuIds : undefined);
          overdue = dueTasks.filter(t => {
            if (t.status !== 'pending') return false;
            const raw = hhmmToMins(t.scheduledTime);
            if (raw == null) return false;
            // A dose whose time hasn't arrived yet ("Not due yet" on the MAR) can never
            // block clock-out, whatever the shift window arithmetic below works out —
            // e.g. a 21:00 ointment stopped a 20:05 clock-out. Only for a shift that
            // doesn't cross midnight, where "later than now" is unambiguous.
            if (raw > nowMins && (shiftEndMins == null || shiftEndMins <= 1440)) return false;
            // shiftStartMins/shiftEndMins was computed above but never actually used to
            // exclude anything below it — only the upper cutoff was checked. That let a
            // dose due BEFORE this shift even started (a resident's earlier dose that a
            // different, earlier-shift colleague missed, or that belongs to whoever
            // covers that specific time window) still block THIS staff member's
            // clock-out, even though it was never really their responsibility. A dose
            // only counts against this shift if its scheduled time actually falls
            // within this shift's own start-to-end window, not merely before its end.
            // For an overnight shift (end < start, already normalised to end > 1440
            // above), a small raw time like 00:30 means "the next calendar day" from
            // the shift's own point of view, so it's tried both as-is and shifted by
            // +1440 to see which one actually lands inside the shift's window.
            const candidates = [raw, raw + 1440];
            const schedMins = candidates.find(c => shiftStartMins == null || (c >= shiftStartMins && c <= (shiftEndMins ?? Infinity))) ?? raw;
            if (shiftStartMins != null && schedMins < shiftStartMins) return false;
            // The shift window is [start, END) — a dose scheduled exactly AT
            // the shift's end time belongs to whoever comes on next, not to
            // the shift that's ending. A day worker finishing at 20:00 was
            // being blocked by the resident's 20:00 dose, which is the night
            // staff's to give — "the 8pm meds which is for the night staff"
            // trapped them at clock-out every day.
            if (shiftEndMins != null && schedMins >= shiftEndMins) return false;
            return schedMins <= cutoffMins;
          });
        } catch (medCheckErr) {
          logger.error('Clock-out medication check failed — allowing clock-out rather than blocking on an internal error', medCheckErr);
          overdue = [];
        }
        // Owner decision (repeated real-world lockouts across multiple homes): clock-out
        // must never be blocked, full stop. Outstanding medication still generates a
        // manager alert below — it's just no longer a wall staff can get stuck behind.
        if (overdue.length > 0) {
          overridden.push(`${overdue.length} medication${overdue.length > 1 ? 's' : ''} still due (${Array.from(new Set(overdue.map(t => t.suName))).join(', ')})`);
        }

        // Medication Count used to also gate clock-out here, but the owner asked
        // for it to be removed entirely — it was wrongly flagging "Tasks not
        // finished yet" and forcing staff through the override-reason flow even
        // when they'd genuinely completed everything, and the stock-count
        // feature itself isn't functioning as intended ("it's not even doing
        // the function at the moment"). Clock-out is no longer blocked on it.

        // General (non-medication) tasks due today that are still pending also
        // block clock-out — same principle as medication: a task not silently
        // becoming nobody's problem just because the shift ended. Only tasks
        // this staff member would actually see on their own task list count
        // (see getMyPendingTasksToday), so this never blocks someone over a
        // task they were never shown.
        const pendingTasks = await getMyPendingTasksToday(homeId, staffId, staffRole, closingShiftId || undefined);
        if (pendingTasks.length > 0) {
          overridden.push(`${pendingTasks.length} task${pendingTasks.length > 1 ? 's' : ''} not completed (${pendingTasks.slice(0, 3).map(t => t.title).join(', ')}${pendingTasks.length > 3 ? ', …' : ''})`);
        }
        if (noMatchingClockIn) {
          overridden.push('No matching clock-in was found on record for this clock-out');
        }
      }

      const punctuality = 'on_time';

      // A clock-out records the same shift_id as the clock-in it's closing
      // (so the pair stays matched); a clock-in records whichever shift
      // "now" belongs to. When there's no open clock-in to match (see
      // noMatchingClockIn above), fall back to whichever shift "now" belongs
      // to, same as a clock-in would, so the record still links to a shift.
      const eventShiftId: string | null = eventType === 'clock_out'
        ? (lastEventRows[0]?.shift_id || targetShift?.id || null)
        : (targetShift?.id || null);

      const rows = await query(
        `INSERT INTO staff_clock_events
           (staff_id, home_id, event_type, event_time, geofence_passed, distance_metres, punctuality, shift_id)
         VALUES ($1,$2,$3,NOW(),$4,$5,$6,$7) RETURNING *`,
        [staffId, homeId, eventType || 'clock_in', geofencePassed, closestDistance, punctuality, eventShiftId]
      );
      if (overridden.length) {
        try {
          await query('UPDATE staff_clock_events SET override_reason = $1, override_of = $2 WHERE id = $3',
            [overrideReason, overridden.join(' | ').slice(0, 1500), (rows[0] as any).id]);
          const who = staffRows[0] ? `${staffRows[0].first_name} ${staffRows[0].last_name}` : 'A staff member';
          await createAlert({
            homeId, alertType: 'clock_out_with_reason', severity: 'warning', staffId,
            recordId: (rows[0] as any).id, recordType: 'clock_event',
            title: `${who} clocked out with work outstanding`,
            description: `Outstanding: ${overridden.join('; ')}.${overrideReason ? ` Their reason: "${overrideReason}"` : ''}`.slice(0, 1800),
          });
        } catch (ovErr) { logger.warn('Could not record clock-out override: ' + (ovErr as any)?.message); }
      }

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
