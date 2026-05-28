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
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold text-xl">
              CH
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">CompCare Hub</span>
          </div>
          <div className="flex gap-4">
            <a href="#careers" className="text-sm font-semibold text-slate-600 hover:text-purple-600 px-4 py-2 transition-colors">Careers</a>
            <Link to="/login" className="text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 px-5 py-2 rounded-full transition-colors shadow-sm">
              Staff Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-24 pb-20 px-6 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight mb-6 tracking-tight">
          Compassionate Care, <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">Empowered by Technology.</span>
        </h1>
        <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
          Comprehensive Care Hub is dedicated to providing outstanding residential care. We blend human empathy with modern management tools to deliver the highest standard of living for our service users.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <a href="#careers" className="bg-purple-600 text-white font-semibold px-8 py-4 rounded-full shadow-lg hover:bg-purple-700 hover:shadow-xl hover:-translate-y-0.5 transition-all text-lg">
            Join Our Care Team
          </a>
          <a href="#about" className="bg-white text-slate-700 font-semibold border border-slate-200 px-8 py-4 rounded-full shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all text-lg">
            Learn More
          </a>
        </div>
      </header>

      {/* About Section */}
      <section id="about" className="py-20 bg-white border-y border-slate-200">
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
