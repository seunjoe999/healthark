import { Router, Request, Response, NextFunction } from 'express';
import { param } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';

const router = Router();
router.use(authenticate);

// Matches a canonical UUID. Used to guard /:id handlers so that a non-UUID path
// segment (e.g. a sub-route like "news2" that fell through) returns 404 instead
// of a 500 from Postgres' "invalid input syntax for type uuid".
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── DB init ───────────────────────────────────────────────────────
const initTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS assessments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      home_id UUID,
      template_key TEXT NOT NULL,
      category TEXT NOT NULL,
      subject_id UUID,
      subject_name TEXT,
      conducted_by UUID,
      auditor_name TEXT,
      answers JSONB NOT NULL DEFAULT '{}',
      total_score INTEGER DEFAULT 0,
      max_score INTEGER DEFAULT 0,
      score_pct NUMERIC(5,2) DEFAULT 0,
      risk_level TEXT,
      actions_identified TEXT,
      actions_outcome TEXT,
      actions_completed_date DATE,
      next_review_date DATE,
      notes TEXT,
      assessment_date DATE DEFAULT CURRENT_DATE,
      status TEXT DEFAULT 'completed',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  // Management/Assessor and Staff Member sign-off — added to every assessment
  // template's bottom, captured as a drawn signature (data URL) via the shared
  // SignaturePad component.
  await query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS assessor_signature TEXT`);
  await query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS staff_signature TEXT`);
};
initTable().catch(() => {});

// ── Template definitions ─────────────────────────────────────────
type QType = 'yes_no' | 'text' | 'scale' | 'multiselect' | 'select';
interface Q { id: string; text: string; type: QType; scored: boolean; helpText?: string; options?: string[]; detail?: boolean }
interface Section { id: string; title: string; questions: Q[] }
interface Template {
  key: string; name: string; category: 'service_user' | 'staff';
  description?: string; reviewFrequency?: string;
  sections: Section[];
  burnoutScoring?: boolean;
  outcomeOptions?: string[];
}

const yn = (id: string, text: string, help?: string): Q => ({ id, text, type: 'yes_no', scored: true, helpText: help });
// Same as yn() but also renders a "details / notes" box under the Yes/No/N/A
// buttons — for templates (e.g. Medication Competency) where every question
// needs supporting evidence, not just a tick.
const ynBox = (id: string, text: string, help?: string): Q => ({ id, text, type: 'yes_no', scored: true, helpText: help, detail: true });
const txt = (id: string, text: string): Q => ({ id, text, type: 'text', scored: false });
const scale = (id: string, text: string): Q => ({ id, text, type: 'scale', scored: true, options: ['Not at All = 0', 'Rarely = 1', 'Sometimes = 2', 'Often = 3', 'Very Often = 4'] });
const sel = (id: string, text: string, options: string[]): Q => ({ id, text, type: 'select', scored: false, options });
const multi = (id: string, text: string, options: string[]): Q => ({ id, text, type: 'multiselect', scored: false, options });

