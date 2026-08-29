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
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer focus:outline-none ${
          light
            ? 'bg-white/90 border-[#e0e0e0] hover:border-[#0066cc] hover:bg-white text-[#1d1d1f] shadow-xs'
            : 'bg-white border-[#e0e0e0] hover:border-[#0066cc] hover:bg-[#eaf2fc] text-[#1d1d1f] shadow-xs'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Avatar Circle with initials */}
        <span className="w-8 h-8 rounded-lg bg-[#0066cc] text-white font-bold text-xs flex items-center justify-center shadow-xs flex-shrink-0">
          {initials}
        </span>

        {/* User Name */}
        <span className="font-['Manrope'] font-bold text-xs sm:text-sm text-[#1d1d1f] max-w-[130px] truncate text-left hidden sm:inline">
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
          className={`text-[#7a7a7a] transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-[#0066cc]' : ''
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
          className="absolute right-0 mt-2.5 w-72 bg-white border border-[#E6EAF2] shadow-[0_24px_60px_rgba(14,27,56,0.22),0_4px_16px_rgba(14,27,56,0.06)] rounded-2xl py-2 z-[100]"
        >
          {/* User Header Details */}
          <div className="px-4 py-3 border-b border-[#f0f0f0]">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-[#0066cc] text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#1d1d1f] truncate">{fullName}</p>
                <p className="text-xs text-[#7a7a7a] truncate">{email}</p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#22A06B]" />
              <span className="text-[11px] font-semibold text-[#333333]">
                Active Learner
              </span>
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
              className="w-full text-left px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#333333] hover:text-[#0066cc] hover:bg-[#eaf2fc] flex items-center gap-3 transition-colors cursor-pointer"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Account</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                navigate('/settings')
              }}
              className="w-full text-left px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#333333] hover:text-[#0066cc] hover:bg-[#eaf2fc] flex items-center gap-3 transition-colors cursor-pointer"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6 1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Settings</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                navigate('/onboarding')
              }}
              className="w-full text-left px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#333333] hover:text-[#0066cc] hover:bg-[#eaf2fc] flex items-center gap-3 transition-colors cursor-pointer"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.2 7.8 10.5 10.5 7.8 16.2 13.5 13.5" fill="currentColor" />
              </svg>
              <span>Re-calibrate Goal</span>
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-[#f0f0f0] my-1" />

          {/* Functional Sign Out */}
          <div className="px-2 py-1">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer"
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
