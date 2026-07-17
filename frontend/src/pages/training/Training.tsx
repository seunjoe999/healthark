import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Button, Card, SectionHeading, Modal, Input, PrintButton } from '../../components/ui'
import { BookOpen, CheckCircle, Lock, Play, Award, ChevronRight, X, RotateCcw, AlertTriangle } from 'lucide-react'
import { differenceInDays } from 'date-fns'
import api from '../../api'
import toast from 'react-hot-toast'

const MODULES = [
  {
    id: 'intro',
    title: 'Introduction to CompCare Hub',
    description: 'Learn the basics — logging in, navigating the system, and your daily workflow.',
    duration: '5 mins',
    icon: '🏠',
    sections: [
      { title: 'Logging in', content: 'Go to your CompCare Hub link on your phone or computer. Enter your email and password. If you are new, use the registration code from your manager to create an account — your manager will then activate it.' },
      { title: 'The sidebar', content: 'The left sidebar is your main navigation. It is grouped into Care (residents and daily tasks), Operations (staff, tasks, messages), and Quality & Compliance (audits, reports, policies).' },
      { title: 'Your daily workflow', content: '1. Check the Dashboard for alerts and who is working today.\n2. Go to Daily Records and select the resident you are supporting.\n3. Log all care activities throughout your shift.\n4. Check the Medication Administration Record to log medications.\n5. Complete any Tasks assigned to you.\n6. Check Messages for any communications from management.' },
    ]
  },
  {
    id: 'daily_records',
    title: 'Daily Records',
    description: 'How to log care activities, vitals, food, fluids and incidents.',
    duration: '8 mins',
    icon: '📋',
    sections: [
      { title: 'Finding a resident', content: 'Click Daily Records in the sidebar. Search for the resident by name in the left panel. Click their name to open their records.' },
      { title: 'Adding a record', content: 'Click the blue + Add record button. Select the record type from the dropdown — for example Personal care, Food intake, Fluid/drinks, Blood pressure etc. Fill in the details and click Save record.' },
      { title: 'Fluid tracking', content: 'Every time you give a resident a drink, log it as a Fluid/drinks record. Select the drink type and the system will auto-fill the amount. The total for the day shows at the top — it turns amber if below the target.' },
      { title: 'Viewing past records', content: 'Use the date navigation arrows at the top to go back and view records from previous days. You cannot add records to past dates — only view them.' },
      { title: 'Body map', content: 'If you notice any skin concerns — redness, bruising, pressure sores — select Body map / skin from the record type dropdown. Click on the affected body area on the diagram, select the concern type and describe it.' },
    ]
  },
  {
    id: 'mar',
    title: 'Medication Administration Record — Medication Administration',
    description: 'How to log medications as given, refused or omitted.',
    duration: '6 mins',
    icon: '💊',
    sections: [
      { title: 'Opening the Medication Administration Record', content: 'Click Medication Administration Record in the sidebar. Select the resident from the left panel. You will see their medication list.' },
      { title: 'Logging medication as given', content: 'Find the medication on the list. Click the green Given button. This records that you administered the medication, with the time and your name.' },
      { title: 'Logging as refused', content: 'If the resident refuses their medication, click the grey Refused button. This is important — never skip logging a refusal.' },
      { title: 'PRN medications', content: 'PRN means "as required". These medications are only given when needed. They are marked with an amber PRN badge. Always document why you gave a PRN medication in the notes.' },
      { title: 'Stock count', content: 'Click the Stock count tab to record how many of each medication is left. This must be done at every shift handover.' },
    ]
  },
  {
    id: 'safeguarding',
    title: 'Safeguarding',
    description: 'How to raise a safeguarding concern and what to do in an emergency.',
    duration: '10 mins',
    icon: '🛡️',
    sections: [
      { title: 'What is safeguarding?', content: 'Safeguarding means protecting adults at risk from abuse, neglect or harm. Every member of staff has a legal duty to report concerns. You should never ignore something that does not feel right.' },
      { title: 'Types of abuse', content: 'Physical abuse — hitting, restraining. Emotional abuse — bullying, threats. Financial abuse — stealing, fraud. Neglect — failing to provide care. Sexual abuse. Discriminatory abuse. Institutional abuse — poor practice by an organisation.' },
      { title: 'How to raise a concern', content: 'Go to Safeguarding in the sidebar. Click + New concern. Fill in the form — describe what happened, when, where, who was involved and any witnesses. Be factual and accurate. Click Submit. Your manager will be notified immediately.' },
      { title: 'What happens next', content: 'Your manager will acknowledge the concern. They may contact the local authority, CQC or police depending on the severity. You may be asked to provide more information. Do not discuss the concern with other staff or residents.' },
      { title: 'In an emergency', content: 'If someone is in immediate danger, call 999 first. Then raise a safeguarding concern in the system. Then inform your manager.' },
    ]
  },
  {
    id: 'clockin',
    title: 'Clock In & Out',
    description: 'How to use the QR code to clock in and out at a service user\'s location.',
    duration: '4 mins',
    icon: '📍',
    sections: [
      { title: 'How clock-in works', content: 'CompCare Hub uses GPS to verify you are at the correct location when you clock in. You must be within 200 metres of the service user\'s address. This protects residents and ensures accurate attendance records.' },
      { title: 'Scanning the QR code', content: 'At the care address, look for the printed QR code poster. Open your phone camera and point it at the QR code. Tap the link that appears. If prompted, sign in to CompCare Hub.' },
      { title: 'Clocking in', content: 'On the clock-in page, select Clock In. When prompted, allow your phone to access your location. If you are within range, your clock-in is recorded. If you are too far away, you will see an error showing your distance.' },
      { title: 'Clocking out', content: 'Follow the same process but select Clock Out. You must also be within range to clock out. Your shift duration is calculated automatically.' },
      { title: 'If you have problems', content: 'Make sure location access is enabled for your browser in phone settings. Try stepping outside or near a window. If problems persist, contact your manager who can manually record your attendance.' },
    ]
  },
  {
    id: 'care_plans',
    title: 'Care Plans & Risk Assessments',
    description: 'Understanding and updating care plans.',
    duration: '7 mins',
    icon: '📄',
    sections: [
      { title: 'What is a care plan?', content: 'A care plan describes how to support a specific resident with a specific need. For example, a Personal Hygiene care plan explains how to support that person with washing and dressing in the way they prefer.' },
      { title: 'Reading a care plan', content: 'Go to Care Plans. Select the resident. Click on a care plan to expand it. Read the aims, what the resident can do themselves, and what you should do to support them.' },
      { title: 'Updating a care plan', content: 'If something changes — for example a resident\'s mobility improves or declines — click Update on the care plan. Add a note describing the change. This is logged with your name and the date.' },
      { title: 'Review dates', content: 'Care plans must be reviewed monthly. A green badge means it is current. An amber badge means it is due soon. A red badge means it is overdue — inform your manager.' },
      { title: 'Risk assessments', content: 'Risk assessments sit alongside care plans. They identify risks (such as falls or pressure sores) and describe how to manage them. Always read the risk assessment before supporting a new resident.' },
    ]
  },
  {
    id: 'fire_safety',
    title: 'Fire Safety & Evacuation',
    description: 'How to prevent fires, respond to alarms, and safely evacuate residents.',
    duration: '8 mins',
    icon: '🔥',
    sections: [
      { title: 'Fire prevention', content: 'Most fires in care settings are preventable. Never leave cooking unattended. Report faulty equipment immediately. Ensure fire doors are never propped open — they stop fire spreading. Do not store items in corridors or near fire exits. Report any smoke or burning smells to a manager immediately.' },
      { title: 'Fire triangle', content: 'Fire needs three things: fuel (paper, fabric, furniture), heat (a spark, cigarette, faulty wire), and oxygen (air). Remove any one of these and the fire goes out. This is why fire doors (reducing oxygen flow) and not leaving flammable items near heat sources are so important.' },
      { title: 'On discovering a fire', content: 'Remember RACE: Rescue anyone in immediate danger (if it is safe to do so). Alarm — activate the nearest break-glass point and call 999. Confine — close doors and windows to slow the spread. Evacuate — follow the fire evacuation procedure for your area.' },
      { title: 'Evacuation procedure', content: 'Your home has a Personal Emergency Evacuation Plan (PEEP) for every resident. Know the evacuation plan for each person you support. Use the nearest safe exit — never use lifts. Assist residents who cannot mobilise independently. Go to the designated assembly point and do not re-enter the building.' },
      { title: 'Fire equipment', content: 'Know where the fire extinguishers, fire blankets, and alarm call points are in your area. Different extinguishers are for different fires: Red (water) — paper and wood only. Black (CO2) — electrical fires. Cream (foam) — general use. Never use water on an electrical fire. If in doubt, evacuate and do not fight the fire.' },
      { title: 'After a fire alarm', content: 'Even if you believe it is a false alarm, always treat every alarm as real. Do not re-enter the building until the fire service gives the all-clear. Complete a record in the incident log after any fire alarm activation, including the time, cause (if known), and evacuation outcome.' },
    ]
  },
  {
    id: 'moving_handling',
    title: 'Moving & Handling People',
    description: 'Safe techniques for supporting residents with movement and transfers.',
    duration: '10 mins',
    icon: '🏥',
    sections: [
      { title: 'Why safe moving and handling matters', content: 'Back injuries are the most common occupational injury in care. They can be career-ending and cause long-term pain. Safe moving and handling also protects residents from falls, skin tears, and discomfort. You must never manually lift a resident — always use the correct equipment.' },
      { title: 'The law', content: 'The Manual Handling Operations Regulations 1992 (amended 2002) require employers to avoid hazardous manual handling where possible and to assess and reduce risks. You have a duty to follow safe systems of work and report any concerns about equipment or techniques.' },
      { title: 'Risk assessment before every move', content: 'Before assisting any resident with movement, check: their care plan and moving and handling assessment. Any changes to their condition since the last move. The environment — is there enough space? Is the floor dry? Does all equipment work? Do you have enough staff? Never rush a move.' },
      { title: 'Equipment you may use', content: 'Hoist and sling — for residents who cannot weight-bear. Always check the sling is the correct type and size for the resident. Stand aid — for residents who can take some weight through their legs. Slide sheet — to reposition a resident in bed without friction. Transfer board — for seated transfers between two surfaces of similar height. Check all equipment before use and report any defects immediately.' },
      { title: 'Safe posture for carers', content: 'Keep your back straight and avoid twisting. Bend your knees, not your back. Keep the load close to your body. Use your leg muscles to do the work. Face the direction of movement. Never reach awkwardly — adjust the height of the bed or surface first.' },
      { title: 'Dignity during moving and handling', content: 'Always explain what you are doing before you start. Gain consent — do not move a resident against their wishes without clinical justification. Minimise exposure of the resident\'s body. Use a calm, unhurried manner. If a resident is distressed, pause, reassure them, and seek support from a senior colleague.' },
    ]
  },
  {
    id: 'infection_control',
    title: 'Infection Prevention & Control',
    description: 'Protecting residents and yourself from the spread of infection.',
    duration: '9 mins',
    icon: '🦠',
    sections: [
      { title: 'The chain of infection', content: 'Infections spread through a chain of six links: Infectious agent (germ) → Reservoir (where it lives) → Portal of exit (how it leaves) → Mode of transmission (how it travels) → Portal of entry (how it enters a new host) → Susceptible host. Breaking any link in the chain stops infection spreading.' },
      { title: 'Standard precautions', content: 'Standard precautions must be applied with every resident, every time — not just when you know someone is infected. They include: hand hygiene, use of personal protective equipment (PPE), safe handling and disposal of sharps and waste, respiratory hygiene (covering coughs and sneezes), and safe handling of linen and equipment.' },
      { title: 'Hand hygiene — the single most important thing', content: 'Wash hands with soap and water for at least 20 seconds in these five moments:\n1. Before touching a resident\n2. Before a clean/aseptic procedure\n3. After body fluid exposure risk\n4. After touching a resident\n5. After touching a resident\'s surroundings\nUse alcohol gel when hands are visibly clean and between residents. Soap and water must be used after using the toilet, before handling food, and when hands are visibly soiled.' },
      { title: 'Personal Protective Equipment (PPE)', content: 'Gloves — change between tasks and between residents. Aprons — wear when there is a risk of contamination. Fluid-resistant surgical mask — when within 1 metre of a resident with a respiratory illness. Eye protection — when there is a splash risk. Don PPE in this order: apron, mask, eye protection, gloves. Remove in reverse order and dispose of as clinical waste.' },
      { title: 'Outbreak management', content: 'If a resident develops symptoms of an infection (vomiting, diarrhoea, rash, respiratory symptoms), inform your manager immediately. The resident may need to be cohorted (grouped with others with the same illness) or isolated in their room. Increase hand hygiene frequency. Inform visitors of the outbreak and advise on precautions. Follow your home\'s outbreak management policy.' },
      { title: 'Antibiotic stewardship', content: 'Antibiotic-resistant infections (such as MRSA and C. diff) are a serious risk in care settings. Never request or take antibiotics unnecessarily. If a resident is on antibiotics, ensure they complete the full course. Report any suspected infections promptly so the correct diagnosis and treatment can be prescribed. Good infection control reduces the need for antibiotics.' },
    ]
  },
  {
    id: 'first_aid',
    title: 'First Aid & Basic Life Support',
    description: 'What to do in a medical emergency — calling for help and keeping someone safe.',
    duration: '8 mins',
    icon: '🩺',
    sections: [
      { title: 'Your role in a medical emergency', content: 'As a care worker you are not expected to be a qualified paramedic. Your role is: recognise an emergency, call for help, keep the person safe, provide basic first aid until help arrives, and document what happened. Never try to diagnose or treat a condition yourself.' },
      { title: 'The DRABC check', content: 'When you find someone unwell or unconscious:\nD — Danger: Check the area is safe for you and the casualty.\nR — Response: Gently shake shoulders and call their name. Are they responsive?\nA — Airway: If unresponsive, tilt head back and lift chin to open airway.\nB — Breathing: Look, listen, and feel for breathing (no more than 10 seconds).\nC — Circulation / CPR: If not breathing normally, start CPR and call 999.' },
      { title: 'Starting CPR', content: 'If the person is unresponsive and not breathing normally:\n1. Call 999 (or ask someone else to call while you start CPR).\n2. Place the heel of one hand on the centre of the chest.\n3. Place your other hand on top and interlock fingers.\n4. Give 30 chest compressions — push down 5–6 cm at a rate of 100–120 per minute.\n5. Give 2 rescue breaths (if trained and willing — compression-only CPR is acceptable).\n6. Continue until help arrives or the person recovers.\nNote: Check the resident\'s DNAR status if known and safe to check quickly — if a valid DNAR is in place, do not start CPR.' },
      { title: 'Using a defibrillator (AED)', content: 'If an AED is available, use it as soon as possible. Switch it on — it will give you voice instructions. Attach the pads as shown in the diagram (one below the right collarbone, one on the left side of the chest). Stand clear when it analyses the heart rhythm. Deliver the shock if advised. Continue CPR immediately after the shock. The AED will continue to guide you.' },
      { title: 'Falls', content: 'Do not move a fallen resident before help arrives unless they are in danger. Call for help. Stay with the resident, keep them calm and warm. Assess for injuries — ask if they are in pain, check for swelling or deformity. Complete an incident report in CompCare Hub immediately after the event, even if the resident appears unharmed. All falls must be documented.' },
      { title: 'Choking', content: 'If a resident is coughing, encourage them to keep coughing. If they cannot cough, speak, or breathe: Give up to 5 back blows between the shoulder blades with the heel of your hand. Check the mouth and remove any visible obstruction. If unsuccessful, give up to 5 abdominal thrusts (Heimlich manoeuvre). Call 999 if the obstruction is not cleared. For residents with PEG feeds, do not give abdominal thrusts — call 999 immediately.' },
    ]
  },
  {
    id: 'health_safety',
    title: 'Health & Safety at Work',
    description: 'Your rights and responsibilities under health and safety law.',
    duration: '6 mins',
    icon: '⚠️',
    sections: [
      { title: 'Your legal duties', content: 'Under the Health and Safety at Work Act 1974, you must: take reasonable care of your own health and safety and that of others. Cooperate with your employer on health and safety matters. Not misuse or interfere with anything provided for health and safety purposes. Report any hazards, near misses, accidents, or concerns to your manager immediately.' },
      { title: 'Risk assessments', content: 'Your employer must carry out risk assessments for all significant hazards in the workplace. As a care worker you should: read and follow risk assessments relevant to your role. Report any new hazards or changes that might affect existing risk assessments. Contribute to risk assessments when asked. Never carry out a task if you believe it is unsafe — report your concern first.' },
      { title: 'Reporting incidents and near misses', content: 'A near miss is an event that could have caused harm but did not. All near misses must be reported — they are a warning sign. Log all incidents and near misses in CompCare Hub under Incident Reports. Some incidents must also be reported to the Health and Safety Executive (HSE) under RIDDOR (Reporting of Injuries, Diseases and Dangerous Occurrences Regulations) — your manager will advise you on this.' },
      { title: 'Lone working', content: 'If you work alone, your employer must assess the risks and put measures in place to protect you. You should: follow the lone working policy. Check in with your manager at agreed times. Carry a mobile phone. Know the emergency procedures. If you feel unsafe, leave the situation and call your manager immediately.' },
      { title: 'COSHH — hazardous substances', content: 'COSHH (Control of Substances Hazardous to Health) covers cleaning products, disinfectants, medicines, and bodily fluids. Always read the safety data sheet before using a new product. Use the correct PPE. Store hazardous substances correctly and securely. Never mix cleaning products. Report any adverse reactions (skin irritation, breathing problems) to your manager immediately.' },
    ]
  },
  {
    id: 'food_hygiene',
    title: 'Food Hygiene & Safety',
    description: 'Safe food handling and preparation to protect vulnerable residents.',
    duration: '7 mins',
    icon: '🍽️',
    sections: [
      { title: 'Why food hygiene matters in care', content: 'Older adults and people with health conditions are at much greater risk from food poisoning than healthy adults. Bacteria such as Salmonella, E. coli, Listeria, and Campylobacter can cause serious illness and death in vulnerable people. High standards of food hygiene are essential every time food is handled.' },
      { title: 'The 4 Cs', content: 'Remember the four Cs of food safety:\nCleaning — clean hands, surfaces, and equipment before and after food preparation.\nCooking — cook food to a core temperature of at least 75°C. Use a food probe thermometer.\nChilling — refrigerate perishables at 0–5°C. Never leave food in the danger zone (8–63°C) for more than 2 hours.\nCross-contamination — keep raw and cooked foods separate. Use separate colour-coded chopping boards.' },
      { title: 'Personal hygiene', content: 'Before handling food: wash hands thoroughly with soap and warm water. Change into clean clothing or apron. Remove jewellery (plain wedding band only). Tie hair back. Do not handle food if you have a gastrointestinal illness (vomiting or diarrhoea) — you must not work with food for 48 hours after your last symptom. Report illness to your manager immediately.' },
      { title: 'Allergen awareness', content: 'The 14 major allergens must be declared when present in food: Celery, Cereals containing gluten, Crustaceans, Eggs, Fish, Lupin, Milk, Molluscs, Mustard, Nuts, Peanuts, Sesame seeds, Soya, Sulphur dioxide/sulphites. Always check a resident\'s care plan for food allergies before preparing or serving food. Never assume a dish is allergen-free — always check the label or recipe.' },
      { title: 'Special diets and textures', content: 'Many residents require modified textures due to swallowing difficulties (dysphagia). The IDDSI (International Dysphagia Diet Standardisation Initiative) framework defines levels from 0 (thin liquid) to 7 (regular). Always follow the texture level recorded in the resident\'s care plan. Never modify a texture level without advice from a speech and language therapist. Record all meals and fluid intake in CompCare Hub.' },
    ]
  },
  {
    id: 'dementia',
    title: 'Dementia Awareness',
    description: 'Understanding dementia and providing person-centred support.',
    duration: '10 mins',
    icon: '🧠',
    sections: [
      { title: 'What is dementia?', content: 'Dementia is an umbrella term for a group of conditions that affect memory, thinking, and behaviour. It is caused by damage to brain cells. The most common types are Alzheimer\'s disease (60–70%), Vascular dementia, Lewy body dementia, and Frontotemporal dementia. Dementia is progressive — symptoms worsen over time. It is not a normal part of ageing, though age is the biggest risk factor.' },
      { title: 'How dementia affects people', content: 'Common symptoms include: Short-term memory loss (forgetting recent events while remembering the past). Confusion about time and place. Difficulty with language — forgetting words, repeating questions. Changes in behaviour and mood — agitation, anxiety, depression, withdrawal. Difficulty with daily tasks — dressing, eating, personal care. In later stages, physical symptoms such as difficulty swallowing and loss of mobility.' },
      { title: 'Person-centred care for dementia', content: 'Every person with dementia is an individual with their own life history, preferences, and personality. Dementia does not change who they are. Focus on what the person CAN do, not what they cannot. Use life history — knowing about their past helps you connect with them. Maintain familiar routines — predictability is reassuring. Validate their feelings rather than correcting their reality. A person saying "I need to go to work" is expressing anxiety or purpose, not lying.' },
      { title: 'Communication', content: 'Use simple, short sentences — one instruction at a time. Speak slowly and clearly — give time to process and respond. Use the person\'s preferred name. Maintain eye contact and a calm facial expression — people with dementia read emotions well. Non-verbal communication matters as much as words. If they are distressed, acknowledge the feeling: "I can see you\'re worried. You\'re safe here." Never argue or try to "correct" someone\'s reality.' },
      { title: 'Behaviours that challenge', content: 'Behaviours such as aggression, shouting, restlessness, and refusing care are usually a form of communication. Ask: what is the person trying to tell us? Common triggers include pain, fear, confusion, a need for the toilet, being too hot or too cold, hunger or thirst, or a change in routine or environment. Always look for the unmet need before responding. Document any behavioural changes in CompCare Hub and report to your manager.' },
      { title: 'Sundowning and night-time disturbance', content: 'Many people with dementia become more confused or agitated in the late afternoon or evening — this is called sundowning. Strategies that can help: a consistent evening routine, calming activities, gentle music, good lighting, reducing noise and stimulation. Ensure the person is not in pain, hungry, thirsty, or needing the toilet. If night-time disturbances are frequent, record them and report to the manager so the care plan can be reviewed.' },
    ]
  },
  {
    id: 'dignity_privacy',
    title: 'Dignity & Privacy in Care',
    description: 'Upholding the rights and dignity of every person you support.',
    duration: '7 mins',
    icon: '🤝',
    sections: [
      { title: 'The right to dignity', content: 'Every person has the right to be treated with dignity and respect regardless of their age, condition, background, or behaviour. The Care Quality Commission (CQC) places dignity at the heart of its inspection standards. The Social Care Institute for Excellence (SCIE) identifies seven aspects of dignity: privacy, autonomy, self-worth, identity, importance, recognition, and choice.' },
      { title: 'Privacy in care', content: 'Privacy means more than just closing the curtains during personal care. It includes: knocking before entering a resident\'s room. Addressing the person by their preferred name. Not discussing a resident\'s care, condition, or personal details where others can hear. Keeping written and electronic records confidential. Respecting the resident\'s right to decline care or have private time. Ensuring care records are kept secure at all times.' },
      { title: 'Consent and autonomy', content: 'Consent must be obtained before every care interaction. Simply beginning a task without asking is not acceptable. Ask: "Would you like me to help you with your wash now?" and wait for the response. A person has the right to refuse care — this must be documented and reported. If a person lacks capacity to consent, decisions must be made in their best interests following the Mental Capacity Act.' },
      { title: 'Language and communication', content: 'The words we use shape how people feel. Use the person\'s preferred name — never use infantilising language like "love", "dear", or "sweetie" unless the person has indicated they like it. Avoid talking about residents in third person in front of them ("She\'s a faller"). Do not talk across residents as if they are not there. Update the care plan to record each person\'s communication preferences.' },
      { title: 'Reporting concerns about dignity', content: 'If you witness a colleague treating a resident in a disrespectful or undignified way, you have a duty to act. This could include: dismissive language, rushing personal care, ignoring requests, mockery, or rough handling. Speak to your manager. If the concern involves a manager, use your organisation\'s whistleblowing policy or contact CQC directly. Do not assume someone else will report it — you may be the only one who saw it.' },
    ]
  },
  {
    id: 'duty_of_candour',
    title: 'Duty of Candour & Complaints',
    description: 'Being open and honest when things go wrong in care.',
    duration: '6 mins',
    icon: '📋',
    sections: [
      { title: 'What is the duty of candour?', content: 'The Duty of Candour is a legal and professional requirement to be open and honest with residents and families when something goes wrong that causes harm, distress, or loss. It applies to the organisation as well as individual care workers. Under the Health and Social Care Act 2008 (Regulated Activities) Regulations 2014, all regulated providers must comply with this duty.' },
      { title: 'When does it apply?', content: 'The duty applies when a notifiable safety incident occurs — meaning unintended or unexpected events that result in death, severe harm, moderate harm, or prolonged psychological harm to a resident. It also applies in spirit to all incidents, near misses, and concerns — you should always be honest with residents and families about what has happened, even when the threshold for a formal notifiable incident has not been met.' },
      { title: 'What you must do', content: 'When something goes wrong: Tell the resident (and their family or advocate if appropriate) as soon as practicable that something has gone wrong. Provide a truthful, open account of what happened. Apologise — an apology is not an admission of legal liability. Describe what is being done to put things right. Complete an incident report in CompCare Hub. Your manager will lead the formal duty of candour process for serious incidents.' },
      { title: 'Handling complaints', content: 'Complaints are an opportunity to improve. Every complaint must be taken seriously and responded to promptly. Listen without interrupting. Apologise for the distress caused (even if you do not agree with the complaint). Refer to your manager for a formal response. The person has the right to take their complaint to the Local Government and Social Care Ombudsman if they are not satisfied with your response.' },
      { title: 'Documentation', content: 'Always document incidents, near misses, and complaints accurately in CompCare Hub. Write factual, objective records — what you saw, heard, and did. Do not alter records after an incident — this is a serious disciplinary and criminal matter. Accurate records protect you, the resident, and the organisation, and are essential for learning and improving care.' },
    ]
  },
]

