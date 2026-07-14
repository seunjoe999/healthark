import { query } from '../config/database';
import { logger } from '../config/logger';

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
    const today = new Date().toISOString().split('T')[0];
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
    const today = new Date().toISOString().split('T')[0];
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

export const alertsService = {
  createAlert,
  checkCarePlanReviews,
  checkFluidIntake,
  checkTrainingExpiry,
  checkIncidentReviews,
};
