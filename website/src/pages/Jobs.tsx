import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero'

const VACANCIES = [
  {
    title: 'Support Worker',
    location: 'Greater Manchester',
    type: 'Full-time / Part-time',
    salary: '£11.50 – £13.00 per hour',
    desc: 'We are looking for caring, compassionate support workers to join our growing team. You will be supporting adults with learning disabilities, mental health needs, and complex care requirements to live independently in their own homes.',
    requirements: ['Enhanced DBS check required', 'Experience in care preferred but not essential', 'Flexible to work shifts including weekends', 'Excellent communication skills'],
  },
  {
    title: 'Senior Support Worker',
    location: 'Greater Manchester',
    type: 'Full-time',
    salary: '£13.00 – £15.00 per hour',
    desc: 'An exciting opportunity for an experienced senior support worker to lead a team of carers and ensure the highest quality of care is delivered to our service users. You will mentor junior staff and liaise with families and healthcare professionals.',
    requirements: ['Minimum 2 years care experience', 'NVQ Level 3 in Health & Social Care (or equivalent)', 'Previous supervisory experience preferred', 'Enhanced DBS check required'],
  },
  {
    title: 'Team Leader',
    location: 'Greater Manchester',
    type: 'Full-time',
    salary: '£15.00 – £17.50 per hour',
    desc: 'We are seeking an experienced Team Leader to manage a team of support workers across multiple service user placements. You will be responsible for rotas, staff supervisions, care plan reviews, and quality assurance.',
    requirements: ['NVQ Level 3 or above in Health & Social Care', 'Experience managing a care team', 'Strong organisational and communication skills', 'Full UK driving licence preferred'],
  },
  {
    title: 'Bank Support Worker',
    location: 'Greater Manchester',
    type: 'Bank / Flexible',
    salary: '£12.00 – £13.50 per hour',
    desc: 'Flexible bank shifts available for experienced carers who want to top up their income or gain experience in the sector. Shifts available across all our services in Greater Manchester.',
    requirements: ['Some previous care experience', 'Flexible availability', 'Enhanced DBS check required', 'Reliable transport preferred'],
  },
]

const BENEFITS = [
  { icon: '💰', label: 'Competitive Pay', desc: 'Above-average rates with regular pay reviews' },
  { icon: '📚', label: 'Free Training', desc: 'Fully funded mandatory and specialist training' },
  { icon: '🕐', label: 'Flexible Shifts', desc: 'Full-time, part-time, and bank shifts to fit your lifestyle' },
  { icon: '🚀', label: 'Career Progression', desc: 'Clear pathways from carer to senior, team leader, and management' },
  { icon: '🤝', label: 'Supportive Team', desc: 'Dedicated management team available around the clock' },
  { icon: '🏅', label: 'Staff Recognition', desc: 'Regular recognition programmes and awards for outstanding work' },
]

