import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

/* ─── Data ─────────────────────────────────────────────────────────── */

const SERVICES = [
  { img: '/service-supported-living.jpg',     title: 'Supported Living',         color: '#7c42b4',
    desc: 'Comprehensive supported living with 24-hour care, personal care, medication management, and life skills development.' },
  { img: '/service-mental-health.jpg',         title: 'Complex Mental Health',     color: '#d4845a',
    desc: 'Intensive, person-centred support for individuals with schizophrenia, bipolar disorder, personality disorders, and dual diagnosis.' },
  { img: '/service-learning-disabilities.jpg', title: 'Learning Disabilities',     color: '#00b8b8',
    desc: 'Specialist support promoting independence, inclusion, and personal development for adults with learning disabilities.' },
  { img: '/service-autism.jpg',                title: 'Autism Support',            color: '#4ab47c',
    desc: 'Structured, sensory-aware environments and tailored routines that help individuals with autism thrive.' },
  { img: '/service-drug-alcohol.jpg',          title: 'Drug & Alcohol Recovery',   color: '#cc2222',
    desc: 'Structured therapeutic support to help individuals achieve and maintain sobriety and reintegrate into their communities.' },
  { img: '/service-domiciliary.jpg',           title: 'Domiciliary Care',          color: '#5a7ab4',
    desc: 'Flexible, high-quality home care assisting with personal care, household tasks, medication, and social activities.' },
  { img: '/service-end-of-life.jpg',           title: 'End of Life Care',          color: '#b47c42',
    desc: 'Compassionate, dignified palliative care respecting the wishes of individuals and supporting families through this sensitive time.' },
  { img: '/service-live-in-care.jpg',          title: 'Live In Care',              color: '#7c42b4',
    desc: 'Round-the-clock support from a dedicated live-in carer offering companionship, personal care, and daily assistance.' },
  { img: '/service-respite.jpg',               title: 'Respite Care',              color: '#4ab47c',
    desc: 'Give family carers a much-needed break while loved ones continue receiving high-quality, person-centred care.' },
  { img: '/service-physical-disabilities.jpg', title: 'Physical Disabilities',     color: '#d4845a',
    desc: 'Support with personal care, mobility, rehabilitation activities, and community engagement, always promoting dignity and choice.' },
  { img: '/service-brain-injury.jpg',          title: 'Acquired Brain Injury',     color: '#cc2222',
    desc: 'Specialist rehabilitation support for stroke and TBI recovery, working closely with clinical teams to maximise independence.' },
  { img: '/service-elderly-care.jpg',          title: 'Elderly Care',              color: '#00b8b8',
    desc: 'Compassionate care for older adults keeping them safe, comfortable, and connected with specialist dementia support.' },
]

const VALUES = [
  {
    title: 'Warm',     icon: '🤝', color: '#d4845a', img: '/care-values-warm.jpg',
    desc: 'We promote warm, supportive relationships between service users and carers that foster attachment and stability.',
  },
  {
    title: 'Bespoke',  icon: '✨', color: '#7c42b4', img: '/care-values-bespoke.jpg',
    desc: 'Our service users receive care personalised to their individual needs through a person-centred approach.',
  },
  {
    title: 'Compassionate', icon: '❤️', color: '#cc2222', img: '/care-values-compassionate.jpg',
    desc: 'Compassion is the foundation of how we provide care — built on empathy, respect, and dignity.',
  },
]

const WHY_CHOOSE = [
  { title: 'Person-Centred Care',             img: '/care-values-bespoke.jpg', desc: 'Every care plan is tailored to the individual — their preferences, goals, and needs are always at the centre.' },
  { title: 'Experienced, Compassionate Staff', img: '/care-team.jpg',           desc: 'Our team is rigorously trained, DBS-checked, and genuinely passionate about improving the lives of the people they support.' },
  { title: 'Community Inclusion & Independence', img: '/care-community.jpg',    desc: 'We actively support individuals to engage with their communities, build independence, and live fulfilling lives.' },
]

const THERAPIES = ['CBT Therapy','Mindfulness','DBT','Behaviour Therapy','Group Therapy','One-to-One Support']

