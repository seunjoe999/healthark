import { Link } from 'react-router-dom'

const SPECIALISMS = [
  {
    id: 'complex-mental-health',
    title: 'Complex Mental Health',
    img: '/service-mental-health.jpg',
    body: 'We provide specialist support for individuals living with complex mental health conditions, helping them develop coping strategies, build confidence, and work towards greater independence.',
    detail: 'Our focus is on recovery, emotional wellbeing, and achieving positive long-term outcomes through consistent, compassionate support.',
  },
  {
    id: 'learning-disabilities',
    title: 'Learning Disabilities',
    img: '/service-learning-disabilities.jpg',
    body: 'We empower individuals with learning disabilities to develop life skills, increase independence, and participate fully in their communities.',
    detail: 'Our personalised approach promotes choice, confidence, and opportunities to achieve personal goals.',
  },
  {
    id: 'asd',
    title: 'Autism Spectrum Disorder (ASD)',
    img: '/service-autism.jpg',
    body: 'Our experienced team understands the unique strengths and challenges associated with autism. We provide structured, person-centred support that promotes communication, routine, independence, and emotional wellbeing.',
    detail: 'We respect each individual\'s preferences and sensory needs, creating environments and routines that support them to thrive.',
  },
  {
    id: 'adhd',
    title: 'Attention Deficit Hyperactivity Disorder (ADHD)',
    img: '/service-mental-health.jpg',
    body: 'We support individuals with ADHD by developing personalised strategies that improve organisation, emotional regulation, confidence, and daily living skills.',
    detail: 'Our approach encourages independence while recognising each person\'s unique abilities and potential.',
  },
  {
    id: 'abi',
    title: 'Acquired Brain Injury (ABI)',
    img: '/service-brain-injury.jpg',
    body: 'We provide specialist support for individuals living with the long-term effects of acquired brain injury. Working alongside healthcare professionals, we help individuals regain independence and develop practical skills.',
    detail: 'Our structured, goal-focused support is designed to maximise quality of life and promote long-term recovery.',
  },
  {
    id: 'physical-disabilities',
    title: 'Physical Disabilities',
    img: '/service-physical-disabilities.jpg',
    body: 'Our care is tailored to support individuals with physical disabilities, enabling them to live safely, comfortably, and independently while maintaining choice and control over their daily lives.',
    detail: 'Support is designed around each person\'s lifestyle, goals, and level of independence.',
  },
  {
    id: 'complex-physical-health',
    title: 'Complex Physical Health Needs',
    img: '/service-elderly-care.jpg',
    body: 'We support individuals with long-term and complex health conditions that require skilled, responsive care. Our experienced team works closely with healthcare professionals to ensure safe, consistent, and high-quality support.',
    detail: 'This promotes health, wellbeing, and independence for individuals with complex and enduring physical health needs.',
  },
  {
    id: 'drug-alcohol',
    title: 'Drug & Alcohol Recovery',
    img: '/service-drug-alcohol.jpg',
    body: 'Recovery is a journey, and we\'re here every step of the way. We provide compassionate, non-judgemental support to help individuals maintain recovery, reduce the risk of relapse, and rebuild confidence.',
    detail: 'Our focus is on helping people move towards a healthier, more independent future with the right tools and ongoing support.',
  },
  {
    id: 'court-of-protection',
    title: 'Court of Protection & DoLS',
    img: '/service-supported-living.jpg',
    body: 'We have experience supporting individuals whose care is managed through the Court of Protection or Deprivation of Liberty Safeguards (DoLS). Our team works collaboratively with legal representatives, commissioners, healthcare professionals, and families.',
    detail: 'We ensure care is delivered safely, lawfully, and in the individual\'s best interests while promoting the least restrictive approach possible.',
  },
]

const APPROACH_PILLARS = [
  'Person-centred care planning',
  'Positive Behaviour Support (PBS)',
  'Trauma-informed practice',
  'Community inclusion and social participation',
  'Outcome-focused support',
  'Collaborative working with families and professionals',
  'Independence and life skills development',
  'Holistic care that supports physical, emotional, and mental wellbeing',
]

