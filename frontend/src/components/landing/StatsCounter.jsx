import React, { useEffect, useState, useRef } from 'react'

/**
 * StatsCounter (React Bits)
 * Intersection-triggered animated counters for social proof and metrics.
 */
export function AnimatedNumber({ value = 100, suffix = '', duration = 1600 }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true)
        }
      },
      { threshold: 0.2 }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [started])

  useEffect(() => {
    if (!started) return
    let startTimestamp = null
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(easeOut * value))
      if (progress < 1) {
        window.requestAnimationFrame(step)
      } else {
        setCount(value)
      }
    }
    window.requestAnimationFrame(step)
  }, [started, value, duration])

  return (
    <span ref={ref} className="font-balboa font-black tracking-tight">
      {count.toLocaleString()}
      {suffix}
    </span>
  )
}

export default function StatsCounter() {
  const stats = [
    { value: 15400, suffix: '+', label: 'Adaptive Roadmaps Created', desc: 'Across 40+ engineering domains' },
    { value: 94, suffix: '%', label: 'Faster Skill Acquisition', desc: 'Vs. static video course playlists' },
    { value: 99, suffix: '.8%', label: 'Contextual Accuracy', desc: 'Driven by deep resume & repo analysis' },
    { value: 4, suffix: '.9★', label: 'Learner Rating', desc: 'Rated by hiring-bound developers' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 w-full max-w-6xl mx-auto py-8">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="p-6 rounded-2xl border border-[#E0E0E0] dark:border-[#27272F] bg-white/70 dark:bg-[#121216]/75 backdrop-blur-xl flex flex-col justify-between hover:border-black/40 dark:hover:border-[#C9D0D6]/40 transition-all duration-300 shadow-xs hover:shadow-lg group"
        >
          <div className="text-3xl sm:text-4xl md:text-5xl text-[#0066CC] dark:text-[#C9D0D6] group-hover:scale-105 transition-transform duration-300 origin-left">
            <AnimatedNumber value={stat.value} suffix={stat.suffix} />
          </div>
          <div className="mt-4">
            <div className="font-bold text-sm sm:text-base text-[#1D1D1F] dark:text-[#F8FAFC]">
              {stat.label}
            </div>
            <div className="text-xs text-[#7A7A7A] dark:text-[#94A3B8] mt-1">
              {stat.desc}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
