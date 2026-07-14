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

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.09 } } };
const cardAnim = { hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

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

function StatCounter({ target, suffix, label, color = '#0F766E' }: { target: number; suffix: string; label: string; color?: string }) {
  const { count, ref } = useCounter(target);
  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl md:text-5xl font-black tabular-nums tracking-tight mb-1" style={{ color }}>{count}{suffix}</div>
      <div className="text-sm font-medium text-slate-500">{label}</div>
    </div>
  );
}

// ── Unsplash care photography ──────────────────────────────────────────────────
const IMG = {
  hero:       'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=900&q=85&auto=format&fit=crop',
  careWorker: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=700&q=80&auto=format&fit=crop',
  team:       'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=700&q=80&auto=format&fit=crop',
  compliance: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=700&q=80&auto=format&fit=crop',
  ctaBg:      'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=1400&q=75&auto=format&fit=crop',
  t1:         'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=120&q=80&auto=format&fit=crop&crop=face',
  t2:         'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&q=80&auto=format&fit=crop&crop=face',
  t3:         'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=120&q=80&auto=format&fit=crop&crop=face',
};

// ── Feature alternating sections ───────────────────────────────────────────────
const FEATURE_SECTIONS = [
  {
    tag: 'Resident Care',
    headline: "Every resident's story, in one place",
    body: 'Care plans, medication records, risk assessments, daily notes and family updates — all linked to a single resident profile. Care staff spend less time searching and more time caring.',
    bullets: ['Digital care plans reviewed against CQC outcomes', 'MAR with controlled drug witness signing', 'Real-time daily records from any device', 'Family portal with private sharing links'],
    img: IMG.careWorker,
    imgAlt: 'Nurse reviewing care records on a tablet',
  },
  {
    tag: 'Staff Management',
    headline: 'Run your team without the chaos',
    body: 'Rota, timesheets, training records, DBS compliance and supervision notes — managed in a single platform. Automatic alerts before anything expires.',
    bullets: ['Drag-and-drop rota with GPS clock-in', 'DBS expiry alerts sent automatically', 'Training certificates tracked per staff member', 'Leave requests approved in the app'],
    img: IMG.team,
    imgAlt: 'Care team in a planning meeting',
    flip: true,
  },
  {
    tag: 'CQC Compliance',
    headline: 'Inspection-ready, every single day',
    body: 'Audit trail, incident reports, safeguarding concerns and CQC notifications are logged automatically. Generate a full compliance report in seconds — not hours.',
    bullets: ['Full audit trail for every action taken', 'Incident and safeguarding management', 'AI-generated CQC audit reports', 'Policies, PPE, maintenance all in one place'],
    img: IMG.compliance,
    imgAlt: 'Care manager reviewing compliance dashboard',
  },
];

