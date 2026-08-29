import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { INTERVIEW_TRACKS } from './interviewQuestions'

/**
 * CalibrationModal (Stage 1) — Pre-interview hardware and environment calibration.
 * Checks camera, microphone, ambient audio levels, and lets candidate pick interview track.
 */
export default function CalibrationModal({
  onStart,
  onClose,
  initialTrack = 'fullstack'
}) {
  const [selectedTrack, setSelectedTrack] = useState(initialTrack)
  const [customTopic, setCustomTopic] = useState('')
  const [questionCount, setQuestionCount] = useState(4)
  const [mediaStream, setMediaStream] = useState(null)
  const [hasCamera, setHasCamera] = useState(false)
  const [hasMic, setHasMic] = useState(false)
  const [permissionState, setPermissionState] = useState('prompt') // 'prompt' | 'checking' | 'granted' | 'denied'
  const [voiceOnlyFallback, setVoiceOnlyFallback] = useState(false)
  const [micLevel, setMicLevel] = useState(0)
  const [noiseStatus, setNoiseStatus] = useState('Calibrating...') // 'Clean' | 'Moderate Noise' | 'Calibrating...'

  const videoPreviewRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const animFrameRef = useRef(null)

  // Start checking camera and microphone
  const requestMediaAccess = async (forceVoiceOnly = false) => {
    setPermissionState('checking')
    try {
      if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop())
      }

      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: forceVoiceOnly ? false : {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      setMediaStream(stream)

      const hasVideoTrack = stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled
      const hasAudioTrack = stream.getAudioTracks().length > 0 && stream.getAudioTracks()[0].enabled

      setHasCamera(hasVideoTrack)
      setHasMic(hasAudioTrack)
      setPermissionState('granted')
      if (forceVoiceOnly) setVoiceOnlyFallback(true)

      // Bind video preview
      if (videoPreviewRef.current && hasVideoTrack) {
        videoPreviewRef.current.srcObject = stream
      }

      // Initialize Web Audio API for live mic meter
      if (hasAudioTrack) {
        setupAudioAnalyser(stream)
      }
    } catch (err) {
      console.warn('getUserMedia failed:', err)
      // If full permissions failed, attempt audio-only
      if (!forceVoiceOnly) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          setMediaStream(audioStream)
          setHasCamera(false)
          setHasMic(true)
          setVoiceOnlyFallback(true)
          setPermissionState('granted')
          setupAudioAnalyser(audioStream)
          return
        } catch {
          // both failed
        }
      }
      setPermissionState('denied')
    }
  }

  const setupAudioAnalyser = (stream) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const audioCtx = new AudioCtx()
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 64
      analyser.smoothingTimeConstant = 0.8

      const source = audioCtx.createMediaStreamSource(stream)
      source.connect(analyser)

      audioContextRef.current = audioCtx
      analyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      let noiseSamples = []

      const pollAudio = () => {
        analyser.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i]
        }
        const avg = sum / dataArray.length
        const normalized = Math.min(1, avg / 120)
        setMicLevel(normalized)

        if (noiseSamples.length < 30) {
          noiseSamples.push(normalized)
        } else {
          const baseline = noiseSamples.reduce((a, b) => a + b, 0) / noiseSamples.length
          setNoiseStatus(baseline < 0.12 ? 'Quiet environment (Optimal)' : baseline < 0.3 ? 'Moderate ambient sound' : 'Noisy background detected')
        }

        animFrameRef.current = requestAnimationFrame(pollAudio)
      }
      pollAudio()
    } catch (e) {
      console.warn('AudioAnalyser setup error:', e)
    }
  }

  useEffect(() => {
    requestMediaAccess()

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [])

  const handleStartInterview = () => {
    onStart({
      trackId: selectedTrack,
      customTopic: customTopic.trim(),
      questionCount,
      mediaStream,
      isVoiceOnly: voiceOnlyFallback || !hasCamera
    })
  }

  const canProceed = permissionState === 'granted' && hasMic

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xl overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-4xl bg-white dark:bg-[#121824] rounded-3xl border border-[#E6EAF2] dark:border-[#242E40] shadow-[0_25px_70px_rgba(0,0,0,0.45)] overflow-hidden my-auto"
      >
        {/* Header Bar */}
        <div className="px-6 py-5 border-b border-[#f0f0f0] dark:border-[#242E40] flex items-center justify-between bg-[#fafbfc] dark:bg-[#171F2F]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0071e3] to-[#0066cc] flex items-center justify-center text-white shadow-md shadow-[#0066cc]/25">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-['Manrope'] text-[#1d1d1f] dark:text-white">
                  AI Interview Studio
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-[#0066cc]/10 text-[#0066cc] dark:bg-[#38BDF8]/20 dark:text-[#38BDF8]">
                  Calibration
                </span>
              </div>
              <p className="text-xs text-[#7a7a7a] dark:text-[#94A3B8]">
                Check your camera, microphone, and choose your interview track before starting.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close setup"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#7a7a7a] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Video Preview & Hardware Meters (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Live Camera Viewport */}
            <div className="relative aspect-video rounded-2xl bg-slate-900 overflow-hidden border border-slate-700/60 shadow-lg flex items-center justify-center">
              {hasCamera && !voiceOnlyFallback ? (
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
                  <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-3">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-slate-200">
                    {voiceOnlyFallback ? 'Voice-Only Mode Active' : 'Camera Access Needed'}
                  </span>
                  <span className="text-xs text-slate-400 mt-1 max-w-xs">
                    {voiceOnlyFallback
                      ? 'The interview will rely on speech input without capturing candidate video.'
                      : 'Grant camera access to enable the realistic face-to-face video interview.'}
                  </span>
                </div>
              )}

              {/* Status Badge Overlays */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[11px] font-semibold text-white flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${permissionState === 'granted' ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
                  {permissionState === 'granted' ? 'Hardware Ready' : 'Awaiting Permissions'}
                </span>
              </div>

              {/* Live Framing Guideline Box */}
              {hasCamera && !voiceOnlyFallback && (
                <div className="absolute inset-8 border border-white/20 rounded-xl pointer-events-none flex items-start justify-center pt-2">
                  <span className="text-[10px] text-white/60 uppercase tracking-wider bg-black/40 px-2 py-0.5 rounded backdrop-blur-xs">
                    Frame eyes at upper third
                  </span>
                </div>
              )}
            </div>

            {/* Hardware Status & Live Mic Level */}
            <div className="p-4 rounded-2xl bg-[#f5f7fa] dark:bg-[#182132] border border-[#e5e9f0] dark:border-[#242E40] flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2 text-[#1d1d1f] dark:text-white">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0066cc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  </svg>
                  <span>Microphone Input Level</span>
                </div>
                <span className="text-[#0066cc] dark:text-[#38BDF8] font-mono">
                  {hasMic ? (micLevel > 0.05 ? 'Speaking...' : 'Ready') : 'Mic Required'}
                </span>
              </div>

              {/* Dynamic Decibel Volume Bar */}
              <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center p-0.5">
                <div
                  className="h-full rounded-full transition-all duration-75"
                  style={{
                    width: `${Math.max(4, micLevel * 100)}%`,
                    background: micLevel > 0.75
                      ? 'linear-gradient(90deg, #10b981, #f59e0b, #ef4444)'
                      : micLevel > 0.35
                      ? 'linear-gradient(90deg, #10b981, #34d399)'
                      : '#10b981'
                  }}
                />
              </div>

              {/* Ambient Noise Indicator */}
              <div className="flex items-center justify-between text-[11px] text-[#7a7a7a] dark:text-[#94A3B8]">
                <span>Ambient Noise: <strong className="text-[#1d1d1f] dark:text-slate-200">{noiseStatus}</strong></span>
                {permissionState === 'denied' && (
                  <button
                    type="button"
                    onClick={() => requestMediaAccess(false)}
                    className="text-[#0066cc] dark:text-[#38BDF8] font-bold hover:underline"
                  >
                    Retry Permissions
                  </button>
                )}
              </div>
            </div>

            {/* Permission explanation banner */}
            <div className="text-[11px] text-[#7a7a7a] dark:text-[#94A3B8] leading-relaxed bg-[#f0f4f9] dark:bg-[#141b29] p-3 rounded-xl border border-[#dce5f2] dark:border-[#1f293d]">
              <span className="font-bold text-[#1d1d1f] dark:text-slate-200">🔒 Privacy & Consent:</span> This app uses your camera and microphone exclusively to simulate a real-time conversational interview and generate personalized learning recommendations. Video is processed locally in your browser.
            </div>
          </div>

          {/* Right Column: Track & Settings Selection (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-5">
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#7a7a7a] dark:text-[#94A3B8] mb-2">
                  Select Interview Track
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {INTERVIEW_TRACKS.map((t) => {
                    const isSelected = selectedTrack === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTrack(t.id)}
                        className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col gap-1 ${
                          isSelected
                            ? 'bg-[#eaf2fc] dark:bg-[rgba(41,151,255,0.18)] border-[#0066cc] dark:border-[#38BDF8] shadow-sm'
                            : 'bg-white dark:bg-[#151D2C] border-[#E6EAF2] dark:border-[#242E40] hover:border-[#0066cc]/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-bold ${isSelected ? 'text-[#0066cc] dark:text-[#38BDF8]' : 'text-[#1d1d1f] dark:text-white'}`}>
                            {t.name}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[#64748b] dark:text-slate-300">
                            {t.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#7a7a7a] dark:text-[#94A3B8] line-clamp-2">
                          {t.description}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Optional Custom Topic Focus */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#7a7a7a] dark:text-[#94A3B8] mb-1.5">
                  Custom Topic / Specialization (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Next.js 14, Kafka Streams, GraphQL, PyTorch"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#d2d2d7] dark:border-[#28303F] bg-white dark:bg-[#141A26] text-sm text-[#1d1d1f] dark:text-white focus:border-[#0066cc] focus:outline-hidden"
                />
              </div>

              {/* Question Count Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#7a7a7a] dark:text-[#94A3B8] mb-1.5">
                  Interview Length
                </label>
                <div className="flex gap-2">
                  {[3, 4, 5].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setQuestionCount(cnt)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                        questionCount === cnt
                          ? 'bg-[#0066cc] text-white border-[#0066cc] shadow-sm'
                          : 'bg-white dark:bg-[#151D2C] border-[#E6EAF2] dark:border-[#242E40] text-[#1d1d1f] dark:text-white hover:bg-[#fafbfc]'
                      }`}
                    >
                      {cnt} Questions (~{cnt * 2} min)
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions & Start CTA */}
            <div className="flex flex-col gap-2 pt-3 border-t border-[#f0f0f0] dark:border-[#242E40]">
              {!hasCamera && permissionState === 'granted' && (
                <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg text-center font-medium">
                  Camera not detected — continuing in Voice-Only mode.
                </div>
              )}

              <button
                type="button"
                disabled={!canProceed}
                onClick={handleStartInterview}
                className="w-full py-3.5 px-5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#0071e3] to-[#0066cc] hover:from-[#0077ed] hover:to-[#005bb5] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(0,102,204,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Start Live AI Interview</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>

              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => requestMediaAccess(true)}
                  className="text-xs text-[#7a7a7a] hover:text-[#0066cc] dark:hover:text-[#38BDF8] underline cursor-pointer"
                >
                  Switch to Voice-Only Mode
                </button>
                <span className="text-[11px] text-[#7a7a7a] dark:text-[#94A3B8]">
                  Practice Simulation
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
