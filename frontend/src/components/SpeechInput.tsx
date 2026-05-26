import React, { useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'
import toast from 'react-hot-toast'

interface SpeechInputProps {
  onTranscript: (text: string) => void
  className?: string
}

export default function SpeechInput({ onTranscript, className }: SpeechInputProps) {
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const toastRef = useRef<string | null>(null)

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error('Speech not supported — use Chrome or Edge')
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = false
      recognition.lang = 'en-GB'
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        setIsListening(true)
        toastRef.current = toast.loading('Listening… speak now, tap Stop when done', { duration: 60000 })
      }

      recognition.onresult = (event: any) => {
        let transcript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) transcript += event.results[i][0].transcript + ' '
        }
        if (transcript.trim()) {
          onTranscript(transcript.trim())
          if (toastRef.current) toast.dismiss(toastRef.current)
          toastRef.current = toast.success('Added: "' + transcript.trim().slice(0, 40) + (transcript.trim().length > 40 ? '…' : '') + '"', { duration: 3000 })
        }
      }

      recognition.onerror = (event: any) => {
        if (toastRef.current) toast.dismiss(toastRef.current)
        setIsListening(false)
        const msgs: Record<string, string> = {
          'not-allowed': 'Microphone access denied — allow it in your browser settings',
          'no-speech': 'No speech detected — try speaking louder',
          'network': 'Network error — check your connection',
          'audio-capture': 'No microphone found',
          'aborted': '',
        }
        const msg = msgs[event.error]
        if (msg) toast.error(msg)
      }

      recognition.onend = () => {
        if (toastRef.current) toast.dismiss(toastRef.current)
        setIsListening(false)
      }

      recognition.start()
      recognitionRef.current = recognition
    } catch (e) {
      toast.error('Could not start speech recognition')
    }
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    if (toastRef.current) toast.dismiss(toastRef.current)
    setIsListening(false)
  }

  return (
    <button
      type="button"
      onClick={isListening ? stopListening : startListening}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
        isListening
          ? 'bg-red-500 text-white animate-pulse shadow-md'
          : 'text-white shadow-sm'
      } ${className}`}
      style={isListening ? {} : { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
      title={isListening ? 'Tap to stop recording' : 'Tap to dictate'}
    >
      {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
      {isListening ? 'Stop' : 'Voice'}
    </button>
  )
}
