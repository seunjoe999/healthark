import { useState, useRef } from 'react'
import emailjs from '@emailjs/browser'
import { EMAILJS_SERVICE_ID, EMAILJS_PUBLIC_KEY, TEMPLATE_REFERRAL } from '../emailjs.config'

const WHY_REFER = [
  'High-quality, person-centred care',
  'Fast response to referrals',
  'Experienced and compassionate care professionals',
  'Flexible packages of care',
  'Complex care expertise',
  'Safe hospital discharge support',
  'Regular care reviews',
  'Dedicated care coordination',
  '24-hour on-call support',
  'Collaborative working with health and social care professionals',
]

export default function MakeAReferral() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [consent, setConsent] = useState(false)
  const [form, setForm] = useState({
    referrerName: '', referrerOrg: '', referrerPhone: '', referrerEmail: '',
    personName: '', dob: '', nhsNumber: '', address: '', personPhone: '',
    nextOfKin: '', emergencyContact: '',
    referralDetails: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileName(e.target.files?.[0]?.name ?? '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consent) return
    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        TEMPLATE_REFERRAL,
        {
          referrer_name:    form.referrerName,
          referrer_org:     form.referrerOrg,
          referrer_phone:   form.referrerPhone,
          referrer_email:   form.referrerEmail,
          person_name:      form.personName,
          dob:              form.dob,
          nhs_number:       form.nhsNumber,
          address:          form.address,
          person_phone:     form.personPhone,
          next_of_kin:      form.nextOfKin,
          emergency_contact: form.emergencyContact,
          referral_details: form.referralDetails,
          file_name:        fileName || 'None',
        },
        EMAILJS_PUBLIC_KEY,
      )
    } catch (err) {
      console.error('EmailJS error:', err)
    }
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
            <h1 className="text-4xl md:text-5xl font-black italic text-white font-serif mb-4">
              Make a Referral
            </h1>
            <div className="w-12 h-0.5 bg-brand-gold mx-auto mb-5" />
            <p className="text-white/90 text-base leading-relaxed">
              Compassionate Care Starts with the Right Referral. Make a referral today and let us
              help deliver the exceptional care your client or loved one deserves.
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 70" preserveAspectRatio="none" className="w-full h-[70px]">
            <path d="M0,30 C200,70 400,10 600,40 C800,70 1000,20 1200,50 C1350,70 1440,35 1440,35 L1440,70 L0,70 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── FORM + SIDEBAR ───────────────────────────────────────────── */}
      <section className="py-0 bg-white">
        <div className="max-w-[1280px] mx-auto grid lg:grid-cols-[1fr_380px] min-h-[700px]">

          {/* FORM */}
          <div className="px-6 md:px-12 py-14">
            {submitted ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-4xl mx-auto mb-6">✓</div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">Referral Submitted!</h2>
                <p className="text-gray-500 mb-6">Thank you. Our team will review your referral and be in touch promptly to discuss the next steps.</p>
                <button onClick={() => setSubmitted(false)} className="btn-purple">Submit Another Referral</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 mb-1">Referral Form</h2>
                  <p className="text-sm text-gray-500">All fields marked * are required.</p>
                </div>

                {/* REFERRER'S DETAILS */}
                <div>
                  <p className="text-xs font-black text-brand-purple uppercase tracking-widest mb-3 pt-2">Referrer's Details</p>
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Full Name *</label>
                      <input required type="text" className="form-input"
                        value={form.referrerName} onChange={e => setForm({ ...form, referrerName: e.target.value })} />
                    </div>
                    <div>
                      <label className="form-label">Organisation</label>
                      <input type="text" className="form-input"
                        value={form.referrerOrg} onChange={e => setForm({ ...form, referrerOrg: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Telephone Number *</label>
                        <input required type="tel" className="form-input"
                          value={form.referrerPhone} onChange={e => setForm({ ...form, referrerPhone: e.target.value })} />
                      </div>
                      <div>
                        <label className="form-label">Email Address *</label>
                        <input required type="email" className="form-input"
                          value={form.referrerEmail} onChange={e => setForm({ ...form, referrerEmail: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* PERSON BEING REFERRED */}
                <div>
                  <p className="text-xs font-black text-brand-purple uppercase tracking-widest mb-3 pt-2">Person Being Referred</p>
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Full Name *</label>
                      <input required type="text" className="form-input"
                        value={form.personName} onChange={e => setForm({ ...form, personName: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Date of Birth *</label>
                        <input required type="date" className="form-input"
                          value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} />
                      </div>
                      <div>
                        <label className="form-label">NHS Number (if available)</label>
                        <input type="text" className="form-input" placeholder="e.g. 123 456 7890"
                          value={form.nhsNumber} onChange={e => setForm({ ...form, nhsNumber: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Address *</label>
                      <input required type="text" className="form-input" placeholder="Full address including postcode"
                        value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                    </div>
                    <div>
                      <label className="form-label">Telephone Number</label>
                      <input type="tel" className="form-input"
                        value={form.personPhone} onChange={e => setForm({ ...form, personPhone: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Next of Kin</label>
                        <input type="text" className="form-input" placeholder="Name & relationship"
                          value={form.nextOfKin} onChange={e => setForm({ ...form, nextOfKin: e.target.value })} />
                      </div>
                      <div>
                        <label className="form-label">Emergency Contact</label>
                        <input type="text" className="form-input" placeholder="Name & phone number"
                          value={form.emergencyContact} onChange={e => setForm({ ...form, emergencyContact: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* REFERRAL DETAILS */}
                <div>
                  <p className="text-xs font-black text-brand-purple uppercase tracking-widest mb-3 pt-2">Referral Details</p>
                  <textarea
                    rows={6}
                    required
                    className="form-input resize-none"
                    placeholder="Please provide details of the care needs, current situation, medical history, risk factors, and any other relevant information that will help us support this individual..."
                    value={form.referralDetails}
                    onChange={e => setForm({ ...form, referralDetails: e.target.value })}
                  />
                </div>

                {/* FILE UPLOAD */}
                <div>
                  <p className="text-xs font-black text-brand-purple uppercase tracking-widest mb-3">Upload Supporting Documents</p>
                  <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.png" onChange={handleFileChange} />
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => fileRef.current?.click()} className="btn-gold text-sm">
                      Attach File
                    </button>
                    <span className="text-sm text-gray-500 truncate max-w-[220px]">
                      {fileName || 'No file chosen'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Accepted formats: PDF, DOC, DOCX, JPG, PNG</p>
                </div>

                {/* CONSENT */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={e => setConsent(e.target.checked)}
                      className="mt-0.5 flex-shrink-0 accent-brand-purple"
                    />
                    <span className="text-sm text-gray-700">
                      I confirm that I have the appropriate consent to share this information with
                      Comprehensive Care Ltd for the purpose of arranging care.
                    </span>
                  </label>
                </div>

                <p className="text-xs text-gray-400">
                  By submitting this form you agree to the storage and handling of your data by Comprehensive Care Ltd in accordance with our Privacy Policy.
                </p>

                <button
                  type="submit"
                  disabled={!consent}
                  className={`w-full py-3 text-center rounded-full font-bold text-sm transition-all ${
                    consent ? 'btn-purple' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Submit Referral →
                </button>
              </form>
            )}
          </div>

          {/* SIDEBAR */}
          <div className="flex flex-col text-white" style={{ background: 'linear-gradient(135deg, #7c42b4, #5a2d8a)' }}>
            <div className="p-10 flex-1">
              <div className="w-10 h-1 rounded bg-brand-gold mb-4" />
              <h2 className="text-2xl font-black mb-5">Why Refer to Comprehensive Care Ltd?</h2>
              <p className="text-white/75 text-sm mb-5">When you refer someone to us, you can be confident they will receive:</p>
              <ul className="space-y-3">
                {WHY_REFER.map(w => (
                  <li key={w} className="flex items-start gap-3 text-white/90 text-sm">
                    <svg className="w-4 h-4 text-brand-gold flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {w}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-10 border-t border-white/15">
              <h3 className="font-black text-white mb-4">Need to Speak to Someone?</h3>
              <p className="text-white/70 text-sm mb-4">
                If you would like to discuss a referral before submitting it, our friendly team is available to help.
              </p>
              <div className="space-y-2 text-sm text-white/80">
                <p>📞 0161 667 6030 / 0161 843 0277</p>
                <p>✉️ referrals@comprehensivecare.org.uk</p>
              </div>
              <div className="mt-4 text-sm text-white/70 space-y-0.5">
                <p className="font-semibold text-white/90">📍 Office Address:</p>
                <p>Comprehensive Care Ltd</p>
                <p>Ivy Business Centre</p>
                <p>Office 2-13, Crown Street</p>
                <p>Failsworth, Manchester M35 9BG</p>
              </div>
            </div>
          </div>

        </div>
      </section>

    </div>
  )
}
