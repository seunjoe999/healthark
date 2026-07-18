import { Router, Request } from 'express'
import { query } from '../config/database'
import { authenticate } from '../middleware/auth'
import jwt from 'jsonwebtoken'

const router = Router()
router.use(authenticate)

function fromToken(req: Request, field: string): string {
  const token = req.headers.authorization?.substring(7)
  if (token) { const d = jwt.decode(token) as any; return (req.staff as any)?.[field] || d?.[field] || '' }
  return (req.staff as any)?.[field] || ''
}

// ─── TABLE INIT ──────────────────────────────────────────────────────────────

async function initTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS abbey_pain_assessments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      su_id UUID NOT NULL, home_id UUID NOT NULL,
      vocalisation INT NOT NULL DEFAULT 0,
      facial_expression INT NOT NULL DEFAULT 0,
      body_language INT NOT NULL DEFAULT 0,
      behavioural_change INT NOT NULL DEFAULT 0,
      physiological_change INT NOT NULL DEFAULT 0,
      physical_change INT NOT NULL DEFAULT 0,
      total_score INT NOT NULL DEFAULT 0,
      interpretation TEXT,
      pain_type TEXT,
      notes TEXT,
      assessed_by UUID,
      assessed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {})

  await query(`
    CREATE TABLE IF NOT EXISTS abc_chart_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      su_id UUID NOT NULL, home_id UUID NOT NULL,
      antecedents JSONB DEFAULT '[]',
      behaviours JSONB DEFAULT '[]',
      intensity TEXT,
      duration TEXT,
      consequences JSONB DEFAULT '[]',
      resident_response TEXT,
      notes TEXT,
      staff_id UUID,
      recorded_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {})

  await query(`
    CREATE TABLE IF NOT EXISTS blood_glucose_readings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      su_id UUID NOT NULL, home_id UUID NOT NULL,
      reading_type TEXT NOT NULL,
      glucose_mmol NUMERIC(5,2) NOT NULL,
      insulin_given BOOLEAN DEFAULT FALSE,
      insulin_type TEXT,
      insulin_units NUMERIC(5,1),
      symptoms TEXT,
      action_taken TEXT,
      notes TEXT,
      staff_id UUID,
      recorded_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {})

  await query(`
    CREATE TABLE IF NOT EXISTS body_map_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      su_id UUID NOT NULL, home_id UUID NOT NULL,
      wounds JSONB DEFAULT '[]',
      overall_notes TEXT,
      staff_id UUID,
      recorded_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {})

  await query(`
    CREATE TABLE IF NOT EXISTS oral_hygiene_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      su_id UUID NOT NULL, home_id UUID NOT NULL,
      session TEXT NOT NULL,
      mouth_conditions JSONB DEFAULT '[]',
      upper_denture TEXT,
      lower_denture TEXT,
      products JSONB DEFAULT '[]',
      assistance TEXT,
      refused BOOLEAN DEFAULT FALSE,
      notes TEXT,
      staff_id UUID,
      recorded_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {})

  await query(`
    CREATE TABLE IF NOT EXISTS catheter_care_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      su_id UUID NOT NULL, home_id UUID NOT NULL,
      catheter_type TEXT,
      cath_size TEXT,
      inserted_date DATE,
      change_date DATE,
      batch_no TEXT,
      urine_colour TEXT,
      urine_amount_ml NUMERIC(8,1),
      complications JSONB DEFAULT '[]',
      actions JSONB DEFAULT '[]',
      notes TEXT,
      staff_id UUID,
      recorded_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {})

  await query(`
    CREATE TABLE IF NOT EXISTS eol_care_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      su_id UUID UNIQUE NOT NULL, home_id UUID NOT NULL,
      dnar_status TEXT DEFAULT 'Unknown',
      respect_form BOOLEAN DEFAULT FALSE,
      preferred_place TEXT,
      comfort_measures JSONB DEFAULT '[]',
      symptoms_to_manage JSONB DEFAULT '[]',
      spiritual_needs TEXT,
      cultural_needs TEXT,
      family_contact TEXT,
      family_informed BOOLEAN DEFAULT FALSE,
      gp TEXT,
      syringe_driver BOOLEAN DEFAULT FALSE,
      last_days_commenced BOOLEAN DEFAULT FALSE,
      last_days_date DATE,
      additional_wishes TEXT,
      notes TEXT,
      updated_by UUID,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {})

  await query(`
    CREATE TABLE IF NOT EXISTS eol_comfort_rounding (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      su_id UUID NOT NULL, home_id UUID NOT NULL,
      symptoms JSONB DEFAULT '[]',
      notes TEXT,
      staff_id UUID,
      recorded_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {})

  await query(`
    CREATE TABLE IF NOT EXISTS gp_referrals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      su_id UUID NOT NULL, home_id UUID NOT NULL,
      referral_type TEXT NOT NULL,
      urgency TEXT DEFAULT 'Routine',
      reason TEXT,
      referred_to TEXT,
      appointment_date DATE,
      status TEXT DEFAULT 'Pending',
      outcome TEXT,
      notes TEXT,
      staff_id UUID,
      referred_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {})
}

