import { useMemo, useState } from 'react'
import { subtopicsFor, LEVEL_KEYS } from './skillTaxonomy'

/**
 * Skill Confidence Assessment — step 2 of onboarding, shown after resume upload.
 *
 * Two assessment methods (mutually exclusive, global toggle):
 *   - 'level'    : structured — pick Basic/Intermediate/Advanced/Expert per topic.
 *                  Level cards are interactive ONLY in this mode.
 *   - 'describe' : natural language — the level cards are DISABLED and a textarea
 *                  per topic captures a free-text self-description instead.
 *
 * Confidence % is derived, not decorative: it reflects how well the level the
 * learner picks agrees with the level the resume implied (suggested_level).
 *
 * Props:
 *   topics:        [{name, evidence, suggested_level}]
 *   detectedYears: number
 *   onContinue(ratings)  ratings = [{name, level, evidence}]
 *   onBack(), onSkip()
 */

const LEVEL_META = {
  basic:        { label: 'Basic',        blurb: 'Getting started' },
  intermediate: { label: 'Intermediate', blurb: 'Comfortable with the essentials' },
  advanced:     { label: 'Advanced',     blurb: 'Production-ready depth' },
  expert:       { label: 'Expert',       blurb: 'Architect & mentor level' },
}

const V = '#5B36E9'
const V_DARK = '#4826C9'

function normalizeLevel(l) {
  const k = (l || '').toLowerCase()
  return LEVEL_KEYS.includes(k) ? k : 'basic'
}

// Confidence: 92% when the chosen level matches the resume's suggested level,
// dropping 22 points per tier of disagreement (floor 20).
function confidenceFor(chosen, suggested) {
  const dist = Math.abs(LEVEL_KEYS.indexOf(chosen) - LEVEL_KEYS.indexOf(suggested))
  return Math.max(20, 92 - dist * 22)
}

function Radio({ on, small }) {
  const size = small ? 18 : 22
  const dot = small ? 9 : 11
  return (
    <span
      style={{
        width: size, height: size, borderRadius: '50%',
        border: `2px solid ${on ? V : '#DDE3EF'}`,
        background: '#fff', display: 'grid', placeItems: 'center', flex: 'none',
      }}
    >
      {on && <span style={{ width: dot, height: dot, borderRadius: '50%', background: V }} />}
    </span>
  )
}

