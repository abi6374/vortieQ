import React, { useEffect, useRef, useState, useCallback } from 'react'
import WaveformVisualizer from './WaveformVisualizer'
import CameraPiP from './CameraPiP'
import { getPollyAudio } from '../../lib/interviewService'

/**
 * LiveInterviewView (Stage 2) — Video-call style live conversational interview.
 *
 * Features:
 * - Adaptive light & dark theme styling consistent with PathFinder design tokens.
 * - Persistent candidate camera PiP in bottom-right corner with live hardware status.
 * - Dynamic waveform visualizer responsive to audio levels.
 * - Amazon Polly TTS + robust browser speech synthesis fallback.
 * - Resilient SpeechRecognition & MediaRecorder error handling.
 * - Fully responsive cross-device support (Mobile, Tablet, Desktop).
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
  const { mediaStream, isVoiceOnly, targetRole, currentMilestone } = sessionConfig || {}

  // State management
  const [aiState, setAiState] = useState('speaking') // 'speaking' | 'listening' | 'thinking' | 'idle'
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
  const speechFallbackTimerRef = useRef(null)

  // Ensure camera tracks remain active and enabled on mount
  useEffect(() => {
    if (mediaStream) {
      mediaStream.getVideoTracks().forEach(track => {
        track.enabled = !isVoiceOnly
      })
      mediaStream.getAudioTracks().forEach(track => {
        track.enabled = true
      })
    }
  }, [mediaStream, isVoiceOnly])

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

  // Setup MediaRecorder for video/audio capture with robust MIME type detection
  useEffect(() => {
    if (!mediaStream || typeof MediaRecorder === 'undefined') return
    const activeTracks = mediaStream.getTracks().filter(t => t.readyState === 'live')
    if (activeTracks.length === 0) return

    try {
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4'
      ]
      let selectedMime = ''
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime
          break
        }
      }

      const recorder = new MediaRecorder(mediaStream, selectedMime ? { mimeType: selectedMime } : undefined)

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data)
        }
      }

      recorder.onerror = (e) => {
        console.warn('MediaRecorder error event:', e)
      }

      if (recorder.state === 'inactive') {
        recorder.start(1000)
      }
      mediaRecorderRef.current = recorder
    } catch (e) {
      console.warn('MediaRecorder initialization notice (audio/video recording disabled):', e)
    }

    return () => {
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop()
        }
      } catch {}
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

  // Speech Recognition Setup (Candidate Voice Input) with auto-recovery
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition not supported in this browser.')
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event) => {
        let fullText = ''
        for (let i = 0; i < event.results.length; i++) {
          fullText += event.results[i][0].transcript + ' '
        }
        const clean = fullText.trim()
        setCurrentTranscript(clean)
        setEditedTranscript(clean)
      }

      recognition.onerror = (err) => {
        // Ignore non-fatal recognition events
        if (err.error !== 'no-speech' && err.error !== 'aborted') {
          console.warn('SpeechRecognition notice:', err.error)
        }
      }

      recognitionRef.current = recognition
    } catch (e) {
      console.warn('SpeechRecognition init notice:', e)
    }

    return () => {
      try {
        if (recognitionRef.current) recognitionRef.current.stop()
      } catch {}
    }
  }, [])

  // Fallback Web Speech API Synthesis with safety timer
  const fallbackSpeechSynthesis = useCallback((text) => {
    if (speechFallbackTimerRef.current) clearTimeout(speechFallbackTimerRef.current)

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel()
        if (window.speechSynthesis.paused) window.speechSynthesis.resume()

        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 1.0
        utterance.pitch = 1.0

        const voices = window.speechSynthesis.getVoices()
        const naturalVoice = voices.find(v =>
          (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Zira')) &&
          v.lang.startsWith('en')
        )
        if (naturalVoice) utterance.voice = naturalVoice

        const onFinished = () => {
          if (speechFallbackTimerRef.current) clearTimeout(speechFallbackTimerRef.current)
          setAiState('listening')
          if (recognitionRef.current && !isMuted) {
            try { recognitionRef.current.start() } catch {}
          }
        }

        utterance.onend = onFinished
        utterance.onerror = onFinished

        // Safety fallback timer in case browser autoplay blocks synthesis
        const estimatedDurationMs = Math.min(10000, Math.max(3000, text.length * 55))
        speechFallbackTimerRef.current = setTimeout(onFinished, estimatedDurationMs)

        window.speechSynthesis.speak(utterance)
        return
      } catch (err) {
        console.warn('SpeechSynthesis error:', err)
      }
    }

    // If synthesis is unavailable, transition gracefully after brief delay
    speechFallbackTimerRef.current = setTimeout(() => {
      setAiState('listening')
      if (recognitionRef.current && !isMuted) {
        try { recognitionRef.current.start() } catch {}
      }
    }, 2800)
  }, [isMuted])

  // Play Question Audio (Polly Neural TTS -> Fallback SpeechSynthesis)
  const speakQuestion = useCallback(async (questionText) => {
    if (!questionText) return

    setAiState('speaking')
    currentQuestionStartTimeRef.current = Date.now()
    setCurrentTranscript('')
    setEditedTranscript('')
    setShowReviewDrawer(false)

    // Stop candidate recognition while AI speaks
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
      // Fall through to browser speech synthesis
    }

    fallbackSpeechSynthesis(questionText)
  }, [isMuted, fallbackSpeechSynthesis])

  // Trigger speech when question changes
  useEffect(() => {
    if (currentQuestion?.question) {
      speakQuestion(currentQuestion.question)
    }

    return () => {
      if (speechFallbackTimerRef.current) clearTimeout(speechFallbackTimerRef.current)
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
    if (speechFallbackTimerRef.current) clearTimeout(speechFallbackTimerRef.current)
    if (pollyAudioRef.current) pollyAudioRef.current.pause()
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()

    let blob = null
    if (recordedChunksRef.current.length > 0) {
      try {
        blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
      } catch {}
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
    <div className="relative w-full h-[100dvh] min-h-[600px] bg-[#F5F5F7] dark:bg-[#090D16] text-[#1D1D1F] dark:text-[#F5F5F7] flex flex-col justify-between overflow-hidden select-none font-['Inter',sans-serif] transition-colors duration-300">
      {/* Dynamic Ambient Background Glow (Harmonious in Light & Dark Mode) */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700 opacity-60 dark:opacity-75"
        style={{
          background: aiState === 'speaking'
            ? 'radial-gradient(circle at 50% 45%, rgba(0, 102, 204, 0.12) 0%, rgba(245, 245, 247, 0) 65%)'
            : aiState === 'listening'
            ? 'radial-gradient(circle at 50% 45%, rgba(16, 185, 129, 0.12) 0%, rgba(245, 245, 247, 0) 65%)'
            : 'radial-gradient(circle at 50% 45%, rgba(139, 92, 246, 0.12) 0%, rgba(245, 245, 247, 0) 65%)'
        }}
      />

      {/* Top Header / Video Call Toolbar */}
      <header className="relative z-20 px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-[#E0E0E0] dark:border-white/10 bg-white/80 dark:bg-[#121722]/80 backdrop-blur-xl shadow-xs">
        {/* Left: Recording & Status Indicators */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          {/* Red REC Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-500/40 text-red-600 dark:text-red-300 text-xs font-bold font-mono tracking-wider shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span>REC {formatTime(elapsedSeconds)}</span>
          </div>

          {/* AI State Pill */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md border shadow-xs transition-colors duration-300"
            style={{
              backgroundColor: aiState === 'speaking'
                ? 'rgba(0, 102, 204, 0.1)'
                : aiState === 'listening'
                ? 'rgba(16, 185, 129, 0.1)'
                : 'rgba(139, 92, 246, 0.1)',
              borderColor: aiState === 'speaking'
                ? 'rgba(0, 102, 204, 0.3)'
                : aiState === 'listening'
                ? 'rgba(16, 185, 129, 0.3)'
                : 'rgba(139, 92, 246, 0.3)',
              color: aiState === 'speaking'
                ? '#0066cc'
                : aiState === 'listening'
                ? '#10b981'
                : '#8b5cf6'
            }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{
                backgroundColor: aiState === 'speaking' ? '#0066cc' : aiState === 'listening' ? '#10b981' : '#8b5cf6'
              }}
            />
            <span className="truncate max-w-[170px] sm:max-w-none">
              {aiState === 'speaking' ? 'AI Interviewer Speaking' : aiState === 'listening' ? 'Listening to your response...' : isProcessingTurn ? 'AI Evaluating Answer...' : 'Answer Review'}
            </span>
          </div>
        </div>

        {/* Center: Question Progress */}
        <div className="hidden lg:flex flex-col items-center">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#7A7A7A] dark:text-slate-400">
            <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
            <span className="w-1 h-1 rounded-full bg-[#7A7A7A]" />
            <span className="text-[#1D1D1F] dark:text-slate-200">{currentQuestion?.category || currentMilestone || 'Technical Assessment'}</span>
          </div>
          {/* Progress dots */}
          <div className="flex gap-1.5 mt-1.5">
            {Array.from({ length: totalQuestions }).map((_, i) => (
              <div
                key={i}
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  width: i === currentQuestionIndex ? 24 : 8,
                  backgroundColor: i < currentQuestionIndex ? '#10b981' : i === currentQuestionIndex ? '#0066cc' : 'rgba(120,120,128,0.25)'
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
            className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
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
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-6 text-center max-w-4xl mx-auto w-full">
        {/* Dynamic Waveform Visualizer */}
        <div className="relative mb-5 transform scale-90 sm:scale-100 transition-transform">
          <WaveformVisualizer
            state={aiState === 'speaking' ? 'speaking' : aiState === 'listening' ? 'listening' : 'thinking'}
            audioLevel={aiState === 'listening' ? micLevel : 0.45}
            analyser={analyserRef.current}
            size={260}
          />
        </div>

        {/* Spoken AI Question Prompt (Minimalist subtitle card) */}
        <div className="max-w-2xl w-full px-5 sm:px-7 py-4 rounded-2xl bg-white/90 dark:bg-[#121722]/85 backdrop-blur-xl border border-[#E0E0E0] dark:border-white/10 shadow-lg text-left sm:text-center transition-all">
          <span className="text-[11px] uppercase font-extrabold tracking-widest text-[#0066cc] dark:text-[#38BDF8] block mb-1">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </span>
          <p className="text-sm sm:text-base md:text-lg font-semibold text-[#1D1D1F] dark:text-slate-100 leading-snug">
            "{currentQuestion?.question || 'Preparing next question...'}"
          </p>
        </div>

        {/* Gentle Listening Feedback */}
        {aiState === 'listening' && (
          <div className="mt-3.5 flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 px-4 py-1.5 rounded-full animate-pulse shadow-2xs">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            </svg>
            <span className="text-center">Listening to your mic — speak freely, then click "Done Speaking" below</span>
          </div>
        )}

        {/* Candidate Answer Review Drawer */}
        {showReviewDrawer && (
          <div className="mt-4 max-w-xl w-full bg-white/95 dark:bg-[#141A26]/95 border border-emerald-500/40 dark:border-emerald-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-xl text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Your Recorded Answer
              </span>
              <span className="text-[11px] text-[#7A7A7A] dark:text-slate-400">
                Review or edit before submitting
              </span>
            </div>
            <textarea
              value={editedTranscript}
              onChange={(e) => setEditedTranscript(e.target.value)}
              placeholder="Candidate speech transcript (or type your response)..."
              className="w-full bg-[#FAFAFC] dark:bg-black/40 border border-[#E0E0E0] dark:border-white/10 rounded-xl p-3 text-xs sm:text-sm text-[#1D1D1F] dark:text-slate-100 focus:outline-hidden focus:border-[#0066cc] dark:focus:border-[#38BDF8] resize-none h-24 transition-colors"
            />
            <div className="flex items-center justify-end gap-2.5 mt-3">
              <button
                type="button"
                onClick={handleRetryAnswer}
                className="px-3.5 py-1.5 rounded-xl border border-[#E0E0E0] dark:border-white/15 bg-[#FAFAFC] dark:bg-white/5 hover:bg-[#F0F0F2] dark:hover:bg-white/10 text-xs font-bold text-[#1D1D1F] dark:text-slate-300 transition-colors cursor-pointer"
              >
                Re-Record Answer
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#0071e3] to-[#0066cc] text-white text-xs font-bold shadow-md hover:from-[#0077ed] hover:to-[#005bb5] transition-all flex items-center gap-1.5 cursor-pointer"
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

      {/* Picture-in-Picture Webcam Overlay (Candidate Feed — Stays on in Bottom Right) */}
      <div className="absolute bottom-20 sm:bottom-24 right-3 sm:right-6 md:right-8 z-30 pointer-events-auto">
        <CameraPiP
          mediaStream={mediaStream}
          isCameraOn={isCameraOn}
          isMuted={isMuted}
          audioLevel={micLevel}
          userName="Candidate (You)"
          className="shadow-[0_16px_40px_rgba(0,0,0,0.25)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)]"
        />
      </div>

      {/* Bottom Control Bar */}
      <footer className="relative z-20 px-4 sm:px-8 py-3.5 bg-white/85 dark:bg-[#121722]/85 backdrop-blur-xl border-t border-[#E0E0E0] dark:border-white/10 flex items-center justify-between shadow-xs">
        {/* Left: Device Toggles */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mute Button */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              isMuted
                ? 'bg-red-50 dark:bg-red-500/20 border-red-200 dark:border-red-500/40 text-red-600 dark:text-red-300 hover:bg-red-100'
                : 'bg-[#EAF2FC] dark:bg-white/10 border-[#CCE2F8] dark:border-white/15 text-[#0066CC] dark:text-white hover:bg-[#D5E6F9] dark:hover:bg-white/20'
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
            <span className="hidden sm:inline">{isMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
          </button>

          {/* Camera Button */}
          <button
            type="button"
            onClick={handleToggleCamera}
            className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              !isCameraOn
                ? 'bg-red-50 dark:bg-red-500/20 border-red-200 dark:border-red-500/40 text-red-600 dark:text-red-300 hover:bg-red-100'
                : 'bg-[#EAF2FC] dark:bg-white/10 border-[#CCE2F8] dark:border-white/15 text-[#0066CC] dark:text-white hover:bg-[#D5E6F9] dark:hover:bg-white/20'
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
            <span className="hidden sm:inline">{isCameraOn ? 'Camera On' : 'Camera Off'}</span>
          </button>
        </div>

        {/* Center: Done Speaking CTA */}
        <div className="flex items-center gap-3">
          {!showReviewDrawer && (
            <button
              type="button"
              onClick={handleDoneSpeaking}
              className="px-4 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0071e3] to-[#0066cc] hover:from-[#0077ed] hover:to-[#005bb5] text-white text-xs sm:text-sm font-bold shadow-[0_4px_14px_rgba(0,102,204,0.35)] transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Done Speaking</span>
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
            className="text-xs text-[#7A7A7A] hover:text-[#1D1D1F] dark:hover:text-white transition-colors cursor-pointer font-semibold"
          >
            Cancel
          </button>
        </div>
      </footer>
    </div>
  )
}
