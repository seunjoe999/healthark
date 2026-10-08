import { query } from '../config/database';
import { logger } from '../config/logger';
import { ukDateStr } from '../utils/ukTime';

// Central service for creating business alerts
// Called by AI engine, triggers, and manual processes

export async function createAlert(params: {
  homeId: string;
  alertType: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  suId?: string;
  staffId?: string;
  recordId?: string;
  recordType?: string;
}): Promise<void> {
  try {
    // A manager can switch an alert type off for their home (Alerts → Alert settings).
    try {
      const off = await query<any>(
        'SELECT 1 FROM alert_settings WHERE home_id = $1 AND alert_type = $2 AND enabled = FALSE', [params.homeId, params.alertType]);
      if (off.length) return;
    } catch { /* settings table not ready yet — alert as normal */ }
    await query(
      `INSERT INTO business_alerts
         (home_id, alert_type, severity, title, description, su_id, staff_id, record_id, record_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [params.homeId, params.alertType, params.severity, params.title, params.description,
       params.suId || null, params.staffId || null,
       params.recordId || null, params.recordType || null]
    );
    logger.info('Business alert created', { type: params.alertType, homeId: params.homeId });
  } catch (err) {
    logger.error('Failed to create business alert', { err, params });
  }
}

// Check all homes for overdue care plans and raise alerts
export async function checkCarePlanReviews(): Promise<void> {
  try {
    const today = ukDateStr();
    const overdue = await query<{
      id: string; home_id: string; su_id: string;
      plan_type: string; next_review_date: string;
      first_name: string; last_name: string;
    }>(
      `SELECT cp.id, cp.home_id, cp.su_id, cp.plan_type, cp.next_review_date,
              su.first_name, su.last_name
       FROM care_plans cp JOIN service_users su ON su.id = cp.su_id
       WHERE cp.is_active = TRUE AND cp.next_review_date < $1
         AND NOT EXISTS (
           SELECT 1 FROM business_alerts ba
           WHERE ba.record_id = cp.id AND ba.alert_type = 'care_plan_overdue'
             AND ba.is_resolved = FALSE
         )`,
      [today]
    );

    for (const cp of overdue) {
      await createAlert({
        homeId: cp.home_id,
        alertType: 'care_plan_overdue',
        severity: 'warning',
        title: `Care plan overdue: ${cp.first_name} ${cp.last_name}`,
        description: `${cp.plan_type.replace(/_/g, ' ')} care plan was due for review on ${cp.next_review_date}`,
        suId: cp.su_id,
        recordId: cp.id,
        recordType: 'care_plan',
      });
    }
    if (overdue.length) logger.info(`Created ${overdue.length} care plan overdue alerts`);
  } catch (err) {
    logger.warn('checkCarePlanReviews skipped: ' + (err as any)?.message?.split('\n')[0]);
  }
}

// Check fluid intake below threshold
export async function checkFluidIntake(): Promise<void> {
  try {
    const today = ukDateStr();
    // A low-fluid alert is about ONE day. A new one was raised per person every
    // day and none ever closed, so they piled up into the hundreds. Yesterday's
    // (and older) are closed here once the day they refer to is over.
    await query(
      `UPDATE business_alerts SET is_resolved = TRUE, resolved_at = NOW(),
              resolution_notes = COALESCE(resolution_notes, 'Closed automatically — that day has ended')
       WHERE alert_type = 'fluid_below_threshold' AND is_resolved = FALSE AND DATE(created_at) < $1`, [today]);
    const flagged = await query<{
      su_id: string; home_id: string; total_ml: number;
      first_name: string; last_name: string; min_fluid_ml: number;
    }>(
      `SELECT ft.su_id, su.home_id, ft.total_ml, su.first_name, su.last_name, su.min_fluid_ml
       FROM su_daily_fluid_totals ft JOIN service_users su ON su.id = ft.su_id
       WHERE ft.record_date = $1 AND ft.below_threshold = TRUE
         AND NOT EXISTS (
           SELECT 1 FROM business_alerts ba
           WHERE ba.su_id = ft.su_id AND ba.alert_type = 'fluid_below_threshold'
             AND DATE(ba.created_at) = $1 AND ba.is_resolved = FALSE
         )`,
      [today]
    );

    for (const su of flagged) {
      await createAlert({
        homeId: su.home_id,
        alertType: 'fluid_below_threshold',
        severity: 'warning',
        title: `Low fluid intake: ${su.first_name} ${su.last_name}`,
        description: `Today's recorded intake is ${su.total_ml}ml — below the minimum of ${su.min_fluid_ml}ml.`,
        suId: su.su_id,
      });
    }
  } catch (err) {
    logger.warn('checkFluidIntake skipped: ' + (err as any)?.message?.split('\n')[0]);
  }
}

