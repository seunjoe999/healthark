import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const SERVICES = [
  { icon: '🏠', title: 'Supported Living',         path: '/our-services', color: '#7c42b4' },
  { icon: '🧠', title: 'Complex Mental Health',     path: '/our-services', color: '#d4845a' },
  { icon: '🎓', title: 'Learning Disabilities',     path: '/our-services', color: '#00b8b8' },
  { icon: '♾️', title: 'Autism Support',            path: '/our-services', color: '#4ab47c' },
  { icon: '💊', title: 'Drug & Alcohol Recovery',   path: '/our-services', color: '#cc2222' },
  { icon: '🏡', title: 'Domiciliary Care',          path: '/our-services', color: '#5a7ab4' },
  { icon: '🕊️', title: 'End of Life Care',          path: '/our-services', color: '#b47c42' },
  { icon: '🛏️', title: 'Live In Care',              path: '/our-services', color: '#7c42b4' },
  { icon: '🌿', title: 'Respite Care',              path: '/our-services', color: '#4ab47c' },
  { icon: '♿', title: 'Physical Disabilities',     path: '/our-services', color: '#d4845a' },
  { icon: '🧬', title: 'Acquired Brain Injury',     path: '/our-services', color: '#cc2222' },
  { icon: '👴', title: 'Elderly Care',              path: '/our-services', color: '#00b8b8' },
]

const VALUES = [
  {
    title: 'Warm',
    icon: '🤝',
    color: '#d4845a',
    img: '/care-values-warm.jpg',
    desc: 'We promote the development of warm, supportive relationships between service users and carers that foster attachment and a sense of stability. A key aspect of this involves ensuring carers receive training and support to enhance their skills and maintain a consistent approach.',
  },
  {
    title: 'Bespoke',
    icon: '✨',
    color: '#7c42b4',
    img: '/care-values-bespoke.jpg',
    desc: 'Our service users receive care that is personalized to their individual needs through a person-centred approach. We deliver care in the way they prefer, working closely with them to ensure an exceptional care experience.',
  },
  {
    title: 'Compassionate',
    icon: '❤️',
    color: '#cc2222',
    img: '/care-values-compassionate.jpg',
    desc: 'Compassion is the foundation of how we provide care, built on relationships of empathy, respect, and dignity, which significantly influence how individuals experience their care.',
  },
]

const WHY_CHOOSE = [
  {
    title: 'Person-Centred Care',
    img: '/care-values-bespoke.jpg',
    desc: 'Every care plan is tailored to the individual — their preferences, goals, and needs are always at the centre of everything we do.',
  },
  {
    title: 'Experienced, Compassionate Staff',
    img: '/care-team.jpg',
    desc: 'Our team is rigorously trained, DBS-checked, and genuinely passionate about improving the lives of the people they support.',
  },
  {
    title: 'Community Inclusion & Independence',
    img: '/care-community.jpg',
    desc: 'We actively support individuals to engage with their communities, build independence, and live fulfilling, self-directed lives.',
  },
]

const THERAPIES = [
  'CBT Therapy',
  'Mindfulness',
  'DBT',
  'Behaviour Therapy',
  'Group Therapy',
  'One-to-One Support',
]