initTables().catch(() => {})

// ─── ABBEY PAIN SCALE ────────────────────────────────────────────────────────

router.get('/abbey-pain/:suId', async (req, res) => {
  try {
    const rows = await query<any>(`
      SELECT a.*, s.first_name || ' ' || s.last_name AS assessed_by_name
      FROM abbey_pain_assessments a
      LEFT JOIN staff s ON s.id = a.assessed_by
      WHERE a.su_id = $1
      ORDER BY a.assessed_at DESC LIMIT 50
    `, [req.params.suId])
    res.json({ success: true, data: rows })
  } catch (e) { res.status(500).json({ error: 'Failed' }) }
})

router.post('/abbey-pain', async (req, res) => {
  const { suId, homeId, vocalisation, facialExpression, bodyLanguage, behaviouralChange, physiologicalChange, physicalChange, totalScore, interpretation, painType, notes, assessedBy } = req.body
  try {
    await query(`
      INSERT INTO abbey_pain_assessments (su_id, home_id, vocalisation, facial_expression, body_language, behavioural_change, physiological_change, physical_change, total_score, interpretation, pain_type, notes, assessed_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    `, [suId, homeId, vocalisation, facialExpression, bodyLanguage, behaviouralChange, physiologicalChange, physicalChange, totalScore, interpretation, painType, notes, assessedBy])
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: 'Failed' }) }
})

// ─── ABC CHART ───────────────────────────────────────────────────────────────

router.get('/abc-chart/:suId', async (req, res) => {
  try {
    const rows = await query<any>(`
      SELECT a.*, s.first_name || ' ' || s.last_name AS staff_name
      FROM abc_chart_entries a
      LEFT JOIN staff s ON s.id = a.staff_id
      WHERE a.su_id = $1
      ORDER BY a.recorded_at DESC LIMIT 100
    `, [req.params.suId])
    res.json({ success: true, data: rows })
  } catch (e) { res.status(500).json({ error: 'Failed' }) }
})

router.post('/abc-chart', async (req, res) => {
  const { suId, homeId, antecedents, behaviours, intensity, duration, consequences, residentResponse, notes, staffId } = req.body
  try {
    await query(`
      INSERT INTO abc_chart_entries (su_id, home_id, antecedents, behaviours, intensity, duration, consequences, resident_response, notes, staff_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `, [suId, homeId, JSON.stringify(antecedents || []), JSON.stringify(behaviours || []), intensity, duration, JSON.stringify(consequences || []), residentResponse, notes, staffId])
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: 'Failed' }) }
})

// ─── BLOOD GLUCOSE ───────────────────────────────────────────────────────────

router.get('/blood-glucose/:suId', async (req, res) => {
  try {
    const rows = await query<any>(`
      SELECT b.*, s.first_name || ' ' || s.last_name AS staff_name
      FROM blood_glucose_readings b
      LEFT JOIN staff s ON s.id = b.staff_id
      WHERE b.su_id = $1
      ORDER BY b.recorded_at DESC LIMIT 100
    `, [req.params.suId])
    res.json({ success: true, data: rows })
  } catch (e) { res.status(500).json({ error: 'Failed' }) }
})

