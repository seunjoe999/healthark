import { Link } from 'react-router-dom'

const ACTIVITIES = [
  { emoji: '🎨', title: 'Arts & Crafts', desc: 'Painting, drawing, creative projects' },
  { emoji: '🎶', title: 'Music & Singing', desc: 'Instruments, karaoke, and rhythm sessions' },
  { emoji: '🥗', title: 'Cooking & Healthy Eating', desc: 'Learn to prepare simple, tasty meals' },
  { emoji: '🏃', title: 'Light Exercise & Dance', desc: 'Movement for fun and wellbeing' },
  { emoji: '🎯', title: 'Games & Puzzles', desc: 'Board games, quizzes, and group challenges' },
  { emoji: '🌱', title: 'Gardening Club', desc: 'Planting, watering, and outdoor activities' },
  { emoji: '🛒', title: 'Life Skills Practice', desc: 'Budgeting, shopping, and travel training' },
  { emoji: '💬', title: 'Social Skills Groups', desc: 'Building confidence and communication' },
  { emoji: '🖥', title: 'IT & Media Skills', desc: 'Using computers, tablets, and creative tech' },
  { emoji: '🛋', title: 'Sensory Room Sessions', desc: 'Relax, self-regulate, and de-stress in our calming space' },
  { emoji: '🎬', title: 'Film & Media Afternoons', desc: 'Enjoy movies and discussions' },
  { emoji: '🎨', title: 'Seasonal & Cultural Projects', desc: 'Celebrate events and festivals' },
]

const TIMETABLE = [
  { time: '9:30 AM', activity: 'Welcome & Tea/Coffee' },
  { time: '10:00 AM', activity: 'Morning Activities (arts, music, life skills)' },
  { time: '12:30 PM', activity: 'Lunch & Social Time' },
  { time: '1:30 PM', activity: 'Afternoon Activities (sensory room, exercise, film club)' },
  { time: '4:00 PM', activity: 'Home Time' },
]

const WHY_CHOOSE = [
  'Friendly, experienced, and fully trained staff',
  'Small group sizes for personalised support',
  'Flexible activities to suit individual needs',
  'A safe and inclusive environment',
  'Focus on independence, friendship, and fun',
]

const KEY_FEATURES = [
  {
    title: 'Choice & Flexibility',
    desc: 'Individuals choose activities based on interests and sensory needs.',
  },
  {
    title: 'Sensory Considerations',
    desc: 'Quiet spaces, visual timetables, and alternative low-stimulation activities always available.',
  },
  {
    title: 'Individual Support Plans',
    desc: 'Activities adapted for different ability levels.',
  },
  {
    title: 'Focus Areas',
    desc: 'Independence, communication, social connection, wellbeing, and creativity.',
  },
]

