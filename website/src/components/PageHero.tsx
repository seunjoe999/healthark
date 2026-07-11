import { Link } from 'react-router-dom'

interface PageHeroProps {
  variant: 'purple' | 'orange' | 'peach'
  title: string
  subtitle?: string
  cta?: { label: string; to: string }
}

function CloudBottom() {
  return (
    <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
      <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className="w-full h-[90px]">
        <path
          d="M0,30 C120,70 240,5 360,35 C480,65 600,8 720,38 C840,68 960,8 1080,35 C1200,62 1320,15 1440,40 L1440,90 L0,90 Z"
          fill="white"
        />
      </svg>
    </div>
  )
}

export default function PageHero({ variant, title, subtitle, cta }: PageHeroProps) {
  const bgClass =
    variant === 'purple' ? 'bg-purple-hero' :
    variant === 'orange' ? 'bg-orange-hero' :
    'bg-peach-hero'

  return (
    <section className={`relative ${bgClass} pt-16 pb-28 px-4 text-center`}>
      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="gold-card px-8 py-8 mx-auto">
          <h1 className="italic-heading text-4xl md:text-5xl mb-4">{title}</h1>
          {subtitle && (
            <p className="text-gray-600 text-base md:text-lg leading-relaxed">{subtitle}</p>
          )}
          {cta && (
            <div className="mt-6">
              <Link to={cta.to} className="btn-purple text-sm px-8 py-3 uppercase font-bold tracking-wide">
                {cta.label}
              </Link>
            </div>
          )}
        </div>
      </div>
      <CloudBottom />
    </section>
  )
}
