import { useMemo, useState } from 'react'
import UserProfileDropdown from '../ui/UserProfileDropdown'
import ThemeToggle from '../ui/ThemeToggle'

/**
 * Goal Compass — the "Set your goal" onboarding step. Computes an
 * Ambition–Readiness reading live from the learner's real resume skills
 * (topicRatings), the chosen target role, weekly study hours, and target date.
 *
 * Props:
 *   topicRatings: [{name, level, evidence}]  (from the Assess Skills step)
 *   detectedYears: number
 *   onCreate(goalText, weeklyHours, targetRoleOverride)  (fires "Create my learning plan";
 *                                            targetRoleOverride is the role the learner
 *                                            explicitly selected/typed - '' if none)
 *   onBack()
 * Styles scoped under `.gc`.
 */

const LEVEL_TO_NUM = { basic: 35, intermediate: 60, advanced: 82, expert: 95 }
const HOURS_PER_POINT = 1.2

const ROLES = {
  sde: {
    name: 'Software Engineer (SDE)',
    req: { 'Data Structures & Algorithms': 80, 'System Design & APIs': 70, 'Core Programming': 80, 'Databases & Storage': 65 },
  },
  fullstack: {
    name: 'Full-Stack Developer',
    req: { 'Frontend (React/UI)': 75, 'Backend & APIs': 75, 'Databases & Storage': 70, 'Git & DevOps Tools': 60 },
  },
  aiml: {
    name: 'AI / ML Engineer',
    req: { 'Python Core': 80, 'Machine Learning & AI': 75, 'Math & Statistics': 70 },
  },
  web: {
    name: 'Frontend Developer',
    req: { 'JavaScript / TS': 75, 'React & Modern UI': 70, 'Web Foundations': 65 },
  },
  cloud: {
    name: 'Cloud / DevOps Engineer',
    req: { 'Linux & Scripting': 65, 'Docker & Containers': 70, 'AWS & Cloud Infra': 65 },
  },
  da: {
    name: 'Data Analyst',
    req: { 'SQL & Databases': 75, 'Python Analytics': 65, 'BI & Statistics': 70 },
  },
  product: {
    name: 'Product Manager',
    req: { 'Product Strategy': 70, 'SQL & Metrics': 55, 'Business Analysis': 60 },
  },
  custom: { name: 'Custom role', req: null },
}

const SELECTABLE_ROLE_IDS = ['sde', 'fullstack', 'aiml', 'web', 'cloud', 'da', 'product']

const ALIAS_MAP = {
  'Data Structures & Algorithms': [
    'dsa', 'data structures', 'algorithms', 'data structures and algorithms', 'data structures & algorithms',
    'leetcode', 'competitive programming', 'core cs', 'problem solving', 'oop'
  ],
  'System Design & APIs': [
    'system design', 'system architecture', 'distributed systems', 'rest apis', 'restful apis',
    'microservices', 'fastapi', 'express', 'express.js', 'software engineering', 'oop'
  ],
  'Core Programming': [
    'java', 'c++', 'python', 'javascript', 'typescript', 'c', 'go', 'rust', 'c#', 'programming', 'software development'
  ],
  'Databases & Storage': [
    'postgresql', 'postgres', 'mysql', 'mongodb', 'database', 'databases', 'supabase', 'redis', 'sql', 'dbms'
  ],
  'Frontend (React/UI)': [
    'react', 'react.js', 'reactjs', 'next.js', 'vue', 'angular', 'javascript', 'typescript', 'html', 'css', 'tailwind', 'flutter', 'frontend'
  ],
  'Backend & APIs': [
    'node.js', 'nodejs', 'express', 'express.js', 'fastapi', 'flask', 'django', 'spring', 'spring boot', 'nest.js', 'rest apis', 'restful apis', 'backend'
  ],
  'Git & DevOps Tools': [
    'git', 'github', 'docker', 'postman', 'linux', 'aws', 'developer tools', 'ci/cd', 'rest apis'
  ],
  'Python Core': [
    'python', 'python3', 'oop', 'fastapi', 'django', 'flask'
  ],
  'Machine Learning & AI': [
    'machine learning', 'ml', 'deep learning', 'ai', 'artificial intelligence', 'scikit-learn', 'pytorch', 'tensorflow', 'agentic ai', 'ollama', 'pycaret', 'pandasai', 'data science'
  ],
  'Math & Statistics': [
    'statistics', 'linear algebra', 'calculus', 'probability', 'applied statistics', 'mathematics', 'data science'
  ],
  'JavaScript / TS': [
    'javascript', 'typescript', 'es6', 'js', 'ts', 'node.js', 'react'
  ],
  'React & Modern UI': [
    'react', 'react.js', 'reactjs', 'next.js', 'tailwind', 'html', 'css', 'frontend'
  ],
  'Web Foundations': [
    'html', 'css', 'javascript', 'web development', 'rest apis', 'responsive design'
  ],
  'Linux & Scripting': [
    'linux', 'bash', 'shell', 'unix', 'operating systems'
  ],
  'Docker & Containers': [
    'docker', 'containers', 'kubernetes', 'containerization'
  ],
  'AWS & Cloud Infra': [
    'aws', 'cloud', 'cloud computing', 'gcp', 'azure', 'infrastructure'
  ],
  'SQL & Databases': [
    'sql', 'postgresql', 'postgres', 'mysql', 'mongodb', 'database', 'databases', 'dbms'
  ],
  'Python Analytics': [
    'python', 'pandas', 'numpy', 'scipy', 'matplotlib', 'seaborn', 'data analysis'
  ],
  'BI & Statistics': [
    'powerbi', 'power bi', 'tableau', 'excel', 'statistics', 'bi', 'visualization', 'business intelligence'
  ],
  'Product Strategy': [
    'product management', 'product strategy', 'agile', 'scrum', 'user research'
  ],
  'SQL & Metrics': [
    'sql', 'metrics', 'analytics', 'data analysis', 'kpis'
  ],
  'Business Analysis': [
    'business intelligence', 'business analysis', 'excel', 'reporting', 'strategy'
  ],
}

