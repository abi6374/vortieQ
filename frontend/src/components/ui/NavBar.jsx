import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import UserProfileDropdown from './UserProfileDropdown'

export default function NavBar({ children }) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="sticky top-0 z-30 bg-white dark:bg-[#121216] border-b border-[#e0e0e0] dark:border-[#27272F] shadow-[0_2px_10px_rgba(25,49,75,0.04)]">
      <div className="max-w-7xl mx-auto h-16 px-4 sm:px-8 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2.5 group focus:outline-none cursor-pointer"
            aria-label="PathFinder Home"
          >
            <span className="w-9 h-9 rounded-xl bg-[#dbeafc] dark:bg-[#0066cc] text-[#0066cc] dark:text-white flex items-center justify-center shadow-sm group-hover:bg-[#0066cc] group-hover:text-white dark:group-hover:bg-[#0052A3] dark:group-hover:text-white transition-all">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.2 7.8 10.5 10.5 7.8 16.2 13.5 13.5" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <span className="font-['Manrope'] font-extrabold text-xl tracking-tight text-[#1d1d1f] dark:text-white">
              PathFinder
            </span>
          </button>

          {/* Quick Nav Links */}
          <div className="hidden md:flex items-center gap-1 pl-4 border-l border-[#f0f0f0] dark:border-[#27272F]">
            <Link
              to="/dashboard"
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                location.pathname === '/dashboard' || location.pathname === '/workspace'
                  ? 'bg-[#eaf2fc] dark:bg-[#0066cc]/20 text-[#0066cc] dark:text-[#0066cc]'
                  : 'text-[#333333] dark:text-[#CBD5E1] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              Workspace
            </Link>
            <Link
              to="/skills"
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                location.pathname === '/skills'
                  ? 'bg-[#eaf2fc] dark:bg-[#0066cc]/20 text-[#0066cc] dark:text-[#0066cc]'
                  : 'text-[#333333] dark:text-[#CBD5E1] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              Skills
            </Link>
            <Link
              to="/progress"
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                location.pathname === '/progress'
                  ? 'bg-[#eaf2fc] dark:bg-[#0066cc]/20 text-[#0066cc] dark:text-[#0066cc]'
                  : 'text-[#333333] dark:text-[#CBD5E1] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              Progress
            </Link>
            <Link
              to="/onboarding"
              className="px-3 py-1.5 rounded-lg text-sm font-semibold text-[#333333] dark:text-[#CBD5E1] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              Goal Compass
            </Link>
          </div>
        </div>

        {/* Right action area */}
        <div className="flex items-center gap-3 sm:gap-4">
          {children}
          <UserProfileDropdown />
        </div>
      </div>
    </nav>
  )
}

