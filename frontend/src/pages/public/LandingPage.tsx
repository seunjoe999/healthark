import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  CheckCircle, ArrowRight, ChevronDown, Plus,
  X, Menu, Star, MapPin, Phone, Mail, Clock,
  ShieldCheck, Lock, Database, FileCheck,
} from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';

const EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

/* ── Palette ────────────────────────────────────────────────────────────────── */
const NAVY = '#241654';
const NAVY_DARK = '#160C38';
const ORANGE = '#F0932F';
const PINK = '#D6247F';
const TEXT = '#1A1533';
const MUTED = '#6B6580';
const OFFWHITE = '#F8F7FB';
const BLACK = '#0A0A0A';
const YELLOW = '#FFCC00';

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };
const cardAnim = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

function useCounter(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  useEffect(() => {
    if (!inView) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target, duration]);
  return { count, ref };
}

function StatCounter({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const { count, ref } = useCounter(target);
  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl sm:text-4xl md:text-5xl font-black tabular-nums mb-1" style={{ color: NAVY }}>
        {count}{suffix}
      </div>
      <div className="text-xs sm:text-sm font-medium" style={{ color: MUTED }}>{label}</div>
    </div>
  );
}

/* ── Images ─────────────────────────────────────────────────────────────────── */
const IMG = {
  logo:  '/cc-logo.jpg',
  hero:  '/hero-care.jpg',
  card1: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&q=80&auto=format&fit=crop',
  card2: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&q=80&auto=format&fit=crop',
  card3: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=600&q=80&auto=format&fit=crop',
  feat1: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=700&q=80&auto=format&fit=crop',
  feat2: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=700&q=80&auto=format&fit=crop',
  feat3: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=700&q=80&auto=format&fit=crop',
  scale: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=900&q=80&auto=format&fit=crop',
  t1: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=120&q=80&auto=format&fit=crop&crop=face',
  t2: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&q=80&auto=format&fit=crop&crop=face',
  t3: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=120&q=80&auto=format&fit=crop&crop=face',
};

const TESTIMONIALS = [
  { quote: "We replaced three separate systems with CompCare Hub. Our staff spend 40% less time on paperwork and our last CQC inspection was the smoothest ever.", name: 'Sarah Mitchell', role: 'Registered Manager', home: 'Oakwood Care Home', img: IMG.t1 },
  { quote: "The MAR system alone was worth it. Controlled drug sign-offs, PRN records, stock counts, everything our pharmacist needs is right there.", name: 'James Okonkwo', role: 'Home Manager', home: 'Sunrise Lodge', img: IMG.t2 },
  { quote: "Families love the portal. They can see daily notes and activities without us making a single phone call. It's transformed our family relationships.", name: 'Patricia Donnelly', role: 'Director of Care', home: 'Ashfield Group', img: IMG.t3 },
];

const RESIDENT_MODULES = ['Care Plans', 'Daily Records', 'MAR', 'Medication Stock', 'Risk Assessments', 'Safeguarding', 'Incidents', 'Observations', 'Seizure Log', 'Bowel Chart', 'Family Portal', 'Resident Reviews', 'Fluid Intake', 'Bath Charts', 'Body Maps', 'Professional Visits', 'Assessments', 'Medicine Risk'];
const STAFF_MODULES = ['Rota', 'Clock In', 'Timesheets', 'Training', 'DBS Tracker', 'Supervision', 'Appraisals', 'Leave Management', 'Recruitment', 'Staff Messages', 'HR Records'];
const COMPLIANCE_MODULES = ['CQC Notifications', 'Audit Trail', 'Policies', 'Quality Records', 'AI Audit Reports', 'Maintenance', 'PPE', 'Invoicing', 'Tasks', 'Calendar', 'Noticeboard', 'Reports'];

const EXPLORE_CARDS = [
  { img: IMG.card1, label: 'Residential', title: 'Every resident profile, always up to date', desc: 'Care plans, MAR, risk assessments, daily records and family updates, all linked and accessible from any device.' },
  { img: IMG.card2, label: 'Staff & HR', title: 'Your team, organised and compliant', desc: 'Rota, timesheets, DBS tracking, training records and supervision notes, with automatic alerts before anything expires.' },
  { img: IMG.card3, label: 'CQC Compliance', title: 'Inspection-ready, every single day', desc: 'Incident reports, safeguarding concerns and a complete audit trail, with AI-generated compliance reports in seconds.' },
];

