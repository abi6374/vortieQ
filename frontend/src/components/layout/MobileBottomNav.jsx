import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ICONS, NAV, activeKeyFor } from '../ui/AppSidebar'
import SkillingLogo from '../ui/SkillingLogo'

/**
 * Mobile Floating Bottom Nav Pill
 * - Glassmorphic floating pill navigation for mobile viewports (<768px).
 * - Smooth spring animated active indicator.
 */
export default function MobileBottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const active = activeKeyFor(location.pathname)

  return (
    <nav
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex md:hidden items-center gap-1 px-3 py-2 select-none max-w-[94vw] overflow-x-auto scrollbar-none"
      style={{
        background: 'rgba(255, 255, 255, 0.86)',
        backdropFilter: 'blur(24px) saturate(200%)',
        WebkitBackdropFilter: 'blur(24px) saturate(200%)',
        border: '1px solid rgba(255, 255, 255, 0.9)',
        borderRadius: '999px',
        boxShadow:
          '0 12px 32px rgba(10, 10, 10, 0.16), 0 4px 12px rgba(10, 10, 10, 0.08), inset 0 1px 1px rgba(255, 255, 255, 1)',
      }}
      aria-label="Mobile Primary Navigation"
    >
      {/* Brand Icon */}
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="w-9 h-9 rounded-full flex items-center justify-center mr-0.5 flex-none cursor-pointer bg-white dark:bg-[#18181D] border border-[#E0E0E0] dark:border-[#27272F] shadow-xs"
        aria-label="Skilling Home"
      >
        <SkillingLogo size={22} color="#0066CC" />
      </button>

      {NAV.map((item) => {
        const isActive = active === item.key
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => navigate(item.path)}
            className="relative w-10 h-10 flex items-center justify-center rounded-full transition-all duration-150 flex-none border-none outline-none cursor-pointer bg-transparent"
            aria-label={item.label}
          >
            {isActive && (
              <motion.span
                layoutId="mobile-active-pill"
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #0066cc, #0052a3)',
                  boxShadow: '0 2px 10px rgba(0,102,204,0.35)',
                }}
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span
              className="relative z-10 flex items-center justify-center"
              style={{
                color: isActive ? '#fff' : '#6e6e73',
                transform: isActive ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              {React.cloneElement(ICONS[item.key], {
                width: 18,
                height: 18,
                style: { strokeWidth: isActive ? 2.2 : 1.8 }
              })}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

