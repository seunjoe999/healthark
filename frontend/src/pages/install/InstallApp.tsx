import React, { useEffect, useState } from 'react'
import { Share, Download, CheckCircle2, MoreVertical } from 'lucide-react'
import { getInstallPrompt, subscribeInstallPrompt, triggerInstall } from '../../utils/installPrompt'

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  )
}

// Dedicated, always-reachable "Download App" page — the pop-up install banner
// (InstallPrompt.tsx) only appears once per device per re-nag window and never
// fires at all on iOS/browsers that don't support beforeinstallprompt, so staff
// who dismissed it or whose browser never offered it had no other way to find
// install instructions. This page is linked from the sidebar under Notifications
// and always shows something actionable regardless of platform/browser state.
export default function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState(getInstallPrompt())
  const [installed, setInstalled] = useState(isInStandalone())
  const ios = isIOS()

  useEffect(() => {
    if (installed) return
    // Picks up an already-captured event immediately (the common case: the
    // browser offered install well before the user ever navigated to this
    // page), and stays subscribed in case it fires later on this page too.
    const unsubscribe = subscribeInstallPrompt(() => setDeferredPrompt(getInstallPrompt()))
    return unsubscribe
  }, [installed])

  async function install() {
    const outcome = await triggerInstall()
    if (outcome === 'accepted') setInstalled(true)
    if (outcome !== 'unavailable') setDeferredPrompt(null)
  }

  // Everything lives inside one white card, deliberately independent of the
  // app's dark/light theme toggle (same reasoning as the risk-level cards in
  // Medication Risk Assessment) — this is a one-off help page, not a themed
  // section of the app, so it's simpler and safer to guarantee readability
  // than to thread theme-aware colours through every line of it.
  return (
    <div className="max-w-lg mx-auto p-4 sm:p-6">
      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6">
      <div className="flex items-center gap-4 mb-6">
        <img src="/pwa-192.png" alt="CompCare" className="w-16 h-16 rounded-2xl shadow-md" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Download the App</h1>
          <p className="text-sm text-slate-500">Install CompCare Hub on this device</p>
        </div>
      </div>

      {installed ? (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-800 font-medium">You're already using the installed app on this device.</p>
        </div>
      ) : ios ? (
        <div className="rounded-2xl p-5 bg-white border border-slate-200 shadow-sm">
          <p className="text-sm font-semibold text-slate-700 mb-4">How to install on iPhone / iPad:</p>
          <div className="space-y-4">
            {[
              { step: '1', icon: <Share className="w-4 h-4 text-blue-500 flex-shrink-0" />, text: <>Tap the <strong>Share</strong> button at the bottom of Safari</> },
              { step: '2', icon: <span className="text-lg leading-none flex-shrink-0">⊕</span>, text: <>Scroll down and tap <strong>"Add to Home Screen"</strong></> },
              { step: '3', icon: <span className="text-lg leading-none flex-shrink-0">✓</span>, text: <>Tap <strong>Add</strong> in the top-right corner</> },
            ].map(({ step, icon, text }) => (
              <div key={step} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-amber-100 text-amber-700">{step}</div>
                {icon}
                <p className="text-sm text-slate-600">{text}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4">Note: this only works in Safari — Chrome and other browsers on iPhone/iPad can't install apps to the Home Screen.</p>
        </div>
      ) : deferredPrompt ? (
        <div className="rounded-2xl p-5 bg-white border border-slate-200 shadow-sm text-center">
          <p className="text-sm text-slate-600 mb-4">Your browser can install this app directly.</p>
          <button onClick={install}
            className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #e8b130, #d4961a)', color: '#0a0a0a' }}>
            <Download className="w-4 h-4" /> Add to Home Screen
          </button>
        </div>
      ) : (
        <div className="rounded-2xl p-5 bg-white border border-slate-200 shadow-sm">
          <p className="text-sm font-semibold text-slate-700 mb-4">How to install on Android:</p>
          <div className="space-y-4">
            {[
              { step: '1', icon: <MoreVertical className="w-4 h-4 text-slate-500 flex-shrink-0" />, text: <>Tap the <strong>⋮ menu</strong> (top-right of Chrome)</> },
              { step: '2', icon: <Download className="w-4 h-4 text-slate-500 flex-shrink-0" />, text: <>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></> },
              { step: '3', icon: <span className="text-lg leading-none flex-shrink-0">✓</span>, text: <>Confirm by tapping <strong>Install</strong></> },
            ].map(({ step, icon, text }) => (
              <div key={step} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-amber-100 text-amber-700">{step}</div>
                {icon}
                <p className="text-sm text-slate-600">{text}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4">If you don't see an install option, make sure you're using Chrome and try reloading this page first.</p>
        </div>
      )}
      </div>
    </div>
  )
}
