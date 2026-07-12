import { Link } from 'react-router-dom'

const SERVICES = [
  {
    id: 'supported-living',
    title: 'Supported Living Services',
    tagline: 'Empowering individuals to live independently with the right support.',
    img: '/service-supported-living.jpg',
    intro: 'Our Supported Living service provides flexible, person-centred support to help individuals with learning disabilities, mental health needs, autism, and other complex conditions to live as independently as possible within their own tenancies. We work in partnership with each individual, their families, and other professionals to ensure support plans reflect personal goals while maintaining choice and control over their lives.',
    bullets: [
      'Personal care and daily living support',
      'Medication management',
      'Meal planning and preparation',
      'Household tasks',
      'Budgeting and tenancy support',
      'Community access and social inclusion',
      'Education, employment and volunteering support',
      'Health and wellbeing promotion',
      'Emotional support and confidence building',
    ],
  },
  {
    id: 'domiciliary-care',
    title: 'Domiciliary Care',
    tagline: 'Professional care delivered in the comfort of your own home.',
    img: '/service-domiciliary.jpg',
    intro: 'Our Domiciliary Care service enables individuals to remain in familiar surroundings while receiving flexible, high-quality support tailored to their lifestyle. Whether you require occasional visits or regular daily care, our compassionate carers provide practical assistance that promotes independence and peace of mind.',
    bullets: [
      'Personal care',
      'Medication support',
      'Meal preparation',
      'Companionship',
      'Domestic assistance',
      'Shopping and errands',
      'Mobility support',
      'Appointment escorting',
      'Overnight care',
      'Welfare checks',
    ],
  },
  {
    id: 'elder-care',
    title: 'Elder Care',
    tagline: 'Supporting older adults to live independently with dignity and confidence.',
    img: '/service-elderly-care.jpg',
    intro: 'Growing older should never mean giving up independence. Our Elder Care service provides compassionate support that enables older people to remain safe, comfortable, and connected within their own homes. We focus on promoting wellbeing, reducing loneliness, and helping individuals maintain their daily routines while providing reassurance to families.',
    bullets: [
      'Personal care',
      'Medication reminders',
      'Mobility assistance',
      'Companionship',
      'Meal preparation',
      'Household support',
      'Dementia-friendly routines',
      'Social and community engagement',
    ],
  },
  {
    id: 'live-in-care',
    title: 'Live-in Care',
    tagline: 'Round-the-clock support within the comfort of your own home.',
    img: '/service-live-in-care.jpg',
    intro: 'Our Live-in Care service provides dedicated one-to-one support from a professional carer who lives within the home, allowing individuals to remain in familiar surroundings while receiving continuous care. This service offers an excellent alternative to residential care, providing reassurance, consistency, and personalised support every day.',
    bullets: [
      'Continuous one-to-one personal care',
      'Medication management throughout the day',
      'Meal planning and preparation',
      'Companionship and emotional support',
      'Household management',
      'Mobility and personal care assistance',
      'Community engagement and social activities',
      'Family liaison and regular updates',
    ],
  },
  {
    id: 'respite-care',
    title: 'Respite Care',
    tagline: 'Giving family carers time to rest with complete peace of mind.',
    img: '/service-respite.jpg',
    intro: 'Caring for a loved one can be rewarding, but everyone needs time to recharge. Our Respite Care service provides temporary support, ensuring continuity of care while giving family members and regular carers the opportunity to take a well-deserved break. Whether support is needed for a few hours, several days, or longer, our experienced team is here to help.',
    bullets: [
      'Flexible short-term or longer respite periods',
      'Seamless continuity of existing care routines',
      'Personal care and daily living support',
      'Medication management',
      'Companionship and emotional wellbeing',
      'Community access and activities',
      'Family updates and regular communication',
    ],
  },
  {
    id: 'end-of-life',
    title: 'End of Life Care',
    tagline: 'Providing comfort, dignity, and compassionate support when it matters most.',
    img: '/eol.png',
    intro: 'Our End of Life Care service focuses on ensuring individuals receive respectful, person-centred care during the final stages of life. We work closely with families, healthcare professionals, and palliative care teams to deliver compassionate support that reflects each person\'s wishes, values, and beliefs. Our priority is to provide comfort, preserve dignity, and offer emotional support for both individuals and their loved ones during this important time.',
    bullets: [
      'Person-centred palliative care planning',
      'Comfort and pain management support',
      'Emotional and psychological support',
      'Family liaison and bereavement support',
      'Coordination with NHS and hospice teams',
      'Spiritual and cultural wishes respected',
      'Dignity and respect maintained at all times',
    ],
  },
]

const WHY_CHOOSE = [
  'Person-centred, tailored care',
  'Highly trained and compassionate care professionals',
  'Flexible support that adapts as needs change',
  'A focus on independence, dignity, and wellbeing',
  'Strong partnerships with families and healthcare professionals',
  'Holistic care that supports both physical and emotional wellbeing',
  'Reliable, responsive, and high-quality services you can trust',
]

