import { Link } from 'react-router-dom'

const services = ['Supported Living','Complex Mental Health','Drug & Alcohol Recovery','Domiciliary Care','End of Life Care','Live In Care','Respite Care']
const quickLinks = [
  { label: 'Home', path: '/' },
  { label: 'About Us', path: '/about' },
  { label: 'Our Services', path: '/our-services' },
  { label: 'Our Specialism', path: '/our-specialism' },
  { label: 'How We Work', path: '/how-we-work' },
  { label: 'Our Carers', path: '/our-carers' },
  { label: 'Make A Referral', path: '/make-a-referral' },
  { label: 'Contact Us', path: '/contact-us' },
]
const downloads = [
  { label: 'Company Brochure', file: '/brochure.pdf' },
  { label: 'Staff Handbook', file: '/staff-handbook.pdf' },
  { label: 'Carbon Reduction Plan', file: '/carbon-reduction-plan.pdf' },
  { label: 'Application Pack', file: '/brochure.pdf' },
  { label: 'Timesheet', file: '/timesheet.pdf' },
]

export default function Footer() {
  return (
    <footer className="text-gray-300" style={{background:'linear-gradient(135deg,#2d1b5e 0%,#1a0f3c 100%)'}}>
      {/* Downloads & Resources strip */}
      <div className="py-8 px-4" style={{background:'rgba(255,255,255,0.06)',borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-white text-xl font-bold mb-1">Downloads &amp; Resources</h2>
          <p className="text-purple-200 text-sm mb-6">Click to download our key documents</p>
          <div className="flex flex-wrap justify-center gap-4">
            {downloads.map(d => (
              <a key={d.label} href={d.file} download
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold px-5 py-3 rounded-full transition-all">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                {d.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer body */}
      <div className="max-w-7xl mx-auto px-4 py-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">

        {/* Company info */}
        <div className="lg:col-span-1">
          <img src="/logo.jpg" alt="Comprehensive Care" className="h-20 w-auto object-contain mb-4 bg-white rounded-lg p-2" />
          <p className="text-sm leading-relaxed text-gray-400 mb-4">
            Comprehensive Care LTD is a CQC-registered provider specialising in Complex &amp; Enduring Mental Health, Learning Disabilities, Autism, ADHD &amp; Addiction Recovery services.
          </p>
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-gray-400">Reg. No:</span> 10502859
          </p>
          <p className="text-xs text-gray-500 mt-1">
            <span className="font-semibold text-gray-400">CQC:</span> Registered &amp; Inspected Good
          </p>
          {/* Social icons */}
          <div className="flex gap-3 mt-4">
            <a href="https://web.facebook.com/p/Comprehensive-Care-61578761319402/?_rdc=1&_rdr#" target="_blank" rel="noopener noreferrer"
              className="w-9 h-9 bg-[#1877f2] rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a href="https://www.instagram.com/comprehensivecareltd" target="_blank" rel="noopener noreferrer"
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{background:'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)'}}>
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
          </div>
        </div>

        {/* Quick links */}
        <div>
          <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-5 border-b border-white/20 pb-2">Quick Links</h3>
          <ul className="space-y-2.5">
            {quickLinks.map(l => (
              <li key={l.path}>
                <Link to={l.path} className="text-sm text-gray-400 hover:text-white transition-colors hover:pl-1">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Services */}
        <div>
          <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-5 border-b border-white/20 pb-2">Our Services</h3>
          <ul className="space-y-2.5">
            {services.map(s => (
              <li key={s}>
                <Link to="/our-services" className="text-sm text-gray-400 hover:text-white transition-colors hover:pl-1">
                  {s}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact info */}
        <div>
          <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-5 border-b border-white/20 pb-2">Contact Us</h3>
          <div className="space-y-3 text-sm text-gray-400">
            <div className="flex gap-2">
              <svg className="w-4 h-4 text-[#c8a045] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <span>Office 2-13 Ivy Business Centre, Crown Street, Failsworth, Manchester, M35 9BG</span>
            </div>
            <div className="flex gap-2">
              <svg className="w-4 h-4 text-[#c8a045] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
              </svg>
              <div>
                <a href="tel:01616676030" className="hover:text-white block">0161 667 6030</a>
                <a href="tel:01618430277" className="hover:text-white block">0161 843 0277</a>
              </div>
            </div>
            <div className="flex gap-2">
              <svg className="w-4 h-4 text-[#c8a045] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              <div>
                <a href="mailto:info@comprehensivecare.org.uk" className="hover:text-white block">info@comprehensivecare.org.uk</a>
                <a href="mailto:recruitment@comprehensivecare.org.uk" className="hover:text-white block">recruitment@comprehensivecare.org.uk</a>
              </div>
            </div>
            <div className="flex gap-2">
              <svg className="w-4 h-4 text-[#c8a045] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>Mon–Fri: 9:00 AM – 5:00 PM</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-gray-500">
          <p>&copy; {new Date().getFullYear()} Comprehensive Care LTD. Registered in England &amp; Wales · Company No. 10502859</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms &amp; Conditions</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
