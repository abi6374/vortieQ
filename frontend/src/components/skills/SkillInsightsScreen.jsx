import React, { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAIChat } from '../../contexts/AIChatContext'
import AppShell from '../layout/AppShell'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import {
  Search,
  Bell,
  ChevronDown,
  Lightbulb,
  Target,
  Sparkles,
  Brain,
  TrendingUp,
  Trophy,
  Flame,
  BookOpen,
  GraduationCap,
  Database,
  Code,
  BarChart3,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  ArrowRight,
  Info,
  Clock,
  SlidersHorizontal,
  RefreshCw,
  User,
  Settings,
  Shield,
  Briefcase,
  Layers,
  ChevronRight,
  Hourglass,
  HelpCircle,
  Compass,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useRoadmap } from '../../hooks/useRoadmap'
import { useStreak } from '../../hooks/useStreak'

/**
 * SkillInsightsScreen Component for PathFinder
 * Pixel-perfect desktop implementation matching the provided reference design.
 *
 * Visual & Functional Architecture:
 * - Top Global Bar: Search input, Notifications with badge, Profile dropdown
 * - Left Fixed Sidebar (255px): Brand, Main Navigation with "Skill Insights" active, Account items, and Promo Card
 * - Main Header: Lightbulb icon, "Skill Insights", Subtitle, Goal selector ("Goal: AIML Engineer Internship"), Last updated timestamp
 * - Top KPI Summary (4 Cards): Overall Skill Readiness (78%), Skills Mastered (3/8), Skills In Progress (4), Skills to Learn (1)
 * - Main Analytics Grid Row 1:
 *     1. Skill Proficiency Comparison (BarChart with dual bars + target outlines + custom labels)
 *     2. Skill Radar (RadarChart with 7 dimensions)
 *     3. Top Skill Gaps (Actionable priority list with High/Medium chips)
 * - Main Analytics Grid Row 2:
 *     1. Learning Trend (AreaChart over 8 weeks + success insight badge)
 *     2. Skill Category Breakdown (Donut chart with center 78% callout)
 *     3. Recommended Focus (Priority banner + 3 actionable next steps)
 * - Deep Analytics & AI Insights Section (Toggleable/Expandable):
 *     1. Skill-Gap Heatmap Matrix
 *     2. Learning Velocity (2.4 skills/wk sparkline)
 *     3. Time Spent by Category (24.5 hrs donut)
 *     4. Top Strengths List
 *     5. AI-Powered PathFinder Explanation ("Ask PathFinder why →")
 * - Interactive Modals: Skill drill-down, Goal selector, AI Coach drawer
 */
