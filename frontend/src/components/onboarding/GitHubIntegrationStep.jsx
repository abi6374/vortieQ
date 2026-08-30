import React, { useState } from 'react'
import apiClient from '../../lib/apiClient'
import ThemeToggle from '../ui/ThemeToggle'
import { useAuth } from '../../hooks/useAuth'

/**
 * GitHubIntegrationStep
 * Dedicated Step 2 (Optional Step) in the unified PathFinder Onboarding flow.
 * Extracts repositories, top languages, detected years, and projects to calibrate skills.
 */
export default function GitHubIntegrationStep({
  githubData,
  onGithubSynced,
  onContinue,
  onSkip,
  hasExistingPath = false,
}) {
  const { user, linkGithub } = useAuth()
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [syncedData, setSyncedData] = useState(githubData || null)
  const [showSwitchUser, setShowSwitchUser] = useState(false)

  const userId = user?.id || 'guest'

  const handleSyncUsername = async (e) => {
    e?.preventDefault()
    const handle = username.trim()
    if (!handle) {
      setError('Please enter your GitHub username.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await apiClient.post('/api/profile/github', {
        username: handle,
      })
      if (res?.data) {
        setSyncedData(res.data)
        onGithubSynced?.(res.data)
        localStorage.setItem(`pf_github_preference_${userId}`, 'connected')
        setShowSwitchUser(false)
      } else {
        setError('No public repositories found for this GitHub account.')
      }
    } catch (err) {
      console.warn('[GitHubIntegrationStep] Sync error:', err)
      setError(
        err?.response?.data?.detail ||
          'Unable to fetch GitHub profile. Please verify your handle and try again.'
      )
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

  const handleProceed = () => {
    if (syncedData) {
      localStorage.setItem(`pf_github_preference_${userId}`, 'connected')
    }
    onContinue?.()
  }

  const handleSkipStep = () => {
    localStorage.setItem(`pf_github_preference_${userId}`, 'no_github')
    onSkip?.()
  }

  return (
    <div className="w-full max-w-[1140px] bg-white dark:bg-[#121216] rounded-2xl border border-[#f0f0f0] dark:border-[#27272F] shadow-[0_14px_38px_rgba(25,49,75,0.08)] dark:shadow-[0_14px_38px_rgba(0,0,0,0.5)] flex flex-col justify-between overflow-hidden transition-colors min-h-[640px]">
      {/* Top Header Row with ThemeToggle & conditional Profile Dropdown */}
      <div className="pt-6 sm:pt-8 pb-3 px-6 sm:px-10 relative">
        <div className="flex items-center justify-end mb-2">
          <ThemeToggle />
        </div>

        <div className="text-center mt-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eaf2fc] dark:bg-[#18181D] border border-[#cfe4fb] dark:border-[#27272F] text-[#0066cc] dark:text-[#C9D0D6] text-xs font-bold mb-3">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>Optional Step</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-[34px] font-bold text-[#1d1d1f] dark:text-[#F8FAFC] tracking-tight leading-tight">
            Connect your GitHub profile
          </h1>
          <p className="text-[15px] sm:text-[16px] text-[#555555] dark:text-[#94A3B8] mt-2 font-normal leading-relaxed">
            We evaluate your repositories and tech stack to calibrate your personalized roadmap, skip fundamentals you already master, and suggest real-world capstones.
          </p>
        </div>
      </div>

      {/* Main Integration Center Box */}
      <div className="px-6 sm:px-10 py-4 max-w-3xl mx-auto w-full">
        {syncedData && !showSwitchUser ? (
          /* Synced Success State */
          <div className="bg-[#F8FAFD] dark:bg-[#18181D] border-2 border-[#22A06B] dark:border-[#34D399] rounded-2xl p-6 sm:p-8 shadow-sm transition-all">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-[#E6EAF2] dark:border-[#27272F]">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#ECFDF3] dark:bg-emerald-950/50 border border-[#A6F4C5] dark:border-emerald-700/60 text-[#12B76A] dark:text-emerald-400 flex items-center justify-center flex-none shadow-xs">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-[#1d1d1f] dark:text-[#F8FAFC]">
                      GitHub Repositories Synced
                    </h3>
                    <span className="bg-[#ECFDF3] dark:bg-[#064E3B]/40 text-[#22A06B] dark:text-[#34D399] text-xs px-2.5 py-0.5 rounded-full font-bold">
                      {syncedData.github_projects?.length || syncedData.topics?.length || 0} Repos Active
                    </span>
                  </div>
                  <p className="text-xs text-[#52617D] dark:text-[#94A3B8] mt-0.5 font-mono">
                    @{username.trim() || user?.user_metadata?.user_name || user?.user_metadata?.preferred_username || 'connected'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSwitchUser(true)}
                className="text-xs font-bold text-[#0066cc] dark:text-[#C9D0D6] hover:underline cursor-pointer"
              >
                Switch Account
              </button>
            </div>

            {/* Extracted Stack & Experience Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
              <div className="bg-white dark:bg-[#0E0E12] border border-[#E6EAF2] dark:border-[#27272F] rounded-xl p-3.5">
                <p className="text-xs font-bold text-[#52617D] dark:text-[#94A3B8] uppercase tracking-wider mb-2">
                  Detected Languages & Stack
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {syncedData.top_languages?.length > 0 ? (
                    syncedData.top_languages.map((lang) => (
                      <span
                        key={lang}
                        className="px-2.5 py-1 rounded-lg bg-[#eaf2fc] dark:bg-[#18181D] text-[#0066cc] dark:text-[#C9D0D6] text-xs font-bold border border-[#cfe4fb] dark:border-[#27272F]"
                      >
                        {lang}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[#7a7a7a] dark:text-[#94A3B8]">Stack parsed from repos</span>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-[#0E0E12] border border-[#E6EAF2] dark:border-[#27272F] rounded-xl p-3.5">
                <p className="text-xs font-bold text-[#52617D] dark:text-[#94A3B8] uppercase tracking-wider mb-1.5">
                  Estimated Experience
                </p>
                <p className="text-sm font-bold text-[#1d1d1f] dark:text-[#F8FAFC]">
                  {typeof syncedData.detected_years_experience === 'number' && syncedData.detected_years_experience > 0
                    ? `~${syncedData.detected_years_experience} years active coding history`
                    : 'Repositories analyzed for skill calibration'}
                </p>
                <p className="text-xs text-[#22A06B] dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                  <span>✓ {syncedData.topics?.length || 0} skills updated in your intake profile</span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Unsynced State: Input or OAuth */
          <div className="flex flex-col gap-5">
            {/* Input Card */}
            <div className="bg-[#F8FAFD] dark:bg-[#18181D] border border-[#E0E6F0] dark:border-[#27272F] rounded-2xl p-6 sm:p-7 shadow-xs">
              <label className="block text-sm font-bold text-[#1d1d1f] dark:text-[#F8FAFC] mb-2">
                Enter your GitHub Username
              </label>

              <form onSubmit={handleSyncUsername} className="flex flex-col sm:flex-row items-stretch gap-3">
                <div className="flex-1 flex items-center bg-white dark:bg-[#0E0E12] border border-[#D8DFEB] dark:border-[#27272F] rounded-xl px-3.5 py-2.5 shadow-2xs focus-within:border-[#0066cc] dark:focus-within:border-[#C9D0D6] focus-within:ring-2 focus-within:ring-[#0066cc]/15 transition-all">
                  <span className="text-[#888888] dark:text-[#94A3B8] text-sm font-mono font-bold mr-1.5 select-none">
                    github.com/
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="your-username"
                    className="bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 text-sm text-[#0E1B38] dark:text-[#F8FAFC] placeholder-[#888888] dark:placeholder-[#71717A] w-full flex-1"
                    style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !username.trim()}
                  className="px-6 py-2.5 bg-[#0066cc] dark:bg-[#0066cc] hover:bg-[#0052a3] dark:hover:bg-[#004fa3] text-white dark:text-white font-bold text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs active:scale-[0.99] flex-none min-w-[140px]"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white dark:text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <span>Sync Repos</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              {error && (
                <p className="mt-3 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 p-2.5 rounded-lg">
                  {error}
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#E6EAF2] dark:border-[#27272F]" />
              <span className="text-xs font-bold text-[#888888] dark:text-[#71717A] uppercase tracking-wider">
                OR
              </span>
              <div className="flex-1 h-px bg-[#E6EAF2] dark:border-[#27272F]" />
            </div>

            {/* 1-Click OAuth Option */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleOAuthConnect}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3 bg-[#181717] hover:bg-black text-white text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.99]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span>Authorize & Sync via GitHub</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="h-[76px] px-6 sm:px-10 border-t border-[#f0f0f0] dark:border-[#202026] flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2 text-[13px] font-medium text-[#555555] dark:text-[#94A3B8]">
          <span className="text-[#22A06B] dark:text-emerald-400">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </span>
          <span>Read-only public repositories only · Never modifies code</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSkipStep}
            className="px-4 py-2 text-sm font-semibold text-[#555555] dark:text-[#94A3B8] hover:text-[#1d1d1f] dark:hover:text-white transition-colors cursor-pointer"
          >
            Skip for now
          </button>

          <button
            type="button"
            onClick={handleProceed}
            className="w-[160px] h-[46px] bg-[#0066cc] dark:bg-[#0066cc] hover:bg-[#0052a3] dark:hover:bg-[#004fa3] active:scale-[0.99] text-white dark:text-white font-bold rounded-xl shadow-[0_4px_14px_rgba(0,102,204,0.35)] dark:shadow-[0_4px_14px_rgba(0,102,204,0.4)] transition-all flex items-center justify-center text-[14.5px] cursor-pointer"
          >
            {syncedData ? 'Continue' : 'Skip & Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
