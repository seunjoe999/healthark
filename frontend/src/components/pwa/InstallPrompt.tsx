import React, { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Only show if user hasn't dismissed before
      if (!localStorage.getItem('pwa-dismissed')) {
        setVisible(true)
      }
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setVisible(false)
    setDeferredPrompt(null)
  }

  function dismiss() {
    setVisible(false)
    localStorage.setItem('pwa-dismissed', '1')
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-6 md:w-80">
      <div className="rounded-2xl p-4 flex items-start gap-3 shadow-2xl"
        style={{ background: '#111', border: '1px solid rgba(232,177,48,0.35)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
          <Download className="w-5 h-5 text-slate-900" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold">Install CompCare Hub</p>
          <p className="text-slate-400 text-xs mt-0.5">Add to your home screen for quick access</p>
          <div className="flex gap-2 mt-3">
            <button onClick={install}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-900 transition-all"
              style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)' }}>
              Install
            </button>
            <button onClick={dismiss}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 transition-all"
              style={{ background: '#1a1a1a' }}>
              Not now
            </button>
          </div>
        </div>
        <button onClick={dismiss} className="text-slate-500 hover:text-slate-300 transition-colors mt-0.5">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
