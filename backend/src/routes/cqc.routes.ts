import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';
import { ApiResponse } from '../types';

const router = Router();
router.use(authenticate);

// GET /api/cqc/evidence-pack?homeId=&from=&to=
router.get('/evidence-pack', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || (req.staff as any)?.homeId || '';
    const from = req.query.from as string || new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
    const to   = req.query.to   as string || new Date().toISOString().split('T')[0];

    if (!homeId) return res.status(400).json({ success: false, error: 'homeId required' });

    // helper: safe count query that returns 0 if table/column doesn't exist
    const safeCount = async (sql: string, params: any[]): Promise<number> => {
      try {
        const rows = await query<any>(sql, params);
        return parseInt(rows[0]?.count ?? 0);
      } catch { return 0; }
    };

    const [
      residentCount, staffCount, dailyRecordsCount,

      // SAFE
      incidentCount, safeguardingCount, highSeverityCount, fallsCount,
      medicationErrorCount, dbsCount, riskAssessmentCount, marCount, ppeCount, lessonsLearnedCount,
      recentIncidents,

      // EFFECTIVE
      barthelCount, mustCount, news2Count, waterlowCount, woundCareCount,
      carePlanCount, carePlanReviewCount, weightCount, fluidCount, hospitalCount,
      trainingCount, supervisionCount, auditCount,

      // CARING
      personalCareCount, socialActivitiesCount, diaryCount, consentsCount,
      familyPortalCount, profVisitsCount, observationsCount, noticeboardCount, bathChartCount,

      // RESPONSIVE
      complaintsCount, complimentsCount, reviewsCount, outcomesCount,
      waitingListCount, tasksCount, maintenanceCount,

      // WELL-LED
      policiesCount, complianceCount, cqcNotifCount,
      supervisionCountWL, dbsCountWL, absenceCount, rotaCount, clockinCount,

      homeName,
    ] = await Promise.all([
      // Overview
      safeCount('SELECT COUNT(*) FROM service_users WHERE home_id=$1 AND status=$2', [homeId, 'live']),
      safeCount('SELECT COUNT(*) FROM staff WHERE home_id=$1 AND is_active=true', [homeId]),
      safeCount('SELECT COUNT(*) FROM daily_records WHERE home_id=$1 AND record_date BETWEEN $2 AND $3', [homeId, from, to]),

      // SAFE
      safeCount('SELECT COUNT(*) FROM incidents WHERE home_id=$1 AND incident_date BETWEEN $2 AND $3', [homeId, from, to]),
      safeCount("SELECT COUNT(*) FROM safeguarding WHERE home_id=$1 AND created_at::date BETWEEN $2 AND $3", [homeId, from, to]),
      safeCount("SELECT COUNT(*) FROM incidents WHERE home_id=$1 AND incident_date BETWEEN $2 AND $3 AND severity IN ('critical','serious')", [homeId, from, to]),
      safeCount("SELECT COUNT(*) FROM incidents WHERE home_id=$1 AND incident_date BETWEEN $2 AND $3 AND incident_type ILIKE '%fall%'", [homeId, from, to]),
      safeCount("SELECT COUNT(*) FROM incidents WHERE home_id=$1 AND incident_date BETWEEN $2 AND $3 AND incident_type ILIKE '%medication%'", [homeId, from, to]),
      safeCount('SELECT COUNT(*) FROM dbs_checks WHERE home_id=$1 AND status=$2', [homeId, 'clear']),
      safeCount('SELECT COUNT(*) FROM risk_assessments WHERE home_id=$1 AND updated_at::date BETWEEN $2 AND $3', [homeId, from, to]),
      safeCount('SELECT COUNT(*) FROM mar_records WHERE home_id=$1 AND administration_date BETWEEN $2 AND $3', [homeId, from, to]),
      safeCount('SELECT COUNT(*) FROM ppe_stock_checks WHERE home_id=$1 AND check_date BETWEEN $2 AND $3', [homeId, from, to]),
      safeCount('SELECT COUNT(*) FROM lessons_learned WHERE home_id=$1 AND created_at::date BETWEEN $2 AND $3', [homeId, from, to]),
      query<any>('SELECT incident_type, description, severity, incident_date FROM incidents WHERE home_id=$1 AND incident_date BETWEEN $2 AND $3 ORDER BY incident_date DESC LIMIT 10', [homeId, from, to]).catch(() => []),

      // EFFECTIVE
      safeCount('SELECT COUNT(*) FROM barthel_assessments WHERE home_id=$1 AND assessed_at::date BETWEEN $2 AND $3', [homeId, from, to]),
      safeCount('SELECT COUNT(*) FROM must_scores WHERE home_id=$1 AND assessed_at::date BETWEEN $2 AND $3', [homeId, from, to]),
      safeCount('SELECT COUNT(*) FROM news2_scores WHERE home_id=$1 AND assessed_at::date BETWEEN $2 AND $3', [homeId, from, to]),
      safeCount('SELECT COUNT(*) FROM waterlow_scores WHERE home_id=$1 AND assessed_at::date BETWEEN $2 AND $3', [homeId, from, to]),
      safeCount('SELECT COUNT(*) FROM wound_care WHERE home_id=$1 AND record_date BETWEEN $2 AND $3', [homeId, from, to]),
      safeCount('SELECT COUNT(*) FROM care_plans WHERE home_id=$1 AND is_active=true', [homeId]),
      safeCount('SELECT COUNT(*) FROM care_plans WHERE home_id=$1 AND last_review_date BETWEEN $2 AND $3', [homeId, from, to]),
      safeCount('SELECT COUNT(*) FROM weight_records WHERE home_id=$1 AND measured_at::date BETWEEN $2 AND $3', [homeId, from, to]),
      safeCount('SELECT COUNT(*) FROM fluid_balance_records WHERE home_id=$1 AND record_date BETWEEN $2 AND $3', [homeId, from, to]),
      safeCount('SELECT COUNT(*) FROM hospital_admissions WHERE home_id=$1 AND admission_date BETWEEN $2 AND $3', [homeId, from, to]),
      safeCount('SELECT COUNT(*) FROM training_completions WHERE home_id=$1 AND completed_date BETWEEN $2 AND $3', [homeId, from, to]),
      safeCount("SELECT COUNT(*) FROM assessments WHERE home_id=$1 AND template_key='supervision' AND assessment_date BETWEEN $2 AND $3", [homeId, from, to]),
      safeCount('SELECT COUNT(*) FROM assessments WHERE home_id=$1 AND assessment_date BETWEEN $2 AND $3', [homeId, from, to]),

      // CARING
      safeCount("SELECT COUNT(*) FROM daily_records WHERE home_id=$1 AND record_type='personal_care' AND record_date BETWEEN $2 AND $3", [homeId, from, to]),
      safeCount('SELECT COUNT(*) FROM social_activities WHERE home_id=$1 AND activity_date BETWEEN $2 AND $3', [homeId, from, to]),
      safeCount('SELECT COUNT(*) FROM resident_diary WHERE home_id=$1 AND entry_date BETWEEN $2 AND $3', [homeId, from, to]),
      safeCount('SELECT COUNT(*) FROM consents WHERE home_id=$1 AND created_at::date BETWEEN $2 AND $3', [homeId, from, to]),
      safeCount('SELECT COUNT(DISTINCT id) FROM service_users WHERE home_id=$1 AND qr_token IS NOT NULL', [homeId]),
      safeCount('SELECT COUNT(*) FROM professional_visits WHERE home_id=$1 AND visit_date BETWEEN $2 AND $3', [homeId, from, to]),
      safeCount('SELECT COUNT(*) FROM observations WHERE home_id=$1 AND created_at::date BETWEEN $2 AND $3', [homeId, from, to]),
      safeCount('SELECT COUNT(*) FROM noticeboard WHERE home_id=$1 AND created_at::date BETWEEN $2 AND $3', [homeId, from, to]),
      safeCount('SELECT COUNT(*) FROM bath_chart WHERE home_id=$1 AND bath_date BETWEEN $2 AND $3', [homeId, from, to]),

      // RESPONSIVE
      safeCount("SELECT COUNT(*) FROM quality_events WHERE home_id=$1 AND type='complaint' AND created_at::date BETWEEN $2 AND $3", [homeId, from, to]),
      safeCount("SELECT COUNT(*) FROM quality_events WHERE home_id=$1 AND type='compliment' AND created_at::date BETWEEN $2 AND $3", [homeId, from, to]),
      safeCount('SELECT COUNT(*) FROM su_reviews WHERE home_id=$1 AND review_date BETWEEN $2 AND $3', [homeId, from, to]),
      safeCount('SELECT COUNT(*) FROM outcomes WHERE home_id=$1 AND created_at::date BETWEEN $2 AND $3', [homeId, from, to]),
      safeCount('SELECT COUNT(*) FROM waiting_list WHERE home_id=$1', [homeId]),
      safeCount("SELECT COUNT(*) FROM tasks WHERE home_id=$1 AND status='completed' AND updated_at::date BETWEEN $2 AND $3", [homeId, from, to]),
      safeCount('SELECT COUNT(*) FROM maintenance_requests WHERE home_id=$1 AND created_at::date BETWEEN $2 AND $3', [homeId, from, to]),

      // WELL-LED
      safeCount('SELECT COUNT(*) FROM policy_sign_offs WHERE signed_at::date BETWEEN $2 AND $3', [homeId, from, to]),
      safeCount('SELECT COUNT(*) FROM compliance_records WHERE home_id=$1 AND created_at::date BETWEEN $2 AND $3', [homeId, from, to]),
      safeCount('SELECT COUNT(*) FROM cqc_notifications WHERE home_id=$1 AND created_at::date BETWEEN $2 AND $3', [homeId, from, to]),
      safeCount("SELECT COUNT(*) FROM assessments WHERE home_id=$1 AND template_key='supervision' AND assessment_date BETWEEN $2 AND $3", [homeId, from, to]),
      safeCount("SELECT COUNT(*) FROM dbs_checks WHERE home_id=$1 AND status='clear'", [homeId]),
      safeCount('SELECT COUNT(*) FROM staff_absences WHERE home_id=$1 AND start_date BETWEEN $2 AND $3', [homeId, from, to]),
      safeCount('SELECT COUNT(*) FROM rota_shifts WHERE home_id=$1 AND shift_date BETWEEN $2 AND $3', [homeId, from, to]),
      safeCount('SELECT COUNT(*) FROM clock_records WHERE home_id=$1 AND clock_in_time::date BETWEEN $2 AND $3', [homeId, from, to]),

      // Home name
      query<any>('SELECT name FROM homes WHERE id=$1', [homeId]).then(r => r[0]?.name || '').catch(() => ''),
    ]);

    // Training compliance estimate
    let trainingCompliancePct: number | null = null;
    try {
      const matrixRows = await query<any>(
        'SELECT COUNT(*) as done FROM training_matrix WHERE home_id=$1 AND status=$2',
        [homeId, 'completed']
      );
      const totalRows = await query<any>('SELECT COUNT(*) as total FROM training_matrix WHERE home_id=$1', [homeId]);
      const done = parseInt(matrixRows[0]?.done ?? 0);
      const total = parseInt(totalRows[0]?.total ?? 0);
      if (total > 0) trainingCompliancePct = Math.round((done / total) * 100);
    } catch {}

    res.json({
      success: true,
      data: {
        homeName, from, to,
        overview: { residentCount, staffCount, dailyRecordsCount, incidentCount },
        safe: {
          incidentCount, safeguardingCount, highSeverityCount, fallsCount,
          medicationErrorCount, dbsCount, riskAssessmentCount, marCount, ppeCount,
          lessonsLearnedCount, recentIncidents,
        },
        effective: {
          barthelCount, mustCount, news2Count, waterlowCount, woundCareCount,
          carePlanCount, carePlanReviewCount, weightCount, fluidCount, hospitalCount,
          trainingCount, supervisionCount, auditCount, trainingCompliancePct,
        },
        caring: {
          dailyRecordsCount, personalCareCount, socialActivitiesCount, diaryCount,
          consentsCount, familyPortalCount, profVisitsCount, observationsCount,
          noticeboardCount, bathChartCount,
        },
        responsive: {
          complaintsCount, complimentsCount, reviewsCount, outcomesCount,
          hospitalCount, waitingListCount, tasksCount, maintenanceCount,
        },
        wellLed: {
          policiesCount, auditCount, complianceCount, cqcNotifCount,
          supervisionCount: supervisionCountWL, dbsCount: dbsCountWL,
          absenceCount, rotaCount, clockinCount, lessonsLearnedCount,
        },
      }
    } as ApiResponse);
  } catch (err) { next(err); }
});

export default router;