export default function Jobs() {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', role: '', experience: '', message: '',
  })
  const [submitted, setSubmitted] = useState(false)

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
      <PageHero
        variant="purple"
        title="Join Our Team"
        subtitle="Build a rewarding career in care with Comprehensive Care LTD. We offer competitive pay, flexible hours, and a supportive team environment."
        cta={{ label: 'Apply Now', to: '#apply' }}
      />

      <div className="py-8" />

      {/* BENEFITS */}
      <section className="py-14 bg-peach-hero px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 text-center mb-10 heading-underline">Why Work With Us?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
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

      {/* CURRENT VACANCIES */}
      <section className="py-16 bg-white px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 text-center mb-10 heading-underline">Current Vacancies</h2>
          <div className="space-y-4 mt-10">
            {VACANCIES.map((v, i) => (
              <div key={i} className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <button
                  className="w-full text-left px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                >
                  <div className="flex-1">
                    <h3 className="font-black text-lg text-gray-900">{v.title}</h3>
                    <div className="flex flex-wrap gap-3 mt-1.5">
                      <span className="text-xs px-3 py-1 bg-brand-purple/10 text-brand-purple rounded-full font-semibold">{v.type}</span>
                      <span className="text-xs px-3 py-1 bg-brand-gold/15 text-brand-orange rounded-full font-semibold">{v.location}</span>
                      <span className="text-xs px-3 py-1 bg-green-50 text-green-700 rounded-full font-semibold">{v.salary}</span>
                    </div>
                  </div>
                  <svg className={`w-5 h-5 text-gray-400 flex-shrink-0 ml-4 transition-transform ${openIdx === i ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
                {openIdx === i && (
                  <div className="px-6 pb-6 border-t border-gray-100 pt-5">
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">{v.desc}</p>
                    <p className="font-bold text-gray-800 text-sm mb-2">Requirements:</p>
                    <ul className="space-y-1.5 mb-5">
                      {v.requirements.map(r => (
                        <li key={r} className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-purple flex-shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                    <a href="#apply"
                      onClick={() => setForm(f => ({ ...f, role: v.title }))}
                      className="btn-purple text-sm">
                      Apply for This Role →
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* APPLY SECTION */}
      <section id="apply" className="py-0 bg-white">
        <div className="max-w-[1280px] mx-auto grid lg:grid-cols-2 min-h-[600px]">
          {/* Form */}
          <div className="px-6 md:px-12 py-14">
            {submitted ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-4xl mx-auto mb-6">✓</div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">Application Received!</h2>
                <p className="text-gray-500 mb-6">Thank you for your interest in joining our team. We will review your application and be in touch within 5 working days.</p>
                <button onClick={() => setSubmitted(false)} className="btn-purple">Submit Another Application</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h2 className="text-2xl font-black text-gray-900 mb-1">Apply Online</h2>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Email *</label>
                    <input required type="email" className="form-input"
                      value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label">Phone *</label>
                    <input required type="tel" className="form-input"
                      value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Role Applying For *</label>
                  <select required className="form-input" value={form.role}
                    onChange={e => setForm({ ...form, role: e.target.value })}>
                    <option value="">– please select –</option>
                    {VACANCIES.map(v => <option key={v.title}>{v.title}</option>)}
                    <option>Other / General Enquiry</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Relevant Experience</label>
                  <select className="form-input" value={form.experience}
                    onChange={e => setForm({ ...form, experience: e.target.value })}>
                    <option value="">– please select –</option>
                    <option>No previous care experience</option>
                    <option>Less than 1 year</option>
                    <option>1–2 years</option>
                    <option>3–5 years</option>
                    <option>5+ years</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Tell Us About Yourself</label>
                  <textarea rows={4} className="form-input resize-none"
                    placeholder="Why do you want to work in care? Any relevant skills or qualifications..."
                    value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
                </div>
                <p className="text-xs text-gray-400">
                  By submitting this form you agree to the storage and handling of your data by Comprehensive Care LTD in accordance with our Privacy Policy.
                </p>
                <button type="submit" className="btn-purple w-full py-3 text-center">Submit Application →</button>
              </form>
            )}

            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-sm font-bold text-gray-700 mb-3">Prefer to download an application pack?</p>
              <a href="/staff-handbook.pdf" download
                className="inline-flex items-center gap-2 btn-gold text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                Download Application Pack
              </a>
            </div>
          </div>

          {/* Info panel */}
          <div className="flex items-center justify-center px-10 py-14 text-white"
            style={{ background: 'linear-gradient(135deg, #7c42b4, #5a2d8a)' }}>
            <div>
              <h2 className="text-3xl font-black mb-5">Start Your Care Career Today</h2>
              <p className="text-white/75 leading-relaxed mb-6">
                Join a growing team of dedicated care professionals making a real difference in people's lives every day. We welcome applicants from all backgrounds — what matters most is compassion, reliability, and a genuine desire to help others.
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
                <p>📧 careers@comprehensivecare.org.uk</p>
                <p>📧 info@comprehensivecare.org.uk</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="py-12 px-4 bg-peach-light">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-black text-gray-900 mb-3">Not sure which role is right for you?</h2>
          <p className="text-gray-600 mb-6">Get in touch and one of our recruitment team will help guide you to the best opportunity.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/contact-us" className="btn-purple">Contact Our Team</Link>
            <Link to="/our-carers" className="btn-gold">Learn About Being a Carer</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
