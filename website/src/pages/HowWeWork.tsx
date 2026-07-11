import { useState } from 'react'

const HELP_CARDS = [
  { icon: '💊', label: 'Medication Reminders' },
  { icon: '🏃', label: 'Staying Active' },
  { icon: '🥗', label: 'Meal Prep & Groceries' },
  { icon: '🚗', label: 'Transportation' },
  { icon: '🏠', label: 'Personal Care' },
  { icon: '💬', label: 'Social Support' },
  { icon: '📋', label: 'Appointment Management' },
  { icon: '🛁', label: 'Household Tasks' },
]

const STEPS = [
  {
    num: '1',
    title: 'Initial Enquiry',
    body: 'Your journey with us begins with a friendly conversation. We take the time to understand your circumstances, answer your questions, and explain how our services can support you or your loved one.',
  },
  {
    num: '2',
    title: 'Free Assessment',
    body: 'Our Registered Manager or an experienced member of our care team will carry out a comprehensive assessment in your home or preferred location. This allows us to understand your physical, emotional, social, and healthcare needs, as well as your personal preferences and desired outcomes.',
  },
  {
    num: '3',
    title: 'Personalised Care Planning',
    body: 'Using the information gathered during the assessment, we develop a tailored care plan that reflects your individual needs, routines, cultural preferences, lifestyle, and goals. We work closely with you, your family, and healthcare professionals to ensure the care plan is both practical and person-centred.',
  },
  {
    num: '4',
    title: 'Matching You with the Right Carer',
    body: 'We carefully match each individual with carers who have the appropriate skills, experience, and personality. We believe that building trusting relationships is key to delivering outstanding care, so we aim to provide consistency and continuity wherever possible.',
  },
  {
    num: '5',
    title: 'Delivering Outstanding Care',
    body: 'Our highly trained and compassionate carers provide care with dignity, respect, kindness, and professionalism. Whether you require personal care, complex care, companionship, live-in care, or support with daily living, our focus is always on helping you maintain your independence and quality of life.',
  },
  {
    num: '6',
    title: 'Ongoing Monitoring and Reviews',
    body: 'Care needs can change over time, which is why we regularly review every care package. We maintain close communication with service users, families, healthcare professionals, and commissioners to ensure our support continues to meet changing needs and delivers the best possible outcomes.',
  },
  {
    num: '7',
    title: 'Continuous Quality Improvement',
    body: 'We are committed to excellence. Through regular audits, staff supervision, training, service user feedback, and quality assurance processes, we continuously monitor and improve our services. We welcome feedback and use it to enhance the care we provide.',
  },
]

const PROMISE = [
  'Delivering safe, compassionate, and person-centred care.',
  'Treating every individual with dignity, respect, and kindness.',
  'Promoting independence, choice, and wellbeing.',
  'Recruiting highly trained, compassionate, and skilled care professionals.',
  'Working in partnership with families, healthcare professionals, and local authorities.',
  'Maintaining the highest standards of governance, safeguarding, and regulatory compliance.',
  'Providing reliable, responsive, and flexible care that people can trust.',
]

