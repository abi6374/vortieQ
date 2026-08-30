import React, { useMemo, useState } from 'react'
import { subtopicsFor, LEVEL_KEYS } from './skillTaxonomy'
import UserProfileDropdown from '../ui/UserProfileDropdown'
import ThemeToggle from '../ui/ThemeToggle'

/**
 * Skill Confidence Assessment — Step 2 of onboarding.
 *
 * Two assessment methods:
 *   - 'level'    : structured — pick Basic/Intermediate/Advanced/Expert per topic.
 *   - 'describe' : natural language — SINGLE unified text box where user describes all skills at once.
 */

const LEVEL_META = {
  basic:        { label: 'Basic',        blurb: 'Getting started' },
  intermediate: { label: 'Intermediate', blurb: 'Comfortable with essentials' },
  advanced:     { label: 'Advanced',     blurb: 'Production-ready depth' },
  expert:       { label: 'Expert',       blurb: 'Architect & mentor level' },
}

const V = '#0066cc'
const V_DARK = '#004fa3'

function normalizeLevel(l) {
  const k = (l || '').toLowerCase()
  return LEVEL_KEYS.includes(k) ? k : 'basic'
}

// A skill's confidence_pct is REAL evidence (from a resume/GitHub extraction
// that already ran), never invented client-side. It only stays attached to
// the currently-chosen level while that level matches what was actually
// detected — the moment the learner picks a different level than the one
// the evidence supported, that's a self-correction, and we stop claiming a
// percentage we no longer have evidence for. The backend
// (mastery_service._apply_topics) already applies its own documented
// per-source default uncertainty (0.5 for self_assessment) whenever no real
// confidence_pct is sent, so omitting it here is the correct contract, not
// a gap to paper over.
function isInferredAtLevel(topic, chosenLevel) {
  return typeof topic.confidence_pct === 'number' && normalizeLevel(topic.suggested_level) === chosenLevel
}

function confidencePctFor(topic, chosenLevel) {
  return isInferredAtLevel(topic, chosenLevel) ? topic.confidence_pct : null
}

function Radio({ on, small }) {
  const size = small ? 18 : 22
  const dot = small ? 9 : 11
  return (
    <span
      className={`rounded-full grid place-items-center flex-none border-2 transition-all ${
        on
          ? 'border-[#0066cc] dark:border-[#38BDF8] bg-white dark:bg-[#131D2E]'
          : 'border-[#e6e6e6] dark:border-[#2D3A4F] bg-white dark:bg-[#0B0F17]'
      }`}
      style={{ width: size, height: size }}
    >
      {on && (
        <span
          className="rounded-full bg-[#0066cc] dark:bg-[#38BDF8]"
          style={{ width: dot, height: dot }}
        />
      )}
    </span>
  )
}

