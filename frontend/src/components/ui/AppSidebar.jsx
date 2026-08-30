import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * PathFinder Floating Glassmorphic Sidebar
 * - Detached floating pill design (not attached to any screen edge)
 * - Vertically centered 8 navigation features with small gaps
 * - Expanded thickness (68px width) with 48px tactile buttons
 * - Smooth right-side flyout tooltip on hover showing feature text & badges
 * - Bottom Sign Out and live system status pulse
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
          <div className="relative flex items-center gap-2 bg-[#0c0d12]/95 dark:bg-[#182030]/95 text-white text-[12px] font-semibold px-3 py-2 rounded-xl shadow-[0_12px_28px_rgba(0,0,0,0.36)] border border-white/10 dark:border-white/15 backdrop-blur-md whitespace-nowrap">
            {/* Arrow point */}
            <span
              className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent"
              style={{ borderRightColor: 'rgba(12,13,18,0.95)' }}
            />
            <span>{label}</span>
            {badge && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[#0066cc] dark:bg-[#38BDF8] text-white dark:text-[#0B0E14]">
                {badge}
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Nav Item Component ───────────────────────────────────────────────────────

function NavItem({ item, isActive, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div className="relative flex items-center justify-center">
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
            layoutId="sidebar-active-pill"
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
          <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-[#0066cc] dark:bg-[#38BDF8]" />
        )}
      </button>

      {/* Flyout tooltip on hover */}
      <Tooltip label={item.label} badge={item.badge} visible={hovered} />
    </div>
  )
}

// ─── Sign Out Button ──────────────────────────────────────────────────────────

function SignOutButton({ onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div className="relative flex items-center justify-center">
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label="Sign Out"
        className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-150 cursor-pointer border-none outline-none"
        style={{
          color: hovered ? '#ef4444' : 'var(--muted, #7a7a7a)',
          background: hovered ? 'rgba(239,68,68,0.1)' : 'transparent',
        }}
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

// ─── Main Floating Sidebar ────────────────────────────────────────────────────

export default function AppSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const active = activeKeyFor(location.pathname)

  const handleSignOut = () => {
    navigate('/login')
  }

  return (
    <aside
      className="pf-sidebar-floating hidden md:flex flex-col items-center justify-between py-4 px-2 select-none"
      aria-label="Primary Navigation"
    >
      {/* Top micro spacing */}
      <div className="h-1 flex-none" />

      {/* Navigation Icons Group — Vertically Centered with small tight gaps */}
      <nav className="my-auto flex flex-col items-center gap-2 w-full">
        {NAV.map((item) => (
          <NavItem
            key={item.key}
            item={item}
            isActive={active === item.key}
            onClick={navigate}
          />
        ))}
      </nav>

      {/* Bottom Section: Separator + Sign Out + System Pulse */}
      <div className="flex flex-col items-center gap-2.5 pt-2 flex-none w-full">
        <div className="w-7 h-px bg-black/[0.08] dark:bg-white/[0.1]" />

        {/* Sign Out Button */}
        <SignOutButton onClick={handleSignOut} />

        {/* System active health indicator */}
        <div className="relative w-7 h-7 rounded-full flex items-center justify-center" title="System Operational">
          <span className="w-2 h-2 rounded-full bg-emerald-500 block shadow-[0_0_8px_rgba(34,197,94,0.7)]" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-60" />
          </span>
        </div>
      </div>
    </aside>
  )
}
