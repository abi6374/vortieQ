import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/**
 * Premium learning-path generation overlay. Renders a blurred navy scrim over
 * the (still-visible) Goal Compass page and a centered white modal that reports
 * generation progress.
 *
 * Props:
 *   status      'loading' | 'success' | 'error'
 *   onFinished  called after the success animation completes (parent navigates)
 *   onRetry     re-run generation (error state)
 *   onBack      return to the interactive Goal Compass (error state)
 */

const STEPS = [
  'Reading your goal and timeline',
  'Mapping your current skills',
  'Sequencing prerequisite topics',
  'Choosing resources and milestones',
  'Preparing your Week 1 plan',
]
// While loading, steps 0-1 are done, step 2 is active, 3-4 upcoming (per spec).
const ACTIVE_INDEX = 2

const STYLES = `
.genov{ position:fixed; inset:0; z-index:100; display:grid; place-items:center; padding:20px;
  font-family:'Inter','Manrope',system-ui,-apple-system,'Segoe UI',sans-serif; }
.genov .scrim{ position:absolute; inset:0; background:rgba(29,29,31,.55);
  -webkit-backdrop-filter:blur(5px); backdrop-filter:blur(5px); }
.genov .modal{ position:relative; width:100%; max-width:500px; background:#fff; border:1px solid #f0f0f0;
  border-radius:20px; padding:36px; box-shadow:0 24px 64px rgba(29,29,31,.28); text-align:center; }
.genov .art{ width:120px; height:120px; margin:0 auto 22px; }
.genov h2{ font-family:'Manrope','Inter',sans-serif; font-weight:800; font-size:26px; line-height:1.2;
  letter-spacing:-.02em; color:#1d1d1f; margin:0 0 10px; }
.genov .sub{ font-size:16.5px; line-height:1.55; color:#333333; margin:0 auto 26px; max-width:40ch; }
.genov .checklist{ display:flex; flex-direction:column; gap:8px; text-align:left; }
.genov .row{ display:flex; align-items:center; gap:12px; height:44px; padding:0 14px; border-radius:12px;
  font-size:15px; font-weight:600; }
.genov .row.done{ background:#f4f9ff; color:#1d1d1f; }
.genov .row.active{ background:#eaf2fc; color:#0066cc; }
.genov .row.todo{ background:transparent; color:#7a7a7a; font-weight:500; }
.genov .ic{ width:22px; height:22px; flex:none; display:flex; align-items:center; justify-content:center; }
.genov .ic .dot-done{ width:22px; height:22px; border-radius:50%; background:#0066cc; display:flex; align-items:center; justify-content:center; }
.genov .ic .dot-todo{ width:20px; height:20px; border-radius:50%; border:1.5px solid #e0e0e0; }
.genov .ic .step-ring{ width:22px; height:22px; display:block; box-shadow:none; outline:none; border:none; }
.genov .progress-wrap{ margin-top:24px; }
.genov .track{ width:100%; height:9px; background:#e8eef4; border-radius:999px; overflow:hidden; }
.genov .fill{ height:100%; background:#0066cc; border-radius:999px; box-shadow:0 0 10px rgba(0,102,204,.45); }
.genov .ptext{ margin:12px 0 0; font-size:14.5px; font-weight:600; color:#333333; }
.genov .foot{ display:flex; align-items:center; justify-content:center; gap:7px; margin-top:20px;
  font-size:13px; color:#7a7a7a; }
.genov .err{ margin-top:22px; }
.genov .err p{ font-size:14.5px; color:#B4232A; background:#FDECEC; border:1px solid #F6D2D2;
  border-radius:12px; padding:12px 14px; margin:0 0 16px; }
.genov .err-actions{ display:flex; gap:12px; }
.genov .btn{ flex:1; height:48px; border-radius:12px; font:600 15px/1 'Inter',sans-serif; cursor:pointer;
  border:1px solid transparent; transition:background .18s,border-color .18s,transform .1s; }
.genov .btn-primary{ background:#0066cc; color:#fff; }
.genov .btn-primary:hover{ background:#004fa3; }
.genov .btn-primary:active{ transform:translateY(1px); }
.genov .btn-ghost{ background:#fff; color:#333333; border-color:#e0e0e0; }
.genov .btn-ghost:hover{ background:#f7f9fb; }
.genov .btn:focus-visible{ outline:none; box-shadow:0 0 0 3px rgba(0,102,204,.35); }
.genov .spin{ transform-origin:center; animation:genov-spin 1s linear infinite; }
.genov .compass{ transform-origin:60px 60px; animation:genov-spin 14s linear infinite; }
.genov .orbit{ transform-origin:60px 60px; animation:genov-spin 18s linear infinite; }
@keyframes genov-spin{ to{ transform:rotate(360deg); } }
@media (prefers-reduced-motion:reduce){
  .genov .spin,.genov .compass,.genov .orbit{ animation:none; }
}
`

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function ActiveRing() {
  return (
    <svg className="step-ring spin" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ boxShadow: 'none', border: 'none', outline: 'none' }}>
      <circle cx="12" cy="12" r="9.5" stroke="#cfe4fb" strokeWidth="2.5" />
      <path d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5" stroke="#0066cc" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function Illustration() {
  return (
    <svg className="art" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <circle cx="60" cy="60" r="58" fill="#eef6fe" />
      {/* dotted orbital path */}
      <circle cx="60" cy="60" r="42" stroke="#b8d6f6" strokeWidth="1.4" strokeDasharray="2 7" strokeLinecap="round" opacity="0.9" />
      {/* three orbit dots, rotating as a group */}
      <g className="orbit">
        <circle cx="60" cy="18" r="3.4" fill="#0066cc" />
        <circle cx="96.4" cy="81" r="3.4" fill="#5ba3f0" />
        <circle cx="23.6" cy="81" r="3.4" fill="#80b8f4" />
      </g>
      {/* compass */}
      <g className="compass">
        <circle cx="60" cy="60" r="26" fill="#fff" stroke="#d8e9fb" strokeWidth="1.5" />
        <polygon points="60,40 66,60 60,56 54,60" fill="#0066cc" />
        <polygon points="60,80 54,60 60,64 66,60" fill="#a6cbf2" />
        <circle cx="60" cy="60" r="3" fill="#004fa3" />
      </g>
    </svg>
  )
}

