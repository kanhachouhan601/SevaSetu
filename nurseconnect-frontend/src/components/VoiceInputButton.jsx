import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'

export default function VoiceInputButton({
  value = '',
  onChange,
  label = 'Speak',
  listeningLabel = 'Listening...',
  lang = 'hi-IN',
  className = '',
  activeClassName = '',
  idleClassName = '',
  onError,
}) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => () => recognitionRef.current?.stop(), [])

  function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      const message = 'Is browser me voice typing support nahi hai. Chrome/Edge me try karein.'
      onError?.(message)
      return
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
      setListening(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = lang
    recognition.interimResults = true
    recognition.continuous = false
    recognitionRef.current = recognition

    const initialValue = String(value || '').trim()
    let finalTranscript = ''

    recognition.onresult = (event) => {
      let interimTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) finalTranscript += transcript
        else interimTranscript += transcript
      }

      const spokenText = `${finalTranscript} ${interimTranscript}`.trim()
      if (spokenText) {
        onChange(`${initialValue ? `${initialValue} ` : ''}${spokenText}`)
      }
    }

    recognition.onerror = () => {
      onError?.('Mic permission allow karke dobara try karein.')
      setListening(false)
      recognitionRef.current = null
    }

    recognition.onend = () => {
      setListening(false)
      recognitionRef.current = null
    }

    setListening(true)
    onError?.('')
    recognition.start()
  }

  return (
    <button
      type="button"
      onClick={startVoiceInput}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
        listening
          ? activeClassName || 'border-red-200 bg-red-50 text-red-600'
          : idleClassName || 'border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100'
      } ${className}`}
    >
      {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
      {listening ? listeningLabel : label}
    </button>
  )
}
