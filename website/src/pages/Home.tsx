import { Link } from 'react-router-dom'

const SERVICES = [
  { icon: '🏠', title: 'Supported Living',             path: '/our-services', color: '#7c42b4' },
  { icon: '🧠', title: 'Complex Mental Health',         path: '/our-services', color: '#d4845a' },
  { icon: '💊', title: 'Drug & Alcohol Recovery',       path: '/our-services', color: '#cc2222' },
  { icon: '🏡', title: 'Domiciliary Care',              path: '/our-services', color: '#00b8b8' },
  { icon: '🕊️', title: 'End of Life Care',              path: '/our-services', color: '#5a7ab4' },
  { icon: '🛏️', title: 'Live In Care',                  path: '/our-services', color: '#b47c42' },
  { icon: '🌿', title: 'Respite Care',                  path: '/our-services', color: '#4ab47c' },
]

const VALUES = [
  {
    title: 'Warm',
    icon: '🤝',
    color: '#d4845a',
    desc: 'We promote the development of warm, supportive relationships between service users and carers that foster attachment and a sense of stability. A key aspect of this involves ensuring carers receive training and support to enhance their skills and maintain a consistent approach.',
  },
  {
    title: 'Bespoke',
    icon: '✨',
    color: '#7c42b4',
    desc: 'Our service users receive care that is personalized to their individual needs through a person-centred approach. We deliver care in the way they prefer, working closely with them to ensure an exceptional care experience.',
  },
  {
    title: 'Compassionate',
    icon: '❤️',
    color: '#cc2222',
    desc: 'Compassion is the foundation of how we provide care, built on relationships of empathy, respect, and dignity, which significantly influence how individuals experience their care.',
  },
]