const TEMPLATES: Template[] = [

  // ═══════════════════════════════════════════════════════════════
  // SERVICE USER ASSESSMENTS
  // ═══════════════════════════════════════════════════════════════

  {
    key: 'care_plan_audit', name: 'Care Plan Audit', category: 'service_user',
    description: 'Audit of care plan completeness, person-centredness, and compliance.',
    reviewFrequency: 'Every six months or 26 weeks',
    sections: [{
      id: 's1', title: 'Care Plan Compliance',
      questions: [
        yn('q1', 'Is the service user\'s NHS number present on their profile?'),
        yn('q2', 'Is the service user\'s address and phone number up to date?'),
        yn('q3', 'Is the Date of Birth of the service user present on their profile?'),
        yn('q4', 'The date that the Care Plan and Risk Assessment was completed is recorded?'),
        yn('q5', 'Is the language used in the Care Plan and Risk Assessment appropriate to the service user\'s communication needs?'),
        yn('q6', 'The goals set clearly demonstrate what the service user hopes to achieve?'),
        yn('q7', 'Are actions recorded for each goal, clearly outlining the key steps that need to be completed by staff to achieve the goals?'),
        yn('q8', 'Are what Medications are prescribed for outlined on the medication care plan?'),
        yn('q9', 'A date or timeframe has been documented for when the whole care plan needs to be reviewed?'),
        yn('q10', 'Does the care plan provide an overview of the current context / current situation of the service user?'),
        yn('q11', 'Do the Care Plans describe any health conditions?'),
        yn('q12', 'Is there evidence, where appropriate, that service users, family members, and relevant professionals have been actively engaged to support the service user in achieving their goals?'),
        yn('q13', 'Is there any evidence that the care plan is Individualised and service user centred?'),
        yn('q14', 'Are there evidence that a copy of the care plan was provided or offered to the service user?'),
        yn('q15', 'The date that the Care Plan and Risk Assessment were reviewed is recorded?'),
        yn('q16', 'Is the Care Plan signed by the service user or their representative, unless there is a valid reason?'),
        yn('q17', 'Are Care Plan and Risk Assessment written in the first person (I) unless the service user\'s wishes them to be written in the third person?'),
        yn('q18', 'Are the Care Plan and Risk Assessment reviewed on a monthly basis, and additionally when there are changes in needs or following an incident?'),
        yn('q19', 'Are Care Plans signed by staff to show that they have read and understood them?'),
        yn('q20', 'Do Care Plans describe any health conditions and how they affect the service user?'),
        yn('q21', 'Are Risk Assessments in place for each service user\'s risks?'),
        txt('q22', 'Actions Identified'),
        txt('q23', 'Outcome of Action/s Identified'),
      ]
    }]
  },

  {
    key: 'medication_audit', name: 'Medication Audit', category: 'service_user',
    description: 'Audit of medication management, stock control, and MAR compliance.',
    reviewFrequency: 'Every six months or 26 weeks',
    sections: [{
      id: 's1', title: 'Medication Audit',
      questions: [
        sel('q0', 'Type of Audit', ['Stock Audit', 'Administration Audit', 'Full Audit']),
        yn('q1', 'Have all discontinued medications been removed from MAR/System, and stocks returned to the pharmacy?'),
        yn('q2', 'Are the quantities of residents\' medication checked prior to ordering to ensure appropriate stock holding of medication?'),
        yn('q3', 'Are all Opened Medications dated and liquids with use by date?'),
        yn('q4', 'Are there any gaps on the countdown sheet? If so what date is missing and action taken?'),
        yn('q5', 'Does the list of current stock medications accurately reflect the list of medications on the Care plan and MAR?'),
        yn('q6', 'Has medication stock count been completed on each shift?'),
        yn('q7', 'Are there any Mistakes/Counting errors on the Count Down Sheet?'),
        yn('q8', 'Does the number of tablets left match the balance expected?'),
        yn('q9', 'Is there at least 7 days medication supply?'),
        yn('q10', 'Are regular refusals of medicines raised with the GP, Social worker and Management?'),
        yn('q11', 'Has the manager been informed if PRN medicines are being given regularly?'),
        txt('q12', 'Has the GP reviewed all the medication in the last 6 months? Enter GP last review date.'),
        txt('q13', 'List identified issues/concerns'),
        sel('q14', 'Have identified issues been escalated?', ['Yes', 'No', 'N/A']),
        txt('q15', 'If yes, who did you report to?'),
        txt('q16', 'Management Follow Up On Escalation'),
      ]
    }]
  },

  {
    key: 'falls_prevention_audit', name: 'Falls Prevention Audit', category: 'service_user',
    description: 'Comprehensive audit of falls risk assessment, prevention strategies, and post-fall management.',
    reviewFrequency: 'Every six months or 26 weeks',
    sections: [
      {
        id: 's1', title: 'Section 1 – Risk Assessment',
        questions: [
          yn('q1', 'Is a falls risk assessment done on admission?'),
          yn('q2', 'Is the assessment reviewed regularly and after a fall?'),
          yn('q3', 'Is the risk score clearly documented?'),
        ]
      },
      {
        id: 's2', title: 'Section 2 – Care Planning',
        questions: [
          yn('q4', 'Do patients at risk have a falls prevention care plan?'),
          yn('q5', 'Does the plan include mobility support, equipment, and supervision needs?'),
          yn('q6', 'Is the plan updated when risk changes?'),
        ]
      },
      {
        id: 's3', title: 'Section 3 – Environment & Equipment',
        questions: [
          yn('q7', 'Are bed and chair heights appropriate for the patient?'),
          yn('q8', 'Are call bells within reach?'),
          yn('q9', 'Are walking aids available and in good condition?'),
          yn('q10', 'Are floors free from clutter, spills, and trip hazards?'),
          yn('q11', 'Is lighting adequate, especially at night?'),
        ]
      },
      {
        id: 's4', title: 'Section 4 – Observation & Supervision',
        questions: [
          yn('q12', 'Are high-risk patients observed closely?'),
          yn('q13', 'Is increased supervision in place when needed (e.g., toileting, mobilising)?'),
          yn('q14', 'Are bedrails used safely and only when appropriate?'),
        ]
      },
      {
        id: 's5', title: 'Section 5 – Mobility & Aids',
        questions: [
          yn('q15', 'Are patients encouraged to mobilise safely?'),
          yn('q16', 'Are footwear and clothing safe and well-fitting?'),
          yn('q17', 'Are physiotherapy or occupational therapy referrals made when needed?'),
        ]
      },
      {
        id: 's6', title: 'Section 6 – Post-Fall Management',
        questions: [
          yn('q18', 'Is every fall documented clearly in the notes?'),
          yn('q19', 'Is a post-fall assessment carried out (injuries, causes, observations)?'),
          yn('q20', 'Is the care plan updated after a fall?'),
          yn('q21', 'Is the fall reported through the incident reporting system?'),
          yn('q22', 'Are lessons from falls shared with staff?'),
        ]
      },
      {
        id: 's7', title: 'Section 7 – Patient & Carer Involvement',
        questions: [
          yn('q23', 'Are patients and carers given advice on falls prevention?'),
          yn('q24', 'Are they involved in decision-making about mobility and safety?'),
        ]
      },
      {
        id: 's8', title: 'Section 8 – Staff Training & Governance',
        questions: [
          yn('q25', 'Are staff trained in falls risk assessment and prevention?'),
          yn('q26', 'Are staff trained in safe moving and handling?'),
          yn('q27', 'Are audit results shared with managers/committees?'),
          yn('q28', 'Are action plans made after audits?'),
          txt('q29', 'Action Identified & Action Plan'),
        ]
      }
    ]
  },

  {
    key: 'infection_control_audit', name: 'Infection Control Audit', category: 'service_user',
    description: 'Audit of infection prevention and control in accordance with Health and Social Care Act 2008 and NHS England standards.',
    reviewFrequency: 'Every six months or 26 weeks',
    sections: [
      {
        id: 's1', title: 'Environment – Surfaces & Structure',
        questions: [
          yn('q1', 'Are all high and low surfaces in good condition, free from dust (e.g. curtain tracks, shelving, skirting boards, windowsills)?'),
          yn('q2', 'Are walls and ceilings in good condition, free from dust and cobwebs?'),
          yn('q3', 'Are tiles and grouting in good condition, clean and free from mould?'),
          yn('q4', 'Are light fittings and shades clean, free from dust, cobwebs, and insects?'),
          yn('q5', 'Is the floor covering impervious, clean, and dry in all areas?'),
          yn('q6', 'Are bath/shower/wet/en-suite rooms clean with slip-resistant flooring and dry?'),
          yn('q7', 'Are floors in good condition, clean and free from dust, including all floor corners and behind doors?'),
          yn('q8', 'Are curtains/blinds in good condition and clean?'),
        ]
      },
      {
        id: 's2', title: 'Furniture & Fittings',
        questions: [
          yn('q9', 'Is furniture, including chairs, in good condition and clean (check under cushions and underside of tables)?'),
          yn('q10', 'Are fixtures and fittings (sanitary ware, extractor fans, radiators) in good condition and clean?'),
          yn('q11', 'Is there a bin available? Is the bin and bin lid in good condition and clean inside and out?'),
          yn('q12', 'Is kitchen area free from inappropriate items and clutter? Are food storage areas clean, tidy, and pest-free?'),
        ]
      },
      {
        id: 's3', title: 'Hand Hygiene & PPE',
        questions: [
          yn('q13', 'Is there hand-washing soap and tissue in the staff toilet?'),
          yn('q14', 'Are paper towels available in good condition and clean?'),
          yn('q15', 'Is PPE available for staff use?'),
          yn('q16', 'Access to the handwash sink is clear and clean?'),
        ]
      },
      {
        id: 's4', title: 'Bathing & Laundry Equipment',
        questions: [
          yn('q17', 'Shower chair, shower head, bath mate, bath hoist in good condition, clean and free from lime scale and stains?'),
          yn('q18', 'Are shower curtains clean, free from mould, and included on the cleaning schedule?'),
          yn('q19', 'Are cleaning products available for staff to clean communal baths, showers, and sinks after each use?'),
          yn('q20', 'Is the Washing Machine in good condition and clean (free from dirt, dust, mould, or congealed washing powder)?'),
          yn('q21', 'Is there a dirty-to-clean workflow process in place for management of clean and dirty laundry?'),
        ]
      },
      {
        id: 's5', title: 'Kitchen & Storage',
        questions: [
          yn('q22', 'Are kitchen worktops and cupboards clean, hygienic, and in good condition?'),
          yn('q23', 'Is the Gas Hob clean and in good working order and free from grease?'),
          yn('q24', 'Are cupboards, cutlery drawers, and containers clean and free from dust, dirt, and food debris?'),
          yn('q25', 'Are condiment containers in good condition and clean?'),
          yn('q26', 'Are all cleaning products stored in a designated lockable area?'),
          yn('q27', 'Are the mopping buckets clean and free from dirt/grime?'),
        ]
      },
      {
        id: 's6', title: 'Odour & General Cleanliness',
        questions: [
          yn('q28', 'Is the room free from offensive odour?'),
          yn('q29', 'Is the commode clean and disinfected daily?'),
          txt('q30', 'Action Plan'),
          txt('q31', 'Outcome of Action Plan'),
        ]
      }
    ]
  },

  {
    key: 'activity_audit', name: 'Activity Audit', category: 'service_user',
    description: 'Audit of activity provision, engagement, and person-centred activities.',
    reviewFrequency: 'Every six months or 26 weeks',
    sections: [{
      id: 's1', title: 'Activity Compliance',
      questions: [
        yn('q1', 'Is there an activity programme/schedule in place?'),
        yn('q2', 'Are activities personalised to individual service user preferences and interests?'),
        yn('q3', 'Are activity preferences documented in the service user\'s care plan?'),
        yn('q4', 'Are both group and individual activities offered?'),
        yn('q5', 'Is there evidence of social engagement and community inclusion?'),
        yn('q6', 'Are activities accessible to service users with physical or cognitive limitations?'),
        yn('q7', 'Is there evidence of meaningful occupation during the day?'),
        yn('q8', 'Are activity records completed and up to date?'),
        yn('q9', 'Are service users\' views on activities sought and acted upon?'),
        yn('q10', 'Are family/friends involved in activity planning where appropriate?'),
        yn('q11', 'Are external activity providers/volunteers utilised?'),
        yn('q12', 'Are outcomes of activities documented (e.g. wellbeing, engagement)?'),
        txt('q13', 'Actions Identified'),
        txt('q14', 'Outcome of Actions'),
      ]
    }]
  },

  {
    key: 'documentation_audit_su', name: 'Documentation Audit', category: 'service_user',
    description: 'Audit of daily records, documentation quality, and record-keeping standards.',
    reviewFrequency: 'Every six months or 26 weeks',
    sections: [{
      id: 's1', title: 'Documentation Quality',
      questions: [
        yn('q1', 'Are daily records completed for every shift?'),
        yn('q2', 'Are records written clearly, factually, and in a professional manner?'),
        yn('q3', 'Are records signed and dated by the care worker?'),
        yn('q4', 'Are records person-centred and written using appropriate language?'),
        yn('q5', 'Do records reflect the tasks outlined in the care plan?'),
        yn('q6', 'Are fluid and food intake records completed accurately?'),
        yn('q7', 'Are body map / skin integrity records completed when required?'),
        yn('q8', 'Are incident/accident forms completed when relevant events occur?'),
        yn('q9', 'Are PRN medication records accurately completed?'),
        yn('q10', 'Are handover notes completed at the end of each shift?'),
        yn('q11', 'Are records free from personal opinion or inappropriate language?'),
        yn('q12', 'Are records stored securely in line with GDPR/data protection?'),
        txt('q13', 'Actions Identified'),
        txt('q14', 'Outcome of Actions'),
      ]
    }]
  },

  {
    key: 'equipment_audit', name: 'Equipment Audit', category: 'service_user',
    description: 'Audit of all equipment condition, safety, and servicing compliance.',
    reviewFrequency: 'Every six months or 26 weeks',
    sections: [{
      id: 's1', title: 'Equipment Safety & Compliance',
      questions: [
        yn('q1', 'Is all equipment in the property in good working order?'),
        yn('q2', 'Is all equipment within its service/maintenance date?'),
        yn('q3', 'Are hoist slings inspected and in good condition?'),
        yn('q4', 'Is the hoist/moving and handling equipment safe and tested?'),
        yn('q5', 'Are wheelchair and mobility aids in good condition?'),
        yn('q6', 'Are pressure care mattresses/cushions in use and appropriate?'),
        yn('q7', 'Is specialist equipment documented in the care plan with usage guidance?'),
        yn('q8', 'Are staff trained on all equipment in use?'),
        yn('q9', 'Is there a record of equipment checks and servicing?'),
        yn('q10', 'Are faulty equipment items reported and removed from use?'),
        yn('q11', 'Is emergency equipment (e.g. first aid kit, defibrillator) available and checked?'),
        txt('q12', 'Actions Identified'),
        txt('q13', 'Outcome of Actions'),
      ]
    }]
  },

  {
    key: 'fire_safety_audit', name: 'Fire Safety Audit', category: 'service_user',
    description: 'Audit of fire safety measures, equipment, and emergency procedures.',
    reviewFrequency: 'Every six months or 26 weeks',
    sections: [
      {
        id: 's1', title: 'Fire Prevention',
        questions: [
          yn('q1', 'Are fire exits clear and unobstructed?'),
          yn('q2', 'Are fire doors self-closing and in good condition?'),
          yn('q3', 'Is fire safety equipment (extinguishers, blankets) present and within service date?'),
          yn('q4', 'Are smoke alarms present and tested regularly?'),
          yn('q5', 'Is there a current fire risk assessment in place?'),
        ]
      },
      {
        id: 's2', title: 'Emergency Procedures',
        questions: [
          yn('q6', 'Is the Personal Emergency Evacuation Plan (PEEP) in place for the service user?'),
          yn('q7', 'Are evacuation routes clearly marked?'),
          yn('q8', 'Are fire drills conducted at appropriate intervals?'),
          yn('q9', 'Are fire drill records maintained?'),
          yn('q10', 'Are staff trained in fire safety and evacuation procedures?'),
        ]
      },
      {
        id: 's3', title: 'Electrical & General Safety',
        questions: [
          yn('q11', 'Is electrical equipment PAT tested and within date?'),
          yn('q12', 'Are there no trailing cables or overloaded sockets?'),
          yn('q13', 'Are flammable materials stored safely?'),
          yn('q14', 'Is the fire assembly point known to staff?'),
          txt('q15', 'Actions Identified'),
          txt('q16', 'Outcome of Actions'),
        ]
      }
    ]
  },

  {
    key: 'fridge_temperature_audit', name: 'Fridge Temperature Audit', category: 'service_user',
    description: 'Audit of fridge and medication storage temperatures.',
    reviewFrequency: 'Every six months or 26 weeks',
    sections: [{
      id: 's1', title: 'Temperature Monitoring',
      questions: [
        yn('q1', 'Is the medication fridge temperature checked and recorded daily?'),
        yn('q2', 'Is the fridge temperature within the correct range (2–8°C)?'),
        yn('q3', 'Is a temperature log maintained and up to date?'),
        yn('q4', 'Are any out-of-range readings escalated and actioned?'),
        yn('q5', 'Is the food fridge temperature within the safe range (0–5°C)?'),
        yn('q6', 'Is food fridge temperature recorded daily?'),
        yn('q7', 'Are fridges clean and free from expired items?'),
        yn('q8', 'Are raw and cooked foods stored separately?'),
        yn('q9', 'Are medication fridge items within expiry dates?'),
        yn('q10', 'Is there a process for managing power failure affecting temperature?'),
        txt('q11', 'Actions Identified'),
        txt('q12', 'Outcome of Actions'),
      ]
    }]
  },

  {
    key: 'health_safety_audit', name: 'Health & Safety Audit', category: 'service_user',
    description: 'Comprehensive health and safety compliance audit.',
    reviewFrequency: 'Every six months or 26 weeks',
    sections: [
      {
        id: 's1', title: 'Risk Assessment & Documentation',
        questions: [
          yn('q1', 'Are up-to-date risk assessments in place for the service user?'),
          yn('q2', 'Are COSHH assessments available for all hazardous substances used?'),
          yn('q3', 'Is there a current employer liability insurance certificate displayed?'),
          yn('q4', 'Are accident/incident records maintained and up to date?'),
        ]
      },
      {
        id: 's2', title: 'Environment Safety',
        questions: [
          yn('q5', 'Is the environment free from obvious trip and slip hazards?'),
          yn('q6', 'Is adequate lighting in all areas?'),
          yn('q7', 'Are staircases and steps safe with appropriate handrails?'),
          yn('q8', 'Is outdoor space safe and accessible for the service user?'),
          yn('q9', 'Are window restrictors in place where required?'),
        ]
      },
      {
        id: 's3', title: 'Staff Safety',
        questions: [
          yn('q10', 'Do staff have access to lone worker procedures?'),
          yn('q11', 'Is PPE readily available and used appropriately?'),
          yn('q12', 'Are staff trained in manual handling and moving and assisting?'),
          yn('q13', 'Are health and safety incidents reported and investigated?'),
          txt('q14', 'Actions Identified'),
          txt('q15', 'Outcome of Actions'),
        ]
      }
    ]
  },

  {
    key: 'incident_analysis_audit', name: 'Incident Analysis Audit', category: 'service_user',
    description: 'Audit of incident recording, analysis, and learning.',
    reviewFrequency: 'Every six months or 26 weeks',
    sections: [{
      id: 's1', title: 'Incident Analysis',
      questions: [
        yn('q1', 'Are all incidents recorded on the incident reporting system?'),
        yn('q2', 'Are incident reports completed fully and accurately?'),
        yn('q3', 'Are incidents reviewed by management within a reasonable timeframe?'),
        yn('q4', 'Is the root cause of incidents investigated?'),
        yn('q5', 'Are lessons learned shared with staff following incidents?'),
        yn('q6', 'Are care plans updated following incidents?'),
        yn('q7', 'Are risk assessments reviewed following significant incidents?'),
        yn('q8', 'Are trends in incidents identified and acted upon?'),
        yn('q9', 'Are notifiable incidents reported to CQC/regulatory bodies where required?'),
        yn('q10', 'Are families/next of kin informed of incidents in a timely manner?'),
        yn('q11', 'Is there evidence of continuous improvement following incident analysis?'),
        txt('q12', 'Actions Identified'),
        txt('q13', 'Outcome of Actions'),
      ]
    }]
  },

  {
    key: 'incident_accident_reporting_audit', name: 'Incident/Accident Reporting Audit', category: 'service_user',
    description: 'Audit of incident and accident reporting procedures and compliance.',
    reviewFrequency: 'Every six months or 26 weeks',
    sections: [{
      id: 's1', title: 'Reporting Standards',
      questions: [
        yn('q1', 'Are incident/accident forms completed on the day of the incident?'),
        yn('q2', 'Are reports signed by the member of staff who witnessed or discovered the incident?'),
        yn('q3', 'Is the incident description factual, detailed, and free from personal opinion?'),
        yn('q4', 'Are injuries documented including body part affected?'),
        yn('q5', 'Are immediate actions taken recorded on the form?'),
        yn('q6', 'Are external agencies contacted and recorded (e.g. ambulance, GP)?'),
        yn('q7', 'Is management notified of all incidents on the day?'),
        yn('q8', 'Are RIDDOR reportable incidents identified and reported?'),
        yn('q9', 'Are lessons learned and preventive actions documented?'),
        yn('q10', 'Are incident reports reviewed and signed off by management?'),
        txt('q11', 'Actions Identified'),
        txt('q12', 'Outcome of Actions'),
      ]
    }]
  },

  {
    key: 'mandatory_safety_audits', name: 'Mandatory Safety Audits', category: 'service_user',
    description: 'Audit covering all mandatory safety compliance requirements.',
    reviewFrequency: 'Every six months or 26 weeks',
    sections: [
      {
        id: 's1', title: 'Gas & Electrical Safety',
        questions: [
          yn('q1', 'Is the gas safety certificate current and within date?'),
          yn('q2', 'Is the electrical installation condition report (EICR) in date?'),
          yn('q3', 'Are all portable appliances PAT tested?'),
        ]
      },
      {
        id: 's2', title: 'Water Safety',
        questions: [
          yn('q4', 'Is there a current Legionella risk assessment?'),
          yn('q5', 'Are water temperature checks carried out and recorded?'),
        ]
      },
      {
        id: 's3', title: 'Fire & Emergency',
        questions: [
          yn('q6', 'Is the fire risk assessment current?'),
          yn('q7', 'Are fire extinguisher service records up to date?'),
          yn('q8', 'Are emergency lighting tests carried out and recorded?'),
          yn('q9', 'Is the fire alarm serviced annually?'),
        ]
      },
      {
        id: 's4', title: 'Equipment & Lifting',
        questions: [
          yn('q10', 'Are LOLER (lifting equipment) inspections current?'),
          yn('q11', 'Are hoist sling inspection records up to date?'),
          txt('q12', 'Actions Identified'),
          txt('q13', 'Outcome of Actions'),
        ]
      }
    ]
  },

  {
    key: 'mar_chart_audit', name: 'MAR Chart Record Audit', category: 'service_user',
    description: 'Audit of Medication Administration Record chart accuracy and compliance.',
    reviewFrequency: 'Every six months or 26 weeks',
    sections: [{
      id: 's1', title: 'MAR Chart Compliance',
      questions: [
        yn('q1', 'Is the service user\'s name correctly on all MAR charts?'),
        yn('q2', 'Are all prescribed medications listed on the current MAR?'),
        yn('q3', 'Are all MAR entries signed on the day of administration?'),
        yn('q4', 'Are there any unsigned/blank entries on the MAR without a valid code?'),
        yn('q5', 'Are refusal codes used correctly and reasons documented?'),
        yn('q6', 'Are PRN medications recorded correctly with reason and dose?'),
        yn('q7', 'Are controlled drug records accurately maintained?'),
        yn('q8', 'Is the MAR chart for the current cycle (no outdated charts in use)?'),
        yn('q9', 'Are all medication changes updated on the MAR promptly?'),
        yn('q10', 'Is the countdown sheet accurately completed?'),
        yn('q11', 'Are covert medication records in place where applicable?'),
        yn('q12', 'Are MAR charts filed securely after the cycle ends?'),
        txt('q13', 'Actions Identified'),
        txt('q14', 'Outcome of Actions'),
      ]
    }]
  },

  {
    key: 'medication_risk_assessment', name: 'Medication Risk Assessment', category: 'service_user',
    description: 'Assessment of risks associated with the service user\'s medication regime.',
    reviewFrequency: 'Every six months or 26 weeks',
    sections: [{
      id: 's1', title: 'Medication Risk Factors',
      questions: [
        yn('q1', 'Is the service user on 4 or more medications (polypharmacy risk)?'),
        yn('q2', 'Is the service user on any high-risk medications (anticoagulants, insulin, opioids)?'),
        yn('q3', 'Has the service user experienced any adverse drug reactions?'),
        yn('q4', 'Are there known drug interactions documented?'),
        yn('q5', 'Does the service user have swallowing difficulties that affect medication administration?'),
        yn('q6', 'Does the service user self-medicate? Is this risk-assessed?'),
        yn('q7', 'Are medications stored securely and at correct temperature?'),
        yn('q8', 'Is there a protocol for missed or refused medications?'),
        yn('q9', 'Has medication been reviewed by the GP in the last 6 months?'),
        yn('q10', 'Are any PRN medications prescribed and is there a protocol for use?'),
        txt('q11', 'Risk Summary and Management Plan'),
        txt('q12', 'Actions Identified'),
      ]
    }]
  },

  {
    key: 'nutrition_hydration_audit', name: 'Nutrition and Hydration Audit', category: 'service_user',
    description: 'Audit of nutritional care, fluid intake monitoring, and dietary support.',
    reviewFrequency: 'Every six months or 26 weeks',
    sections: [
      {
        id: 's1', title: 'Nutritional Assessment',
        questions: [
          yn('q1', 'Has a MUST (Malnutrition Universal Screening Tool) score been completed?'),
          yn('q2', 'Is the MUST score reviewed regularly and after any changes?'),
          yn('q3', 'Are dietary preferences and restrictions documented in the care plan?'),
          yn('q4', 'Are food intake records completed at every meal?'),
          yn('q5', 'Is there evidence of action taken when food intake is poor?'),
        ]
      },
      {
        id: 's2', title: 'Hydration Monitoring',
        questions: [
          yn('q6', 'Is a fluid intake target documented for the service user?'),
          yn('q7', 'Are fluid intake records completed throughout the day?'),
          yn('q8', 'Are staff aware of the minimum fluid intake requirement?'),
          yn('q9', 'Is action taken and documented when fluid intake is below target?'),
          yn('q10', 'Are signs of dehydration monitored and acted upon?'),
        ]
      },
      {
        id: 's3', title: 'Dietary Support',
        questions: [
          yn('q11', 'Is food presented appropriately for the service user\'s needs (texture modified, fortified)?'),
          yn('q12', 'Is assistance with eating provided where required?'),
          yn('q13', 'Is dietitian referral in place where clinically indicated?'),
          yn('q14', 'Are weight checks conducted at agreed intervals?'),
          txt('q15', 'Actions Identified'),
          txt('q16', 'Outcome of Actions'),
        ]
      }
    ]
  },

  {
    key: 'one_to_one_audit', name: 'One to One Audit for Managers', category: 'service_user',
    description: 'Manager audit of 1-to-1 engagement sessions with service users.',
    reviewFrequency: 'Every six months or 26 weeks',
    sections: [{
      id: 's1', title: '1-to-1 Session Quality',
      questions: [
        yn('q1', 'Are 1-to-1 sessions scheduled in the service user\'s care plan?'),
        yn('q2', 'Are 1-to-1 sessions carried out at the agreed frequency?'),
        yn('q3', 'Are records of 1-to-1 sessions completed and signed?'),
        yn('q4', 'Do 1-to-1 sessions address the service user\'s wellbeing and preferences?'),
        yn('q5', 'Are any concerns raised during 1-to-1 sessions acted upon?'),
        yn('q6', 'Are service users given the opportunity to give feedback on their care?'),
        yn('q7', 'Is the outcome of 1-to-1 sessions shared with the wider care team?'),
        yn('q8', 'Are 1-to-1 sessions person-centred and responsive to individual needs?'),
        txt('q9', 'Service User\'s Comments / Feedback'),
        txt('q10', 'Actions Identified'),
        txt('q11', 'Outcome of Actions'),
      ]
    }]
  },

  {
    key: 'premises_audit', name: 'Premises Audit', category: 'service_user',
    description: 'Audit of the condition, safety, and suitability of the premises.',
    reviewFrequency: 'Every six months or 26 weeks',
    sections: [
      {
        id: 's1', title: 'Building Condition',
        questions: [
          yn('q1', 'Is the external structure of the property in good repair?'),
          yn('q2', 'Are internal walls, ceilings, and floors in good condition?'),
          yn('q3', 'Are windows and doors in good working order and safe?'),
          yn('q4', 'Is the property free from damp and mould?'),
        ]
      },
      {
        id: 's2', title: 'Safety & Access',
        questions: [
          yn('q5', 'Is the property accessible for the service user\'s mobility needs?'),
          yn('q6', 'Are appropriate adaptations in place (grab rails, ramps, stair lift)?'),
          yn('q7', 'Is the garden/outdoor area safe and accessible?'),
          yn('q8', 'Is the property secure with appropriate door locks?'),
          yn('q9', 'Is a key safe available and key safe code documented securely?'),
        ]
      },
      {
        id: 's3', title: 'Utilities & Maintenance',
        questions: [
          yn('q10', 'Are heating systems working and adequate?'),
          yn('q11', 'Is hot water available at safe temperatures?'),
          yn('q12', 'Is there an up-to-date maintenance log?'),
          yn('q13', 'Are reported repairs actioned in a timely manner?'),
          txt('q14', 'Actions Identified'),
          txt('q15', 'Outcome of Actions'),
        ]
      }
    ]
  },

  {
    key: 'pressure_ulcer_audit', name: 'Pressure Ulcer / Skin Integrity Audit', category: 'service_user',
    description: 'Audit of pressure ulcer prevention, skin monitoring, and wound care.',
    reviewFrequency: 'Every six months or 26 weeks',
    sections: [
      {
        id: 's1', title: 'Risk Assessment',
        questions: [
          yn('q1', 'Has a pressure ulcer risk assessment been completed (e.g. Waterlow/Braden)?'),
          yn('q2', 'Is the risk score reviewed regularly and after any changes?'),
          yn('q3', 'Is the risk documented and communicated to all staff?'),
        ]
      },
      {
        id: 's2', title: 'Prevention Measures',
        questions: [
          yn('q4', 'Is a repositioning schedule in place for at-risk individuals?'),
          yn('q5', 'Is repositioning recorded at each turn?'),
          yn('q6', 'Are pressure-relieving aids in place and appropriate?'),
          yn('q7', 'Are skin inspections carried out at personal care?'),
          yn('q8', 'Is skin integrity documented on a body map?'),
        ]
      },
      {
        id: 's3', title: 'Wound Management',
        questions: [
          yn('q9', 'Are any existing pressure sores/wounds documented with a wound care plan?'),
          yn('q10', 'Is wound care carried out as per the plan?'),
          yn('q11', 'Are wound assessments recorded at each dressing change?'),
          yn('q12', 'Is there evidence of appropriate referral to tissue viability/district nurse?'),
          yn('q13', 'Are pressure ulcers reported through the incident reporting system?'),
          txt('q14', 'Actions Identified'),
          txt('q15', 'Outcome of Actions'),
        ]
      }
    ]
  },

  {
    key: 'safeguarding_audit_su', name: 'Safeguarding Audit', category: 'service_user',
    description: 'Audit of safeguarding practices, awareness, and compliance for service users.',
    reviewFrequency: 'Every six months or 26 weeks',
    sections: [{
      id: 's1', title: 'Safeguarding Compliance',
      questions: [
        yn('q1', 'Is the safeguarding policy accessible and up to date?'),
        yn('q2', 'Are all staff trained in safeguarding adults?'),
        yn('q3', 'Is the named safeguarding lead known to all staff?'),
        yn('q4', 'Are safeguarding concerns documented and reported promptly?'),
        yn('q5', 'Is there evidence that referrals to the local authority are made appropriately?'),
        yn('q6', 'Are the Mental Capacity Act and DoLS applied correctly?'),
        yn('q7', 'Are service users supported to understand their rights and how to raise concerns?'),
        yn('q8', 'Are safeguarding concerns reviewed and outcomes documented?'),
        yn('q9', 'Are lessons learned from safeguarding cases shared with staff?'),
        yn('q10', 'Is there a robust whistleblowing policy in place?'),
        txt('q11', 'Actions Identified'),
        txt('q12', 'Outcome of Actions'),
      ]
    }]
  },

  {
    key: 'su_self_medication_assessment', name: 'Service User Self-Medication Administration Assessment', category: 'service_user',
    description: 'Assessment of service user\'s ability and suitability to self-administer medications.',
    reviewFrequency: 'Every six months or 26 weeks',
    sections: [{
      id: 's1', title: 'Self-Medication Capability',
      questions: [
        yn('q1', 'Has the service user expressed a wish to self-medicate?'),
        yn('q2', 'Does the service user have mental capacity to make decisions about their medication?'),
        yn('q3', 'Is the service user able to identify their own medications?'),
        yn('q4', 'Does the service user understand their medication doses and timings?'),
        yn('q5', 'Can the service user physically manage their medication (e.g. open packaging, swallow tablets)?'),
        yn('q6', 'Is the service user able to store their medications safely?'),
        yn('q7', 'Has a risk assessment for self-medication been completed?'),
        yn('q8', 'Has the GP approved the service user\'s self-medication?'),
        yn('q9', 'Is there a review process in place for self-medication capability?'),
        txt('q10', 'Assessor Comments'),
        sel('q11', 'Outcome', ['Service user is suitable for self-medication', 'Service user is not suitable for self-medication', 'Partial support required – review in 4 weeks']),
        txt('q12', 'Actions Identified'),
      ]
    }]
  },

  // ═══════════════════════════════════════════════════════════════
  // STAFF ASSESSMENTS
  // ═══════════════════════════════════════════════════════════════

  {
    key: 'supervision', name: 'Supervision', category: 'staff',
    description: 'Regular 1-to-1 supervision session including health & wellbeing, performance, and burnout assessment.',
    burnoutScoring: true,
    sections: [
      {
        id: 's1', title: 'Session Details',
        questions: [
          txt('q0', 'Supervisor Name'),
          sel('q1', 'Location / Format', ['Face to Face', 'Teams / Video Call', 'Phone']),
          sel('q2', 'Have All Actions From The Previous Supervision Been Completed?', ['Yes', 'No', 'Partially']),
          txt('q3', 'Details of Previously Agreed Actions Completed'),
        ]
      },
      {
        id: 's2', title: 'Health & Wellbeing',
        questions: [
          txt('q3b', 'Potential Areas of Discussion: Feelings and Experiences (start of supervision and end of supervision); Annual Leave; Personal issues potentially impacting on work; Appointment; Lateness, Sickness (triggers for health and safety in job role)'),
          sel('q4', 'Have You Had Any Sickness Absence In The Previous 8 Weeks?', ['Yes', 'No']),
          txt('q5', 'If yes, please provide details and any support required'),
          txt('q6', 'Workload rating (1–10) and reason – how manageable is your current workload?'),
          txt('q7', 'Brief snapshot of your day-to-day activities and typical duties'),
        ]
      },
      {
        id: 's3', title: 'Personal Development Plan (PDP)',
        questions: [
          sel('q8', 'Have You Completed Your PDP Plan?', ['Yes', 'No', 'In Progress']),
          txt('q9', 'If Yes or In Progress, provide brief details of key achievements and outstanding actions'),
        ]
      },
      {
        id: 's4', title: 'Values, Knowledge & Safeguarding',
        questions: [
          txt('q10', 'What are the KEY VALUES that guide our organisation, and how do you apply them in your everyday work?'),
          txt('q11', 'What Policy have you read and how do you apply this to your day to day job?'),
          txt('q12', 'What Does Safeguarding Mean To You? What Steps Would You Take, If You Discover A Safeguarding Concern? (Please tweak the safeguarding question on every supervision)'),
          txt('q13', 'Who Is The Safeguarding Lead For Comprehensive Care?'),
          txt('q14', 'In what ways do you help ensure our mission is genuinely reflected in the experiences of our service users?'),
          txt('q15', 'What steps do you take to develop a trusting and therapeutic relationship with the service users you support?'),
        ]
      },
      {
        id: 's5', title: 'Support & Feedback',
        questions: [
          sel('q16', 'Do You Feel Supported By Your Team Leader or Supervisor?', ['Yes', 'No', 'Partially']),
          txt('q17', 'Please provide feedback on the level of support you receive from your Supervisor/Team Leader'),
          txt('q18', 'Feedback from Supervisor on areas of strength and improvement'),
          sel('q19', 'Would Staff Require Any Additional Support?', ['Yes', 'No']),
          txt('q20', 'Agreed Action Plan for Next Supervision'),
        ]
      },
      {
        id: 's6', title: 'Burnout Assessment',
        questions: [
          scale('b1', 'I feel run down and drained of physical or emotional energy.'),
          scale('b2', 'I have negative thoughts about my job.'),
          scale('b3', 'I am easily irritated by small problems or by my co-workers and team.'),
          scale('b4', 'I feel misunderstood or unappreciated by my co-workers.'),
          scale('b5', 'I feel that I have no one to talk to.'),
          scale('b6', 'I feel under an unpleasant level of pressure to succeed.'),
          scale('b7', 'I feel that I am not getting what I want out of my job.'),
          scale('b8', 'I feel that there is more work to do than I practically have the ability to do.'),
        ]
      },
      {
        id: 's7', title: 'Next Steps',
        questions: [
          txt('q21', 'Date of Next Supervision'),
          txt('q22', 'Time of Next Supervision'),
          sel('q23', 'Have Any Identified Actions Been Escalated To Management?', ['Yes', 'No', 'N/A']),
        ]
      }
    ]
  },

  {
    key: 'staff_appraisal', name: 'Staff Appraisal', category: 'staff',
    description: 'Annual appraisal covering performance, development goals, and career aspirations.',
    sections: [{
      id: 's1', title: 'Annual Appraisal',
      questions: [
        txt('q0', 'Assessor\'s Name'),
        sel('q1', 'Location / Format', ['Face to Face', 'Teams / Video Call']),
        txt('q2', 'How are you?'),
        txt('q3', 'How would you describe your performance so far?'),
        txt('q4', 'What particular strengths have you demonstrated?'),
        txt('q5', 'What areas do you need to improve/develop to improve your effectiveness?'),
        txt('q6', 'What training and development do you need to address these?'),
        txt('q7', 'What personal development and work objectives do you wish to set for the next year?'),
        txt('q8', 'Please list your objectives for the last year and comment on the extent to which you have met them.'),
        txt('q9', 'In which direction do you wish your role/career to develop?'),
        txt('q10', 'Are there any other issues you wish to discuss about yourself?'),
        txt('q11', 'Are there any other issues you wish to discuss about the care service?'),
        txt('q12', 'Are there any other issues you wish to discuss about anything else?'),
      ]
    }]
  },

  {
    key: 'spot_check', name: 'Spot Check', category: 'staff',
    description: 'Unannounced spot check of care staff performance during a shift.',
    sections: [
      {
        id: 's1', title: 'Care Delivery',
        questions: [
          txt('q0', 'Client Name'),
          txt('q0b', 'Time Assessed'),
          txt('q0c', 'Assessed By'),
          txt('q0d', 'Assessor\'s Role'),
          sel('q1', 'Did the worker arrive at the correct time of shift?', ['Yes', 'No', 'N/A']),
          sel('q2', 'Personal Care / Support Given', ['Yes', 'No', 'N/A']),
          sel('q3', 'Moving and Assisting Completed When Due?', ['Yes', 'No', 'N/A']),
          sel('q4', 'Nutritional Intake Completed?', ['Yes', 'No', 'N/A']),
          txt('q5', 'Notes / Observations'),
          sel('q6', 'Did Care Staff handle personal possessions of the service user with care and respect?', ['Yes', 'No', 'N/A']),
          txt('q7', 'Comments from above questions'),
        ]
      },
      {
        id: 's2', title: 'Professional Standards',
        questions: [
          yn('q8', 'Did the care assistant wear correct uniform and ID?'),
          yn('q9', 'Is the overall appearance of the care assistant acceptable?'),
          yn('q10', 'Did the care assistant adhere to H&S guidelines?'),
          yn('q11', 'Did the care assistant adhere to food safety guidelines?'),
          yn('q12', 'Did the care assistant adhere to infection control guidelines?'),
          yn('q13', 'Did the care assistant treat the service user with respect and dignity?'),
          yn('q14', 'Was there effective communication between the care assistant and the resident?'),
          yn('q15', 'Were the tasks as listed in the Care & Support Plan completed in full?'),
        ]
      },
      {
        id: 's3', title: 'Environment',
        questions: [
          yn('q16', 'Does the arrangement of furniture allow freedom of movement and not create a fire risk?'),
          yn('q17', 'Is the temperature of the house conducive for the service user and staff?'),
          yn('q18', 'Is the environment habitable and clean, including toilet?'),
          yn('q19', 'Was the service user\'s bedroom clean and made?'),
        ]
      },
      {
        id: 's4', title: 'Client\'s View',
        questions: [
          sel('q20', 'Was the care provided appropriately?', ['Yes', 'No', 'N/A']),
          sel('q21', 'Was the employee courteous and treat you with dignity and respect?', ['Yes', 'No', 'N/A']),
          sel('q22', 'Was the employee wearing suitable clothing and using relevant PPE?', ['Yes', 'No', 'N/A']),
          sel('q23', 'Is there a full First Aid Kit in place for staff use?', ['Yes', 'No', 'N/A']),
          txt('q24', 'Did the service user express any concerns or opinions?'),
          txt('q25', 'Assessor\'s Report'),
        ]
      },
      {
        id: 's5', title: 'Office Use – Further Action',
        questions: [
          txt('q26', 'Immediate Actions Taken'),
          multi('q27', 'Further Action Required', ['Trigger formal supervision', 'Identify further training requirements', 'Feedback to care team any changes needed to package', 'Review of care plan with team', 'No further action required']),
        ]
      }
    ]
  },

  {
    key: 'medication_competency', name: 'Medication Competency Assessment', category: 'staff',
    description: 'Comprehensive medication administration competency assessment for care workers.',
    outcomeOptions: ['Competent To Administer Meds Unsupervised', 'Not Competent To Administer Meds At All', 'Requires Further Training But Can Administer Meds Under Supervision'],
    sections: [
      {
        id: 's1', title: 'Policy and Training',
        questions: [
          txt('q0a', 'Assessor\'s Name'),
          txt('q0b', 'Assessor\'s Role'),
          sel('q0c', 'Competency Outcome', ['Met', 'Unmet']),
          ynBox('q1', 'Has the care worker completed the required training in Medication Management (online Medication Training 1 and 2, and Practical Medication Training)?'),
          ynBox('q2', 'Can the Care Worker evidence they have read all the Medication Management Policies and can name them?'),
        ]
      },
      {
        id: 's2', title: 'Preparation and Infection Control',
        questions: [
          ynBox('q3', 'Did the Care Worker wash their hands before starting Medication Administration and take correct hygiene measures throughout?'),
          ynBox('q4', 'Did the Care Worker ensure everything was prepared correctly before starting (medication pots, spoons, water, beakers, etc.)?'),
          ynBox('q5', 'Did the Care Worker take measures to ensure they would not be interrupted or distracted to minimise medication error?'),
        ]
      },
      {
        id: 's3', title: 'Consent and Mental Capacity',
        questions: [
          ynBox('q6', 'Before preparing medication, did the Care Worker check the Care Plan to review the level of medication support required?'),
          ynBox('q7', 'Before preparing medication, did the Care Worker obtain the service user\'s consent?'),
          ynBox('q8', 'If consent wasn\'t obtained, was the Care Worker satisfied that correct procedures had been followed in the best interests of the service user?'),
        ]
      },
      {
        id: 's4', title: 'Selection and Preparation of Medication',
        questions: [
          ynBox('q9', 'Before selecting medication, did the Care Worker read the MAR correctly?'),
          ynBox('q10', 'Did the Care Worker check whether a dose had already been administered?'),
          ynBox('q11', 'If medication instructions are unclear, does the Care Worker take appropriate action to clarify directions?'),
          ynBox('q12', 'Does the Care Worker demonstrate knowledge of the 10 Rights of Medication?'),
          ynBox('q13', 'Was the medication selected checked against the correct MAR including checking the service user\'s name on the drug label?'),
          ynBox('q14', 'If MAR directions differed from the label, did the Care Worker take appropriate steps to clarify the correct dose?'),
          ynBox('q15', 'Was the correct medication and dose selected at the correct time with consideration given to timing in terms of food?'),
          ynBox('q16', 'Was medication prepared as per directions and information on the MAR?'),
          ynBox('q17', 'Did the Care Worker use the appropriate measuring device for liquid medication placed on a flat surface?'),
        ]
      },
      {
        id: 's5', title: 'Administration of Medication',
        questions: [
          ynBox('q18', 'Did the Care Worker check records to see how the service user prefers to take their medication?'),
          ynBox('q19', 'Did the Care Worker offer information, support, and reassurance throughout in a manner that promotes dignity and independence?'),
          ynBox('q20', 'Was the medicine administered correctly with a choice of drink offered where appropriate?'),
          ynBox('q21', 'Was the security of all medication maintained throughout (not left unattended)?'),
          ynBox('q22', 'Did the Care Worker visually witness the individual taking all their medication?'),
          ynBox('q23', 'If medication was not taken, was appropriate advice sought and reason for refusal documented?'),
          ynBox('q24', 'If medication was not taken, was it dealt with as outlined in the Administration of Medicines Policy (escalating to GP & Management)?'),
        ]
      },
      {
        id: 's6', title: 'Medicine Types Witnessed',
        questions: [
          multi('q25', 'Please tick the Medicine Types you have witnessed being administered', ['Tablets/Capsules', 'Liquids', 'Sachets/Powders', 'Inhaler Devices', 'Eye Drops', 'Ear Drops', 'Nose Drops', 'Nasal Sprays', 'Transdermal Patches', 'Creams/Ointments']),
          txt('q26', 'Other medicine types (state)'),
        ]
      },
      {
        id: 's7', title: 'Record Keeping',
        questions: [
          ynBox('q27', 'Did the Care Worker sign the MAR immediately after the medication was administered?'),
          ynBox('q28', 'If medication was not given, was the correct code entered on the MAR?'),
          ynBox('q29', 'If the medication is a controlled drug, did the Care Worker ask a trained colleague to witness and sign off?'),
          ynBox('q30', 'Does the care worker understand variable dose medication and how to administer and record it?'),
        ]
      },
      {
        id: 's8', title: 'Stock Control',
        questions: [
          ynBox('q31', 'Did the Care Worker check that there was sufficient stock for future rounds?'),
          ynBox('q32', 'If shortages were identified, did the Care Worker take appropriate action to replenish stock?'),
          ynBox('q33', 'Was all medication returned to secure storage once the round was completed?'),
        ]
      },
      {
        id: 's9', title: 'Ordering, Receipt, Disposal and Storage',
        questions: [
          ynBox('q34', 'Does the Care Worker know what to do when medication is received?'),
          ynBox('q35', 'Does the Care Worker know when to order medication in line with policy?'),
          ynBox('q36', 'Does the Care Worker understand what to do with out-of-date or no-longer-required medication?'),
          ynBox('q37', 'Does the Care Worker demonstrate understanding of correct storage requirements for medicines?'),
          ynBox('q38', 'Is the Care Worker aware of the correct temperature range for the medication fridge?'),
          ynBox('q39', 'If new medication is received, is stock put away so that older supplies are used first?'),
        ]
      },
      {
        id: 's10', title: 'Non-Prescribed Medication',
        questions: [
          ynBox('q40', 'Is the Care Worker aware of what action to take if a service user wants to take over-the-counter medication?'),
          ynBox('q41', 'Is the Care Worker aware of the correct procedure to follow when a service user presents with a minor ailment, including the use of agreed protocols, appropriate documentation, and escalation to senior staff or healthcare professionals where required?'),
          ynBox('q41b', 'If a non-prescribed medication was administered, was this from the original container as purchased, and was the dose offered within the directions given on the packaging?'),
          ynBox('q41c', 'If a non-prescribed medication was administered, did the Care Worker record this correctly on the MAR?'),
        ]
      },
      {
        id: 's11', title: 'Accessing Advice and Medication Error Management',
        questions: [
          ynBox('q41d', 'Does the Care Worker know who to contact if they need advice on medication?'),
          ynBox('q42', 'Does staff demonstrate knowledge of Medication Errors and their reporting process?'),
          ynBox('q43', 'Does staff demonstrate understanding of Covert Administration?'),
          ynBox('q44', 'Can staff demonstrate knowledge of Complementary Therapy and Homely Remedies (OTC or GSL)?'),
          ynBox('q45', 'Does staff demonstrate safe and accurate auditing of the medication process, including adherence to policies, correct documentation and identification of discrepancies?'),
          txt('q46', 'Other Information / Discussions held with the Care Worker'),
          txt('q47', 'Action Plan'),
        ]
      }
    ]
  },

  {
    key: 'clinical_supervision', name: 'Clinical Supervision', category: 'staff',
    description: 'Clinical supervision session for healthcare professionals.',
    sections: [{
      id: 's1', title: 'Clinical Supervision',
      questions: [
        txt('q1', 'Supervisor Name'),
        sel('q2', 'Format', ['Face to Face', 'Teams / Video Call', 'Phone']),
        txt('q3', 'Clinical issues/cases discussed'),
        txt('q4', 'Any professional development needs identified?'),
        txt('q5', 'Reflective practice – what went well in the previous period?'),
        txt('q6', 'What challenges were experienced?'),
        txt('q7', 'What learning has taken place?'),
        txt('q8', 'Are there any concerns regarding patient safety or clinical standards?'),
        txt('q9', 'Action Plan agreed'),
        txt('q10', 'Date of Next Clinical Supervision'),
      ]
    }]
  },

  {
    key: 'dignity_privacy_audit', name: 'Dignity & Privacy Audit', category: 'staff',
    description: 'Audit of staff adherence to dignity and privacy standards.',
    sections: [{
      id: 's1', title: 'Dignity & Privacy Standards',
      questions: [
        yn('q1', 'Did staff knock and wait before entering the service user\'s room?'),
        yn('q2', 'Was the service user\'s privacy maintained during personal care?'),
        yn('q3', 'Were curtains/blinds closed during personal care?'),
        yn('q4', 'Was the service user addressed by their preferred name?'),
        yn('q5', 'Was the service user given choice and control during care delivery?'),
        yn('q6', 'Did staff use appropriate, dignified language throughout?'),
        yn('q7', 'Was the service user\'s personal space and belongings treated with respect?'),
        yn('q8', 'Were personal matters discussed in a private setting?'),
        yn('q9', 'Did the service user appear comfortable and at ease with the staff member?'),
        yn('q10', 'Was the service user\'s information handled confidentially?'),
        txt('q11', 'Observations and Comments'),
        txt('q12', 'Actions Identified'),
      ]
    }]
  },

  {
    key: 'documentation_audit_staff', name: 'Documentation Audit', category: 'staff',
    description: 'Assessment of staff member\'s documentation quality and compliance.',
    sections: [{
      id: 's1', title: 'Documentation Quality Assessment',
      questions: [
        yn('q1', 'Are the staff member\'s daily records completed on each shift?'),
        yn('q2', 'Are records written clearly, factually, and professionally?'),
        yn('q3', 'Are records free from abbreviations, personal opinion, and inappropriate language?'),
        yn('q4', 'Are entries signed, dated, and timed correctly?'),
        yn('q5', 'Do records accurately reflect the care delivered?'),
        yn('q6', 'Are fluid and food records completed accurately?'),
        yn('q7', 'Are incidents documented on the same day they occur?'),
        yn('q8', 'Is the staff member aware of their GDPR obligations?'),
        yn('q9', 'Are electronic records completed within the required timeframe?'),
        txt('q10', 'Examples of Good Practice Noted'),
        txt('q11', 'Areas for Improvement'),
        txt('q12', 'Actions Identified'),
      ]
    }]
  },

  {
    key: 'employment_risk_assessment', name: 'Employment Risk Assessment', category: 'staff',
    description: 'Risk assessment for employment-related factors affecting staff safety and performance.',
    sections: [{
      id: 's1', title: 'Employment Risk Factors',
      questions: [
        yn('q1', 'Does the staff member have any health conditions that may affect their ability to carry out their role safely?'),
        yn('q2', 'Are reasonable adjustments in place where required?'),
        yn('q3', 'Is the staff member trained for all tasks required in their role?'),
        yn('q4', 'Is the staff member aware of lone working procedures?'),
        yn('q5', 'Are there any identified risks related to manual handling or physical demands of the role?'),
        yn('q6', 'Has the staff member received appropriate PPE training?'),
        yn('q7', 'Are there any known conflicts of interest or personal relationships that may pose a risk?'),
        txt('q8', 'Risk Summary'),
        txt('q9', 'Control Measures in Place'),
        txt('q10', 'Actions Required'),
      ]
    }]
  },

  {
    key: 'exit_interview', name: 'Exit Interview', category: 'staff',
    description: 'Structured exit interview to capture feedback from departing staff.',
    sections: [{
      id: 's1', title: 'Exit Interview Questions',
      questions: [
        txt('q1', 'What is your main reason for leaving?'),
        txt('q2', 'What did you enjoy most about working here?'),
        txt('q3', 'What could the organisation have done differently to retain you?'),
        txt('q4', 'How would you describe the quality of management and supervision you received?'),
        txt('q5', 'Did you feel your workload was manageable?'),
        txt('q6', 'Do you feel you received adequate training and development opportunities?'),
        txt('q7', 'How was your relationship with your colleagues?'),
        txt('q8', 'Did you feel comfortable raising concerns? Were concerns acted upon?'),
        txt('q9', 'Would you recommend this organisation as an employer to others?'),
        txt('q10', 'Is there anything else you would like to share?'),
      ]
    }]
  },

  {
    key: 'first_shift_feedback', name: 'First Shift Feedback Form', category: 'staff',
    description: 'Feedback form completed after a new staff member\'s first shift.',
    sections: [{
      id: 's1', title: 'First Shift Feedback',
      questions: [
        yn('q1', 'Was the new staff member punctual and appropriately dressed?'),
        yn('q2', 'Did the new staff member demonstrate a professional attitude?'),
        yn('q3', 'Did the new staff member follow instructions and guidance from experienced staff?'),
        yn('q4', 'Did the new staff member engage positively with service users?'),
        yn('q5', 'Were there any safeguarding concerns observed?'),
        yn('q6', 'Did the new staff member ask appropriate questions?'),
        yn('q7', 'Does the new staff member appear to have the right values for care work?'),
        txt('q8', 'What went well?'),
        txt('q9', 'Areas to improve or watch for'),
        sel('q10', 'Overall impression', ['Excellent – meets expectations', 'Good – minor areas to address', 'Satisfactory – close monitoring required', 'Unsatisfactory – discuss with management']),
        txt('q11', 'Buddy / Senior Carer Feedback'),
      ]
    }]
  },

  {
    key: 'new_staff_skill_assessment', name: 'New Staff Skill Assessment', category: 'staff',
    description: 'Initial skills assessment for newly recruited care staff.',
    sections: [
      {
        id: 's1', title: 'New Staff Skill Assessment',
        questions: [
          txt('q0a', 'Time'),
          txt('q0b', 'Assessor\'s Name'),
          txt('q1', 'Does staff have an understanding of their job role? Please provide detailed information.'),
          txt('q2', 'Does staff understand and demonstrate knowledge of the service user\'s Care Plan and Risk Assessment? Please provide detailed information.'),
          txt('q3', 'Does staff engage with the service user in a person-centred way? Please provide detailed information.'),
          txt('q4', 'Does staff demonstrate equality and diversity? Please provide detailed information.'),
          txt('q5', 'Does staff know how to apply their PBS training? Please provide detailed information.'),
          txt('q6', 'Does staff understand and be able to use de-escalation techniques in crisis? Please provide detailed information.'),
          txt('q7', 'Does staff understand the protocol to follow when there is an incident? Please provide detailed information.'),
          txt('q8', 'Is staff aware of the service user\'s risks? Please provide detailed information.'),
          txt('q9', 'Does staff demonstrate effective communication? Please provide detailed information.'),
          txt('q10', 'Does staff maintain the privacy and dignity of the service user? Please provide detailed information.'),
          txt('q11', 'Is staff competent in medication administration? Please provide detailed information.'),
          txt('q12', 'Does staff understand what a professional boundary is? Ask them to explain. Please provide detailed information.'),
          sel('q13', 'Are you happy for staff to be signed off?', ['Yes', 'No']),
          txt('q14', 'Assessor\'s Recommendation'),
        ]
      }
    ]
  },

  {
    key: 'peg_competency', name: 'PEG Competency Assessment', category: 'staff',
    description: 'Assessment of staff competency in percutaneous endoscopic gastrostomy (PEG) care.',
    sections: [
      {
        id: 's1', title: 'Knowledge',
        questions: [
          yn('q1', 'Can staff explain what a PEG is and its purpose?'),
          yn('q2', 'Can staff identify signs of PEG site infection or complications?'),
          yn('q3', 'Does staff understand the correct storage of PEG feeds?'),
          yn('q4', 'Can staff identify when to escalate concerns to a nurse or GP?'),
        ]
      },
      {
        id: 's2', title: 'Practical Skills',
        questions: [
          yn('q5', 'Did staff correctly wash hands and don PPE before procedure?'),
          yn('q6', 'Was the PEG site checked for redness, leakage, or discomfort?'),
          yn('q7', 'Was the feed set up correctly with the correct rate and volume?'),
          yn('q8', 'Was the equipment flushed correctly before and after the feed?'),
          yn('q9', 'Was the tube secured safely and comfortably?'),
          yn('q10', 'Was the procedure documented correctly?'),
          sel('q11', 'Overall Outcome', ['Competent – can carry out PEG care unsupervised', 'Competent with supervision', 'Not yet competent – further training required']),
          txt('q12', 'Actions / Training Plan'),
        ]
      }
    ]
  },

  {
    key: 'pip', name: 'Performance Improvement Plan (PIP)', category: 'staff',
    description: 'Formal performance improvement plan for staff not meeting required standards.',
    sections: [{
      id: 's1', title: 'Performance Improvement Plan',
      questions: [
        txt('q0a', 'Name Appraiser'),
        txt('q0b', 'Work Location'),
        multi('q1', 'Areas of Concerns', [
          'Inconsistent completion of daily tasks as required within the service.',
          'Failure to follow agreed task schedules and routines.',
          'Incomplete, inaccurate documentation.',
          'Lack of detail in daily notes and records.',
        ]),
        multi('q2', 'Expected Standards — the support worker is expected to:', [
          'Complete all assigned daily tasks.',
          'Follow each service user’s individual support plan.',
          'Ensure tasks are carried out to the required standard.',
          'Follow the daily task schedule for each shift.',
          'Check and complete all duties assigned for the shift.',
          'Ensure no tasks are missed before the end of the shift.',
          'Maintain accurate and clear records',
          'Complete documentation in a timely manner',
          'Ensure all entries are up to date',
          'Record all support provided to service users.',
          'Document service user engagement and participation.',
          'Report and record any concerns or changes.',
          'Encourage service users to be as independent as possible.',
          'Support service users in completing tasks themselves where appropriate.',
          'Ensure all responsibilities are still met while promoting independence.',
        ]),
        multi('q3', 'Improvement Actions & Targets — Daily Tasks', [
          'Review and follow the daily task list at the start of each shift.',
          'Ensure all assigned tasks are completed before the end of the shift.',
          'Communicate with team members if tasks cannot be completed.',
          'Target: 100% completion of assigned daily tasks, evidenced through spot checks and handover.',
          'Follow structured routines set out in support plans.',
          'Ensure consistency in supporting service users with agreed activities.',
          'Target: No missed or skipped tasks without clear justification.',
        ]),
        multi('q4', 'Improvement Actions & Targets — Documentation', [
          'Complete all daily notes before the end of each shift.',
          'Ensure records are clear, accurate, and person-centred.',
          'Include details of support provided, service user engagement, and any incidents or concerns.',
          'Use professional, factual, and respectful language.',
          'Avoid vague or incomplete entries.',
        ]),
        multi('q5', 'Support Provided', [
          'Supervision sessions (8 weekly)',
          'Guidance on completing documentation to required standards.',
          'Shadowing experienced staff where needed.',
          'Clear daily task checklists and expectations provided.',
          'Ongoing feedback from management.',
        ]),
        multi('q6', 'Progress Review', [
          'Weekly review of completed tasks and documentation.',
          'Midpoint review to assess progress.',
          'Final review at the end of the agreed period.',
        ]),
        txt('q7', 'Outcome'),
        txt('q8', 'Any Additional Information'),
      ]
    }]
  },

  {
    key: 'pregnancy_risk_assessment', name: 'Pregnancy Risk Assessment', category: 'staff',
    description: 'Risk assessment for pregnant, recently pregnant, or breastfeeding staff.',
    sections: [{
      id: 's1', title: 'Pregnancy Risk Assessment',
      questions: [
        txt('q1', 'Estimated due date / date of delivery'),
        yn('q2', 'Is the staff member currently pregnant, recently pregnant, or breastfeeding?'),
        yn('q3', 'Does the staff member\'s role involve manual handling or physical exertion?'),
        yn('q4', 'Is the staff member exposed to any biological or chemical hazards?'),
        yn('q5', 'Are there any lone working risks that need to be managed?'),
        yn('q6', 'Does the staff member work night shifts or irregular hours?'),
        yn('q7', 'Are reasonable adjustments in place to protect the staff member?'),
        txt('q8', 'Details of adjustments made / changes to working arrangements'),
        txt('q9', 'Any health concerns reported by the staff member'),
        txt('q10', 'Review date'),
      ]
    }]
  },

  {
    key: 'probation_meeting', name: 'Probation Meeting', category: 'staff',
    description: 'To review performance, conduct, attendance and overall suitability during the probationary period and determine the appropriate next steps in employment.',
    reviewFrequency: 'Every six months or 26 weeks',
    sections: [
      {
        id: 's1', title: 'Purpose of Meeting',
        questions: [
          txt('q0a', 'Reviewer\'s Name'),
        ]
      },
      {
        id: 's2', title: 'Role Expectations Review',
        questions: [
          sel('q1', 'Has the employee understood their role and responsibilities?', ['Yes', 'No', 'Partially']),
          sel('q2', 'Progress against objectives/skills required to do their job', ['Meets expectations', 'Partially meets expectations', 'Does not meet expectations']),
          sel('q3', 'Skills and Competency Assessment Outcome', ['Excellent', 'Adequate', 'Requires Improvement', 'Inadequate']),
        ]
      },
      {
        id: 's3', title: 'Attendance & Conduct',
        questions: [
          sel('q4', 'Any concerns regarding attendance, punctuality or behaviour?', ['Excellent', 'Good', 'Adequate', 'Requires Improvement']),
        ]
      },
      {
        id: 's4', title: 'Training & Compliance',
        questions: [
          sel('q5', 'Has the staff member completed all required training and compliance modules?', ['Yes', 'No', 'Partially', 'Difficulties completing training']),
          sel('q6', 'Are there any concerns regarding the employee\'s sickness absence or overall attendance levels? — Sickness Absence Level', ['Acceptable', 'Some concerns', 'Significant concerns']),
        ]
      },
      {
        id: 's5', title: 'Employee Feedback',
        questions: [
          txt('q7', 'How does the employee feel about their performance so far? What do they feel has gone well and what could be improved?'),
        ]
      },
      {
        id: 's6', title: 'Manager Feedback',
        questions: [
          txt('q8', 'Strengths'),
          txt('q9', 'Areas for Improvement'),
          txt('q10', 'Concerns (if any)'),
        ]
      },
      {
        id: 's7', title: 'Outcome of Probation Review',
        questions: [
          sel('q11', 'Outcome of Probation Review', ['Probation Passed – Confirmed in Role', 'Probation Extended for 3 Months', 'Probation Extended for 6 Months', 'Probation Failed – Employment Terminated']),
          txt('q12', 'Next Probation Review Date'),
        ]
      }
    ]
  },

  {
    key: 'recruitment_hr_audit', name: 'Recruitment and HR Audit', category: 'staff',
    description: 'Audit of recruitment processes and HR compliance.',
    sections: [{
      id: 's1', title: 'Recruitment Compliance',
      questions: [
        yn('q1', 'Is a valid DBS (Disclosure and Barring Service) check on file?'),
        yn('q2', 'Is the DBS check at the appropriate level for the role?'),
        yn('q3', 'Are right to work documents verified and on file?'),
        yn('q4', 'Are employment references (minimum 2) obtained and satisfactory?'),
        yn('q5', 'Is a signed employment contract on file?'),
        yn('q6', 'Is the staff member\'s job description on file?'),
        yn('q7', 'Is a complete application form on file?'),
        yn('q8', 'Are copies of relevant qualifications and certificates on file?'),
        yn('q9', 'Is an induction checklist completed and signed?'),
        yn('q10', 'Is the staff member registered on the required training system?'),
        yn('q11', 'Is health and occupational health information recorded?'),
        txt('q12', 'Actions Identified'),
        txt('q13', 'Outcome of Actions'),
      ]
    }]
  },

  {
    key: 'return_to_work', name: 'Return to Work', category: 'staff',
    description: 'Return to work interview after a period of sickness absence.',
    sections: [{
      id: 's1', title: 'Return to Work Interview',
      questions: [
        txt('q1', 'Date of absence start'),
        txt('q2', 'Date of return'),
        txt('q3', 'Reason for absence as stated by staff member'),
        yn('q4', 'Has the staff member provided a fit note (if absence >7 days)?'),
        yn('q5', 'Is the staff member fit to return to full duties?'),
        txt('q6', 'Any restrictions or adjustments required on return?'),
        yn('q7', 'Was absence due to a workplace injury or work-related stress?'),
        txt('q8', 'Any support or reasonable adjustments needed?'),
        yn('q9', 'Has the staff member been briefed on any changes during their absence?'),
        yn('q10', 'Is this absence part of a pattern that requires monitoring?'),
        txt('q11', 'Manager\'s comments'),
        txt('q12', 'Agreed actions'),
      ]
    }]
  },

  {
    key: 'safeguarding_audit_staff', name: 'Safeguarding Audit', category: 'staff',
    description: 'Audit of staff safeguarding knowledge and practice.',
    sections: [{
      id: 's1', title: 'Staff Safeguarding Knowledge',
      questions: [
        yn('q1', 'Has the staff member completed safeguarding adults training?'),
        yn('q2', 'Can the staff member define safeguarding and the types of abuse?'),
        yn('q3', 'Can the staff member identify the signs and indicators of abuse?'),
        yn('q4', 'Does the staff member know the correct reporting procedure for safeguarding concerns?'),
        yn('q5', 'Does the staff member know who the safeguarding lead is?'),
        yn('q6', 'Does the staff member understand their duty to report under the Care Act 2014?'),
        yn('q7', 'Is the staff member familiar with the whistleblowing policy?'),
        yn('q8', 'Can the staff member describe what to do if a service user discloses abuse?'),
        yn('q9', 'Does the staff member understand the principles of Mental Capacity Act and DoLS?'),
        txt('q10', 'Summary of safeguarding discussion'),
        txt('q11', 'Actions Identified / Training Required'),
      ]
    }]
  },

  {
    key: 'shadow_shift_checklist', name: 'Shadow Shift Checklist', category: 'staff',
    description: 'Checklist used during a new staff member\'s shadow shift.',
    sections: [
      {
        id: 's1', title: 'Shadow Shift Observations',
        questions: [
          yn('q1', 'Was the new staff member introduced to all service users?'),
          yn('q2', 'Was the buddy/mentor available throughout the shift?'),
          yn('q3', 'Did the new staff member observe all personal care routines?'),
          yn('q4', 'Was the medication round explained and observed (if applicable)?'),
          yn('q5', 'Were care plans and daily records explained to the new staff member?'),
          yn('q6', 'Was the new staff member shown the location of all emergency equipment?'),
          yn('q7', 'Were fire safety and evacuation procedures explained?'),
          yn('q8', 'Were infection control procedures demonstrated?'),
          yn('q9', 'Were moving and handling techniques observed?'),
          yn('q10', 'Were reporting procedures and escalation pathways explained?'),
        ]
      },
      {
        id: 's2', title: 'Feedback',
        questions: [
          txt('q11', 'New staff member\'s comments / questions from the shadow shift'),
          txt('q12', 'Buddy / Senior Carer feedback on the new staff member'),
          sel('q13', 'Is the new staff member ready to proceed to supervised practice?', ['Yes', 'No – further shadowing required']),
          txt('q14', 'Actions / Next Steps'),
        ]
      }
    ]
  },

  {
    key: 'staff_competency', name: 'Staff Competency Assessment', category: 'staff',
    description: 'Competency Model assessment (Talent Management based approach) covering core, safeguarding, clinical, manual handling and infection control competency.',
    outcomeOptions: ['Excellent', 'Good', 'Adequate', 'Requires Improvement'],
    sections: [
      {
        id: 's0', title: 'Assessment Details',
        questions: [
          txt('q0a', 'Time'),
          txt('q0b', 'Assessor\'s Name'),
        ]
      },
      {
        id: 's1', title: 'Section 1 — Core Competency',
        questions: [
          txt('q1', 'Describe your role as a Care Worker in supporting service users to achieve their outcomes/goals.'),
          txt('q2', 'Explain your service user\'s Care Plan and Risk Assessment when: (answer must demonstrate understanding of the service user\'s Care Plan and Risk Assessment)'),
          txt('q3', 'Can you describe how you engage and build therapeutic relationships with service users using a person-centred approach? (provide an example based on your experience)'),
          txt('q4', 'Can you explain your understanding of Equality and Diversity and provide an example of how you promote these values within your team?'),
          txt('q5', 'What is Positive Behaviour Support (PBS), and how do you apply your PBS training to support service users experiencing distress and encourage positive behaviour change? (include a practical de-escalation example)'),
          txt('q6', 'What is the difference between an Incident and Distress Behaviour, and what protocol should you follow when either occurs?'),
        ]
      },
      {
        id: 's2', title: 'Section 2 — Safeguarding',
        questions: [
          txt('q7', 'List the key 6 principles of Safeguarding.'),
          txt('q8', 'Name the different types of abuse and explain how you would recognise abuse.'),
          txt('q9', 'Who can be an abuser, and what factors might prevent someone from reporting abuse?'),
          txt('q10', 'What is your understanding of whistleblowing, and when should you whistleblow?'),
        ]
      },
      {
        id: 's3', title: 'Section 3 — Medication & First Aid',
        questions: [
          txt('q11', 'Can you explain the process involved in administering medication?'),
          txt('q12', 'Demonstrate how to complete a MAR (Medication Administration Record) chart and explain the importance of doing so immediately after administering medication.'),
          txt('q13', 'What are the 10 Rights of Medication Administration?'),
          txt('q14', 'What is the difference between PRN and Regular Medication?'),
          txt('q15', 'Can you describe the process for ordering, receiving and storing medication? (must demonstrate even if their service user is not currently prescribed medication)'),
          txt('q16', 'What is your understanding of First Aid, and how would you conduct an initial assessment of a casualty?'),
          txt('q17', 'What actions should you take if you find a service user or staff member unconscious but breathing, and what steps should you follow if they are unconscious and not breathing?'),
          txt('q18', 'What actions should you take in the case of Mild Choking and Severe Choking?'),
          txt('q19', 'What signs should you be aware of when supporting a service user with Diabetes, and what action should you take?'),
        ]
      },
      {
        id: 's4', title: 'Section 4 — Manual Handling',
        questions: [
          txt('q20', 'How can people be affected by poor manual handling?'),
          txt('q21', 'What does the acronym TILE stand for, and how would you use it as the foundation of your risk assessment before performing any task when supporting your service user? (provide an example)'),
          txt('q22', 'Demonstrate the principles of efficient lifting.'),
        ]
      },
      {
        id: 's5', title: 'Section 5 — Infection Control & Personal Care',
        questions: [
          sel('q23', 'Which of the following is the most effective way to prevent the spread of infection?', ['Hand washing', 'Use of PPE']),
          txt('q24', 'Demonstrate how you support a service user in maintaining their personal care and living environment.'),
          txt('q25', 'How do you ensure that the dignity of a service user with incontinence needs is respected and maintained?'),
          txt('q26', 'What are the Chains of Infection?'),
        ]
      },
      {
        id: 's6', title: 'Competency Assessment Evaluation',
        questions: [
          sel('q27', 'Competency Assessment Evaluation (Excellent = Yearly, Good = 6 Monthly, Adequate = 3 Months, Requires Improvement = 4 Weeks)', ['Excellent', 'Good', 'Adequate', 'Requires Improvement']),
          txt('q28', 'Assessor\'s Recommendation — Areas of strength, Areas for improvement, Recommended training, Actions required to support development'),
        ]
      },
      {
        id: 's7', title: 'Reassessment',
        questions: [
          txt('q29', 'Reassessment Date'),
          txt('q30', 'Reassessment of Areas of Concern'),
          sel('q31', 'Reassessment Evaluation (Excellent = Yearly, Good = 6 Monthly, Adequate = 3 Months, Requires Improvement = 4 Weeks)', ['Excellent', 'Good', 'Adequate', 'Requires Improvement']),
          txt('q32', 'Next Assessment Date'),
        ]
      }
    ]
  },

  {
    key: 'staff_one_to_one', name: 'Staff One to One', category: 'staff',
    description: 'Informal one-to-one meeting between staff member and team leader/manager.',
    sections: [{
      id: 's1', title: 'One to One Discussion',
      questions: [
        txt('q1', 'How are you feeling in your role currently?'),
        txt('q2', 'Are there any challenges or concerns you wish to raise?'),
        txt('q3', 'What has gone well since our last one-to-one?'),
        txt('q4', 'Is there anything you need support with?'),
        txt('q5', 'Any updates on your training or development?'),
        txt('q6', 'Are there any service user concerns you wish to discuss?'),
        txt('q7', 'Team leader / manager feedback on performance'),
        txt('q8', 'Agreed actions from this meeting'),
        txt('q9', 'Date of next one-to-one'),
      ]
    }]
  },

  {
    key: 'staff_training_compliance', name: 'Staff Training and Compliance', category: 'staff',
    description: 'Audit of staff training completion and compliance with mandatory training requirements.',
    sections: [{
      id: 's1', title: 'Mandatory Training Compliance',
      questions: [
        yn('q1', 'Has the staff member completed Safeguarding Adults training?'),
        yn('q2', 'Has the staff member completed Safeguarding Children training?'),
        yn('q3', 'Has the staff member completed Moving and Assisting training?'),
        yn('q4', 'Has the staff member completed Infection Prevention and Control training?'),
        yn('q5', 'Has the staff member completed Fire Safety training?'),
        yn('q6', 'Has the staff member completed First Aid training?'),
        yn('q7', 'Has the staff member completed Mental Capacity Act / DoLS training?'),
        yn('q8', 'Has the staff member completed Medication Management training (if applicable)?'),
        yn('q9', 'Has the staff member completed Food Hygiene training?'),
        yn('q10', 'Has the staff member completed Health and Safety training?'),
        yn('q11', 'Are all mandatory training certificates stored in the staff file?'),
        yn('q12', 'Are there any training certificates due for renewal within the next 3 months?'),
        txt('q13', 'Training gaps identified'),
        txt('q14', 'Action plan to complete outstanding training'),
      ]
    }]
  },

  {
    key: 'supervision_appraisal_audit', name: 'Supervision and Appraisal Audit', category: 'staff',
    description: 'Audit of whether staff have received supervision and appraisal within required timescales.',
    sections: [{
      id: 's1', title: 'Supervision and Appraisal Compliance',
      questions: [
        yn('q1', 'Has the staff member received formal supervision within the last 8 weeks?'),
        yn('q2', 'Are supervision records signed by both supervisor and supervisee?'),
        yn('q3', 'Are actions from previous supervisions followed up?'),
        yn('q4', 'Has the staff member received an annual appraisal?'),
        yn('q5', 'Is there a current Personal Development Plan (PDP) in place?'),
        yn('q6', 'Are supervision records stored securely in the staff file?'),
        yn('q7', 'Is the frequency of supervision in line with policy requirements?'),
        yn('q8', 'Is there evidence of wellbeing discussions during supervision?'),
        txt('q9', 'Actions Identified'),
        txt('q10', 'Outcome of Actions'),
      ]
    }]
  },

];

