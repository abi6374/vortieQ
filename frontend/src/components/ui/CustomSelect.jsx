import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

/**
 * CustomSelect
 * Premium custom dropdown replacement for native <select> elements.
 * Features:
 * - Framer-motion smooth scale/fade animations
 * - Full outside-click handling
 * - Clean active checkmark indicator & hover micro-interactions
 * - Consistent with PathFinder design system
 */
export default function CustomSelect({
  value,
  onChange,
  options = [],
  className = '',
  buttonClassName = '',
  menuClassName = '',
  placeholder = 'Select option...',
  ariaLabel,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const reduce = useReducedMotion()

  // Normalize options array to { value, label, subtitle }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: opt.value,
        label: opt.label ?? String(opt.value),
        subtitle: opt.subtitle,
      }
    }
    return {
      value: opt,
      label: String(opt),
    }
  })

  const selectedOption = normalizedOptions.find((opt) => opt.value === value)

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`flex items-center justify-between gap-2.5 px-3.5 py-2.5 bg-white dark:bg-[#121216] border border-[#e0e0e0] dark:border-[#27272F] hover:border-[#0066cc] dark:hover:border-[#C9D0D6] rounded-xl text-sm font-semibold text-[#1d1d1f] dark:text-[#F8FAFC] shadow-2xs transition-all cursor-pointer focus:outline-none focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/15 ${
          isOpen ? 'border-[#0066cc] dark:border-[#C9D0D6] ring-2 ring-[#0066cc]/15' : ''
        } ${buttonClassName}`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-[#7a7a7a] dark:text-[#A1A1AA] transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-180 text-[#0066cc] dark:text-[#C9D0D6]' : ''
          }`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Floating Animated Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: 'top left' }}
            className={`absolute left-0 top-full mt-1.5 z-50 min-w-full w-max bg-white dark:bg-[#121216] border border-[#E6EAF2] dark:border-[#27272F] shadow-[0_20px_48px_rgba(14,27,56,0.18),0_4px_12px_rgba(14,27,56,0.06)] dark:shadow-[0_20px_48px_rgba(0,0,0,0.8)] rounded-xl py-1.5 overflow-hidden ${menuClassName}`}
            role="listbox"
          >
            {normalizedOptions.map((opt) => {
              const isSelected = opt.value === value
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value)
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#eaf2fc] dark:bg-[#18181D] text-[#0066cc] dark:text-[#C9D0D6] font-bold'
                      : 'text-[#333333] dark:text-[#E2E8F0] hover:bg-[#fafbfc] dark:hover:bg-[#18181D] hover:text-[#1d1d1f] dark:hover:text-[#F8FAFC]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div>{opt.label}</div>
                    {opt.subtitle && (
                      <div className="text-[11px] font-normal text-[#7a7a7a] dark:text-[#A1A1AA] mt-0.5">
                        {opt.subtitle}
                      </div>
                    )}
                  </div>

                    {isSelected && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="flex-shrink-0 text-[#0066cc] dark:text-[#C9D0D6]"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
