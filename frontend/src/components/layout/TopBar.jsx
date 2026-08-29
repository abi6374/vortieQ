import React, { useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import UserProfileDropdown from '../ui/UserProfileDropdown'
import ThemeToggle from '../ui/ThemeToggle'
import { useSidebar } from '../../contexts/SidebarContext'
import { SidebarIcon, NAV, ICONS, activeKeyFor } from '../ui/AppSidebar'

/**
 * TopBar: Fixed 72px shared top application bar.
 * Features:
 * - Permanent z-50 stacking context so all topbar menus always float above content.
 * - Framer-motion smooth animated navigation dropdown when collapsed.
 * - Generous vertical hover area with 300ms debounce buffer.
 */
export default function TopBar({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const active = activeKeyFor(location.pathname)
  const { isCollapsed, setCollapsed, isHoverOpen, setIsHoverOpen } = useSidebar()
  const hoverTimeoutRef = useRef(null)

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setIsHoverOpen(true)
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    // 300ms buffer so moving cursor down to select sections is 100% smooth
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHoverOpen(false)
    }, 300)
  }

  return (
    <header className="pf-topbar relative z-50">
      <div className="flex items-center gap-3 min-w-0 flex-1 h-full overflow-visible">
        {isCollapsed && (
          <div
            className="flex items-center gap-2 flex-none h-full relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Logo */}
            <button
              type="button"
              onClick={() => {
                navigate('/dashboard')
                setIsHoverOpen(false)
              }}
              className="flex items-center gap-2.5 bg-transparent border-none cursor-pointer text-left pr-1"
              aria-label="PathFinder Home"
            >
              <span
                className="grid place-items-center rounded-xl flex-none bg-gradient-to-br from-[#0071e3] to-[#0066cc] shadow-[0_4px_12px_rgba(0,102,204,0.35)]"
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

            {/* Toggle Button right next to the name */}
            <button
              type="button"
              onClick={() => {
                setCollapsed(false)
                setIsHoverOpen(false)
              }}
              title="Show sidebar"
              aria-label="Show sidebar"
              className="relative group flex items-center justify-center w-8 h-8 rounded-lg text-[#7a7a7a] hover:text-[#0066cc] hover:bg-[#eaf2fc] border border-[#f0f0f0] hover:border-[#0066cc] transition-all cursor-pointer shadow-2xs"
            >
              <SidebarIcon className="w-4 h-4" />
              <span className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#1d1d1f] text-white text-[11px] font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-50">
                Show sidebar
              </span>
            </button>

            <span className="h-6 w-px bg-[#f0f0f0] mx-1 flex-none" />

            {/* Hover Floating Navigation Dropdown with Framer Motion */}
            <AnimatePresence>
              {isHoverOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  style={{ transformOrigin: 'top left' }}
                  className="absolute top-[64px] left-0 z-50 w-[230px] pt-2"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="bg-white rounded-2xl border border-[#E6EAF2] shadow-[0_20px_50px_rgba(14,27,56,0.18),0_4px_12px_rgba(14,27,56,0.06)] p-2">
                    <nav className="flex flex-col gap-0.5">
                      {NAV.map((item) => {
                        const on = active === item.key
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => {
                              navigate(item.path)
                              setIsHoverOpen(false)
                            }}
                            className="flex items-center gap-3 rounded-[10px] border-none cursor-pointer text-left transition-colors w-full"
                            style={{
                              padding: '10px 12px',
                              background: on ? '#eaf2fc' : 'transparent',
                              color: on ? '#0066cc' : '#333333',
                              fontWeight: on ? 600 : 500,
                              fontSize: 14,
                            }}
                            onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = '#fafbfc' }}
                            onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = 'transparent' }}
                          >
                            <span style={{ color: on ? '#0066cc' : '#6e6e73', display: 'flex' }}>{ICONS[item.key]}</span>
                            <span>{item.label}</span>
                          </button>
                        )
                      })}
                    </nav>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {children}
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3 flex-none">
        <ThemeToggle />
        <UserProfileDropdown />
      </div>
    </header>
  )
}
