import React, { useState, useEffect, useRef } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';

// ── Smooth scroll helper ──────────────────────────────────────────────────────
function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Data ──────────────────────────────────────────────────────────────────────
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

const VALUES = [
  {
    title: 'Privacy',
    icon: '🔒',
    color: 'from-purple-500 to-purple-700',
    light: 'bg-purple-50 border-purple-100',
    text: 'text-purple-700',
    description: 'The right of individuals to be left alone and free from intrusion into their affairs, taken into account in the formulation of Care Plans.',
  },
  {
    title: 'Dignity',
    icon: '🌟',
    color: 'from-blue-500 to-blue-700',
    light: 'bg-blue-50 border-blue-100',
    text: 'text-blue-700',
    description: 'All individuals, whatever their circumstances, have the right to be treated with dignity and respect in every interaction.',
  },
  {
    title: 'Anti-Discrimination',
    icon: '🤝',
    color: 'from-emerald-500 to-emerald-700',
    light: 'bg-emerald-50 border-emerald-100',
    text: 'text-emerald-700',
    description: 'We respect all clients regardless of age, disability, gender, marital status, sexual orientation, culture, religion or nationality.',
  },
  {
    title: 'Communication',
    icon: '💬',
    color: 'from-amber-500 to-amber-700',
    light: 'bg-amber-50 border-amber-100',
    text: 'text-amber-700',
    description: 'Clients have the right to be fully informed on all aspects of their care. Methods are appropriate and tailored to each individual.',
  },
  {
    title: 'Independence',
    icon: '🦋',
    color: 'from-rose-500 to-rose-700',
    light: 'bg-rose-50 border-rose-100',
    text: 'text-rose-700',
    description: 'We encourage service users to make their own choices and remain as independent as possible while receiving the support they need.',
  },
  {
    title: 'Person-Centred',
    icon: '❤️',
    color: 'from-indigo-500 to-indigo-700',
    light: 'bg-indigo-50 border-indigo-100',
    text: 'text-indigo-700',
    description: 'Every care plan is built around the individual — their values, preferences, desires, and goals — not a one-size-fits-all approach.',
  },
];

const ACCOMMODATION = [
  {
    title: 'Cluster / Shared Living',
    icon: '🏠',
    gradient: 'from-purple-600 to-indigo-600',
    description: 'Service users benefit from their own private space while socialising with peers and sharing communal areas and household bills — the best of both worlds.',
    features: ['Private bedroom & bathroom', 'Shared communal lounges', 'Social peer support', 'Shared household costs'],
  },
  {
    title: 'Apartment Living',
    icon: '🏢',
    gradient: 'from-blue-600 to-cyan-600',
    description: 'A balance of privacy and social opportunity. Service users have their own modern apartment with the freedom to choose when to socialise in shared spaces.',
    features: ['Self-contained apartment', 'Optional shared spaces', 'Maximum independence', 'Developed with housing partners'],
  },
  {
    title: 'Stepping-Stone',
    icon: '🪜',
    gradient: 'from-emerald-600 to-teal-600',
    description: 'Designed to provide stability while transitioning to long-term solutions. We help service users develop the skills needed to live independently when ready.',
    features: ['Transition planning support', 'Skills development programme', 'Structured progression', 'Move-on support'],
  },
];

const ACTIVITIES = [
  { icon: '🌍', label: 'Community Engagement' },
  { icon: '👤', label: 'One-on-One Support' },
  { icon: '💰', label: 'Budgeting Support' },
  { icon: '🏥', label: 'Annual Health Checks' },
  { icon: '📋', label: 'One-Page Profiles' },
  { icon: '🤸', label: 'Social Activities' },
];

// ── Counter animation ─────────────────────────────────────────────────────────
function useCounter(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      observer.disconnect();
      const start = Date.now();
      const tick = () => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.round(eased * target));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);
  return { count, ref };
}

