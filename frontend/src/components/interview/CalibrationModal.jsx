import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { INTERVIEW_TRACKS } from './interviewQuestions'

/**
 * CalibrationScreen (Stage 1) — Full-page pre-interview hardware and environment calibration.
 * Replaces the old modal-overlay approach which was clipped by the AppShell layout.
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
  const [noiseStatus, setNoiseStatus] = useState('Calibrating...')

  const videoPreviewRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const animFrameRef = useRef(null)

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

      if (videoPreviewRef.current && hasVideoTrack) {
        videoPreviewRef.current.srcObject = stream
      }

      if (hasAudioTrack) {
        setupAudioAnalyser(stream)
      }
    } catch (err) {
      console.warn('getUserMedia failed:', err)
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
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
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

  // When video track becomes available, bind srcObject
  useEffect(() => {
    if (videoPreviewRef.current && mediaStream && hasCamera && !voiceOnlyFallback) {
      videoPreviewRef.current.srcObject = mediaStream
    }
  }, [mediaStream, hasCamera, voiceOnlyFallback])

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
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center bg-[#09101e] overflow-y-auto"
      style={{ fontFamily: "'Inter', 'Manrope', sans-serif" }}
    >
      {/* Ambient Background Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full blur-[120px] opacity-30"
          style={{
            width: 600,
            height: 600,
            background: 'radial-gradient(circle, #0071e3 0%, transparent 70%)',
            top: '-150px',
            left: '50%',
            transform: 'translateX(-50%)'
          }}
        />
      </div>

      <div className="relative w-full max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0071e3] to-[#0066cc] flex items-center justify-center text-white shadow-lg shadow-[#0066cc]/30">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  AI Interview Studio
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-[#0066cc]/20 text-[#38BDF8] border border-[#38BDF8]/30">
                  Beta
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Check your camera, microphone, and choose your interview track.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Exit interview setup"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white border border-white/10 hover:border-white/25 hover:bg-white/5 transition-all cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span>Exit</span>
          </button>
        </div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full bg-[#111827]/90 rounded-3xl border border-white/10 shadow-2xl overflow-hidden backdrop-blur-xl"
        >
          {/* Card Inner Grid */}
          <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* ── Left Column: Camera Preview + Mic Meter ── */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {/* Live Camera Viewport */}
              <div className="relative aspect-video rounded-2xl bg-[#0a0f1a] overflow-hidden border border-white/10 shadow-lg flex items-center justify-center">
                {hasCamera && !voiceOnlyFallback ? (
                  <video
                    ref={videoPreviewRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
                    <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-3">
                      {permissionState === 'checking' ? (
                        <div className="w-8 h-8 rounded-full border-2 border-[#0071e3] border-t-transparent animate-spin" />
                      ) : (
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-slate-200">
                      {permissionState === 'checking'
                        ? 'Requesting camera access...'
                        : voiceOnlyFallback
                        ? 'Voice-Only Mode Active'
                        : permissionState === 'denied'
                        ? 'Camera/Mic Permission Denied'
                        : 'Waiting for camera permission'}
                    </span>
                    <span className="text-xs text-slate-400 mt-1.5 max-w-xs leading-relaxed">
                      {permissionState === 'denied'
                        ? 'Please allow camera and microphone access in your browser settings and refresh the page.'
                        : voiceOnlyFallback
                        ? 'The interview will rely on speech input without capturing candidate video.'
                        : 'Grant camera access in your browser to enable the full video interview experience.'}
                    </span>
                    {permissionState === 'denied' && (
                      <button
                        type="button"
                        onClick={() => requestMediaAccess(true)}
                        className="mt-3 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-colors cursor-pointer"
                      >
                        Continue in Voice-Only Mode
                      </button>
                    )}
                  </div>
                )}

                {/* Status Overlay Badges */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[11px] font-semibold text-white flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full animate-pulse ${
                        permissionState === 'granted'
                          ? 'bg-emerald-400'
                          : permissionState === 'checking'
                          ? 'bg-amber-400'
                          : 'bg-red-400'
                      }`}
                    />
                    {permissionState === 'granted'
                      ? 'Hardware Ready'
                      : permissionState === 'checking'
                      ? 'Checking...'
                      : 'Permission Required'}
                  </span>
                </div>

                {/* Framing Guideline */}
                {hasCamera && !voiceOnlyFallback && (
                  <div className="absolute inset-8 border border-white/15 rounded-xl pointer-events-none flex items-start justify-center pt-2">
                    <span className="text-[10px] text-white/50 uppercase tracking-wider bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm">
                      Frame eyes at upper third
                    </span>
                  </div>
                )}
              </div>

              {/* Mic Level Meter */}
              <div className="p-4 rounded-2xl bg-[#1a2235] border border-white/10 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2 text-white">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    </svg>
                    <span>Microphone Input Level</span>
                  </div>
                  <span className="text-[#38BDF8] font-mono">
                    {hasMic ? (micLevel > 0.05 ? '🎙 Speaking...' : '✓ Ready') : 'Mic Required'}
                  </span>
                </div>

                <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
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

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Ambient Noise: <strong className="text-slate-200">{noiseStatus}</strong></span>
                  {permissionState !== 'granted' && (
                    <button
                      type="button"
                      onClick={() => requestMediaAccess(false)}
                      className="text-[#38BDF8] font-bold hover:underline cursor-pointer"
                    >
                      Retry Permissions
                    </button>
                  )}
                </div>
              </div>

              {/* Privacy Note */}
              <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-800/50 p-3 rounded-xl border border-white/5">
                <span className="font-bold text-slate-300">🔒 Privacy & Consent:</span> Your camera and microphone are used exclusively for the live interview simulation. Video is processed locally in your browser and never uploaded to any server.
              </div>
            </div>

            {/* ── Right Column: Track & Settings ── */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-5">
              <div className="flex flex-col gap-4">
                {/* Interview Track Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Select Interview Track
                  </label>
                  <div className="flex flex-col gap-2">
                    {INTERVIEW_TRACKS.map((t) => {
                      const isSelected = selectedTrack === t.id
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTrack(t.id)}
                          className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col gap-1 ${
                            isSelected
                              ? 'bg-[#0066cc]/20 border-[#38BDF8]/60 shadow-sm shadow-[#38BDF8]/10'
                              : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/8'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-bold ${isSelected ? 'text-[#38BDF8]' : 'text-white'}`}>
                              {t.name}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                              {t.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2">
                            {t.description}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Custom Topic */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Custom Topic / Specialization
                    <span className="ml-1 normal-case font-normal text-slate-500">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Next.js 14, Kafka Streams, GraphQL, PyTorch"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder:text-slate-500 focus:border-[#38BDF8]/60 focus:bg-white/8 focus:outline-none transition-colors"
                  />
                </div>

                {/* Question Count */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Interview Length
                  </label>
                  <div className="flex gap-2">
                    {[3, 4, 5].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setQuestionCount(cnt)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          questionCount === cnt
                            ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-md shadow-[#0071e3]/30'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
                        }`}
                      >
                        {cnt} Q (~{cnt * 2} min)
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-3 border-t border-white/10">
                {!hasCamera && permissionState === 'granted' && (
                  <div className="text-xs text-amber-400 bg-amber-950/40 border border-amber-500/20 p-2.5 rounded-xl text-center font-medium">
                    📸 Camera not detected — continuing in Voice-Only mode
                  </div>
                )}

                <button
                  type="button"
                  disabled={!canProceed}
                  onClick={handleStartInterview}
                  className="w-full py-3.5 px-5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#0071e3] to-[#0066cc] hover:from-[#0077ed] hover:to-[#005bb5] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(0,102,204,0.35)] hover:shadow-[0_8px_25px_rgba(0,113,227,0.45)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
                  </svg>
                  <span>Start Live AI Interview</span>
                </button>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => requestMediaAccess(true)}
                    className="text-xs text-slate-400 hover:text-[#38BDF8] underline cursor-pointer transition-colors"
                  >
                    Switch to Voice-Only Mode
                  </button>
                  <span className="text-[11px] text-slate-500">
                    Adaptive AI Questions · Amazon Bedrock
                  </span>
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </div>
  )
}
