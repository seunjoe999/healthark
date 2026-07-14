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

function StatCounter({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const { count, ref } = useCounter(target);
  return (
    <div ref={ref} className="text-center group">
      <div className="text-4xl md:text-5xl font-black text-[#6366f1] mb-2 tabular-nums tracking-tight">
        {count}{suffix}
      </div>
      <div className="w-8 h-0.5 bg-[#6366f1]/30 mx-auto mb-2 group-hover:w-12 transition-all duration-300" />
      <div className="text-white/50 text-xs font-semibold tracking-wide uppercase">{label}</div>
    </div>
  );
}

// ── Section pill label ─────────────────────────────────────────────────────────
function SectionPill({ label, dark = false }: { label: string; dark?: boolean }) {
  return (
    <span className={`inline-block text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border mb-5 ${
      dark
        ? 'bg-[#6366f1]/10 text-[#818cf8] border-[#6366f1]/20'
        : 'bg-[#6366f1]/8 text-[#6366f1] border-[#6366f1]/20'
    }`}>
      {label}
    </span>
  );
}

// ── Feature module cards data ──────────────────────────────────────────────────
const FEATURES = [
  {
    Icon: Users,
    gradient: 'from-[#6366f1] to-[#8b5cf6]',
    title: 'Resident Profiles',
    desc: 'Complete digital records, medical history, care needs, allergies, diet preferences and photos — all in one place.',
  },
  {
    Icon: ClipboardList,
    gradient: 'from-[#10b981] to-[#059669]',
    title: 'Care Plans & Outcomes',
    desc: 'Personalised plans with goal tracking, review alerts and outcome monitoring built around CQC frameworks.',
  },
  {
    Icon: Pill,
    gradient: 'from-[#f59e0b] to-[#d97706]',
    title: 'Digital MAR',
    desc: 'Medication administration records with controlled drug witness signing, PRN logs and stock management.',
  },
  {
    Icon: FileText,
    gradient: 'from-[#6366f1] to-[#06b6d4]',
    title: 'Daily Records',
    desc: 'Welfare checks, personal care, meals, activities and observations — logged in a single tap from any device.',
  },
  {
    Icon: CalendarCheck,
    gradient: 'from-[#10b981] to-[#14b8a6]',
    title: 'Staff Rota',
    desc: 'Visual shift scheduling with GPS clock-in verification, timesheets and leave management built in.',
  },
  {
    Icon: GraduationCap,
    gradient: 'from-[#f59e0b] to-[#f97316]',
    title: 'DBS & Training',
    desc: 'Automatic expiry alerts for DBS checks, training records and mandatory certifications — zero missed renewals.',
  },
  {
    Icon: Shield,
    gradient: 'from-[#6366f1] to-[#8b5cf6]',
    title: 'CQC Compliance',
    desc: 'Incident management, safeguarding concerns, CQC notifications and full audit trail for every action.',
  },
  {
    Icon: Heart,
    gradient: 'from-[#10b981] to-[#059669]',
    title: 'Family Portal',
    desc: 'Real-time read-only view for families and loved ones — keeping them informed without compromising data security.',
  },
  {
    Icon: Brain,
    gradient: 'from-[#f59e0b] to-[#d97706]',
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
    <div className="min-h-screen font-sans overflow-x-hidden" style={{ background: '#0a0f1e', color: '#fff' }}>

      {/* ── Book Demo Modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {demoOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: 'rgba(6,11,20,0.88)', backdropFilter: 'blur(12px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setDemoOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
              style={{ background: '#0d1424', border: '1px solid rgba(99,102,241,0.25)' }}
            >
              {/* Modal header */}
              <div className="relative px-8 pt-8 pb-6 border-b border-white/[0.06]"
                style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.04))' }}>
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none"
                  style={{ background: 'rgba(99,102,241,0.15)' }} />
                <button
                  onClick={() => setDemoOpen(false)}
                  className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center border border-white/[0.1] hover:bg-white/[0.08] transition-colors duration-200"
                >
                  <X size={14} className="text-white/50" />
                </button>
                <div className="relative">
                  <div className="inline-flex items-center gap-2 bg-[#6366f1]/15 border border-[#6366f1]/25 rounded-full px-3 py-1.5 mb-4">
                    <Sparkles size={11} className="text-[#818cf8]" />
                    <span className="text-[#818cf8] text-xs font-bold tracking-widest uppercase">Free Demo</span>
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight mb-1">Book Your Demo</h3>
                  <p className="text-white/40 text-sm">We'll show you the full platform — takes 30 minutes.</p>
                </div>
              </div>

              <div className="p-8">
                {demoSubmitted ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-5 border border-emerald-500/20">
                      <CheckCircle size={28} className="text-emerald-400" />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">Request Received!</h4>
                    <p className="text-white/40 text-sm mb-6">We'll be in touch within one working day to arrange your demo.</p>
                    <button
                      onClick={() => { setDemoSubmitted(false); setDemoOpen(false); }}
                      className="text-[#818cf8] text-sm font-bold hover:text-[#6366f1] transition-colors"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <form onSubmit={submitDemo} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-white/35 uppercase tracking-widest mb-2">Your Name *</label>
                      <input
                        required
                        className="w-full px-4 py-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.05] text-white placeholder-white/20 focus:border-[#6366f1]/50 focus:ring-2 focus:ring-[#6366f1]/15 outline-none transition-all text-sm font-medium"
                        value={demoForm.name}
                        onChange={e => setDemoForm({ ...demoForm, name: e.target.value })}
                        placeholder="Jane Smith"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/35 uppercase tracking-widest mb-2">Work Email *</label>
                      <input
                        required
                        type="email"
                        className="w-full px-4 py-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.05] text-white placeholder-white/20 focus:border-[#6366f1]/50 focus:ring-2 focus:ring-[#6366f1]/15 outline-none transition-all text-sm font-medium"
                        value={demoForm.email}
                        onChange={e => setDemoForm({ ...demoForm, email: e.target.value })}
                        placeholder="jane@carehome.co.uk"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-white/35 uppercase tracking-widest mb-2">Phone</label>
                        <input
                          className="w-full px-4 py-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.05] text-white placeholder-white/20 focus:border-[#6366f1]/50 focus:ring-2 focus:ring-[#6366f1]/15 outline-none transition-all text-sm font-medium"
                          value={demoForm.phone}
                          onChange={e => setDemoForm({ ...demoForm, phone: e.target.value })}
                          placeholder="07700 900000"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-white/35 uppercase tracking-widest mb-2">Home Name</label>
                        <input
                          className="w-full px-4 py-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.05] text-white placeholder-white/20 focus:border-[#6366f1]/50 focus:ring-2 focus:ring-[#6366f1]/15 outline-none transition-all text-sm font-medium"
                          value={demoForm.homeName}
                          onChange={e => setDemoForm({ ...demoForm, homeName: e.target.value })}
                          placeholder="Sunrise Lodge"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={demoLoading}
                      className="w-full mt-2 bg-[#6366f1] text-white font-bold text-sm py-4 rounded-2xl shadow-xl shadow-[#6366f1]/25 hover:bg-[#4f52e8] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'border-b border-white/[0.06]' : ''}`}
        style={{
          background: scrolled ? 'rgba(10,15,30,0.97)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3 group">
            <div className="relative w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f52e8)' }}>
              <Shield size={16} className="text-white" />
              <div className="absolute -inset-1 rounded-xl bg-[#6366f1]/30 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="leading-tight">
              <span className="block text-sm font-extrabold tracking-tight text-white">CompCare Hub</span>
              <span className="block text-[9px] font-bold tracking-widest text-[#818cf8] uppercase">Digital Care Management</span>
            </div>
          </button>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)}
                className="px-4 py-2 text-sm font-medium rounded-full text-white/60 hover:text-white hover:bg-white/[0.06] transition-all duration-200">
                {l.label}
              </button>
            ))}
            <button
              onClick={() => setDemoOpen(true)}
              className="ml-4 px-5 py-2.5 bg-[#6366f1] text-white text-sm font-bold rounded-full shadow-lg shadow-[#6366f1]/25 hover:bg-[#4f52e8] hover:shadow-[#6366f1]/40 transition-all duration-200">
              Book a Demo
            </button>
            <Link
              to="/login"
              className="ml-2 px-5 py-2.5 border border-white/20 text-white text-sm font-semibold rounded-full hover:bg-white/[0.07] transition-all duration-200">
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
              className="lg:hidden overflow-hidden border-t border-white/[0.06]"
              style={{ background: 'rgba(10,15,30,0.98)', backdropFilter: 'blur(20px)' }}
            >
              <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col gap-1">
                {navLinks.map(l => (
                  <button key={l.id} onClick={() => { scrollTo(l.id); setMenuOpen(false); }}
                    className="text-left px-4 py-3 text-sm font-semibold text-white/70 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all">
                    {l.label}
                  </button>
                ))}
                <button
                  onClick={() => { setDemoOpen(true); setMenuOpen(false); }}
                  className="mt-3 px-5 py-3 bg-[#6366f1] text-white text-sm font-bold rounded-xl text-center hover:bg-[#4f52e8] transition-all">
                  Book a Demo
                </button>
                <Link to="/login" className="px-5 py-3 border border-white/20 text-white text-sm font-semibold rounded-xl text-center hover:bg-white/[0.06] transition-all">
                  Log In
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <header className="relative min-h-screen flex items-center overflow-hidden" style={{ background: '#0a0f1e' }}>

        {/* Background grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Floating orb — indigo top right */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.28, 0.15] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[8%] right-[5%] w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none"
          style={{ background: '#6366f1' }}
        />
        {/* Floating orb — emerald bottom left */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.18, 0.08] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          className="absolute bottom-[5%] left-[2%] w-[420px] h-[420px] rounded-full blur-[120px] pointer-events-none"
          style={{ background: '#10b981' }}
        />
        {/* Floating orb — indigo mid left subtle */}
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.05, 0.1, 0.05] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 8 }}
          className="absolute top-[55%] left-[30%] w-[300px] h-[300px] rounded-full blur-[100px] pointer-events-none"
          style={{ background: '#818cf8' }}
        />

        {/* Left edge accent */}
        <div className="absolute left-0 top-0 bottom-0 w-px pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(99,102,241,0.5) 40%, rgba(99,102,241,0.2) 70%, transparent 100%)' }} />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-24 w-full">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              {/* Trust pill badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2.5 border border-[#6366f1]/30 rounded-full px-5 py-2.5 mb-8"
                style={{ background: 'rgba(99,102,241,0.08)' }}
              >
                <span className="text-[#10b981]">✦</span>
                <span className="text-[#818cf8] text-xs font-bold tracking-widest uppercase">Trusted by care homes across the UK</span>
              </motion.div>

              {/* Main headline */}
              <motion.h1
                initial={{ opacity: 0, y: 36 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
                className="text-4xl md:text-5xl lg:text-[3.6rem] font-black leading-[1.04] tracking-tight mb-6"
              >
                <span className="text-white">The Complete Care</span>
                <br />
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-[#6366f1] via-[#818cf8] to-[#a5b4fc] bg-clip-text text-transparent">
                    Management Platform
                  </span>
                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 1, delay: 0.8, ease: EASE }}
                    className="absolute -bottom-1 left-0 right-0 h-0.5 origin-left rounded-full"
                    style={{ background: 'linear-gradient(to right, #6366f1, rgba(99,102,241,0.1))' }}
                  />
                </span>
                <br />
                <span className="text-white/40 text-3xl md:text-4xl lg:text-[2.6rem] font-bold">for Care Homes</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-lg leading-relaxed mb-10 max-w-xl text-white/55"
              >
                Replace paper, spreadsheets, and disconnected systems with one powerful platform built for CQC-regulated care homes and supported living providers.
              </motion.p>

              {/* CTA row */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.42 }}
                className="flex flex-wrap gap-4 mb-14"
              >
                <button
                  onClick={() => setDemoOpen(true)}
                  className="px-8 py-4 bg-[#6366f1] text-white font-bold text-base rounded-2xl shadow-2xl shadow-[#6366f1]/30 hover:bg-[#4f52e8] hover:-translate-y-1.5 hover:shadow-[#6366f1]/50 transition-all duration-250 flex items-center gap-2">
                  Start Free Trial <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => setDemoOpen(true)}
                  className="px-8 py-4 border border-white/20 text-white font-bold text-base rounded-2xl hover:bg-white/[0.07] hover:-translate-y-1 transition-all duration-250 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                    <Play size={10} className="text-white ml-0.5" fill="white" />
                  </div>
                  Watch Demo
                </button>
              </motion.div>

              {/* Trust stats row */}
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
                    <div className="text-lg font-black text-[#818cf8]">{b.stat}</div>
                    <div className="text-xs font-semibold text-white/35 uppercase tracking-wide">{b.label}</div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right: dashboard mockup */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
              className="hidden lg:block"
            >
              <div className="relative">
                {/* Glow behind mockup */}
                <div className="absolute -inset-8 rounded-[2.5rem] blur-3xl pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.22), transparent 70%)' }} />

                {/* Browser chrome */}
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/[0.08]"
                  style={{ background: '#0d1424' }}>
                  {/* Browser bar */}
                  <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06]" style={{ background: '#0a1020' }}>
                    <div className="w-3 h-3 rounded-full bg-red-500/70" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
                    <div className="ml-4 flex-1 bg-white/[0.04] rounded-full h-6 flex items-center px-4 border border-white/[0.05]">
                      <Lock size={9} className="text-white/20 mr-2" />
                      <span className="text-white/20 text-xs">app.compcarehub.co.uk</span>
                    </div>
                  </div>

                  {/* Dashboard UI */}
                  <div className="p-6 space-y-4">
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-white font-extrabold text-sm tracking-tight">Good morning, Manager</p>
                        <p className="text-white/30 text-xs">Monday 14 July 2026 · Sunrise Lodge</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#10b981]/15 border border-[#10b981]/25 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-[#10b981]" />
                        </div>
                        <span className="text-[#10b981] text-xs font-bold">Live</span>
                      </div>
                    </div>

                    {/* Stat cards */}
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: 'Residents', value: '24', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
                        { label: 'Care Plans', value: '24', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
                        { label: 'Alerts', value: '3', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
                        { label: 'On Shift', value: '8', color: '#818cf8', bg: 'rgba(129,140,248,0.1)' },
                      ].map(s => (
                        <div key={s.label} className="rounded-xl p-3 border border-white/[0.05] text-center"
                          style={{ background: s.bg }}>
                          <div className="text-xl font-black mb-0.5" style={{ color: s.color }}>{s.value}</div>
                          <div className="text-xs text-white/40 font-semibold">{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Activity feed */}
                    <div className="rounded-2xl border border-white/[0.05] overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <div className="px-4 py-3 border-b border-white/[0.05] flex items-center justify-between">
                        <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Recent Activity</span>
                        <span className="text-[#6366f1] text-xs font-bold">View all</span>
                      </div>
                      {[
                        { dot: '#10b981', text: 'Care plan reviewed — J. Thompson', time: '2m ago' },
                        { dot: '#f59e0b', text: 'MAR signed — Room 4, 08:00 round', time: '8m ago' },
                        { dot: '#6366f1', text: 'Staff clock-in — Sarah K.', time: '12m ago' },
                        { dot: '#10b981', text: 'Incident logged — Room 7 (low)', time: '31m ago' },
                      ].map((a, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.dot }} />
                          <span className="text-white/50 text-xs flex-1">{a.text}</span>
                          <span className="text-white/20 text-xs flex-shrink-0">{a.time}</span>
                        </div>
                      ))}
                    </div>

                    {/* MAR mini strip */}
                    <div className="rounded-2xl border border-white/[0.05] p-4" style={{ background: 'rgba(99,102,241,0.05)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[#818cf8] text-xs font-bold uppercase tracking-widest">Medication Round</span>
                        <span className="text-xs text-white/30 bg-white/[0.05] rounded-full px-3 py-1">08:00 round</span>
                      </div>
                      <div className="flex gap-2">
                        {['✓', '✓', '✓', '✓', '—', '✓'].map((s, i) => (
                          <div key={i} className={`flex-1 h-7 rounded-lg flex items-center justify-center text-xs font-bold border ${s === '✓' ? 'bg-[#10b981]/15 border-[#10b981]/20 text-[#10b981]' : 'bg-white/[0.04] border-white/[0.06] text-white/25'}`}>
                            {s}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating badge — alerts */}
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -bottom-4 -left-6 rounded-2xl shadow-2xl px-4 py-3 border border-[#f59e0b]/20 flex items-center gap-3"
                  style={{ background: 'rgba(13,20,36,0.95)', backdropFilter: 'blur(16px)' }}
                >
                  <div className="w-8 h-8 rounded-xl bg-[#f59e0b]/15 flex items-center justify-center">
                    <Bell size={14} className="text-[#f59e0b]" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-xs">Training expiry alert</p>
                    <p className="text-white/35 text-xs">2 staff renewals due</p>
                  </div>
                </motion.div>

                {/* Floating badge — compliant */}
                <motion.div
                  animate={{ y: [0, 6, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                  className="absolute -top-4 -right-4 rounded-2xl shadow-2xl px-4 py-3 border border-[#10b981]/25 flex items-center gap-2.5"
                  style={{ background: 'rgba(13,20,36,0.95)', backdropFilter: 'blur(16px)' }}
                >
                  <div className="w-2 h-2 rounded-full bg-[#10b981]" />
                  <div>
                    <p className="text-[#10b981] font-bold text-xs">CQC Compliant</p>
                    <p className="text-white/35 text-xs">All records up to date</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer"
            onClick={() => scrollTo('problem')}
          >
            <div className="w-px h-8" style={{ background: 'linear-gradient(to bottom, rgba(99,102,241,0.4), transparent)' }} />
            <ChevronDown size={18} style={{ color: 'rgba(255,255,255,0.2)' }} />
          </motion.div>
        </div>
      </header>

      {/* ── Problem → Solution band ──────────────────────────────────────────── */}
      <section id="problem" className="py-24 relative overflow-hidden" style={{ background: '#111827' }}>
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4">
                Still managing care with paper and spreadsheets?
              </h2>
              <p className="text-white/40 text-lg max-w-xl mx-auto">
                Most care homes are drowning in paperwork. CompCare Hub changes that.
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-4 mb-12">
            {[
              { pain: 'Paper MAR sheets get lost or incomplete', fix: 'Digital MAR with real-time signing and audit trail' },
              { pain: 'Staff training expiry missed — CQC risk', fix: 'Automatic expiry alerts, compliance dashboard' },
              { pain: 'Care plans scattered across filing cabinets', fix: 'Centralised digital care plans, accessible anywhere' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="rounded-2xl overflow-hidden"
              >
                {/* Pain point */}
                <div className="p-5 border border-red-500/15 rounded-t-2xl" style={{ background: 'rgba(239,68,68,0.06)' }}>
                  <div className="flex items-start gap-3">
                    <span className="text-red-400 text-lg mt-0.5 flex-shrink-0">✗</span>
                    <p className="text-red-300/80 text-sm leading-relaxed font-medium">{item.pain}</p>
                  </div>
                </div>
                {/* Arrow */}
                <div className="flex items-center justify-center py-2 bg-[#111827]">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-px h-3" style={{ background: 'rgba(99,102,241,0.3)' }} />
                    <ChevronDown size={14} className="text-[#6366f1]" />
                  </div>
                </div>
                {/* Solution */}
                <div className="p-5 border border-[#10b981]/20 rounded-b-2xl" style={{ background: 'rgba(16,185,129,0.06)' }}>
                  <div className="flex items-start gap-3">
                    <CheckCircle size={16} className="text-[#10b981] mt-0.5 flex-shrink-0" />
                    <p className="text-[#10b981]/90 text-sm leading-relaxed font-medium">{item.fix}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section id="features" className="py-28" style={{ background: '#f8f9ff' }}>
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-16">
              <SectionPill label="Everything in one place" />
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">Every tool your team needs</h2>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
                From resident care to staff compliance — CompCare Hub has every module your care home needs, built to work together seamlessly.
              </p>
            </div>
          </Reveal>

          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            {FEATURES.map((f) => (
              <motion.div
                key={f.title}
                variants={cardAnim}
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="group bg-white rounded-3xl p-8 border border-slate-100 hover:border-[#6366f1]/20 hover:shadow-2xl hover:shadow-[#6366f1]/8 transition-all duration-300 relative overflow-hidden"
              >
                {/* Top accent on hover */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#6366f1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-3xl" />

                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-6 shadow-lg`}>
                  <f.Icon size={22} className="text-white" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight mb-3">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-28 relative overflow-hidden" style={{ background: '#0a0f1e' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 60% 50%, rgba(99,102,241,0.08) 0%, transparent 65%)' }} />

        <div className="relative max-w-6xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-20">
              <SectionPill label="Simple to start" dark />
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">How It Works</h2>
              <p className="text-white/45 text-lg max-w-xl mx-auto leading-relaxed">
                Up and running in days, not months. No complex implementation — just care home software that works.
              </p>
            </div>
          </Reveal>

          <div className="relative">
            {/* Connecting line */}
            <div className="hidden lg:block absolute top-16 left-[16.66%] right-[16.66%] h-px pointer-events-none"
              style={{ background: 'linear-gradient(to right, rgba(99,102,241,0.4), rgba(16,185,129,0.4))' }} />

            <div className="grid lg:grid-cols-3 gap-10">
              {[
                {
                  step: '01',
                  title: 'Set up your home',
                  desc: 'Add your residents, staff profiles and care plans in minutes. Import existing records or start fresh — our onboarding team guides you every step.',
                  color: '#6366f1',
                  Icon: Building2,
                },
                {
                  step: '02',
                  title: 'Your team goes digital',
                  desc: 'Staff log care notes, sign medication rounds and complete daily records from any phone, tablet or desktop — on the ward floor in real time.',
                  color: '#818cf8',
                  Icon: Users,
                },
                {
                  step: '03',
                  title: 'Managers stay in control',
                  desc: 'Real-time dashboards show you everything happening across your home. Alerts surface issues before they become problems. One click to your CQC reports.',
                  color: '#10b981',
                  Icon: LayoutDashboard,
                },
              ].map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.15 }}
                  className="relative text-center"
                >
                  {/* Step number circle */}
                  <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 mx-auto border-2"
                    style={{ borderColor: `${step.color}40`, background: `${step.color}12` }}>
                    <span className="text-2xl font-black" style={{ color: step.color }}>{step.step}</span>
                    {/* Dot on the connecting line */}
                    <div className="hidden lg:block absolute -right-px top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-[#0a0f1e]"
                      style={{ background: step.color, right: i < 2 ? '-1.25rem' : undefined }} />
                  </div>

                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5"
                    style={{ background: `${step.color}15`, border: `1px solid ${step.color}25` }}>
                    <step.Icon size={20} style={{ color: step.color }} />
                  </div>

                  <h3 className="text-xl font-extrabold text-white tracking-tight mb-4">{step.title}</h3>
                  <p className="text-white/45 text-sm leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats / Dashboard Preview ────────────────────────────────────────── */}
      <section className="py-28 relative overflow-hidden" style={{ background: '#060b14' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 20% 60%, rgba(16,185,129,0.06) 0%, transparent 60%)' }} />

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <Reveal>
              <div>
                <SectionPill label="Real-time oversight" dark />
                <h2 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight mb-6">
                  Everything your<br />
                  <span className="bg-gradient-to-r from-[#6366f1] to-[#818cf8] bg-clip-text text-transparent">managers need,</span>
                  <br />at a glance
                </h2>
                <p className="text-white/45 text-lg leading-relaxed mb-10">
                  No more digging through paper files or chasing staff for updates. Your dashboard shows everything, updated in real time.
                </p>
                <div className="space-y-3">
                  {[
                    { Icon: LayoutDashboard, text: 'Real-time staff and resident dashboard', color: '#6366f1' },
                    { Icon: Bell, text: 'Medication and care task alerts', color: '#f59e0b' },
                    { Icon: AlertTriangle, text: 'Training expiry warnings before they lapse', color: '#f59e0b' },
                    { Icon: Shield, text: 'Incident flags and safeguarding workflow', color: '#10b981' },
                    { Icon: FileText, text: 'One-click CQC-ready audit reports', color: '#818cf8' },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] hover:border-white/[0.12] transition-colors duration-200"
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${item.color}15`, border: `1px solid ${item.color}25` }}>
                        <item.Icon size={15} style={{ color: item.color }} />
                      </div>
                      <span className="text-sm font-semibold text-white/65">{item.text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              {/* Stats counters */}
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-5 mb-8">
                  <StatCounter target={70} suffix="%" label="Admin time saved" />
                  <StatCounter target={50} suffix="+" label="Care modules" />
                  <StatCounter target={24} suffix="/7" label="Access anywhere" />
                  <StatCounter target={100} suffix="%" label="Audit trail" />
                </div>

                {/* Manager quote card */}
                <div className="rounded-3xl p-8 border border-[#6366f1]/20 relative overflow-hidden"
                  style={{ background: 'rgba(99,102,241,0.06)' }}>
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none"
                    style={{ background: 'rgba(99,102,241,0.15)' }} />
                  <div className="relative">
                    <div className="text-4xl font-black text-[#6366f1] leading-none mb-4 select-none">&ldquo;</div>
                    <p className="text-white/60 text-sm leading-relaxed italic mb-6">
                      CompCare Hub transformed how we run our home. Our last CQC inspection was outstanding — the inspector praised our record-keeping. It's everything in one place.
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center text-white font-black text-xs shadow-lg">
                        SB
                      </div>
                      <div>
                        <p className="font-extrabold text-white text-sm">Sarah B.</p>
                        <p className="text-white/35 text-xs">Registered Manager, Sunrise Lodge</p>
                      </div>
                      <div className="ml-auto flex gap-0.5">
                        {[1,2,3,4,5].map(s => <Star key={s} size={12} className="text-[#f59e0b]" fill="#f59e0b" />)}
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
      <section id="benefits" className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <Reveal>
              <div>
                <SectionPill label="Why care homes choose us" />
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-10">
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
                      <div className="w-6 h-6 rounded-full bg-[#6366f1]/10 border border-[#6366f1]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle size={13} className="text-[#6366f1]" />
                      </div>
                      <p className="text-slate-700 font-semibold text-base leading-relaxed">{b}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-10 flex gap-4 flex-wrap">
                  <button
                    onClick={() => setDemoOpen(true)}
                    className="px-7 py-3.5 bg-[#6366f1] text-white font-bold text-sm rounded-2xl shadow-xl shadow-[#6366f1]/25 hover:bg-[#4f52e8] hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
                  >
                    Start Free Trial <ArrowRight size={15} />
                  </button>
                  <button
                    onClick={() => setDemoOpen(true)}
                    className="px-7 py-3.5 border-2 border-slate-200 text-slate-700 font-bold text-sm rounded-2xl hover:border-[#6366f1]/30 hover:bg-[#6366f1]/[0.03] transition-all duration-200"
                  >
                    Book a Demo
                  </button>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="space-y-5">
                {/* Testimonial card */}
                <div className="rounded-3xl p-8 border border-slate-100 hover:border-[#6366f1]/20 hover:shadow-2xl transition-all duration-300 bg-[#f8f9ff]">
                  <div className="text-5xl font-black text-[#6366f1] leading-none mb-4">&ldquo;</div>
                  <p className="text-slate-600 text-sm leading-relaxed italic mb-8">
                    We switched from paper MAR to CompCare Hub six months ago. Our medication errors dropped to zero and our staff spend 2 hours less per shift on paperwork. The family portal alone has transformed our relationships with residents' families.
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center text-white font-black text-sm shadow-lg">
                      MH
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900 text-sm">Michael H.</p>
                      <p className="text-slate-400 text-xs mt-0.5">Operations Director, Harmony Care Group</p>
                    </div>
                    <div className="ml-auto flex gap-0.5">
                      {[1,2,3,4,5].map(s => <Star key={s} size={12} className="text-[#f59e0b]" fill="#f59e0b" />)}
                    </div>
                  </div>
                </div>

                {/* Mini stat cards */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: '0', label: 'Med errors\nsince go-live', color: '#10b981' },
                    { value: '2hr', label: 'Less admin\nper shift', color: '#6366f1' },
                    { value: '★★★★★', label: 'CQC\ninspection', color: '#f59e0b' },
                  ].map((s, i) => (
                    <div key={i} className="rounded-2xl p-4 text-center border border-slate-100 bg-white">
                      <div className="text-xl font-black mb-1" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-xs text-slate-400 font-semibold whitespace-pre-line leading-tight">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Modules grid ────────────────────────────────────────────────────── */}
      <section id="modules" className="py-28" style={{ background: '#f8f9ff' }}>
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-16">
              <SectionPill label="Comprehensive coverage" />
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">30+ modules across every area of care</h2>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
                Every module you need, built into one platform. No bolt-ons, no extra fees per module.
              </p>
            </div>
          </Reveal>

          <div className="space-y-8">
            {/* Resident Care */}
            <Reveal>
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center shadow-lg">
                    <Heart size={17} className="text-white" />
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900 text-base">Resident Care</p>
                    <p className="text-slate-400 text-xs">{RESIDENT_MODULES.length} modules</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {RESIDENT_MODULES.map(m => (
                    <span key={m} className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#6366f1]/8 text-[#6366f1] border border-[#6366f1]/20">{m}</span>
                  ))}
                </div>
              </div>
            </Reveal>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Staff */}
              <Reveal>
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm h-full">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center shadow-lg">
                      <Users size={17} className="text-white" />
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900 text-base">Staff Management</p>
                      <p className="text-slate-400 text-xs">{STAFF_MODULES.length} modules</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {STAFF_MODULES.map(m => (
                      <span key={m} className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#10b981]/8 text-[#059669] border border-[#10b981]/20">{m}</span>
                    ))}
                  </div>
                </div>
              </Reveal>

              {/* Compliance */}
              <Reveal delay={0.1}>
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm h-full">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center shadow-lg">
                      <Award size={17} className="text-white" />
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900 text-base">Compliance & Governance</p>
                      <p className="text-slate-400 text-xs">{COMPLIANCE_MODULES.length} modules</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {COMPLIANCE_MODULES.map(m => (
                      <span key={m} className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#f59e0b]/8 text-[#b45309] border border-[#f59e0b]/20">{m}</span>
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-28 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-16">
              <SectionPill label="Simple pricing" />
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">Transparent, per-home pricing</h2>
              <p className="text-slate-500 text-lg max-w-xl mx-auto leading-relaxed">
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
              className="rounded-3xl p-8 border-2 border-slate-100 hover:border-slate-200 hover:shadow-xl transition-all duration-300 relative"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Starter</p>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-5xl font-black text-slate-900">£99</span>
                <span className="text-slate-400 text-sm pb-2">/month per home</span>
              </div>
              <p className="text-slate-500 text-sm mb-8">Perfect for smaller homes getting started with digital care.</p>
              <ul className="space-y-3 mb-10">
                {[
                  'Up to 10 residents',
                  'Core care modules (MAR, Care Plans, Daily Records)',
                  'Staff profiles and rota',
                  'DBS & training tracking',
                  'Email support',
                  '14-day free trial',
                ].map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-slate-600">
                    <CheckCircle size={15} className="text-[#10b981] flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setDemoOpen(true)}
                className="w-full py-3.5 border-2 border-[#6366f1] text-[#6366f1] font-bold text-sm rounded-2xl hover:bg-[#6366f1]/5 transition-all duration-200"
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
              className="rounded-3xl p-8 border-2 border-[#6366f1] shadow-2xl shadow-[#6366f1]/10 relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.04), rgba(99,102,241,0.01))' }}
            >
              {/* Popular badge */}
              <div className="absolute top-6 right-6 bg-[#6366f1] text-white text-xs font-bold px-3 py-1 rounded-full">
                Most Popular
              </div>

              <p className="text-xs font-bold uppercase tracking-widest text-[#6366f1] mb-4">Professional</p>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-5xl font-black text-slate-900">£199</span>
                <span className="text-slate-400 text-sm pb-2">/month per home</span>
              </div>
              <p className="text-slate-500 text-sm mb-8">The complete platform — every module, no limits.</p>
              <ul className="space-y-3 mb-10">
                {[
                  'Unlimited residents',
                  'All 30+ modules included',
                  'AI-powered audit reports',
                  'Family Portal',
                  'GPS clock-in & timesheets',
                  'Priority support & onboarding',
                  '14-day free trial',
                ].map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-slate-600">
                    <CheckCircle size={15} className="text-[#6366f1] flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setDemoOpen(true)}
                className="w-full py-3.5 bg-[#6366f1] text-white font-bold text-sm rounded-2xl shadow-xl shadow-[#6366f1]/25 hover:bg-[#4f52e8] hover:-translate-y-0.5 transition-all duration-200"
              >
                Start Free Trial
              </button>
            </motion.div>
          </div>

          {/* Enterprise CTA */}
          <Reveal>
            <div className="rounded-3xl p-8 border border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <p className="font-extrabold text-slate-900 text-lg mb-1">Running multiple homes or a group?</p>
                <p className="text-slate-500 text-sm">Enterprise pricing available for care groups, chains and NHS-commissioned services. Volume discounts and custom integrations.</p>
              </div>
              <button
                onClick={() => setDemoOpen(true)}
                className="flex-shrink-0 px-7 py-3.5 border-2 border-slate-200 text-slate-700 font-bold text-sm rounded-2xl hover:border-[#6366f1]/30 hover:bg-white transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
              >
                Talk to Sales <ChevronRight size={15} />
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────────── */}
      <section className="py-28 relative overflow-hidden" style={{ background: '#0a0f1e' }}>
        {/* Glows */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px] pointer-events-none"
          style={{ background: '#6366f1' }}
        />
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 border border-[#10b981]/25 rounded-full px-4 py-2 mb-8"
              style={{ background: 'rgba(16,185,129,0.08)' }}>
              <div className="w-2 h-2 rounded-full bg-[#10b981]" />
              <span className="text-[#10b981] text-xs font-bold tracking-widest uppercase">No card required</span>
            </div>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight mb-6">
              Ready to go<br />
              <span className="bg-gradient-to-r from-[#6366f1] via-[#818cf8] to-[#a5b4fc] bg-clip-text text-transparent">paperless?</span>
            </h2>
            <p className="text-white/45 text-xl max-w-2xl mx-auto leading-relaxed mb-12">
              Join care homes across the UK already using CompCare Hub. Start your free 14-day trial today — no commitment, no credit card.
            </p>

            <div className="flex flex-wrap gap-4 justify-center mb-12">
              <button
                onClick={() => setDemoOpen(true)}
                className="px-10 py-5 bg-[#6366f1] text-white font-bold text-lg rounded-2xl shadow-2xl shadow-[#6366f1]/30 hover:bg-[#4f52e8] hover:-translate-y-1.5 hover:shadow-[#6366f1]/50 transition-all duration-250 flex items-center gap-2"
              >
                Start Free Trial <ArrowRight size={18} />
              </button>
              <button
                onClick={() => setDemoOpen(true)}
                className="px-10 py-5 border border-white/20 text-white font-bold text-lg rounded-2xl hover:bg-white/[0.07] hover:-translate-y-1 transition-all duration-250"
              >
                Book a Demo
              </button>
            </div>

            {/* Trust row */}
            <div className="flex flex-wrap justify-center gap-8">
              {[
                { icon: <Shield size={14} />, text: 'GDPR Compliant' },
                { icon: <Lock size={14} />, text: 'Secure & encrypted' },
                { icon: <CheckCircle size={14} />, text: 'CQC Ready' },
                { icon: <Clock size={14} />, text: '24/7 access' },
              ].map(t => (
                <div key={t.text} className="flex items-center gap-2 text-sm font-semibold text-white/35">
                  <span className="text-[#818cf8]">{t.icon}</span>
                  {t.text}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="py-16 border-t border-white/[0.05]" style={{ background: '#030710' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #4f52e8)' }}>
                  <Shield size={16} className="text-white" />
                </div>
                <div>
                  <p className="font-black text-white text-sm leading-none tracking-tight">CompCare Hub</p>
                  <p className="text-[9px] font-bold tracking-widest mt-0.5 text-[#818cf8] uppercase">Digital Care Management</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed max-w-xs mb-6 text-white/30">
                The complete digital care management platform for CQC-regulated care homes and supported living providers across the UK.
              </p>
              <p className="text-xs text-white/20">Built for CQC-regulated care homes in the UK</p>
            </div>

            {/* Platform */}
            <div>
              <p className="text-white font-bold mb-4 text-xs uppercase tracking-widest">Platform</p>
              <ul className="space-y-2.5 text-sm">
                {['Features', 'How It Works', 'Modules', 'Pricing'].map(l => (
                  <li key={l}>
                    <button
                      onClick={() => scrollTo(l.toLowerCase().replace(/ /g, '-'))}
                      className="text-white/35 hover:text-white/70 transition-colors duration-200 cursor-pointer"
                    >
                      {l}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Links */}
            <div>
              <p className="text-white font-bold mb-4 text-xs uppercase tracking-widest">Company</p>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link to="/login" className="text-white/35 hover:text-white/70 transition-colors duration-200">
                    Log In
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => setDemoOpen(true)}
                    className="text-white/35 hover:text-white/70 transition-colors duration-200"
                  >
                    Book a Demo
                  </button>
                </li>
                <li>
                  <a href="mailto:info@compcarehub.co.uk" className="text-white/35 hover:text-white/70 transition-colors duration-200 flex items-center gap-2">
                    <Mail size={12} className="text-[#818cf8]" />
                    Contact Us
                  </a>
                </li>
                <li>
                  <span className="text-white/35 cursor-default">Privacy Policy</span>
                </li>
                <li>
                  <span className="text-white/35 cursor-default">Terms of Service</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/[0.05] pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
            <p className="text-white/25">&copy; {new Date().getFullYear()} CompCare Hub. All rights reserved.</p>
            <p className="text-white/15">Built for CQC-regulated care homes in the UK &middot; GDPR Compliant &middot; Secure &amp; Encrypted</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
