import React, { useState, useEffect, useRef } from 'react'

/**
 * DecryptedText (React Bits)
 * Cybernetic text scrambling & decrypting effect that transitions smoothly
 * between career roles and tech domains.
 */
export default function DecryptedText({
  words = ['AI Engineer', 'Fullstack Architect', 'Cloud Solutions Lead', 'MLOps Specialist'],
  speed = 40,
  interval = 3200,
  className = '',
}) {
  const [index, setIndex] = useState(0)
  const [displayText, setDisplayText] = useState(words[0])
  const spanRef = useRef(null)
  const isVisibleRef = useRef(true)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+'

  useEffect(() => {
    if (!spanRef.current || !window.IntersectionObserver) return
    const observer = new IntersectionObserver(([entry]) => {
      isVisibleRef.current = entry.isIntersecting
    }, { threshold: 0.1 })
    observer.observe(spanRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let iteration = 0
    const targetWord = words[index]

    const intervalId = setInterval(() => {
      if (!isVisibleRef.current) return
      setDisplayText(() => {
        return targetWord
          .split('')
          .map((char, i) => {
            if (char === ' ') return ' '
            if (i < iteration) {
              return targetWord[i]
            }
            return chars[Math.floor(Math.random() * chars.length)]
          })
          .join('')
      })

      if (iteration >= targetWord.length) {
        clearInterval(intervalId)
      }

      iteration += 1 / 3
    }, speed)

    // Schedule next word
    const nextTimer = setTimeout(() => {
      if (isVisibleRef.current) {
        setIndex((prev) => (prev + 1) % words.length)
      }
    }, interval)

    return () => {
      clearInterval(intervalId)
      clearTimeout(nextTimer)
    }
  }, [index, speed, interval, words])

  return (
    <span ref={spanRef} className={`inline-block font-mono font-extrabold tracking-tight ${className}`}>
      {displayText}
      <span className="inline-block w-1.5 h-6 ml-1 bg-[#0066CC] dark:bg-[#38BDF8] animate-pulse align-middle" />
    </span>
  )
}
