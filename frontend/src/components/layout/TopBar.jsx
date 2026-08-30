import React from 'react'
import { useNavigate } from 'react-router-dom'
import UserProfileDropdown from '../ui/UserProfileDropdown'
import ThemeToggle from '../ui/ThemeToggle'

/**
 * TopBar: Full-width Edge-to-Edge Top Application Header (72px)
 * Features:
 * - Extends full width from left to right with slight rounded bottom edges.
 * - PathFinder Brand (Logo + Text) cleanly positioned on the left.
 * - Dynamic center controls (e.g., Goal Selector, Roadmap shortcuts, search).
 * - Theme Switcher & User Profile on the right.
 */
export default function TopBar({ children }) {
  const navigate = useNavigate()

  return (
    <header className="pf-topbar w-full relative z-50 flex items-center justify-between">
      {/* Left: Brand Identity + Children Controls */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1 h-full overflow-visible">
        {/* Brand Logo & Name */}
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2.5 bg-transparent border-none cursor-pointer text-left pr-2 group transition-transform active:scale-95 flex-none"
          aria-label="PathFinder Home"
        >
          <span
            className="grid place-items-center rounded-xl flex-none bg-gradient-to-br from-[#0071e3] to-[#0066cc] shadow-[0_4px_12px_rgba(0,102,204,0.35)] group-hover:scale-105 transition-transform"
            style={{ width: 34, height: 34 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <polygon points="16 8 10.5 10.5 8 16 13.5 13.5" fill="#fff" stroke="none" />
            </svg>
          </span>
          <span className="font-['Manrope'] font-extrabold text-[#1d1d1f] dark:text-white text-[17px] tracking-tight">
            PathFinder
          </span>
        </button>

        <span className="h-6 w-px bg-black/[0.08] dark:bg-white/[0.1] mx-0.5 flex-none" />

        {/* Dynamic Center Page Header / Goal Selector */}
        <div className="flex-1 flex items-center min-w-0">
          {children}
        </div>
      </div>

      {/* Right: Theme Toggle + User Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-none pl-3">
        <ThemeToggle />
        <UserProfileDropdown />
      </div>
    </header>
  )
}
