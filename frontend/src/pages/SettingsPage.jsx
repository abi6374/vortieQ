import React, { useEffect, useState } from 'react'
import AppShell from '../components/layout/AppShell'
import CustomSelect from '../components/ui/CustomSelect'
import api from '../lib/apiClient'

/**
 * Settings — real preferences backed by GET/PATCH /api/settings.
 * Changing weekly study hours also re-packs the roadmap's weeks server-side,
 * so the plan genuinely reflects the new budget.
 */

const V = '#0066cc'
const FIELD = 'w-full rounded-xl border border-[#e0e0e0] dark:border-[#242E40] bg-white dark:bg-[#0E131E] px-3.5 py-2.5 text-[14.5px] text-[#1d1d1f] dark:text-white outline-none focus:border-[#0066cc] dark:focus:border-[#38BDF8] focus:ring-[3px] focus:ring-[#0066cc]/20 transition-colors'
const LABEL = 'block text-[13.5px] font-semibold text-[#1d1d1f] dark:text-[#CBD5E1] mb-1.5'

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex items-start gap-3.5 cursor-pointer py-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative rounded-full flex-none transition-colors mt-0.5 cursor-pointer"
        style={{ width: 42, height: 24, background: checked ? V : '#94A3B8' }}
      >
        <span
          className="absolute rounded-full bg-white transition-all shadow-xs"
          style={{ width: 18, height: 18, top: 3, left: checked ? 21 : 3 }}
        />
      </button>
      <span>
        <span className="block text-[14px] font-semibold text-[#1d1d1f] dark:text-white">{label}</span>
        {hint && <span className="block text-[12.5px] text-[#7a7a7a] dark:text-[#94A3B8] mt-0.5">{hint}</span>}
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
        setS({
          weekly_hours: 30,
          target_date: '2026-08-14',
          difficulty_preference: 'adaptive',
          preferred_formats: ['course', 'video', 'article', 'practice'],
          email_summaries: true,
          streak_reminders: true,
          proactive_ai: true,
        })
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
      <div className="w-full font-['Inter',sans-serif] text-[#1d1d1f] dark:text-white">
        {/* Page Header */}
        <header className="mb-6">
          <h1 className="font-['Manrope'] font-extrabold text-2xl sm:text-3xl text-[#1d1d1f] dark:text-white tracking-tight">
            Preferences & Settings
          </h1>
          <p className="text-sm sm:text-base text-[#333333] dark:text-[#94A3B8] mt-1">
            Study schedule, preferred content formats, notifications, and AI recommendation rules.
          </p>
        </header>

        {loading || !s ? (
          <div className="p-8 text-center text-[#7a7a7a] dark:text-[#94A3B8] text-sm bg-white dark:bg-[#141A26] rounded-2xl border border-[#e0e0e0] dark:border-[#242E40]">
            Loading settings…
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
            {/* Primary Left Column: 8 cols on desktop */}
            <div className="lg:col-span-8 space-y-6">
              {/* Study Preferences Card */}
              <section className="bg-white dark:bg-[#141A26] border border-[#e0e0e0] dark:border-[#242E40] rounded-2xl p-6 shadow-2xs">
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-9 h-9 rounded-xl bg-[#eaf2fc] dark:bg-[#1E293B] text-[#0066cc] dark:text-[#38BDF8] flex items-center justify-center flex-none">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="font-['Manrope'] font-bold text-[16px] text-[#1d1d1f] dark:text-white">
                      Study Schedule & Pacing
                    </h2>
                    <p className="text-xs text-[#7a7a7a] dark:text-[#94A3B8]">
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
                  <label className={LABEL}>Difficulty Progression</label>
                  <CustomSelect
                    value={s.difficulty_preference || 'adaptive'}
                    onChange={(val) => patch({ difficulty_preference: val })}
                    options={[
                      { value: 'easier', label: 'Ease me in', subtitle: 'Gentle learning curve' },
                      { value: 'adaptive', label: 'Adaptive (Recommended)', subtitle: 'Dynamic difficulty based on mastery' },
                      { value: 'harder', label: 'Fast-track & Rigorous', subtitle: 'Intensive curriculum' },
                    ]}
                    className="w-full"
                    buttonClassName="w-full py-2.5 bg-white dark:bg-[#0E131E] border-[#e0e0e0] dark:border-[#242E40] text-[#1d1d1f] dark:text-white"
                    menuClassName="w-full"
                    ariaLabel="Difficulty progression"
                  />
                </div>
              </section>

              {/* Resource Formats */}
              <section className="bg-white dark:bg-[#141A26] border border-[#e0e0e0] dark:border-[#242E40] rounded-2xl p-6 shadow-2xs">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-9 h-9 rounded-xl bg-[#eaf2fc] dark:bg-[#1E293B] text-[#0066cc] dark:text-[#38BDF8] flex items-center justify-center flex-none">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                      <path d="M6 6h10" />
                      <path d="M6 10h10" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="font-['Manrope'] font-bold text-[16px] text-[#1d1d1f] dark:text-white">
                      Preferred Content Formats
                    </h2>
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
                            : 'bg-white dark:bg-[#0E131E] border-[#e0e0e0] dark:border-[#242E40] text-[#333333] dark:text-[#CBD5E1] hover:border-[#0066cc] dark:hover:border-[#38BDF8]'
                        }`}
                      >
                        {on ? `✓ ${f}` : `+ ${f}`}
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* Notifications & AI Assistant Preferences */}
              <section className="bg-white dark:bg-[#141A26] border border-[#e0e0e0] dark:border-[#242E40] rounded-2xl p-6 shadow-2xs">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-9 h-9 rounded-xl bg-[#eaf2fc] dark:bg-[#1E293B] text-[#0066cc] dark:text-[#38BDF8] flex items-center justify-center flex-none">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="font-['Manrope'] font-bold text-[16px] text-[#1d1d1f] dark:text-white">
                      Notifications & Proactive AI
                    </h2>
                    <p className="text-xs text-[#7a7a7a] dark:text-[#94A3B8]">
                      Control how PathFinder keeps you accountable and engaged
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-[#f5f5f7] dark:divide-[#1E2638]">
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
                <p className="text-[13.5px] text-[#B42318] dark:text-red-400 bg-[#FDECEC] dark:bg-red-950/40 border border-[#F3B9B9] dark:border-red-800/60 rounded-xl px-4 py-2.5">
                  {error}
                </p>
              )}

              <div className="h-6 flex items-center gap-2">
                {saving && (
                  <span className="text-[13px] text-[#7a7a7a] dark:text-[#94A3B8] flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" strokeWidth="3" strokeDasharray="30" strokeLinecap="round" />
                    </svg>
                    Saving changes…
                  </span>
                )}
                {toast && !saving && (
                  <span className="text-[13.5px] font-semibold text-[#16A34A] dark:text-emerald-400 flex items-center gap-1.5">
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
              <div className="bg-white dark:bg-[#141A26] border border-[#e0e0e0] dark:border-[#242E40] rounded-2xl p-6 shadow-2xs">
                <h3 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white mb-4">
                  Profile Configuration
                </h3>

                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-[#f5f5f7] dark:border-[#1E2638]">
                    <span className="text-[#7a7a7a] dark:text-[#94A3B8]">Weekly Target</span>
                    <span className="font-bold text-[#1d1d1f] dark:text-white">
                      {s.weekly_hours || 10} hours / week
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-[#f5f5f7] dark:border-[#1E2638]">
                    <span className="text-[#7a7a7a] dark:text-[#94A3B8]">Pacing Mode</span>
                    <span className="font-bold text-[#0066cc] dark:text-[#38BDF8] bg-[#eaf2fc] dark:bg-[#1E293B] px-2.5 py-1 rounded-lg capitalize">
                      {s.difficulty_preference || 'Adaptive'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-[#f5f5f7] dark:border-[#1E2638]">
                    <span className="text-[#7a7a7a] dark:text-[#94A3B8]">Active Formats</span>
                    <span className="font-semibold text-[#1d1d1f] dark:text-white">
                      {(s.preferred_formats || []).length} types selected
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-[#7a7a7a] dark:text-[#94A3B8]">AI Assistant</span>
                    <span className="font-semibold text-[#22A06B] dark:text-emerald-400">
                      {s.ai_suggestions ? 'Active & Calibrated' : 'Muted'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Re-calibration Insight */}
              <div className="bg-gradient-to-br from-[#fafbfc] to-[#eaf2fc] dark:from-[#141A26] dark:to-[#101622] border border-[#cfe4fb] dark:border-[#242E40] rounded-2xl p-5 shadow-2xs">
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-xl bg-white dark:bg-[#1E293B] text-[#0066cc] dark:text-[#38BDF8] flex items-center justify-center flex-none shadow-2xs">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4" />
                      <path d="M12 8h.01" />
                    </svg>
                  </span>
                  <div>
                    <h4 className="font-['Manrope'] font-bold text-sm text-[#1d1d1f] dark:text-white">
                      Adaptive Re-calibration
                    </h4>
                    <p className="text-xs text-[#333333] dark:text-[#94A3B8] mt-1 leading-relaxed">
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
