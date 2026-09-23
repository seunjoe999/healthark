import React, { useEffect, useState } from 'react'
import { Share, Download, CheckCircle2, MoreVertical, AlertTriangle, Copy } from 'lucide-react'
import { getInstallPrompt, subscribeInstallPrompt, triggerInstall } from '../../utils/installPrompt'
import toast from 'react-hot-toast'

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

// Apple only lets Safari itself install a home-screen app — Chrome, Firefox and
// Edge on iOS are all still WebKit under the hood (Apple requires it) but Apple
// withholds the "Add to Home Screen" install capability from them specifically.
// Staff opening this page in Chrome on an iPhone would previously just see the
// Safari steps with an easy-to-miss footnote explaining why they don't apply —
// this makes "you're in the wrong browser" the headline instead.
function isNonSafariIOSBrowser() {
  return /CriOS|FxiOS|EdgiOS|OPiOS/i.test(navigator.userAgent)
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
  const wrongIOSBrowser = ios && isNonSafariIOSBrowser()

  function copyLink() {
    navigator.clipboard?.writeText(window.location.origin).then(
      () => toast.success('Link copied — paste it into Safari\'s address bar'),
      () => toast.error('Could not copy — type compcarehub.co.uk into Safari manually')
    )
  }

  useEffect(() => {
    if (installed) return
    // Picks up an already-captured event immediately (the common case: the
    // browser offered install well before the user ever navigated to this
    // page), and stays subscribed in case it fires later on this page too.
    const unsubscribe = subscribeInstallPrompt(() => setDeferredPrompt(getInstallPrompt()))
    return unsubscribe
  }, [installed])

  async function install() {
    try {
      const outcome = await triggerInstall()
      if (outcome === 'accepted') setInstalled(true)
      if (outcome === 'unavailable') {
        toast.error('Install option is no longer available — use your browser menu instead.')
      }
      setDeferredPrompt(null)
    } catch (err: any) {
      setDeferredPrompt(null)
      toast.error(`Couldn't install automatically (${err?.message || err?.name || 'unknown error'}). Use your browser's menu → "Install app" or "Add to Home screen" instead.`)
    }
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
          {wrongIOSBrowser && (
            <div className="mb-5 p-4 rounded-2xl bg-amber-50 border-2 border-amber-300">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <p className="text-sm font-bold text-amber-900">You're using Chrome — switch to Safari first</p>
              </div>
              <p className="text-xs text-amber-800 mb-3">Apple only allows Safari to install apps to the Home Screen on iPhone/iPad. Open this same page in Safari, then follow the steps below.</p>
              <button onClick={copyLink}
                className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-amber-600 text-white hover:bg-amber-700 transition-colors">
                <Copy className="w-4 h-4" /> Copy link to paste into Safari
              </button>
            </div>
          )}
          {/* iOS has no JS API to trigger "Add to Home Screen" — Apple withholds
              it from every website, on every browser, for everyone. There is no
              button we can build that does this in one tap; the only path is
              Safari's own Share icon. This big pulsing callout exists because
              staff kept missing that first tap — step 1 is the one that actually
              needs finding, steps 2-3 are inside a menu they've now opened. */}
          <div className="mb-5 p-4 rounded-2xl border-2 border-blue-300 bg-blue-50 text-center">
            <p className="text-sm font-bold text-blue-900 mb-2">Step 1 — look at the very bottom of your screen right now</p>
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-14 h-14 rounded-2xl bg-white border-2 border-blue-400 shadow-md flex items-center justify-center animate-bounce">
                <Share className="w-7 h-7 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-blue-800">That square with the <strong>up arrow ⬆️</strong> — tap it now</p>
          </div>
          <p className="text-sm font-semibold text-slate-700 mb-4">Then:</p>
          <div className="space-y-4">
            {[
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
          <p className="text-xs text-slate-400 mt-4">Note: this only works in Safari — Chrome and other browsers on iPhone/iPad can't install apps to the Home Screen. This is an Apple restriction that applies to every app like this one, not something specific to CompCare Hub.</p>
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
