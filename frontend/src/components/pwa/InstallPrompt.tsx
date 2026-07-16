import React, { useEffect, useState } from 'react'
import { Share } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'pwa_install_dismissed_at'
const INSTALLED_KEY = 'pwa_installed'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const INITIAL_DELAY_MS = 10_000

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  )
}

function shouldShowPrompt(): boolean {
  if (localStorage.getItem(INSTALLED_KEY) === '1') return false
  const dismissedAt = localStorage.getItem(DISMISS_KEY)
  if (!dismissedAt) return true
  return Date.now() - parseInt(dismissedAt, 10) > SEVEN_DAYS_MS
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [animateIn, setAnimateIn] = useState(false)
  const [platform, setPlatform] = useState<'android' | 'ios' | null>(null)

  function show(p: 'android' | 'ios') {
    setPlatform(p)
    setVisible(true)
    // Slight delay so the CSS transition plays on mount
    requestAnimationFrame(() => requestAnimationFrame(() => setAnimateIn(true)))
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    hide()
  }

  function hide() {
    setAnimateIn(false)
    setTimeout(() => setVisible(false), 300)
  }

  useEffect(() => {
    if (isInStandalone()) return
    if (!shouldShowPrompt()) return

    if (isIOS()) {
      const t = setTimeout(() => show('ios'), INITIAL_DELAY_MS)
      return () => clearTimeout(t)
    }

    let capturedPrompt: BeforeInstallPromptEvent | null = null

    const handler = (e: Event) => {
      e.preventDefault()
      capturedPrompt = e as BeforeInstallPromptEvent
      setDeferredPrompt(capturedPrompt)
      if (shouldShowPrompt()) {
        setTimeout(() => show('android'), INITIAL_DELAY_MS)
      }
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    if (outcome === 'accepted') {
      localStorage.setItem(INSTALLED_KEY, '1')
    } else {
      // User cancelled native dialog — treat same as dismiss
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    }
    hide()
  }

  if (!visible) return null

  return (
    <>
      {/* Scrim — tapping outside also dismisses */}
      <div
        className="fixed inset-0 z-[9998]"
        style={{
          background: 'rgba(0,0,0,0.45)',
          opacity: animateIn ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
        onClick={dismiss}
      />

      {/* Bottom-sheet card */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[9999]"
        style={{
          transform: animateIn ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Pill handle */}
        <div
          className="flex justify-center pt-2 pb-1"
          style={{ background: '#0f0f1f', borderRadius: '20px 20px 0 0' }}
        >
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
        </div>

        <div style={{ background: '#0f0f1f' }} className="px-5 pb-8 pt-2 safe-bottom relative">
          {/* Close button */}
          <button
            onClick={dismiss}
            aria-label="Close"
            className="absolute top-3 right-5 w-7 h-7 flex items-center justify-center rounded-full transition-colors"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {/* App row */}
          <div className="flex items-center gap-4 mb-5">
            <img
              src="/pwa-192.png"
              alt="CompCare"
              className="w-16 h-16 rounded-2xl flex-shrink-0"
              style={{ boxShadow: '0 4px 16px rgba(232,177,48,0.3)' }}
            />
            <div>
              <p className="text-white text-lg font-bold leading-tight">CompCare Hub</p>
              <p className="text-slate-400 text-sm mt-0.5">Care Home Management</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <svg key={i} className="w-3.5 h-3.5" fill="#e8b130" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="text-slate-400 text-xs ml-0.5">Free</span>
              </div>
            </div>
          </div>

          {/* Feature pills */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {['Works offline', 'Fast access', 'No browser bar'].map(f => (
              <span
                key={f}
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{ background: 'rgba(232,177,48,0.12)', color: '#e8b130', border: '1px solid rgba(232,177,48,0.25)' }}
              >
                {f}
              </span>
            ))}
          </div>

          {platform === 'ios' ? (
            <>
              {/* iOS instructions */}
              <div
                className="rounded-2xl p-4 mb-4"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <p className="text-slate-300 text-sm font-medium mb-3">How to install on iPhone / iPad:</p>
                <div className="space-y-3">
                  {[
                    { step: '1', icon: <Share className="w-4 h-4 text-blue-400 flex-shrink-0" />, text: <> Tap the <span className="text-white font-semibold">Share</span> button at the bottom of Safari</> },
                    { step: '2', icon: <span className="text-lg leading-none flex-shrink-0">⊕</span>, text: <> Scroll down and tap <span className="text-white font-semibold">"Add to Home Screen"</span></> },
                    { step: '3', icon: <span className="text-lg leading-none flex-shrink-0">✓</span>, text: <> Tap <span className="text-white font-semibold">Add</span> in the top-right corner</> },
                  ].map(({ step, icon, text }) => (
                    <div key={step} className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'rgba(232,177,48,0.2)', color: '#e8b130' }}
                      >
                        {step}
                      </div>
                      {icon}
                      <p className="text-slate-400 text-sm">{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={dismiss}
                className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}
              >
                Got it
              </button>
            </>
          ) : (
            <>
              {/* Android install button */}
              <button
                onClick={install}
                className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] mb-3"
                style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)', color: '#0a0a0a' }}
              >
                Add to Home Screen
              </button>
              <button
                onClick={dismiss}
                className="w-full py-3 rounded-2xl text-sm font-medium transition-all active:scale-[0.98]"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}
              >
                Not now
              </button>
              <p className="text-center mt-2">
                <button
                  onClick={dismiss}
                  className="text-xs transition-colors"
                  style={{ color: 'rgba(148,163,184,0.5)' }}
                >
                  Don't show for 7 days
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </>
  )
}
