import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero'

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
    title: 'Supported Living',
    icon: '🏠',
    color: '#7c42b4',
    desc: 'We provide comprehensive supported living services tailored to individual needs, helping people live as independently as possible in their own homes or shared accommodation. Our support includes 24-hour care, personal care, medication management, and life skills development.',
  },
  {
    title: 'Complex Mental Health',
    icon: '🧠',
    color: '#d4845a',
    desc: 'Our specialist mental health team provides intensive, person-centred support for individuals with complex and enduring mental health conditions, including schizophrenia, bipolar disorder, personality disorders, and dual diagnosis.',
  },
  {
    title: 'Drug & Alcohol Recovery',
    icon: '💊',
    color: '#cc2222',
    desc: 'Our Drug & Alcohol Relapse Prevention & Recovery Service provides structured, therapeutic support to help individuals achieve and maintain sobriety, rebuild their lives, and reintegrate into their communities.',
  },
  {
    title: 'Domiciliary Care',
    icon: '🏡',
    color: '#00b8b8',
    desc: 'Our domiciliary care service provides flexible, high-quality support in clients\' own homes. We assist with personal care, household tasks, medication, and social activities while promoting independence and dignity.',
  },
  {
    title: 'End of Life Care',
    icon: '🕊️',
    color: '#5a7ab4',
    desc: 'We provide compassionate, dignified end of life and palliative care that respects the wishes and values of individuals. Our team supports clients and their families through this sensitive time with empathy and professionalism.',
  },
  {
    title: 'Live In Care',
    icon: '🛏️',
    color: '#b47c42',
    desc: 'Our live-in care service provides round-the-clock support from a dedicated carer who lives with the client, offering companionship, personal care, and assistance with daily activities while maintaining home comforts.',
  },
  {
    title: 'Respite Care',
    icon: '🌿',
    color: '#4ab47c',
    desc: 'Our respite care service gives family carers a much-needed break while ensuring their loved ones continue to receive high-quality, person-centred care in a safe and supportive environment.',
  },
]

function PhotoPlaceholder({ label, color }: { label: string; color: string }) {
  return (
    <div className="photo-card aspect-video flex items-center justify-center text-white font-bold text-sm"
      style={{ background: `linear-gradient(135deg, ${color}99, ${color}55)` }}>
      <span>{label}</span>
    </div>
  )
}

export default function Services() {
  return (
    <div>
      <PageHero
        variant="purple"
        title="Our Services"
        subtitle="Comprehensive Care is a provider of supported living and domiciliary care services, true to our name in being comprehensive in nature."
      />

      <div className="py-8" />

      {/* INTRO */}
      <section className="py-10 bg-white px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-600 leading-relaxed mb-4">
            We create bespoke services tailored to meet the specific needs of our service users, ensuring that all areas of care are addressed according to their individual requirements. In addition, Comprehensive Care operates as a care agency, offering high-quality agency staffing — both nurses and carers — for various healthcare settings.
          </p>
          <p className="text-gray-600 leading-relaxed font-semibold">
            We can provide 24-hour support for adults with disabilities in their own homes.
          </p>
        </div>
      </section>

      {/* SUPPORTED LIVING — with 3 photo cards */}
      <section className="py-14 px-4" style={{ background: 'linear-gradient(160deg, #9b68d0 0%, #7c42b4 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-white text-center mb-2 heading-underline" style={{ '--underline-color': '#c8a045' } as React.CSSProperties}>
            Supported Living
          </h2>
          <div className="w-12 h-0.5 bg-brand-gold mx-auto mb-10" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['Community Support', 'Skill Building', 'Independent Living'].map((label, i) => (
              <PhotoPlaceholder key={i} label={label} color={i === 0 ? '#5a2d8a' : i === 1 ? '#7c42b4' : '#9b68d0'} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <p className="text-white/80 text-sm max-w-2xl mx-auto">
              Our supported living service provides 24/7 tailored support to help adults with disabilities live independently in their own homes and communities.
            </p>
          </div>
        </div>
      </section>

      {/* SERVICE CARDS */}
      <section className="py-16 bg-white px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 text-center mb-10 heading-underline">All Our Services</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
            {SERVICES_DETAIL.map(s => (
              <div key={s.title} className="service-card p-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
                  style={{ background: `${s.color}18` }}>
                  {s.icon}
                </div>
                <h3 className="font-black text-lg text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AREAS WE COVER */}
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

      {/* HEALTH CONDITIONS */}
      <section className="py-14 bg-white px-4">
        <div className="max-w-5xl mx-auto">
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

      {/* THERAPEUTIC SERVICES */}
      <section className="py-14 px-4" style={{ background: 'linear-gradient(135deg, #7c42b4, #5a2d8a)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-6">Additional Therapeutic Services</h2>
          <p className="text-white/80 text-base leading-relaxed mb-8">
            We also offer a range of additional therapeutic services at <strong className="text-white">no extra cost</strong> through our in-house therapist. These include Cognitive Behavioural Therapy (CBT), Mindfulness, Dialectical Behaviour Therapy (DBT), and Behaviour Therapy, among other tailored support services. This holistic approach ensures that individuals receive well-rounded care that supports both their physical and mental health needs.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {['CBT Therapy', 'Mindfulness', 'DBT', 'Behaviour Therapy', 'Group Therapy', 'One-to-One Support'].map(t => (
              <span key={t} className="px-4 py-2 bg-white/15 text-white rounded-full text-sm font-semibold border border-white/25">
                {t}
              </span>
            ))}
          </div>
          <div className="mt-8">
            <Link to="/make-a-referral" className="btn-gold">Make A Referral</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
