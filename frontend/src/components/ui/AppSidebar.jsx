import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSidebar } from '../../contexts/SidebarContext'
import { useStreak } from '../../hooks/useStreak'
import { useRoadmap } from '../../hooks/useRoadmap'

/**
 * PathFinder Floating Glassmorphic Sidebar
 * - Collapsed State (68px width):
 *   - Top Expand button + Compact Streak Icon
 *   - Vertically centered 8 feature icons with smooth hover tooltips
 *   - Bottom Sign Out button
 * - Expanded State (250px width):
 *   - Top Header with brand and Collapse button
 *   - Active Goal & Milestone Card
 *   - Daily Streak & Weekly Focus Widget
 *   - Grouped feature navigation (Learning, Opportunities, AI Studio)
 *   - Bottom Sign Out + System Operational status
 */

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

export const NAV_SECTIONS = [
  {
    title: 'Learning',
    items: [
      { key: 'roadmap', label: 'My Roadmap', path: '/dashboard' },
      { key: 'progress', label: 'Progress', path: '/progress' },
      { key: 'skills', label: 'Skill Insights', path: '/skills' },
    ]
  },
  {
    title: 'Explore',
    items: [
      { key: 'resources', label: 'Resources', path: '/resources' },
      { key: 'hackathons', label: 'Hackathons', path: '/hackathons' },
      { key: 'internships', label: 'Internships', path: '/internships' },
    ]
  },
  {
    title: 'AI Studio',
    items: [
      { key: 'interview', label: 'AI Interview', path: '/interview', badge: 'Beta' },
      { key: 'coach', label: 'AI Coach', path: '/coach' },
    ]
  }
]

export const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap(s => s.items)
export const NAV = ALL_NAV_ITEMS

