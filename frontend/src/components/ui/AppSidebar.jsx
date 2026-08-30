import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSidebar } from '../../contexts/SidebarContext'

/**
 * PathFinder Premium Glassmorphic Sidebar
 * - Floating pill design with glass blur
 * - Icon-only with animated flyout tooltips
 * - Spring-animated active indicator
 * - System health pulse indicator at bottom
 */

// ─── Icons ───────────────────────────────────────────────────────────────────

export const SidebarIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="4" />
    <path d="M9 3v18" />
  </svg>
)

export const ICONS = {
  roadmap: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" /><path d="M9 3v15M15 6v15" />
    </svg>
  ),
  progress: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" /><path d="m7 14 3-3 3 3 5-6" />
    </svg>
  ),
  skills: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 0 0-3 3 3 3 0 0 0-1 5.8V17a3 3 0 0 0 4 2.8A3 3 0 0 0 16 17v-3.2A3 3 0 0 0 15 8a3 3 0 0 0-3-3z" />
    </svg>
  ),
  resources: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 0-2 2z" /><path d="M4 5v14" />
    </svg>
  ),
  hackathons: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
    </svg>
  ),
  internships: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  interview: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
      <path d="m16 8 4-4" /><path d="m20 8-4-4" />
    </svg>
  ),
  coach: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
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

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function Tooltip({ label, badge, visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2 z-[300] pointer-events-none"
          initial={{ opacity: 0, x: -8, scale: 0.93 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -6, scale: 0.95 }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative flex items-center gap-2 bg-[#0d0f14]/95 text-white text-[12px] font-semibold px-3 py-2 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.32)] border border-white/10 backdrop-blur-md whitespace-nowrap">
            {/* Arrow */}
            <span
              className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent"
              style={{ borderRightColor: 'rgba(13,15,20,0.95)' }}
            />
            <span>{label}</span>
            {badge && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[#0066cc]/80 text-white">
                {badge}
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Nav Item ─────────────────────────────────────────────────────────────────

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
        className="relative w-11 h-11 flex items-center justify-center rounded-2xl transition-all duration-150 cursor-pointer border-none outline-none"
        style={{ background: 'transparent' }}
      >
        {/* Spring-animated active pill */}
        {isActive && (
          <motion.span
            layoutId="sidebar-active-pill"
            className="absolute inset-0 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, #0066cc, #0052a3)',
              boxShadow: '0 4px 16px rgba(0,102,204,0.40), 0 1px 3px rgba(0,102,204,0.25)',
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          />
        )}

        {/* Hover glow when not active */}
        {!isActive && hovered && (
          <motion.span
            className="absolute inset-0 rounded-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ background: 'rgba(0,102,204,0.08)' }}
          />
        )}

        {/* Icon */}
        <span
          className="relative z-10 transition-all duration-150"
          style={{
            color: isActive ? '#fff' : hovered ? '#0066cc' : '#6e6e73',
            strokeWidth: isActive ? 2.2 : 1.8,
            transform: isActive ? 'scale(1.08)' : 'scale(1)',
          }}
        >
          {React.cloneElement(ICONS[item.key], {
            style: { strokeWidth: isActive ? 2.2 : 1.8 }
          })}
        </span>

        {/* Badge dot for Beta items */}
        {item.badge && !isActive && (
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#0066cc]" />
        )}
      </button>

      {/* Flyout tooltip */}
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
        className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-150 cursor-pointer border-none"
        style={{
          color: hovered ? '#ef4444' : '#9ca3af',
          background: hovered ? 'rgba(239,68,68,0.08)' : 'transparent',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
      <AnimatePresence>
        {hovered && (
          <motion.div
            className="absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2 z-[300] pointer-events-none"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.15 }}
          >
            <div className="relative flex items-center bg-[#0d0f14]/95 text-white text-[12px] font-semibold px-3 py-2 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.32)] border border-white/10 whitespace-nowrap">
              <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent" style={{ borderRightColor: 'rgba(13,15,20,0.95)' }} />
              Sign Out
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export default function AppSidebar() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const active    = activeKeyFor(location.pathname)
  const { setCollapsed } = useSidebar()

  const handleSignOut = () => {
    // Clear any client-side session state if needed
    navigate('/login')
  }

  return (
    <aside
      className="pf-sidebar relative z-30 flex flex-col items-center h-full py-4 px-2 select-none"
      style={{
        width: 68,
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(24px) saturate(200%)',
        WebkitBackdropFilter: 'blur(24px) saturate(200%)',
        borderRight: '1px solid rgba(255,255,255,0.7)',
        boxShadow: '2px 0 24px -4px rgba(10,10,10,0.07), inset -1px 0 0 rgba(255,255,255,0.9)',
      }}
    >
      {/* ── Top: Logo + collapse toggle ── */}
      <div className="flex flex-col items-center gap-3 flex-none">
        {/* Brand Logo */}
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer border-none outline-none transition-transform duration-200 hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, #0071e3, #0066cc)',
            boxShadow: '0 4px 14px rgba(0,102,204,0.38), 0 1px 3px rgba(0,102,204,0.25)',
          }}
          aria-label="PathFinder Home"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <polygon points="16 8 10.5 10.5 8 16 13.5 13.5" fill="#fff" stroke="none" />
          </svg>
        </button>

        {/* Separator */}
        <div className="w-6 h-px bg-black/[0.07]" />

        {/* Collapse toggle */}
        <SidebarCollapseButton onClick={() => setCollapsed(true)} />
      </div>

      {/* ── Center: Navigation ── */}
      <nav className="flex flex-col items-center gap-1.5 flex-1 my-4 overflow-y-auto overflow-x-visible scrollbar-none">
        {NAV.map(item => (
          <NavItem
            key={item.key}
            item={item}
            isActive={active === item.key}
            onClick={navigate}
          />
        ))}
      </nav>

      {/* ── Bottom: Sign out + system pulse ── */}
      <div className="flex flex-col items-center gap-2 flex-none">
        <div className="w-6 h-px bg-black/[0.07]" />
        <SignOutButton onClick={handleSignOut} />

        {/* Live health indicator */}
        <div className="relative w-6 h-6 flex items-center justify-center" title="System Active">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-50" />
          </span>
        </div>
      </div>
    </aside>
  )
}

// ─── Collapse Button (shared) ─────────────────────────────────────────────────

function SidebarCollapseButton({ onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div className="relative flex items-center justify-center">
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label="Hide sidebar"
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer border border-black/[0.07] outline-none"
        style={{
          color: hovered ? '#0066cc' : '#9ca3af',
          background: hovered ? 'rgba(0,102,204,0.07)' : 'rgba(255,255,255,0.6)',
          borderColor: hovered ? 'rgba(0,102,204,0.3)' : 'rgba(0,0,0,0.07)',
        }}
      >
        <SidebarIcon className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {hovered && (
          <motion.div
            className="absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2 z-[300] pointer-events-none"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.14 }}
          >
            <div className="relative flex items-center bg-[#0d0f14]/95 text-white text-[12px] font-semibold px-3 py-2 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.32)] border border-white/10 whitespace-nowrap">
              <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent" style={{ borderRightColor: 'rgba(13,15,20,0.95)' }} />
              Collapse sidebar
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
