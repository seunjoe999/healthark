import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

const navLinks = [
  { label: 'HOME',           href: '/' },
  { label: 'ABOUT',          href: '/about' },
  { label: 'OUR SPECIALISM', href: '/our-specialism' },
  { label: 'HOW WE WORK',    href: '/how-we-work' },
  { label: 'CAREERS',        href: '/jobs' },
]

const servicesLinks = [
  { label: 'Our Services',  href: '/our-services' },
  { label: 'Day Services',  href: '/day-services' },
]

const joinLinks = [
  { label: 'Referral', href: '/make-a-referral' },
]

export default function Navbar() {
  const [joinOpen, setJoinOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)
  const servicesRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => {
    setMobileOpen(false)
    setJoinOpen(false)
    setServicesOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setJoinOpen(false)
      }
      if (servicesRef.current && !servicesRef.current.contains(e.target as Node)) {
        setServicesOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/'
    return location.pathname === href
  }
  const joinActive = joinLinks.some(l => location.pathname === l.href)
  const servicesActive = servicesLinks.some(l => location.pathname === l.href)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
      <div className="max-w-[1280px] mx-auto px-4">
        <div className="flex items-center h-20 gap-2">

          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center gap-2">
            <img src="/logo.jpg" alt="Comprehensive Care" className="h-16 w-auto object-contain" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden xl:flex items-center gap-1 flex-1 justify-center flex-wrap">
            {navLinks.map(link => (
              <Link
                key={link.href}
                to={link.href}
                className={`px-3 py-1.5 text-[12px] font-bold whitespace-nowrap rounded-full transition-all duration-200 ${
                  isActive(link.href)
                    ? 'bg-brand-purple text-white shadow-sm'
                    : 'text-gray-600 bg-gray-100 hover:bg-brand-purple/10 hover:text-brand-purple'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* OUR SERVICES dropdown */}
            <div className="relative" ref={servicesRef}>
              <button
                onClick={() => setServicesOpen(!servicesOpen)}
                className={`px-3 py-1.5 text-[12px] font-bold flex items-center gap-1 rounded-full transition-all duration-200 ${
                  servicesActive
                    ? 'bg-brand-purple text-white shadow-sm'
                    : 'text-gray-600 bg-gray-100 hover:bg-brand-purple/10 hover:text-brand-purple'
                }`}
              >
                OUR SERVICES
                <svg className="w-3 h-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {servicesOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white shadow-xl rounded-lg py-2 min-w-[180px] border border-gray-100 z-50">
                  {servicesLinks.map(l => (
                    <Link
                      key={l.href}
                      to={l.href}
                      className="block px-5 py-2.5 text-sm text-gray-700 hover:bg-brand-purple/8 hover:text-brand-purple font-medium transition-colors"
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* JOIN US dropdown */}
            <div className="relative" ref={dropRef}>
              <button
                onClick={() => setJoinOpen(!joinOpen)}
                className={`px-3 py-1.5 text-[12px] font-bold flex items-center gap-1 rounded-full transition-all duration-200 ${
                  joinActive
                    ? 'bg-brand-purple text-white shadow-sm'
                    : 'text-gray-600 bg-gray-100 hover:bg-brand-purple/10 hover:text-brand-purple'
                }`}
              >
                JOIN US
                <svg className="w-3 h-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {joinOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white shadow-xl rounded-lg py-2 min-w-[180px] border border-gray-100 z-50">
                  {joinLinks.map(l => (
                    <Link
                      key={l.href}
                      to={l.href}
                      className="block px-5 py-2.5 text-sm text-gray-700 hover:bg-brand-purple/8 hover:text-brand-purple font-medium transition-colors"
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: CONTACT US + social icons */}
          <div className="ml-auto flex items-center gap-2">
            <Link to="/contact-us" className="hidden lg:block btn-red text-[13px] whitespace-nowrap">
              CONTACT US
            </Link>

            {/* Social icons */}
            <div className="hidden lg:flex items-center gap-1.5">
              <a href="https://facebook.com" target="_blank" rel="noreferrer"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                style={{ background: '#1877F2' }}>
                <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                style={{ background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)' }}>
                <svg className="w-4 h-4" fill="none" stroke="white" strokeWidth={2} viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a href="https://wa.me/441616676030" target="_blank" rel="noreferrer"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                style={{ background: '#25D366' }}>
                <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
            </div>

            {/* Mobile burger */}
            <button
              className="xl:hidden p-2 text-gray-600"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <div className="w-6 space-y-1.5">
                <span className={`block h-0.5 bg-current rounded transition-all ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
                <span className={`block h-0.5 bg-current rounded transition-all ${mobileOpen ? 'opacity-0' : ''}`} />
                <span className={`block h-0.5 bg-current rounded transition-all ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="xl:hidden border-t border-gray-100 pb-4">
            {navLinks.map(link => (
              <Link
                key={link.href}
                to={link.href}
                className={`block px-4 py-3 text-sm font-semibold transition-colors ${
                  isActive(link.href) ? 'text-white bg-brand-purple' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="px-4 pt-1 pb-0.5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider py-2">Our Services</p>
            </div>
            {servicesLinks.map(l => (
              <Link
                key={l.href}
                to={l.href}
                className={`block px-6 py-2.5 text-sm font-semibold transition-colors ${
                  isActive(l.href) ? 'text-white bg-brand-purple' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {l.label}
              </Link>
            ))}
            <div className="px-4 pt-1 pb-0.5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider py-2">Join Us</p>
            </div>
            {joinLinks.map(l => (
              <Link
                key={l.href}
                to={l.href}
                className="block px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {l.label}
              </Link>
            ))}
            <div className="px-4 pt-3">
              <Link to="/contact-us" className="btn-red block text-center text-sm">
                CONTACT US
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
