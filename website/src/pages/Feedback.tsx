import PageHero from '../components/PageHero'

const TESTIMONIALS = [
  {
    name: 'Sarah M.',
    relation: 'Daughter of service user',
    stars: 5,
    text: 'Comprehensive Care have been absolutely brilliant in supporting my mother. The carers are kind, professional, and genuinely care about her wellbeing. I cannot recommend them highly enough.',
  },
  {
    name: 'James T.',
    relation: 'Service user',
    stars: 5,
    text: 'The team at Comprehensive Care has changed my life. I feel safe, supported, and most importantly — independent. My support worker has helped me achieve things I never thought possible.',
  },
  {
    name: 'Karen & David L.',
    relation: 'Family of service user',
    stars: 5,
    text: 'From our very first call, the Comprehensive Care team were responsive, compassionate, and professional. They truly go above and beyond. Brilliant service.',
  },
  {
    name: 'Dr. A. Patel',
    relation: 'Healthcare professional',
    stars: 5,
    text: 'I have referred several patients to Comprehensive Care and have always been impressed by the level of care and communication. They are a reliable and professional provider.',
  },
  {
    name: 'Michelle O.',
    relation: 'Service user',
    stars: 5,
    text: 'The Pathways to Independence day service has been incredible for my confidence. I\'ve made friends, learned new skills, and I look forward to every session. The staff are amazing!',
  },
  {
    name: 'Robert C.',
    relation: 'Son of service user',
    stars: 5,
    text: 'My father has been with Comprehensive Care for two years now. The continuity of care, the regularity of the same carers visiting, and the high standards maintained have given our whole family peace of mind.',
  },
]

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`w-4 h-4 ${i < count ? 'text-brand-gold' : 'text-gray-200'}`}
          fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      ))}
    </div>
  )
}

export default function Feedback() {
  return (
    <div>
      <PageHero
        variant="peach"
        title="Feedback &amp; Reviews"
        subtitle="We are committed to delivering outstanding care. Your feedback helps us improve and lets others know they can trust us."
      />

      <div className="bg-white px-4 py-10">
        <div className="max-w-6xl mx-auto rounded-2xl overflow-hidden h-56 photo-card">
          <img src="/feedback-hero.jpg" alt="Client feedback" className="w-full h-full object-cover" />
        </div>
      </div>

      {/* RATINGS SUMMARY */}
      <section className="py-10 bg-white px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-8 bg-peach-hero rounded-2xl">
              <div className="text-5xl font-black text-brand-purple mb-1">4.9</div>
              <Stars count={5} />
              <p className="text-sm text-gray-500 mt-2">Average Google Rating</p>
            </div>
            <div className="text-center p-8 bg-peach-hero rounded-2xl">
              <div className="text-5xl font-black text-brand-purple mb-1">200+</div>
              <p className="text-sm font-semibold text-gray-700 mt-1">Happy Families</p>
              <p className="text-sm text-gray-500 mt-1">Across Greater Manchester</p>
            </div>
            <div className="text-center p-8 bg-peach-hero rounded-2xl">
              <div className="text-5xl font-black text-brand-purple mb-1">CQC</div>
              <p className="text-sm font-semibold text-gray-700 mt-1">Inspected &amp; Rated</p>
              <p className="text-sm text-green-600 font-bold mt-1">GOOD</p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-14 bg-peach-light px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 text-center mb-10 heading-underline">What Our Families Say</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <Stars count={t.stars} />
                <p className="text-gray-600 text-sm leading-relaxed mt-3 mb-4 italic">"{t.text}"</p>
                <div className="pt-3 border-t border-gray-100">
                  <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.relation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LEAVE A REVIEW */}
      <section className="py-14 bg-white px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="w-10 h-1 rounded bg-brand-gold mx-auto mb-4" />
            <h2 className="text-3xl font-black text-gray-900 mb-3">Your Feedback Makes a Difference</h2>
            <p className="text-gray-600 max-w-xl mx-auto leading-relaxed">
              Your review helps us continue providing high-quality, person-centred care and supports
              others in choosing a trusted care provider.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* QR Code */}
            <div className="text-center">
              <div className="inline-block p-8 bg-white rounded-2xl border-2 border-brand-gold shadow-lg">
                <img src="/qr-google-review.png" alt="Comprehensive Care Google Review QR Code"
                  className="w-56 h-56 mx-auto object-contain" />
                <p className="text-base font-black text-gray-800 mt-4">Simply scan the QR code to leave your Google review.</p>
                <p className="text-sm text-gray-500 mt-2 italic">Thank you for taking the time to share your experience.</p>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-4">
              <a
                href="https://www.google.com/search?q=Comprehensive+Care+Manchester+reviews"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-5 rounded-2xl border border-gray-200 hover:border-brand-purple hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 border border-gray-100">
                  <svg className="w-7 h-7" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">Review Us on Google</p>
                  <p className="text-sm text-gray-500">Share your experience on Google Reviews</p>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-brand-purple transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                </svg>
              </a>

              <a
                href="mailto:info@comprehensivecare.org.uk?subject=Feedback for Comprehensive Care"
                className="flex items-center gap-4 p-5 rounded-2xl border border-gray-200 hover:border-brand-purple hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-purple/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-brand-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">Email Us Your Feedback</p>
                  <p className="text-sm text-gray-500">info@comprehensivecare.org.uk</p>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-brand-purple transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                </svg>
              </a>

              <a
                href="tel:01616676030"
                className="flex items-center gap-4 p-5 rounded-2xl border border-gray-200 hover:border-brand-purple hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">Call Us</p>
                  <p className="text-sm text-gray-500">0161 667 6030 / 0161 843 0277</p>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-brand-purple transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CQC RATING */}
      <section className="relative pt-24 pb-14 px-4" style={{ background: 'linear-gradient(135deg, #7c42b4, #5a2d8a)' }}>
        <div className="absolute top-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 70" preserveAspectRatio="none" className="w-full h-[70px]">
            <path d="M0,40 C200,0 400,60 600,30 C800,0 1000,55 1200,20 C1350,0 1440,30 1440,30 L1440,0 L0,0 Z" fill="white" />
          </svg>
        </div>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-4">Regulated &amp; Inspected by the CQC</h2>
          <p className="text-white/75 mb-8 leading-relaxed">
            Comprehensive Care is regulated by the Care Quality Commission (CQC), the independent regulator of health and social care in England. We are proud to be rated <strong className="text-white">Good</strong> across all areas of our service.
          </p>
          <div className="inline-flex items-center gap-4 bg-white/10 rounded-2xl px-8 py-5 border border-white/20">
            <img src="/cqc-good.jpg" alt="CQC Inspected and Rated Good" className="h-16 object-contain" />
            <div className="text-left">
              <p className="text-white font-black text-lg">CQC Rated Good</p>
              <p className="text-white/70 text-sm">Inspected & Regulated</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
