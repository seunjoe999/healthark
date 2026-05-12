import cron from 'node-cron';
import { alertsService } from './alerts.service';
import { logger } from '../config/logger';

// ================================================================
// HEALTHARK SCHEDULED JOBS
// Runs background checks for the AI audit engine
// ================================================================


// Daily: check overdue care plans and send notifications
async function checkOverdueCarePlans() {
  try {
    const { query } = await import('../config/database');
    const overdueRows = await query(
      `SELECT cp.id, cp.su_id, cp.plan_type, su.first_name || ' ' || su.last_name as su_name,
              s.id as manager_id, cp.home_id
       FROM care_plans cp
       JOIN service_users su ON su.id = cp.su_id
       JOIN staff s ON s.home_id = su.home_id AND s.role IN ('home_manager','group_admin') AND s.is_active = true
       WHERE cp.next_review_date < CURRENT_DATE AND cp.is_active = true
       LIMIT 50`
    );
    for (const row of overdueRows as any[]) {
      await query(
        `INSERT INTO notifications (recipient_id, home_id, title, body, type, link)
         VALUES ($1,$2,$3,$4,'warning','/care-plans')
         ON CONFLICT DO NOTHING`,
        [row.manager_id, row.home_id,
         `Care plan review overdue — ${row.su_name}`,
         `${row.plan_type?.replace(/_/g, ' ')} care plan for ${row.su_name} is overdue for review.`]
      );
    }
  } catch (err) { console.error('Overdue care plan check failed:', err); }
}

export function startScheduler(): void {
  logger.info('Starting CompCare Hub scheduler');

  // Every hour: check fluid intake
  cron.schedule('0 * * * *', async () => {
    logger.info('Scheduler: checking fluid intake');
    await alertsService.checkFluidIntake();
  });

  // Every 2 hours: check for missed tasks
  cron.schedule('0 */2 * * *', async () => {
    logger.info('Scheduler: checking care plan reviews');
    await alertsService.checkCarePlanReviews();
  });

  // Every morning at 8am: training expiry checks
  cron.schedule('0 8 * * *', async () => {
    logger.info('Scheduler: checking training expiry');
    await alertsService.checkTrainingExpiry();
  });

  // Every morning at 9am: unreviewed incidents
  cron.schedule('0 9 * * *', async () => {
    logger.info('Scheduler: checking incident reviews');
    await alertsService.checkIncidentReviews();
  });

  // Monthly report: 1st of each month at 6am
  cron.schedule('0 6 1 * *', async () => {
    logger.info('Scheduler: generating monthly reports');
    // AI monthly report generation - wired in Phase 5
  });

  logger.info('Scheduler started — all jobs registered');
}
