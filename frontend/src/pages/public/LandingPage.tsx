import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import toast from 'react-hot-toast';

export default function LandingPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', position: 'Care Assistant' });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Calling our new public endpoint
      await api.post('/public/apply', form);
      setSubmitted(true);
      toast.success("Application submitted successfully!");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to submit application");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="Comprehensive Care Logo" className="w-12 h-12 rounded-xl object-contain shadow-sm border border-slate-100" style={{ background: 'white', padding: '2px' }} />
            <div>
              <span className="block text-xl font-bold text-slate-900 tracking-tight leading-none">Comprehensive Care</span>
              <span className="block text-xs font-semibold text-purple-600 tracking-wider mt-0.5">YOUR CARE OUR PRIORITY</span>
            </div>
          </div>
          <div className="flex gap-4">
            <a href="#careers" className="text-sm font-semibold text-slate-600 hover:text-purple-600 px-4 py-2 transition-colors">Careers</a>
            <a href="https://app.comprehensivecare.org.uk/login" className="text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 px-5 py-2 rounded-full transition-colors shadow-sm">
              Staff Login
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-24 pb-20 px-6 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight mb-6 tracking-tight">
          Comprehensive Care, <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">Empowered by Technology.</span>
        </h1>
        <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
          We are dedicated to providing outstanding residential care across the UK. By blending human empathy with modern management tools, we deliver the highest standard of living for our service users.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <a href="#careers" className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-8 py-4 rounded-2xl shadow-xl hover:shadow-purple-500/20 hover:-translate-y-0.5 transition-all text-lg">
            Apply to Join Our Team
          </a>
          <a href="#about" className="bg-white text-slate-700 font-bold border-2 border-slate-200 px-8 py-4 rounded-2xl hover:bg-slate-50 hover:border-purple-300 hover:text-purple-700 transition-all text-lg">
            Learn More
          </a>
        </div>
      </header>

      {/* Beautiful Graphic Section */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="rounded-3xl bg-slate-900 overflow-hidden shadow-2xl border border-slate-800 relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/40 to-transparent" />
          <div className="relative z-10 grid md:grid-cols-2 items-center">
            <div className="p-12 lg:p-16">
              <h2 className="text-3xl font-bold text-white mb-6">Excellence in Care,<br/>Powered by Innovation</h2>
              <ul className="space-y-4 text-slate-300 text-lg">
                <li className="flex items-center gap-3"><div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm">✓</div> 24/7 Professional Support</li>
                <li className="flex items-center gap-3"><div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm">✓</div> Tailored Care Plans</li>
                <li className="flex items-center gap-3"><div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm">✓</div> Family Integration Portal</li>
                <li className="flex items-center gap-3"><div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm">✓</div> Rigorous CQC Compliance</li>
              </ul>
            </div>
            <div className="hidden md:flex justify-end p-8 lg:p-16">
              <img src="/logo.jpeg" alt="Logo" className="w-64 h-64 object-contain rounded-3xl shadow-2xl border-4 border-white/10" style={{ background: 'white' }} />
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-12 text-center">
          <div>
            <div className="w-16 h-16 mx-auto bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center text-2xl mb-6">❤️</div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Person-Centered</h3>
            <p className="text-slate-500 leading-relaxed">We treat every individual with the dignity, respect, and personalized care they truly deserve.</p>
          </div>
          <div>
            <div className="w-16 h-16 mx-auto bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl mb-6">🛡️</div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Safe & Secure</h3>
            <p className="text-slate-500 leading-relaxed">Our facility is equipped with state-of-the-art safeguarding and medication management protocols.</p>
          </div>
          <div>
            <div className="w-16 h-16 mx-auto bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl mb-6">🌟</div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Exceptional Team</h3>
            <p className="text-slate-500 leading-relaxed">Our staff are highly trained, rigorously vetted, and genuinely passionate about making a difference.</p>
          </div>
        </div>
      </section>

      {/* Recruitment Form */}
      <section id="careers" className="py-24 max-w-3xl mx-auto px-6">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 px-8 py-10 text-center">
            <h2 className="text-3xl font-bold text-white mb-3">Apply to Work With Us</h2>
            <p className="text-slate-400">Fill out the form below and our recruitment team will get in touch.</p>
          </div>
          <div className="p-8 md:p-12">
            {submitted ? (
              <div className="text-center py-10">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">✓</div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Application Received!</h3>
                <p className="text-slate-500 mb-8">Thank you for applying. We will review your details and contact you shortly.</p>
                <button onClick={() => setSubmitted(false)} className="text-purple-600 font-semibold hover:underline">Submit another application</button>
              </div>
            ) : (
              <form onSubmit={apply} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">First Name *</label>
                    <input required className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none transition-all" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Last Name *</label>
                    <input required className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none transition-all" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address *</label>
                    <input required type="email" className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none transition-all" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
                    <input className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none transition-all" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Position Interested In *</label>
                  <select className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none transition-all bg-white" value={form.position} onChange={e => setForm({...form, position: e.target.value})}>
                    <option value="Care Assistant">Care Assistant</option>
                    <option value="Senior Carer">Senior Carer</option>
                    <option value="Registered Nurse">Registered Nurse</option>
                    <option value="Domestic Staff">Cleaning / Domestic Staff</option>
                    <option value="Kitchen Staff">Kitchen / Catering Staff</option>
                    <option value="Management">Management / Admin</option>
                  </select>
                </div>
                <button disabled={loading} type="submit" className="w-full bg-purple-600 text-white font-bold text-lg py-4 rounded-xl hover:bg-purple-700 transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed mt-4">
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 text-center border-t border-slate-800">
        <p className="mb-2">&copy; {new Date().getFullYear()} Comprehensive Care Hub. All rights reserved.</p>
        <p className="text-sm">A modern approach to residential care management.</p>
      </footer>
    </div>
  );
}
