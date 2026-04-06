import { useEffect, useState, useRef } from 'react'
import { Volume2, X, Headphones, Play, Pause } from 'lucide-react'

interface QueueCallListeningProps {
  queueItemId: string
  patientName: string
  insuranceName?: string
  onClose: () => void
}

export default function QueueCallListening({
  queueItemId,
  patientName,
  insuranceName,
  onClose,
}: QueueCallListeningProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState<Array<{ speaker: string; text: string }>>([])
  const [callStatus, setCallStatus] = useState('connecting')
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasAudio, setHasAudio] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioChunksRef = useRef<Uint8Array[]>([])

  useEffect(() => {
    // Connect to voice agent SSE for real-time call updates
    const voiceAgentUrl = localStorage.getItem('voiceAgentUrl') || 'http://localhost:4100'
    const es = new EventSource(`${voiceAgentUrl}/agent/events`)

    es.onopen = () => {
      console.log('Connected to voice agent events')
      setIsListening(true)
      setCallStatus('connected')
    }

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        // Handle initial state
        if (data.type === 'init' && data.calls) {
          // Check if our queue item's call is active
          const activeCall = data.calls.find((call: any) => 
            call.metadata?.queueItemId === queueItemId
          )
          if (!activeCall) {
            setCallStatus('waiting')
          }
        }
        
        // Handle call events
        if (data.type === 'call:transcript' && data.roomName) {
          if (data.data?.speaker && data.data?.text) {
            setTranscript((prev) => [...prev, { speaker: data.data.speaker, text: data.data.text }])
          }
        }

        // Handle audio events - accumulate and auto-play
        if (data.type === 'call:audio' && data.data?.audioBase64) {
          try {
            // Decode base64 audio and append to chunks
            const binaryString = atob(data.data.audioBase64)
            const bytes = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i)
            }
            audioChunksRef.current.push(bytes)
            setHasAudio(true)
            console.log(`Audio chunk received (total: ${audioChunksRef.current.length} chunks, size: ${bytes.length} bytes)`)
            
            // Auto-play new audio chunk in real-time
            playAudioChunk(bytes)
          } catch (audioErr) {
            console.error('Failed to process audio chunk:', audioErr)
          }
        }
        
        if (data.type === 'call:ended') {
          setCallStatus('completed')
        }
      } catch (err) {
        console.error('Failed to parse SSE event:', err)
      }
    }

    es.onerror = () => {
      console.error('Voice agent connection error')
      setIsListening(false)
      setCallStatus('disconnected')
      es.close()
    }

    return () => {
      es.close()
    }
  }, [queueItemId])

  // Play individual audio chunk in real-time
  const playAudioChunk = (audioBytes: any) => {
    try {
      const audioBlob = new Blob([audioBytes], { type: 'audio/wav' })
      const blobUrl = URL.createObjectURL(audioBlob)
      
      if (audioRef.current) {
        // Store current playback time if already playing
        const currentTime = audioRef.current.currentTime || 0
        
        audioRef.current.src = blobUrl
        audioRef.current.play().catch((err) => {
          console.error('Failed to play audio chunk:', err)
        })
      }
    } catch (err) {
      console.error('Error creating audio blob:', err)
    }
  }

  const toggleAudio = () => {
    if (isPlaying) {
      audioRef.current?.pause()
      setIsPlaying(false)
      console.log('⏸️ Audio paused')
    } else {
      audioRef.current?.play().catch((err) => {
        console.error('Failed to resume audio:', err)
      })
      setIsPlaying(true)
      console.log('▶️ Audio playing')
    }
  }

  const getStatusColor = () => {
    switch (callStatus) {
      case 'connected':
        return 'text-green-600'
      case 'waiting':
        return 'text-amber-600'
      case 'disconnected':
        return 'text-red-600'
      case 'completed':
        return 'text-blue-600'
      default:
        return 'text-slate-600'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-brand-50 to-blue-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center">
              <Headphones size={20} className="text-brand-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Listening to Call</h2>
              <p className="text-sm text-slate-500">{patientName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition"
            title="Close"
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isListening ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className={`text-sm font-semibold capitalize ${getStatusColor()}`}>
              {callStatus === 'connected' && isListening && (
                <span className="flex items-center gap-1">
                  <Volume2 size={14} className="animate-pulse" />
                  Listening... Insurance verification in progress
                </span>
              )}
              {callStatus === 'waiting' && 'Waiting for call to be answered'}
              {callStatus === 'completed' && 'Call completed'}
              {callStatus === 'disconnected' && 'Disconnected'}
              {callStatus === 'connecting' && 'Connecting...'}
            </span>
          </div>
          
          {/* Audio Player */}
          <div className="flex items-center gap-2">
            <audio
              ref={audioRef}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            {hasAudio && (
              <div className="text-xs font-medium text-emerald-600 px-2 py-1 bg-emerald-50 rounded">
                Audio Live
              </div>
            )}
            <button
              onClick={toggleAudio}
              disabled={!hasAudio}
              className={`p-2 rounded-lg transition ${
                !hasAudio
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : isPlaying
                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                    : 'bg-green-100 text-green-600 hover:bg-green-200'
              }`}
              title={!hasAudio ? 'Waiting for audio...' : isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
          </div>
        </div>

        {/* Transcript Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50">
          {transcript.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center text-slate-500">
              <div>
                <Volume2 size={32} className="mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-medium">Waiting for conversation to begin...</p>
                <p className="text-xs mt-1">The insurance company's call will appear here</p>
              </div>
            </div>
          ) : (
            <>
              {insuranceName && (
                <div className="text-xs text-slate-500 italic text-center mb-4">
                  Call with: {insuranceName}
                </div>
              )}
              {transcript.map((entry, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${
                    entry.speaker === 'ai' ? 'justify-start' : 'justify-end'
                  }`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-xl ${
                      entry.speaker === 'ai'
                        ? 'bg-brand-100 text-brand-900 rounded-bl-none'
                        : 'bg-slate-200 text-slate-900 rounded-br-none'
                    }`}
                  >
                    <p className="text-sm">
                      <span className="font-semibold text-xs block mb-1">
                        {entry.speaker === 'ai' ? 'AI Agent' : 'Insurance Company'}
                      </span>
                      {entry.text}
                    </p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
