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
        className="relative flex items-center justify-center text-center"
        style={{
          backgroundImage: 'url(/hero-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: '600px',
          padding: '120px 1rem',
          overflow: 'clip',
        }}
      >
        <div className="relative z-10 max-w-3xl mx-auto px-4">
          <motion.p
            initial={{ x: -300, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-white text-base font-black uppercase tracking-widest mb-4 font-serif drop-shadow-md"
          >
            Your Care Our Priority
          </motion.p>

          <motion.h1
            initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.15 }}
            className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-6 font-serif drop-shadow-md"
          >
            Your Provider of Choice for Supported Living &amp; Domiciliary Care
          </motion.h1>

          <motion.div
            initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.45 }}
            className="flex flex-wrap justify-center gap-4 mb-12"
          >
            <Link to="/make-a-referral" className="btn-red px-8 py-3 text-base font-bold">Make a Referral</Link>
            <Link to="/our-services"
              className="px-8 py-3 text-base font-bold rounded-xl border-2 border-white text-white hover:bg-white hover:text-brand-purple transition-colors">
              Explore Our Services
            </Link>
          </motion.div>

        </div>

        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="w-full h-[60px]">
            <path d="M0,20 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── INTRO PARAGRAPHS (below hero) ────────────────────────────── */}
      <section className="py-10 bg-white px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <p className="text-gray-900 text-lg font-bold leading-relaxed">
            Comprehensive Care is a CQC-registered provider, specialising in a wide range of Complex &amp; Enduring Mental Health, Learning Disability Support, Autism, ADHD &amp; Addiction Recovery &amp; Relapse Prevention Services.
          </p>
          <p className="text-gray-700 text-base font-semibold leading-relaxed">
            Our approach is centred around Outcome focussed, Person Centred Care and Positive Behaviours Support with emphasis on Community inclusion, promoting independence, dignity, and quality of life for all those we support.
          </p>
        </div>
      </section>

      {/* ── CQC RATING BADGE ─────────────────────────────────────────── */}
      <section className="py-10 bg-white px-4 border-t border-b border-gray-100">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8 text-center md:text-left">
          <img src="/logo.jpg" alt="Comprehensive Care" className="h-28 object-contain flex-shrink-0" />
          <div className="w-px h-16 bg-gray-200 hidden md:block flex-shrink-0" />
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="flex items-center gap-3 flex-shrink-0">
              <img src="/cqc-good.jpg" alt="CQC Rated Good" className="h-20 object-contain" />
              <img src="/cqc-new.jpg" alt="CQC Registered Provider" className="h-20 object-contain" />
            </div>
            <div className="sm:text-left">
              <p className="text-3xl font-black text-gray-900">
                We are rated <span className="text-green-600">Good</span> by CQC
              </p>
              <p className="text-gray-500 text-base mt-1">
                Care Quality Commission — Independent Regulator of Health &amp; Social Care in England
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT YOU CAN EXPECT ──────────────────────────────────────── */}
      <section className="py-16 bg-peach-hero px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 heading-underline mb-2">
              What You Can Expect From Us
            </h2>
            <p className="text-2xl font-semibold text-brand-red font-serif italic mt-6">
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
                  <p className="text-gray-600 text-base leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES PREVIEW ─────────────────────────────────────────── */}
      <section className="py-16 bg-white px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 heading-underline mb-4">Our Services</h2>
            <p className="text-gray-700 font-bold max-w-2xl mx-auto mt-6 leading-relaxed text-lg">
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

      {/* ── OUR MODEL OF SUPPORT ─────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 heading-underline mb-4">Our Model of Support</h2>
            <p className="text-gray-700 font-bold text-lg max-w-3xl mx-auto leading-relaxed mt-6">
              Our approach is centred on empowering individuals to live fulfilling, meaningful, and independent lives.
              Every person is unique, which is why we deliver personalised support that builds on individual strengths,
              respects personal choices, and promotes positive outcomes.
            </p>
            <p className="text-gray-600 font-semibold text-base max-w-3xl mx-auto leading-relaxed mt-3">
              Our model of support is founded on evidence-based practice, compassion, and partnership, ensuring that
              every individual receives the right support to achieve their goals.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                color: '#7c42b4',
                icon: '🌱',
                title: 'Positive Behaviour Support (PBS)',
                body: 'We use Positive Behaviour Support (PBS) to understand the reasons behind behaviours of concern and develop proactive, person-centred strategies that improve quality of life. By focusing on prevention, skill development, and positive outcomes, we help individuals achieve greater independence while reducing restrictive practices.',
              },
              {
                color: '#d4845a',
                icon: '🤝',
                title: 'Community Inclusion',
                body: 'Being part of the community is essential for wellbeing and independence. We actively support individuals to build meaningful relationships, access education, employment and volunteering opportunities, develop life skills, and participate in social, recreational, and community activities that reflect their interests and aspirations.',
              },
              {
                color: '#00b8b8',
                icon: '⭐',
                title: 'Activities & Skills Development',
                body: 'We encourage individuals to develop confidence and independence through meaningful activities tailored to their abilities and goals. From daily living skills and education to hobbies, fitness, and leisure pursuits, we provide opportunities that promote personal growth, wellbeing, and a fulfilling lifestyle.',
              },
              {
                color: '#cc2222',
                icon: '💛',
                title: 'Person-Centred Care',
                body: 'Everything we do is built around the individual. We work collaboratively with the people we support, their families, and professionals to create personalised care plans that reflect each person\'s preferences, strengths, values, and ambitions. Our goal is to empower individuals to make informed choices and live life on their own terms.',
              },
            ].map(p => (
              <div key={p.title} className="rounded-2xl border-2 p-7 shadow-sm" style={{ borderColor: p.color + '33', background: p.color + '08' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: p.color + '22' }}>
                    {p.icon}
                  </div>
                  <h3 className="text-xl font-black text-gray-900">{p.title}</h3>
                </div>
                <p className="text-gray-700 text-base font-bold leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BUILDING BETTER LIVES — VIDEO ────────────────────────────── */}
      <section className="relative py-28 px-4"
        style={{ background: 'linear-gradient(135deg, #5a2d8a 0%, #7c42b4 50%, #9b5fd4 100%)' }}>
        {/* Top cloud wave */}
        <div className="absolute top-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 70" preserveAspectRatio="none" className="w-full h-[70px]">
            <path d="M0,40 C200,0 400,60 600,30 C800,0 1000,55 1200,20 C1350,0 1440,30 1440,30 L1440,0 L0,0 Z" fill="white" />
          </svg>
        </div>
        {/* Bottom cloud wave */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 70" preserveAspectRatio="none" className="w-full h-[70px]">
            <path d="M0,30 C200,70 400,10 600,40 C800,70 1000,20 1200,50 C1350,70 1440,35 1440,35 L1440,70 L0,70 Z" fill="white" />
          </svg>
        </div>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black text-white heading-underline text-center mb-12 font-serif italic">
            Building Better Lives Through Compassionate Care
          </h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <blockquote className="border-l-4 border-brand-gold pl-6 mb-8">
                <p className="text-white/90 text-2xl font-serif italic leading-relaxed">
                  "Every individual we support deserves to live a life filled with dignity, purpose,
                  and genuine connection. We don't just provide care — we walk alongside people,
                  empowering them to achieve their own goals and thrive within their communities."
                </p>
              </blockquote>
              <p className="text-white/80 text-lg leading-relaxed mb-6">
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

      {/* ── THERAPEUTIC SERVICES HIGHLIGHT ───────────────────────────── */}
      <section className="py-16 bg-peach-hero px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <p className="text-sm font-black text-brand-purple uppercase tracking-widest mb-3">Included Free of Charge</p>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-5 leading-tight">
              Therapeutic support from a qualified therapist —<br className="hidden md:block" /> Included at no extra cost
            </h2>
            <p className="text-gray-700 text-lg font-bold leading-relaxed mb-4">
              Comprehensive Care believe that exceptional care goes beyond meeting physical needs. That's why we provide
              complimentary access to our in-house therapeutic services as part of our care packages at no additional cost.
            </p>
            <p className="text-gray-700 text-base font-bold leading-relaxed mb-5">
              Unlike many providers who charge separately or refer individuals elsewhere, our experienced in-house therapist
              delivers evidence-based therapeutic support tailored to each person's individual needs. This integrated approach
              helps improve emotional wellbeing, build resilience, promote independence, and support long-term positive outcomes.
            </p>
            <p className="text-gray-900 text-base font-black mb-4">
              Choose from a range of specialist therapies designed to support mental, emotional, and behavioural wellbeing:
            </p>
            <div className="flex flex-wrap gap-3 mb-4">
              {[
                'Cognitive Behavioural Therapy (CBT)',
                'Dialectical Behaviour Therapy (DBT)',
                'Mindfulness',
                'Behaviour Therapy',
                'Tailored Therapeutic Support',
              ].map(t => (
                <span key={t} className="px-4 py-2 bg-white text-brand-purple border border-brand-purple/20 rounded-full text-base font-bold shadow-sm">{t}</span>
              ))}
            </div>
            <p className="text-gray-500 text-sm font-semibold italic mb-6">
              Click on each therapy below to learn more about how it can support you or your loved one.
            </p>
            <Link to="/our-specialism" className="btn-purple">Learn About Our Specialism →</Link>
          </div>
          <div className="photo-card rounded-2xl overflow-hidden h-80 lg:mt-16">
            <img src="/care-therapy.jpg" alt="Therapeutic Support" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* ── BROCHURE DOWNLOAD ────────────────────────────────────────── */}
      <section className="py-16 bg-white px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
                To learn more about our award-winning care services, simply download our brochure.
              </h2>
              <p className="text-gray-900 text-lg mb-6">
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
      <section className="py-16 bg-peach-light px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-black text-gray-900 mb-10 heading-underline">Our Accreditations &amp; Partners</h2>
          <div className="flex flex-wrap justify-center items-center gap-10 mt-8">
            {[
              { src: '/cqc-good.jpg',               label: 'CQC Inspected & Rated Good' },
              { src: '/cqc-new.jpg',                label: 'CQC Registered Provider' },
              { src: '/ico-logo.png',               label: "Information Commissioner's Office" },
              { src: '/pqs-logo.png',               label: 'PQS SSIP Health & Safety' },
              { src: '/logo-cyber-essentials.png',  label: 'Cyber Essentials Certified' },
              { src: '/logo-ssip.png',              label: 'SSIP Registered Member' },
              { src: '/logo-ukas.png',              label: 'UKAS Accredited' },
              { src: '/logo-skills-for-care.png',   label: 'Skills for Care Member' },
            ].map(a => (
              <div key={a.label} className="flex flex-col items-center gap-3 w-36 text-center">
                <img src={a.src} alt={a.label} className="h-24 object-contain mx-auto" />
                <p className="text-sm text-gray-600 font-semibold leading-snug">{a.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
