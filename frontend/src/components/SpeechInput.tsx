import React, { useRef, useState } from 'react'
import { Mic, MicOff, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface SpeechInputProps {
  onTranscript: (text: string) => void
  className?: string
}

export default function SpeechInput({ onTranscript, className }: SpeechInputProps) {
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  const startListening = () => {
    // Check browser support for Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-GB'

    recognition.onstart = () => {
      setIsListening(true)
      toast.success('Listening...')
    }

    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      if (transcript) {
        onTranscript(transcript)
        toast.success('Text added')
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error)
      toast.error(`Speech error: ${event.error}`)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
    recognitionRef.current = recognition
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  return (
    <button
      type="button"
      onClick={isListening ? stopListening : startListening}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded transitions-colors ${
        isListening
          ? 'bg-red-100 text-red-700 hover:bg-red-200'
          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
      } ${className}`}
      title="Click to record voice, click again to stop"
    >
      {isListening ? (
        <>
          <MicOff className="w-4 h-4" />
          <span className="text-xs font-medium">Stop</span>
        </>
      ) : (
        <>
          <Mic className="w-4 h-4" />
          <span className="text-xs font-medium">Voice</span>
        </>
      )}
    </button>
  )
}
