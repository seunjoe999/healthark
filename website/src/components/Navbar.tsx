import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

const navLinks = [
  { label: 'HOME',           href: '/#home' },
  { label: 'ABOUT',          href: '/#about' },
  { label: 'OUR SERVICES',   href: '/#our-services' },
  { label: 'OUR SPECIALISM', href: '/#our-specialism' },
  { label: 'HOW WE WORK',    href: '/#how-we-work' },
  { label: 'OUR CARERS',     href: '/#our-carers' },
]

const joinLinks = [
  { label: 'Make A Referral', href: '/make-a-referral' },
  { label: 'Jobs',             href: '/jobs' },
]

export default function Navbar() {
  const [joinOpen, setJoinOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('home')
  const dropRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => {
    setMobileOpen(false)
    setJoinOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setJoinOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (location.pathname !== '/') return
    const sectionIds = ['home', 'about', 'our-services', 'our-specialism', 'how-we-work', 'our-carers', 'join-us']
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    )
    sectionIds.forEach(id => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [location.pathname])

  const isActive = (href: string) => {
    if (location.pathname !== '/') return false
    const sectionId = href.replace('/#', '')
    return activeSection === sectionId
  }
  const joinActive = activeSection === 'join-us' || joinLinks.some(l => location.pathname === l.href)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
      <div className="max-w-[1280px] mx-auto px-4">
        <div className="flex items-center h-20 gap-2">

          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center gap-2">
            <img src="/logo.jpg" alt="Comprehensive Care" className="h-16 w-auto object-contain" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden xl:flex items-center gap-0 flex-1 justify-center flex-wrap">
            {navLinks.map(link => (
              <a
                key={link.href}
                href={link.href}
                className={`px-2.5 py-1 text-[12.5px] font-semibold whitespace-nowrap nav-link ${
                  isActive(link.href) ? 'nav-active' : 'text-gray-600'
                }`}
              >
                {link.label}
              </a>
            ))}

            {/* JOIN US dropdown */}
            <div className="relative" ref={dropRef}>
              <button
                onClick={() => setJoinOpen(!joinOpen)}
                className={`px-2.5 py-1 text-[12.5px] font-semibold flex items-center gap-1 nav-link ${
                  joinActive ? 'nav-active text-gray-900' : 'text-gray-600'
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
                    <a
                      key={l.href}
                      href={l.href}
                      className="block px-5 py-2.5 text-sm text-gray-700 hover:bg-peach-light hover:text-brand-purple font-medium transition-colors"
                    >
                      {l.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: CONTACT US + social icons */}
          <div className="ml-auto flex items-center gap-3">
            <Link to="/contact-us" className="hidden lg:block btn-red text-[13px] whitespace-nowrap">
              CONTACT US
            </Link>
            <img src="/cqc-logo.jpg" alt="CQC Rated Good" className="hidden lg:block h-10 w-auto object-contain" />

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
              <a
                key={link.href}
                href={link.href}
                className={`block px-4 py-3 text-sm font-semibold transition-colors ${
                  isActive(link.href) ? 'text-btn-red bg-peach-light' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </a>
            ))}
            <div className="px-4 pt-1 pb-0.5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider py-2">Join Us</p>
            </div>
            {joinLinks.map(l => (
              <a
                key={l.href}
                href={l.href}
                className="block px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {l.label}
              </a>
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
