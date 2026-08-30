import React, { useEffect, useRef } from 'react'

/**
 * WaveformVisualizer — The AI Interviewer abstract visual representation.
 * Features Jarvis-like concentric glowing rings, particle aura, and real-time
 * frequency canvas animation driven by speech and microphone audio levels.
 *
 * States:
 * - 'speaking': Cyan/Blue dynamic pulsing waveforms and expanding soundwave rings
 * - 'listening': Emerald/Green audio-reactive concentric orb responding to user mic
 * - 'thinking': Amber/Violet rotating orbit particles and deep glow
 * - 'idle': Calm breathing glow
 */
export default function WaveformVisualizer({
  state = 'listening', // 'speaking' | 'listening' | 'thinking' | 'idle'
  audioLevel = 0,      // 0 to 1 normalized volume
  analyser = null,     // optional Web Audio AnalyserNode
  size = 280,
}) {
  const canvasRef = useRef(null)
  const animFrameRef = useRef(null)
  const phaseRef = useRef(0)

  // Color schemes per state
  const colors = {
    speaking: {
      primary: '#0071e3',
      secondary: '#C9D0D6',
      glow: 'rgba(201, 208, 214, 0.45)',
      ringGlow: 'rgba(0, 113, 227, 0.25)',
      core: '#F8FAFC'
    },
    listening: {
      primary: '#10b981',
      secondary: '#34d399',
      glow: 'rgba(52, 211, 153, 0.45)',
      ringGlow: 'rgba(16, 185, 129, 0.25)',
      core: '#ecfdf5'
    },
    thinking: {
      primary: '#8b5cf6',
      secondary: '#f59e0b',
      glow: 'rgba(139, 92, 246, 0.45)',
      ringGlow: 'rgba(245, 158, 11, 0.25)',
      core: '#faf5ff'
    },
    idle: {
      primary: '#64748b',
      secondary: '#94a3b8',
      glow: 'rgba(148, 163, 184, 0.3)',
      ringGlow: 'rgba(100, 116, 139, 0.15)',
      core: '#f8fafc'
    }
  }[state] || {
    primary: '#0071e3',
    secondary: '#C9D0D6',
    glow: 'rgba(201, 208, 214, 0.45)',
    ringGlow: 'rgba(0, 113, 227, 0.25)',
    core: '#F8FAFC'
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let freqData = new Uint8Array(64)

    const render = () => {
      phaseRef.current += 0.04
      const p = phaseRef.current

      // Read audio data if analyser node is available
      let liveLevel = audioLevel
      if (analyser) {
        try {
          analyser.getByteFrequencyData(freqData)
          let sum = 0
          for (let i = 0; i < 32; i++) sum += freqData[i]
          liveLevel = Math.max(liveLevel, Math.min(1, sum / (32 * 140)))
        } catch {
          // analyser inactive
        }
      }

      // Simulated voice bounce if speaking or listening with no hardware analyser
      if (state === 'speaking') {
        liveLevel = Math.max(liveLevel, 0.35 + 0.35 * Math.sin(p * 3.5) * Math.cos(p * 2.2))
      } else if (state === 'listening' && liveLevel < 0.1) {
        liveLevel = Math.max(liveLevel, 0.12 + 0.08 * Math.sin(p * 2))
      } else if (state === 'thinking') {
        liveLevel = 0.25 + 0.15 * Math.sin(p * 4)
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const cx = canvas.width / 2
      const cy = canvas.height / 2
      const baseR = (size * 0.24) + (liveLevel * 14)

      // 1. Outer ambient halo
      const radialGrad = ctx.createRadialGradient(cx, cy, baseR * 0.4, cx, cy, baseR * 2.2)
      radialGrad.addColorStop(0, colors.glow)
      radialGrad.addColorStop(0.5, colors.ringGlow)
      radialGrad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = radialGrad
      ctx.beginPath()
      ctx.arc(cx, cy, baseR * 2.2, 0, Math.PI * 2)
      ctx.fill()

      // 2. Jarvis-like concentric rotating dashed rings
      const ringCount = 3
      for (let r = 1; r <= ringCount; r++) {
        const ringRadius = baseR + (r * 24) + (liveLevel * r * 8)
        ctx.save()
        ctx.beginPath()
        ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2)
        ctx.strokeStyle = r === 1 ? colors.secondary : colors.primary
        ctx.lineWidth = r === 1 ? 2.5 : 1.5
        ctx.globalAlpha = (0.75 - r * 0.18) + (liveLevel * 0.25)
        
        // Rotating dashes
        const dashSpeed = (r % 2 === 0 ? 1 : -1) * (0.015 + r * 0.005)
        const rot = p * dashSpeed * (state === 'thinking' ? 4 : 1.5)
        ctx.setLineDash([8 + r * 6, 12 + r * 4])
        ctx.lineDashOffset = -rot * 50
        ctx.stroke()
        ctx.restore()
      }

      // 3. Dynamic radial waveform tentacles around core
      const spokes = 48
      ctx.save()
      ctx.strokeStyle = colors.secondary
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'

      for (let i = 0; i < spokes; i++) {
        const angle = (i / spokes) * Math.PI * 2
        const freqIndex = i % 32
        const freqVal = freqData[freqIndex] ? freqData[freqIndex] / 255 : (Math.sin(angle * 4 + p * 3) + 1) / 2
        const length = (liveLevel * 32 * (0.5 + freqVal * 0.7)) + 4

        const x1 = cx + Math.cos(angle) * (baseR + 4)
        const y1 = cy + Math.sin(angle) * (baseR + 4)
        const x2 = cx + Math.cos(angle) * (baseR + 4 + length)
        const y2 = cy + Math.sin(angle) * (baseR + 4 + length)

        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.globalAlpha = 0.5 + (liveLevel * 0.5)
        ctx.stroke()
      }
      ctx.restore()

      // 4. Glowing inner orb core
      const coreGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, baseR)
      coreGrad.addColorStop(0, '#ffffff')
      coreGrad.addColorStop(0.35, colors.core)
      coreGrad.addColorStop(0.8, colors.secondary)
      coreGrad.addColorStop(1, colors.primary)

      ctx.save()
      ctx.shadowColor = colors.primary
      ctx.shadowBlur = 24 + liveLevel * 30
      ctx.fillStyle = coreGrad
      ctx.beginPath()
      ctx.arc(cx, cy, baseR, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // 5. Orbiting particles
      const particleCount = state === 'thinking' ? 6 : 4
      for (let i = 0; i < particleCount; i++) {
        const orbitAngle = p * (1.2 + i * 0.3) + (i * (Math.PI * 2 / particleCount))
        const orbitDistance = baseR * 1.5 + (Math.sin(p * 2 + i) * 12)
        const px = cx + Math.cos(orbitAngle) * orbitDistance
        const py = cy + Math.sin(orbitAngle) * orbitDistance

        ctx.save()
        ctx.fillStyle = '#ffffff'
        ctx.shadowColor = colors.secondary
        ctx.shadowBlur = 10
        ctx.beginPath()
        ctx.arc(px, py, 2.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      animFrameRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [state, audioLevel, analyser, size, colors])

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        width={size * 1.5}
        height={size * 1.5}
        style={{ width: size, height: size }}
        className="transition-all duration-300 transform scale-100"
      />
      {/* Central icon or symbol if needed */}
      <div className="absolute pointer-events-none flex flex-col items-center justify-center text-center">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md shadow-inner transition-colors duration-300"
          style={{
            background: state === 'speaking' ? 'rgba(0, 113, 227, 0.25)' : state === 'listening' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(139, 92, 246, 0.25)',
            border: `1px solid ${colors.secondary}66`
          }}
        >
          {state === 'speaking' && (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
          {state === 'listening' && (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          )}
          {state === 'thinking' && (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
              <line x1="12" x2="12" y1="2" y2="6" />
              <line x1="12" x2="12" y1="18" y2="22" />
              <line x1="4.93" x2="7.76" y1="4.93" y2="7.76" />
              <line x1="16.24" x2="19.07" y1="16.24" y2="19.07" />
              <line x1="2" x2="6" y1="12" y2="12" />
              <line x1="18" x2="22" y1="12" y2="12" />
              <line x1="4.93" x2="7.76" y1="19.07" y2="16.24" />
              <line x1="16.24" x2="19.07" y1="7.76" y2="4.93" />
            </svg>
          )}
          {state === 'idle' && (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="10" x2="10" y1="15" y2="9" />
              <line x1="14" x2="14" y1="15" y2="9" />
            </svg>
          )}
        </div>
      </div>
    </div>
  )
}