// ── Helper: calculate score ───────────────────────────────────────
function calcScore(template: Template, answers: Record<string, any>) {
  const allQs = template.sections.flatMap(s => s.questions);
  const scoredQs = allQs.filter(q => q.scored && q.type === 'yes_no');
  const maxScore = scoredQs.length;
  const totalScore = scoredQs.reduce((sum, q) => {
    const ans = answers[q.id];
    return sum + (ans === 'yes' || ans === true ? 1 : 0);
  }, 0);
  const scorePct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  let burnoutTotal = 0;
  let riskLevel = '';
  if (template.burnoutScoring) {
    const scaleQs = allQs.filter(q => q.type === 'scale');
    burnoutTotal = scaleQs.reduce((sum, q) => sum + (parseInt(answers[q.id]) || 0), 0);
    if (burnoutTotal <= 12) riskLevel = 'low';
    else if (burnoutTotal <= 22) riskLevel = 'medium';
    else riskLevel = 'high';
  } else {
    if (scorePct >= 90) riskLevel = 'good';
    else if (scorePct >= 70) riskLevel = 'requires_improvement';
    else riskLevel = 'inadequate';
  }

  return { totalScore, maxScore, scorePct, riskLevel, burnoutTotal };
}

// ── Barthel & MUST tables ─────────────────────────────────────────
const initBarthelTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS barthel_assessments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      su_id UUID NOT NULL,
      home_id UUID,
      assessed_by UUID,
      feeding INT DEFAULT 0,
      bathing INT DEFAULT 0,
      grooming INT DEFAULT 0,
      dressing INT DEFAULT 0,
      bowel_control INT DEFAULT 0,
      bladder_control INT DEFAULT 0,
      toilet_use INT DEFAULT 0,
      transfers INT DEFAULT 0,
      mobility INT DEFAULT 0,
      stairs INT DEFAULT 0,
      total_score INT DEFAULT 0,
      interpretation TEXT,
      notes TEXT,
      assessed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
};
initBarthelTable().catch(() => {});

const initMUSTTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS must_scores (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      su_id UUID NOT NULL,
      home_id UUID,
      assessed_by UUID,
      bmi_score INT DEFAULT 0,
      bmi NUMERIC(5,1),
      height_cm NUMERIC(6,1),
      weight_kg NUMERIC(6,1),
      weight_loss_score INT DEFAULT 0,
      acute_disease_score INT DEFAULT 0,
      total_score INT DEFAULT 0,
      risk_level TEXT,
      notes TEXT,
      assessed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
};
initMUSTTable().catch(() => {});

// ── Barthel routes ────────────────────────────────────────────────
router.get('/barthel/:suId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await query<any>(
      `SELECT b.*, s.first_name || ' ' || s.last_name as assessed_by_name
       FROM barthel_assessments b LEFT JOIN staff s ON s.id = b.assessed_by
       WHERE b.su_id = $1 ORDER BY b.assessed_at DESC LIMIT 20`,
      [req.params.suId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.post('/barthel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { suId, homeId, feeding, bathing, grooming, dressing, bowel_control, bladder_control,
            toilet_use, transfers, mobility, stairs, totalScore, interpretation, notes, assessedBy } = req.body;
    const conductedBy = assessedBy || (req.staff as any)?.staffId;
    const rows = await query<any>(
      `INSERT INTO barthel_assessments
        (su_id, home_id, assessed_by, feeding, bathing, grooming, dressing, bowel_control,
         bladder_control, toilet_use, transfers, mobility, stairs, total_score, interpretation, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [suId, homeId || null, conductedBy || null,
       feeding || 0, bathing || 0, grooming || 0, dressing || 0,
       bowel_control || 0, bladder_control || 0, toilet_use || 0,
       transfers || 0, mobility || 0, stairs || 0,
       totalScore || 0, interpretation || null, notes || null]
    );
    res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// ── MUST routes ───────────────────────────────────────────────────
router.get('/must/:suId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await query<any>(
      `SELECT m.*, s.first_name || ' ' || s.last_name as assessed_by_name
       FROM must_scores m LEFT JOIN staff s ON s.id = m.assessed_by
       WHERE m.su_id = $1 ORDER BY m.assessed_at DESC LIMIT 20`,
      [req.params.suId]
    );
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

router.post('/must', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { suId, homeId, bmiScore, bmi, heightCm, weightKg, weightLossScore,
            acuteDiseaseScore, totalScore, riskLevel, notes, assessedBy } = req.body;
    const conductedBy = assessedBy || (req.staff as any)?.staffId;
    const rows = await query<any>(
      `INSERT INTO must_scores
        (su_id, home_id, assessed_by, bmi_score, bmi, height_cm, weight_kg,
         weight_loss_score, acute_disease_score, total_score, risk_level, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [suId, homeId || null, conductedBy || null,
       bmiScore || 0, bmi || null, heightCm || null, weightKg || null,
       weightLossScore || 0, acuteDiseaseScore || 0, totalScore || 0,
       riskLevel || null, notes || null]
    );
    res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// ── Routes ───────────────────────────────────────────────────────

// GET /api/assessments/templates
router.get('/templates', (req: Request, res: Response) => {
  const { category } = req.query;
  const filtered = category
    ? TEMPLATES.filter(t => t.category === category)
    : TEMPLATES;
  res.json({
    success: true,
    data: filtered.map(t => ({
      key: t.key, name: t.name, category: t.category,
      description: t.description, reviewFrequency: t.reviewFrequency,
      questionCount: t.sections.flatMap(s => s.questions).filter(q => q.scored).length,
      sectionCount: t.sections.length,
    }))
  } as ApiResponse);
});

// GET /api/assessments/templates/:key
router.get('/templates/:key', (req: Request, res: Response) => {
  const t = TEMPLATES.find(t => t.key === req.params.key);
  if (!t) return res.status(404).json({ success: false, error: 'Template not found' } as ApiResponse);
  res.json({ success: true, data: t } as ApiResponse);
});

// Roles that can see every staff member's assessment/supervision records.
// Everyone else can only see their own — staff assessments are personnel
// records and must not be browsable by other frontline staff.
const ASSESSMENT_MANAGER_ROLES = ['group_admin', 'home_manager', 'deputy_manager', 'admin', 'director', 'registered_manager', 'service_manager'];

// GET /api/assessments
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const homeId = (req.query.homeId as string) || req.staff?.homeId || '';
    const { category, subjectId, staffId, templateKey } = req.query;
    const isManager = ASSESSMENT_MANAGER_ROLES.includes(req.staff?.role || '');
    const forcedOwnSubject = category === 'staff' && !isManager ? (req.staff?.staffId || '') : null;
    let sql = `SELECT a.*,
      s.first_name || ' ' || s.last_name as conducted_by_name
      FROM assessments a
      LEFT JOIN staff s ON s.id = a.conducted_by
      WHERE a.home_id = $1`;
    const params: any[] = [homeId];
    if (category) { params.push(category); sql += ` AND a.category = $${params.length}`; }
    if (forcedOwnSubject !== null) {
      params.push(forcedOwnSubject); sql += ` AND a.subject_id = $${params.length}`;
    } else if (subjectId) { params.push(subjectId); sql += ` AND a.subject_id = $${params.length}`; }
    else if (staffId) { params.push(staffId); sql += ` AND a.subject_id = $${params.length}`; }
    if (templateKey) { params.push(templateKey); sql += ` AND a.template_key = $${params.length}`; }
    sql += ' ORDER BY a.assessment_date DESC, a.created_at DESC LIMIT 100';
    const rows = await query(sql, params);
    res.json({ success: true, data: rows } as ApiResponse);
  } catch (err) { next(err); }
});