/* — About page data — */
const AIMS = [
  'To provide a consistent and exceptional quality of care tailored to the individual needs of our service users.',
  'To provide support that promotes independent choice, control and creates a significant impact in the lives of our service users.',
  'To encourage staff development by offering new opportunities for growth.',
  'To create a stable, secure, and non-judgmental environment where individuals feel safe to express and explore their feelings.',
  'To work in partnership with individuals, their families, and other agencies to strengthen relationships and provide good quality care.',
]
const ACCREDITATIONS = [
  'Care Quality Commission registered (CQC)',
  'SSIP Registered',
  'ICO Registered',
  'Skills for Life Registered',
  'Currently in the process of registering with ISO 9001 standards and UKHCA',
  'Approved Provider for the Complex Mental Health Framework',
]
const ABOUT_VALUES = [
  { title: 'Privacy',           icon: '🔒', desc: 'The right of individuals to be left alone and free from intrusion into their affairs, taken into account in formulation of Care Plans.' },
  { title: 'Dignity',           icon: '🌟', desc: 'All individuals, whatever their circumstances, have the right to be treated with dignity and respect.' },
  { title: 'Anti-Discrimination', icon: '🤝', desc: 'We actively challenge discrimination based on age, disability, gender, marital status, sexual orientation, culture, religion, or nationality.' },
  { title: 'Communication',     icon: '💬', desc: 'Clients have the right to be heard and fully informed on all aspects of their care, using methods appropriate to their abilities.' },
  { title: 'Independence',      icon: '🦋', desc: 'We encourage service users to make their own choices and remain as independent as possible while receiving support.' },
  { title: 'Person-Centred',    icon: '❤️', desc: 'Every care plan is built around the individual — their values, preferences, desires, and long-term goals.' },
]

/* — Provider areas / conditions — */
const PROVIDER_AREAS = [
  'Complex Mental Health','Learning Disabilities','Autism Spectrum Disorders','Drug and Alcohol Misuse',
  'Physical Complex Health','ADHD','Acquired Brain Injury','Physical Disabilities',
  'Court of Protection DOLs','Elderly Care','End of Life Care','Respite Care',
  'Supported Living','Domiciliary Care','Live In Care','Private & Local Authority Client',
]
const CONDITIONS = [
  'Motor Neurone Disease','Cerebral Palsy','Dyspraxia','Dementia',"Down's Syndrome",
  'Peg Feed Care','Tracheostomy Care','Palliative Care','Ventilation & Breathing Support',
  'Bowel Management','Catheter Care',"Huntingdon's Chorea",'Multiple Sclerosis',"Parkinson's Disease",
]

/* — Specialism page data — */
const ACTIVITIES = [
  { icon: '🎨', label: 'Arts & Crafts',             desc: 'Painting, drawing, creative projects' },
  { icon: '🎶', label: 'Music & Singing',            desc: 'Instruments, karaoke, and rhythm sessions' },
  { icon: '🥗', label: 'Cooking & Healthy Eating',   desc: 'Learn to prepare simple, tasty meals' },
  { icon: '🏃', label: 'Light Exercise & Dance',      desc: 'Movement for fun and wellbeing' },
  { icon: '🎯', label: 'Games & Puzzles',             desc: 'Board games, quizzes, and group challenges' },
  { icon: '🌱', label: 'Gardening Club',              desc: 'Planting, watering, and outdoor activities' },
  { icon: '🛒', label: 'Life Skills Practice',        desc: 'Budgeting, shopping, and travel training' },
  { icon: '💬', label: 'Social Skills Groups',        desc: 'Building confidence and communication' },
  { icon: '🖥',  label: 'IT & Media Skills',          desc: 'Using computers, tablets, and creative tech' },
  { icon: '🛋',  label: 'Sensory Room Sessions',      desc: 'Relax and self-regulate in our calming space' },
  { icon: '🎬', label: 'Film & Media Afternoons',     desc: 'Enjoy movies and discussions' },
  { icon: '🎨', label: 'Seasonal & Cultural Projects',desc: 'Celebrate events and festivals' },
]
const TIMETABLE = [
  { time: '9:30 AM',  activity: 'Welcome & Tea/Coffee' },
  { time: '10:00 AM', activity: 'Morning Activities (arts, music, life skills)' },
  { time: '12:30 PM', activity: 'Lunch & Social Time' },
  { time: '1:30 PM',  activity: 'Afternoon Activities (sensory room, exercise, film club)' },
  { time: '4:00 PM',  activity: 'Home Time' },
]

/* — How We Work data — */
const HELP_CARDS = [
  { icon: '💊', label: 'Medication Reminders',   color: '#d4845a' },
  { icon: '🏃', label: 'Staying Active',           color: '#7c42b4' },
  { icon: '🥗', label: 'Meal Prep & Groceries',   color: '#00b8b8' },
  { icon: '🚗', label: 'Transportation',           color: '#4ab47c' },
  { icon: '🏠', label: 'Personal Care',            color: '#cc2222' },
  { icon: '💬', label: 'Social Support',           color: '#b47c42' },
  { icon: '📋', label: 'Appointment Management',  color: '#5a7ab4' },
  { icon: '🛁', label: 'Household Tasks',          color: '#9b6cc8' },
]
const STEPS = [
  { num: '01', title: 'Initial Enquiry',   desc: 'Contact us via phone, email or our referral form. Our friendly team will discuss your needs and how we can help.' },
  { num: '02', title: 'Needs Assessment',  desc: "We carry out a comprehensive assessment to understand the individual's specific care requirements, preferences, and goals." },
  { num: '03', title: 'Care Plan Created', desc: 'A personalised care plan is developed in partnership with the individual, their family, and other healthcare professionals.' },
  { num: '04', title: 'Care Begins',       desc: 'Our trained staff begin delivering care according to the plan, with regular reviews to ensure it continues to meet needs.' },
]

