import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'

/**
 * UserProfileDropdown
 * High-fidelity top-right user profile pill with initials avatar, full name display,
 * and an interactive dropdown containing user metadata, navigation links, and a functional Sign Out button.
 */
export default function UserProfileDropdown({ light = false }) {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Derive user info with profile.full_name as priority
  const fullName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')?.[0] ||
    'Learner'
  const email = profile?.email || user?.email || 'learner@pathfinder.ai'
  const initials =
    fullName
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'P'

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
    } finally {
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-[#121216] border border-[#e0e0e0] dark:border-[#27272F] hover:border-[#0066cc] dark:hover:border-[#0066cc] transition-all shadow-xs cursor-pointer select-none ${
          isOpen ? 'ring-2 ring-[#0066cc]/20 dark:ring-[#0066cc]/20 border-[#0066cc] dark:border-[#0066cc]' : ''
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Avatar Circle with initials */}
        <span className="w-8 h-8 rounded-lg bg-[#0066cc] dark:bg-[#0066cc] text-white dark:text-white font-bold text-xs flex items-center justify-center shadow-xs flex-shrink-0">
          {initials}
        </span>

        {/* User Name */}
        <span className="font-['Manrope'] font-bold text-xs sm:text-sm text-[#1d1d1f] dark:text-[#F8FAFC] max-w-[130px] truncate text-left hidden sm:inline">
          {fullName}
        </span>

        {/* Dropdown Chevron */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-[#7a7a7a] dark:text-[#A1A1AA] transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-[#0066cc] dark:text-[#0066cc]' : ''
          }`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Dropdown Menu Modal — framer-motion smooth open + close, frosted glass */}
      <AnimatePresence>
        {isOpen && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.96 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: 'top right' }}
          className="absolute right-0 mt-2.5 w-72 bg-white dark:bg-[#121216] border border-[#E6EAF2] dark:border-[#27272F] shadow-[0_24px_60px_rgba(14,27,56,0.22),0_4px_16px_rgba(14,27,56,0.06)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.8)] rounded-2xl py-2 z-[100]"
        >
          {/* User Header Details */}
          <div className="px-4 py-3 border-b border-[#f0f0f0] dark:border-[#202026]">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-[#0066cc] dark:bg-[#0066cc] text-white dark:text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#1d1d1f] dark:text-[#F8FAFC] truncate">{fullName}</p>
                <p className="text-xs text-[#7a7a7a] dark:text-[#A1A1AA] truncate">{email}</p>
              </div>
            </div>
          </div>

          {/* Core Profile & Navigation Options */}
          <div className="py-1.5">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                navigate('/account')
              }}
              className="w-full text-left px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#333333] dark:text-[#E2E8F0] hover:text-[#0066cc] dark:hover:text-[#0066cc] hover:bg-[#eaf2fc] dark:hover:bg-[#18181D] flex items-center gap-3 transition-colors cursor-pointer"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Account & Settings</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                navigate('/onboarding?replan=true')
              }}
              className="w-full text-left px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#333333] dark:text-[#E2E8F0] hover:text-[#0066cc] dark:hover:text-[#C9D0D6] hover:bg-[#eaf2fc] dark:hover:bg-[#18181D] flex items-center gap-3 transition-colors cursor-pointer"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.2 7.8 10.5 10.5 7.8 16.2 13.5 13.5" fill="currentColor" />
              </svg>
              <span>Re-calibrate Goal</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                navigate('/auth?mode=create')
              }}
              className="w-full text-left px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#333333] dark:text-[#E2E8F0] hover:text-[#0066cc] dark:hover:text-[#0066cc] hover:bg-[#eaf2fc] dark:hover:bg-[#18181D] flex items-center gap-3 transition-colors cursor-pointer"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
              <span>Create / Switch Account</span>
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-[#f0f0f0] dark:border-[#202026] my-1" />

          {/* Functional Sign Out */}
          <div className="px-2 py-1">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