// Check for medication stock at/below its reorder threshold. This was only ever
// surfaced as a notification to managers (checkLowMedicationStock in scheduler.ts) —
// manager asked for it to also appear as a dashboard alert, visible to everyone,
// the same way the other "things to do today" items do.
export async function checkLowMedicationStock(): Promise<void> {
  try {
    const today = ukDateStr();
    // The same low-stock item raised a fresh alert every morning. Keep only the
    // newest open alert per item, and close alerts for items that have since
    // been restocked above their reorder threshold.
    await query(
      `UPDATE business_alerts ba SET is_resolved = TRUE, resolved_at = NOW(),
              resolution_notes = COALESCE(ba.resolution_notes, 'Closed automatically — duplicate of a newer alert for the same item')
       WHERE ba.alert_type = 'medication_stock_low' AND ba.is_resolved = FALSE
         AND EXISTS (SELECT 1 FROM business_alerts n WHERE n.alert_type = 'medication_stock_low' AND n.is_resolved = FALSE
                       AND n.record_id = ba.record_id AND n.created_at > ba.created_at)`);
    await query(
      `UPDATE business_alerts ba SET is_resolved = TRUE, resolved_at = NOW(),
              resolution_notes = COALESCE(ba.resolution_notes, 'Closed automatically — stock is back above the reorder level')
       WHERE ba.alert_type = 'medication_stock_low' AND ba.is_resolved = FALSE
         AND EXISTS (SELECT 1 FROM medication_stock ms WHERE ms.id = ba.record_id AND ms.current_stock > ms.reorder_threshold)`);
    const lowStock = await query<{
      id: string; home_id: string; medication_name: string;
      current_stock: number; reorder_threshold: number; unit: string; su_id: string | null;
    }>(
      `SELECT ms.id, ms.home_id, ms.medication_name, ms.current_stock, ms.reorder_threshold, ms.unit, ms.su_id
       FROM medication_stock ms
       WHERE ms.current_stock <= ms.reorder_threshold
         AND NOT EXISTS (
           SELECT 1 FROM business_alerts ba
           WHERE ba.record_id = ms.id AND ba.alert_type = 'medication_stock_low'
             AND ba.is_resolved = FALSE
         ) AND $1::text IS NOT NULL`,
      [today]
    );

    for (const row of lowStock) {
      await createAlert({
        homeId: row.home_id,
        alertType: 'medication_stock_low',
        severity: 'warning',
        title: `Low medication stock: ${row.medication_name}`,
        description: `Current stock: ${row.current_stock} ${row.unit}. Reorder threshold: ${row.reorder_threshold} ${row.unit}. Please reorder.`,
        suId: row.su_id || undefined,
        recordId: row.id,
        recordType: 'medication_stock',
      });
    }
    if (lowStock.length) logger.info(`Created ${lowStock.length} low medication stock alerts`);
  } catch (err) {
    logger.warn('checkLowMedicationStock skipped: ' + (err as any)?.message?.split('\n')[0]);
  }
}

// Check training expiry (60 / 30 / 7 days)
export async function checkTrainingExpiry(): Promise<void> {
  try {
    const levels = [
      { days: 60, level: 1, severity: 'info' as const },
      { days: 30, level: 2, severity: 'warning' as const },
      { days: 7,  level: 3, severity: 'critical' as const },
    ];

    for (const { days, level, severity } of levels) {
      const expiring = await query<{
        id: string; staff_id: string; course_name: string;
        expiry_date: string; first_name: string; last_name: string; home_id: string;
      }>(
        `SELECT st.id, st.staff_id, st.course_name, st.expiry_date,
                s.first_name, s.last_name, s.home_id
         FROM staff_training st JOIN staff s ON s.id = st.staff_id
         WHERE st.expiry_date = (CURRENT_DATE + INTERVAL '1 day' * $1)::DATE
           AND st.alert_level < $2`,
        [days, level]
      );

      for (const t of expiring) {
        await createAlert({
          homeId: t.home_id,
          alertType: 'training_expiring',
          severity,
          title: `Training expiring in ${days} days: ${t.first_name} ${t.last_name}`,
          description: `${t.course_name} expires on ${t.expiry_date}.`,
          staffId: t.staff_id,
          recordId: t.id,
          recordType: 'staff_training',
        });
        await query('UPDATE staff_training SET alert_level = $1 WHERE id = $2', [level, t.id]);
      }
    }
  } catch (err) {
    logger.warn('checkTrainingExpiry skipped: ' + (err as any)?.message?.split('\n')[0]);
  }
}