export default function GeneratingOverlay({ status = 'loading', onFinished, onRetry, onBack }) {
  const reduce = useReducedMotion()
  const [pct, setPct] = useState(0)

  // Smooth, dynamic monotonic progress animation
  useEffect(() => {
    if (status === 'error') return

    if (reduce) {
      setPct(status === 'success' ? 100 : 70)
      return
    }

    if (status === 'success') {
      // Rapidly but smoothly glide to 100%
      const interval = setInterval(() => {
        setPct((p) => {
          if (p >= 100) {
            clearInterval(interval)
            return 100
          }
          const step = Math.max(1.5, (100 - p) * 0.35)
          const next = p + step
          return next >= 99.5 ? 100 : next
        })
      }, 30)
      return () => clearInterval(interval)
    }

    // Dynamic continuous progress during loading
    const startTime = Date.now()
    const interval = setInterval(() => {
      setPct((current) => {
        const elapsed = (Date.now() - startTime) / 1000 // in seconds
        
        // Target dynamic curve:
        // 0-2s   : reaches ~25%
        // 2-4.5s : reaches ~52%
        // 4.5-7s : reaches ~76%
        // 7-10s  : reaches ~90%
        // 10s+   : asymptotically reaches ~97% smoothly
        let target = 0
        if (elapsed <= 2) {
          target = (elapsed / 2) * 25
        } else if (elapsed <= 4.5) {
          target = 25 + ((elapsed - 2) / 2.5) * 27
        } else if (elapsed <= 7) {
          target = 52 + ((elapsed - 4.5) / 2.5) * 24
        } else if (elapsed <= 10) {
          target = 76 + ((elapsed - 7) / 3) * 14
        } else {
          // Asymptotic micro-creep towards 97%
          const extra = elapsed - 10
          target = 90 + 7 * (1 - Math.exp(-extra / 6))
        }

        // Smoothly interpolate towards target, always strictly monotonic (never decrease)
        const delta = Math.max(0, (target - current) * 0.25)
        const next = Math.max(current, current + delta + 0.05)
        return Math.min(97.5, next)
      })
    }, 40)

    return () => clearInterval(interval)
  }, [status, reduce])

  // Active step dynamically derived from current progress
  const isSuccess = status === 'success' || pct >= 100
  const isError = status === 'error'

  const activeStep = isSuccess
    ? 5
    : pct < 22
    ? 0
    : pct < 48
    ? 1
    : pct < 72
    ? 2
    : pct < 88
    ? 3
    : 4

  // After the success fill completes, hand off to parent
  useEffect(() => {
    if (status !== 'success') return
    const t = setTimeout(() => onFinished && onFinished(), 800)
    return () => clearTimeout(t)
  }, [status, onFinished])

  const stepState = (i) => {
    if (isSuccess) return 'done'
    if (i < activeStep) return 'done'
    if (i === activeStep) return 'active'
    return 'todo'
  }
  const labelFor = { done: 'completed', active: 'in progress', todo: 'upcoming' }

  return (
    <div className="genov" role="dialog" aria-modal="true" aria-labelledby="genov-title">
      <style>{STYLES}</style>
      <motion.div
        className="scrim"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
      />
      <motion.div
        className="modal"
        initial={reduce ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <Illustration />

        <h2 id="genov-title">
          {isSuccess ? 'Your learning path is ready' : 'Creating your learning path'}
        </h2>
        <p className="sub">
          {isError
            ? 'Something interrupted the plan. Your goal and skills are safe.'
            : isSuccess
            ? 'Taking you to your personalized roadmap.'
            : 'We’re turning your goal, skills, and schedule into a tailored, step-by-step roadmap.'}
        </p>

        {!isError && (
          <>
            <ul className="checklist" aria-label="Generation progress">
              {STEPS.map((label, i) => {
                const s = stepState(i)
                return (
                  <li key={label} className={`row ${s}`}>
                    <span className="ic">
                      {s === 'done' && <span className="dot-done"><CheckIcon /></span>}
                      {s === 'active' && <ActiveRing />}
                      {s === 'todo' && <span className="dot-todo" />}
                    </span>
                    <span>{label}</span>
                    <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
                      {labelFor[s]}
                    </span>
                  </li>
                )
              })}
            </ul>

            <div className="progress-wrap">
              <div className="track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
                <motion.div className="fill" animate={{ width: `${pct}%` }} transition={{ ease: 'easeOut', duration: 0.3 }} />
              </div>
              <p className="ptext">
                {isSuccess ? 'Your roadmap is ready · 100%' : `Building your roadmap · ${Math.round(pct)}%`}
              </p>
            </div>

            <div className="foot">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              This usually takes less than a minute.
            </div>
          </>
        )}

        {isError && (
          <div className="err">
            <p role="alert">We couldn’t build your roadmap. Please try again.</p>
            <div className="err-actions">
              <button type="button" className="btn btn-ghost" onClick={onBack}>Back to goal</button>
              <button type="button" className="btn btn-primary" onClick={onRetry}>Try again</button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
