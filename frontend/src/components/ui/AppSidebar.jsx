import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSidebar } from '../../contexts/SidebarContext'

/**
 * PathFinder Floating Glassmorphic Sidebar
 * - Collapsed State (68px width):
 *   - Top Expand button (symmetrically positioned matching the Logout button at the bottom)
 *   - Vertically centered 8 feature icons with smooth hover tooltips
 *   - Bottom Sign Out button + live green health indicator
 * - Expanded State (240px width):
 *   - Top Header with brand and Collapse button
 *   - Full-width feature items with Icon + Text Label + Badge
 *   - Bottom Sign Out with text + System Operational status
 */

export const SidebarIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="4" />
    <path d="M9 3v18" />
  </svg>
)

export const ICONS = {
  roadmap: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" /><path d="M9 3v15M15 6v15" />
    </svg>
  ),
  progress: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" /><path d="m7 14 3-3 3 3 5-6" />
    </svg>
  ),
  skills: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 0 0-3 3 3 3 0 0 0-1 5.8V17a3 3 0 0 0 4 2.8A3 3 0 0 0 16 17v-3.2A3 3 0 0 0 15 8a3 3 0 0 0-3-3z" />
    </svg>
  ),
  resources: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 0-2 2z" /><path d="M4 5v14" />
    </svg>
  ),
  hackathons: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
    </svg>
  ),
  internships: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  interview: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
      <path d="m16 8 4-4" /><path d="m20 8-4-4" />
    </svg>
  ),
  coach: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 1 1-4.9-7.4L21 3l-1.4 4.9A7.9 7.9 0 0 1 21 12z" />
    </svg>
  ),
}

export const NAV = [
  { key: 'roadmap',     label: 'My Roadmap',    path: '/dashboard' },
  { key: 'progress',   label: 'Progress',       path: '/progress' },
  { key: 'skills',     label: 'Skill Insights', path: '/skills' },
  { key: 'resources',  label: 'Resources',      path: '/resources' },
  { key: 'hackathons', label: 'Hackathons',     path: '/hackathons' },
  { key: 'internships',label: 'Internships',    path: '/internships' },
  { key: 'interview',  label: 'AI Interview',   path: '/interview', badge: 'Beta' },
  { key: 'coach',      label: 'AI Coach',       path: '/coach' },
]

export function activeKeyFor(pathname) {
  if (pathname.startsWith('/hackathons'))  return 'hackathons'
  if (pathname.startsWith('/internships')) return 'internships'
  if (pathname.startsWith('/interview'))   return 'interview'
  if (pathname.startsWith('/progress'))    return 'progress'
  if (pathname.startsWith('/skill'))       return 'skills'
  if (pathname.startsWith('/resources'))   return 'resources'
  if (pathname.startsWith('/coach'))       return 'coach'
  if (pathname.startsWith('/roadmap') || pathname.startsWith('/dashboard') || pathname.startsWith('/workspace')) return 'roadmap'
  return ''
}

// ─── Tooltip Flyout ──────────────────────────────────────────────────────────

