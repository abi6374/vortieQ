import React, { useRef, useEffect } from 'react'

/**
 * TiltedCard (React Bits)
 * High-performance 3D Parallax Tilt Card with direct DOM transforms
 * (0 React re-renders on mousemove) and touch-safe physics.
 */
export default function TiltedCard({
  children,
  className = '',
  maxTilt = 12,
  glare = true,
  scale = 1.02,
  ...props
}) {
  const cardRef = useRef(null)
  const glareRef = useRef(null)
  const rafRef = useRef(null)

  const handleMouseMove = (e) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const xRot = ((mouseY - height / 2) / (height / 2)) * -maxTilt
    const yRot = ((mouseX - width / 2) / (width / 2)) * maxTilt

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      if (cardRef.current) {
        cardRef.current.style.transform = `perspective(1000px) rotateX(${xRot.toFixed(2)}deg) rotateY(${yRot.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`
        cardRef.current.style.transition = 'transform 0.08s ease-out'
      }
      if (glare && glareRef.current) {
        const glX = ((mouseX / width) * 100).toFixed(1)
        const glY = ((mouseY / height) * 100).toFixed(1)
        glareRef.current.style.opacity = '0.25'
        glareRef.current.style.background = `radial-gradient(circle at ${glX}% ${glY}%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 60%)`
      }
    })
  }

  const handleMouseLeave = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (cardRef.current) {
      cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)'
      cardRef.current.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
    }
    if (glare && glareRef.current) {
      glareRef.current.style.opacity = '0'
    }
  }

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div className={`inline-block ${className}`} {...props}>
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
          transformStyle: 'preserve-3d',
        }}
        className="relative will-change-transform"
      >
        {children}

        {glare && (
          <div
            ref={glareRef}
            className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300 z-20 opacity-0"
          />
        )}
      </div>
    </div>
  )
}