export default function Specialism() {
  return (
    <div>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden py-20 px-4"
        style={{ background: 'linear-gradient(160deg, #e8a080 0%, #d4845a 50%, #c07040 100%)' }}
      >
        <div className="absolute top-0 left-0 w-80 h-80 rounded-full pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)', transform: 'translate(-30%, -30%)' }} />
        <div className="absolute bottom-10 right-0 w-64 h-64 rounded-full pointer-events-none opacity-15"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)', transform: 'translate(20%, 20%)' }} />

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border-2 border-brand-gold/60 px-8 py-10 shadow-2xl">
            <h1 className="text-4xl md:text-5xl font-black italic text-brand-red font-serif mb-4">
              Our Specialism
            </h1>
            <div className="w-12 h-0.5 bg-brand-gold mx-auto mb-5" />
            <p className="text-white/90 text-base md:text-lg leading-relaxed mb-6">
              Amazing, skilled care professionals are ready to help right when you need it.
            </p>
            <Link to="/make-a-referral" className="btn-purple">Get Started</Link>
          </div>
        </div>

        {/* Cloud wave */}
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
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-5">
            Specialist Care for Complex Needs
          </h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            At Comprehensive Care, we are experienced in supporting individuals with a wide range of complex health,
            mental health, behavioural, and social care needs. Our highly trained team delivers person-centred
            support that promotes independence, improves wellbeing, and empowers people to live fulfilling lives.
          </p>
          <p className="text-gray-600 leading-relaxed">
            We understand that every individual has their own journey, strengths, and aspirations. That's why we
            work collaboratively with families, healthcare professionals, local authorities, and multidisciplinary
            teams to deliver tailored support that evolves as needs change.
          </p>
        </div>
      </section>

      {/* ── SPECIALISM SECTIONS ───────────────────────────────────────── */}
      {SPECIALISMS.map((s, i) => (
        <section
          key={s.id}
          id={s.id}
          className={`py-14 px-4 ${i % 2 === 0 ? 'bg-peach-light' : 'bg-white'}`}
        >
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">

              {/* Photo */}
              <div className={i % 2 !== 0 ? 'lg:order-2' : ''}>
                <div className="photo-card rounded-2xl overflow-hidden h-64 md:h-72">
                  <img src={s.img} alt={s.title} className="w-full h-full object-cover" />
                </div>
              </div>

              {/* Content */}
              <div className={i % 2 !== 0 ? 'lg:order-1' : ''}>
                <div className="w-10 h-1 rounded bg-brand-orange mb-4" />
                <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-4">{s.title}</h2>
                <p className="text-gray-700 leading-relaxed mb-3">{s.body}</p>
                <p className="text-gray-500 leading-relaxed text-sm italic">{s.detail}</p>
              </div>

            </div>
          </div>
        </section>
      ))}

      {/* ── OUR SPECIALIST APPROACH ──────────────────────────────────── */}
      <section className="py-20 px-4" style={{ background: 'linear-gradient(135deg, #5a2d8a, #7c42b4)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="w-10 h-1 rounded bg-brand-gold mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Our Specialist Approach</h2>
            <p className="text-white/80 leading-relaxed max-w-2xl mx-auto">
              Every individual deserves care that reflects who they are, not just the challenges they face.
              Our specialist approach is built on:
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {APPROACH_PILLARS.map(p => (
              <div key={p} className="flex items-start gap-3 bg-white/10 rounded-xl px-5 py-4 border border-white/20">
                <svg className="w-5 h-5 text-brand-gold flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-white/90 text-sm font-semibold">{p}</span>
              </div>
            ))}
          </div>
          <p className="text-white/75 text-center text-sm mt-8 italic max-w-2xl mx-auto">
            By combining specialist expertise with genuine compassion, we help individuals build confidence,
            achieve their goals, and live meaningful, fulfilling lives.
          </p>
        </div>
      </section>

      {/* ── WHY CHOOSE COMPREHENSIVE CARE ────────────────────────────── */}
      <section className="py-16 px-4 bg-peach-light">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="w-10 h-1 rounded bg-brand-gold mb-4" />
              <h2 className="text-3xl font-black text-gray-900 mb-5 leading-tight">
                Why Families and Professionals Choose Comprehensive Care
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Our specialist teams are committed to delivering safe, responsive, and personalised care
                that makes a real difference.
              </p>
              <p className="text-gray-600 leading-relaxed mb-6">
                Whether we are supporting someone with complex mental health needs, autism, learning
                disabilities, acquired brain injury, or long-term physical health conditions, our focus
                remains the same:
              </p>
              <blockquote className="border-l-4 border-brand-orange pl-5 mb-8">
                <p className="text-gray-800 font-semibold italic leading-relaxed">
                  "To provide exceptional care that empowers people to live independently, safely, and with dignity."
                </p>
              </blockquote>
              <div className="flex flex-wrap gap-3">
                <Link to="/contact-us" className="btn-red">Contact Our Team</Link>
                <Link to="/make-a-referral" className="btn-gold">Make a Referral</Link>
              </div>
            </div>
            <div>
              <div className="photo-card rounded-2xl overflow-hidden h-80">
                <img src="/service-supported-living.jpg" alt="Specialist Care" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
