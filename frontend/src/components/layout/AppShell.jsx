import React from 'react'
import AppSidebar from '../ui/AppSidebar'
import TopBar from './TopBar'
import MobileBottomNav from './MobileBottomNav'

/**
 * AppShell:
 * - Full-width edge-to-edge TopBar at the top.
 * - Floating glassmorphic pill sidebar detached on the left.
 * - Centered, smooth-scrolling workspace content.
 * - Mobile bottom nav for small screens (<768px).
 */
export default function AppShell({ topBar = null, children, contentClassName = '' }) {
  return (
    <div className="pf-shell flex flex-col h-[100dvh] w-full overflow-hidden bg-[var(--bg-main)]">
      {/* 1. Full-width TopBar extending from left to right */}
      <TopBar>{topBar}</TopBar>

      {/* 2. Workspace Body: Floating Sidebar + Main Scrollable Content */}
      <div className="pf-workspace-body relative flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Floating Detached Sidebar */}
        <AppSidebar />

        {/* Scrollable Content Container */}
        <main className={`pf-content flex-1 overflow-y-auto ${contentClassName}`}>
          <div className="w-full max-w-7xl mx-auto animate-fade-up">
            {children}
          </div>
        </main>
      </div>

      {/* 3. Mobile Navigation Pill (<768px) */}
      <MobileBottomNav />
    </div>
  )
}