// GET /api/assessments/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      return res.status(404).json({ success: false, error: 'Assessment not found' } as ApiResponse);
    }
    const homeId = (req.query.homeId as string) || req.staff?.homeId || '';
    const rows = homeId
      ? await query(
          `SELECT a.*, s.first_name || ' ' || s.last_name as conducted_by_name
           FROM assessments a LEFT JOIN staff s ON s.id = a.conducted_by
           WHERE a.id = $1 AND a.home_id = $2`, [req.params.id, homeId])
      : await query(
          `SELECT a.*, s.first_name || ' ' || s.last_name as conducted_by_name
           FROM assessments a LEFT JOIN staff s ON s.id = a.conducted_by
           WHERE a.id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Assessment not found' } as ApiResponse);
    const assessment = rows[0] as any;
    const isManager = ASSESSMENT_MANAGER_ROLES.includes(req.staff?.role || '');
    if (assessment.category === 'staff' && !isManager && assessment.subject_id !== req.staff?.staffId) {
      return res.status(404).json({ success: false, error: 'Assessment not found' } as ApiResponse);
    }
    res.json({ success: true, data: assessment } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/assessments
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conductedBy = req.staff?.staffId;
    const homeId = req.body.homeId || req.staff?.homeId;
    const { templateKey, category, subjectId, subjectName, auditorName, answers, actionsIdentified, actionsOutcome, actionsCompletedDate, nextReviewDate, notes, assessmentDate, assessorSignature, staffSignature } = req.body;

    const template = TEMPLATES.find(t => t.key === templateKey);
    if (!template) return res.status(400).json({ success: false, error: 'Invalid template key' } as ApiResponse);

    const { totalScore, maxScore, scorePct, riskLevel } = calcScore(template, answers || {});

    const rows = await query(
      `INSERT INTO assessments (home_id, template_key, category, subject_id, subject_name,
        conducted_by, auditor_name, answers, total_score, max_score, score_pct, risk_level,
        actions_identified, actions_outcome, actions_completed_date, next_review_date, notes, assessment_date,
        assessor_signature, staff_signature)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [homeId, templateKey, category || template.category, subjectId || null, subjectName || null,
       conductedBy || null, auditorName || null, JSON.stringify(answers || {}),
       totalScore, maxScore, scorePct, riskLevel,
       actionsIdentified || null, actionsOutcome || null, actionsCompletedDate || null,
       nextReviewDate || null, notes || null, assessmentDate || new Date().toISOString().split('T')[0],
       assessorSignature || null, staffSignature || null]
    );
    res.status(201).json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// PUT /api/assessments/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      return res.status(404).json({ success: false, error: 'Not found' } as ApiResponse);
    }
    const { answers, actionsIdentified, actionsOutcome, actionsCompletedDate, nextReviewDate, notes, auditorName, assessorSignature, staffSignature } = req.body;
    const existing = await query('SELECT * FROM assessments WHERE id = $1', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, error: 'Not found' } as ApiResponse);
    const ex = existing[0] as any;

    const template = TEMPLATES.find(t => t.key === ex.template_key);
    const { totalScore, maxScore, scorePct, riskLevel } = template
      ? calcScore(template, answers || ex.answers || {})
      : { totalScore: ex.total_score, maxScore: ex.max_score, scorePct: ex.score_pct, riskLevel: ex.risk_level };

    const rows = await query(
      `UPDATE assessments SET answers=$1, total_score=$2, max_score=$3, score_pct=$4, risk_level=$5,
        actions_identified=$6, actions_outcome=$7, actions_completed_date=$8, next_review_date=$9,
        notes=$10, auditor_name=$11, assessor_signature=$12, staff_signature=$13, updated_at=NOW() WHERE id=$14 RETURNING *`,
      [JSON.stringify(answers || ex.answers), totalScore, maxScore, scorePct, riskLevel,
       actionsIdentified ?? ex.actions_identified, actionsOutcome ?? ex.actions_outcome,
       actionsCompletedDate ?? ex.actions_completed_date, nextReviewDate ?? ex.next_review_date,
       notes ?? ex.notes, auditorName ?? ex.auditor_name,
       assessorSignature ?? ex.assessor_signature, staffSignature ?? ex.staff_signature, req.params.id]
    );
    res.json({ success: true, data: rows[0] } as ApiResponse);
  } catch (err) { next(err); }
});

