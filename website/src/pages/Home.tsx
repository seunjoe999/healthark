import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const VALUES = [
  { title: 'Warm',          color: '#d4845a', img: '/care-values-warm.jpg',
    desc: 'We promote warm, supportive relationships between service users and carers that foster attachment and stability.' },
  { title: 'Bespoke',       color: '#7c42b4', img: '/care-values-bespoke.jpg',
    desc: 'Our service users receive care personalised to their individual needs through a person-centred approach.' },
  { title: 'Compassionate', color: '#cc2222', img: '/care-values-compassionate.jpg',
    desc: 'Compassion is the foundation of how we provide care — built on empathy, respect, and dignity.' },
]

const SERVICES_PREVIEW = [
  { img: '/service-mental-health.jpg',         title: 'Complex Mental Health',    color: '#d4845a' },
  { img: '/service-supported-living.jpg',      title: 'Supported Living',          color: '#7c42b4' },
  { img: '/service-learning-disabilities.jpg', title: 'Learning Disabilities',     color: '#00b8b8' },
  { img: '/service-autism.jpg',                title: 'Autism Support',            color: '#4ab47c' },
  { img: '/service-drug-alcohol.jpg',          title: 'Drug & Alcohol Recovery',   color: '#cc2222' },
  { img: '/service-elderly-care.jpg',          title: 'Elderly Care',              color: '#b47c42' },
]

export default function Home() {
  return (
    <div>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden flex items-center justify-center text-center"
        style={{
          backgroundImage: 'linear-gradient(rgba(126,87,194,0.82), rgba(179,136,255,0.75)), url(/hero-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: '560px',
          padding: '120px 1rem',
        }}
      >
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
            <Link to="/make-a-referral" className="btn-gold px-8 py-3 text-base font-bold">Make a Referral</Link>
            <Link to="/our-services"
              className="px-8 py-3 text-base font-bold rounded-xl border-2 border-white text-white hover:bg-white hover:text-brand-purple transition-colors">
              Explore Services
            </Link>
          </motion.div>

          <div className="flex flex-wrap justify-center items-center gap-6">
            <img src="/cqc-good.jpg" alt="CQC Good" className="h-12 object-contain brightness-0 invert opacity-90" />
            <img src="/ico-logo.png"  alt="ICO"      className="h-11 object-contain brightness-0 invert opacity-90" />
            <img src="/pqs-logo.png"  alt="PQS SSIP" className="h-11 object-contain brightness-0 invert opacity-90" />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="w-full h-[60px]">
            <path d="M0,20 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── WHAT YOU CAN EXPECT ──────────────────────────────────────── */}
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
                    <h3 className="text-2xl font-black text-white">{v.title}</h3>
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

      {/* ── BUILDING BETTER LIVES — VIDEO ────────────────────────────── */}
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
                <Link to="/about" className="btn-gold">Learn About Us</Link>
                <Link to="/make-a-referral" className="btn-outline">Make a Referral</Link>
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

      {/* ── SERVICES PREVIEW ─────────────────────────────────────────── */}
      <section className="py-16 bg-white px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 heading-underline mb-4">Our Services</h2>
            <p className="text-gray-500 max-w-2xl mx-auto mt-6">
              We provide compassionate, person-centred care tailored to the unique needs of every individual —
              whether support is required at home, within supported living, or through specialist care services.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES_PREVIEW.map(s => (
              <div key={s.title} className="rounded-2xl overflow-hidden shadow-md border border-gray-100 group">
                <div className="h-44 overflow-hidden relative">
                  <img src={s.img} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${s.color}bb, transparent)` }} />
                  <h3 className="absolute bottom-3 left-4 text-white font-black text-base">{s.title}</h3>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/our-services" className="btn-purple px-8 py-3 text-base">View All Services →</Link>
          </div>
        </div>
      </section>

      {/* ── THERAPEUTIC SERVICES HIGHLIGHT ───────────────────────────── */}
      <section className="py-16 bg-peach-hero px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-bold text-brand-purple uppercase tracking-widest mb-3">Included Free of Charge</p>
            <h2 className="text-3xl font-black text-gray-900 mb-5 leading-tight">
              More Than Care —<br/>Therapy Included
            </h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              Alongside our care services, our experienced in-house therapist delivers evidence-based therapeutic support
              tailored to each person's individual needs. This integrated approach helps improve emotional wellbeing,
              build resilience, promote independence, and support long-term positive outcomes.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              {['CBT Therapy', 'DBT', 'Mindfulness', 'Behaviour Therapy', 'Group Therapy', 'One-to-One Support'].map(t => (
                <span key={t} className="px-4 py-2 bg-brand-purple/8 text-brand-purple border border-brand-purple/20 rounded-full text-sm font-semibold">{t}</span>
              ))}
            </div>
            <Link to="/our-specialism" className="btn-purple">Learn About Our Specialism →</Link>
          </div>
          <div className="photo-card rounded-2xl overflow-hidden h-72">
            <img src="/care-therapy.jpg" alt="Therapeutic Support" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* ── BROCHURE DOWNLOAD ────────────────────────────────────────── */}
      <section className="py-16 bg-white px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-3xl font-black text-gray-900 mb-4">
                Download our brochure to learn more about our award-winning care services.
              </h2>
              <p className="text-gray-500 mb-6">
                Comprehensive Care is a CQC-registered provider specialising in a wide range of complex care services across Greater Manchester and beyond.
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

      {/* ── ACCREDITATIONS ───────────────────────────────────────────── */}
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