// ── Testimonials ───────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    quote: "We replaced three separate systems with CompCare Hub. Our staff now spend 40% less time on paperwork and our last CQC inspection went smoother than ever.",
    name: 'Sarah Mitchell',
    role: 'Registered Manager',
    home: 'Oakwood Care Home, Birmingham',
    img: IMG.t1,
  },
  {
    quote: "The MAR system alone saved us so much time. Controlled drug sign-offs, PRN records, stock counts — everything our pharmacist needs is already there when they visit.",
    name: 'James Okonkwo',
    role: 'Home Manager',
    home: 'Sunrise Lodge, Manchester',
    img: IMG.t2,
  },
  {
    quote: "Families love the portal. They can see their relative's daily notes and activities without us having to make a single phone call. It's transformed our relationships.",
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
  'Rota', 'Clock In', 'Timesheets', 'Training', 'DBS', 'Supervision',
  'Appraisals', 'Leave', 'Recruitment', 'Staff Messages', 'Staff Profiles',
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
    const fn = () => setScrolled(window.scrollY > 50);
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
      toast.success('Request received! We\'ll be in touch within one working day.');
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
    <div className="min-h-screen font-sans overflow-x-hidden bg-[#FAFAF7]" style={{ color: '#1A2332' }}>

      {/* ── Walkthrough modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {demoOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: 'rgba(12,21,34,0.75)', backdropFilter: 'blur(10px)' }}
            onClick={e => { if (e.target === e.currentTarget) setDemoOpen(false); }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ duration: 0.28, ease: EASE }}
              className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl">

              {/* Top image strip */}
              <div className="relative h-32 overflow-hidden">
                <img src={IMG.hero} alt="Care home" className="w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(15,118,110,0.7), rgba(15,118,110,0.9))' }} />
                <button onClick={() => setDemoOpen(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                  <X size={14} className="text-white" />
                </button>
                <div className="absolute bottom-4 left-6">
                  <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-0.5">Free Walkthrough</p>
                  <h3 className="text-white text-xl font-black">See CompCare in Action</h3>
                </div>
              </div>

              <div className="p-6">
                {demoSubmitted ? (
                  <div className="text-center py-6">
                    <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={28} className="text-teal-600" />
                    </div>
                    <h4 className="text-lg font-black text-slate-900 mb-2">You're booked in!</h4>
                    <p className="text-slate-500 text-sm mb-5">We'll send you a confirmation and be in touch within one working day to arrange your walkthrough.</p>
                    <button onClick={() => { setDemoSubmitted(false); setDemoOpen(false); }}
                      className="text-teal-600 text-sm font-bold hover:text-teal-700">Close</button>
                  </div>
                ) : (
                  <form onSubmit={submitDemo} className="space-y-3">
                    <p className="text-slate-500 text-sm mb-4">We'll give you a personalised 30-minute walkthrough of the full platform — free, no commitment.</p>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Your Name *</label>
                      <input required
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all text-sm"
                        value={demoForm.name}
                        onChange={e => setDemoForm({ ...demoForm, name: e.target.value })}
                        placeholder="Jane Smith" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Work Email *</label>
                      <input required type="email"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all text-sm"
                        value={demoForm.email}
                        onChange={e => setDemoForm({ ...demoForm, email: e.target.value })}
                        placeholder="jane@carehome.co.uk" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Phone</label>
                        <input
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all text-sm"
                          value={demoForm.phone}
                          onChange={e => setDemoForm({ ...demoForm, phone: e.target.value })}
                          placeholder="07700 900000" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Care Home</label>
                        <input
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all text-sm"
                          value={demoForm.homeName}
                          onChange={e => setDemoForm({ ...demoForm, homeName: e.target.value })}
                          placeholder="Sunrise Lodge" />
                      </div>
                    </div>
                    <button type="submit" disabled={demoLoading}
                      className="w-full mt-1 bg-[#0F766E] text-white font-bold text-sm py-3.5 rounded-xl hover:bg-[#0d6b63] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
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
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-400 ${
        scrolled ? 'bg-white border-b border-slate-100 shadow-sm' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between" style={{ height: 72 }}>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#0F766E' }}>
              <Heart size={16} className="text-white" />
            </div>
            <div className="leading-tight text-left">
              <span className="block text-sm font-black tracking-tight text-slate-900">CompCare Hub</span>
              <span className="block text-[9px] font-bold tracking-widest text-teal-600 uppercase">Digital Care Management</span>
            </div>
          </button>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-all">
                {l.label}
              </button>
            ))}
            <button onClick={() => setDemoOpen(true)}
              className="ml-3 px-5 py-2.5 bg-[#0F766E] text-white text-sm font-bold rounded-full hover:bg-[#0d6b63] transition-colors">
              Get a Walkthrough
            </button>
            <Link to="/login"
              className="ml-2 px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-full hover:bg-slate-50 transition-colors">
              Log In
            </Link>
          </div>

          <button className="lg:hidden p-2 text-slate-700" onClick={() => setMenuOpen(v => !v)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }}
              className="lg:hidden bg-white border-t border-slate-100 overflow-hidden">
              <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-1">
                {navLinks.map(l => (
                  <button key={l.id} onClick={() => { scrollTo(l.id); setMenuOpen(false); }}
                    className="text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
                    {l.label}
                  </button>
                ))}
                <button onClick={() => { setDemoOpen(true); setMenuOpen(false); }}
                  className="mt-2 px-5 py-3 bg-[#0F766E] text-white text-sm font-bold rounded-xl text-center hover:bg-[#0d6b63] transition-colors">
                  Get a Walkthrough
                </button>
                <Link to="/login"
                  className="px-5 py-3 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl text-center hover:bg-slate-50 transition-colors">
                  Log In
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <header className="relative min-h-screen flex items-center overflow-hidden bg-[#FAFAF7]" style={{ paddingTop: 72 }}>
        {/* Subtle background blobs */}
        <div className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full pointer-events-none opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #0F766E 0%, transparent 70%)', transform: 'translate(30%, -20%)' }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #F59E0B 0%, transparent 70%)', transform: 'translate(-30%, 20%)' }} />

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left column */}
            <div>
              <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-full px-4 py-2 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                <span className="text-teal-700 text-xs font-bold tracking-wide">CQC-Compliant Care Management Software</span>
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
                className="text-4xl md:text-5xl lg:text-[3.4rem] font-black leading-[1.05] tracking-tight mb-6 text-slate-900">
                Modern care management.<br />
                <span style={{ color: '#0F766E' }}>Built for care homes.</span>
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="text-lg leading-relaxed text-slate-500 mb-10 max-w-lg">
                Replace paper records and disconnected systems with one complete platform — from daily care notes and medication to staff rotas, CQC compliance and family updates.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-wrap gap-3 mb-10">
                <Link to="/login"
                  className="px-8 py-4 text-white font-bold text-base rounded-2xl shadow-lg transition-all duration-200 hover:-translate-y-0.5 flex items-center gap-2"
                  style={{ background: '#0F766E', boxShadow: '0 8px 32px rgba(15,118,110,0.25)' }}>
                  Start Free Trial <ArrowRight size={16} />
                </Link>
                <button onClick={() => setDemoOpen(true)}
                  className="px-8 py-4 border border-slate-200 text-slate-700 font-bold text-base rounded-2xl hover:border-slate-300 hover:bg-white transition-all duration-200 flex items-center gap-2 bg-white">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#0F766E' }}>
                    <Play size={9} fill="white" className="text-white ml-0.5" />
                  </div>
                  See a Walkthrough
                </button>
              </motion.div>

              {/* Trust row */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.6 }}
                className="flex flex-wrap items-center gap-5">
                {[
                  { icon: Shield, text: 'CQC Ready' },
                  { icon: Lock, text: 'GDPR Compliant' },
                  { icon: CheckCircle, text: 'NHS-Aligned' },
                  { icon: Users, text: '500+ Residents Managed' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <Icon size={13} className="text-teal-600" />{text}
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right column — photography + floating cards */}
            <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
              className="hidden lg:block relative">

              {/* Main care photo */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl" style={{ aspectRatio: '4/3' }}>
                <img src={IMG.hero} alt="Nurse providing compassionate care" className="w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(12,21,34,0.3) 0%, transparent 60%)' }} />
              </div>

              {/* Floating card — top left */}
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -left-8 top-10 bg-white rounded-2xl shadow-xl p-4 min-w-[180px] border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
                    <CheckCircle size={14} className="text-teal-600" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">Care Plan Updated</span>
                </div>
                <p className="text-xs text-slate-400">Margaret Wilson · Room 14</p>
                <p className="text-[10px] text-slate-300 mt-0.5">2 minutes ago</p>
              </motion.div>

              {/* Floating card — bottom right */}
              <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute -right-8 bottom-12 bg-white rounded-2xl shadow-xl p-4 min-w-[200px] border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Pill size={14} className="text-amber-600" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">MAR Chart</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Morning round</span>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">All given ✓</span>
                </div>
              </motion.div>

              {/* Floating card — bottom left */}
              <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                className="absolute -left-4 bottom-8 bg-white rounded-2xl shadow-lg p-3 border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center">
                    <Bell size={12} className="text-rose-500" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-700">DBS Renewal</p>
                    <p className="text-[10px] text-slate-400">Alert sent to manager</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* ── Stats band ────────────────────────────────────────────────────── */}
      <section className="bg-[#0C1A2E] py-14">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
            className="grid grid-cols-2 md:grid-cols-4 gap-10">
            {[
              { target: 70, suffix: '%', label: 'Reduction in admin time', color: '#34D399' },
              { target: 50, suffix: '+', label: 'Care modules included', color: '#60A5FA' },
              { target: 500, suffix: '+', label: 'Residents actively managed', color: '#F59E0B' },
              { target: 99, suffix: '%', label: 'CQC inspection pass rate', color: '#A78BFA' },
            ].map((s, i) => (
              <motion.div key={i} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}>
                <StatCounter {...s} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Feature alternating sections ──────────────────────────────────── */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-20">
              <span className="inline-block text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border mb-5 text-teal-700 bg-teal-50 border-teal-100">
                The Platform
              </span>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 mb-4">
                Everything your care home needs,<br />nothing it doesn't
              </h2>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                Built by people who understand care — covering resident care, staff management and CQC compliance in a single, beautifully simple platform.
              </p>
            </div>
          </Reveal>

          <div className="space-y-24">
            {FEATURE_SECTIONS.map((section, idx) => (
              <Reveal key={idx} delay={0.1}>
                <div className={`grid md:grid-cols-2 gap-12 items-center ${section.flip ? 'md:[&>*:first-child]:order-2' : ''}`}>
                  {/* Text */}
                  <div>
                    <span className="inline-block text-xs font-bold uppercase tracking-widest text-teal-600 mb-4">{section.tag}</span>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-4">{section.headline}</h3>
                    <p className="text-slate-500 text-base leading-relaxed mb-6">{section.body}</p>
                    <ul className="space-y-3">
                      {section.bullets.map((b, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                          <CheckCircle size={16} className="text-teal-500 flex-shrink-0 mt-0.5" />
                          {b}
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => setDemoOpen(true)}
                      className="mt-8 flex items-center gap-2 text-sm font-bold text-teal-700 hover:text-teal-800 transition-colors">
                      See this in action <ChevronRight size={14} />
                    </button>
                  </div>

                  {/* Image */}
                  <div className="relative">
                    <div className="absolute -inset-4 rounded-3xl opacity-[0.08]" style={{ background: '#0F766E', filter: 'blur(40px)' }} />
                    <div className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-100" style={{ aspectRatio: '4/3' }}>
                      <img src={section.img} alt={section.imgAlt} className="w-full h-full object-cover" />
                    </div>
                    {/* Small accent dot */}
                    <div className="absolute -bottom-3 -right-3 w-16 h-16 rounded-2xl"
                      style={{ background: 'linear-gradient(135deg, #0F766E, #14b8a6)', opacity: 0.12 }} />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Module cloud ──────────────────────────────────────────────────── */}
      <section id="modules" className="py-24 bg-[#FAFAF7]">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-14">
              <span className="inline-block text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border mb-5 text-teal-700 bg-teal-50 border-teal-100">
                50+ Modules
              </span>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 mb-4">One platform. Every module.</h2>
              <p className="text-slate-500 max-w-xl mx-auto">From seizure logs to staff appraisals — if it happens in a care home, CompCare Hub covers it.</p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'Resident Care', modules: RESIDENT_MODULES, color: '#0F766E', bg: '#F0FDF4', border: '#BBF7D0' },
              { title: 'Staff & HR', modules: STAFF_MODULES, color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
              { title: 'Compliance & Operations', modules: COMPLIANCE_MODULES, color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
            ].map(col => (
              <Reveal key={col.title} delay={0.1}>
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm h-full">
                  <h3 className="font-black text-slate-900 text-sm uppercase tracking-widest mb-5"
                    style={{ color: col.color }}>{col.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    {col.modules.map(m => (
                      <span key={m} className="text-xs font-semibold px-3 py-1.5 rounded-full border"
                        style={{ background: col.bg, color: col.color, borderColor: col.border }}>
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
      <section id="testimonials" className="py-24 bg-[#0C1A2E]">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-14">
              <span className="inline-block text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border mb-5 text-teal-400 border-teal-500/30 bg-teal-500/10">
                Trusted by Care Managers
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4">Real results from real homes</h2>
              <p className="text-slate-400 max-w-xl mx-auto">Hear from the managers who run their homes on CompCare Hub every day.</p>
            </div>
          </Reveal>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} variants={cardAnim}
                className="rounded-3xl p-6 flex flex-col"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {/* Stars */}
                <div className="flex gap-0.5 mb-5">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} size={13} fill="#F59E0B" className="text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed flex-1 mb-6">"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <img src={t.img} alt={t.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-teal-500/30" />
                  <div>
                    <p className="text-white text-sm font-bold">{t.name}</p>
                    <p className="text-slate-500 text-xs">{t.role} · {t.home}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-14">
              <span className="inline-block text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border mb-5 text-teal-700 bg-teal-50 border-teal-100">
                Pricing
              </span>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 mb-4">Simple, transparent pricing</h2>
              <p className="text-slate-500 max-w-md mx-auto">No setup fees. No hidden costs. Cancel any time.</p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Starter */}
            <Reveal delay={0}>
              <div className="rounded-3xl border border-slate-200 p-8 h-full flex flex-col">
                <div className="mb-6">
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Starter</p>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-black text-slate-900">£99</span>
                    <span className="text-slate-400 text-sm">/month</span>
                  </div>
                  <p className="text-slate-400 text-sm">For single-site care homes</p>
                </div>
                <ul className="space-y-3 flex-1 mb-8">
                  {['Up to 30 residents', 'All care & MAR modules', 'Staff management & rota', 'DBS & training tracking', 'Email support'].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-slate-600">
                      <CheckCircle size={15} className="text-teal-500 flex-shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => setDemoOpen(true)}
                  className="w-full py-3.5 border border-slate-200 text-slate-700 font-bold text-sm rounded-2xl hover:border-slate-300 hover:bg-slate-50 transition-colors">
                  Start Free Trial
                </button>
              </div>
            </Reveal>

            {/* Professional */}
            <Reveal delay={0.1}>
              <div className="rounded-3xl p-8 relative overflow-hidden h-full flex flex-col"
                style={{ background: 'linear-gradient(135deg, #0F766E 0%, #0d6b63 100%)', boxShadow: '0 20px 60px rgba(15,118,110,0.3)' }}>
                <div className="absolute top-5 right-5">
                  <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 text-white px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
                <div className="mb-6">
                  <p className="text-sm font-bold text-teal-200 uppercase tracking-widest mb-1">Professional</p>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-black text-white">£199</span>
                    <span className="text-teal-200 text-sm">/month</span>
                  </div>
                  <p className="text-teal-200 text-sm">For multi-home groups</p>
                </div>
                <ul className="space-y-3 flex-1 mb-8">
                  {['Unlimited residents', 'All Starter features', 'Multi-home management', 'AI audit reports & analytics', 'Priority phone support'].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm text-white">
                      <CheckCircle size={15} className="text-teal-300 flex-shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => setDemoOpen(true)}
                  className="w-full py-3.5 bg-white text-[#0F766E] font-bold text-sm rounded-2xl hover:bg-teal-50 transition-colors">
                  Start Free Trial
                </button>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.2}>
            <p className="text-center text-slate-400 text-sm mt-8">
              Not sure which plan? <button onClick={() => setDemoOpen(true)} className="text-teal-600 font-bold hover:underline">Book a free walkthrough</button> and we'll recommend the right one for your home.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── CTA with care photography ─────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ minHeight: 400 }}>
        <img src={IMG.ctaBg} alt="Care professionals" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(12,26,46,0.93) 0%, rgba(15,118,110,0.85) 100%)' }} />
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-24 text-center">
          <Reveal>
            <p className="text-teal-300 text-xs font-bold uppercase tracking-widest mb-5">Ready to get started?</p>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-6 leading-tight">
              Join care homes already<br />running on CompCare Hub
            </h2>
            <p className="text-slate-300 text-lg mb-10 max-w-xl mx-auto">
              Start your free trial today — no card required. Or let us walk you through the full platform in 30 minutes.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/login"
                className="px-8 py-4 bg-white text-[#0F766E] font-black text-base rounded-2xl hover:bg-teal-50 transition-colors flex items-center gap-2">
                Start Free Trial <ArrowRight size={16} />
              </Link>
              <button onClick={() => setDemoOpen(true)}
                className="px-8 py-4 border-2 border-white/30 text-white font-bold text-base rounded-2xl hover:bg-white/10 transition-colors">
                Request a Walkthrough
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="bg-[#060D18] text-slate-400 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#0F766E' }}>
                  <Heart size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">CompCare Hub</p>
                  <p className="text-[9px] font-bold tracking-widest text-teal-400 uppercase">Digital Care Management</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                The complete digital care management platform for CQC-regulated care homes and supported living providers across the UK.
              </p>
            </div>

            {/* Platform */}
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-300 mb-5">Platform</p>
              <ul className="space-y-3">
                {['Resident Care', 'Staff Management', 'CQC Compliance', 'Family Portal', 'Pricing'].map(l => (
                  <li key={l}><button onClick={() => scrollTo(l.toLowerCase().replace(' ', '-'))}
                    className="text-sm text-slate-500 hover:text-white transition-colors">{l}</button></li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-300 mb-5">Company</p>
              <ul className="space-y-3">
                {['About Us', 'Privacy Policy', 'Terms of Service', 'Contact'].map(l => (
                  <li key={l}><span className="text-sm text-slate-500">{l}</span></li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-300 mb-5">Get in Touch</p>
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 text-sm text-slate-500">
                  <Mail size={13} className="text-teal-500 flex-shrink-0" />
                  hello@compcarehub.co.uk
                </div>
                <div className="flex items-center gap-2.5 text-sm text-slate-500">
                  <Phone size={13} className="text-teal-500 flex-shrink-0" />
                  0800 123 4567
                </div>
                <div className="flex items-center gap-2.5 text-sm text-slate-500">
                  <Globe size={13} className="text-teal-500 flex-shrink-0" />
                  Available UK-wide
                </div>
              </div>
              <button onClick={() => setDemoOpen(true)}
                className="mt-6 w-full py-3 text-sm font-bold text-white rounded-xl transition-colors"
                style={{ background: '#0F766E' }}>
                Request Walkthrough
              </button>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-600">© {new Date().getFullYear()} CompCare Hub. All rights reserved. Built for care homes in England and Wales.</p>
            <div className="flex items-center gap-4">
              <span className="text-xs bg-teal-900/40 text-teal-400 border border-teal-700/30 px-2.5 py-1 rounded-full font-semibold">CQC Aligned</span>
              <span className="text-xs bg-blue-900/40 text-blue-400 border border-blue-700/30 px-2.5 py-1 rounded-full font-semibold">GDPR Compliant</span>
              <span className="text-xs bg-purple-900/40 text-purple-400 border border-purple-700/30 px-2.5 py-1 rounded-full font-semibold">NHS-Aligned</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
