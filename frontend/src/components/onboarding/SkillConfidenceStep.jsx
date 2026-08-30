import React, { useState } from 'react'
import ThemeToggle from '../ui/ThemeToggle'
import { subtopicsFor, LEVEL_KEYS } from './skillTaxonomy'

const V = '#0066cc'

const LEVEL_META = {
  basic: { label: 'Basic', blurb: 'Getting started' },
  intermediate: { label: 'Intermediate', blurb: 'Comfortable with essentials' },
  advanced: { label: 'Advanced', blurb: 'Matches what we detected' },
  expert: { label: 'Expert', blurb: 'Architect & mentor level' },
}

function normalizeLevel(l) {
  const k = (l || '').toLowerCase()
  return LEVEL_KEYS.includes(k) ? k : 'basic'
}

function confidencePctFor(topic, chosenLevel) {
  if (typeof topic.confidence_pct !== 'number') return null
  const suggested = normalizeLevel(topic.suggested_level)
  return chosenLevel === suggested ? topic.confidence_pct : null
}

function Radio({ on, small }) {
  const sz = small ? 20 : 22
  const dot = small ? 10 : 11
  return (
    <span
      className={`rounded-full grid place-items-center flex-none border-2 transition-all ${
        on
          ? 'border-[#0066cc] dark:border-[#38BDF8] bg-white dark:bg-[#131D2E]'
          : 'border-[#d0d0d5] dark:border-[#2D3A4F] bg-white dark:bg-[#101726]'
      }`}
      style={{ width: sz, height: sz }}
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
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: open ? 'none' : 'rotate(180deg)', transition: 'transform .2s' }}
          >
            <path d="m18 15-6-6-6 6" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="px-5 pb-5">
          {topic.evidence && (
            <p className="text-[13px] text-[#86868b] dark:text-[#94A3B8] italic mb-3.5 -mt-1">
              "{topic.evidence}"
            </p>
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
                    {suggested === key && typeof topic.confidence_pct === 'number' ? 'Matches what we detected' : LEVEL_META[key].blurb}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-3.5 flex items-center gap-3.5 rounded-xl border px-4 py-3 bg-[#eaf2fc] dark:bg-[#131E30] border-[#d8e9fb] dark:border-[#22354E] transition-colors">
            <span className="grid place-items-center rounded-full flex-none w-9 h-9 bg-[#dbeafc] dark:bg-[#1E293B] text-[#0066cc] dark:text-[#38BDF8]">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
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

export default function SkillConfidenceStep({
  topics = [],
  detectedYears = 0,
  onContinue,
  onBack,
}) {
  const [levels, setLevels] = useState(() => {
    const init = {}
    for (const t of topics) {
      init[t.name] = normalizeLevel(t.suggested_level || t.level)
    }
    return init
  })

  const submit = () => {
    const ratings = topics.map((t) => {
      const chosenLevel = levels[t.name] || normalizeLevel(t.suggested_level || t.level)
      const pct = confidencePctFor(t, chosenLevel)
      const rating = {
        name: t.name,
        level: chosenLevel,
        evidence: pct !== null
          ? (t.evidence || 'Detected from your profile')
          : (t.evidence || 'Self-reported during skill calibration'),
      }
      if (pct !== null) rating.confidence_pct = pct
      return rating
    })
    onContinue(ratings)
  }

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
          Your Confidence Level
        </h1>
        <p
          className="text-[#494949] dark:text-[#94A3B8] mt-2 mb-6 font-normal"
          style={{ fontSize: 'clamp(15px,1.4vw,17px)' }}
        >
          Review your detected skills or fine-tune your level per skill to set your exact starting point on your roadmap.
        </p>

        {/* LIST OF SKILL LEVEL PANELS */}
        <div className="space-y-4">
          {topics.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-2xl border-2 border-dashed border-[#e6e6e6] dark:border-[#202B3C] bg-[#fafbfc] dark:bg-[#0E1522]">
              <p className="font-bold text-[#1d1d1f] dark:text-[#F8FAFC] text-base">
                No skills to calibrate yet
              </p>
              <p className="text-xs text-[#7a7a7a] dark:text-[#94A3B8] mt-1 max-w-md mx-auto">
                Go back to add skills or continue directly to set your learning goal.
              </p>
            </div>
          ) : (
            topics.map((t) => (
              <SkillLevelPanel
                key={t.name}
                topic={t}
                level={levels[t.name] || normalizeLevel(t.suggested_level || t.level)}
                onLevel={(lvl) => setLevels((prev) => ({ ...prev, [t.name]: lvl }))}
              />
            ))
          )}
        </div>
      </div>

      {/* Action Buttons (Continue and Back) */}
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 justify-center">
        <button
          type="button"
          onClick={submit}
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
