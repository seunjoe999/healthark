import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, Heart, Award,
  Clock, Phone, Mail, CheckCircle, ArrowRight, ChevronDown,
  Activity, BarChart3, FileText, GraduationCap,
  UserCheck, CalendarCheck, Sparkles,
  TrendingUp, Target, ChevronRight,
  Pill, ClipboardList, Brain, Building2,
  Bell, Lock, Zap, LayoutDashboard,
  Play, X, Menu, Star, Globe, AlertTriangle,
} from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';

// ── TypeScript ease constant ───────────────────────────────────────────────────
const EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

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
      transition={{ duration: 0.7, delay, ease: EASE }}
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

function StatCounter({
  target,
  suffix,
  label,
  icon: Icon,
  color,
}: {
  target: number;
  suffix: string;
  label: string;
  icon: React.ElementType;
  color: string;
}) {
  const { count, ref } = useCounter(target);
  return (
    <div ref={ref} className="text-center group flex flex-col items-center gap-3">
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center mb-1"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <div className="text-4xl md:text-5xl font-black tabular-nums tracking-tight" style={{ color }}>
        {count}{suffix}
      </div>
      <div className="w-6 h-0.5 rounded-full mx-auto transition-all duration-300 group-hover:w-10" style={{ background: `${color}40` }} />
      <div className="text-slate-400 text-xs font-semibold tracking-wide uppercase">{label}</div>
    </div>
  );
}

// ── Section pill label ─────────────────────────────────────────────────────────
function SectionPill({ label, dark = false }: { label: string; dark?: boolean }) {
  return (
    <span
      className={`inline-block text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border mb-5 ${
        dark
          ? 'bg-[#0ea5e9]/10 text-[#0ea5e9] border-[#0ea5e9]/25'
          : 'bg-[#0ea5e9]/10 text-[#0ea5e9] border-[#0ea5e9]/25'
      }`}
    >
      {label}
    </span>
  );
}

// ── Feature module cards data ──────────────────────────────────────────────────
const FEATURES = [
  {
    Icon: Users,
    gradient: 'from-[#0ea5e9] to-[#0284c7]',
    iconBg: '#0ea5e9',
    title: 'Resident Profiles',
    desc: 'Complete digital records, medical history, care needs, allergies, diet preferences and photos — all in one place.',
  },
  {
    Icon: ClipboardList,
    gradient: 'from-[#10b981] to-[#059669]',
    iconBg: '#10b981',
    title: 'Care Plans & Outcomes',
    desc: 'Personalised plans with goal tracking, review alerts and outcome monitoring built around CQC frameworks.',
  },
  {
    Icon: Pill,
    gradient: 'from-[#f59e0b] to-[#d97706]',
    iconBg: '#f59e0b',
    title: 'Digital MAR',
    desc: 'Medication administration records with controlled drug witness signing, PRN logs and stock management.',
  },
  {
    Icon: FileText,
    gradient: 'from-[#0ea5e9] to-[#06b6d4]',
    iconBg: '#06b6d4',
    title: 'Daily Records',
    desc: 'Welfare checks, personal care, meals, activities and observations — logged in a single tap from any device.',
  },
  {
    Icon: CalendarCheck,
    gradient: 'from-[#10b981] to-[#14b8a6]',
    iconBg: '#10b981',
    title: 'Staff Rota',
    desc: 'Visual shift scheduling with GPS clock-in verification, timesheets and leave management built in.',
  },
  {
    Icon: GraduationCap,
    gradient: 'from-[#f59e0b] to-[#f97316]',
    iconBg: '#f59e0b',
    title: 'DBS & Training',
    desc: 'Automatic expiry alerts for DBS checks, training records and mandatory certifications — zero missed renewals.',
  },
  {
    Icon: Shield,
    gradient: 'from-[#0ea5e9] to-[#0284c7]',
    iconBg: '#0ea5e9',
    title: 'CQC Compliance',
    desc: 'Incident management, safeguarding concerns, CQC notifications and full audit trail for every action.',
  },
  {
    Icon: Heart,
    gradient: 'from-[#10b981] to-[#059669]',
    iconBg: '#10b981',
    title: 'Family Portal',
    desc: 'Real-time read-only view for families and loved ones — keeping them informed without compromising data security.',
  },
  {
    Icon: Brain,
    gradient: 'from-[#f59e0b] to-[#d97706]',
    iconBg: '#f59e0b',
    title: 'AI Audit Reports',
    desc: 'Instant compliance reports generated from your live data — ready for CQC inspections at the click of a button.',
  },
];

// ── Module tag cloud data ──────────────────────────────────────────────────────
const RESIDENT_MODULES = [
  'Care Plans', 'Daily Records', 'MAR', 'Medication Stock', 'Risk Assessments',
  'Safeguarding', 'Incidents', 'Observations', 'Seizure Log', 'Bowel Chart',
  'Family Portal', 'Resident Reviews', 'Fluid Intake', 'Bath Charts', 'Body Maps',
  'Professional Visits', 'Assessments', 'Medicine Risk',
];

const STAFF_MODULES = [
  'Rota', 'Clock In', 'Timesheets', 'Training', 'DBS', 'Supervision',
  'Appraisals', 'Leave', 'Recruitment', 'Staff Messages', 'Staff Profiles',
];

const COMPLIANCE_MODULES = [
  'CQC Notifications', 'Audit Trail', 'Policies', 'Quality Records',
  'AI Audit Reports', 'Maintenance', 'PPE', 'Invoicing', 'Tasks', 'Calendar',
  'Noticeboard', 'Reports',
];

