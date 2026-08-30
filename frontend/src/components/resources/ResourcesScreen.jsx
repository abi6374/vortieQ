import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useAIChat } from '../../contexts/AIChatContext'
import { useRoadmap } from '../../hooks/useRoadmap'
import { supabase } from '../../lib/supabaseClient'
import api from '../../lib/apiClient'
import AppShell from '../layout/AppShell'
import GoalSelectorDropdown from '../layout/GoalSelectorDropdown'

/**
 * ResourcesScreen — the "Resources" page from the PathFinder reference.
 * Renders the learner's active-path courses as resource cards, plus a right
 * rail with progress, an AI insight, and recent activity.
 *
 * Live data:
 *   - Active learning_paths row + its path_steps with joined courses (via supabase-js)
 *
 * Display-only (frontend-computed / cosmetic — flagged as such in comments):
 *   - "match %" per resource — derived from milestone position, not a real score
 *   - "Saved for later" — kept in localStorage, per browser
 *   - Weekly resource-activity sparkline — synthesized from local completions
 */

const V = '#0066cc'
const V_DARK = '#004fa3'
const V_SOFT = '#eaf2fc'
const V_BORDER = '#cfe4fb'

// ── Type mapping. We only actually have courses in the DB, so we synthesise
// "type" from difficulty + duration to keep the reference screenshot's variety.
function typeOf(step) {
  // Real filter buckets. DB stores only "courses" so we synthesise the
  // reference screenshot's variety from real signals: URL host, title
  // keywords, milestone label, then duration as a last resort.
  const url = (step.resource_url || '').toLowerCase()
  const title = (step.title || '').toLowerCase()
  const ms = (step.milestone_label || '').toLowerCase()
  const tags = (step.skill_tags || []).map((t) => (t || '').toLowerCase())
  const hasWord = (w) => title.includes(w) || ms.includes(w) || tags.includes(w)
  const dur = step.duration_hrs || 0

  if (url.includes('youtube.') || url.includes('vimeo.') || hasWord('video')) return { kind: 'VIDEO', label: 'Watch video' }
  if (url.includes('docs.') || url.includes('/docs/') || url.includes('developer.mozilla') || hasWord('documentation')) return { kind: 'DOC', label: 'Open docs' }
  if (hasWord('practice') || hasWord('exercise') || hasWord('problem')) return { kind: 'PRACTICE', label: 'Start practice' }
  if (hasWord('project') || hasWord('portfolio') || hasWord('capstone') || dur >= 20) return { kind: 'PROJECT', label: 'View project' }
  if (hasWord('article') || hasWord('blog') || (dur > 0 && dur <= 2)) return { kind: 'ARTICLE', label: 'Read article' }
  return { kind: 'COURSE', label: 'Start learning' }
}

// URL guard so Load-more / Start-learning never render a dead link.
function isSafeUrl(u) {
  if (!u) return false
  try { const p = new URL(u); return p.protocol === 'https:' || p.protocol === 'http:' } catch { return false }
}

const TYPE_META = {
  VIDEO:    { color: V,        bg: V_SOFT,        icon: 'play' },
  ARTICLE:  { color: '#3B82F6', bg: '#EFF6FF',    icon: 'doc' },
  COURSE:   { color: V,        bg: V_SOFT,        icon: 'grad' },
  PRACTICE: { color: '#0EA5E9', bg: '#ECFEFF',    icon: 'target' },
  PROJECT:  { color: '#EC4899', bg: '#FDF2F8',    icon: 'brief' },
  DOC:      { color: '#6e6e73', bg: '#f5f5f5',    icon: 'book' },
}

