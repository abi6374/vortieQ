import React, { useEffect, useState } from 'react'
import AppShell from '../components/layout/AppShell'
import CustomSelect from '../components/ui/CustomSelect'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/apiClient'
import { supabase } from '../lib/supabaseClient'

/**
 * Account & Settings — Unified Account and Settings screen.
 * Contains:
 * 1. "Account" section: Personal details, Career goals, and GitHub integration.
 * 2. "Settings" section: Study schedule pacing and preferred content formats.
 */

const V = '#0066cc'
const FIELD = 'w-full rounded-xl border border-[#e0e0e0] dark:border-[#27272F] bg-white dark:bg-[#0E0E12] px-3.5 py-2.5 text-[14.5px] text-[#1d1d1f] dark:text-white outline-none focus:border-[#0066cc] dark:focus:border-[#C9D0D6] focus:ring-[3px] focus:ring-[#0066cc]/20 dark:focus:ring-[#C9D0D6]/20 transition-colors'
const LABEL = 'block text-[13.5px] font-semibold text-[#1d1d1f] dark:text-[#CBD5E1] mb-1.5'

const FORMATS = ['course', 'video', 'article', 'practice', 'project', 'documentation']

export default function AccountPage() {
  const { user, profile, updateProfile, linkGithub, refreshProfile } = useAuth()
  
  // ─── Account State ───
  const [me, setMe] = useState(null)
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [error, setError] = useState(null)

  // ─── Settings State ───
  const [s, setS] = useState(null)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsToast, setSettingsToast] = useState(null)
  const [settingsError, setSettingsError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [meRes, settingsRes] = await Promise.allSettled([
        api.get('/api/me'),
        api.get('/api/settings'),
      ])

      if (meRes.status === 'fulfilled') {
        const data = meRes.value.data
        setMe(data)
        setForm({
          full_name: data.full_name || '',
          goal_text: data.goal_text || '',
          target_role: data.target_role || '',
          current_level: data.current_level || 'beginner',
          weekly_hours: data.weekly_hours ?? 10,
          interests: (data.interests || []).join(', '),
        })
      }

      if (settingsRes.status === 'fulfilled') {
        setS(settingsRes.value.data)
      } else {
        setS({
          weekly_hours: 30,
          target_date: '2026-08-14',
          difficulty_preference: 'adaptive',
          preferred_formats: ['course', 'video', 'article', 'practice'],
        })
      }
    } catch {
      setError('Unable to load your account information. Try refreshing.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const flash = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }

  const saveProfile = async (e) => {
    e?.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        weekly_hours: Number(form.weekly_hours) || 10,
        interests: form.interests ? form.interests.split(',').map((item) => item.trim()).filter(Boolean) : [],
      }
      const { data } = await api.patch('/api/me/profile', payload)
      setMe(data)
      if (updateProfile) updateProfile(data)
      flash('Saved profile successfully')
    } catch {
      setError('Unable to update profile. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const patchSettings = async (delta) => {
    const updated = { ...s, ...delta }
    setS(updated)
    setSettingsSaving(true)
    setSettingsError(null)
    try {
      await api.patch('/api/settings', delta)
      setSettingsToast('Saved settings')
      setTimeout(() => setSettingsToast(null), 2400)
    } catch {
      setSettingsError('Could not save setting. Check connection.')
    } finally {
      setSettingsSaving(false)
    }
  }

  const toggleFormat = (f) => {
    const list = s?.preferred_formats || []
    const next = list.includes(f) ? list.filter((x) => x !== f) : [...list, f]
    patchSettings({ preferred_formats: next })
  }

  // ─── GitHub Integration Logic ───
  const [ghInput, setGhInput] = useState('')
  const [ghSyncing, setGhSyncing] = useState(false)
  const [ghFeedback, setGhFeedback] = useState(null)

  const githubHandle =
    profile?.github_username ||
    me?.github_username ||
    user?.user_metadata?.user_name ||
    user?.user_metadata?.preferred_username ||
    (typeof window !== 'undefined' && localStorage.getItem(`pf_github_user_${user?.id}`)) ||
    ''

  const handleSyncGithubAccount = async (overrideUsername) => {
    const custom = typeof overrideUsername === 'string' ? overrideUsername : ''
    const rawTarget = (custom || ghInput || githubHandle || '').trim()
    const target = rawTarget.replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/^@/, '').replace(/\/$/, '')
    if (!target) return
    setGhSyncing(true)
    setGhFeedback(null)
    try {
      const res = await api.post('/api/profile/github', {
        username: target,
      })
      if (res?.data) {
        if (user?.id) {
          localStorage.setItem(`pf_github_user_${user.id}`, target)
          localStorage.setItem(`pf_github_preference_${user.id}`, 'connected')
        }
        setGhFeedback({
          type: 'success',
          message: `Successfully synced ${res.data.github_projects?.length || 0} repositories for @${target}! Detected ${res.data.topics?.length || 0} skills.`,
        })
        if (updateProfile) {
          updateProfile({
            topic_ratings: res.data.topics,
            detected_years_experience: res.data.detected_years_experience,
            github_username: target,
          })
        }
        await refreshProfile?.()
        flash('GitHub profile synchronized')
      }
    } catch (err) {
      console.warn('GitHub account sync error:', err)
      setGhFeedback({
        type: 'error',
        message: err?.response?.data?.detail || 'Could not sync GitHub account. Please check the handle.',
      })
    } finally {
      setGhSyncing(false)
    }
  }

  const [ghLinking, setGhLinking] = useState(false)

  const handleLinkGithubOAuth = async () => {
    setGhFeedback(null)
    setGhLinking(true)
    try {
      await linkGithub('/account?github_linked=true')
    } catch (err) {
      setGhFeedback({
        type: 'error',
        message: err?.message || 'Could not start GitHub authorization. Please check if GitHub provider is enabled in Supabase.',
      })
      setGhLinking(false)
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('github_linked') !== 'true') return

    window.history.replaceState({}, '', '/account')

    ;(async () => {
      try {
        const { data, error: err } = await supabase.auth.getUserIdentities()
        if (err) throw err
        const ghIdentity = data?.identities?.find((i) => i.provider === 'github')
        const detectedUsername =
          ghIdentity?.identity_data?.user_name ||
          ghIdentity?.identity_data?.preferred_username ||
          ''
        if (detectedUsername) {
          setGhInput(detectedUsername)
          await handleSyncGithubAccount(detectedUsername)
          flash('GitHub connected and repositories synced')
        } else {
          setGhFeedback({
            type: 'error',
            message: 'GitHub was authorized, but we could not read your username back. Enter it manually below.',
          })
        }
      } catch (err) {
        console.warn('Post-link GitHub sync error:', err)
        setGhFeedback({
          type: 'error',
          message: 'GitHub was authorized, but syncing your repositories failed. Try entering your username manually below.',
        })
      }
    })()
  }, [])

  const isNativeGithubLogin = user?.app_metadata?.provider === 'github'
  const [ghDisconnecting, setGhDisconnecting] = useState(false)

  const handleDisconnectGithub = async () => {
    if (!window.confirm('Disconnect GitHub? Your roadmap will no longer calibrate against your public repos.')) {
      return
    }
    setGhDisconnecting(true)
    setGhFeedback(null)
    try {
      await api.delete('/api/profile/github')
      if (user?.id) {
        localStorage.removeItem(`pf_github_user_${user.id}`)
        localStorage.removeItem(`pf_github_preference_${user.id}`)
      }
      setGhInput('')
      if (updateProfile) {
        updateProfile({ github_username: null, github_repos_summary: null })
      }
      await refreshProfile?.()
      flash('GitHub disconnected')
    } catch (err) {
      console.warn('GitHub disconnect error:', err)
      setGhFeedback({
        type: 'error',
        message: err?.response?.data?.detail || 'Could not disconnect GitHub. Please try again.',
      })
    } finally {
      setGhDisconnecting(false)
    }
  }

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const fullName = form.full_name || profile?.full_name || user?.user_metadata?.full_name || 'Learner'
  const email = me?.email || user?.email || 'learner@pathfinder.ai'
  const initials =
    fullName
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'P'

  const scrollToSection = (id) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <AppShell activePage="account">
      <div className="w-full font-['Inter',sans-serif] text-[#1d1d1f] dark:text-white pb-12">
        {/* Page Main Header */}
        <header className="mb-7">
          <h1 className="font-['Manrope'] font-extrabold text-2xl sm:text-3xl text-[#1d1d1f] dark:text-white tracking-tight">
            Account & Settings
          </h1>
          <p className="text-sm sm:text-base text-[#333333] dark:text-[#94A3B8] mt-1">
            Manage your personal profile, career ambition, study schedule, and platform settings in one place.
          </p>
        </header>

        {loading ? (
          <div className="p-8 text-center text-[#7a7a7a] dark:text-[#94A3B8] text-sm bg-white dark:bg-[#121216] rounded-2xl border border-[#e0e0e0] dark:border-[#27272F]">
            Loading account & settings…
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 w-full">
            {/* Primary Left Column: 8 cols on desktop */}
            <div className="lg:col-span-8 space-y-9">
              
              {/* =========================================================================
                  SECTION 1: ACCOUNT
                 ========================================================================= */}
              <section id="section-account" className="space-y-6 scroll-mt-24" aria-labelledby="section-account-title">
                <div className="flex items-center gap-2.5 pb-2 border-b border-[#e0e0e0] dark:border-[#27272F]">
                  <span className="w-8 h-8 rounded-xl bg-[#eaf2fc] dark:bg-[#18181D] text-[#0066cc] dark:text-[#C9D0D6] flex items-center justify-center flex-none">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <div>
                    <h2 id="section-account-title" className="font-['Manrope'] font-extrabold text-xl text-[#1d1d1f] dark:text-white">
                      Account
                    </h2>
                    <p className="text-xs text-[#7a7a7a] dark:text-[#94A3B8]">
                      Your identity, career direction, and developer connections
                    </p>
                  </div>
                </div>

                <form onSubmit={saveProfile} className="space-y-6">
                  {/* Personal Details Card */}
                  <div className="pf-glass-card p-6 shadow-2xs">
                    <div className="flex items-center gap-3 mb-5">
                      <span className="w-9 h-9 rounded-xl bg-[#eaf2fc] dark:bg-[#18181D] text-[#0066cc] dark:text-[#C9D0D6] border border-transparent dark:border-[rgba(201,208,214,0.15)] flex items-center justify-center flex-none">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </span>
                      <div>
                        <h3 className="font-['Manrope'] font-bold text-[16px] text-[#1d1d1f] dark:text-white">
                          Personal Details
                        </h3>
                        <p className="text-xs text-[#7a7a7a] dark:text-[#94A3B8]">
                          Your identity across the Skilling learning workspace
                        </p>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className={LABEL} htmlFor="full_name">Full Name</label>
                        <input
                          id="full_name"
                          className={FIELD}
                          value={form.full_name || ''}
                          onChange={setField('full_name')}
                          placeholder="e.g. Alex Johnson"
                        />
                      </div>
                      <div>
                        <label className={LABEL} htmlFor="email">Email Address</label>
                        <input
                          id="email"
                          className={`${FIELD} bg-[#fafafc] dark:bg-[#0E0E12] text-[#7a7a7a] dark:text-[#94A3B8] cursor-not-allowed`}
                          value={email}
                          disabled
                          title="Email is managed via authentication"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Learning Goal & Career Ambition */}
                  <div className="pf-glass-card p-6 shadow-2xs">
                    <div className="flex items-center gap-3 mb-5">
                      <span className="w-9 h-9 rounded-xl bg-[#eaf2fc] dark:bg-[#18181D] text-[#0066cc] dark:text-[#C9D0D6] border border-transparent dark:border-[rgba(201,208,214,0.15)] flex items-center justify-center flex-none">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polygon points="16.2 7.8 10.5 10.5 7.8 16.2 13.5 13.5" fill="currentColor" />
                        </svg>
                      </span>
                      <div>
                        <h3 className="font-['Manrope'] font-bold text-[16px] text-[#1d1d1f] dark:text-white">
                          Learning Goal & Direction
                        </h3>
                        <p className="text-xs text-[#7a7a7a] dark:text-[#94A3B8]">
                          Changes automatically recalibrate your recommendations and roadmap
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className={LABEL} htmlFor="goal_text">Career Goal Statement</label>
                        <textarea
                          id="goal_text"
                          rows={3}
                          className={`${FIELD} resize-none`}
                          value={form.goal_text || ''}
                          onChange={setField('goal_text')}
                          placeholder="What career milestone or skill mastery do you want to achieve?"
                        />
                      </div>

                      <div className="grid sm:grid-cols-3 gap-4">
                        <div>
                          <label className={LABEL} htmlFor="target_role">Target Role</label>
                          <input
                            id="target_role"
                            className={FIELD}
                            value={form.target_role || ''}
                            onChange={setField('target_role')}
                            placeholder="e.g. AI Engineer"
                          />
                        </div>
                        <div>
                          <label className={LABEL}>Current Level</label>
                          <CustomSelect
                            value={form.current_level || 'beginner'}
                            onChange={(val) => setForm((prev) => ({ ...prev, current_level: val }))}
                            options={[
                              { value: 'beginner', label: 'Beginner', subtitle: 'New to the subject / foundational' },
                              { value: 'intermediate', label: 'Intermediate', subtitle: 'Hands-on experience / solid foundation' },
                              { value: 'advanced', label: 'Advanced', subtitle: 'Deep domain expertise / complex architectures' },
                            ]}
                            className="w-full"
                            buttonClassName="w-full py-2.5 bg-white dark:bg-[#0E0E12] border-[#e0e0e0] dark:border-[#27272F] text-[#1d1d1f] dark:text-white"
                            menuClassName="w-full"
                            ariaLabel="Current level"
                          />
                        </div>
                        <div>
                          <label className={LABEL} htmlFor="weekly_hours">Weekly Study Hours</label>
                          <input
                            id="weekly_hours"
                            type="number"
                            min="1"
                            max="60"
                            className={FIELD}
                            value={form.weekly_hours || ''}
                            onChange={setField('weekly_hours')}
                          />
                        </div>
                      </div>

                      <div>
                        <label className={LABEL} htmlFor="interests">Key Skills & Interests</label>
                        <input
                          id="interests"
                          className={FIELD}
                          value={form.interests || ''}
                          onChange={setField('interests')}
                          placeholder="e.g. python, machine learning, docker, kubernetes"
                        />
                        <p className="text-[12px] text-[#7a7a7a] dark:text-[#94A3B8] mt-1.5">
                          Comma separated keywords. These directly steer your curated resources and practice problems.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Developer Stack & GitHub Integration Card */}
                  <div className="pf-glass-card p-6 shadow-2xs">
                    <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-[#181717] dark:bg-[#18181D] text-white flex items-center justify-center flex-none">
                          <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
                            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                          </svg>
                        </span>
                        <div>
                          <h3 className="font-['Manrope'] font-bold text-[16px] text-[#1d1d1f] dark:text-white">
                            GitHub Integration
                          </h3>
                          <p className="text-xs text-[#7a7a7a] dark:text-[#94A3B8]">
                            Calibrate recommendations against your repositories and commit history
                          </p>
                        </div>
                      </div>

                      {githubHandle && (
                        <span className="inline-flex items-center gap-1.5 bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#22A06B] dark:text-emerald-400 text-xs px-3 py-1 rounded-full font-bold">
                          <span className="w-2 h-2 rounded-full bg-[#22A06B]"></span>
                          {isNativeGithubLogin
                            ? `Primary Login Identity: GitHub (@${githubHandle})`
                            : `Connected: @${githubHandle}`}
                        </span>
                      )}
                    </div>

                    <div className="bg-[#fafafc] dark:bg-[#0E0E12] border border-[#e0e0e0] dark:border-[#27272F] rounded-xl p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        <div className="flex-1 flex items-center bg-white dark:bg-[#121216] border border-[#e0e0e0] dark:border-[#27272F] rounded-xl px-3 py-2 text-xs sm:text-sm focus-within:border-[#0066cc] dark:focus-within:border-[#C9D0D6] focus-within:ring-2 focus-within:ring-[#0066cc]/20 transition-all">
                          <span className="text-[#86868b] dark:text-[#71717A] font-mono mr-1">github.com/</span>
                          <input
                            type="text"
                            value={ghInput}
                            onChange={(e) => setGhInput(e.target.value)}
                            placeholder={githubHandle || 'username (e.g. torvalds)'}
                            className="flex-1 bg-transparent text-[#1d1d1f] dark:text-white outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSyncGithubAccount()}
                          disabled={ghSyncing || (!ghInput.trim() && !githubHandle)}
                          className="px-4 py-2 bg-[#181717] dark:bg-[#18181D] hover:bg-black dark:hover:bg-[#27272F] border border-transparent dark:border-[rgba(201,208,214,0.2)] text-white text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 flex-none"
                        >
                          {ghSyncing ? (
                            <>
                              <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                              </svg>
                              <span>Syncing…</span>
                            </>
                          ) : githubHandle ? (
                            'Re-sync Repos'
                          ) : (
                            'Connect GitHub'
                          )}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleLinkGithubOAuth}
                        disabled={ghLinking}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-[#181717] dark:bg-[#18181D] hover:bg-black dark:hover:bg-[#27272F] border border-transparent dark:border-[rgba(201,208,214,0.2)] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                        </svg>
                        <span>{ghLinking ? 'Redirecting to GitHub…' : 'Or Authorize with GitHub OAuth'}</span>
                      </button>

                      {!isNativeGithubLogin && githubHandle && (
                        <button
                          type="button"
                          onClick={handleDisconnectGithub}
                          disabled={ghDisconnecting}
                          className="w-full text-center py-1.5 text-xs font-bold text-[#B42318] dark:text-red-400 hover:underline disabled:opacity-50 cursor-pointer"
                        >
                          {ghDisconnecting ? 'Disconnecting…' : 'Disconnect GitHub'}
                        </button>
                      )}

                      {ghFeedback && (
                        <p className={`text-xs font-semibold px-3 py-2 rounded-lg ${ghFeedback.type === 'error'
                            ? 'bg-[#FDECEC] dark:bg-red-950/40 text-[#B42318] dark:text-red-400'
                            : 'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#22A06B] dark:text-emerald-400'
                          }`}>
                          {ghFeedback.message}
                        </p>
                      )}

                      <p className="text-[12px] text-[#7a7a7a] dark:text-[#94A3B8] leading-relaxed">
                        Connecting GitHub enables Skilling's recommendation engine to evaluate your real repository complexity and recommend advanced milestones instead of basic tutorials.
                      </p>
                    </div>
                  </div>

                  {error && (
                    <p className="text-[13.5px] text-[#B42318] dark:text-red-400 bg-[#FDECEC] dark:bg-red-950/40 border border-[#F3B9B9] dark:border-red-800/60 rounded-xl px-4 py-2.5">
                      {error}
                    </p>
                  )}

                  {/* Profile Save Button */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl px-7 py-3 text-white font-bold text-[14.5px] disabled:opacity-60 shadow-sm transition-all hover:bg-[#004fa3] cursor-pointer"
                      style={{ background: V }}
                    >
                      {saving ? 'Saving changes…' : 'Save profile changes'}
                    </button>
                    {toast && (
                      <span className="text-[13.5px] font-semibold text-[#16A34A] dark:text-emerald-400 flex items-center gap-1.5">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                        {toast}
                      </span>
                    )}
                  </div>
                </form>
              </section>

              {/* =========================================================================
                  SECTION 2: SETTINGS
                 ========================================================================= */}
              <section id="section-settings" className="space-y-6 pt-6 border-t border-[#e0e0e0] dark:border-[#27272F] scroll-mt-24" aria-labelledby="section-settings-title">
                <div className="flex items-center gap-2.5 pb-2 border-b border-[#e0e0e0] dark:border-[#27272F]">
                  <span className="w-8 h-8 rounded-xl bg-[#eaf2fc] dark:bg-[#18181D] text-[#0066cc] dark:text-[#C9D0D6] flex items-center justify-center flex-none">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6 1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  </span>
                  <div>
                    <h2 id="section-settings-title" className="font-['Manrope'] font-extrabold text-xl text-[#1d1d1f] dark:text-white">
                      Settings
                    </h2>
                    <p className="text-xs text-[#7a7a7a] dark:text-[#94A3B8]">
                      Study schedule pacing and preferred learning formats
                    </p>
                  </div>
                </div>

                {s && (
                  <div className="space-y-6">
                    {/* Study Schedule & Pacing */}
                    <div className="pf-glass-card p-6 shadow-2xs">
                      <div className="flex items-center gap-3 mb-5">
                        <span className="w-9 h-9 rounded-xl bg-[#eaf2fc] dark:bg-[#18181D] text-[#0066cc] dark:text-[#C9D0D6] border border-transparent dark:border-[rgba(201,208,214,0.15)] flex items-center justify-center flex-none">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                        </span>
                        <div>
                          <h3 className="font-['Manrope'] font-bold text-[16px] text-[#1d1d1f] dark:text-white">
                            Study Schedule & Pacing
                          </h3>
                          <p className="text-xs text-[#7a7a7a] dark:text-[#94A3B8]">
                            Updating weekly study hours automatically recalibrates milestone timelines
                          </p>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className={LABEL} htmlFor="wh_settings">Weekly Learning Hours</label>
                          <input
                            id="wh_settings"
                            type="number"
                            min="1"
                            max="60"
                            className={FIELD}
                            defaultValue={s.weekly_hours}
                            onBlur={(e) => {
                              const v = Number(e.target.value) || 10
                              if (v !== s.weekly_hours) patchSettings({ weekly_hours: v })
                            }}
                          />
                        </div>
                        <div>
                          <label className={LABEL} htmlFor="td_settings">Target Completion Date</label>
                          <input
                            id="td_settings"
                            type="date"
                            className={FIELD}
                            defaultValue={s.target_date || ''}
                            onBlur={(e) => {
                              if (e.target.value !== s.target_date) patchSettings({ target_date: e.target.value })
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className={LABEL}>Difficulty Progression</label>
                        <CustomSelect
                          value={s.difficulty_preference || 'adaptive'}
                          onChange={(val) => patchSettings({ difficulty_preference: val })}
                          options={[
                            { value: 'easier', label: 'Ease me in', subtitle: 'Gentle learning curve' },
                            { value: 'adaptive', label: 'Adaptive (Recommended)', subtitle: 'Dynamic difficulty based on mastery' },
                            { value: 'harder', label: 'Fast-track & Rigorous', subtitle: 'Intensive curriculum' },
                          ]}
                          className="w-full"
                          buttonClassName="w-full py-2.5 bg-white dark:bg-[#0E0E12] border-[#e0e0e0] dark:border-[#27272F] text-[#1d1d1f] dark:text-white"
                          menuClassName="w-full"
                          ariaLabel="Difficulty progression"
                        />
                      </div>
                    </div>

                    {/* Preferred Content Formats */}
                    <div className="pf-glass-card p-6 shadow-2xs">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="w-9 h-9 rounded-xl bg-[#eaf2fc] dark:bg-[#18181D] text-[#0066cc] dark:text-[#C9D0D6] border border-transparent dark:border-[rgba(201,208,214,0.15)] flex items-center justify-center flex-none">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                            <path d="M6 6h10" />
                            <path d="M6 10h10" />
                          </svg>
                        </span>
                        <div>
                          <h3 className="font-['Manrope'] font-bold text-[16px] text-[#1d1d1f] dark:text-white">
                            Preferred Content Formats
                          </h3>
                          <p className="text-xs text-[#7a7a7a] dark:text-[#94A3B8]">
                            Select the medium you learn best with. The algorithm will prioritize these.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2.5 pt-1">
                        {FORMATS.map((f) => {
                          const on = (s.preferred_formats || []).includes(f)
                          return (
                            <button
                              key={f}
                              type="button"
                              onClick={() => toggleFormat(f)}
                              className={`rounded-xl px-4 py-2 text-[13px] font-bold border transition-all capitalize cursor-pointer shadow-xs ${
                                on
                                  ? 'bg-[#0066cc] border-[#0066cc] text-white'
                                  : 'bg-white dark:bg-[#0E0E12] border-[#e0e0e0] dark:border-[#27272F] text-[#333333] dark:text-[#CBD5E1] hover:border-black/40 dark:hover:border-[#C9D0D6]'
                              }`}
                            >
                              {on ? `✓ ${f}` : `+ ${f}`}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {settingsError && (
                      <p className="text-[13.5px] text-[#B42318] dark:text-red-400 bg-[#FDECEC] dark:bg-red-950/40 border border-[#F3B9B9] dark:border-red-800/60 rounded-xl px-4 py-2.5">
                        {settingsError}
                      </p>
                    )}

                    {settingsToast && (
                      <div className="flex items-center gap-2 text-[13.5px] font-semibold text-[#16A34A] dark:text-emerald-400">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                        <span>{settingsToast}</span>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>

            {/* Right Rail Context & Quick Insights: 4 cols on desktop */}
            <div className="lg:col-span-4 relative">
              <div className="lg:sticky lg:top-6 space-y-6">
                {/* Learner Identity Summary Card */}
                <div className="pf-glass-card p-6 shadow-2xs">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0071e3] to-[#0066cc] text-white font-extrabold text-lg flex items-center justify-center shadow-sm flex-none">
                      {initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white truncate">
                        {fullName}
                      </h3>
                      <p className="text-xs text-[#7a7a7a] dark:text-[#94A3B8] truncate">{email}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#f5f5f7] dark:border-[#202026] space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#7a7a7a] dark:text-[#94A3B8]">Target Role</span>
                      <span className="font-bold text-[#0066cc] dark:text-[#C9D0D6] bg-[#eaf2fc] dark:bg-[#18181D] border border-transparent dark:border-[rgba(201,208,214,0.2)] px-2.5 py-1 rounded-lg">
                        {form.target_role || 'Not Set'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#7a7a7a] dark:text-[#94A3B8]">Study Commitment</span>
                      <span className="font-semibold text-[#1d1d1f] dark:text-white">
                        {form.weekly_hours || s?.weekly_hours || 10} hrs / week
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#7a7a7a] dark:text-[#94A3B8]">Proficiency Level</span>
                      <span className="font-semibold capitalize text-[#1d1d1f] dark:text-white">
                        {form.current_level || 'Beginner'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Section Navigation Jumper */}
                <div className="pf-glass-card p-5 shadow-2xs space-y-2">
                  <h4 className="font-['Manrope'] font-bold text-xs uppercase tracking-wider text-[#7a7a7a] dark:text-[#94A3B8]">
                    Quick Navigation
                  </h4>
                  <div className="space-y-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => scrollToSection('section-account')}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#eaf2fc] dark:hover:bg-[#18181D] text-xs font-bold text-[#333333] dark:text-[#CBD5E1] hover:text-[#0066cc] dark:hover:text-[#C9D0D6] transition-colors cursor-pointer text-left"
                    >
                      <span>1. Account</span>
                      <span>→</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollToSection('section-settings')}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#eaf2fc] dark:hover:bg-[#18181D] text-xs font-bold text-[#333333] dark:text-[#CBD5E1] hover:text-[#0066cc] dark:hover:text-[#C9D0D6] transition-colors cursor-pointer text-left"
                    >
                      <span>2. Settings</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>

                {/* Real-time Dynamic Sync Card */}
                <div className="bg-gradient-to-br from-[#fafbfc] to-[#eaf2fc] dark:from-[#18181D] dark:to-[#121216] border border-[#cfe4fb] dark:border-[#27272F] rounded-2xl p-5 shadow-2xs">
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-xl bg-white dark:bg-[#18181D] text-[#0066cc] dark:text-[#C9D0D6] border border-transparent dark:border-[rgba(201,208,214,0.2)] flex items-center justify-center flex-none shadow-2xs">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v4" />
                        <path d="m4.93 4.93 2.83 2.83" />
                        <path d="M2 12h4" />
                        <path d="m4.93 19.07 2.83-2.83" />
                        <path d="M12 18v4" />
                        <path d="m16.24 16.24 2.83 2.83" />
                        <path d="M18 12h4" />
                        <path d="m16.24 7.76 2.83-2.83" />
                      </svg>
                    </span>
                    <div>
                      <h4 className="font-['Manrope'] font-bold text-sm text-[#1d1d1f] dark:text-white">
                        Instant Cloud Sync
                      </h4>
                      <p className="text-xs text-[#333333] dark:text-[#94A3B8] mt-1 leading-relaxed">
                        Your profile updates synchronize seamlessly across your dashboard, skill graph, and AI coach recommendations in real time.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Data & Security Notice */}
                <div className="pf-glass-card p-5 shadow-2xs">
                  <h4 className="font-['Manrope'] font-bold text-xs uppercase tracking-wider text-[#7a7a7a] dark:text-[#94A3B8] mb-2">
                    Account Privacy
                  </h4>
                  <p className="text-xs text-[#6e6e73] dark:text-[#94A3B8] leading-relaxed">
                    Your learning data and preferences are encrypted and private to your account.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
