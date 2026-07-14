import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Shield, Star, Users, MessageCircle, Heart, Award,
  Home, Building2, Stethoscope, Clock, MapPin, Phone,
  Mail, CheckCircle, ArrowRight, ChevronDown, Briefcase,
  Trophy, Brain, Globe, Menu, X, Lock, Activity,
  BarChart3, FileText, GraduationCap, HeartHandshake,
  UserCheck, CalendarCheck, Sparkles, Quote,
  TrendingUp, Smile, Target, ChevronRight,
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
      <div className="text-5xl md:text-6xl font-black text-[#e8b130] mb-2 tabular-nums tracking-tight">
        {count}{suffix}
      </div>
      <div className="w-8 h-0.5 bg-[#e8b130]/30 mx-auto mb-2 group-hover:w-12 transition-all duration-300" />
      <div className="text-white/50 text-sm font-semibold tracking-wide uppercase">{label}</div>
    </div>
  );
}

// ── Section pill label ─────────────────────────────────────────────────────────
function SectionPill({ label }: { label: string }) {
  return (
    <span className="inline-block bg-[#e8b130]/10 text-[#e8b130] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border border-[#e8b130]/20 mb-5">
      {label}
    </span>
  );
}

// ── Data ───────────────────────────────────────────────────────────────────────

const SUPPORTED_LIVING_SUBTYPES = [
  {
    title: 'Independent Living',
    description: 'Service users can choose to live independently in their own flat or house, with as much or as little support as needed. This can be in one of our existing properties or in a new property sourced through our housing partners to suit their specific requirements.',
  },
  {
    title: 'Shared Living',
    description: 'For those who are not yet ready to live alone, we help them connect with others who share similar goals of independent living. Service users will have their own private space, while benefiting from socialising with peers and sharing communal areas and household bills.',
  },
  {
    title: 'Apartment Living',
    description: 'This option offers a balance of privacy and social opportunities. Service users can have their own modern apartment with some shared communal spaces, allowing them the freedom to choose when to socialise. We have collaborated with housing partners to develop this popular accommodation style.',
  },
  {
    title: 'Stepping-Stone Accommodation',
    description: 'Designed to provide stability while transitioning to long-term solutions, this option helps service users plan for a more structured future. We support individuals in developing the skills needed to live independently when they are ready to move on.',
  },
];

const DOMICILIARY_SUBTYPES = [
  { title: 'End of Life Care', description: 'We offer compassionate and comprehensive care for individuals nearing the end of life. Working closely with families, we ensure their loved ones\' wishes are respected, providing a peaceful and dignified experience.' },
  { title: 'Personal and Hygiene Care', description: 'We pride ourselves on delivering a high standard of bespoke care, assisting with dressing, undressing, bathing, toileting, and more — always with dignity and respect.' },
  { title: 'Staying Active', description: 'We encourage and support individuals to engage in activities that promote both physical and mental health, from simple walks to structured exercises, helping to reduce social isolation.' },
  { title: 'Meal Preparation and Groceries', description: 'Our team assists with grocery shopping, meal planning, and preparation, ensuring that meals meet the dietary needs and preferences of our service users.' },
  { title: 'Medication Support', description: 'We provide timely medication reminders for service users who can manage their medication but may need support due to the challenges of ageing.' },
  { title: 'Housekeeping', description: 'As part of our care package, we assist with housekeeping tasks such as washing dishes, laundry, cleaning, and taking out the bins to help maintain a clean and comfortable home environment.' },
];

const CORE_SERVICES = [
  {
    title: 'Supported Living',
    Icon: Home,
    accentColor: '#e8b130',
    borderTop: 'border-t-[#e8b130]',
    description:
      'We offer a range of supported living services designed to meet the unique needs of each individual. Our accommodations are modern, comfortable, and tailored to help service users take control of their lives, make their own choices, and gain independence.',
    subtypes: SUPPORTED_LIVING_SUBTYPES,
  },
  {
    title: 'Domiciliary Care',
    Icon: HeartHandshake,
    accentColor: '#64748b',
    borderTop: 'border-t-slate-400',
    description:
      'We offer personalised care services ranging from 30 minutes to 24 hours, ensuring high-quality professional support tailored to your needs. Our flexible care options promote independent living, lifestyle choices, and provide one-on-one care or shared care for couples.',
    subtypes: DOMICILIARY_SUBTYPES,
  },
  {
    title: 'Respite Care',
    Icon: CalendarCheck,
    accentColor: '#f59e0b',
    borderTop: 'border-t-amber-400',
    description:
      'We offer Respite Care for adults with learning disabilities, autism, complex mental health needs, acquired brain injuries, physical disabilities, and the elderly. This service can be provided either in one of our supported living accommodations or in the comfort of your own home. Our respite care gives families and caregivers a well-deserved break, offering flexible care with no long-term commitment.',
    subtypes: [],
  },
  {
    title: 'Live-In Care',
    Icon: UserCheck,
    accentColor: '#6366f1',
    borderTop: 'border-t-indigo-500',
    description:
      'Live-in care is when a trained professional carer stays with you or your loved one at home to provide ongoing care and support. Carers are carefully matched on their skills to deliver high-quality care, and by their personalities to enrich and complement your lifestyle. Live-in care can be arranged on a short-term (respite) basis or as long-term care, and we also offer specialist services for those living with complex conditions at home.',
    subtypes: [],
  },
];

const PROVIDER_AREAS = [
  'Complex Mental Health', 'Learning Disabilities', 'Autism Spectrum Disorders',
  'Drug and Alcohol Misuse', 'Physical Complex Health', 'ADHD',
  'Acquired Brain Injury', 'Physical Disabilities', 'Court of Protection DOLs',
  'Physical Health Needs', 'Elderly Care', 'End of Life Care', 'Respite Care', 'Live In Care',
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
  { Icon: MapPin, title: 'Greater Manchester', desc: 'Operating across Greater Manchester, with deep roots in the communities we serve.', gradient: 'from-[#e8b130] to-amber-500' },
];

const VALUES = [
  {
    title: 'Warm',
    Icon: Heart,
    iconBg: 'bg-rose-500/10',
    iconColor: 'text-rose-400',
    description: 'We promote the development of warm, supportive relationships between service users and carers that foster attachment and a sense of stability. A key aspect of this involves ensuring carers receive training and support to enhance their skills and maintain a consistent approach — one that balances clear guidance and boundary-setting with emotional warmth, nurturing, and excellent physical care.',
  },
  {
    title: 'Bespoke',
    Icon: Star,
    iconBg: 'bg-[#e8b130]/10',
    iconColor: 'text-[#e8b130]',
    description: 'Our service users receive care that is personalized to their individual needs through a person-centred approach. We deliver care in the way they prefer, working closely with them to ensure an exceptional care experience. The relationships between our staff and service users are key to the quality of care and support provided.',
  },
  {
    title: 'Compassionate',
    Icon: HeartHandshake,
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
    description: 'Compassion is the foundation of how we provide care, built on relationships of empathy, respect, and dignity. Research has shown that compassionate care enhances health outcomes, reduces stress and anxiety, and supports healing and recovery. Our care staff are trained to understand each individual\'s health and social needs. We prioritize your care above all.',
  },
];