const STYLES = `
.rx{ --v:#0066cc; --vd:#004fa3; --vsoft:#eaf2fc; --vsoft-2:#f5faff; --vbd:#cfe4fb;
  --navy:#1d1d1f; --slate:#6e6e73; --muted:#86868b; --border:#e0e0e0; --border-l:#f5f5f7;
  --page:#fafafc; --card:#fff; --green:#16A34A; --green-bg:#ECFDF3; --amber:#F59E0B;
  color:var(--navy); font-family:"Inter",system-ui,-apple-system,"Segoe UI",sans-serif;
  -webkit-font-smoothing:antialiased; }
.rx *{ box-sizing:border-box; }

/* Stat icons light mode */
.rx-stat .s-ic { width:38px; height:38px; border-radius:10px; display:grid; place-items:center; flex:none; }
.rx-stat .s-ic.ic-star { background: #eaf2fc; color: #0066cc; border: 1px solid #cfe4fb; }
.rx-stat .s-ic.ic-check { background: #ECFDF3; color: #16A34A; border: 1px solid #B7E7C9; }
.rx-stat .s-ic.ic-saved { background: #EFF6FF; color: #3B82F6; border: 1px solid #DBEAFE; }
.rx-stat .s-ic.ic-time { background: #FFF7E6; color: #F59E0B; border: 1px solid #FDE68A; }

/* Course/Resource icons light mode */
.rx-card .r-ic { width:44px; height:44px; border-radius:12px; display:grid; place-items:center; flex:none; }
.rx-card .r-ic.ic-course, .rx-card .r-ic.ic-video { background: #eaf2fc; color: #0066cc; border: 1px solid #cfe4fb; }
.rx-card .r-ic.ic-article { background: #EFF6FF; color: #3B82F6; border: 1px solid #DBEAFE; }
.rx-card .r-ic.ic-practice { background: #ECFEFF; color: #0EA5E9; border: 1px solid #CFFAFE; }
.rx-card .r-ic.ic-project { background: #FDF2F8; color: #EC4899; border: 1px solid #FCE7F3; }
.rx-card .r-ic.ic-doc { background: #f5f5f5; color: #6e6e73; border: 1px solid #e5e5e5; }

/* ── Dark Mode Overrides ─── */
html.dark .rx {
  --navy: #F9FAFB;
  --slate: #94A3B8;
  --muted: #64748B;
  --border: #242E40;
  --border-l: #1E2638;
  --page: #0B0E14;
  --card: #141A26;
  --vsoft: #1E293B;
  --vsoft-2: #101622;
  --vbd: #242E40;
  --green-bg: rgba(22, 163, 74, 0.15);
}
html.dark .rx-card,
html.dark .rx-panel,
html.dark .rx-stat,
html.dark .rx-goal,
html.dark .rx-view-road,
html.dark .rx-filter,
html.dark .rx-chip,
html.dark .rx-sort,
html.dark .rx-search .s-in {
  background: #141A26 !important;
  border-color: #242E40 !important;
  color: #F9FAFB !important;
}

/* Stat strip icon boxes in dark mode */
html.dark .rx-stat .s-ic.ic-star {
  background: rgba(56, 189, 248, 0.15) !important;
  color: #38BDF8 !important;
  border: 1px solid rgba(56, 189, 248, 0.35) !important;
}
html.dark .rx-stat .s-ic.ic-check {
  background: rgba(34, 197, 94, 0.15) !important;
  color: #4ADE80 !important;
  border: 1px solid rgba(34, 197, 94, 0.35) !important;
}
html.dark .rx-stat .s-ic.ic-saved {
  background: rgba(96, 165, 250, 0.15) !important;
  color: #60A5FA !important;
  border: 1px solid rgba(96, 165, 250, 0.35) !important;
}
html.dark .rx-stat .s-ic.ic-time {
  background: rgba(245, 158, 11, 0.15) !important;
  color: #FBBF24 !important;
  border: 1px solid rgba(245, 158, 11, 0.35) !important;
}

/* Course and Resource icons in dark mode */
html.dark .rx-card .r-ic.ic-course,
html.dark .rx-card .r-ic.ic-video {
  background: rgba(56, 189, 248, 0.15) !important;
  color: #38BDF8 !important;
  border: 1px solid rgba(56, 189, 248, 0.35) !important;
}
html.dark .rx-card .r-ic.ic-article {
  background: rgba(96, 165, 250, 0.15) !important;
  color: #60A5FA !important;
  border: 1px solid rgba(96, 165, 250, 0.35) !important;
}
html.dark .rx-card .r-ic.ic-practice {
  background: rgba(14, 165, 233, 0.15) !important;
  color: #38BDF8 !important;
  border: 1px solid rgba(14, 165, 233, 0.35) !important;
}
html.dark .rx-card .r-ic.ic-project {
  background: rgba(244, 114, 182, 0.15) !important;
  color: #F472B6 !important;
  border: 1px solid rgba(244, 114, 182, 0.35) !important;
}
html.dark .rx-card .r-ic.ic-doc {
  background: rgba(148, 163, 184, 0.15) !important;
  color: #CBD5E1 !important;
  border: 1px solid rgba(148, 163, 184, 0.35) !important;
}

html.dark .rx-insight {
  background: linear-gradient(160deg, #142036, #0E131E) !important;
  border-color: #242E40 !important;
}
html.dark .rx-card .r-type {
  color: #38BDF8 !important;
}
html.dark .rx-card .r-title {
  color: #FFFFFF !important;
}
html.dark .rx-card .r-desc {
  color: #94A3B8 !important;
}
html.dark .rx-card .r-tag {
  background: #0E131E !important;
  color: #CBD5E1 !important;
  border: 1px solid #1E2638 !important;
}
html.dark .rx-card .r-save {
  background: #0E131E !important;
  border-color: #242E40 !important;
  color: #94A3B8 !important;
}
html.dark .rx-saved-item .s-ic {
  background: rgba(56, 189, 248, 0.15) !important;
  color: #38BDF8 !important;
  border: 1px solid rgba(56, 189, 248, 0.25) !important;
}
html.dark .rx-plan-item .chk {
  border-color: #334155 !important;
  background: #0E131E !important;
}
html.dark .rx-plan-item.done .chk {
  background: #16A34A !important;
  border-color: #16A34A !important;
}
html.dark .rx-btn.ghost {
  background: #141A26 !important;
  border-color: #38BDF8 !important;
  color: #38BDF8 !important;
}
html.dark .rx-chip.on {
  background: #0066cc !important;
  border-color: #0066cc !important;
  color: #ffffff !important;
}
html.dark .rx-search input {
  color: #F9FAFB !important;
}
html.dark .rx-search .kbd {
  background: #0E131E !important;
  border-color: #242E40 !important;
  color: #94A3B8 !important;
}
html.dark .rx-bar {
  background: #1E2638 !important;
}

/* ── Main column (lives inside AppShell's .pf-content) ─── */
.rx-main{ display:flex; flex-direction:column; gap:22px; min-width:0; }

.rx-head{ display:flex; justify-content:space-between; align-items:flex-start; gap:20px; flex-wrap:wrap; }
.rx-head h1{ font-family:"Manrope",sans-serif; font-size:26px; font-weight:700; margin:0 0 4px; letter-spacing:-.02em; }
.rx-head .sub{ font-size:13.5px; color:var(--slate); margin:0; }
.rx-head-actions{ display:flex; gap:10px; align-items:center; }
.rx-goal{ display:flex; align-items:center; gap:10px; background:#fff; border:1px solid var(--border);
  border-radius:12px; padding:8px 14px; cursor:pointer; }
.rx-goal svg{ color:var(--v); }
.rx-goal .g-title{ font-size:13.5px; font-weight:600; line-height:1.15; }
.rx-goal .g-sub{ font-size:11.5px; color:var(--muted); }
.rx-view-road{ display:flex; align-items:center; gap:8px; background:#fff; border:1px solid var(--border);
  border-radius:12px; padding:10px 14px; cursor:pointer; font-size:13.5px; font-weight:600; color:var(--navy); }
.rx-view-road svg{ color:var(--v); }
.rx-view-road:hover{ border-color:var(--vbd); }

.rx-picked{ background:linear-gradient(160deg,#fff,var(--vsoft-2)); border:1px solid var(--vbd);
  border-radius:14px; padding:18px 20px; display:flex; align-items:center; gap:16px; }
.rx-picked .p-ic{ width:40px; height:40px; border-radius:10px; background:var(--vsoft); color:var(--v); display:grid; place-items:center; flex:none; }
.rx-picked .p-body{ flex:1; }
.rx-picked h3{ font-family:"Manrope",sans-serif; margin:0 0 3px; font-size:15px; font-weight:700; }
.rx-picked p{ margin:0; font-size:13px; color:var(--slate); }
.rx-picked .p-meta{ font-size:12px; color:var(--muted); }
.rx-picked a{ color:var(--v); font-size:13px; font-weight:600; text-decoration:none; }

/* two-column body */
.rx-body{ display:grid; grid-template-columns:minmax(0,1fr) 310px; gap:24px; align-items:start; min-height:0; }

/* search + filters */
.rx-search{ display:flex; gap:10px; align-items:center; }
.rx-search .s-in{ flex:1; display:flex; align-items:center; gap:9px; background:#fff; border:1px solid var(--border); border-radius:12px; padding:0 14px; height:44px; }
.rx-search .s-in:focus-within{ border-color:var(--v); box-shadow:0 0 0 3px rgba(0,102,204,.15); }
.rx-search .s-in svg{ color:var(--muted); }
.rx-search input{ border:none; outline:none; flex:1; background:none; font:400 14px/1 inherit; color:var(--navy); min-width:0; }
.rx-search input::placeholder{ color:var(--muted); }
.rx-search .kbd{ font-size:11px; color:var(--muted); border:1px solid var(--border); border-radius:6px; padding:2px 6px; background:#fafafc; }
.rx-filter{ display:flex; align-items:center; gap:8px; background:#fff; border:1px solid var(--border); border-radius:12px; padding:10px 14px; font-size:13.5px; font-weight:600; cursor:pointer; }
.rx-filter:hover{ border-color:var(--vbd); }

.rx-chips{ display:flex; gap:8px; flex-wrap:wrap; }
.rx-chip{ background:#fff; border:1px solid var(--border); border-radius:999px; padding:7px 14px; font-size:13px; font-weight:600; color:#333333; cursor:pointer; }
.rx-chip:hover{ border-color:var(--vbd); }
.rx-chip.on{ background:var(--v); border-color:var(--v); color:#fff; }

/* stat strip */
.rx-stats{ display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
.rx-stat{ background:#fff; border:1px solid var(--border); border-radius:12px; padding:14px; display:flex; gap:12px; align-items:center; }
.rx-stat .s-ic{ width:36px; height:36px; border-radius:10px; display:grid; place-items:center; flex:none; }
.rx-stat .s-num{ font-family:"Manrope",sans-serif; font-weight:800; font-size:18px; letter-spacing:-.01em; }
.rx-stat .s-lbl{ font-size:12px; color:var(--slate); }

/* recommended list */
.rx-sec-h{ display:flex; align-items:center; justify-content:space-between; margin:8px 0 12px; }
.rx-sec-h h2{ font-family:"Manrope",sans-serif; font-size:16px; font-weight:700; margin:0; letter-spacing:-.01em; }
.rx-sec-h .sub{ font-size:12.5px; color:var(--muted); margin:2px 0 0; }
.rx-sort{ background:#fff; border:1px solid var(--border); border-radius:10px; padding:6px 12px; font-size:12.5px; color:#333333; cursor:pointer; }

.rx-list{ display:flex; flex-direction:column; gap:10px; max-height:calc(100dvh - 300px); overflow-y:auto; padding-right:4px; }
.rx-card{ display:grid; grid-template-columns:60px 1fr auto auto auto; gap:14px; align-items:center;
  background:#fff; border:1px solid var(--border); border-radius:14px; padding:14px 16px; transition:border-color .15s, box-shadow .15s; }
.rx-card:hover{ border-color:var(--vbd); box-shadow:0 4px 14px rgba(0,102,204,.06); }
.rx-card .r-ic{ width:44px; height:44px; border-radius:12px; display:grid; place-items:center; flex:none; }
.rx-card .r-body{ min-width:0; }
.rx-card .r-type{ font-family:"Manrope",sans-serif; font-size:10.5px; font-weight:700; letter-spacing:.06em; color:var(--muted); margin-bottom:3px; }
.rx-card .r-title{ font-family:"Manrope",sans-serif; font-size:14.5px; font-weight:700; color:var(--navy); margin:0 0 4px; letter-spacing:-.01em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.rx-card .r-desc{ font-size:13px; color:var(--slate); margin:0; line-height:1.35; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; }
.rx-card .r-tags{ display:flex; gap:6px; margin-top:6px; flex-wrap:wrap; }
.rx-card .r-tag{ font-size:11px; padding:2.5px 8px; background:#f5f5f5; color:#333333; border-radius:999px; font-weight:600; }
.rx-card .r-match{ text-align:right; }
.rx-card .r-match .pct{ font-family:"Manrope",sans-serif; color:var(--green); font-weight:700; font-size:13px; }
.rx-card .r-match .why{ font-size:11px; color:var(--muted); max-width:150px; line-height:1.3; }
.rx-card .r-save{ width:34px; height:34px; border-radius:10px; border:1px solid var(--border); background:#fff; cursor:pointer; display:grid; place-items:center; color:#86868b; }
.rx-card .r-save.on{ color:var(--v); background:var(--vsoft); border-color:var(--vbd); }
.rx-card .r-save:hover{ color:var(--v); }
.rx-btn{ display:inline-flex; align-items:center; gap:6px; height:36px; padding:0 14px; border-radius:9px; font-size:13px; font-weight:600; cursor:pointer; border:1px solid var(--v); background:var(--v); color:#fff; }
.rx-btn:hover{ background:var(--vd); border-color:var(--vd); }
.rx-btn.ghost{ background:#fff; color:var(--v); }
.rx-btn.ghost:hover{ background:var(--vsoft); }
.rx-btn.done{ background:var(--green-bg); color:var(--green); border-color:#B7E7C9; }
.rx-btn.done:hover{ background:#DCF7E5; }

.rx-load{ display:flex; justify-content:center; margin-top:8px; }
.rx-load button{ background:none; border:none; color:var(--v); font-size:13px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px; }

/* right rail */
.rx-rail{ display:flex; flex-direction:column; gap:14px; position:sticky; top:0; align-self:start; }
.rx-panel{ background:#fff; border:1px solid var(--border); border-radius:14px; padding:16px 18px; }
.rx-panel h3{ display:flex; align-items:center; gap:8px; font-family:"Manrope",sans-serif; font-size:14px; font-weight:700; margin:0 0 12px; letter-spacing:-.01em; }
.rx-panel h3 svg{ color:var(--v); flex:none; }
.rx-panel .p-sub{ font-size:12px; color:var(--muted); margin:-8px 0 12px; }
.rx-plan-top{ display:flex; justify-content:space-between; align-items:baseline; margin-bottom:12px; }
.rx-plan-top .lft{ font-size:13px; color:var(--slate); }
.rx-plan-top .lft b{ display:block; color:var(--navy); font-size:15px; font-family:"Manrope",sans-serif; }
.rx-plan-top .rgt{ font-size:12.5px; color:var(--muted); }
.rx-plan-top .rgt b{ color:var(--navy); font-weight:700; font-family:"Manrope",sans-serif; }
.rx-bar{ height:8px; background:#f5f5f7; border-radius:999px; overflow:hidden; margin-bottom:14px; }
.rx-bar > i{ display:block; height:100%; background:linear-gradient(90deg,var(--v),#4f9df0); border-radius:999px; }
.rx-plan-items{ display:flex; flex-direction:column; gap:9px; }
.rx-plan-item{ display:flex; align-items:center; gap:10px; font-size:13px; color:var(--slate); }
.rx-plan-item .chk{ width:18px; height:18px; border-radius:50%; border:1.5px solid #d5d6d7; flex:none; display:grid; place-items:center; color:#fff; }
.rx-plan-item.done .chk{ background:var(--green); border-color:var(--green); }
.rx-plan-item.done{ color:var(--navy); text-decoration:line-through; text-decoration-color:#d5d6d7; }
.rx-plan-item .time{ margin-left:auto; font-size:11.5px; color:var(--muted); }
.rx-continue{ margin-top:14px; display:block; width:100%; background:var(--v); color:#fff; border:none; border-radius:10px; padding:11px; font-weight:700; font-size:13.5px; cursor:pointer; font-family:"Manrope",sans-serif; }
.rx-continue:hover{ background:var(--vd); }

.rx-insight{ background:linear-gradient(160deg,var(--vsoft),var(--vsoft-2)); border:1px solid var(--vbd); }
.rx-insight p{ font-size:13px; color:var(--navy); margin:0 0 10px; line-height:1.5; }
.rx-insight .ask{ background:none; border:none; padding:0; font-size:12.5px; font-weight:700; color:var(--v); cursor:pointer; font-family:"Manrope",sans-serif; }

.rx-saved-list{ display:flex; flex-direction:column; gap:10px; }
.rx-saved-item{ display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--border-l); }
.rx-saved-item:last-child{ border-bottom:none; padding-bottom:0; }
.rx-saved-item .s-ic{ width:26px; height:26px; border-radius:7px; display:grid; place-items:center; flex:none; background:var(--vsoft); color:var(--v); }
.rx-saved-item .s-body{ flex:1; min-width:0; }
.rx-saved-item .s-t{ font-size:12.5px; font-weight:600; color:var(--navy); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-family:"Manrope",sans-serif; }
.rx-saved-item .s-m{ font-size:11px; color:var(--muted); }
.rx-saved-item .s-bm{ color:var(--v); cursor:pointer; }

.rx-empty{ text-align:center; padding:36px 12px; color:var(--muted); font-size:13.5px; }
.rx-empty h4{ font-size:16px; color:var(--navy); margin:0 0 6px; font-family:"Manrope",sans-serif; }
.rx-empty button{ margin-top:12px; background:var(--v); color:#fff; border:none; border-radius:10px; padding:9px 18px; font-weight:600; cursor:pointer; font-family:"Manrope",sans-serif; }

@media (max-width:1080px){ .rx-body{ grid-template-columns:1fr; } .rx-rail{ position:static; } .rx-list{ max-height:none; overflow-y:visible; } }
@media (max-width:820px){ .rx-stats{ grid-template-columns:repeat(2,1fr); } .rx-card{ grid-template-columns:44px 1fr auto; } .rx-card .r-match{ display:none; } .rx-card .r-desc{ display:none; } }
@media (prefers-reduced-motion:reduce){ .rx *{ transition:none !important; } }
`

