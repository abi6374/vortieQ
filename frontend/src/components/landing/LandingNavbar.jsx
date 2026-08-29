import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Compass, Moon, Sun, ArrowRight, User, Sparkles } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../hooks/useAuth'

/**
 * LandingNavbar
 * Floating glassmorphism navbar with navigation anchors, theme toggle, and fast auth actions.
 */
export default function LandingNavbar() {
  const { theme, toggleTheme } = useTheme()
  const { user, session } = useAuth()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'py-3 bg-white/80 dark:bg-[#0B0F17]/80 backdrop-blur-xl border-b border-[#E0E0E0]/80 dark:border-[#1E293B]/80 shadow-xs'
          : 'py-5 bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0066CC] to-[#004FA3] flex items-center justify-center text-white shadow-md shadow-[#0066CC]/25 group-hover:scale-105 transition-transform duration-200">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div className="flex flex-col">
            <span className="font-sans font-extrabold text-xl tracking-tight text-[#1D1D1F] dark:text-[#F8FAFC]">
              PathFinder
            </span>
            <span className="text-[10px] font-bold text-[#0066CC] dark:text-[#38BDF8] tracking-wider -mt-1 font-mono uppercase">
              Adaptive AI
            </span>
          </div>
        </Link>

        {/* Navigation Anchors */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#333333] dark:text-[#CBD5E1]">
          <button
            type="button"
            onClick={() => scrollTo('features')}
            className="hover:text-[#0066CC] dark:hover:text-[#38BDF8] transition-colors"
          >
            Platform Pillars
          </button>
          <button
            type="button"
            onClick={() => scrollTo('demo')}
            className="hover:text-[#0066CC] dark:hover:text-[#38BDF8] transition-colors flex items-center gap-1.5"
          >
            <span>Live Demo</span>
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-[#EAF2FC] dark:bg-[#1E293B] text-[#0066CC] dark:text-[#38BDF8]">
              TRY
            </span>
          </button>
          <button
            type="button"
            onClick={() => scrollTo('coach')}
            className="hover:text-[#0066CC] dark:hover:text-[#38BDF8] transition-colors"
          >
            AI Coach
          </button>
          <button
            type="button"
            onClick={() => scrollTo('comparison')}
            className="hover:text-[#0066CC] dark:hover:text-[#38BDF8] transition-colors"
          >
            Comparison
          </button>
          <button
            type="button"
            onClick={() => scrollTo('tech-stack')}
            className="hover:text-[#0066CC] dark:hover:text-[#38BDF8] transition-colors"
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
            className="w-9 h-9 rounded-xl border border-[#E0E0E0] dark:border-[#263348] bg-white/80 dark:bg-[#161F2E]/80 text-[#333333] dark:text-[#CBD5E1] flex items-center justify-center hover:border-[#0066CC] transition-colors shadow-xs"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {isAuthed ? (
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0066CC] hover:bg-[#0052A3] text-white font-semibold text-sm shadow-md shadow-[#0066CC]/25 hover:shadow-lg transition-all active:scale-95"
            >
              <span>Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/auth"
                className="hidden sm:inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-[#1D1D1F] dark:text-[#E2E8F0] hover:text-[#0066CC] dark:hover:text-[#38BDF8] transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/onboarding"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0066CC] hover:bg-[#0052A3] text-white font-semibold text-sm shadow-md shadow-[#0066CC]/25 hover:shadow-lg transition-all active:scale-95 group"
              >
                <span>Get Started</span>
                <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
