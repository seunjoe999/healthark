import { useState } from 'react'
import PageHero from '../components/PageHero'

export default function Contact() {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', subject: '', message: '',
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
      <PageHero
        variant="peach"
        title="Contact Us"
        subtitle="We'd love to hear from you. Get in touch with our friendly team to discuss care needs, referrals, or general enquiries."
      />

      <div className="bg-white px-4 py-10">
        <div className="max-w-6xl mx-auto rounded-2xl overflow-hidden h-56 photo-card">
          <img src="/contact-hero.jpg" alt="Contact Comprehensive Care" className="w-full h-full object-cover" />
        </div>
      </div>

      {/* QUICK CONTACT CARDS */}
      <section className="py-10 bg-white px-4">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                </svg>
              ),
              label: 'Call Us',
              value: '0161 667 6030',
              sub: '0161 843 0277',
              href: 'tel:01616676030',
              color: '#7c42b4',
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              ),
              label: 'Email Us',
              value: 'info@comprehensive',
              sub: 'care.org.uk',
              href: 'mailto:info@comprehensivecare.org.uk',
              color: '#d4845a',
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              ),
              label: 'Visit Us',
              value: '34 Manchester Road',
              sub: 'Droylsden, M43 6BU',
              href: 'https://maps.google.com/?q=34+Manchester+Road+Droylsden+M43+6BU',
              color: '#00b8b8',
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              ),
              label: 'Office Hours',
              value: 'Mon–Fri 9am–5pm',
              sub: '24/7 emergency line',
              href: null,
              color: '#4ab47c',
            },
          ].map(card => (
            <div key={card.label}
              className={`p-6 rounded-2xl text-center border border-gray-100 shadow-sm ${card.href ? 'hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer' : ''}`}
              onClick={() => card.href && window.open(card.href, '_blank')}
            >
              <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center text-white"
                style={{ background: card.color }}>
                {card.icon}
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{card.label}</p>
              <p className="font-bold text-gray-900 text-sm">{card.value}</p>
              <p className="text-xs text-gray-500">{card.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CONTACT FORM + MAP */}
      <section className="py-0 bg-white">
        <div className="max-w-[1280px] mx-auto grid lg:grid-cols-2 min-h-[600px]">
          {/* Form */}
          <div className="px-6 md:px-12 py-14">
            {submitted ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-4xl mx-auto mb-6">✓</div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">Message Sent!</h2>
                <p className="text-gray-500 mb-6">Thank you for getting in touch. A member of our team will respond within 24 hours.</p>
                <button onClick={() => setSubmitted(false)} className="btn-purple">Send Another Message</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h2 className="text-2xl font-black text-gray-900 mb-1">Send Us a Message</h2>
                <p className="text-sm text-gray-500 mb-4">We aim to respond to all enquiries within 24 hours.</p>

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
                    <label className="form-label">Phone</label>
                    <input type="tel" className="form-input"
                      value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Subject *</label>
                  <select required className="form-input" value={form.subject}
                    onChange={e => setForm({ ...form, subject: e.target.value })}>
                    <option value="">– please select –</option>
                    {[
                      'General Enquiry',
                      'Make a Referral',
                      'Careers / Job Application',
                      'Feedback / Complaint',
                      'Press / Media',
                      'Partnership Enquiry',
                      'Other',
                    ].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Message *</label>
                  <textarea required rows={5} className="form-input resize-none"
                    placeholder="How can we help you?"
                    value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
                </div>
                <p className="text-xs text-gray-400">
                  By using this form you agree to the storage and handling of your data by Comprehensive Care LTD in accordance with our Privacy Policy.
                </p>
                <button type="submit" className="btn-purple w-full py-3 text-center">Send Message →</button>
              </form>
            )}
          </div>

          {/* Map + Info */}
          <div className="flex flex-col">
            {/* Google Map embed */}
            <div className="flex-1 min-h-[300px] lg:min-h-0">
              <iframe
                title="Comprehensive Care location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2370.8!2d-2.145!3d53.478!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2s34+Manchester+Road%2C+Droylsden%2C+M43+6BU!5e0!3m2!1sen!2suk!4v1"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: '300px' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            {/* Address panel */}
            <div className="px-8 py-8 text-white" style={{ background: 'linear-gradient(135deg, #7c42b4, #5a2d8a)' }}>
              <h3 className="font-black text-lg mb-4">Comprehensive Care LTD</h3>
              <div className="space-y-3 text-sm text-white/80">
                <div className="flex items-start gap-3">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  <span>34 Manchester Road, Droylsden<br />Manchester, M43 6BU</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 flex-shrink-0 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                  <span>0161 667 6030 / 0161 843 0277</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 flex-shrink-0 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                  <span>info@comprehensivecare.org.uk</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 flex-shrink-0 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>Mon–Fri: 9:00am – 5:00pm<br />24/7 on-call for emergencies</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 flex-shrink-0 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
                  </svg>
                  <span>www.comprehensivecare.org.uk</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DEPARTMENTS */}
      <section className="py-14 bg-peach-light px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 text-center mb-10 heading-underline">Department Contacts</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
            {[
              { dept: 'General Enquiries', email: 'info@comprehensivecare.org.uk', phone: '0161 667 6030' },
              { dept: 'Referrals & Admissions', email: 'referrals@comprehensivecare.org.uk', phone: '0161 667 6030' },
              { dept: 'Careers & Recruitment', email: 'careers@comprehensivecare.org.uk', phone: '0161 843 0277' },
              { dept: 'Finance & Billing', email: 'finance@comprehensivecare.org.uk', phone: '0161 843 0277' },
              { dept: 'Complaints & Feedback', email: 'complaints@comprehensivecare.org.uk', phone: '0161 667 6030' },
              { dept: 'Management Team', email: 'management@comprehensivecare.org.uk', phone: '0161 667 6030' },
            ].map(d => (
              <div key={d.dept} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-black text-gray-900 mb-3 text-sm">{d.dept}</h3>
                <a href={`mailto:${d.email}`} className="flex items-center gap-2 text-xs text-brand-purple hover:underline mb-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                  {d.email}
                </a>
                <a href={`tel:${d.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-xs text-gray-500 hover:text-brand-purple">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                  {d.phone}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