// POST /api/assessments/:id/attachments — add attachment URL
router.post('/:id/attachments', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { url, name } = req.body;
      if (!url) throw new AppError('url required', 400);
      const rows = await query<any>('SELECT attachments FROM assessments WHERE id=$1', [req.params.id]);
      if (!rows.length) throw new AppError('Assessment not found', 404);
      const existing: any[] = rows[0].attachments || [];
      const updated = [...existing, { url, name: name || url.split('/').pop(), addedAt: new Date().toISOString() }];
      await query('UPDATE assessments SET attachments=$1 WHERE id=$2', [JSON.stringify(updated), req.params.id]);
      res.json({ success: true, data: updated } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/assessments/:id/attachments — remove attachment by URL
router.delete('/:id/attachments', param('id').isUUID(), validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { url } = req.body;
      const rows = await query<any>('SELECT attachments FROM assessments WHERE id=$1', [req.params.id]);
      if (!rows.length) throw new AppError('Assessment not found', 404);
      const existing: any[] = rows[0].attachments || [];
      const updated = existing.filter((a: any) => a.url !== url);
      await query('UPDATE assessments SET attachments=$1 WHERE id=$2', [JSON.stringify(updated), req.params.id]);
      res.json({ success: true, data: updated } as ApiResponse);
    } catch (err) { next(err); }
  }
);

// DELETE /api/assessments/:id
router.delete('/:id', requireRole('home_manager', 'group_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await query('DELETE FROM assessments WHERE id = $1', [req.params.id]);
      res.json({ success: true } as ApiResponse);
    } catch (err) { next(err); }
  }
);

export default router;
