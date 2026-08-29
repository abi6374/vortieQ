import React, { useRef, useState } from 'react'

/**
 * MagneticButton (React Bits)
 * Magnetic cursor attraction button for high-conversion CTAs.
 */
export default function MagneticButton({
  children,
  className = '',
  strength = 30,
  onClick,
  ...props
}) {
  const btnRef = useRef(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e) => {
    if (!btnRef.current) return
    const { clientX, clientY } = e
    const { left, top, width, height } = btnRef.current.getBoundingClientRect()
    const centerX = left + width / 2
    const centerY = top + height / 2

    const deltaX = (clientX - centerX) / (width / 2)
    const deltaY = (clientY - centerY) / (height / 2)

    setPosition({ x: deltaX * strength, y: deltaY * strength })
  }

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 })
  }

  return (
    <button
      ref={btnRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        transition: position.x === 0 && position.y === 0
          ? 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
          : 'transform 0.1s ease-out',
      }}
      className={`will-change-transform active:scale-95 select-none ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