const FEATURE_SECTIONS = [
  {
    tag: 'Digital MAR', accent: ORANGE,
    title: 'Medication administration\nyour team can trust',
    body: "Paper MAR charts are a compliance risk. CompCare Hub's digital MAR lets carers record every medication in real time, with controlled drug witness sign-off, PRN logs and stock management built in.",
    bullets: ['Controlled drug witness signing, done digitally', 'PRN medication logs with reason and outcome', 'Stock count tracking and low-stock alerts', 'Full history: every dose, every carer, every time'],
    img: IMG.feat1, imgAlt: 'Nurse reviewing care records with an elderly resident',
  },
  {
    tag: 'Staff & HR', accent: PINK,
    title: 'From rota to DBS,\nall in one place',
    body: 'Managing a care team is complex. CompCare Hub brings your rota, timesheets, leave, DBS tracking, training records and supervision notes into one system, with automatic alerts before anything expires.',
    bullets: ['Visual rota builder with GPS clock-in verification', 'DBS and training expiry alerts sent automatically', 'Leave requests and approvals handled in the app', 'Staff performance matrix and appraisal records'],
    img: IMG.feat2, imgAlt: 'Care home staff team in a planning session', flip: true,
  },
  {
    tag: 'Audit & Reporting', accent: NAVY,
    title: 'CQC audit reports in\nminutes, not days',
    body: 'When an inspector arrives, you need to demonstrate quality care instantly. CompCare Hub generates a complete audit report from your live data in seconds, covering care plans, incidents, training, MAR and more.',
    bullets: ['AI-generated CQC audit report from live data', 'Full audit trail for every action across the home', 'Incident, safeguarding and complaint management', 'Exportable reports for inspectors and trustees'],
    img: IMG.feat3, imgAlt: 'Care manager reviewing compliance documentation',
  },
];

const SECURITY_POINTS = [
  { icon: Lock, q: 'How is our data encrypted?', a: 'All data is encrypted in transit using TLS and encrypted at rest in our database. Passwords are hashed, never stored in plain text, and every session is authenticated before any care record can be viewed or edited.' },
  { icon: ShieldCheck, q: 'Who can see resident and staff data?', a: 'Role-based access control means each user only sees what their role requires, a carer, a manager and a family member all get a different, deliberately limited view. Every login and every action is tied to an individual user.' },
  { icon: FileCheck, q: 'Is there an audit trail?', a: 'Yes. Every create, edit and deletion across the platform is logged with the user, timestamp and what changed, giving you a complete, tamper-evident history for CQC inspections and internal reviews.' },
  { icon: Database, q: 'What happens to our data if something goes wrong?', a: 'Your data is backed up automatically on a regular schedule and stored securely, so a device failure or accidental change never means lost records. Data handling follows UK GDPR principles throughout.' },
];

const FAQS = [
  { q: 'What types of care services do you support?', a: 'CompCare Hub is built for residential care homes, supported living services and home care providers of any size, from single-site homes to multi-home groups.' },
  { q: 'Can I get a demo of your platform?', a: "Yes, book a free 30-minute walkthrough tailored to your home. We'll show you the modules most relevant to your service and answer any questions live." },
  { q: 'How do I get started?', a: 'Start a free trial from the login page, or book a demo and our team will help you get your first residents, staff and care plans set up, usually within a day.' },
  { q: 'My account has been activated, how do I log in?', a: 'Head to the login page and sign in with the email and password your manager set up for you. You can switch to PIN login from your account settings once you\'re in.' },
];

/* ── Decorative confetti dots for the hero ───────────────────────────────────── */
function ConfettiDot({ delay, size, x, y, color, blur = 0 }: { delay: number; size: number; x: string; y: string; color: string; blur?: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ width: size, height: size, left: x, top: y, background: color, filter: blur ? `blur(${blur}px)` : undefined }}
      animate={{ y: [0, -14, 0], scale: [1, 1.08, 1] }}
      transition={{ duration: 5 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
}

/* ── Water + boat: the hero's bottom edge ripples, and the little boat
   sails and tilts as your mouse moves across the hero — riding the mouse
   like it's riding the waves. mx/my (each -1..1) are tracked on the whole
   hero so the boat reacts no matter where the cursor is, not just when
   it's directly over this decorative layer. ────────────────────────────── */
function useHeroMouse() {
  const heroRef = useRef<HTMLElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const handleMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set(Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width - 0.5) * 2)));
    my.set(Math.max(-1, Math.min(1, ((e.clientY - rect.top) / rect.height - 0.5) * 2)));
  };
  const handleLeave = () => { mx.set(0); my.set(0); };
  return { heroRef, mx, my, handleMove, handleLeave };
}

function WaterAndBoat({ mx, my }: { mx: ReturnType<typeof useMotionValue<number>>; my: ReturnType<typeof useMotionValue<number>> }) {
  const boatRotate = useSpring(useTransform(mx, [-1, 1], [-18, 18]), { stiffness: 60, damping: 12 });
  const boatX = useSpring(useTransform(mx, [-1, 1], [-140, 140]), { stiffness: 45, damping: 14 });
  const boatTilt = useSpring(useTransform(my, [-1, 1], [7, -7]), { stiffness: 45, damping: 14 });

  return (
    <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ height: 450, overflow: 'hidden' }}>
      <motion.svg className="absolute bottom-0 left-0" width="200%" height="70%" viewBox="0 0 2400 200" preserveAspectRatio="none"
        animate={{ x: [0, -1200] }} transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}>
        <path d="M0,110 C150,150 300,70 450,110 C600,150 750,70 900,110 C1050,150 1200,70 1350,110 C1500,150 1650,70 1800,110 C1950,150 2100,70 2250,110 C2325,130 2400,110 2400,110 L2400,200 L0,200 Z"
          fill={`${YELLOW}30`} />
        <path d="M1200,110 C1350,150 1500,70 1650,110 C1800,150 1950,70 2100,110 C2250,150 2400,70 2550,110 C2625,130 2700,110 2700,110 L2700,200 L1200,200 Z"
          fill={`${YELLOW}30`} />
      </motion.svg>
      <motion.svg className="absolute bottom-0 left-0" width="200%" height="52%" viewBox="0 0 2400 200" preserveAspectRatio="none"
        animate={{ x: [-1200, 0] }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}>
        <path d="M0,130 C200,90 400,170 600,130 C800,90 1000,170 1200,130 C1400,90 1600,170 1800,130 C2000,90 2200,170 2400,130 L2400,200 L0,200 Z"
          fill="rgba(255,255,255,0.14)" />
        <path d="M1200,130 C1400,90 1600,170 1800,130 C2000,90 2200,170 2400,130 C2600,90 2800,170 3000,130 L3000,200 L1200,200 Z"
          fill="rgba(255,255,255,0.14)" />
      </motion.svg>

      <motion.div className="absolute" style={{ left: '30%', bottom: '30%', x: boatX, rotate: boatRotate }}>
        <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{ rotate: boatTilt }}>
          <svg width="180" height="156" viewBox="0 0 52 46" aria-label="Boat sailing on water" role="img">
            <path d="M27 4 L27 30 L11 30 Z" fill={YELLOW} />
            <path d="M6 34 L46 34 L38 43 L14 43 Z" fill={YELLOW} />
          </svg>
        </motion.div>
      </motion.div>
    </div>
  );
}

