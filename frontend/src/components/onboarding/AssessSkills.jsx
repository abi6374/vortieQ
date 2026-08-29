import React, { useMemo, useState } from 'react'
import { subtopicsFor, LEVEL_KEYS } from './skillTaxonomy'
import UserProfileDropdown from '../ui/UserProfileDropdown'

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

function confidenceFor(chosen, suggested, baseConfidence) {
  const base = typeof baseConfidence === 'number' && baseConfidence >= 30 && baseConfidence <= 100
    ? baseConfidence
    : 82
  const dist = LEVEL_KEYS.indexOf(chosen) - LEVEL_KEYS.indexOf(suggested)
  if (dist === 0) return base
  if (dist < 0) {
    return Math.min(99, base + Math.abs(dist) * 4)
  }
  return Math.max(35, base - dist * 14)
}

function Radio({ on, small }) {
  const size = small ? 18 : 22
  const dot = small ? 9 : 11
  return (
    <span
      style={{
        width: size, height: size, borderRadius: '50%',
        border: `2px solid ${on ? V : '#e6e6e6'}`,
        background: '#fff', display: 'grid', placeItems: 'center', flex: 'none',
      }}
    >
      {on && <span style={{ width: dot, height: dot, borderRadius: '50%', background: V }} />}
    </span>
  )
}

