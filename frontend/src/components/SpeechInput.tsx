import React from 'react'
import { Mic, MicOff } from 'lucide-react'
import { useSpeechRecognition } from './ui/SpeechButton'

interface SpeechInputProps {
  onTranscript: (text: string) => void
  className?: string
}

export default function SpeechInput({ onTranscript, className }: SpeechInputProps) {
  const { listening, interim, start, stop, supported } = useSpeechRecognition(onTranscript)

  if (!supported) return null

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={listening ? stop : start}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          listening
            ? 'bg-red-500 text-white shadow-md'
            : 'text-white shadow-sm'
        } ${className}`}
        style={listening ? {} : { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
        title={listening ? 'Tap to stop recording' : 'Tap to dictate'}
      >
        {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        {listening ? 'Stop' : 'Voice'}
      </button>
      {listening && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-400 rounded-full animate-ping" />
      )}
      {interim && (
        <div className="absolute bottom-full mb-1 left-0 bg-slate-800 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap max-w-[220px] truncate z-50">
          {interim}
        </div>
      )}
    </div>
  )
}