function FaqItem({ q, a, defaultOpen = false }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b" style={{ borderColor: 'rgba(36,22,84,0.10)' }}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between gap-4 py-5 text-left">
        <span className="text-sm sm:text-base font-bold" style={{ color: TEXT }}>{q}</span>
        <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-transform"
          style={{ background: OFFWHITE, color: NAVY, transform: open ? 'rotate(45deg)' : 'none' }}>
          <Plus size={14} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }} className="overflow-hidden">
            <p className="text-sm leading-relaxed pb-5" style={{ color: MUTED }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SecurityItem({ icon: Icon, q, a, defaultOpen = false }: { icon: React.ElementType; q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1px solid rgba(36,22,84,0.08)' }}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-4 p-5 text-left">
        <span className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#EEEAF9', color: NAVY }}>
          <Icon size={20} />
        </span>
        <span className="flex-1 text-sm sm:text-base font-bold" style={{ color: TEXT }}>{q}</span>
        <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-transform"
          style={{ background: OFFWHITE, color: NAVY, transform: open ? 'rotate(45deg)' : 'none' }}>
          <Plus size={14} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }} className="overflow-hidden">
            <p className="text-sm leading-relaxed px-5 pb-5 pl-[76px]" style={{ color: MUTED }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoForm, setDemoForm] = useState({ name: '', email: '', phone: '', homeName: '' });
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const heroMouse = useHeroMouse();

  useEffect(() => {
    document.body.style.overflow = demoOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [demoOpen]);

  const submitDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    setDemoLoading(true);
    try {
      await api.post('/public/contact', {
        firstName: demoForm.name, email: demoForm.email, phone: demoForm.phone,
        message: `Walkthrough request from: ${demoForm.homeName || 'Not specified'}`,
      });
      setDemoSubmitted(true);
      toast.success("We'll be in touch within one working day!");
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error : undefined;
      toast.error(msg || 'Failed to send. Please try again.');
    }
    setDemoLoading(false);
  };

  const navLinks = [
    { label: 'Features', id: 'features' },
    { label: 'Modules', id: 'modules' },
    { label: 'Pricing', id: 'pricing' },
    { label: 'Testimonials', id: 'testimonials' },
  ];

  return (
    <div className="min-h-screen font-sans overflow-x-hidden" style={{ background: '#FFFFFF', color: TEXT }}>

      {/* ── Walkthrough / demo modal ──────────────────────────────────── */}
      <AnimatePresence>
        {demoOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: 'rgba(22,12,56,0.75)', backdropFilter: 'blur(12px)' }}
            onClick={e => { if (e.target === e.currentTarget) setDemoOpen(false); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ duration: 0.26, ease: EASE }}
              className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
              style={{ background: 'white' }}>
              <div className="relative h-32 overflow-hidden" style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_DARK})` }}>
                <ConfettiDot delay={0} size={40} x="8%" y="20%" color="rgba(240,147,47,0.35)" />
                <ConfettiDot delay={1} size={26} x="82%" y="55%" color="rgba(214,36,127,0.35)" />
                <button onClick={() => setDemoOpen(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors z-10">
                  <X size={14} className="text-white" />
                </button>
                <div className="absolute bottom-5 left-6 z-10">
                  <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>Free · No Commitment</p>
                  <h3 className="text-white text-xl font-black">See CompCare in Action</h3>
                </div>
              </div>
              <div className="p-6">
                {demoSubmitted ? (
                  <div className="text-center py-6">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#FDECC8' }}>
                      <CheckCircle size={26} style={{ color: ORANGE }} />
                    </div>
                    <h4 className="text-lg font-black mb-2" style={{ color: TEXT }}>You're booked in!</h4>
                    <p className="text-sm mb-5" style={{ color: MUTED }}>We'll be in touch within one working day to arrange your personalised walkthrough.</p>
                    <button onClick={() => { setDemoSubmitted(false); setDemoOpen(false); }} className="text-sm font-bold" style={{ color: NAVY }}>Close</button>
                  </div>
                ) : (
                  <form onSubmit={submitDemo} className="space-y-3">
                    <p className="text-sm mb-4" style={{ color: MUTED }}>A personalised 30-minute walkthrough tailored to your home. Free, no commitment.</p>
                    {[
                      { label: 'Your Name *', key: 'name', type: 'text', placeholder: 'Jane Smith', required: true },
                      { label: 'Work Email *', key: 'email', type: 'email', placeholder: 'jane@carehome.co.uk', required: true },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: MUTED }}>{f.label}</label>
                        <input required={f.required} type={f.type} placeholder={f.placeholder}
                          className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                          style={{ background: OFFWHITE, borderColor: 'rgba(36,22,84,0.14)', color: TEXT }}
                          value={demoForm[f.key as keyof typeof demoForm]}
                          onChange={e => setDemoForm({ ...demoForm, [f.key]: e.target.value })} />
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-3">
                      {[{ label: 'Phone', key: 'phone', placeholder: '07700 900000' }, { label: 'Care Home', key: 'homeName', placeholder: 'Sunrise Lodge' }].map(f => (
                        <div key={f.key}>
                          <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: MUTED }}>{f.label}</label>
                          <input type="text" placeholder={f.placeholder}
                            className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                            style={{ background: OFFWHITE, borderColor: 'rgba(36,22,84,0.14)', color: TEXT }}
                            value={demoForm[f.key as keyof typeof demoForm]}
                            onChange={e => setDemoForm({ ...demoForm, [f.key]: e.target.value })} />
                        </div>
                      ))}
                    </div>
                    <button type="submit" disabled={demoLoading}
                      className="w-full mt-2 py-3.5 rounded-full text-white font-bold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                      style={{ background: ORANGE }}>
                      {demoLoading
                        ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Sending...</>
                        : <>Book My Free Demo <ArrowRight size={15} /></>}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Navbar — pill-shaped, black & yellow ─────────────────────── */}
      <nav className="fixed top-3 sm:top-5 left-0 right-0 z-50 px-3 sm:px-6">
        <div className="max-w-6xl mx-auto rounded-full flex items-center justify-between px-4 sm:px-6"
          style={{ height: 118, background: BLACK, boxShadow: '0 8px 30px rgba(0,0,0,0.45)' }}>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3 flex-shrink-0 pl-1">
            <div className="flex items-center justify-center rounded-full overflow-hidden" style={{ width: 56, height: 56, background: 'white' }}>
              <img src={IMG.logo} alt="CompCare Hub" className="w-full h-full object-contain" />
            </div>
            <span className="hidden xs:block text-lg sm:text-xl font-black tracking-tight" style={{ color: YELLOW }}>CompCare Hub</span>
          </button>

          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)}
                className="px-4 py-2.5 text-base font-bold rounded-full transition-colors hover:bg-white/10 whitespace-nowrap" style={{ color: YELLOW }}>
                {l.label}
              </button>
            ))}
            <Link to="/careers" className="px-4 py-2.5 text-base font-bold rounded-full transition-colors hover:bg-white/10 whitespace-nowrap" style={{ color: YELLOW }}>
              Careers
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            <button onClick={() => setDemoOpen(true)} className="px-6 py-3.5 rounded-full text-base font-bold transition-transform hover:-translate-y-0.5 whitespace-nowrap" style={{ background: YELLOW, color: BLACK }}>
              Demo
            </button>
            <Link to="/login" className="px-6 py-3.5 rounded-full text-base font-semibold border-2 transition-colors hover:bg-white/10 whitespace-nowrap"
              style={{ color: YELLOW, borderColor: YELLOW }}>
              Login
            </Link>
          </div>

          <button className="md:hidden p-2 rounded-full flex-shrink-0" style={{ color: YELLOW }} onClick={() => setMenuOpen(v => !v)}>
            {menuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }} className="md:hidden overflow-hidden max-w-6xl mx-auto mt-2 rounded-3xl" style={{ background: BLACK }}>
              <div className="px-4 py-4 flex flex-col gap-1">
                {navLinks.map(l => (
                  <button key={l.id} onClick={() => { scrollTo(l.id); setMenuOpen(false); }}
                    className="text-left px-4 py-3 text-sm font-semibold rounded-xl hover:bg-white/5 transition-colors" style={{ color: YELLOW }}>{l.label}</button>
                ))}
                <Link to="/careers" onClick={() => setMenuOpen(false)} className="text-left px-4 py-3 text-sm font-semibold rounded-xl hover:bg-white/5 transition-colors" style={{ color: YELLOW }}>Careers</Link>
                <button onClick={() => { setDemoOpen(true); setMenuOpen(false); }}
                  className="mt-2 px-5 py-3.5 rounded-2xl text-sm font-bold text-center" style={{ background: YELLOW, color: BLACK }}>
                  Book a Demo
                </button>
                <Link to="/login" onClick={() => setMenuOpen(false)}
                  className="px-5 py-3.5 rounded-2xl text-sm font-semibold text-center border-2 mt-2" style={{ borderColor: YELLOW, color: YELLOW }}>
                  Log In
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Hero — black bg, yellow writing, text left / photo right ──── */}
      <header ref={heroMouse.heroRef} onMouseMove={heroMouse.handleMove} onMouseLeave={heroMouse.handleLeave}
        className="relative overflow-hidden" style={{ paddingTop: 200, paddingBottom: 140, background: BLACK }}>
        <WaterAndBoat mx={heroMouse.mx} my={heroMouse.my} />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative" style={{ zIndex: 1 }}>
          <div className="relative z-10">
            <Reveal>
              <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: YELLOW }}>Care Management Software</p>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-black leading-[1.08] tracking-tight mb-6" style={{ color: YELLOW }}>
                Care management software that helps you stay one step ahead
              </h1>
              <p className="text-sm sm:text-base leading-relaxed mb-8 max-w-md" style={{ color: 'rgba(255,255,255,0.7)' }}>
                CompCare Hub replaces paper records and disconnected tools with one complete platform covering care notes, medication, staff rotas, CQC compliance and family updates.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => setDemoOpen(true)}
                  className="px-7 py-3.5 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5"
                  style={{ background: YELLOW, color: BLACK, boxShadow: '0 10px 30px rgba(255,204,0,0.25)' }}>
                  Book a demo <ArrowRight size={15} />
                </button>
                <Link to="/login"
                  className="px-7 py-3.5 rounded-full text-sm font-bold flex items-center justify-center gap-2 border-2 transition-colors"
                  style={{ color: YELLOW, borderColor: YELLOW }}>
                  Start free trial
                </Link>
              </div>
            </Reveal>
          </div>

          <div className="relative">
            <ConfettiDot delay={0} size={26} x="4%" y="6%" color={YELLOW} />
            <ConfettiDot delay={1.4} size={16} x="90%" y="14%" color="rgba(255,255,255,0.6)" />
            <ConfettiDot delay={0.6} size={60} x="86%" y="70%" color={YELLOW} blur={2} />
            <ConfettiDot delay={2.1} size={14} x="2%" y="80%" color="rgba(255,255,255,0.6)" />
            <Reveal delay={0.15}>
              <div className="relative rounded-[2rem] overflow-hidden shadow-2xl" style={{ aspectRatio: '4/3', border: `2px solid ${YELLOW}33` }}>
                <img src={IMG.hero} alt="Care team using CompCare Hub" className="w-full h-full object-cover" />
              </div>
            </Reveal>
          </div>
        </div>

        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2.2, repeat: Infinity }}
          className="hidden sm:flex absolute bottom-6 left-1/2 -translate-x-1/2 flex-col items-center gap-1" style={{ color: `${YELLOW}88`, zIndex: 2 }}>
          <span className="text-[10px] font-semibold tracking-widest uppercase">Scroll</span>
          <ChevronDown size={15} />
        </motion.div>
      </header>

      {/* ── Trust strip ──────────────────────────────────────────── */}
      <section className="py-8" style={{ background: 'white' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <Reveal>
            <p className="text-center text-[11px] font-black uppercase tracking-widest mb-5" style={{ color: MUTED }}>
              Trusted by care providers across the UK
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {TESTIMONIALS.map(t => (
                <span key={t.home} className="text-sm sm:text-base font-bold" style={{ color: NAVY, opacity: 0.55 }}>{t.home}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Stats band ────────────────────────────────────────────── */}
      <section style={{ background: YELLOW, borderTop: '1px solid rgba(0,0,0,0.08)', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-10">
            {[
              { target: 70, suffix: '%', label: 'Less admin time' },
              { target: 50, suffix: '+', label: 'Care modules included' },
              { target: 500, suffix: '+', label: 'Residents managed' },
              { target: 30, suffix: 'min', label: 'Setup time' },
            ].map((s, i) => (
              <motion.div key={i} variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}>
                <StatCounter {...s} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Explore cards ─────────────────────────────────────────── */}
      <section className="py-16 sm:py-24" style={{ background: 'white' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal>
            <div className="text-center mb-10 sm:mb-14">
              <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: ORANGE }}>What We Offer</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4" style={{ color: NAVY }}>
                Built for providers who want real-time oversight
              </h2>
              <p className="text-sm sm:text-base max-w-2xl mx-auto" style={{ color: MUTED }}>
                Covering resident wellbeing, staff operations and compliance in one platform.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {EXPLORE_CARDS.map((card, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div className="rounded-3xl overflow-hidden group cursor-pointer" onClick={() => scrollTo('features')}>
                  <div className="relative overflow-hidden rounded-3xl" style={{ height: 190 }}>
                    <img src={card.img} alt={card.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <span className="absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1"
                      style={{ background: 'white', color: NAVY }}>
                      Explore <ArrowRight size={12} />
                    </span>
                  </div>
                  <div className="pt-5">
                    <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: ORANGE }}>{card.label}</p>
                    <h3 className="font-black text-base sm:text-lg mb-2 leading-snug" style={{ color: NAVY }}>{card.title}</h3>
                    <p className="text-xs sm:text-sm leading-relaxed" style={{ color: MUTED }}>{card.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature deep-dive ──────────────────────────────────────── */}
      <section id="features" style={{ background: OFFWHITE }} className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-16 sm:space-y-24">
          {FEATURE_SECTIONS.map((section, idx) => (
            <Reveal key={idx} delay={0.05}>
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-10 sm:gap-14 items-center ${section.flip ? 'md:[&>*:first-child]:order-2' : ''}`}>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: section.accent }}>{section.tag}</p>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-4 sm:mb-5 leading-tight whitespace-pre-line" style={{ color: NAVY }}>
                    {section.title}
                  </h3>
                  <p className="text-sm sm:text-base leading-relaxed mb-5 sm:mb-7" style={{ color: MUTED }}>{section.body}</p>
                  <ul className="space-y-3 mb-6 sm:mb-8">
                    {section.bullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-3 text-xs sm:text-sm" style={{ color: TEXT }}>
                        <CheckCircle size={15} className="flex-shrink-0 mt-0.5" style={{ color: section.accent }} />{b}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => setDemoOpen(true)}
                    className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full text-white text-xs sm:text-sm font-bold transition-transform hover:-translate-y-0.5"
                    style={{ background: NAVY }}>
                    See this in action <ArrowRight size={14} />
                  </button>
                </div>
                <div className="relative rounded-[2rem] p-5 sm:p-6" style={{ background: `${section.accent}1A` }}>
                  <div className="relative rounded-3xl overflow-hidden shadow-xl" style={{ aspectRatio: '4/3' }}>
                    <img src={section.img} alt={section.imgAlt} className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Scale — full-bleed navy block ─────────────────────────── */}
      <section className="py-16 sm:py-24 relative overflow-hidden" style={{ background: NAVY }}>
        <ConfettiDot delay={0.4} size={90} x="88%" y="10%" color="rgba(240,147,47,0.12)" blur={4} />
        <ConfettiDot delay={1.6} size={50} x="4%" y="70%" color="rgba(214,36,127,0.14)" blur={3} />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-10 items-center relative z-10">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-5 text-white">Designed to operate at scale</h2>
            <ul className="space-y-3 mb-8">
              {['Clear total cost of ownership', 'Lower cost per resident', 'Advanced incident management, as standard', 'Configurable workflows for every home', 'One partner, not just a provider'].map(b => (
                <li key={b} className="flex items-start gap-3 text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  <CheckCircle size={15} className="flex-shrink-0 mt-0.5" style={{ color: ORANGE }} />{b}
                </li>
              ))}
            </ul>
            <button onClick={() => setDemoOpen(true)}
              className="inline-block px-7 py-3.5 rounded-full text-sm font-bold transition-transform hover:-translate-y-0.5" style={{ background: ORANGE, color: NAVY_DARK }}>
              Book a demo with a group-level advisor
            </button>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rounded-[2rem] overflow-hidden shadow-2xl" style={{ aspectRatio: '4/3' }}>
              <img src={IMG.scale} alt="Care group leadership team" className="w-full h-full object-cover" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Module cloud ───────────────────────────────────────────── */}
      <section id="modules" className="py-16 sm:py-24" style={{ background: 'white' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal>
            <div className="text-center mb-10 sm:mb-14">
              <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: ORANGE }}>50+ Modules</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4" style={{ color: NAVY }}>One platform. Every module.</h2>
              <p className="text-sm sm:text-base max-w-xl mx-auto" style={{ color: MUTED }}>From seizure logs to staff appraisals: if it happens in a care home, we cover it.</p>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {[
              { title: 'Resident Care', modules: RESIDENT_MODULES, accent: NAVY, bg: '#EEEAF9', border: '#D6CDF0' },
              { title: 'Staff & HR', modules: STAFF_MODULES, accent: PINK, bg: '#FCE8F2', border: '#F5C2E0' },
              { title: 'Compliance & Ops', modules: COMPLIANCE_MODULES, accent: '#B5730F', bg: '#FDF1DC', border: '#F3D69B' },
            ].map(col => (
              <Reveal key={col.title} delay={0.08}>
                <div className="rounded-3xl p-5 sm:p-6 h-full" style={{ background: OFFWHITE, border: '1px solid rgba(36,22,84,0.06)' }}>
                  <h3 className="text-xs font-black uppercase tracking-widest mb-4 sm:mb-5" style={{ color: col.accent }}>{col.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    {col.modules.map(m => (
                      <span key={m} className="text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-full"
                        style={{ background: col.bg, color: col.accent, border: `1px solid ${col.border}` }}>{m}</span>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Safety & Security ─────────────────────────────────────── */}
      <section id="security" className="py-16 sm:py-24" style={{ background: OFFWHITE }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Reveal>
            <div className="text-center mb-10 sm:mb-14">
              <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: ORANGE }}>Safety & Security</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4" style={{ color: NAVY }}>Built to protect the data you're trusted with</h2>
              <p className="text-sm sm:text-base max-w-2xl mx-auto" style={{ color: MUTED }}>
                Resident and staff records are sensitive by nature. Here's how CompCare Hub keeps them safe.
              </p>
            </div>
          </Reveal>
          <div className="space-y-3">
            {SECURITY_POINTS.map((s, i) => (
              <Reveal key={s.q} delay={i * 0.06}>
                <SecurityItem icon={s.icon} q={s.q} a={s.a} defaultOpen={i === 0} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────────── */}
      <section id="testimonials" className="py-16 sm:py-24" style={{ background: NAVY }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal>
            <div className="text-center mb-10 sm:mb-14">
              <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: ORANGE }}>Trusted By</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 text-white">Real results from real homes</h2>
            </div>
          </Reveal>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} variants={cardAnim} className="rounded-3xl p-6 sm:p-7 flex flex-col"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex gap-0.5 mb-5">
                  {Array.from({ length: 5 }).map((_, s) => <Star key={s} size={13} fill={ORANGE} className="text-amber-400" />)}
                </div>
                <div className="pl-4 flex-1 mb-6" style={{ borderLeft: `3px solid ${PINK}` }}>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>"{t.quote}"</p>
                </div>
                <div className="flex items-center gap-3 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <img src={t.img} alt={t.name} className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover flex-shrink-0" style={{ border: `2px solid ${ORANGE}55` }} />
                  <div>
                    <p className="text-sm font-bold text-white">{t.name}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{t.role}</p>
                    <p className="text-xs" style={{ color: ORANGE }}>{t.home}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Case study ─────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24" style={{ background: 'white' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 sm:gap-14 items-center">
              <div className="relative rounded-3xl overflow-hidden order-2 md:order-1" style={{ height: 360 }}>
                <img src={IMG.t1} alt="Sarah Mitchell, Registered Manager at Oakwood Care Home" className="w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(22,12,56,0.75), transparent 55%)' }} />
                <div className="absolute bottom-5 left-5 right-5">
                  <p className="text-sm font-bold text-white">Sarah Mitchell</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>Registered Manager, Oakwood Care Home</p>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: ORANGE }}>Case Study</p>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-5 leading-tight" style={{ color: NAVY }}>
                  Why Oakwood Care Home made the switch
                </h2>
                <p className="text-sm sm:text-base leading-relaxed mb-6" style={{ color: MUTED }}>
                  "We replaced three separate systems with CompCare Hub. Our staff spend 40% less time on paperwork and our last CQC inspection was the smoothest ever."
                </p>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="rounded-2xl p-4" style={{ background: OFFWHITE }}>
                    <p className="text-2xl font-black" style={{ color: NAVY }}>40%</p>
                    <p className="text-xs" style={{ color: MUTED }}>Less time on paperwork</p>
                  </div>
                  <div className="rounded-2xl p-4" style={{ background: OFFWHITE }}>
                    <p className="text-2xl font-black" style={{ color: NAVY }}>3 → 1</p>
                    <p className="text-xs" style={{ color: MUTED }}>Systems replaced with one platform</p>
                  </div>
                </div>
                <button onClick={() => setDemoOpen(true)} className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white transition-transform hover:scale-105" style={{ background: NAVY }}>
                  Book a demo <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────── */}
      <section id="pricing" className="py-16 sm:py-24" style={{ background: OFFWHITE }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Reveal>
            <div className="text-center mb-10 sm:mb-14">
              <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: ORANGE }}>Pricing</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4" style={{ color: NAVY }}>Simple, transparent pricing</h2>
              <p className="text-sm sm:text-base max-w-md mx-auto" style={{ color: MUTED }}>No setup fees. No hidden costs. Cancel any time.</p>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            <Reveal delay={0}>
              <div className="rounded-3xl p-6 sm:p-8 flex flex-col h-full bg-white" style={{ border: '1px solid rgba(36,22,84,0.10)' }}>
                <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: MUTED }}>Starter</p>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-4xl sm:text-5xl font-black" style={{ color: NAVY }}>£99</span>
                  <span className="text-sm font-medium" style={{ color: MUTED }}>/month</span>
                </div>
                <p className="text-sm mb-6 sm:mb-7" style={{ color: MUTED }}>For single-site care homes</p>
                <ul className="space-y-3 flex-1 mb-7 sm:mb-8">
                  {['Up to 30 residents', 'All care & MAR modules', 'Staff management & rota', 'DBS & training tracking', 'Email support within 24 hours'].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm" style={{ color: TEXT }}>
                      <CheckCircle size={15} style={{ color: NAVY, flexShrink: 0 }} />{f}
                    </li>
                  ))}
                </ul>
                <Link to="/login" className="w-full py-3.5 rounded-full text-sm font-bold border-2 transition-all text-center" style={{ color: NAVY, borderColor: NAVY, background: 'white' }}>
                  Start Free Trial
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="rounded-3xl p-6 sm:p-8 relative overflow-hidden flex flex-col h-full shadow-xl" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_DARK} 100%)` }}>
                <div className="absolute top-5 sm:top-6 right-5 sm:right-6">
                  <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full" style={{ background: 'rgba(240,147,47,0.2)', color: ORANGE, border: '1px solid rgba(240,147,47,0.35)' }}>Most Popular</span>
                </div>
                <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Professional</p>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-4xl sm:text-5xl font-black text-white">£199</span>
                  <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>/month</span>
                </div>
                <p className="text-sm mb-6 sm:mb-7" style={{ color: 'rgba(255,255,255,0.5)' }}>For multi-home groups</p>
                <ul className="space-y-3 flex-1 mb-7 sm:mb-8">
                  {['Unlimited residents', 'Everything in Starter', 'Multi-home management', 'AI audit reports & analytics', 'Priority phone support'].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-white">
                      <CheckCircle size={15} style={{ color: ORANGE, flexShrink: 0 }} />{f}
                    </li>
                  ))}
                </ul>
                <Link to="/login" className="w-full py-3.5 rounded-full text-sm font-bold transition-all text-center block" style={{ background: ORANGE, color: NAVY_DARK }}>
                  Start Free Trial
                </Link>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.15}>
            <p className="text-center text-xs sm:text-sm mt-6 sm:mt-8" style={{ color: MUTED }}>
              Not sure which plan?{' '}
              <button onClick={() => setDemoOpen(true)} className="font-bold underline" style={{ color: NAVY }}>Request a free walkthrough</button>
              {' '}and we'll recommend the right one for your home.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24" style={{ background: 'white' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-10 sm:mb-12" style={{ color: NAVY }}>Frequently asked questions</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div>
              {FAQS.map((f, i) => <FaqItem key={f.q} q={f.q} a={f.a} defaultOpen={i === 0} />)}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 text-center relative overflow-hidden" style={{ background: NAVY }}>
        <ConfettiDot delay={0.2} size={70} x="6%" y="20%" color="rgba(240,147,47,0.12)" blur={3} />
        <ConfettiDot delay={1.1} size={44} x="92%" y="65%" color="rgba(214,36,127,0.14)" blur={2} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 relative z-10">
          <Reveal>
            <p className="text-xs font-black uppercase tracking-widest mb-4 sm:mb-5" style={{ color: ORANGE }}>Ready to get started?</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-4 sm:mb-5 leading-tight">
              Let's start the conversation
            </h2>
            <p className="text-sm sm:text-lg mb-8 sm:mb-10 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Over 30 minutes, we'll discuss your challenges and needs, while exploring how CompCare Hub can help you achieve your goals.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <button onClick={() => setDemoOpen(true)}
                className="px-7 sm:px-9 py-3.5 sm:py-4 rounded-full font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5"
                style={{ background: ORANGE, color: NAVY_DARK }}>
                Book a demo <ArrowRight size={16} />
              </button>
              <Link to="/login"
                className="px-7 sm:px-9 py-3.5 sm:py-4 rounded-full font-bold text-sm sm:text-base border-2 text-white transition-colors hover:bg-white/10"
                style={{ borderColor: 'rgba(255,255,255,0.32)' }}>
                Start free trial
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Careers ────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20" style={{ background: OFFWHITE }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Reveal>
            <div className="rounded-3xl p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-8" style={{ background: 'white', border: '1px solid rgba(36,22,84,0.08)' }}>
              <div className="text-center sm:text-left">
                <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: ORANGE }}>Careers</p>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2" style={{ color: NAVY }}>We're hiring compassionate carers</h2>
                <p className="text-sm sm:text-base max-w-md" style={{ color: MUTED }}>Join a care home team using CompCare Hub. See our open roles and apply in minutes.</p>
              </div>
              <Link to="/careers" className="flex-shrink-0 px-7 py-3.5 rounded-full font-bold text-sm text-white transition-transform hover:-translate-y-0.5" style={{ background: NAVY }}>
                View Careers <ArrowRight size={15} className="inline ml-1.5" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer style={{ background: NAVY_DARK }} className="pt-12 sm:pt-16 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 mb-10 sm:mb-12">

            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full flex items-center justify-center overflow-hidden" style={{ background: 'white' }}>
                  <img src={IMG.logo} alt="CompCare Hub" className="w-full h-full object-contain" />
                </div>
                <p className="text-sm font-black text-white">CompCare Hub</p>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
                The complete digital care management platform for CQC-regulated care homes and supported living providers across the UK.
              </p>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-widest mb-4 sm:mb-5 text-white">Product</p>
              <ul className="space-y-2.5 sm:space-y-3">
                {['Resident Care', 'Staff Management', 'CQC Compliance', 'Family Portal', 'Pricing'].map(l => (
                  <li key={l}><span className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>{l}</span></li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-widest mb-4 sm:mb-5 text-white">Company</p>
              <ul className="space-y-2.5 sm:space-y-3">
                {['About Us', 'Privacy Policy', 'Terms of Service', 'Support'].map(l => (
                  <li key={l}><span className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>{l}</span></li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-widest mb-4 sm:mb-5 text-white">Contact Us</p>
              <div className="space-y-3 mb-5">
                <div className="flex items-start gap-2.5">
                  <MapPin size={13} style={{ color: ORANGE, flexShrink: 0, marginTop: 2 }} />
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    Office 2-13 Ivy Business Centre,<br />Crown Street, Failsworth,<br />Manchester, M35 9BG
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone size={13} style={{ color: ORANGE, flexShrink: 0 }} />
                  <div>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.85)' }}>0161 667 6030</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.85)' }}>0161 843 0277</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail size={13} style={{ color: ORANGE, flexShrink: 0 }} />
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.85)' }}>info@comprehensivecare.org.uk</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail size={13} style={{ color: ORANGE, flexShrink: 0 }} />
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.85)' }}>recruitment@comprehensivecare.org.uk</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock size={13} style={{ color: ORANGE, flexShrink: 0 }} />
                  <div>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.85)' }}>Mon–Fri: 9:00 AM – 5:00 PM</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.85)' }}>Weekends & Bank Holidays: Closed</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setDemoOpen(true)}
                className="w-full py-3 text-xs sm:text-sm font-bold text-white rounded-full transition-opacity hover:opacity-90"
                style={{ background: 'rgba(240,147,47,0.12)', border: '1px solid rgba(240,147,47,0.25)' }}>
                Book a Demo
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 sm:pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <p className="text-xs text-center sm:text-left" style={{ color: 'rgba(255,255,255,0.4)' }}>
              © {new Date().getFullYear()} Comprehensive Care. All rights reserved. Registered in England and Wales.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