const CHIPS = ['All', 'Recommended', 'Videos', 'Articles', 'Courses', 'Practice', 'Projects', 'Documentation']
const CHIP_TO_TYPE = { All: null, Recommended: null, Videos: 'VIDEO', Articles: 'ARTICLE', Courses: 'COURSE', Practice: 'PRACTICE', Projects: 'PROJECT', Documentation: 'DOC' }

// ── Icons ───────────────────────────────────────────────
const I = {
  map:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/></svg>,
  trend: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 20V4M7 20v-8M11 20V8M15 20v-6M19 20V6"/></svg>,
  radar: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>,
  book:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 0-2 2z"/><path d="M4 5v14"/></svg>,
  chat:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 1 1-4.9-7.4L21 3l-1.4 4.9A7.9 7.9 0 0 1 21 12z"/></svg>,
  play:  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="7 5 20 12 7 19"/></svg>,
  doc:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg>,
  grad:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 10 12 5l10 5-10 5-10-5z"/><path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5"/></svg>,
  target:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>,
  brief: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  check: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  star:  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2"/></svg>,
  bell:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/></svg>,
  cal:   <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  bookmark: (on) => <svg width="15" height="15" viewBox="0 0 24 24" fill={on?'currentColor':'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21 12 16l-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>,
  search:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>,
  slider:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h10M4 18h6"/></svg>,
  chev:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>,
  arrow: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
  spark: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2"/></svg>,
  clock: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
}

// ── Component ───────────────────────────────────────────
export default function ResourcesScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { open: openAICoach } = useAIChat()
  // Real current week + real per-week NPTEL/web-search resources - same
  // single source of truth the dashboard uses (GET /api/roadmap), so "this
  // week" here actually means the same week as everywhere else in the app.
  const roadmap = useRoadmap()

  const [loading, setLoading] = useState(true)
  const [path, setPath] = useState(null)
  const [steps, setSteps] = useState([])
  const [saved, setSaved] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('rx.saved') || '[]')) } catch { return new Set() }
  })
  const [chip, setChip] = useState('All')
  const [query, setQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(8)   // paginated by "Load more"
  const [showFilters, setShowFilters] = useState(false)
  const [whyOpen, setWhyOpen] = useState(false)
  const [difficultyFilter, setDifficultyFilter] = useState('all')  // all|beginner|intermediate|advanced
  const [durationFilter, setDurationFilter] = useState('all')      // all|short|medium|long
  const [openMatchFor, setOpenMatchFor] = useState(null)           // step_id for the Why popover

  // Live web-search recommendations — real results fetched from the backend
  // (DuckDuckGo, no API key) to supplement the fixed 80-course dataset.
  const [webQuery, setWebQuery] = useState('')
  const [webResults, setWebResults] = useState([])
  const [webLoading, setWebLoading] = useState(false)
  const [webError, setWebError] = useState('')
  const [webSearched, setWebSearched] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user) return
      try {
        const { data: paths } = await supabase
          .from('learning_paths').select('id, goal_text, status, generated_at')
          .eq('user_id', user.id).eq('status', 'active')
          .order('generated_at', { ascending: false }).limit(1)
        const p = paths?.[0]
        if (!p) {
          const { data: allCourses } = await supabase.from('courses').select('*').limit(20)
          if (!cancelled && allCourses && allCourses.length > 0) {
            setSteps(allCourses.map((c, i) => ({
              id: c.id || `course-${i}`,
              status: 'not_started',
              milestone_label: 'Catalog',
              explanation: c.description || '',
              seq: i + 1,
              weekNumber: 1,
              title: c.title,
              description: c.description,
              provider: c.provider,
              difficulty: c.difficulty || 'beginner',
              duration_hrs: c.duration_hrs || 10,
              resource_url: c.resource_url,
              skill_tags: c.skill_tags || [],
            })))
            setPath({ goal_text: 'AIML Engineer & Data Analytics' })
          } else if (!cancelled) {
            setPath(null)
          }
          if (!cancelled) setLoading(false)
          return
        }
        const { data: rows } = await supabase
          .from('path_steps')
          .select('id, sequence_order, status, milestone_label, explanation, week_number, courses(id, title, description, provider, difficulty, duration_hrs, resource_url, skill_tags)')
          .eq('path_id', p.id).order('sequence_order')
        if (cancelled) return
        setPath(p)
        setSteps(
          (rows || []).map((r) => ({
            id: r.id, status: r.status, milestone_label: r.milestone_label, explanation: r.explanation, seq: r.sequence_order,
            weekNumber: r.week_number || 1,
            title: r.courses?.title || 'Course', description: r.courses?.description || '',
            provider: r.courses?.provider || '', difficulty: r.courses?.difficulty || 'beginner',
            duration_hrs: r.courses?.duration_hrs || 0, resource_url: r.courses?.resource_url || '',
            skill_tags: r.courses?.skill_tags || [],
          }))
        )
      } catch {}
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [user])

  // Default the web-search box to something sensible once the real path loads.
  useEffect(() => {
    if (!webQuery && path?.goal_text) {
      setWebQuery(path.goal_text.split('.')[0].slice(0, 100))
    }
  }, [path, webQuery])

  // Real classified web resources (videos, articles, docs, practice) to
  // supplement the browsable grid - the seeded 80-course dataset is almost
  // entirely plain "courses", so the Video/Article/Practice/Documentation
  // chips were structurally empty before this (typeOf() had nothing but
  // COURSE/PROJECT-shaped real data to classify). Fetched once automatically
  // (cached 30min server-side, so repeat loads are cheap) using the path's
  // real goal - not the learner's manual search box, which stays independent.
  const [webSteps, setWebSteps] = useState([])
  useEffect(() => {
    let cancelled = false
    async function loadWebSteps() {
      if (!path?.goal_text) return
      try {
        const q = path.goal_text.split('.')[0].slice(0, 100)
        const { data } = await api.get('/api/resources/search', { params: { query: q } })
        if (cancelled) return
        setWebSteps((data.results || []).map((r, i) => {
          let host = ''
          try { host = new URL(r.url).hostname.replace('www.', '') } catch {}
          return {
            id: `web-${i}`, status: 'not_started', milestone_label: '',
            explanation: r.snippet || '', weekNumber: 0,
            title: r.title || r.url, description: r.snippet || '',
            provider: host, difficulty: 'beginner', duration_hrs: 1,
            resource_url: r.url, skill_tags: [], isWebResult: true,
          }
        }))
      } catch { /* supplementary only - never blocks the real course grid */ }
    }
    loadWebSteps()
    return () => { cancelled = true }
  }, [path?.goal_text])

  // Real course steps + real classified web resources, combined for the
  // browsable/filterable grid only - progress stats (completedCount,
  // totalHours, etc.) stay based on `steps` alone so web results (which
  // aren't part of the learner's actual path) never inflate real progress.
  const browsableItems = useMemo(() => [...steps, ...webSteps], [steps, webSteps])

  const handleWebSearch = async (e) => {
    e?.preventDefault()
    const q = webQuery.trim()
    if (!q) return
    setWebLoading(true)
    setWebError('')
    try {
      const { data } = await api.get('/api/resources/search', { params: { query: q } })
      setWebResults(data.results || [])
      setWebSearched(true)
    } catch (err) {
      setWebError('Could not fetch live recommendations right now. Please try again.')
    } finally {
      setWebLoading(false)
    }
  }

  const toggleSave = (id) => setSaved((s) => {
    const next = new Set(s)
    if (next.has(id)) next.delete(id); else next.add(id)
    try { localStorage.setItem('rx.saved', JSON.stringify([...next])) } catch {}
    return next
  })

  const completedCount = steps.filter((s) => s.status === 'completed').length
  const totalHours = steps.reduce((a, s) => a + (s.duration_hrs || 0), 0)
  const activeSteps = steps.filter((s) => s.status !== 'completed')
  const completedHrs = steps.filter((s) => s.status === 'completed').reduce((a, s) => a + (s.duration_hrs || 0), 0)

  const filtered = useMemo(() => {
    const typeFilter = CHIP_TO_TYPE[chip]
    const q = query.trim().toLowerCase()
    return browsableItems
      .map((s) => ({ ...s, _type: typeOf(s).kind }))
      .filter((s) => (chip === 'Recommended' ? s.status === 'not_started' : true))
      .filter((s) => (typeFilter ? s._type === typeFilter : true))
      .filter((s) => !q ? true : (s.title.toLowerCase().includes(q) || (s.skill_tags || []).some((t) => t.toLowerCase().includes(q))))
      .filter((s) => difficultyFilter === 'all' ? true : s.difficulty === difficultyFilter)
      .filter((s) => {
        if (durationFilter === 'all') return true
        const d = s.duration_hrs || 0
        if (durationFilter === 'short') return d <= 5
        if (durationFilter === 'medium') return d > 5 && d <= 15
        return d > 15
      })
  }, [browsableItems, chip, query, difficultyFilter, durationFilter])

  useEffect(() => { setVisibleCount(8) }, [chip, query, difficultyFilter, durationFilter])

  // Real "this week" filtering (was just the first 4 non-completed steps
  // overall, mislabeled "This week" regardless of which week they were
  // actually in). Falls back to the old behavior only if the roadmap hook
  // hasn't resolved a current week yet.
  const thisWeekActive = roadmap.currentWeek
    ? activeSteps.filter((s) => s.weekNumber === roadmap.currentWeek)
    : []
  const nextThree = (thisWeekActive.length ? thisWeekActive : activeSteps).slice(0, 4)
  const savedItems = steps.filter((s) => saved.has(s.id)).slice(0, 3)
  const recent = steps.filter((s) => s.status === 'completed').slice(-3).reverse()

  // synthetic match % — higher for earlier not_started steps, purely display
  const matchFor = (s) => {
    if (s.status === 'completed') return null
    const idx = activeSteps.findIndex((x) => x.id === s.id)
    return Math.max(70, 98 - idx * 3)
  }

  return (
    <AppShell
      topBar={
        <div className="flex items-center gap-3">
          <GoalSelectorDropdown
            activePath={path || roadmap.path}
            onSelectPath={(p) => {
              if (p?.id) navigate(`/roadmap/${p.id}`)
            }}
          />
          <button
            type="button"
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 border border-[#0066cc] dark:border-[#38BDF8] text-[#0066cc] dark:text-[#38BDF8] hover:bg-[#0066cc] dark:hover:bg-[#38BDF8] hover:text-white dark:hover:text-[#0E131E] rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-[0.98] flex-none cursor-pointer"
            onClick={() => (path || roadmap.path) && navigate(`/roadmap/${(path || roadmap.path).id}`)}
          >
            {I.map}
            <span className="hidden sm:inline">View roadmap</span>
          </button>
          <style>{STYLES}</style>
        </div>
      }
    >
    <div className="rx">{whyOpen && (
        <div onClick={() => setWhyOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"grid",placeItems:"center",zIndex:80,padding:20}}>
          <div onClick={(e)=>e.stopPropagation()} className="bg-white dark:bg-[#141A26] border border-[#cfe4fb] dark:border-[#242E40]" style={{borderRadius:16,padding:22,maxWidth:460,width:"100%",boxShadow:"0 20px 40px rgba(0,0,0,.4)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <span className="s-ic ic-star" style={{width:34,height:34,borderRadius:10,display:"grid",placeItems:"center"}}>{I.spark}</span>
              <h3 style={{margin:0,fontFamily:"Manrope,sans-serif",fontSize:17,fontWeight:800}} className="text-[#1d1d1f] dark:text-white">Why these resources?</h3>
            </div>
            <p style={{margin:0,fontSize:13.5,lineHeight:1.55}} className="text-[#6e6e73] dark:text-[#94A3B8]">
              PathFinder ranks these against your active roadmap: your target role, current level, weekly hours, completed courses, and per-topic skill gaps. Courses you have already completed are excluded. The current week’s prerequisites push closest-fit resources to the top.
            </p>
            <button onClick={() => setWhyOpen(false)} style={{marginTop:16,background:"var(--v)",border:"none",color:"#fff",padding:"9px 16px",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer"}}>Got it</button>
          </div>
        </div>
      )}

      <main className="rx-main">
        <header className="rx-head">
          <div>
            <h1>Resources</h1>
            <p className="sub">Personalized learning materials selected for your roadmap and skill goals.</p>
          </div>
        </header>

        <div className="rx-search">
          <div className="s-in">{I.search}<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search courses, videos, articles, documentation, practice..." /><span className="kbd">⌘ K</span></div>
          <button className="rx-filter" onClick={() => setShowFilters((v) => !v)}>{I.slider}Filters{showFilters ? " ▾" : ""}</button>
        </div>

        <div className="rx-chips">
          {CHIPS.map((c) => (<button key={c} className={`rx-chip ${chip === c ? 'on' : ''}`} onClick={() => setChip(c)}>{c}</button>))}
        </div>

        {showFilters && (
          <div className="bg-white dark:bg-[#141A26] border border-[#e0e0e0] dark:border-[#242E40]" style={{borderRadius:12,padding:'14px 16px',display:'flex',gap:22,flexWrap:'wrap',alignItems:'flex-end'}}>
            <div>
              <div style={{fontSize:11.5,fontWeight:700,letterSpacing:.05,color:'var(--muted)',textTransform:'uppercase',marginBottom:6}}>Difficulty</div>
              <div style={{display:'flex',gap:6}}>
                {['all','beginner','intermediate','advanced'].map((d) => (
                  <button key={d} onClick={() => setDifficultyFilter(d)}
                    style={{padding:'6px 12px',borderRadius:999,border:'1px solid '+(difficultyFilter===d?'var(--v)':'var(--border)'),background:difficultyFilter===d?'var(--vsoft)':'#fff',color:difficultyFilter===d?'var(--v)':'#333333',fontSize:12.5,fontWeight:600,cursor:'pointer',textTransform:'capitalize'}}>{d}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:11.5,fontWeight:700,letterSpacing:.05,color:'var(--muted)',textTransform:'uppercase',marginBottom:6}}>Duration</div>
              <div style={{display:'flex',gap:6}}>
                {[['all','Any'],['short','< 5h'],['medium','5–15h'],['long','15h+']].map(([k,l]) => (
                  <button key={k} onClick={() => setDurationFilter(k)}
                    style={{padding:'6px 12px',borderRadius:999,border:'1px solid '+(durationFilter===k?'var(--v)':'var(--border)'),background:durationFilter===k?'var(--vsoft)':'#fff',color:durationFilter===k?'var(--v)':'#333333',fontSize:12.5,fontWeight:600,cursor:'pointer'}}>{l}</button>
                ))}
              </div>
            </div>
            <button onClick={() => { setDifficultyFilter('all'); setDurationFilter('all'); setChip('All'); setQuery('') }}
                    style={{marginLeft:'auto',background:'none',border:'none',color:'var(--v)',fontWeight:600,fontSize:12.5,cursor:'pointer'}}>Reset filters</button>
          </div>
        )}

        <div className="rx-stats">
          <div className="rx-stat"><span className="s-ic ic-star">{I.star}</span><div><div className="s-num">{Math.max(0, steps.length - completedCount)}</div><div className="s-lbl">Recommended</div></div></div>
          <div className="rx-stat"><span className="s-ic ic-check">{I.check}</span><div><div className="s-num">{completedCount}</div><div className="s-lbl">Completed</div></div></div>
          <div className="rx-stat"><span className="s-ic ic-saved">{I.bookmark(true)}</span><div><div className="s-num">{saved.size}</div><div className="s-lbl">Saved</div></div></div>
          <div className="rx-stat"><span className="s-ic ic-time">{I.clock}</span><div><div className="s-num">{completedHrs.toFixed(1)} hrs</div><div className="s-lbl">Learning time</div></div></div>
        </div>

        <div className="rx-body">
          <div>
            <div className="rx-sec-h">
              <div>
                <h2>{chip === 'All' ? 'Recommended for you' : chip}</h2>
                <div className="sub">Based on your current skill gaps and roadmap tasks.</div>
              </div>
              <button className="rx-sort">Best match {I.chev}</button>
            </div>

            {loading ? (
              <div className="rx-empty">Loading your resources…</div>
            ) : filtered.length === 0 ? (
              <div className="rx-empty">
                <h4>No resources yet</h4>
                <div>{path ? "Try a different filter or search." : "Create a learning path to see personalized resources here."}</div>
                {!path && <button onClick={() => navigate('/onboarding')}>Start onboarding</button>}
              </div>
            ) : (
              <div className="rx-list">
                {filtered.slice(0, visibleCount).map((s) => {
                  const t = typeOf(s); const meta = TYPE_META[t.kind]; const isDone = s.status === 'completed'; const m = matchFor(s)
                  const label = isDone ? 'Review' : t.label
                  return (
                    <div key={s.id} className="rx-card">
                      <span className={`r-ic ic-${t.kind.toLowerCase()}`}>{I[meta.icon]}</span>
                      <div className="r-body">
                        <div className="r-type">{t.kind}</div>
                        <h4 className="r-title" title={s.title}>{s.title}</h4>
                        <p className="r-desc" title={s.description}>{s.description}</p>
                        <div className="r-tags">
                          {(s.skill_tags || []).slice(0, 3).map((tg) => (<span key={tg} className="r-tag">{tg}</span>))}
                          {s.provider && <span className="r-tag">{s.provider}</span>}
                          <span className="r-tag">{s.duration_hrs}h</span>
                        </div>
                      </div>
                      <div className="r-match">
                        {m != null ? <><div className="pct">{m}% match</div><div className="why">Based on your active roadmap</div></> : <div className="pct" style={{color:'#16A34A'}}>Completed</div>}
                      </div>
                      <button className={`r-save ${saved.has(s.id) ? 'on' : ''}`} onClick={() => toggleSave(s.id)} aria-label="Save">{I.bookmark(saved.has(s.id))}</button>
                      {isSafeUrl(s.resource_url) ? (
                        <a className={`rx-btn ${isDone ? 'done' : 'ghost'}`} href={s.resource_url} target="_blank" rel="noopener noreferrer">{label}</a>
                      ) : (
                        <button className={`rx-btn ${isDone ? 'done' : 'ghost'}`} disabled title="Link unavailable" style={{opacity:.5,cursor:"not-allowed"}}>{label}</button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {filtered.length > visibleCount && (
              <div className="rx-load"><button onClick={() => setVisibleCount((n) => n + 8)}>Load more resources ({filtered.length - visibleCount} more) {I.chev}</button></div>
            )}
          </div>

          {/* Right rail */}
          <aside className="rx-rail">
            <div className="rx-panel">
              <h3>{I.cal} Your learning plan</h3>
              <div className="rx-plan-top">
                <div className="lft"><b>{Math.min(nextThree.length, 4)} resources</b>This week</div>
                <div className="rgt">{completedCount} of {steps.length} completed<br /><b>{steps.length ? Math.round((completedCount / steps.length) * 100) : 0}%</b></div>
              </div>
              <div className="rx-bar"><i style={{ width: (steps.length ? (completedCount / steps.length) * 100 : 0) + '%' }} /></div>
              <div className="rx-plan-items">
                {nextThree.length === 0 && <div className="p-sub" style={{ margin: 0 }}>You've cleared this week's plan.</div>}
                {nextThree.map((s) => (
                  <div key={s.id} className={`rx-plan-item ${s.status === 'completed' ? 'done' : ''}`}>
                    <span className="chk">{s.status === 'completed' && I.check}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                    <span className="time">{s.duration_hrs || 15} {s.duration_hrs ? 'h' : 'min'}</span>
                  </div>
                ))}
              </div>
              {nextThree[0] && !nextThree[0].status?.includes('completed') && (
                <button className="rx-continue" onClick={() => path && navigate(`/roadmap/${path.id}`)}>Continue learning</button>
              )}
            </div>

            <div className="rx-panel rx-insight">
              <h3>{I.spark} PathFinder recommends</h3>
              <p>
                {activeSteps[0]
                  ? <>Complete <b>{activeSteps[0].title}</b> next to keep momentum on your <b>{path?.goal_text?.split('.')[0] || 'goal'}</b>.</>
                  : path
                    ? "You've cleared your active plan. Generate a new path to keep growing."
                    : "Kick things off with onboarding to get your personalized plan."}
              </p>
              <button className="ask">Ask why →</button>
            </div>

            <div className="rx-panel">
              <h3>{I.spark} Find more resources</h3>
              <p style={{ fontSize: 13, color: 'var(--slate, #333333)', margin: '0 0 10px', lineHeight: 1.5 }}>
                Live web search (incl. NPTEL) to supplement the courses above.
              </p>

              {/* Real, automatic, week-scoped resources - the backend already
                  computes these per week (roadmap_service.get_roadmap() ->
                  web_search_service), shown here by default before the
                  learner even searches manually. */}
              {!webSearched && (() => {
                const wk = roadmap.weeks.find((w) => w.week_number === roadmap.currentWeek)
                const weekResources = wk?.web_resources || []
                if (!weekResources.length) return null
                return (
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 11.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.03em', margin: '0 0 6px' }}>
                      For Week {roadmap.currentWeek}
                    </p>
                    <div className="rx-saved-list">
                      {weekResources.map((r) => (
                        <a
                          key={r.url}
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rx-saved-item"
                          style={{ textDecoration: 'none', cursor: 'pointer' }}
                        >
                          <span className="s-ic">{I.grad}</span>
                          <div className="s-body">
                            <div className="s-t">{r.title || r.url}</div>
                            <div className="s-m" style={{ whiteSpace: 'normal' }}>
                              {(() => { try { return new URL(r.url).hostname.replace('www.', '') } catch { return r.url } })()}
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )
              })()}

              <form onSubmit={handleWebSearch} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                  type="text"
                  value={webQuery}
                  onChange={(e) => setWebQuery(e.target.value)}
                  placeholder="e.g. machine learning, React, SQL..."
                  className="bg-white dark:bg-[#0E131E] border border-[#e0e0e0] dark:border-[#242E40] text-[#1d1d1f] dark:text-white"
                  style={{
                    flex: 1, minWidth: 0, fontSize: 13, padding: '8px 10px',
                    borderRadius: 8, outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={webLoading || !webQuery.trim()}
                  style={{
                    fontSize: 13, fontWeight: 700, color: '#fff', background: V,
                    border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
                    opacity: webLoading || !webQuery.trim() ? 0.6 : 1,
                  }}
                >
                  {webLoading ? '...' : 'Search'}
                </button>
              </form>

              {webError && (
                <p style={{ fontSize: 12.5, color: '#B42318', margin: '0 0 8px' }}>{webError}</p>
              )}

              {webSearched && !webLoading && webResults.length === 0 && !webError && (
                <p style={{ fontSize: 12.5, color: '#7a7a7a', margin: 0 }}>No results found. Try a different search.</p>
              )}

              {webResults.length > 0 && (
                <div className="rx-saved-list">
                  {webResults.map((r) => (
                    <a
                      key={r.url}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rx-saved-item"
                      style={{ textDecoration: 'none', cursor: 'pointer' }}
                    >
                      <span className="s-ic">{I.grad}</span>
                      <div className="s-body">
                        <div className="s-t">{r.title || r.url}</div>
                        <div className="s-m" style={{ whiteSpace: 'normal' }}>{new URL(r.url).hostname.replace('www.', '')}</div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {savedItems.length > 0 && (
              <div className="rx-panel">
                <h3>{I.bookmark(true)} Saved for later</h3>
                <div className="rx-saved-list">
                  {savedItems.map((s) => (
                    <div key={s.id} className="rx-saved-item">
                      <span className="s-ic">{I.grad}</span>
                      <div className="s-body">
                        <div className="s-t">{s.title}</div>
                        <div className="s-m">{typeOf(s).kind} · {s.duration_hrs}h</div>
                      </div>
                      <span className="s-bm" onClick={() => toggleSave(s.id)}>{I.bookmark(true)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recent.length > 0 && (
              <div className="rx-panel">
                <h3>{I.check} Recently completed</h3>
                <div className="rx-saved-list">
                  {recent.map((s) => (
                    <div key={s.id} className="rx-saved-item">
                      <span className="s-ic ic-check">{I.check}</span>
                      <div className="s-body">
                        <div className="s-t">{s.title}</div>
                        <div className="s-m">Completed · {s.duration_hrs}h</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
    </AppShell>
  )
}
