import React, { useState } from 'react'
import api from '../../lib/apiClient'
import { useAuth } from '../../hooks/useAuth'

/**
 * ConnectGitHubBanner / ConnectGitHubModal
 * Non-blocking, sleek top banner that sits right at the top of the roadmap page.
 * Features an inline green tick confirmation state upon successful sync, fully styled for Light & Dark modes.
 */
export default function ConnectGitHubModal({ isOpen, onClose, onConnected, onRemindLater }) {
  const { user, linkGithub } = useAuth()
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [syncedUser, setSyncedUser] = useState(null)
  const [syncedData, setSyncedData] = useState(null)

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
        const handle = username.trim()
        setSyncedUser(handle)
        setSyncedData(res.data)
        onConnected?.(res.data)
        localStorage.setItem(`pf_github_preference_${userId}`, 'connected')
        sessionStorage.setItem(`pf_github_remind_dismissed_${userId}`, 'true')
        
        // Auto-close after 4 seconds of displaying the green tick mark
        setTimeout(() => {
          onClose?.()
        }, 4000)
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
    <div className="w-full mb-6 bg-gradient-to-r from-[#EFF6FF] via-[#F8FAFC] to-[#EFF6FF] dark:from-[#121216] dark:via-[#18181D] dark:to-[#121216] text-[#1D1D1F] dark:text-white rounded-2xl border border-[#BFDBFE] dark:border-[rgba(201,208,214,0.25)] shadow-md shadow-blue-500/5 dark:shadow-lg p-5 sm:p-6 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
      
      {/* Decorative ambient flares */}
      <div className="absolute -top-12 -right-12 w-64 h-64 bg-[#0066CC]/5 dark:bg-[#C9D0D6]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-[#0066CC]/10 dark:bg-[#C9D0D6]/5 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        
        {/* Left Side: Logo, Pitch & Details */}
        <div className="flex items-start gap-4 max-w-xl">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-none shadow-sm backdrop-blur-sm border transition-colors ${
            syncedUser
              ? 'bg-[#ECFDF3] dark:bg-emerald-950/60 border-[#A6F4C5] dark:border-emerald-700/50 text-[#12B76A] dark:text-emerald-400'
              : 'bg-[#0066CC]/10 dark:bg-white/10 border-[#0066CC]/20 dark:border-white/15 text-[#0066CC] dark:text-[#C9D0D6]'
          }`}>
            {syncedUser ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            )}
          </div>
          <div>
            <h3 className="font-['Manrope'] font-bold text-sm sm:text-base text-[#1D1D1F] dark:text-white">
              {syncedUser ? 'GitHub Account Successfully Connected!' : 'Connect GitHub for calibrated project recommendations'}
            </h3>
            {syncedUser ? (
              <p className="text-xs text-[#027A48] dark:text-emerald-300 font-medium mt-1 leading-relaxed flex items-center gap-1.5 animate-in fade-in duration-150">
                <span>✨ Analyzed public repositories & calibrated {syncedData?.topics?.length || 3} skills & portfolio depth for your roadmap.</span>
              </p>
            ) : (
              <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1 leading-relaxed">
                We evaluate your repositories and stack to skip beginner tutorials and suggest advanced capstones matching your real coding experience.
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Fast Inline Input OR Inline Green Tick Connected State */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-none">
          {syncedUser ? (
            /* Inline Success Pill with Green Checkmark */
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#ECFDF3] dark:bg-emerald-950/70 border border-[#6CE9A6] dark:border-emerald-600/60 text-[#027A48] dark:text-emerald-300 font-bold text-xs sm:text-sm shadow-xs animate-in zoom-in-95 duration-200">
              <span className="w-5 h-5 rounded-full bg-[#12B76A] dark:bg-emerald-500 text-white flex items-center justify-center flex-none shadow-2xs">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-[#027A48] dark:text-emerald-200">
                  github.com/<span className="font-mono font-bold text-[#054F31] dark:text-white">{syncedUser}</span>
                </span>
                <span className="text-[11px] font-bold text-[#027A48] dark:text-emerald-300 bg-white/90 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md border border-[#A6F4C5] dark:border-emerald-700/60 flex items-center gap-1">
                  ✓ Synced
                </span>
              </div>
            </div>
          ) : (
            /* Input Form + OAuth */
            <>
              <form onSubmit={handleSyncUsername} className="flex items-center gap-2">
                <div className="flex items-center bg-white dark:bg-[#0E0E12] border border-[#CBD5E1] dark:border-[#27272F] focus-within:border-[#0066CC] dark:focus-within:border-[#C9D0D6] focus-within:ring-2 focus-within:ring-[#0066CC]/15 dark:focus-within:ring-[#C9D0D6]/20 rounded-xl px-3 py-1.5 text-xs text-[#0F172A] dark:text-white transition-all shadow-2xs">
                  <span className="text-[#64748B] dark:text-[#71717A] font-mono mr-1 select-none">github.com/</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError('') }}
                    placeholder="username"
                    className="w-28 sm:w-36 bg-transparent text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] dark:placeholder:text-[#71717A] outline-none font-medium"
                    disabled={loading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !username.trim()}
                  className="px-4 py-1.5 bg-[#0066cc] hover:bg-[#0052a3] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-40"
                >
                  {loading ? 'Syncing…' : 'Sync'}
                </button>
              </form>

              <span className="text-[11px] text-[#64748B] font-bold text-center hidden sm:inline px-1">or</span>

              <button
                type="button"
                onClick={handleOAuthConnect}
                disabled={loading}
                className="px-3.5 py-1.5 bg-white dark:bg-[#18181D] hover:bg-[#F8FAFC] dark:hover:bg-[#27272F] border border-[#CBD5E1] dark:border-[#27272F] hover:border-[#94A3B8] dark:hover:border-[#C9D0D6] text-[#1E293B] dark:text-[#F8FAFC] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span>1-Click OAuth</span>
              </button>
            </>
          )}

          {/* Dismiss button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss banner"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#64748B] hover:text-[#0F172A] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer flex-none ml-1"
          >
            ✕
          </button>
        </div>

      </div>

      {/* Sub-actions line with Glass Buttons */}
      <div className="mt-3.5 pt-3 border-t border-[#E2E8F0] dark:border-[#27272F] flex flex-wrap items-center justify-between gap-3 text-xs">
        {syncedUser ? (
          <span className="text-xs font-semibold text-[#027A48] dark:text-emerald-400">
            ✓ Connected as @{syncedUser}. Roadmap successfully recalibrated.
          </span>
        ) : (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleRemindLater}
              className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 active:scale-95 border border-[#CBD5E1] dark:border-white/10 hover:border-[#94A3B8] dark:hover:border-white/20 text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-white text-xs font-semibold backdrop-blur-md transition-all duration-150 cursor-pointer flex items-center gap-1.5 shadow-2xs group"
            >
              <span className="text-xs group-hover:rotate-12 transition-transform">⏰</span>
              <span>Remind me later</span>
            </button>

            <button
              type="button"
              onClick={handleDontHaveGithub}
              className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-white/5 hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-95 border border-[#CBD5E1] dark:border-white/10 hover:border-rose-300 dark:hover:border-rose-500/30 text-[#64748B] dark:text-[#94A3B8] hover:text-rose-600 dark:hover:text-rose-300 text-xs font-semibold backdrop-blur-md transition-all duration-150 cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <span className="text-[11px] opacity-75">✕</span>
              <span>I don't have a GitHub</span>
            </button>
          </div>
        )}

        {error && (
          <span className="text-rose-500 dark:text-rose-400 font-semibold text-xs">{error}</span>
        )}
      </div>

    </div>
  )
}


