import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero'

const ACTIVITIES = [
  { icon: '🎨', label: 'Arts & Crafts', desc: 'Painting, drawing, creative projects' },
  { icon: '🎶', label: 'Music & Singing', desc: 'Instruments, karaoke, and rhythm sessions' },
  { icon: '🥗', label: 'Cooking & Healthy Eating', desc: 'Learn to prepare simple, tasty meals' },
  { icon: '🏃', label: 'Light Exercise & Dance', desc: 'Movement for fun and wellbeing' },
  { icon: '🎯', label: 'Games & Puzzles', desc: 'Board games, quizzes, and group challenges' },
  { icon: '🌱', label: 'Gardening Club', desc: 'Planting, watering, and outdoor activities' },
  { icon: '🛒', label: 'Life Skills Practice', desc: 'Budgeting, shopping, and travel training' },
  { icon: '💬', label: 'Social Skills Groups', desc: 'Building confidence and communication' },
  { icon: '🖥', label: 'IT & Media Skills', desc: 'Using computers, tablets, and creative tech' },
  { icon: '🛋', label: 'Sensory Room Sessions', desc: 'Relax and self-regulate in our calming space' },
  { icon: '🎬', label: 'Film & Media Afternoons', desc: 'Enjoy movies and discussions' },
  { icon: '🎨', label: 'Seasonal & Cultural Projects', desc: 'Celebrate events and festivals' },
]

const WHY_US = [
  'Friendly, experienced, and fully trained staff',
  'Small group sizes for personalised support',
  'Flexible activities to suit individual needs',
  'A safe and inclusive environment',
  'Focus on independence, friendship, and fun',
]

const TIMETABLE = [
  { time: '9:30 AM',  activity: 'Welcome & Tea/Coffee' },
  { time: '10:00 AM', activity: 'Morning Activities (arts, music, life skills)' },
  { time: '12:30 PM', activity: 'Lunch & Social Time' },
  { time: '1:30 PM',  activity: 'Afternoon Activities (sensory room, exercise, film club)' },
  { time: '4:00 PM',  activity: 'Home Time' },
]

export default function Specialism() {
  return (
    <div>
      <PageHero
        variant="orange"
        title="Our Specialism"
        subtitle="Amazing, skilled care professionals are ready to help right when you need it."
        cta={{ label: 'Get Started', to: '/make-a-referral' }}
      />

      <div className="py-8" />

      {/* HERO IMAGE */}
      <section className="px-4 pb-14 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="photo-card overflow-hidden rounded-2xl h-72 md:h-96 bg-gray-200">
            <img src="/specialism-hero.jpg" alt="Our Specialism" className="w-full h-full object-cover opacity-80" />
          </div>
        </div>
      </section>

      {/* PATHWAYS TO INDEPENDENCE */}
      <section className="py-14 bg-peach-light px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-block bg-brand-orange text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-3">
              Day Service
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 heading-underline mb-4">
              Pathways to Independence
            </h2>
            <p className="text-xl text-brand-red font-serif italic mt-6 mb-4">
              A Fun, Safe &amp; Supportive Day Service for Adults with Learning Disabilities, Autism &amp; Mental Health Needs
            </p>
            <div className="inline-flex items-center gap-2 bg-white rounded-full px-5 py-2 border border-brand-gold shadow-sm text-sm font-semibold text-gray-700">
              🕘 Opening Hours: Monday–Friday, 9:30 AM – 4:00 PM
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden h-56 mb-6 photo-card">
            <img src="/specialism-activities.jpg" alt="Pathways to Independence activities" className="w-full h-full object-cover" />
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 md:p-8 mb-8">
            <p className="text-gray-600 leading-relaxed">
              This service aims to provide a safe, supportive, and stimulating environment where individuals can develop skills, build confidence, and enjoy meaningful activities that support independence and wellbeing. At Pathways to Independence, we believe everyone deserves a space to learn, grow, and enjoy life to the fullest. Our programme is designed to promote independence, confidence, skills, and friendship in a relaxed and supportive environment.
            </p>
          </div>
        </div>
      </section>

      {/* DAILY ACTIVITIES */}
      <section className="py-14 bg-white px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 text-center heading-underline mb-10">Daily Activities Include</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-10">
            {ACTIVITIES.map(a => (
              <div key={a.label} className="service-card p-4 text-center">
                <span className="text-3xl block mb-2">{a.icon}</span>
                <h4 className="font-bold text-sm text-gray-800 mb-1">{a.label}</h4>
                <p className="text-xs text-gray-500">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US + TIMETABLE */}
      <section className="py-14 bg-peach-hero px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-6">Why Choose Us?</h2>
            <ul className="space-y-3">
              {WHY_US.map(w => (
                <li key={w} className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <span className="w-5 h-5 rounded-full bg-brand-teal/15 text-brand-teal flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                    </svg>
                  </span>
                  <span className="text-sm font-semibold text-gray-700">{w}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-6">Daily Timetable</h2>
            <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-brand-gold/30">
              {TIMETABLE.map((t, i) => (
                <div key={i} className={`flex gap-4 px-5 py-4 ${i % 2 === 0 ? 'bg-white' : 'bg-brand-purple/5'}`}>
                  <span className="text-brand-purple font-bold text-sm w-24 flex-shrink-0">{t.time}</span>
                  <span className="text-gray-700 text-sm">{t.activity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* KEY FEATURES */}
      <section className="py-14 bg-white px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-black text-gray-900 mb-10 heading-underline">Key Features</h2>
          <div className="grid sm:grid-cols-2 gap-5 mt-10">
            {[
              { icon: '🎯', title: 'Choice & Flexibility', desc: 'Individuals choose activities based on interests and sensory needs.' },
              { icon: '🧘', title: 'Sensory Considerations', desc: 'Quiet spaces, visual timetables, and alternative low-stimulation activities always available.' },
              { icon: '📋', title: 'Individual Support Plans', desc: 'Activities adapted for different ability levels.' },
              { icon: '🌈', title: 'Focus Areas', desc: 'Independence, communication, social connection, wellbeing, and creativity.' },
            ].map(f => (
              <div key={f.title} className="service-card p-6 text-left flex gap-4">
                <span className="text-3xl">{f.icon}</span>
                <div>
                  <h3 className="font-black text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-gray-500 text-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 px-4" style={{ background: 'linear-gradient(135deg, #d4845a, #c07040)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-4">
            Pathways to Independence — Where Every Day is a Step Towards a Brighter Future 🌈
          </h2>
          <p className="text-white/80 mb-8">
            📞 Call 0161 667 6030 or 0161 843 0277<br />
            📧 Email: referrals@comprehensivecare.org.uk
          </p>
          <Link to="/make-a-referral" className="btn-purple px-10 py-3 text-base">
            How to Join Us →
          </Link>
        </div>
      </section>
    </div>
  )
}
