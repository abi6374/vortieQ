import React, { useRef, useEffect } from 'react'

/**
 * SpotlightCard (React Bits)
 * High-performance cursor-tracking radial spotlight glow card.
 * Uses CSS custom properties for 0-rerender GPU accelerated rendering.
 */
export default function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(0, 0, 0, 0.06)',
  darkSpotlightColor = 'rgba(201, 208, 214, 0.16)',
  ...props
}) {
  const divRef = useRef(null)
  const spotRef = useRef(null)
  const rafRef = useRef(null)

  const handleMouseMove = (e) => {
    if (!divRef.current) return
    const rect = divRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      if (spotRef.current) {
        spotRef.current.style.setProperty('--spot-x', `${x.toFixed(1)}px`)
        spotRef.current.style.setProperty('--spot-y', `${y.toFixed(1)}px`)
        spotRef.current.style.opacity = '1'
      }
    })
  }

  const handleMouseLeave = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (spotRef.current) {
      spotRef.current.style.opacity = '0'
    }
  }

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden rounded-2xl border border-[#E0E0E0] dark:border-[#27272F] bg-white/90 dark:bg-[#121216]/90 backdrop-blur-md transition-all duration-200 hover:shadow-xl hover:border-black/40 dark:hover:border-[#C9D0D6]/40 will-change-transform ${className}`}
      {...props}
    >
      {/* Radial Spotlight Light Cone with GPU CSS variables */}
      <div
        ref={spotRef}
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-0 opacity-0"
        style={{
          background: `radial-gradient(550px circle at var(--spot-x, -999px) var(--spot-y, -999px), var(--spotlight-color, ${spotlightColor}), transparent 75%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

