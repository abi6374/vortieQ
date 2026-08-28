import React, { useState, useEffect } from 'react'

/**
 * BackToTop
 * Universal floating button that smoothly scrolls both the window and any
 * scrollable main app containers (.pf-content) to the top.
 * Appears when scrolling past 200px.
 */
export default function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const checkScroll = () => {
      const windowScrolled = window.scrollY > 200
      let containerScrolled = false
      const pfContent = document.querySelector('.pf-content')
      if (pfContent && pfContent.scrollTop > 200) {
        containerScrolled = true
      }
      setVisible(windowScrolled || containerScrolled)
    }

    window.addEventListener('scroll', checkScroll, { passive: true })
    
    // Also listen to any .pf-content element in the DOM
    const pfContent = document.querySelector('.pf-content')
    if (pfContent) {
      pfContent.addEventListener('scroll', checkScroll, { passive: true })
    }

    // Set an interval check in case page navigation swaps scroll containers
    const interval = setInterval(checkScroll, 400)

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
    const scrollableContainers = document.querySelectorAll('.pf-content, .coach-chat-card > div, main')
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
      className="fixed z-40 flex items-center justify-center w-10 h-10 rounded-full bg-white/95 text-[#0E1B38] hover:text-[#5B36E9] hover:bg-[#F5F1FF] border border-[#D8DFEB] hover:border-[#5B36E9] shadow-[0_8px_20px_rgba(14,27,56,0.12)] backdrop-blur-sm transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-[#5B36E9]/40 bottom-[84px] right-[28px] max-md:bottom-[138px] max-md:right-[16px]"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-transform group-hover:-translate-y-0.5"
      >
        <path d="m18 15-6-6-6 6" />
      </svg>
    </button>
  )
}
