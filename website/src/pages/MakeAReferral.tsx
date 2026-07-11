import { useState } from 'react'

export default function MakeAReferral() {
  const [form, setForm] = useState({
    careFor: '', firstName: '', lastName: '', email: '', phone: '',
    serviceType: '', dob: '', address: '', details: '', referrerName: '',
    referrerOrg: '', referrerEmail: '', referrerPhone: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fetch('https://compcarehub.onrender.com/api/public/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    } catch {}
    setSubmitted(true)
  }

  return (
    <div>
      {/* HERO */}
      <section className="bg-peach-hero py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-black text-gray-900 mb-3">Make A Referral</h1>
          <p className="text-gray-600">
            Refer someone to Comprehensive Care and we will get in touch to discuss how we can support their needs.
          </p>
        </div>
      </section>

      <section className="py-0 bg-white">
        <div className="max-w-[1280px] mx-auto grid lg:grid-cols-2 min-h-[600px]">

          {/* Form */}
          <div className="px-6 md:px-12 py-14">
            {submitted ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-4xl mx-auto mb-6">✓</div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">Referral Submitted!</h2>
                <p className="text-gray-500 mb-6">Thank you. Our team will review your referral and be in touch within 24 hours.</p>
                <button onClick={() => setSubmitted(false)} className="btn-purple">Submit Another Referral</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h2 className="text-2xl font-black text-gray-900 mb-1">Referral Form</h2>
                <p className="text-sm text-gray-500 mb-4">All fields marked * are required.</p>

                <div>
                  <label className="form-label">Who needs the care? *</label>
                  <select required className="form-input" value={form.careFor}
                    onChange={e => setForm({ ...form, careFor: e.target.value })}>
                    <option value="">– please select –</option>
                    {['Myself','My parent','My partner','My child','A client (professional referral)','Someone else'].map(o => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </div>

                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider pt-2">Person Requiring Care</p>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Date of Birth</label>
                    <input type="date" className="form-input"
                      value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label">Service Required *</label>
                    <select required className="form-input" value={form.serviceType}
                      onChange={e => setForm({ ...form, serviceType: e.target.value })}>
                      <option value="">– please select –</option>
                      {['Supported Living','Complex Mental Health','Drug & Alcohol Recovery','Domiciliary Care',
                        'End of Life Care','Live In Care','Respite Care','Pathways to Independence','Other'].map(o => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">Address</label>
                  <input type="text" className="form-input" placeholder="Full address"
                    value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Care Needs / Additional Details</label>
                  <textarea rows={3} className="form-input resize-none"
                    placeholder="Please describe the care needs and any relevant background information..."
                    value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} />
                </div>

                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider pt-2">Referrer Details (if professional referral)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Your Name</label>
                    <input type="text" className="form-input"
                      value={form.referrerName} onChange={e => setForm({ ...form, referrerName: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label">Organisation</label>
                    <input type="text" className="form-input"
                      value={form.referrerOrg} onChange={e => setForm({ ...form, referrerOrg: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Your Email</label>
                    <input type="email" className="form-input"
                      value={form.referrerEmail} onChange={e => setForm({ ...form, referrerEmail: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label">Your Phone</label>
                    <input type="tel" className="form-input"
                      value={form.referrerPhone} onChange={e => setForm({ ...form, referrerPhone: e.target.value })} />
                  </div>
                </div>

                <p className="text-xs text-gray-400">
                  By using this form you agree to the storage and handling of your data by Comprehensive Care LTD in accordance with our Privacy Policy.
                </p>
                <button type="submit" className="btn-purple w-full py-3 text-center">Submit Referral →</button>
              </form>
            )}
          </div>

          {/* Info panel — warm orange/amber to match peach hero */}
          <div className="flex items-center justify-center px-10 py-14 text-white"
            style={{ background: 'linear-gradient(135deg, #d4845a, #c07040)' }}>
            <div>
              <h2 className="text-3xl font-black mb-5">Get a free, no obligation care assessment</h2>
              <p className="text-white/75 leading-relaxed mb-6">
                Request a member of our team to visit you and carry out a full assessment of your care needs. This will give us an opportunity to get to know you and understand how we can best support you or your loved one.
              </p>
              <div className="space-y-4 text-sm">
                {['Completed within 48 hours of referral','Conducted by an experienced care coordinator',
                  'Fully confidential and obligation-free','Available 7 days a week'].map(item => (
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
                <p>📧 referrals@comprehensivecare.org.uk</p>
                <p>🌐 www.comprehensivecare.org.uk</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
