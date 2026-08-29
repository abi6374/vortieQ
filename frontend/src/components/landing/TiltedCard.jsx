import React, { useRef, useState } from 'react'

/**
 * TiltedCard (React Bits)
 * 3D Parallax Tilt Card with dynamic glare and spring-damping physics.
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
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Calculate rotation (-maxTilt to +maxTilt)
    const xRot = ((mouseY - height / 2) / (height / 2)) * -maxTilt
    const yRot = ((mouseX - width / 2) / (width / 2)) * maxTilt

    setTilt({ x: xRot, y: yRot })

    if (glare) {
      const glX = (mouseX / width) * 100
      const glY = (mouseY / height) * 100
      setGlarePos({ x: glX, y: glY, opacity: 0.25 })
    }
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setTilt({ x: 0, y: 0 })
    setGlarePos((prev) => ({ ...prev, opacity: 0 }))
  }

  return (
    <div
      style={{ perspective: '1000px' }}
      className={`inline-block ${className}`}
      {...props}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: isHovered
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(${scale}, ${scale}, ${scale})`
            : 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
          transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          transformStyle: 'preserve-3d',
        }}
        className="relative will-change-transform"
      >
        {children}

        {glare && (
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300 z-20"
            style={{
              opacity: glarePos.opacity,
              background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 60%)`,
            }}
          />
        )}
      </div>
    </div>
  )
}