// Check for incidents not reviewed by management within 24 hours
export async function checkIncidentReviews(): Promise<void> {
  try {
    const unreviewed = await query<{
      daily_record_id: string; su_id: string; home_id: string;
      first_name: string; last_name: string; incident_time: string;
    }>(
      `SELECT ri.daily_record_id, dr.su_id, dr.home_id, su.first_name, su.last_name, ri.incident_time
       FROM records_incidents ri
       JOIN daily_records dr ON dr.id = ri.daily_record_id
       JOIN service_users su ON su.id = dr.su_id
       WHERE ri.manager_reviewed = FALSE
         AND ri.incident_time < NOW() - INTERVAL '24 hours'
         AND NOT EXISTS (
           SELECT 1 FROM business_alerts ba
           WHERE ba.record_id = ri.daily_record_id AND ba.alert_type = 'incident_not_reviewed'
             AND ba.is_resolved = FALSE
         )`
    );

    for (const i of unreviewed) {
      await createAlert({
        homeId: i.home_id,
        alertType: 'incident_not_reviewed',
        severity: 'critical',
        title: `Incident not reviewed: ${i.first_name} ${i.last_name}`,
        description: `An incident logged at ${new Date(i.incident_time).toLocaleString('en-GB')} has not been reviewed by management.`,
        suId: i.su_id,
        recordId: i.daily_record_id,
        recordType: 'incident',
      });
    }
  } catch (err) {
    logger.warn('checkIncidentReviews skipped: ' + (err as any)?.message?.split('\n')[0]);
  }
}

// "Tomorrow's shifts": one alert per home each afternoon when tomorrow still
// has shifts with nobody assigned, so cover can be arranged the day before.
export async function checkTomorrowsUnfilledShifts(): Promise<void> {
  try {
    const today = ukDateStr();
    const rows = await query<{ home_id: string; n: string; slots: string }>(
      `SELECT sh.home_id, COUNT(*) AS n,
              string_agg(DISTINCT COALESCE(sh.label, su.first_name || ' ' || su.last_name, 'shift') || ' ' || to_char(sh.start_time, 'HH24:MI'), ', ') AS slots
       FROM staff_shifts sh LEFT JOIN service_users su ON su.id = sh.su_id
       WHERE sh.shift_date = $1::date + 1 AND sh.staff_id IS NULL AND sh.status <> 'cancelled'
         AND NOT EXISTS (SELECT 1 FROM business_alerts ba WHERE ba.home_id = sh.home_id
                           AND ba.alert_type = 'tomorrows_unfilled_shifts' AND ba.created_at::date = CURRENT_DATE)
       GROUP BY sh.home_id`,
      [today]
    );
    for (const r of rows) {
      await createAlert({
        homeId: r.home_id, alertType: 'tomorrows_unfilled_shifts', severity: 'warning',
        title: `${r.n} shift${r.n === '1' ? '' : 's'} tomorrow with no staff assigned`,
        description: `Unfilled tomorrow: ${String(r.slots || '').slice(0, 900)}`,
      });
    }
  } catch (err) {
    logger.warn('checkTomorrowsUnfilledShifts skipped: ' + (err as any)?.message?.split('\n')[0]);
  }
}