export default function Training() {
  const { user, isRole } = useAuth()
  const [completions, setCompletions] = useState<Record<string, boolean>>({})
  const [activeModule, setActiveModule] = useState<typeof MODULES[0] | null>(null)
  const [activeSection, setActiveSection] = useState(0)
  const [loading, setLoading] = useState(false)
  const [externalCourses, setExternalCourses] = useState<any[]>([])
  const [courseFilter, setCourseFilter] = useState<'all' | 'expiring'>('all')

  useEffect(() => {
    api.get('/staff-hr/training-modules').then(res => {
      const data = res.data.data || []
      const map: Record<string, boolean> = {}
      data.forEach((d: any) => { map[d.module_id] = true })
      setCompletions(map)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!user?.id) return
    api.get(`/staff-hr/training/${user.id}`).then(res => {
      setExternalCourses(res.data.data || [])
    }).catch(() => {})
  }, [user?.id])

  const resetModule = async (moduleId: string) => {
    if (!window.confirm('Reset this module? You will need to complete it again.')) return
    try {
      await api.delete(`/staff-hr/training-modules/${moduleId}`)
      setCompletions(p => { const n = { ...p }; delete n[moduleId]; return n })
      toast.success('Module reset')
    } catch { toast.error('Failed to reset') }
  }

  // Map in-app training modules to mandatory training matrix course names
  const MODULE_TO_MATRIX: Record<string, string> = {
    safeguarding: 'Safeguarding',
    mar: 'Medication Administration Record',
    care_plans: 'Mental Capacity (MCA/DoLS)',
    fire_safety: 'Fire Safety',
    moving_handling: 'Moving and Handling',
    infection_control: 'Infection Prevention and Control',
    first_aid: 'First Aid and Basic Life Support',
    health_safety: 'Health and Safety',
    food_hygiene: 'Food Hygiene',
    dementia: 'Dementia Awareness',
    dignity_privacy: 'Dignity and Respect',
    duty_of_candour: 'Duty of Candour',
  }

  const completeModule = async (moduleId: string) => {
    setLoading(true)
    try {
      await api.post('/staff-hr/training-modules', { moduleId, moduleName: MODULES.find(m => m.id === moduleId)?.title })
      // Auto-update training matrix for applicable modules
      const courseName = MODULE_TO_MATRIX[moduleId]
      if (courseName && user?.id) {
        const today = new Date().toISOString().slice(0, 10)
        const expiryDate = new Date()
        expiryDate.setFullYear(expiryDate.getFullYear() + 1)
        api.post('/staff-hr/training', {
          staffId: user.id,
          courseName,
          completedDate: today,
          expiryDate: expiryDate.toISOString().slice(0, 10),
        }).catch(() => {})
      }
      setCompletions(p => ({ ...p, [moduleId]: true }))
      toast.success('Module completed! Training matrix updated.')
      setActiveModule(null)
    } catch { toast.error('Failed to save') }
    finally { setLoading(false) }
  }

  const totalCompleted = Object.values(completions).filter(Boolean).length
  const progress = Math.round((totalCompleted / MODULES.length) * 100)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-purple-600" /> Hub Training
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Training modules and resources for CompCare Hub</p>
        </div>
        <div className="flex items-center gap-4">
          <PrintButton />
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900 font-display">{totalCompleted}/{MODULES.length}</p>
            <p className="text-xs text-slate-400">modules completed</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-slate-700">Your progress</p>
          <p className="text-sm font-bold text-slate-900">{progress}%</p>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div className="h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #e8b130, #d4961a)' }} />
        </div>
        {progress === 100 && (
          <div className="flex items-center gap-2 mt-3 text-emerald-700">
            <Award className="w-5 h-5" />
            <p className="text-sm font-semibold">All modules completed — well done!</p>
          </div>
        )}
      </div>

      {/* Module grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {MODULES.map((mod, idx) => {
          const done = completions[mod.id]
          const locked = idx > 0 && !completions[MODULES[idx - 1].id] && !done
          return (
            <div key={mod.id}
              className={`bg-white rounded-2xl border shadow-card p-5 transition-all ${done ? 'border-emerald-200' : locked ? 'border-slate-100 opacity-60' : 'border-slate-100 hover:border-slate-200 hover:shadow-card-hover cursor-pointer'}`}
              onClick={() => { if (!locked) { setActiveModule(mod); setActiveSection(0) } }}
              style={!locked ? {cursor:'pointer'} : {}}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${done ? 'bg-emerald-50' : locked ? 'bg-slate-50' : 'bg-gold-50'}`}>
                  {done ? '✅' : locked ? '🔒' : mod.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 text-sm">{mod.title}</h3>
                    {done && <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-400 mb-2 line-clamp-2">{mod.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Play className="w-3 h-3" /> {mod.duration} · {mod.sections.length} sections
                    </span>
                    {!locked && !done && <ChevronRight className="w-4 h-4 text-slate-400" />}
                    {done && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-600 font-semibold">Completed</span>
                        <button onClick={e => { e.stopPropagation(); resetModule(mod.id) }}
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 border border-slate-200 hover:border-rose-300 rounded-lg px-2 py-1 transition-colors">
                          <RotateCcw className="w-3 h-3" /> Reset
                        </button>
                      </div>
                    )}
                    {locked && <span className="text-xs text-slate-400">Complete previous module first</span>}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* External / manually-added training records */}
      {externalCourses.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="font-display text-lg text-slate-900 font-semibold flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-500" /> External Training &amp; Courses
            </h2>
            {/* Filter tabs */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setCourseFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${courseFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                All
              </button>
              <button
                onClick={() => setCourseFilter('expiring')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${courseFilter === 'expiring' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <AlertTriangle className="w-3 h-3" /> Expiring Soon
                {(() => {
                  const count = externalCourses.filter(c => {
                    if (!c.expiry_date) return false
                    const days = differenceInDays(new Date(c.expiry_date), new Date())
                    return days < 0 || days <= 30
                  }).length
                  return count > 0 ? <span className="ml-1 bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5 text-xs">{count}</span> : null
                })()}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {externalCourses
              .filter(c => {
                if (courseFilter === 'expiring') {
                  if (!c.expiry_date) return false
                  const days = differenceInDays(new Date(c.expiry_date), new Date())
                  return days < 0 || days <= 30
                }
                return true
              })
              .map((c: any) => {
                const daysUntilExpiry = c.expiry_date ? differenceInDays(new Date(c.expiry_date), new Date()) : null
                const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0
                const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30
                return (
                  <div key={c.id} className={`bg-white rounded-2xl border shadow-card px-5 py-4 flex items-center gap-4 ${isExpired ? 'border-rose-200' : isExpiringSoon ? 'border-amber-200' : 'border-slate-100'}`}>
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-xl flex-shrink-0">🎓</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-900 text-sm">{c.course_name}</p>
                        {isExpired && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            EXPIRED
                          </span>
                        )}
                        {isExpiringSoon && !isExpired && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-3 h-3" /> Expires soon
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Completed: {c.completed_date ? new Date(c.completed_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        {c.duration_hours ? ` · ${c.duration_hours}h` : ''}
                      </p>
                    </div>
                    {c.expiry_date && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-slate-500">Expires</p>
                        <p className={`text-xs font-semibold ${isExpired ? 'text-rose-600' : isExpiringSoon ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {new Date(c.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    )}
                    {c.certificate_url && (
                      <a href={c.certificate_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-purple-600 hover:underline flex-shrink-0">Certificate</a>
                    )}
                  </div>
                )
              })}
            {courseFilter === 'expiring' && externalCourses.filter(c => {
              if (!c.expiry_date) return false
              const days = differenceInDays(new Date(c.expiry_date), new Date())
              return days < 0 || days <= 30
            }).length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">No expiring or expired training records.</div>
            )}
          </div>
        </div>
      )}

      {/* Module viewer modal */}
      {activeModule && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setActiveModule(null)} />
            <div className="relative bg-white rounded-2xl shadow-modal w-full max-w-2xl z-10">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{activeModule.icon}</span>
                  <div>
                    <h2 className="font-semibold text-slate-900">{activeModule.title}</h2>
                    <p className="text-xs text-slate-400">{activeModule.duration} · {activeModule.sections.length} sections</p>
                  </div>
                </div>
                <button onClick={() => setActiveModule(null)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Section progress */}
              <div className="px-6 py-3 border-b border-slate-50 flex gap-1.5">
                {activeModule.sections.map((_, i) => (
                  <button key={i} onClick={() => setActiveSection(i)}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${i <= activeSection ? 'bg-gold-500' : 'bg-slate-200'}`}
                    style={i <= activeSection ? { background: 'linear-gradient(90deg, #e8b130, #d4961a)' } : {}} />
                ))}
              </div>

              {/* Content */}
              <div className="px-6 py-6">
                <h3 className="font-bold text-slate-900 text-lg mb-4">
                  {activeSection + 1}. {activeModule.sections[activeSection].title}
                </h3>
                <div className="bg-slate-50 rounded-2xl p-5 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {activeModule.sections[activeSection].content}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                <button onClick={() => setActiveSection(Math.max(0, activeSection - 1))}
                  disabled={activeSection === 0}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-colors">
                  ← Previous
                </button>
                <p className="text-xs text-slate-400">{activeSection + 1} of {activeModule.sections.length}</p>
                {activeSection < activeModule.sections.length - 1 ? (
                  <button onClick={() => setActiveSection(activeSection + 1)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-900 transition-colors"
                    style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
                    Next →
                  </button>
                ) : (
                  <Button loading={loading} icon={<CheckCircle className="w-4 h-4" />}
                    onClick={() => completeModule(activeModule.id)}>
                    Mark as complete
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
