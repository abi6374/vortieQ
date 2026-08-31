import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { INTERVIEW_TRACKS } from './interviewQuestions'

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
  const [permissionState, setPermissionState] = useState('prompt')
  const [voiceOnlyFallback, setVoiceOnlyFallback] = useState(false)
  const [micLevel, setMicLevel] = useState(0)
  const [noiseStatus, setNoiseStatus] = useState('Calibrating...')
  const [postureNotice, setPostureNotice] = useState(null)

  const videoPreviewRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const animFrameRef = useRef(null)
  const postureIntervalRef = useRef(null)
  const canvasRef = useRef(null)

  const stopAllTracks = (stream = mediaStream) => {
    if (stream) {
      stream.getTracks().forEach(track => {
        try {
          track.stop()
        } catch { }
      })
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null
    }
  }

  const requestMediaAccess = async (forceVoiceOnly = false) => {
    setPermissionState('checking')
    try {
      if (mediaStream) {
        stopAllTracks(mediaStream)
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
    if (!hasCamera || voiceOnlyFallback) {
      setPostureNotice(null)
      return
    }

    const checkPosture = () => {
      const video = videoPreviewRef.current
      if (!video || video.readyState !== 4) return

      try {
        if (!canvasRef.current) {
          canvasRef.current = document.createElement('canvas')
          canvasRef.current.width = 160
          canvasRef.current.height = 120
        }
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(video, 0, 0, 160, 120)
        const frame = ctx.getImageData(0, 0, 160, 120)
        const data = frame.data

        let totalBrightness = 0
        let leftLum = 0
        let rightLum = 0
        let topLum = 0
        let bottomLum = 0

        for (let y = 0; y < 120; y++) {
          for (let x = 0; x < 160; x++) {
            const idx = (y * 160 + x) * 4
            const r = data[idx]
            const g = data[idx + 1]
            const b = data[idx + 2]
            const lum = 0.299 * r + 0.587 * g + 0.114 * b

            totalBrightness += lum
            if (x < 80) leftLum += lum
            else rightLum += lum
            if (y < 60) topLum += lum
            else bottomLum += lum
          }
        }

        const avgBrightness = totalBrightness / (160 * 120)
        const horizImbalance = Math.abs(leftLum - rightLum) / (totalBrightness || 1)
        const vertImbalance = bottomLum / (topLum || 1)

        if (avgBrightness < 25) {
          setPostureNotice('Low lighting detected — please face a light source')
        } else if (horizImbalance > 0.25) {
          setPostureNotice('Posture Notice: Center your face in the camera frame')
        } else if (vertImbalance > 1.8) {
          setPostureNotice('Posture Notice: Sit upright — your face is too low in the frame')
        } else {
          setPostureNotice(null)
        }
      } catch {
        // Silently handle canvas errors
      }
    }

    postureIntervalRef.current = setInterval(checkPosture, 1000)

    return () => {
      if (postureIntervalRef.current) clearInterval(postureIntervalRef.current)
    }
  }, [hasCamera, voiceOnlyFallback])

  const isStartingInterviewRef = useRef(false)

  useEffect(() => {
    requestMediaAccess()

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (postureIntervalRef.current) clearInterval(postureIntervalRef.current)
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => { })
      }
      if (!isStartingInterviewRef.current) {
        stopAllTracks()
      }
    }
  }, [])

  useEffect(() => {
    if (videoPreviewRef.current && mediaStream && hasCamera && !voiceOnlyFallback) {
      videoPreviewRef.current.srcObject = mediaStream
    }
  }, [mediaStream, hasCamera, voiceOnlyFallback])

  const handleExit = () => {
    isStartingInterviewRef.current = false
    stopAllTracks()
    onClose()
  }

  const handleStartInterview = () => {
    isStartingInterviewRef.current = true
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
    <div className="w-full h-full flex flex-col min-h-0 overflow-hidden font-['Inter',sans-serif] text-[#1d1d1f] dark:text-white select-none">
      {/* Page Header */}
      <header className="mb-2.5 sm:mb-3 flex flex-row items-center justify-between gap-3 flex-none">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="font-['Manrope'] font-extrabold text-xl sm:text-2xl text-[#1d1d1f] dark:text-white tracking-tight">
              AI Interview Studio
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-md bg-[#0066cc]/10 text-[#0066cc] dark:bg-[#C9D0D6]/20 dark:text-[#C9D0D6] border border-[#0066cc]/20 dark:border-[#27272F]">
              Beta
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#333333] dark:text-[#94A3B8]">
            Practice real-time technical and behavioral interviews grounded in your active roadmap.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExit}
          className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#6e6e73] dark:text-[#94A3B8] hover:text-[#1d1d1f] dark:hover:text-white border border-[#e0e0e0] dark:border-[#27272F] bg-white dark:bg-[#121216] shadow-xs hover:border-[#0066cc]/30 dark:hover:border-[#C9D0D6]/30 transition-colors cursor-pointer flex items-center gap-1.5 flex-none"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          <span>Exit Studio</span>
        </button>
      </header>

      {/* Main Container Card — Anchored Full-Height Container */}
      <div className="bg-white dark:bg-[#121216] border border-[#e0e0e0] dark:border-[#27272F] rounded-2xl p-4 sm:p-5 shadow-sm flex-1 min-h-0 overflow-hidden flex flex-col justify-between">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch w-full flex-1 min-h-0 overflow-hidden">

          {/* ── Left Column: Camera Preview & Hardware Meters (7 cols) ── */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-3 h-full min-h-0 overflow-hidden">
            {/* Live Camera Viewport */}
            <div className="relative flex-1 min-h-[170px] max-h-[300px] w-full rounded-xl bg-slate-900 overflow-hidden border border-slate-700/60 shadow-md flex items-center justify-center flex-none aspect-video">
              {hasCamera && !voiceOnlyFallback ? (
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-4 text-center text-slate-400">
                  <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-2 shadow-inner">
                    {permissionState === 'checking' ? (
                      <div className="w-6 h-6 rounded-full border-2 border-[#0066cc] dark:border-[#C9D0D6] border-t-transparent animate-spin" />
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-slate-200">
                    {permissionState === 'checking'
                      ? 'Requesting camera access...'
                      : voiceOnlyFallback
                        ? 'Voice-Only Mode Active'
                        : permissionState === 'denied'
                          ? 'Camera/Mic Permission Denied'
                          : 'Waiting for camera permission'}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1 max-w-xs leading-tight">
                    {permissionState === 'denied'
                      ? 'Please allow camera and microphone access in your browser settings.'
                      : voiceOnlyFallback
                        ? 'The interview will rely on speech input without capturing candidate video.'
                        : 'Grant camera access in your browser to enable the video call simulation.'}
                  </span>
                  {permissionState === 'denied' && (
                    <button
                      type="button"
                      onClick={() => requestMediaAccess(true)}
                      className="mt-2.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors cursor-pointer"
                    >
                      Continue in Voice-Only Mode
                    </button>
                  )}
                </div>
              )}

              {/* Status Badges Overlay */}
              <div className="absolute top-2.5 left-2.5 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-semibold text-white flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full animate-pulse ${permissionState === 'granted'
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

              {/* Real-time Posture & Framing Notice Banner */}
              {postureNotice && hasCamera && !voiceOnlyFallback && (
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full bg-amber-500/95 text-slate-950 font-bold text-[11px] shadow-lg backdrop-blur-md animate-bounce flex items-center gap-1.5">
                  <span>{postureNotice}</span>
                </div>
              )}

              {/* Framing Guideline */}
              {hasCamera && !voiceOnlyFallback && (
                <div className="absolute inset-6 border border-white/20 rounded-xl pointer-events-none flex items-start justify-center pt-1.5">
                  <span className="text-[9px] text-white/60 uppercase tracking-wider bg-black/40 px-2 py-0.5 rounded backdrop-blur-xs">
                    Frame eyes at upper third
                  </span>
                </div>
              )}
            </div>

            {/* Mic Meter & Noise Indicator */}
            <div className="p-3 rounded-xl bg-[#f5f5f7] dark:bg-[#18181D] border border-[#e0e0e0] dark:border-[#27272F] flex flex-col gap-2 flex-none">
              <div className="flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-1.5 text-[#1d1d1f] dark:text-white">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0066cc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  </svg>
                  <span>Microphone Input Level</span>
                </div>
                <span className="text-[#0066cc] dark:text-[#C9D0D6] font-mono text-[11px]">
                  {hasMic ? (micLevel > 0.05 ? 'Speaking...' : 'Ready') : 'Mic Required'}
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden flex items-center p-0.5">
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

              <div className="flex items-center justify-between text-[11px] text-[#6e6e73] dark:text-[#94A3B8]">
                <span>Ambient Noise: <strong className="text-[#1d1d1f] dark:text-slate-200">{noiseStatus}</strong></span>
                {permissionState !== 'granted' && (
                  <button
                    type="button"
                    onClick={() => requestMediaAccess(false)}
                    className="text-[#0066cc] dark:text-[#C9D0D6] font-bold hover:underline cursor-pointer"
                  >
                    Retry Permissions
                  </button>
                )}
              </div>
            </div>

            {/* Privacy Note */}
            <div className="text-[11px] text-[#6e6e73] dark:text-[#94A3B8] leading-tight bg-[#eaf2fc]/60 dark:bg-[#18181D]/60 p-2.5 rounded-xl border border-[#0066cc]/10 dark:border-[#27272F] flex-none">
              <span className="font-bold text-[#1d1d1f] dark:text-slate-200">Privacy & Consent:</span> Camera and microphone feeds are processed locally in your browser. Video is never uploaded to any external server.
            </div>
          </div>

          {/* ── Right Column: Track & Settings Selection (5 cols) ── */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-3 h-full min-h-0 overflow-hidden">
            <div className="flex flex-col gap-2.5 min-h-0 flex-1 overflow-hidden">
              <div className="flex flex-col min-h-0 flex-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6e6e73] dark:text-[#94A3B8] mb-1.5 flex-none">
                  Select Interview Track
                </label>
                <div className="flex flex-col gap-1.5 overflow-y-auto no-scrollbar flex-1 min-h-0 pr-0.5">
                  {INTERVIEW_TRACKS.map((t) => {
                    const isSelected = selectedTrack === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTrack(t.id)}
                        className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col gap-0.5 flex-none ${isSelected
                          ? 'bg-[#eaf2fc] dark:bg-[rgba(201,208,214,0.15)] border-[#0066cc] dark:border-[#C9D0D6] shadow-2xs'
                          : 'bg-white dark:bg-[#121216] border-[#e0e0e0] dark:border-[#27272F] hover:border-[#0066cc]/40 dark:hover:border-[#C9D0D6]/40'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-[#0066cc] dark:text-[#C9D0D6]' : 'text-[#1d1d1f] dark:text-white'}`}>
                            {t.name}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#f5f5f7] dark:bg-white/10 text-[#64748b] dark:text-slate-300">
                            {t.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#6e6e73] dark:text-[#94A3B8] line-clamp-1 leading-snug">
                          {t.description}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Custom Topic Focus */}
              <div className="flex-none">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6e6e73] dark:text-[#94A3B8] mb-1">
                  Custom Topic / Specialization <span className="normal-case font-normal text-[#999999]">(opt)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Next.js 14, Kafka Streams, GraphQL, PyTorch"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#d2d2d7] dark:border-[#27272F] bg-white dark:bg-[#0E0E12] text-xs text-[#1d1d1f] dark:text-white placeholder:text-[#999999] focus:border-[#0066cc] dark:focus:border-[#C9D0D6] focus:outline-hidden transition-colors"
                />
              </div>

              {/* Question Count Selector */}
              <div className="flex-none">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6e6e73] dark:text-[#94A3B8] mb-1">
                  Interview Length
                </label>
                <div className="flex gap-1.5">
                  {[3, 4, 5].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setQuestionCount(cnt)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${questionCount === cnt
                        ? 'bg-[#0066cc] text-white border-[#0066cc] shadow-2xs'
                        : 'bg-white dark:bg-[#121216] border-[#e0e0e0] dark:border-[#27272F] text-[#1d1d1f] dark:text-white hover:bg-[#f5f5f7] dark:hover:bg-[#18181D]'
                        }`}
                    >
                      {cnt} Q (~{cnt * 2}m)
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions & Start CTA */}
            <div className="flex flex-col gap-2 pt-2.5 border-t border-[#f0f0f0] dark:border-[#27272F] flex-none">
              {!hasCamera && permissionState === 'granted' && (
                <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-500/20 p-1.5 rounded-lg text-center font-medium">
                  Camera not detected — continuing in Voice-Only mode
                </div>
              )}

              <button
                type="button"
                disabled={!canProceed}
                onClick={handleStartInterview}
                className="w-full py-2.5 sm:py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#0071e3] to-[#0066cc] hover:from-[#0077ed] hover:to-[#005bb5] disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-[#0066cc]/25 transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
                </svg>
                <span className="text-white font-bold">Start Live AI Interview</span>
              </button>

              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => requestMediaAccess(true)}
                  className="text-[11px] text-[#6e6e73] dark:text-[#94A3B8] hover:text-[#0066cc] dark:hover:text-[#38BDF8] underline cursor-pointer transition-colors"
                >
                  Switch to Voice-Only Mode
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