// ── Benefits list ──────────────────────────────────────────────────────────────
const BENEFITS = [
  'Reduce admin time by up to 70%',
  'Pass CQC inspections with confidence',
  'Never miss a medication or care task',
  'Families stay informed with the Family Portal',
  'Full audit trail for every action across your home',
  'Works on phones, tablets and desktops — anywhere',
];

// ── Main Component ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  // Demo form state
  const [demoForm, setDemoForm] = useState({ name: '', email: '', phone: '', homeName: '' });
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = demoOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [demoOpen]);

  const submitDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    setDemoLoading(true);
    try {
      await api.post('/public/contact', {
        firstName: demoForm.name,
        email: demoForm.email,
        phone: demoForm.phone,
        message: `Demo request from: ${demoForm.homeName || 'Not specified'}`,
      });
      setDemoSubmitted(true);
      toast.success('Demo request sent! We will be in touch shortly.');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      toast.error(msg || 'Failed to send request. Please try again.');
    }
    setDemoLoading(false);
  };

  const navLinks = [
    { label: 'Features', id: 'features' },
    { label: 'How It Works', id: 'how-it-works' },
    { label: 'Modules', id: 'modules' },
    { label: 'Pricing', id: 'pricing' },
  ];

  return (
    <div className="min-h-screen font-sans overflow-x-hidden" style={{ background: '#060d18', color: '#f1f5f9' }}>

      {/* ── Book Demo Modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {demoOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: 'rgba(4,9,20,0.90)', backdropFilter: 'blur(14px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setDemoOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
              style={{ background: '#0d1829', border: '1px solid rgba(14,165,233,0.22)' }}
            >
              {/* Modal header */}
              <div
                className="relative px-8 pt-8 pb-6 border-b border-white/[0.06]"
                style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.10), rgba(14,165,233,0.03))' }}
              >
                <div
                  className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none"
                  style={{ background: 'rgba(14,165,233,0.12)' }}
                />
                <button
                  onClick={() => setDemoOpen(false)}
                  className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center border border-white/[0.10] hover:bg-white/[0.08] transition-colors duration-200"
                >
                  <X size={14} className="text-white/50" />
                </button>
                <div className="relative">
                  <div className="inline-flex items-center gap-2 bg-[#0ea5e9]/12 border border-[#0ea5e9]/25 rounded-full px-3 py-1.5 mb-4">
                    <Sparkles size={11} className="text-[#0ea5e9]" />
                    <span className="text-[#0ea5e9] text-xs font-bold tracking-widest uppercase">Free Demo</span>
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight mb-1">Book Your Demo</h3>
                  <p className="text-slate-400 text-sm">We'll show you the full platform — takes 30 minutes.</p>
                </div>
              </div>

              <div className="p-8">
                {demoSubmitted ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-5 border border-emerald-500/20">
                      <CheckCircle size={28} className="text-emerald-400" />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">Request Received!</h4>
                    <p className="text-slate-400 text-sm mb-6">We'll be in touch within one working day to arrange your demo.</p>
                    <button
                      onClick={() => { setDemoSubmitted(false); setDemoOpen(false); }}
                      className="text-[#0ea5e9] text-sm font-bold hover:text-sky-300 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <form onSubmit={submitDemo} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Your Name *</label>
                      <input
                        required
                        className="w-full px-4 py-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.05] text-white placeholder-white/20 focus:border-[#0ea5e9]/50 focus:ring-2 focus:ring-[#0ea5e9]/15 outline-none transition-all text-sm font-medium"
                        value={demoForm.name}
                        onChange={e => setDemoForm({ ...demoForm, name: e.target.value })}
                        placeholder="Jane Smith"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Work Email *</label>
                      <input
                        required
                        type="email"
                        className="w-full px-4 py-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.05] text-white placeholder-white/20 focus:border-[#0ea5e9]/50 focus:ring-2 focus:ring-[#0ea5e9]/15 outline-none transition-all text-sm font-medium"
                        value={demoForm.email}
                        onChange={e => setDemoForm({ ...demoForm, email: e.target.value })}
                        placeholder="jane@carehome.co.uk"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Phone</label>
                        <input
                          className="w-full px-4 py-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.05] text-white placeholder-white/20 focus:border-[#0ea5e9]/50 focus:ring-2 focus:ring-[#0ea5e9]/15 outline-none transition-all text-sm font-medium"
                          value={demoForm.phone}
                          onChange={e => setDemoForm({ ...demoForm, phone: e.target.value })}
                          placeholder="07700 900000"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Home Name</label>
                        <input
                          className="w-full px-4 py-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.05] text-white placeholder-white/20 focus:border-[#0ea5e9]/50 focus:ring-2 focus:ring-[#0ea5e9]/15 outline-none transition-all text-sm font-medium"
                          value={demoForm.homeName}
                          onChange={e => setDemoForm({ ...demoForm, homeName: e.target.value })}
                          placeholder="Sunrise Lodge"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={demoLoading}
                      className="w-full mt-2 bg-[#0ea5e9] text-white font-bold text-sm py-4 rounded-2xl shadow-xl shadow-[#0ea5e9]/25 hover:bg-sky-400 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {demoLoading ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Sending...
                        </>
                      ) : (
                        <>Book My Free Demo <ArrowRight size={16} /></>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'border-b border-white/[0.05]' : ''}`}
        style={{
          background: scrolled ? 'rgba(6,13,24,0.97)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3 group">
            <div
              className="relative w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}
            >
              <Shield size={16} className="text-white" />
              <div className="absolute -inset-1 rounded-xl bg-[#0ea5e9]/30 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="leading-tight">
              <span className="block text-sm font-extrabold tracking-tight text-white">CompCare Hub</span>
              <span className="block text-[9px] font-bold tracking-widest text-[#0ea5e9] uppercase">Digital Care Management</span>
            </div>
          </button>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(l => (
              <button
                key={l.id}
                onClick={() => scrollTo(l.id)}
                className="px-4 py-2 text-sm font-medium rounded-full text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
              >
                {l.label}
              </button>
            ))}
            <button
              onClick={() => setDemoOpen(true)}
              className="ml-4 px-5 py-2.5 bg-[#0ea5e9] text-white text-sm font-bold rounded-full shadow-lg shadow-[#0ea5e9]/25 hover:bg-sky-400 hover:shadow-[#0ea5e9]/40 transition-all duration-200"
            >
              Book a Demo
            </button>
            <Link
              to="/login"
              className="ml-2 px-5 py-2.5 border border-white/15 text-slate-300 text-sm font-semibold rounded-full hover:bg-white/[0.06] hover:text-white transition-all duration-200"
            >
              Log In
            </Link>
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
              className="lg:hidden overflow-hidden border-t border-white/[0.05]"
              style={{ background: 'rgba(6,13,24,0.98)', backdropFilter: 'blur(20px)' }}
            >
              <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col gap-1">
                {navLinks.map(l => (
                  <button
                    key={l.id}
                    onClick={() => { scrollTo(l.id); setMenuOpen(false); }}
                    className="text-left px-4 py-3 text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all"
                  >
                    {l.label}
                  </button>
                ))}
                <button
                  onClick={() => { setDemoOpen(true); setMenuOpen(false); }}
                  className="mt-3 px-5 py-3 bg-[#0ea5e9] text-white text-sm font-bold rounded-xl text-center hover:bg-sky-400 transition-all"
                >
                  Book a Demo
                </button>
                <Link to="/login" className="px-5 py-3 border border-white/15 text-slate-300 text-sm font-semibold rounded-xl text-center hover:bg-white/[0.06] transition-all">
                  Log In
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <header className="relative min-h-screen flex items-center overflow-hidden" style={{ background: '#060d18' }}>

        {/* Radial mesh gradient background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: [
              'radial-gradient(ellipse 100% 60% at 70% 20%, rgba(14,165,233,0.12), transparent 70%)',
              'radial-gradient(ellipse 60% 50% at 10% 80%, rgba(16,185,129,0.07), transparent 65%)',
              'radial-gradient(ellipse 50% 40% at 90% 90%, rgba(14,165,233,0.05), transparent 60%)',
            ].join(', '),
          }}
        />

        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: 'linear-gradient(rgba(14,165,233,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.04) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Left edge accent line */}
        <div
          className="absolute left-0 top-0 bottom-0 w-px pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(14,165,233,0.4) 40%, rgba(14,165,233,0.15) 70%, transparent 100%)' }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-24 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* ── Left column ── */}
            <div>
              {/* Trust badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2.5 border border-[#0ea5e9]/25 rounded-full px-5 py-2.5 mb-8"
                style={{ background: 'rgba(14,165,233,0.08)' }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981]" />
                <span className="text-[#0ea5e9] text-xs font-bold tracking-widest uppercase">Trusted by care homes across the UK</span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 36 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
                className="text-4xl md:text-5xl lg:text-[3.5rem] font-black leading-[1.05] tracking-tight mb-6"
              >
                <span className="text-white">The Complete</span>
                <br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(90deg, #0ea5e9, #38bdf8, #7dd3fc)' }}
                >
                  Care Management
                </span>
                <br />
                <span className="text-slate-400 text-3xl md:text-4xl lg:text-[2.5rem] font-bold">Platform for UK Care Homes</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-lg leading-relaxed mb-10 max-w-xl text-slate-400"
              >
                Replace paper, spreadsheets, and disconnected systems with one powerful platform built for CQC-regulated care homes and supported living providers.
              </motion.p>

              {/* CTA buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.42 }}
                className="flex flex-wrap gap-4 mb-12"
              >
                <button
                  onClick={() => setDemoOpen(true)}
                  className="px-8 py-4 bg-[#0ea5e9] text-white font-bold text-base rounded-2xl shadow-2xl shadow-[#0ea5e9]/30 hover:bg-sky-400 hover:-translate-y-1.5 hover:shadow-[#0ea5e9]/50 transition-all duration-250 flex items-center gap-2"
                >
                  Start Free Trial <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => setDemoOpen(true)}
                  className="px-8 py-4 border border-white/15 text-slate-300 font-bold text-base rounded-2xl hover:bg-white/[0.06] hover:text-white hover:-translate-y-1 transition-all duration-250 flex items-center gap-2"
                >
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                    <Play size={10} className="text-white ml-0.5" fill="white" />
                  </div>
                  Watch Demo
                </button>
              </motion.div>

              {/* Trust micro-stats */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.58 }}
                className="flex flex-wrap items-center gap-6"
              >
                {[
                  { stat: '500+', label: 'Residents Managed' },
                  { stat: '50+', label: 'Modules' },
                  { stat: 'CQC', label: 'Ready' },
                  { stat: 'GDPR', label: 'Compliant' },
                ].map(b => (
                  <div key={b.label} className="text-center">
                    <div className="text-lg font-black text-[#0ea5e9]">{b.stat}</div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{b.label}</div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* ── Right column — floating card stack ── */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, delay: 0.25, ease: EASE }}
              className="hidden lg:flex flex-col items-center justify-center relative gap-4 py-8"
            >
              {/* Ambient glow */}
              <div
                className="absolute inset-0 pointer-events-none rounded-3xl blur-3xl"
                style={{ background: 'radial-gradient(ellipse at center, rgba(14,165,233,0.12), transparent 70%)' }}
              />

              {/* Card 1 — Medication Due */}
              <motion.div
                initial={{ opacity: 0, y: 30, x: 20 }}
                animate={{ opacity: 1, y: 0, x: 20 }}
                transition={{ duration: 0.6, delay: 0.5, ease: EASE }}
                className="relative w-80 rounded-2xl border border-[#1e2d45] shadow-2xl shadow-black/40 overflow-hidden"
                style={{ background: '#0d1829' }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#f59e0b] rounded-l-2xl" />
                <div className="px-5 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.15)' }}>
                    <Pill size={18} className="text-[#f59e0b]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm tracking-tight">Medication Due</p>
                    <p className="text-slate-400 text-xs mt-0.5">Room 4 · Metformin 08:00</p>
                  </div>
                  <button className="text-xs font-bold text-[#f59e0b] border border-[#f59e0b]/30 rounded-lg px-3 py-1.5 hover:bg-[#f59e0b]/10 transition-colors">
                    Sign
                  </button>
                </div>
              </motion.div>

              {/* Card 2 — New Care Plan Alert */}
              <motion.div
                initial={{ opacity: 0, y: 30, x: -14 }}
                animate={{ opacity: 1, y: 0, x: -14 }}
                transition={{ duration: 0.6, delay: 0.68, ease: EASE }}
                className="relative w-80 rounded-2xl border border-[#1e2d45] shadow-2xl shadow-black/40 overflow-hidden"
                style={{ background: '#0d1829' }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#10b981] rounded-l-2xl" />
                <div className="px-5 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.15)' }}>
                    <ClipboardList size={18} className="text-[#10b981]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm tracking-tight">New Care Plan Alert</p>
                    <p className="text-slate-400 text-xs mt-0.5">J. Thompson · Review overdue 2 days</p>
                  </div>
                  <button className="text-xs font-bold text-[#10b981] border border-[#10b981]/30 rounded-lg px-3 py-1.5 hover:bg-[#10b981]/10 transition-colors">
                    Review
                  </button>
                </div>
              </motion.div>

              {/* Card 3 — DBS Expiring */}
              <motion.div
                initial={{ opacity: 0, y: 30, x: 10 }}
                animate={{ opacity: 1, y: 0, x: 10 }}
                transition={{ duration: 0.6, delay: 0.86, ease: EASE }}
                className="relative w-80 rounded-2xl border border-[#1e2d45] shadow-2xl shadow-black/40 overflow-hidden"
                style={{ background: '#0d1829' }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0ea5e9] rounded-l-2xl" />
                <div className="px-5 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(14,165,233,0.15)' }}>
                    <UserCheck size={18} className="text-[#0ea5e9]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm tracking-tight">DBS Expiring Soon</p>
                    <p className="text-slate-400 text-xs mt-0.5">2 staff · Expires in 14 days</p>
                  </div>
                  <button className="text-xs font-bold text-[#0ea5e9] border border-[#0ea5e9]/30 rounded-lg px-3 py-1.5 hover:bg-[#0ea5e9]/10 transition-colors">
                    View
                  </button>
                </div>
              </motion.div>

              {/* Floating status badge */}
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-3 -right-2 rounded-2xl px-4 py-2.5 border border-[#10b981]/25 flex items-center gap-2 shadow-xl"
                style={{ background: 'rgba(13,24,41,0.95)', backdropFilter: 'blur(12px)' }}
              >
                <div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981]" />
                <span className="text-[#10b981] text-xs font-bold">CQC Compliant</span>
              </motion.div>

              {/* Floating stat badge */}
              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
                className="absolute -bottom-2 -left-4 rounded-2xl px-4 py-2.5 border border-[#0ea5e9]/20 flex items-center gap-3 shadow-xl"
                style={{ background: 'rgba(13,24,41,0.95)', backdropFilter: 'blur(12px)' }}
              >
                <div className="w-8 h-8 rounded-xl bg-[#0ea5e9]/15 flex items-center justify-center">
                  <Activity size={14} className="text-[#0ea5e9]" />
                </div>
                <div>
                  <p className="text-white font-bold text-xs">Live Dashboard</p>
                  <p className="text-slate-400 text-xs">24 residents · 8 on shift</p>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer"
            onClick={() => scrollTo('stats')}
          >
            <div className="w-px h-8" style={{ background: 'linear-gradient(to bottom, rgba(14,165,233,0.4), transparent)' }} />
            <ChevronDown size={18} className="text-slate-600" />
          </motion.div>
        </div>
      </header>

      {/* ── Stats band ──────────────────────────────────────────────────────── */}
      <section id="stats" className="py-16 border-y border-[#1e2d45]" style={{ background: '#0d1829' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            <StatCounter target={70} suffix="%" label="Admin Time Saved" icon={TrendingUp} color="#0ea5e9" />
            <StatCounter target={50} suffix="+" label="Care Modules" icon={LayoutDashboard} color="#10b981" />
            <StatCounter target={500} suffix="+" label="Residents Managed" icon={Users} color="#0ea5e9" />
            <StatCounter target={100} suffix="%" label="Audit Trail Coverage" icon={Shield} color="#f59e0b" />
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section id="features" className="py-28" style={{ background: '#060d18' }}>
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-16">
              <SectionPill label="Everything in one place" dark />
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
                Every tool your team needs
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
                From resident care to staff compliance — CompCare Hub has every module your care home needs, built to work together seamlessly.
              </p>
            </div>
          </Reveal>

          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            {FEATURES.map((f) => (
              <motion.div
                key={f.title}
                variants={cardAnim}
                className="group relative bg-[#0d1829] rounded-2xl p-7 border border-[#1e2d45] hover:border-[#0ea5e9]/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#0ea5e9]/10 transition-all duration-300 overflow-hidden"
              >
                {/* Top accent line that appears on hover */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#0ea5e9]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />

                {/* Icon badge */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: `${f.iconBg}18`, border: `1px solid ${f.iconBg}28` }}
                >
                  <f.Icon size={19} style={{ color: f.iconBg }} />
                </div>

                <h3 className="text-base font-extrabold text-white tracking-tight mb-2.5">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-28 relative overflow-hidden" style={{ background: '#0d1829' }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(14,165,233,0.06), transparent 60%)' }}
        />

        <div className="relative max-w-6xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-20">
              <SectionPill label="Simple to start" dark />
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">How It Works</h2>
              <p className="text-slate-400 text-lg max-w-xl mx-auto leading-relaxed">
                Up and running in days, not months. No complex implementation — just care home software that works.
              </p>
            </div>
          </Reveal>

          <div className="relative">
            {/* Dashed connecting line */}
            <div
              className="hidden lg:block absolute top-8 left-[calc(16.66%+2rem)] right-[calc(16.66%+2rem)]"
              style={{
                height: '1px',
                backgroundImage: 'repeating-linear-gradient(90deg, rgba(14,165,233,0.35) 0, rgba(14,165,233,0.35) 8px, transparent 8px, transparent 16px)',
              }}
            />

            <div className="grid lg:grid-cols-3 gap-12">
              {[
                {
                  step: '01',
                  title: 'Set up your home',
                  desc: 'Add your residents, staff profiles and care plans in minutes. Import existing records or start fresh — our onboarding team guides you every step.',
                  color: '#0ea5e9',
                  Icon: Building2,
                },
                {
                  step: '02',
                  title: 'Your team goes digital',
                  desc: 'Staff log care notes, sign medication rounds and complete daily records from any phone, tablet or desktop — on the ward floor in real time.',
                  color: '#10b981',
                  Icon: Users,
                },
                {
                  step: '03',
                  title: 'Managers stay in control',
                  desc: 'Real-time dashboards show you everything happening across your home. Alerts surface issues before they become problems.',
                  color: '#f59e0b',
                  Icon: LayoutDashboard,
                },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.15 }}
                  className="text-center flex flex-col items-center"
                >
                  {/* Step number circle */}
                  <div
                    className="relative w-16 h-16 rounded-full flex items-center justify-center mb-7 border-2"
                    style={{ borderColor: `${s.color}35`, background: `${s.color}10` }}
                  >
                    <span className="text-2xl font-black tabular-nums" style={{ color: s.color }}>{s.step}</span>
                  </div>

                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5"
                    style={{ background: `${s.color}12`, border: `1px solid ${s.color}22` }}
                  >
                    <s.Icon size={20} style={{ color: s.color }} />
                  </div>

                  <h3 className="text-xl font-extrabold text-white tracking-tight mb-3">{s.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Dashboard / Benefits ─────────────────────────────────────────────── */}
      <section className="py-28 relative overflow-hidden" style={{ background: '#060d18' }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 15% 55%, rgba(16,185,129,0.05), transparent 55%)' }}
        />

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <Reveal>
              <div>
                <SectionPill label="Real-time oversight" dark />
                <h2 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight mb-6">
                  Everything your managers need,{' '}
                  <span
                    className="bg-clip-text text-transparent"
                    style={{ backgroundImage: 'linear-gradient(90deg, #0ea5e9, #38bdf8)' }}
                  >
                    at a glance
                  </span>
                </h2>
                <p className="text-slate-400 text-lg leading-relaxed mb-10">
                  No more digging through paper files or chasing staff for updates. Your dashboard shows everything, updated in real time.
                </p>
                <div className="space-y-3">
                  {[
                    { Icon: LayoutDashboard, text: 'Real-time staff and resident dashboard', color: '#0ea5e9' },
                    { Icon: Bell, text: 'Medication and care task alerts', color: '#f59e0b' },
                    { Icon: AlertTriangle, text: 'Training expiry warnings before they lapse', color: '#f59e0b' },
                    { Icon: Shield, text: 'Incident flags and safeguarding workflow', color: '#10b981' },
                    { Icon: FileText, text: 'One-click CQC-ready audit reports', color: '#0ea5e9' },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className="flex items-center gap-4 p-4 rounded-xl border border-[#1e2d45] hover:border-[#0ea5e9]/25 transition-colors duration-200"
                      style={{ background: 'rgba(13,24,41,0.5)' }}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${item.color}14`, border: `1px solid ${item.color}22` }}
                      >
                        <item.Icon size={15} style={{ color: item.color }} />
                      </div>
                      <span className="text-sm font-semibold text-slate-300">{item.text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="space-y-6">
                {/* Stat counters grid */}
                <div className="grid grid-cols-2 gap-5 mb-6 p-6 rounded-2xl border border-[#1e2d45]" style={{ background: '#0d1829' }}>
                  <StatCounter target={70} suffix="%" label="Admin time saved" icon={TrendingUp} color="#0ea5e9" />
                  <StatCounter target={50} suffix="+" label="Care modules" icon={Zap} color="#10b981" />
                  <StatCounter target={24} suffix="/7" label="Access anywhere" icon={Globe} color="#0ea5e9" />
                  <StatCounter target={100} suffix="%" label="Audit trail" icon={Shield} color="#f59e0b" />
                </div>

                {/* Testimonial card */}
                <div
                  className="rounded-2xl p-7 border border-[#0ea5e9]/18 relative overflow-hidden"
                  style={{ background: 'rgba(14,165,233,0.05)' }}
                >
                  <div
                    className="absolute top-0 right-0 w-28 h-28 rounded-full blur-3xl pointer-events-none"
                    style={{ background: 'rgba(14,165,233,0.10)' }}
                  />
                  <div className="relative">
                    <div className="text-4xl font-black text-[#0ea5e9] leading-none mb-4 select-none">&ldquo;</div>
                    <p className="text-slate-400 text-sm leading-relaxed italic mb-6">
                      CompCare Hub transformed how we run our home. Our last CQC inspection was outstanding — the inspector praised our record-keeping.
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0ea5e9] to-[#0284c7] flex items-center justify-center text-white font-black text-xs shadow-lg">
                        SB
                      </div>
                      <div>
                        <p className="font-extrabold text-white text-sm">Sarah B.</p>
                        <p className="text-slate-500 text-xs">Registered Manager, Sunrise Lodge</p>
                      </div>
                      <div className="ml-auto flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => <Star key={s} size={12} className="text-[#f59e0b]" fill="#f59e0b" />)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Benefits ────────────────────────────────────────────────────────── */}
      <section id="benefits" className="py-28" style={{ background: '#0d1829' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <Reveal>
              <div>
                <SectionPill label="Why care homes choose us" dark />
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-10">
                  Built for the real world<br />of care delivery
                </h2>
                <div className="space-y-4">
                  {BENEFITS.map((b, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className="flex items-start gap-4"
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}
                      >
                        <CheckCircle size={13} className="text-[#10b981]" />
                      </div>
                      <p className="text-slate-300 font-semibold text-base leading-relaxed">{b}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-10 flex gap-4 flex-wrap">
                  <button
                    onClick={() => setDemoOpen(true)}
                    className="px-7 py-3.5 bg-[#0ea5e9] text-white font-bold text-sm rounded-2xl shadow-xl shadow-[#0ea5e9]/25 hover:bg-sky-400 hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
                  >
                    Start Free Trial <ArrowRight size={15} />
                  </button>
                  <button
                    onClick={() => setDemoOpen(true)}
                    className="px-7 py-3.5 border border-[#1e2d45] text-slate-300 font-bold text-sm rounded-2xl hover:border-[#0ea5e9]/30 hover:text-white transition-all duration-200"
                  >
                    Book a Demo
                  </button>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="space-y-5">
                {/* Testimonial */}
                <div
                  className="rounded-2xl p-8 border border-[#1e2d45] hover:border-[#0ea5e9]/25 hover:shadow-xl hover:shadow-[#0ea5e9]/5 transition-all duration-300"
                  style={{ background: '#060d18' }}
                >
                  <div className="text-5xl font-black text-[#10b981] leading-none mb-4">&ldquo;</div>
                  <p className="text-slate-400 text-sm leading-relaxed italic mb-8">
                    We switched from paper MAR to CompCare Hub six months ago. Medication errors dropped to zero and staff spend 2 hours less per shift on paperwork. The family portal alone transformed our relationships with residents' families.
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center text-white font-black text-sm shadow-lg">
                      MH
                    </div>
                    <div>
                      <p className="font-extrabold text-white text-sm">Michael H.</p>
                      <p className="text-slate-500 text-xs mt-0.5">Operations Director, Harmony Care Group</p>
                    </div>
                    <div className="ml-auto flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => <Star key={s} size={12} className="text-[#f59e0b]" fill="#f59e0b" />)}
                    </div>
                  </div>
                </div>

                {/* Mini stat cards */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: '0', label: 'Med errors\nsince go-live', color: '#10b981' },
                    { value: '2hr', label: 'Less admin\nper shift', color: '#0ea5e9' },
                    { value: '5/5', label: 'CQC\nrating', color: '#f59e0b' },
                  ].map((s, i) => (
                    <div
                      key={i}
                      className="rounded-2xl p-4 text-center border border-[#1e2d45]"
                      style={{ background: '#0d1829' }}
                    >
                      <div className="text-xl font-black mb-1" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-xs text-slate-500 font-semibold whitespace-pre-line leading-tight">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Modules grid ────────────────────────────────────────────────────── */}
      <section id="modules" className="py-28" style={{ background: '#060d18' }}>
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-16">
              <SectionPill label="Comprehensive coverage" dark />
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
                30+ modules across every area of care
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
                Every module you need, built into one platform. No bolt-ons, no extra fees per module.
              </p>
            </div>
          </Reveal>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Resident Care */}
            <Reveal>
              <div className="rounded-2xl p-7 border border-[#1e2d45] hover:border-[#0ea5e9]/30 transition-colors duration-300 h-full" style={{ background: '#0d1829' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.22)' }}>
                    <Heart size={16} className="text-[#0ea5e9]" />
                  </div>
                  <div>
                    <p className="font-extrabold text-white text-base">Resident Care</p>
                    <p className="text-slate-500 text-xs">{RESIDENT_MODULES.length} modules</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {RESIDENT_MODULES.map(m => (
                    <span key={m} className="px-3 py-1.5 rounded-full text-xs font-semibold text-[#0ea5e9] border border-[#0ea5e9]/20" style={{ background: 'rgba(14,165,233,0.08)' }}>{m}</span>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Staff Management */}
            <Reveal delay={0.07}>
              <div className="rounded-2xl p-7 border border-[#1e2d45] hover:border-[#10b981]/30 transition-colors duration-300 h-full" style={{ background: '#0d1829' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.22)' }}>
                    <Users size={16} className="text-[#10b981]" />
                  </div>
                  <div>
                    <p className="font-extrabold text-white text-base">Staff Management</p>
                    <p className="text-slate-500 text-xs">{STAFF_MODULES.length} modules</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {STAFF_MODULES.map(m => (
                    <span key={m} className="px-3 py-1.5 rounded-full text-xs font-semibold text-[#10b981] border border-[#10b981]/20" style={{ background: 'rgba(16,185,129,0.08)' }}>{m}</span>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Compliance */}
            <Reveal delay={0.14}>
              <div className="rounded-2xl p-7 border border-[#1e2d45] hover:border-[#f59e0b]/30 transition-colors duration-300 h-full" style={{ background: '#0d1829' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.22)' }}>
                    <Award size={16} className="text-[#f59e0b]" />
                  </div>
                  <div>
                    <p className="font-extrabold text-white text-base">Compliance & Governance</p>
                    <p className="text-slate-500 text-xs">{COMPLIANCE_MODULES.length} modules</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {COMPLIANCE_MODULES.map(m => (
                    <span key={m} className="px-3 py-1.5 rounded-full text-xs font-semibold text-[#f59e0b] border border-[#f59e0b]/20" style={{ background: 'rgba(245,158,11,0.08)' }}>{m}</span>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-28" style={{ background: '#0d1829' }}>
        <div className="max-w-5xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-16">
              <SectionPill label="Simple pricing" dark />
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
                Transparent, per-home pricing
              </h2>
              <p className="text-slate-400 text-lg max-w-xl mx-auto leading-relaxed">
                No per-user fees. No hidden charges. One flat price per home.
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Starter */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl p-8 border border-[#1e2d45] hover:border-[#0ea5e9]/25 hover:shadow-xl hover:shadow-[#0ea5e9]/5 transition-all duration-300"
              style={{ background: '#060d18' }}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Starter</p>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-5xl font-black text-white">£99</span>
                <span className="text-slate-500 text-sm pb-2">/month per home</span>
              </div>
              <p className="text-slate-400 text-sm mb-8">Perfect for smaller homes getting started with digital care.</p>
              <ul className="space-y-3 mb-10">
                {[
                  'Up to 10 residents',
                  'Core care modules (MAR, Care Plans, Daily Records)',
                  'Staff profiles and rota',
                  'DBS & training tracking',
                  'Email support',
                ].map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle size={15} className="text-[#10b981] flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setDemoOpen(true)}
                className="w-full py-3.5 border border-[#0ea5e9]/40 text-[#0ea5e9] font-bold text-sm rounded-2xl hover:bg-[#0ea5e9]/8 hover:border-[#0ea5e9]/60 transition-all duration-200"
              >
                Start Free Trial
              </button>
            </motion.div>

            {/* Professional */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-2xl p-8 border border-[#0ea5e9]/40 shadow-2xl shadow-[#0ea5e9]/10 relative overflow-hidden"
              style={{ background: 'linear-gradient(145deg, rgba(14,165,233,0.12), rgba(14,165,233,0.04))' }}
            >
              {/* Popular badge */}
              <div className="absolute top-6 right-6 bg-[#0ea5e9] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-[#0ea5e9]/30">
                Most Popular
              </div>

              <p className="text-xs font-bold uppercase tracking-widest text-[#0ea5e9] mb-4">Professional</p>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-5xl font-black text-white">£199</span>
                <span className="text-slate-400 text-sm pb-2">/month per home</span>
              </div>
              <p className="text-slate-400 text-sm mb-8">The complete platform — every module, no limits.</p>
              <ul className="space-y-3 mb-10">
                {[
                  'Unlimited residents',
                  'All 30+ modules included',
                  'AI-powered audit reports',
                  'Family Portal',
                  'GPS clock-in & timesheets',
                ].map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-slate-200">
                    <CheckCircle size={15} className="text-[#0ea5e9] flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setDemoOpen(true)}
                className="w-full py-3.5 bg-[#0ea5e9] text-white font-bold text-sm rounded-2xl shadow-xl shadow-[#0ea5e9]/30 hover:bg-sky-400 hover:-translate-y-0.5 transition-all duration-200"
              >
                Start Free Trial
              </button>
            </motion.div>
          </div>

          {/* Enterprise CTA */}
          <Reveal>
            <div
              className="rounded-2xl p-7 border border-[#1e2d45] flex flex-col sm:flex-row items-center justify-between gap-6"
              style={{ background: '#060d18' }}
            >
              <div>
                <p className="font-extrabold text-white text-lg mb-1">Running multiple homes or a group?</p>
                <p className="text-slate-400 text-sm">Enterprise pricing available for care groups, chains and NHS-commissioned services. Volume discounts and custom integrations.</p>
              </div>
              <button
                onClick={() => setDemoOpen(true)}
                className="flex-shrink-0 px-7 py-3.5 border border-[#1e2d45] text-slate-300 font-bold text-sm rounded-2xl hover:border-[#0ea5e9]/30 hover:text-white transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
              >
                Talk to Sales <ChevronRight size={15} />
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────────── */}
      <section className="py-28 relative overflow-hidden" style={{ background: '#060d18' }}>
        {/* Radial glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center top, rgba(14,165,233,0.14), transparent 65%)' }}
        />
        {/* Grid texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'linear-gradient(rgba(14,165,233,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.06) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <Reveal>
            <div
              className="inline-flex items-center gap-2 border border-[#10b981]/25 rounded-full px-4 py-2 mb-8"
              style={{ background: 'rgba(16,185,129,0.08)' }}
            >
              <div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981]" />
              <span className="text-[#10b981] text-xs font-bold tracking-widest uppercase">No card required</span>
            </div>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight mb-6">
              Ready to go{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(90deg, #0ea5e9, #38bdf8, #7dd3fc)' }}
              >
                paperless?
              </span>
            </h2>
            <p className="text-slate-400 text-xl max-w-2xl mx-auto leading-relaxed mb-12">
              Join care homes across the UK already using CompCare Hub. Start your free 14-day trial today — no commitment, no credit card.
            </p>

            <div className="flex flex-wrap gap-4 justify-center mb-12">
              <button
                onClick={() => setDemoOpen(true)}
                className="px-10 py-5 bg-[#0ea5e9] text-white font-bold text-lg rounded-2xl shadow-2xl shadow-[#0ea5e9]/30 hover:bg-sky-400 hover:-translate-y-1.5 hover:shadow-[#0ea5e9]/50 transition-all duration-250 flex items-center gap-2"
              >
                Start Free Trial <ArrowRight size={18} />
              </button>
              <button
                onClick={() => setDemoOpen(true)}
                className="px-10 py-5 border border-white/15 text-slate-300 font-bold text-lg rounded-2xl hover:bg-white/[0.06] hover:text-white hover:-translate-y-1 transition-all duration-250"
              >
                Book a Demo
              </button>
            </div>

            {/* Trust row */}
            <div className="flex flex-wrap justify-center gap-8">
              {[
                { Icon: Shield, text: 'GDPR Compliant' },
                { Icon: Lock, text: 'Secure & encrypted' },
                { Icon: CheckCircle, text: 'CQC Ready' },
                { Icon: Clock, text: '24/7 access' },
              ].map(t => (
                <div key={t.text} className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <t.Icon size={14} className="text-[#0ea5e9]" />
                  {t.text}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="py-16 border-t border-[#1e2d45]" style={{ background: '#040a14' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            {/* Brand + tagline */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}
                >
                  <Shield size={16} className="text-white" />
                </div>
                <div>
                  <p className="font-black text-white text-sm leading-none tracking-tight">CompCare Hub</p>
                  <p className="text-[9px] font-bold tracking-widest mt-0.5 text-[#0ea5e9] uppercase">Digital Care Management</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed max-w-xs mb-4 text-slate-500">
                The complete digital care management platform for CQC-regulated care homes and supported living providers across the UK.
              </p>
              <p className="text-xs text-slate-600">Built for CQC-regulated care homes in the UK</p>
            </div>

            {/* Nav links */}
            <div>
              <p className="text-white font-bold mb-5 text-xs uppercase tracking-widest">Platform</p>
              <ul className="space-y-3 text-sm">
                {['Features', 'How It Works', 'Modules', 'Pricing'].map(l => (
                  <li key={l}>
                    <button
                      onClick={() => scrollTo(l.toLowerCase().replace(/ /g, '-'))}
                      className="text-slate-500 hover:text-slate-200 transition-colors duration-200"
                    >
                      {l}
                    </button>
                  </li>
                ))}
                <li>
                  <Link to="/login" className="text-slate-500 hover:text-slate-200 transition-colors duration-200">
                    Log In
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => setDemoOpen(true)}
                    className="text-slate-500 hover:text-slate-200 transition-colors duration-200"
                  >
                    Book a Demo
                  </button>
                </li>
              </ul>
            </div>

            {/* Contact info */}
            <div>
              <p className="text-white font-bold mb-5 text-xs uppercase tracking-widest">Contact</p>
              <ul className="space-y-3 text-sm">
                <li>
                  <a
                    href="mailto:info@compcarehub.co.uk"
                    className="flex items-center gap-2.5 text-slate-500 hover:text-slate-200 transition-colors duration-200 group"
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(14,165,233,0.10)' }}>
                      <Mail size={12} className="text-[#0ea5e9]" />
                    </div>
                    info@compcarehub.co.uk
                  </a>
                </li>
                <li>
                  <a
                    href="tel:+441234567890"
                    className="flex items-center gap-2.5 text-slate-500 hover:text-slate-200 transition-colors duration-200"
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.10)' }}>
                      <Phone size={12} className="text-[#10b981]" />
                    </div>
                    0800 123 4567
                  </a>
                </li>
                <li className="pt-2">
                  <span className="text-slate-600 cursor-default">Privacy Policy</span>
                </li>
                <li>
                  <span className="text-slate-600 cursor-default">Terms of Service</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[#1e2d45] pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
            <p className="text-slate-600">&copy; {new Date().getFullYear()} CompCare Hub. All rights reserved.</p>
            <p className="text-slate-700">Built for CQC-regulated care homes in the UK &middot; GDPR Compliant &middot; Secure &amp; Encrypted</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
