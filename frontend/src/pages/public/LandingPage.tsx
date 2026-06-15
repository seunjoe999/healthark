import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Shield, Star, Users, MessageCircle, Heart, Award,
  Home, Building2, Stethoscope, Clock, MapPin, Phone,
  Mail, CheckCircle, ArrowRight, ChevronDown, Briefcase,
  Trophy, Brain, Globe, Menu, X, Lock, Activity,
  BarChart3, FileText, GraduationCap, HeartHandshake,
  UserCheck, CalendarCheck, Sparkles, Quote,
  TrendingUp, Smile, Target,
} from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';

// ── Scroll helper ──────────────────────────────────────────────────────────────
function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Reveal wrapper ─────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

// ── Stagger variants ───────────────────────────────────────────────────────────
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const cardAnim = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

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
      <div className="text-4xl md:text-5xl font-extrabold text-[#e8b130] mb-1 tabular-nums">
        {count}{suffix}
      </div>
      <div className="text-white/50 text-sm font-medium tracking-wide">{label}</div>
    </div>
  );
}

// ── Data ───────────────────────────────────────────────────────────────────────
const CORE_SERVICES = [
  {
    title: 'Supported Living',
    Icon: Home,
    accentColor: '#e8b130',
    borderTop: 'border-t-[#e8b130]',
    description:
      'Enabling people with complex needs to live in their own home with personalised 24/7 support tailored to their individual goals and aspirations.',
    features: ['Cluster & shared living', 'Apartment living', 'Step-down support', 'Skills development'],
  },
  {
    title: 'Domiciliary Care',
    Icon: HeartHandshake,
    accentColor: '#64748b',
    borderTop: 'border-t-slate-400',
    description:
      'Flexible care from 30 minutes to 24 hours, delivered in the comfort of your own home — personal hygiene, medication reminders, community engagement and more.',
    features: ['30 minutes to 24-hour care', 'Personal hygiene & dignity', 'Medication reminders', 'Meal prep & housekeeping'],
  },
  {
    title: 'Respite Care',
    Icon: CalendarCheck,
    accentColor: '#f59e0b',
    borderTop: 'border-t-amber-400',
    description:
      'Short-term, high-quality relief care for families and primary caregivers — giving everyone a well-deserved and refreshing break.',
    features: ['Short-term placements', 'Emergency respite', 'Family carer support', 'Smooth transitions'],
  },
  {
    title: 'Live-In Care',
    Icon: UserCheck,
    accentColor: '#6366f1',
    borderTop: 'border-t-indigo-500',
    description:
      'Round-the-clock, one-to-one dedicated support from a carer living in your home — the premium alternative to residential care.',
    features: ['24/7 dedicated carer', 'Hospital avoidance', 'Maximum independence', 'Family peace of mind'],
  },
];

const PROVIDER_AREAS = [
  'Complex Mental Health', 'Learning Disabilities', 'Autism Spectrum Disorders',
  'Drug & Alcohol Misuse', 'Physical Complex Health', 'ADHD',
  'Acquired Brain Injury', 'Physical Disabilities', 'Court of Protection DOLs',
  'Elderly Care', 'End of Life Care', 'Respite Care', 'Live In Care',
  'Private & Local Authority',
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
  { Icon: Trophy, title: 'CQC Rated Good', desc: 'Inspected and rated Good by the Care Quality Commission — your assurance of safe, effective, high-quality care.', gradient: 'from-amber-500 to-orange-500' },
  { Icon: Heart, title: 'Truly Person-Centred', desc: 'Every care plan is built around the individual — their values, preferences, and life goals, not a one-size-fits-all template.', gradient: 'from-rose-500 to-pink-600' },
  { Icon: Brain, title: 'PBS Methodology', desc: 'We use Positive Behaviour Support to improve quality of life and reduce restrictive practices for people with complex needs.', gradient: 'from-violet-500 to-purple-600' },
  { Icon: Clock, title: '24/7 Support', desc: "Our teams are available around the clock, every day of the year — because care needs don't follow a 9-to-5 schedule.", gradient: 'from-blue-500 to-cyan-600' },
  { Icon: UserCheck, title: 'Expert-Led Staffing', desc: 'All staff are DBS-checked, trained to Care Certificate standard, and matched to the specific needs of each service user.', gradient: 'from-emerald-500 to-teal-600' },
  { Icon: MapPin, title: 'Manchester & Warrington', desc: 'Operating across Greater Manchester and Warrington, with deep roots in the communities we serve.', gradient: 'from-[#e8b130] to-amber-500' },
];

