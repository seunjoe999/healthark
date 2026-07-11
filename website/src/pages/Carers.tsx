import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero'

const BENEFITS = [
  { icon: '💼', title: 'Competitive Pay',     desc: 'Fair wages with regular reviews and overtime rates' },
  { icon: '📚', title: 'Ongoing Training',    desc: 'Fully funded training and career development pathways' },
  { icon: '🕐', title: 'Flexible Hours',      desc: 'Full-time, part-time, and bank shifts available' },
  { icon: '🤝', title: 'Supportive Culture',  desc: 'A team that supports you as much as the people we care for' },
  { icon: '🌱', title: 'Career Growth',       desc: 'Clear progression pathways from carer to senior and management roles' },
  { icon: '🏅', title: 'Recognition',         desc: 'Staff recognition programmes and rewards for outstanding care' },
]

export default function Carers() {
  return (
    <div>
      <PageHero
        variant="peach"
        title="Our Carers"
        subtitle="At Comprehensive Care we select our staff very carefully and only take on the best."
      />

      <div className="bg-white px-4 py-10">
        <div className="max-w-6xl mx-auto rounded-2xl overflow-hidden h-64 md:h-80 photo-card">
          <img src="/carers-team.jpg" alt="Our Care Team" className="w-full h-full object-cover" />
        </div>
      </div>

      {/* WHY COMP CARE */}
      <section className="py-14 bg-white px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <h2 className="text-3xl font-black text-gray-900 mb-6">Why Comprehensive Care?</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              At Comprehensive Care we select our staff very carefully and only take on the best. Comprehensive Care has an established reputation and attracts and retains the best staff by offering highly competitive pay rates, a choice of working hours and ongoing personal support and training.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              We invest heavily in our team's development because we believe that well-supported, well-trained carers deliver the best care. Every member of our team undergoes rigorous vetting, enhanced DBS checks, and comprehensive induction training before working with any of our service users.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/jobs" className="btn-purple">View Vacancies</Link>
              <Link to="/make-a-referral" className="btn-gold">Make A Referral</Link>
            </div>
          </div>

          <div className="photo-card overflow-hidden rounded-2xl h-80">
            <img src="/carers-hero.jpg" alt="Comprehensive Care team" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="py-14 bg-peach-hero px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 text-center mb-10 heading-underline">Employee Benefits</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
            {BENEFITS.map(b => (
              <div key={b.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex gap-4">
                <span className="text-2xl">{b.icon}</span>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{b.title}</h3>
                  <p className="text-gray-500 text-sm">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRAINING */}
      <section className="py-14 bg-white px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-black text-gray-900 mb-6 heading-underline">Training &amp; Development</h2>
          <p className="text-gray-500 max-w-2xl mx-auto mb-10 mt-6">
            All Comprehensive Care staff receive comprehensive training to ensure they deliver the highest standard of care.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              'Moving & Handling','Medication Management','Safeguarding Adults','First Aid',
              'Mental Health Awareness','Infection Control','Dementia Care','Autism Awareness',
              'Food Hygiene','Fire Safety','Communication Skills','Person-Centred Care',
            ].map(t => (
              <span key={t} className="px-4 py-2 bg-brand-purple/8 text-brand-purple border border-brand-purple/20 rounded-full text-sm font-semibold">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — warm orange/amber to match peach hero */}
      <section className="py-14 px-4" style={{ background: 'linear-gradient(135deg, #d4845a, #c07040)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-4">Ready to Make a Difference?</h2>
          <p className="text-white/75 mb-8 max-w-xl mx-auto">
            Join our team of dedicated care professionals and help us deliver exceptional, person-centred care across Greater Manchester.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/jobs" className="btn-gold px-8 py-3 text-base">View Current Vacancies</Link>
            <a href="/brochure.pdf" download className="btn-outline border-white text-white px-8 py-3 text-base hover:bg-white hover:text-brand-purple">
              Download Application Pack
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