export default function Home() {
  return (
    <div>
      {/* HERO */}
      <section className="bg-peach-hero relative overflow-hidden pt-12 pb-24 px-4 min-h-[520px] flex items-center">
        {/* Decorative blobs */}
        <div className="absolute top-10 right-10 w-72 h-72 rounded-full opacity-30 pointer-events-none"
          style={{background:'radial-gradient(circle,#f4b8a5,transparent)'}} />
        <div className="absolute bottom-10 left-10 w-56 h-56 rounded-full opacity-25 pointer-events-none"
          style={{background:'radial-gradient(circle,#e896a8,transparent)'}} />

        <div className="relative z-10 max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center">
          <div>
            {/* CQC badge */}
            <div className="inline-flex items-center gap-3 bg-white/80 rounded-full px-5 py-2.5 mb-6 shadow-sm border border-white">
              <img src="/cqc-good.jpg" alt="CQC Good" className="h-8 object-contain rounded" />
              <span className="text-sm font-bold text-gray-700">CQC Inspected &amp; Rated <span className="text-green-600">Good</span></span>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-[2.6rem] font-black text-gray-900 leading-tight mb-4">
              The Provider of Choice for{' '}
              <span className="text-brand-purple">Domiciliary</span> and{' '}
              <span className="text-brand-red">Supported Living</span> Services
            </h1>
            <p className="text-xl italic font-semibold text-brand-red mb-4 font-serif">"Your Care is Our Priority"</p>
            <p className="text-gray-600 text-base leading-relaxed mb-3">
              Comprehensive Care is a CQC-registered provider, specialising in a wide range of Complex &amp; Enduring Mental Health, Learning Disability Support, Autism, ADHD &amp; Addiction Recovery &amp; Relapse Prevention Services.
            </p>
            <p className="text-gray-600 text-base leading-relaxed mb-8">
              Our approach is centred around Outcome-focussed, Person-Centred Care and Positive Behaviour Support with emphasis on community inclusion, promoting independence, dignity, and quality of life for all those we support.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-3">
              <Link to="/our-services" className="btn-red">Our Services</Link>
              <Link to="/make-a-referral" className="btn-purple">Make A Referral</Link>
              <Link to="/contact-us" className="btn-outline">Contact Us</Link>
            </div>

            {/* Accreditation logos */}
            <div className="flex flex-wrap items-center gap-4 mt-8">
              <img src="/cqc-good.jpg"  alt="CQC Good"  className="h-12 object-contain" />
              <img src="/ico-logo.png"  alt="ICO"       className="h-10 object-contain" />
              <img src="/pqs-logo.png"  alt="PQS SSIP"  className="h-10 object-contain" />
            </div>
          </div>

          {/* Right: video */}
          <div className="flex justify-center">
            <div className="photo-card w-full max-w-lg bg-gray-100 aspect-video">
              <video
                className="w-full h-full object-cover"
                controls
                poster="/brochure-cover.jpg"
              >
                <source src="/intro-video.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="w-full h-[60px]">
            <path d="M0,20 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* AS A COMPLEX CARE PROVIDER */}
      <section className="py-10 bg-white text-center px-4">
        <div className="max-w-4xl mx-auto">
          <div className="inline-block bg-brand-purple text-white text-sm font-bold px-6 py-2.5 rounded-full mb-2">
            As a Complex Care Provider
          </div>
          <p className="text-gray-600 text-base mt-4">
            We provide 24-hour support for adults with disabilities in their own homes, specialising in complex health and social care needs throughout Greater Manchester and beyond.
          </p>
        </div>
      </section>

      {/* OUR SERVICES */}
      <section className="py-16 bg-white px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 heading-underline mb-6">Our Services</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              We also offer a range of additional therapeutic services at no extra cost through our in-house therapist, including CBT, Mindfulness, DBT, and Behaviour Therapy.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {SERVICES.map(s => (
              <Link key={s.title} to={s.path}
                className="service-card p-6 text-center group">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mx-auto mb-3"
                  style={{background:`${s.color}18`}}>
                  {s.icon}
                </div>
                <h3 className="font-bold text-sm text-gray-800 group-hover:text-brand-purple transition-colors leading-snug">
                  {s.title}
                </h3>
                <p className="text-xs text-brand-teal mt-2 font-semibold group-hover:underline">Read More →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* WARM BESPOKE COMPASSIONATE */}
      <section className="py-16 bg-peach-hero px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 heading-underline mb-2">Our Values</h2>
            <p className="text-xl font-semibold text-brand-red font-serif italic mt-6">
              Warm, Bespoke and Compassionate Care
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {VALUES.map(v => (
              <div key={v.title} className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
                <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 relative">
                  <img src="/values-pic.png" alt={v.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-end p-4"
                    style={{background:`linear-gradient(to top, ${v.color}cc, transparent)`}}>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{v.icon}</span>
                      <h3 className="text-2xl font-black text-white">{v.title}</h3>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-gray-600 text-sm leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BROCHURE DOWNLOAD */}
      <section className="py-16 bg-white px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-3xl font-black text-gray-900 mb-4">
                To learn more about our award-winning care services, simply download our brochure.
              </h2>
              <p className="text-gray-500 mb-6">
                Comprehensive Care is a CQC-registered provider specializing in a wide range of complex care services. We offer tailored support for individuals with various needs.
              </p>
              <a href="/brochure.pdf" download className="btn-gold inline-flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                Download Brochure
              </a>
            </div>
            <div className="photo-card aspect-[3/4] max-w-xs mx-auto">
              <img src="/brochure-cover.jpg" alt="Comprehensive Care Brochure" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* ACCREDITATIONS */}
      <section className="py-14 bg-peach-light px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-black text-gray-900 mb-8 heading-underline">Our Accreditations &amp; Partners</h2>
          <div className="flex flex-wrap justify-center gap-8 mt-8">
            {[
              { src: '/cqc-good.jpg', label: 'CQC Inspected & Rated Good' },
              { src: '/ico-logo.png',  label: "Information Commissioner's Office" },
              { src: '/pqs-logo.png',  label: 'PQS SSIP Health & Safety' },
            ].map(a => (
              <div key={a.label} className="accred-badge flex-col gap-3 w-36 text-center">
                <img src={a.src} alt={a.label} className="h-16 object-contain mx-auto" />
                <p className="text-xs text-gray-500 font-semibold leading-snug mt-2">{a.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