const VALUES = [
  { title: 'Privacy', Icon: Lock, iconBg: 'bg-purple-500/10', iconColor: 'text-purple-400', description: 'The right of individuals to be left alone and free from intrusion into their affairs, taken into account in the formulation of all care plans.' },
  { title: 'Dignity', Icon: Star, iconBg: 'bg-[#e8b130]/10', iconColor: 'text-[#e8b130]', description: 'All individuals, whatever their circumstances, have the right to be treated with dignity and respect in every single interaction.' },
  { title: 'Anti-Discrimination', Icon: Users, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-400', description: 'We respect all clients regardless of age, disability, gender, marital status, sexual orientation, culture, religion or nationality.' },
  { title: 'Communication', Icon: MessageCircle, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-400', description: 'Clients have the right to be fully informed on all aspects of their care. Methods are tailored and appropriate to each individual.' },
  { title: 'Independence', Icon: Award, iconBg: 'bg-rose-500/10', iconColor: 'text-rose-400', description: 'We encourage service users to make their own choices and remain as independent as possible while receiving the support they need.' },
  { title: 'Person-Centred', Icon: Heart, iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-400', description: 'Every care plan is built around the individual — their values, preferences, desires, and goals — never a one-size-fits-all approach.' },
];

const ACCOMMODATION = [
  {
    title: 'Cluster / Shared Living',
    Icon: Home,
    iconBg: 'bg-[#e8b130]/10',
    iconColor: 'text-[#e8b130]',
    accentBorder: 'border-[#e8b130]/20 hover:border-[#e8b130]/50',
    description: 'Service users benefit from their own private space while socialising with peers and sharing communal areas — the best of both worlds.',
    features: ['Private bedroom & bathroom', 'Shared communal lounges', 'Social peer support', 'Shared household costs'],
  },
  {
    title: 'Apartment Living',
    Icon: Building2,
    iconBg: 'bg-slate-500/10',
    iconColor: 'text-slate-300',
    accentBorder: 'border-white/[0.08] hover:border-white/20',
    description: 'A balance of privacy and social opportunity. Self-contained apartments with the freedom to choose when to engage with shared spaces.',
    features: ['Self-contained apartment', 'Optional shared spaces', 'Maximum independence', 'Housing partnership developed'],
  },
  {
    title: 'Stepping-Stone',
    Icon: TrendingUp,
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
    accentBorder: 'border-emerald-500/20 hover:border-emerald-500/50',
    description: 'Designed to provide stability while transitioning to long-term solutions, helping develop the skills needed to live independently.',
    features: ['Transition planning support', 'Skills development programme', 'Structured progression', 'Move-on support'],
  },
];

const TESTIMONIALS = [
  { quote: "The team at Comprehensive Care transformed my son's life. He has gone from struggling daily to living independently with just the right level of support. We couldn't be more grateful.", author: 'Sarah M.', role: 'Parent of Service User', initials: 'SM' },
  { quote: "I've worked with many care agencies over the years. Comprehensive Care stands out for how genuinely they listen to both staff and residents. The training and support are excellent.", author: 'James T.', role: 'Senior Support Worker', initials: 'JT' },
  { quote: 'The referral process was smooth and the transition plan was thorough. They truly understand complex needs — our service user settled in within weeks.', author: 'Lisa H.', role: 'Social Worker, Salford Council', initials: 'LH' },
];

const ABOUT_BADGES = [
  { Icon: Globe, label: 'Community Engagement' },
  { Icon: Users, label: 'One-on-One Support' },
  { Icon: BarChart3, label: 'Budgeting Support' },
  { Icon: Stethoscope, label: 'Annual Health Checks' },
  { Icon: FileText, label: 'One-Page Profiles' },
  { Icon: Smile, label: 'Social Activities' },
];

const CAREER_BENEFITS = [
  { Icon: Briefcase, title: 'Competitive Pay', desc: 'Fair, competitive wages with regular pay reviews and overtime rates' },
  { Icon: GraduationCap, title: 'Free Training', desc: 'All training is fully funded — from induction to specialist qualifications' },
  { Icon: Shield, title: 'Free DBS Check', desc: 'We cover your DBS check and provide your uniform at no cost to you' },
  { Icon: Clock, title: 'Regular Shifts', desc: 'Consistent, reliable shifts — full-time, part-time, and bank hours available' },
  { Icon: Heart, title: 'Ongoing Support', desc: 'Dedicated supervision, mentoring, and a team that genuinely cares about you' },
];

const HUB_FEATURES = [
  { Icon: FileText, text: 'Real-time care plans and risk assessments' },
  { Icon: Activity, text: 'Digital medication administration records (MAR)' },
  { Icon: BarChart3, text: 'Outcomes tracking and quality monitoring' },
  { Icon: Lock, text: 'Secure, GDPR-compliant record management' },
  { Icon: Users, text: 'Staff scheduling, training, and compliance tracking' },
];

// ── Main Component ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    position: 'Care Assistant', message: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
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
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
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

  return (
    <div className="min-h-screen font-sans overflow-x-hidden" style={{ background: '#060b14', color: '#fff' }}>

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'border-b border-white/[0.06]' : ''}`}
        style={{ background: scrolled ? 'rgba(6,11,20,0.95)' : 'transparent', backdropFilter: scrolled ? 'blur(16px)' : 'none' }}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3 group">
            <img src="/cc-icon.jpg" alt="Comprehensive Care" className="w-10 h-10 rounded-xl object-contain border border-[#e8b130]/30" />
            <div className="leading-tight">
              <span className="block text-sm font-extrabold tracking-tight text-white">Comprehensive Care</span>
              <span className="block text-[9px] font-bold tracking-widest text-[#e8b130] uppercase">Your Care · Our Priority</span>
            </div>
          </button>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)}
                className="px-4 py-2 text-sm font-medium rounded-full text-white/60 hover:text-white hover:bg-white/[0.06] transition-all duration-150">
                {l.label}
              </button>
            ))}
            <button onClick={() => scrollTo('contact')}
              className="ml-4 px-5 py-2.5 bg-[#e8b130] text-slate-900 text-sm font-bold rounded-full shadow-lg shadow-[#e8b130]/20 hover:bg-amber-400 transition-all duration-150">
              Make a Referral
            </button>
            <a href="/login"
              className="ml-2 px-5 py-2.5 border border-white/20 text-white text-sm font-semibold rounded-full hover:bg-white/[0.06] transition-all duration-150">
              Staff Login
            </a>
          </div>

          <button className="lg:hidden p-2 text-white" onClick={() => setMenuOpen(v => !v)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="lg:hidden overflow-hidden border-t border-white/[0.06]"
              style={{ background: 'rgba(6,11,20,0.98)', backdropFilter: 'blur(16px)' }}
            >
              <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col gap-1">
                {navLinks.map(l => (
                  <button key={l.id} onClick={() => { scrollTo(l.id); setMenuOpen(false); }}
                    className="text-left px-4 py-3 text-sm font-semibold text-white/70 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all">
                    {l.label}
                  </button>
                ))}
                <button onClick={() => { scrollTo('contact'); setMenuOpen(false); }}
                  className="mt-3 px-5 py-3 bg-[#e8b130] text-slate-900 text-sm font-bold rounded-xl text-center hover:bg-amber-400 transition-all">
                  Make a Referral
                </button>
                <a href="/login" className="px-5 py-3 border border-white/20 text-white text-sm font-semibold rounded-xl text-center hover:bg-white/[0.06] transition-all">
                  Staff Login
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <header className="relative min-h-screen flex items-center overflow-hidden" style={{ background: '#060b14' }}>
        {/* Dot grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        {/* Animated gold blob */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.08, 0.18, 0.08] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none"
          style={{ background: '#e8b130' }}
        />
        {/* Animated purple blob */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.06, 0.14, 0.06] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-1/4 left-1/5 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none"
          style={{ background: '#6366f1' }}
        />

        {/* Gold left line */}
        <div className="absolute left-0 top-0 bottom-0 w-px pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, rgba(232,177,48,0.5), transparent)' }} />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-28 pb-20 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              {/* CQC badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2.5 border border-[#e8b130]/30 rounded-full px-4 py-2 mb-8"
                style={{ background: 'rgba(232,177,48,0.07)' }}
              >
                <Shield size={14} className="text-[#e8b130]" />
                <span className="text-[#e8b130] text-xs font-bold tracking-widest uppercase">CQC Inspected · Rated Good</span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.04] tracking-tight mb-6"
              >
                <span className="text-white">The Provider</span>
                <br />
                <span className="bg-gradient-to-r from-[#e8b130] to-amber-400 bg-clip-text text-transparent relative">
                  of Choice
                  {/* Animated gold underline */}
                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.8, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="absolute -bottom-1 left-0 right-0 h-0.5 origin-left"
                    style={{ background: 'linear-gradient(to right, #e8b130, rgba(232,177,48,0.2))' }}
                  />
                </span>
                <br />
                <span className="text-white/60 text-4xl md:text-5xl lg:text-6xl font-bold">for Complex Care</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="text-lg leading-relaxed mb-4 max-w-lg"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              >
                Comprehensive Care delivers outstanding, person-centred support across Greater Manchester
                and Warrington — from supported living to complex health conditions.
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="text-sm font-semibold mb-10 flex items-center gap-2"
                style={{ color: 'rgba(232,177,48,0.8)' }}
              >
                <span className="w-8 h-px inline-block" style={{ background: 'rgba(232,177,48,0.6)' }} />
                Domiciliary Care · Supported Living · Respite · Live-In Care
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-wrap gap-4"
              >
                <button onClick={() => scrollTo('contact')}
                  className="px-8 py-4 bg-[#e8b130] text-slate-900 font-bold text-base rounded-2xl shadow-2xl shadow-[#e8b130]/20 hover:bg-amber-400 hover:-translate-y-1 transition-all duration-200 flex items-center gap-2">
                  Make a Referral <ArrowRight size={16} />
                </button>
                <button onClick={() => scrollTo('services')}
                  className="px-8 py-4 border border-white/20 text-white font-bold text-base rounded-2xl hover:bg-white/[0.06] hover:-translate-y-1 transition-all duration-200">
                  Our Services
                </button>
                <button onClick={() => scrollTo('careers')}
                  className="px-8 py-4 border border-[#e8b130]/30 text-[#e8b130] font-bold text-base rounded-2xl hover:bg-[#e8b130]/[0.08] hover:-translate-y-1 transition-all duration-200">
                  Join Our Team
                </button>
              </motion.div>
            </div>

            {/* Right side: logo card + badges */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="hidden lg:flex flex-col items-center gap-8"
            >
              <div className="relative">
                <div className="absolute -inset-6 rounded-3xl blur-3xl" style={{ background: 'rgba(232,177,48,0.12)' }} />
                <div className="relative rounded-3xl p-8 shadow-2xl border"
                  style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(8px)', borderColor: 'rgba(255,255,255,0.08)' }}>
                  <img src="/cc-logo.jpg" alt="Comprehensive Care" className="w-72 object-contain" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                {[
                  { src: '/cqc-good.jpg', alt: 'CQC Good' },
                  { src: '/ico-logo.png', alt: 'ICO' },
                  { src: '/pqs-logo.png', alt: 'PQS SSIP' },
                ].map(badge => (
                  <div key={badge.alt} className="rounded-2xl p-3 border"
                    style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(8px)', borderColor: 'rgba(232,177,48,0.15)' }}>
                    <img src={badge.src} alt={badge.alt} className="h-12 object-contain rounded-lg" />
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 cursor-pointer"
            onClick={() => scrollTo('stats')}
          >
            <ChevronDown size={20} style={{ color: 'rgba(255,255,255,0.25)' }} />
          </motion.div>
        </div>
      </header>

      {/* ── Stats bar ───────────────────────────────────────────────────────── */}
      <section id="stats" className="py-14 border-t border-b border-white/[0.06]"
        style={{ background: '#0a1525', borderTopColor: '#e8b130', borderTopWidth: 1 }}>
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-10">
          <StatCounter target={14} suffix="+" label="Care Specialisms" />
          <StatCounter target={24} suffix="/7" label="Support Available" />
          <StatCounter target={10} suffix="+" label="Agency Settings" />
          <StatCounter target={100} suffix="%" label="Person-Centred" />
        </div>
      </section>

      {/* ── Core Services ───────────────────────────────────────────────────── */}
      <section id="services" className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-16">
              <span className="inline-block text-[#e8b130] text-xs font-bold tracking-widest uppercase mb-4">What We Do</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">Our Core Services</h2>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
                We operate as both a direct care provider and a specialist staffing agency — delivering outstanding support across a range of settings and needs.
              </p>
            </div>
          </Reveal>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            {CORE_SERVICES.map(s => (
              <motion.div
                key={s.title}
                variants={cardAnim}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.2 }}
                className={`rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-shadow duration-300 border-t-4 ${s.borderTop}`}
              >
                <div className="bg-white p-7">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 border border-slate-100"
                    style={{ background: `${s.accentColor}15` }}>
                    <s.Icon size={22} style={{ color: s.accentColor }} />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 mb-2">{s.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-5">{s.description}</p>
                  <ul className="space-y-2">
                    {s.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                        <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── About ───────────────────────────────────────────────────────────── */}
      <section id="about" className="py-28" style={{ background: '#060b14' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <Reveal>
              <div>
                <span className="inline-block text-[#e8b130] text-xs font-bold tracking-widest uppercase mb-4">Who We Are</span>
                <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-6">
                  Putting People First,<br />
                  <span className="bg-gradient-to-r from-[#e8b130] to-amber-400 bg-clip-text text-transparent">Always</span>
                </h2>
                <p className="text-lg leading-relaxed mb-5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Comprehensive Care is a CQC-registered domiciliary and supported living care provider based in Greater Manchester and Warrington. We are committed to delivering outstanding, person-centred support to individuals and their families.
                </p>
                <p className="text-lg leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Using <strong className="text-white font-semibold">Positive Behaviour Support (PBS)</strong> methodology, our specialist teams manage complex care situations and deliver individualised, one-on-one services across a wide range of settings and health conditions.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {ABOUT_BADGES.map(a => (
                    <div key={a.label} className="flex items-center gap-3 p-3 rounded-xl border"
                      style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
                      <a.Icon size={16} className="text-[#e8b130] flex-shrink-0" />
                      <span className="text-sm font-semibold text-white/80">{a.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl blur-2xl -rotate-1 pointer-events-none"
                  style={{ background: 'linear-gradient(135deg, rgba(232,177,48,0.1), rgba(99,102,241,0.08))' }} />
                <img src="/values.png" alt="Our Values" className="relative rounded-3xl w-full object-cover shadow-2xl" />
                <div className="absolute -bottom-5 -left-5 rounded-2xl px-5 py-3 shadow-2xl font-bold text-sm border border-[#e8b130]/30"
                  style={{ background: 'rgba(6,11,20,0.9)', backdropFilter: 'blur(12px)', color: '#e8b130' }}>
                  <Brain size={14} className="inline mr-2 mb-0.5" />
                  Your Care · Our Priority
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ───────────────────────────────────────────────────── */}
      <section className="py-28" style={{ background: '#0a1525' }}>
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-16">
              <span className="inline-block text-[#e8b130] text-xs font-bold tracking-widest uppercase mb-4">Why Choose Us</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">What Sets Us Apart</h2>
              <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                We don't just provide care — we build relationships, develop skills, and genuinely improve lives.
              </p>
            </div>
          </Reveal>

          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            {WHY_US.map(w => (
              <motion.div
                key={w.title}
                variants={cardAnim}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.2 }}
                className="group p-8 rounded-2xl border cursor-default transition-all duration-300"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(8px)',
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(232,177,48,0.3)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${w.gradient} flex items-center justify-center mb-5 shadow-lg`}>
                  <w.Icon size={20} className="text-white" />
                </div>
                <h3 className="text-lg font-extrabold text-white mb-3">{w.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{w.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Specialisms ─────────────────────────────────────────────────────── */}
      <section id="specialisms" className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-16">
              <span className="inline-block text-[#e8b130] text-xs font-bold tracking-widest uppercase mb-4">Our Expertise</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">Care Areas & Specialisms</h2>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
                From complex mental health to end of life care — our teams are trained to support a wide range of needs and conditions.
              </p>
            </div>
          </Reveal>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Provider areas */}
            <Reveal delay={0}>
              <div className="rounded-2xl overflow-hidden border border-[#e8b130]/20 shadow-lg h-full">
                <div className="p-7 bg-slate-900">
                  <div className="w-10 h-10 rounded-xl bg-[#e8b130]/10 flex items-center justify-center mb-4">
                    <Stethoscope size={18} className="text-[#e8b130]" />
                  </div>
                  <p className="text-[#e8b130] text-xs font-bold uppercase tracking-widest mb-1">Care Provider</p>
                  <h3 className="text-xl font-extrabold text-white">Areas We Cover</h3>
                  <p className="text-white/50 text-sm mt-2">Direct care across supported living and community settings.</p>
                </div>
                <div className="p-7 bg-white">
                  <div className="flex flex-wrap gap-2">
                    {PROVIDER_AREAS.map(a => (
                      <span key={a} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full text-sm font-medium">{a}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Agency settings */}
            <Reveal delay={0.08}>
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-lg h-full">
                <div className="p-7 bg-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                    <Building2 size={18} className="text-slate-300" />
                  </div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Staffing Agency</p>
                  <h3 className="text-xl font-extrabold text-white">Settings We Cover</h3>
                  <p className="text-slate-400 text-sm mt-2">Specialist staff placed across all care environments.</p>
                </div>
                <div className="p-7 bg-white">
                  <div className="flex flex-wrap gap-2">
                    {AGENCY_SETTINGS.map(a => (
                      <span key={a} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full text-sm font-medium">{a}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Health conditions */}
            <Reveal delay={0.16}>
              <div className="rounded-2xl overflow-hidden border border-emerald-200 shadow-lg h-full">
                <div className="p-7" style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}>
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                    <Activity size={18} className="text-white" />
                  </div>
                  <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1">Clinical Expertise</p>
                  <h3 className="text-xl font-extrabold text-white">Conditions We Support</h3>
                  <p className="text-emerald-100 text-sm mt-2">Complex health conditions managed with specialist care.</p>
                </div>
                <div className="p-7 bg-white">
                  <div className="flex flex-wrap gap-2">
                    {HEALTH_CONDITIONS.map(c => (
                      <span key={c} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full text-sm font-medium">{c}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Accommodation ───────────────────────────────────────────────────── */}
      <section className="py-28" style={{ background: '#060b14' }}>
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-16">
              <span className="inline-block text-[#e8b130] text-xs font-bold tracking-widest uppercase mb-4">Where We Support</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Accommodation Options</h2>
              <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                We offer a range of accommodation styles — all designed to maximise independence, comfort, and community belonging.
              </p>
            </div>
          </Reveal>

          <motion.div
            className="grid md:grid-cols-3 gap-6"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            {ACCOMMODATION.map(acc => (
              <motion.div
                key={acc.title}
                variants={cardAnim}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.2 }}
                className={`p-8 rounded-2xl border ${acc.accentBorder} transition-all duration-300`}
                style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(8px)' }}
              >
                <div className={`w-12 h-12 rounded-xl ${acc.iconBg} flex items-center justify-center mb-5`}>
                  <acc.Icon size={22} className={acc.iconColor} />
                </div>
                <h3 className="text-lg font-extrabold text-white mb-3">{acc.title}</h3>
                <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>{acc.description}</p>
                <ul className="space-y-2.5">
                  {acc.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
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
      <section id="values" className="py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-16">
              <span className="inline-block text-[#e8b130] text-xs font-bold tracking-widest uppercase mb-4">What Drives Us</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">Our Core Values</h2>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
                Everything we do is underpinned by these principles — guiding every care plan, every interaction, and every decision we make.
              </p>
            </div>
          </Reveal>

          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            {VALUES.map(v => (
              <motion.div
                key={v.title}
                variants={cardAnim}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="bg-white p-8 rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl ${v.iconBg} flex items-center justify-center mb-5`}>
                  <v.Icon size={22} className={v.iconColor} />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mb-3">{v.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{v.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── End of Life ─────────────────────────────────────────────────────── */}
      <section className="py-28" style={{ background: '#060b14' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <Reveal>
              <div className="relative order-2 lg:order-1">
                <div className="absolute -inset-6 rounded-3xl rotate-2 pointer-events-none blur-2xl"
                  style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.1), rgba(251,113,133,0.06))' }} />
                <img src="/eol.png" alt="End of Life Care" className="relative rounded-3xl w-full object-cover shadow-2xl max-h-96" />
                <div className="absolute -bottom-4 -right-4 rounded-2xl shadow-2xl p-4 border border-rose-500/20"
                  style={{ background: 'rgba(6,11,20,0.9)', backdropFilter: 'blur(12px)' }}>
                  <p className="text-rose-400 font-bold text-sm">Palliative & End of Life</p>
                  <p className="text-white/40 text-xs mt-0.5">Compassionate support at every stage</p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="order-1 lg:order-2">
                <span className="inline-block text-rose-400 text-xs font-bold tracking-widest uppercase mb-4">Compassionate Support</span>
                <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-6">
                  End of Life<br />
                  <span className="text-rose-400">& Palliative Care</span>
                </h2>
                <p className="text-lg leading-relaxed mb-5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Providing personalised care in the final year or months of life leads to a more meaningful experience — centred on what matters most to the individual and their family.
                </p>
                <p className="text-lg leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Our specialist team delivers compassionate end of life care that respects individuals' values, supports their families, and upholds dignity in every moment.
                </p>
                <div className="space-y-3">
                  {['Ostomy Care', 'Palliative Care', 'Ventilation & Breathing Support', 'Bowel Management', 'Catheter Care'].map(s => (
                    <div key={s} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0" />
                      <span className="font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────────── */}
      <section className="py-28" style={{ background: '#0a1525' }}>
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-16">
              <span className="inline-block text-[#e8b130] text-xs font-bold tracking-widest uppercase mb-4">Feedback</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">What People Say</h2>
              <p className="text-lg max-w-xl mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Hear from the families, professionals, and team members who have experienced Comprehensive Care first-hand.
              </p>
            </div>
          </Reveal>

          <motion.div
            className="grid md:grid-cols-3 gap-6"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            {TESTIMONIALS.map(t => (
              <motion.div
                key={t.author}
                variants={cardAnim}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.2 }}
                className="p-8 rounded-2xl border transition-all duration-300 flex flex-col"
                style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(8px)', borderColor: 'rgba(255,255,255,0.08)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(232,177,48,0.3)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
              >
                <Quote size={28} className="text-[#e8b130] mb-5 flex-shrink-0" />
                <p className="text-sm leading-relaxed mb-6 flex-1 italic" style={{ color: 'rgba(255,255,255,0.65)' }}>{t.quote}</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#e8b130] flex items-center justify-center text-slate-900 font-bold text-sm flex-shrink-0">
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

      {/* ── CompCare Hub ─────────────────────────────────────────────────────── */}
      <section className="py-28 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <Reveal>
              <div>
                <div className="inline-flex items-center gap-2 border border-[#e8b130]/30 rounded-full px-4 py-2 mb-6"
                  style={{ background: 'rgba(232,177,48,0.06)' }}>
                  <Sparkles size={13} className="text-[#e8b130]" />
                  <span className="text-[#e8b130] text-xs font-bold tracking-widest uppercase">Digital Care Management</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
                  Powered by<br />
                  <span style={{ color: '#e8b130' }}>CompCare Hub</span>
                </h2>
                <p className="text-slate-600 text-lg leading-relaxed mb-6">
                  Our care teams use CompCare Hub — our proprietary digital care management platform — to ensure every service user's records, care plans, medications, and risk assessments are always accurate, up-to-date, and accessible.
                </p>
                <div className="space-y-3 mb-8">
                  {HUB_FEATURES.map(f => (
                    <div key={f.text} className="flex items-center gap-4 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="w-8 h-8 rounded-lg bg-[#e8b130]/10 flex items-center justify-center flex-shrink-0">
                        <f.Icon size={15} className="text-[#e8b130]" />
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{f.text}</span>
                    </div>
                  ))}
                </div>
                <a href="/login"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#e8b130] text-slate-900 font-bold rounded-2xl shadow-lg shadow-[#e8b130]/20 hover:bg-amber-400 hover:-translate-y-0.5 transition-all duration-200">
                  Staff Login → CompCare Hub
                </a>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="relative">
                <div className="absolute -inset-8 rounded-3xl opacity-30 pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse at center, rgba(232,177,48,0.4), transparent 70%)' }} />
                {/* App window mockup */}
                <div className="relative rounded-2xl p-6 shadow-2xl border border-slate-200" style={{ background: '#0f172a' }}>
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <div className="ml-4 flex-1 bg-white/5 rounded-full h-6 flex items-center px-4">
                      <span className="text-white/30 text-xs">compcarehub.onrender.com</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-white/[0.05] rounded-xl p-4 border border-white/[0.06]">
                      <p className="text-[#e8b130] text-xs font-bold uppercase tracking-widest mb-3">Dashboard</p>
                      <div className="grid grid-cols-3 gap-2">
                        {['17 Residents', '16 Staff', '2 Homes'].map(s => (
                          <div key={s} className="bg-white/[0.07] rounded-xl p-3 text-center border border-white/[0.05]">
                            <p className="text-white text-xs font-bold">{s}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white/[0.05] rounded-xl p-4 border border-white/[0.06]">
                      <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3">Recent Activity</p>
                      {['Care plan updated · J. Smith', 'MAR signed · Room 4', 'Staff check-in · 08:00'].map(a => (
                        <div key={a} className="flex items-center gap-2 py-2 border-b border-white/[0.05] last:border-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#e8b130] flex-shrink-0" />
                          <span className="text-white/50 text-xs">{a}</span>
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

      {/* ── Accreditations ──────────────────────────────────────────────────── */}
      <section className="py-20 bg-slate-50 border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-12">
              <span className="inline-block text-[#e8b130] text-xs font-bold tracking-widest uppercase mb-4">Trusted & Accredited</span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">Recognised Standards</h2>
            </div>
          </Reveal>
          <div className="flex flex-wrap justify-center items-center gap-10">
            {[
              { src: '/cqc-good.jpg', alt: 'CQC Inspected and Rated Good', label: 'CQC Rated Good' },
              { src: '/cqc-logo.jpg', alt: 'Care Quality Commission', label: 'Care Quality Commission' },
              { src: '/ico-logo.png', alt: 'ICO', label: "Information Commissioner's Office" },
              { src: '/pqs-logo.png', alt: 'PQS SSIP', label: 'PQS SSIP Health & Safety' },
            ].map(b => (
              <motion.div key={b.label} className="text-center group"
                whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 group-hover:shadow-lg transition-all duration-200 w-40">
                  <img src={b.src} alt={b.alt} className="h-16 object-contain mx-auto rounded-lg" />
                </div>
                <p className="text-xs text-slate-500 font-medium mt-3 max-w-[9rem]">{b.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Careers ─────────────────────────────────────────────────────────── */}
      <section id="careers" className="py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <Reveal>
              <div className="lg:sticky lg:top-32">
                <span className="inline-block text-[#e8b130] text-xs font-bold tracking-widest uppercase mb-4">Join the Team</span>
                <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
                  Make a Real<br />
                  <span style={{ color: '#e8b130' }}>Difference Every Day</span>
                </h2>
                <p className="text-slate-600 text-lg leading-relaxed mb-8">
                  We're always looking for passionate, dedicated professionals to join the Comprehensive Care family. Whether you're an experienced carer or just starting your journey, we'd love to hear from you.
                </p>
                <div className="space-y-4">
                  {CAREER_BENEFITS.map(b => (
                    <div key={b.title} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="w-10 h-10 rounded-xl bg-[#e8b130]/10 flex items-center justify-center flex-shrink-0">
                        <b.Icon size={18} className="text-[#e8b130]" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{b.title}</p>
                        <p className="text-sm text-slate-500">{b.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                <div className="px-8 py-8 border-b border-[#e8b130]/20" style={{ background: 'rgba(232,177,48,0.05)' }}>
                  <div className="flex items-center gap-3 mb-1">
                    <Briefcase size={18} className="text-[#e8b130]" />
                    <h3 className="text-xl font-extrabold text-slate-900">Apply to Work With Us</h3>
                  </div>
                  <p className="text-slate-500 text-sm">Fill in the form and our recruitment team will be in touch shortly.</p>
                </div>
                <div className="p-8">
                  {submitted ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={36} className="text-emerald-500" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">Application Received!</h3>
                      <p className="text-slate-500 mb-8">Thank you for applying. We will review your details and be in touch shortly.</p>
                      <button onClick={() => setSubmitted(false)} className="font-semibold text-[#e8b130] hover:underline">
                        Submit another application
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={apply} className="space-y-5">
                      <div className="grid md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">First Name *</label>
                          <input required
                            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#e8b130] focus:ring-4 focus:ring-[#e8b130]/10 outline-none transition-all text-slate-800 font-medium"
                            value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} placeholder="Jane" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Last Name *</label>
                          <input required
                            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#e8b130] focus:ring-4 focus:ring-[#e8b130]/10 outline-none transition-all text-slate-800 font-medium"
                            value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} placeholder="Smith" />
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Email Address *</label>
                          <input required type="email"
                            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#e8b130] focus:ring-4 focus:ring-[#e8b130]/10 outline-none transition-all text-slate-800 font-medium"
                            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Phone Number</label>
                          <input
                            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#e8b130] focus:ring-4 focus:ring-[#e8b130]/10 outline-none transition-all text-slate-800 font-medium"
                            value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="07700 900000" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Role Interested In *</label>
                        <select
                          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#e8b130] focus:ring-4 focus:ring-[#e8b130]/10 outline-none transition-all bg-white text-slate-800 font-medium"
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
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Message (optional)</label>
                        <textarea rows={3}
                          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#e8b130] focus:ring-4 focus:ring-[#e8b130]/10 outline-none transition-all text-slate-800 font-medium resize-none"
                          value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                          placeholder="Tell us a bit about yourself or ask any questions..." />
                      </div>
                      <button disabled={loading} type="submit"
                        className="w-full bg-[#e8b130] text-slate-900 font-bold text-lg py-4 rounded-xl transition-all shadow-lg shadow-[#e8b130]/20 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-amber-400 hover:-translate-y-0.5 flex items-center justify-center gap-2">
                        {loading ? (
                          <>
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            Submitting...
                          </>
                        ) : (
                          <>Submit Application <ArrowRight size={18} /></>
                        )}
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
      <section id="contact" className="py-28" style={{ background: '#060b14' }}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <Reveal>
            <div className="mb-14">
              <span className="inline-block text-[#e8b130] text-xs font-bold tracking-widest uppercase mb-4">Get In Touch</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">We'd Love to Hear From You</h2>
              <p className="text-lg max-w-xl mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Whether you're a family looking for care, a healthcare professional, or a prospective team member — we're here and ready to help.
              </p>
            </div>
          </Reveal>

          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
          >
            {[
              { Icon: Phone, label: 'Main Line', value: '0161 6676 030', sub: 'Mon–Fri 9am–5pm' },
              { Icon: Phone, label: 'Direct Line', value: '0161 843 0277', sub: 'Mon–Fri 9am–5pm' },
              { Icon: Mail, label: 'General Enquiries', value: 'info@comprehensivecare.org.uk', sub: 'We reply within 24 hours' },
              { Icon: Mail, label: 'Recruitment', value: 'recruitment@comprehensivecare.org.uk', sub: 'CV & job enquiries' },
            ].map(c => (
              <motion.div
                key={c.label}
                variants={cardAnim}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="p-6 rounded-2xl border transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(8px)', borderColor: 'rgba(255,255,255,0.08)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(232,177,48,0.35)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
              >
                <c.Icon size={22} className="text-[#e8b130] mb-3 mx-auto" />
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>{c.label}</p>
                <p className="font-bold text-white text-sm mb-1 break-all">{c.value}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{c.sub}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Office addresses */}
          <Reveal delay={0.08}>
            <div className="grid sm:grid-cols-2 gap-5 mb-12 text-left">
              {[
                {
                  city: 'Manchester Office',
                  address: 'Ivy Business Centre, Office 3-13\nCrown Street, Failsworth\nManchester M35 9BG',
                },
                {
                  city: 'Warrington Office',
                  address: 'Regus Cinnamon House, Office 204e\nCrab Lane, Fearnhead\nWarrington WA2 0XP',
                },
              ].map(o => (
                <div key={o.city} className="p-6 rounded-2xl border text-left"
                  style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={16} className="text-[#e8b130] flex-shrink-0" />
                    <span className="text-[#e8b130] text-xs font-bold uppercase tracking-widest">{o.city}</span>
                  </div>
                  <p className="text-sm font-medium whitespace-pre-line" style={{ color: 'rgba(255,255,255,0.6)' }}>{o.address}</p>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Make a referral CTA */}
          <Reveal delay={0.1}>
            <div className="rounded-2xl p-10 border border-[#e8b130]/20"
              style={{ background: 'linear-gradient(135deg, rgba(232,177,48,0.07), rgba(232,177,48,0.03))' }}>
              <h3 className="text-2xl font-extrabold text-white mb-3">Ready to Make a Referral?</h3>
              <p className="mb-2 max-w-lg mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Our assessment team will contact you within one working day to discuss your needs and arrange an initial care assessment at no cost.
              </p>
              <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.35)' }}>Mon–Fri 9am–5pm · Weekends & bank holidays closed</p>
              <div className="flex flex-wrap justify-center gap-4">
                <a href="tel:01616676030"
                  className="px-8 py-4 bg-[#e8b130] text-slate-900 font-bold rounded-2xl shadow-lg shadow-[#e8b130]/20 hover:bg-amber-400 transition-all flex items-center gap-2">
                  <Phone size={16} /> 0161 6676 030
                </a>
                <a href="mailto:info@comprehensivecare.org.uk"
                  className="px-8 py-4 border border-[#e8b130]/40 text-[#e8b130] font-bold rounded-2xl hover:bg-[#e8b130]/[0.08] transition-all flex items-center gap-2">
                  <Mail size={16} /> Email Us
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="py-16 border-t border-white/[0.06]" style={{ background: '#030710', color: 'rgba(255,255,255,0.4)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src="/cc-icon.jpg" alt="Comprehensive Care" className="w-10 h-10 rounded-xl object-contain border border-[#e8b130]/20" />
                <div>
                  <p className="font-extrabold text-white text-sm leading-none">Comprehensive Care</p>
                  <p className="text-[9px] font-bold tracking-widest mt-0.5 text-[#e8b130]">YOUR CARE · OUR PRIORITY</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed max-w-xs mb-6" style={{ color: 'rgba(255,255,255,0.35)' }}>
                A CQC-registered care provider and staffing agency delivering outstanding, person-centred care across Greater Manchester and Warrington.
              </p>
              <div className="flex items-center gap-3 mb-5">
                <img src="/cqc-good.jpg" alt="CQC Good" className="h-9 object-contain rounded-lg opacity-50" />
                <img src="/ico-logo.png" alt="ICO" className="h-9 object-contain opacity-50" />
                <img src="/pqs-logo.png" alt="PQS" className="h-9 object-contain rounded-lg opacity-50" />
              </div>
              <div className="flex items-center gap-3">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center hover:border-[#e8b130]/40 hover:bg-[#e8b130]/10 transition-all"
                  aria-label="Facebook">
                  <svg className="w-4 h-4 text-white/50" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center hover:border-[#e8b130]/40 hover:bg-[#e8b130]/10 transition-all"
                  aria-label="Instagram">
                  <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" /></svg>
                </a>
              </div>
            </div>

            <div>
              <p className="text-white font-bold mb-4 text-xs uppercase tracking-widest">Services</p>
              <ul className="space-y-2 text-sm">
                {['Supported Living', 'Domiciliary Care', 'Respite Care', 'Live-In Care', 'End of Life Care', 'Staffing Agency'].map(s => (
                  <li key={s}>
                    <span className="hover:text-white transition-colors cursor-default" style={{ color: 'rgba(255,255,255,0.4)' }}>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-white font-bold mb-4 text-xs uppercase tracking-widest">Contact</p>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <Phone size={13} className="text-[#e8b130] mt-0.5 flex-shrink-0" />
                  <div>
                    <a href="tel:01616676030" className="hover:text-white transition-colors block" style={{ color: 'rgba(255,255,255,0.4)' }}>0161 6676 030</a>
                    <a href="tel:01618430277" className="hover:text-white transition-colors block" style={{ color: 'rgba(255,255,255,0.4)' }}>0161 843 0277</a>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Mail size={13} className="text-[#e8b130] mt-0.5 flex-shrink-0" />
                  <div>
                    <a href="mailto:info@comprehensivecare.org.uk" className="hover:text-white transition-colors block text-xs break-all" style={{ color: 'rgba(255,255,255,0.4)' }}>info@comprehensivecare.org.uk</a>
                    <a href="mailto:recruitment@comprehensivecare.org.uk" className="hover:text-white transition-colors block text-xs break-all" style={{ color: 'rgba(255,255,255,0.4)' }}>recruitment@comprehensivecare.org.uk</a>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin size={13} className="text-[#e8b130] mt-0.5 flex-shrink-0" />
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Manchester & Warrington<br />Mon–Fri 9am–5pm</span>
                </li>
                <li className="pt-1">
                  <a href="/login" className="font-semibold text-[#e8b130] hover:opacity-80 transition-colors text-xs">
                    Staff Login (CompCare Hub) →
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
            <p style={{ color: 'rgba(255,255,255,0.3)' }}>&copy; {new Date().getFullYear()} Comprehensive Care Services Ltd. All rights reserved.</p>
            <p style={{ color: 'rgba(255,255,255,0.2)' }}>Registered in England & Wales · CQC Registered Provider · ICO Registered</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
