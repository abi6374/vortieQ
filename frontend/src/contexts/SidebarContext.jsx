import React, { createContext, useContext, useState, useEffect } from 'react'

const SidebarContext = createContext({
  isCollapsed: false,
  isHoverOpen: false,
  toggleSidebar: () => {},
  setCollapsed: () => {},
  setIsHoverOpen: () => {},
})

export function SidebarProvider({ children }) {
  const [isCollapsed, setIsCollapsedState] = useState(() => {
    try {
      return localStorage.getItem('pf_sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })
  const [isHoverOpen, setIsHoverOpen] = useState(false)

  const setCollapsed = (val) => {
    setIsCollapsedState(val)
    try {
      localStorage.setItem('pf_sidebar_collapsed', String(val))
    } catch {}
    if (!val) {
      setIsHoverOpen(false)
    }
  }

  const toggleSidebar = () => {
    setCollapsed(!isCollapsed)
  }

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        isHoverOpen,
        toggleSidebar,
        setCollapsed,
        setIsHoverOpen,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  return useContext(SidebarContext)
}