export default function DayServices() {
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
            <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-3">Day Service</p>
            <h1 className="text-4xl md:text-5xl font-black italic text-white font-serif mb-3">
              Pathways to Independence
            </h1>
            <div className="w-12 h-0.5 bg-white/60 mx-auto mb-5" />
            <p className="text-white/90 text-base leading-relaxed mb-4">
              A fun, safe & supportive day service for adults with learning disabilities,
              autism & mental health needs.
            </p>
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 text-white text-sm font-semibold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Monday – Friday &nbsp;|&nbsp; 9:30 AM – 4:00 PM
            </div>
          </div>
        </div>

        {/* Cloud wave */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 70" preserveAspectRatio="none" className="w-full h-[70px]">
            <path d="M0,30 C200,70 400,10 600,40 C800,70 1000,20 1200,50 C1350,70 1440,35 1440,35 L1440,70 L0,70 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── WHAT WE OFFER ────────────────────────────────────────────── */}
      <section className="py-16 bg-white px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="w-10 h-1 rounded bg-brand-gold mx-auto mb-4" />
            <h2 className="text-3xl font-black text-gray-900 mb-4">What We Offer</h2>
            <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
              At Pathways to Independence, we believe everyone deserves a space to learn, grow,
              and enjoy life to the fullest. Our programme is designed to promote independence,
              confidence, skills, and friendship in a relaxed and supportive environment.
            </p>
          </div>

          <h3 className="text-lg font-black text-gray-800 text-center mb-8">Daily Activities Include:</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {ACTIVITIES.map(a => (
              <div key={a.title} className="bg-peach-light rounded-xl p-4 border border-orange-100">
                <span className="text-2xl mb-2 block">{a.emoji}</span>
                <h4 className="font-black text-gray-800 text-sm mb-1">{a.title}</h4>
                <p className="text-gray-500 text-xs leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── KEY FEATURES ─────────────────────────────────────────────── */}
      <section className="py-16 bg-peach-light px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="w-10 h-1 rounded bg-brand-gold mx-auto mb-4" />
            <h2 className="text-3xl font-black text-gray-900">Key Features</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {KEY_FEATURES.map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="w-3 h-3 rounded-full bg-brand-orange mb-3" />
                <h3 className="font-black text-gray-800 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DAILY TIMETABLE ──────────────────────────────────────────── */}
      <section className="py-16 bg-white px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="w-10 h-1 rounded bg-brand-gold mx-auto mb-4" />
            <h2 className="text-3xl font-black text-gray-900">Daily Timetable</h2>
          </div>
          <div className="space-y-4">
            {TIMETABLE.map((t, i) => (
              <div key={t.time} className="flex items-center gap-5">
                <div className="w-28 flex-shrink-0 text-right">
                  <span className="text-sm font-black text-brand-orange">{t.time}</span>
                </div>
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative">
                    <div className="w-4 h-4 rounded-full bg-brand-orange flex-shrink-0" />
                    {i < TIMETABLE.length - 1 && (
                      <div className="absolute top-4 left-1.5 w-0.5 h-8 bg-orange-200" />
                    )}
                  </div>
                  <div className="bg-peach-light rounded-xl px-4 py-3 flex-1">
                    <span className="text-gray-700 font-semibold text-sm">{t.activity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ────────────────────────────────────────────── */}
      <section className="py-16 px-4" style={{ background: 'linear-gradient(160deg, #e8a080 0%, #d4845a 50%, #c07040 100%)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="w-10 h-1 rounded bg-white/60 mb-4" />
              <h2 className="text-3xl font-black text-white mb-6">Why Choose Us?</h2>
              <ul className="space-y-4">
                {WHY_CHOOSE.map(w => (
                  <li key={w} className="flex items-start gap-3 text-white/90 text-sm">
                    <svg className="w-5 h-5 text-white flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/30 p-8">
              <h3 className="text-xl font-black text-white mb-5">How to Join Us</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white/60 text-xs mb-0.5">Call us</p>
                    <p className="text-white font-bold text-sm">01616676030 or 01618430277</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white/60 text-xs mb-0.5">Email us</p>
                    <p className="text-white font-bold text-sm">referrals@comprehensivecare.org.uk</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white/60 text-xs mb-0.5">Visit us online</p>
                    <p className="text-white font-bold text-sm">www.comprehensivecare.org.uk</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-white text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-4xl mb-4">🌈</p>
          <h2 className="text-2xl font-black text-gray-900 mb-4">
            Pathways to Independence
          </h2>
          <p className="text-brand-orange font-semibold italic mb-6">
            Where Every Day is a Step Towards a Brighter Future.
          </p>
          <p className="text-gray-500 mb-8">
            Interested in our day service? Get in touch with our team to discuss how
            Pathways to Independence can support your loved one.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/contact-us" className="btn-red px-8 py-3 text-base">Contact Us</Link>
            <Link to="/make-a-referral" className="btn-gold px-8 py-3 text-base">Make a Referral</Link>
          </div>
        </div>
      </section>

    </div>
  )
}