export function activeKeyFor(pathname) {
  if (pathname.startsWith('/hackathons')) return 'hackathons'
  if (pathname.startsWith('/internships')) return 'internships'
  if (pathname.startsWith('/interview')) return 'interview'
  if (pathname.startsWith('/progress')) return 'progress'
  if (pathname.startsWith('/skill')) return 'skills'
  if (pathname.startsWith('/resources')) return 'resources'
  if (pathname.startsWith('/coach')) return 'coach'
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
            <span
              className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent"
              style={{ borderRightColor: 'rgba(12,13,18,0.95)' }}
            />
            <span>{label}</span>
            {badge && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[#0066cc] dark:bg-[#0066cc] text-white dark:text-white">
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
        className="relative w-11 h-11 flex items-center justify-center rounded-2xl transition-all duration-150 cursor-pointer border-none outline-none bg-transparent"
      >
        {isActive ? (
          <motion.span
            layoutId="sidebar-active-pill-collapsed"
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#0066cc] to-[#004fa3] dark:from-[#0066cc] dark:to-[#004fa3] shadow-[0_4px_16px_rgba(0,102,204,0.42)] dark:shadow-[0_4px_16px_rgba(0,102,204,0.4)]"
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          />
        ) : (
          <div className="absolute inset-0 rounded-2xl transition-colors duration-150 hover:bg-black/[0.05] dark:hover:bg-white/[0.07]" />
        )}

        <span
          className={`relative z-10 transition-all duration-150 flex items-center justify-center ${
            isActive
              ? 'text-white dark:text-white scale-[1.06]'
              : 'text-[#7a7a7a] hover:text-[#0066cc] dark:hover:text-[#0066cc]'
          }`}
        >
          {React.cloneElement(ICONS[item.key], {
            style: { strokeWidth: isActive ? 2.4 : 1.8 }
          })}
        </span>

        {item.badge && !isActive && (
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#0066cc] dark:bg-[#0066cc]" />
        )}
      </button>

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
      className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 cursor-pointer border-none outline-none text-left ${
        isActive
          ? 'text-white dark:text-white font-bold'
          : 'text-[#333333] dark:text-[#E2E8F0] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
      }`}
    >
      {isActive && (
        <motion.span
          layoutId="sidebar-active-pill-expanded"
          className="absolute inset-0 rounded-xl z-0 bg-gradient-to-br from-[#0066cc] to-[#004fa3] dark:from-[#0066cc] dark:to-[#004fa3] shadow-[0_4px_16px_rgba(0,102,204,0.38)] dark:shadow-[0_4px_16px_rgba(0,102,204,0.4)]"
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        />
      )}

      <span
        className={`relative z-10 flex-none flex items-center justify-center ${
          isActive ? 'text-white dark:text-white' : 'text-[#7a7a7a] dark:text-[#A1A1AA]'
        }`}
      >
        {React.cloneElement(ICONS[item.key], {
          style: { strokeWidth: isActive ? 2.4 : 1.8 }
        })}
      </span>

      <span className="relative z-10 font-semibold text-xs sm:text-[13px] truncate flex-1">
        {item.label}
      </span>

      {item.badge && (
        <span
          className={`relative z-10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider rounded-md ${
            isActive
              ? 'bg-white/20 text-white dark:bg-white/20 dark:text-white'
              : 'bg-[#0066cc]/10 dark:bg-[#0066cc]/20 text-[#0066cc] dark:text-[#0066cc]'
          }`}
        >
          {item.badge}
        </span>
      )}
    </button>
  )
}

// ─── Active Goal Card ─────────────────────────────────────────────────────────

function ActiveGoalCard({ roadmap, onClick }) {
  const roleName = roadmap?.path?.target_role || 'Full-Stack Developer'
  const percent = Math.round(roadmap?.percent || 0)
  const totalWeeks = roadmap?.weeks?.length || 8

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-3 rounded-2xl bg-gradient-to-b from-[#eaf2fc] to-[#f4f8fe] dark:from-[#18181D] dark:to-[#121216] border border-[#d2e4f8] dark:border-[#27272F] shadow-2xs hover:border-[#0066cc]/50 dark:hover:border-[#0066cc]/50 transition-all cursor-pointer group flex flex-col gap-1.5"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0066cc] dark:text-[#38BDF8] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0066cc] dark:bg-[#38BDF8] animate-pulse" />
          Active Goal
        </span>
        <span className="text-[11px] font-bold text-[#1d1d1f] dark:text-white font-mono">
          {percent}%
        </span>
      </div>

      <p className="text-xs font-bold text-[#1d1d1f] dark:text-white truncate group-hover:text-[#0066cc] dark:group-hover:text-[#38BDF8] transition-colors">
        {roleName}
      </p>

      {/* Progress Track */}
      <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden flex items-center">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#0071e3] to-[#0066cc] dark:from-[#0066cc] dark:to-[#38BDF8] transition-all duration-500"
          style={{ width: `${Math.max(6, percent)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-[#7a7a7a] dark:text-[#94A3B8]">
        <span>{totalWeeks} Week Plan</span>
        <span className="group-hover:translate-x-0.5 transition-transform text-[#0066cc] dark:text-[#38BDF8] font-bold">
          View Path →
        </span>
      </div>
    </button>
  )
}

// ─── Daily Streak Widget ──────────────────────────────────────────────────────

function DailyStreakWidget({ streak, onClick }) {
  const count = streak?.current_streak ?? 1
  const hoursThisWeek = streak?.minutes_this_week ? Math.round(streak.minutes_this_week / 60 * 10) / 10 : 2.5

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-3 py-2 rounded-xl bg-white/70 dark:bg-[#18181D]/80 border border-[#e6edf5] dark:border-[#27272F] shadow-2xs hover:border-amber-400/60 dark:hover:border-amber-400/60 transition-all cursor-pointer group flex items-center justify-between"
    >
      <div className="flex items-center gap-2">
        <span className="text-base flex-none group-hover:scale-110 transition-transform">
          🔥
        </span>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-[#1d1d1f] dark:text-white leading-tight">
            {count} Day Streak
          </span>
          <span className="text-[10px] text-[#7a7a7a] dark:text-[#94A3B8] leading-tight">
            {hoursThisWeek}h studied this week
          </span>
        </div>
      </div>

      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md flex-none">
        Active
      </span>
    </button>
  )
}

// ─── Expand / Collapse Toggle Button ──────────────────────────────────────────

function ToggleSidebarButton({ isExpanded, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div className="relative flex items-center justify-center flex-none">
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer border-none outline-none text-[#7a7a7a] hover:text-[#0066cc] dark:hover:text-[#0066cc] hover:bg-[#0066cc]/10 dark:hover:bg-[#0066cc]/10"
      >
        <SidebarIcon className="w-5 h-5" />
      </button>
      <Tooltip label={isExpanded ? 'Collapse Sidebar' : 'Expand Sidebar'} visible={hovered} />
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
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-150 cursor-pointer border-none outline-none text-[#7a7a7a] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span className="font-semibold text-xs sm:text-[13px]">Sign Out</span>
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
        className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer border-none outline-none text-[#7a7a7a] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
  const streak = useStreak()
  const roadmap = useRoadmap()

  const handleSignOut = () => {
    navigate('/login')
  }

  return (
    <aside
      className={`pf-sidebar-floating hidden md:flex flex-col select-none transition-all duration-300 ${
        isExpanded ? 'w-[250px] px-3 py-3' : 'w-[68px] px-2 py-3'
      }`}
      aria-label="Primary Navigation"
    >
      {/* ── Top Header Bar: Toggle Button on Left (Consistent Position) + Brand on Right ── */}
      <div className={`flex items-center flex-none w-full pb-2 ${isExpanded ? 'justify-start gap-2.5 px-0.5' : 'justify-center'}`}>
        <ToggleSidebarButton
          isExpanded={isExpanded}
          onClick={() => setCollapsed(isExpanded)}
        />

        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex items-center gap-2 overflow-hidden"
          >
            <span className="w-7 h-7 rounded-lg bg-[#0066cc] text-white flex items-center justify-center font-black text-xs shadow-xs flex-none">
              P
            </span>
            <span className="font-extrabold text-sm text-[#1d1d1f] dark:text-white tracking-tight font-['Manrope'] truncate">
              PathFinder
            </span>
          </motion.div>
        )}
      </div>

      {/* ── Expanded Widgets: Active Goal & Daily Streak ── */}
      {isExpanded ? (
        <div className="flex flex-col gap-2 pt-1 pb-2 flex-none">
          <ActiveGoalCard roadmap={roadmap} onClick={() => navigate('/dashboard')} />
          <DailyStreakWidget streak={streak} onClick={() => navigate('/progress')} />
        </div>
      ) : (
        /* Collapsed Mini Streak Icon */
        <div className="flex justify-center pb-2 flex-none">
          <button
            type="button"
            onClick={() => navigate('/progress')}
            title={`${streak?.current_streak || 1} Day Streak`}
            className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
          >
            🔥{streak?.current_streak || 1}
          </button>
        </div>
      )}

      <div className="w-full flex justify-center py-1 flex-none">
        <div className="w-full h-px bg-black/[0.08] dark:bg-white/[0.1]" />
      </div>

      {/* ── Navigation Section: Cleanly Grouped & Flowing Naturally ── */}
      <nav className="flex-1 flex flex-col gap-3 w-full pt-1 pb-2 overflow-y-auto no-scrollbar">
        {isExpanded ? (
          NAV_SECTIONS.map((section) => (
            <div key={section.title} className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868b] dark:text-[#71717A] px-3 py-1">
                {section.title}
              </span>
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <ExpandedNavItem
                    key={item.key}
                    item={item}
                    isActive={active === item.key}
                    onClick={navigate}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center gap-1.5 w-full">
            {ALL_NAV_ITEMS.map((item) => (
              <CollapsedNavItem
                key={item.key}
                item={item}
                isActive={active === item.key}
                onClick={navigate}
              />
            ))}
          </div>
        )}
      </nav>

      {/* ── Bottom Section: Separator + Sign Out ── */}
      <div className="flex flex-col gap-1.5 pt-2 flex-none w-full">
        <div className="w-full h-px bg-black/[0.08] dark:bg-white/[0.1]" />
        <SignOutButton isExpanded={isExpanded} onClick={handleSignOut} />
      </div>
    </aside>
  )
}

