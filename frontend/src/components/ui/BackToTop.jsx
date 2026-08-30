import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * BackToTop
 * Floating pill positioned at the center bottom of the viewport.
 * Appears when scrolling past 180px.
 * Features a spring "pop" animation on hover without horizontal shift.
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

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="fixed inset-x-0 bottom-7 z-40 flex justify-center pointer-events-none"
        >
          <motion.button
            type="button"
            onClick={scrollToTop}
            aria-label="Back to top"
            title="Back to top"
            whileHover={{ scale: 1.08, y: -2 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 450, damping: 16 }}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/95 dark:bg-[#18181D]/95 text-[#1d1d1f] dark:text-[#F8FAFC] hover:text-[#0066cc] dark:hover:text-white hover:bg-[#eaf2fc] dark:hover:bg-[#202026] border border-[#e0e0e0] dark:border-[#27272F] hover:border-[#0066cc] dark:hover:border-[#0066cc] shadow-[0_8px_28px_rgba(29,29,31,0.18)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.7)] backdrop-blur-md cursor-pointer group focus:outline-none focus:ring-2 focus:ring-[#0066cc]/40 select-none"
          >
            <span className="w-5 h-5 rounded-full bg-[#eaf2fc] dark:bg-[#0066cc]/20 text-[#0066cc] dark:text-[#38BDF8] flex items-center justify-center group-hover:bg-[#0066cc] group-hover:text-white dark:group-hover:bg-[#0066cc] dark:group-hover:text-white transition-colors duration-200">
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
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