// "Handover not completed": staff who worked a shift yesterday and filed no handover record.
export async function checkHandoverNotCompleted(): Promise<void> {
  try {
    const today = ukDateStr();
    const rows = await query<{ home_id: string; n: string; names: string }>(
      `SELECT sh.home_id, COUNT(DISTINCT sh.staff_id) AS n,
              string_agg(DISTINCT s.first_name || ' ' || s.last_name, ', ') AS names
       FROM staff_shifts sh JOIN staff s ON s.id = sh.staff_id
       WHERE sh.shift_date = $1::date - 1 AND sh.status <> 'cancelled'
         AND EXISTS (SELECT 1 FROM staff_clock_events ce WHERE ce.staff_id = sh.staff_id AND ce.event_type = 'clock_in'
                       AND (ce.event_time AT TIME ZONE 'Europe/London')::date = sh.shift_date)
         AND NOT EXISTS (SELECT 1 FROM daily_records dr WHERE dr.staff_id = sh.staff_id AND dr.record_type = 'handover'
                           AND dr.record_date BETWEEN $1::date - 1 AND $1::date)
         AND NOT EXISTS (SELECT 1 FROM business_alerts ba WHERE ba.home_id = sh.home_id
                           AND ba.alert_type = 'handover_not_completed' AND ba.created_at::date = CURRENT_DATE)
       GROUP BY sh.home_id`,
      [today]
    );
    for (const r of rows) {
      await createAlert({
        homeId: r.home_id, alertType: 'handover_not_completed', severity: 'info',
        title: `Handover not completed by ${r.n} staff yesterday`,
        description: `Worked a shift yesterday but filed no handover: ${String(r.names || '').slice(0, 900)}`,
      });
    }
  } catch (err) {
    logger.warn('checkHandoverNotCompleted skipped: ' + (err as any)?.message?.split('\n')[0]);
  }
}

// "Stool alert": someone whose bowel movements are being recorded has had none
// logged for 3 days. Only people with a bowel record in the last 30 days are
// considered, so residents who aren't on bowel monitoring never trigger it.
export async function checkNoBowelMovement(): Promise<void> {
  try {
    const today = ukDateStr();
    const rows = await query<{ id: string; home_id: string; first_name: string; last_name: string; last_date: string }>(
      `SELECT su.id, su.home_id, su.first_name, su.last_name, to_char(MAX(dr.record_date), 'DD Mon') AS last_date
       FROM service_users su
       JOIN daily_records dr ON dr.su_id = su.id AND dr.record_type IN ('bowel', 'bowel_movement')
                              AND dr.record_date >= $1::date - 30
       WHERE su.status = 'live'
         AND NOT EXISTS (SELECT 1 FROM business_alerts ba WHERE ba.su_id = su.id
                           AND ba.alert_type = 'no_bowel_movement' AND ba.is_resolved = FALSE)
       GROUP BY su.id, su.home_id, su.first_name, su.last_name
       HAVING MAX(dr.record_date) < $1::date - 3`,
      [today]
    );
    for (const r of rows) {
      await createAlert({
        homeId: r.home_id, alertType: 'no_bowel_movement', severity: 'warning', suId: r.id,
        title: `No bowel movement recorded for 3+ days: ${r.first_name} ${r.last_name}`,
        description: `Last bowel record was on ${r.last_date}. Check on them and record, or escalate if there has been no movement.`,
      });
    }
  } catch (err) {
    logger.warn('checkNoBowelMovement skipped: ' + (err as any)?.message?.split('\n')[0]);
  }
}

// "Clocked in too far": a clock-in/out recorded outside the permitted distance from the service.
export async function checkClockedInTooFar(): Promise<void> {
  try {
    const rows = await query<{ id: string; home_id: string; staff_id: string; name: string; event_type: string; distance_metres: number | null; at: string }>(
      `SELECT ce.id, ce.home_id, ce.staff_id, s.first_name || ' ' || s.last_name AS name, ce.event_type, ce.distance_metres,
              to_char(ce.event_time AT TIME ZONE 'Europe/London', 'DD Mon HH24:MI') AS at
       FROM staff_clock_events ce JOIN staff s ON s.id = ce.staff_id
       WHERE ce.geofence_passed IS FALSE AND ce.event_time > NOW() - interval '24 hours'
         AND NOT EXISTS (SELECT 1 FROM business_alerts ba WHERE ba.record_id = ce.id AND ba.alert_type = 'clocked_in_too_far')`
    );
    for (const r of rows) {
      await createAlert({
        homeId: r.home_id, alertType: 'clocked_in_too_far', severity: 'warning', staffId: r.staff_id,
        recordId: r.id, recordType: 'clock_event',
        title: `${r.name} ${r.event_type === 'clock_out' ? 'clocked out' : 'clocked in'} away from the service`,
        description: `${r.at} — ${r.distance_metres != null ? r.distance_metres + ' metres from the service' : 'location was outside the permitted area'}.`,
      });
    }
  } catch (err) {
    logger.warn('checkClockedInTooFar skipped: ' + (err as any)?.message?.split('\n')[0]);
  }
}

