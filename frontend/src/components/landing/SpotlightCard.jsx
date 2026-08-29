import React, { useRef, useState } from 'react'

/**
 * SpotlightCard (React Bits)
 * Cursor-tracking radial spotlight glow card with glassmorphism border highlight.
 */
export default function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(0, 102, 204, 0.15)',
  darkSpotlightColor = 'rgba(56, 189, 248, 0.18)',
  ...props
}) {
  const divRef = useRef(null)
  const [isFocused, setIsFocused] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0)

  const handleMouseMove = (e) => {
    if (!divRef.current) return
    const div = divRef.current
    const rect = div.getBoundingClientRect()
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const handleMouseEnter = () => {
    setOpacity(1)
  }

  const handleMouseLeave = () => {
    setOpacity(0)
  }

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden rounded-2xl border border-[#E0E0E0] dark:border-[#242E40] bg-white/80 dark:bg-[#141A26]/85 backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:border-[#0066CC]/40 dark:hover:border-[#38BDF8]/40 ${className}`}
      {...props}
    >
      {/* Radial Spotlight Light Cone */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-0"
        style={{
          opacity,
          background: `radial-gradient(550px circle at ${position.x}px ${position.y}px, var(--spotlight-color, ${spotlightColor}), transparent 75%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