function SkillPanel({ topic, method, level, description, onLevel, onDescribe }) {
  const [open, setOpen] = useState(true)
  const suggested = normalizeLevel(topic.suggested_level)
  const levelMode = method === 'level'
  const pct = confidenceFor(level, suggested)

  return (
    <section className="rounded-2xl border border-[#DDE3EF] bg-white shadow-sm overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-4 px-5 py-4">
        <div
          className="grid place-items-center rounded-xl text-white font-bold flex-none"
          style={{ width: 44, height: 44, background: V, boxShadow: '0 4px 12px rgba(91,54,233,.25)' }}
        >
          {topic.name.slice(0, 2).toUpperCase()}
        </div>
        <span className="font-bold text-[#0E1B38]" style={{ fontSize: 22, letterSpacing: '-.02em' }}>
          {topic.name}
        </span>
        <span className="flex-1" />
        {levelMode && (
          <span className="flex items-baseline gap-1.5">
            <span className="font-extrabold tabular-nums" style={{ fontSize: 22, color: V }}>{pct}%</span>
            <span className="text-sm text-[#51607C]">confidence</span>
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Collapse' : 'Expand'}
          className="grid place-items-center rounded-full border border-[#DDE3EF] bg-[#F7F8FC] text-[#51607C] hover:bg-[#EEF1F8] flex-none"
          style={{ width: 38, height: 38 }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
               strokeLinecap="round" strokeLinejoin="round"
               style={{ transform: open ? 'none' : 'rotate(180deg)', transition: 'transform .2s' }}>
            <path d="m18 15-6-6-6 6" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="px-5 pb-5">
          {topic.evidence && (
            <p className="text-[13px] text-[#7B879E] italic mb-4 -mt-1">"{topic.evidence}"</p>
          )}

          {levelMode ? (
            <>
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
                      className="text-left rounded-xl bg-white transition"
                      style={{
                        border: active ? `2px solid ${V}` : '1px solid #DDE3EF',
                        padding: active ? 15 : 16,
                        background: active ? 'linear-gradient(160deg,#fff,#F5F1FF 120%)' : '#fff',
                        boxShadow: active ? '0 0 0 3px rgba(91,54,233,.07)' : 'none',
                      }}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-bold" style={{ fontSize: 15, color: active ? V_DARK : '#0E1B38' }}>
                          {LEVEL_META[key].label}
                        </span>
                        <Radio on={active} small />
                      </span>
                      <span className="block text-[12px] text-[#7B879E] mt-1.5 leading-snug">
                        {suggested === key ? 'Matches your resume' : LEVEL_META[key].blurb}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* explanation */}
              <div className="mt-3.5 flex items-center gap-4 rounded-xl border px-5 py-4"
                   style={{ background: '#F5F1FF', borderColor: '#EFE9FF' }}>
                <span className="grid place-items-center rounded-full flex-none"
                      style={{ width: 42, height: 42, background: '#EFE9FF', color: V }}>
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                       strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </span>
                <div>
                  <div className="text-[11px] font-bold tracking-wide uppercase mb-0.5" style={{ color: V }}>
                    You should know · {LEVEL_META[level].label}
                  </div>
                  <div className="font-semibold text-[#0E1B38] leading-snug" style={{ fontSize: 16 }}>
                    {subtopicsFor(topic.name, level)}
                  </div>
                </div>
              </div>
            </>
          ) : (
            // describe mode: level cards disabled, textarea active
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 opacity-40 pointer-events-none select-none" aria-hidden="true">
                {LEVEL_KEYS.map((key) => (
                  <div key={key} className="rounded-xl border border-[#DDE3EF] bg-white p-4">
                    <span className="flex items-center justify-between">
                      <span className="font-bold text-[15px] text-[#0E1B38]">{LEVEL_META[key].label}</span>
                      <Radio on={false} small />
                    </span>
                    <span className="block text-[12px] text-[#7B879E] mt-1.5">{LEVEL_META[key].blurb}</span>
                  </div>
                ))}
              </div>
              <div className="relative mt-3.5">
                <textarea
                  value={description}
                  onChange={(e) => onDescribe(e.target.value.slice(0, 500))}
                  maxLength={500}
                  placeholder={`Describe what you can build or explain with ${topic.name}…`}
                  className="w-full resize-none rounded-xl border border-[#DDE3EF] bg-[#FBFCFE] px-3.5 py-3 text-[14.5px] text-[#0E1B38] leading-relaxed focus:outline-none focus:border-[#5B36E9] focus:bg-white"
                  style={{ minHeight: 96 }}
                />
                <span className="absolute right-3 bottom-2 text-[12px] text-[#7B879E] tabular-nums">
                  {description.length}/500
                </span>
              </div>
            </>
          )}
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
  const [descriptions, setDescriptions] = useState(
    () => Object.fromEntries(topics.map((t) => [t.name, '']))
  )

  const setLevel = (name, lvl) => setLevels((p) => ({ ...p, [name]: lvl }))
  const setDesc = (name, txt) => setDescriptions((p) => ({ ...p, [name]: txt }))

  const submit = () => {
    const ratings = topics.map((t) => ({
      name: t.name,
      level: levels[t.name] || normalizeLevel(t.suggested_level),
      evidence: method === 'describe' && descriptions[t.name]
        ? descriptions[t.name]
        : (t.evidence || ''),
    }))
    onContinue(ratings)
  }

  const MethodCard = ({ id, icon, title, desc, children }) => {
    const active = method === id
    return (
      <button
        type="button"
        onClick={() => setMethod(id)}
        aria-pressed={active}
        className="relative text-left rounded-2xl bg-white transition flex flex-col"
        style={{
          border: active ? `2px solid ${V}` : '1px solid #DDE3EF',
          padding: active ? 23 : 24,
          minHeight: 200,
          background: active ? 'linear-gradient(160deg,#fff,#F5F1FF)' : '#fff',
          boxShadow: active ? '0 0 0 4px rgba(91,54,233,.08)' : 'none',
        }}
      >
        <span className="absolute" style={{ top: 20, right: 20 }}><Radio on={active} /></span>
        <div className="flex items-start gap-3.5 mb-4">
          <span className="grid place-items-center rounded-xl flex-none" style={{
            width: 46, height: 46,
            background: active ? V : '#EEF1F8',
            color: active ? '#fff' : '#51607C',
            boxShadow: active ? '0 4px 12px rgba(91,54,233,.28)' : 'none',
          }}>{icon}</span>
          <div>
            <h3 className="font-bold text-[#0E1B38]" style={{ fontSize: 19, letterSpacing: '-.01em' }}>{title}</h3>
            <p className="text-[14px] text-[#51607C] mt-1 leading-snug">{desc}</p>
          </div>
        </div>
        {children}
      </button>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl w-full" style={{ maxWidth: 940, padding: 'clamp(24px,4vw,40px)' }}>
      <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wide mb-4"
            style={{ color: V, background: '#F5F1FF', border: '1px solid #EFE9FF' }}>
        Step 2 · Skill confidence
      </span>
      <h1 className="font-extrabold text-[#0E1B38]" style={{ fontSize: 'clamp(26px,3.4vw,40px)', letterSpacing: '-.025em', lineHeight: 1.05 }}>
        Your skills, your confidence
      </h1>
      <p className="text-[#51607C] mt-3 mb-7" style={{ fontSize: 'clamp(15px,1.4vw,18px)' }}>
        We found {topics.length} topic{topics.length === 1 ? '' : 's'} in your resume
        {detectedYears ? ` (≈${detectedYears} years experience)` : ''}. Choose how you'd like to rate yourself.
      </p>

      {/* method toggle */}
      <div className="grid sm:grid-cols-2 gap-5 mb-7">
        <MethodCard
          id="describe"
          title="Describe it in your own words"
          desc="Tell us what you can build, solve, or explain."
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z"/></svg>}
        >
          <p className="text-[13px] text-[#51607C] mt-auto leading-relaxed">
            Best if your experience doesn't fit neat levels — we'll read it and infer where to start you.
          </p>
        </MethodCard>

        <MethodCard
          id="level"
          title="Choose a level"
          desc="Pick a level and see the related subtopics you should know."
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 16v-5"/><path d="M12 16V8"/><path d="M17 16v-9"/></svg>}
        >
          <p className="text-[13px] text-[#51607C] mt-auto leading-relaxed">
            Fastest way to tune your roadmap — set a tier per skill and we start you exactly there.
          </p>
        </MethodCard>
      </div>

      {/* per-topic panels */}
      <div className="space-y-4">
        {topics.map((t) => (
          <SkillPanel
            key={t.name}
            topic={t}
            method={method}
            level={levels[t.name] || normalizeLevel(t.suggested_level)}
            description={descriptions[t.name] || ''}
            onLevel={(lvl) => setLevel(t.name, lvl)}
            onDescribe={(txt) => setDesc(t.name, txt)}
          />
        ))}
      </div>

      {/* actions */}
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 justify-center">
        <button
          type="button"
          onClick={submit}
          className="inline-flex items-center justify-center gap-2 text-white font-bold rounded-2xl"
          style={{ minWidth: 210, height: 56, fontSize: 17, background: `linear-gradient(180deg,#6B47F0,${V})`, boxShadow: '0 8px 20px rgba(91,54,233,.30)' }}
        >
          Continue
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>
        </button>
        <button type="button" onClick={onSkip} className="px-6 py-3 rounded-xl border border-[#DDE3EF] text-[#51607C] hover:bg-gray-50">Skip</button>
        <button type="button" onClick={onBack} className="px-6 py-3 rounded-xl text-[#7B879E] hover:text-[#51607C]">← Back</button>
      </div>
    </div>
  )
}
