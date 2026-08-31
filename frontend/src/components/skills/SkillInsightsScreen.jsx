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
import { stripEmojis } from '../../utils/textUtils'

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
          className="dark:stroke-[#33333F] dark:fill-[#C9D0D6]/5"
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
            className="dark:fill-[#C9D0D6] transition-all duration-300 hover:opacity-85 cursor-pointer"
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
                              <p className="text-xs font-bold text-[#1d1d1f] truncate">{stripEmojis(step.title)}</p>
                              <p className="text-[10px] text-[#7a7a7a]">{stripEmojis(step.provider) || 'Course'} · ~{step.duration_hrs || 2}h</p>
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
            <div className="w-11 h-11 rounded-2xl bg-[#eaf2fc] dark:bg-[#18181D] border border-[#dcecfd] dark:border-[#27272F] text-[#0066cc] dark:text-[#C9D0D6] flex items-center justify-center flex-none shadow-sm mt-0.5">
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

          {/* Right Side: Last Updated */}
          <div className="flex items-center gap-2 lg:self-center">
            <span className="text-xs font-medium text-[#7a7a7a] dark:text-[#94A3B8]">
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
                <span className="w-7 h-7 rounded-xl bg-[#eaf2fc] dark:bg-[#18181D] text-[#0066cc] dark:text-[#C9D0D6] flex items-center justify-center flex-none shadow-xs">
                  <BarChart3 className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold text-[#333333] dark:text-[#CBD5E1]">Overall Skill Readiness</span>
              </div>
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

            <div className="w-full bg-[#eef2f6] dark:bg-[#202026] h-2 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-[#0066cc] to-[#004fa3] dark:from-[#C9D0D6] dark:to-[#8B949E] h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(0,102,204,0.4)]" style={{ width: `${roadmap.percent}%` }} />
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

            <div className="w-full bg-[#eef2f6] dark:bg-[#202026] h-2 rounded-full overflow-hidden">
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

            <div className="w-full bg-[#eef2f6] dark:bg-[#202026] h-2 rounded-full overflow-hidden">
              <div className="bg-[#D88700] h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(216,135,0,0.4)]" style={{ width: `${totalSkillsCount ? (inProgressSkillsCount / totalSkillsCount) * 100 : 0}%` }} />
            </div>
          </div>

          {/* KPI 4: Skills to Learn */}
          <div className="pf-glass-card p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[#eaf2fc] dark:bg-[#18181D] text-[#5B8DEF] dark:text-[#C9D0D6] flex items-center justify-center flex-none shadow-xs">
                  <BookOpen className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold text-[#333333] dark:text-[#CBD5E1]">Skills to Learn</span>
              </div>
              <span className="text-[11px] font-bold text-[#5B8DEF] dark:text-[#C9D0D6]">{toLearnSkillsCount > 0 ? 'Focus recommended' : '—'}</span>
            </div>

            <div className="my-3">
              <span className="font-['Manrope'] font-extrabold text-2xl sm:text-[28px] text-[#1d1d1f] dark:text-white tracking-tight leading-none">
                {toLearnSkillsCount}
              </span>
            </div>

            <div className="w-full bg-[#eef2f6] dark:bg-[#202026] h-2 rounded-full overflow-hidden">
              <div className="bg-[#5B8DEF] dark:bg-[#C9D0D6] h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(201,208,214,0.4)]" style={{ width: `${totalSkillsCount ? (toLearnSkillsCount / totalSkillsCount) * 100 : 0}%` }} />
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
          <div className="lg:col-span-6 pf-glass-card p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#f5f5f7] dark:border-[#202026]">
                <div className="flex items-center gap-2">
                  <h2 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white">
                    Skill Proficiency Comparison
                  </h2>
                </div>

                {/* Chart Legend */}
                <div className="flex items-center gap-4 text-xs font-medium text-[#333333] dark:text-[#CBD5E1]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0066cc] dark:bg-[#C9D0D6]" />
                    <span>Your Level</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 border-t-2 border-dashed border-[#d2d2d7] dark:border-[#8B949E]" />
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
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f7" className="stroke-[#f0f0f0] dark:stroke-[#27272F]" />
                    <XAxis
                      dataKey="skill"
                      axisLine={{ stroke: '#27272F' }}
                      tickLine={false}
                      interval={0}
                      height={55}
                      tick={<CustomBarXAxisTick />}
                    />
                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 20, 40, 60, 80, 100]}
                      tickFormatter={(val) => `${val}%`}
                      tick={{ fill: '#A1A1AA', fontSize: 10, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      cursor={{ fill: 'rgba(201,208,214,0.06)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload
                          return (
                            <div className="bg-[#1d1d1f] dark:bg-[#0E0E12] border border-gray-700 dark:border-[#27272F] text-white p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                              <div className="font-bold border-b border-gray-700 pb-1 text-[#dbeafc]">{d.name || d.skill}</div>
                              <div className="flex justify-between gap-4">
                                <span className="text-gray-300">Your Level:</span>
                                <span className="font-bold text-[#C9D0D6]">{d.current}%</span>
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
              <div className="lg:col-span-3 pf-glass-card p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#f5f5f7] dark:border-[#202026]">
                    <div className="flex items-center gap-2">
                      <h2 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white">
                        Skill Radar
                      </h2>
                    </div>
                  </div>

                  <div className="h-64 w-full flex items-center justify-center pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} outerRadius="56%">
                        <PolarGrid stroke="#334155" className="stroke-[#e0e0e0] dark:stroke-[#27272F]" />
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
                          stroke="#71717A"
                          fill="transparent"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                        />
                        <Radar
                          name="Your Level"
                          dataKey="current"
                          stroke="#C9D0D6"
                          fill="#C9D0D6"
                          fillOpacity={0.25}
                          strokeWidth={2.5}
                          dot={{ r: 3.5, fill: '#C9D0D6', strokeWidth: 1.5, stroke: '#0E0E12' }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Radar Legend */}
                <div className="flex items-center justify-center gap-4 text-xs font-medium text-[#333333] dark:text-[#CBD5E1] pt-2 border-t border-[#f5f5f7] dark:border-[#202026]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0066cc] dark:bg-[#C9D0D6]" />
                    <span>Your Level</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#c3c4c5] dark:bg-[#71717A]" />
                    <span>Target Level</span>
                  </div>
                </div>
              </div>

              {/* CARD 3: Top Skill Gaps (3 of 12 cols) */}
              <div className="lg:col-span-3 pf-glass-card p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#f5f5f7] dark:border-[#202026]">
                    <div className="flex items-center gap-2">
                      <h2 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white">
                        Top Skill Gaps
                      </h2>
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
                          className="p-3 rounded-xl border border-[#f5f5f7] dark:border-[#202026] hover:-translate-y-0.5 hover:border-black/40 hover:shadow-md dark:hover:border-[#C9D0D6]/40 dark:hover:shadow-lg hover:bg-white dark:hover:bg-[#0E0E12] cursor-pointer transition-all flex items-center justify-between"
                          onClick={() => setSelectedSkillModal(gap)}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-lg bg-[#eaf2fc] dark:bg-[#18181D] text-[#0066cc] dark:text-[#C9D0D6] flex items-center justify-center flex-none">
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
            {/* ---------------------------------------------------------------------
                MAIN ANALYTICS GRID - ROW 2:
                1. Skill Category Breakdown (Donut Chart)
                2. Recommended Focus (Actionable Card)
               --------------------------------------------------------------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">

              {/* CARD 1: Skill Category Breakdown (Donut Chart) */}
              <div className="pf-glass-card p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#f5f5f7] dark:border-[#202026]">
                    <div className="flex items-center gap-2">
                      <h2 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white">
                        Skill Category Breakdown
                      </h2>
                    </div>
                  </div>

                  {/* Donut Chart with Centered Callout */}
                  <div className="h-48 w-full relative flex items-center justify-center pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
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
                                <div className="bg-[#1d1d1f] dark:bg-[#0E0E12] text-white px-2 py-1 rounded-md text-xs font-bold">
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
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] font-medium text-[#333333] dark:text-[#CBD5E1] pt-3 border-t border-[#f5f5f7] dark:border-[#202026]">
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

              {/* CARD 2: Recommended Focus (Actionable Card) */}
              <div className="pf-glass-card p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#f5f5f7] dark:border-[#202026]">
                    <div className="flex items-center gap-2">
                      <h2 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white">
                        Recommended Focus
                      </h2>
                    </div>
                  </div>

                  {/* Priority Banner (Green Surface) — real biggest gap */}
                  {biggestGap && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-[#ECFDF3] dark:bg-emerald-950/40 border border-[#D1FADF] dark:border-emerald-800/60 flex items-start gap-2">
                      <Shield className="w-4 h-4 text-[#22A06B] dark:text-emerald-400 flex-none mt-0.5" />
                      <p className="text-[11px] font-bold text-[#1d1d1f] dark:text-white leading-tight">
                        Next Priority: Complete <span className="text-[#0066cc] dark:text-[#C9D0D6]">{cap(biggestGap.tag)}</span> to close your biggest real gap
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
                          className="p-3 rounded-xl border border-[#f5f5f7] dark:border-[#202026] hover:-translate-y-0.5 hover:border-black/40 hover:shadow-md dark:hover:border-[#C9D0D6]/40 dark:hover:shadow-lg hover:bg-white dark:hover:bg-[#0E0E12] cursor-pointer transition-all flex items-center justify-between group"
                          onClick={() => navigate('/dashboard')}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-[#eaf2fc] dark:bg-[#18181D] text-[#0066cc] dark:text-[#C9D0D6] flex items-center justify-center flex-none">
                              <ItemIcon className="w-3.5 h-3.5" />
                            </span>
                            <div>
                              <h4 className="font-bold text-xs text-[#1d1d1f] dark:text-white group-hover:text-[#0066cc] dark:group-hover:text-[#C9D0D6]">
                                {item.title}
                              </h4>
                              <p className="text-[10px] text-[#7a7a7a] dark:text-[#94A3B8]">{item.subtitle}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[#7a7a7a] dark:text-[#94A3B8] group-hover:text-[#0066cc] dark:group-hover:text-[#C9D0D6] transition-transform group-hover:translate-x-0.5" />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

            </div>

            {/* ---------------------------------------------------------------------
                SECONDARY DEEP ANALYTICS & AI INSIGHTS
                (Section 1: Intelligence Grid, Section 2: Skill-Gap Heatmap Matrix)
               --------------------------------------------------------------------- */}
            <div className="pt-6 border-t border-[#f0f0f0] dark:border-[#202026] space-y-6">
              
              <div>
                <h3 className="font-['Manrope'] font-bold text-lg text-[#1d1d1f] dark:text-white">
                  Skill Matrix & Diagnostic Intelligence
                </h3>
                <p className="text-xs text-[#7a7a7a] dark:text-[#94A3B8] mt-0.5">
                  Granular breakdown of competence tiers, learning velocity, and active AI recommendations.
                </p>
              </div>

              {/* SECTION 1: INTELLIGENCE GRID (4 Focused Cards) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
                
                {/* Card 1: Learning Velocity */}
                <div className="pf-glass-card p-5 sm:p-6 shadow-sm flex flex-col justify-between">
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
                  {/* Real cumulative-readiness trend */}
                  <div className="h-10 w-full mt-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData.map((d) => ({ v: d.readiness }))}>
                        <Line type="monotone" dataKey="v" stroke="#C9D0D6" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Card 2: Time Spent by Category */}
                <div className="pf-glass-card p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[#7a7a7a] dark:text-[#94A3B8] uppercase tracking-wider">
                        Time Spent
                      </span>
                      <span className="text-[11px] font-bold text-[#0066cc] dark:text-[#C9D0D6]">{totalRealHours.toFixed(1)} hrs</span>
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
                <div className="pf-glass-card p-5 sm:p-6 shadow-sm flex flex-col justify-between">
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
                <div className="pf-glass-card p-5 sm:p-6 shadow-sm flex flex-col justify-between bg-[#eaf2fc] dark:bg-[#18181D] border border-[#dcecfd] dark:border-[#27272F]">
                  <div>
                    <div className="flex items-center gap-1.5 text-[#0066cc] dark:text-[#C9D0D6] mb-1.5">
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
                    className="mt-3 text-xs font-bold text-[#0066cc] dark:text-[#C9D0D6] hover:underline flex items-center gap-1 self-start cursor-pointer"
                  >
                    <span>Ask PathFinder why</span>
                    <span>→</span>
                  </button>
                </div>

              </div>

              {/* SECTION 2: SKILL GAP HEATMAP MATRIX (Directly below) */}
              <div className="pf-glass-card p-6 shadow-sm">
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
                      <tr className="border-b border-[#f0f0f0] dark:border-[#202026] text-[#7a7a7a] dark:text-[#94A3B8]">
                        <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Tier Level</th>
                        {heatmapSkills.map((s) => (
                          <th key={s.tag} className="py-3 px-4 font-bold text-center text-[#1d1d1f] dark:text-white">{cap(s.tag)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {heatmapData.map((row) => (
                        <tr key={row.level} className="border-b border-[#f5f5f7] dark:border-[#202026] hover:bg-gray-50/50 dark:hover:bg-[#18181D]/50 transition-colors">
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
              className="bg-white dark:bg-[#121216] rounded-2xl border border-[#e0e0e0] dark:border-[#27272F] shadow-2xl max-w-md w-full p-6 relative animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSelectedSkillModal(null)}
                className="absolute top-4 right-4 text-[#7a7a7a] dark:text-[#94A3B8] hover:text-[#1d1d1f] dark:hover:text-white text-sm font-bold w-6 h-6 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
              
              <div className="flex items-center gap-2 text-xs font-bold text-[#0066cc] dark:text-[#C9D0D6] bg-[#eaf2fc] dark:bg-[#18181D] px-2.5 py-1 rounded-md w-fit mb-3">
                <span>Skill Deep-Dive</span>
              </div>

              <h3 className="font-['Manrope'] font-bold text-xl text-[#1d1d1f] dark:text-white">
                {stripEmojis(selectedSkillModal.title)}
              </h3>
              <p className="text-xs text-[#333333] dark:text-[#94A3B8] mt-1 mb-4">
                {selectedSkillModal.desc}
              </p>

              <div className="grid grid-cols-3 gap-3 p-3 bg-[#fafafb] dark:bg-[#0E0E12] rounded-xl border border-[#f0f0f0] dark:border-[#27272F] text-center mb-4">
                <div>
                  <span className="text-[10px] text-[#7a7a7a] dark:text-[#94A3B8] font-bold block">CURRENT</span>
                  <span className="text-base font-extrabold text-[#1d1d1f] dark:text-white">{selectedSkillModal.current}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7a7a7a] dark:text-[#94A3B8] font-bold block">TARGET</span>
                  <span className="text-base font-extrabold text-[#0066cc] dark:text-[#C9D0D6]">{selectedSkillModal.target}</span>
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
                  className="px-4 py-2.5 border border-[#0066cc] dark:border-[#27272F] text-[#0066cc] dark:text-[#C9D0D6] hover:bg-[#eaf2fc] dark:hover:bg-[#18181D] font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Ask Coach
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </AppShell>
  )
}
