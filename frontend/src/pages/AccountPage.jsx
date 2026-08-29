import React, { useEffect, useState } from 'react'
import AppShell from '../components/layout/AppShell'
import CustomSelect from '../components/ui/CustomSelect'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/apiClient'
import { supabase } from '../lib/supabaseClient'

/**
 * Account — real profile editing backed by PATCH /api/me/profile.
 * Fully responsive 2-column layout filling available viewport width.
 */

const V = '#0066cc'
const FIELD = 'w-full rounded-xl border border-[#e0e0e0] dark:border-[#242E40] bg-white dark:bg-[#0E131E] px-3.5 py-2.5 text-[14.5px] text-[#1d1d1f] dark:text-white outline-none focus:border-[#0066cc] dark:focus:border-[#38BDF8] focus:ring-[3px] focus:ring-[#0066cc]/20 transition-colors'
const LABEL = 'block text-[13.5px] font-semibold text-[#1d1d1f] dark:text-[#CBD5E1] mb-1.5'

export default function AccountPage() {
  const { user, profile, updateProfile, linkGithub } = useAuth()
  const [me, setMe] = useState(null)
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get('/api/me')
      setMe(data)
      setForm({
        full_name: data.full_name || '',
        goal_text: data.goal_text || '',
        target_role: data.target_role || '',
        current_level: data.current_level || 'beginner',
        weekly_hours: data.weekly_hours ?? 10,
        interests: (data.interests || []).join(', '),
      })
    } catch {
      setError('Unable to load your account. Try again.')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600) }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const payload = {
        ...form,
        weekly_hours: Number(form.weekly_hours) || 10,
        interests: form.interests.split(',').map((s) => s.trim()).filter(Boolean),
      }
      const { data } = await api.patch('/api/me/profile', payload)
      setMe(data)
      if (updateProfile) updateProfile(data)
      flash('Saved changes successfully')
    } catch {
      setError('Unable to update. Try again.')
    } finally { setSaving(false) }
  }

  const [ghInput, setGhInput] = useState('')
  const [ghSyncing, setGhSyncing] = useState(false)
  const [ghFeedback, setGhFeedback] = useState(null)

  const githubHandle =
    user?.user_metadata?.user_name ||
    user?.user_metadata?.preferred_username ||
    profile?.github_username ||
    me?.github_username ||
    (typeof window !== 'undefined' && localStorage.getItem(`pf_github_user_${user?.id}`)) ||
    ''

  const handleSyncGithubAccount = async (overrideUsername) => {
    const target = (overrideUsername || ghInput || githubHandle).trim()
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
      // Adds GitHub to THIS account via linkIdentity (see AuthContext.linkGithub) -
      // never a plain sign-in here, which would risk switching the session to a
      // brand-new, separate account instead of enriching the current one.
      await linkGithub()
      // linkGithub() redirects the whole page to GitHub; if we're still here,
      // something prevented the redirect - surface it rather than leaving the
      // button stuck on "Connecting...".
    } catch (err) {
      setGhFeedback({
        type: 'error',
        message: err?.message || 'Could not start GitHub authorization.',
      })
      setGhLinking(false)
    }
  }

  // Completes the OAuth-link loop: after GitHub redirects back here
  // (?github_linked=true), the identity is linked to this account but
  // nothing has analyzed the learner's real repos yet - look up the GitHub
  // username Supabase just linked and run the same real sync the manual
  // username field triggers, so authorizing via OAuth isn't a dead end.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('github_linked') !== 'true') return

    // Strip the query param immediately so a reload doesn't re-trigger this.
    window.history.replaceState({}, '', '/account')

      ; (async () => {
        try {
          const { data, error } = await supabase.auth.getUserIdentities()
          if (error) throw error
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
              message: 'GitHub was authorized, but we could not read your username back from it. Enter it manually below.',
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
    // Runs once on mount only - deliberately not depending on
    // handleSyncGithubAccount (recreated every render) to avoid re-firing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

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

  return (
    <AppShell>
      <div className="w-full font-['Inter',sans-serif] text-[#1d1d1f] dark:text-white">
        {/* Page Header */}
        <header className="mb-6">
          <h1 className="font-['Manrope'] font-extrabold text-2xl sm:text-3xl text-[#1d1d1f] dark:text-white tracking-tight">
            Account & Profile
          </h1>
          <p className="text-sm sm:text-base text-[#333333] dark:text-[#94A3B8] mt-1">
            Manage your personal profile, career ambition, and learning preferences.
          </p>
        </header>

        {loading ? (
          <div className="p-8 text-center text-[#7a7a7a] dark:text-[#94A3B8] text-sm bg-white dark:bg-[#141A26] rounded-2xl border border-[#e0e0e0] dark:border-[#242E40]">
            Loading your profile…
          </div>
        ) : (
          <form onSubmit={save} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
            {/* Primary Left Column: 8 cols on desktop */}
            <div className="lg:col-span-8 space-y-6">
              {/* Profile Information Card */}
              <section className="bg-white dark:bg-[#141A26] border border-[#e0e0e0] dark:border-[#242E40] rounded-2xl p-6 shadow-2xs">
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-9 h-9 rounded-xl bg-[#eaf2fc] dark:bg-[#1E293B] text-[#0066cc] dark:text-[#38BDF8] flex items-center justify-center flex-none">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="font-['Manrope'] font-bold text-[16px] text-[#1d1d1f] dark:text-white">
                      Personal Details
                    </h2>
                    <p className="text-xs text-[#7a7a7a] dark:text-[#94A3B8]">
                      Your identity across the PathFinder learning workspace
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
                      onChange={set('full_name')}
                      placeholder="e.g. HCL Tech"
                    />
                  </div>
                  <div>
                    <label className={LABEL} htmlFor="email">Email Address</label>
                    <input
                      id="email"
                      className={`${FIELD} bg-[#fafafc] dark:bg-[#0E131E] text-[#7a7a7a] dark:text-[#94A3B8] cursor-not-allowed`}
                      value={email}
                      disabled
                      title="Email is managed via authentication"
                    />
                  </div>
                </div>
              </section>

              {/* Learning Goal & Career Ambition */}
              <section className="bg-white dark:bg-[#141A26] border border-[#e0e0e0] dark:border-[#242E40] rounded-2xl p-6 shadow-2xs">
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-9 h-9 rounded-xl bg-[#eaf2fc] dark:bg-[#1E293B] text-[#0066cc] dark:text-[#38BDF8] flex items-center justify-center flex-none">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polygon points="16.2 7.8 10.5 10.5 7.8 16.2 13.5 13.5" fill="currentColor" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="font-['Manrope'] font-bold text-[16px] text-[#1d1d1f] dark:text-white">
                      Learning Goal & Direction
                    </h2>
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
                      onChange={set('goal_text')}
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
                        onChange={set('target_role')}
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
                        buttonClassName="w-full py-2.5 bg-white dark:bg-[#0E131E] border-[#e0e0e0] dark:border-[#242E40] text-[#1d1d1f] dark:text-white"
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
                        onChange={set('weekly_hours')}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={LABEL} htmlFor="interests">Key Skills & Interests</label>
                    <input
                      id="interests"
                      className={FIELD}
                      value={form.interests || ''}
                      onChange={set('interests')}
                      placeholder="e.g. python, machine learning, docker, kubernetes"
                    />
                    <p className="text-[12px] text-[#7a7a7a] dark:text-[#94A3B8] mt-1.5">
                      Comma separated keywords. These directly steer your curated resources and practice problems.
                    </p>
                  </div>
                </div>
              </section>

              {/* Developer Stack & GitHub Integration Card */}
              <section className="bg-white dark:bg-[#141A26] border border-[#e0e0e0] dark:border-[#242E40] rounded-2xl p-6 shadow-2xs">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-[#181717] dark:bg-[#1E293B] text-white flex items-center justify-center flex-none">
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                      </svg>
                    </span>
                    <div>
                      <h2 className="font-['Manrope'] font-bold text-[16px] text-[#1d1d1f] dark:text-white">
                        GitHub Integration
                      </h2>
                      <p className="text-xs text-[#7a7a7a] dark:text-[#94A3B8]">
                        Calibrate recommendations against your repositories and commit history
                      </p>
                    </div>
                  </div>

                  {githubHandle && (
                    <span className="inline-flex items-center gap-1.5 bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#22A06B] dark:text-emerald-400 text-xs px-3 py-1 rounded-full font-bold">
                      <span className="w-2 h-2 rounded-full bg-[#22A06B]"></span>
                      Connected: @{githubHandle}
                    </span>
                  )}
                </div>

                <div className="bg-[#fafafc] dark:bg-[#0E131E] border border-[#e0e0e0] dark:border-[#242E40] rounded-xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <div className="flex-1 flex items-center bg-white dark:bg-[#141A26] border border-[#e0e0e0] dark:border-[#242E40] rounded-xl px-3 py-2 text-xs sm:text-sm focus-within:border-[#0066cc] dark:focus-within:border-[#38BDF8] focus-within:ring-2 focus-within:ring-[#0066cc]/20 transition-all">
                      <span className="text-[#86868b] dark:text-[#64748B] font-mono mr-1">github.com/</span>
                      <input
                        type="text"
                        value={ghInput}
                        onChange={(e) => setGhInput(e.target.value)}
                        placeholder={githubHandle || "username (e.g. torvalds)"}
                        className="flex-1 bg-transparent text-[#1d1d1f] dark:text-white outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSyncGithubAccount}
                      disabled={ghSyncing || (!ghInput.trim() && !githubHandle)}
                      className="px-4 py-2 bg-[#181717] dark:bg-[#242E40] hover:bg-black dark:hover:bg-[#1E293B] text-white text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 flex-none"
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
                    className="w-full flex items-center justify-center gap-2 py-2 bg-[#181717] dark:bg-[#1E293B] hover:bg-black dark:hover:bg-[#242E40] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                    <span>{ghLinking ? 'Redirecting to GitHub…' : 'Or Authorize with GitHub OAuth'}</span>
                  </button>

                  {ghFeedback && (
                    <p className={`text-xs font-semibold px-3 py-2 rounded-lg ${ghFeedback.type === 'error'
                        ? 'bg-[#FDECEC] dark:bg-red-950/40 text-[#B42318] dark:text-red-400'
                        : 'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#22A06B] dark:text-emerald-400'
                      }`}>
                      {ghFeedback.message}
                    </p>
                  )}

                  <p className="text-[12px] text-[#7a7a7a] dark:text-[#94A3B8] leading-relaxed">
                    Connecting GitHub enables PathFinder's recommendation engine to evaluate your real repository complexity and recommend advanced milestones instead of basic tutorials.
                  </p>
                </div>
              </section>

              {error && (
                <p className="text-[13.5px] text-[#B42318] dark:text-red-400 bg-[#FDECEC] dark:bg-red-950/40 border border-[#F3B9B9] dark:border-red-800/60 rounded-xl px-4 py-2.5">
                  {error}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl px-7 py-3 text-white font-bold text-[14.5px] disabled:opacity-60 shadow-sm transition-all hover:bg-[#004fa3] cursor-pointer"
                  style={{ background: V }}
                >
                  {saving ? 'Saving changes…' : 'Save changes'}
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
            </div>

            {/* Right Rail Context & Quick Insights: 4 cols on desktop */}
            <div className="lg:col-span-4 space-y-6">
              {/* Learner Identity Summary Card */}
              <div className="bg-white dark:bg-[#141A26] border border-[#e0e0e0] dark:border-[#242E40] rounded-2xl p-6 shadow-2xs">
                <div className="flex items-center gap-4 mb-4">
                  <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0071e3] to-[#0066cc] text-white font-extrabold text-lg flex items-center justify-center shadow-sm flex-none">
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white truncate">
                      {fullName}
                    </h3>
                    <p className="text-xs text-[#7a7a7a] dark:text-[#94A3B8] truncate">{email}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#22A06B]" />
                      <span className="text-[11px] font-semibold text-[#22A06B] dark:text-emerald-400">
                        Active Learner
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#f5f5f7] dark:border-[#1E2638] space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#7a7a7a] dark:text-[#94A3B8]">Target Role</span>
                    <span className="font-bold text-[#0066cc] dark:text-[#38BDF8] bg-[#eaf2fc] dark:bg-[#1E293B] px-2.5 py-1 rounded-lg">
                      {form.target_role || 'Not Set'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#7a7a7a] dark:text-[#94A3B8]">Study Commitment</span>
                    <span className="font-semibold text-[#1d1d1f] dark:text-white">
                      {form.weekly_hours || 10} hrs / week
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

              {/* Real-time Dynamic Sync Card */}
              <div className="bg-gradient-to-br from-[#fafbfc] to-[#eaf2fc] dark:from-[#141A26] dark:to-[#101622] border border-[#cfe4fb] dark:border-[#242E40] rounded-2xl p-5 shadow-2xs">
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-xl bg-white dark:bg-[#1E293B] text-[#0066cc] dark:text-[#38BDF8] flex items-center justify-center flex-none shadow-2xs">
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
              <div className="bg-white dark:bg-[#141A26] border border-[#e0e0e0] dark:border-[#242E40] rounded-2xl p-5 shadow-2xs">
                <h4 className="font-['Manrope'] font-bold text-xs uppercase tracking-wider text-[#7a7a7a] dark:text-[#94A3B8] mb-2">
                  Account Privacy
                </h4>
                <p className="text-xs text-[#6e6e73] dark:text-[#94A3B8] leading-relaxed">
                  Your learning data and progress are encrypted and private to your account.
                </p>
              </div>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  )
}
