import React, { useRef, useEffect } from 'react'

/**
 * MagneticButton (React Bits)
 * High-performance magnetic cursor attraction button for high-conversion CTAs.
 * Direct DOM transforms with zero React re-render overhead.
 */
export default function MagneticButton({
  children,
  className = '',
  strength = 24,
  onClick,
  ...props
}) {
  const btnRef = useRef(null)
  const rafRef = useRef(null)

  const handleMouseMove = (e) => {
    if (!btnRef.current) return
    const { clientX, clientY } = e
    const { left, top, width, height } = btnRef.current.getBoundingClientRect()
    const centerX = left + width / 2
    const centerY = top + height / 2

    const deltaX = (clientX - centerX) / (width / 2)
    const deltaY = (clientY - centerY) / (height / 2)

    const posX = (deltaX * strength).toFixed(1)
    const posY = (deltaY * strength).toFixed(1)

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      if (btnRef.current) {
        btnRef.current.style.transform = `translate3d(${posX}px, ${posY}px, 0)`
        btnRef.current.style.transition = 'transform 0.08s ease-out'
      }
    })
  }

  const handleMouseLeave = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (btnRef.current) {
      btnRef.current.style.transform = 'translate3d(0, 0, 0)'
      btnRef.current.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
    }
  }

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <button
      ref={btnRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        transform: 'translate3d(0, 0, 0)',
      }}
      className={`will-change-transform active:scale-95 select-none ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

