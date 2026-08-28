import React, { useEffect, useState } from 'react'
import AppShell from '../components/layout/AppShell'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/apiClient'

/**
 * Account — real profile editing backed by PATCH /api/me/profile.
 * Fully responsive 2-column layout filling available viewport width.
 */

const V = '#5B36E9'
const FIELD = 'w-full rounded-xl border border-[#D8DFEB] bg-white px-3.5 py-2.5 text-[14.5px] text-[#0E1B38] outline-none focus:border-[#5B36E9] focus:ring-[3px] focus:ring-[#5B36E9]/20 transition-colors'
const LABEL = 'block text-[13.5px] font-semibold text-[#0E1B38] mb-1.5'

export default function AccountPage() {
  const { user, profile, updateProfile } = useAuth()
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
      <div className="w-full font-['Inter',sans-serif] text-[#0E1B38]">
        {/* Page Header */}
        <header className="mb-6">
          <h1 className="font-['Manrope'] font-extrabold text-2xl sm:text-3xl text-[#0E1B38] tracking-tight">
            Account & Profile
          </h1>
          <p className="text-sm sm:text-base text-[#52617D] mt-1">
            Manage your personal profile, career ambition, and learning preferences.
          </p>
        </header>

        {loading ? (
          <div className="p-8 text-center text-[#74819A] text-sm bg-white rounded-2xl border border-[#E5E7EB]">
            Loading your profile…
          </div>
        ) : (
          <form onSubmit={save} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
            {/* Primary Left Column: 8 cols on desktop */}
            <div className="lg:col-span-8 space-y-6">
              {/* Profile Information Card */}
              <section className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs">
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-9 h-9 rounded-xl bg-[#F5F1FF] text-[#5B36E9] flex items-center justify-center flex-none">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="font-['Manrope'] font-bold text-[16px] text-[#0E1B38]">
                      Personal Details
                    </h2>
                    <p className="text-xs text-[#74819A]">
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
                      placeholder="e.g. Alex Chen"
                    />
                  </div>
                  <div>
                    <label className={LABEL} htmlFor="email">Email Address</label>
                    <input
                      id="email"
                      className={`${FIELD} bg-[#F8FAFC] text-[#74819A] cursor-not-allowed`}
                      value={email}
                      disabled
                      title="Email is managed via authentication"
                    />
                  </div>
                </div>
              </section>

              {/* Learning Goal & Career Ambition */}
              <section className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs">
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-9 h-9 rounded-xl bg-[#F5F1FF] text-[#5B36E9] flex items-center justify-center flex-none">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polygon points="16.2 7.8 10.5 10.5 7.8 16.2 13.5 13.5" fill="currentColor" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="font-['Manrope'] font-bold text-[16px] text-[#0E1B38]">
                      Learning Goal & Direction
                    </h2>
                    <p className="text-xs text-[#74819A]">
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
                      <label className={LABEL} htmlFor="current_level">Current Level</label>
                      <select
                        id="current_level"
                        className={FIELD}
                        value={form.current_level || 'beginner'}
                        onChange={set('current_level')}
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
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
                    <p className="text-[12px] text-[#74819A] mt-1.5">
                      Comma separated keywords. These directly steer your curated resources and practice problems.
                    </p>
                  </div>
                </div>
              </section>

              {error && (
                <p className="text-[13.5px] text-[#B42318] bg-[#FDECEC] border border-[#F3B9B9] rounded-xl px-4 py-2.5">
                  {error}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl px-7 py-3 text-white font-bold text-[14.5px] disabled:opacity-60 shadow-sm transition-all hover:bg-[#4826C9] cursor-pointer"
                  style={{ background: V }}
                >
                  {saving ? 'Saving changes…' : 'Save changes'}
                </button>
                {toast && (
                  <span className="text-[13.5px] font-semibold text-[#16A34A] flex items-center gap-1.5">
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
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs">
                <div className="flex items-center gap-4 mb-4">
                  <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6B47F0] to-[#5B36E9] text-white font-extrabold text-lg flex items-center justify-center shadow-sm flex-none">
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-['Manrope'] font-bold text-base text-[#0E1B38] truncate">
                      {fullName}
                    </h3>
                    <p className="text-xs text-[#74819A] truncate">{email}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#22A06B]" />
                      <span className="text-[11px] font-semibold text-[#22A06B]">
                        Active Learner
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#F0F3F8] space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#74819A]">Target Role</span>
                    <span className="font-bold text-[#0E1B38] bg-[#F5F1FF] text-[#5B36E9] px-2.5 py-1 rounded-lg">
                      {form.target_role || 'Not Set'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#74819A]">Study Commitment</span>
                    <span className="font-semibold text-[#0E1B38]">
                      {form.weekly_hours || 10} hrs / week
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#74819A]">Proficiency Level</span>
                    <span className="font-semibold capitalize text-[#0E1B38]">
                      {form.current_level || 'Beginner'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Real-time Dynamic Sync Card */}
              <div className="bg-gradient-to-br from-[#FAF8FF] to-[#F5F1FF] border border-[#DDD2FF] rounded-2xl p-5 shadow-2xs">
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-xl bg-white text-[#5B36E9] flex items-center justify-center flex-none shadow-2xs">
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
                    <h4 className="font-['Manrope'] font-bold text-sm text-[#0E1B38]">
                      Instant Cloud Sync
                    </h4>
                    <p className="text-xs text-[#52617D] mt-1 leading-relaxed">
                      Your profile updates synchronize seamlessly across your dashboard, skill graph, and AI coach recommendations in real time.
                    </p>
                  </div>
                </div>
              </div>

              {/* Data & Security Notice */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs">
                <h4 className="font-['Manrope'] font-bold text-xs uppercase tracking-wider text-[#74819A] mb-2">
                  Account Privacy
                </h4>
                <p className="text-xs text-[#64748B] leading-relaxed">
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
