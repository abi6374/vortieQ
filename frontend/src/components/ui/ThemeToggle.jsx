import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'

/**
 * ThemeToggle Component
 * A sleek squircle theme switch button placed to the left of the Profile button in the TopBar.
 * Matches the macOS / Apple Control Center dark/light mode toggle aesthetics.
 */
export default function ThemeToggle({ className = '' }) {
  const { theme, isDark, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer select-none ${
        isDark
          ? 'bg-[#121216] hover:bg-[#18181D] text-[#F8FAFC] border border-[#27272F] shadow-[0_2px_8px_rgba(0,0,0,0.5)] hover:border-[#C9D0D6]'
          : 'bg-white hover:bg-[#F4F6F9] text-[#1D1D1F] border border-[#E0E0E0] shadow-2xs hover:border-[#0066CC]'
      } ${className}`}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="dark-sun"
            initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-center text-[#FBBF24]"
          >
            {/* High-fidelity Sun Icon with Central Ring and 8 Radial Rays */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="4.5" />
              <line x1="12" y1="2" x2="12" y2="4.5" />
              <line x1="12" y1="19.5" x2="12" y2="22" />
              <line x1="4.93" y1="4.93" x2="6.7" y2="6.7" />
              <line x1="17.3" y1="17.3" x2="19.07" y2="19.07" />
              <line x1="2" y1="12" x2="4.5" y2="12" />
              <line x1="19.5" y1="12" x2="22" y2="12" />
              <line x1="4.93" y1="19.07" x2="6.7" y2="17.3" />
              <line x1="17.3" y1="6.7" x2="19.07" y2="4.93" />
            </svg>
          </motion.div>
        ) : (
          <motion.div
            key="light-moon"
            initial={{ opacity: 0, rotate: 90, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: -90, scale: 0.6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-center text-[#4B5563]"
          >
            {/* High-fidelity Moon Icon */}
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}
