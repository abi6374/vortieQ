import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSidebar } from '../../contexts/SidebarContext'

/**
 * The PathFinder Sidebar (Expanded State).
 * Features:
 * - 72px Header: PathFinder Logo on the left, Sidebar Toggle Button right next to the name on the right.
 * - Navigation links in vertical rhythm.
 */

const V = '#0066cc'
const V_SOFT = '#eaf2fc'

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
  interview: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
      <path d="m16 8 4-4" />
      <path d="m20 8-4-4" />
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
  { key: 'interview', label: 'AI Interview',   path: '/interview', badge: 'Beta' },
  { key: 'coach',     label: 'AI coach',       path: '/coach' },
]

export function activeKeyFor(pathname) {
  if (pathname.startsWith('/interview')) return 'interview'
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
    <aside className="pf-sidebar relative z-30 flex flex-col h-full bg-white border-r border-[#f0f0f0]">
      {/* 72px Top Header: Logo on the left, Toggle button directly next to the name */}
      <div className="h-[72px] flex items-center justify-between px-3 border-b border-[#f0f0f0] dark:border-[#242E40] flex-none relative z-50 overflow-visible">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2.5 bg-transparent border-none cursor-pointer text-left"
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

        {/* Toggle button right next to name */}
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="Hide sidebar"
          className="relative z-50 group flex items-center justify-center w-8 h-8 rounded-lg text-[#7a7a7a] hover:text-[#0066cc] hover:bg-[#eaf2fc] dark:hover:bg-white/10 border border-[#f0f0f0] dark:border-[#242E40] hover:border-[#0066cc] dark:hover:border-[#38BDF8] transition-all cursor-pointer shadow-2xs"
        >
          <SidebarIcon className="w-4 h-4" />
          <span className="pointer-events-none absolute top-full right-0 mt-2 px-2.5 py-1 bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-semibold rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-2xl z-[9999] border border-slate-700">
            Hide sidebar
          </span>
        </button>
      </div>

      {/* Navigation list */}
      <div className="p-3 flex-1 overflow-y-auto relative z-10">
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
                  color: on ? V : '#333333',
                  fontWeight: on ? 600 : 500,
                  fontSize: 14,
                }}
                onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = '#fafbfc' }}
                onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ color: on ? V : '#6e6e73', display: 'flex' }}>{ICONS[item.key]}</span>
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-[#0066cc]/10 text-[#0066cc] dark:bg-[#38BDF8]/20 dark:text-[#38BDF8]">
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
