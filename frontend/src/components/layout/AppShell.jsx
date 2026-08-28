import React from 'react'
import AppSidebar from '../ui/AppSidebar'
import TopBar from './TopBar'
import MobileBottomNav from './MobileBottomNav'

/**
 * The single application shell shared by every authenticated PathFinder page
 * (Dashboard/Roadmap, Progress, Skill Insights, Resources, AI Coach).
 *
 * Fixed viewport layout: sidebar + top bar never scroll; only `.pf-content`
 * scrolls. The browser page itself never scrolls on desktop.
 *
 * `topBar` is page-specific content rendered on the left of the shared top
 * bar (goal selector, "View roadmap", search, ...) — the user menu on the
 * right is always the same component, added by <TopBar>.
 */
export default function AppShell({ topBar = null, children, contentClassName = '' }) {
  return (
    <div className="pf-shell">
      <AppSidebar />
      <div className="pf-main">
        <TopBar>{topBar}</TopBar>
        <div className={`pf-content ${contentClassName}`}>{children}</div>
      </div>
      <MobileBottomNav />
    </div>
  )
}