// "Mandatory notes entry": staff who clocked in yesterday and wrote no daily record at all.
export async function checkNoNotesWritten(): Promise<void> {
  try {
    const today = ukDateStr();
    const rows = await query<{ home_id: string; n: string; names: string }>(
      `SELECT x.home_id, COUNT(*) AS n, string_agg(x.name, ', ') AS names FROM (
         SELECT DISTINCT ce.home_id, ce.staff_id, s.first_name || ' ' || s.last_name AS name
         FROM staff_clock_events ce JOIN staff s ON s.id = ce.staff_id
         WHERE ce.event_type = 'clock_in' AND (ce.event_time AT TIME ZONE 'Europe/London')::date = $1::date - 1
           AND s.role::text IN ('care_staff', 'senior_carer', 'team_leader')
           AND NOT EXISTS (SELECT 1 FROM daily_records dr WHERE dr.staff_id = ce.staff_id
                             AND dr.record_date BETWEEN $1::date - 1 AND $1::date)
       ) x
       WHERE NOT EXISTS (SELECT 1 FROM business_alerts ba WHERE ba.home_id = x.home_id
                           AND ba.alert_type = 'no_notes_written' AND ba.created_at::date = CURRENT_DATE)
       GROUP BY x.home_id`,
      [today]
    );
    for (const r of rows) {
      await createAlert({
        homeId: r.home_id, alertType: 'no_notes_written', severity: 'warning',
        title: `${r.n} staff worked yesterday without writing any daily record`,
        description: `No daily records from: ${String(r.names || '').slice(0, 900)}`,
      });
    }
  } catch (err) {
    logger.warn('checkNoNotesWritten skipped: ' + (err as any)?.message?.split('\n')[0]);
  }
}

// Alerts whose type has an auto-clear time set are resolved once they are that old.
export async function autoClearAlerts(): Promise<void> {
  try {
    await query(
      `UPDATE business_alerts ba SET is_resolved = TRUE, resolved_at = NOW(),
              resolution_notes = COALESCE(ba.resolution_notes, 'Cleared automatically (alert settings)')
       FROM alert_settings st
       WHERE st.home_id = ba.home_id AND st.alert_type = ba.alert_type AND st.auto_clear_hours IS NOT NULL
         AND ba.is_resolved = FALSE AND ba.created_at < NOW() - (st.auto_clear_hours || ' hours')::interval`);
  } catch (err) {
    logger.warn('autoClearAlerts skipped: ' + (err as any)?.message?.split('\n')[0]);
  }
}

// "Sensitive date": warn the day before and on the day itself.
export async function checkSensitiveDates(): Promise<void> {
  try {
    const today = ukDateStr();
    const rows = await query<any>(
      `SELECT sd.id, sd.home_id, sd.su_id, sd.label, sd.notes, su.first_name, su.last_name,
              CASE WHEN to_char(sd.event_date, 'MM-DD') = to_char($1::date, 'MM-DD') THEN 'today' ELSE 'tomorrow' END AS when_is
       FROM su_sensitive_dates sd JOIN service_users su ON su.id = sd.su_id
       WHERE su.status = 'live'
         AND ((sd.repeats_yearly AND to_char(sd.event_date, 'MM-DD') IN (to_char($1::date, 'MM-DD'), to_char($1::date + 1, 'MM-DD')))
           OR (NOT sd.repeats_yearly AND sd.event_date IN ($1::date, $1::date + 1)))
         AND NOT EXISTS (SELECT 1 FROM business_alerts ba WHERE ba.record_id = sd.id
                           AND ba.alert_type = 'sensitive_date' AND ba.created_at::date = CURRENT_DATE)`,
      [today]);
    for (const r of rows) {
      await createAlert({
        homeId: r.home_id, alertType: 'sensitive_date', severity: 'info', suId: r.su_id,
        recordId: r.id, recordType: 'sensitive_date',
        title: `Sensitive date ${r.when_is}: ${r.first_name} ${r.last_name} — ${r.label}`,
        description: r.notes || 'Be mindful of how they may be feeling and offer extra support.',
      });
    }
  } catch (err) {
    logger.warn('checkSensitiveDates skipped: ' + (err as any)?.message?.split('\n')[0]);
  }
}

export const alertsService = {
  checkSensitiveDates,
  autoClearAlerts,
  checkClockedInTooFar, checkNoNotesWritten,
  checkTomorrowsUnfilledShifts, checkHandoverNotCompleted, checkNoBowelMovement,
  createAlert,
  checkCarePlanReviews,
  checkFluidIntake,
  checkTrainingExpiry,
  checkIncidentReviews,
  checkLowMedicationStock,
};