function SkillLevelPanel({ topic, level, onLevel }) {
  const [open, setOpen] = useState(true)
  const suggested = normalizeLevel(topic.suggested_level)
  const pct = confidencePctFor(topic, level)

  return (
    <section className="rounded-2xl border border-[#e6e6e6] dark:border-[#202B3C] bg-white dark:bg-[#101726] shadow-sm overflow-hidden transition-colors">
      {/* header */}
      <div className="flex items-center gap-4 px-5 py-4">
        <div
          className="grid place-items-center rounded-xl text-white dark:text-[#0B0F17] font-bold flex-none bg-[#0066cc] dark:bg-[#38BDF8] shadow-[0_4px_12px_rgba(0,102,204,.25)] dark:shadow-[0_4px_12px_rgba(56,189,248,.25)]"
          style={{ width: 44, height: 44 }}
        >
          {topic.name.slice(0, 2).toUpperCase()}
        </div>
        <span className="font-bold text-[#1d1d1f] dark:text-[#F8FAFC]" style={{ fontSize: 20, letterSpacing: '-.02em' }}>
          {topic.name}
        </span>
        <span className="flex-1" />
        {pct !== null ? (
          <span className="flex items-baseline gap-1.5">
            <span className="font-extrabold tabular-nums text-[#0066cc] dark:text-[#38BDF8]" style={{ fontSize: 20 }}>{pct}%</span>
            <span className="text-xs sm:text-sm text-[#494949] dark:text-[#94A3B8]">inferred</span>
          </span>
        ) : (
          <span className="text-[11px] font-bold uppercase tracking-wide text-[#7a7a7a] dark:text-[#94A3B8] bg-[#f2f2f2] dark:bg-[#1A2536] px-2.5 py-1 rounded-full">
            Self-reported
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Collapse' : 'Expand'}
          className="grid place-items-center rounded-full border border-[#e6e6e6] dark:border-[#263750] bg-[#f7f9fc] dark:bg-[#1A2536] text-[#494949] dark:text-[#CBD5E1] hover:bg-[#eef3f8] dark:hover:bg-[#25354D] flex-none cursor-pointer transition-colors"
          style={{ width: 36, height: 36 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
               strokeLinecap="round" strokeLinejoin="round"
               style={{ transform: open ? 'none' : 'rotate(180deg)', transition: 'transform .2s' }}>
            <path d="m18 15-6-6-6 6" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="px-5 pb-5">
          {topic.evidence && (
            <p className="text-[13px] text-[#86868b] dark:text-[#94A3B8] italic mb-3.5 -mt-1">"{topic.evidence}"</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {LEVEL_KEYS.map((key) => {
              const active = key === level
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onLevel(key)}
                  className={`text-left rounded-xl transition-all cursor-pointer p-3 sm:p-3.5 border-2 ${
                    active
                      ? 'border-[#0066cc] dark:border-[#38BDF8] bg-gradient-to-br from-white to-[#eaf2fc] dark:from-[#131D2E] dark:to-[#18263D] shadow-[0_0_0_3px_rgba(0,102,204,.07)] dark:shadow-[0_0_0_3px_rgba(56,189,248,.15)]'
                      : 'border-[#e6e6e6] dark:border-[#202C3E] bg-white dark:bg-[#0B0F17] hover:border-[#abd2fb] dark:hover:border-[#38BDF8]'
                  }`}
                >
                  <span className="flex items-center justify-between gap-1.5">
                    <span className={`font-bold text-sm ${active ? 'text-[#004fa3] dark:text-[#38BDF8]' : 'text-[#1d1d1f] dark:text-[#F8FAFC]'}`}>
                      {LEVEL_META[key].label}
                    </span>
                    <Radio on={active} small />
                  </span>
                  <span className={`block text-[11.5px] mt-1 leading-snug ${active ? 'text-[#494949] dark:text-[#94A3B8]' : 'text-[#86868b] dark:text-[#64748B]'}`}>
                    {/* Only claim a match to real evidence when there actually is
                        a confidence_pct backing it (resume/GitHub extraction) -
                        a manually self-reported skill's default "basic" level
                        must never be mislabeled as something we detected. */}
                    {suggested === key && typeof topic.confidence_pct === 'number' ? 'Matches what we detected' : LEVEL_META[key].blurb}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-3.5 flex items-center gap-3.5 rounded-xl border px-4 py-3 bg-[#eaf2fc] dark:bg-[#131E30] border-[#d8e9fb] dark:border-[#22354E] transition-colors">
            <span className="grid place-items-center rounded-full flex-none w-9 h-9 bg-[#dbeafc] dark:bg-[#1E293B] text-[#0066cc] dark:text-[#38BDF8]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                   strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </span>
            <div>
              <div className="text-[11px] font-bold tracking-wide uppercase text-[#0066cc] dark:text-[#38BDF8]">
                Key concepts · {LEVEL_META[level].label}
              </div>
              <div className="font-semibold text-[#1d1d1f] dark:text-[#F8FAFC] leading-snug text-[14px]">
                {subtopicsFor(topic.name, level)}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default function AssessSkills({ topics = [], detectedYears = 0, onContinue, onBack, onSkip }) {
  const [method, setMethod] = useState('skills') // 'skills' | 'level'
  // No fabricated defaults: a learner with zero detected skills (no resume,
  // no GitHub, goal-text-only intake) sees an honest empty state below,
  // never a fake "Python / SQL / Data Analysis" starter set.
  const [currentTopics, setCurrentTopics] = useState(() => topics || [])

  const [levels, setLevels] = useState(() =>
    Object.fromEntries((topics || []).map((t) => [t.name, normalizeLevel(t.suggested_level)]))
  )

  const [newSkillInput, setNewSkillInput] = useState('')

  const setLevel = (name, lvl) => setLevels((p) => ({ ...p, [name]: lvl }))

  const handleAddSkill = (skillName) => {
    const trimmed = (skillName || newSkillInput).trim()
    if (!trimmed) return
    const exists = currentTopics.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())
    if (exists) {
      setNewSkillInput('')
      return
    }
    // Manually added skills carry no suggested_level or confidence_pct -
    // there is no evidence behind them yet beyond the learner's own word.
    // They default to "Basic" (a neutral, non-presumptuous starting point,
    // never "Intermediate" as if something had been detected) and the
    // learner is expected to adjust the level themselves; the UI marks
    // these "Self-reported" rather than attaching an invented percentage.
    const newTopic = {
      name: trimmed,
      evidence: 'Self-reported by you',
    }
    setCurrentTopics((prev) => [...prev, newTopic])
    setLevels((prev) => ({ ...prev, [trimmed]: 'basic' }))
    setNewSkillInput('')
  }

  const handleRemoveSkill = (name) => {
    setCurrentTopics((prev) => prev.filter((t) => t.name !== name))
    setLevels((prev) => {
      const copy = { ...prev }
      delete copy[name]
      return copy
    })
  }

  const submit = () => {
    const ratings = currentTopics.map((t) => {
      const chosenLevel = levels[t.name] || normalizeLevel(t.suggested_level)
      const pct = confidencePctFor(t, chosenLevel)
      const rating = {
        name: t.name,
        level: chosenLevel,
        evidence: pct !== null
          ? (t.evidence || 'Detected from your profile')
          : (t.evidence || 'Self-reported during skill calibration'),
      }
      // Only send a confidence_pct when it is REAL evidence still backing
      // the currently-chosen level. Omitting it for self-reported/adjusted
      // skills is intentional: the backend
      // (mastery_service._apply_topics) applies its own documented
      // self_assessment default uncertainty rather than us inventing one.
      if (pct !== null) rating.confidence_pct = pct
      return rating
    })
    onContinue(ratings)
  }

  const SUGGESTED_QUICK_SKILLS = [
    'Python', 'SQL', 'React', 'JavaScript', 'Docker', 'Git', 'FastAPI', 'Machine Learning', 'AWS', 'TypeScript', 'Pandas'
  ]

  const unaddedSuggestions = SUGGESTED_QUICK_SKILLS.filter(
    (s) => !currentTopics.some((t) => t.name.toLowerCase() === s.toLowerCase())
  ).slice(0, 6)

  const MethodCard = ({ id, icon, title, desc, children }) => {
    const active = method === id
    return (
      <button
        type="button"
        onClick={() => setMethod(id)}
        aria-pressed={active}
        className={`relative text-left rounded-2xl transition flex flex-col cursor-pointer p-5 sm:p-6 min-h-[170px] ${
          active
            ? 'border-2 border-[#0066cc] dark:border-[#38BDF8] bg-gradient-to-br from-white to-[#eaf2fc] dark:from-[#131D2E] dark:to-[#18263D] shadow-[0_0_0_4px_rgba(0,102,204,.08)]'
            : 'border border-[#e6e6e6] dark:border-[#202C3E] bg-white dark:bg-[#101726] hover:border-[#abd2fb] dark:hover:border-[#38BDF8]'
        }`}
      >
        <span className="absolute top-5 right-5"><Radio on={active} /></span>
        <div className="flex items-start gap-3.5 mb-3">
          <span className={`grid place-items-center rounded-xl flex-none w-11 h-11 ${
            active
              ? 'bg-[#0066cc] dark:bg-[#38BDF8] text-white dark:text-[#0B0F17] shadow-[0_4px_12px_rgba(0,102,204,.28)]'
              : 'bg-[#eef3f8] dark:bg-[#1E293B] text-[#494949] dark:text-[#CBD5E1]'
          }`}>{icon}</span>
          <div>
            <h3 className="font-bold text-[#1d1d1f] dark:text-[#F8FAFC] text-lg tracking-tight">{title}</h3>
            <p className="text-[13.5px] text-[#494949] dark:text-[#94A3B8] mt-0.5 leading-snug">{desc}</p>
          </div>
        </div>
        {children}
      </button>
    )
  }

  return (
    <div className="w-full max-w-[1140px] bg-white dark:bg-[#0E1522] rounded-2xl border border-[#f0f0f0] dark:border-[#202B3C] shadow-[0_14px_38px_rgba(25,49,75,0.08)] dark:shadow-[0_14px_38px_rgba(0,0,0,0.5)] p-6 sm:p-10 flex flex-col justify-between overflow-hidden transition-colors">
      
      {/* Top Header Row with Step Badge, ThemeToggle, and User Profile */}
      <div className="flex items-center justify-between mb-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0066cc] dark:text-[#38BDF8] bg-[#eaf2fc] dark:bg-[#132238] border border-[#cfe4fb] dark:border-[#1E3A5F] px-3.5 py-1 rounded-full mb-3 shadow-2xs">
          Step 3 · Skill Confidence
        </span>
        <div className="flex items-center gap-2 sm:gap-2.5">
          <ThemeToggle />
          <UserProfileDropdown />
        </div>
      </div>

      <h1 className="font-extrabold text-[#1d1d1f] dark:text-[#F8FAFC]" style={{ fontSize: 'clamp(26px,3.4vw,38px)', letterSpacing: '-.025em', lineHeight: 1.1 }}>
        Your skills, your confidence
      </h1>
      <p className="text-[#494949] dark:text-[#94A3B8] mt-2.5 mb-6" style={{ fontSize: 'clamp(15px,1.4vw,17px)' }}>
        {currentTopics.length > 0
          ? <>We identified {currentTopics.length} skill{currentTopics.length === 1 ? '' : 's'} in your profile
              {detectedYears ? ` (≈${detectedYears} years experience)` : ''}. Review your detected skills or fine-tune your level per skill.</>
          : <>We didn't detect any skills from a resume or GitHub sync. Add the skills you actually have below and tell us your real level for each.</>}
      </p>

      {/* Method Toggle: Skills vs Choose Level */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <MethodCard
          id="skills"
          title="Skills"
          desc="Extracted skills from your background & resume."
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L14.4 7.6L20 10L14.4 12.4L12 18L9.6 12.4L4 10L9.6 7.6L12 2Z"/></svg>}
        >
          <p className="text-[12.5px] text-[#494949] dark:text-[#94A3B8] mt-auto leading-relaxed">
            Skills overview — all detected competencies ready to shape your learning roadmap.
          </p>
        </MethodCard>

        <MethodCard
          id="level"
          title="Choose a level per skill"
          desc="Pick Basic, Intermediate, Advanced, or Expert per topic."
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 16v-5"/><path d="M12 16V8"/><path d="M17 16v-9"/></svg>}
        >
          <p className="text-[12.5px] text-[#494949] dark:text-[#94A3B8] mt-auto leading-relaxed">
            Precise calibration — fine-tune your tier per skill to set your exact starting point.
          </p>
        </MethodCard>
      </div>

      {/* Content Area Based on Method */}
      {method === 'skills' ? (
        /* SKILLS CATALOG DASHBOARD */
        <div className="rounded-2xl border border-[#D8DFEB] dark:border-[#24334A] bg-[#f9fcff] dark:bg-[#131D2E] p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#E1E6F0] dark:border-[#202C3E]">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-[#dbeafc] dark:bg-[#1E293B] text-[#0066cc] dark:text-[#38BDF8] flex items-center justify-center font-bold">
                ⚡
              </span>
              <div>
                <h3 className="font-bold text-[#1d1d1f] dark:text-[#F8FAFC] text-[17px]">
                  Detected Skills & Stacks ({currentTopics.length})
                </h3>
                <p className="text-xs text-[#52617D] dark:text-[#94A3B8]">
                  These competencies will be used to benchmark your starting point on your roadmap.
                </p>
              </div>
            </div>

            {/* Quick Add Custom Skill Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleAddSkill()
              }}
              className="flex items-center bg-white dark:bg-[#0B0F17] border border-[#D8DFEB] dark:border-[#2D3F59] rounded-full p-1 pl-3 shadow-2xs focus-within:border-[#0066cc] dark:focus-within:border-[#38BDF8] transition-all w-full sm:w-auto"
            >
              <input
                type="text"
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                placeholder="+ Add another skill..."
                className="bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 text-xs text-[#0E1B38] dark:text-[#F8FAFC] placeholder-[#888888] dark:placeholder-[#64748B] w-full sm:w-40"
              />
              <button
                type="submit"
                disabled={!newSkillInput.trim()}
                className="px-3 py-1 bg-[#0066CC] hover:bg-[#0052A3] text-white text-xs font-bold rounded-full transition-all cursor-pointer disabled:opacity-40 flex-none"
              >
                Add
              </button>
            </form>
          </div>

          {/* Skill Badges Catalog, or an honest empty state when nothing has been detected/added yet */}
          {currentTopics.length === 0 ? (
            <div className="mb-5 rounded-xl border border-dashed border-[#D8DFEB] dark:border-[#2D3F59] bg-white dark:bg-[#0B0F17] px-5 py-8 text-center">
              <p className="font-bold text-[#1d1d1f] dark:text-[#F8FAFC] text-[15px]">No skills confirmed yet</p>
              <p className="text-[13px] text-[#7a7a7a] dark:text-[#94A3B8] mt-1.5 max-w-md mx-auto leading-relaxed">
                We didn't detect any skills from a resume or GitHub sync. Add skills yourself using the field above or the suggestions below — your self-reported level is what we'll use to build your roadmap.
              </p>
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-5">
            {currentTopics.map((t) => {
              const currentLvl = levels[t.name] || normalizeLevel(t.suggested_level)
              const pct = confidencePctFor(t, currentLvl)
              return (
                <div
                  key={t.name}
                  className="bg-white dark:bg-[#101726] border border-[#e0e0e0] dark:border-[#24334A] rounded-xl p-3.5 flex items-center justify-between gap-2 shadow-xs hover:border-[#0066cc] dark:hover:border-[#38BDF8] transition-all group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-[#eaf2fc] dark:bg-[#1E293B] text-[#0066cc] dark:text-[#38BDF8] font-bold text-xs flex items-center justify-center flex-none">
                      {t.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-[#1d1d1f] dark:text-[#F8FAFC] text-sm truncate">
                        {t.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] font-semibold text-[#0066cc] dark:text-[#38BDF8] bg-[#eaf2fc] dark:bg-[#182438] px-1.5 py-0.5 rounded capitalize">
                          {LEVEL_META[currentLvl]?.label || 'Basic'}
                        </span>
                        <span className="text-[11px] text-[#7a7a7a] dark:text-[#94A3B8] font-mono">
                          {pct !== null ? `${pct}% inferred` : 'Self-reported'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(t.name)}
                    className="w-6 h-6 rounded-full text-[#888888] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center text-xs transition-colors cursor-pointer opacity-60 group-hover:opacity-100"
                    title={`Remove ${t.name}`}
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
          )}

          {/* Quick Suggestions Chips */}
          {unaddedSuggestions.length > 0 && (
            <div className="pt-3 border-t border-[#E1E6F0] dark:border-[#202C3E] flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#7a7a7a] dark:text-[#94A3B8] uppercase tracking-wider">
                Quick Add:
              </span>
              {unaddedSuggestions.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => handleAddSkill(skill)}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#182438] border border-[#D8DFEB] dark:border-[#2D3F59] hover:border-[#0066cc] dark:hover:border-[#38BDF8] text-xs font-semibold text-[#1d1d1f] dark:text-[#F8FAFC] cursor-pointer transition-all shadow-2xs"
                >
                  + {skill}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* PER-TOPIC LEVEL PANELS */
        <div className="space-y-4">
          {currentTopics.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#e6e6e6] dark:border-[#2D3A4F] bg-white dark:bg-[#101726] px-5 py-8 text-center">
              <p className="font-bold text-[#1d1d1f] dark:text-[#F8FAFC] text-[15px]">No skills confirmed yet</p>
              <p className="text-[13px] text-[#7a7a7a] dark:text-[#94A3B8] mt-1.5">
                Switch to the "Skills" tab to add the skills you actually have.
              </p>
            </div>
          ) : currentTopics.map((t) => (
            <SkillLevelPanel
              key={t.name}
              topic={t}
              level={levels[t.name] || normalizeLevel(t.suggested_level)}
              onLevel={(lvl) => setLevel(t.name, lvl)}
            />
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 justify-center">
        <button
          type="button"
          onClick={submit}
          className="inline-flex items-center justify-center gap-2 text-white font-bold rounded-xl cursor-pointer transition-all"
          style={{ minWidth: 200, height: 52, fontSize: 16, background: `linear-gradient(180deg,#0071e3,${V})`, boxShadow: '0 8px 20px rgba(0,102,204,.30)' }}
        >
          Continue
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>
        </button>
        <button type="button" onClick={onSkip} className="px-6 py-3 rounded-xl border border-[#e6e6e6] dark:border-[#263750] text-[#494949] dark:text-[#CBD5E1] hover:bg-gray-50 dark:hover:bg-[#1E293B] cursor-pointer text-sm font-semibold">Skip</button>
        <button type="button" onClick={onBack} className="px-6 py-3 rounded-xl text-[#86868b] dark:text-[#94A3B8] hover:text-[#494949] dark:hover:text-[#F8FAFC] cursor-pointer text-sm font-semibold">← Back</button>
      </div>
    </div>
  )
}
