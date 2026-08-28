import React, { useEffect, useState } from 'react'
import AppSidebar from '../components/ui/AppSidebar'
import UserProfileDropdown from '../components/ui/UserProfileDropdown'
import api from '../lib/apiClient'

/**
 * Settings — real preferences backed by GET/PATCH /api/settings.
 * Changing weekly study hours also re-packs the roadmap's weeks server-side,
 * so the plan genuinely reflects the new budget.
 */

const V = '#5B36E9'
const FIELD = 'w-full rounded-xl border border-[#D8DFEB] bg-white px-3.5 py-2.5 text-[14.5px] text-[#0E1B38] outline-none focus:border-[#5B36E9] focus:ring-[3px] focus:ring-[#5B36E9]/20'
const LABEL = 'block text-[13.5px] font-semibold text-[#0E1B38] mb-1.5'

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer py-2.5">
      <button
        type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className="relative rounded-full flex-none transition-colors mt-0.5"
        style={{ width: 40, height: 22, background: checked ? V : '#D8DFEB' }}
      >
        <span className="absolute rounded-full bg-white transition-all"
              style={{ width: 16, height: 16, top: 3, left: checked ? 21 : 3 }} />
      </button>
      <span>
        <span className="block text-[14px] font-semibold text-[#0E1B38]">{label}</span>
        {hint && <span className="block text-[12.5px] text-[#74819A] mt-0.5">{hint}</span>}
      </span>
    </label>
  )
}

const FORMATS = ['course', 'video', 'article', 'practice', 'project', 'documentation']

export default function SettingsPage() {
  const [s, setS] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await api.get('/api/settings')
        setS(data)
      } catch { setError('Unable to load settings. Try again.') }
      finally { setLoading(false) }
    })()
  }, [])

  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 2600) }

  const patch = async (changes) => {
    setSaving(true); setError(null)
    const optimistic = { ...s, ...changes }
    setS(optimistic)
    try {
      const { data } = await api.patch('/api/settings', changes)
      setS(data)
      flash('Updated')
    } catch {
      setS(s) // roll back
      setError('Unable to update. Try again.')
    } finally { setSaving(false) }
  }

  const toggleFormat = (fmt) => {
    const cur = s.preferred_formats || []
    const next = cur.includes(fmt) ? cur.filter((f) => f !== fmt) : [...cur, fmt]
    patch({ preferred_formats: next.length ? next : [fmt] })
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#F8FAFC' }}>
      <AppSidebar />
      <main className="flex-1 min-w-0 p-6 lg:p-10">
        <header className="flex items-start justify-between gap-5 mb-7 flex-wrap">
          <div>
            <h1 className="font-['Manrope'] font-bold text-[26px] text-[#0E1B38] tracking-tight">Settings</h1>
            <p className="text-[13.5px] text-[#64748B] mt-1">Study preferences, notifications, and how PathFinder recommends to you.</p>
          </div>
          <UserProfileDropdown />
        </header>

        {loading || !s ? (
          <div className="text-[#94A3B8] text-sm">Loading settings…</div>
        ) : (
          <div className="max-w-[720px] space-y-5">
            <section className="bg-white border border-[#E5E7EB] rounded-2xl p-6">
              <h2 className="font-['Manrope'] font-bold text-[16px] mb-1 text-[#0E1B38]">Study preferences</h2>
              <p className="text-[12.5px] text-[#74819A] mb-4">Changing your weekly hours re-plans your roadmap weeks.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL} htmlFor="wh">Weekly learning hours</label>
                  <input id="wh" type="number" min="1" max="60" className={FIELD}
                         defaultValue={s.weekly_hours}
                         onBlur={(e) => {
                           const v = Number(e.target.value) || 10
                           if (v !== s.weekly_hours) patch({ weekly_hours: v })
                         }} />
                </div>
                <div>
                  <label className={LABEL} htmlFor="td">Target date</label>
                  <input id="td" type="date" className={FIELD}
                         defaultValue={s.target_date || ''}
                         onBlur={(e) => { if (e.target.value !== s.target_date) patch({ target_date: e.target.value }) }} />
                </div>
              </div>
              <div className="mt-4">
                <label className={LABEL} htmlFor="dp">Difficulty preference</label>
                <select id="dp" className={FIELD} value={s.difficulty_preference || 'adaptive'}
                        onChange={(e) => patch({ difficulty_preference: e.target.value })}>
                  <option value="easier">Ease me in</option>
                  <option value="adaptive">Adaptive (recommended)</option>
                  <option value="harder">Push me harder</option>
                </select>
              </div>
            </section>

            <section className="bg-white border border-[#E5E7EB] rounded-2xl p-6">
              <h2 className="font-['Manrope'] font-bold text-[16px] mb-3 text-[#0E1B38]">Resource preferences</h2>
              <p className="text-[12.5px] text-[#74819A] mb-3">Formats you'd rather learn from.</p>
              <div className="flex flex-wrap gap-2">
                {FORMATS.map((f) => {
                  const on = (s.preferred_formats || []).includes(f)
                  return (
                    <button key={f} type="button" onClick={() => toggleFormat(f)}
                      className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold border transition-colors capitalize"
                      style={on
                        ? { background: V, borderColor: V, color: '#fff' }
                        : { background: '#fff', borderColor: '#E5E7EB', color: '#475569' }}>
                      {f}
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="bg-white border border-[#E5E7EB] rounded-2xl p-6">
              <h2 className="font-['Manrope'] font-bold text-[16px] mb-2 text-[#0E1B38]">Notifications & AI</h2>
              <Toggle checked={!!s.email_notifications} label="Email notifications"
                      hint="Weekly summaries of your progress."
                      onChange={(v) => patch({ email_notifications: v })} />
              <Toggle checked={!!s.reminder_notifications} label="Study reminders"
                      hint="Nudges when your streak is at risk."
                      onChange={(v) => patch({ reminder_notifications: v })} />
              <Toggle checked={!!s.ai_suggestions} label="AI suggestions"
                      hint="Let PathFinder proactively recommend next steps."
                      onChange={(v) => patch({ ai_suggestions: v })} />
            </section>

            {error && <p className="text-[13.5px] text-[#B42318] bg-[#FDECEC] border border-[#F3B9B9] rounded-xl px-4 py-2.5">{error}</p>}
            <div className="h-6 flex items-center">
              {saving && <span className="text-[13px] text-[#74819A]">Saving…</span>}
              {toast && !saving && <span className="text-[13.5px] font-semibold text-[#16A34A]">{toast}</span>}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
