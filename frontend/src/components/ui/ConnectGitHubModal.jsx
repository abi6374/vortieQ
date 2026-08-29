import React, { useState } from 'react'
import api from '../../lib/apiClient'
import { useAuth } from '../../hooks/useAuth'

export default function ConnectGitHubModal({ isOpen, onClose, onConnected }) {
  const { user, signInWithGithub } = useAuth()
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const userId = user?.id || 'guest'

  const handleSyncUsername = async (e) => {
    e?.preventDefault()
    if (!username.trim()) {
      setError('Please enter your GitHub username.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/api/profile/github', {
        username: username.trim(),
      })
      if (res?.data) {
        onConnected?.(res.data)
        // Mark preference as connected
        localStorage.setItem(`pf_github_preference_${userId}`, 'connected')
        sessionStorage.setItem(`pf_github_remind_dismissed_${userId}`, 'true')
        onClose()
      } else {
        setError('No repositories found for this GitHub user.')
      }
    } catch (err) {
      console.warn('[ConnectGitHubModal] Sync error:', err)
      setError(err?.response?.data?.detail || 'Could not fetch GitHub profile. Please check the username.')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthConnect = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await signInWithGithub()
      if (res?.url) {
        window.location.assign(res.url)
      }
    } catch (err) {
      setError(err?.message || 'Could not initiate GitHub connection.')
      setLoading(false)
    }
  }

  const handleRemindLater = () => {
    // Dismiss for this session only (will prompt again next session in roadmap)
    sessionStorage.setItem(`pf_github_remind_dismissed_${userId}`, 'true')
    onClose()
  }

  const handleDontHaveGithub = () => {
    // Permanently dismiss for this user
    localStorage.setItem(`pf_github_preference_${userId}`, 'no_github')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-[520px] bg-white dark:bg-[#1c1c1e] rounded-2xl border border-[#e0e0e0] dark:border-[#2c2c2e] shadow-2xl overflow-hidden p-6 sm:p-7 text-[#1d1d1f] dark:text-[#f5f5f7]">
        
        {/* Top Header with Icon */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#181717] dark:bg-white text-white dark:text-[#181717] flex items-center justify-center flex-none shadow-md">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#0066cc] dark:text-[#2997ff] bg-[#eaf2fc] dark:bg-[#1a2f4d] px-2.5 py-0.5 rounded-full mb-1">
              ✨ Smart Recommendations
            </span>
            <h3 className="font-['Manrope'] font-bold text-lg sm:text-xl text-[#1d1d1f] dark:text-[#f5f5f7] leading-snug">
              Connect your GitHub for better recommendations
            </h3>
          </div>
        </div>

        {/* Value Proposition Description */}
        <p className="mt-3.5 text-xs sm:text-sm text-[#52617D] dark:text-[#a1a1a6] leading-relaxed">
          Link your GitHub to let PathFinder analyze your repositories, commit velocity, and coding depth. We will calibrate your roadmap to skip beginner tutorials and suggest advanced capstones suited to your real stack.
        </p>

        {/* Input Form */}
        <form onSubmit={handleSyncUsername} className="mt-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-[#f5f5f7] dark:bg-[#2c2c2e] border border-[#e0e0e0] dark:border-[#3a3a3c] rounded-xl px-3 py-2 text-xs sm:text-sm focus-within:border-[#0066cc] focus-within:ring-2 focus-within:ring-[#0066cc]/20 transition-all">
              <span className="text-[#86868b] font-mono mr-1">github.com/</span>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError('') }}
                placeholder="username (e.g. torvalds)"
                className="flex-1 bg-transparent text-[#1d1d1f] dark:text-white outline-none"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="px-4 py-2 bg-[#0066cc] hover:bg-[#004fa3] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 flex-none"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Syncing…</span>
                </>
              ) : (
                'Connect Now'
              )}
            </button>
          </div>

          {/* Alternative 1-Click OAuth */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleOAuthConnect}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2 bg-[#181717] hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>Or Authorize with GitHub OAuth</span>
            </button>
          </div>

          {error && (
            <p className="text-xs font-semibold text-[#B42318] bg-[#FDECEC] dark:bg-[#3d1a1a] dark:text-[#ff8080] rounded-lg p-2.5 text-center">
              {error}
            </p>
          )}
        </form>

        {/* 3 User Actions Footer */}
        <div className="mt-6 pt-4 border-t border-[#e0e0e0] dark:border-[#2c2c2e] flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleRemindLater}
            className="w-full sm:w-auto px-3.5 py-2 text-xs font-semibold text-[#52617D] dark:text-[#a1a1a6] hover:text-[#1d1d1f] dark:hover:text-white rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e] transition-colors cursor-pointer text-center"
          >
            ⏰ Remind me later
          </button>

          <button
            type="button"
            onClick={handleDontHaveGithub}
            className="w-full sm:w-auto px-3.5 py-2 text-xs font-semibold text-[#86868b] hover:text-[#B42318] rounded-lg hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e] transition-colors cursor-pointer text-center"
            title="Stops this popup permanently. You can still link it anytime under Account."
          >
            Don’t have a GitHub
          </button>
        </div>

        <p className="text-[11px] text-[#86868b] text-center mt-2.5">
          You can always link or re-sync GitHub anytime from your <span className="font-semibold">Account</span> settings.
        </p>

      </div>
    </div>
  )
}
