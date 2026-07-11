import { Link } from 'react-router-dom'
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

export default function About() {
  return (
    <div>
      <PageHero
        variant="peach"
        title="About Us"
        subtitle="Dedicated to exceptional, person-centred care across Greater Manchester and beyond."
      />

      {/* WHO WE ARE — text left, photo right */}
      <section className="py-16 bg-white px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <p className="text-xs font-bold text-brand-purple uppercase tracking-widest mb-3">Who We Are</p>
            <h2 className="text-3xl font-black text-gray-900 mb-6 leading-tight">
              Built on Trust,<br />Driven by Compassion
            </h2>
            <p className="text-gray-600 leading-relaxed mb-5">
              Comprehensive Care was founded on a simple belief: everyone deserves support that fits their life — not the other way around. We work alongside people with complex mental health needs, learning disabilities, autism, and physical care requirements, building care around what each individual person actually wants and needs.
            </p>
            <p className="text-gray-600 leading-relaxed mb-8">
              Every support plan starts with a real conversation — with the person, their family, and the professionals around them. Our in-house therapist also offers free CBT, mindfulness, DBT, and behaviour therapy, because we know that lasting wellbeing means addressing both body and mind.
            </p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { num: '10+', label: 'Years Experience' },
                { num: 'CQC', label: 'Rated Good' },
                { num: '24/7', label: 'Support Available' },
              ].map(s => (
                <div key={s.label} className="text-center p-4 rounded-xl bg-brand-purple/5 border border-brand-purple/10">
                  <div className="text-xl font-black text-brand-purple">{s.num}</div>
                  <div className="text-xs text-gray-500 font-medium mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="photo-card rounded-2xl overflow-hidden h-[420px]">
            <img src="/about-team.jpg" alt="Our Care Team" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* OUR MISSION — purple panel, no image */}
      <section className="px-4 pb-16 bg-white">
        <div className="max-w-6xl mx-auto rounded-2xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #5a2d8a 0%, #7c42b4 100%)' }}>
          <div className="grid lg:grid-cols-5">
            <div className="lg:col-span-2 px-10 py-12 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-white/10">
              <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-3">Our Mission</p>
              <h3 className="text-2xl font-black text-white leading-snug mb-4">
                Empowering people to live the lives they choose.
              </h3>
              <div className="w-10 h-1 bg-brand-gold rounded-full" />
            </div>
            <div className="lg:col-span-3 px-10 py-12 flex flex-col justify-center gap-4">
              <p className="text-white/85 text-base leading-relaxed">
                We help individuals with disabilities and complex care needs live independently in their communities. Every service we provide — from supported living to domiciliary care — is shaped around what the person themselves wants for their life, not what's easiest to deliver.
              </p>
              <p className="text-white/85 text-base leading-relaxed">
                We work in genuine partnership with families, commissioners, and healthcare teams to make sure the care we provide is consistent, transparent, and actually making a difference. When something isn't working, we say so — and we fix it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AIMS & OBJECTIVES */}
      <section className="py-14 bg-peach-hero px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-black text-gray-900 mb-2 heading-underline text-center">Our Aims &amp; Objectives</h2>
          <p className="text-center text-gray-500 max-w-2xl mx-auto mb-10 mt-6 text-sm">
            These commitments guide everything we do — from individual care plans to how we run our organisation.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {AIMS.map((a, i) => (
              <div key={i} className="flex gap-4 p-5 rounded-xl border border-brand-purple/15 bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="w-8 h-8 rounded-lg bg-brand-purple text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OUR VALUES — SVG icons */}
      <section className="py-14 bg-white px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-black text-gray-900 mb-2 heading-underline text-center">Our Values</h2>
          <p className="text-center text-gray-500 max-w-xl mx-auto mb-10 mt-6 text-sm">
            The principles that shape every interaction, every care plan, and every decision we make.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { title: 'Privacy', color: '#7c42b4',
                desc: 'The right of individuals to be left alone and free from intrusion — always taken into account when we create and review care plans.',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
              { title: 'Dignity', color: '#cc2222',
                desc: 'Whatever their circumstances, every person we support has the right to be treated with dignity and full respect at all times.',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
              { title: 'Anti-Discrimination', color: '#00b8b8',
                desc: 'We actively challenge discrimination based on age, disability, gender, culture, religion, or any other characteristic.',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
              { title: 'Communication', color: '#d4845a',
                desc: 'People have the right to be heard and fully informed. We communicate in ways that work for each individual.',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
              { title: 'Independence', color: '#4ab47c',
                desc: 'We encourage people to make their own choices and stay as independent as possible, with support only where they want it.',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
              { title: 'Person-Centred', color: '#b47c42',
                desc: 'Every care plan is built around the individual — their values, preferences, and long-term goals always come first.',
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
            ].map(v => (
              <div key={v.title} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex gap-4 items-start hover:shadow-md transition-shadow">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${v.color}18`, color: v.color }}>
                  {v.icon}
                </div>
                <div>
                  <h4 className="font-black text-sm text-gray-900 mb-1">{v.title}</h4>
                  <p className="text-gray-500 text-xs leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ACCREDITATIONS */}
      <section className="py-14 bg-peach-light px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-black text-gray-900 mb-2 heading-underline text-center">Our Accreditations</h2>
          <div className="grid sm:grid-cols-2 gap-4 mt-10">
            {ACCREDITATIONS.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-white border border-brand-purple/15 shadow-sm">
                <span className="w-6 h-6 rounded-full bg-brand-purple/20 text-brand-purple flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                  </svg>
                </span>
                <p className="text-gray-700 text-sm font-medium">{a}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-8 mt-10">
            <img src="/cqc-good.jpg" alt="CQC Good" className="h-16 object-contain" />
            <img src="/ico-logo.png"  alt="ICO"      className="h-14 object-contain" />
            <img src="/pqs-logo.png"  alt="PQS SSIP" className="h-14 object-contain" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 px-4" style={{ background: 'linear-gradient(135deg, #7c42b4, #5a2d8a)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-4">Find Out How We Can Help</h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            Whether you need support for yourself or a loved one, our team is here to help. Get in touch today for a free, no-obligation conversation.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/make-a-referral" className="btn-gold px-8 py-3 text-base">Make A Referral</Link>
            <Link to="/how-we-work" className="px-8 py-3 text-base rounded-xl font-bold border-2 border-white text-white hover:bg-white hover:text-brand-purple transition-colors">How We Work</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
