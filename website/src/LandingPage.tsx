import React, { useState, useEffect, useRef } from 'react'
import {
  motion, AnimatePresence,
  useMotionValue, useSpring, useTransform, useMotionTemplate,
  useScroll, useInView, animate,
} from 'framer-motion'
import toast from 'react-hot-toast'

const API_BASE = 'https://compcarehub.onrender.com/api'

// ── Easing ───────────────────────────────────────────────────────────────────
const EASE    = [0.25, 0.46, 0.45, 0.94] as const
const SPRING  = { type: 'spring', stiffness: 300, damping: 24 } as const
const SPRING2 = { type: 'spring', stiffness: 180, damping: 20 } as const

// ── Variants ─────────────────────────────────────────────────────────────────
const fadeUp   = { hidden:{ opacity:0, y:48 },  visible:{ opacity:1, y:0,  transition:{ duration:0.65, ease:EASE } } }
const slideL   = { hidden:{ opacity:0, x:-64 }, visible:{ opacity:1, x:0,  transition:{ duration:0.75, ease:EASE } } }
const slideR   = { hidden:{ opacity:0, x:64 },  visible:{ opacity:1, x:0,  transition:{ duration:0.75, ease:EASE } } }
const scaleUp  = { hidden:{ opacity:0, scale:0.85 }, visible:{ opacity:1, scale:1, transition:{ duration:0.6, ease:'easeOut' as const } } }
const stagger  = { hidden:{}, visible:{ transition:{ staggerChildren:0.1, delayChildren:0.05 } } }
const cardV    = { hidden:{ opacity:0, y:36 }, visible:{ opacity:1, y:0, transition:{ duration:0.55, ease:EASE } } }

// ── Custom Cursor ─────────────────────────────────────────────────────────────
function Cursor() {
  const x   = useMotionValue(-100)
  const y   = useMotionValue(-100)
  const sx  = useSpring(x, { stiffness: 700, damping: 36 })
  const sy  = useSpring(y, { stiffness: 700, damping: 36 })
  const rx  = useSpring(x, { stiffness: 150, damping: 22 })
  const ry  = useSpring(y, { stiffness: 150, damping: 22 })
  const [clicked, setClicked] = useState(false)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    const move = (e: MouseEvent) => { x.set(e.clientX); y.set(e.clientY) }
    const down = () => setClicked(true)
    const up   = () => setClicked(false)
    const over = (e: MouseEvent) => {
      const t = e.target as Element
      setHovered(!!(t.closest('button') || t.closest('a') || t.closest('[role="button"]')))
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mousedown', down)
    window.addEventListener('mouseup',   up)
    window.addEventListener('mouseover', over)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mousedown', down)
      window.removeEventListener('mouseup',   up)
      window.removeEventListener('mouseover', over)
    }
  }, [])

  return (
    <>
      <motion.div className="cursor-dot pointer-events-none"
        style={{ left: sx, top: sy, x: '-50%', y: '-50%' }}
        animate={{ scale: clicked ? 0.5 : hovered ? 0 : 1 }} />
      <motion.div className="cursor-ring pointer-events-none"
        style={{ left: rx, top: ry, x: '-50%', y: '-50%' }}
        animate={{ scale: clicked ? 0.8 : hovered ? 1.8 : 1, borderColor: hovered ? 'rgba(124,58,237,0.9)' : 'rgba(124,58,237,0.5)' }}
        transition={{ duration: 0.15 }} />
    </>
  )
}

