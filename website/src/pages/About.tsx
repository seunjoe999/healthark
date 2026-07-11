import PageHero from '../components/PageHero'

const AIMS = [
  'To provide a consistent and exceptional quality of care tailored to the individual needs of our service users.',
  'To provide support that promotes independent choice, control and creates a significant impact in the lives of our service users.',
  'To encourage staff development by offering new opportunities for growth.',
  'To create a stable, secure, and non-judgmental environment where individuals feel safe to express and explore their feelings.',
  'To work in partnership with individuals, their families, and other agencies to strengthen relationships and provide good quality care.',
]

const ACCREDITATIONS = [
  'Care Quality Commission registered (CQC)',
  'SSIP Registered',
  'ICO Registered',
  'Skills for Life Registered',
  'Currently in the process of registering with ISO 9001 standards and UKHCA',
  'Approved Provider for the Complex Mental Health Framework',
]

const VALUES = [
  { title: 'Privacy',         icon: '🔒', desc: 'The right of individuals to be left alone and free from intrusion into their affairs. Taken into account in formulation of Care Plans.' },
  { title: 'Dignity',         icon: '🌟', desc: 'All individuals, whatever their circumstances, have the right to be treated with dignity and respect.' },
  { title: 'Anti-Discrimination', icon: '🤝', desc: 'Many clients, because of their circumstances (e.g. age, disability, gender, marital status, sexual orientation, culture, religion or nationality) may find themselves in circumstances of discrimination.' },
  { title: 'Communication',   icon: '💬', desc: 'Clients have the right to be heard and to be fully informed on all aspects of their care. Methods of communication are appropriate to the particular abilities of the individual.' },
  { title: 'Independence',    icon: '🦋', desc: 'We encourage service users to make their own choices and remain as independent as possible while receiving support.' },
  { title: 'Person-Centred',  icon: '❤️', desc: 'Every care plan is built around the individual — their values, preferences, desires, and long-term goals.' },
]

export default function About() {
  return (
    <div>
      <PageHero
        variant="peach"
        title="About Us"
        subtitle="Comprehensive Care — dedicated to exceptional, person-centred care across Greater Manchester and beyond."
      />

      <div className="py-8" />

      <section className="pb-0 bg-white px-4">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl overflow-hidden h-72 md:h-96 photo-card">
            <img src="/about-team.jpg" alt="Comprehensive Care Team" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* AIMS & OBJECTIVES */}
      <section className="py-14 bg-white px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 items-start">
          <div>
            <h2 className="text-3xl font-black text-gray-900 mb-6 heading-underline">Our Aims &amp; Objectives</h2>
            <ul className="space-y-4 mt-8">
              {AIMS.map((a, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand-purple/10 text-brand-purple flex items-center justify-center flex-shrink-0 font-bold text-sm mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-gray-600 text-sm leading-relaxed">{a}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="photo-card overflow-hidden rounded-2xl">
            <img src="/values-pic.png" alt="Our Values" className="w-full object-cover" />
          </div>
        </div>
      </section>

      {/* MISSION */}
      <section className="py-14 bg-peach-light px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 mb-8 heading-underline text-center">Our Mission</h2>
          <div className="grid lg:grid-cols-2 gap-10 items-center mt-8">
            <div className="bg-white rounded-2xl shadow-md p-8 text-left border-l-4 border-brand-purple">
              <p className="text-gray-600 leading-relaxed text-base">
                Our mission is to empower individuals with disabilities and complex care needs to live independently within their community, providing opportunities for them to lead fulfilling lives. To support this, we provide supported living and domiciliary care services designed to meet the specific needs of each person. We also offer additional therapeutic services through an in-house therapist, providing free intensive CBT therapy, mindfulness, DBT, and behaviour therapy, among other support services. This holistic approach ensures that individuals receive comprehensive care that addresses both physical and mental health needs. Our goal is to support them to lead valued and independent lives, stay connected to their local community and maintain their dignity regardless of their disability.
              </p>
            </div>
            <div className="photo-card rounded-2xl overflow-hidden h-72 md:h-80">
              <img src="/about-mission.jpg" alt="Our Mission" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* ACCREDITATIONS */}
      <section className="py-14 bg-white px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 mb-8 heading-underline text-center">Our Accreditations</h2>
          <div className="grid sm:grid-cols-2 gap-4 mt-10">
            {ACCREDITATIONS.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-brand-purple/5 border border-brand-purple/15">
                <span className="w-6 h-6 rounded-full bg-brand-purple/20 text-brand-purple flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                  </svg>
                </span>
                <p className="text-gray-700 text-sm font-medium">{a}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-8 mt-12">
            <img src="/cqc-good.jpg" alt="CQC Good"  className="h-16 object-contain" />
            <img src="/ico-logo.png" alt="ICO"        className="h-14 object-contain" />
            <img src="/pqs-logo.png" alt="PQS SSIP"  className="h-14 object-contain" />
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="py-14 bg-peach-hero px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 mb-10 heading-underline text-center">Our Values</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
            {VALUES.map(v => (
              <div key={v.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
                <div className="w-16 h-16 rounded-full bg-brand-purple/10 flex items-center justify-center text-3xl mx-auto mb-4">
                  {v.icon}
                </div>
                <h3 className="font-black text-lg text-gray-900 mb-2">{v.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM CTA — warm orange/amber to match peach hero */}
      <section className="py-14 px-4" style={{ background: 'linear-gradient(135deg, #d4845a, #c07040)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-4">Find Out How We Can Help</h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            Whether you need support for yourself or a loved one, our friendly team is here to help. Get in touch today for a free, no-obligation conversation about your care needs.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="/make-a-referral" className="btn-gold px-8 py-3 text-base">Make A Referral</a>
            <a href="/how-we-work" className="px-8 py-3 text-base rounded-xl font-bold border-2 border-white text-white hover:bg-white hover:text-brand-orange transition-colors">How We Work</a>
          </div>
        </div>
      </section>
    </div>
  )
}
