import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'

const BENEFITS = [
  { icon: '💰', label: 'Competitive Pay',       desc: 'Above-average rates with regular pay reviews' },
  { icon: '📚', label: 'Free Training',          desc: 'Fully funded mandatory and specialist training' },
  { icon: '🕐', label: 'Flexible Shifts',        desc: 'Full-time, part-time, and bank shifts to fit your lifestyle' },
  { icon: '🚀', label: 'Career Progression',     desc: 'Clear pathways from carer to senior, team leader, and management' },
  { icon: '🤝', label: 'Supportive Team',        desc: 'Dedicated management team available around the clock' },
  { icon: '🏅', label: 'Staff Recognition',      desc: 'Regular recognition programmes and awards for outstanding work' },
]

const WHO_WE_WANT = [
  'Caring and compassionate',
  'Reliable and trustworthy',
  'Honest and professional',
  'Patient and respectful',
  'Excellent communicators',
  'Passionate about improving people\'s lives',
  'Committed to delivering outstanding care',
  'Willing to learn and develop professionally',
]

const TESTIMONIALS = [
  {
    quote: 'Working at Comprehensive Care Ltd has given me the opportunity to grow professionally while making a genuine difference in people\'s lives every single day.',
  },
  {
    quote: 'The management team is supportive, approachable, and truly cares about both staff and the people we support.',
  },
]

