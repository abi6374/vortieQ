import React from 'react'
import AppSidebar from '../ui/AppSidebar'
import TopBar from './TopBar'
import MobileBottomNav from './MobileBottomNav'
import { useSidebar } from '../../contexts/SidebarContext'

/**
 * AppShell:
 * - When expanded: 240px sidebar on left with aligned 72px header.
 * - When collapsed: 1-column layout without empty left column; Logo + Toggle button in TopBar; centered workspace content.
 */
export default function AppShell({ topBar = null, children, contentClassName = '' }) {
  const { isCollapsed } = useSidebar()

  return (
    <div className={`pf-shell ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      {!isCollapsed && <AppSidebar />}
      <div className="pf-main">
        <TopBar>{topBar}</TopBar>
        <div className={`pf-content ${contentClassName}`}>
          <div className={`animate-fade-up ${isCollapsed ? 'max-w-7xl mx-auto w-full transition-all duration-300' : 'w-full'}`}>
            {children}
          </div>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  )
}