export default function HowWeWork() {
  const [form, setForm] = useState({
    careFor: '', firstName: '', lastName: '', email: '', phone: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 px-4 bg-peach-hero">
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
            Comprehensive Care Can Help
          </h1>
          <div className="w-12 h-0.5 bg-brand-gold mx-auto mb-5" />
          <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">
            At Comprehensive Care, we select the best, most-skilled carers in advance, so they're
            ready to provide the care you want, right when you need it.
          </p>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 50" preserveAspectRatio="none" className="w-full h-[50px]">
            <path d="M0,15 C360,50 1080,0 1440,25 L1440,50 L0,50 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── CAN HELP CARDS ───────────────────────────────────────────── */}
      <section className="py-14 bg-peach-light px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {HELP_CARDS.map(c => (
              <div key={c.label} className="bg-white rounded-2xl p-5 text-center shadow-sm border border-orange-100">
                <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl bg-brand-orange/10">
                  {c.icon}
                </div>
                <p className="font-bold text-sm text-brand-red">{c.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GOLD QUOTE CARD ──────────────────────────────────────────── */}
      <section className="py-14 bg-peach-hero px-4">
        <div className="max-w-3xl mx-auto">
          <div className="gold-card p-10 text-center">
            <p className="italic-heading text-2xl md:text-3xl leading-relaxed">
              "Amazing, skilled care professionals are ready to help right when you need it."
            </p>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS INTRO ───────────────────────────────────────── */}
      <section className="py-16 bg-white px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-10 h-1 rounded bg-brand-gold mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-5">How We Work</h2>
          <p className="text-gray-600 leading-relaxed mb-2">
            At Comprehensive Care Ltd, we believe that exceptional care begins with understanding
            the individual. Every person we support is unique, with their own needs, preferences,
            goals, and aspirations.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Our approach is built on compassion, professionalism, and a commitment to delivering
            safe, high-quality, person-centred care.
          </p>
        </div>
      </section>

      {/* ── 7-STEP PROCESS ───────────────────────────────────────────── */}
      <section className="py-16 bg-peach-light px-4">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-0">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex gap-6 relative">
                {/* Left: number + connector line */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-brand-purple text-white font-black text-lg flex items-center justify-center flex-shrink-0 z-10 shadow-md">
                    {s.num}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="w-0.5 flex-1 bg-brand-purple/25 my-2" />
                  )}
                </div>

                {/* Right: content */}
                <div className={`pb-10 flex-1 ${i === STEPS.length - 1 ? 'pb-0' : ''}`}>
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h3 className="font-black text-gray-900 text-lg mb-2">{s.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{s.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OUR PROMISE ──────────────────────────────────────────────── */}
      <section className="py-16 px-4" style={{ background: 'linear-gradient(135deg, #5a2d8a, #7c42b4)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <div className="w-10 h-1 rounded bg-brand-gold mb-4" />
              <h2 className="text-3xl font-black text-white mb-3">Our Promise</h2>
              <p className="text-white/75 text-sm mb-6">
                At Comprehensive Care Ltd, we are committed to:
              </p>
              <ul className="space-y-3">
                {PROMISE.map(p => (
                  <li key={p} className="flex items-start gap-3 text-white/90 text-sm">
                    <svg className="w-4 h-4 text-brand-gold flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="w-10 h-1 rounded bg-brand-gold mb-4" />
              <h2 className="text-3xl font-black text-white mb-6">Our Commitment</h2>
              <div className="bg-white/10 rounded-2xl border border-white/25 p-8 text-center">
                <p className="text-brand-gold font-black text-lg tracking-wide mb-4">
                  Assess. Plan. Match. Support. Review. Improve.
                </p>
                <p className="text-white/85 text-sm leading-relaxed">
                  This simple but effective approach ensures every person receives the right care,
                  at the right time, from the right people — helping them live safely, independently,
                  and with dignity in the comfort of their own home.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FREE ASSESSMENT FORM ─────────────────────────────────────── */}
      <section className="py-0 bg-white">
        <div className="max-w-[1280px] mx-auto grid lg:grid-cols-2 min-h-[500px]">
          {/* Form */}
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
              <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Info panel */}
          <div className="flex items-center justify-center px-10 py-14 text-white"
            style={{ background: 'linear-gradient(135deg, #7c42b4, #5a2d8a)' }}>
            <div>
              <h2 className="text-3xl md:text-4xl font-black mb-5">
                Get a free, no obligation care assessment
              </h2>
              <p className="text-white/75 text-base leading-relaxed mb-6">
                Request a member of our team to visit you and carry out a full assessment of your care needs.
                This gives us the opportunity to get to know you and understand how we can best support
                you or your loved one.
              </p>
              <ul className="space-y-3">
                {[
                  'No obligation, completely free',
                  'Conducted by an experienced care professional',
                  'Tailored recommendations for your specific situation',
                  'Discuss funding options and next steps',
                ].map(item => (
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
      </section>

    </div>
  )
}