function StatCounter({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const { count, ref } = useCounter(target);
  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl md:text-5xl font-extrabold text-white mb-1">
        {count}{suffix}
      </div>
      <div className="text-purple-200 text-sm font-medium">{label}</div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', position: 'Care Assistant', message: '' });
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
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to submit application');
    }
    setLoading(false);
  };

  const navLinks = [
    { label: 'About', id: 'about' },
    { label: 'Services', id: 'services' },
    { label: 'Accommodation', id: 'accommodation' },
    { label: 'Values', id: 'values' },
    { label: 'Careers', id: 'careers' },
    { label: 'Contact', id: 'contact' },
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 overflow-x-hidden">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-slate-100' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3 group">
            <img src="/cc-icon.jpg" alt="Comprehensive Care" className="w-12 h-12 rounded-xl object-contain" />
            <div className="leading-tight">
              <span className={`block text-lg font-extrabold tracking-tight transition-colors ${scrolled ? 'text-slate-900' : 'text-white'}`}>Comprehensive Care</span>
              <span className={`block text-xs font-bold tracking-widest transition-colors ${scrolled ? 'text-purple-600' : 'text-purple-300'}`}>YOUR CARE OUR PRIORITY</span>
            </div>
          </button>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)}
                className={`px-4 py-2 text-sm font-semibold rounded-full transition-all ${scrolled ? 'text-slate-600 hover:text-purple-700 hover:bg-purple-50' : 'text-white/90 hover:text-white hover:bg-white/10'}`}>
                {l.label}
              </button>
            ))}
            <a href="https://app.comprehensivecare.org.uk/login"
              className="ml-4 px-5 py-2.5 bg-purple-600 text-white text-sm font-bold rounded-full shadow-lg hover:bg-purple-700 hover:shadow-purple-500/30 transition-all">
              Staff Login →
            </a>
          </div>

          {/* Mobile burger */}
          <button className="lg:hidden p-2" onClick={() => setMenuOpen(v => !v)}>
            <div className={`w-6 h-0.5 mb-1.5 transition-all ${scrolled ? 'bg-slate-800' : 'bg-white'} ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <div className={`w-6 h-0.5 mb-1.5 transition-all ${scrolled ? 'bg-slate-800' : 'bg-white'} ${menuOpen ? 'opacity-0' : ''}`} />
            <div className={`w-6 h-0.5 transition-all ${scrolled ? 'bg-slate-800' : 'bg-white'} ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-100 shadow-xl">
            <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-1">
              {navLinks.map(l => (
                <button key={l.id} onClick={() => { scrollTo(l.id); setMenuOpen(false); }}
                  className="text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-all">
                  {l.label}
                </button>
              ))}
              <a href="https://app.comprehensivecare.org.uk/login"
                className="mt-2 px-5 py-3 bg-purple-600 text-white text-sm font-bold rounded-xl text-center">
                Staff Login →
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <header className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900" />
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, #a855f7 0%, transparent 50%), radial-gradient(circle at 80% 20%, #6366f1 0%, transparent 50%), radial-gradient(circle at 50% 50%, #1e40af 0%, transparent 70%)' }} />
        {/* Animated orbs */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-20 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              {/* CQC Badge */}
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-8">
                <img src="/cqc-good.jpg" alt="CQC Good" className="h-6 object-contain rounded" />
                <span className="text-white text-sm font-semibold">CQC Inspected & Rated Good</span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] tracking-tight mb-6">
                Exceptional Care.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-300">
                  Every Person.
                </span><br />
                Every Day.
              </h1>

              <p className="text-xl text-white/70 leading-relaxed mb-10 max-w-lg">
                Comprehensive Care delivers personalised, compassionate support across the UK — from supported living to complex health conditions and end of life care.
              </p>

              <div className="flex flex-wrap gap-4">
                <button onClick={() => scrollTo('services')}
                  className="px-8 py-4 bg-purple-600 text-white font-bold text-lg rounded-2xl shadow-2xl hover:bg-purple-500 hover:-translate-y-1 transition-all duration-200">
                  Our Services
                </button>
                <button onClick={() => scrollTo('careers')}
                  className="px-8 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white font-bold text-lg rounded-2xl hover:bg-white/20 hover:-translate-y-1 transition-all duration-200">
                  Join Our Team
                </button>
                <button onClick={() => scrollTo('contact')}
                  className="px-8 py-4 bg-white text-purple-700 font-bold text-lg rounded-2xl shadow-xl hover:-translate-y-1 transition-all duration-200">
                  Contact Us
                </button>
              </div>
            </div>

            {/* Right — logo + accreditations */}
            <div className="hidden lg:flex flex-col items-center gap-8">
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500/30 rounded-3xl blur-2xl scale-110" />
                <div className="relative bg-white rounded-3xl p-8 shadow-2xl border border-white/20">
                  <img src="/cc-logo.jpg" alt="Comprehensive Care" className="w-80 object-contain" />
                </div>
              </div>
              {/* Trust badges */}
              <div className="flex items-center gap-6">
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-3">
                  <img src="/cqc-good.jpg" alt="CQC Good" className="h-14 object-contain rounded-lg" />
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-3">
                  <img src="/ico-logo.png" alt="ICO" className="h-14 object-contain" />
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-3">
                  <img src="/pqs-logo.png" alt="PQS SSIP" className="h-14 object-contain rounded-lg" />
                </div>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40">
            <span className="text-xs font-medium tracking-widest uppercase">Scroll</span>
            <div className="w-px h-12 bg-gradient-to-b from-white/40 to-transparent animate-pulse" />
          </div>
        </div>
      </header>

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-purple-700 to-indigo-700 py-16">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          <StatCounter target={14} suffix="+" label="Care Specialisms" />
          <StatCounter target={24} suffix="/7" label="Support Available" />
          <StatCounter target={10} suffix="+" label="Agency Settings" />
          <StatCounter target={100} suffix="%" label="Person-Centred" />
        </div>
      </section>

      {/* ── About ──────────────────────────────────────────────────────────── */}
      <section id="about" className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <span className="inline-block text-purple-600 font-bold text-sm tracking-widest uppercase mb-4">Who We Are</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
                Putting People First,<br />
                <span className="text-purple-600">Always</span>
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed mb-6">
                Comprehensive Care is a UK-based care provider and staffing agency committed to delivering outstanding, person-centred support. We work with individuals and their families, caregivers, and communities — always considering their values, preferences, and desires.
              </p>
              <p className="text-slate-600 text-lg leading-relaxed mb-8">
                Our staff are trained to manage complex care situations and deliver individualised, one-on-one services across a wide range of settings and health conditions.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {ACTIVITIES.map(a => (
                  <div key={a.label} className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 border border-purple-100">
                    <span className="text-xl">{a.icon}</span>
                    <span className="text-sm font-semibold text-purple-900">{a.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-3xl -rotate-2" />
              <img src="/values.png" alt="Our Values" className="relative rounded-3xl w-full object-cover shadow-xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Services ───────────────────────────────────────────────────────── */}
      <section id="services" className="py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block text-purple-600 font-bold text-sm tracking-widest uppercase mb-4">What We Do</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">Our Services</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">We operate as both a care provider and a staffing agency — supporting individuals with complex needs across a range of settings.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-10">
            {/* Provider */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
              <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-8">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">🏥</div>
                  <div>
                    <p className="text-purple-200 text-xs font-bold uppercase tracking-widest">Care Provider</p>
                    <h3 className="text-2xl font-extrabold text-white">Areas We Cover</h3>
                  </div>
                </div>
                <p className="text-purple-100 text-sm leading-relaxed">We provide direct care to individuals with a wide range of complex needs, across supported living and community settings.</p>
              </div>
              <div className="p-8">
                <div className="flex flex-wrap gap-2">
                  {PROVIDER_AREAS.map(a => (
                    <span key={a} className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-full text-sm font-medium">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Agency */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="bg-gradient-to-br from-blue-600 to-cyan-700 p-8">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">🏢</div>
                    <div>
                      <p className="text-blue-100 text-xs font-bold uppercase tracking-widest">Staffing Agency</p>
                      <h3 className="text-2xl font-extrabold text-white">Settings We Cover</h3>
                    </div>
                  </div>
                </div>
                <div className="p-8">
                  <div className="flex flex-wrap gap-2">
                    {AGENCY_SETTINGS.map(a => (
                      <span key={a} className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-sm font-medium">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">💊</div>
                    <div>
                      <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest">Health Expertise</p>
                      <h3 className="text-2xl font-extrabold text-white">Conditions We Support</h3>
                    </div>
                  </div>
                </div>
                <div className="p-8">
                  <div className="flex flex-wrap gap-2">
                    {HEALTH_CONDITIONS.map(c => (
                      <span key={c} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-sm font-medium">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Accommodation ──────────────────────────────────────────────────── */}
      <section id="accommodation" className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block text-purple-600 font-bold text-sm tracking-widest uppercase mb-4">Where We Support</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">Accommodation Options</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">We offer a range of accommodation styles — all designed to maximise independence, comfort, and community belonging.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {ACCOMMODATION.map((acc, i) => (
              <div key={acc.title}
                className="group relative rounded-3xl overflow-hidden border border-slate-100 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                <div className={`bg-gradient-to-br ${acc.gradient} p-8 text-white`}>
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mb-4">
                    {acc.icon}
                  </div>
                  <h3 className="text-2xl font-extrabold mb-3">{acc.title}</h3>
                  <p className="text-white/80 text-sm leading-relaxed">{acc.description}</p>
                </div>
                <div className="bg-white p-6">
                  <ul className="space-y-2.5">
                    {acc.features.map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-slate-700">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="font-medium">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Values ─────────────────────────────────────────────────────────── */}
      <section id="values" className="py-28 bg-gradient-to-br from-slate-900 to-purple-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 0% 100%, #a855f7, transparent 50%), radial-gradient(circle at 100% 0%, #6366f1, transparent 50%)' }} />
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block text-purple-300 font-bold text-sm tracking-widest uppercase mb-4">What Drives Us</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Our Core Values</h2>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto">Everything we do is underpinned by these principles — they guide every care plan, every interaction, every decision.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {VALUES.map(v => (
              <div key={v.title}
                className={`group p-8 rounded-3xl border ${v.light} hover:scale-[1.03] transition-all duration-300 cursor-default`}>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${v.gradient} flex items-center justify-center text-2xl mb-5 shadow-lg`}>
                  {v.icon}
                </div>
                <h3 className={`text-xl font-extrabold mb-3 ${v.text}`}>{v.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── End of Life ────────────────────────────────────────────────────── */}
      <section className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="relative order-2 lg:order-1">
              <div className="absolute -inset-6 bg-gradient-to-br from-rose-50 to-pink-50 rounded-3xl rotate-2" />
              <img src="/eol.png" alt="End of Life Care" className="relative rounded-3xl w-full object-cover shadow-2xl max-h-96" />
              <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-xl p-5 border border-rose-100">
                <p className="text-rose-600 font-bold text-sm">Palliative & End of Life</p>
                <p className="text-slate-600 text-xs mt-1">Compassionate support at every stage</p>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <span className="inline-block text-rose-600 font-bold text-sm tracking-widest uppercase mb-4">Compassionate Support</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
                End of Life<br />
                <span className="text-rose-600">& Palliative Care</span>
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed mb-6">
                Providing personalised care in the final year(s) or months of life leads to a more meaningful experience, centred on what matters most to the individual — and creates more sustainable health and care services.
              </p>
              <p className="text-slate-600 text-lg leading-relaxed mb-8">
                Our specialist team delivers compassionate end of life care that respects individuals' values, involves their families, and upholds dignity in every moment.
              </p>
              <div className="space-y-3">
                {['Ostomy Care', 'Palliative Care', 'Ventilation & Breathing Support', 'Bowel Management', 'Catheter Care'].map(s => (
                  <div key={s} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                    <span className="text-slate-700 font-medium">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Accreditations ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-slate-50 border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="inline-block text-purple-600 font-bold text-sm tracking-widest uppercase mb-4">Trusted & Accredited</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">Recognised Standards</h2>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-10">
            <div className="text-center group">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-200 w-44">
                <img src="/cqc-good.jpg" alt="CQC Inspected and Rated Good" className="h-20 object-contain mx-auto rounded-lg" />
              </div>
              <p className="text-xs text-slate-500 font-medium mt-3">CQC Inspected & Rated Good</p>
            </div>
            <div className="text-center group">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-200 w-44">
                <img src="/cqc-logo.jpg" alt="Care Quality Commission" className="h-20 object-contain mx-auto rounded-lg" />
              </div>
              <p className="text-xs text-slate-500 font-medium mt-3">Care Quality Commission</p>
            </div>
            <div className="text-center group">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-200 w-44">
                <img src="/ico-logo.png" alt="ICO" className="h-20 object-contain mx-auto" />
              </div>
              <p className="text-xs text-slate-500 font-medium mt-3">Information Commissioner's Office</p>
            </div>
            <div className="text-center group">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-200 w-44">
                <img src="/pqs-logo.png" alt="PQS SSIP Health & Safety Approved" className="h-20 object-contain mx-auto rounded-lg" />
              </div>
              <p className="text-xs text-slate-500 font-medium mt-3">PQS SSIP Health & Safety Approved</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Careers ────────────────────────────────────────────────────────── */}
      <section id="careers" className="py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Left copy */}
            <div className="lg:sticky lg:top-32">
              <span className="inline-block text-purple-600 font-bold text-sm tracking-widest uppercase mb-4">Join the Team</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
                Make a Real<br />
                <span className="text-purple-600">Difference Every Day</span>
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed mb-8">
                We're always looking for passionate, dedicated professionals to join the Comprehensive Care family. Whether you're an experienced carer or just starting your journey, we'd love to hear from you.
              </p>
              <div className="space-y-4">
                {[
                  { icon: '💼', title: 'Competitive Pay', desc: 'Fair wages with regular reviews and overtime rates' },
                  { icon: '📚', title: 'Ongoing Training', desc: 'Fully funded training and career development pathways' },
                  { icon: '🕐', title: 'Flexible Hours', desc: 'Full-time, part-time, and bank shifts available' },
                  { icon: '🤝', title: 'Supportive Culture', desc: 'A caring team that supports you as much as the residents' },
                ].map(b => (
                  <div key={b.title} className="flex items-start gap-4 p-4 rounded-2xl bg-purple-50 border border-purple-100">
                    <span className="text-2xl mt-0.5">{b.icon}</span>
                    <div>
                      <p className="font-bold text-slate-900">{b.title}</p>
                      <p className="text-sm text-slate-600">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right form */}
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
              <div className="bg-gradient-to-br from-purple-700 to-indigo-700 px-8 py-10">
                <h3 className="text-2xl font-extrabold text-white mb-1">Apply to Work With Us</h3>
                <p className="text-purple-200 text-sm">Fill in the form and our recruitment team will be in touch shortly.</p>
              </div>
              <div className="p-8">
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">✓</div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Application Received!</h3>
                    <p className="text-slate-500 mb-8">Thank you for applying. We will review your details and be in touch shortly.</p>
                    <button onClick={() => setSubmitted(false)} className="text-purple-600 font-semibold hover:underline">
                      Submit another application
                    </button>
                  </div>
                ) : (
                  <form onSubmit={apply} className="space-y-5">
                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">First Name *</label>
                        <input required className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-slate-800 font-medium"
                          value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} placeholder="Jane" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Last Name *</label>
                        <input required className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-slate-800 font-medium"
                          value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} placeholder="Smith" />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Email Address *</label>
                        <input required type="email" className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-slate-800 font-medium"
                          value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Phone Number</label>
                        <input className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-slate-800 font-medium"
                          value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="07700 900000" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Role Interested In *</label>
                      <select className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all bg-white text-slate-800 font-medium"
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
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Message (optional)</label>
                      <textarea rows={3} className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-slate-800 font-medium resize-none"
                        value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Tell us a bit about yourself or ask any questions..." />
                    </div>
                    <button disabled={loading} type="submit"
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-lg py-4 rounded-xl hover:from-purple-500 hover:to-indigo-500 transition-all shadow-xl hover:shadow-purple-500/30 disabled:opacity-70 disabled:cursor-not-allowed">
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Submitting...
                        </span>
                      ) : 'Submit Application →'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact ────────────────────────────────────────────────────────── */}
      <section id="contact" className="py-28 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <span className="inline-block text-purple-600 font-bold text-sm tracking-widest uppercase mb-4">Get In Touch</span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">We'd Love to Hear From You</h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto mb-14">Whether you're a family looking for care, a healthcare professional looking for staffing, or a prospective team member — we're here.</p>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: '📞', label: 'Call Us', value: '0116 456 7890', sub: 'Mon–Fri 9am–5pm' },
              { icon: '✉️', label: 'Email Us', value: 'info@comprehensivecare.org.uk', sub: 'We reply within 24 hours' },
              { icon: '📍', label: 'Our Base', value: 'Leicester, UK', sub: 'Covering nationwide' },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-3xl p-8 shadow-lg border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
                <div className="text-4xl mb-4">{c.icon}</div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{c.label}</p>
                <p className="font-bold text-slate-900 mb-1">{c.value}</p>
                <p className="text-sm text-slate-500">{c.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src="/cc-icon.jpg" alt="Comprehensive Care" className="w-10 h-10 rounded-xl object-contain" />
                <div>
                  <p className="font-extrabold text-white text-lg leading-none">Comprehensive Care</p>
                  <p className="text-purple-400 text-xs font-bold tracking-widest">YOUR CARE OUR PRIORITY</p>
                </div>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs mb-6">
                A UK care provider and staffing agency dedicated to outstanding, person-centred care across a wide range of complex health needs.
              </p>
              <div className="flex items-center gap-3">
                <img src="/cqc-good.jpg" alt="CQC Good" className="h-10 object-contain rounded-lg opacity-80" />
                <img src="/ico-logo.png" alt="ICO" className="h-10 object-contain opacity-80" />
                <img src="/pqs-logo.png" alt="PQS" className="h-10 object-contain rounded-lg opacity-80" />
              </div>
            </div>

            {/* Services */}
            <div>
              <p className="text-white font-bold mb-4 text-sm uppercase tracking-widest">Services</p>
              <ul className="space-y-2 text-sm">
                {['Supported Living', 'Complex Care', 'End of Life Care', 'Respite Care', 'Staffing Agency', 'Domiciliary Care'].map(s => (
                  <li key={s}><span className="text-slate-400 hover:text-white transition-colors cursor-default">{s}</span></li>
                ))}
              </ul>
            </div>

            {/* Quick links */}
            <div>
              <p className="text-white font-bold mb-4 text-sm uppercase tracking-widest">Quick Links</p>
              <ul className="space-y-2 text-sm">
                {navLinks.map(l => (
                  <li key={l.id}>
                    <button onClick={() => scrollTo(l.id)} className="text-slate-400 hover:text-white transition-colors">{l.label}</button>
                  </li>
                ))}
                <li><a href="https://app.comprehensivecare.org.uk/login" className="text-purple-400 hover:text-purple-300 transition-colors font-semibold">Staff Login →</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
            <p>&copy; {new Date().getFullYear()} Comprehensive Care. All rights reserved.</p>
            <p className="text-slate-600">Registered in England & Wales · CQC Registered Provider</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