router.post('/blood-glucose', async (req, res) => {
  const { suId, homeId, readingType, glucoseMmol, insulinGiven, insulinType, insulinUnits, symptoms, actionTaken, notes, staffId } = req.body
  try {
    await query(`
      INSERT INTO blood_glucose_readings (su_id, home_id, reading_type, glucose_mmol, insulin_given, insulin_type, insulin_units, symptoms, action_taken, notes, staff_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `, [suId, homeId, readingType, glucoseMmol, insulinGiven || false, insulinType, insulinUnits, symptoms, actionTaken, notes, staffId])
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: 'Failed' }) }
})

// ─── BODY MAP ────────────────────────────────────────────────────────────────

router.get('/body-map/:suId', async (req, res) => {
  try {
    const rows = await query<any>(`
      SELECT b.*, s.first_name || ' ' || s.last_name AS staff_name
      FROM body_map_records b
      LEFT JOIN staff s ON s.id = b.staff_id
      WHERE b.su_id = $1
      ORDER BY b.recorded_at DESC LIMIT 20
    `, [req.params.suId])
    res.json({ success: true, data: rows })
  } catch (e) { res.status(500).json({ error: 'Failed' }) }
})

router.post('/body-map', async (req, res) => {
  const { suId, homeId, wounds, overallNotes, staffId } = req.body
  try {
    await query(`
      INSERT INTO body_map_records (su_id, home_id, wounds, overall_notes, staff_id)
      VALUES ($1,$2,$3,$4,$5)
    `, [suId, homeId, JSON.stringify(wounds || []), overallNotes, staffId])
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: 'Failed' }) }
})

// ─── ORAL HYGIENE ────────────────────────────────────────────────────────────

router.get('/oral-hygiene/:suId', async (req, res) => {
  try {
    const rows = await query<any>(`
      SELECT o.*, s.first_name || ' ' || s.last_name AS staff_name
      FROM oral_hygiene_records o
      LEFT JOIN staff s ON s.id = o.staff_id
      WHERE o.su_id = $1
      ORDER BY o.recorded_at DESC LIMIT 100
    `, [req.params.suId])
    res.json({ success: true, data: rows })
  } catch (e) { res.status(500).json({ error: 'Failed' }) }
})

router.post('/oral-hygiene', async (req, res) => {
  const { suId, homeId, session, mouthConditions, upperDenture, lowerDenture, products, assistance, refused, notes, staffId } = req.body
  try {
    await query(`
      INSERT INTO oral_hygiene_records (su_id, home_id, session, mouth_conditions, upper_denture, lower_denture, products, assistance, refused, notes, staff_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `, [suId, homeId, session, JSON.stringify(mouthConditions || []), upperDenture, lowerDenture, JSON.stringify(products || []), assistance, refused || false, notes, staffId])
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: 'Failed' }) }
})

// ─── CATHETER CARE ───────────────────────────────────────────────────────────

router.get('/catheter/:suId', async (req, res) => {
  try {
    const rows = await query<any>(`
      SELECT c.*, s.first_name || ' ' || s.last_name AS staff_name
      FROM catheter_care_logs c
      LEFT JOIN staff s ON s.id = c.staff_id
      WHERE c.su_id = $1
      ORDER BY c.recorded_at DESC LIMIT 100
    `, [req.params.suId])
    res.json({ success: true, data: rows })
  } catch (e) { res.status(500).json({ error: 'Failed' }) }
})

router.post('/catheter', async (req, res) => {
  const { suId, homeId, catheterType, cathSize, insertedDate, changeDate, batchNo, urineColour, urineAmountMl, complications, actions, notes, staffId } = req.body
  try {
    await query(`
      INSERT INTO catheter_care_logs (su_id, home_id, catheter_type, cath_size, inserted_date, change_date, batch_no, urine_colour, urine_amount_ml, complications, actions, notes, staff_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    `, [suId, homeId, catheterType || null, cathSize || null, insertedDate || null, changeDate || null, batchNo || null, urineColour, urineAmountMl || null, JSON.stringify(complications || []), JSON.stringify(actions || []), notes, staffId])
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: 'Failed' }) }
})