function getCategoryScore(categoryName, userSkills) {
  const aliases = ALIAS_MAP[categoryName] || [categoryName.toLowerCase()]
  let bestScore = 0
  for (const [skillName, score] of Object.entries(userSkills)) {
    const sLower = skillName.toLowerCase().trim()
    for (const alias of aliases) {
      if (sLower === alias || sLower.includes(alias) || alias.includes(sLower)) {
        if (score > bestScore) bestScore = score
      }
    }
  }
  return bestScore
}

// Auto-suggest the best-matching role from the learner's real detected skills
function suggestRole(topicRatings, goalText) {
  if (topicRatings && topicRatings.length) {
    const current = {}
    topicRatings.forEach((t) => { current[(t.name || '').toLowerCase()] = LEVEL_TO_NUM[(t.level || 'basic').toLowerCase()] || 35 })
    let best = null, bestScore = -1
    SELECTABLE_ROLE_IDS.forEach((id) => {
      const req = ROLES[id].req
      const keys = Object.keys(req)
      const score = keys.reduce((sum, k) => sum + Math.min(getCategoryScore(k, current) / req[k], 1), 0) / keys.length
      if (score > bestScore) { bestScore = score; best = id }
    })
    if (best && bestScore > 0) return best
  }
  const g = (goalText || '').toLowerCase()
  if (/sde|software engineer|software dev|backend|system design|dsa|algorithms/.test(g)) return 'sde'
  if (/full[- ]?stack|fullstack/.test(g)) return 'fullstack'
  if (/react|frontend|web dev|javascript|html|css/.test(g)) return 'web'
  if (/devops|cloud|aws|docker|kubernetes|infrastructure/.test(g)) return 'cloud'
  if (/product manager|product management|business analy|agile|scrum/.test(g)) return 'product'
  if (/data analy|tableau|powerbi|bi/.test(g)) return 'da'
  return 'sde'
}

const cap = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase())

const PREVIEW_ICONS = {
  code: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  stat: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" /><path d="M7 15v-4" /><path d="M12 15V8" /><path d="M17 15v-6" />
    </svg>
  ),
  ai: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
  ),
  db: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  cloud: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.6 1.5A4 4 0 0 0 6.5 19z" />
    </svg>
  ),
  project: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  ),
  user: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-3-3.87M9 21v-2a4 4 0 0 1 3-3.87M12 3a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" />
    </svg>
  ),
}

