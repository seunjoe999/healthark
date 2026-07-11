import { Link } from 'react-router-dom'

const PROVIDER_AREAS = [
  'Complex Mental Health','Learning Disabilities','Autism Spectrum Disorders','Drug and Alcohol Misuse',
  'Physical Complex Health','ADHD','Acquired Brain Injury','Physical Disabilities',
  'Court of Protection DOLs','Elderly Care','End of Life Care','Respite Care',
  'Supported Living','Domiciliary Care','Live In Care','Private & Local Authority Client',
]

const CONDITIONS = [
  'Motor Neurone Disease','Cerebral Palsy','Dyspraxia','Dementia',"Down's Syndrome",
  'Peg Feed Care','Tracheostomy Care','Palliative Care','Ventilation & Breathing Support',
  'Bowel Management','Catheter Care',"Huntingdon's Chorea",'Multiple Sclerosis',"Parkinson's Disease",
]

const SERVICES_DETAIL = [
  {
    title: 'Supported Living Services',
    img: '/service-supported-living.jpg',
    desc: 'We provide comprehensive supported living services tailored to individual needs, helping people live as independently as possible. Our support includes 24-hour care, personal care, medication management, and life skills development.',
  },
  {
    title: 'Domiciliary Care Services',
    img: '/service-domiciliary.jpg',
    desc: 'Flexible, high-quality support in clients\' own homes. We assist with personal care, household tasks, medication, and social activities while promoting independence and dignity.',
  },
  {
    title: 'Respite Care',
    img: '/service-respite.jpg',
    desc: 'Our respite care service gives family carers a much-needed break while ensuring their loved ones continue to receive high-quality, person-centred care in a safe and supportive environment.',
  },
  {
    title: 'Complex Mental Health',
    img: '/service-mental-health.jpg',
    desc: 'Intensive, person-centred support for individuals with complex and enduring mental health conditions, including schizophrenia, bipolar disorder, personality disorders, and dual diagnosis.',
  },
  {
    title: 'Learning Disabilities',
    img: '/service-learning-disabilities.jpg',
    desc: 'Specialist support for adults with learning disabilities, promoting independence, inclusion, and personal development. Our person-centred approach ensures each individual reaches their full potential.',
  },
  {
    title: 'Autism Support',
    img: '/service-autism.jpg',
    desc: 'Structured, sensory-aware environments and tailored routines that help individuals with autism thrive and build confidence in everyday life.',
  },
  {
    title: 'Drug & Alcohol Recovery',
    img: '/service-drug-alcohol.jpg',
    desc: 'Structured aftercare for people leaving detox or rehabilitation. Our programme combines recovery coaching, relapse prevention, emotional support and practical reintegration.',
  },
  {
    title: 'End of Life Care',
    img: '/service-end-of-life.jpg',
    desc: 'Compassionate, dignified palliative care that respects the wishes and values of individuals. Our team supports clients and their families through this sensitive time with empathy and professionalism.',
  },
  {
    title: 'Live In Care',
    img: '/service-live-in-care.jpg',
    desc: 'Round-the-clock support from a dedicated carer who lives with the client, offering companionship, personal care, and assistance with daily activities while maintaining home comforts.',
  },
  {
    title: 'Acquired Brain Injury',
    img: '/service-brain-injury.jpg',
    desc: 'Specialist rehabilitation support for individuals recovering from strokes, traumatic brain injuries, or other neurological conditions. We work closely with clinical teams to maximise independence.',
  },
  {
    title: 'Physical Disabilities',
    img: '/service-physical-disabilities.jpg',
    desc: 'Support with personal care, mobility, rehabilitation activities, and community engagement for individuals with physical disabilities, always promoting dignity and choice.',
  },
  {
    title: 'Elderly Care',
    img: '/service-elderly-care.jpg',
    desc: 'Compassionate, dignified care for older adults, supporting them to remain safe, comfortable, and connected. Our team offers companionship, personal care, and specialist dementia support.',
  },
]

export default function Services() {
  return (
    <div>

      {/* ── HEADER + SERVICE CARDS — full purple background ─────────── */}
      <section
        className="min-h-screen px-4 pt-12 pb-20"
        style={{ background: 'linear-gradient(160deg, #9b68d0 0%, #7c42b4 45%, #5a2d8a 100%)' }}
      >
        {/* Page title */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3">Our Services</h1>
          <div className="w-16 h-0.5 bg-brand-gold mx-auto mb-4" />
          <p className="text-white/75 text-base font-medium italic">Warm, Bespoke and Compassionate Care</p>
        </div>

        {/* Service cards grid */}
        <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {SERVICES_DETAIL.map(s => (
            <div
              key={s.title}
              className="rounded-2xl overflow-hidden border-2 border-white/25 shadow-xl"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              {/* Photo with frame */}
              <div className="relative p-2">
                <div className="rounded-xl overflow-hidden border-2 border-white/40 h-48">
                  <img
                    src={s.img}
                    alt={s.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                  {/* Name overlay at bottom of photo */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="px-3 py-1.5 rounded-lg" style={{ background: 'rgba(0,0,0,0.45)' }}>
                      <h3 className="text-white font-black text-base leading-tight">{s.title}</h3>
                    </div>
                  </div>
                </div>
              </div>

              {/* Button */}
              <div className="px-4 pb-4">
                <button className="btn-red w-full text-sm py-2 font-bold tracking-wide">
                  FIND OUT MORE
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── AREAS WE COVER ───────────────────────────────────────────── */}
      <section className="py-14 bg-peach-light px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 text-center mb-4 heading-underline">Areas We Cover as a Provider</h2>
          <p className="text-center text-gray-500 mb-10 mt-6 max-w-2xl mx-auto">
            Our staff are trained to manage complex care situations and provide personalised one-on-one experiences.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {PROVIDER_AREAS.map(a => (
              <div key={a} className="bg-white rounded-xl p-3.5 shadow-sm border border-gray-100 flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-brand-purple flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700">{a}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HEALTH CONDITIONS ────────────────────────────────────────── */}
      <section className="py-14 bg-white px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-black text-gray-900 text-center mb-4 heading-underline">Health Conditions We Support</h2>
          <p className="text-center text-gray-500 mb-10 mt-6">
            Our team is equipped to assist clients with a wide range of health conditions, including:
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {CONDITIONS.map(c => (
              <span key={c} className="px-4 py-2 bg-brand-purple/8 text-brand-purple border border-brand-purple/20 rounded-full text-sm font-semibold">
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── THERAPEUTIC SERVICES ─────────────────────────────────────── */}
      <section className="py-14 px-4" style={{ background: 'linear-gradient(135deg, #7c42b4, #5a2d8a)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-6">Additional Therapeutic Services</h2>
          <p className="text-white/80 text-base leading-relaxed mb-8">
            We also offer a range of additional therapeutic services at <strong className="text-white">no extra cost</strong> through
            our in-house therapist — including CBT, Mindfulness, DBT, and Behaviour Therapy. This holistic approach
            ensures individuals receive well-rounded care that supports both physical and mental health needs.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {['CBT Therapy', 'Mindfulness', 'DBT', 'Behaviour Therapy', 'Group Therapy', 'One-to-One Support'].map(t => (
              <span key={t} className="px-4 py-2 bg-white/15 text-white rounded-full text-sm font-semibold border border-white/25">
                {t}
              </span>
            ))}
          </div>
          <Link to="/make-a-referral" className="btn-gold">Make A Referral</Link>
        </div>
      </section>

    </div>
  )
}