export default function SkillInsightsScreen() {
  const navigate = useNavigate()
  const { open: openAICoach, send: sendToAICoach } = useAIChat()
  const { user, signOut } = useAuth()
  const roadmap = useRoadmap()
  const streak = useStreak()

  // State Management
  const [activeNav, setActiveNav] = useState('skills')
  const [trendTimeframe, setTrendTimeframe] = useState('Last 8 Weeks')
  const [isTrendDropdownOpen, setIsTrendDropdownOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [selectedSkillModal, setSelectedSkillModal] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const searchContainerRef = useRef(null)
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'deep_analytics' | 'heatmap'

  // Tooltip hover states for info icons
  const [activeTooltip, setActiveTooltip] = useState(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNavClick = (navId) => {
    setActiveNav(navId)
    if (navId === 'roadmap') {
      navigate('/dashboard')
    } else if (navId === 'progress') {
      navigate('/progress')
    } else if (navId === 'resources') {
      navigate('/resources')
    } else if (navId === 'coach') {
      openAICoach()
    }
  }

  // ---------------------------------------------------------------------------
  // DATASETS FOR RECHARTS & CUSTOM VISUALS — REAL, derived from roadmap.allSteps'
  // real skill_tags/difficulty/completion (same source as the /progress rebuild).
  // There's no stored per-skill "target" or category taxonomy, so:
  //  - target is a uniform 100 (full completion of the steps assigned for that
  //    skill) — the only honest target available, not an invented per-skill goal
  //  - "category" groupings (Programming/Data Analysis/...) are dropped in favor
  //    of the real skill tag names themselves
  // ---------------------------------------------------------------------------

  const cap = (s) => s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  const statusFor = (pct) => {
    if (pct >= 90) return 'Mastered'
    if (pct >= 65) return 'Developing'
    if (pct >= 40) return 'Medium'
    return 'High Priority'
  }

  const skillTagStats = {}
  roadmap.allSteps.forEach((step) => {
    ;(step.skill_tags || []).forEach((tag) => {
      if (!skillTagStats[tag]) skillTagStats[tag] = { total: 0, done: 0, hours: 0, byDifficulty: {} }
      const bucket = skillTagStats[tag]
      bucket.total += 1
      if (step.completed) {
        bucket.done += 1
        bucket.hours += step.duration_hrs || 0
      }
      const diff = step.difficulty || 'beginner'
      if (!bucket.byDifficulty[diff]) bucket.byDifficulty[diff] = { total: 0, done: 0 }
      bucket.byDifficulty[diff].total += 1
      if (step.completed) bucket.byDifficulty[diff].done += 1
    })
  })
  const allSkillEntries = Object.entries(skillTagStats)
    .map(([tag, s]) => ({ tag, total: s.total, done: s.done, hours: s.hours, byDifficulty: s.byDifficulty, progress: Math.round((s.done / s.total) * 100) }))
  const topSkills = [...allSkillEntries].sort((a, b) => b.total - a.total).slice(0, 8)

  // Search Results
  const matchingSkills = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase().trim()
    return allSkillEntries.filter(
      (s) => s.tag.toLowerCase().includes(q) || cap(s.tag).toLowerCase().includes(q)
    )
  }, [searchQuery, allSkillEntries])

  const matchingSteps = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase().trim()
    return (roadmap.allSteps || [])
      .filter(
        (s) =>
          (s.title || '').toLowerCase().includes(q) ||
          (s.provider || '').toLowerCase().includes(q) ||
          (s.skill_tags || []).some((t) => (t || '').toLowerCase().includes(q))
      )
      .slice(0, 4)
  }, [searchQuery, roadmap.allSteps])

  // Filtered skills for charts when search is active
  const displayedSkills = useMemo(() => {
    if (matchingSkills.length > 0) return matchingSkills.slice(0, 8)
    return topSkills
  }, [matchingSkills, topSkills])

  // 1. Skill Proficiency Comparison Data (Grouped Bar Chart)
  const proficiencyData = displayedSkills.map((s) => {
    const rawName = cap(s.tag)
    return {
      skill: rawName,
      name: rawName,
      current: s.progress,
      target: 100,
      gap: 100 - s.progress,
      status: statusFor(s.progress),
    }
  })

  // 2. Radar Chart Data — same real skills, reshaped.
  const radarData = displayedSkills.slice(0, 7).map((s) => ({
    skill: cap(s.tag),
    current: s.progress,
    target: 100,
  }))

  // 3. Learning Trend Data — cumulative real completion mapped onto the
  // roadmap's own real week axis (same computation as /progress dataset #1).
  const trendTotalSteps = roadmap.totalSteps || 0
  let _trendCumulative = 0
  const trendData = roadmap.weeks.map((w) => {
    _trendCumulative += w.completed_steps || 0
    return {
      week: `W${w.week_number}`,
      readiness: trendTotalSteps ? Math.round((_trendCumulative / trendTotalSteps) * 100) : 0,
    }
  })

  // 4. Skill Breakdown by real tag (step-count share) — donut chart.
  const DONUT_COLORS = ['#0066cc', '#5B8DEF', '#18A999', '#E96A91', '#F2A33A', '#61a9f5', '#22A06B', '#DC7633']
  const totalTaggedSteps = allSkillEntries.reduce((a, s) => a + s.total, 0)
  const categoryData = topSkills.slice(0, 6).map((s, i) => ({
    name: cap(s.tag),
    value: totalTaggedSteps ? Math.round((s.total / totalTaggedSteps) * 100) : 0,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }))

  // 5. Time Spent by real tag (real duration_hrs of completed steps) — donut chart.
  const totalTaggedHours = allSkillEntries.reduce((a, s) => a + s.hours, 0) || 1
  const timeSpentData = [...allSkillEntries]
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 4)
    .map((s, i) => ({
      name: cap(s.tag),
      value: Math.round((s.hours / totalTaggedHours) * 100),
      hours: `${s.hours.toFixed(1)}h`,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    }))

  // 6. Top Strengths — real skills ranked by real completion %.
  const strengthsList = [...allSkillEntries]
    .filter((s) => s.progress > 0)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 5)
    .map((s, i) => ({ rank: i + 1, name: cap(s.tag), score: s.progress }))

  // 7. Heatmap Matrix — real completion % per (skill tag, real difficulty level).
  const DIFFICULTY_ROWS = [
    { key: 'beginner', level: 'Foundations' },
    { key: 'intermediate', level: 'Intermediate' },
    { key: 'advanced', level: 'Advanced' },
  ]
  const heatmapSkills = topSkills.slice(0, 5)
  const heatmapData = DIFFICULTY_ROWS.map((row) => {
    const out = { level: row.level }
    heatmapSkills.forEach((s) => {
      const cell = s.byDifficulty[row.key]
      out[s.tag] = cell ? Math.round((cell.done / cell.total) * 100) : null
    })
    return out
  })

  // Real KPI summary + velocity/insight stats, all derived from the same
  // real allSkillEntries/roadmap/streak data above.
  const totalSkillsCount = allSkillEntries.length
  const masteredSkillsCount = allSkillEntries.filter((s) => s.progress >= 90).length
  const inProgressSkillsCount = allSkillEntries.filter((s) => s.progress > 0 && s.progress < 90).length
  const toLearnSkillsCount = allSkillEntries.filter((s) => s.progress === 0).length
  const totalRealHours = allSkillEntries.reduce((a, s) => a + s.hours, 0)
  // Real pace: total real steps completed per week elapsed so far. Labeled
  // "steps/week" rather than "skills/week" - we can't measure discrete
  // skills gained per week without a stored time series, but step
  // completion pace is directly real and computable.
  const stepsPerWeek = roadmap.currentWeek ? Math.round((roadmap.completedSteps / roadmap.currentWeek) * 10) / 10 : 0
  const topStrength = strengthsList[0]
  const biggestGap = [...allSkillEntries].sort((a, b) => a.progress - b.progress)[0]

  // "Recommended Focus" panel — the learner's real next 3 not-started steps.
  const FOCUS_ICONS = [Target, Sparkles, Briefcase]
  const recommendedFocus = roadmap.allSteps
    .filter((s) => s.status === 'not_started')
    .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0))
    .slice(0, 3)
    .map((s, i) => ({
      title: s.title,
      subtitle: s.duration_hrs ? `Estimated time: ${s.duration_hrs}h` : (s.milestone_label || ''),
      icon: FOCUS_ICONS[i % FOCUS_ICONS.length],
    }))

  // "Top Skill Gaps" panel — real skills ranked by real gap (100 - progress),
  // with a real remaining-course count instead of an invented curriculum blurb.
  const GAP_ICONS = [Brain, BarChart3, Layers, Briefcase, Database, Code]
  const topGaps = [...allSkillEntries]
    .filter((s) => s.progress < 100)
    .sort((a, b) => a.progress - b.progress)
    .slice(0, 4)
    .map((s, i) => {
      const remaining = s.total - s.done
      return {
        title: cap(s.tag),
        current: `${s.progress}%`,
        target: '100%',
        priority: statusFor(s.progress),
        desc: `${remaining} course${remaining === 1 ? '' : 's'} remaining in your roadmap for this skill.`,
        icon: GAP_ICONS[i % GAP_ICONS.length],
      }
    })

  const getHeatmapColor = (val) => {
    if (val >= 75) return 'bg-[#ECFDF3] dark:bg-emerald-950/70 text-[#22A06B] dark:text-emerald-300 border-[#D1FADF] dark:border-emerald-800' // Strong green
    if (val >= 50) return 'bg-[#FFF7E6] dark:bg-amber-950/70 text-[#D88700] dark:text-amber-300 border-[#FEE4B2] dark:border-amber-800' // Developing amber
    return 'bg-[#FFF0F0] dark:bg-rose-950/70 text-[#E5484D] dark:text-rose-300 border-[#FECDCA] dark:border-rose-800' // Gap red
  }

  // Custom Tick for Bar Chart X-Axis with clean rotation and spacing
  const CustomBarXAxisTick = ({ x, y, payload }) => {
    const val = payload?.value || ''
    const labelMap = {
      'Machine Learning': 'Machine Learning',
      'Business Intelligence': 'Business Intel',
      'Visualization': 'Visualization',
      'Deep Learning': 'Deep Learning',
      'Scikit Learn': 'Scikit-Learn',
      'Scikit-learn': 'Scikit-Learn',
      'Pandas & EDA': 'Pandas & EDA',
      'Portfolio Project': 'Portfolio',
      'Interview Prep': 'Interview Prep',
    }
    const formatted = labelMap[val] || (val.length > 14 ? val.slice(0, 13) + '…' : val)

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={14}
          dx={-2}
          textAnchor="end"
          transform="rotate(-24)"
          className="fill-[#6e6e73] dark:fill-[#94A3B8] font-semibold text-[11px]"
        >
          {formatted}
        </text>
      </g>
    )
  }

  // Custom Bar with Target Outline
  const CustomBarWithTarget = (props) => {
    const { x, y, width, height, value } = props
    const targetHeight = 165 // Reference height inside chart
    const targetY = 20
    const isZero = !value || value === 0

    return (
      <g>
        {/* Dashed Target Box Outline */}
        <rect
          x={x - 2}
          y={targetY}
          width={width + 4}
          height={targetHeight}
          fill="transparent"
          stroke="#d2d2d7"
          className="dark:stroke-[#334155] dark:fill-[#38BDF8]/5"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          rx="6"
        />
        {/* Current Solid Bar */}
        {!isZero && (
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill="#0066cc"
            className="dark:fill-[#38BDF8] transition-all duration-300 hover:opacity-85 cursor-pointer"
            rx="6"
          />
        )}
        {/* Percentage Label */}
        <text
          x={x + width / 2}
          y={isZero ? targetY + targetHeight - 16 : y > targetY + 18 ? y - 6 : y + 14}
          fill="currentColor"
          className="fill-[#1d1d1f] dark:fill-white font-extrabold text-[11px]"
          textAnchor="middle"
        >
          {value || 0}%
        </text>
      </g>
    )
  }

  return (
    <AppShell
      topBar={
        <div className="relative flex-1 max-w-md hidden sm:block" ref={searchContainerRef}>
          <Search className="w-4 h-4 text-[#7a7a7a] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setIsSearchFocused(true)
            }}
            onFocus={() => setIsSearchFocused(true)}
            placeholder="Search courses, skills, resources..."
            className="w-full pl-9 pr-8 py-2 bg-[#f5f5f7] border border-[#f0f0f0] rounded-full text-xs text-[#1d1d1f] placeholder-[#7a7a7a] focus:outline-none focus:border-[#0066cc] focus:bg-white transition-colors shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a7a7a] hover:text-[#1d1d1f] text-xs font-bold p-1 cursor-pointer"
              title="Clear search"
            >
              ✕
            </button>
          )}

          {/* Search Results Dropdown */}
          {isSearchFocused && searchQuery.trim() && (
            <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl border border-[#E6EAF2] shadow-[0_22px_60px_rgba(14,27,56,0.22),0_4px_12px_rgba(14,27,56,0.06)] p-3 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-80 overflow-y-auto">
              {matchingSkills.length === 0 && matchingSteps.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#7a7a7a]">
                  No skills or courses found matching "<strong>{searchQuery}</strong>"
                </div>
              ) : (
                <div className="space-y-3">
                  {matchingSkills.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-[#7a7a7a] uppercase tracking-wider px-2 mb-1.5">
                        Matching Skills ({matchingSkills.length})
                      </div>
                      <div className="space-y-1">
                        {matchingSkills.slice(0, 5).map((s) => (
                          <button
                            key={s.tag}
                            type="button"
                            onClick={() => {
                              setSelectedSkillModal({
                                title: cap(s.tag),
                                desc: `${s.total - s.done} course${s.total - s.done === 1 ? '' : 's'} remaining in your roadmap for this skill.`,
                                current: `${s.progress}%`,
                                target: '100%',
                                priority: statusFor(s.progress),
                              })
                              setIsSearchFocused(false)
                            }}
                            className="w-full text-left p-2 rounded-xl hover:bg-[#eaf2fc] flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-lg bg-[#eaf2fc] text-[#0066cc] flex items-center justify-center text-xs font-bold flex-none">
                                ✦
                              </span>
                              <span className="text-xs font-bold text-[#1d1d1f]">{cap(s.tag)}</span>
                            </div>
                            <span className="text-xs font-bold text-[#0066cc]">{s.progress}%</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {matchingSteps.length > 0 && (
                    <div className="pt-2 border-t border-[#f5f5f7]">
                      <div className="text-[10px] font-bold text-[#7a7a7a] uppercase tracking-wider px-2 mb-1.5">
                        Roadmap Courses & Lessons ({matchingSteps.length})
                      </div>
                      <div className="space-y-1">
                        {matchingSteps.map((step) => (
                          <button
                            key={step.step_id || step.title}
                            type="button"
                            onClick={() => {
                              setIsSearchFocused(false)
                              navigate('/dashboard')
                            }}
                            className="w-full text-left p-2 rounded-xl hover:bg-[#eaf2fc] flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <p className="text-xs font-bold text-[#1d1d1f] truncate">{step.title}</p>
                              <p className="text-[10px] text-[#7a7a7a]">{step.provider || 'Course'} · ~{step.duration_hrs || 2}h</p>
                            </div>
                            <span className="text-[10px] font-bold text-[#0066cc] px-2 py-0.5 rounded bg-[#eaf2fc] flex-none capitalize">
                              {step.status || 'Active'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      }
    >
      <div className="w-full space-y-6 lg:space-y-8 font-['Inter',sans-serif] text-[#1d1d1f]">
        {/* Active Search Filter Banner */}
        {searchQuery.trim() && (
          <div className="p-3.5 bg-[#eaf2fc] border border-[#cfe4fb] rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0066cc]">
              <Search className="w-4 h-4 flex-none" />
              <span>
                Filtered by: "<strong>{searchQuery}</strong>" — showing {matchingSkills.length} matching skill{matchingSkills.length === 1 ? '' : 's'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs font-bold text-[#0066cc] hover:underline cursor-pointer bg-white px-3 py-1 rounded-lg border border-[#cfe4fb]"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* ---------------------------------------------------------------------
            PAGE TITLE ROW: Icon + Heading/Subtitle (Left) + Goal Selector & Timestamp (Right)
           --------------------------------------------------------------------- */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            {/* Purple Icon Badge */}
            <div className="w-11 h-11 rounded-2xl bg-[#eaf2fc] dark:bg-[#1E293B] border border-[#dcecfd] dark:border-[#242E40] text-[#0066cc] dark:text-[#38BDF8] flex items-center justify-center flex-none shadow-sm mt-0.5">
              <Lightbulb className="w-6 h-6" strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="font-['Manrope'] font-extrabold text-2xl sm:text-[30px] lg:text-[32px] text-[#1d1d1f] dark:text-white tracking-tight leading-tight">
                Skill Insights
              </h1>
              <p className="mt-0.5 text-xs sm:text-[14px] text-[#333333] dark:text-[#94A3B8]">
                Understand your strengths, find gaps and focus on what to learn next.
              </p>
            </div>
          </div>

          {/* Right Side: Real Goal & Last Updated (live-computed, so "now") */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 lg:self-center">
            <div className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-[#141A26] border border-[#e0e0e0] dark:border-[#242E40] rounded-xl text-xs font-bold text-[#1d1d1f] dark:text-white shadow-sm max-w-xs">
              <Target className="w-4 h-4 text-[#0066cc] dark:text-[#38BDF8] flex-none" strokeWidth={2.2} />
              <span className="truncate">
                {roadmap.path?.goal_text ? `Goal: ${roadmap.path.goal_text.split('.')[0]}` : 'No active goal yet'}
              </span>
            </div>

            <span className="text-xs font-medium text-[#7a7a7a] dark:text-[#94A3B8] self-center sm:self-auto">
              Last updated: {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* ---------------------------------------------------------------------
            TOP KPI SUMMARY (4 Equal-Height Polished Cards)
           --------------------------------------------------------------------- */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6" aria-label="KPI Cards">
          
          {/* KPI 1: Overall Skill Readiness */}
          <div className="pf-glass-card p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[#eaf2fc] dark:bg-[#1E293B] text-[#0066cc] dark:text-[#38BDF8] flex items-center justify-center flex-none shadow-xs">
                  <BarChart3 className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold text-[#333333] dark:text-[#CBD5E1]">Overall Skill Readiness</span>
              </div>
              <Info
                className="w-3.5 h-3.5 text-[#86868b] dark:text-[#64748B] cursor-pointer hover:text-[#0066cc] dark:hover:text-[#38BDF8]"
                title="Calculated from assessments, completed learning activities, practice performance, and skill progress."
              />
            </div>

            <div className="flex items-baseline gap-3 my-3">
              <span className="font-['Manrope'] font-extrabold text-2xl sm:text-[28px] text-[#1d1d1f] dark:text-white tracking-tight leading-none">
                {roadmap.percent}%
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#22A06B] dark:text-emerald-400 bg-[#ECFDF3] dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-[#D1FADF] dark:border-emerald-800/60">
                <TrendingUp className="w-3 h-3" />
                <span>{roadmap.completedSteps} of {roadmap.totalSteps} steps</span>
              </span>
            </div>

            <div className="w-full bg-[#eef2f6] dark:bg-[#1E2638] h-2 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-[#0066cc] to-[#38bdf8] h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(0,102,204,0.4)]" style={{ width: `${roadmap.percent}%` }} />
            </div>
          </div>

          {/* KPI 2: Skills Mastered */}
          <div className="pf-glass-card p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#22A06B] dark:text-emerald-400 flex items-center justify-center flex-none shadow-xs">
                  <CheckCircle className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold text-[#333333] dark:text-[#CBD5E1]">Skills Mastered</span>
              </div>
              <span className="text-[11px] font-bold text-[#7a7a7a] dark:text-[#94A3B8]">
                {totalSkillsCount ? Math.round((masteredSkillsCount / totalSkillsCount) * 100) : 0}%
              </span>
            </div>

            <div className="my-3">
              <span className="font-['Manrope'] font-extrabold text-2xl sm:text-[28px] text-[#1d1d1f] dark:text-white tracking-tight leading-none">
                {masteredSkillsCount} / {totalSkillsCount}
              </span>
            </div>

            <div className="w-full bg-[#eef2f6] dark:bg-[#1E2638] h-2 rounded-full overflow-hidden">
              <div className="bg-[#22A06B] h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(34,160,107,0.4)]" style={{ width: `${totalSkillsCount ? (masteredSkillsCount / totalSkillsCount) * 100 : 0}%` }} />
            </div>
          </div>

          {/* KPI 3: Skills In Progress */}
          <div className="pf-glass-card p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[#FFF7E6] dark:bg-amber-950/40 text-[#D88700] dark:text-amber-400 flex items-center justify-center flex-none shadow-xs">
                  <Hourglass className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold text-[#333333] dark:text-[#CBD5E1]">Skills In Progress</span>
              </div>
              <span className="text-[11px] font-bold text-[#D88700] dark:text-amber-400">{inProgressSkillsCount > 0 ? 'Keep going!' : '—'}</span>
            </div>

            <div className="my-3">
              <span className="font-['Manrope'] font-extrabold text-2xl sm:text-[28px] text-[#1d1d1f] dark:text-white tracking-tight leading-none">
                {inProgressSkillsCount}
              </span>
            </div>

            <div className="w-full bg-[#eef2f6] dark:bg-[#1E2638] h-2 rounded-full overflow-hidden">
              <div className="bg-[#D88700] h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(216,135,0,0.4)]" style={{ width: `${totalSkillsCount ? (inProgressSkillsCount / totalSkillsCount) * 100 : 0}%` }} />
            </div>
          </div>

          {/* KPI 4: Skills to Learn */}
          <div className="pf-glass-card p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[#eaf2fc] dark:bg-blue-950/40 text-[#5B8DEF] dark:text-blue-400 flex items-center justify-center flex-none shadow-xs">
                  <BookOpen className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold text-[#333333] dark:text-[#CBD5E1]">Skills to Learn</span>
              </div>
              <span className="text-[11px] font-bold text-[#5B8DEF] dark:text-blue-400">{toLearnSkillsCount > 0 ? 'Focus recommended' : '—'}</span>
            </div>

            <div className="my-3">
              <span className="font-['Manrope'] font-extrabold text-2xl sm:text-[28px] text-[#1d1d1f] dark:text-white tracking-tight leading-none">
                {toLearnSkillsCount}
              </span>
            </div>

            <div className="w-full bg-[#eef2f6] dark:bg-[#1E2638] h-2 rounded-full overflow-hidden">
              <div className="bg-[#5B8DEF] h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(91,141,239,0.4)]" style={{ width: `${totalSkillsCount ? (toLearnSkillsCount / totalSkillsCount) * 100 : 0}%` }} />
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------------
            MAIN ANALYTICS GRID - ROW 1:
                1. Skill Proficiency Comparison (Large)
                2. Skill Radar (Medium)
                3. Top Skill Gaps (Right)
               --------------------------------------------------------------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
              
              {/* CARD 1: Skill Proficiency Comparison (5.5 of 12 cols or 6 cols) */}
              <div className="lg:col-span-6 bg-white dark:bg-[#141A26] border border-[#e0e0e0] dark:border-[#242E40] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#f5f5f7] dark:border-[#1E2638]">
                    <div className="flex items-center gap-2">
                      <h2 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white">
                        Skill Proficiency Comparison
                      </h2>
                      <Info
                        className="w-3.5 h-3.5 text-[#86868b] dark:text-[#64748B] cursor-pointer hover:text-[#0066cc] dark:hover:text-[#38BDF8]"
                        title="Current completion compared with full completion of the steps assigned for each skill in your roadmap."
                      />
                    </div>

                    {/* Chart Legend */}
                    <div className="flex items-center gap-4 text-xs font-medium text-[#333333] dark:text-[#CBD5E1]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#0066cc] dark:bg-[#38BDF8]" />
                        <span>Your Level</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 border-t-2 border-dashed border-[#d2d2d7] dark:border-[#64748B]" />
                        <span>Target Level (Internship)</span>
                      </div>
                    </div>
                  </div>

                  {/* Grouped Bar Chart with Target Outline */}
                  <div className="h-72 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={proficiencyData}
                        margin={{ top: 25, right: 15, left: 5, bottom: 45 }}
                        barSize={24}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f7" className="stroke-[#f0f0f0] dark:stroke-[#242E40]" />
                        <XAxis
                          dataKey="skill"
                          axisLine={{ stroke: '#242E40' }}
                          tickLine={false}
                          interval={0}
                          height={55}
                          tick={<CustomBarXAxisTick />}
                        />
                        <YAxis
                          domain={[0, 100]}
                          ticks={[0, 20, 40, 60, 80, 100]}
                          tickFormatter={(val) => `${val}%`}
                          tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 600 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RechartsTooltip
                          cursor={{ fill: 'rgba(56,189,248,0.06)' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload
                              return (
                                <div className="bg-[#1d1d1f] dark:bg-[#0E131E] border border-gray-700 dark:border-[#242E40] text-white p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                                  <div className="font-bold border-b border-gray-700 pb-1 text-[#dbeafc]">{d.name || d.skill}</div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-gray-300">Your Level:</span>
                                    <span className="font-bold text-[#38BDF8]">{d.current}%</span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-gray-300">Target Level:</span>
                                    <span className="font-bold text-gray-200">{d.target}%</span>
                                  </div>
                                  <div className="flex justify-between gap-4 text-[11px] pt-1 text-gray-400">
                                    <span>Gap:</span>
                                    <span className={d.gap > 20 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>{d.gap}%</span>
                                  </div>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Bar
                          dataKey="current"
                          shape={<CustomBarWithTarget />}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* CARD 2: Skill Radar (3.5 of 12 cols) */}
              <div className="lg:col-span-3 bg-white dark:bg-[#141A26] border border-[#e0e0e0] dark:border-[#242E40] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#f5f5f7] dark:border-[#1E2638]">
                    <div className="flex items-center gap-2">
                      <h2 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white">
                        Skill Radar
                      </h2>
                      <Info
                        className="w-3.5 h-3.5 text-[#86868b] dark:text-[#64748B] cursor-pointer hover:text-[#0066cc] dark:hover:text-[#38BDF8]"
                        title="Multidimensional visualization of technical competencies vs role benchmarks."
                      />
                    </div>
                  </div>

                  <div className="h-64 w-full flex items-center justify-center pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} outerRadius="56%">
                        <PolarGrid stroke="#334155" className="stroke-[#e0e0e0] dark:stroke-[#242E40]" />
                        <PolarAngleAxis
                          dataKey="skill"
                          tick={{ fill: '#CBD5E1', fontSize: 10, fontWeight: 600 }}
                          tickFormatter={(val) => {
                            const map = {
                              'Machine Learning': 'ML',
                              'Business Intelligence': 'BI',
                              'Deep Learning': 'DL',
                              'Scikit Learn': 'Scikit',
                              'Scikit-learn': 'Scikit',
                              'Visualization': 'Visuals',
                              'Pandas': 'Pandas',
                              'Analytics': 'Analytics',
                            }
                            return map[val] || (val.length > 10 ? val.slice(0, 9) + '…' : val)
                          }}
                        />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                          name="Target Level"
                          dataKey="target"
                          stroke="#64748B"
                          fill="transparent"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                        />
                        <Radar
                          name="Your Level"
                          dataKey="current"
                          stroke="#38BDF8"
                          fill="#38BDF8"
                          fillOpacity={0.25}
                          strokeWidth={2.5}
                          dot={{ r: 3.5, fill: '#38BDF8', strokeWidth: 1.5, stroke: '#0E131E' }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Radar Legend */}
                <div className="flex items-center justify-center gap-4 text-xs font-medium text-[#333333] dark:text-[#CBD5E1] pt-2 border-t border-[#f5f5f7] dark:border-[#1E2638]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0066cc] dark:bg-[#38BDF8]" />
                    <span>Your Level</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#c3c4c5] dark:bg-[#64748B]" />
                    <span>Target Level</span>
                  </div>
                </div>
              </div>

              {/* CARD 3: Top Skill Gaps (3 of 12 cols) */}
              <div className="lg:col-span-3 bg-white dark:bg-[#141A26] border border-[#e0e0e0] dark:border-[#242E40] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#f5f5f7] dark:border-[#1E2638]">
                    <div className="flex items-center gap-2">
                      <h2 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white">
                        Top Skill Gaps
                      </h2>
                      <Info
                        className="w-3.5 h-3.5 text-[#86868b] dark:text-[#64748B] cursor-pointer hover:text-[#0066cc] dark:hover:text-[#38BDF8]"
                        title="Difference between your current proficiency and the target proficiency for this career goal."
                      />
                    </div>
                  </div>

                  {/* Actionable Gap Rows — real skills, ranked by real gap */}
                  <div className="space-y-3 mt-3">
                    {topGaps.length === 0 && (
                      <p className="text-[11px] text-[#7a7a7a] dark:text-[#94A3B8] italic">No gaps yet — generate a path to see this.</p>
                    )}
                    {topGaps.map((gap) => {
                      const GapIcon = gap.icon
                      const isHigh = gap.priority === 'High Priority'
                      return (
                        <div
                          key={gap.title}
                          className="p-3 rounded-xl border border-[#f5f5f7] dark:border-[#1E2638] hover:border-[#0066cc] dark:hover:border-[#38BDF8] hover:bg-[#fafafb] dark:hover:bg-[#0E131E] cursor-pointer transition-all flex items-center justify-between"
                          onClick={() => setSelectedSkillModal(gap)}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-lg bg-[#eaf2fc] dark:bg-[#1E293B] text-[#0066cc] dark:text-[#38BDF8] flex items-center justify-center flex-none">
                              <GapIcon className="w-4 h-4" />
                            </span>
                            <div>
                              <h4 className="font-bold text-xs text-[#1d1d1f] dark:text-white">{gap.title}</h4>
                              <p className="text-[11px] text-[#7a7a7a] dark:text-[#94A3B8]">Current {gap.current} → Target {gap.target}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                            isHigh
                              ? 'bg-[#FFF0F0] dark:bg-rose-950/40 text-[#E5484D] dark:text-rose-400 border-[#FECDCA] dark:border-rose-800/60'
                              : 'bg-[#FFF7E6] dark:bg-amber-950/40 text-[#D88700] dark:text-amber-400 border-[#FEE4B2] dark:border-amber-800/60'
                          }`}>
                            {gap.priority}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

            </div>

            {/* ---------------------------------------------------------------------
                MAIN ANALYTICS GRID - ROW 2:
                1. Learning Trend (AreaChart + Green Banner)
                2. Skill Category Breakdown (Donut Chart)
                3. Recommended Focus (Actionable Card)
               --------------------------------------------------------------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
              
              {/* CARD 1: Learning Trend (Large, 5.5 of 12 cols) */}
              <div className="lg:col-span-6 bg-white dark:bg-[#141A26] border border-[#e0e0e0] dark:border-[#242E40] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#f5f5f7] dark:border-[#1E2638]">
                    <div className="flex items-center gap-2">
                      <h2 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white">
                        Learning Trend
                      </h2>
                      <Info
                        className="w-3.5 h-3.5 text-[#86868b] dark:text-[#64748B] cursor-pointer hover:text-[#0066cc] dark:hover:text-[#38BDF8]"
                        title="Skill readiness evolution across consecutive study weeks."
                      />
                    </div>

                    {/* Timeframe Filter Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsTrendDropdownOpen((v) => !v)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-[#f5f5f7] dark:bg-[#1E293B] border border-[#f0f0f0] dark:border-[#242E40] rounded-lg text-xs font-semibold text-[#1d1d1f] dark:text-white hover:bg-gray-100 dark:hover:bg-[#242E40]"
                      >
                        <span>{trendTimeframe}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-[#7a7a7a] dark:text-[#94A3B8]" />
                      </button>

                      {isTrendDropdownOpen && (
                        <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-[#141A26] rounded-lg border border-[#e0e0e0] dark:border-[#242E40] shadow-lg p-1 z-20">
                          {['Last 4 Weeks', 'Last 8 Weeks', 'All Time'].map((tf) => (
                            <button
                              key={tf}
                              type="button"
                              onClick={() => {
                                setTrendTimeframe(tf)
                                setIsTrendDropdownOpen(false)
                              }}
                              className="w-full text-left px-2.5 py-1.5 text-xs font-medium hover:bg-[#eaf2fc] dark:hover:bg-[#1E293B] hover:text-[#0066cc] dark:hover:text-[#38BDF8] rounded"
                            >
                              {tf}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Area Chart with Soft Violet Gradient */}
                  <div className="h-44 w-full pt-3 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="violetGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f7" className="stroke-[#f0f0f0] dark:stroke-[#242E40]" />
                        <XAxis
                          dataKey="week"
                          tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }}
                          axisLine={{ stroke: '#242E40' }}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          ticks={[0, 20, 40, 60, 80, 100]}
                          tickFormatter={(v) => `${v}%`}
                          tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 600 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-[#1d1d1f] dark:bg-[#0E131E] border border-gray-700 dark:border-[#242E40] text-white px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-lg">
                                  {payload[0].payload.week}: {payload[0].value}% Readiness
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="readiness"
                          stroke="#38BDF8"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#violetGradient)"
                          dot={{ fill: '#38BDF8', stroke: '#0E131E', strokeWidth: 2, r: 4 }}
                          activeDot={{ fill: '#38BDF8', stroke: '#ffffff', strokeWidth: 2, r: 6 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>

                    {/* Real current readiness, pinned at the latest week */}
                    <div className="absolute top-1 right-2 sm:right-4 bg-[#0066cc] text-white text-[11px] font-extrabold px-2 py-0.5 rounded-md shadow-md">
                      {roadmap.percent}%
                    </div>
                  </div>
                </div>

                {/* Green Insight Banner at bottom */}
                {trendData.length > 1 && (
                  <div className="mt-3 p-3 bg-[#ECFDF3] dark:bg-emerald-950/40 border border-[#D1FADF] dark:border-emerald-800/60 rounded-xl flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-[#22A06B] dark:text-emerald-400 flex-none" />
                    <p className="text-xs font-semibold text-[#1d1d1f] dark:text-white">
                      {(() => {
                        const gain = trendData[trendData.length - 1].readiness - trendData[0].readiness
                        return gain > 0
                          ? `Great progress! Your skill readiness improved by ${gain}% over ${trendData.length} weeks.`
                          : "Complete more steps to build up your readiness trend."
                      })()}
                    </p>
                  </div>
                )}
              </div>

              {/* CARD 2: Skill Category Breakdown (Donut Chart, 3.5 of 12 cols) */}
              <div className="lg:col-span-3 bg-white dark:bg-[#141A26] border border-[#e0e0e0] dark:border-[#242E40] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#f5f5f7] dark:border-[#1E2638]">
                    <div className="flex items-center gap-2">
                      <h2 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white">
                        Skill Category Breakdown
                      </h2>
                      <Info
                        className="w-3.5 h-3.5 text-[#86868b] dark:text-[#64748B] cursor-pointer hover:text-[#0066cc] dark:hover:text-[#38BDF8]"
                        title="Distribution of learning content and assessments by domain."
                      />
                    </div>
                  </div>

                  {/* Donut Chart with Centered 78% Callout */}
                  <div className="h-44 w-full relative flex items-center justify-center pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload
                              return (
                                <div className="bg-[#1d1d1f] dark:bg-[#0E131E] text-white px-2 py-1 rounded-md text-xs font-bold">
                                  {d.name}: {d.value}%
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Centered real overall readiness */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="font-['Manrope'] font-extrabold text-xl text-[#1d1d1f] dark:text-white leading-none">
                        {roadmap.percent}%
                      </span>
                      <span className="text-[10px] font-semibold text-[#7a7a7a] dark:text-[#94A3B8] uppercase tracking-wider mt-0.5">
                        Overall
                      </span>
                    </div>
                  </div>

                  {/* Clean Legend */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] font-medium text-[#333333] dark:text-[#CBD5E1] pt-2 border-t border-[#f5f5f7] dark:border-[#1E2638]">
                    {categoryData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between pr-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: item.color }} />
                          <span className="truncate">{item.name}</span>
                        </div>
                        <span className="font-bold text-[#1d1d1f] dark:text-white">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CARD 3: Recommended Focus (Actionable Card, 3 of 12 cols) */}
              <div className="lg:col-span-3 bg-white dark:bg-[#141A26] border border-[#e0e0e0] dark:border-[#242E40] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#f5f5f7] dark:border-[#1E2638]">
                    <div className="flex items-center gap-2">
                      <h2 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white">
                        Recommended Focus
                      </h2>
                      <Info
                        className="w-3.5 h-3.5 text-[#86868b] dark:text-[#64748B] cursor-pointer hover:text-[#0066cc] dark:hover:text-[#38BDF8]"
                        title="AI-prioritized roadmap steps based on your current skill gaps."
                      />
                    </div>
                  </div>

                  {/* Priority Banner (Green Surface) — real biggest gap */}
                  {biggestGap && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-[#ECFDF3] dark:bg-emerald-950/40 border border-[#D1FADF] dark:border-emerald-800/60 flex items-start gap-2">
                      <Shield className="w-4 h-4 text-[#22A06B] dark:text-emerald-400 flex-none mt-0.5" />
                      <p className="text-[11px] font-bold text-[#1d1d1f] dark:text-white leading-tight">
                        Next Priority: Complete <span className="text-[#0066cc] dark:text-[#38BDF8]">{cap(biggestGap.tag)}</span> to close your biggest real gap
                      </p>
                    </div>
                  )}

                  {/* Real next 3 not-started roadmap steps */}
                  <div className="space-y-3 mt-3">
                    {recommendedFocus.length === 0 && (
                      <p className="text-[11px] text-[#7a7a7a] dark:text-[#94A3B8] italic">You're all caught up on your roadmap!</p>
                    )}
                    {recommendedFocus.map((item) => {
                      const ItemIcon = item.icon
                      return (
                        <div
                          key={item.title}
                          className="p-3 rounded-xl border border-[#f5f5f7] dark:border-[#1E2638] hover:border-[#0066cc] dark:hover:border-[#38BDF8] hover:bg-[#fafafb] dark:hover:bg-[#0E131E] cursor-pointer transition-all flex items-center justify-between group"
                          onClick={() => navigate('/dashboard')}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-[#eaf2fc] dark:bg-[#1E293B] text-[#0066cc] dark:text-[#38BDF8] flex items-center justify-center flex-none">
                              <ItemIcon className="w-3.5 h-3.5" />
                            </span>
                            <div>
                              <h4 className="font-bold text-xs text-[#1d1d1f] dark:text-white group-hover:text-[#0066cc] dark:group-hover:text-[#38BDF8]">
                                {item.title}
                              </h4>
                              <p className="text-[10px] text-[#7a7a7a] dark:text-[#94A3B8]">{item.subtitle}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[#7a7a7a] dark:text-[#94A3B8] group-hover:text-[#0066cc] dark:group-hover:text-[#38BDF8] transition-transform group-hover:translate-x-0.5" />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

            </div>

            {/* ---------------------------------------------------------------------
                SECONDARY DEEP ANALYTICS & AI INSIGHTS
                (Heatmap Matrix, Learning Velocity, Time Spent, Strengths, AI Insight)
               --------------------------------------------------------------------- */}
            <div className="pt-6 border-t border-[#f0f0f0] dark:border-[#1E2638] space-y-6">
              
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                  <h3 className="font-['Manrope'] font-bold text-lg text-[#1d1d1f] dark:text-white">
                    Skill Matrix & Diagnostic Intelligence
                  </h3>
                  <p className="text-xs text-[#7a7a7a] dark:text-[#94A3B8]">
                    Granular breakdown of competence tiers, learning velocity, and active AI recommendations.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'overview'
                        ? 'bg-[#0066cc] dark:bg-[#38BDF8] text-white dark:text-[#0E131E] shadow-sm'
                        : 'bg-[#f5f5f7] dark:bg-[#1E293B] text-[#333333] dark:text-[#CBD5E1] hover:text-[#1d1d1f] dark:hover:text-white'
                    }`}
                  >
                    Intelligence Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('heatmap')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'heatmap'
                        ? 'bg-[#0066cc] dark:bg-[#38BDF8] text-white dark:text-[#0E131E] shadow-sm'
                        : 'bg-[#f5f5f7] dark:bg-[#1E293B] text-[#333333] dark:text-[#CBD5E1] hover:text-[#1d1d1f] dark:hover:text-white'
                    }`}
                  >
                    Skill-Gap Heatmap
                  </button>
                </div>
              </div>

              {activeTab === 'heatmap' ? (
                /* SKILL GAP HEATMAP MATRIX */
                <div className="bg-white dark:bg-[#141A26] border border-[#e0e0e0] dark:border-[#242E40] rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <span className="font-bold text-sm text-[#1d1d1f] dark:text-white">
                      Tiered Skill-Gap Matrix (Foundations → Intermediate → Advanced)
                    </span>
                    <div className="flex items-center gap-3.5 text-xs font-semibold text-[#333333] dark:text-[#CBD5E1]">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-[#ECFDF3] dark:bg-emerald-950/70 border border-[#D1FADF] dark:border-emerald-800" /> <span className="text-[#22A06B] dark:text-emerald-300">Strong (≥75%)</span></span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-[#FFF7E6] dark:bg-amber-950/70 border border-[#FEE4B2] dark:border-amber-800" /> <span className="text-[#D88700] dark:text-amber-300">Developing (50–74%)</span></span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-[#FFF0F0] dark:bg-rose-950/70 border border-[#FECDCA] dark:border-rose-800" /> <span className="text-[#E5484D] dark:text-rose-300">Priority Gap (&lt;50%)</span></span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-[#f0f0f0] dark:border-[#1E2638] text-[#7a7a7a] dark:text-[#94A3B8]">
                          <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Tier Level</th>
                          {heatmapSkills.map((s) => (
                            <th key={s.tag} className="py-3 px-4 font-bold text-center text-[#1d1d1f] dark:text-white">{cap(s.tag)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {heatmapData.map((row) => (
                          <tr key={row.level} className="border-b border-[#f5f5f7] dark:border-[#1E2638] hover:bg-gray-50/50 dark:hover:bg-[#101622]/50 transition-colors">
                            <td className="py-3.5 px-4 font-extrabold text-[#1d1d1f] dark:text-white">{row.level}</td>
                            {heatmapSkills.map((s) => {
                              const val = row[s.tag]
                              return (
                                <td key={s.tag} className="py-3.5 px-4 text-center">
                                  {val === null ? (
                                    <span className="text-[#c3c4c5] dark:text-[#475569] font-bold">—</span>
                                  ) : (
                                    <span className={`inline-block px-3.5 py-1.5 rounded-lg border font-extrabold text-xs shadow-xs transition-transform hover:scale-105 ${getHeatmapColor(val)}`}>
                                      {val}%
                                    </span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* INTELLIGENCE GRID: 4 Focused Cards */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
                  
                  {/* Card 1: Learning Velocity */}
                  <div className="bg-white dark:bg-[#141A26] border border-[#e0e0e0] dark:border-[#242E40] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#7a7a7a] dark:text-[#94A3B8] uppercase tracking-wider">
                          Learning Pace
                        </span>
                      </div>
                      <h4 className="font-['Manrope'] font-extrabold text-2xl text-[#1d1d1f] dark:text-white">
                        {stepsPerWeek} steps / week
                      </h4>
                      <p className="text-[11px] text-[#333333] dark:text-[#CBD5E1] mt-0.5 font-medium">
                        {roadmap.completedSteps} steps done over {roadmap.currentWeek} week{roadmap.currentWeek === 1 ? '' : 's'}
                      </p>
                    </div>
                    {/* Real cumulative-readiness trend (same series as the chart above) */}
                    <div className="h-10 w-full mt-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData.map((d) => ({ v: d.readiness }))}>
                          <Line type="monotone" dataKey="v" stroke="#0066cc" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Card 2: Time Spent by Category */}
                  <div className="bg-white dark:bg-[#141A26] border border-[#e0e0e0] dark:border-[#242E40] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#7a7a7a] dark:text-[#94A3B8] uppercase tracking-wider">
                          Time Spent
                        </span>
                        <span className="text-[11px] font-bold text-[#0066cc] dark:text-[#38BDF8]">{totalRealHours.toFixed(1)} hrs</span>
                      </div>
                      <div className="space-y-1.5 mt-2">
                        {timeSpentData.map((item) => (
                          <div key={item.name} className="flex justify-between text-[11px]">
                            <span className="text-[#333333] dark:text-[#CBD5E1]">{item.name}</span>
                            <span className="font-bold text-[#1d1d1f] dark:text-white">{item.value}% ({item.hours})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Top Strengths */}
                  <div className="bg-white dark:bg-[#141A26] border border-[#e0e0e0] dark:border-[#242E40] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#7a7a7a] dark:text-[#94A3B8] uppercase tracking-wider">
                          Top Strengths
                        </span>
                        <span className="text-[10px] font-bold text-[#22A06B] dark:text-emerald-400">{strengthsList.length} Skill{strengthsList.length === 1 ? '' : 's'} Strong</span>
                      </div>
                      <div className="space-y-1.5 mt-2">
                        {strengthsList.length === 0 && (
                          <p className="text-[11px] text-[#7a7a7a] dark:text-[#94A3B8] italic">Complete some steps to see your strengths here.</p>
                        )}
                        {strengthsList.slice(0, 4).map((s) => (
                          <div key={s.name} className="flex items-center justify-between text-[11px]">
                            <span className="text-[#1d1d1f] dark:text-white font-semibold truncate">{s.rank}. {s.name}</span>
                            <span className="text-[#22A06B] dark:text-emerald-400 font-bold flex-none">{s.score}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {strengthsList.length > 0 && (
                      <div className="mt-2 text-[10px] text-[#22A06B] dark:text-emerald-400 font-bold bg-[#ECFDF3] dark:bg-emerald-950/40 border border-[#D1FADF] dark:border-emerald-800/60 px-2 py-1 rounded-lg text-center">
                        Great job! Build on these strengths.
                      </div>
                    )}
                  </div>

                  {/* Card 4: AI-Powered PathFinder Explanation */}
                  <div className="bg-[#eaf2fc] dark:bg-[#1E293B] border border-[#dcecfd] dark:border-[#242E40] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-[#0066cc] dark:text-[#38BDF8] mb-1.5">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs font-bold font-['Manrope']">PathFinder insight</span>
                      </div>
                      <p className="text-[11px] text-[#333333] dark:text-[#CBD5E1] leading-relaxed">
                        {topStrength && biggestGap && topStrength.name !== biggestGap.name ? (
                          <>Your strongest foundation is <strong>{topStrength.name}</strong>, while <strong>{biggestGap.name}</strong> is your biggest real gap right now. Focus there next to keep your roadmap moving.</>
                        ) : topStrength ? (
                          <>You're making solid progress across the board — <strong>{topStrength.name}</strong> is your strongest skill at {topStrength.score}%.</>
                        ) : (
                          'Complete a few roadmap steps to start seeing real insights here.'
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        openAICoach()
                        sendToAICoach(biggestGap ? `Why should I prioritize ${cap(biggestGap.tag)}?` : 'What should I focus on next?')
                      }}
                      className="mt-3 text-xs font-bold text-[#0066cc] dark:text-[#38BDF8] hover:underline flex items-center gap-1 self-start cursor-pointer"
                    >
                      <span>Ask PathFinder why</span>
                      <span>→</span>
                    </button>
                  </div>

                </div>
              )}

            </div>
      </div>

        {/* =========================================================================
            SKILL DRILL-DOWN MODAL (Teleported to document.body)
           ========================================================================= */}
        {selectedSkillModal && typeof document !== 'undefined' && createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => setSelectedSkillModal(null)}
          >
            <div
              className="bg-white dark:bg-[#141A26] rounded-2xl border border-[#e0e0e0] dark:border-[#242E40] shadow-2xl max-w-md w-full p-6 relative animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSelectedSkillModal(null)}
                className="absolute top-4 right-4 text-[#7a7a7a] dark:text-[#94A3B8] hover:text-[#1d1d1f] dark:hover:text-white text-sm font-bold w-6 h-6 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
              
              <div className="flex items-center gap-2 text-xs font-bold text-[#0066cc] dark:text-[#38BDF8] bg-[#eaf2fc] dark:bg-[#1E293B] px-2.5 py-1 rounded-md w-fit mb-3">
                <span>Skill Deep-Dive</span>
              </div>

              <h3 className="font-['Manrope'] font-bold text-xl text-[#1d1d1f] dark:text-white">
                {selectedSkillModal.title}
              </h3>
              <p className="text-xs text-[#333333] dark:text-[#94A3B8] mt-1 mb-4">
                {selectedSkillModal.desc}
              </p>

              <div className="grid grid-cols-3 gap-3 p-3 bg-[#fafafb] dark:bg-[#0E131E] rounded-xl border border-[#f0f0f0] dark:border-[#242E40] text-center mb-4">
                <div>
                  <span className="text-[10px] text-[#7a7a7a] dark:text-[#94A3B8] font-bold block">CURRENT</span>
                  <span className="text-base font-extrabold text-[#1d1d1f] dark:text-white">{selectedSkillModal.current}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7a7a7a] dark:text-[#94A3B8] font-bold block">TARGET</span>
                  <span className="text-base font-extrabold text-[#0066cc] dark:text-[#38BDF8]">{selectedSkillModal.target}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7a7a7a] dark:text-[#94A3B8] font-bold block">PRIORITY</span>
                  <span className="text-xs font-extrabold text-[#E5484D] dark:text-rose-400">{selectedSkillModal.priority}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSkillModal(null)
                    navigate('/progress')
                  }}
                  className="flex-1 py-2.5 bg-[#0066cc] hover:bg-[#004fa3] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Start Focused Practice
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const skillName = selectedSkillModal.title
                    setSelectedSkillModal(null)
                    openAICoach()
                    sendToAICoach(`Explain key study topics for ${skillName}`)
                  }}
                  className="px-4 py-2.5 border border-[#0066cc] dark:border-[#38BDF8] text-[#0066cc] dark:text-[#38BDF8] hover:bg-[#eaf2fc] dark:hover:bg-[#1E293B] font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Ask Coach ✨
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </AppShell>
  )
}