/* — Carers data — */
const BENEFITS = [
  { icon: '💼', title: 'Competitive Pay',    desc: 'Fair wages with regular reviews and overtime rates' },
  { icon: '📚', title: 'Ongoing Training',   desc: 'Fully funded training and career development pathways' },
  { icon: '🕐', title: 'Flexible Hours',     desc: 'Full-time, part-time, and bank shifts available' },
  { icon: '🤝', title: 'Supportive Culture', desc: 'A team that supports you as much as the people we care for' },
  { icon: '🌱', title: 'Career Growth',      desc: 'Clear progression pathways from carer to senior and management roles' },
  { icon: '🏅', title: 'Recognition',        desc: 'Staff recognition programmes and rewards for outstanding care' },
]
const TRAINING_TAGS = [
  'Moving & Handling','Medication Management','Safeguarding Adults','First Aid',
  'Mental Health Awareness','Infection Control','Dementia Care','Autism Awareness',
  'Food Hygiene','Fire Safety','Communication Skills','Person-Centred Care',
]

/* ─── Component ─────────────────────────────────────────────────────── */

export default function Home() {
  const [form, setForm] = useState({ careFor: '', firstName: '', lastName: '', email: '', phone: '' })
  const [submitted, setSubmitted] = useState(false)

  return (
    <div>

      {/* ═══════════════════════════════════════════════════════════════
          HOME — hero matching comprehensivecare.onrender.com
      ═══════════════════════════════════════════════════════════════ */}
      <section
        id="home"
        className="relative overflow-hidden flex items-center justify-center text-center"
        style={{
          backgroundImage: 'linear-gradient(rgba(126,87,194,0.82), rgba(179,136,255,0.75)), url(/hero-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: '560px',
          padding: '120px 1rem',
        }}
      >
        {/* Decorative blurred circles (same as reference) */}
        <div className="absolute top-0 left-0 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.08)', filter: 'blur(60px)', transform: 'translate(-30%,-30%)' }} />
        <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.06)', filter: 'blur(60px)', transform: 'translate(30%,30%)' }} />

        <div className="relative z-10 max-w-3xl mx-auto px-4">
          <motion.h1
            initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="text-4xl md:text-5xl lg:text-[3rem] font-black text-white leading-tight mb-6"
          >
            Compassionate, Person-Centred Care That Puts You First
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
            className="text-white/85 text-lg leading-relaxed mb-10 max-w-2xl mx-auto"
          >
            Supporting individuals with complex mental health, learning disabilities, autism and physical care
            needs through professional, compassionate care across the UK.
          </motion.p>

          <motion.div
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.28, ease: 'easeOut' }}
            className="flex flex-wrap justify-center gap-4 mb-12"
          >
            <a href="#join-us" className="btn-gold px-8 py-3 text-base font-bold">Make a Referral</a>
            <a href="#our-services"
              className="px-8 py-3 text-base font-bold rounded-xl border-2 border-white text-white hover:bg-white hover:text-brand-purple transition-colors">
              Explore Services
            </a>
          </motion.div>

          {/* Accreditation logos */}
          <div className="flex flex-wrap justify-center items-center gap-6">
            <img src="/cqc-good.jpg" alt="CQC Good" className="h-12 object-contain brightness-0 invert opacity-90" />
            <img src="/ico-logo.png"  alt="ICO"      className="h-11 object-contain brightness-0 invert opacity-90" />
            <img src="/pqs-logo.png"  alt="PQS SSIP" className="h-11 object-contain brightness-0 invert opacity-90" />
          </div>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="w-full h-[60px]">
            <path d="M0,20 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* What You Can Expect */}
      <section className="py-16 bg-peach-hero px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 heading-underline mb-2">
              What You Can Expect From Us
            </h2>
            <p className="text-xl font-semibold text-brand-red font-serif italic mt-6">
              Warm, Bespoke and Compassionate Care
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {VALUES.map(v => (
              <div key={v.title} className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
                <div className="h-52 relative">
                  <img src={v.img} alt={v.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-end p-4"
                    style={{ background: `linear-gradient(to top, ${v.color}cc, transparent)` }}>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{v.icon}</span>
                      <h3 className="text-2xl font-black text-white">{v.title}</h3>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-gray-600 text-sm leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Building Better Lives — VIDEO */}
      <section className="py-20 px-4"
        style={{ background: 'linear-gradient(135deg, #5a2d8a 0%, #7c42b4 50%, #9b5fd4 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-white heading-underline text-center mb-12 font-serif italic">
            Building Better Lives Through Compassionate Care
          </h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <blockquote className="border-l-4 border-brand-gold pl-6 mb-8">
                <p className="text-white/90 text-xl font-serif italic leading-relaxed">
                  "Every individual we support deserves to live a life filled with dignity, purpose,
                  and genuine connection. We don't just provide care — we walk alongside people,
                  empowering them to achieve their own goals and thrive within their communities."
                </p>
              </blockquote>
              <p className="text-white/80 text-base leading-relaxed mb-6">
                Our person-centred philosophy means we listen first, plan collaboratively, and deliver
                care that truly reflects each person's unique story — not a one-size-fits-all template.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="#about" className="btn-gold">Learn About Us</a>
                <a href="#join-us" className="btn-outline">Make a Referral</a>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="photo-card w-full max-w-md aspect-[4/3] overflow-hidden rounded-2xl">
                <video className="w-full h-full object-cover" autoPlay muted loop playsInline>
                  <source src="/intro-video.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          ABOUT
      ═══════════════════════════════════════════════════════════════ */}
      <section id="about" className="py-16 bg-white px-4 scroll-mt-20">
        <div className="max-w-6xl mx-auto text-center mb-12">
          <span className="inline-block bg-brand-purple text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-3">About Us</span>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 heading-underline mb-4">
            Comprehensive Care — Who We Are
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto mt-6">
            Dedicated to exceptional, person-centred care across Greater Manchester and beyond.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl overflow-hidden h-72 md:h-96 photo-card mb-14">
            <img src="/about-team.jpg" alt="Comprehensive Care Team" className="w-full h-full object-cover" />
          </div>

          {/* Aims */}
          <div className="grid lg:grid-cols-2 gap-14 items-start mb-14">
            <div>
              <h3 className="text-2xl font-black text-gray-900 mb-6 heading-underline">Our Aims &amp; Objectives</h3>
              <ul className="space-y-4 mt-8">
                {AIMS.map((a, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-brand-purple/10 text-brand-purple flex items-center justify-center flex-shrink-0 font-bold text-sm mt-0.5">{i + 1}</span>
                    <p className="text-gray-600 text-sm leading-relaxed">{a}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="photo-card overflow-hidden rounded-2xl">
              <img src="/values-pic.png" alt="Our Values" className="w-full object-cover" />
            </div>
          </div>

          {/* Mission */}
          <div className="py-14 bg-peach-light rounded-2xl px-8 mb-14">
            <h3 className="text-2xl font-black text-gray-900 mb-8 heading-underline text-center">Our Mission</h3>
            <div className="grid lg:grid-cols-2 gap-10 items-center mt-8">
              <div className="bg-white rounded-2xl shadow-md p-8 text-left border-l-4 border-brand-purple">
                <p className="text-gray-600 leading-relaxed text-base">
                  Our mission is to empower individuals with disabilities and complex care needs to live independently within their community, providing opportunities for them to lead fulfilling lives. We provide supported living and domiciliary care services designed to meet the specific needs of each person. We also offer additional therapeutic services through an in-house therapist, providing free intensive CBT therapy, mindfulness, DBT, and behaviour therapy. This holistic approach ensures individuals receive comprehensive care addressing both physical and mental health needs.
                </p>
              </div>
              <div className="photo-card rounded-2xl overflow-hidden h-64">
                <img src="/about-mission.jpg" alt="Our Mission" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          {/* Accreditations */}
          <div className="mb-14">
            <h3 className="text-2xl font-black text-gray-900 mb-8 heading-underline text-center">Our Accreditations</h3>
            <div className="grid sm:grid-cols-2 gap-4 mt-10">
              {ACCREDITATIONS.map((a, i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-brand-purple/5 border border-brand-purple/15">
                  <span className="w-6 h-6 rounded-full bg-brand-purple/20 text-brand-purple flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                    </svg>
                  </span>
                  <p className="text-gray-700 text-sm font-medium">{a}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-8 mt-10">
              <img src="/cqc-good.jpg" alt="CQC Good" className="h-16 object-contain" />
              <img src="/ico-logo.png"  alt="ICO"      className="h-14 object-contain" />
              <img src="/pqs-logo.png"  alt="PQS SSIP" className="h-14 object-contain" />
            </div>
          </div>

          {/* Values */}
          <div className="bg-peach-hero rounded-2xl py-12 px-8">
            <h3 className="text-2xl font-black text-gray-900 mb-10 heading-underline text-center">Our Values</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
              {ABOUT_VALUES.map(v => (
                <div key={v.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
                  <div className="w-16 h-16 rounded-full bg-brand-purple/10 flex items-center justify-center text-3xl mx-auto mb-4">{v.icon}</div>
                  <h4 className="font-black text-lg text-gray-900 mb-2">{v.title}</h4>
                  <p className="text-gray-500 text-sm leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          OUR SERVICES
      ═══════════════════════════════════════════════════════════════ */}
      <section id="our-services" className="py-16 px-4 scroll-mt-20"
        style={{ background: 'linear-gradient(160deg, #9b68d0 0%, #7c42b4 100%)' }}>
        <div className="max-w-6xl mx-auto text-center mb-12">
          <span className="inline-block bg-white/20 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-3">Our Services</span>
          <h2 className="text-3xl md:text-4xl font-black text-white heading-underline mb-4">
            Comprehensive Care Services
          </h2>
          <p className="text-white/80 max-w-2xl mx-auto mt-6">
            We create bespoke services tailored to meet the specific needs of our service users, ensuring all areas of care are addressed.
          </p>
        </div>
        <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map(s => (
            <div key={s.title} className="bg-white rounded-2xl overflow-hidden shadow-md">
              <div className="h-44 overflow-hidden">
                <img src={s.img} alt={s.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-5">
                <h3 className="font-black text-lg text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Specialist Support */}
      <section className="py-16 bg-peach-light px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 heading-underline mb-6">
            Specialist Support Designed Around Your Individual Needs
          </h2>
          <p className="text-gray-600 text-base leading-relaxed max-w-3xl mx-auto">
            At Comprehensive Care, we understand that no two people are alike. That's why every care
            package we create starts with a detailed assessment of the individual — their medical
            background, personal preferences, cultural needs, and aspirations for the future.
          </p>
        </div>
      </section>

      {/* Areas We Cover */}
      <section className="py-14 bg-white px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 text-center mb-4 heading-underline">Areas We Cover as a Provider</h2>
          <p className="text-center text-gray-500 mb-10 mt-6 max-w-2xl mx-auto">
            Our staff are trained to manage complex care situations and provide personalised one-on-one experiences.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {PROVIDER_AREAS.map(a => (
              <div key={a} className="bg-white rounded-xl p-3.5 shadow-sm border border-gray-100 flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-brand-purple flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700">{a}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Health Conditions */}
      <section className="py-14 bg-peach-hero px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-black text-gray-900 text-center mb-4 heading-underline">Health Conditions We Support</h2>
          <p className="text-center text-gray-500 mb-10 mt-6">
            Our team is equipped to assist clients with a wide range of health conditions, including:
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {CONDITIONS.map(c => (
              <span key={c} className="px-4 py-2 bg-brand-purple/8 text-brand-purple border border-brand-purple/20 rounded-full text-sm font-semibold">{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose */}
      <section className="py-16 bg-white px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 heading-underline mb-4">Why Choose Comprehensive Care?</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              We are committed to raising the bar in care delivery — with a team, an ethos, and an approach that puts every individual first.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {WHY_CHOOSE.map(item => (
              <div key={item.title} className="bg-white rounded-2xl shadow-md p-8 text-center border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="w-24 h-24 mx-auto mb-5 rounded-full overflow-hidden border-4 border-brand-gold shadow">
                  <img src={item.img} alt={item.title} className="w-full h-full object-cover" />
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* More Than Care */}
      <section className="py-20 px-4"
        style={{ background: 'linear-gradient(135deg, #5a2d8a 0%, #7c42b4 50%, #9b5fd4 100%)' }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">More Than Care</h2>
            <div className="inline-flex items-center gap-2 bg-green-500 text-white text-sm font-bold px-4 py-1.5 rounded-full mb-6 shadow">
              <span>✓</span><span>Included Free of Charge</span>
            </div>
            <p className="text-white/90 text-base leading-relaxed mb-7">
              Alongside our care services, our in-house therapist provides a range of therapeutic services at absolutely no extra cost — helping individuals achieve holistic wellbeing.
            </p>
            <ul className="space-y-3">
              {THERAPIES.map(therapy => (
                <li key={therapy} className="flex items-center gap-3 text-white/90 text-sm">
                  <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">✓</span>
                  {therapy}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center">
            <div className="photo-card w-full max-w-md aspect-[4/3] overflow-hidden rounded-2xl">
              <img src="/care-therapy.jpg" alt="Therapeutic Services" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          OUR SPECIALISM
      ═══════════════════════════════════════════════════════════════ */}
      <section id="our-specialism" className="scroll-mt-20">

        {/* Hero banner */}
        <div className="py-14 px-4 bg-orange-hero relative overflow-hidden">
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <span className="inline-block bg-brand-orange text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-3">Our Specialism</span>
            <div className="gold-card px-8 py-8 mx-auto max-w-2xl">
              <h2 className="italic-heading text-4xl md:text-5xl mb-4">Our Specialism</h2>
              <p className="text-gray-600 text-base leading-relaxed">Amazing, skilled care professionals are ready to help right when you need it.</p>
            </div>
          </div>
        </div>

        {/* Specialism image */}
        <div className="px-4 py-10 bg-white">
          <div className="max-w-6xl mx-auto rounded-2xl overflow-hidden h-72 md:h-96 photo-card">
            <img src="/specialism-hero.jpg" alt="Our Specialism" className="w-full h-full object-cover opacity-80" />
          </div>
        </div>

        {/* Pathways to Independence */}
        <div className="py-14 bg-peach-light px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-block bg-brand-orange text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-3">Day Service</div>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 heading-underline mb-4">Pathways to Independence</h2>
              <p className="text-xl text-brand-red font-serif italic mt-6 mb-4">
                A Fun, Safe &amp; Supportive Day Service for Adults with Learning Disabilities, Autism &amp; Mental Health Needs
              </p>
              <div className="inline-flex items-center gap-2 bg-white rounded-full px-5 py-2 border border-brand-gold shadow-sm text-sm font-semibold text-gray-700">
                🕘 Opening Hours: Monday–Friday, 9:30 AM – 4:00 PM
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden h-56 mb-6 photo-card">
              <img src="/specialism-activities.jpg" alt="Pathways to Independence" className="w-full h-full object-cover" />
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6 md:p-8">
              <p className="text-gray-600 leading-relaxed">
                This service aims to provide a safe, supportive, and stimulating environment where individuals can develop skills, build confidence, and enjoy meaningful activities that support independence and wellbeing. At Pathways to Independence, we believe everyone deserves a space to learn, grow, and enjoy life to the fullest.
              </p>
            </div>
          </div>
        </div>

        {/* Activities */}
        <div className="py-14 bg-white px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-black text-gray-900 text-center heading-underline mb-10">Daily Activities Include</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-10">
              {ACTIVITIES.map(a => (
                <div key={a.label + a.desc} className="service-card p-4 text-center">
                  <span className="text-3xl block mb-2">{a.icon}</span>
                  <h4 className="font-bold text-sm text-gray-800 mb-1">{a.label}</h4>
                  <p className="text-xs text-gray-500">{a.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timetable */}
        <div className="py-14 bg-peach-hero px-4">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10">
            <div>
              <h2 className="text-2xl font-black text-gray-900 mb-6">Key Features</h2>
              <div className="grid gap-5">
                {[
                  { icon: '🎯', title: 'Choice & Flexibility', desc: 'Individuals choose activities based on interests and sensory needs.' },
                  { icon: '🧘', title: 'Sensory Considerations', desc: 'Quiet spaces, visual timetables, and alternative low-stimulation activities always available.' },
                  { icon: '📋', title: 'Individual Support Plans', desc: 'Activities adapted for different ability levels.' },
                  { icon: '🌈', title: 'Focus Areas', desc: 'Independence, communication, social connection, wellbeing, and creativity.' },
                ].map(f => (
                  <div key={f.title} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex gap-4">
                    <span className="text-2xl">{f.icon}</span>
                    <div>
                      <h3 className="font-black text-gray-900 mb-1 text-sm">{f.title}</h3>
                      <p className="text-gray-500 text-xs">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 mb-6">Daily Timetable</h2>
              <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-brand-gold/30">
                {TIMETABLE.map((t, i) => (
                  <div key={i} className={`flex gap-4 px-5 py-4 ${i % 2 === 0 ? 'bg-white' : 'bg-brand-purple/5'}`}>
                    <span className="text-brand-purple font-bold text-sm w-24 flex-shrink-0">{t.time}</span>
                    <span className="text-gray-700 text-sm">{t.activity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          HOW WE WORK
      ═══════════════════════════════════════════════════════════════ */}
      <section id="how-we-work" className="scroll-mt-20">

        {/* Hero banner */}
        <div className="py-14 px-4 bg-peach-hero relative overflow-hidden">
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-block bg-brand-orange text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-3">How We Work</span>
            <div className="gold-card px-8 py-8 mx-auto max-w-2xl">
              <h2 className="italic-heading text-4xl md:text-5xl mb-4">How We Work</h2>
              <p className="text-gray-600 text-base leading-relaxed">
                At Comprehensive Care, we select the best, most-skilled carers in advance, so they're ready to provide the care you want, right when you need it.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white px-4 py-10">
          <div className="max-w-6xl mx-auto rounded-2xl overflow-hidden h-64 md:h-80 photo-card">
            <img src="/howwework-hero.jpg" alt="How We Work" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* We Can Help */}
        <div className="py-14 bg-peach-hero px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 heading-underline mb-6">Comprehensive Care Can Help</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                At Comprehensive Care, we select the best, most-skilled carers in advance, so they're ready to provide the care you want, right when you need it.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {HELP_CARDS.map(c => (
                <div key={c.label} className="service-card p-5 text-center">
                  <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl"
                    style={{ background: `${c.color}18` }}>{c.icon}</div>
                  <p className="font-bold text-sm text-brand-red">{c.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quote */}
        <div className="py-14 bg-white px-4">
          <div className="max-w-3xl mx-auto">
            <div className="gold-card p-10 text-center">
              <p className="italic-heading text-2xl md:text-3xl leading-relaxed">
                "Amazing, skilled care professionals are ready to help right when you need it."
              </p>
            </div>
          </div>
        </div>

        {/* Process Steps */}
        <div className="py-14 bg-peach-light px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-black text-gray-900 text-center mb-10 heading-underline">Our Process</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
              {STEPS.map(s => (
                <div key={s.num} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="w-12 h-12 rounded-full bg-brand-purple text-white font-black text-lg flex items-center justify-center mb-4">{s.num}</div>
                  <h3 className="font-black text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Assessment Form */}
        <div className="bg-white">
          <div className="max-w-[1280px] mx-auto grid lg:grid-cols-2 min-h-[500px]">
            <div className="px-8 py-14">
              <h2 className="text-2xl font-black text-gray-900 mb-6">Request a Free Care Assessment</h2>
              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-3xl mx-auto mb-4">✓</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Request Received!</h3>
                  <p className="text-gray-500">Our team will be in touch within 24 hours.</p>
                  <button onClick={() => setSubmitted(false)} className="btn-purple mt-6">Submit Another</button>
                </div>
              ) : (
                <form onSubmit={e => { e.preventDefault(); setSubmitted(true) }} className="space-y-4">
                  <div>
                    <label className="form-label">Who needs the care? *</label>
                    <select required className="form-input" value={form.careFor}
                      onChange={e => setForm({ ...form, careFor: e.target.value })}>
                      <option value="">– please select –</option>
                      <option>Myself</option>
                      <option>My parent</option>
                      <option>My partner</option>
                      <option>My child</option>
                      <option>Someone else</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">First Name *</label>
                      <input required type="text" placeholder="Name" className="form-input"
                        value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
                    </div>
                    <div>
                      <label className="form-label">Last Name *</label>
                      <input required type="text" placeholder="Surname" className="form-input"
                        value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Your Email *</label>
                      <input required type="email" className="form-input"
                        value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div>
                      <label className="form-label">Your Phone *</label>
                      <input required type="tel" className="form-input"
                        value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    By using this form you agree to the storage and handling of your data by Comprehensive Care in accordance with our Privacy Policy.
                  </p>
                  <button type="submit" className="btn-purple w-full py-3 text-center text-sm">
                    Request Free Assessment →
                  </button>
                </form>
              )}
            </div>
            <div className="flex items-center justify-center px-10 py-14 text-white"
              style={{ background: 'linear-gradient(135deg, #7c42b4, #5a2d8a)' }}>
              <div>
                <h2 className="text-3xl md:text-4xl font-black mb-5">Get a free, no obligation care assessment</h2>
                <p className="text-white/75 text-base leading-relaxed mb-6">
                  Request a member of our team to visit you and carry out a full assessment of your care needs.
                </p>
                <ul className="space-y-3">
                  {['No obligation, completely free','Conducted by an experienced care professional','Tailored recommendations for your specific situation','Discuss funding options and next steps'].map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-white/85">
                      <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 fill-white" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 pt-6 border-t border-white/15 space-y-2 text-sm text-white/70">
                  <p>📞 0161 667 6030 / 0161 843 0277</p>
                  <p>📧 info@comprehensivecare.org.uk</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          OUR CARERS
      ═══════════════════════════════════════════════════════════════ */}
      <section id="our-carers" className="scroll-mt-20">

        {/* Hero banner */}
        <div className="py-14 px-4 bg-peach-hero">
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-block bg-brand-purple text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-3">Our Carers</span>
            <div className="gold-card px-8 py-8 mx-auto max-w-2xl">
              <h2 className="italic-heading text-4xl md:text-5xl mb-4">Our Carers</h2>
              <p className="text-gray-600 text-base leading-relaxed">At Comprehensive Care we select our staff very carefully and only take on the best.</p>
            </div>
          </div>
        </div>

        <div className="bg-white px-4 py-10">
          <div className="max-w-6xl mx-auto rounded-2xl overflow-hidden h-64 md:h-80 photo-card">
            <img src="/carers-team.jpg" alt="Our Care Team" className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="py-14 bg-white px-4">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <h2 className="text-3xl font-black text-gray-900 mb-6">Why Comprehensive Care?</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                At Comprehensive Care we select our staff very carefully and only take on the best. We have an established reputation and attract and retain the best staff by offering highly competitive pay rates, a choice of working hours, and ongoing personal support and training.
              </p>
              <p className="text-gray-600 leading-relaxed mb-6">
                We invest heavily in our team's development because we believe that well-supported, well-trained carers deliver the best care. Every member of our team undergoes rigorous vetting, enhanced DBS checks, and comprehensive induction training before working with any of our service users.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="#join-us" className="btn-purple">View Vacancies</a>
                <a href="#join-us" className="btn-gold">Make A Referral</a>
              </div>
            </div>
            <div className="photo-card overflow-hidden rounded-2xl h-80">
              <img src="/carers-hero.jpg" alt="Comprehensive Care team" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="py-14 bg-peach-hero px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-black text-gray-900 text-center mb-10 heading-underline">Employee Benefits</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
              {BENEFITS.map(b => (
                <div key={b.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex gap-4">
                  <span className="text-2xl">{b.icon}</span>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">{b.title}</h3>
                    <p className="text-gray-500 text-sm">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Training */}
        <div className="py-14 bg-white px-4">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl font-black text-gray-900 mb-6 heading-underline">Training &amp; Development</h2>
            <p className="text-gray-500 max-w-2xl mx-auto mb-10 mt-6">
              All Comprehensive Care staff receive comprehensive training to ensure they deliver the highest standard of care.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {TRAINING_TAGS.map(t => (
                <span key={t} className="px-4 py-2 bg-brand-purple/8 text-brand-purple border border-brand-purple/20 rounded-full text-sm font-semibold">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          JOIN US
      ═══════════════════════════════════════════════════════════════ */}
      <section id="join-us" className="py-20 px-4 scroll-mt-20"
        style={{ background: 'linear-gradient(135deg, #7c42b4, #5a2d8a)' }}>
        <div className="max-w-5xl mx-auto text-center">
          <span className="inline-block bg-white/20 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-4">Join Us</span>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Ready to Make a Difference?</h2>
          <p className="text-white/75 mb-10 max-w-xl mx-auto">
            Make a referral for someone in need of care, or join our team of dedicated care professionals across Greater Manchester.
          </p>
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="bg-white/10 rounded-2xl p-8 border border-white/20 text-left">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-xl font-black text-white mb-3">Make A Referral</h3>
              <p className="text-white/70 text-sm mb-6">Refer someone who needs our care services. We'll carry out a free assessment and create a tailored care plan.</p>
              <Link to="/make-a-referral" className="btn-gold inline-block">Make A Referral →</Link>
            </div>
            <div className="bg-white/10 rounded-2xl p-8 border border-white/20 text-left">
              <div className="text-4xl mb-4">💼</div>
              <h3 className="text-xl font-black text-white mb-3">Join Our Team</h3>
              <p className="text-white/70 text-sm mb-6">We're always looking for compassionate, skilled care professionals to join our growing team.</p>
              <Link to="/jobs" className="btn-gold inline-block">View Vacancies →</Link>
            </div>
          </div>
          <div className="mt-10 pt-8 border-t border-white/15 text-sm text-white/60 space-y-1">
            <p>📞 0161 667 6030 / 0161 843 0277</p>
            <p>📧 referrals@comprehensivecare.org.uk</p>
          </div>
        </div>
      </section>

      {/* ─── BROCHURE ─── */}
      <section className="py-16 bg-white px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-3xl font-black text-gray-900 mb-4">
                To learn more about our award-winning care services, simply download our brochure.
              </h2>
              <p className="text-gray-500 mb-6">
                Comprehensive Care is a CQC-registered provider specialising in a wide range of complex care services.
              </p>
              <a href="/brochure.pdf" download className="btn-gold inline-flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                Download Brochure
              </a>
            </div>
            <div className="photo-card aspect-[3/4] max-w-xs mx-auto">
              <img src="/brochure-cover.jpg" alt="Comprehensive Care Brochure" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── ACCREDITATIONS ─── */}
      <section className="py-14 bg-peach-light px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-black text-gray-900 mb-8 heading-underline">Our Accreditations &amp; Partners</h2>
          <div className="flex flex-wrap justify-center gap-8 mt-8">
            {[
              { src: '/cqc-good.jpg', label: 'CQC Inspected & Rated Good' },
              { src: '/ico-logo.png',  label: "Information Commissioner's Office" },
              { src: '/pqs-logo.png',  label: 'PQS SSIP Health & Safety' },
            ].map(a => (
              <div key={a.label} className="flex flex-col gap-3 w-36 text-center">
                <img src={a.src} alt={a.label} className="h-16 object-contain mx-auto" />
                <p className="text-xs text-gray-500 font-semibold leading-snug mt-2">{a.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