function Tooltip({ label, badge, visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2 z-[300] pointer-events-none"
          initial={{ opacity: 0, x: -8, scale: 0.94 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -6, scale: 0.94 }}
          transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative flex items-center gap-2 bg-[#0c0d12]/95 dark:bg-[#18181D]/95 text-white text-[12px] font-semibold px-3 py-2 rounded-xl shadow-[0_12px_28px_rgba(0,0,0,0.5)] border border-white/10 dark:border-white/15 backdrop-blur-md whitespace-nowrap">
            {/* Arrow point */}
            <span
              className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent"
              style={{ borderRightColor: 'rgba(12,13,18,0.95)' }}
            />
            <span>{label}</span>
            {badge && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[#0066cc] dark:bg-[#C9D0D6] text-white dark:text-[#09090B]">
                {badge}
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Collapsed Nav Item (Icon Only with Flyout Tooltip) ────────────────────────

function CollapsedNavItem({ item, isActive, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div className="relative flex items-center justify-center w-full">
      <button
        type="button"
        onClick={() => onClick(item.path)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={item.label}
        aria-current={isActive ? 'page' : undefined}
        className="relative w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-150 cursor-pointer border-none outline-none bg-transparent"
      >
        {/* Spring-animated active capsule pill */}
        {isActive ? (
          <motion.span
            layoutId="sidebar-active-pill-collapsed"
            className="absolute inset-0 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, #0066cc, #004fa3)',
              boxShadow: '0 4px 16px rgba(0,102,204,0.42), 0 1px 3px rgba(0,102,204,0.25)',
            }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          />
        ) : (
          <div className="absolute inset-0 rounded-2xl transition-colors duration-150 hover:bg-black/[0.05] dark:hover:bg-white/[0.07]" />
        )}

        {/* Icon */}
        <span
          className="relative z-10 transition-all duration-150 flex items-center justify-center"
          style={{
            color: isActive ? '#ffffff' : hovered ? 'var(--violet, #0066cc)' : 'var(--muted, #7a7a7a)',
            transform: isActive ? 'scale(1.06)' : 'scale(1)',
          }}
        >
          {React.cloneElement(ICONS[item.key], {
            style: { strokeWidth: isActive ? 2.2 : 1.8 }
          })}
        </span>

        {/* Micro badge dot for Beta */}
        {item.badge && !isActive && (
          <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-[#0066cc] dark:bg-[#C9D0D6]" />
        )}
      </button>

      {/* Flyout tooltip on hover */}
      <Tooltip label={item.label} badge={item.badge} visible={hovered} />
    </div>
  )
}

// ─── Expanded Nav Item (Icon + Text Label + Badge) ─────────────────────────────

function ExpandedNavItem({ item, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(item.path)}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
      className={`relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition-all duration-150 cursor-pointer border-none outline-none text-left ${
        isActive
          ? 'text-white'
          : 'text-[#333333] dark:text-[#E2E8F0] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
      }`}
    >
      {/* Spring active background */}
      {isActive && (
        <motion.span
          layoutId="sidebar-active-pill-expanded"
          className="absolute inset-0 rounded-2xl z-0"
          style={{
            background: 'linear-gradient(135deg, #0066cc, #004fa3)',
            boxShadow: '0 4px 16px rgba(0,102,204,0.38), 0 1px 3px rgba(0,102,204,0.25)',
          }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        />
      )}

      {/* Icon */}
      <span
        className="relative z-10 flex-none flex items-center justify-center"
        style={{
          color: isActive ? '#ffffff' : 'var(--muted, #7a7a7a)',
        }}
      >
        {React.cloneElement(ICONS[item.key], {
          style: { strokeWidth: isActive ? 2.2 : 1.8 }
        })}
      </span>

      {/* Label Text */}
      <span className="relative z-10 font-semibold text-sm truncate flex-1">
        {item.label}
      </span>

      {/* Badge */}
      {item.badge && (
        <span
          className={`relative z-10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${
            isActive
              ? 'bg-white/20 text-white'
              : 'bg-[#0066cc]/10 dark:bg-[#C9D0D6]/20 text-[#0066cc] dark:text-[#C9D0D6]'
          }`}
        >
          {item.badge}
        </span>
      )}
    </button>
  )
}

// ─── Expand / Collapse Toggle Button ──────────────────────────────────────────

function ToggleSidebarButton({ isExpanded, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div className="relative flex items-center justify-center">
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-150 cursor-pointer border-none outline-none text-[#7a7a7a] hover:text-[#0066cc] dark:hover:text-[#C9D0D6] hover:bg-[#0066cc]/10 dark:hover:bg-white/10"
      >
        <SidebarIcon className="w-5 h-5" />
      </button>
      {!isExpanded && (
        <Tooltip label="Expand Sidebar" visible={hovered} />
      )}
    </div>
  )
}

// ─── Sign Out Button ──────────────────────────────────────────────────────────

function SignOutButton({ isExpanded, onClick }) {
  const [hovered, setHovered] = useState(false)

  if (isExpanded) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition-all duration-150 cursor-pointer border-none outline-none text-[#7a7a7a] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span className="font-semibold text-sm">Sign Out</span>
      </button>
    )
  }

  return (
    <div className="relative flex items-center justify-center">
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label="Sign Out"
        className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-150 cursor-pointer border-none outline-none text-[#7a7a7a] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
      <Tooltip label="Sign Out" visible={hovered} />
    </div>
  )
}

// ─── Main Floating Sidebar Component ──────────────────────────────────────────

export default function AppSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const active = activeKeyFor(location.pathname)
  const { isCollapsed, setCollapsed } = useSidebar()
  const isExpanded = !isCollapsed

  const handleSignOut = () => {
    navigate('/login')
  }

  return (
    <aside
      className={`pf-sidebar-floating hidden md:flex flex-col select-none transition-all duration-300 ${
        isExpanded ? 'w-[240px] px-3' : 'w-[68px] px-2'
      }`}
      aria-label="Primary Navigation"
    >
      {/* ── Top Section: Symmetrical Expand/Collapse Button ── */}
      <div className={`flex items-center flex-none w-full ${isExpanded ? 'justify-between px-1.5 pb-2' : 'justify-center pb-1'}`}>
        {isExpanded && (
          <span className="font-['Manrope'] font-bold text-xs uppercase tracking-wider text-[#7a7a7a] dark:text-[#94A3B8]">
            Menu
          </span>
        )}
        <ToggleSidebarButton
          isExpanded={isExpanded}
          onClick={() => setCollapsed(isExpanded)}
        />
      </div>

      <div className={`w-full flex justify-center py-1 flex-none`}>
        <div className="w-full h-px bg-black/[0.08] dark:bg-white/[0.1]" />
      </div>

      {/* ── Center Section: Vertically Centered 8 Features ── */}
      <nav className={`my-auto flex flex-col items-center gap-1.5 w-full ${isExpanded ? 'py-2' : 'py-1'}`}>
        {NAV.map((item) =>
          isExpanded ? (
            <ExpandedNavItem
              key={item.key}
              item={item}
              isActive={active === item.key}
              onClick={navigate}
            />
          ) : (
            <CollapsedNavItem
              key={item.key}
              item={item}
              isActive={active === item.key}
              onClick={navigate}
            />
          )
        )}
      </nav>

      {/* ── Bottom Section: Separator + Sign Out + System Pulse ── */}
      <div className="flex flex-col gap-2 pt-2 flex-none w-full">
        <div className="w-full h-px bg-black/[0.08] dark:bg-white/[0.1]" />

        {/* Sign Out */}
        <SignOutButton isExpanded={isExpanded} onClick={handleSignOut} />

        {/* Live System Status Pulse */}
        <div className={`flex items-center gap-2.5 py-1 ${isExpanded ? 'px-3' : 'justify-center'}`} title="System Operational">
          <div className="relative w-4 h-4 flex items-center justify-center flex-none">
            <span className="w-2 h-2 rounded-full bg-emerald-500 block shadow-[0_0_8px_rgba(34,197,94,0.7)]" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-60" />
            </span>
          </div>
          {isExpanded && (
            <span className="text-[11px] font-semibold text-[#7a7a7a] dark:text-[#94A3B8]">
              System Operational
            </span>
          )}
        </div>
      </div>
    </aside>
  )
}
