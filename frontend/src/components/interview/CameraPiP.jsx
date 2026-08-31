import React, { useRef, useEffect, useState } from 'react'

/**
 * CameraPiP — Picture-in-Picture candidate webcam overlay.
 * Renders the user's camera feed with live microphone volume level,
 * posture/framing warnings, camera/mute status badges, and sleek rounded glass border.
 */
export default function CameraPiP({
  mediaStream = null,
  isCameraOn = true,
  isMuted = false,
  audioLevel = 0, // 0 to 1
  userName = 'Candidate (You)',
  className = ''
}) {
  const videoRef = useRef(null)
  const [postureNotice, setPostureNotice] = useState(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (video && mediaStream) {
      video.srcObject = mediaStream
      video.onloadedmetadata = () => {
        video.play().catch(() => {})
      }
      video.play().catch(() => {})
    }
    if (mediaStream) {
      mediaStream.getVideoTracks().forEach(track => {
        track.enabled = Boolean(isCameraOn)
      })
    }
  }, [mediaStream, isCameraOn])

  // Posture & Framing Detector on PIP Camera
  useEffect(() => {
    if (!isCameraOn || !mediaStream) {
      setPostureNotice(null)
      return
    }

    const checkPosture = () => {
      const video = videoRef.current
      if (!video || video.readyState !== 4) return

      try {
        if (!canvasRef.current) {
          canvasRef.current = document.createElement('canvas')
          canvasRef.current.width = 120
          canvasRef.current.height = 90
        }
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(video, 0, 0, 120, 90)
        const frame = ctx.getImageData(0, 0, 120, 90)
        const data = frame.data

        let totalLum = 0
        let leftLum = 0
        let rightLum = 0
        let topLum = 0
        let bottomLum = 0

        for (let y = 0; y < 90; y++) {
          for (let x = 0; x < 120; x++) {
            const idx = (y * 120 + x) * 4
            const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
            totalLum += lum
            if (x < 60) leftLum += lum
            else rightLum += lum
            if (y < 45) topLum += lum
            else bottomLum += lum
          }
        }

        const avgBrightness = totalLum / (120 * 90)
        const horizDiff = Math.abs(leftLum - rightLum) / (totalLum || 1)
        const vertRatio = bottomLum / (topLum || 1)

        if (avgBrightness < 20) {
          setPostureNotice('Low Light')
        } else if (horizDiff > 0.28) {
          setPostureNotice('Off-Center')
        } else if (vertRatio > 1.95) {
          setPostureNotice('Face Low')
        } else {
          setPostureNotice(null)
        }
      } catch {}
    }

    const interval = setInterval(checkPosture, 1200)
    return () => clearInterval(interval)
  }, [isCameraOn, mediaStream])

  // Compute 5-step audio visualizer bars
  const activeBars = Math.min(5, Math.max(0, Math.floor(audioLevel * 6)))

  return (
    <div
      className={`relative w-40 sm:w-56 md:w-64 aspect-video rounded-2xl overflow-hidden shadow-2xl border-2 border-white/40 dark:border-white/15 bg-slate-900/90 dark:bg-slate-900/90 backdrop-blur-xl transition-all duration-300 ${className}`}
      style={{
        boxShadow: isCameraOn
          ? '0 12px 36px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.2)'
          : '0 8px 24px rgba(0,0,0,0.2)'
      }}
    >
      {/* Live Video Feed */}
      {isCameraOn && mediaStream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform -scale-x-100"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-slate-300 p-3 text-center">
          <div className="relative mb-1.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-700/80 flex items-center justify-center border border-white/10 shadow-inner">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            {!isMuted && audioLevel > 0.1 && (
              <span className="absolute -inset-1 rounded-full border border-emerald-400/50 animate-ping pointer-events-none" />
            )}
          </div>
          <span className="text-[11px] font-medium text-slate-300">
            {!isCameraOn ? 'Camera Turned Off' : 'Voice-Only Mode'}
          </span>
        </div>
      )}

      {/* Posture / Framing Warning Badge */}
      {postureNotice && isCameraOn && (
        <div className="absolute top-7 sm:top-8 left-1/2 -translate-x-1/2 z-20 px-2.5 py-0.5 rounded-full bg-amber-500/90 text-slate-950 font-extrabold text-[9px] sm:text-[10px] shadow-md backdrop-blur-md animate-pulse whitespace-nowrap">
          {postureNotice}
        </div>
      )}

      {/* Top Header: Candidate Name & Recording dot */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-semibold text-white">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="truncate max-w-[100px] sm:max-w-[130px]">{userName}</span>
        </div>

        {/* Mute Indicator */}
        {isMuted ? (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500/90 text-white shadow-md">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
              <line x1="12" y1="19" x2="12" y2="23" />
            </svg>
          </div>
        ) : null}
      </div>

      {/* Bottom Footer: Audio Meter */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isMuted ? '#f87171' : '#34d399'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          </svg>
          {/* Audio Equalizer Bars */}
          <div className="flex items-end gap-0.5 h-3">
            {[1, 2, 3, 4, 5].map(barIndex => {
              const isActive = !isMuted && barIndex <= activeBars
              return (
                <div
                  key={barIndex}
                  className="w-1 rounded-full transition-all duration-75"
                  style={{
                    height: `${barIndex * 20}%`,
                    backgroundColor: isMuted
                      ? '#64748b'
                      : isActive
                      ? barIndex > 4
                        ? '#fbbf24'
                        : '#34d399'
                      : 'rgba(255,255,255,0.2)'
                  }}
                />
              )
            })}
          </div>
        </div>

        <span className="text-[10px] text-white/70 font-mono tracking-tighter bg-black/40 px-1.5 py-0.5 rounded">
          SELF-VIEW
        </span>
      </div>
    </div>
  )
}
