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
    <div className="w-full max-w-[1040px] mx-auto my-auto bg-white dark:bg-[#121216] rounded-2xl border border-[#f0f0f0] dark:border-[#27272F] shadow-[0_14px_38px_rgba(25,49,75,0.08)] dark:shadow-[0_14px_38px_rgba(0,0,0,0.5)] p-6 sm:p-8 lg:p-9 flex flex-col justify-center overflow-hidden transition-colors">
      
      {/* Card Header */}
      <div className="flex-none">
        {/* Top Header Row with ThemeToggle */}
        <div className="flex items-center justify-end mb-1">
          <ThemeToggle />
        </div>

        {/* Centered Heading and Subtitle */}
        <div className="text-center max-w-2xl mx-auto mb-4">
          <h1
            className="font-extrabold text-[#1d1d1f] dark:text-[#F8FAFC]"
            style={{ fontSize: 'clamp(22px,2.6vw,30px)', letterSpacing: '-.025em', lineHeight: 1.15 }}
          >
            Your skills
          </h1>
          <p
            className="text-[#494949] dark:text-[#94A3B8] mt-1.5 font-normal leading-relaxed text-xs sm:text-sm"
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
        </div>
      </div>

      {/* DETECTED SKILLS & STACKS BOX */}
      <div className="w-full rounded-2xl border border-[#e6e6e6] dark:border-[#27272F] bg-[#fafbfc] dark:bg-[#18181D] shadow-xs p-5 sm:p-6 transition-colors flex flex-col my-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#eef2f6] dark:border-[#27272F] flex-none">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center rounded-xl flex-none w-9 h-9 bg-[#eaf2fc] dark:bg-[#27272F] text-[#0066cc] dark:text-[#C9D0D6]">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </span>
            <div>
              <h3 className="font-bold text-[#1d1d1f] dark:text-[#F8FAFC] text-sm tracking-tight">
                Detected Skills & Stacks ({currentTopics.length})
              </h3>
              <p className="text-[11.5px] text-[#7a7a7a] dark:text-[#94A3B8]">
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
                className="w-full sm:w-[210px] rounded-xl border border-[#D8DFEB] dark:border-[#27272F] bg-white dark:bg-[#0E0E12] px-3.5 py-1.5 text-xs font-semibold text-[#1d1d1f] dark:text-[#F8FAFC] placeholder-[#7a7a7a] dark:placeholder-[#71717A] focus:outline-none focus:border-[#0066cc] dark:focus:border-[#C9D0D6] focus:ring-2 focus:ring-[#0066cc]/15 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={!newSkillInput.trim()}
              className="px-3.5 py-1.5 bg-[#0066cc] dark:bg-[#0066cc] hover:bg-[#004fa3] dark:hover:bg-[#004fa3] text-white dark:text-white font-bold text-xs rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Add
            </button>
          </form>
        </div>

        {/* Skill Pills Container / Empty State */}
        <div className="py-3.5 max-h-[190px] overflow-y-auto pr-1">
          {currentTopics.length === 0 ? (
            <div className="py-7 px-4 text-center rounded-xl border-2 border-dashed border-[#e6e6e6] dark:border-[#27272F] bg-white dark:bg-[#0E0E12]">
              <div className="w-10 h-10 rounded-xl bg-[#eaf2fc] dark:bg-[#27272F] text-[#0066cc] dark:text-[#0066cc] grid place-items-center mx-auto mb-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="16" />
                </svg>
              </div>
              <p className="font-bold text-[#1d1d1f] dark:text-[#F8FAFC] text-sm">
                No skills confirmed yet
              </p>
              <p className="text-xs text-[#7a7a7a] dark:text-[#94A3B8] mt-1 max-w-md mx-auto leading-relaxed">
                We didn't detect any skills from a resume or GitHub sync. Add skills yourself using the field above or the suggestions below.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2.5 content-start">
              {currentTopics.map((t) => (
                <span
                  key={t.name}
                  className="group inline-flex items-center gap-1.5 rounded-xl bg-white dark:bg-[#121216] border border-[#dce4f0] dark:border-[#27272F] text-[#1d1d1f] dark:text-[#F8FAFC] px-3.5 py-1.5 text-xs font-semibold shadow-2xs hover:border-[#0066cc] dark:hover:border-[#0066cc] transition-all"
                >
                  <span>{t.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(t.name)}
                    className="text-[#7a7a7a] hover:text-red-600 dark:hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer"
                    title="Remove skill"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Quick Add Suggestions */}
        {unaddedSuggestions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[#eef2f6] dark:border-[#27272F] flex items-center gap-2 flex-wrap flex-none">
            <span className="text-[11px] font-bold text-[#7a7a7a] dark:text-[#94A3B8] uppercase tracking-wider mr-1">
              Quick Add:
            </span>
            {unaddedSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleAddSkill(s)}
                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-lg border border-[#e6e6e6] dark:border-[#27272F] bg-white dark:bg-[#121216] text-[#494949] dark:text-[#CBD5E1] hover:border-[#0066cc] hover:text-[#0066cc] dark:hover:border-[#0066cc] dark:hover:text-[#0066cc] transition-all cursor-pointer shadow-2xs"
              >
                <span>+</span>
                <span>{s}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons (Continue and Back) */}
      <div className="pt-4 border-t border-[#f0f0f0] dark:border-[#27272F] flex flex-col sm:flex-row items-center gap-3.5 justify-center flex-none mt-2">
        <button
          type="button"
          onClick={() => onContinue(currentTopics)}
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-b from-[#0071e3] to-[#0066cc] dark:from-[#0066cc] dark:to-[#004fa3] dark:bg-[#0066cc] text-white dark:text-white font-bold rounded-xl cursor-pointer transition-all shadow-[0_8px_20px_rgba(0,102,204,.30)] dark:shadow-[0_8px_20px_rgba(0,102,204,.4)]"
          style={{
            minWidth: 200,
            height: 46,
            fontSize: 15,
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
          className="px-5 py-2.5 rounded-xl text-[#86868b] dark:text-[#94A3B8] hover:text-[#494949] dark:hover:text-[#F8FAFC] cursor-pointer text-sm font-semibold transition-colors"
        >
          ← Back
        </button>
      </div>
    </div>
  )
}