const ROLE_PATH_PREVIEWS = {
  sde: [
    { t: 'Advanced Data Structures & Algorithms', ic: 'code' },
    { t: 'Object-Oriented Design & System Patterns', ic: 'cloud' },
    { t: 'Scalable Microservices & Distributed APIs', ic: 'db' },
    { t: 'Production-Grade Capstone Project', ic: 'project' },
    { t: 'SDE Technical & Coding Interview Prep', ic: 'user' },
  ],
  fullstack: [
    { t: 'Modern Frontend & Component Architecture', ic: 'code' },
    { t: 'Scalable Backend APIs & Middleware', ic: 'cloud' },
    { t: 'Relational & NoSQL Database Pipelines', ic: 'db' },
    { t: 'Full-Stack Production Application', ic: 'project' },
    { t: 'System Design & Full-Stack Prep', ic: 'user' },
  ],
  aiml: [
    { t: 'Python Foundations & Math for AI', ic: 'code' },
    { t: 'Applied Statistics & Feature Engineering', ic: 'stat' },
    { t: 'Deep Learning & Neural Networks', ic: 'ai' },
    { t: 'AI Portfolio & Model Deployment', ic: 'project' },
    { t: 'AI/ML Engineering Interview Prep', ic: 'user' },
  ],
  da: [
    { t: 'SQL & Data Modeling', ic: 'db' },
    { t: 'Python Data Wrangling & Pandas', ic: 'code' },
    { t: 'BI & Interactive Visualization', ic: 'stat' },
    { t: 'Analytics Case Study & Dashboard', ic: 'project' },
    { t: 'Analytics Interview Prep', ic: 'user' },
  ],
  web: [
    { t: 'HTML5, Modern CSS & Tailwind', ic: 'code' },
    { t: 'JavaScript (ES6+) & TypeScript Core', ic: 'code' },
    { t: 'React & State Architecture', ic: 'ai' },
    { t: 'Full-Stack Deployed Web App', ic: 'project' },
    { t: 'Frontend Interview Prep', ic: 'user' },
  ],
  cloud: [
    { t: 'Linux Systems & Shell Scripting', ic: 'code' },
    { t: 'Docker & Container Orchestration', ic: 'cloud' },
    { t: 'AWS & Cloud Infrastructure', ic: 'cloud' },
    { t: 'CI/CD Pipeline Project', ic: 'project' },
    { t: 'DevOps Scenario Prep', ic: 'user' },
  ],
  product: [
    { t: 'Product Strategy & Vision', ic: 'user' },
    { t: 'User Research & Data Metrics', ic: 'stat' },
    { t: 'Agile Roadmapping & Specs', ic: 'cloud' },
    { t: 'End-to-End Product PRD', ic: 'project' },
    { t: 'PM Case Interviews', ic: 'user' },
  ],
  custom: [
    { t: 'Core Domain Foundations', ic: 'code' },
    { t: 'Essential Tools & Concepts', ic: 'cloud' },
    { t: 'Specialized Techniques', ic: 'ai' },
    { t: 'Showcase Portfolio Project', ic: 'project' },
    { t: 'Career Readiness & Prep', ic: 'user' },
  ],
}


