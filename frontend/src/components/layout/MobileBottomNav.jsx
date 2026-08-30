import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ICONS, NAV, activeKeyFor } from '../ui/AppSidebar'

const V = '#0066cc'

/**
 * Mobile-only bottom navigation (<768px) — replaces the sidebar. Reuses the
 * exact same nav items/icons/labels as AppSidebar so nothing drifts between
 * the two breakpoints.
 */
export default function MobileBottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const active = activeKeyFor(location.pathname)

  return (
    <nav className="pf-bottom-nav" aria-label="Primary">
      {NAV.map((item) => {
        const on = active === item.key
        return (
          <button
            key={item.key}
            type="button"
            aria-current={on ? 'page' : undefined}
            onClick={() => navigate(item.path)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 border-none bg-transparent cursor-pointer"
            style={{ color: on ? V : '#7a7a7a' }}
          >
            {ICONS[item.key]}
            <span style={{ fontSize: 10, fontWeight: on ? 700 : 500 }}>{item.label.replace('My Roadmap', 'Roadmap').replace('Skill Insights', 'Insights').replace('AI Interview', 'Interview').replace('AI Coach', 'Coach')}</span>
          </button>
        )
      })}
    </nav>
  )
}
