import React, { useEffect, useState } from 'react'
import AppShell from '../components/layout/AppShell'
import api from '../lib/apiClient'

/**
 * Settings — real preferences backed by GET/PATCH /api/settings.
 * Changing weekly study hours also re-packs the roadmap's weeks server-side,
 * so the plan genuinely reflects the new budget.
 */

const V = '#0066cc'
const FIELD = 'w-full rounded-xl border border-[#e0e0e0] bg-white px-3.5 py-2.5 text-[14.5px] text-[#1d1d1f] outline-none focus:border-[#0066cc] focus:ring-[3px] focus:ring-[#0066cc]/20 transition-colors'
const LABEL = 'block text-[13.5px] font-semibold text-[#1d1d1f] mb-1.5'

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex items-start gap-3.5 cursor-pointer py-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative rounded-full flex-none transition-colors mt-0.5 cursor-pointer"
        style={{ width: 42, height: 24, background: checked ? V : '#e0e0e0' }}
      >
        <span
          className="absolute rounded-full bg-white transition-all shadow-xs"
          style={{ width: 18, height: 18, top: 3, left: checked ? 21 : 3 }}
        />
      </button>
      <span>
        <span className="block text-[14px] font-semibold text-[#1d1d1f]">{label}</span>
        {hint && <span className="block text-[12.5px] text-[#7a7a7a] mt-0.5">{hint}</span>}
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
      } catch {
        setError('Unable to load settings. Try again.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const flash = (m) => {
    setToast(m)
    setTimeout(() => setToast(null), 2600)
  }

  const patch = async (changes) => {
    setSaving(true)
    setError(null)
    const optimistic = { ...s, ...changes }
    setS(optimistic)
    try {
      const { data } = await api.patch('/api/settings', changes)
      setS(data)
      flash('Saved preferences')
    } catch {
      setS(s) // roll back
      setError('Unable to update. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const toggleFormat = (fmt) => {
    const cur = s.preferred_formats || []
    const next = cur.includes(fmt) ? cur.filter((f) => f !== fmt) : [...cur, fmt]
    patch({ preferred_formats: next.length ? next : [fmt] })
  }

  return (
    <AppShell>
      <div className="w-full font-['Inter',sans-serif] text-[#1d1d1f]">
        {/* Page Header */}
        <header className="mb-6">
          <h1 className="font-['Manrope'] font-extrabold text-2xl sm:text-3xl text-[#1d1d1f] tracking-tight">
            Preferences & Settings
          </h1>
          <p className="text-sm sm:text-base text-[#333333] mt-1">
            Study schedule, preferred content formats, notifications, and AI recommendation rules.
          </p>
        </header>

        {loading || !s ? (
          <div className="p-8 text-center text-[#7a7a7a] text-sm bg-white rounded-2xl border border-[#e0e0e0]">
            Loading settings…
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
            {/* Primary Left Column: 8 cols on desktop */}
            <div className="lg:col-span-8 space-y-6">
              {/* Study Preferences Card */}
              <section className="bg-white border border-[#e0e0e0] rounded-2xl p-6 shadow-2xs">
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-9 h-9 rounded-xl bg-[#eaf2fc] text-[#0066cc] flex items-center justify-center flex-none">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="font-['Manrope'] font-bold text-[16px] text-[#1d1d1f]">
                      Study Schedule & Pacing
                    </h2>
                    <p className="text-xs text-[#7a7a7a]">
                      Updating weekly study hours automatically recalibrates milestone timelines
                    </p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL} htmlFor="wh">Weekly Learning Hours</label>
                    <input
                      id="wh"
                      type="number"
                      min="1"
                      max="60"
                      className={FIELD}
                      defaultValue={s.weekly_hours}
                      onBlur={(e) => {
                        const v = Number(e.target.value) || 10
                        if (v !== s.weekly_hours) patch({ weekly_hours: v })
                      }}
                    />
                  </div>
                  <div>
                    <label className={LABEL} htmlFor="td">Target Completion Date</label>
                    <input
                      id="td"
                      type="date"
                      className={FIELD}
                      defaultValue={s.target_date || ''}
                      onBlur={(e) => {
                        if (e.target.value !== s.target_date) patch({ target_date: e.target.value })
                      }}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className={LABEL} htmlFor="dp">Difficulty Progression</label>
                  <select
                    id="dp"
                    className={FIELD}
                    value={s.difficulty_preference || 'adaptive'}
                    onChange={(e) => patch({ difficulty_preference: e.target.value })}
                  >
                    <option value="easier">Ease me in — Gentle learning curve</option>
                    <option value="adaptive">Adaptive (Recommended) — Dynamic difficulty based on mastery</option>
                    <option value="harder">Fast-track & Rigorous — Intensive curriculum</option>
                  </select>
                </div>
              </section>

              {/* Resource Formats */}
              <section className="bg-white border border-[#e0e0e0] rounded-2xl p-6 shadow-2xs">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-9 h-9 rounded-xl bg-[#eaf2fc] text-[#0066cc] flex items-center justify-center flex-none">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                      <path d="M6 6h10" />
                      <path d="M6 10h10" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="font-['Manrope'] font-bold text-[16px] text-[#1d1d1f]">
                      Preferred Content Formats
                    </h2>
                    <p className="text-xs text-[#7a7a7a]">
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
                        className="rounded-xl px-4 py-2 text-[13px] font-bold border transition-all capitalize cursor-pointer shadow-xs"
                        style={
                          on
                            ? { background: V, borderColor: V, color: '#fff' }
                            : { background: '#fff', borderColor: '#e0e0e0', color: '#333333' }
                        }
                      >
                        {on ? `✓ ${f}` : `+ ${f}`}
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* Notifications & AI Assistant Preferences */}
              <section className="bg-white border border-[#e0e0e0] rounded-2xl p-6 shadow-2xs">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-9 h-9 rounded-xl bg-[#eaf2fc] text-[#0066cc] flex items-center justify-center flex-none">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="font-['Manrope'] font-bold text-[16px] text-[#1d1d1f]">
                      Notifications & Proactive AI
                    </h2>
                    <p className="text-xs text-[#7a7a7a]">
                      Control how PathFinder keeps you accountable and engaged
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-[#f5f5f7]">
                  <Toggle
                    checked={!!s.email_notifications}
                    label="Email Progress Summaries"
                    hint="Weekly recap of completed modules, skill progress, and milestone achievements."
                    onChange={(v) => patch({ email_notifications: v })}
                  />
                  <Toggle
                    checked={!!s.reminder_notifications}
                    label="Streak & Study Reminders"
                    hint="Timely nudges when your daily learning streak or weekly commitment is at risk."
                    onChange={(v) => patch({ reminder_notifications: v })}
                  />
                  <Toggle
                    checked={!!s.ai_suggestions}
                    label="Proactive AI Recommendations"
                    hint="Allow the AI Coach to suggest practice problems and next modules based on live gaps."
                    onChange={(v) => patch({ ai_suggestions: v })}
                  />
                </div>
              </section>

              {error && (
                <p className="text-[13.5px] text-[#B42318] bg-[#FDECEC] border border-[#F3B9B9] rounded-xl px-4 py-2.5">
                  {error}
                </p>
              )}

              <div className="h-6 flex items-center gap-2">
                {saving && (
                  <span className="text-[13px] text-[#7a7a7a] flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" strokeWidth="3" strokeDasharray="30" strokeLinecap="round" />
                    </svg>
                    Saving changes…
                  </span>
                )}
                {toast && !saving && (
                  <span className="text-[13.5px] font-semibold text-[#16A34A] flex items-center gap-1.5">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    {toast}
                  </span>
                )}
              </div>
            </div>

            {/* Right Rail Context & Summary: 4 cols on desktop */}
            <div className="lg:col-span-4 space-y-6">
              {/* Preferences Summary Card */}
              <div className="bg-white border border-[#e0e0e0] rounded-2xl p-6 shadow-2xs">
                <h3 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] mb-4">
                  Profile Configuration
                </h3>

                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-[#f5f5f7]">
                    <span className="text-[#7a7a7a]">Weekly Target</span>
                    <span className="font-bold text-[#1d1d1f]">
                      {s.weekly_hours || 10} hours / week
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-[#f5f5f7]">
                    <span className="text-[#7a7a7a]">Pacing Mode</span>
                    <span className="font-bold text-[#0066cc] bg-[#eaf2fc] px-2.5 py-1 rounded-lg capitalize">
                      {s.difficulty_preference || 'Adaptive'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-[#f5f5f7]">
                    <span className="text-[#7a7a7a]">Active Formats</span>
                    <span className="font-semibold text-[#1d1d1f]">
                      {(s.preferred_formats || []).length} types selected
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-[#7a7a7a]">AI Assistant</span>
                    <span className="font-semibold text-[#22A06B]">
                      {s.ai_suggestions ? 'Active & Calibrated' : 'Muted'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Re-calibration Insight */}
              <div className="bg-gradient-to-br from-[#fafbfc] to-[#eaf2fc] border border-[#cfe4fb] rounded-2xl p-5 shadow-2xs">
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-xl bg-white text-[#0066cc] flex items-center justify-center flex-none shadow-2xs">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4" />
                      <path d="M12 8h.01" />
                    </svg>
                  </span>
                  <div>
                    <h4 className="font-['Manrope'] font-bold text-sm text-[#1d1d1f]">
                      Adaptive Re-calibration
                    </h4>
                    <p className="text-xs text-[#333333] mt-1 leading-relaxed">
                      Whenever you adjust study hours or formats, your learning roadmap automatically re-organizes weekly modules without losing completed tasks.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
