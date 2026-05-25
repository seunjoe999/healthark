import React, { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  )
}

function wasDismissedRecently() {
  const ts = localStorage.getItem('pwa-dismissed-at')
  if (!ts) return false
  // Re-show after 3 days
  return Date.now() - parseInt(ts) < 3 * 24 * 60 * 60 * 1000
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [platform, setPlatform] = useState<'android' | 'ios' | null>(null)

  useEffect(() => {
    // Already installed as PWA — never show
    if (isInStandalone()) return
    // User dismissed recently — don't show yet
    if (wasDismissedRecently()) return

    if (isIOS()) {
      // iOS: show after a short delay with manual instructions
      const t = setTimeout(() => {
        setPlatform('ios')
        setVisible(true)
      }, 4000)
      return () => clearTimeout(t)
    }

    // Android / Chrome: wait for browser event
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setPlatform('android')
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setVisible(false)
      localStorage.removeItem('pwa-dismissed-at')
    }
    setDeferredPrompt(null)
  }

  function dismiss() {
    setVisible(false)
    localStorage.setItem('pwa-dismissed-at', String(Date.now()))
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:bottom-6 md:left-auto md:right-6 md:w-88">
      <div
        className="rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: '#0f0f1a', border: '1px solid rgba(232,177,48,0.4)' }}
      >
        {/* Gold top bar */}
        <div style={{ background: 'linear-gradient(90deg, #e8b130, #d4961a)', height: 3 }} />

        <div className="p-4 flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}
          >
            {platform === 'ios' ? (
              <Share className="w-5 h-5 text-slate-900" />
            ) : (
              <Download className="w-5 h-5 text-slate-900" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold leading-snug">
              Add CompCare to your home screen
            </p>

            {platform === 'ios' ? (
              <div className="mt-2 space-y-1">
                <p className="text-slate-400 text-xs leading-relaxed">
                  Tap the{' '}
                  <span className="text-white font-semibold inline-flex items-center gap-0.5">
                    <Share className="w-3 h-3 inline" /> Share
                  </span>{' '}
                  button at the bottom of Safari, then tap{' '}
                  <span className="text-white font-semibold">"Add to Home Screen"</span>.
                </p>
                <button
                  onClick={dismiss}
                  className="mt-2 text-xs text-slate-500 hover:text-slate-300 transition-colors underline"
                >
                  Got it, thanks
                </button>
              </div>
            ) : (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={install}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-900 transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}
                >
                  Install
                </button>
                <button
                  onClick={dismiss}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 transition-all"
                  style={{ background: '#1a1a2e' }}
                >
                  Not now
                </button>
              </div>
            )}
          </div>

          <button
            onClick={dismiss}
            className="text-slate-500 hover:text-slate-300 transition-colors mt-0.5 flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
