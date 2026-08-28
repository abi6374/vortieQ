import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSidebar } from '../../contexts/SidebarContext'

/**
 * The PathFinder Sidebar (Expanded State).
 * Features:
 * - 72px Header: PathFinder Logo on the left, Sidebar Toggle Button right next to the name on the right.
 * - Navigation links in vertical rhythm.
 */

const V = '#5B36E9'
const V_SOFT = '#F5F1FF'

export const SidebarIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="18" height="18" x="3" y="3" rx="4" />
    <path d="M9 3v18" />
  </svg>
)

// Fixed icon mapping. Do not redefine these per page.
export const ICONS = {
  roadmap: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" /><path d="M9 3v15M15 6v15" />
    </svg>
  ),
  progress: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" /><path d="m7 14 3-3 3 3 5-6" />
    </svg>
  ),
  skills: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 0 0-3 3 3 3 0 0 0-1 5.8V17a3 3 0 0 0 4 2.8A3 3 0 0 0 16 17v-3.2A3 3 0 0 0 15 8a3 3 0 0 0-3-3z" />
    </svg>
  ),
  resources: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 0-2 2z" /><path d="M4 5v14" />
    </svg>
  ),
  coach: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 1 1-4.9-7.4L21 3l-1.4 4.9A7.9 7.9 0 0 1 21 12z" />
    </svg>
  ),
}

// Terminology is fixed — see the brief. Do not rename these labels.
export const NAV = [
  { key: 'roadmap',   label: 'My roadmap',     path: '/dashboard' },
  { key: 'progress',  label: 'Progress',       path: '/progress' },
  { key: 'skills',    label: 'Skill insights', path: '/skills' },
  { key: 'resources', label: 'Resources',      path: '/resources' },
  { key: 'coach',     label: 'AI coach',       path: '/coach' },
]

export function activeKeyFor(pathname) {
  if (pathname.startsWith('/progress')) return 'progress'
  if (pathname.startsWith('/skill')) return 'skills'
  if (pathname.startsWith('/resources')) return 'resources'
  if (pathname.startsWith('/coach')) return 'coach'
  if (pathname.startsWith('/roadmap') || pathname.startsWith('/dashboard') || pathname.startsWith('/workspace')) return 'roadmap'
  return ''
}

export default function AppSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const active = activeKeyFor(location.pathname)
  const { setCollapsed } = useSidebar()

  return (
    <aside className="pf-sidebar relative z-30 flex flex-col h-full bg-white border-r border-[#E6EAF2]">
      {/* 72px Top Header: Logo on the left, Toggle button directly next to the name */}
      <div className="h-[72px] flex items-center justify-between px-3 border-b border-[#E6EAF2] flex-none">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2.5 bg-transparent border-none cursor-pointer text-left"
          aria-label="PathFinder Home"
        >
          <span
            className="grid place-items-center rounded-xl flex-none"
            style={{ width: 34, height: 34, background: `linear-gradient(160deg,#6B47F0,${V})`, boxShadow: '0 4px 10px rgba(91,54,233,.30)' }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h4l3 8 4-16 3 8h4" />
            </svg>
          </span>
          <span className="font-['Manrope'] font-extrabold text-[#0E1B38]" style={{ fontSize: 17, letterSpacing: '-.02em' }}>
            PathFinder
          </span>
        </button>

        {/* Toggle button right next to name */}
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          title="Hide sidebar"
          aria-label="Hide sidebar"
          className="relative group flex items-center justify-center w-8 h-8 rounded-lg text-[#74819A] hover:text-[#5B36E9] hover:bg-[#F5F1FF] border border-[#E6EAF2] hover:border-[#5B36E9] transition-all cursor-pointer shadow-2xs"
        >
          <SidebarIcon className="w-4 h-4" />
          <span className="pointer-events-none absolute left-full ml-2 px-2 py-1 bg-[#0E1B38] text-white text-[11px] font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-50">
            Hide sidebar
          </span>
        </button>
      </div>

      {/* Navigation list */}
      <div className="p-3 flex-1 overflow-y-auto">
        <nav className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const on = active === item.key
            return (
              <button
                key={item.key}
                type="button"
                aria-current={on ? 'page' : undefined}
                title={item.label}
                onClick={() => navigate(item.path)}
                className="flex items-center gap-3 rounded-[10px] border-none cursor-pointer text-left transition-colors w-full"
                style={{
                  padding: '9px 12px',
                  background: on ? V_SOFT : 'transparent',
                  color: on ? V : '#475569',
                  fontWeight: on ? 600 : 500,
                  fontSize: 14,
                }}
                onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = '#FAF8FF' }}
                onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ color: on ? V : '#64748B', display: 'flex' }}>{ICONS[item.key]}</span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