export default function Home() {
  return (
    <div>
      {/* ── SECTION 1: HERO ── */}
      <section className="bg-peach-hero relative overflow-hidden pt-12 pb-28 px-4 min-h-[560px] flex items-center">
        {/* Decorative blobs */}
        <div
          className="absolute top-10 right-10 w-80 h-80 rounded-full opacity-30 pointer-events-none"
          style={{ background: 'radial-gradient(circle,#f4b8a5,transparent)' }}
        />
        <div
          className="absolute bottom-10 left-10 w-56 h-56 rounded-full opacity-25 pointer-events-none"
          style={{ background: 'radial-gradient(circle,#e896a8,transparent)' }}
        />

        <div className="relative z-10 max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: copy */}
          <div>
            <motion.h1
              initial={{ x: -60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="text-3xl md:text-4xl lg:text-[2.65rem] font-black text-gray-900 leading-tight mb-4"
            >
              Provider of Choice for Supported Living and Domiciliary Care Services
            </motion.h1>

            <p className="italic-heading text-xl mb-5">
              Compassionate, Person-Centred Care That Puts You First
            </p>

            <p className="text-gray-600 text-base leading-relaxed mb-8">
              Supporting individuals with complex mental health, learning disabilities, autism, physical care
              needs through professional and compassionate care across the UK.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-3 mb-8">
              <Link to="/make-a-referral" className="btn-red">Make a Referral</Link>
              <Link to="/our-services" className="btn-purple">Explore Services</Link>
            </div>

            {/* Accreditation logos — all h-12 */}
            <div className="flex flex-wrap items-center gap-5">
              <img src="/cqc-good.jpg" alt="CQC Good"  className="h-12 object-contain" />
              <img src="/ico-logo.png"  alt="ICO"       className="h-12 object-contain" />
              <img src="/pqs-logo.png"  alt="PQS SSIP"  className="h-12 object-contain" />
            </div>
          </div>

          {/* Right: intro video */}
          <div className="flex justify-center">
            <div className="photo-card w-full max-w-lg bg-gray-100 aspect-video">
              <video
                className="w-full h-full object-cover"
                controls
                poster="/brochure-cover.jpg"
              >
                <source src="/intro-video.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="w-full h-[60px]">
            <path d="M0,20 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── SECTION 2: WHAT YOU CAN EXPECT FROM US ── */}
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
              <div
                key={v.title}
                className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100"
              >
                <div className="h-52 relative">
                  <img
                    src={v.img}
                    alt={v.title}
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0 flex items-end p-4"
                    style={{ background: `linear-gradient(to top, ${v.color}cc, transparent)` }}
                  >
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

      {/* ── SECTION 3: BUILDING BETTER LIVES ── */}
      <section
        className="py-20 px-4"
        style={{ background: 'linear-gradient(135deg, #5a2d8a 0%, #7c42b4 50%, #9b5fd4 100%)' }}
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-white heading-underline text-center mb-12 font-serif italic">
            Building Better Lives Through Compassionate Care
          </h2>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: quote / statement */}
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
                <Link to="/about-us" className="btn-gold">Learn About Us</Link>
                <Link to="/make-a-referral" className="btn-outline">Make a Referral</Link>
              </div>
            </div>

            {/* Right: image */}
            <div className="flex justify-center">
              <div className="photo-card w-full max-w-md aspect-[4/3] overflow-hidden rounded-2xl">
                <img
                  src="/care-hero.jpg"
                  alt="Building Better Lives"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: SPECIALIST SUPPORT ── */}
      <section className="py-16 bg-peach-light px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 heading-underline mb-6">
            Specialist Support Designed Around Your Individual Needs
          </h2>
          <p className="text-gray-600 text-base leading-relaxed max-w-3xl mx-auto">
            At Comprehensive Care, we understand that no two people are alike. That's why every care
            package we create starts with a detailed assessment of the individual — their medical
            background, personal preferences, cultural needs, and aspirations for the future.
            Our specialist teams then design a bespoke support plan that adapts as the person grows
            and their circumstances change, ensuring they always receive exactly the right level
            of care at exactly the right time.
          </p>
        </div>
      </section>

      {/* ── SECTION 5: OUR SERVICES ── */}
      <section className="py-16 bg-white px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 heading-underline mb-4">
              Our Services
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              We provide a comprehensive range of care and support services, each tailored to the
              unique needs of the individuals we serve across the UK.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {SERVICES.map(s => (
              <Link
                key={s.title}
                to={s.path}
                className="service-card p-6 text-center group"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mx-auto mb-3"
                  style={{ background: `${s.color}18` }}
                >
                  {s.icon}
                </div>
                <h3 className="font-bold text-sm text-gray-800 group-hover:text-brand-purple transition-colors leading-snug">
                  {s.title}
                </h3>
                <p className="text-xs text-brand-teal mt-2 font-semibold group-hover:underline">
                  Read More →
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 6: WHY CHOOSE COMPREHENSIVE CARE ── */}
      <section className="py-16 bg-peach-hero px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 heading-underline mb-4">
              Why Choose Comprehensive Care?
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              We are committed to raising the bar in care delivery — with a team, an ethos, and an
              approach that puts every individual first.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {WHY_CHOOSE.map(item => (
              <div
                key={item.title}
                className="bg-white rounded-2xl shadow-md p-8 text-center border border-gray-100 hover:shadow-lg transition-shadow"
              >
                {/* Circular portrait image */}
                <div className="w-24 h-24 mx-auto mb-5 rounded-full overflow-hidden border-4 border-brand-gold shadow">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 7: FREE THERAPEUTIC SERVICES ── */}
      <section
        className="py-20 px-4"
        style={{ background: 'linear-gradient(135deg, #5a2d8a 0%, #7c42b4 50%, #9b5fd4 100%)' }}
      >
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Left: copy */}
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">
              More Than Care
            </h2>

            {/* FREE badge */}
            <div className="inline-flex items-center gap-2 bg-green-500 text-white text-sm font-bold px-4 py-1.5 rounded-full mb-6 shadow">
              <span>✓</span>
              <span>Included Free of Charge</span>
            </div>

            <p className="text-white/90 text-base leading-relaxed mb-7">
              Alongside our care services, our in-house therapist provides a range of therapeutic
              services at absolutely no extra cost — helping individuals achieve holistic wellbeing.
            </p>

            <ul className="space-y-3">
              {THERAPIES.map(therapy => (
                <li key={therapy} className="flex items-center gap-3 text-white/90 text-sm">
                  <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    ✓
                  </span>
                  {therapy}
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <Link to="/our-services" className="btn-gold">
                Explore All Services
              </Link>
            </div>
          </div>

          {/* Right: image */}
          <div className="flex justify-center">
            <div className="photo-card w-full max-w-md aspect-[4/3] overflow-hidden rounded-2xl">
              <img
                src="/care-therapy.jpg"
                alt="Therapeutic Services"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── BROCHURE DOWNLOAD ── */}
      <section className="py-16 bg-white px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-3xl font-black text-gray-900 mb-4">
                To learn more about our award-winning care services, simply download our brochure.
              </h2>
              <p className="text-gray-500 mb-6">
                Comprehensive Care is a CQC-registered provider specialising in a wide range of
                complex care services. We offer tailored support for individuals with various needs.
              </p>
              <a
                href="/brochure.pdf"
                download
                className="btn-gold inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download Brochure
              </a>
            </div>
            <div className="photo-card aspect-[3/4] max-w-xs mx-auto">
              <img
                src="/brochure-cover.jpg"
                alt="Comprehensive Care Brochure"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── ACCREDITATIONS ── */}
      <section className="py-14 bg-peach-light px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-black text-gray-900 mb-8 heading-underline">
            Our Accreditations &amp; Partners
          </h2>
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