// ─── END OF LIFE CARE PLAN ───────────────────────────────────────────────────

router.get('/eol/:suId', async (req, res) => {
  try {
    const plans = await query<any>('SELECT * FROM eol_care_plans WHERE su_id = $1', [req.params.suId])
    const rounding = await query<any>(`
      SELECT r.*, s.first_name || ' ' || s.last_name AS staff_name
      FROM eol_comfort_rounding r
      LEFT JOIN staff s ON s.id = r.staff_id
      WHERE r.su_id = $1
      ORDER BY r.recorded_at DESC LIMIT 30
    `, [req.params.suId])
    res.json({ success: true, data: { plan: plans[0] || null, rounding } })
  } catch (e) { res.status(500).json({ error: 'Failed' }) }
})

router.post('/eol', async (req, res) => {
  const { suId, homeId, dnarStatus, respectForm, preferredPlace, comfortMeasures, symptomsToManage, spiritualNeeds, culturalNeeds, familyContact, familyInformed, gp, syringeDriver, lastDaysCommenced, lastDaysDate, additionalWishes, notes, updatedBy } = req.body
  try {
    await query(`
      INSERT INTO eol_care_plans (su_id, home_id, dnar_status, respect_form, preferred_place, comfort_measures, symptoms_to_manage, spiritual_needs, cultural_needs, family_contact, family_informed, gp, syringe_driver, last_days_commenced, last_days_date, additional_wishes, notes, updated_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      ON CONFLICT (su_id) DO UPDATE SET
        dnar_status=$3, respect_form=$4, preferred_place=$5, comfort_measures=$6, symptoms_to_manage=$7,
        spiritual_needs=$8, cultural_needs=$9, family_contact=$10, family_informed=$11, gp=$12,
        syringe_driver=$13, last_days_commenced=$14, last_days_date=$15, additional_wishes=$16,
        notes=$17, updated_by=$18, updated_at=NOW()
    `, [suId, homeId, dnarStatus || 'Unknown', respectForm || false, preferredPlace, JSON.stringify(comfortMeasures || []), JSON.stringify(symptomsToManage || []), spiritualNeeds, culturalNeeds, familyContact, familyInformed || false, gp, syringeDriver || false, lastDaysCommenced || false, lastDaysDate || null, additionalWishes, notes, updatedBy])
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: 'Failed' }) }
})

router.post('/eol-rounding', async (req, res) => {
  const { suId, homeId, symptoms, notes, staffId } = req.body
  try {
    await query(`
      INSERT INTO eol_comfort_rounding (su_id, home_id, symptoms, notes, staff_id)
      VALUES ($1,$2,$3,$4,$5)
    `, [suId, homeId, JSON.stringify(symptoms || []), notes, staffId])
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: 'Failed' }) }
})

// ─── GP / REFERRAL TRACKER ───────────────────────────────────────────────────

router.get('/gp-referrals/:suId', async (req, res) => {
  try {
    const rows = await query<any>(`
      SELECT r.*, s.first_name || ' ' || s.last_name AS staff_name
      FROM gp_referrals r
      LEFT JOIN staff s ON s.id = r.staff_id
      WHERE r.su_id = $1
      ORDER BY r.referred_at DESC LIMIT 100
    `, [req.params.suId])
    res.json({ success: true, data: rows })
  } catch (e) { res.status(500).json({ error: 'Failed' }) }
})

router.post('/gp-referrals', async (req, res) => {
  const { suId, homeId, referralType, urgency, reason, referredTo, appointmentDate, notes, staffId } = req.body
  try {
    await query(`
      INSERT INTO gp_referrals (su_id, home_id, referral_type, urgency, reason, referred_to, appointment_date, notes, staff_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [suId, homeId, referralType, urgency || 'Routine', reason, referredTo, appointmentDate || null, notes, staffId])
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: 'Failed' }) }
})

router.patch('/gp-referrals/:id', async (req, res) => {
  const { status, outcome } = req.body
  try {
    await query(`UPDATE gp_referrals SET status=$1, outcome=$2, updated_at=NOW() WHERE id=$3`, [status, outcome, req.params.id])
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: 'Failed' }) }
})

export default router