function SkillLevelPanel({ topic, level, onLevel }) {
  const [open, setOpen] = useState(true)
  const suggested = normalizeLevel(topic.suggested_level)
  const pct = confidenceFor(level, suggested, topic.confidence_pct)

  return (
    <section className="rounded-2xl border border-[#e6e6e6] bg-white shadow-sm overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-4 px-5 py-4">
        <div
          className="grid place-items-center rounded-xl text-white font-bold flex-none"
          style={{ width: 44, height: 44, background: V, boxShadow: '0 4px 12px rgba(0,102,204,.25)' }}
        >
          {topic.name.slice(0, 2).toUpperCase()}
        </div>
        <span className="font-bold text-[#1d1d1f]" style={{ fontSize: 20, letterSpacing: '-.02em' }}>
          {topic.name}
        </span>
        <span className="flex-1" />
        <span className="flex items-baseline gap-1.5">
          <span className="font-extrabold tabular-nums" style={{ fontSize: 20, color: V }}>{pct}%</span>
          <span className="text-xs sm:text-sm text-[#494949]">confidence</span>
        </span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Collapse' : 'Expand'}
          className="grid place-items-center rounded-full border border-[#e6e6e6] bg-[#f7f9fc] text-[#494949] hover:bg-[#eef3f8] flex-none cursor-pointer"
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
            <p className="text-[13px] text-[#86868b] italic mb-3.5 -mt-1">"{topic.evidence}"</p>
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
                  className="text-left rounded-xl bg-white transition cursor-pointer"
                  style={{
                    border: active ? `2px solid ${V}` : '1px solid #e6e6e6',
                    padding: active ? 13 : 14,
                    background: active ? 'linear-gradient(160deg,#fff,#eaf2fc 120%)' : '#fff',
                    boxShadow: active ? '0 0 0 3px rgba(0,102,204,.07)' : 'none',
                  }}
                >
                  <span className="flex items-center justify-between gap-1.5">
                    <span className="font-bold" style={{ fontSize: 14, color: active ? V_DARK : '#1d1d1f' }}>
                      {LEVEL_META[key].label}
                    </span>
                    <Radio on={active} small />
                  </span>
                  <span className="block text-[11.5px] text-[#86868b] mt-1 leading-snug">
                    {suggested === key ? 'Matches your resume' : LEVEL_META[key].blurb}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-3.5 flex items-center gap-3.5 rounded-xl border px-4 py-3"
               style={{ background: '#eaf2fc', borderColor: '#eaf2fc' }}>
            <span className="grid place-items-center rounded-full flex-none"
                  style={{ width: 36, height: 36, background: '#eaf2fc', color: V }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                   strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </span>
            <div>
              <div className="text-[11px] font-bold tracking-wide uppercase" style={{ color: V }}>
                Key concepts · {LEVEL_META[level].label}
              </div>
              <div className="font-semibold text-[#1d1d1f] leading-snug text-[14.5px]">
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
  const [method, setMethod] = useState('level') // 'level' | 'describe'
  const [levels, setLevels] = useState(
    () => Object.fromEntries(topics.map((t) => [t.name, normalizeLevel(t.suggested_level)]))
  )
  
  // Single unified description for all skills
  const [unifiedDescription, setUnifiedDescription] = useState('')

  const setLevel = (name, lvl) => setLevels((p) => ({ ...p, [name]: lvl }))

  const submit = () => {
    const ratings = topics.map((t) => {
      const chosenLevel = levels[t.name] || normalizeLevel(t.suggested_level)
      const suggested = normalizeLevel(t.suggested_level)
      const dynamicPct = confidenceFor(chosenLevel, suggested, t.confidence_pct)
      return {
        name: t.name,
        level: chosenLevel,
        confidence_pct: dynamicPct,
        evidence: method === 'describe' && unifiedDescription.trim()
          ? unifiedDescription.trim()
          : (t.evidence || ''),
      }
    })
    onContinue(ratings)
  }

  const MethodCard = ({ id, icon, title, desc, children }) => {
    const active = method === id
    return (
      <button
        type="button"
        onClick={() => setMethod(id)}
        aria-pressed={active}
        className="relative text-left rounded-2xl bg-white transition flex flex-col cursor-pointer"
        style={{
          border: active ? `2px solid ${V}` : '1px solid #e6e6e6',
          padding: active ? 22 : 24,
          minHeight: 180,
          background: active ? 'linear-gradient(160deg,#fff,#eaf2fc)' : '#fff',
          boxShadow: active ? '0 0 0 4px rgba(0,102,204,.08)' : 'none',
        }}
      >
        <span className="absolute" style={{ top: 20, right: 20 }}><Radio on={active} /></span>
        <div className="flex items-start gap-3.5 mb-3">
          <span className="grid place-items-center rounded-xl flex-none" style={{
            width: 44, height: 44,
            background: active ? V : '#eef3f8',
            color: active ? '#fff' : '#494949',
            boxShadow: active ? '0 4px 12px rgba(0,102,204,.28)' : 'none',
          }}>{icon}</span>
          <div>
            <h3 className="font-bold text-[#1d1d1f]" style={{ fontSize: 18, letterSpacing: '-.01em' }}>{title}</h3>
            <p className="text-[13.5px] text-[#494949] mt-0.5 leading-snug">{desc}</p>
          </div>
        </div>
        {children}
      </button>
    )
  }

  return (
    <div className="w-full max-w-[1140px] bg-white rounded-2xl border border-[#f0f0f0] shadow-[0_14px_38px_rgba(25,49,75,0.08)] p-6 sm:p-10 flex flex-col justify-between overflow-hidden">
      
      {/* Top Header Row with Step Badge and User Profile */}
      <div className="flex items-center justify-between mb-4">
        <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-wider"
              style={{ color: V, background: '#eaf2fc', border: '1px solid #eaf2fc' }}>
          Step 2 · Skill Confidence
        </span>
        <UserProfileDropdown />
      </div>

      <h1 className="font-extrabold text-[#1d1d1f]" style={{ fontSize: 'clamp(26px,3.4vw,38px)', letterSpacing: '-.025em', lineHeight: 1.1 }}>
        Your skills, your confidence
      </h1>
      <p className="text-[#494949] mt-2.5 mb-6" style={{ fontSize: 'clamp(15px,1.4vw,17px)' }}>
        We found {topics.length} topic{topics.length === 1 ? '' : 's'} in your background
        {detectedYears ? ` (≈${detectedYears} years experience)` : ''}. Choose how you'd like to calibrate your skills.
      </p>

      {/* Method Toggle: Single Description vs Choose Level */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <MethodCard
          id="describe"
          title="Describe in a single text"
          desc="Tell us all your skills, projects, and strengths together."
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z"/></svg>}
        >
          <p className="text-[12.5px] text-[#494949] mt-auto leading-relaxed">
            Fastest text flow — describe all your skills at once and our AI will infer your tiers.
          </p>
        </MethodCard>

        <MethodCard
          id="level"
          title="Choose a level per skill"
          desc="Pick Basic, Intermediate, Advanced, or Expert per topic."
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 16v-5"/><path d="M12 16V8"/><path d="M17 16v-9"/></svg>}
        >
          <p className="text-[12.5px] text-[#494949] mt-auto leading-relaxed">
            Precise calibration — fine-tune your tier per skill to set your exact starting point.
          </p>
        </MethodCard>
      </div>

      {/* Content Area Based on Method */}
      {method === 'describe' ? (
        /* SINGLE UNIFIED TEXT BOX FOR ALL SKILLS */
        <div className="rounded-2xl border-2 border-[#0066cc]/40 bg-[#f9fcff] p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="w-8 h-8 rounded-lg bg-[#dbeafc] text-[#0066cc] flex items-center justify-center font-bold">
              ✍️
            </span>
            <h3 className="font-bold text-[#1d1d1f] text-[17px]">
              Describe all your skills, tools & experience
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-[#333333] mb-4">
            Mention your programming languages, frameworks, past projects, coursework, and concepts you feel confident with.
          </p>
          
          <div className="relative">
            <textarea
              value={unifiedDescription}
              onChange={(e) => setUnifiedDescription(e.target.value.slice(0, 1500))}
              maxLength={1500}
              placeholder="e.g. I have 2 years of Python experience building APIs with FastAPI and Flask. I understand descriptive statistics and basic Pandas for data analysis. I have built 1 data visualization project with Matplotlib. I want to learn Machine Learning from scratch..."
              className="w-full resize-none rounded-xl border border-[#e0e0e0] bg-white p-4 text-[15px] text-[#1d1d1f] leading-relaxed focus:outline-none focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/10 transition-all shadow-inner"
              style={{ minHeight: 160 }}
            />
            <span className="absolute right-3.5 bottom-3 text-[12px] font-semibold text-[#7a7a7a] tabular-nums">
              {unifiedDescription.length}/1500
            </span>
          </div>

          {/* Chips of detected skills from resume/intake */}
          {topics.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[#f0f0f0]">
              <span className="text-xs font-bold text-[#7a7a7a] uppercase tracking-wider block mb-2">
                Detected topics in your background:
              </span>
              <div className="flex flex-wrap gap-2">
                {topics.map((t) => (
                  <span
                    key={t.name}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#e0e0e0] rounded-lg text-xs font-bold text-[#1d1d1f] shadow-2xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#0066cc]" />
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* PER-TOPIC LEVEL PANELS */
        <div className="space-y-4">
          {topics.map((t) => (
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
        <button type="button" onClick={onSkip} className="px-6 py-3 rounded-xl border border-[#e6e6e6] text-[#494949] hover:bg-gray-50 cursor-pointer text-sm font-semibold">Skip</button>
        <button type="button" onClick={onBack} className="px-6 py-3 rounded-xl text-[#86868b] hover:text-[#494949] cursor-pointer text-sm font-semibold">← Back</button>
      </div>
    </div>
  )
}
