import React, { useState, useEffect } from 'react'

/**
 * BackToTop
 * Floating pill positioned at the center bottom of the viewport.
 * Appears when scrolling past 180px.
 * Smoothly scrolls both window and all scrollable containers (.pf-content) to the top.
 */
export default function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const checkScroll = () => {
      const windowScrolled = window.scrollY > 180
      let containerScrolled = false
      const pfContent = document.querySelector('.pf-content')
      if (pfContent && pfContent.scrollTop > 180) {
        containerScrolled = true
      }
      setVisible(windowScrolled || containerScrolled)
    }

    window.addEventListener('scroll', checkScroll, { passive: true })

    const pfContent = document.querySelector('.pf-content')
    if (pfContent) {
      pfContent.addEventListener('scroll', checkScroll, { passive: true })
    }

    const interval = setInterval(checkScroll, 300)

    return () => {
      window.removeEventListener('scroll', checkScroll)
      if (pfContent) {
        pfContent.removeEventListener('scroll', checkScroll)
      }
      clearInterval(interval)
    }
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    const scrollableContainers = document.querySelectorAll(
      '.pf-content, .coach-chat-card > div, main'
    )
    scrollableContainers.forEach((el) => {
      if (el.scrollTo) {
        el.scrollTo({ top: 0, behavior: 'smooth' })
      }
    })
  }

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      title="Back to top"
      className="fixed z-40 bottom-7 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/95 text-[#0E1B38] hover:text-[#5B36E9] hover:bg-[#F5F1FF] border border-[#D8DFEB] hover:border-[#5B36E9] shadow-[0_8px_28px_rgba(14,27,56,0.18)] backdrop-blur-md transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-[#5B36E9]/40 hover:-translate-y-0.5 animate-in fade-in slide-in-from-bottom-3 duration-200"
    >
      <span className="w-5 h-5 rounded-full bg-[#F5F1FF] text-[#5B36E9] flex items-center justify-center group-hover:bg-[#5B36E9] group-hover:text-white transition-colors">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m18 15-6-6-6 6" />
        </svg>
      </span>
      <span className="text-xs font-bold font-['Manrope'] tracking-tight">Back to top</span>
    </button>
  )
}
