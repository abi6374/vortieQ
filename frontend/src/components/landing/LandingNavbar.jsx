import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Compass, Moon, Sun, ArrowRight, User, Sparkles } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../hooks/useAuth'
import SpecularButton from './SpecularButton'

/**
 * LandingNavbar
 * Floating glassmorphism navbar with navigation anchors, theme toggle, and fast auth actions.
 */
export default function LandingNavbar() {
  const { theme, toggleTheme } = useTheme()
  const { user, session } = useAuth()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  const isDark = theme === 'dark'
  const isAuthed = Boolean(user || session)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollTo = (id) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
        scrolled
          ? 'py-3 bg-white/85 dark:bg-[#09090B]/90 backdrop-blur-xl border-[#E0E0E0]/80 dark:border-[#27272F] shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.6)]'
          : 'py-5 bg-transparent border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0066CC] to-[#004FA3] dark:from-[#A9D8FF] dark:to-[#A9D8FF] dark:bg-[#A9D8FF] flex items-center justify-center text-white dark:text-black shadow-md shadow-[#0066CC]/25 dark:shadow-[0_4px_16px_rgba(169,216,255,0.35)] group-hover:scale-105 transition-transform duration-200">
            <Compass className="w-5 h-5 animate-spin-slow text-white dark:text-black" />
          </div>
          <div className="flex flex-col">
            <span className="font-sans font-extrabold text-xl tracking-tight text-[#1D1D1F] dark:text-[#F8FAFC]">
              PathFinder
            </span>
            <span className="text-[10px] font-bold text-[#0066CC] dark:text-[#A9D8FF] tracking-wider -mt-1 font-mono uppercase">
              Adaptive AI
            </span>
          </div>
        </Link>

        {/* Navigation Anchors */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#333333] dark:text-[#A1A1AA]">
          <button
            type="button"
            onClick={() => scrollTo('features')}
            className="hover:text-[#0066CC] dark:hover:text-[#A9D8FF] transition-colors"
          >
            Platform Pillars
          </button>
          <button
            type="button"
            onClick={() => scrollTo('demo')}
            className="hover:text-[#0066CC] dark:hover:text-[#A9D8FF] transition-colors flex items-center gap-1.5"
          >
            <span>Live Demo</span>
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-[#EAF2FC] dark:bg-[#A9D8FF]/15 text-[#0066CC] dark:text-[#A9D8FF] border border-transparent dark:border-[#A9D8FF]/30">
              TRY
            </span>
          </button>
          <button
            type="button"
            onClick={() => scrollTo('coach')}
            className="hover:text-[#0066CC] dark:hover:text-[#A9D8FF] transition-colors"
          >
            AI Coach
          </button>
          <button
            type="button"
            onClick={() => scrollTo('comparison')}
            className="hover:text-[#0066CC] dark:hover:text-[#A9D8FF] transition-colors"
          >
            Comparison
          </button>
          <button
            type="button"
            onClick={() => scrollTo('tech-stack')}
            className="hover:text-[#0066CC] dark:hover:text-[#A9D8FF] transition-colors"
          >
            Supported Skills
          </button>
        </nav>

        {/* Action Controls & Auth */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="w-9 h-9 rounded-xl border border-[#E0E0E0] dark:border-[#27272F] bg-white/80 dark:bg-[#18181D]/80 text-[#333333] dark:text-[#CBD5E1] flex items-center justify-center hover:border-[#0066CC] dark:hover:border-[#A9D8FF] transition-colors shadow-xs"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {isAuthed ? (
            <SpecularButton
              size="sm"
              radius={12}
              lineColor={isDark ? '#A9D8FF' : '#000000'}
              baseColor={isDark ? '#18181D' : '#000000'}
              intensity={1.25}
              thickness={1.5}
              speed={0.35}
              followMouse
              proximity={200}
              onClick={() => navigate('/dashboard')}
              className="!py-2 !px-4 !rounded-xl !bg-[#0066CC] dark:!bg-[#A9D8FF] hover:!bg-[#0052A3] dark:hover:!bg-[#8ECAFF] !text-white dark:!text-black font-semibold text-sm shadow-md shadow-[#0066CC]/25 dark:shadow-[0_4px_16px_rgba(169,216,255,0.35)] hover:shadow-lg transition-all group inline-flex items-center gap-2"
            >
              <span>Dashboard</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </SpecularButton>
          ) : (
            <>
              <Link
                to="/auth"
                className="hidden sm:inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-[#1D1D1F] dark:text-[#E2E8F0] hover:text-[#0066CC] dark:hover:text-[#A9D8FF] transition-colors"
              >
                Sign In
              </Link>
              <SpecularButton
                size="sm"
                radius={12}
                lineColor={isDark ? '#A9D8FF' : '#000000'}
                baseColor={isDark ? '#18181D' : '#000000'}
                intensity={1.25}
                thickness={1.5}
                speed={0.35}
                followMouse
                proximity={200}
                onClick={() => navigate('/auth')}
                className="!py-2 !px-4 !rounded-xl !bg-[#0066CC] dark:!bg-[#A9D8FF] hover:!bg-[#0052A3] dark:hover:!bg-[#8ECAFF] !text-white dark:!text-black font-semibold text-sm shadow-md shadow-[#0066CC]/25 dark:shadow-[0_4px_16px_rgba(169,216,255,0.35)] hover:shadow-lg transition-all group inline-flex items-center gap-2"
              >
                <span>Get Started</span>
                <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              </SpecularButton>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
