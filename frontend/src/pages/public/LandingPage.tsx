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
  Quote,
} from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';

const EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
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
      <div className="text-4xl md:text-5xl font-black tabular-nums mb-1" style={{ color: '#1A4A35', fontFamily: '"DM Serif Display", serif' }}>
        {count}{suffix}
      </div>
      <div className="text-sm font-medium" style={{ color: '#6B7A6A' }}>{label}</div>
    </div>
  );
}

// ── Image palette ──────────────────────────────────────────────────────────────
const IMG = {
  hero:      '/hero-care.jpg',
  feature1:  'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=700&q=80&auto=format&fit=crop',
  feature2:  'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=700&q=80&auto=format&fit=crop',
  feature3:  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=700&q=80&auto=format&fit=crop',
  card1:     'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=500&q=80&auto=format&fit=crop',
  card2:     'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=500&q=80&auto=format&fit=crop',
  card3:     'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=500&q=80&auto=format&fit=crop',
  ctaBg:     'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1400&q=75&auto=format&fit=crop',
  t1:        'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=120&q=80&auto=format&fit=crop&crop=face',
  t2:        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&q=80&auto=format&fit=crop&crop=face',
  t3:        'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=120&q=80&auto=format&fit=crop&crop=face',
};

const TESTIMONIALS = [
  {
    quote: "We replaced three separate systems with CompCare Hub. Our staff spend 40% less time on paperwork and our last CQC inspection was the smoothest we've ever had.",
    name: 'Sarah Mitchell',
    role: 'Registered Manager',
    home: 'Oakwood Care Home, Birmingham',
    img: IMG.t1,
  },
  {
    quote: "The MAR system alone was worth it. Controlled drug sign-offs, PRN records, stock counts — everything our pharmacist needs is right there during their visit.",
    name: 'James Okonkwo',
    role: 'Home Manager',
    home: 'Sunrise Lodge, Manchester',
    img: IMG.t2,
  },
  {
    quote: "Families love the portal. They can see daily notes and activities without us making a single phone call. It has genuinely transformed our family relationships.",
    name: 'Patricia Donnelly',
    role: 'Director of Care',
    home: 'Ashfield Group, Leeds',
    img: IMG.t3,
  },
];

const RESIDENT_MODULES = [
  'Care Plans', 'Daily Records', 'MAR', 'Medication Stock', 'Risk Assessments',
  'Safeguarding', 'Incidents', 'Observations', 'Seizure Log', 'Bowel Chart',
  'Family Portal', 'Resident Reviews', 'Fluid Intake', 'Bath Charts', 'Body Maps',
  'Professional Visits', 'Assessments', 'Medicine Risk',
];
const STAFF_MODULES = [
  'Rota', 'Clock In', 'Timesheets', 'Training', 'DBS Tracker', 'Supervision',
  'Appraisals', 'Leave Management', 'Recruitment', 'Staff Messages', 'HR Records',
];
const COMPLIANCE_MODULES = [
  'CQC Notifications', 'Audit Trail', 'Policies', 'Quality Records',
  'AI Audit Reports', 'Maintenance', 'PPE', 'Invoicing', 'Tasks', 'Calendar',
  'Noticeboard', 'Reports',
];

// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoForm, setDemoForm] = useState({ name: '', email: '', phone: '', homeName: '' });
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

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
        message: `Walkthrough request from: ${demoForm.homeName || 'Not specified'}`,
      });
      setDemoSubmitted(true);
      toast.success("We'll be in touch within one working day!");
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
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
    <div className="min-h-screen font-sans overflow-x-hidden" style={{ background: '#F5F0E8', color: '#1A2E1E' }}>

      {/* ── Walkthrough modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {demoOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: 'rgba(10,25,15,0.75)', backdropFilter: 'blur(12px)' }}
            onClick={e => { if (e.target === e.currentTarget) setDemoOpen(false); }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.26, ease: EASE }}
              className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
              style={{ background: '#F5F0E8' }}>

              {/* Photo header */}
              <div className="relative h-36 overflow-hidden">
                <img src={IMG.hero} alt="Care team" className="w-full h-full object-cover object-top" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,35,20,0.5), rgba(10,35,20,0.85))' }} />
                <button onClick={() => setDemoOpen(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                  <X size={14} className="text-white" />
                </button>
                <div className="absolute bottom-5 left-6">
                  <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-0.5">Free · No Commitment</p>
                  <h3 className="text-white text-xl font-black" style={{ fontFamily: '"DM Serif Display", serif' }}>
                    See CompCare <em>in Action</em>
                  </h3>
                </div>
              </div>

              <div className="p-6">
                {demoSubmitted ? (
                  <div className="text-center py-6">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                      style={{ background: '#D4EDDA' }}>
                      <CheckCircle size={26} style={{ color: '#1A5C3A' }} />
                    </div>
                    <h4 className="text-lg font-black mb-2" style={{ fontFamily: '"DM Serif Display", serif', color: '#1A2E1E' }}>
                      You're booked in!
                    </h4>
                    <p className="text-sm mb-5" style={{ color: '#6B7A6A' }}>
                      We'll send a confirmation and be in touch within one working day to arrange your personalised walkthrough.
                    </p>
                    <button onClick={() => { setDemoSubmitted(false); setDemoOpen(false); }}
                      className="text-sm font-bold" style={{ color: '#1A5C3A' }}>Close</button>
                  </div>
                ) : (
                  <form onSubmit={submitDemo} className="space-y-3">
                    <p className="text-sm mb-4" style={{ color: '#6B7A6A' }}>
                      A personalised 30-minute walkthrough of the full platform — tailored to your home. Free, no commitment.
                    </p>
                    {[
                      { label: 'Your Name *', key: 'name', type: 'text', placeholder: 'Jane Smith', required: true },
                      { label: 'Work Email *', key: 'email', type: 'email', placeholder: 'jane@carehome.co.uk', required: true },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#8A9A8A' }}>{f.label}</label>
                        <input required={f.required} type={f.type} placeholder={f.placeholder}
                          className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                          style={{ background: 'white', borderColor: '#D9D0C4', color: '#1A2E1E' }}
                          value={demoForm[f.key as keyof typeof demoForm]}
                          onChange={e => setDemoForm({ ...demoForm, [f.key]: e.target.value })}
                          onFocus={e => { e.target.style.borderColor = '#1A5C3A'; e.target.style.boxShadow = '0 0 0 3px rgba(26,92,58,0.12)'; }}
                          onBlur={e => { e.target.style.borderColor = '#D9D0C4'; e.target.style.boxShadow = 'none'; }} />
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Phone', key: 'phone', placeholder: '07700 900000' },
                        { label: 'Care Home', key: 'homeName', placeholder: 'Sunrise Lodge' },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#8A9A8A' }}>{f.label}</label>
                          <input type="text" placeholder={f.placeholder}
                            className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                            style={{ background: 'white', borderColor: '#D9D0C4', color: '#1A2E1E' }}
                            value={demoForm[f.key as keyof typeof demoForm]}
                            onChange={e => setDemoForm({ ...demoForm, [f.key]: e.target.value })}
                            onFocus={e => { e.target.style.borderColor = '#1A5C3A'; e.target.style.boxShadow = '0 0 0 3px rgba(26,92,58,0.12)'; }}
                            onBlur={e => { e.target.style.borderColor = '#D9D0C4'; e.target.style.boxShadow = 'none'; }} />
                        </div>
                      ))}
                    </div>
                    <button type="submit" disabled={demoLoading}
                      className="w-full mt-2 py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg, #1A5C3A, #1A4A35)' }}>
                      {demoLoading
                        ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Sending...</>
                        : <>Request My Free Walkthrough <ArrowRight size={15} /></>}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Navbar ────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrolled ? 'rgba(245,240,232,0.97)' : 'transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(26,46,30,0.08)' : 'none',
        }}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between" style={{ height: 76 }}>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg, #1A5C3A, #1A4A35)' }}>
              <Heart size={17} className="text-white" fill="white" />
            </div>
            <div className="text-left leading-tight">
              <span className="block text-sm font-black tracking-tight" style={{ color: scrolled ? '#1A2E1E' : 'white' }}>CompCare Hub</span>
              <span className="block text-[9px] font-bold tracking-widest uppercase" style={{ color: scrolled ? '#4A7A5A' : 'rgba(255,255,255,0.7)' }}>Digital Care Management</span>
            </div>
          </button>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)}
                className="px-4 py-2 text-sm font-medium rounded-full transition-all"
                style={{ color: scrolled ? '#3A4A3A' : 'rgba(255,255,255,0.85)' }}>
                {l.label}
              </button>
            ))}
            <button onClick={() => setDemoOpen(true)}
              className="ml-4 px-5 py-2.5 rounded-full text-white text-sm font-bold transition-all shadow-lg"
              style={{ background: 'linear-gradient(135deg, #1A5C3A, #1A4A35)' }}>
              Request a Walkthrough
            </button>
            <Link to="/login"
              className="ml-2 px-5 py-2.5 rounded-full text-sm font-semibold border transition-all"
              style={{
                color: scrolled ? '#1A2E1E' : 'white',
                borderColor: scrolled ? 'rgba(26,46,30,0.2)' : 'rgba(255,255,255,0.3)',
                background: scrolled ? 'white' : 'rgba(255,255,255,0.1)',
              }}>
              Log In
            </Link>
          </div>

          <button className="lg:hidden p-2" style={{ color: scrolled ? '#1A2E1E' : 'white' }}
            onClick={() => setMenuOpen(v => !v)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }}
              className="lg:hidden overflow-hidden border-t"
              style={{ background: '#F5F0E8', borderColor: 'rgba(26,46,30,0.08)' }}>
              <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-1">
                {navLinks.map(l => (
                  <button key={l.id} onClick={() => { scrollTo(l.id); setMenuOpen(false); }}
                    className="text-left px-4 py-3 text-sm font-semibold rounded-xl transition-all hover:bg-black/5"
                    style={{ color: '#3A4A3A' }}>{l.label}</button>
                ))}
                <button onClick={() => { setDemoOpen(true); setMenuOpen(false); }}
                  className="mt-2 px-5 py-3 rounded-xl text-white text-sm font-bold text-center"
                  style={{ background: 'linear-gradient(135deg, #1A5C3A, #1A4A35)' }}>
                  Request a Walkthrough
                </button>
                <Link to="/login"
                  className="px-5 py-3 rounded-xl text-sm font-semibold text-center border"
                  style={{ color: '#1A2E1E', borderColor: 'rgba(26,46,30,0.15)', background: 'white' }}>
                  Log In
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Hero — full bleed photography ─────────────────────────────────── */}
      <header className="relative min-h-screen flex items-center overflow-hidden">
        {/* Full bleed photo */}
        <img src={IMG.hero} alt="Care worker and resident enjoying time outdoors"
          className="absolute inset-0 w-full h-full object-cover object-center" />

        {/* Gradient overlay — dark on left for text, fades right */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(8,22,12,0.88) 0%, rgba(8,22,12,0.65) 45%, rgba(8,22,12,0.15) 75%, rgba(8,22,12,0.05) 100%)' }} />

        {/* Bottom vignette */}
        <div className="absolute bottom-0 left-0 right-0 h-40"
          style={{ background: 'linear-gradient(to top, rgba(8,22,12,0.5), transparent)' }} />

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full" style={{ paddingTop: 76 }}>
          <div className="max-w-2xl py-20">
            {/* Trust badge */}
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2.5 rounded-full px-4 py-2 mb-8"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white text-xs font-bold tracking-wide">CQC Compliant · GDPR Secure · Built for UK Care Homes</span>
            </motion.div>

            {/* Headline */}
            <motion.h1 initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.1, ease: EASE }}
              className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.02] tracking-tight mb-6 text-white">
              Care Home<br />
              Management Your<br />
              <em className="not-italic" style={{ fontFamily: '"DM Serif Display", serif', fontStyle: 'italic', color: '#7DD9A8' }}>
                Staff Will Love
              </em>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.28 }}
              className="text-lg leading-relaxed mb-10 max-w-lg"
              style={{ color: 'rgba(255,255,255,0.72)' }}>
              Replace paper records and disconnected systems with one complete platform — from daily care notes and medication to staff rotas, CQC compliance and family updates.
            </motion.p>

            {/* CTAs */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.42 }}
              className="flex flex-wrap gap-3 mb-12">
              <Link to="/login"
                className="px-8 py-4 rounded-2xl text-white font-black text-base flex items-center gap-2 transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #1A5C3A, #2A7A50)', boxShadow: '0 8px 32px rgba(26,92,58,0.45)' }}>
                Start Free Trial <ArrowRight size={16} />
              </Link>
              <button onClick={() => setDemoOpen(true)}
                className="px-8 py-4 rounded-2xl font-bold text-base flex items-center gap-2.5 transition-all hover:-translate-y-0.5"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.3)', color: 'white', backdropFilter: 'blur(8px)' }}>
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                  <Play size={10} fill="white" className="text-white ml-0.5" />
                </div>
                See a Walkthrough
              </button>
            </motion.div>

            {/* Social proof */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.6 }}
              className="flex flex-wrap items-center gap-6">
              {[
                { icon: Shield, text: 'CQC Ready' },
                { icon: Lock, text: 'GDPR Compliant' },
                { icon: Users, text: '500+ Residents Managed' },
                { icon: CheckCircle, text: 'No Setup Fee' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <Icon size={12} style={{ color: '#7DD9A8' }} />{text}
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Scroll cue */}
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          <span className="text-xs font-medium tracking-widest uppercase">Scroll</span>
          <ChevronDown size={16} />
        </motion.div>
      </header>

      {/* ── Stats band ────────────────────────────────────────────────────── */}
      <section style={{ background: '#EDE8DF', borderBottom: '1px solid rgba(26,46,30,0.08)' }}>
        <div className="max-w-5xl mx-auto px-6 py-14">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
            className="grid grid-cols-2 md:grid-cols-4 gap-10">
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

      {/* ── "Personalised Care" photo card grid ───────────────────────────── */}
      <section style={{ background: '#F5F0E8' }} className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: '#1A5C3A' }}>What We Offer</p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4" style={{ color: '#1A2E1E' }}>
                Complete Care Management,<br />
                <em style={{ fontFamily: '"DM Serif Display", serif', fontStyle: 'italic', color: '#1A5C3A' }}>
                  Every Day
                </em>
              </h2>
              <p className="text-base max-w-2xl mx-auto" style={{ color: '#6B7A6A' }}>
                Built by people who understand care homes — covering resident wellbeing, staff operations and CQC compliance in one beautifully simple platform.
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { img: IMG.card1, label: 'Resident Care', title: 'Every resident profile, always up to date', desc: 'Care plans, MAR, risk assessments, daily records and family updates — all linked and accessible from any device.' },
              { img: IMG.card2, label: 'Staff Management', title: 'Your team, organised and compliant', desc: 'Rota, timesheets, DBS tracking, training records and supervision notes — with automatic alerts before anything expires.' },
              { img: IMG.card3, label: 'CQC Compliance', title: 'Inspection-ready, every single day', desc: 'Incident reports, safeguarding concerns and a complete audit trail — with AI-generated compliance reports in seconds.' },
            ].map((card, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div className="rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group cursor-pointer"
                  style={{ background: 'white' }}>
                  <div className="relative overflow-hidden" style={{ height: 220 }}>
                    <img src={card.img} alt={card.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-4 left-4">
                      <span className="text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full text-white"
                        style={{ background: 'rgba(26,92,58,0.85)', backdropFilter: 'blur(8px)' }}>
                        {card.label}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-black text-lg mb-2 leading-snug" style={{ color: '#1A2E1E', fontFamily: '"DM Serif Display", serif' }}>
                      {card.title}
                    </h3>
                    <p className="text-sm leading-relaxed mb-4" style={{ color: '#6B7A6A' }}>{card.desc}</p>
                    <button onClick={() => setDemoOpen(true)}
                      className="flex items-center gap-1.5 text-sm font-bold transition-colors"
                      style={{ color: '#1A5C3A' }}>
                      See how it works <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature deep-dive — alternating image + text ───────────────────── */}
      <section id="features" style={{ background: '#EDE8DF' }} className="py-24">
        <div className="max-w-7xl mx-auto px-6 space-y-24">
          {[
            {
              tag: 'Digital MAR',
              title: "Medication administration\nyour team can trust",
              body: "Paper MAR charts are a compliance risk. CompCare Hub's digital MAR lets carers record every medication in real time — with controlled drug witness sign-off, PRN logs and stock management built in.",
              bullets: ['Controlled drug witness signing, done digitally', 'PRN medication logs with reason and outcome', 'Stock count tracking and low-stock alerts', 'Full history — every dose, every carer, every time'],
              img: IMG.feature1,
              imgAlt: 'Nurse reviewing medication records on a tablet',
            },
            {
              tag: 'Staff & HR',
              title: "From rota to DBS — all in\none place",
              body: "Managing a care team is complex. CompCare Hub brings your rota, timesheets, leave, DBS tracking, training records and supervision notes into a single system — with automatic alerts before anything expires.",
              bullets: ['Visual rota builder with GPS clock-in verification', 'DBS and training expiry alerts sent automatically', 'Leave requests and approvals handled in the app', 'Staff performance matrix and appraisal records'],
              img: IMG.feature2,
              imgAlt: 'Care home team in a staff planning meeting',
              flip: true,
            },
            {
              tag: 'Audit & Reporting',
              title: "CQC audit reports in\nminutes, not days",
              body: "When an inspector arrives, you need to demonstrate quality care instantly. CompCare Hub generates a complete audit report from your live data in seconds — covering care plans, incidents, training, MAR and more.",
              bullets: ['AI-generated CQC audit report from live data', 'Full audit trail for every action across the home', 'Incident, safeguarding and complaint management', 'Exportable reports for inspectors and trustees'],
              img: IMG.feature3,
              imgAlt: 'Care manager reviewing compliance documentation',
            },
          ].map((section, idx) => (
            <Reveal key={idx} delay={0.05}>
              <div className={`grid md:grid-cols-2 gap-14 items-center ${section.flip ? 'md:[&>*:first-child]:order-2' : ''}`}>
                {/* Text */}
                <div>
                  <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: '#1A5C3A' }}>{section.tag}</p>
                  <h3 className="text-3xl md:text-4xl font-black tracking-tight mb-5 leading-tight whitespace-pre-line" style={{ color: '#1A2E1E', fontFamily: '"DM Serif Display", serif' }}>
                    {section.title}
                  </h3>
                  <p className="text-base leading-relaxed mb-7" style={{ color: '#6B7A6A' }}>{section.body}</p>
                  <ul className="space-y-3 mb-8">
                    {section.bullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm" style={{ color: '#3A4A3A' }}>
                        <CheckCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#1A5C3A' }} />{b}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => setDemoOpen(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-bold transition-all hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg, #1A5C3A, #1A4A35)' }}>
                    See this in action <ArrowRight size={14} />
                  </button>
                </div>

                {/* Image */}
                <div className="relative">
                  <div className="absolute -inset-6 rounded-3xl opacity-20" style={{ background: '#1A5C3A', filter: 'blur(48px)' }} />
                  <div className="relative rounded-3xl overflow-hidden shadow-2xl" style={{ aspectRatio: '4/3' }}>
                    <img src={section.img} alt={section.imgAlt} className="w-full h-full object-cover" />
                  </div>
                  {/* Accent square */}
                  <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-2xl opacity-30"
                    style={{ background: 'linear-gradient(135deg, #1A5C3A, #2A7A50)' }} />
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Module cloud ──────────────────────────────────────────────────── */}
      <section id="modules" style={{ background: '#F5F0E8' }} className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: '#1A5C3A' }}>50+ Modules</p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4" style={{ color: '#1A2E1E' }}>
                One platform.{' '}
                <em style={{ fontFamily: '"DM Serif Display", serif', fontStyle: 'italic', color: '#1A5C3A' }}>Every module.</em>
              </h2>
              <p className="text-base max-w-xl mx-auto" style={{ color: '#6B7A6A' }}>
                From seizure logs to staff appraisals — if it happens in a care home, CompCare Hub covers it.
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Resident Care', modules: RESIDENT_MODULES, accent: '#1A5C3A', bg: '#E8F4EE', border: '#B8DCC8' },
              { title: 'Staff & HR', modules: STAFF_MODULES, accent: '#1A3A6B', bg: '#E8EDF6', border: '#B8C8E8' },
              { title: 'Compliance & Ops', modules: COMPLIANCE_MODULES, accent: '#7A3A10', bg: '#F5EDE0', border: '#E0C5A0' },
            ].map(col => (
              <Reveal key={col.title} delay={0.08}>
                <div className="rounded-3xl p-6 shadow-sm h-full" style={{ background: 'white', border: '1px solid rgba(26,46,30,0.08)' }}>
                  <h3 className="text-xs font-black uppercase tracking-widest mb-5" style={{ color: col.accent }}>{col.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    {col.modules.map(m => (
                      <span key={m} className="text-xs font-semibold px-3 py-1.5 rounded-full"
                        style={{ background: col.bg, color: col.accent, border: `1px solid ${col.border}` }}>
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────────── */}
      <section id="testimonials" className="py-24" style={{ background: '#1A2E1E' }}>
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: '#7DD9A8' }}>Trusted By</p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-white">
                Real results from{' '}
                <em style={{ fontFamily: '"DM Serif Display", serif', fontStyle: 'italic', color: '#7DD9A8' }}>real homes</em>
              </h2>
              <p className="text-base max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Hear from the care managers who run their homes on CompCare Hub every day.
              </p>
            </div>
          </Reveal>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} variants={cardAnim}
                className="rounded-3xl p-7 flex flex-col"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex gap-0.5 mb-5">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} size={13} fill="#F59E0B" className="text-amber-400" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed flex-1 mb-6" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <img src={t.img} alt={t.name} className="w-11 h-11 rounded-full object-cover"
                    style={{ border: '2px solid rgba(125,217,168,0.3)' }} />
                  <div>
                    <p className="text-sm font-bold text-white">{t.name}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{t.role}</p>
                    <p className="text-xs" style={{ color: '#7DD9A8' }}>{t.home}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24" style={{ background: '#EDE8DF' }}>
        <div className="max-w-4xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: '#1A5C3A' }}>Pricing</p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4" style={{ color: '#1A2E1E' }}>
                Simple, transparent{' '}
                <em style={{ fontFamily: '"DM Serif Display", serif', fontStyle: 'italic', color: '#1A5C3A' }}>pricing</em>
              </h2>
              <p className="text-base max-w-md mx-auto" style={{ color: '#6B7A6A' }}>
                No setup fees. No hidden costs. Cancel any time.
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Starter */}
            <Reveal delay={0}>
              <div className="rounded-3xl p-8 flex flex-col h-full shadow-sm" style={{ background: 'white', border: '1px solid rgba(26,46,30,0.1)' }}>
                <div className="mb-7">
                  <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#6B7A6A' }}>Starter</p>
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-5xl font-black" style={{ color: '#1A2E1E', fontFamily: '"DM Serif Display", serif' }}>£99</span>
                    <span className="text-sm font-medium" style={{ color: '#8A9A8A' }}>/month</span>
                  </div>
                  <p className="text-sm" style={{ color: '#8A9A8A' }}>For single-site care homes</p>
                </div>
                <ul className="space-y-3.5 flex-1 mb-8">
                  {['Up to 30 residents', 'All care & MAR modules', 'Staff management & rota', 'DBS & training tracking', 'Email support within 24 hours'].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm" style={{ color: '#3A4A3A' }}>
                      <CheckCircle size={15} style={{ color: '#1A5C3A', flexShrink: 0 }} />{f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => setDemoOpen(true)}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold border-2 transition-all"
                  style={{ color: '#1A5C3A', borderColor: '#1A5C3A', background: 'white' }}>
                  Start Free Trial
                </button>
              </div>
            </Reveal>

            {/* Professional */}
            <Reveal delay={0.1}>
              <div className="rounded-3xl p-8 relative overflow-hidden flex flex-col h-full shadow-xl"
                style={{ background: 'linear-gradient(135deg, #1A5C3A 0%, #1A3A2A 100%)' }}>
                <div className="absolute top-6 right-6">
                  <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
                    style={{ background: 'rgba(125,217,168,0.2)', color: '#7DD9A8', border: '1px solid rgba(125,217,168,0.3)' }}>
                    Most Popular
                  </span>
                </div>
                <div className="mb-7">
                  <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Professional</p>
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-5xl font-black text-white" style={{ fontFamily: '"DM Serif Display", serif' }}>£199</span>
                    <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>/month</span>
                  </div>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>For multi-home groups</p>
                </div>
                <ul className="space-y-3.5 flex-1 mb-8">
                  {['Unlimited residents', 'Everything in Starter', 'Multi-home management', 'AI audit reports & analytics', 'Priority phone support'].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-white">
                      <CheckCircle size={15} style={{ color: '#7DD9A8', flexShrink: 0 }} />{f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => setDemoOpen(true)}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all"
                  style={{ background: 'white', color: '#1A5C3A' }}>
                  Start Free Trial
                </button>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.15}>
            <p className="text-center text-sm mt-8" style={{ color: '#8A9A8A' }}>
              Not sure which plan?{' '}
              <button onClick={() => setDemoOpen(true)} className="font-bold underline" style={{ color: '#1A5C3A' }}>
                Request a free walkthrough
              </button>{' '}
              and we'll recommend the right one for your home.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Final CTA with photography ────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ minHeight: 420 }}>
        <img src={IMG.ctaBg} alt="Care team outdoors" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(10,30,18,0.92) 0%, rgba(26,92,58,0.80) 100%)' }} />
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-28 text-center">
          <Reveal>
            <p className="text-xs font-black uppercase tracking-widest mb-5" style={{ color: '#7DD9A8' }}>Ready to get started?</p>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-5 leading-tight">
              Join care homes already running<br />
              <em style={{ fontFamily: '"DM Serif Display", serif', fontStyle: 'italic', color: '#7DD9A8' }}>
                on CompCare Hub
              </em>
            </h2>
            <p className="text-lg mb-10 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Start your free trial today — no card required. Or let us walk you through the full platform in 30 minutes.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/login"
                className="px-9 py-4 rounded-2xl font-black text-base flex items-center gap-2 transition-all hover:-translate-y-0.5"
                style={{ background: 'white', color: '#1A5C3A', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
                Start Free Trial <ArrowRight size={16} />
              </Link>
              <button onClick={() => setDemoOpen(true)}
                className="px-9 py-4 rounded-2xl font-bold text-base border-2 text-white transition-all hover:bg-white/10"
                style={{ borderColor: 'rgba(255,255,255,0.35)' }}>
                Request a Walkthrough
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#0D1E12' }} className="pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(125,217,168,0.12)', border: '1px solid rgba(125,217,168,0.2)' }}>
                  <Heart size={16} style={{ color: '#7DD9A8' }} fill="#7DD9A8" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">CompCare Hub</p>
                  <p className="text-[9px] font-bold tracking-widest uppercase" style={{ color: '#4A7A5A' }}>Digital Care Management</p>
                </div>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
                The complete digital care management platform for CQC-regulated care homes and supported living providers across the UK.
              </p>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-widest mb-5 text-white">Platform</p>
              <ul className="space-y-3">
                {['Resident Care', 'Staff Management', 'CQC Compliance', 'Family Portal', 'Pricing'].map(l => (
                  <li key={l}>
                    <span className="text-sm cursor-pointer transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }}>{l}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-widest mb-5 text-white">Company</p>
              <ul className="space-y-3">
                {['About Us', 'Privacy Policy', 'Terms of Service', 'Support'].map(l => (
                  <li key={l}><span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{l}</span></li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-widest mb-5 text-white">Get In Touch</p>
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <Mail size={13} style={{ color: '#7DD9A8', flexShrink: 0 }} />hello@compcarehub.co.uk
                </div>
                <div className="flex items-center gap-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <Phone size={13} style={{ color: '#7DD9A8', flexShrink: 0 }} />0800 123 4567
                </div>
                <div className="flex items-center gap-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <Globe size={13} style={{ color: '#7DD9A8', flexShrink: 0 }} />Available UK-wide
                </div>
              </div>
              <button onClick={() => setDemoOpen(true)}
                className="w-full py-3 text-sm font-bold text-white rounded-xl transition-opacity hover:opacity-90"
                style={{ background: 'rgba(125,217,168,0.12)', border: '1px solid rgba(125,217,168,0.2)' }}>
                Request Walkthrough
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
              © {new Date().getFullYear()} CompCare Hub. All rights reserved. Built for care homes in England and Wales.
            </p>
            <div className="flex items-center gap-3">
              {['CQC Aligned', 'GDPR Compliant', 'NHS-Aligned'].map(b => (
                <span key={b} className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(125,217,168,0.08)', color: '#7DD9A8', border: '1px solid rgba(125,217,168,0.15)' }}>
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
