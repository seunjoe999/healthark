import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Shield, Star, Users, MessageCircle, Heart, Award,
  Home, Building2, Stethoscope, Clock, MapPin, Phone,
  Mail, CheckCircle, ArrowRight, ChevronDown, Briefcase,
  Trophy, Brain, Globe, Menu, X, Lock, Activity,
  BarChart3, FileText, GraduationCap, HeartHandshake,
  UserCheck, CalendarCheck, Quote, TrendingUp, Smile,
} from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';

// ── Typed ease curve ──────────────────────────────────────────────────────────
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ── Scroll helper ──────────────────────────────────────────────────────────────
function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Reveal wrapper ─────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-70px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 36 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

// ── Stagger variants ───────────────────────────────────────────────────────────
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
const cardAnim = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

// ── Premium icon — dark sections (glowing, deep) ───────────────────────────────
function PremiumIcon({
  icon: Icon, color, size = 22,
}: { icon: React.ElementType; color: string; size?: number }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: 56, height: 56 }}>
      {/* soft halo behind */}
      <div
        className="absolute rounded-2xl blur-xl"
        style={{
          inset: 4,
          background: color,
          opacity: 0.28,
        }}
      />
      {/* container */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: 56, height: 56,
          borderRadius: 16,
          background: `linear-gradient(145deg, ${color}28, ${color}0c)`,
          border: `1px solid ${color}42`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.09), 0 4px 18px ${color}20`,
        }}
      >
        <Icon
          size={size}
          style={{ color, filter: `drop-shadow(0 2px 7px ${color}cc)` }}
        />
      </div>
    </div>
  );
}

// ── Clean icon — light / white sections ───────────────────────────────────────
function CleanIcon({
  icon: Icon, color, size = 20,
}: { icon: React.ElementType; color: string; size?: number }) {
  return (
    <div
      className="flex items-center justify-center flex-shrink-0"
      style={{
        width: 48, height: 48,
        borderRadius: 13,
        background: `${color}14`,
        border: `1.5px solid ${color}28`,
        boxShadow: `0 2px 10px ${color}18`,
      }}
    >
      <Icon size={size} style={{ color }} />
    </div>
  );
}

// ── Animated counter ───────────────────────────────────────────────────────────
function useCounter(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  useEffect(() => {
    if (!inView) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(elapsed / duration, 1);
      setCount(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target, duration]);
  return { count, ref };
}

function StatCounter({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const { count, ref } = useCounter(target);
  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl md:text-4xl font-extrabold tabular-nums mb-1" style={{ color: '#1a6bb5' }}>
        {count}{suffix}
      </div>
      <div className="text-slate-500 text-sm font-medium tracking-wide">{label}</div>
    </div>
  );
}

// ── Data ───────────────────────────────────────────────────────────────────────
const CORE_SERVICES = [
  {
    title: 'Supported Living',
    Icon: Home,
    color: '#1a6bb5',
    description: 'Independent living in individual properties with flexible support levels, shared living connecting individuals in semi-independent arrangements, and stepping-stone accommodation offering stability during transitions.',
    features: ['Cluster & shared living', 'Apartment living', 'Stepping-stone accommodation', 'Skills development', 'Community integration'],
    image: '/values.png',
  },
  {
    title: 'Domiciliary Care',
    Icon: HeartHandshake,
    color: '#0891b2',
    description: 'Flexible care from 30 minutes to 24 hours, delivered in the comfort of your own home. We assist with personal hygiene, medication reminders, meal preparation, community engagement, and housekeeping.',
    features: ['30 minutes to 24-hour care', 'Personal hygiene with dignity', 'Medication reminders', 'Meal prep & grocery shopping', 'Community engagement'],
    image: '/eol.png',
  },
  {
    title: 'Respite Care',
    Icon: CalendarCheck,
    color: '#059669',
    description: 'Short or long-term care breaks for families and primary caregivers — available without contracts. We step in so those who care for loved ones can rest, recharge, and attend to their own wellbeing.',
    features: ['Short & long-term breaks', 'No contract required', 'Emergency respite', 'Family carer relief', 'Smooth handover process'],
    image: '/values.png',
  },
  {
    title: 'Live-In Care',
    Icon: UserCheck,
    color: '#7c3aed',
    description: '24-hour personalised in-home care for individuals requiring continuous support. A dedicated, fully trained carer lives with you, providing the highest level of one-to-one care without the need for residential placement.',
    features: ['24/7 dedicated carer', 'One-to-one personal care', 'Hospital avoidance', 'Maximum independence', 'Family peace of mind'],
    image: '/eol.png',
  },
];

const PROVIDER_AREAS = [
  'Complex Mental Health', 'Learning Disabilities', 'Autism Spectrum Disorders',
  'Drug & Alcohol Misuse', 'Physical Complex Health', 'ADHD',
  'Acquired Brain Injury', 'Physical Disabilities', 'Court of Protection DOLs',
  'Elderly Care', 'End of Life Care', 'Respite Care', 'Live In Care', 'Private & Local Authority',
];

const AGENCY_SETTINGS = [
  'Nursing Homes', 'Residential Homes', 'Care Homes', 'Hospices',
  'Hospitals', 'Mental Health Services', 'Learning Disabilities Services',
  'Supported Living', 'Domiciliary Care', 'Private & Local',
];

const HEALTH_CONDITIONS = [
  'Motor Neurone Disease', 'Cerebral Palsy', 'Dyspraxia', 'Dementia',
  "Down's Syndrome", 'Peg Feed Care', 'Tracheostomy Care', 'Palliative Care',
  'Ventilation & Breathing Support', 'Bowel Management', 'Catheter Care',
  "Huntingdon's Chorea", 'Multiple Sclerosis', "Parkinson's Disease",
];

const WHY_US = [
  { Icon: Trophy, color: '#d97706', title: 'CQC Rated Good', desc: 'Inspected and rated Good by the Care Quality Commission — your assurance of safe, effective, high-quality care.' },
  { Icon: Heart, color: '#e11d48', title: 'Person-Centred', desc: 'Every care plan is built around the individual — their values, preferences, and life goals, never a one-size-fits-all template.' },
  { Icon: Brain, color: '#7c3aed', title: 'PBS Methodology', desc: 'We use Positive Behaviour Support to improve quality of life and reduce restrictive practices for people with complex needs.' },
  { Icon: Clock, color: '#1a6bb5', title: '24/7 Support', desc: "Our teams are available around the clock, every day of the year — because care needs don't follow a 9-to-5 schedule." },
  { Icon: UserCheck, color: '#059669', title: 'Vetted Staff', desc: 'All staff are DBS-checked, trained to Care Certificate standard, and matched to each service user\'s individual needs.' },
  { Icon: MapPin, color: '#0891b2', title: 'Manchester & Warrington', desc: 'Rooted in Greater Manchester and Warrington, with local knowledge and strong community connections.' },
];

const VALUES = [
  { title: 'Privacy', Icon: Lock, color: '#7c3aed', description: 'The right of individuals to be left alone and free from intrusion into their affairs, taken into account in the formulation of all care plans.' },
  { title: 'Dignity', Icon: Star, color: '#d97706', description: 'All individuals, whatever their circumstances, have the right to be treated with dignity and respect in every single interaction.' },
  { title: 'Anti-Discrimination', Icon: Users, color: '#059669', description: 'We respect all clients regardless of age, disability, gender, marital status, sexual orientation, culture, religion or nationality.' },
  { title: 'Communication', Icon: MessageCircle, color: '#1a6bb5', description: 'Clients have the right to be fully informed on all aspects of their care. Methods are tailored and appropriate to each individual.' },
  { title: 'Independence', Icon: Award, color: '#e11d48', description: 'We encourage service users to make their own choices and remain as independent as possible while receiving the support they need.' },
  { title: 'Person-Centred', Icon: Heart, color: '#0891b2', description: 'Every care plan is built around the individual — their values, preferences, desires, and goals — never a one-size-fits-all approach.' },
];

const ACCOMMODATION = [
  {
    title: 'Cluster / Shared Living',
    Icon: Home, color: '#1a6bb5',
    description: 'Service users benefit from their own private space while socialising with peers and sharing communal areas — the best of both worlds.',
    features: ['Private bedroom & bathroom', 'Shared communal lounges', 'Social peer support', 'Shared household costs'],
  },
  {
    title: 'Apartment Living',
    Icon: Building2, color: '#0891b2',
    description: 'A balance of privacy and social opportunity. Self-contained apartments with the freedom to choose when to engage with shared spaces.',
    features: ['Self-contained apartment', 'Optional shared spaces', 'Maximum independence', 'Housing partnership developed'],
  },
  {
    title: 'Stepping-Stone',
    Icon: TrendingUp, color: '#059669',
    description: 'Designed to provide stability while transitioning to long-term solutions, helping develop the skills needed to live independently.',
    features: ['Transition planning support', 'Skills development', 'Structured progression', 'Move-on support'],
  },
];

const TESTIMONIALS = [
  { quote: "The team at Comprehensive Care transformed my son's life. He has gone from struggling daily to living independently with just the right level of support. We couldn't be more grateful.", author: 'Sarah M.', role: 'Parent of Service User', initials: 'SM', color: '#1a6bb5' },
  { quote: "I've worked with many care agencies over the years. Comprehensive Care stands out for how genuinely they listen to both staff and residents. The training and ongoing support are excellent.", author: 'James T.', role: 'Senior Support Worker', initials: 'JT', color: '#059669' },
  { quote: 'The referral process was smooth and the transition plan was thorough. They truly understand complex needs — our service user settled in within weeks.', author: 'Lisa H.', role: 'Social Worker, Salford Council', initials: 'LH', color: '#7c3aed' },
];

const CAREER_BENEFITS = [
  { Icon: Briefcase, color: '#1a6bb5', title: 'Competitive Pay', desc: 'Fair wages with regular reviews and overtime rates' },
  { Icon: GraduationCap, color: '#059669', title: 'Free Training', desc: 'Fully funded training from induction to specialist qualifications' },
  { Icon: Shield, color: '#7c3aed', title: 'Free DBS & Uniform', desc: 'We cover your DBS check and provide your uniform at no cost' },
  { Icon: Clock, color: '#0891b2', title: 'Regular Shifts', desc: 'Consistent shifts — full-time, part-time, and bank hours available' },
  { Icon: Heart, color: '#e11d48', title: 'Ongoing Support', desc: 'Dedicated supervision, mentoring, and a team that genuinely cares' },
];

const HUB_FEATURES = [
  { Icon: FileText, color: '#1a6bb5', text: 'Real-time care plans and risk assessments' },
  { Icon: Activity, color: '#059669', text: 'Digital medication administration records (MAR)' },
  { Icon: BarChart3, color: '#7c3aed', text: 'Outcomes tracking and quality monitoring' },
  { Icon: Lock, color: '#0891b2', text: 'Secure, GDPR-compliant record management' },
  { Icon: Users, color: '#d97706', text: 'Staff scheduling, training, and compliance tracking' },
];

// ── Main Component ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', position: 'Care Assistant', message: '' });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/public/apply', form);
      setSubmitted(true);
      toast.success('Application submitted successfully!');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error : undefined;
      toast.error(msg || 'Failed to submit application');
    }
    setLoading(false);
  };

  const navLinks = [
    { label: 'About Us', id: 'about' },
    { label: 'Our Services', id: 'services' },
    { label: 'Our Specialism', id: 'specialisms' },
    { label: 'Values', id: 'values' },
    { label: 'Vacancies', id: 'careers' },
    { label: 'Contact Us', id: 'contact' },
  ];

  const NAV_BG = scrolled ? 'rgba(10,22,42,0.97)' : 'transparent';
  const NAV_BORDER = scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent';

  return (
    <div className="min-h-screen font-sans overflow-x-hidden bg-white text-slate-800">

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{ background: NAV_BG, borderBottom: NAV_BORDER, backdropFilter: scrolled ? 'blur(18px)' : 'none' }}
      >
        <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3">
            <img src="/cc-icon.jpg" alt="Comprehensive Care" className="w-10 h-10 rounded-xl object-contain"
              style={{ border: '1.5px solid rgba(26,107,181,0.4)' }} />
            <div className="leading-tight">
              <span className="block text-sm font-extrabold tracking-tight text-white">Comprehensive Care</span>
              <span className="block text-[9px] font-bold tracking-widest uppercase" style={{ color: '#e8b130' }}>Your Care · Our Priority</span>
            </div>
          </button>

          <div className="hidden lg:flex items-center gap-0.5">
            {navLinks.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)}
                className="px-3.5 py-2 text-sm font-medium rounded-lg text-white/70 hover:text-white hover:bg-white/[0.08] transition-all duration-150">
                {l.label}
              </button>
            ))}
            <button onClick={() => scrollTo('contact')}
              className="ml-4 px-5 py-2.5 text-white text-sm font-bold rounded-xl transition-all duration-150"
              style={{ background: '#1a6bb5', boxShadow: '0 4px 14px rgba(26,107,181,0.35)' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1558a0')}
              onMouseLeave={e => (e.currentTarget.style.background = '#1a6bb5')}>
              Make a Referral
            </button>
            <a href="/login"
              className="ml-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition-all duration-150"
              style={{ border: '1px solid rgba(255,255,255,0.2)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              Staff Login
            </a>
          </div>

          <button className="lg:hidden p-2 text-white" onClick={() => setMenuOpen(v => !v)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }}
              className="lg:hidden overflow-hidden"
              style={{ background: 'rgba(10,22,42,0.98)', backdropFilter: 'blur(18px)', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-1">
                {navLinks.map(l => (
                  <button key={l.id} onClick={() => { scrollTo(l.id); setMenuOpen(false); }}
                    className="text-left px-4 py-3 text-sm font-semibold text-white/70 hover:text-white hover:bg-white/[0.07] rounded-xl transition-all">
                    {l.label}
                  </button>
                ))}
                <button onClick={() => { scrollTo('contact'); setMenuOpen(false); }}
                  className="mt-3 px-5 py-3 text-white text-sm font-bold rounded-xl text-center"
                  style={{ background: '#1a6bb5' }}>
                  Make a Referral
                </button>
                <a href="/login" className="px-5 py-3 text-white text-sm font-semibold rounded-xl text-center"
                  style={{ border: '1px solid rgba(255,255,255,0.18)' }}>
                  Staff Login
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <header className="relative min-h-screen flex items-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 50%, #0a2040 100%)' }}>
        {/* Dot grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        {/* Blue glow */}
        <motion.div animate={{ scale: [1, 1.18, 1], opacity: [0.12, 0.22, 0.12] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute rounded-full pointer-events-none"
          style={{ top: '20%', right: '15%', width: 480, height: 480, background: '#1a6bb5', filter: 'blur(110px)' }} />
        {/* Gold glow */}
        <motion.div animate={{ scale: [1, 1.12, 1], opacity: [0.07, 0.14, 0.07] }}
          transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          className="absolute rounded-full pointer-events-none"
          style={{ bottom: '20%', left: '10%', width: 360, height: 360, background: '#e8b130', filter: 'blur(100px)' }} />
        {/* Left accent line */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #1a6bb5, transparent)' }} />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-28 pb-20 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              {/* CQC badge */}
              <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}
                className="inline-flex items-center gap-2.5 rounded-full px-4 py-2 mb-8"
                style={{ background: 'rgba(26,107,181,0.12)', border: '1px solid rgba(26,107,181,0.35)' }}>
                <Shield size={13} style={{ color: '#60a5fa' }} />
                <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#93c5fd' }}>
                  CQC Registered · Rated Good
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1 initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
                className="font-extrabold leading-[1.05] tracking-tight mb-6"
                style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)' }}>
                <span className="text-white">The Provider Of Choice</span><br />
                <span className="text-white/55 font-bold" style={{ fontSize: '70%' }}>
                  For Domiciliary and Supported Living Services
                </span>
              </motion.h1>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.22, duration: 0.5 }}
                className="w-16 h-[3px] rounded-full mb-6" style={{ background: '#1a6bb5' }} />

              <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.28 }}
                className="text-lg leading-relaxed mb-10 max-w-lg" style={{ color: 'rgba(255,255,255,0.62)' }}>
                Comprehensive Care is a CQC-registered provider delivering outstanding, person-centred domiciliary care and supported living services across Greater Manchester and Warrington.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.36 }}
                className="flex flex-wrap gap-3">
                <button onClick={() => scrollTo('contact')}
                  className="px-7 py-3.5 text-white font-bold text-sm rounded-xl flex items-center gap-2 transition-all duration-150"
                  style={{ background: '#1a6bb5', boxShadow: '0 4px 18px rgba(26,107,181,0.4)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#1558a0'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#1a6bb5'; e.currentTarget.style.transform = ''; }}>
                  Make a Referral <ArrowRight size={15} />
                </button>
                <button onClick={() => scrollTo('services')}
                  className="px-7 py-3.5 text-white font-semibold text-sm rounded-xl transition-all duration-150"
                  style={{ border: '1px solid rgba(255,255,255,0.2)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.transform = ''; }}>
                  Our Services
                </button>
                <button onClick={() => scrollTo('careers')}
                  className="px-7 py-3.5 font-semibold text-sm rounded-xl transition-all duration-150"
                  style={{ border: '1px solid rgba(232,177,48,0.35)', color: '#fbbf24' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(232,177,48,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.transform = ''; }}>
                  Vacancies
                </button>
              </motion.div>
            </div>

            {/* Right — logo card + badges */}
            <motion.div initial={{ opacity: 0, x: 36 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.75, delay: 0.28, ease: EASE }}
              className="hidden lg:flex flex-col items-center gap-7">
              <div className="relative">
                <div className="absolute -inset-8 rounded-3xl pointer-events-none"
                  style={{ background: 'rgba(26,107,181,0.12)', filter: 'blur(28px)' }} />
                <div className="relative rounded-3xl p-8 shadow-2xl"
                  style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <img src="/cc-logo.jpg" alt="Comprehensive Care" className="w-72 object-contain rounded-xl" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                {[
                  { src: '/cqc-good.jpg', alt: 'CQC Good' },
                  { src: '/ico-logo.png', alt: 'ICO' },
                  { src: '/pqs-logo.png', alt: 'PQS' },
                ].map(b => (
                  <div key={b.alt} className="rounded-2xl p-3"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <img src={b.src} alt={b.alt} className="h-12 object-contain rounded-lg" />
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div animate={{ y: [0, 7, 0] }} transition={{ duration: 2, repeat: Infinity }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 cursor-pointer"
            onClick={() => scrollTo('stats')}>
            <ChevronDown size={22} style={{ color: 'rgba(255,255,255,0.2)' }} />
          </motion.div>
        </div>
      </header>

      {/* ── Stats bar ───────────────────────────────────────────────────────── */}
      <section id="stats" className="py-14 bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-10 divide-x divide-slate-100">
          <StatCounter target={14} suffix="+" label="Care Specialisms" />
          <StatCounter target={24} suffix="/7" label="Support Available" />
          <StatCounter target={10} suffix="+" label="Agency Settings" />
          <StatCounter target={100} suffix="%" label="Person-Centred" />
        </div>
      </section>

      {/* ── About ───────────────────────────────────────────────────────────── */}
      <section id="about" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <Reveal>
              <div>
                <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#1a6bb5' }}>Who We Are</p>
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-6">
                  Warm, Friendly &<br />
                  <span style={{ color: '#1a6bb5' }}>Compassionate Care</span>
                </h2>
                <p className="text-slate-600 leading-relaxed mb-5">
                  Comprehensive Care is a CQC-registered provider of domiciliary care and supported living services, dedicated to supporting individuals with learning disabilities, autism, complex mental health conditions, substance misuse issues, and elderly populations.
                </p>
                <p className="text-slate-600 leading-relaxed mb-8">
                  We implement <strong className="text-slate-800">Positive Behaviour Support (PBS)</strong> as our primary care methodology — improving quality of life, building skills, and reducing restrictive practices for every person we support.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { Icon: Globe, color: '#1a6bb5', label: 'Community Engagement' },
                    { Icon: Users, color: '#059669', label: 'One-on-One Support' },
                    { Icon: BarChart3, color: '#7c3aed', label: 'Budgeting Support' },
                    { Icon: Stethoscope, color: '#0891b2', label: 'Annual Health Checks' },
                    { Icon: FileText, color: '#d97706', label: 'One-Page Profiles' },
                    { Icon: Smile, color: '#e11d48', label: 'Social Activities' },
                  ].map(a => (
                    <div key={a.label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 bg-slate-50">
                      <CleanIcon icon={a.Icon} color={a.color} size={16} />
                      <span className="text-sm font-semibold text-slate-700">{a.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.12}>
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl rotate-1 pointer-events-none"
                  style={{ background: 'linear-gradient(135deg, rgba(26,107,181,0.08), rgba(232,177,48,0.06))' }} />
                <img src="/values.png" alt="Our Values" className="relative rounded-3xl w-full object-cover shadow-xl" />
                <div className="absolute -bottom-4 -left-4 rounded-2xl shadow-xl px-5 py-3 border"
                  style={{ background: '#fff', borderColor: 'rgba(26,107,181,0.2)' }}>
                  <p className="font-bold text-sm" style={{ color: '#1a6bb5' }}>Your Care · Our Priority</p>
                  <p className="text-xs text-slate-500 mt-0.5">CQC Registered Provider</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Core Services ───────────────────────────────────────────────────── */}
      <section id="services" style={{ background: '#f0f6ff' }} className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#1a6bb5' }}>What We Do</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Our Services</h2>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                We operate as both a direct care provider and a specialist staffing agency.
              </p>
            </div>
          </Reveal>

          <div className="space-y-8">
            {CORE_SERVICES.map((s, i) => (
              <motion.div key={s.title}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, delay: i * 0.06, ease: EASE }}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-shadow duration-300"
                style={{ borderLeft: `4px solid ${s.color}` }}
              >
                <div className="p-7 sm:p-9">
                  <div className="grid md:grid-cols-[auto_1fr_1fr] gap-6 md:gap-10 items-start">
                    {/* Icon + title */}
                    <div className="flex items-start gap-4 md:flex-col md:gap-3 md:w-52">
                      <CleanIcon icon={s.Icon} color={s.color} size={22} />
                      <div>
                        <h3 className="text-xl font-extrabold text-slate-900">{s.title}</h3>
                        <div className="w-8 h-[2px] rounded mt-1.5" style={{ background: s.color }} />
                      </div>
                    </div>
                    {/* Description */}
                    <p className="text-slate-600 leading-relaxed">{s.description}</p>
                    {/* Features */}
                    <ul className="space-y-2">
                      {s.features.map(f => (
                        <li key={f} className="flex items-center gap-2.5 text-sm text-slate-700 font-medium">
                          <CheckCircle size={15} style={{ color: s.color, flexShrink: 0 }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ───────────────────────────────────────────────────── */}
      <section className="py-24" style={{ background: '#0a1628' }}>
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#60a5fa' }}>Why Choose Us</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">What Sets Us Apart</h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
                We don't just provide care — we build relationships, develop skills, and genuinely improve lives.
              </p>
            </div>
          </Reveal>

          <motion.div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
            variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}>
            {WHY_US.map(w => (
              <motion.div key={w.title} variants={cardAnim}
                whileHover={{ y: -5 }} transition={{ duration: 0.18 }}
                className="group p-7 rounded-2xl cursor-default transition-colors duration-250"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${w.color}50`; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}>
                <PremiumIcon icon={w.Icon} color={w.color} size={20} />
                <h3 className="text-base font-extrabold text-white mt-5 mb-2">{w.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{w.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Specialism ──────────────────────────────────────────────────────── */}
      <section id="specialisms" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#1a6bb5' }}>Our Expertise</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Our Specialism</h2>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                From complex mental health to end of life care — specialist support across a wide range of needs, conditions, and settings.
              </p>
            </div>
          </Reveal>

          <div className="grid lg:grid-cols-3 gap-7">
            {[
              { Icon: Stethoscope, color: '#1a6bb5', title: 'Care Provider Areas', sub: 'Direct care across supported living & community settings', items: PROVIDER_AREAS, tagBg: 'rgba(26,107,181,0.08)', tagColor: '#1558a0', tagBorder: 'rgba(26,107,181,0.2)' },
              { Icon: Building2, color: '#0891b2', title: 'Staffing Settings', sub: 'Specialist staff placed across all care environments', items: AGENCY_SETTINGS, tagBg: 'rgba(8,145,178,0.08)', tagColor: '#0c7a9e', tagBorder: 'rgba(8,145,178,0.2)' },
              { Icon: Activity, color: '#059669', title: 'Conditions We Support', sub: 'Complex health conditions managed with specialist care', items: HEALTH_CONDITIONS, tagBg: 'rgba(5,150,105,0.08)', tagColor: '#047857', tagBorder: 'rgba(5,150,105,0.2)' },
            ].map((col, ci) => (
              <Reveal key={col.title} delay={ci * 0.08}>
                <div className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-full">
                  <div className="p-6 border-b border-slate-100" style={{ background: '#f8fafc' }}>
                    <CleanIcon icon={col.Icon} color={col.color} size={18} />
                    <h3 className="text-lg font-extrabold text-slate-900 mt-3">{col.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{col.sub}</p>
                  </div>
                  <div className="p-6">
                    <div className="flex flex-wrap gap-2">
                      {col.items.map(item => (
                        <span key={item} className="px-3 py-1.5 rounded-lg text-sm font-medium"
                          style={{ background: col.tagBg, color: col.tagColor, border: `1px solid ${col.tagBorder}` }}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Accommodation ───────────────────────────────────────────────────── */}
      <section className="py-24" style={{ background: '#0a1628' }}>
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#60a5fa' }}>Supported Living</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Accommodation Options</h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
                We offer a range of accommodation styles — designed to maximise independence, comfort, and community belonging.
              </p>
            </div>
          </Reveal>

          <motion.div className="grid md:grid-cols-3 gap-6"
            variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}>
            {ACCOMMODATION.map(acc => (
              <motion.div key={acc.title} variants={cardAnim}
                whileHover={{ y: -5 }} transition={{ duration: 0.18 }}
                className="p-7 rounded-2xl border transition-all duration-250"
                style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.07)` }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${acc.color}45`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}>
                <PremiumIcon icon={acc.Icon} color={acc.color} size={22} />
                <h3 className="text-lg font-extrabold text-white mt-5 mb-2">{acc.title}</h3>
                <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>{acc.description}</p>
                <ul className="space-y-2">
                  {acc.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.72)' }}>
                      <CheckCircle size={13} style={{ color: acc.color, filter: `drop-shadow(0 0 4px ${acc.color}88)`, flexShrink: 0 }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Values ──────────────────────────────────────────────────────────── */}
      <section id="values" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#1a6bb5' }}>What Drives Us</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Our Core Values</h2>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                Everything we do is guided by these principles — in every care plan, every interaction, and every decision.
              </p>
            </div>
          </Reveal>

          <motion.div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
            variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}>
            {VALUES.map(v => (
              <motion.div key={v.title} variants={cardAnim}
                whileHover={{ y: -4 }} transition={{ duration: 0.18 }}
                className="p-7 rounded-2xl border border-slate-100 bg-white hover:shadow-md transition-all duration-250">
                <CleanIcon icon={v.Icon} color={v.color} size={20} />
                <h3 className="text-base font-extrabold text-slate-900 mt-5 mb-2">{v.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{v.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── End of Life ─────────────────────────────────────────────────────── */}
      <section className="py-24" style={{ background: '#f0f6ff' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <Reveal>
              <div className="relative order-2 lg:order-1">
                <div className="absolute -inset-6 rounded-3xl pointer-events-none" style={{ background: 'rgba(225,29,72,0.06)', filter: 'blur(20px)' }} />
                <img src="/eol.png" alt="End of Life Care" className="relative rounded-2xl w-full object-cover shadow-xl max-h-96" />
                <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-lg px-5 py-3 border" style={{ borderColor: 'rgba(225,29,72,0.2)' }}>
                  <p className="font-bold text-sm" style={{ color: '#be123c' }}>Palliative & End of Life</p>
                  <p className="text-xs text-slate-500 mt-0.5">Compassionate support at every stage</p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.12}>
              <div className="order-1 lg:order-2">
                <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#be123c' }}>Compassionate Support</p>
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-6">
                  End of Life<br />
                  <span style={{ color: '#be123c' }}>& Palliative Care</span>
                </h2>
                <p className="text-slate-600 leading-relaxed mb-5">
                  Providing personalised care in the final year or months of life leads to a more meaningful experience — centred on what matters most to the individual and their family.
                </p>
                <p className="text-slate-600 leading-relaxed mb-8">
                  Our specialist team delivers compassionate end of life care that respects individuals' values, supports their families, and upholds dignity in every moment.
                </p>
                <ul className="space-y-3">
                  {['Ostomy Care', 'Palliative Care', 'Ventilation & Breathing Support', 'Bowel Management', 'Catheter Care'].map(s => (
                    <li key={s} className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#be123c' }} />
                      <span className="text-slate-700 font-medium">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────────── */}
      <section className="py-24" style={{ background: '#0a1628' }}>
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#60a5fa' }}>Feedback</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">What People Say</h2>
            </div>
          </Reveal>

          <motion.div className="grid md:grid-cols-3 gap-6"
            variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}>
            {TESTIMONIALS.map(t => (
              <motion.div key={t.author} variants={cardAnim}
                whileHover={{ y: -5 }} transition={{ duration: 0.18 }}
                className="p-7 rounded-2xl flex flex-col transition-all duration-250"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${t.color}45`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}>
                <Quote size={26} style={{ color: t.color, filter: `drop-shadow(0 2px 6px ${t.color}88)` }} className="mb-5 flex-shrink-0" />
                <p className="text-sm leading-relaxed mb-6 flex-1 italic" style={{ color: 'rgba(255,255,255,0.65)' }}>{t.quote}</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ background: t.color }}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{t.author}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Accreditations ──────────────────────────────────────────────────── */}
      <section className="py-16 bg-white border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-10">
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#1a6bb5' }}>Trusted & Regulated</p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">Recognised Standards</h2>
            </div>
          </Reveal>
          <div className="flex flex-wrap justify-center items-center gap-8">
            {[
              { src: '/cqc-good.jpg', label: 'CQC Rated Good' },
              { src: '/cqc-logo.jpg', label: 'Care Quality Commission' },
              { src: '/ico-logo.png', label: "Information Commissioner's Office" },
              { src: '/pqs-logo.png', label: 'PQS SSIP Health & Safety' },
            ].map(b => (
              <motion.div key={b.label} className="text-center" whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-200 w-36">
                  <img src={b.src} alt={b.label} className="h-14 object-contain mx-auto rounded-lg" />
                </div>
                <p className="text-xs text-slate-500 font-medium mt-2.5 max-w-[8rem]">{b.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CompCare Hub ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <Reveal>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6"
                  style={{ background: 'rgba(26,107,181,0.08)', border: '1px solid rgba(26,107,181,0.2)' }}>
                  <Activity size={13} style={{ color: '#1a6bb5' }} />
                  <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#1a6bb5' }}>Digital Care Management</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-6">
                  Powered by<br />
                  <span style={{ color: '#1a6bb5' }}>CompCare Hub</span>
                </h2>
                <p className="text-slate-600 leading-relaxed mb-7">
                  Our care teams use CompCare Hub — our proprietary digital care management platform — ensuring every service user's records, care plans, medications, and risk assessments are always accurate and accessible.
                </p>
                <div className="space-y-3 mb-8">
                  {HUB_FEATURES.map(f => (
                    <div key={f.text} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50">
                      <CleanIcon icon={f.Icon} color={f.color} size={15} />
                      <span className="text-sm font-semibold text-slate-700">{f.text}</span>
                    </div>
                  ))}
                </div>
                <a href="/login"
                  className="inline-flex items-center gap-2 px-7 py-3.5 text-white font-bold rounded-xl transition-all duration-150"
                  style={{ background: '#1a6bb5', boxShadow: '0 4px 14px rgba(26,107,181,0.3)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#1558a0'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#1a6bb5'; }}>
                  Staff Login → CompCare Hub <ArrowRight size={15} />
                </a>
              </div>
            </Reveal>

            <Reveal delay={0.12}>
              <div className="relative">
                <div className="absolute -inset-8 rounded-3xl pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(26,107,181,0.12), transparent 70%)' }} />
                <div className="relative rounded-2xl p-6 shadow-2xl border border-slate-200" style={{ background: '#0f172a' }}>
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <div className="ml-4 flex-1 rounded-full h-6 flex items-center px-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>compcarehub.onrender.com</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-xl p-4 border" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.07)' }}>
                      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#60a5fa' }}>Dashboard</p>
                      <div className="grid grid-cols-3 gap-2">
                        {['17 Residents', '16 Staff', '2 Homes'].map(s => (
                          <div key={s} className="rounded-xl p-3 text-center border" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.05)' }}>
                            <p className="text-white text-xs font-bold">{s}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl p-4 border" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.07)' }}>
                      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>Recent Activity</p>
                      {['Care plan updated · J. Smith', 'MAR signed · Room 4', 'Staff check-in · 08:00'].map(a => (
                        <div key={a} className="flex items-center gap-2.5 py-2 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#60a5fa' }} />
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Careers / Vacancies ─────────────────────────────────────────────── */}
      <section id="careers" style={{ background: '#f0f6ff' }} className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-14 items-start">
            <Reveal>
              <div className="lg:sticky lg:top-28">
                <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#1a6bb5' }}>Vacancies</p>
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-6">
                  Make a Real<br />
                  <span style={{ color: '#1a6bb5' }}>Difference Every Day</span>
                </h2>
                <p className="text-slate-600 leading-relaxed mb-8">
                  We're always looking for passionate, dedicated people to join the Comprehensive Care family. Whether you're experienced or just starting your career in care, we'd love to hear from you.
                </p>
                <div className="space-y-3">
                  {CAREER_BENEFITS.map(b => (
                    <div key={b.title} className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
                      <CleanIcon icon={b.Icon} color={b.color} size={18} />
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{b.title}</p>
                        <p className="text-xs text-slate-500">{b.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 p-5 rounded-xl border bg-white" style={{ borderColor: 'rgba(26,107,181,0.2)' }}>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Apply directly by phone or email:</p>
                  <a href="tel:01616676030" className="block text-sm font-bold mb-1" style={{ color: '#1a6bb5' }}>0161 6676 030</a>
                  <a href="mailto:recruitment@comprehensivecare.org.uk" className="block text-xs" style={{ color: '#1a6bb5' }}>recruitment@comprehensivecare.org.uk</a>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.12}>
              <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="px-8 py-7 border-b border-slate-100" style={{ background: '#f8fafc' }}>
                  <div className="flex items-center gap-3">
                    <CleanIcon icon={Briefcase} color="#1a6bb5" size={18} />
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">Apply to Work With Us</h3>
                      <p className="text-slate-500 text-xs mt-0.5">Our recruitment team will be in touch shortly.</p>
                    </div>
                  </div>
                </div>
                <div className="p-8">
                  {submitted ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                        style={{ background: 'rgba(5,150,105,0.1)' }}>
                        <CheckCircle size={30} style={{ color: '#059669' }} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Application Received!</h3>
                      <p className="text-slate-500 text-sm mb-8">Thank you. We'll review your details and be in touch shortly.</p>
                      <button onClick={() => setSubmitted(false)} className="text-sm font-semibold hover:underline" style={{ color: '#1a6bb5' }}>
                        Submit another application
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={apply} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">First Name *</label>
                          <input required placeholder="Jane"
                            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-800 font-medium text-sm outline-none transition-all"
                            style={{ focusBorderColor: '#1a6bb5' } as React.CSSProperties}
                            onFocus={e => { e.currentTarget.style.borderColor = '#1a6bb5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,107,181,0.1)'; }}
                            onBlur={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = ''; }}
                            value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Last Name *</label>
                          <input required placeholder="Smith"
                            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-800 font-medium text-sm outline-none transition-all"
                            onFocus={e => { e.currentTarget.style.borderColor = '#1a6bb5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,107,181,0.1)'; }}
                            onBlur={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = ''; }}
                            value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Email *</label>
                          <input required type="email" placeholder="jane@example.com"
                            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-800 font-medium text-sm outline-none transition-all"
                            onFocus={e => { e.currentTarget.style.borderColor = '#1a6bb5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,107,181,0.1)'; }}
                            onBlur={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = ''; }}
                            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Phone</label>
                          <input placeholder="07700 900000"
                            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-800 font-medium text-sm outline-none transition-all"
                            onFocus={e => { e.currentTarget.style.borderColor = '#1a6bb5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,107,181,0.1)'; }}
                            onBlur={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = ''; }}
                            value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Role Interested In</label>
                        <select className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-800 font-medium text-sm outline-none transition-all"
                          onFocus={e => { e.currentTarget.style.borderColor = '#1a6bb5'; }}
                          onBlur={e => { e.currentTarget.style.borderColor = ''; }}
                          value={form.position} onChange={e => setForm({ ...form, position: e.target.value })}>
                          <option value="Care Assistant">Care Assistant</option>
                          <option value="Senior Carer">Senior Carer</option>
                          <option value="Registered Nurse">Registered Nurse</option>
                          <option value="Support Worker">Support Worker</option>
                          <option value="Domestic Staff">Cleaning / Domestic Staff</option>
                          <option value="Kitchen Staff">Kitchen / Catering Staff</option>
                          <option value="Management">Management / Admin</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Message</label>
                        <textarea rows={3} placeholder="Tell us about yourself or ask any questions..."
                          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-800 font-medium text-sm outline-none resize-none transition-all"
                          onFocus={e => { e.currentTarget.style.borderColor = '#1a6bb5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,107,181,0.1)'; }}
                          onBlur={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = ''; }}
                          value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
                      </div>
                      <button type="submit" disabled={loading}
                        className="w-full text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-60"
                        style={{ background: '#1a6bb5', boxShadow: '0 4px 14px rgba(26,107,181,0.3)' }}
                        onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#1558a0'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#1a6bb5'; }}>
                        {loading ? (
                          <><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg> Submitting...</>
                        ) : <><span>Submit Application</span><ArrowRight size={16} /></>}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Contact ─────────────────────────────────────────────────────────── */}
      <section id="contact" className="py-24" style={{ background: '#0a1628' }}>
        <div className="max-w-5xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#60a5fa' }}>Get In Touch</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Contact Us</h2>
              <p className="text-lg max-w-lg mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Whether you're a family, a healthcare professional, or looking for work — we're here to help.
              </p>
            </div>
          </Reveal>

          {/* Contact cards */}
          <motion.div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
            variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }}>
            {[
              { Icon: Phone, color: '#1a6bb5', label: 'Main Line', value: '0161 6676 030', sub: 'Mon–Fri 9am–5pm' },
              { Icon: Phone, color: '#0891b2', label: 'Direct Line', value: '0161 843 0277', sub: 'Mon–Fri 9am–5pm' },
              { Icon: Mail, color: '#059669', label: 'General Enquiries', value: 'info@comprehensivecare.org.uk', sub: 'We reply within 24 hours' },
              { Icon: Mail, color: '#7c3aed', label: 'Recruitment', value: 'recruitment@comprehensivecare.org.uk', sub: 'CV & job enquiries' },
            ].map(c => (
              <motion.div key={c.label} variants={cardAnim}
                whileHover={{ y: -4 }} transition={{ duration: 0.18 }}
                className="p-5 rounded-2xl text-center transition-all duration-250"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${c.color}45`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}>
                <div className="flex justify-center mb-3">
                  <PremiumIcon icon={c.Icon} color={c.color} size={18} />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{c.label}</p>
                <p className="font-bold text-white text-sm mb-1 break-all leading-snug">{c.value}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{c.sub}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Office addresses */}
          <Reveal delay={0.08}>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {[
                { city: 'Manchester Office', address: 'Ivy Business Centre, Office 3-13\nCrown Street, Failsworth\nManchester M35 9BG' },
                { city: 'Warrington Office', address: 'Regus Cinnamon House, Office 204e\nCrab Lane, Fearnhead\nWarrington WA2 0XP' },
              ].map(o => (
                <div key={o.city} className="flex items-start gap-4 p-5 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <PremiumIcon icon={MapPin} color="#1a6bb5" size={16} />
                  <div>
                    <p className="font-bold text-white text-sm mb-1">{o.city}</p>
                    <p className="text-sm whitespace-pre-line" style={{ color: 'rgba(255,255,255,0.55)' }}>{o.address}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Referral CTA */}
          <Reveal delay={0.12}>
            <div className="rounded-2xl p-9 text-center"
              style={{ background: 'linear-gradient(135deg, rgba(26,107,181,0.12), rgba(26,107,181,0.06))', border: '1px solid rgba(26,107,181,0.25)' }}>
              <h3 className="text-2xl font-extrabold text-white mb-2">Ready to Make a Referral?</h3>
              <p className="mb-1 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Our assessment team will contact you within one working day.
              </p>
              <p className="text-xs mb-7" style={{ color: 'rgba(255,255,255,0.3)' }}>Mon–Fri 9am–5pm · Weekends & bank holidays closed</p>
              <div className="flex flex-wrap justify-center gap-3">
                <a href="tel:01616676030"
                  className="px-7 py-3.5 text-white font-bold rounded-xl flex items-center gap-2 transition-all duration-150"
                  style={{ background: '#1a6bb5', boxShadow: '0 4px 14px rgba(26,107,181,0.35)' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1558a0'}
                  onMouseLeave={e => e.currentTarget.style.background = '#1a6bb5'}>
                  <Phone size={15} /> 0161 6676 030
                </a>
                <a href="mailto:info@comprehensivecare.org.uk"
                  className="px-7 py-3.5 font-bold rounded-xl flex items-center gap-2 transition-all duration-150"
                  style={{ border: '1px solid rgba(26,107,181,0.45)', color: '#93c5fd' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,107,181,0.12)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <Mail size={15} /> Email Us
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="py-14 border-t" style={{ background: '#060e1c', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src="/cc-icon.jpg" alt="Comprehensive Care" className="w-10 h-10 rounded-xl object-contain"
                  style={{ border: '1.5px solid rgba(26,107,181,0.35)' }} />
                <div>
                  <p className="font-extrabold text-white text-sm">Comprehensive Care</p>
                  <p className="text-[9px] font-bold tracking-widest mt-0.5" style={{ color: '#e8b130' }}>YOUR CARE · OUR PRIORITY</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed max-w-xs mb-5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                A CQC-registered care provider and staffing agency delivering outstanding, person-centred care across Greater Manchester and Warrington.
              </p>
              <div className="flex items-center gap-3 mb-4">
                <img src="/cqc-good.jpg" alt="CQC Good" className="h-8 object-contain rounded-lg opacity-50" />
                <img src="/ico-logo.png" alt="ICO" className="h-8 object-contain opacity-50" />
                <img src="/pqs-logo.png" alt="PQS" className="h-8 object-contain rounded-lg opacity-50" />
              </div>
              <div className="flex gap-2">
                {[
                  { label: 'Facebook', path: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z' },
                  { label: 'Instagram', svg: true },
                ].map(s => (
                  <a key={s.label} href="#" target="_blank" rel="noopener noreferrer" aria-label={s.label}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(26,107,181,0.5)'; e.currentTarget.style.background = 'rgba(26,107,181,0.12)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}>
                    {s.svg ? (
                      <svg className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                        <rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.5)' }} fill="currentColor" viewBox="0 0 24 24"><path d={s.path} /></svg>
                    )}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <p className="text-white font-bold mb-4 text-xs uppercase tracking-widest">Services</p>
              <ul className="space-y-2 text-sm">
                {['Supported Living', 'Domiciliary Care', 'Respite Care', 'Live-In Care', 'End of Life Care', 'Staffing Agency'].map(s => (
                  <li key={s}>
                    <span className="cursor-default transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.4)' }}>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-white font-bold mb-4 text-xs uppercase tracking-widest">Contact</p>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="tel:01616676030" className="block hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }}>0161 6676 030</a>
                  <a href="tel:01618430277" className="block hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }}>0161 843 0277</a>
                </li>
                <li>
                  <a href="mailto:info@comprehensivecare.org.uk" className="block text-xs break-all hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }}>info@comprehensivecare.org.uk</a>
                  <a href="mailto:recruitment@comprehensivecare.org.uk" className="block text-xs break-all hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }}>recruitment@comprehensivecare.org.uk</a>
                </li>
                <li className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Manchester & Warrington<br />Mon–Fri 9am–5pm</li>
                <li>
                  <button onClick={() => scrollTo('careers')} className="text-xs hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }}>Submit CV</button>
                </li>
                <li>
                  <a href="/login" className="text-xs font-semibold hover:opacity-80 transition-colors" style={{ color: '#60a5fa' }}>
                    Staff Login (CompCare Hub) →
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-7 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs" style={{ borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)' }}>
            <p>&copy; {new Date().getFullYear()} Comprehensive Care Services Ltd. All rights reserved.</p>
            <p>Registered in England & Wales · CQC Registered Provider · ICO Registered</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
