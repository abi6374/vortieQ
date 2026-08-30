import React, { useState } from 'react'
import ThemeToggle from '../ui/ThemeToggle'

const V = '#0066cc'

export default function YourSkillsStep({
  topics = [],
  detectedYears = 0,
  onContinue,
  onBack,
}) {
  const [currentTopics, setCurrentTopics] = useState(() => topics || [])
  const [newSkillInput, setNewSkillInput] = useState('')

  const handleAddSkill = (skillName) => {
    const trimmed = (skillName || newSkillInput).trim()
    if (!trimmed) return
    const exists = currentTopics.some(
      (t) => t.name.toLowerCase() === trimmed.toLowerCase()
    )
    if (exists) {
      setNewSkillInput('')
      return
    }
    const newTopic = {
      name: trimmed,
      suggested_level: 'basic',
      evidence: 'Self-reported by you',
    }
    setCurrentTopics((prev) => [...prev, newTopic])
    setNewSkillInput('')
  }

  const handleRemoveSkill = (name) => {
    setCurrentTopics((prev) => prev.filter((t) => t.name !== name))
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    handleAddSkill()
  }

  const SUGGESTED_QUICK_SKILLS = [
    'Python',
    'SQL',
    'React',
    'JavaScript',
    'Docker',
    'Git',
    'FastAPI',
    'Machine Learning',
    'AWS',
    'TypeScript',
    'Pandas',
  ]

  const unaddedSuggestions = SUGGESTED_QUICK_SKILLS.filter(
    (s) => !currentTopics.some((t) => t.name.toLowerCase() === s.toLowerCase())
  ).slice(0, 6)

  return (
    <div className="w-full max-w-[1140px] bg-white dark:bg-[#0E1522] rounded-2xl border border-[#f0f0f0] dark:border-[#202B3C] shadow-[0_14px_38px_rgba(25,49,75,0.08)] dark:shadow-[0_14px_38px_rgba(0,0,0,0.5)] p-6 sm:p-10 flex flex-col justify-between overflow-hidden transition-colors min-h-[580px]">
      
      <div>
        {/* Top Header Row with ThemeToggle only (No account option) */}
        <div className="flex items-center justify-end mb-3">
          <ThemeToggle />
        </div>

        <h1
          className="font-extrabold text-[#1d1d1f] dark:text-[#F8FAFC]"
          style={{ fontSize: 'clamp(26px,3.4vw,38px)', letterSpacing: '-.025em', lineHeight: 1.1 }}
        >
          Your skills
        </h1>
        <p
          className="text-[#494949] dark:text-[#94A3B8] mt-2 mb-6 font-normal"
          style={{ fontSize: 'clamp(15px,1.4vw,17px)' }}
        >
          {currentTopics.length > 0 ? (
            <>
              We identified {currentTopics.length} skill{currentTopics.length === 1 ? '' : 's'} in your profile
              {detectedYears ? ` (≈${detectedYears} years experience)` : ''}. Review your detected skills or add more below.
            </>
          ) : (
            <>
              We didn't detect any skills from a resume or GitHub sync. Add the skills you actually have below and tell us your real level for each.
            </>
          )}
        </p>

        {/* DETECTED SKILLS & STACKS TABLE / CARD */}
        <div className="rounded-2xl border border-[#e6e6e6] dark:border-[#202B3C] bg-white dark:bg-[#101726] shadow-sm overflow-hidden p-6 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#f0f0f0] dark:border-[#1E293B]">
            <div className="flex items-center gap-3">
              <span className="grid place-items-center rounded-xl flex-none w-10 h-10 bg-[#eaf2fc] dark:bg-[#1E293B] text-[#0066cc] dark:text-[#38BDF8]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </span>
              <div>
                <h3 className="font-bold text-[#1d1d1f] dark:text-[#F8FAFC] text-base tracking-tight">
                  Detected Skills & Stacks ({currentTopics.length})
                </h3>
                <p className="text-xs text-[#7a7a7a] dark:text-[#94A3B8] mt-0.5">
                  These competencies will be used to benchmark your starting point on your roadmap.
                </p>
              </div>
            </div>

            {/* Inline Add Skill Input */}
            <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  placeholder="+ Add another skill..."
                  className="w-full sm:w-[220px] rounded-xl border border-[#D8DFEB] dark:border-[#263750] bg-[#fbfbfb] dark:bg-[#0E1522] px-3.5 py-2 text-xs font-semibold text-[#1d1d1f] dark:text-[#F8FAFC] placeholder-[#7a7a7a] dark:placeholder-[#64748B] focus:outline-none focus:border-[#0066cc] dark:focus:border-[#38BDF8] focus:ring-2 focus:ring-[#0066cc]/15 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={!newSkillInput.trim()}
                className="px-3.5 py-2 bg-[#0066cc] hover:bg-[#004fa3] text-white text-xs font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Add
              </button>
            </form>
          </div>

          {/* Skill Pills Container / Empty State */}
          <div className="pt-5">
            {currentTopics.length === 0 ? (
              <div className="py-10 px-4 text-center rounded-xl border-2 border-dashed border-[#e6e6e6] dark:border-[#202B3C] bg-[#fafbfc] dark:bg-[#0E1522]">
                <div className="w-12 h-12 rounded-2xl bg-[#eaf2fc] dark:bg-[#1E293B] text-[#0066cc] dark:text-[#38BDF8] grid place-items-center mx-auto mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <p className="font-bold text-[#1d1d1f] dark:text-[#F8FAFC] text-[15px]">
                  No skills confirmed yet
                </p>
                <p className="text-xs text-[#7a7a7a] dark:text-[#94A3B8] mt-1 max-w-md mx-auto leading-relaxed">
                  We didn't detect any skills from a resume or GitHub sync. Add skills yourself using the field above or the suggestions below — your self-reported level is what we'll use to build your roadmap.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5 min-h-[100px] content-start">
                {currentTopics.map((t) => (
                  <span
                    key={t.name}
                    className="group inline-flex items-center gap-2 rounded-xl bg-[#f0f4f9] dark:bg-[#172236] border border-[#dce4f0] dark:border-[#223552] text-[#1d1d1f] dark:text-[#F8FAFC] px-3.5 py-2 text-[13.5px] font-bold shadow-xs hover:border-[#0066cc] dark:hover:border-[#38BDF8] transition-all"
                  >
                    <span>{t.name}</span>
                    {typeof t.confidence_pct === 'number' && (
                      <span className="text-[11px] font-extrabold text-[#0066cc] dark:text-[#38BDF8] bg-white dark:bg-[#0B0F17] px-1.5 py-0.5 rounded-md border border-[#cfe4fb] dark:border-[#1E3A5F]">
                        {t.confidence_pct}%
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(t.name)}
                      className="text-[#7a7a7a] hover:text-red-600 dark:hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer"
                      title="Remove skill"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Quick Add Suggestions */}
            {unaddedSuggestions.length > 0 && (
              <div className="mt-5 pt-4 border-t border-[#f0f0f0] dark:border-[#1E293B] flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[#7a7a7a] dark:text-[#94A3B8] uppercase tracking-wider mr-1">
                  Quick Add:
                </span>
                {unaddedSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleAddSkill(s)}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-[#e6e6e6] dark:border-[#2D3A4F] bg-white dark:bg-[#141C2B] text-[#494949] dark:text-[#CBD5E1] hover:border-[#0066cc] hover:text-[#0066cc] dark:hover:border-[#38BDF8] dark:hover:text-[#38BDF8] transition-all cursor-pointer shadow-2xs"
                  >
                    <span>+</span>
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons (Continue and Back - NO Skip button) */}
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 justify-center">
        <button
          type="button"
          onClick={() => onContinue(currentTopics)}
          className="inline-flex items-center justify-center gap-2 text-white font-bold rounded-xl cursor-pointer transition-all"
          style={{
            minWidth: 200,
            height: 52,
            fontSize: 16,
            background: `linear-gradient(180deg,#0071e3,${V})`,
            boxShadow: '0 8px 20px rgba(0,102,204,.30)',
          }}
        >
          <span>Continue</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 rounded-xl text-[#86868b] dark:text-[#94A3B8] hover:text-[#494949] dark:hover:text-[#F8FAFC] cursor-pointer text-sm font-semibold transition-colors"
        >
          ← Back
        </button>
      </div>
    </div>
  )
}
