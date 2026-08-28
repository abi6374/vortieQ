import React from 'react'
import UserProfileDropdown from '../ui/UserProfileDropdown'

/**
 * The one shared top application bar. Fixed 72px (64px on mobile), white,
 * bottom border — identical height, padding, and alignment on every page.
 * `children` is the page-specific left/middle content (goal selector, view
 * roadmap action, search, ...); the user menu is always appended at the
 * right so it never moves between pages.
 */
export default function TopBar({ children }) {
  return (
    <header className="pf-topbar">
      <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">{children}</div>
      <div className="flex items-center gap-3 flex-none">
        <UserProfileDropdown />
      </div>
    </header>
  )
}