const SPECIALISMS = [
  {
    title: 'Complex Mental Health',
    Icon: Brain,
    gradient: 'from-violet-500 to-purple-600',
    description: 'Comprehensive Care provides specialised support for individuals with complex mental health needs and learning disabilities, using Positive Behaviour Support (PBS) as our model of care. This service is designed to facilitate progress in the personal recovery journey of our clients, preparing them to transition to independent living or to live with reduced support.',
    offers: [
      'Support throughout the recovery journey',
      'Emotional and practical support',
      'Assistance with managing personal finances',
      'Help with planning and budgeting',
      'Support with personal care activities',
      'One-on-one support',
      'Community engagement opportunities',
      'Assistance in developing or regaining independent living skills',
      'Medication management',
      'Encouragement to live a full and active life within the local community',
      'Guidance in establishing and maintaining a tenancy',
      'Support in building motivation, confidence, and self-esteem',
    ],
  },
  {
    title: 'Learning Disability Services',
    Icon: GraduationCap,
    gradient: 'from-emerald-500 to-teal-600',
    description: 'Comprehensive Care provides high-level support to individuals with learning disabilities using the Positive Behaviour Support (PBS) approach. We offer person-centred care by actively involving our service users in all aspects of their care.',
    offers: [
      'PBS approach',
      'Support with budgeting and planning skills',
      'Person-centred care',
      'Community inclusion',
      'Enhanced care levels with a flexible approach',
      'Guidance through physical and emotional support',
      'Assistance with personal care activities',
      'Help with medical and welfare needs',
      'Support in maximising outcomes',
      'Practical and emotional support',
      'Safeguarding from harm and abuse',
      'Annual health checks',
      'One-page profiles',
    ],
  },
  {
    title: 'Autism Care & Support',
    Icon: Smile,
    gradient: 'from-blue-500 to-cyan-600',
    description: 'Comprehensive Care provides support for individuals living with autism, using the Positive Behaviour Support (PBS) model of care. Our aim is to help service users develop their independence across all areas of daily life including personal care, meal preparation, engaging in hobbies and activities, and enjoying life in the community.',
    offers: [
      'Respectful personal care, along with practical and emotional support',
      'Supporting service users to maintain their independence for as long as possible',
      'Identifying and creating opportunities to help service users lead meaningful, fulfilling lifestyles',
      'Assistance with planning and budgeting',
      'Annual health checks',
      'One-page profiles',
      'Community engagement',
      'One-on-one support',
    ],
  },
  {
    title: 'Domiciliary Care, Supported Living & Live In Services',
    Icon: Home,
    gradient: 'from-[#e8b130] to-amber-500',
    description: 'Comprehensive Care offers innovative services focused on helping individuals live independent lives and actively engage in their local community. Through person-centred care, we help individuals pursue their personal goals and lead as normal a life as possible.',
    offers: [
      'Personal care support',
      'Shopping assistance',
      'One-on-one care',
      'Healthy eating guidance',
      'Medication management',
      'Budgeting and planning support',
      'Assistance with paying bills',
      'Maintaining tenancy',
      'Encouraging a fulfilling social life',
      'Activities of choice',
      'Empowerment and confidence building',
      'Support in developing daily living skills',
    ],
  },
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

const CAREER_BANNER_BENEFITS = [
  'Comprehensive Care LTD offers full-time and part-time hours',
  'We provide a range of exclusive benefits to all our staff as a recognition of their dedication and hard work',
  'We are looking for motivated and driven individuals committed to delivering the highest standards of care',
  'Our dedicated management team will provide enthusiastic and supportive guidance every step of the way',
  'We offer flexible shift patterns and working hours including night shifts and part-time opportunities',
  'There are ample opportunities for career advancement in a variety of rewarding and diverse roles',
  'We offer both long-term and short-term temporary placements, tailored to your requirements',
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

// ── Expandable Service Card ─────────────────────────────────────────────────────
function ExpandableServiceCard({ service }: {
  service: {
    title: string;
    Icon: React.ElementType;
    accentColor: string;
    borderTop: string;
    description: string;
    subtypes: { title: string; description: string }[];
  };
}) {
  const [expanded, setExpanded] = useState(false);
  const hasSubtypes = service.subtypes.length > 0;

  return (
    <motion.div
      variants={cardAnim}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ duration: 0.25, ease: EASE }}
      className={`rounded-3xl overflow-hidden border border-slate-100/80 shadow-md hover:shadow-2xl transition-shadow duration-400 border-t-4 ${service.borderTop} bg-white flex flex-col`}
    >
      <div className="p-8 flex flex-col flex-1">
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm"
          style={{ background: `${service.accentColor}14` }}
        >
          <service.Icon size={24} style={{ color: service.accentColor }} />
        </div>

        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mb-3">{service.title}</h3>
        <p className="text-slate-500 text-sm leading-relaxed mb-6 flex-1">{service.description}</p>

        {hasSubtypes && (
          <>
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-4 cursor-pointer select-none w-fit px-4 py-2 rounded-full border transition-all duration-200"
              style={{
                color: service.accentColor,
                borderColor: `${service.accentColor}30`,
                background: `${service.accentColor}08`,
              }}
              aria-expanded={expanded}
            >
              <ChevronRight
                size={14}
                style={{
                  transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.25s ease',
                  color: service.accentColor,
                }}
              />
              {expanded ? 'Hide service types' : 'View service types'}
            </button>

            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  key="subtypes"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 pt-1">
                    {service.subtypes.map(sub => (
                      <div key={sub.title} className="p-4 rounded-2xl border border-slate-100 bg-[#f8f7f5]">
                        <p className="font-bold text-slate-800 text-sm mb-1">{sub.title}</p>
                        <p className="text-slate-500 text-xs leading-relaxed">{sub.description}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ── Expandable Specialism Card ──────────────────────────────────────────────────
function SpecialismCard({ spec }: {
  spec: {
    title: string;
    Icon: React.ElementType;
    gradient: string;
    description: string;
    offers: string[];
  };
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      variants={cardAnim}
      className="rounded-3xl overflow-hidden transition-all duration-300"
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
        border: expanded ? '1px solid rgba(232,177,48,0.25)' : '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <button
        className="w-full text-left p-8 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-5 flex-1">
            <div className={`w-13 h-13 w-[52px] h-[52px] rounded-2xl bg-gradient-to-br ${spec.gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}>
              <spec.Icon size={22} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-extrabold text-white mb-2 tracking-tight">{spec.title}</h3>
              <p className="text-sm leading-relaxed text-white/50">{spec.description}</p>
            </div>
          </div>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 border border-[#e8b130]/20 transition-all duration-200"
            style={{ background: expanded ? 'rgba(232,177,48,0.15)' : 'rgba(232,177,48,0.06)' }}
          >
            <ChevronDown
              size={16}
              className="text-[#e8b130]"
              style={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.25s ease',
              }}
            />
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="offers"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="px-8 pb-8 pt-0">
              <div className="border-t border-white/[0.06] pt-6">
                <p className="text-[#e8b130] text-xs font-bold uppercase tracking-widest mb-4">What We Offer</p>
                <ul className="grid sm:grid-cols-2 gap-2.5">
                  {spec.offers.map(o => (
                    <li key={o} className="flex items-start gap-2.5 text-sm text-white/65">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle size={11} className="text-emerald-400" />
                      </div>
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    position: 'Care Assistant', message: '',
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
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
      if (cvFile) {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, v));
        fd.append('cv', cvFile);
        await api.post('/public/apply', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/public/apply', form);
      }
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
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'border-b border-white/[0.06]' : ''}`}
        style={{
          background: scrolled ? 'rgba(10,15,30,0.96)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute -inset-1 rounded-xl bg-[#e8b130]/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <img src="/cc-icon.jpg" alt="Comprehensive Care" className="relative w-10 h-10 rounded-xl object-contain border border-[#e8b130]/30" />
            </div>
            <div className="leading-tight">
              <span className="block text-sm font-extrabold tracking-tight text-white">Comprehensive Care</span>
              <span className="block text-[9px] font-bold tracking-widest text-[#e8b130] uppercase">Your Care · Our Priority</span>
            </div>
          </button>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)}
                className="px-4 py-2 text-sm font-medium rounded-full text-white/60 hover:text-white hover:bg-white/[0.06] transition-all duration-200">
                {l.label}
              </button>
            ))}
            <button onClick={() => scrollTo('contact')}
              className="ml-4 px-5 py-2.5 bg-[#e8b130] text-[#0a0f1e] text-sm font-bold rounded-full shadow-lg shadow-[#e8b130]/25 hover:bg-amber-400 hover:shadow-[#e8b130]/40 transition-all duration-200">
              Make a Referral
            </button>
            <a href="/login"
              className="ml-2 px-5 py-2.5 border border-white/20 text-white text-sm font-semibold rounded-full hover:bg-white/[0.07] transition-all duration-200">
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
              style={{ background: 'rgba(10,15,30,0.98)', backdropFilter: 'blur(20px)' }}
            >
              <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col gap-1">
                {navLinks.map(l => (
                  <button key={l.id} onClick={() => { scrollTo(l.id); setMenuOpen(false); }}
                    className="text-left px-4 py-3 text-sm font-semibold text-white/70 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all">
                    {l.label}
                  </button>
                ))}
                <button onClick={() => { scrollTo('contact'); setMenuOpen(false); }}
                  className="mt-3 px-5 py-3 bg-[#e8b130] text-[#0a0f1e] text-sm font-bold rounded-xl text-center hover:bg-amber-400 transition-all">
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
      <header className="relative min-h-screen flex items-center overflow-hidden" style={{ background: '#0a0f1e' }}>

        {/* Background grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        {/* Radial glow behind text — gold */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(232,177,48,0.09) 0%, transparent 65%)' }} />

        {/* Floating orb — gold top right */}
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.12, 0.22, 0.12] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[15%] right-[10%] w-[420px] h-[420px] rounded-full blur-[130px] pointer-events-none"
          style={{ background: '#e8b130' }}
        />
        {/* Floating orb — indigo bottom left */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.07, 0.15, 0.07] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          className="absolute bottom-[10%] left-[5%] w-[380px] h-[380px] rounded-full blur-[110px] pointer-events-none"
          style={{ background: '#6366f1' }}
        />
        {/* Floating orb — rose mid right */}
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.05, 0.1, 0.05] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
          className="absolute top-[60%] right-[30%] w-[300px] h-[300px] rounded-full blur-[90px] pointer-events-none"
          style={{ background: '#f43f5e' }}
        />

        {/* Left edge gold accent */}
        <div className="absolute left-0 top-0 bottom-0 w-px pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(232,177,48,0.6) 40%, rgba(232,177,48,0.3) 70%, transparent 100%)' }} />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-28 pb-24 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              {/* CQC trust badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2.5 border border-[#e8b130]/30 rounded-full px-5 py-2.5 mb-8"
                style={{ background: 'rgba(232,177,48,0.07)' }}
              >
                <Shield size={13} className="text-[#e8b130]" />
                <span className="text-[#e8b130] text-xs font-bold tracking-widest uppercase">CQC Inspected · Rated Good</span>
              </motion.div>

              {/* Main headline */}
              <motion.h1
                initial={{ opacity: 0, y: 36 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
                className="text-4xl md:text-5xl lg:text-[3.75rem] font-black leading-[1.05] tracking-tight mb-5"
              >
                <span className="text-white">The Provider of Choice</span>
                <br />
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-[#e8b130] via-amber-300 to-[#e8b130] bg-clip-text text-transparent">
                    for the Domiciliary
                  </span>
                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.9, delay: 0.7, ease: EASE }}
                    className="absolute -bottom-1 left-0 right-0 h-0.5 origin-left"
                    style={{ background: 'linear-gradient(to right, #e8b130, rgba(232,177,48,0.15))' }}
                  />
                </span>
                <br />
                <span className="text-white/55 text-3xl md:text-4xl lg:text-[2.8rem] font-bold">and Supported Living Services</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.22 }}
                className="text-sm font-bold mb-5 flex items-center gap-3"
                style={{ color: 'rgba(232,177,48,0.85)' }}
              >
                <span className="w-10 h-px inline-block" style={{ background: 'rgba(232,177,48,0.5)' }} />
                Your care our priority
              </motion.p>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-lg leading-relaxed mb-10 max-w-lg text-white/55"
              >
                Comprehensive Care is a CQC-registered provider specialising in a wide range of complex care services. We offer tailored support for individuals with various needs, using a Positive Behaviour Support (PBS) approach. We also offer additional therapeutic services through an in-house therapist, providing free CBT therapy, mindfulness, DBT, and behaviour therapy.
              </motion.p>

              {/* CTA row */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-wrap gap-4 mb-14"
              >
                <button onClick={() => scrollTo('contact')}
                  className="px-8 py-4 bg-[#e8b130] text-[#0a0f1e] font-bold text-base rounded-2xl shadow-2xl shadow-[#e8b130]/30 hover:bg-amber-400 hover:-translate-y-1.5 hover:shadow-[#e8b130]/50 transition-all duration-250 flex items-center gap-2">
                  Make a Referral <ArrowRight size={16} />
                </button>
                <button onClick={() => scrollTo('services')}
                  className="px-8 py-4 border border-white/20 text-white font-bold text-base rounded-2xl hover:bg-white/[0.07] hover:-translate-y-1 transition-all duration-250">
                  Our Services
                </button>
                <button onClick={() => scrollTo('careers')}
                  className="px-8 py-4 border border-[#e8b130]/30 text-[#e8b130] font-bold text-base rounded-2xl hover:bg-[#e8b130]/[0.08] hover:-translate-y-1 transition-all duration-250">
                  Join Our Team
                </button>
              </motion.div>

              {/* Trust badges row */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.55 }}
                className="flex flex-wrap items-center gap-6"
              >
                {[
                  { icon: <Trophy size={13} />, text: 'CQC Rated Good' },
                  { icon: <Clock size={13} />, text: '24/7 Support' },
                  { icon: <Shield size={13} />, text: 'DBS Checked Staff' },
                  { icon: <Heart size={13} />, text: '10+ Years Experience' },
                ].map(b => (
                  <div key={b.text} className="flex items-center gap-2 text-xs font-semibold text-white/45">
                    <span className="text-[#e8b130]">{b.icon}</span>
                    {b.text}
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right: logo + accreditation badges */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
              className="hidden lg:flex flex-col items-center gap-8"
            >
              {/* Logo card */}
              <div className="relative w-full">
                <div className="absolute -inset-8 rounded-[2rem] blur-3xl pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse at center, rgba(232,177,48,0.18), transparent 70%)' }} />
                <div className="relative rounded-3xl p-10 shadow-2xl border"
                  style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px) saturate(150%)', borderColor: 'rgba(232,177,48,0.12)' }}>
                  <img src="/cc-logo.jpg" alt="Comprehensive Care" className="w-full max-w-xs mx-auto object-contain" />
                  {/* Inner shimmer border */}
                  <div className="absolute inset-0 rounded-3xl pointer-events-none"
                    style={{ background: 'linear-gradient(135deg, rgba(232,177,48,0.06) 0%, transparent 60%)', border: '1px solid rgba(232,177,48,0.08)' }} />
                </div>
              </div>

              {/* Accreditation logos */}
              <div className="flex items-center gap-4 w-full justify-center">
                {[
                  { src: '/cqc-good.jpg', alt: 'CQC Good' },
                  { src: '/ico-logo.png', alt: 'ICO' },
                  { src: '/pqs-logo.png', alt: 'PQS SSIP' },
                ].map(badge => (
                  <motion.div
                    key={badge.alt}
                    whileHover={{ scale: 1.06, y: -2 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-2xl p-3.5 border"
                    style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)', borderColor: 'rgba(232,177,48,0.18)' }}>
                    <img src={badge.src} alt={badge.alt} className="h-11 object-contain rounded-xl" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer"
            onClick={() => scrollTo('stats')}
          >
            <div className="w-px h-8" style={{ background: 'linear-gradient(to bottom, rgba(232,177,48,0.4), transparent)' }} />
            <ChevronDown size={18} style={{ color: 'rgba(255,255,255,0.2)' }} />
          </motion.div>
        </div>
      </header>

      {/* ── Stats bar ───────────────────────────────────────────────────────── */}
      <section id="stats" className="py-16 relative overflow-hidden"
        style={{ background: '#080e1d', borderTop: '1px solid rgba(232,177,48,0.25)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Subtle gold glow centre */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(232,177,48,0.06) 0%, transparent 70%)' }} />
        <div className="relative max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-10">
          <StatCounter target={14} suffix="+" label="Care Specialisms" />
          <StatCounter target={24} suffix="/7" label="Support Available" />
          <StatCounter target={10} suffix="+" label="Agency Settings" />
          <StatCounter target={100} suffix="%" label="Person-Centred" />
        </div>
      </section>

      {/* ── Core Services ───────────────────────────────────────────────────── */}
      <section id="services" className="py-28" style={{ background: '#f8f7f5' }}>
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-16">
              <SectionPill label="What We Do" />
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">Our Core Services</h2>
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
              <ExpandableServiceCard key={s.title} service={s} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── About ───────────────────────────────────────────────────────────── */}
      <section id="about" className="py-28" style={{ background: '#060b14' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-start">
            <Reveal>
              <div>
                <SectionPill label="Who We Are" />
                <h2 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight mb-6">
                  Putting People First,<br />
                  <span className="bg-gradient-to-r from-[#e8b130] via-amber-300 to-amber-400 bg-clip-text text-transparent">Always</span>
                </h2>

                {/* Our Mission */}
                <div className="mb-8 p-6 rounded-2xl border border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <h3 className="text-base font-extrabold text-[#e8b130] mb-3 flex items-center gap-2">
                    <Target size={15} />
                    Our Mission
                  </h3>
                  <p className="text-sm leading-relaxed text-white/55">
                    Our mission is to empower individuals with disabilities and complex care needs to live independently within their community, providing opportunities for them to lead fulfilling lives. We provide supported living and domiciliary care services designed to meet the specific needs of each person. We also offer additional therapeutic services through an in-house therapist, providing free intensive CBT therapy, mindfulness, DBT, and behaviour therapy. Our goal is to support them to lead valued and independent lives, stay connected to their local community and maintain their dignity regardless of their disability.
                  </p>
                </div>

                {/* Our Aims & Objectives */}
                <div className="mb-8">
                  <h3 className="text-base font-extrabold text-[#e8b130] mb-4 flex items-center gap-2">
                    <Sparkles size={15} />
                    Our Aims &amp; Objectives
                  </h3>
                  <ul className="space-y-3">
                    {[
                      'To provide a consistent and exceptional quality of care tailored to the individual needs of our service users.',
                      'To provide support that promotes independent choice, control and creates a significant impact in the lives of our service users.',
                      'To encourage staff development by offering new opportunities for growth.',
                      'To create a stable, secure, and non-judgmental environment where individuals feel safe to express and explore their feelings.',
                      'To work in partnership with individuals, their families, and other agencies to strengthen relationships and provide good quality care.',
                    ].map(aim => (
                      <li key={aim} className="flex items-start gap-3 text-sm text-white/60">
                        <div className="w-5 h-5 rounded-full bg-[#e8b130]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle size={11} className="text-[#e8b130]" />
                        </div>
                        {aim}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {ABOUT_BADGES.map(a => (
                    <div key={a.label} className="flex items-center gap-3 p-3.5 rounded-2xl border border-white/[0.07] hover:border-[#e8b130]/20 transition-colors duration-200"
                      style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <div className="w-8 h-8 rounded-xl bg-[#e8b130]/10 flex items-center justify-center flex-shrink-0">
                        <a.Icon size={15} className="text-[#e8b130]" />
                      </div>
                      <span className="text-sm font-semibold text-white/75">{a.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl blur-2xl -rotate-1 pointer-events-none"
                  style={{ background: 'linear-gradient(135deg, rgba(232,177,48,0.12), rgba(99,102,241,0.08))' }} />
                <img src="/values.png" alt="Our Values" className="relative rounded-3xl w-full object-cover shadow-2xl" />
                <div className="absolute -bottom-5 -left-5 rounded-2xl px-5 py-3 shadow-2xl font-bold text-sm border border-[#e8b130]/25"
                  style={{ background: 'rgba(10,15,30,0.92)', backdropFilter: 'blur(16px)', color: '#e8b130' }}>
                  <Brain size={14} className="inline mr-2 mb-0.5" />
                  Your Care · Our Priority
                </div>

                {/* Accreditations block */}
                <div className="mt-8 p-7 rounded-3xl border border-white/[0.07]" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-[#e8b130] text-xs font-bold uppercase tracking-widest mb-4">Accreditations</p>
                  <ul className="space-y-2.5">
                    {[
                      'Care Quality Commission registered (CQC)',
                      'SSIP Registered',
                      'ICO registered',
                      'Skills for life registered',
                      'Currently in the process of registering with ISO 9001 standards and UKHCA',
                      'Approved Provider for the Complex Mental Health Framework',
                    ].map(acc => (
                      <li key={acc} className="flex items-start gap-2.5 text-sm text-white/55">
                        <CheckCircle size={13} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                        {acc}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ───────────────────────────────────────────────────── */}
      <section className="py-28 relative overflow-hidden" style={{ background: '#0a0f1e' }}>
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 80% 50%, rgba(99,102,241,0.07) 0%, transparent 60%)' }} />

        <div className="relative max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-16">
              <SectionPill label="Why Choose Us" />
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">What Sets Us Apart</h2>
              <p className="text-lg max-w-2xl mx-auto leading-relaxed text-white/45">
                We don't just provide care — we build relationships, develop skills, and genuinely improve lives.
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
            {WHY_US.map(w => (
              <motion.div
                key={w.title}
                variants={cardAnim}
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="group p-8 rounded-3xl border cursor-default transition-all duration-300 relative overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(12px)',
                  borderColor: 'rgba(255,255,255,0.07)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(232,177,48,0.3)';
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)';
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)';
                }}
              >
                {/* Top gold accent bar on hover */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#e8b130] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className={`w-13 h-13 w-[52px] h-[52px] rounded-2xl bg-gradient-to-br ${w.gradient} flex items-center justify-center mb-6 shadow-lg`}>
                  <w.Icon size={22} className="text-white" />
                </div>
                <h3 className="text-lg font-extrabold text-white mb-3 tracking-tight">{w.title}</h3>
                <p className="text-sm leading-relaxed text-white/48">{w.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Specialisms ─────────────────────────────────────────────────────── */}
      <section id="specialisms" className="py-28" style={{ background: '#060b14' }}>
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-16">
              <SectionPill label="Our Expertise" />
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">Care Areas &amp; Specialisms</h2>
              <p className="text-lg max-w-2xl mx-auto leading-relaxed text-white/45">
                From complex mental health to end of life care — our teams are trained to support a wide range of needs and conditions.
              </p>
            </div>
          </Reveal>

          {/* Expandable specialism accordion */}
          <motion.div
            className="space-y-3 mb-16"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            {SPECIALISMS.map(spec => (
              <SpecialismCard key={spec.title} spec={spec} />
            ))}
          </motion.div>

          {/* Provider areas / Agency settings / Health conditions */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Provider areas */}
            <Reveal delay={0}>
              <div className="rounded-3xl overflow-hidden border border-[#e8b130]/20 shadow-xl shadow-[#e8b130]/5 h-full">
                <div className="p-7" style={{ background: 'linear-gradient(135deg, #111827, #1e2535)' }}>
                  <div className="w-11 h-11 rounded-2xl bg-[#e8b130]/10 border border-[#e8b130]/20 flex items-center justify-center mb-4">
                    <Stethoscope size={18} className="text-[#e8b130]" />
                  </div>
                  <p className="text-[#e8b130] text-xs font-bold uppercase tracking-widest mb-1">Care Provider</p>
                  <h3 className="text-xl font-extrabold text-white tracking-tight">Areas We Cover</h3>
                  <p className="text-white/40 text-sm mt-2">Direct care across supported living and community settings.</p>
                </div>
                <div className="p-7 bg-white">
                  <div className="flex flex-wrap gap-2">
                    {PROVIDER_AREAS.map(a => (
                      <span key={a} className="px-3 py-1.5 bg-[#e8b130]/8 text-[#b88a20] border border-[#e8b130]/20 rounded-full text-xs font-semibold">{a}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Agency settings */}
            <Reveal delay={0.08}>
              <div className="rounded-3xl overflow-hidden border border-slate-200/60 shadow-xl h-full">
                <div className="p-7" style={{ background: 'linear-gradient(135deg, #1e293b, #263042)' }}>
                  <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
                    <Building2 size={18} className="text-slate-300" />
                  </div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Staffing Agency</p>
                  <h3 className="text-xl font-extrabold text-white tracking-tight">Settings We Cover</h3>
                  <p className="text-slate-400 text-sm mt-2">Specialist staff placed across all care environments.</p>
                </div>
                <div className="p-7 bg-white">
                  <div className="flex flex-wrap gap-2">
                    {AGENCY_SETTINGS.map(a => (
                      <span key={a} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">{a}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Health conditions */}
            <Reveal delay={0.16}>
              <div className="rounded-3xl overflow-hidden border border-emerald-200/50 shadow-xl h-full">
                <div className="p-7" style={{ background: 'linear-gradient(135deg, #064e3b, #0d5c45)' }}>
                  <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center mb-4">
                    <Activity size={18} className="text-white" />
                  </div>
                  <p className="text-emerald-200 text-xs font-bold uppercase tracking-widest mb-1">Clinical Expertise</p>
                  <h3 className="text-xl font-extrabold text-white tracking-tight">Conditions We Support</h3>
                  <p className="text-emerald-100/60 text-sm mt-2">Complex health conditions managed with specialist care.</p>
                </div>
                <div className="p-7 bg-white">
                  <div className="flex flex-wrap gap-2">
                    {HEALTH_CONDITIONS.map(c => (
                      <span key={c} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-semibold">{c}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Accommodation ───────────────────────────────────────────────────── */}
      <section className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-16">
              <SectionPill label="Where We Support" />
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">Accommodation Options</h2>
              <p className="text-lg max-w-2xl mx-auto leading-relaxed text-slate-500">
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
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.25, ease: EASE }}
                className={`p-8 rounded-3xl border-2 ${acc.accentBorder} transition-all duration-300 bg-[#f8f7f5]`}
              >
                <div className={`w-14 h-14 rounded-2xl ${acc.iconBg} flex items-center justify-center mb-6`}>
                  <acc.Icon size={24} className={acc.iconColor} />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mb-3">{acc.title}</h3>
                <p className="text-sm leading-relaxed mb-6 text-slate-500">{acc.description}</p>
                <ul className="space-y-3">
                  {acc.features.map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle size={12} className="text-emerald-600" />
                      </div>
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
      <section id="values" className="py-28 relative overflow-hidden" style={{ background: '#f8f7f5' }}>
        {/* Large watermark number decoration */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[320px] font-black leading-none select-none pointer-events-none"
          style={{ color: 'rgba(232,177,48,0.04)', fontVariantNumeric: 'tabular-nums' }}>3</div>

        <div className="relative max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-16">
              <SectionPill label="What Drives Us" />
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">Our Values — Warm, Bespoke<br />and Compassionate Care</h2>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
                Everything we do is underpinned by these principles — guiding every care plan, every interaction, and every decision we make.
              </p>
            </div>
          </Reveal>

          <motion.div
            className="grid sm:grid-cols-1 lg:grid-cols-3 gap-6"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
          >
            {VALUES.map((v, idx) => (
              <motion.div
                key={v.title}
                variants={cardAnim}
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="bg-white p-8 rounded-3xl border border-slate-100 hover:border-slate-200 hover:shadow-2xl transition-all duration-350 relative overflow-hidden group"
              >
                {/* Large background numeral */}
                <div className="absolute -right-4 -bottom-6 text-[120px] font-black leading-none select-none pointer-events-none text-slate-50 group-hover:text-slate-100/70 transition-colors duration-300">
                  {idx + 1}
                </div>
                <div className="relative z-10">
                  <div className={`w-14 h-14 rounded-2xl ${v.iconBg} flex items-center justify-center mb-6`}>
                    <v.Icon size={24} className={v.iconColor} />
                  </div>
                  <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-4">{v.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{v.description}</p>
                </div>
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
                <div className="absolute -inset-6 rounded-3xl rotate-1 pointer-events-none blur-2xl"
                  style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.12), rgba(251,113,133,0.06))' }} />
                <img src="/eol.png" alt="End of Life Care" className="relative rounded-3xl w-full object-cover shadow-2xl max-h-[420px]" />
                <div className="absolute -bottom-4 -right-4 rounded-2xl shadow-2xl p-5 border border-rose-500/20"
                  style={{ background: 'rgba(10,15,30,0.92)', backdropFilter: 'blur(16px)' }}>
                  <p className="text-rose-400 font-bold text-sm">Palliative &amp; End of Life</p>
                  <p className="text-white/35 text-xs mt-0.5">Compassionate support at every stage</p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="order-1 lg:order-2">
                <SectionPill label="Compassionate Support" />
                <h2 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight mb-6">
                  End of Life<br />
                  <span className="text-rose-400">&amp; Palliative Care</span>
                </h2>
                <p className="text-lg leading-relaxed mb-5 text-white/55">
                  Providing personalised care in the final year or months of life leads to a more meaningful experience — centred on what matters most to the individual and their family.
                </p>
                <p className="text-lg leading-relaxed mb-8 text-white/55">
                  Our specialist team delivers compassionate end of life care that respects individuals' values, supports their families, and upholds dignity in every moment.
                </p>
                <div className="space-y-3">
                  {['Ostomy Care', 'Palliative Care', 'Ventilation & Breathing Support', 'Bowel Management', 'Catheter Care'].map(s => (
                    <div key={s} className="flex items-center gap-3 p-3.5 rounded-2xl border border-rose-500/10" style={{ background: 'rgba(244,63,94,0.06)' }}>
                      <div className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0" />
                      <span className="font-semibold text-sm text-white/75">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────────── */}
      <section className="py-28 bg-white relative overflow-hidden">
        {/* Large decorative quote mark */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[300px] font-black leading-none select-none pointer-events-none text-[#e8b130]/[0.04]">"</div>

        <div className="relative max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-16">
              <SectionPill label="Feedback" />
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">What People Say</h2>
              <p className="text-lg max-w-xl mx-auto leading-relaxed text-slate-500">
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
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="p-8 rounded-3xl border border-slate-100 hover:border-[#e8b130]/25 hover:shadow-2xl transition-all duration-350 bg-[#f8f7f5] flex flex-col group"
              >
                {/* Large gold opening quote */}
                <div className="text-6xl font-black text-[#e8b130] leading-none mb-4 select-none group-hover:scale-110 transition-transform duration-300 origin-left">&ldquo;</div>
                <p className="text-sm leading-relaxed mb-8 flex-1 text-slate-600 italic">{t.quote}</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#e8b130] to-amber-500 flex items-center justify-center text-[#0a0f1e] font-black text-sm flex-shrink-0 shadow-lg shadow-[#e8b130]/20">
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900 text-sm">{t.author}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CompCare Hub ─────────────────────────────────────────────────────── */}
      <section className="py-28 relative overflow-hidden" style={{ background: '#0a0f1e' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(232,177,48,0.07) 0%, transparent 60%)' }} />

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <Reveal>
              <div>
                <div className="inline-flex items-center gap-2 border border-[#e8b130]/25 rounded-full px-4 py-2 mb-6"
                  style={{ background: 'rgba(232,177,48,0.06)' }}>
                  <Sparkles size={13} className="text-[#e8b130]" />
                  <span className="text-[#e8b130] text-xs font-bold tracking-widest uppercase">Digital Care Management</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight mb-6">
                  Powered by<br />
                  <span style={{ color: '#e8b130' }}>CompCare Hub</span>
                </h2>
                <p className="text-white/55 text-lg leading-relaxed mb-6">
                  Our care teams use CompCare Hub — our proprietary digital care management platform — to ensure every service user's records, care plans, medications, and risk assessments are always accurate, up-to-date, and accessible.
                </p>
                <div className="space-y-3 mb-8">
                  {HUB_FEATURES.map(f => (
                    <div key={f.text} className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] hover:border-[#e8b130]/20 transition-colors duration-200"
                      style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <div className="w-9 h-9 rounded-xl bg-[#e8b130]/10 flex items-center justify-center flex-shrink-0">
                        <f.Icon size={15} className="text-[#e8b130]" />
                      </div>
                      <span className="text-sm font-semibold text-white/70">{f.text}</span>
                    </div>
                  ))}
                </div>
                <a href="/login"
                  className="inline-flex items-center gap-2 px-7 py-4 bg-[#e8b130] text-[#0a0f1e] font-bold rounded-2xl shadow-xl shadow-[#e8b130]/25 hover:bg-amber-400 hover:-translate-y-1 transition-all duration-200">
                  Staff Login → CompCare Hub
                </a>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="relative">
                <div className="absolute -inset-8 rounded-3xl opacity-25 pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse at center, rgba(232,177,48,0.5), transparent 70%)' }} />
                {/* Browser app mockup */}
                <div className="relative rounded-3xl p-6 shadow-2xl border border-white/[0.08]" style={{ background: '#0d1424' }}>
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    <div className="ml-4 flex-1 bg-white/[0.05] rounded-full h-6 flex items-center px-4">
                      <span className="text-white/25 text-xs">compcarehub.onrender.com</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-white/[0.04] rounded-2xl p-5 border border-white/[0.06]">
                      <p className="text-[#e8b130] text-xs font-bold uppercase tracking-widest mb-3">Dashboard</p>
                      <div className="grid grid-cols-3 gap-3">
                        {['17 Residents', '16 Staff', '2 Homes'].map(s => (
                          <div key={s} className="bg-white/[0.06] rounded-xl p-3 text-center border border-white/[0.05]">
                            <p className="text-white text-xs font-bold">{s}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white/[0.04] rounded-2xl p-5 border border-white/[0.06]">
                      <p className="text-white/35 text-xs font-bold uppercase tracking-widest mb-3">Recent Activity</p>
                      {['Care plan updated · J. Smith', 'MAR signed · Room 4', 'Staff check-in · 08:00'].map(a => (
                        <div key={a} className="flex items-center gap-2.5 py-2.5 border-b border-white/[0.05] last:border-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#e8b130] flex-shrink-0" />
                          <span className="text-white/40 text-xs">{a}</span>
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
      <section className="py-20 bg-white border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal>
            <div className="text-center mb-12">
              <SectionPill label="Trusted & Accredited" />
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Recognised Standards</h2>
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
                whileHover={{ y: -6, scale: 1.04 }} transition={{ duration: 0.2 }}>
                <div className="bg-white rounded-3xl p-7 shadow-md border border-slate-100 group-hover:shadow-xl group-hover:border-[#e8b130]/20 transition-all duration-300 w-44">
                  <img src={b.src} alt={b.alt} className="h-16 object-contain mx-auto rounded-xl" />
                </div>
                <p className="text-xs text-slate-500 font-semibold mt-3 max-w-[9rem]">{b.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Careers ─────────────────────────────────────────────────────────── */}
      <section id="careers" className="py-28" style={{ background: '#f8f7f5' }}>
        <div className="max-w-6xl mx-auto px-6">

          {/* Recruitment banner */}
          <Reveal>
            <div className="rounded-3xl p-10 mb-16 border border-[#e8b130]/20 relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(232,177,48,0.06), rgba(232,177,48,0.02))' }}>
              {/* Gold orb decoration */}
              <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl pointer-events-none"
                style={{ background: 'rgba(232,177,48,0.1)' }} />
              <div className="relative max-w-3xl">
                <SectionPill label="Join the Team" />
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-3">Ready to Join a Reliable Company?</h2>
                <p className="text-slate-600 text-lg mb-8">
                  If you're a support worker or healthcare professional seeking a trustworthy and reliable employer, your search ends here.
                </p>
                <ul className="space-y-3">
                  {CAREER_BANNER_BENEFITS.map(b => (
                    <li key={b} className="flex items-start gap-3 text-slate-700 text-sm">
                      <div className="w-5 h-5 rounded-full bg-[#e8b130]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle size={11} className="text-[#e8b130]" />
                      </div>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>

          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <Reveal>
              <div className="lg:sticky lg:top-32">
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight tracking-tight mb-6">
                  Make a Real<br />
                  <span style={{ color: '#e8b130' }}>Difference Every Day</span>
                </h2>
                <p className="text-slate-600 text-lg leading-relaxed mb-8">
                  We're always looking for passionate, dedicated professionals to join the Comprehensive Care family. Whether you're an experienced carer or just starting your journey, we'd love to hear from you.
                </p>
                <div className="space-y-4">
                  {CAREER_BENEFITS.map(b => (
                    <motion.div
                      key={b.title}
                      whileHover={{ x: 4 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-100 hover:border-[#e8b130]/25 hover:shadow-lg transition-all duration-250"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-[#e8b130]/10 flex items-center justify-center flex-shrink-0">
                        <b.Icon size={18} className="text-[#e8b130]" />
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-900">{b.title}</p>
                        <p className="text-sm text-slate-500 mt-0.5">{b.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                {/* Card header */}
                <div className="px-8 py-7 border-b border-[#e8b130]/15 relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, rgba(232,177,48,0.07), rgba(232,177,48,0.03))' }}>
                  <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl pointer-events-none"
                    style={{ background: 'rgba(232,177,48,0.12)' }} />
                  <div className="relative flex items-center gap-3 mb-1">
                    <div className="w-9 h-9 rounded-xl bg-[#e8b130]/15 flex items-center justify-center">
                      <Briefcase size={16} className="text-[#e8b130]" />
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Apply to Work With Us</h3>
                  </div>
                  <p className="text-slate-500 text-sm ml-12">Fill in the form and our recruitment team will be in touch shortly.</p>
                </div>

                <div className="p-8">
                  {submitted ? (
                    <div className="text-center py-14">
                      <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={36} className="text-emerald-500" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">Application Received!</h3>
                      <p className="text-slate-500 mb-8">Thank you for applying. We will review your details and be in touch shortly.</p>
                      <button onClick={() => setSubmitted(false)} className="font-bold text-[#e8b130] hover:underline">
                        Submit another application
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={apply} className="space-y-5">
                      <div className="grid md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">First Name *</label>
                          <input required
                            className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-[#e8b130] focus:ring-4 focus:ring-[#e8b130]/10 outline-none transition-all text-slate-800 font-medium bg-slate-50 focus:bg-white"
                            value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} placeholder="Jane" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Last Name *</label>
                          <input required
                            className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-[#e8b130] focus:ring-4 focus:ring-[#e8b130]/10 outline-none transition-all text-slate-800 font-medium bg-slate-50 focus:bg-white"
                            value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} placeholder="Smith" />
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Email Address *</label>
                          <input required type="email"
                            className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-[#e8b130] focus:ring-4 focus:ring-[#e8b130]/10 outline-none transition-all text-slate-800 font-medium bg-slate-50 focus:bg-white"
                            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Phone Number</label>
                          <input
                            className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-[#e8b130] focus:ring-4 focus:ring-[#e8b130]/10 outline-none transition-all text-slate-800 font-medium bg-slate-50 focus:bg-white"
                            value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="07700 900000" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Role Interested In *</label>
                        <select
                          className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-[#e8b130] focus:ring-4 focus:ring-[#e8b130]/10 outline-none transition-all bg-slate-50 focus:bg-white text-slate-800 font-medium"
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
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Message (optional)</label>
                        <textarea rows={3}
                          className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-[#e8b130] focus:ring-4 focus:ring-[#e8b130]/10 outline-none transition-all text-slate-800 font-medium resize-none bg-slate-50 focus:bg-white"
                          value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                          placeholder="Tell us a bit about yourself or ask any questions..." />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Upload CV (optional)</label>
                        <div className="relative">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-[#e8b130] focus:ring-4 focus:ring-[#e8b130]/10 outline-none transition-all text-slate-800 font-medium file:mr-4 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#e8b130]/10 file:text-[#e8b130] cursor-pointer bg-slate-50"
                            onChange={e => setCvFile(e.target.files?.[0] ?? null)}
                          />
                        </div>
                        {cvFile && (
                          <p className="text-xs text-emerald-600 font-semibold mt-2 flex items-center gap-1">
                            <CheckCircle size={12} /> {cvFile.name}
                          </p>
                        )}
                      </div>
                      <button disabled={loading} type="submit"
                        className="w-full bg-[#e8b130] text-[#0a0f1e] font-bold text-base py-4 rounded-2xl transition-all shadow-xl shadow-[#e8b130]/25 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-amber-400 hover:-translate-y-0.5 hover:shadow-[#e8b130]/40 flex items-center justify-center gap-2">
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
      <section id="contact" className="py-0 overflow-hidden">
        <div className="grid lg:grid-cols-2 min-h-[700px]">

          {/* Left — dark navy info panel */}
          <div className="relative py-24 px-10 lg:px-16 flex flex-col justify-center overflow-hidden" style={{ background: '#0a0f1e' }}>
            {/* Background orbs */}
            <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-3xl pointer-events-none"
              style={{ background: 'rgba(232,177,48,0.08)' }} />
            <div className="absolute -bottom-20 right-0 w-60 h-60 rounded-full blur-3xl pointer-events-none"
              style={{ background: 'rgba(99,102,241,0.07)' }} />

            <div className="relative z-10 max-w-md">
              <SectionPill label="Get In Touch" />
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">We'd Love to<br />Hear From You</h2>
              <p className="text-lg text-white/45 mb-10 leading-relaxed">
                Whether you're a family looking for care, a healthcare professional, or a prospective team member — we're here and ready to help.
              </p>

              {/* Contact blocks */}
              <div className="space-y-5">
                {[
                  { Icon: Phone, label: 'Main Line', value: '0161 6676 030', sub: 'Mon–Fri 9am–5pm', href: 'tel:01616676030' },
                  { Icon: Phone, label: 'Direct Line', value: '0161 843 0277', sub: 'Mon–Fri 9am–5pm', href: 'tel:01618430277' },
                  { Icon: Mail, label: 'General Enquiries', value: 'info@comprehensivecare.org.uk', sub: 'We reply within 24 hours', href: 'mailto:info@comprehensivecare.org.uk' },
                  { Icon: Mail, label: 'Recruitment', value: 'recruitment@comprehensivecare.org.uk', sub: 'CV & job enquiries', href: 'mailto:recruitment@comprehensivecare.org.uk' },
                ].map(c => (
                  <a key={c.label} href={c.href}
                    className="flex items-start gap-4 p-4 rounded-2xl border border-white/[0.07] hover:border-[#e8b130]/30 hover:bg-white/[0.03] transition-all duration-200 group">
                    <div className="w-9 h-9 rounded-xl bg-[#e8b130]/10 flex items-center justify-center flex-shrink-0">
                      <c.Icon size={15} className="text-[#e8b130]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/35 text-xs font-bold uppercase tracking-widest mb-0.5">{c.label}</p>
                      <p className="font-bold text-white text-sm break-all group-hover:text-[#e8b130] transition-colors duration-200">{c.value}</p>
                      <p className="text-white/30 text-xs mt-0.5">{c.sub}</p>
                    </div>
                  </a>
                ))}

                {/* Address */}
                <div className="flex items-start gap-4 p-4 rounded-2xl border border-white/[0.07]">
                  <div className="w-9 h-9 rounded-xl bg-[#e8b130]/10 flex items-center justify-center flex-shrink-0">
                    <MapPin size={15} className="text-[#e8b130]" />
                  </div>
                  <div>
                    <p className="text-white/35 text-xs font-bold uppercase tracking-widest mb-0.5">Manchester Office</p>
                    <p className="text-sm font-medium text-white/55 leading-relaxed">
                      Ivy Business Centre, Office 3-13<br />
                      Crown Street, Failsworth<br />
                      Manchester M35 9BG
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right — white CTA panel */}
          <div className="py-24 px-10 lg:px-16 flex flex-col justify-center bg-white">
            <div className="max-w-md">
              <h3 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-3">Ready to Make a Referral?</h3>
              <p className="text-slate-500 text-lg mb-2 leading-relaxed">
                Our assessment team will contact you within one working day to discuss your needs and arrange an initial care assessment at no cost.
              </p>
              <p className="text-sm text-slate-400 mb-10">Mon–Fri 9am–5pm · Weekends &amp; bank holidays closed</p>

              {/* Big CTA buttons */}
              <div className="space-y-3 mb-10">
                <a href="tel:01616676030"
                  className="flex items-center justify-between gap-3 w-full px-7 py-5 bg-[#e8b130] text-[#0a0f1e] font-bold text-lg rounded-2xl shadow-xl shadow-[#e8b130]/25 hover:bg-amber-400 hover:-translate-y-1 hover:shadow-[#e8b130]/40 transition-all duration-250 group">
                  <span className="flex items-center gap-3">
                    <Phone size={20} />
                    0161 6676 030
                  </span>
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform duration-200" />
                </a>
                <a href="mailto:info@comprehensivecare.org.uk"
                  className="flex items-center justify-between gap-3 w-full px-7 py-5 border-2 border-slate-200 text-slate-700 font-bold text-base rounded-2xl hover:border-[#e8b130]/40 hover:bg-[#e8b130]/[0.04] hover:-translate-y-1 transition-all duration-250 group">
                  <span className="flex items-center gap-3">
                    <Mail size={18} />
                    Email Us
                  </span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-200" />
                </a>
              </div>

              {/* Quick trust signals */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: <Shield size={14} />, text: 'CQC Registered' },
                  { icon: <Clock size={14} />, text: '24/7 On-Call Support' },
                  { icon: <CheckCircle size={14} />, text: 'Free Initial Assessment' },
                  { icon: <Heart size={14} />, text: 'Person-Centred Care' },
                ].map(t => (
                  <div key={t.text} className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-600">
                    <span className="text-[#e8b130]">{t.icon}</span>
                    {t.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="py-16 border-t border-white/[0.05]" style={{ background: '#030710' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-5">
                <img src="/cc-icon.jpg" alt="Comprehensive Care" className="w-10 h-10 rounded-xl object-contain border border-[#e8b130]/20" />
                <div>
                  <p className="font-black text-white text-sm leading-none tracking-tight">Comprehensive Care</p>
                  <p className="text-[9px] font-bold tracking-widest mt-0.5 text-[#e8b130] uppercase">Your Care · Our Priority</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed max-w-xs mb-6 text-white/30">
                A CQC-registered care provider and staffing agency delivering outstanding, person-centred care across Greater Manchester.
              </p>
              <div className="flex items-center gap-3 mb-5">
                <img src="/cqc-good.jpg" alt="CQC Good" className="h-9 object-contain rounded-lg opacity-40" />
                <img src="/ico-logo.png" alt="ICO" className="h-9 object-contain opacity-40" />
                <img src="/pqs-logo.png" alt="PQS" className="h-9 object-contain rounded-lg opacity-40" />
              </div>
              <div className="flex items-center gap-3">
                <a href="https://www.facebook.com/ComprehensiveCareServices" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl border border-white/[0.08] flex items-center justify-center hover:border-[#e8b130]/40 hover:bg-[#e8b130]/10 transition-all duration-200"
                  aria-label="Facebook">
                  <svg className="w-4 h-4 text-white/40" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
                </a>
                <a href="https://www.instagram.com/comprehensivecareservices" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl border border-white/[0.08] flex items-center justify-center hover:border-[#e8b130]/40 hover:bg-[#e8b130]/10 transition-all duration-200"
                  aria-label="Instagram">
                  <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" /></svg>
                </a>
              </div>
            </div>

            <div>
              <p className="text-white font-bold mb-4 text-xs uppercase tracking-widest">Services</p>
              <ul className="space-y-2.5 text-sm">
                {['Supported Living', 'Domiciliary Care', 'Respite Care', 'Live-In Care', 'End of Life Care', 'Staffing Agency'].map(s => (
                  <li key={s}>
                    <span className="text-white/35 hover:text-white/70 transition-colors duration-200 cursor-default">{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-white font-bold mb-4 text-xs uppercase tracking-widest">Contact</p>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <Phone size={12} className="text-[#e8b130] mt-0.5 flex-shrink-0" />
                  <div>
                    <a href="tel:01616676030" className="hover:text-white/70 transition-colors block text-white/35">0161 6676 030</a>
                    <a href="tel:01618430277" className="hover:text-white/70 transition-colors block text-white/35">0161 843 0277</a>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Mail size={12} className="text-[#e8b130] mt-0.5 flex-shrink-0" />
                  <div>
                    <a href="mailto:info@comprehensivecare.org.uk" className="hover:text-white/70 transition-colors block text-xs break-all text-white/35">info@comprehensivecare.org.uk</a>
                    <a href="mailto:recruitment@comprehensivecare.org.uk" className="hover:text-white/70 transition-colors block text-xs break-all text-white/35">recruitment@comprehensivecare.org.uk</a>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin size={12} className="text-[#e8b130] mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-white/35">
                    Ivy Business Centre, Office 3-13<br />
                    Crown Street, Failsworth<br />
                    Manchester M35 9BG<br />
                    Mon–Fri 9am–5pm
                  </span>
                </li>
                <li className="pt-1">
                  <a href="/login" className="font-bold text-[#e8b130] hover:text-amber-400 transition-colors text-xs">
                    Staff Login (CompCare Hub) →
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/[0.05] pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
            <p className="text-white/25">&copy; {new Date().getFullYear()} Comprehensive Care Services Ltd. All rights reserved.</p>
            <p className="text-white/15">Registered in England &amp; Wales · CQC Registered Provider · ICO Registered</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
