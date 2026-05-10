import cron from 'node-cron';
import { alertsService } from './alerts.service';
import { logger } from '../config/logger';

// ================================================================
// HEALTHARK SCHEDULED JOBS
// Runs background checks for the AI audit engine
// ================================================================

export function startScheduler(): void {
  logger.info('Starting HealthArk scheduler');

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
