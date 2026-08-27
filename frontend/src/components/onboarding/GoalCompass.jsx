import { useMemo, useState } from 'react'
import UserProfileDropdown from '../ui/UserProfileDropdown'

/**
 * Goal Compass — the "Set your goal" onboarding step. Computes an
 * Ambition–Readiness reading live from the learner's real resume skills
 * (topicRatings), the chosen target role, weekly study hours, and target date.
 *
 * Props:
 *   topicRatings: [{name, level, evidence}]  (from the Assess Skills step)
 *   detectedYears: number
 *   onCreate(goalText, weeklyHours)          (fires "Create my learning plan")
 *   onBack()
 * Styles scoped under `.gc`.
 */

const LEVEL_TO_NUM = { basic: 35, intermediate: 60, advanced: 82, expert: 95 }
const HOURS_PER_POINT = 1.2

const ROLES = {
  aiml: { name: 'AIML Engineer',    req: { python: 80, statistics: 70, 'machine learning': 75 } },
  da:   { name: 'Data Analyst',     req: { python: 55, sql: 70, statistics: 70 } },
  py:   { name: 'Python Developer', req: { python: 88, git: 55, 'data structures': 60 } },
}

const cap = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase())

const STYLES = `
.gc{ --violet:#5B36E9; --violet-2:#6236EF; --violet-dark:#4826C9; --navy:#0E1B38; --slate:#52617D;
 --muted:#74819A; --lavender:#F5F1FF; --lav-icon:#EEE9FF; --card-bd:#D8DFEB; --input-bd:#CAD3E2;
 --divider:#E6EAF2; --green:#22A06B; --green-surface:#ECFDF3; --green-bd:#B7E7C9; --green-text:#168052;
 --amber:#E0A100; --amber-surface:#FEF6E7; --amber-bd:#F3DB9B; --amber-text:#8A6100;
 --red:#DC2626; --red-surface:#FDECEC; --red-bd:#F3B9B9; --red-text:#B42318; --track:#E8EAF4;
 width:100%; max-width:1080px; }
.gc *{ box-sizing:border-box; }
.gc .head{ display:flex; align-items:center; gap:20px; margin-bottom:26px; }
.gc .head-icon{ width:60px; height:60px; border-radius:50%; flex:none; background:var(--lav-icon); color:var(--violet); display:grid; place-items:center; }
.gc .head h1{ font-family:"Manrope",sans-serif; font-size:clamp(26px,3vw,40px); font-weight:800; letter-spacing:-.025em; margin:0 0 5px; line-height:1.05; color:var(--navy); }
.gc .head p{ font-size:clamp(14px,1.3vw,18px); color:var(--slate); margin:0; line-height:1.45; }
.gc .cols{ display:grid; grid-template-columns:57% 43%; gap:22px; align-items:start; }
.gc .card{ background:#fff; border:1px solid var(--card-bd); border-radius:16px; box-shadow:0 1px 2px rgba(25,40,75,.04),0 4px 14px rgba(25,40,75,.05); padding:24px; }
.gc .sec-h{ font-size:19px; font-weight:600; margin:0 0 11px; color:var(--navy); letter-spacing:-.01em; }
.gc .sec+.sec{ margin-top:24px; }
.gc textarea{ width:100%; resize:none; border:1.5px solid var(--input-bd); border-radius:12px; padding:16px; font-family:inherit; font-size:16px; line-height:1.5; color:var(--navy); min-height:104px; background:#fff; }
.gc textarea:focus{ outline:none; border-color:var(--violet); box-shadow:0 0 0 3px rgba(91,54,233,.22); }
.gc .roles{ display:grid; grid-template-columns:repeat(3,1fr); gap:11px; }
.gc .role{ position:relative; border:1px solid var(--card-bd); border-radius:12px; background:#fff; padding:14px 12px; cursor:pointer; display:flex; flex-direction:column; gap:9px; text-align:left; font:inherit; color:var(--navy); transition:border-color .15s,background .15s; }
.gc .role:hover{ border-color:#C0B6F0; }
.gc .role.sel{ border:2px solid var(--violet); padding:13px 11px; background:var(--lavender); }
.gc .role-ic{ width:32px; height:32px; border-radius:9px; display:grid; place-items:center; background:var(--lav-icon); color:var(--violet); }
.gc .role.sel .role-ic{ background:#fff; }
.gc .role-name{ font-size:14.5px; font-weight:600; }
.gc .role.sel .role-name{ color:var(--violet-dark); }
.gc .role-check{ position:absolute; top:9px; right:9px; width:19px; height:19px; border-radius:50%; background:var(--violet); display:none; place-items:center; color:#fff; }
.gc .role.sel .role-check{ display:grid; }
.gc .insight{ display:flex; gap:8px; align-items:flex-start; margin-top:13px; color:var(--slate); font-size:15px; line-height:1.45; }
.gc .insight svg{ color:var(--violet); flex:none; margin-top:2px; }
.gc .constraints{ display:grid; grid-template-columns:1fr 1fr; gap:15px; }
.gc .cfield label{ display:block; font-size:14.5px; font-weight:600; margin-bottom:7px; }
.gc .cinput{ display:flex; align-items:center; gap:9px; border:1px solid var(--input-bd); border-radius:11px; padding:0 12px; height:50px; background:#fff; }
.gc .cinput:focus-within{ border-color:var(--violet); box-shadow:0 0 0 3px rgba(91,54,233,.22); }
.gc .cinput svg{ color:var(--muted); flex:none; }
.gc .cinput input[type=month]{ border:none; outline:none; background:none; font:600 15.5px/1 "Inter",sans-serif; color:var(--navy); width:100%; }
.gc .time-val{ display:flex; align-items:baseline; gap:6px; margin-bottom:6px; }
.gc .time-val b{ font-size:19px; font-weight:700; color:var(--violet); font-variant-numeric:tabular-nums; }
.gc .time-val span{ font-size:13.5px; color:var(--slate); }
.gc input[type=range]{ -webkit-appearance:none; appearance:none; width:100%; height:6px; border-radius:999px; background:var(--track); outline:none; margin:12px 0 3px; }
.gc input[type=range]::-webkit-slider-thumb{ -webkit-appearance:none; appearance:none; width:21px; height:21px; border-radius:50%; background:var(--violet); border:3px solid #fff; box-shadow:0 2px 6px rgba(91,54,233,.4); cursor:pointer; }
.gc input[type=range]::-moz-range-thumb{ width:21px; height:21px; border-radius:50%; background:var(--violet); border:3px solid #fff; box-shadow:0 2px 6px rgba(91,54,233,.4); cursor:pointer; }
.gc .range-ends{ display:flex; justify-content:space-between; font-size:12px; color:var(--muted); }
.gc .meter{ border:1px solid #DCD3FF; background:linear-gradient(165deg,#fff,#FBFAFF 60%,#F6F3FF); }
.gc .meter-h{ display:flex; align-items:center; gap:8px; margin:0 0 16px; }
.gc .meter-h h2{ font-family:"Manrope",sans-serif; font-size:20px; font-weight:800; letter-spacing:-.02em; margin:0; }
.gc .meter-h svg{ color:var(--violet); flex:none; }
.gc .gauge-row{ display:flex; align-items:center; gap:18px; margin-bottom:16px; }
.gc .gauge{ position:relative; flex:none; width:180px; }
.gc .gauge svg{ display:block; width:100%; }
.gc .gauge-star{ position:absolute; left:50%; bottom:6px; transform:translateX(-50%); }
.gc .big{ font-family:"Manrope",sans-serif; font-weight:800; color:var(--violet); letter-spacing:-.02em; }
.gc .r1 .big{ font-size:42px; line-height:1; }
.gc .r2 .big{ font-size:30px; line-height:1; }
.gc .r-label{ font-size:13.5px; color:var(--slate); margin-top:3px; }
.gc .r-div{ height:1px; background:var(--divider); margin:12px 0; }
.gc #gcfill{ transition:stroke-dasharray .8s cubic-bezier(.4,0,.2,1); }
.gc .feasible{ display:flex; align-items:center; gap:9px; border-radius:999px; padding:9px 14px; margin-bottom:18px; background:var(--green-surface); border:1px solid var(--green-bd); }
.gc .feasible .fc{ width:20px; height:20px; border-radius:50%; background:var(--green); display:grid; place-items:center; color:#fff; flex:none; }
.gc .feasible span{ color:var(--green-text); font-weight:600; font-size:14.5px; }
.gc .feasible.warn{ background:var(--amber-surface); border-color:var(--amber-bd); } .gc .feasible.warn .fc{ background:var(--amber); } .gc .feasible.warn span{ color:var(--amber-text); }
.gc .feasible.bad{ background:var(--red-surface); border-color:var(--red-bd); } .gc .feasible.bad .fc{ background:var(--red); } .gc .feasible.bad span{ color:var(--red-text); }
.gc .bars{ display:flex; flex-direction:column; gap:12px; margin-bottom:18px; }
.gc .bar-top{ display:flex; justify-content:space-between; font-size:14px; font-weight:600; margin-bottom:5px; }
.gc .bar-top .pct{ color:var(--navy); font-variant-numeric:tabular-nums; }
.gc .bar-track{ position:relative; height:9px; border-radius:999px; background:var(--track); }
.gc .bar-fill{ height:100%; border-radius:999px; background:linear-gradient(90deg,var(--violet),#764FF0); transition:width .8s cubic-bezier(.4,0,.2,1); }
.gc .bar-target{ position:absolute; top:-3px; width:2px; height:15px; background:var(--navy); opacity:.35; border-radius:2px; }
.gc .callout{ display:flex; gap:12px; align-items:flex-start; background:var(--lavender); border:1px solid #E7E0FF; border-radius:12px; padding:14px; margin-bottom:14px; }
.gc .callout .ci{ width:36px; height:36px; border-radius:50%; background:var(--lav-icon); color:var(--violet); display:grid; place-items:center; flex:none; }
.gc .callout p{ margin:0; font-size:14px; color:var(--navy); line-height:1.5; }
.gc .preview{ margin-top:22px; }
.gc .preview h3{ font-family:"Manrope",sans-serif; font-size:19px; font-weight:800; letter-spacing:-.02em; margin:0 0 16px; color:var(--navy); }
.gc .preview-top{ display:flex; align-items:center; justify-content:space-between; gap:18px; flex-wrap:wrap; }
.gc .path{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; flex:1; min-width:0; }
.gc .pstep{ display:flex; align-items:center; gap:9px; border:1px solid var(--card-bd); border-radius:12px; padding:11px 13px; background:#fff; }
.gc .pstep .pic{ width:28px; height:28px; border-radius:8px; display:grid; place-items:center; background:#F1F3F8; color:var(--slate); flex:none; }
.gc .pstep.first .pic{ background:var(--lav-icon); color:var(--violet); }
.gc .pstep span{ font-size:14px; font-weight:600; white-space:nowrap; }
.gc .arrow{ color:var(--muted); flex:none; }
.gc .btn-plan{ flex:none; display:inline-flex; align-items:center; justify-content:center; gap:8px; min-width:240px; height:58px; border-radius:12px; border:none; cursor:pointer; color:#fff; font-family:"Manrope",sans-serif; font-weight:700; font-size:17px; background:linear-gradient(180deg,var(--violet-2),var(--violet)); box-shadow:0 8px 20px rgba(91,54,233,.30); transition:background .15s,box-shadow .15s,transform .1s; }
.gc .btn-plan:hover{ background:linear-gradient(180deg,var(--violet),var(--violet-dark)); box-shadow:0 10px 26px rgba(91,54,233,.38); }
.gc .btn-plan:active{ transform:translateY(1px); }
.gc .back{ background:none; border:none; color:var(--muted); font:inherit; font-size:14.5px; cursor:pointer; margin-top:14px; }
.gc .back:hover{ color:var(--slate); }
@media (max-width:1000px){ .gc .cols{ grid-template-columns:1fr; } .gc .preview-top{ flex-direction:column; align-items:stretch; } .gc .btn-plan{ width:100%; } }
@media (prefers-reduced-motion:reduce){ .gc *{ transition:none !important; } }
`