export default function Services() {
  return (
    <div>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden py-20 px-4"
        style={{ background: 'linear-gradient(160deg, #9b68d0 0%, #7c42b4 45%, #5a2d8a 100%)' }}
      >
        <div className="absolute top-0 left-0 w-80 h-80 rounded-full pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)', transform: 'translate(-30%, -30%)' }} />
        <div className="absolute bottom-10 right-0 w-64 h-64 rounded-full pointer-events-none opacity-15"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)', transform: 'translate(20%, 20%)' }} />

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-2xl px-8 py-10 shadow-2xl">
            <h1 className="text-5xl md:text-6xl font-black italic text-brand-red font-serif mb-4">
              Our Services
            </h1>
            <div className="w-12 h-0.5 bg-brand-gold mx-auto mb-5" />
            <p className="text-gray-700 font-bold text-lg md:text-xl leading-relaxed">
              Comprehensive Care is a provider of supported living and domiciliary care services,
              true to our name in being comprehensive in nature.
            </p>
          </div>
        </div>

        {/* Cloud wave */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 70" preserveAspectRatio="none" className="w-full h-[70px]">
            <path d="M0,30 C200,70 400,10 600,40 C800,70 1000,20 1200,50 C1350,70 1440,35 1440,35 L1440,70 L0,70 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── "YES, IT'S PERSONAL" INTRO ────────────────────────────────── */}
      <section
        className="py-14 px-4"
        style={{ background: 'linear-gradient(160deg, #9b68d0 0%, #7c42b4 45%, #5a2d8a 100%)' }}
      >
        <div className="max-w-xl mx-auto text-center">
          <div className="bg-white rounded-2xl px-8 py-10 shadow-2xl">
            <h2 className="text-4xl md:text-5xl font-black italic text-brand-red font-serif mb-4">
              Yes, it's personal.
            </h2>
            <p className="text-gray-700 font-bold text-lg leading-relaxed mb-6">
              We understand what you are going through. The reason we started Comprehensive Care
              is to provide the best care possible to individuals and deliver it with passion.
            </p>
            <Link to="/contact-us" className="btn-gold">Get Started</Link>
          </div>
        </div>
      </section>

      {/* ── SERVICE SECTIONS ─────────────────────────────────────────── */}
      {SERVICES.map((s, i) => (
        <section
          key={s.id}
          id={s.id}
          className={`py-16 px-4 ${i % 2 === 0 ? 'bg-white' : 'bg-peach-light'}`}
        >
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">

              {/* Photo */}
              <div className={i % 2 !== 0 ? 'lg:order-2' : ''}>
                <div className="photo-card rounded-2xl overflow-hidden h-72 md:h-80">
                  <img src={s.img} alt={s.title} className="w-full h-full object-cover" />
                </div>
              </div>

              {/* Content */}
              <div className={i % 2 !== 0 ? 'lg:order-1' : ''}>
                <div className="w-10 h-1 rounded bg-brand-gold mb-4" />
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-2">{s.title}</h2>
                <p className="text-brand-purple font-bold italic mb-4 text-base">{s.tagline}</p>
                <p className="text-gray-700 font-bold leading-relaxed mb-5 text-base">{s.intro}</p>
                <p className="text-sm font-black text-gray-600 uppercase tracking-widest mb-3">Our support includes:</p>
                <ul className="space-y-2">
                  {s.bullets.map(b => (
                    <li key={b} className="flex items-start gap-2.5 text-base text-gray-800 font-bold">
                      <span className="w-2 h-2 rounded-full bg-brand-purple flex-shrink-0 mt-1.5" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        </section>
      ))}

      {/* ── COMPLIMENTARY THERAPEUTIC SUPPORT ────────────────────────── */}
      <section className="relative pt-24 pb-20 px-4" style={{ background: 'linear-gradient(135deg, #5a2d8a, #7c42b4)' }}>
        <div className="absolute top-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 70" preserveAspectRatio="none" className="w-full h-[70px]">
            <path d="M0,40 C200,0 400,60 600,30 C800,0 1000,55 1200,20 C1350,0 1440,30 1440,30 L1440,0 L0,0 Z" fill="white" />
          </svg>
        </div>
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-brand-gold text-sm font-bold uppercase tracking-widest mb-3">Key Differentiator — Included at No Additional Cost</p>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-2">Complimentary Therapeutic Support</h2>
          <div className="w-12 h-0.5 bg-brand-gold mx-auto mb-6" />
          <p className="text-white font-bold text-lg leading-relaxed mb-4 max-w-3xl mx-auto">
            As part of our commitment to delivering truly holistic care, every eligible individual has access
            to our in-house therapeutic services at <strong className="text-brand-gold">no extra cost</strong>.
          </p>
          <p className="text-white font-bold text-lg leading-relaxed mb-8 max-w-3xl mx-auto">
            Our qualified therapist provides evidence-based interventions that support emotional wellbeing,
            resilience, and personal development alongside day-to-day care.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {[
              'Cognitive Behavioural Therapy (CBT)',
              'Dialectical Behaviour Therapy (DBT)',
              'Mindfulness',
              'Behaviour Therapy',
              'Personalised therapeutic interventions',
            ].map(t => (
              <span key={t} className="px-5 py-2.5 bg-white/15 text-white rounded-full text-base font-semibold border border-white/30">
                {t}
              </span>
            ))}
          </div>
          <p className="text-white font-bold text-base italic max-w-2xl mx-auto">
            This unique service reflects our commitment to supporting both physical and mental wellbeing
            through integrated, person-centred care.
          </p>
        </div>
      </section>

      {/* ── WHY CHOOSE COMPREHENSIVE CARE ────────────────────────────── */}
      <section className="py-16 px-4 bg-peach-light">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="w-10 h-1 rounded bg-brand-gold mb-4" />
              <h2 className="text-4xl font-black text-gray-900 mb-5 leading-tight">
                Why Choose<br />Comprehensive Care?
              </h2>
              <p className="text-gray-700 font-bold leading-relaxed mb-4 text-base">
                At Comprehensive Care we select our staff very carefully and only take on the best.
                We have an established reputation and attract and retain the best staff by offering
                highly competitive pay rates, a choice of working hours and ongoing personal
                support and training.
              </p>
              <p className="text-gray-700 font-bold leading-relaxed mb-6 text-base">
                Whether you're looking for support for yourself or a loved one, our dedicated team
                is here to help every step of the way.
              </p>
              <ul className="space-y-3 mb-8">
                {WHY_CHOOSE.map(w => (
                  <li key={w} className="flex items-start gap-3 text-base text-gray-800 font-bold">
                    <svg className="w-4 h-4 text-brand-purple flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {w}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
                <Link to="/contact-us" className="btn-red">Get in Touch</Link>
                <Link to="/make-a-referral" className="btn-gold">Make a Referral</Link>
              </div>
            </div>
            <div>
              <div className="photo-card rounded-2xl overflow-hidden h-80">
                <img src="/service-domiciliary.jpg" alt="Why Choose Comprehensive Care" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AREAS WE COVER AS AN AGENCY ─────────────────────────────── */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="w-10 h-1 rounded bg-brand-gold mx-auto mb-4" />
            <h2 className="text-4xl font-black text-gray-900 mb-3">Areas We Cover as an Agency</h2>
            <p className="text-gray-700 font-bold max-w-2xl mx-auto text-base leading-relaxed">
              As a registered care agency, Comprehensive Care Ltd provides staffing and support services
              to a wide range of care settings across Greater Manchester and surrounding regions.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
            {[
              'Nursing Homes',
              'Residential Homes',
              'Care Homes',
              'Hospices',
              'Hospitals',
              'Mental Health Services',
              'Learning Disabilities services',
              'Supported Living',
              'Domiciliary Care',
              'Private & Local Authority Client',
            ].map(facility => (
              <div key={facility} className="flex items-start gap-3 bg-peach-light rounded-xl px-4 py-4 border border-peach-hero">
                <svg className="w-5 h-5 text-brand-purple flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-base font-bold text-gray-700">{facility}</span>
              </div>
            ))}
          </div>
          <div className="text-center mb-4">
            <div className="w-10 h-1 rounded bg-brand-gold mx-auto mb-4" />
            <h3 className="text-3xl font-black text-gray-900 mb-3">Geographic Areas We Cover</h3>
            <p className="text-gray-700 font-bold max-w-2xl mx-auto text-base leading-relaxed">
              We deliver high-quality support services across Greater Manchester and the surrounding areas.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              'Manchester', 'Salford', 'Oldham', 'Rochdale', 'Tameside',
              'Stockport', 'Trafford', 'Wigan', 'Bolton', 'Bury',
            ].map(area => (
              <div key={area} className="flex items-center gap-2 bg-white rounded-xl px-4 py-3 border border-brand-purple/20 shadow-sm">
                <svg className="w-5 h-5 text-brand-purple flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <span className="text-base font-bold text-gray-700">{area}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mt-6 italic">
            Don't see your area? Contact us — we may be able to support you. Our coverage continues to expand.
          </p>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-16 px-4 text-center" style={{ background: 'linear-gradient(135deg, #5a2d8a, #7c42b4)' }}>
        <div className="absolute top-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 70" preserveAspectRatio="none" className="w-full h-[70px]">
            <path d="M0,40 C200,0 400,60 600,30 C800,0 1000,55 1200,20 C1350,0 1440,30 1440,30 L1440,0 L0,0 Z" fill="white" />
          </svg>
        </div>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-4">
            Ready to find out how we can help?
          </h2>
          <p className="text-white/90 font-bold mb-8 text-lg">
            Get in touch today to find out how Comprehensive Care can support you with
            personalised care that puts your needs first.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/contact-us" className="btn-gold px-8 py-3 text-base">Contact Us Today</Link>
            <Link to="/day-services" className="px-8 py-3 text-base rounded-xl font-bold border-2 border-white text-white hover:bg-white hover:text-brand-purple transition-colors">Explore Day Services →</Link>
          </div>
        </div>
      </section>

    </div>
  )
}
