import { useState } from 'react'
import PageHero from '../components/PageHero'

const HELP_CARDS = [
  { icon: '💊', label: 'Medication Reminders',     color: '#d4845a' },
  { icon: '🏃', label: 'Staying Active',            color: '#7c42b4' },
  { icon: '🥗', label: 'Meal Prep & Groceries',     color: '#00b8b8' },
  { icon: '🚗', label: 'Transportation',             color: '#4ab47c' },
  { icon: '🏠', label: 'Personal Care',              color: '#cc2222' },
  { icon: '💬', label: 'Social Support',             color: '#b47c42' },
  { icon: '📋', label: 'Appointment Management',    color: '#5a7ab4' },
  { icon: '🛁', label: 'Household Tasks',            color: '#9b6cc8' },
]

const STEPS = [
  { num: '01', title: 'Initial Enquiry',     desc: 'Contact us via phone, email or our referral form. Our friendly team will discuss your needs and how we can help.' },
  { num: '02', title: 'Needs Assessment',    desc: 'We carry out a comprehensive assessment to understand the individual\'s specific care requirements, preferences, and goals.' },
  { num: '03', title: 'Care Plan Created',   desc: 'A personalised care plan is developed in partnership with the individual, their family, and other healthcare professionals.' },
  { num: '04', title: 'Care Begins',         desc: 'Our trained staff begin delivering care according to the plan, with regular reviews to ensure it continues to meet needs.' },
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
      <PageHero
        variant="peach"
        title="How We Work"
        subtitle="At Comprehensive Care, we select the best, most-skilled carers in advance, so they're ready to provide the care you want, right when you need it."
      />

      <div className="py-0 bg-white">
        <div className="max-w-6xl mx-auto px-4 pt-10">
          <div className="rounded-2xl overflow-hidden h-64 md:h-80 photo-card">
            <img src="/howwework-hero.jpg" alt="How We Work" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      {/* CAN HELP SECTION */}
      <section className="py-14 bg-peach-hero px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 heading-underline mb-6">
              Comprehensive Care Can Help
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              At Comprehensive Care, we select the best, most-skilled carers in advance, so they're ready to provide the care you want, right when you need it.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {HELP_CARDS.map(c => (
              <div key={c.label} className="service-card p-5 text-center">
                <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl"
                  style={{ background: `${c.color}18` }}>
                  {c.icon}
                </div>
                <p className="font-bold text-sm text-brand-red">{c.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QUOTE BOX */}
      <section className="py-14 bg-white px-4">
        <div className="max-w-3xl mx-auto">
          <div className="gold-card p-10 text-center">
            <p className="italic-heading text-2xl md:text-3xl leading-relaxed">
              "Amazing, skilled care professionals are ready to help right when you need it."
            </p>
          </div>
        </div>
      </section>

      {/* PROCESS STEPS */}
      <section className="py-14 bg-peach-light px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 text-center mb-10 heading-underline">Our Process</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
            {STEPS.map(s => (
              <div key={s.num} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative">
                <div className="w-12 h-12 rounded-full bg-brand-purple text-white font-black text-lg flex items-center justify-center mb-4">
                  {s.num}
                </div>
                <h3 className="font-black text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FREE ASSESSMENT FORM */}
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

          {/* Info panel — warm orange/amber to match peach hero */}
          <div className="flex items-center justify-center px-10 py-14 text-white"
            style={{ background: 'linear-gradient(135deg, #d4845a, #c07040)' }}>
            <div>
              <h2 className="text-3xl md:text-4xl font-black mb-5">
                Get a free, no obligation care assessment
              </h2>
              <p className="text-white/75 text-base leading-relaxed mb-6">
                Request a member of our team to visit you and carry out a full assessment of your care needs. This will give us an opportunity to get to know you and understand how we can best support you or your loved one.
              </p>
              <ul className="space-y-3">
                {['No obligation, completely free', 'Conducted by an experienced care professional', 'Tailored recommendations for your specific situation', 'Discuss funding options and next steps'].map(item => (
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
