import React, { useState, useRef, useEffect } from 'react'
import { Mic, Square } from 'lucide-react'
import toast from 'react-hot-toast'

declare global {
  interface Window { SpeechRecognition: any; webkitSpeechRecognition: any }
}

export function useSpeechRecognition(onFinalTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const shouldRunRef = useRef(false)
  const recRef = useRef<any>(null)
  const callbackRef = useRef(onFinalTranscript)
  useEffect(() => { callbackRef.current = onFinalTranscript }, [onFinalTranscript])

  const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  // kept in a ref so the recursive onend closure always calls the latest version
  const startRef = useRef<() => void>(() => {})

  startRef.current = function startRecognition() {
    if (!shouldRunRef.current) return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return

    // abort any lingering instance
    try { recRef.current?.abort() } catch {}

    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-GB'
    rec.maxAlternatives = 1

    rec.onstart = () => setListening(true)

    rec.onresult = (e: any) => {
      let finalText = ''
      let interimText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + ' '
        else interimText += e.results[i][0].transcript
      }
      if (finalText.trim()) callbackRef.current(finalText.trim())
      setInterim(interimText)
    }

    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed') {
        toast.error('Microphone access denied — allow it in your browser settings')
        shouldRunRef.current = false
        setListening(false)
        setInterim('')
      } else if (e.error === 'audio-capture') {
        toast.error('No microphone found — check your device settings')
        shouldRunRef.current = false
        setListening(false)
        setInterim('')
      }
      // aborted / no-speech / network → let onend handle restart
    }

    rec.onend = () => {
      setInterim('')
      if (shouldRunRef.current) {
        // Browser auto-stopped (silence timeout) — restart seamlessly
        setTimeout(() => startRef.current(), 200)
      } else {
        setListening(false)
      }
    }

    try {
      rec.start()
      recRef.current = rec
    } catch {
      if (shouldRunRef.current) setTimeout(() => startRef.current(), 500)
      else setListening(false)
    }
  }

  const start = () => {
    if (!supported) {
      toast.error('Voice input requires Chrome or Edge browser')
      return
    }
    shouldRunRef.current = true
    startRef.current()
  }

  const stop = () => {
    shouldRunRef.current = false
    setListening(false)
    setInterim('')
    try { recRef.current?.stop() } catch {}
  }

  // clean up on unmount / page navigation
  useEffect(() => {
    return () => {
      shouldRunRef.current = false
      try { recRef.current?.abort() } catch {}
    }
  }, [])

  return { listening, interim, start, stop, supported }
}

interface SpeechButtonProps {
  onTranscript: (text: string) => void
  className?: string
}

export default function SpeechButton({ onTranscript, className = '' }: SpeechButtonProps) {
  const { listening, interim, start, stop, supported } = useSpeechRecognition(onTranscript)

  if (!supported) {
    return (
      <button type="button"
        onClick={() => toast.error('Voice input requires Chrome or Edge browser')}
        title="Speech-to-text not supported — use Chrome or Edge"
        className={`flex-shrink-0 p-2 rounded-lg bg-slate-200 text-slate-400 cursor-not-allowed ${className}`}>
        <Mic className="w-4 h-4" />
      </button>
    )
  }

  return (
    <div className="relative">
      <button type="button"
        onClick={listening ? stop : start}
        title={listening ? 'Stop recording' : 'Click to dictate'}
        className={`flex-shrink-0 p-2 rounded-lg transition-all ${
          listening
            ? 'bg-red-500 text-white shadow-md'
            : 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
        } ${className}`}>
        {listening
          ? <Square className="w-4 h-4" />
          : <Mic className="w-4 h-4" />}
      </button>
      {listening && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
      )}
      {interim && (
        <div className="absolute bottom-full mb-1 right-0 bg-slate-800 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap max-w-[200px] truncate z-50">
          {interim}
        </div>
      )}
    </div>
  )
}

export function SpeechTextarea({
  label, value, onChange, rows = 3, placeholder, required, className = '', hint,
}: {
  label?: string; value: string; onChange: (v: string) => void
  rows?: number; placeholder?: string; required?: boolean; className?: string; hint?: string
}) {
  const { listening, interim, start, stop, supported } = useSpeechRecognition(
    text => onChange(value ? `${value} ${text}` : text)
  )

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className="label mb-0">{label}{required && ' *'}</label>
          {supported && (
            <button type="button"
              onClick={listening ? stop : start}
              className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-all ${
                listening
                  ? 'bg-red-100 text-red-700 border border-red-300'
                  : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
              }`}>
              {listening
                ? <><Square className="w-3 h-3" /> Stop</>
                : <><Mic className="w-3 h-3" /> Dictate</>}
            </button>
          )}
        </div>
      )}
      <div className="relative">
        <textarea
          className={`input w-full ${listening ? 'border-purple-400 ring-1 ring-purple-300' : ''} ${className}`}
          rows={rows}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={listening ? (interim || 'Listening… speak now') : placeholder}
          required={required}
        />
        {listening && (
          <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-purple-600 bg-purple-50 rounded px-1.5 py-0.5">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping inline-block" />
            {interim ? `"${interim.slice(0, 30)}${interim.length > 30 ? '…' : ''}"` : 'Listening…'}
          </div>
        )}
      </div>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}
