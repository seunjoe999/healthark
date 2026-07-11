import { useState } from 'react'
import { Link } from 'react-router-dom'

const HOW_WE_HELP = [
  'Complex Care Services', 'Domiciliary Care', 'Live-in Care',
  'Personal Care', 'Hospital Discharge Support', 'Care Assessments',
  'Referrals', 'Recruitment Opportunities', 'General Enquiries',
]

const WHY_CHOOSE = [
  'A friendly and professional response',
  'Expert advice from experienced care professionals',
  'Prompt assessment of your needs',
  'Honest and transparent communication',
  'Tailored, person-centred solutions',
  'Ongoing support from a dedicated team',
]

const REFERRERS = [
  'Individuals and Families', 'Local Authorities', 'NHS Services',
  'Hospitals', 'Case Managers', 'Occupational Therapists',
  'Social Workers', 'Commissioners', 'Healthcare Professionals',
]

export default function Contact() {
  const [form, setForm] = useState({
    fullName: '', phone: '', email: '', organisation: '',
    reason: '', contactMethod: '', message: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fetch('https://compcarehub.onrender.com/api/public/contact', {
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
      <section className="relative overflow-hidden py-20 px-4 bg-peach-hero">
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="w-10 h-1 rounded bg-brand-gold mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">We're Here To Help</h1>
          <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">
            Whether you're looking for care for yourself or a loved one, seeking professional advice,
            making a referral, or exploring career opportunities, our friendly team is here to help.
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 50" preserveAspectRatio="none" className="w-full h-[50px]">
            <path d="M0,15 C360,50 1080,0 1440,25 L1440,50 L0,50 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── MAIN CONTACT AREA ────────────────────────────────────────── */}
      <section className="py-0 bg-white">
        <div className="max-w-[1280px] mx-auto grid lg:grid-cols-2 min-h-[640px]">

          {/* Left: Info */}
          <div className="px-8 md:px-14 py-14 bg-peach-light">
            <h2 className="text-2xl font-black text-brand-red mb-2">Message Us</h2>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              Get in touch and let us care for your loved ones.
            </p>
            <p className="text-gray-700 font-semibold text-sm mb-2">Have something to say about our service?</p>
            <p className="text-gray-500 text-sm mb-5">Use our feedback form to let us know.</p>
            <Link to="/feedback" className="btn-gold inline-block text-sm mb-8">Leave Feedback</Link>

            {/* Contact details */}
            <div className="mb-6">
              <h3 className="font-black text-gray-900 mb-3">Contact</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <span>📞</span>
                  <a href="tel:01616676030" className="hover:text-brand-purple">0161 667 6030</a>
                </div>
                <div className="flex items-center gap-2">
                  <span>📞</span>
                  <a href="tel:01618430277" className="hover:text-brand-purple">0161 843 0277</a>
                </div>
                <div className="flex items-center gap-2">
                  <span>✉️</span>
                  <a href="mailto:info@comprehensivecare.org.uk" className="hover:text-brand-purple">info@comprehensivecare.org.uk</a>
                </div>
                <div className="flex items-center gap-2">
                  <span>✉️</span>
                  <a href="mailto:referrals@comprehensivecare.org.uk" className="hover:text-brand-purple">referrals@comprehensivecare.org.uk</a>
                </div>
                <div className="flex items-center gap-2">
                  <span>✉️</span>
                  <a href="mailto:recruitment@comprehensivecare.org.uk" className="hover:text-brand-purple">recruitment@comprehensivecare.org.uk</a>
                </div>
              </div>
            </div>

            {/* Hours */}
            <div className="mb-6">
              <h3 className="font-black text-gray-900 mb-3">Office Opening Hours</h3>
              <div className="text-sm text-gray-700 space-y-1">
                <p>🕒 Monday – Friday: 9:00am – 5:00pm</p>
                <p className="text-gray-500 text-xs">For existing clients, our out-of-hours support service is available for urgent matters.</p>
              </div>
            </div>

            {/* Location */}
            <div>
              <h3 className="font-black text-gray-900 mb-3">Location</h3>
              <div className="text-sm text-gray-700 space-y-0.5">
                <p className="font-semibold">📍 Comprehensive Care Ltd</p>
                <p>Ivy Business Centre</p>
                <p>Office 2-13, Crown Street</p>
                <p>Failsworth, Manchester</p>
                <p>M35 9BG</p>
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <div className="px-6 md:px-12 py-14">
            {submitted ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-4xl mx-auto mb-6">✓</div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">Message Sent!</h2>
                <p className="text-gray-500 mb-6">Thank you for getting in touch. A member of our team will respond within one working day.</p>
                <button onClick={() => setSubmitted(false)} className="btn-purple">Send Another Message</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-2xl font-black text-gray-900 mb-1">Send Us a Message</h2>
                <p className="text-sm text-gray-500 mb-4">We aim to respond to all enquiries within one working day.</p>

                <div>
                  <label className="form-label">Full Name *</label>
                  <input required type="text" className="form-input"
                    value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Telephone Number *</label>
                  <input required type="tel" className="form-input"
                    value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Email Address *</label>
                  <input required type="email" className="form-input"
                    value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Organisation (Optional)</label>
                  <input type="text" className="form-input"
                    value={form.organisation} onChange={e => setForm({ ...form, organisation: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Reason for Enquiry *</label>
                  <select required className="form-input" value={form.reason}
                    onChange={e => setForm({ ...form, reason: e.target.value })}>
                    <option value="">– please select –</option>
                    {['General Enquiry','Care Assessment Request','Referral','Recruitment / Job Application',
                      'Complex Care Services','Domiciliary Care','Live-in Care','Feedback','Other'].map(o => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Preferred Contact Method</label>
                  <select className="form-input" value={form.contactMethod}
                    onChange={e => setForm({ ...form, contactMethod: e.target.value })}>
                    <option value="">– please select –</option>
                    <option>Email</option>
                    <option>Phone</option>
                    <option>Either</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Your Message *</label>
                  <textarea required rows={4} className="form-input resize-none"
                    placeholder="How can we help you?"
                    value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
                </div>
                <p className="text-xs text-gray-400">
                  By using this form you agree to the storage and handling of your data by Comprehensive Care Ltd in accordance with our Privacy Policy.
                </p>
                <button type="submit" className="btn-purple w-full py-3 text-center">Submit →</button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── HOW CAN WE HELP ──────────────────────────────────────────── */}
      <section className="py-16 bg-peach-light px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <div className="w-10 h-1 rounded bg-brand-gold mb-4" />
              <h2 className="text-2xl font-black text-gray-900 mb-4">How Can We Help?</h2>
              <p className="text-gray-600 text-sm mb-5 leading-relaxed">
                Whether you need information about our services or would like to discuss your care
                needs, we're ready to assist with:
              </p>
              <div className="flex flex-wrap gap-2">
                {HOW_WE_HELP.map(h => (
                  <span key={h} className="px-3 py-1.5 bg-white rounded-full text-sm font-semibold text-gray-700 border border-gray-200 shadow-sm">
                    {h}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="w-10 h-1 rounded bg-brand-gold mb-4" />
              <h2 className="text-2xl font-black text-gray-900 mb-4">Make a Referral</h2>
              <p className="text-gray-600 text-sm mb-5 leading-relaxed">We welcome referrals from:</p>
              <ul className="space-y-2">
                {REFERRERS.map(r => (
                  <li key={r} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-purple flex-shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
              <p className="text-gray-500 text-xs mt-4 italic">
                Our experienced team will respond promptly to discuss your requirements and arrange an assessment where appropriate.
              </p>
              <Link to="/make-a-referral" className="btn-purple mt-5 inline-block">Submit a Referral →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE ───────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-16 px-4" style={{ background: 'linear-gradient(135deg, #5a2d8a, #7c42b4)' }}>
        <div className="absolute top-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 70" preserveAspectRatio="none" className="w-full h-[70px]">
            <path d="M0,40 C200,0 400,60 600,30 C800,0 1000,55 1200,20 C1350,0 1440,30 1440,30 L1440,0 L0,0 Z" fill="white" />
          </svg>
        </div>
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="w-10 h-1 rounded bg-brand-gold mb-4" />
              <h2 className="text-3xl font-black text-white mb-6">Why Choose Comprehensive Care Ltd?</h2>
              <p className="text-white/75 text-sm mb-5">When you contact us, you can expect:</p>
              <ul className="space-y-3">
                {WHY_CHOOSE.map(w => (
                  <li key={w} className="flex items-start gap-3 text-white/90 text-sm">
                    <svg className="w-4 h-4 text-brand-gold flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white/10 rounded-2xl border border-white/25 p-8">
              <h3 className="text-xl font-black text-white mb-4">Let's Start the Conversation</h3>
              <p className="text-white/80 text-sm leading-relaxed mb-4">
                At Comprehensive Care Ltd, we don't just provide care — we build relationships,
                restore confidence, and empower people to live independently with dignity and respect.
              </p>
              <p className="text-white/80 text-sm leading-relaxed mb-6">
                Whether you're seeking care, making a referral, or looking to join our team,
                we'd love to hear from you.
              </p>
              <div className="space-y-2 text-sm text-white/70">
                <p>📞 0161 667 6030 / 0161 843 0277</p>
                <p>✉️ info@comprehensivecare.org.uk</p>
                <p>🕒 Mon–Fri: 9:00am – 5:00pm</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MAP ──────────────────────────────────────────────────────── */}
      <div className="h-64 md:h-80">
        <iframe
          title="Comprehensive Care location"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2370.8!2d-2.145!3d53.478!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sIvy+Business+Centre+Failsworth+M35+9BG!5e0!3m2!1sen!2suk!4v1"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

    </div>
  )
}
