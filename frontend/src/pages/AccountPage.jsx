import React, { useEffect, useState } from 'react'
import AppSidebar from '../components/ui/AppSidebar'
import UserProfileDropdown from '../components/ui/UserProfileDropdown'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/apiClient'

/**
 * Account — real profile editing backed by PATCH /api/me/profile.
 * Not a fake form: every save round-trips to the database and the response
 * repopulates the fields, so a reload shows the persisted values.
 */

const V = '#5B36E9'
const FIELD = 'w-full rounded-xl border border-[#D8DFEB] bg-white px-3.5 py-2.5 text-[14.5px] text-[#0E1B38] outline-none focus:border-[#5B36E9] focus:ring-[3px] focus:ring-[#5B36E9]/20'
const LABEL = 'block text-[13.5px] font-semibold text-[#0E1B38] mb-1.5'

export default function AccountPage() {
  const { updateProfile } = useAuth()
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
      flash('Saved')
    } catch {
      setError('Unable to update. Try again.')
    } finally { setSaving(false) }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div className="min-h-screen flex" style={{ background: '#F8FAFC' }}>
      <AppSidebar />
      <main className="flex-1 min-w-0 p-6 lg:p-10">
        <header className="flex items-start justify-between gap-5 mb-7 flex-wrap">
          <div>
            <h1 className="font-['Manrope'] font-bold text-[26px] text-[#0E1B38] tracking-tight">Account</h1>
            <p className="text-[13.5px] text-[#64748B] mt-1">Your profile and learning goal. Changes are saved to your account.</p>
          </div>
          <UserProfileDropdown />
        </header>

        {loading ? (
          <div className="text-[#94A3B8] text-sm">Loading your account…</div>
        ) : (
          <form onSubmit={save} className="max-w-[720px] space-y-5">
            <section className="bg-white border border-[#E5E7EB] rounded-2xl p-6">
              <h2 className="font-['Manrope'] font-bold text-[16px] mb-4 text-[#0E1B38]">Profile information</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL} htmlFor="full_name">Name</label>
                  <input id="full_name" className={FIELD} value={form.full_name} onChange={set('full_name')} placeholder="Your name" />
                </div>
                <div>
                  <label className={LABEL} htmlFor="email">Email</label>
                  {/* Email is managed by the auth provider, not editable here. */}
                  <input id="email" className={`${FIELD} bg-[#F8FAFC] text-[#74819A]`} value={me?.email || ''} disabled />
                </div>
              </div>
            </section>

            <section className="bg-white border border-[#E5E7EB] rounded-2xl p-6">
              <h2 className="font-['Manrope'] font-bold text-[16px] mb-4 text-[#0E1B38]">Learning goal</h2>
              <div className="space-y-4">
                <div>
                  <label className={LABEL} htmlFor="goal_text">Goal</label>
                  <textarea id="goal_text" rows={3} className={`${FIELD} resize-none`} value={form.goal_text} onChange={set('goal_text')} placeholder="What do you want to achieve?" />
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className={LABEL} htmlFor="target_role">Target role</label>
                    <input id="target_role" className={FIELD} value={form.target_role} onChange={set('target_role')} />
                  </div>
                  <div>
                    <label className={LABEL} htmlFor="current_level">Current level</label>
                    <select id="current_level" className={FIELD} value={form.current_level} onChange={set('current_level')}>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className={LABEL} htmlFor="weekly_hours">Weekly study hours</label>
                    <input id="weekly_hours" type="number" min="1" max="60" className={FIELD} value={form.weekly_hours} onChange={set('weekly_hours')} />
                  </div>
                </div>
                <div>
                  <label className={LABEL} htmlFor="interests">Interests</label>
                  <input id="interests" className={FIELD} value={form.interests} onChange={set('interests')} placeholder="python, statistics, machine learning" />
                  <p className="text-[12px] text-[#94A3B8] mt-1.5">Comma separated. These steer your recommendations.</p>
                </div>
              </div>
            </section>

            {error && <p className="text-[13.5px] text-[#B42318] bg-[#FDECEC] border border-[#F3B9B9] rounded-xl px-4 py-2.5">{error}</p>}

            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving}
                className="rounded-xl px-6 py-3 text-white font-bold text-[14.5px] disabled:opacity-60"
                style={{ background: V }}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              {toast && <span className="text-[13.5px] font-semibold text-[#16A34A]">{toast}</span>}
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