export default function Jobs() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', email: '', description: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileName(e.target.files?.[0]?.name ?? '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fetch('https://compcarehub.onrender.com/api/public/job-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    } catch {}
    setSubmitted(true)
  }

  return (
    <div>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden py-20 px-4"
        style={{ background: 'linear-gradient(160deg, #9b68d0 0%, #7c42b4 45%, #5a2d8a 100%)' }}
      >
        <div className="absolute top-0 left-0 w-80 h-80 rounded-full pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)', transform: 'translate(-30%, -30%)' }} />

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border-2 border-brand-gold/60 px-8 py-10 shadow-2xl">
            <h1 className="text-4xl md:text-5xl font-black italic text-brand-red font-serif mb-4">
              Join Our Team
            </h1>
            <div className="w-12 h-0.5 bg-brand-gold mx-auto mb-5" />
            <p className="text-white/90 text-base md:text-lg leading-relaxed mb-6">
              Make a Difference Every Day
            </p>
            <a href="#apply" className="btn-gold">Apply Now</a>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 70" preserveAspectRatio="none" className="w-full h-[70px]">
            <path d="M0,30 C200,70 400,10 600,40 C800,70 1000,20 1200,50 C1350,70 1440,35 1440,35 L1440,70 L0,70 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── INTRO ────────────────────────────────────────────────────── */}
      <section className="py-16 bg-white px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-10 h-1 rounded bg-brand-gold mx-auto mb-4" />
          <h2 className="text-3xl font-black text-gray-900 mb-5">Why Join Comprehensive Care Ltd?</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            At Comprehensive Care Ltd, caring is more than a job — it's a purpose. Every day, our dedicated
            team changes lives by providing compassionate, person-centred care that enables people to live
            safely, independently, and with dignity in the comfort of their own homes.
          </p>
          <p className="text-gray-600 leading-relaxed">
            When you join us, you become part of a supportive and professional team that values compassion,
            respect, integrity, and excellence. We are committed to investing in our people because we know
            that outstanding care starts with outstanding staff.
          </p>
        </div>
      </section>

      {/* ── BENEFITS ─────────────────────────────────────────────────── */}
      <section className="py-14 bg-peach-light px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="w-10 h-1 rounded bg-brand-gold mx-auto mb-4" />
            <h2 className="text-2xl font-black text-gray-900">What We Offer</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {BENEFITS.map(b => (
              <div key={b.label} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex gap-4">
                <span className="text-2xl">{b.icon}</span>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{b.label}</h3>
                  <p className="text-gray-500 text-sm">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO WE'RE LOOKING FOR ────────────────────────────────────── */}
      <section className="py-16 bg-white px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="w-10 h-1 rounded bg-brand-gold mb-4" />
              <h2 className="text-3xl font-black text-gray-900 mb-5">Who We're Looking For</h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                We welcome applications from individuals who are:
              </p>
              <ul className="space-y-3 mb-6">
                {WHO_WE_WANT.map(w => (
                  <li key={w} className="flex items-start gap-3 text-gray-700 text-sm">
                    <svg className="w-4 h-4 text-brand-purple flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {w}
                  </li>
                ))}
              </ul>
              <p className="text-gray-500 text-sm italic">
                Whether you're an experienced care professional or looking to start a rewarding career in
                health and social care, we provide the training and support you need to succeed.
              </p>
            </div>
            <div>
              <div className="photo-card rounded-2xl overflow-hidden h-80">
                <img src="/service-supported-living.jpg" alt="Care team" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TEAM TESTIMONIALS ────────────────────────────────────────── */}
      <section className="py-16 px-4" style={{ background: 'linear-gradient(135deg, #5a2d8a, #7c42b4)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-10 h-1 rounded bg-brand-gold mx-auto mb-4" />
          <h2 className="text-3xl font-black text-white mb-10">Hear From Our Team</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-white/10 rounded-2xl border border-white/25 p-8 text-left">
                <svg className="w-8 h-8 text-brand-gold mb-4 opacity-60" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                </svg>
                <p className="text-white/90 text-sm leading-relaxed italic">"{t.quote}"</p>
                <div className="mt-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
                  </div>
                  <span className="text-white/60 text-xs">Care Team Member</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── START YOUR CAREER ────────────────────────────────────────── */}
      <section className="py-16 bg-peach-light px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-10 h-1 rounded bg-brand-gold mx-auto mb-4" />
          <h2 className="text-3xl font-black text-gray-900 mb-5">Start Your Career with Purpose</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Every visit, every conversation, and every act of kindness has the power to change
            someone's day — and sometimes, their life.
          </p>
          <p className="text-gray-600 leading-relaxed mb-4">
            If you're looking for more than just a job, join a team that values compassion,
            excellence, and making a meaningful impact in the community.
          </p>
          <p className="text-gray-800 font-semibold">
            Become part of the Comprehensive Care Ltd family today.
          </p>
          <p className="text-gray-600 mt-2 mb-8">
            Apply now and help us deliver exceptional care, one person at a time.
          </p>
          <a href="#apply" className="btn-purple px-8 py-3 text-base">Apply Now →</a>
        </div>
      </section>

      {/* ── APPLY FORM ───────────────────────────────────────────────── */}
      <section id="apply" className="py-0 bg-white">
        <div className="max-w-[1280px] mx-auto grid lg:grid-cols-2 min-h-[500px]">

          {/* Form */}
          <div className="px-6 md:px-12 py-14">
            {submitted ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-4xl mx-auto mb-6">✓</div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">Application Received!</h2>
                <p className="text-gray-500 mb-6">Thank you for your interest in joining our team. We will be in touch shortly.</p>
                <button onClick={() => setSubmitted(false)} className="btn-purple">Submit Another Application</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h2 className="text-2xl font-black text-gray-900 mb-1">Apply Now</h2>
                <p className="text-sm text-gray-500 mb-4">Fill in your details below and we will be in touch.</p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">First Name *</label>
                    <input required type="text" className="form-input"
                      value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label">Last Name *</label>
                    <input required type="text" className="form-input"
                      value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Phone Number *</label>
                  <input required type="tel" className="form-input"
                    value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Email Address *</label>
                  <input required type="email" className="form-input"
                    value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Brief Description</label>
                  <textarea rows={4} className="form-input resize-none"
                    placeholder="Tell us a little about yourself, your experience, and why you'd like to join Comprehensive Care..."
                    value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>

                {/* File attachment */}
                <div>
                  <label className="form-label">Attach CV / Supporting Documents (optional)</label>
                  <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleFileChange} />
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="btn-gold text-sm"
                    >
                      Attach File
                    </button>
                    <span className="text-sm text-gray-500 truncate max-w-[200px]">
                      {fileName || 'No file chosen'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Accepted formats: PDF, DOC, DOCX</p>
                </div>

                <p className="text-xs text-gray-400">
                  By submitting this form you agree to the storage and handling of your data by Comprehensive Care Ltd in accordance with our Privacy Policy.
                </p>
                <button type="submit" className="btn-purple w-full py-3 text-center">Submit Application →</button>
              </form>
            )}
          </div>

          {/* Info panel */}
          <div className="flex items-center justify-center px-10 py-14 text-white"
            style={{ background: 'linear-gradient(135deg, #7c42b4, #5a2d8a)' }}>
            <div>
              <h2 className="text-3xl font-black mb-5">Start Your Care Career Today</h2>
              <p className="text-white/75 leading-relaxed mb-6">
                If you are passionate about making a real difference, we would love to hear from you.
                Join a growing team of dedicated care professionals making a meaningful impact every day.
              </p>
              <div className="space-y-4 text-sm">
                {[
                  'No experience necessary for some roles',
                  'Comprehensive induction training provided',
                  'Enhanced DBS funded by Comprehensive Care',
                  'Flexible working patterns available',
                  'Immediate starts available',
                ].map(item => (
                  <div key={item} className="flex gap-2.5 text-white/85">
                    <svg className="w-4 h-4 text-brand-gold flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-white/15 space-y-2 text-sm text-white/70">
                <p>📞 0161 667 6030 / 0161 843 0277</p>
                <p>📧 recruitment@comprehensivecare.org.uk</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="py-12 px-4 bg-peach-light">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-black text-gray-900 mb-3">Not sure which role is right for you?</h2>
          <p className="text-gray-600 mb-6">Get in touch and one of our recruitment team will guide you to the best opportunity.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/contact-us" className="btn-purple">Contact Our Team</Link>
            <Link to="/our-carers" className="btn-gold">Learn About Being a Carer</Link>
          </div>
        </div>
      </section>

    </div>
  )
}
