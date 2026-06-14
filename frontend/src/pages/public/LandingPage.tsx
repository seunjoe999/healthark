import React, { useState, useEffect, useRef } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Data ──────────────────────────────────────────────────────────────────────
const CORE_SERVICES = [
  {
    title: 'Supported Living',
    icon: '🏠',
    bg: 'bg-[#e8b130]',
    textColor: 'text-slate-900',
    borderColor: 'border-[#e8b130]',
    description: 'Enabling people with complex needs to live in their own home with personalised 24/7 support tailored to their individual goals and aspirations.',
    features: ['Cluster & shared living', 'Apartment living', 'Step-down support', 'Skills development'],
  },
  {
    title: 'Domiciliary Care',
    icon: '🤝',
    bg: 'bg-slate-800',
    textColor: 'text-white',
    borderColor: 'border-slate-700',
    description: 'Flexible care delivered in the comfort of your own home — from personal care and medication support to social engagement and companionship.',
    features: ['Personal care', 'Medication support', 'Meal preparation', 'Community support'],
  },
  {
    title: 'Respite Care',
    icon: '💛',
    bg: 'bg-amber-500',
    textColor: 'text-white',
    borderColor: 'border-amber-400',
    description: 'Short-term, high-quality relief care for families and primary caregivers — giving everyone a well-deserved and refreshing break.',
    features: ['Short-term placements', 'Emergency respite', 'Family carer support', 'Smooth transitions'],
  },
  {
    title: 'Live-In Care',
    icon: '🌙',
    bg: 'bg-indigo-700',
    textColor: 'text-white',
    borderColor: 'border-indigo-600',
    description: 'Round-the-clock, one-to-one dedicated support from a carer living in your home — the premium alternative to residential care.',
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
  { icon: '🏅', title: 'CQC Rated Good', desc: 'Inspected and rated Good by the Care Quality Commission — your assurance of safe, effective, high-quality care.' },
  { icon: '👤', title: 'Truly Person-Centred', desc: 'Every care plan is built around the individual — their values, preferences, and life goals, not a one-size-fits-all template.' },
  { icon: '🧠', title: 'PBS Methodology', desc: 'We use Positive Behaviour Support to improve quality of life and reduce restrictive practices for people with complex needs.' },
  { icon: '⏰', title: '24/7 Support', desc: 'Our teams are available around the clock, every day of the year — because care needs don\'t follow a 9-to-5 schedule.' },
  { icon: '📋', title: 'Expert-Led Staffing', desc: 'All staff are DBS-checked, trained to Care Certificate standard, and matched to the specific needs of each service user.' },
  { icon: '🌍', title: 'Manchester & Warrington', desc: 'Operating across Greater Manchester and Warrington, with deep roots in the communities we serve.' },
];

const VALUES = [
  {
    title: 'Privacy',
    icon: '🔒',
    color: 'from-purple-500 to-purple-700',
    light: 'bg-purple-50 border-purple-200',
    text: 'text-purple-700',
    description: 'The right of individuals to be left alone and free from intrusion into their affairs, taken into account in the formulation of all care plans.',
  },
  {
    title: 'Dignity',
    icon: '🌟',
    color: 'from-[#e8b130] to-[#c99920]',
    light: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    description: 'All individuals, whatever their circumstances, have the right to be treated with dignity and respect in every single interaction.',
  },
  {
    title: 'Anti-Discrimination',
    icon: '🤝',
    color: 'from-emerald-500 to-emerald-700',
    light: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    description: 'We respect all clients regardless of age, disability, gender, marital status, sexual orientation, culture, religion or nationality.',
  },
  {
    title: 'Communication',
    icon: '💬',
    color: 'from-blue-500 to-blue-700',
    light: 'bg-blue-50 border-blue-200',
    text: 'text-blue-700',
    description: 'Clients have the right to be fully informed on all aspects of their care. Methods are tailored and appropriate to each individual.',
  },
  {
    title: 'Independence',
    icon: '🦋',
    color: 'from-rose-500 to-rose-700',
    light: 'bg-rose-50 border-rose-200',
    text: 'text-rose-700',
    description: 'We encourage service users to make their own choices and remain as independent as possible while receiving the support they need.',
  },
  {
    title: 'Person-Centred',
    icon: '❤️',
    color: 'from-indigo-500 to-indigo-700',
    light: 'bg-indigo-50 border-indigo-200',
    text: 'text-indigo-700',
    description: 'Every care plan is built around the individual — their values, preferences, desires, and goals — never a one-size-fits-all approach.',
  },
];

const ACCOMMODATION = [
  {
    title: 'Cluster / Shared Living',
    icon: '🏠',
    gradient: 'from-[#e8b130] to-amber-600',
    description: 'Service users benefit from their own private space while socialising with peers and sharing communal areas — the best of both worlds.',
    features: ['Private bedroom & bathroom', 'Shared communal lounges', 'Social peer support', 'Shared household costs'],
  },
  {
    title: 'Apartment Living',
    icon: '🏢',
    gradient: 'from-slate-700 to-slate-900',
    description: 'A balance of privacy and social opportunity. Self-contained apartments with the freedom to choose when to engage with shared spaces.',
    features: ['Self-contained apartment', 'Optional shared spaces', 'Maximum independence', 'Housing partnership developed'],
  },
  {
    title: 'Stepping-Stone',
    icon: '🪜',
    gradient: 'from-emerald-600 to-teal-700',
    description: 'Designed to provide stability while transitioning to long-term solutions, helping develop the skills needed to live independently.',
    features: ['Transition planning support', 'Skills development programme', 'Structured progression', 'Move-on support'],
  },
];

const TESTIMONIALS = [
  {
    quote: "The team at Comprehensive Care transformed my son's life. He has gone from struggling daily to living independently with just the right level of support. We couldn't be more grateful.",
    author: "Sarah M.",
    role: "Parent of Service User",
    initials: "SM",
  },
  {
    quote: "I've worked with many care agencies over the years. Comprehensive Care stands out for how genuinely they listen to both staff and residents. The training and support are excellent.",
    author: "James T.",
    role: "Senior Support Worker",
    initials: "JT",
  },
  {
    quote: "The referral process was smooth and the transition plan was thorough. They truly understand complex needs — our service user settled in within weeks.",
    author: "Lisa H.",
    role: "Social Worker, Salford Council",
    initials: "LH",
  },
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
      <div className="text-4xl md:text-5xl font-extrabold text-[#e8b130] mb-1">
        {count}{suffix}
      </div>
      <div className="text-slate-300 text-sm font-medium">{label}</div>
    </div>
  );
}