const STYLES = `
.gc{ --violet:#0066cc; --violet-2:#0071e3; --violet-dark:#004fa3; --navy:#1d1d1f; --slate:#333333;
 --muted:#7a7a7a; --lavender:#eaf2fc; --lav-icon:#dbeafc; --card-bd:#f0f0f0; --input-bd:#d2d2d7;
 --divider:#f0f0f0; --green:#22A06B; --green-surface:#ECFDF3; --green-bd:#B7E7C9; --green-text:#168052;
 --amber:#E0A100; --amber-surface:#FEF6E7; --amber-bd:#F3DB9B; --amber-text:#8A6100;
 --red:#DC2626; --red-surface:#FDECEC; --red-bd:#F3B9B9; --red-text:#B42318; --track:#e8eef4;
 width:100%; max-width:1140px; }
.gc *{ box-sizing:border-box; }
.gc .head{ display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:24px; }
.gc .head-left{ display:flex; flex-direction:column; }
.gc .step-badge{ display:inline-flex; align-items:center; gap:6px; border-radius:999px; padding:4px 14px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--violet); background:var(--lavender); border:1px solid #eaf2fc; width:fit-content; margin-bottom:12px; }
.gc .head-title-row{ display:flex; align-items:center; gap:16px; }
.gc .head-icon{ width:52px; height:52px; border-radius:16px; flex:none; background:var(--lav-icon); color:var(--violet); display:grid; place-items:center; }
.gc .head h1{ font-family:"Manrope",sans-serif; font-size:clamp(26px,3vw,38px); font-weight:800; letter-spacing:-.025em; margin:0 0 4px; line-height:1.1; color:var(--navy); }
.gc .head p{ font-size:clamp(14px,1.3vw,16px); color:var(--slate); margin:0; line-height:1.45; }
.gc .cols{ display:grid; grid-template-columns:1.15fr 0.85fr; gap:24px; align-items:start; }
.gc .card{ background:#fff; border:1px solid var(--card-bd); border-radius:18px; box-shadow:0 14px 38px rgba(25,49,75,0.08); padding:28px; }
.gc .sec-h{ font-size:19px; font-weight:600; margin:0 0 11px; color:var(--navy); letter-spacing:-.01em; }
.gc .sec+.sec{ margin-top:24px; }
.gc textarea{ width:100%; resize:none; border:1.5px solid var(--input-bd); border-radius:12px; padding:16px; font-family:inherit; font-size:16px; line-height:1.5; color:var(--navy); min-height:104px; background:#fff; }
.gc textarea:focus{ outline:none; border-color:var(--violet); box-shadow:0 0 0 3px rgba(0,102,204,.22); }
.gc .roles{ display:grid; grid-template-columns:repeat(3,1fr); gap:11px; }
.gc .role-custom{ border:1.5px dashed var(--card-bd); border-radius:12px; padding:14px 12px; cursor:pointer; display:flex; flex-direction:column; gap:9px; text-align:left; font:inherit; color:var(--navy); transition:border-color .15s,background .15s; background:#fff; }
.gc .role-custom:hover{ border-color:#b6d2f0; }
.gc .role-custom.sel{ border:2px solid var(--violet); padding:13px 11px; background:var(--lavender); border-style:solid; }
.gc .role-suggested{ display:inline-flex; align-items:center; gap:5px; font-size:11.5px; font-weight:700; color:var(--violet); margin-top:8px; }
.gc .custom-input{ width:100%; margin-top:9px; border:1.5px solid var(--input-bd); border-radius:10px; padding:10px 12px; font-size:14px; color:var(--navy); }
.gc .custom-input:focus{ outline:none; border-color:var(--violet); box-shadow:0 0 0 3px rgba(0,102,204,.22); }
.gc .role{ position:relative; border:1px solid var(--card-bd); border-radius:12px; background:#fff; padding:14px 12px; cursor:pointer; display:flex; flex-direction:column; gap:9px; text-align:left; font:inherit; color:var(--navy); transition:border-color .15s,background .15s; }
.gc .role:hover{ border-color:#b6d2f0; }
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
.gc .cinput{ display:flex; align-items:center; gap:9px; border:1.5px solid var(--input-bd); border-radius:12px; padding:0 12px; height:48px; background:#fff; transition:border-color .15s,box-shadow .15s; }
.gc .cinput:focus-within{ border-color:var(--violet); box-shadow:0 0 0 3px rgba(0,102,204,.22); }
.gc .cinput svg{ color:var(--muted); flex:none; }
.gc .cinput input[type=month]{ border:none; outline:none; background:transparent; font:600 15px/1 "Inter",sans-serif; color:var(--navy); width:100%; padding:0; margin:0; cursor:pointer; }
.gc .time-val{ display:flex; align-items:baseline; gap:6px; margin-bottom:6px; }
.gc .time-val b{ font-size:19px; font-weight:700; color:var(--violet); font-variant-numeric:tabular-nums; }
.gc .time-val span{ font-size:13.5px; color:var(--slate); }
.gc input[type=range]{ -webkit-appearance:none; appearance:none; width:100%; height:8px; border-radius:999px; background:var(--track); outline:none; margin:12px 0 6px; cursor:pointer; border:1px solid rgba(0,102,204,0.12); }
.gc input[type=range]::-webkit-slider-thumb{ -webkit-appearance:none; appearance:none; width:22px; height:22px; border-radius:50%; background:var(--violet); border:3.5px solid #fff; box-shadow:0 2px 8px rgba(0,102,204,.45); cursor:pointer; transition:transform .15s ease,box-shadow .15s ease; }
.gc input[type=range]::-webkit-slider-thumb:hover{ transform:scale(1.15); box-shadow:0 0 12px rgba(0,102,204,.7); }
.gc input[type=range]::-moz-range-thumb{ width:22px; height:22px; border-radius:50%; background:var(--violet); border:3.5px solid #fff; box-shadow:0 2px 8px rgba(0,102,204,.45); cursor:pointer; }
.gc .range-ends{ display:flex; justify-content:space-between; font-size:12px; color:var(--muted); }
.gc .meter{ border:1px solid #d5e8fd; background:linear-gradient(165deg,#fff,#fafcff 60%,#f3f9ff); }
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
.gc .bar-fill{ height:100%; border-radius:999px; background:linear-gradient(90deg,var(--violet),#4f9df0); transition:width .8s cubic-bezier(.4,0,.2,1); }
.gc .bar-target{ position:absolute; top:-3px; width:2px; height:15px; background:var(--navy); opacity:.35; border-radius:2px; }
.gc .callout{ display:flex; gap:12px; align-items:flex-start; background:var(--lavender); border:1px solid #e1effe; border-radius:12px; padding:14px; margin-bottom:14px; }
.gc .callout .ci{ width:36px; height:36px; border-radius:50%; background:var(--lav-icon); color:var(--violet); display:grid; place-items:center; flex:none; }
.gc .callout p{ margin:0; font-size:14px; color:var(--navy); line-height:1.5; }
.gc .preview{ margin-top:22px; }
.gc .preview h3{ font-family:"Manrope",sans-serif; font-size:19px; font-weight:800; letter-spacing:-.02em; margin:0 0 16px; color:var(--navy); }
.gc .preview-top{ display:flex; align-items:center; justify-content:space-between; gap:18px; flex-wrap:wrap; }
.gc .path{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; flex:1; min-width:0; }
.gc .pstep{ display:flex; align-items:center; gap:9px; border:1px solid var(--card-bd); border-radius:12px; padding:11px 13px; background:#fff; }
.gc .pstep .pic{ width:28px; height:28px; border-radius:8px; display:grid; place-items:center; background:#f1f4f8; color:var(--slate); flex:none; }
.gc .pstep.first .pic{ background:var(--lav-icon); color:var(--violet); }
.gc .pstep span{ font-size:14px; font-weight:600; white-space:nowrap; }
.gc .arrow{ color:var(--muted); flex:none; }
.gc .btn-plan{ flex:none; display:inline-flex; align-items:center; justify-content:center; gap:8px; min-width:240px; height:58px; border-radius:12px; border:none; cursor:pointer; color:#fff; font-family:"Manrope",sans-serif; font-weight:700; font-size:17px; background:linear-gradient(180deg,var(--violet-2),var(--violet)); box-shadow:0 8px 20px rgba(0,102,204,.30); transition:background .15s,box-shadow .15s,transform .1s; }
.gc .btn-plan:hover{ background:linear-gradient(180deg,var(--violet),var(--violet-dark)); box-shadow:0 10px 26px rgba(0,102,204,.38); }
.gc .btn-plan:active{ transform:translateY(1px); }
.gc .btn-plan:disabled{ opacity:.5; cursor:not-allowed; box-shadow:none; }
.gc .back{ background:none; border:none; color:var(--muted); font:inherit; font-size:14.5px; cursor:pointer; margin-top:14px; }
.gc .back:hover{ color:var(--slate); }

html.dark .gc {
  --navy: #F8FAFC;
  --slate: #CBD5E1;
  --muted: #94A3B8;
  --lavender: #182438;
  --lav-icon: #1E293B;
  --card-bd: #202B3C;
  --input-bd: #2D3F59;
  --divider: #202B3C;
  --track: #263852;
  --range-fill: #38BDF8;
  --green-surface: rgba(6, 78, 59, 0.3);
  --green-bd: rgba(52, 211, 153, 0.3);
  --green-text: #34D399;
  --amber-surface: rgba(120, 53, 15, 0.3);
  --amber-bd: rgba(251, 191, 36, 0.3);
  --amber-text: #FBBF24;
  --red-surface: rgba(127, 29, 29, 0.3);
  --red-bd: rgba(248, 113, 113, 0.3);
  --red-text: #F87171;
}
html.dark .gc .card {
  background: #0E1522;
  box-shadow: 0 14px 38px rgba(0, 0, 0, 0.5);
}
html.dark .gc textarea {
  background: #0B0F17;
  color: #F8FAFC;
}
html.dark .gc .role,
html.dark .gc .role-custom,
html.dark .gc .pstep {
  background: #141C2B;
}
html.dark .gc .cinput {
  background: #0B0F17;
  border-color: #2D3F59;
}
html.dark .gc .cinput:focus-within {
  border-color: #38BDF8;
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.22);
}
html.dark .gc .cinput svg {
  color: #94A3B8;
}
html.dark .gc .cinput input[type=month] {
  color-scheme: dark;
  background: transparent;
  color: #F8FAFC;
}
html.dark .gc .cinput input[type=month]::-webkit-datetime-edit {
  background: transparent;
  color: #F8FAFC;
}
html.dark .gc .cinput input[type=month]::-webkit-datetime-edit-fields-wrapper {
  background: transparent;
}
html.dark .gc .cinput input[type=month]::-webkit-calendar-picker-indicator {
  cursor: pointer;
  filter: invert(0.8) brightness(1.2);
}
html.dark .gc .role.sel,
html.dark .gc .role-custom.sel {
  background: #18263D;
}
html.dark .gc .role.sel .role-ic {
  background: #1E293B;
  color: #38BDF8;
}
html.dark .gc .time-val b {
  color: #38BDF8;
}
html.dark .gc input[type=range] {
  background: var(--track);
  border: 1px solid #334A6E;
}
html.dark .gc input[type=range]::-webkit-slider-thumb {
  background: #38BDF8;
  border: 3.5px solid #0E1522;
  box-shadow: 0 0 14px rgba(56, 189, 248, 0.7);
}
html.dark .gc input[type=range]::-moz-range-thumb {
  background: #38BDF8;
  border: 3.5px solid #0E1522;
  box-shadow: 0 0 14px rgba(56, 189, 248, 0.7);
}
html.dark .gc .meter {
  background: linear-gradient(165deg, #0E1522, #121B2C 60%, #0F1726);
  border-color: #24334A;
}
html.dark .gc .callout {
  background: #131E30;
  border-color: #22344E;
}
html.dark .gc .pstep .pic {
  background: #1E293B;
  color: #CBD5E1;
}

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

export default function GoalCompass({ topicRatings = [], detectedYears = 0, initialGoal = '', onCreate, onBack }) {
  // Auto-suggested from the learner's real resume skills (or goal-text
  // keywords when there's no resume yet) instead of always defaulting to
  // the same role regardless of who they actually are.
  const defaultSuggestedRole = suggestRole(topicRatings, initialGoal)
  const [role, setRole] = useState(() => defaultSuggestedRole)
  const [customRoleName, setCustomRoleName] = useState('')
  const suggestedRoleName = ROLES[defaultSuggestedRole].name
  const [goal, setGoal] = useState(
    initialGoal || `I want to become a ${suggestedRoleName} within 6 months.`
  )
  const [weekly, setWeekly] = useState(8)
  const [target, setTarget] = useState(defaultTargetMonth())
  const [priority, setPriority] = useState('intern')

  const isCustomRole = role === 'custom'
  const effectiveRoleName = isCustomRole ? ((customRoleName || '').trim() || 'your custom role') : ROLES[role].name

  // current skills from the resume/assess step
  const current = useMemo(() => {
    const m = {}
    topicRatings.forEach((t) => { m[(t.name || '').toLowerCase()] = LEVEL_TO_NUM[(t.level || 'basic').toLowerCase()] || 35 })
    return m
  }, [topicRatings])

  const calc = useMemo(() => {
    const req = ROLES[role].req
    if (!req) {
      return {
        readiness: null,
        weeksNeeded: null,
        state: 'ok',
        msg: `We'll build your path around "${effectiveRoleName}" using your goal description.`,
        bars: [],
        insight: `Readiness scoring isn't available for a custom role yet — describe your goal below and PathFinder will still tailor real courses to it.`,
      }
    }
    const skills = Object.keys(req)
    let attain = 0, gap = 0
    skills.forEach((s) => {
      const cur = getCategoryScore(s, current)
      attain += Math.min(cur / req[s], 1)
      gap += Math.max(0, req[s] - cur)
    })
    const readiness = Math.min(100, Math.round((attain / skills.length) * 100))
    const estimatedCurriculumHours = Math.max(16, Math.round(55 * (1.15 - (readiness / 100) * 0.45)))
    const weeksNeeded = Math.max(1, Math.ceil(estimatedCurriculumHours / Math.max(1, weekly)))
    const weeksAvail = weeksUntil(target)

    let state = 'ok', msg = `Achievable with ${weekly} hours/week`
    if (weeksNeeded > weeksAvail) {
      const need = Math.ceil(estimatedCurriculumHours / Math.max(1, weeksAvail))
      if (weeksNeeded <= weeksAvail * 1.25) { state = 'warn'; msg = `Tight — try about ${need} hours/week` }
      else { state = 'bad'; msg = (isFinite(weeksAvail) && weeksAvail > 0) ? `Not in time — you'd need ~${need} hours/week` : 'Pick a target date in the future' }
    }

    const bars = skills.map((s) => ({ name: s, cur: getCategoryScore(s, current), req: req[s] }))
    const behind = skills.filter((s) => getCategoryScore(s, current) < req[s]).sort((a, b) => (req[a] - getCategoryScore(a, current)) - (req[b] - getCategoryScore(b, current)))
    const biggest = behind[behind.length - 1]
    const strong = skills.find((s) => getCategoryScore(s, current) >= req[s])
    const insight = biggest
      ? `${strong ? `You're solid in ${strong}. ` : ''}Focus on ${biggest} next — it's your key growth area for ${ROLES[role].name}.`
      : `You have strong foundations for ${ROLES[role].name}. Your path will focus on production projects & advanced patterns.`

    return { readiness, weeksNeeded, state, msg, bars, insight }
  }, [role, weekly, target, current, effectiveRoleName])

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

      <div className="head">
        <div className="head-left">
          <span className="step-badge">
            Step 3 · Goal Compass
          </span>
          <div className="head-title-row">
            <span className="head-icon" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.2 7.8 10.5 10.5 7.8 16.2 13.5 13.5" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <div>
              <h1>Where do you want to go?</h1>
              <p>Tell us your goal. Goal Compass turns it into a realistic, personalized learning path.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-2.5">
          <ThemeToggle />
          <UserProfileDropdown />
        </div>
      </div>

      <div className="cols">
        {/* LEFT */}
        <div className="card">
          <div className="sec">
            <div className="flex items-center justify-between mb-2">
              <h3 className="sec-h" style={{ margin: 0 }}>Describe your goal <span className="text-xs font-bold text-[#0066cc] dark:text-[#38BDF8]">(Required)</span></h3>
              <span className="text-xs text-[#7a7a7a] dark:text-[#94A3B8]">Extend or refine for richer recommendations</span>
            </div>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder={`e.g. I want to become a ${effectiveRoleName} in 6 months with hands-on projects...`}
              spellCheck="false"
            />
            {!(goal || '').trim() && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-semibold">
                Please describe your learning goal before creating your plan.
              </p>
            )}
          </div>

          <div className="sec">
            <h3 className="sec-h">Choose a target role</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              <RoleBtn id="sde" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>} />
              <RoleBtn id="fullstack" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>} />
              <RoleBtn id="aiml" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>} />
              <RoleBtn id="web" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a13 13 0 0 1 0 18 13 13 0 0 1 0-18z" /></svg>} />
              <RoleBtn id="cloud" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.6 1.5A4 4 0 0 0 6.5 19z" /></svg>} />
              <RoleBtn id="da" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M7 15v-4" /><path d="M12 15V8" /><path d="M17 15v-6" /></svg>} />
              <RoleBtn id="product" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><circle cx="9" cy="14" r="2" /><circle cx="15" cy="9" r="2" /><path d="M9 12 15 9" /></svg>} />
              <button
                type="button"
                className={`role-custom ${isCustomRole ? 'sel' : ''}`}
                onClick={() => setRole('custom')}
              >
                <span className="role-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg></span>
                <span className="role-name">Custom role</span>
              </button>
            </div>


            {isCustomRole && (
              <input
                type="text"
                className="custom-input"
                placeholder="Type your target role, e.g. Backend Engineer, UX Designer..."
                value={customRoleName}
                onChange={(e) => setCustomRoleName(e.target.value)}
                autoFocus
              />
            )}

            {!isCustomRole && role === defaultSuggestedRole && (
              <p className="role-suggested">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                Suggested based on {topicRatings.length > 0 ? 'your background skills' : 'your goal'}
              </p>
            )}

            {topicRatings.length > 0 && !isCustomRole && (
              <p className="insight"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" /></svg> Readiness is calculated from the {topicRatings.length} skill{topicRatings.length === 1 ? '' : 's'} in your profile.</p>
            )}
          </div>

          <div className="sec constraints">
            <div className="cfield">
              <label htmlFor="gc-target">Target date</label>
              <div className="cinput"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg><input type="month" id="gc-target" value={target} onChange={(e) => setTarget(e.target.value)} /></div>
            </div>
            <div className="cfield">
              <label htmlFor="gc-weekly">
                Weekly learning time <span className="text-xs font-bold text-[#0066cc] dark:text-[#38BDF8]">(Required)</span>
              </label>
              <div className="time-val"><b>{weekly}</b><span>hours per week</span></div>
              <input
                type="range"
                id="gc-weekly"
                min="2"
                max="30"
                step="1"
                value={weekly}
                onChange={(e) => setWeekly(Number(e.target.value))}
                style={{
                  background: `linear-gradient(to right, var(--range-fill, #0066cc) 0%, var(--range-fill, #0066cc) ${((weekly - 2) / (30 - 2)) * 100}%, var(--track) ${((weekly - 2) / (30 - 2)) * 100}%, var(--track) 100%)`,
                }}
              />
              <div className="range-ends"><span>2h</span><span>30h</span></div>
            </div>
          </div>
        </div>

        {/* RIGHT — meter */}
        <div className="card meter">
          <div className="meter-h"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polygon points="16 8 10.5 10.5 8 16 13.5 13.5" fill="currentColor" stroke="none" /></svg><h2>Ambition–Readiness Meter</h2></div>

          {calc.readiness === null ? (
            // Custom role: no stored requirement thresholds to gauge against,
            // so show an honest placeholder instead of a fake percentage.
            <div className="feasible">
              <span className="fc" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v5M12 16v.5" /></svg></span>
              <span>{calc.msg}</span>
            </div>
          ) : (
            <>
              <div className="gauge-row">
                <div className="gauge">
                  <svg viewBox="0 0 220 124" aria-label={`Readiness ${calc.readiness}%`}>
                    <path d="M20 112 A 90 90 0 0 1 200 112" fill="none" stroke="#e8eef4" strokeWidth="16" strokeLinecap="round" />
                    <path id="gcfill" d="M20 112 A 90 90 0 0 1 200 112" fill="none" stroke="url(#gcgv)" strokeWidth="16" strokeLinecap="round" pathLength="100" strokeDasharray={`${calc.readiness} 100`} />
                    <defs><linearGradient id="gcgv" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#74b1f2" /><stop offset="1" stopColor="#0066cc" /></linearGradient></defs>
                  </svg>
                  <span className="gauge-star" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0066cc" strokeWidth="2" strokeLinejoin="round"><polygon points="12 3 14 10 21 12 14 14 12 21 10 14 3 12 10 10" fill="#dbeafc" /></svg></span>
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
            </>
          )}

          <div className="callout"><span className="ci" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" /></svg></span><p>{calc.insight}</p></div>
        </div>
      </div>

      {/* Path preview */}
      <div className="card preview">
        <h3>Your path preview</h3>
        <div className="preview-top">
          <div className="path">
            {(ROLE_PATH_PREVIEWS[role] || ROLE_PATH_PREVIEWS.custom).map((s, i) => (
              <span key={s.t} style={{ display: 'contents' }}>
                {i > 0 && <svg className="arrow" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>}
                <div className={`pstep ${i === 0 ? 'first' : ''}`}><span className="pic">{PREVIEW_ICONS[s.ic] || PREVIEW_ICONS.code}</span><span>{s.t}</span></div>
              </span>
            ))}
          </div>
          <button
            type="button"
            className="btn-plan"
            disabled={!(goal || '').trim() || !weekly || weekly < 1 || (isCustomRole && !(customRoleName || '').trim())}
            title={
              !(goal || '').trim()
                ? 'Please describe your learning goal before creating your plan'
                : !weekly || weekly < 1
                ? 'Weekly learning time is required before creating your plan'
                : isCustomRole && !(customRoleName || '').trim()
                ? 'Please enter your custom target role'
                : undefined
            }
            onClick={() => {
              const hasRealRole = isCustomRole ? !!(customRoleName || '').trim() : true
              const trimmedGoal = (goal || '').trim()
              const composedGoal = trimmedGoal
                ? `${trimmedGoal} (Target role: ${effectiveRoleName}.)`
                : `I want to become a ${effectiveRoleName}.`
              onCreate(composedGoal, weekly, hasRealRole ? effectiveRoleName : '')
            }}
          >
            Create my learning plan
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </div>
        <button type="button" className="back" onClick={onBack}>← Back to skills</button>
      </div>
    </div>
  )
}
