import React, { useState, useRef, useCallback } from 'react'
import { Mic, Square } from 'lucide-react'

interface SpeechButtonProps {
  onTranscript: (text: string) => void
  className?: string
}

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export default function SpeechButton({ onTranscript, className = '' }: SpeechButtonProps) {
  const [listening, setListening] = useState(false)
  const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  const recRef = useRef<any>(null)

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    try {
      const rec = new SR()
      rec.continuous = true
      rec.interimResults = false
      rec.lang = 'en-GB'
      rec.maxAlternatives = 1
      rec.onstart = () => setListening(true)
      rec.onresult = (e: any) => {
        let text = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) text += e.results[i][0].transcript + ' '
        }
        if (text.trim()) onTranscript(text.trim())
      }
      rec.onend = () => setListening(false)
      rec.onerror = (e: any) => {
        setListening(false)
        if (e.error === 'not-allowed') alert('Microphone access denied. Please allow microphone in your browser settings.')
      }
      rec.start()
      recRef.current = rec
    } catch { setListening(false) }
  }, [onTranscript])

  const stop = useCallback(() => {
    recRef.current?.stop()
    setListening(false)
  }, [])

  if (!supported) {
    return (
      <button
        type="button"
        disabled
        title="Speech-to-text not supported in this browser (use Chrome or Edge)"
        className={`flex-shrink-0 p-2 rounded-lg bg-slate-200 text-slate-400 cursor-not-allowed ${className}`}
      >
        <Mic className="w-4 h-4" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      title={listening ? 'Stop recording' : 'Click to dictate'}
      className={`flex-shrink-0 p-2 rounded-lg transition-all ${listening
        ? 'bg-red-500 text-white animate-pulse shadow-md'
        : 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
      } ${className}`}
    >
      {listening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </button>
  )
}

export function SpeechTextarea({
  label, value, onChange, rows = 3, placeholder, required, className = '',
}: {
  label?: string; value: string; onChange: (v: string) => void;
  rows?: number; placeholder?: string; required?: boolean; className?: string
}) {
  return (
    <div>
      {label && <label className="label">{label}{required && ' *'}</label>}
      <div className="flex gap-2 items-start">
        <textarea
          className={`input flex-1 ${className}`}
          rows={rows}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
        />
        <SpeechButton onTranscript={text => onChange(value ? `${value} ${text}` : text)} />
      </div>
    </div>
  )
}
