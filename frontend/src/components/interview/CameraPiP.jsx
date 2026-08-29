import React, { useRef, useEffect } from 'react'

/**
 * CameraPiP — Picture-in-Picture candidate webcam overlay.
 * Renders the user's camera feed with live microphone volume level,
 * camera/mute status badges, and sleek rounded glass border.
 */
export default function CameraPiP({
  mediaStream = null,
  isCameraOn = true,
  isMuted = false,
  audioLevel = 0, // 0 to 1
  userName = 'Candidate (You)',
  position = 'bottom-right', // 'bottom-right' | 'top-right'
  className = ''
}) {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream
    }
  }, [mediaStream, isCameraOn])

  // Compute 5-step audio visualizer bars
  const activeBars = Math.min(5, Math.max(0, Math.floor(audioLevel * 6)))

  return (
    <div
      className={`relative w-48 sm:w-64 aspect-video rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 dark:border-white/15 bg-slate-900/90 backdrop-blur-xl transition-all duration-300 ${className}`}
      style={{
        boxShadow: isCameraOn ? '0 12px 36px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.1)' : '0 10px 25px rgba(0,0,0,0.3)'
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
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-slate-300 p-4 text-center">
          <div className="relative mb-2">
            <div className="w-12 h-12 rounded-full bg-slate-700/80 flex items-center justify-center border border-white/10 shadow-inner">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            {!isMuted && audioLevel > 0.1 && (
              <span className="absolute -inset-1 rounded-full border border-emerald-400/50 animate-ping pointer-events-none" />
            )}
          </div>
          <span className="text-xs font-medium text-slate-400">
            {!isCameraOn ? 'Camera Turned Off' : 'Voice-Only Mode'}
          </span>
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
              <line x1="8" y1="23" x2="16" y2="23" />
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
