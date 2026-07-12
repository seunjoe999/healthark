import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero'

const AIMS = [
  { icon: '🛡️', text: 'Deliver safe, high-quality, person-centred care tailored to individual needs.' },
  { icon: '🦋', text: 'Promote independence, choice, dignity, and control in everyday life.' },
  { icon: '🎯', text: 'Enable individuals to achieve their personal goals and maximise their potential.' },
  { icon: '🏡', text: 'Create safe, stable, and inclusive environments where people feel respected and valued.' },
  { icon: '📚', text: 'Invest in the training, wellbeing, and professional development of our staff.' },
  { icon: '🤝', text: 'Work collaboratively with families, healthcare professionals, local authorities, and partner organisations.' },
  { icon: '🌱', text: 'Continuously improve the quality of our services through innovation, learning, and best practice.' },
  { icon: '🌍', text: 'Support individuals to remain active members of their communities and build meaningful relationships.' },
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

      {/* ── WHO WE ARE ───────────────────────────────────────────────── */}
      <section className="py-16 bg-white px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <p className="text-sm font-bold text-brand-purple uppercase tracking-widest mb-3">Who We Are</p>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 leading-tight">
              Built on Trust,<br />Driven by Compassion
            </h2>
            <p className="text-gray-700 text-base leading-relaxed mb-5">
              Comprehensive Care was founded on a simple belief: everyone deserves support that fits their life — not the other way around. We work alongside people with complex mental health needs, learning disabilities, autism, and physical care requirements, building care around what each individual person actually wants and needs.
            </p>
            <p className="text-gray-700 text-base leading-relaxed mb-8">
              Every support plan starts with a real conversation — with the person, their family, and the professionals around them. Our in-house therapist also offers free CBT, mindfulness, DBT, and behaviour therapy, because we know that lasting wellbeing means addressing both body and mind.
            </p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { num: '10+', label: 'Years Experience' },
                { num: 'CQC', label: 'Rated Good' },
                { num: '24/7', label: 'Support Available' },
              ].map(s => (
                <div key={s.label} className="text-center p-4 rounded-xl bg-brand-purple/5 border border-brand-purple/10">
                  <div className="text-2xl font-black text-brand-purple">{s.num}</div>
                  <div className="text-sm text-gray-500 font-medium mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="photo-card rounded-2xl overflow-hidden h-[420px]">
            <img src="/about-team.jpg" alt="Our Care Team" className="w-full h-full object-cover object-top" />
          </div>
        </div>
      </section>

      {/* ── OUR MISSION ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0520 0%, #1a0840 50%, #2d1260 100%)' }}>
        {/* Top wave — white matches Who We Are above */}
        <div className="overflow-hidden leading-none">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full h-[80px]">
            <path d="M0,30 C240,80 480,0 720,40 C960,80 1200,10 1440,45 L1440,0 L0,0 Z" fill="white" />
          </svg>
        </div>

        {/* Radial glow orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full opacity-25"
            style={{ background: 'radial-gradient(circle, #7c42b4 0%, transparent 65%)' }} />
          <div className="absolute bottom-1/3 right-1/4 w-72 h-72 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #c8a045 0%, transparent 65%)' }} />
          <div className="absolute top-1/2 right-1/3 w-56 h-56 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #9b5fd4 0%, transparent 65%)' }} />
        </div>

        {/* Ghost MISSION watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
          <span style={{ fontSize: 'clamp(100px, 18vw, 220px)', fontWeight: 900, color: 'transparent', WebkitTextStroke: '1.5px rgba(255,255,255,0.04)', letterSpacing: '-0.03em', lineHeight: 1 }}>
            MISSION
          </span>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 pb-20 pt-6">

          {/* Label */}
          <p className="text-center text-xs font-bold uppercase tracking-[0.35em] mb-8" style={{ color: '#c8a045' }}>
            Our Mission
          </p>

          {/* Pull quote with decorative marks */}
          <div className="relative max-w-4xl mx-auto mb-12 px-4 md:px-12">
            <svg className="absolute -top-2 left-0 md:-left-4 w-12 h-12 opacity-70 flex-shrink-0" viewBox="0 0 50 40" fill="#c8a045">
              <path d="M0 40V22C0 9 7.5 2 22.5 0L25 5C14 7 9.5 12.5 9 19H22V40H0zm27.5 0V22C27.5 9 35 2 50 0l2.5 5C41.5 7 37 12.5 36.5 19H49.5V40H27.5z"/>
            </svg>
            <p className="text-white text-xl md:text-2xl font-bold italic leading-relaxed text-center">
              Our mission is to provide exceptional, person-centred care and support services that empower individuals to live fulfilling, independent, and dignified lives — delivering compassionate, high-quality care that respects the unique needs, preferences, and aspirations of every individual we support.
            </p>
            <svg className="absolute -bottom-2 right-0 md:-right-4 w-12 h-12 opacity-70 rotate-180" viewBox="0 0 50 40" fill="#c8a045">
              <path d="M0 40V22C0 9 7.5 2 22.5 0L25 5C14 7 9.5 12.5 9 19H22V40H0zm27.5 0V22C27.5 9 35 2 50 0l2.5 5C41.5 7 37 12.5 36.5 19H49.5V40H27.5z"/>
            </svg>
          </div>

          {/* Ornamental divider */}
          <div className="flex items-center justify-center gap-4 mb-10">
            <div className="h-px w-20 opacity-30" style={{ background: 'linear-gradient(to right, transparent, #c8a045)' }} />
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="7" y="0" width="4" height="18" rx="2" fill="#c8a045" opacity="0.7"/>
              <rect x="0" y="7" width="18" height="4" rx="2" fill="#c8a045" opacity="0.7"/>
            </svg>
            <div className="h-px w-20 opacity-30" style={{ background: 'linear-gradient(to left, transparent, #c8a045)' }} />
          </div>

          {/* Secondary paragraph */}
          <p className="text-white/55 text-base leading-relaxed max-w-3xl mx-auto text-center mb-14">
            Through our dedicated team of professionals, we create safe, nurturing environments where individuals can thrive, build meaningful relationships, and actively participate in their communities. Everyone deserves the opportunity to live life to the fullest — one person at a time.
          </p>

          {/* Three mission pillars */}
          <div className="grid md:grid-cols-3 gap-5 max-w-3xl mx-auto">
            {[
              { icon: '🌟', label: 'Person-Centred', desc: 'Every decision starts and ends with the individual.' },
              { icon: '🕊️', label: 'Dignified', desc: 'Respect, choice, and independence at all times.' },
              { icon: '🌱', label: 'Empowering', desc: 'Supporting people to reach their full potential.' },
            ].map(p => (
              <div key={p.label} className="text-center p-6 rounded-2xl border"
                style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }}>
                <div className="text-3xl mb-3">{p.icon}</div>
                <h4 className="font-black text-white text-base mb-2">{p.label}</h4>
                <p className="text-white/50 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom wave — purple matches Our Values below */}
        <div className="overflow-hidden leading-none">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full h-[80px]">
            <path d="M0,45 C240,0 480,70 720,30 C960,0 1200,60 1440,25 L1440,80 L0,80 Z" fill="#9b68d0" />
          </svg>
        </div>
      </section>

      {/* ── OUR VALUES ───────────────────────────────────────────────── */}
      <section className="py-16 px-4" style={{ background: 'linear-gradient(160deg, #9b68d0 0%, #7c42b4 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-3">Our Values</h2>
            <div className="w-14 h-0.5 bg-brand-gold mx-auto mb-5" />
            <p className="text-white/90 text-xl font-semibold italic mb-3">Warm. Bespoke. Compassionate.</p>
            <p className="text-white/75 max-w-3xl mx-auto text-base leading-relaxed">
              Everything we do is guided by three core values that shape the way we care for every individual. We believe outstanding care is built on trust, respect, and meaningful relationships — ensuring every person receives support that is as unique as they are.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Warm */}
            <div className="bg-white/10 border border-white/20 rounded-2xl overflow-hidden">
              <div className="h-52 overflow-hidden">
                <img src="/care-values-warm.jpg" alt="Warm Care" className="w-full h-full object-cover" />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">❤️</span>
                  <h3 className="text-xl font-black text-white">Warm Care</h3>
                </div>
                <p className="text-white/75 text-sm font-semibold italic mb-3">
                  Building trusted relationships that make people feel safe, valued, and supported.
                </p>
                <p className="text-white/85 text-base leading-relaxed">
                  We believe that genuine, supportive relationships are at the heart of exceptional care. Our carers create a welcoming and reassuring environment where individuals feel respected, listened to, and understood. Our team receives ongoing training to provide consistent, nurturing support while promoting independence, dignity, and emotional wellbeing.
                </p>
              </div>
            </div>

            {/* Bespoke */}
            <div className="bg-white/10 border border-white/20 rounded-2xl overflow-hidden">
              <div className="h-52 overflow-hidden">
                <img src="/care-values-bespoke.jpg" alt="Bespoke Care" className="w-full h-full object-cover" />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">⭐</span>
                  <h3 className="text-xl font-black text-white">Bespoke Care</h3>
                </div>
                <p className="text-white/75 text-sm font-semibold italic mb-3">
                  Care designed around the individual — not the individual around the care.
                </p>
                <p className="text-white/85 text-base leading-relaxed">
                  No two people are the same, which is why every care plan is tailored to reflect each person's needs, preferences, goals, and aspirations. Working closely with individuals, families, and healthcare professionals, we develop personalised support that evolves as needs change — empowering people to make choices and maintain independence.
                </p>
              </div>
            </div>

            {/* Compassionate */}
            <div className="bg-white/10 border border-white/20 rounded-2xl overflow-hidden">
              <div className="h-52 overflow-hidden">
                <img src="/care-values-compassionate.jpg" alt="Compassionate Care" className="w-full h-full object-cover" />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🤝</span>
                  <h3 className="text-xl font-black text-white">Compassionate Care</h3>
                </div>
                <p className="text-white/75 text-sm font-semibold italic mb-3">
                  Providing care with empathy, dignity, and respect.
                </p>
                <p className="text-white/85 text-base leading-relaxed">
                  Compassion is at the heart of everything we do. Quality care is about more than meeting physical needs — it's about understanding the whole person. Our dedicated team takes time to listen, build trust, and provide emotional as well as practical support. Research shows that compassionate care improves wellbeing, reduces anxiety, and leads to better health outcomes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── OUR MISSION ──────────────────────────────────────────────── */}
      <section className="py-16 bg-white px-4">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #5a2d8a 0%, #7c42b4 100%)' }}>
            <div className="grid lg:grid-cols-5">
              <div className="lg:col-span-2 px-10 py-12 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-white/10">
                <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-3">Our Mission</p>
                <h3 className="text-2xl font-black text-white leading-snug mb-4">
                  Empowering people to live the lives they choose.
                </h3>
                <div className="w-10 h-1 bg-brand-gold rounded-full mb-6" />
                <div className="space-y-2">
                  {['Cognitive Behavioural Therapy (CBT)', 'Dialectical Behaviour Therapy (DBT)', 'Mindfulness', 'Behaviour Therapy', 'Tailored therapeutic interventions'].map(t => (
                    <div key={t} className="flex items-center gap-2 text-white/80 text-sm">
                      <span className="w-4 h-4 rounded-full bg-brand-gold/30 flex items-center justify-center flex-shrink-0">
                        <svg className="w-2.5 h-2.5 fill-white" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      </span>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-3 px-10 py-12 flex flex-col justify-center gap-4">
                <p className="text-white/85 text-base leading-relaxed">
                  Our mission is to empower individuals with disabilities, complex care needs, and long-term health conditions to live as independently as possible within their own communities.
                </p>
                <p className="text-white/85 text-base leading-relaxed">
                  Through our Supported Living, Domiciliary Care, Live-in Care, and Specialist Care services, we deliver personalised support that promotes independence, choice, dignity, and inclusion.
                </p>
                <p className="text-white/85 text-base leading-relaxed">
                  As part of our holistic approach, we also provide complimentary in-house therapeutic support at no additional cost — helping individuals improve their emotional wellbeing, build resilience, and achieve positive outcomes alongside their physical care.
                </p>
                <p className="text-white/85 text-base leading-relaxed font-medium">
                  Our commitment is simple: to help every individual lead a valued, fulfilling, and independent life while remaining connected to their family, friends, and local community.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── OUR AIMS & OBJECTIVES ────────────────────────────────────── */}
      <section className="py-14 bg-peach-hero px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-black text-gray-900 mb-3 heading-underline">Our Aims &amp; Objectives</h2>
            <p className="text-gray-600 max-w-2xl mx-auto mt-6 text-base">
              We are committed to delivering care that makes a meaningful and lasting difference.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {AIMS.map((a, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-center">
                <div className="text-4xl mb-3">{a.icon}</div>
                <p className="text-gray-700 text-sm leading-relaxed">{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OUR VALUES (SVG icons strip) ─────────────────────────────── */}
      <section className="py-14 bg-white px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-2 heading-underline text-center">Our Core Principles</h2>
          <p className="text-center text-gray-500 max-w-xl mx-auto mb-10 mt-6 text-base">
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
                  <h4 className="font-black text-base text-gray-900 mb-1">{v.title}</h4>
                  <p className="text-gray-500 text-sm leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ACCREDITATIONS ───────────────────────────────────────────── */}
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
          <div className="flex flex-wrap justify-center items-center gap-10 mt-10">
            {[
              { src: '/cqc-good.jpg',              alt: 'CQC Rated Good' },
              { src: '/cqc-logo-2.png',             alt: 'CQC Registered Provider' },
              { src: '/ico-logo.png',              alt: 'ICO' },
              { src: '/pqs-logo.png',              alt: 'PQS SSIP' },
              { src: '/logo-cyber-essentials.png', alt: 'Cyber Essentials' },
              { src: '/logo-ssip.png',             alt: 'SSIP Member' },
              { src: '/logo-ukas.png',             alt: 'UKAS' },
              { src: '/logo-skills-for-care.png',  alt: 'Skills for Care' },
            ].map(a => (
              <img key={a.alt} src={a.src} alt={a.alt} className="h-24 object-contain" />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-14 px-4" style={{ background: 'linear-gradient(135deg, #7c42b4, #5a2d8a)' }}>
        <div className="absolute top-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 70" preserveAspectRatio="none" className="w-full h-[70px]">
            <path d="M0,40 C200,0 400,60 600,30 C800,0 1000,55 1200,20 C1350,0 1440,30 1440,30 L1440,0 L0,0 Z" fill="white" />
          </svg>
        </div>
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