function weeksUntil(monthStr) {
  if (!monthStr) return Infinity
  const [y, m] = monthStr.split('-').map(Number)
  return (new Date(y, m - 1, 1) - new Date()) / (1000 * 60 * 60 * 24 * 7)
}

function defaultTargetMonth() {
  const d = new Date()
  d.setMonth(d.getMonth() + 6)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function GoalCompass({ topicRatings = [], detectedYears = 0, onCreate, onBack }) {
  const [role, setRole] = useState('aiml')
  const [goal, setGoal] = useState('I want an AIML Engineer internship within 6 months.')
  const [weekly, setWeekly] = useState(8)
  const [target, setTarget] = useState(defaultTargetMonth())
  const [priority, setPriority] = useState('intern')

  // current skills from the resume/assess step
  const current = useMemo(() => {
    const m = {}
    topicRatings.forEach((t) => { m[(t.name || '').toLowerCase()] = LEVEL_TO_NUM[(t.level || 'basic').toLowerCase()] || 35 })
    return m
  }, [topicRatings])

  const calc = useMemo(() => {
    const req = ROLES[role].req
    const skills = Object.keys(req)
    let attain = 0, gap = 0
    skills.forEach((s) => {
      const cur = current[s] || 0
      attain += Math.min(cur / req[s], 1)
      gap += Math.max(0, req[s] - cur)
    })
    const readiness = Math.round((attain / skills.length) * 100)
    const hours = gap * HOURS_PER_POINT
    const weeksNeeded = Math.max(1, Math.ceil(hours / weekly))
    const weeksAvail = weeksUntil(target)

    let state = 'ok', msg = `Achievable with ${weekly} hours/week`
    if (weeksNeeded > weeksAvail) {
      const need = Math.ceil(hours / Math.max(1, weeksAvail))
      if (weeksNeeded <= weeksAvail * 1.25) { state = 'warn'; msg = `Tight — try about ${need} hours/week` }
      else { state = 'bad'; msg = (isFinite(weeksAvail) && weeksAvail > 0) ? `Not in time — you'd need ~${need} hours/week` : 'Pick a target date in the future' }
    }

    const bars = skills.map((s) => ({ name: cap(s), cur: current[s] || 0, req: req[s] }))
    const behind = skills.filter((s) => (current[s] || 0) < req[s]).sort((a, b) => (req[a] - (current[a] || 0)) - (req[b] - (current[b] || 0)))
    const biggest = behind[behind.length - 1]
    const strong = skills.find((s) => (current[s] || 0) >= req[s])
    const insight = biggest
      ? `${strong ? `You're solid in ${cap(strong)}. ` : ''}Focus on ${cap(biggest)} next — it's your biggest gap toward ${ROLES[role].name}.`
      : `You already meet the target levels for ${ROLES[role].name}. Polish with a portfolio project.`

    return { readiness, weeksNeeded, state, msg, bars, insight }
  }, [role, weekly, target, current])

  const RoleBtn = ({ id, icon }) => (
    <button type="button" className={`role ${role === id ? 'sel' : ''}`} onClick={() => setRole(id)}>
      <span className="role-check" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></span>
      <span className="role-ic">{icon}</span>
      <span className="role-name">{ROLES[id].name}</span>
    </button>
  )

  return (
    <div className="gc">
      <style>{STYLES}</style>

      <div className="head" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span className="head-icon" aria-hidden="true"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="16.2 7.8 10.5 10.5 7.8 16.2 13.5 13.5" fill="currentColor" stroke="none" /></svg></span>
          <div>
            <h1>Where do you want to go?</h1>
            <p>Tell us your goal. Goal Compass turns it into a realistic, personalized learning path.</p>
          </div>
        </div>
        <UserProfileDropdown />
      </div>

      <div className="cols">
        {/* LEFT */}
        <div className="card">
          <div className="sec">
            <h3 className="sec-h">Describe your goal</h3>
            <textarea value={goal} onChange={(e) => setGoal(e.target.value)} spellCheck="false" />
          </div>

          <div className="sec">
            <h3 className="sec-h">Choose a target role</h3>
            <div className="roles">
              <RoleBtn id="aiml" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>} />
              <RoleBtn id="da" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M7 15v-4" /><path d="M12 15V8" /><path d="M17 15v-6" /></svg>} />
              <RoleBtn id="py" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m8 10-2 2 2 2M13 10l2 2-2 2" /></svg>} />
            </div>
            {topicRatings.length > 0 && (
              <p className="insight"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" /></svg> Readiness is calculated from the {topicRatings.length} skill{topicRatings.length === 1 ? '' : 's'} in your resume.</p>
            )}
          </div>

          <div className="sec constraints">
            <div className="cfield">
              <label htmlFor="gc-target">Target date</label>
              <div className="cinput"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg><input type="month" id="gc-target" value={target} onChange={(e) => setTarget(e.target.value)} /></div>
            </div>
            <div className="cfield">
              <label htmlFor="gc-weekly">Weekly learning time</label>
              <div className="time-val"><b>{weekly}</b><span>hours per week</span></div>
              <input type="range" id="gc-weekly" min="2" max="30" step="1" value={weekly} onChange={(e) => setWeekly(Number(e.target.value))} />
              <div className="range-ends"><span>2h</span><span>30h</span></div>
            </div>
          </div>
        </div>

        {/* RIGHT — meter */}
        <div className="card meter">
          <div className="meter-h"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polygon points="16 8 10.5 10.5 8 16 13.5 13.5" fill="currentColor" stroke="none" /></svg><h2>Ambition–Readiness Meter</h2></div>

          <div className="gauge-row">
            <div className="gauge">
              <svg viewBox="0 0 220 124" aria-label={`Readiness ${calc.readiness}%`}>
                <path d="M20 112 A 90 90 0 0 1 200 112" fill="none" stroke="#E8EAF4" strokeWidth="16" strokeLinecap="round" />
                <path id="gcfill" d="M20 112 A 90 90 0 0 1 200 112" fill="none" stroke="url(#gcgv)" strokeWidth="16" strokeLinecap="round" pathLength="100" strokeDasharray={`${calc.readiness} 100`} />
                <defs><linearGradient id="gcgv" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8E74F2" /><stop offset="1" stopColor="#5B36E9" /></linearGradient></defs>
              </svg>
              <span className="gauge-star" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#5B36E9" strokeWidth="2" strokeLinejoin="round"><polygon points="12 3 14 10 21 12 14 14 12 21 10 14 3 12 10 10" fill="#EEE9FF" /></svg></span>
            </div>
            <div style={{ flex: 1 }}>
              <div className="r1"><div className="big">{calc.readiness}%</div><div className="r-label">Current readiness</div></div>
              <div className="r-div" />
              <div className="r2"><div className="big">{calc.weeksNeeded} {calc.weeksNeeded === 1 ? 'week' : 'weeks'}</div><div className="r-label">estimated path</div></div>
            </div>
          </div>

          <div className={`feasible ${calc.state === 'warn' ? 'warn' : calc.state === 'bad' ? 'bad' : ''}`}>
            <span className="fc" aria-hidden="true">
              {calc.state === 'ok'
                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v5M12 16v.5" /></svg>}
            </span>
            <span>{calc.msg}</span>
          </div>

          <div className="bars">
            {calc.bars.map((b) => (
              <div key={b.name}>
                <div className="bar-top"><span>{b.name}</span><span className="pct">{b.cur}%</span></div>
                <div className="bar-track"><div className="bar-fill" style={{ width: b.cur + '%' }} /><div className="bar-target" style={{ left: b.req + '%' }} title={`Target ${b.req}%`} /></div>
              </div>
            ))}
          </div>

          <div className="callout"><span className="ci" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" /></svg></span><p>{calc.insight}</p></div>
        </div>
      </div>

      {/* Path preview */}
      <div className="card preview">
        <h3>Your path preview</h3>
        <div className="preview-top">
          <div className="path">
            {[
              { t: 'Python foundations', first: true, ic: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 9 3 3-3 3M13 15h4" /></svg> },
              { t: 'Statistics', ic: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M7 15v-4" /><path d="M12 15V8" /><path d="M17 15v-6" /></svg> },
              { t: 'Machine Learning', ic: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg> },
              { t: 'Portfolio project', ic: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg> },
              { t: 'Interview prep', ic: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-3-3.87M9 21v-2a4 4 0 0 1 3-3.87M12 3a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" /></svg> },
            ].map((s, i) => (
              <span key={s.t} style={{ display: 'contents' }}>
                {i > 0 && <svg className="arrow" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>}
                <div className={`pstep ${s.first ? 'first' : ''}`}><span className="pic">{s.ic}</span><span>{s.t}</span></div>
              </span>
            ))}
          </div>
          <button type="button" className="btn-plan" onClick={() => onCreate(goal.trim() || `I want to become a ${ROLES[role].name}.`, weekly)}>
            Create my learning plan
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </div>
        <button type="button" className="back" onClick={onBack}>← Back to skills</button>
      </div>
    </div>
  )
}