// ── Checkmark icon ────────────────────────────────────────────────────────────
function Check() {
  return (
    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
      <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
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
    { label: 'Specialisms', id: 'specialisms' },
    { label: 'Values', id: 'values' },
    { label: 'Careers', id: 'careers' },
    { label: 'Contact', id: 'contact' },
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 overflow-x-hidden">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-slate-900/98 backdrop-blur-md shadow-2xl border-b border-slate-700' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3 group">
            <img src="/cc-icon.jpg" alt="Comprehensive Care" className="w-11 h-11 rounded-xl object-contain border-2 border-[#e8b130]/30" />
            <div className="leading-tight">
              <span className="block text-base font-extrabold tracking-tight text-white">Comprehensive Care</span>
              <span className="block text-[10px] font-bold tracking-widest text-[#e8b130]">YOUR CARE · OUR PRIORITY</span>
            </div>
          </button>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)}
                className="px-4 py-2 text-sm font-semibold rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all">
                {l.label}
              </button>
            ))}
            <button onClick={() => scrollTo('contact')}
              className="ml-3 px-5 py-2.5 bg-[#e8b130] text-slate-900 text-sm font-bold rounded-full shadow-lg hover:bg-[#f0c040] transition-all">
              Make a Referral
            </button>
            <a href="/login"
              className="ml-2 px-5 py-2.5 bg-white/10 border border-white/20 text-white text-sm font-semibold rounded-full hover:bg-white/20 transition-all">
              Staff Login
            </a>
          </div>

          <button className="lg:hidden p-2" onClick={() => setMenuOpen(v => !v)}>
            <div className={`w-6 h-0.5 mb-1.5 bg-white transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <div className={`w-6 h-0.5 mb-1.5 bg-white transition-all ${menuOpen ? 'opacity-0' : ''}`} />
            <div className={`w-6 h-0.5 bg-white transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>

        {menuOpen && (
          <div className="lg:hidden bg-slate-900 border-t border-slate-700 shadow-2xl">
            <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-1">
              {navLinks.map(l => (
                <button key={l.id} onClick={() => { scrollTo(l.id); setMenuOpen(false); }}
                  className="text-left px-4 py-3 text-sm font-semibold text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                  {l.label}
                </button>
              ))}
              <button onClick={() => { scrollTo('contact'); setMenuOpen(false); }}
                className="mt-2 px-5 py-3 bg-[#e8b130] text-slate-900 text-sm font-bold rounded-xl text-center">
                Make a Referral
              </button>
              <a href="/login" className="px-5 py-3 border border-white/20 text-white text-sm font-semibold rounded-xl text-center">
                Staff Login
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <header className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-[#1a1206]" />
        <div className="absolute inset-0 opacity-30"
          style={{ backgroundImage: 'radial-gradient(ellipse at 20% 60%, rgba(232,177,48,0.25) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(99,102,241,0.2) 0%, transparent 50%)' }} />
        <div className="absolute top-32 right-[10%] w-72 h-72 rounded-full bg-[#e8b130]/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-32 left-[5%] w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />

        {/* Gold decorative line */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-[#e8b130] to-transparent opacity-60" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-28 pb-20 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#e8b130]/10 border border-[#e8b130]/30 rounded-full px-4 py-2 mb-8">
                <img src="/cqc-good.jpg" alt="CQC Good" className="h-5 object-contain rounded" />
                <span className="text-[#e8b130] text-xs font-bold tracking-wider uppercase">CQC Inspected · Rated Good</span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] tracking-tight mb-6">
                The Provider<br />
                <span style={{ color: '#e8b130' }}>Of Choice</span><br />
                <span className="text-white/80 text-4xl md:text-5xl lg:text-6xl font-bold">For Complex Care</span>
              </h1>

              <p className="text-lg text-white/60 leading-relaxed mb-4 max-w-lg">
                Comprehensive Care delivers outstanding, person-centred support across Greater Manchester and Warrington — from supported living to complex health conditions.
              </p>
              <p className="text-sm text-[#e8b130]/80 font-semibold mb-10 flex items-center gap-2">
                <span className="w-8 h-px bg-[#e8b130]/60 inline-block" />
                Domiciliary Care · Supported Living · Respite · Live-In Care
              </p>

              <div className="flex flex-wrap gap-4">
                <button onClick={() => scrollTo('contact')}
                  className="px-8 py-4 bg-[#e8b130] text-slate-900 font-bold text-base rounded-2xl shadow-2xl shadow-[#e8b130]/20 hover:bg-[#f0c040] hover:-translate-y-1 transition-all duration-200">
                  Make a Referral →
                </button>
                <button onClick={() => scrollTo('services')}
                  className="px-8 py-4 bg-white/8 backdrop-blur-sm border-2 border-white/20 text-white font-bold text-base rounded-2xl hover:bg-white/15 hover:-translate-y-1 transition-all duration-200">
                  Our Services
                </button>
                <button onClick={() => scrollTo('careers')}
                  className="px-8 py-4 border border-[#e8b130]/30 text-[#e8b130] font-bold text-base rounded-2xl hover:bg-[#e8b130]/10 hover:-translate-y-1 transition-all duration-200">
                  Join Our Team
                </button>
              </div>
            </div>

            <div className="hidden lg:flex flex-col items-center gap-8">
              <div className="relative">
                <div className="absolute -inset-6 bg-[#e8b130]/15 rounded-3xl blur-2xl" />
                <div className="relative bg-slate-800/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-[#e8b130]/20">
                  <img src="/cc-logo.jpg" alt="Comprehensive Care" className="w-72 object-contain" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                {[
                  { src: '/cqc-good.jpg', alt: 'CQC Good' },
                  { src: '/ico-logo.png', alt: 'ICO' },
                  { src: '/pqs-logo.png', alt: 'PQS SSIP' },
                ].map(badge => (
                  <div key={badge.alt} className="bg-white/8 backdrop-blur-sm border border-[#e8b130]/20 rounded-2xl p-3">
                    <img src={badge.src} alt={badge.alt} className="h-12 object-contain rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30">
            <span className="text-[10px] font-bold tracking-widest uppercase">Scroll</span>
            <div className="w-px h-10 bg-gradient-to-b from-[#e8b130]/40 to-transparent animate-pulse" />
          </div>
        </div>
      </header>

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      <section className="bg-slate-900 py-14 border-y border-slate-800">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-10">
          <StatCounter target={14} suffix="+" label="Care Specialisms" />
          <StatCounter target={24} suffix="/7" label="Support Available" />
          <StatCounter target={10} suffix="+" label="Agency Settings" />
          <StatCounter target={100} suffix="%" label="Person-Centred" />
        </div>
      </section>

      {/* ── Core Services ──────────────────────────────────────────────────── */}
      <section id="services" className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block font-bold text-sm tracking-widest uppercase mb-4" style={{ color: '#e8b130' }}>What We Do</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">Our Core Services</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">We operate as both a direct care provider and a specialist staffing agency — delivering outstanding support across a range of settings and needs.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {CORE_SERVICES.map((s) => (
              <div key={s.title}
                className={`group rounded-3xl overflow-hidden border-2 ${s.borderColor} hover:-translate-y-2 hover:shadow-2xl transition-all duration-300`}>
                <div className={`${s.bg} p-8`}>
                  <div className="text-4xl mb-4">{s.icon}</div>
                  <h3 className={`text-xl font-extrabold mb-2 ${s.textColor}`}>{s.title}</h3>
                  <p className={`text-sm leading-relaxed ${s.textColor === 'text-slate-900' ? 'text-slate-700' : 'text-white/80'}`}>{s.description}</p>
                </div>
                <div className="bg-white p-5">
                  <ul className="space-y-2">
                    {s.features.map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-slate-700 font-medium">
                        <Check />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ──────────────────────────────────────────────────────────── */}
      <section id="about" className="py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <span className="inline-block font-bold text-sm tracking-widest uppercase mb-4" style={{ color: '#e8b130' }}>Who We Are</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
                Putting People First,<br />
                <span style={{ color: '#e8b130' }}>Always</span>
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed mb-5">
                Comprehensive Care is a CQC-registered domiciliary and supported living care provider based in Greater Manchester and Warrington. We are committed to delivering outstanding, person-centred support to individuals and their families.
              </p>
              <p className="text-slate-600 text-lg leading-relaxed mb-8">
                Using <strong className="text-slate-800">Positive Behaviour Support (PBS)</strong> methodology, our specialist teams manage complex care situations and deliver individualised, one-on-one services across a wide range of settings and health conditions.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: '🌍', label: 'Community Engagement' },
                  { icon: '👤', label: 'One-on-One Support' },
                  { icon: '💰', label: 'Budgeting Support' },
                  { icon: '🏥', label: 'Annual Health Checks' },
                  { icon: '📋', label: 'One-Page Profiles' },
                  { icon: '🤸', label: 'Social Activities' },
                ].map(a => (
                  <div key={a.label} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#e8b130]/20 shadow-sm">
                    <span className="text-xl">{a.icon}</span>
                    <span className="text-sm font-semibold text-slate-800">{a.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl -rotate-2" style={{ background: 'linear-gradient(135deg, rgba(232,177,48,0.15), rgba(99,102,241,0.1))' }} />
              <img src="/values.png" alt="Our Values" className="relative rounded-3xl w-full object-cover shadow-2xl" />
              <div className="absolute -bottom-5 -left-5 bg-[#e8b130] text-slate-900 rounded-2xl px-5 py-3 shadow-xl font-bold text-sm">
                Your Care · Our Priority
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ──────────────────────────────────────────────────── */}
      <section className="py-28 bg-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block font-bold text-sm tracking-widest uppercase mb-4" style={{ color: '#e8b130' }}>Why Choose Us</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">What Sets Us Apart</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">We don't just provide care — we build relationships, develop skills, and genuinely improve lives.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {WHY_US.map(w => (
              <div key={w.title}
                className="group p-8 rounded-3xl bg-slate-800/60 border border-slate-700 hover:border-[#e8b130]/50 hover:bg-slate-800 transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-[#e8b130]/10 border border-[#e8b130]/20 flex items-center justify-center text-2xl mb-5">
                  {w.icon}
                </div>
                <h3 className="text-lg font-extrabold text-white mb-3">{w.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Specialisms ────────────────────────────────────────────────────── */}
      <section id="specialisms" className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block font-bold text-sm tracking-widest uppercase mb-4" style={{ color: '#e8b130' }}>Our Expertise</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">Care Areas & Specialisms</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">From complex mental health to end of life care — our teams are trained to support a wide range of needs and conditions.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Provider areas */}
            <div className="rounded-3xl overflow-hidden border border-[#e8b130]/30 shadow-xl">
              <div className="p-8" style={{ background: 'linear-gradient(135deg, #e8b130, #c99920)' }}>
                <div className="w-12 h-12 bg-black/20 rounded-2xl flex items-center justify-center text-2xl mb-4">🏥</div>
                <p className="text-slate-900/70 text-xs font-bold uppercase tracking-widest mb-1">Care Provider</p>
                <h3 className="text-2xl font-extrabold text-slate-900">Areas We Cover</h3>
                <p className="text-slate-900/70 text-sm mt-2">Direct care across supported living and community settings.</p>
              </div>
              <div className="p-8 bg-white">
                <div className="flex flex-wrap gap-2">
                  {PROVIDER_AREAS.map(a => (
                    <span key={a} className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-sm font-medium">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Agency settings */}
            <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-xl">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl mb-4">🏢</div>
                <p className="text-slate-300 text-xs font-bold uppercase tracking-widest mb-1">Staffing Agency</p>
                <h3 className="text-2xl font-extrabold text-white">Settings We Cover</h3>
                <p className="text-slate-400 text-sm mt-2">Specialist staff placed across all care environments.</p>
              </div>
              <div className="p-8 bg-white">
                <div className="flex flex-wrap gap-2">
                  {AGENCY_SETTINGS.map(a => (
                    <span key={a} className="px-3 py-1.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-sm font-medium">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Health conditions */}
            <div className="rounded-3xl overflow-hidden border border-emerald-200 shadow-xl">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-8">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl mb-4">💊</div>
                <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1">Clinical Expertise</p>
                <h3 className="text-2xl font-extrabold text-white">Conditions We Support</h3>
                <p className="text-emerald-100 text-sm mt-2">Complex health conditions managed with specialist care.</p>
              </div>
              <div className="p-8 bg-white">
                <div className="flex flex-wrap gap-2">
                  {HEALTH_CONDITIONS.map(c => (
                    <span key={c} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-sm font-medium">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Accommodation ──────────────────────────────────────────────────── */}
      <section className="py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block font-bold text-sm tracking-widest uppercase mb-4" style={{ color: '#e8b130' }}>Where We Support</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">Accommodation Options</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">We offer a range of accommodation styles — all designed to maximise independence, comfort, and community belonging.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {ACCOMMODATION.map(acc => (
              <div key={acc.title}
                className="group relative rounded-3xl overflow-hidden border border-slate-200 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                <div className={`bg-gradient-to-br ${acc.gradient} p-8 text-white`}>
                  <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center text-3xl mb-4">
                    {acc.icon}
                  </div>
                  <h3 className="text-xl font-extrabold mb-3">{acc.title}</h3>
                  <p className="text-white/80 text-sm leading-relaxed">{acc.description}</p>
                </div>
                <div className="bg-white p-6">
                  <ul className="space-y-2.5">
                    {acc.features.map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-slate-700 font-medium">
                        <Check />
                        {f}
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
      <section id="values" className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block font-bold text-sm tracking-widest uppercase mb-4" style={{ color: '#e8b130' }}>What Drives Us</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">Our Core Values</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">Everything we do is underpinned by these principles — guiding every care plan, every interaction, and every decision we make.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {VALUES.map(v => (
              <div key={v.title}
                className={`group p-8 rounded-3xl border-2 ${v.light} hover:scale-[1.03] hover:shadow-xl transition-all duration-300 cursor-default`}>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${v.color} flex items-center justify-center text-2xl mb-5 shadow-lg`}>
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
      <section className="py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="relative order-2 lg:order-1">
              <div className="absolute -inset-6 rounded-3xl rotate-2" style={{ background: 'linear-gradient(135deg, rgba(254,205,211,0.4), rgba(253,186,116,0.3))' }} />
              <img src="/eol.png" alt="End of Life Care" className="relative rounded-3xl w-full object-cover shadow-2xl max-h-96" />
              <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-xl p-5 border border-rose-100">
                <p className="text-rose-600 font-bold text-sm">Palliative & End of Life</p>
                <p className="text-slate-500 text-xs mt-1">Compassionate support at every stage</p>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <span className="inline-block text-rose-600 font-bold text-sm tracking-widest uppercase mb-4">Compassionate Support</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
                End of Life<br />
                <span className="text-rose-600">& Palliative Care</span>
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed mb-6">
                Providing personalised care in the final year or months of life leads to a more meaningful experience — centred on what matters most to the individual and their family.
              </p>
              <p className="text-slate-600 text-lg leading-relaxed mb-8">
                Our specialist team delivers compassionate end of life care that respects individuals' values, supports their families, and upholds dignity in every moment.
              </p>
              <div className="space-y-3">
                {['Ostomy Care', 'Palliative Care', 'Ventilation & Breathing Support', 'Bowel Management', 'Catheter Care'].map(s => (
                  <div key={s} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0" />
                    <span className="text-slate-700 font-medium">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────────────────── */}
      <section className="py-28 bg-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block font-bold text-sm tracking-widest uppercase mb-4" style={{ color: '#e8b130' }}>Feedback</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">What People Say</h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">Hear from the families, professionals, and team members who have experienced Comprehensive Care first-hand.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map(t => (
              <div key={t.author} className="bg-slate-800 rounded-3xl p-8 border border-slate-700 hover:border-[#e8b130]/40 transition-all duration-300">
                <div className="text-[#e8b130] text-5xl font-serif leading-none mb-4">"</div>
                <p className="text-slate-300 text-sm leading-relaxed mb-6 italic">{t.quote}</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#e8b130] flex items-center justify-center text-slate-900 font-bold text-sm flex-shrink-0">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{t.author}</p>
                    <p className="text-slate-500 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CompCare Hub Platform ───────────────────────────────────────────── */}
      <section className="py-28 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#e8b130]/10 border border-[#e8b130]/30 rounded-full px-4 py-2 mb-6">
                <span style={{ color: '#e8b130' }} className="text-xs font-bold tracking-wider uppercase">Digital Care Management</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
                Powered by<br />
                <span style={{ color: '#e8b130' }}>CompCare Hub</span>
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed mb-6">
                Our care teams use CompCare Hub — our proprietary digital care management platform — to ensure every service user's records, care plans, medications, and risk assessments are always accurate, up-to-date, and accessible.
              </p>
              <div className="space-y-4 mb-8">
                {[
                  { icon: '📋', text: 'Real-time care plans and risk assessments' },
                  { icon: '💊', text: 'Digital medication administration records (MAR)' },
                  { icon: '📊', text: 'Outcomes tracking and quality monitoring' },
                  { icon: '🔒', text: 'Secure, GDPR-compliant record management' },
                  { icon: '👥', text: 'Staff scheduling, training, and compliance tracking' },
                ].map(f => (
                  <div key={f.text} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xl">{f.icon}</span>
                    <span className="text-sm font-semibold text-slate-700">{f.text}</span>
                  </div>
                ))}
              </div>
              <a href="/login"
                className="inline-flex items-center gap-2 px-7 py-3.5 text-slate-900 font-bold rounded-2xl shadow-lg hover:bg-[#f0c040] hover:-translate-y-0.5 transition-all duration-200"
                style={{ background: '#e8b130' }}>
                Staff Login → CompCare Hub
              </a>
            </div>
            <div className="relative">
              <div className="absolute -inset-8 rounded-3xl opacity-40" style={{ background: 'radial-gradient(ellipse at center, rgba(232,177,48,0.3), transparent 70%)' }} />
              <div className="relative bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div className="ml-4 flex-1 bg-slate-800 rounded-full h-6 flex items-center px-4">
                    <span className="text-slate-400 text-xs">compcarehub.onrender.com</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-slate-800 rounded-2xl p-4">
                    <p className="text-[#e8b130] text-xs font-bold uppercase tracking-widest mb-2">Dashboard</p>
                    <div className="grid grid-cols-3 gap-2">
                      {['17 Residents', '16 Staff', '2 Homes'].map(s => (
                        <div key={s} className="bg-slate-700 rounded-xl p-3 text-center">
                          <p className="text-white text-xs font-bold">{s}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-slate-800 rounded-2xl p-4">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Recent Activity</p>
                    {['Care plan updated · J. Smith', 'MAR signed · Room 4', 'Staff check-in · 08:00'].map(a => (
                      <div key={a} className="flex items-center gap-2 py-1.5 border-b border-slate-700 last:border-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#e8b130] flex-shrink-0" />
                        <span className="text-slate-300 text-xs">{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Accreditations ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-slate-50 border-y border-slate-200">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="inline-block font-bold text-sm tracking-widest uppercase mb-4" style={{ color: '#e8b130' }}>Trusted & Accredited</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">Recognised Standards</h2>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-10">
            {[
              { src: '/cqc-good.jpg', alt: 'CQC Inspected and Rated Good', label: 'CQC Rated Good' },
              { src: '/cqc-logo.jpg', alt: 'Care Quality Commission', label: 'Care Quality Commission' },
              { src: '/ico-logo.png', alt: 'ICO', label: "Information Commissioner's Office" },
              { src: '/pqs-logo.png', alt: 'PQS SSIP', label: 'PQS SSIP Health & Safety' },
            ].map(b => (
              <div key={b.label} className="text-center group">
                <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100 group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-200 w-40">
                  <img src={b.src} alt={b.alt} className="h-16 object-contain mx-auto rounded-lg" />
                </div>
                <p className="text-xs text-slate-500 font-medium mt-3 max-w-[9rem]">{b.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Careers ────────────────────────────────────────────────────────── */}
      <section id="careers" className="py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div className="lg:sticky lg:top-32">
              <span className="inline-block font-bold text-sm tracking-widest uppercase mb-4" style={{ color: '#e8b130' }}>Join the Team</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
                Make a Real<br />
                <span style={{ color: '#e8b130' }}>Difference Every Day</span>
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
                  { icon: '🚀', title: 'Career Progression', desc: 'Clear pathways from support worker to senior management' },
                ].map(b => (
                  <div key={b.title} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-2xl mt-0.5">{b.icon}</span>
                    <div>
                      <p className="font-bold text-slate-900">{b.title}</p>
                      <p className="text-sm text-slate-600">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
              <div className="px-8 py-10" style={{ background: 'linear-gradient(135deg, #e8b130, #c99920)' }}>
                <h3 className="text-2xl font-extrabold text-slate-900 mb-1">Apply to Work With Us</h3>
                <p className="text-slate-900/70 text-sm">Fill in the form and our recruitment team will be in touch shortly.</p>
              </div>
              <div className="p-8">
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">✓</div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Application Received!</h3>
                    <p className="text-slate-500 mb-8">Thank you for applying. We will review your details and be in touch shortly.</p>
                    <button onClick={() => setSubmitted(false)} className="font-semibold hover:underline" style={{ color: '#e8b130' }}>
                      Submit another application
                    </button>
                  </div>
                ) : (
                  <form onSubmit={apply} className="space-y-5">
                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">First Name *</label>
                        <input required className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#e8b130] focus:ring-4 focus:ring-[#e8b130]/20 outline-none transition-all text-slate-800 font-medium"
                          value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} placeholder="Jane" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Last Name *</label>
                        <input required className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#e8b130] focus:ring-4 focus:ring-[#e8b130]/20 outline-none transition-all text-slate-800 font-medium"
                          value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} placeholder="Smith" />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Email Address *</label>
                        <input required type="email" className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#e8b130] focus:ring-4 focus:ring-[#e8b130]/20 outline-none transition-all text-slate-800 font-medium"
                          value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Phone Number</label>
                        <input className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#e8b130] focus:ring-4 focus:ring-[#e8b130]/20 outline-none transition-all text-slate-800 font-medium"
                          value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="07700 900000" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Role Interested In *</label>
                      <select className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#e8b130] focus:ring-4 focus:ring-[#e8b130]/20 outline-none transition-all bg-white text-slate-800 font-medium"
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
                      <textarea rows={3} className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#e8b130] focus:ring-4 focus:ring-[#e8b130]/20 outline-none transition-all text-slate-800 font-medium resize-none"
                        value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Tell us a bit about yourself or ask any questions..." />
                    </div>
                    <button disabled={loading} type="submit"
                      className="w-full text-slate-900 font-bold text-lg py-4 rounded-xl transition-all shadow-xl disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5"
                      style={{ background: loading ? '#c99920' : 'linear-gradient(135deg, #e8b130, #c99920)' }}>
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
      <section id="contact" className="py-28 bg-slate-900">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <span className="inline-block font-bold text-sm tracking-widest uppercase mb-4" style={{ color: '#e8b130' }}>Get In Touch</span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">We'd Love to Hear From You</h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto mb-14">Whether you're a family looking for care, a healthcare professional, or a prospective team member — we're here and ready to help.</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {[
              { icon: '📞', label: 'Manchester', value: '0161 000 0000', sub: 'Greater Manchester office' },
              { icon: '📞', label: 'Warrington', value: '01925 000 000', sub: 'Warrington office' },
              { icon: '✉️', label: 'Email Us', value: 'info@comprehensivecare.org.uk', sub: 'We reply within 24 hours' },
              { icon: '📍', label: 'Our Offices', value: 'Manchester & Warrington', sub: 'Serving Greater Manchester' },
            ].map(c => (
              <div key={c.label} className="bg-slate-800 rounded-3xl p-6 border border-slate-700 hover:border-[#e8b130]/40 hover:-translate-y-1 transition-all duration-200">
                <div className="text-3xl mb-3">{c.icon}</div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{c.label}</p>
                <p className="font-bold text-white text-sm mb-1 break-all">{c.value}</p>
                <p className="text-xs text-slate-500">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Make a referral CTA */}
          <div className="rounded-3xl p-10 border border-[#e8b130]/30" style={{ background: 'linear-gradient(135deg, rgba(232,177,48,0.1), rgba(232,177,48,0.05))' }}>
            <h3 className="text-2xl font-extrabold text-white mb-3">Ready to Make a Referral?</h3>
            <p className="text-slate-400 mb-6 max-w-lg mx-auto">Our assessment team will contact you within one working day to discuss your needs and arrange an initial care assessment at no cost.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="tel:01610000000"
                className="px-8 py-4 text-slate-900 font-bold rounded-2xl shadow-lg hover:bg-[#f0c040] transition-all" style={{ background: '#e8b130' }}>
                Call Now →
              </a>
              <a href="mailto:info@comprehensivecare.org.uk"
                className="px-8 py-4 border-2 border-[#e8b130]/50 text-[#e8b130] font-bold rounded-2xl hover:bg-[#e8b130]/10 transition-all">
                Email Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-slate-400 py-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src="/cc-icon.jpg" alt="Comprehensive Care" className="w-10 h-10 rounded-xl object-contain border border-[#e8b130]/30" />
                <div>
                  <p className="font-extrabold text-white text-base leading-none">Comprehensive Care</p>
                  <p className="text-[10px] font-bold tracking-widest mt-0.5" style={{ color: '#e8b130' }}>YOUR CARE · OUR PRIORITY</p>
                </div>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs mb-6">
                A CQC-registered care provider and staffing agency delivering outstanding, person-centred care across Greater Manchester and Warrington.
              </p>
              <div className="flex items-center gap-3">
                <img src="/cqc-good.jpg" alt="CQC Good" className="h-9 object-contain rounded-lg opacity-70" />
                <img src="/ico-logo.png" alt="ICO" className="h-9 object-contain opacity-70" />
                <img src="/pqs-logo.png" alt="PQS" className="h-9 object-contain rounded-lg opacity-70" />
              </div>
            </div>

            <div>
              <p className="text-white font-bold mb-4 text-sm uppercase tracking-widest">Services</p>
              <ul className="space-y-2 text-sm">
                {['Supported Living', 'Domiciliary Care', 'Respite Care', 'Live-In Care', 'End of Life Care', 'Staffing Agency'].map(s => (
                  <li key={s}><span className="text-slate-400 hover:text-white transition-colors cursor-default">{s}</span></li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-white font-bold mb-4 text-sm uppercase tracking-widest">Quick Links</p>
              <ul className="space-y-2 text-sm">
                {navLinks.map(l => (
                  <li key={l.id}>
                    <button onClick={() => scrollTo(l.id)} className="text-slate-400 hover:text-white transition-colors">{l.label}</button>
                  </li>
                ))}
                <li>
                  <a href="/login" className="font-semibold hover:opacity-80 transition-colors" style={{ color: '#e8b130' }}>
                    Staff Login (CompCare Hub) →
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
            <p className="text-slate-500">&copy; {new Date().getFullYear()} Comprehensive Care Services Ltd. All rights reserved.</p>
            <p className="text-slate-600">Registered in England & Wales · CQC Registered Provider · ICO Registered</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