// ── Spotlight Card ────────────────────────────────────────────────────────────
function SpotlightCard({ children, className = '', size = 350 }: { children: React.ReactNode; className?: string; size?: number }) {
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const bg = useMotionTemplate`radial-gradient(${size}px circle at ${mx}px ${my}px, rgba(139,92,246,0.12), transparent 80%)`

  return (
    <div className={`group relative ${className}`}
      onMouseMove={({ currentTarget, clientX, clientY }) => {
        const { left, top } = currentTarget.getBoundingClientRect()
        mx.set(clientX - left); my.set(clientY - top)
      }}>
      <motion.div className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0"
        style={{ background: bg }} />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

// ── Word reveal ───────────────────────────────────────────────────────────────
function Reveal({ text, className = '', delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <span className={`inline ${className}`} aria-label={text}>
      {text.split(' ').map((w, i) => (
        <span key={i} className="inline-block overflow-hidden leading-[1.15] mr-[0.22em] last:mr-0">
          <motion.span className="inline-block"
            variants={{
              hidden:  { y: '108%', opacity: 0 },
              visible: { y: '0%',   opacity: 1, transition: { duration: 0.55, delay: delay + i * 0.08, ease: [0.33, 1, 0.68, 1] } },
            }}>
            {w}
          </motion.span>
        </span>
      ))}
    </span>
  )
}

// ── Shimmer button ────────────────────────────────────────────────────────────
function ShimmerBtn({ children, onClick, href, className = '', dark = false }: {
  children: React.ReactNode; onClick?: () => void; href?: string; className?: string; dark?: boolean
}) {
  const Tag = href ? motion.a : motion.button
  return (
    <Tag href={href as any} onClick={onClick}
      className={`relative overflow-hidden inline-flex items-center justify-center gap-2 font-bold rounded-full transition-colors btn-shine ${className} ${dark ? 'bg-purple-600 text-white' : 'bg-white text-purple-700'}`}
      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
      transition={SPRING}>
      {children}
    </Tag>
  )
}

// ── Tilt card ─────────────────────────────────────────────────────────────────
function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const x  = useMotionValue(0); const y  = useMotionValue(0)
  const rx = useSpring(useTransform(y, [-80,80], [ 6,-6]), { stiffness: 260, damping: 24 })
  const ry = useSpring(useTransform(x, [-80,80], [-6, 6]), { stiffness: 260, damping: 24 })
  const move  = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    x.set(e.clientX - r.left - r.width/2); y.set(e.clientY - r.top - r.height/2)
  }
  return (
    <motion.div style={{ rotateX: rx, rotateY: ry, transformPerspective: 1100 }}
      onMouseMove={move} onMouseLeave={() => { x.set(0); y.set(0) }} className={className}>
      {children}
    </motion.div>
  )
}

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ target, suffix, label, icon }: { target:number; suffix:string; label:string; icon:string }) {
  const ref     = useRef<HTMLDivElement>(null)
  const inView  = useInView(ref, { once: true })
  const count   = useMotionValue(0)
  const display = useTransform(count, v => Math.round(v).toString())

  useEffect(() => {
    if (inView) animate(count, target, { duration: 2.2, ease: EASE })
  }, [inView])

  return (
    <motion.div ref={ref} className="text-center" variants={cardV}>
      <motion.span className="text-4xl block mb-3"
        animate={{ y: [0,-8,0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: Math.random()*2 }}>
        {icon}
      </motion.span>
      <div className="text-5xl font-black text-white mb-2 tabular-nums leading-none">
        <motion.span>{display}</motion.span>{suffix}
      </div>
      <p className="text-purple-200 text-sm font-semibold">{label}</p>
    </motion.div>
  )
}

// ── Wave divider ──────────────────────────────────────────────────────────────
function WaveDivider({ flip = false, fromColor = '#ffffff', toColor = '#faf5ff' }) {
  return (
    <div className="relative h-20 pointer-events-none overflow-hidden" style={{ background: fromColor }}>
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none"
        className="absolute bottom-0 left-0 w-full h-full">
        <path d={flip
          ? 'M0,0 C360,80 1080,0 1440,80 L1440,80 L0,80 Z'
          : 'M0,80 C360,0 1080,80 1440,0 L1440,80 L0,80 Z'}
          fill={toColor} />
      </svg>
    </div>
  )
}

// ── Section label ─────────────────────────────────────────────────────────────
function Tag({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.22em] uppercase rounded-full px-4 py-1.5 mb-5 ${dark ? 'text-purple-300 bg-purple-500/12 border border-purple-400/20' : 'text-purple-600 bg-purple-50 border border-purple-200'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dark ? 'bg-purple-400' : 'bg-purple-500'}`} />
      {children}
    </span>
  )
}

// ── Data ──────────────────────────────────────────────────────────────────────
function scrollTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior:'smooth', block:'start' }) }

const NAVLINKS = [
  {label:'About',id:'about'},{label:'Services',id:'services'},
  {label:'Accommodation',id:'accommodation'},{label:'Values',id:'values'},
  {label:'Careers',id:'careers'},{label:'Contact',id:'contact'},
]

const PROVIDER   = ['Complex Mental Health','Learning Disabilities','Autism Spectrum Disorders','Drug & Alcohol Misuse','Physical Complex Health','ADHD','Acquired Brain Injury','Physical Disabilities','Court of Protection DOLs','Elderly Care','End of Life Care','Respite Care','Live In Care','Private & Local Authority']
const AGENCY     = ['Nursing Homes','Residential Homes','Care Homes','Hospices','Hospitals','Mental Health Services','Learning Disabilities Services','Supported Living','Domiciliary Care','Private & Local']
const CONDITIONS = ['Motor Neurone Disease','Cerebral Palsy','Dyspraxia','Dementia',"Down's Syndrome",'Peg Feed Care','Tracheostomy Care','Palliative Care','Ventilation & Breathing Support','Bowel Management','Catheter Care',"Huntingdon's Chorea",'Multiple Sclerosis',"Parkinson's Disease"]

const VALUES = [
  {title:'Privacy',        icon:'🔒',grad:'from-violet-500 to-purple-700',  bg:'bg-violet-50', border:'border-violet-100',text:'text-violet-700', desc:'The right of individuals to be free from intrusion into their affairs, taken into account in every Care Plan.'},
  {title:'Dignity',        icon:'🌟',grad:'from-purple-500 to-indigo-700',  bg:'bg-purple-50', border:'border-purple-100',text:'text-purple-700', desc:'All individuals, whatever their circumstances, deserve to be treated with dignity and respect in every interaction.'},
  {title:'Equality',       icon:'🤝',grad:'from-indigo-500 to-blue-600',    bg:'bg-indigo-50', border:'border-indigo-100',text:'text-indigo-700', desc:'We respect all clients regardless of age, disability, gender, sexual orientation, culture, religion or nationality.'},
  {title:'Communication',  icon:'💬',grad:'from-fuchsia-500 to-purple-600', bg:'bg-fuchsia-50',border:'border-fuchsia-100',text:'text-fuchsia-700',desc:'Clients have the right to be fully informed on all aspects of their care, using methods tailored to them individually.'},
  {title:'Independence',   icon:'🦋',grad:'from-purple-600 to-violet-700',  bg:'bg-purple-50', border:'border-purple-100',text:'text-purple-700', desc:'We encourage service users to make their own choices and remain as independent as possible while receiving support.'},
  {title:'Person-Centred', icon:'❤️',grad:'from-violet-600 to-indigo-600',  bg:'bg-violet-50', border:'border-violet-100',text:'text-violet-700', desc:'Every care plan is built around the individual — their values, preferences, desires, and long-term goals.'},
]

const ACCOM = [
  {title:'Cluster / Shared Living',icon:'🏠',grad:'from-violet-600 to-purple-700',   desc:'Private space with the benefits of community — residents enjoy their own bedroom while sharing communal areas and support.',features:['Private bedroom & bathroom','Shared communal lounges','Social peer support','Shared household costs']},
  {title:'Apartment Living',       icon:'🏢',grad:'from-purple-700 to-indigo-700',   desc:'Self-contained apartment living that balances maximum independence with the option to socialise when they choose.',         features:['Self-contained apartment','Optional shared spaces','Maximum independence','Developed with housing partners']},
  {title:'Stepping-Stone',         icon:'🪜',grad:'from-indigo-600 to-violet-700',   desc:'Short-term stability while transitioning to long-term solutions. We develop the skills needed for independent living.',       features:['Transition planning support','Skills development programme','Structured progression','Move-on support']},
]

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [form,setForm]       = useState({firstName:'',lastName:'',email:'',phone:'',position:'Care Assistant',message:''})
  const [loading,setLoading] = useState(false)
  const [submitted,setSubmit]= useState(false)
  const [menuOpen,setMenu]   = useState(false)
  const [scrolled,setScrolled]= useState(false)

  const {scrollYProgress} = useScroll()
  const scaleX = useSpring(scrollYProgress,{stiffness:100,damping:30})

  // Hero scroll parallax
  const {scrollY} = useScroll()
  const heroY       = useTransform(scrollY,[0,700],[0,-130])
  const heroOpacity = useTransform(scrollY,[0,500],[1,0])

  // Hero mouse-reactive gradient
  const heroMX = useMotionValue(0.5)
  const heroMY = useMotionValue(0.5)
  const gradX  = useSpring(useTransform(heroMX,[0,1],[15,85]),{stiffness:60,damping:25})
  const gradY  = useSpring(useTransform(heroMY,[0,1],[15,85]),{stiffness:60,damping:25})
  const heroBg = useMotionTemplate`radial-gradient(ellipse 90% 80% at ${gradX}% ${gradY}%, rgba(124,58,237,0.45) 0%, rgba(109,40,217,0.28) 30%, transparent 70%), linear-gradient(155deg,#0d0218 0%,#1a0a3e 45%,#0a0d2e 100%)`

  // Mouse-parallax orbs
  const mx = useMotionValue(0); const my = useMotionValue(0)
  const sc = {stiffness:70,damping:22}
  const o1x=useSpring(useTransform(mx,[-0.5,0.5],[-70,70]),sc)
  const o1y=useSpring(useTransform(my,[-0.5,0.5],[-50,50]),sc)
  const o2x=useSpring(useTransform(mx,[-0.5,0.5],[50,-50]),sc)
  const o2y=useSpring(useTransform(my,[-0.5,0.5],[35,-35]),sc)
  const o3x=useSpring(useTransform(mx,[-0.5,0.5],[-35,35]),sc)
  const o3y=useSpring(useTransform(my,[-0.5,0.5],[55,-55]),sc)

  const trackHero = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX-r.left-r.width/2)/r.width)
    my.set((e.clientY-r.top-r.height/2)/r.height)
    heroMX.set((e.clientX-r.left)/r.width)
    heroMY.set((e.clientY-r.top)/r.height)
  }

  useEffect(()=>{
    const fn=()=>setScrolled(window.scrollY>50)
    window.addEventListener('scroll',fn,{passive:true})
    return ()=>window.removeEventListener('scroll',fn)
  },[])

  const apply = async(e:React.FormEvent)=>{
    e.preventDefault(); setLoading(true)
    try{
      const r=await fetch(`${API_BASE}/public/apply`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
      if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error((d as any).error||'Failed')}
      setSubmit(true);toast.success('Application submitted!')
    }catch(err:any){toast.error(err?.message||'Failed to submit')}
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      <Cursor />

      {/* Progress */}
      <motion.div className="progress-bar" style={{scaleX}} />

      {/* ── NAVBAR ───────────────────────────────────────────────────────── */}
      <motion.nav className="fixed top-[3px] left-0 right-0 z-50"
        initial={{y:-80,opacity:0}} animate={{y:0,opacity:1}} transition={{duration:0.6,ease:EASE}}>
        <motion.div className="transition-none"
          animate={{
            backgroundColor: scrolled?'rgba(255,255,255,0.88)':'rgba(255,255,255,0)',
            borderBottom:    scrolled?'1px solid rgba(139,92,246,0.12)':'1px solid rgba(255,255,255,0)',
            backdropFilter:  scrolled?'blur(28px)':'blur(0px)',
            boxShadow:       scrolled?'0 4px 40px rgba(109,40,217,0.08)':'none',
          }} transition={{duration:0.4}}>
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

            <motion.button onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}
              className="flex items-center gap-3" whileHover={{scale:1.02}} whileTap={{scale:0.98}}>
              <div className="relative">
                <motion.div className="absolute inset-0 bg-purple-500/40 rounded-xl blur-lg"
                  animate={{opacity:[0.3,0.8,0.3]}} transition={{duration:2.5,repeat:Infinity}}/>
                <img src="/cc-icon.jpg" alt="Comprehensive Care" className="relative w-11 h-11 rounded-xl object-contain"/>
              </div>
              <div>
                <motion.p className="text-[15px] font-black tracking-tight leading-none"
                  animate={{color:scrolled?'#0f0a1e':'#ffffff'}} transition={{duration:0.35}}>
                  Comprehensive Care
                </motion.p>
                <motion.p className="text-[10px] font-bold tracking-[0.2em] uppercase"
                  animate={{color:scrolled?'#7c3aed':'#c4b5fd'}} transition={{duration:0.35}}>
                  YOUR CARE OUR PRIORITY
                </motion.p>
              </div>
            </motion.button>

            <div className="hidden lg:flex items-center gap-1">
              {NAVLINKS.map(l=>(
                <motion.button key={l.id} onClick={()=>scrollTo(l.id)}
                  className="relative px-4 py-2 text-sm font-semibold rounded-full overflow-hidden"
                  whileHover="h" initial="r">
                  <motion.span className="absolute inset-0 rounded-full"
                    variants={{r:{opacity:0,scale:0.85},h:{opacity:1,scale:1}}}
                    style={{background:scrolled?'rgba(124,58,237,0.07)':'rgba(255,255,255,0.12)'}}
                    transition={{duration:0.2}}/>
                  <motion.span className="relative" animate={{color:scrolled?'#374151':'rgba(255,255,255,0.88)'}} transition={{duration:0.35}}>
                    {l.label}
                  </motion.span>
                </motion.button>
              ))}
              <ShimmerBtn href="https://compcarehub.onrender.com/login" dark
                className="ml-4 px-6 py-2.5 text-sm shadow-lg shadow-purple-500/25">
                Staff Login →
              </ShimmerBtn>
            </div>

            {/* Burger */}
            <motion.button className="lg:hidden p-2.5" onClick={()=>setMenu(v=>!v)} whileTap={{scale:0.9}}>
              <div className="w-5 space-y-1.5">
                {[0,1,2].map(i=>(
                  <motion.span key={i} className={`block h-0.5 rounded-full ${scrolled?'bg-slate-800':'bg-white'}`}
                    animate={menuOpen?i===0?{rotate:45,y:8}:i===1?{opacity:0,scaleX:0}:{rotate:-45,y:-8}:{rotate:0,y:0,opacity:1,scaleX:1}}
                    transition={{duration:0.25}}/>
                ))}
              </div>
            </motion.button>
          </div>
        </motion.div>

        <AnimatePresence>
          {menuOpen&&(
            <motion.div className="lg:hidden glass-light border-b border-purple-100 shadow-2xl"
              initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.3,ease:EASE}}>
              <div className="px-6 py-5 flex flex-col gap-1">
                {NAVLINKS.map((l,i)=>(
                  <motion.button key={l.id} onClick={()=>{scrollTo(l.id);setMenu(false)}}
                    className="text-left px-4 py-3 text-sm font-semibold text-slate-700 rounded-xl"
                    initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} transition={{delay:i*0.05}}
                    whileHover={{x:6,backgroundColor:'rgba(124,58,237,0.06)',color:'#7c3aed'}}>
                    {l.label}
                  </motion.button>
                ))}
                <ShimmerBtn dark className="mt-3 px-5 py-3 text-sm text-center justify-center">Staff Login →</ShimmerBtn>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <header className="relative min-h-screen flex items-center overflow-hidden grain" onMouseMove={trackHero}>
        <motion.div className="absolute inset-0" style={{background:heroBg}}/>
        <div className="absolute inset-0 dot-grid opacity-100"/>

        {/* Orbs */}
        <motion.div className="absolute top-[10%] right-[8%] w-[520px] h-[520px] rounded-full pointer-events-none orb-float-a"
          style={{x:o1x,y:o1y,background:'radial-gradient(circle,rgba(139,92,246,0.22) 0%,transparent 70%)'}}/>
        <motion.div className="absolute bottom-[10%] left-[4%] w-[400px] h-[400px] rounded-full pointer-events-none orb-float-b"
          style={{x:o2x,y:o2y,background:'radial-gradient(circle,rgba(109,40,217,0.18) 0%,transparent 70%)'}}/>
        <motion.div className="absolute top-[55%] left-[32%] w-[260px] h-[260px] rounded-full pointer-events-none orb-float-c"
          style={{x:o3x,y:o3y,background:'radial-gradient(circle,rgba(167,139,250,0.14) 0%,transparent 70%)'}}/>

        <motion.div className="relative z-10 max-w-7xl mx-auto px-6 pt-28 pb-24 w-full" style={{y:heroY,opacity:heroOpacity}}>
          <div className="grid lg:grid-cols-2 gap-20 items-center">

            {/* Left */}
            <motion.div variants={stagger} initial="hidden" animate="visible">

              <motion.div variants={scaleUp}
                className="inline-flex items-center gap-2.5 glass rounded-full px-5 py-2.5 mb-10">
                <img src="/cqc-good.jpg" alt="CQC Good" className="h-6 rounded object-contain"/>
                <span className="text-white text-sm font-semibold">CQC Inspected & Rated Good</span>
                <motion.span className="w-2 h-2 rounded-full bg-emerald-400 ml-1"
                  animate={{opacity:[1,0.2,1]}} transition={{duration:1.4,repeat:Infinity}}/>
              </motion.div>

              <motion.h1 variants={stagger} className="text-[clamp(3rem,7vw,6rem)] font-black text-white leading-[1.02] tracking-tighter mb-6">
                <Reveal text="Exceptional Care." delay={0.3}/>
                <br/>
                <span className="shimmer-text block mt-1">
                  <Reveal text="Every Person." delay={0.6}/>
                </span>
                <br/>
                <span className="text-white/85">
                  <Reveal text="Every Day." delay={0.9}/>
                </span>
              </motion.h1>

              <motion.p variants={fadeUp}
                className="text-xl text-white/55 leading-relaxed mb-10 max-w-lg font-light">
                Comprehensive Care delivers personalised, compassionate support across the UK — from supported living to complex health conditions and end of life care.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
                <ShimmerBtn dark onClick={()=>scrollTo('services')} className="px-8 py-4 text-base shadow-2xl shadow-purple-900/60">
                  Explore Our Services →
                </ShimmerBtn>
                <motion.button onClick={()=>scrollTo('careers')}
                  className="px-8 py-4 glass border border-white/20 text-white font-bold text-base rounded-full"
                  whileHover={{backgroundColor:'rgba(255,255,255,0.15)',y:-3}} whileTap={{scale:0.97}} transition={SPRING}>
                  Join Our Team
                </motion.button>
                <motion.button onClick={()=>scrollTo('contact')}
                  className="px-8 py-4 bg-white text-purple-700 font-bold text-base rounded-full shadow-xl"
                  whileHover={{y:-3,boxShadow:'0 20px 40px rgba(0,0,0,0.15)'}} whileTap={{scale:0.97}} transition={SPRING}>
                  Contact Us
                </motion.button>
              </motion.div>
            </motion.div>

            {/* Right — floating logo */}
            <div className="hidden lg:flex flex-col items-center gap-8">
              <motion.div className="relative"
                initial={{opacity:0,scale:0.8,y:30}} animate={{opacity:1,scale:1,y:0}}
                transition={{delay:0.5,duration:0.8,ease:[0.34,1.56,0.64,1]}}>
                <motion.div animate={{y:[0,-20,0]}} transition={{duration:5,repeat:Infinity,ease:'easeInOut'}}>
                  <motion.div className="absolute inset-0 rounded-3xl logo-glow"/>
                  <div className="relative bg-white rounded-3xl p-10 shadow-2xl">
                    <img src="/cc-logo.jpg" alt="Comprehensive Care" className="w-72 object-contain"/>
                  </div>
                </motion.div>
              </motion.div>

              <motion.div className="flex items-center gap-4"
                initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:1.1}}>
                {['/cqc-good.jpg','/ico-logo.png','/pqs-logo.png'].map((src,i)=>(
                  <motion.div key={src} className="glass rounded-2xl p-3"
                    initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:1.2+i*0.1}}
                    whileHover={{scale:1.1,backgroundColor:'rgba(255,255,255,0.18)'}}>
                    <img src={src} alt="" className="h-14 object-contain rounded-lg"/>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>

          {/* Scroll cue */}
          <motion.button className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30"
            initial={{opacity:0}} animate={{opacity:1}} transition={{delay:2}}
            onClick={()=>scrollTo('about')}>
            <span className="text-[10px] tracking-[0.25em] uppercase font-bold">Scroll</span>
            <motion.div className="w-5 h-5 border-b-2 border-r-2 border-current rotate-45"
              animate={{y:[0,8,0],opacity:[0.3,1,0.3]}} transition={{duration:1.8,repeat:Infinity}}/>
          </motion.button>
        </motion.div>
      </header>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section className="relative py-20 overflow-hidden" style={{background:'linear-gradient(135deg,#5b21b6,#4338ca,#6d28d9)'}}>
        <div className="absolute inset-0 dot-grid opacity-15"/>
        <motion.div className="relative z-10 max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12"
          variants={stagger} initial="hidden" whileInView="visible" viewport={{once:true}}>
          <Counter target={14}  suffix="+" label="Care Specialisms"  icon="🏥"/>
          <Counter target={24}  suffix="/7" label="Support Available" icon="⏰"/>
          <Counter target={10}  suffix="+" label="Agency Settings"    icon="🏢"/>
          <Counter target={100} suffix="%" label="Person-Centred"     icon="❤️"/>
        </motion.div>
      </section>

      <WaveDivider fromColor="#4338ca" toColor="#ffffff"/>

      {/* ── ABOUT ────────────────────────────────────────────────────────── */}
      <section id="about" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-24 items-center">

            <motion.div variants={slideL} initial="hidden" whileInView="visible" viewport={{once:true,margin:'-80px'}}>
              <Tag>Who We Are</Tag>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-7">
                Putting People First,<br/><span className="text-purple-600">Always</span>
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed mb-5">
                Comprehensive Care is a UK-based care provider and staffing agency committed to delivering outstanding, person-centred support. We work with individuals, their families, and communities — always placing their values and preferences at the centre.
              </p>
              <p className="text-slate-500 text-lg leading-relaxed mb-10">
                Our staff are trained to manage complex care situations and deliver individualised, one-on-one services across a wide range of settings and health conditions.
              </p>
              <motion.div className="grid grid-cols-2 gap-3" variants={stagger} initial="hidden" whileInView="visible" viewport={{once:true}}>
                {['🌍 Community Engagement','👤 One-on-One Support','💰 Budgeting Support','🏥 Annual Health Checks','📋 One-Page Profiles','🤸 Social Activities'].map(a=>{
                  const [ic,...rest]=a.split(' ')
                  return(
                    <motion.div key={a} variants={cardV}
                      className="flex items-center gap-3 p-4 rounded-2xl bg-purple-50 border border-purple-100 cursor-default"
                      whileHover={{y:-3,backgroundColor:'rgba(124,58,237,0.08)',boxShadow:'0 8px 24px rgba(124,58,237,0.1)'}} transition={SPRING}>
                      <span className="text-2xl">{ic}</span>
                      <span className="text-sm font-bold text-purple-900">{rest.join(' ')}</span>
                    </motion.div>
                  )
                })}
              </motion.div>
            </motion.div>

            <motion.div variants={slideR} initial="hidden" whileInView="visible" viewport={{once:true,margin:'-80px'}} className="relative">
              <div className="absolute -inset-8 bg-gradient-to-br from-purple-100 via-violet-50 to-purple-100 rounded-[2.5rem] -rotate-2"/>
              <motion.img src="/values.png" alt="Our Values"
                className="relative rounded-3xl w-full object-cover shadow-2xl shadow-purple-200/60"
                whileHover={{scale:1.03}} transition={{duration:0.45}}/>
            </motion.div>
          </div>
        </div>
      </section>

      <WaveDivider fromColor="#ffffff" toColor="#faf5ff"/>

      {/* ── SERVICES ─────────────────────────────────────────────────────── */}
      <section id="services" className="py-32 dot-grid-light relative" style={{background:'#faf5ff'}}>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{once:true}} className="text-center mb-20">
            <Tag>What We Do</Tag>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-5">Our Services</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">We operate as both a care provider and a staffing agency, supporting individuals with complex needs.</p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-10">
            <motion.div variants={slideL} initial="hidden" whileInView="visible" viewport={{once:true}}>
              <SpotlightCard className="h-full rounded-3xl" size={400}>
                <TiltCard>
                  <motion.div className="bg-white rounded-3xl shadow-xl border border-purple-100 overflow-hidden h-full"
                    whileHover={{boxShadow:'0 30px 60px rgba(124,58,237,0.14)'}}>
                    <div className="bg-gradient-to-br from-violet-700 to-purple-800 p-8">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center text-3xl">🏥</div>
                        <div>
                          <p className="text-purple-200 text-xs font-bold uppercase tracking-widest">Care Provider</p>
                          <h3 className="text-2xl font-black text-white">Areas We Cover</h3>
                        </div>
                      </div>
                      <p className="text-purple-100/75 text-sm">Direct care across supported living and community settings for individuals with complex needs.</p>
                    </div>
                    <div className="p-8">
                      <div className="flex flex-wrap gap-2">
                        {PROVIDER.map(a=>(
                          <motion.span key={a}
                            className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-full text-sm font-semibold cursor-default"
                            whileHover={{scale:1.06,backgroundColor:'#ede9fe',borderColor:'#c4b5fd'}}>
                            {a}
                          </motion.span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </TiltCard>
              </SpotlightCard>
            </motion.div>

            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{once:true}} className="space-y-8">
              {[
                {grad:'from-purple-700 to-indigo-700',icon:'🏢',sub:'Staffing Agency',  title:'Settings We Cover',    items:AGENCY,     tag:'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100'},
                {grad:'from-violet-700 to-purple-700', icon:'💊',sub:'Health Expertise', title:'Conditions We Support', items:CONDITIONS,  tag:'bg-violet-50 text-violet-700 border-violet-100 hover:bg-violet-100'},
              ].map(c=>(
                <motion.div key={c.title} variants={cardV}>
                  <SpotlightCard className="rounded-3xl">
                    <TiltCard>
                      <motion.div className="bg-white rounded-3xl shadow-xl border border-purple-100 overflow-hidden"
                        whileHover={{boxShadow:'0 24px 48px rgba(124,58,237,0.12)'}}>
                        <div className={`bg-gradient-to-br ${c.grad} p-7 flex items-center gap-4`}>
                          <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center text-2xl">{c.icon}</div>
                          <div>
                            <p className="text-white/65 text-xs font-bold uppercase tracking-widest">{c.sub}</p>
                            <h3 className="text-xl font-black text-white">{c.title}</h3>
                          </div>
                        </div>
                        <div className="p-7">
                          <div className="flex flex-wrap gap-2">
                            {c.items.map(a=>(
                              <motion.span key={a} className={`px-3 py-1.5 border rounded-full text-sm font-semibold cursor-default ${c.tag}`} whileHover={{scale:1.05}}>
                                {a}
                              </motion.span>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    </TiltCard>
                  </SpotlightCard>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <WaveDivider fromColor="#faf5ff" toColor="#ffffff" flip/>

      {/* ── ACCOMMODATION ─────────────────────────────────────────────────── */}
      <section id="accommodation" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{once:true}} className="text-center mb-20">
            <Tag>Where We Support</Tag>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-5">Accommodation Options</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">All accommodation styles designed to maximise independence, comfort, and community belonging.</p>
          </motion.div>

          <motion.div className="grid md:grid-cols-3 gap-8" variants={stagger} initial="hidden" whileInView="visible" viewport={{once:true}}>
            {ACCOM.map(acc=>(
              <motion.div key={acc.title} variants={cardV}>
                <TiltCard className="h-full">
                  <SpotlightCard className="h-full rounded-3xl" size={300}>
                    <motion.div className="h-full rounded-3xl overflow-hidden border border-purple-100 shadow-lg bg-white"
                      whileHover={{y:-12,boxShadow:'0 40px 80px rgba(124,58,237,0.16)'}} transition={SPRING2}>
                      <div className={`bg-gradient-to-br ${acc.grad} p-8 text-white`}>
                        <motion.div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center text-3xl mb-5"
                          whileHover={{rotate:[-6,6,0],scale:1.1}} transition={{duration:0.4}}>
                          {acc.icon}
                        </motion.div>
                        <h3 className="text-2xl font-black mb-3">{acc.title}</h3>
                        <p className="text-white/70 text-sm leading-relaxed">{acc.desc}</p>
                      </div>
                      <div className="bg-white p-7">
                        <ul className="space-y-3">
                          {acc.features.map((f,i)=>(
                            <motion.li key={f} className="flex items-center gap-3 text-sm"
                              initial={{opacity:0,x:-12}} whileInView={{opacity:1,x:0}}
                              viewport={{once:true}} transition={{delay:i*0.07}}>
                              <span className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                                <svg className="w-3 h-3 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                              </span>
                              <span className="font-semibold text-slate-700">{f}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  </SpotlightCard>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <WaveDivider fromColor="#ffffff" toColor="#0d0218"/>

      {/* ── VALUES ───────────────────────────────────────────────────────── */}
      <section id="values" className="py-32 relative overflow-hidden grain" style={{background:'linear-gradient(145deg,#0d0218,#180a38,#0a0d2e)'}}>
        <div className="absolute inset-0 dot-grid"/>
        <motion.div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full pointer-events-none"
          animate={{scale:[1,1.15,1],opacity:[0.4,0.7,0.4]}} transition={{duration:9,repeat:Infinity,ease:'easeInOut'}}
          style={{background:'radial-gradient(circle,rgba(124,58,237,0.18) 0%,transparent 70%)'}}/>

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{once:true}} className="text-center mb-20">
            <Tag dark>What Drives Us</Tag>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-5">Our Core Values</h2>
            <p className="text-white/40 text-lg max-w-2xl mx-auto">Every care plan, every interaction, every decision — underpinned by these principles.</p>
          </motion.div>

          <motion.div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" variants={stagger} initial="hidden" whileInView="visible" viewport={{once:true}}>
            {VALUES.map(v=>(
              <motion.div key={v.title} variants={cardV}>
                <SpotlightCard className="h-full rounded-3xl" size={280}>
                  <motion.div className={`p-8 rounded-3xl border ${v.bg} ${v.border} h-full cursor-default`}
                    whileHover={{y:-10,scale:1.02,boxShadow:'0 28px 56px rgba(0,0,0,0.18)'}} transition={SPRING}>
                    <motion.div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${v.grad} flex items-center justify-center text-2xl mb-6 shadow-lg`}
                      whileHover={{rotate:12,scale:1.18}} transition={SPRING}>
                      {v.icon}
                    </motion.div>
                    <h3 className={`text-xl font-black mb-3 ${v.text}`}>{v.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{v.desc}</p>
                  </motion.div>
                </SpotlightCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <WaveDivider fromColor="#0d0218" toColor="#ffffff"/>

      {/* ── EOL ──────────────────────────────────────────────────────────── */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-24 items-center">
            <motion.div variants={slideL} initial="hidden" whileInView="visible" viewport={{once:true,margin:'-80px'}} className="relative">
              <div className="absolute -inset-8 bg-gradient-to-br from-purple-50 to-violet-100 rounded-[2.5rem] rotate-2"/>
              <motion.img src="/eol.png" alt="End of Life Care"
                className="relative rounded-3xl w-full object-cover shadow-2xl shadow-purple-200/50 max-h-[440px]"
                whileHover={{scale:1.03}} transition={{duration:0.45}}/>
              <motion.div className="absolute -bottom-6 -right-6 bg-white rounded-2xl shadow-xl shadow-purple-100/60 p-5 border border-purple-100"
                initial={{opacity:0,scale:0.75}} whileInView={{opacity:1,scale:1}}
                viewport={{once:true}} transition={{delay:0.35,...SPRING}}>
                <p className="text-2xl mb-1">🌹</p>
                <p className="text-purple-700 font-bold text-sm">Palliative & End of Life</p>
                <p className="text-slate-500 text-xs mt-0.5">Compassionate at every stage</p>
              </motion.div>
            </motion.div>

            <motion.div variants={slideR} initial="hidden" whileInView="visible" viewport={{once:true,margin:'-80px'}}>
              <Tag>Compassionate Support</Tag>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-7">
                End of Life<br/><span className="text-purple-600">& Palliative Care</span>
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed mb-5">Providing personalised care in the final months of life leads to a more meaningful experience — centred on what matters most to the individual and creates more sustainable services.</p>
              <p className="text-slate-500 text-lg leading-relaxed mb-10">Our specialist team upholds dignity in every moment, involves families, and respects individuals' deepest values.</p>
              <div className="space-y-4">
                {['Ostomy Care','Palliative Care','Ventilation & Breathing Support','Bowel Management','Catheter Care'].map((s,i)=>(
                  <motion.div key={s} className="flex items-center gap-3 cursor-default"
                    initial={{opacity:0,x:-20}} whileInView={{opacity:1,x:0}}
                    viewport={{once:true}} transition={{delay:i*0.08}}
                    whileHover={{x:8}}>
                    <motion.span className="w-2.5 h-2.5 rounded-full bg-purple-500 flex-shrink-0"
                      whileHover={{scale:2,backgroundColor:'#7c3aed'}} transition={SPRING}/>
                    <span className="text-slate-700 font-semibold">{s}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <WaveDivider fromColor="#ffffff" toColor="#faf5ff"/>

      {/* ── ACCREDITATIONS ───────────────────────────────────────────────── */}
      <section className="py-24 dot-grid-light relative" style={{background:'#faf5ff'}}>
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{once:true}} className="text-center mb-14">
            <Tag>Trusted & Accredited</Tag>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900">Recognised Standards</h2>
          </motion.div>
          <motion.div className="flex flex-wrap justify-center gap-10" variants={stagger} initial="hidden" whileInView="visible" viewport={{once:true}}>
            {[
              {src:'/cqc-good.jpg',label:'CQC Inspected & Rated Good',    glow:'rgba(124,58,237,0.18)'},
              {src:'/cqc-logo.jpg',label:'Care Quality Commission',         glow:'rgba(99,102,241,0.18)'},
              {src:'/ico-logo.png',label:"Information Commissioner's Office",glow:'rgba(109,40,217,0.18)'},
              {src:'/pqs-logo.png',label:'PQS SSIP Health & Safety',        glow:'rgba(139,92,246,0.18)'},
            ].map(b=>(
              <motion.div key={b.label} variants={cardV} className="text-center">
                <SpotlightCard className="rounded-2xl">
                  <motion.div className="bg-white rounded-2xl p-7 shadow-lg border border-purple-100 w-44"
                    whileHover={{y:-10,boxShadow:`0 24px 48px ${b.glow}`}} transition={SPRING}>
                    <motion.img src={b.src} alt={b.label}
                      className="h-20 object-contain mx-auto rounded-lg"
                      whileHover={{scale:1.1}} transition={SPRING}/>
                  </motion.div>
                </SpotlightCard>
                <p className="text-xs text-slate-500 font-semibold mt-3 max-w-[160px] mx-auto leading-snug">{b.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <WaveDivider fromColor="#faf5ff" toColor="#ffffff" flip/>

      {/* ── CAREERS ──────────────────────────────────────────────────────── */}
      <section id="careers" className="py-32 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-start">
            <motion.div variants={slideL} initial="hidden" whileInView="visible" viewport={{once:true}} className="lg:sticky lg:top-32">
              <Tag>Join the Team</Tag>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-7">
                Make a Real<br/><span className="text-purple-600">Difference Every Day</span>
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed mb-10">
                We're always looking for passionate, dedicated professionals. Whether experienced or just starting out — we'd love to hear from you.
              </p>
              <motion.div className="space-y-4" variants={stagger} initial="hidden" whileInView="visible" viewport={{once:true}}>
                {[
                  {icon:'💼',t:'Competitive Pay',    d:'Fair wages with regular reviews and overtime rates'},
                  {icon:'📚',t:'Ongoing Training',   d:'Fully funded training and career development pathways'},
                  {icon:'🕐',t:'Flexible Hours',     d:'Full-time, part-time, and bank shifts available'},
                  {icon:'🤝',t:'Supportive Culture', d:'A team that supports you as much as the residents'},
                ].map(b=>(
                  <motion.div key={b.t} variants={cardV}
                    className="flex items-start gap-4 p-5 rounded-2xl bg-purple-50 border border-purple-100 cursor-default"
                    whileHover={{x:6,backgroundColor:'rgba(124,58,237,0.07)',boxShadow:'0 8px 28px rgba(124,58,237,0.1)'}} transition={SPRING}>
                    <span className="text-2xl">{b.icon}</span>
                    <div><p className="font-bold text-slate-900">{b.t}</p><p className="text-sm text-slate-500 mt-0.5">{b.d}</p></div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div variants={slideR} initial="hidden" whileInView="visible" viewport={{once:true}}>
              <SpotlightCard className="rounded-3xl">
                <motion.div className="bg-white rounded-3xl shadow-2xl shadow-purple-100/60 border border-purple-100 overflow-hidden"
                  whileHover={{boxShadow:'0 40px 80px rgba(124,58,237,0.13)'}}>
                  <div className="relative bg-gradient-to-br from-purple-700 to-violet-800 px-8 py-10 overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-bl-full"/>
                    <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full"/>
                    <h3 className="relative text-2xl font-black text-white mb-1">Apply to Work With Us</h3>
                    <p className="relative text-purple-200 text-sm">Our team will be in touch shortly.</p>
                  </div>
                  <div className="p-8">
                    <AnimatePresence mode="wait">
                      {submitted?(
                        <motion.div key="ok" className="text-center py-14"
                          initial={{opacity:0,scale:0.88}} animate={{opacity:1,scale:1}} exit={{opacity:0}}>
                          <motion.div className="w-20 h-20 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg shadow-purple-100"
                            animate={{rotate:[0,8,-8,0]}} transition={{duration:0.5,delay:0.2}}>
                            ✓
                          </motion.div>
                          <h3 className="text-2xl font-black text-slate-900 mb-2">Application Received!</h3>
                          <p className="text-slate-400 mb-8">We'll review your details and be in touch shortly.</p>
                          <button onClick={()=>setSubmit(false)} className="text-purple-600 font-bold hover:underline">Submit another</button>
                        </motion.div>
                      ):(
                        <motion.form key="form" onSubmit={apply} className="space-y-5"
                          initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                          <div className="grid md:grid-cols-2 gap-4">
                            {[{l:'First Name *',f:'firstName',ph:'Jane',req:true},{l:'Last Name *',f:'lastName',ph:'Smith',req:true}].map(fi=>(
                              <div key={fi.f}>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{fi.l}</label>
                                <input required={fi.req} type="text" placeholder={fi.ph}
                                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-slate-800 font-medium text-sm"
                                  value={(form as any)[fi.f]} onChange={e=>setForm({...form,[fi.f]:e.target.value})}/>
                              </div>
                            ))}
                          </div>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email *</label>
                              <input required type="email" placeholder="jane@example.com"
                                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-slate-800 font-medium text-sm"
                                value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone</label>
                              <input type="tel" placeholder="07700 900000"
                                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-slate-800 font-medium text-sm"
                                value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Role *</label>
                            <select className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all bg-white text-slate-800 font-medium text-sm"
                              value={form.position} onChange={e=>setForm({...form,position:e.target.value})}>
                              {['Care Assistant','Senior Carer','Registered Nurse','Support Worker','Domestic Staff','Kitchen Staff','Management','Other'].map(o=><option key={o}>{o}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Message (optional)</label>
                            <textarea rows={3} className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-slate-800 font-medium text-sm resize-none"
                              placeholder="Tell us about yourself..." value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/>
                          </div>
                          <ShimmerBtn dark className="w-full px-8 py-4 text-base shadow-xl shadow-purple-500/25 disabled:opacity-60">
                            {loading?(
                              <span className="flex items-center gap-2">
                                <motion.svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:'linear'}}>
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                                </motion.svg>
                                Submitting...
                              </span>
                            ):'Submit Application →'}
                          </ShimmerBtn>
                        </motion.form>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </SpotlightCard>
            </motion.div>
          </div>
        </div>
      </section>

      <WaveDivider fromColor="#ffffff" toColor="#faf5ff"/>

      {/* ── CONTACT ──────────────────────────────────────────────────────── */}
      <section id="contact" className="py-32 dot-grid-light relative" style={{background:'#faf5ff'}}>
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{once:true}}>
            <Tag>Get In Touch</Tag>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-5">We'd Love to Hear From You</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto mb-16">Whether you're a family, a healthcare professional, or a prospective team member — we're here.</p>
          </motion.div>

          <motion.div className="grid sm:grid-cols-3 gap-6" variants={stagger} initial="hidden" whileInView="visible" viewport={{once:true}}>
            {[
              {icon:'📞',l:'Call Us',   v:'0116 456 7890',                    s:'Mon–Fri 9am–5pm'},
              {icon:'✉️',l:'Email Us',  v:'info@comprehensivecare.org.uk',     s:'We reply within 24 hours'},
              {icon:'📍',l:'Our Base',  v:'Leicester, UK',                     s:'Covering nationwide'},
            ].map(c=>(
              <motion.div key={c.l} variants={cardV}>
                <SpotlightCard className="rounded-3xl">
                  <motion.div className="bg-white rounded-3xl p-8 shadow-lg border border-purple-100 text-center cursor-default"
                    whileHover={{y:-12,boxShadow:'0 32px 64px rgba(124,58,237,0.14)'}} transition={SPRING}>
                    <motion.span className="text-5xl block mb-5"
                      whileHover={{scale:1.2,rotate:8}} transition={SPRING}>{c.icon}</motion.span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.22em] mb-2">{c.l}</p>
                    <p className="font-black text-slate-900 mb-1 text-sm break-all">{c.v}</p>
                    <p className="text-sm text-slate-400">{c.s}</p>
                  </motion.div>
                </SpotlightCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <WaveDivider fromColor="#faf5ff" toColor="#0d0218"/>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="pt-20 pb-10 grain" style={{background:'linear-gradient(160deg,#0d0218,#180a38,#0a0d2e)'}}>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <motion.div className="absolute inset-0 bg-purple-500/50 rounded-xl blur-xl"
                    animate={{opacity:[0.3,0.8,0.3]}} transition={{duration:2.5,repeat:Infinity}}/>
                  <img src="/cc-icon.jpg" alt="Comprehensive Care" className="relative w-11 h-11 rounded-xl object-contain"/>
                </div>
                <div>
                  <p className="font-black text-white text-lg leading-none">Comprehensive Care</p>
                  <p className="text-purple-400 text-[10px] font-bold tracking-[0.2em] uppercase">YOUR CARE OUR PRIORITY</p>
                </div>
              </div>
              <p className="text-white/30 text-sm leading-relaxed max-w-xs mb-8">A UK care provider and staffing agency dedicated to outstanding, person-centred care across a wide range of complex health needs.</p>
              <div className="flex items-center gap-3">
                {['/cqc-good.jpg','/ico-logo.png','/pqs-logo.png'].map(src=>(
                  <motion.img key={src} src={src} alt="" className="h-9 object-contain rounded-lg opacity-40"
                    whileHover={{opacity:1,scale:1.1}} transition={{duration:0.2}}/>
                ))}
              </div>
            </div>

            <div>
              <p className="text-white font-bold mb-5 text-xs uppercase tracking-[0.18em]">Services</p>
              <ul className="space-y-3 text-sm">
                {['Supported Living','Complex Care','End of Life Care','Respite Care','Staffing Agency','Domiciliary Care'].map(s=>(
                  <li key={s}><span className="text-white/30 hover:text-white/80 transition-colors cursor-default">{s}</span></li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-white font-bold mb-5 text-xs uppercase tracking-[0.18em]">Quick Links</p>
              <ul className="space-y-3 text-sm">
                {NAVLINKS.map(l=>(
                  <li key={l.id}>
                    <motion.button onClick={()=>scrollTo(l.id)} className="text-white/30"
                      whileHover={{color:'rgba(255,255,255,0.85)',x:4}}>
                      {l.label}
                    </motion.button>
                  </li>
                ))}
                <li>
                  <motion.a href="https://compcarehub.onrender.com/login"
                    className="text-purple-400 font-bold"
                    whileHover={{color:'#c084fc'}}>
                    Staff Login →
                  </motion.a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/8 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/20">
            <p>&copy; {new Date().getFullYear()} Comprehensive Care. All rights reserved.</p>
            <p>Registered in England & Wales · CQC Registered Provider</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
