import React, { useState } from 'react'
import api from '../../lib/apiClient'
import { useAuth } from '../../hooks/useAuth'

/**
 * ConnectGitHubBanner / ConnectGitHubModal
 * Non-blocking, sleek top banner that sits right at the top of the page.
 * Never dims or blacks out the content, allowing complete page visibility.
 */
export default function ConnectGitHubModal({ isOpen, onClose, onConnected, onRemindLater }) {
  const { user, linkGithub } = useAuth()
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const userId = user?.id || 'guest'

  const handleSyncUsername = async (e) => {
    e?.preventDefault()
    if (!username.trim()) {
      setError('Enter your GitHub username.')
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
        localStorage.setItem(`pf_github_preference_${userId}`, 'connected')
        sessionStorage.setItem(`pf_github_remind_dismissed_${userId}`, 'true')
        onClose()
      } else {
        setError('No public repositories found for this GitHub account.')
      }
    } catch (err) {
      console.warn('[ConnectGitHubModal] Sync error:', err)
      setError(err?.response?.data?.detail || 'Unable to fetch GitHub profile. Check the handle.')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthConnect = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await linkGithub()
      if (res?.url) {
        window.location.assign(res.url)
      }
    } catch (err) {
      setError(err?.message || 'Could not initiate GitHub connection.')
      setLoading(false)
    }
  }

  const handleRemindLater = () => {
    onRemindLater?.()
    onClose()
  }

  const handleDontHaveGithub = () => {
    localStorage.setItem(`pf_github_preference_${userId}`, 'no_github')
    onClose()
  }

  return (
    <div className="w-full mb-6 bg-gradient-to-r from-[#0F172A] via-[#151F38] to-[#0F172A] dark:from-[#0D1527] dark:via-[#131F38] dark:to-[#0D1527] text-white rounded-2xl border border-blue-500/20 dark:border-sky-500/20 shadow-lg p-5 sm:p-6 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
      
      {/* Decorative ambient flares */}
      <div className="absolute -top-12 -right-12 w-64 h-64 bg-[#38BDF8]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-[#0066CC]/15 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        
        {/* Left Side: Logo, Pitch & Details */}
        <div className="flex items-start gap-4 max-w-xl">
          <div className="w-11 h-11 rounded-xl bg-white/10 dark:bg-white/10 border border-white/20 dark:border-white/15 flex items-center justify-center flex-none shadow-sm backdrop-blur-sm">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#38BDF8] bg-sky-950/80 px-2 py-0.5 rounded-full border border-sky-800/70 shadow-2xs">
                ✨ Roadmap Booster
              </span>
              <h3 className="font-['Manrope'] font-bold text-sm sm:text-base text-white">
                Connect GitHub for calibrated project recommendations
              </h3>
            </div>
            <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
              We evaluate your repositories and stack to skip beginner tutorials and suggest advanced capstones matching your real coding experience.
            </p>
          </div>
        </div>

        {/* Right Side: Fast Inline Input + OAuth + Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-none">
          <form onSubmit={handleSyncUsername} className="flex items-center gap-2">
            <div className="flex items-center bg-[#0B1120] border border-[#334155] focus-within:border-[#38BDF8] focus-within:ring-1 focus-within:ring-[#38BDF8]/30 rounded-xl px-3 py-1.5 text-xs text-white transition-all">
              <span className="text-[#64748B] font-mono mr-1 select-none">github.com/</span>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError('') }}
                placeholder="username"
                className="w-28 sm:w-36 bg-transparent text-white placeholder:text-[#475569] outline-none font-medium"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="px-4 py-1.5 bg-[#0066cc] hover:bg-[#004fa3] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-40"
            >
              {loading ? 'Syncing…' : 'Sync'}
            </button>
          </form>

          <span className="text-[11px] text-[#64748B] font-bold text-center hidden sm:inline px-1">or</span>

          <button
            type="button"
            onClick={handleOAuthConnect}
            disabled={loading}
            className="px-3.5 py-1.5 bg-[#1E293B] hover:bg-[#2A374F] border border-[#475569] hover:border-[#64748B] text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#FFFFFF">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>1-Click OAuth</span>
          </button>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss banner"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#64748B] hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex-none ml-1"
          >
            ✕
          </button>
        </div>

      </div>

      {/* Sub-actions line */}
      <div className="mt-3 pt-2.5 border-t border-[#1E293B] flex items-center justify-between text-[11px] text-[#64748B]">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleRemindLater}
            className="hover:text-[#94A3B8] transition-colors cursor-pointer"
          >
            ⏰ Remind me later
          </button>
          <button
            type="button"
            onClick={handleDontHaveGithub}
            className="hover:text-red-400 transition-colors cursor-pointer"
          >
            Don't have a GitHub
          </button>
        </div>

        {error && (
          <span className="text-red-400 font-semibold">{error}</span>
        )}
      </div>

    </div>
  )
}

