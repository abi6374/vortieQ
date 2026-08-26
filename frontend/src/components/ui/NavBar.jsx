import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

/**
 * NavBar
 * Shared top navigation for the authenticated pages.
 *   - Left: "🧠 PathAI" brand → dashboard
 *   - Right: optional page-specific links (children), then a Sign Out button
 *
 * Props:
 *   children - optional nodes rendered to the left of Sign Out (e.g. page links)
 */
export default function NavBar({ children }) {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } finally {
      // ProtectedRoute will bounce to "/" once the session clears; be explicit too.
      navigate('/')
    }
  }

  return (
    <nav className="sticky top-0 z-30 bg-white shadow-sm">
      <div className="max-w-6xl mx-auto h-14 px-4 sm:px-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          <span aria-hidden="true">🧠</span>
          <span>PathAI</span>
        </button>

        <div className="flex items-center gap-3 sm:gap-4">
          {children}
          <button
            onClick={handleSignOut}
            className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  )
}
