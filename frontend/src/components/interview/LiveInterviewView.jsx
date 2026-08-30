import React, { useEffect, useRef, useState, useCallback } from 'react'
import WaveformVisualizer from './WaveformVisualizer'
import CameraPiP from './CameraPiP'
import { getPollyAudio } from '../../lib/interviewService'

/**
 * LiveInterviewView (Stage 2) — Video-call style live conversational interview.
 *
 * Features:
 * - Central AI visualizer with Jarvis-like glowing rings & dynamic waveform.
 * - Live candidate PiP webcam overlay with real-time audio meter.
 * - Amazon Polly TTS + browser speech synthesis fallback.
 * - Real-time speech recognition with a clean answer review drawer.
 * - Adaptive multi-turn question flow.
 * - MediaRecorder WebRTC recording for post-interview video playback.
 */
export default function LiveInterviewView({
  sessionConfig,
  currentQuestion,
  currentQuestionIndex,
  totalQuestions,
  onAnswerSubmit,
  onFinalize,
  onExit,
  isProcessingTurn = false
}) {
  const { mediaStream, isVoiceOnly, targetRole, currentMilestone } = sessionConfig

  // State management
  const [aiState, setAiState] = useState('speaking') // 'speaking' | 'listening' | 'thinking' | 'review'
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(!isVoiceOnly)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [micLevel, setMicLevel] = useState(0)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [showReviewDrawer, setShowReviewDrawer] = useState(false)
  const [editedTranscript, setEditedTranscript] = useState('')

  // References
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const recognitionRef = useRef(null)
  const timerIntervalRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const pollyAudioRef = useRef(null)
  const currentQuestionStartTimeRef = useRef(Date.now())

  // Setup Web Audio Analyser for live mic level
  useEffect(() => {
    if (!mediaStream) return
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const audioCtx = new AudioCtx()
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 64
      const source = audioCtx.createMediaStreamSource(mediaStream)
      source.connect(analyser)

      audioContextRef.current = audioCtx
      analyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      let reqId
      const checkVolume = () => {
        if (!isMuted) {
          analyser.getByteFrequencyData(dataArray)
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
          setMicLevel(Math.min(1, (sum / dataArray.length) / 100))
        } else {
          setMicLevel(0)
        }
        reqId = requestAnimationFrame(checkVolume)
      }
      checkVolume()

      return () => {
        if (reqId) cancelAnimationFrame(reqId)
        if (audioCtx.state !== 'closed') audioCtx.close().catch(() => {})
      }
    } catch (e) {
      console.warn('AudioContext error:', e)
    }
  }, [mediaStream, isMuted])

  // Setup MediaRecorder for video/audio capture
  useEffect(() => {
    if (!mediaStream) return
    try {
      const mimeTypes = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
      const supportedMime = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || ''
      const recorder = new MediaRecorder(mediaStream, supportedMime ? { mimeType: supportedMime } : undefined)

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data)
        }
      }

      recorder.start(1000)
      mediaRecorderRef.current = recorder
    } catch (e) {
      console.warn('MediaRecorder initialization failed:', e)
    }

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [mediaStream])

  // Setup Live Elapsed Timer
  useEffect(() => {
    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1)
    }, 1000)

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }, [])

  // Speech Recognition Setup (Candidate Voice Input)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition not supported in this browser.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      let fullText = ''
      for (let i = 0; i < event.results.length; i++) {
        fullText += event.results[i][0].transcript + ' '
      }
      setCurrentTranscript(fullText.trim())
      setEditedTranscript(fullText.trim())
    }

    recognition.onerror = (err) => {
      console.warn('SpeechRecognition error:', err)
    }

    recognitionRef.current = recognition

    return () => {
      try {
        recognition.stop()
      } catch {}
    }
  }, [])

  // Play Question Audio (Polly Neural TTS -> fallback to SpeechSynthesis)
  const speakQuestion = useCallback(async (questionText) => {
    if (!questionText) return

    setAiState('speaking')
    currentQuestionStartTimeRef.current = Date.now()
    setCurrentTranscript('')
    setEditedTranscript('')
    setShowReviewDrawer(false)

    // Stop recognition while AI speaks
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    }

    // Try Amazon Polly TTS first
    try {
      const pollyAudioUrl = await getPollyAudio(questionText, 'Joanna')
      if (pollyAudioUrl) {
        if (pollyAudioRef.current) {
          pollyAudioRef.current.pause()
        }
        const audio = new Audio(pollyAudioUrl)
        pollyAudioRef.current = audio

        audio.onended = () => {
          setAiState('listening')
          if (recognitionRef.current && !isMuted) {
            try { recognitionRef.current.start() } catch {}
          }
        }

        audio.onerror = () => {
          fallbackSpeechSynthesis(questionText)
        }

        await audio.play()
        return
      }
    } catch {
      // Fallback
    }

    fallbackSpeechSynthesis(questionText)
  }, [isMuted])

  const fallbackSpeechSynthesis = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.0
      utterance.pitch = 1.0

      const voices = window.speechSynthesis.getVoices()
      const naturalVoice = voices.find(v => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen')) && v.lang.startsWith('en'))
      if (naturalVoice) utterance.voice = naturalVoice

      utterance.onend = () => {
        setAiState('listening')
        if (recognitionRef.current && !isMuted) {
          try { recognitionRef.current.start() } catch {}
        }
      }

      utterance.onerror = () => {
        setAiState('listening')
        if (recognitionRef.current && !isMuted) {
          try { recognitionRef.current.start() } catch {}
        }
      }

      window.speechSynthesis.speak(utterance)
    } else {
      setTimeout(() => {
        setAiState('listening')
        if (recognitionRef.current && !isMuted) {
          try { recognitionRef.current.start() } catch {}
        }
      }, 3500)
    }
  }

  // Trigger speech when question changes
  useEffect(() => {
    if (currentQuestion?.question) {
      speakQuestion(currentQuestion.question)
    }

    return () => {
      if (pollyAudioRef.current) pollyAudioRef.current.pause()
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    }
  }, [currentQuestion, speakQuestion])

  // React to isProcessingTurn
  useEffect(() => {
    if (isProcessingTurn) {
      setAiState('thinking')
    }
  }, [isProcessingTurn])

  // Finish speaking answer -> open review drawer
  const handleDoneSpeaking = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    }
    setShowReviewDrawer(true)
    setAiState('idle')
  }

  // Submit Answer to Adaptive Bedrock Loop
  const handleConfirmSubmit = () => {
    setShowReviewDrawer(false)
    const duration = Math.round((Date.now() - currentQuestionStartTimeRef.current) / 1000)
    const rawAnswer = editedTranscript?.trim() || currentTranscript?.trim() || ''
    const finalAnswer = rawAnswer === 'Candidate answered verbally.' ? '' : rawAnswer

    onAnswerSubmit({
      transcript: finalAnswer,
      durationSec: duration
    })
  }

  // Retry Recording Answer
  const handleRetryAnswer = () => {
    setCurrentTranscript('')
    setEditedTranscript('')
    setShowReviewDrawer(false)
    setAiState('listening')
    if (recognitionRef.current && !isMuted) {
      try { recognitionRef.current.start() } catch {}
    }
  }

  // Toggle Mute
  const handleToggleMute = () => {
    const nextMuted = !isMuted
    setIsMuted(nextMuted)
    if (mediaStream) {
      mediaStream.getAudioTracks().forEach(track => {
        track.enabled = !nextMuted
      })
    }
    if (nextMuted && recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    } else if (!nextMuted && aiState === 'listening' && recognitionRef.current) {
      try { recognitionRef.current.start() } catch {}
    }
  }

  // Toggle Camera
  const handleToggleCamera = () => {
    const nextCamera = !isCameraOn
    setIsCameraOn(nextCamera)
    if (mediaStream) {
      mediaStream.getVideoTracks().forEach(track => {
        track.enabled = nextCamera
      })
    }
  }

  // Finish & Exit early
  const handleFinishEarly = () => {
    if (pollyAudioRef.current) pollyAudioRef.current.pause()
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()

    let blob = null
    if (recordedChunksRef.current.length > 0) {
      blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
    }
    onFinalize({
      recordedBlob: blob,
      totalDurationSec: elapsedSeconds
    })
  }

  // Format MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div className="relative w-full h-[100dvh] min-h-[640px] bg-[#090d16] text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Dynamic Ambient Background Glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700 opacity-60"
        style={{
          background: aiState === 'speaking'
            ? 'radial-gradient(circle at 50% 45%, rgba(0, 113, 227, 0.25) 0%, rgba(9, 13, 22, 0) 65%)'
            : aiState === 'listening'
            ? 'radial-gradient(circle at 50% 45%, rgba(16, 185, 129, 0.22) 0%, rgba(9, 13, 22, 0) 65%)'
            : 'radial-gradient(circle at 50% 45%, rgba(139, 92, 246, 0.22) 0%, rgba(9, 13, 22, 0) 65%)'
        }}
      />

      {/* Top Header / Video Call Toolbar */}
      <header className="relative z-20 px-4 sm:px-8 py-4 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-md">
        {/* Left: Recording & Status Indicators */}
        <div className="flex items-center gap-3">
          {/* Red REC Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-bold font-mono tracking-wider shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span>REC {formatTime(elapsedSeconds)}</span>
          </div>

          {/* AI State Pill */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md border shadow-sm transition-colors duration-300"
            style={{
              backgroundColor: aiState === 'speaking' ? 'rgba(0, 113, 227, 0.2)' : aiState === 'listening' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(139, 92, 246, 0.2)',
              borderColor: aiState === 'speaking' ? 'rgba(56, 189, 248, 0.4)' : aiState === 'listening' ? 'rgba(52, 211, 153, 0.4)' : 'rgba(192, 132, 252, 0.4)',
              color: aiState === 'speaking' ? '#7dd3fc' : aiState === 'listening' ? '#6ee7b7' : '#d8b4fe'
            }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{
                backgroundColor: aiState === 'speaking' ? '#C9D0D6' : aiState === 'listening' ? '#34d399' : '#c084fc'
              }}
            />
            <span>
              {aiState === 'speaking' ? 'AI Interviewer Speaking (Polly/Bedrock)' : aiState === 'listening' ? 'Listening to your response...' : isProcessingTurn ? 'Bedrock is evaluating...' : 'Answer Review'}
            </span>
          </div>
        </div>

        {/* Center: Question Progress */}
        <div className="hidden md:flex flex-col items-center">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
            <span className="w-1 h-1 rounded-full bg-slate-500" />
            <span className="text-slate-300">{currentQuestion?.category || currentMilestone || 'Technical Assessment'}</span>
          </div>
          {/* Progress dots */}
          <div className="flex gap-1.5 mt-1.5">
            {Array.from({ length: totalQuestions }).map((_, i) => (
              <div
                key={i}
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  width: i === currentQuestionIndex ? 24 : 8,
                  backgroundColor: i < currentQuestionIndex ? '#34d399' : i === currentQuestionIndex ? '#C9D0D6' : 'rgba(255,255,255,0.2)'
                }}
              />
            ))}
          </div>
        </div>

        {/* Right: Exit / End Interview */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleFinishEarly}
            className="px-3.5 py-1.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
            <span>Finish Session</span>
          </button>
        </div>
      </header>

      {/* Main Center Stage: Abstract AI Interviewer Display */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center">
        {/* Dynamic Waveform Visualizer (Pulsing Orb with Concentric Rings) */}
        <div className="relative mb-6">
          <WaveformVisualizer
            state={aiState === 'speaking' ? 'speaking' : aiState === 'listening' ? 'listening' : 'thinking'}
            audioLevel={aiState === 'listening' ? micLevel : 0.45}
            analyser={analyserRef.current}
            size={300}
          />
        </div>

        {/* Spoken AI Question Prompt (Minimalist subtitle) */}
        <div className="max-w-2xl px-6 py-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl">
          <span className="text-xs uppercase font-extrabold tracking-widest text-[#C9D0D6] block mb-1">
            Question {currentQuestionIndex + 1}
          </span>
          <p className="text-base sm:text-lg font-medium text-slate-100 leading-snug">
            "{currentQuestion?.question || 'Preparing next question...'}"
          </p>
        </div>

        {/* Gentle Listening Feedback */}
        {aiState === 'listening' && (
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-3.5 py-1.5 rounded-full animate-pulse">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            </svg>
            <span>Listening to your microphone — speak freely, then click Done Speaking when finished...</span>
          </div>
        )}

        {/* Candidate Answer Review Drawer */}
        {showReviewDrawer && (
          <div className="mt-4 max-w-xl w-full bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-xl text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Your Recorded Answer
              </span>
              <span className="text-[11px] text-slate-400">
                You can review or edit before sending
              </span>
            </div>
            <textarea
              value={editedTranscript}
              onChange={(e) => setEditedTranscript(e.target.value)}
              placeholder="Candidate speech transcript..."
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs sm:text-sm text-slate-100 focus:outline-hidden focus:border-[#0071e3] resize-none h-20"
            />
            <div className="flex items-center justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={handleRetryAnswer}
                className="px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition-colors"
              >
                Re-Record Answer
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#0071e3] to-[#0066cc] text-white text-xs font-bold shadow-md hover:from-[#0077ed] hover:to-[#005bb5] transition-all flex items-center gap-1.5"
              >
                <span>Submit to AI</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Picture-in-Picture Webcam Overlay (Candidate Feed) */}
      <div className="absolute bottom-24 right-4 sm:right-8 z-30 pointer-events-auto">
        <CameraPiP
          mediaStream={mediaStream}
          isCameraOn={isCameraOn}
          isMuted={isMuted}
          audioLevel={micLevel}
          userName="Candidate (You)"
        />
      </div>

      {/* Bottom Control Bar */}
      <footer className="relative z-20 px-4 sm:px-8 py-4 bg-black/60 backdrop-blur-xl border-t border-white/10 flex items-center justify-between">
        {/* Left: Device Toggles */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mute Button */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              isMuted
                ? 'bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30'
                : 'bg-white/10 border-white/15 text-white hover:bg-white/20'
            }`}
          >
            {isMuted ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" /><line x1="12" y1="19" x2="12" y2="23" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" />
              </svg>
            )}
            <span>{isMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
          </button>

          {/* Camera Button */}
          <button
            type="button"
            onClick={handleToggleCamera}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              !isCameraOn
                ? 'bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30'
                : 'bg-white/10 border-white/15 text-white hover:bg-white/20'
            }`}
          >
            {!isCameraOn ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="1" y1="1" x2="23" y2="23" /><path d="m21 16-4-4v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1m6 0h4a2 2 0 0 1 2 2v2l4-4v10" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
              </svg>
            )}
            <span>{isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}</span>
          </button>
        </div>

        {/* Center: Done Speaking CTA */}
        <div className="flex items-center gap-3">
          {!showReviewDrawer && (
            <button
              type="button"
              onClick={handleDoneSpeaking}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0071e3] to-[#0066cc] hover:from-[#0077ed] hover:to-[#005bb5] text-white text-xs sm:text-sm font-bold shadow-[0_4px_15px_rgba(0,102,204,0.4)] transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Done Speaking (Review & Submit)</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>

        {/* Right: Exit / Return */}
        <div>
          <button
            type="button"
            onClick={onExit}
            className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel Interview
          </button>
        </div>
      </footer>
    </div>
  )
}
