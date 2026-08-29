import React, { useState, useRef, useEffect, useMemo } from 'react'
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
  const proficiencyData = displayedSkills.map((s) => ({
    skill: cap(s.tag).replace(' ', '\n'),
    name: cap(s.tag),
    current: s.progress,
    target: 100,
    gap: 100 - s.progress,
    status: statusFor(s.progress),
  }))

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
    if (val >= 75) return 'bg-[#ECFDF3] text-[#22A06B] border-[#D1FADF]' // Strong green
    if (val >= 50) return 'bg-[#FFF7E6] text-[#D88700] border-[#FEE4B2]' // Developing amber
    return 'bg-[#FFF0F0] text-[#E5484D] border-[#FECDCA]' // Gap red
  }

  // Custom Bar with Target Outline
  const CustomBarWithTarget = (props) => {
    const { x, y, width, height, value, index } = props
    const targetVal = proficiencyData[index]?.target || 80
    const chartHeight = 180 // Reference height inside chart
    const targetHeight = (targetVal / 100) * 180
    const targetY = 190 - targetHeight

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
          strokeWidth="1.5"
          strokeDasharray="4 4"
          rx="6"
        />
        {/* Current Solid Violet Bar */}
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="#0066cc"
          rx="6"
          className="transition-all duration-300 hover:fill-[#004fa3] cursor-pointer"
        />
        {/* Percentage Label Above Bar */}
        <text
          x={x + width / 2}
          y={y - 8}
          fill="#1d1d1f"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
        >
          {value}%
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
            <div className="w-11 h-11 rounded-2xl bg-[#eaf2fc] border border-[#dcecfd] text-[#0066cc] flex items-center justify-center flex-none shadow-sm mt-0.5">
              <Lightbulb className="w-6 h-6" strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="font-['Manrope'] font-extrabold text-2xl sm:text-[30px] lg:text-[32px] text-[#1d1d1f] tracking-tight leading-tight">
                Skill Insights
              </h1>
              <p className="mt-0.5 text-xs sm:text-[14px] text-[#333333]">
                Understand your strengths, find gaps and focus on what to learn next.
              </p>
            </div>
          </div>

          {/* Right Side: Real Goal & Last Updated (live-computed, so "now") */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 lg:self-center">
            <div className="flex items-center gap-2 px-3.5 py-2 bg-white border border-[#e0e0e0] rounded-xl text-xs font-bold text-[#1d1d1f] shadow-sm max-w-xs">
              <Target className="w-4 h-4 text-[#0066cc] flex-none" strokeWidth={2.2} />
              <span className="truncate">
                {roadmap.path?.goal_text ? `Goal: ${roadmap.path.goal_text.split('.')[0]}` : 'No active goal yet'}
              </span>
            </div>

            <span className="text-xs font-medium text-[#7a7a7a] self-center sm:self-auto">
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
                <span className="w-7 h-7 rounded-xl bg-[#eaf2fc] text-[#0066cc] flex items-center justify-center flex-none shadow-xs">
                  <BarChart3 className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold text-[#333333]">Overall Skill Readiness</span>
              </div>
              <Info
                className="w-3.5 h-3.5 text-[#86868b] cursor-pointer hover:text-[#0066cc]"
                title="Calculated from assessments, completed learning activities, practice performance, and skill progress."
              />
            </div>

            <div className="flex items-baseline gap-3 my-3">
              <span className="font-['Manrope'] font-extrabold text-2xl sm:text-[28px] text-[#1d1d1f] tracking-tight leading-none">
                {roadmap.percent}%
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#22A06B] bg-[#ECFDF3] px-2 py-0.5 rounded-full border border-[#D1FADF]">
                <TrendingUp className="w-3 h-3" />
                <span>{roadmap.completedSteps} of {roadmap.totalSteps} steps</span>
              </span>
            </div>

            <div className="w-full bg-[#eef2f6] h-2 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-[#0066cc] to-[#38bdf8] h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(0,102,204,0.4)]" style={{ width: `${roadmap.percent}%` }} />
            </div>
          </div>

          {/* KPI 2: Skills Mastered */}
          <div className="pf-glass-card p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[#ECFDF3] text-[#22A06B] flex items-center justify-center flex-none shadow-xs">
                  <CheckCircle className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold text-[#333333]">Skills Mastered</span>
              </div>
              <span className="text-[11px] font-bold text-[#7a7a7a]">
                {totalSkillsCount ? Math.round((masteredSkillsCount / totalSkillsCount) * 100) : 0}%
              </span>
            </div>

            <div className="my-3">
              <span className="font-['Manrope'] font-extrabold text-2xl sm:text-[28px] text-[#1d1d1f] tracking-tight leading-none">
                {masteredSkillsCount} / {totalSkillsCount}
              </span>
            </div>

            <div className="w-full bg-[#eef2f6] h-2 rounded-full overflow-hidden">
              <div className="bg-[#22A06B] h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(34,160,107,0.4)]" style={{ width: `${totalSkillsCount ? (masteredSkillsCount / totalSkillsCount) * 100 : 0}%` }} />
            </div>
          </div>

          {/* KPI 3: Skills In Progress */}
          <div className="pf-glass-card p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[#FFF7E6] text-[#D88700] flex items-center justify-center flex-none shadow-xs">
                  <Hourglass className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold text-[#333333]">Skills In Progress</span>
              </div>
              <span className="text-[11px] font-bold text-[#D88700]">{inProgressSkillsCount > 0 ? 'Keep going!' : '—'}</span>
            </div>

            <div className="my-3">
              <span className="font-['Manrope'] font-extrabold text-2xl sm:text-[28px] text-[#1d1d1f] tracking-tight leading-none">
                {inProgressSkillsCount}
              </span>
            </div>

            <div className="w-full bg-[#eef2f6] h-2 rounded-full overflow-hidden">
              <div className="bg-[#D88700] h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(216,135,0,0.4)]" style={{ width: `${totalSkillsCount ? (inProgressSkillsCount / totalSkillsCount) * 100 : 0}%` }} />
            </div>
          </div>

          {/* KPI 4: Skills to Learn */}
          <div className="pf-glass-card p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[#eaf2fc] text-[#5B8DEF] flex items-center justify-center flex-none shadow-xs">
                  <BookOpen className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold text-[#333333]">Skills to Learn</span>
              </div>
              <span className="text-[11px] font-bold text-[#5B8DEF]">{toLearnSkillsCount > 0 ? 'Focus recommended' : '—'}</span>
            </div>

            <div className="my-3">
              <span className="font-['Manrope'] font-extrabold text-2xl sm:text-[28px] text-[#1d1d1f] tracking-tight leading-none">
                {toLearnSkillsCount}
              </span>
            </div>

            <div className="w-full bg-[#eef2f6] h-2 rounded-full overflow-hidden">
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
              <div className="lg:col-span-6 bg-white border border-[#e0e0e0] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#f5f5f7]">
                    <div className="flex items-center gap-2">
                      <h2 className="font-['Manrope'] font-bold text-base text-[#1d1d1f]">
                        Skill Proficiency Comparison
                      </h2>
                      <Info
                        className="w-3.5 h-3.5 text-[#86868b] cursor-pointer hover:text-[#0066cc]"
                        title="Current completion compared with full completion of the steps assigned for each skill in your roadmap."
                      />
                    </div>

                    {/* Chart Legend */}
                    <div className="flex items-center gap-4 text-xs font-medium text-[#333333]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#0066cc]" />
                        <span>Your Level</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 border-t-2 border-dashed border-[#d2d2d7]" />
                        <span>Target Level (Internship)</span>
                      </div>
                    </div>
                  </div>

                  {/* Grouped Bar Chart with Target Outline */}
                  <div className="h-64 w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={proficiencyData}
                        margin={{ top: 20, right: 10, left: -20, bottom: 20 }}
                        barSize={24}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f7" />
                        <XAxis
                          dataKey="skill"
                          tick={{ fill: '#333333', fontSize: 10.5, fontWeight: 600 }}
                          axisLine={{ stroke: '#f0f0f0' }}
                          tickLine={false}
                          interval={0}
                          height={54}
                          angle={-22}
                          textAnchor="end"
                          tickFormatter={(v) => {
                            const map = { 'Machine Learning': 'ML', 'Deep Learning': 'DL', 'Pandas & EDA': 'Pandas', 'Portfolio Project': 'Portfolio', 'Interview Prep': 'Interview' }
                            return map[v] || (v && v.length > 12 ? v.slice(0, 11) + '…' : v)
                          }}
                        />
                        <YAxis
                          domain={[0, 100]}
                          ticks={[0, 20, 40, 60, 80, 100]}
                          tickFormatter={(val) => `${val}%`}
                          tick={{ fill: '#7a7a7a', fontSize: 10, fontWeight: 600 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RechartsTooltip
                          cursor={{ fill: 'rgba(0,102,204,0.04)' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload
                              return (
                                <div className="bg-[#1d1d1f] text-white p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                                  <div className="font-bold border-b border-gray-700 pb-1 text-[#dbeafc]">{d.name || d.skill}</div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-gray-300">Your Level:</span>
                                    <span className="font-bold text-[#61a9f5]">{d.current}%</span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-gray-300">Target Level:</span>
                                    <span className="font-bold text-gray-200">{d.target}%</span>
                                  </div>
                                  <div className="flex justify-between gap-4 text-[11px] pt-1 text-gray-400">
                                    <span>Gap:</span>
                                    <span className={d.gap > 20 ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>{d.gap}%</span>
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
              <div className="lg:col-span-3 bg-white border border-[#e0e0e0] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#f5f5f7]">
                    <div className="flex items-center gap-2">
                      <h2 className="font-['Manrope'] font-bold text-base text-[#1d1d1f]">
                        Skill Radar
                      </h2>
                      <Info
                        className="w-3.5 h-3.5 text-[#86868b] cursor-pointer hover:text-[#0066cc]"
                        title="Multidimensional visualization of technical competencies vs role benchmarks."
                      />
                    </div>
                  </div>

                  <div className="h-60 w-full flex items-center justify-center pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} outerRadius="75%">
                        <PolarGrid stroke="#f0f0f0" />
                        <PolarAngleAxis
                          dataKey="skill"
                          tick={{ fill: '#333333', fontSize: 10, fontWeight: 600 }}
                        />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                          name="Target Level"
                          dataKey="target"
                          stroke="#c3c4c5"
                          fill="transparent"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                        />
                        <Radar
                          name="Your Level"
                          dataKey="current"
                          stroke="#0066cc"
                          fill="#0066cc"
                          fillOpacity={0.2}
                          strokeWidth={2}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Radar Legend */}
                <div className="flex items-center justify-center gap-4 text-xs font-medium text-[#333333] pt-2 border-t border-[#f5f5f7]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0066cc]" />
                    <span>Your Level</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#c3c4c5]" />
                    <span>Target Level</span>
                  </div>
                </div>
              </div>

              {/* CARD 3: Top Skill Gaps (3 of 12 cols) */}
              <div className="lg:col-span-3 bg-white border border-[#e0e0e0] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#f5f5f7]">
                    <div className="flex items-center gap-2">
                      <h2 className="font-['Manrope'] font-bold text-base text-[#1d1d1f]">
                        Top Skill Gaps
                      </h2>
                      <Info
                        className="w-3.5 h-3.5 text-[#86868b] cursor-pointer hover:text-[#0066cc]"
                        title="Difference between your current proficiency and the target proficiency for this career goal."
                      />
                    </div>
                  </div>

                  {/* Actionable Gap Rows — real skills, ranked by real gap */}
                  <div className="space-y-3 mt-3">
                    {topGaps.length === 0 && (
                      <p className="text-[11px] text-[#7a7a7a] italic">No gaps yet — generate a path to see this.</p>
                    )}
                    {topGaps.map((gap) => {
                      const GapIcon = gap.icon
                      const isHigh = gap.priority === 'High Priority'
                      return (
                        <div
                          key={gap.title}
                          className="p-3 rounded-xl border border-[#f5f5f7] hover:border-[#0066cc] hover:bg-[#fafafb] cursor-pointer transition-all flex items-center justify-between"
                          onClick={() => setSelectedSkillModal(gap)}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-lg bg-[#eaf2fc] text-[#0066cc] flex items-center justify-center flex-none">
                              <GapIcon className="w-4 h-4" />
                            </span>
                            <div>
                              <h4 className="font-bold text-xs text-[#1d1d1f]">{gap.title}</h4>
                              <p className="text-[11px] text-[#7a7a7a]">Current {gap.current} → Target {gap.target}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                            isHigh
                              ? 'bg-[#FFF0F0] text-[#E5484D] border-[#FECDCA]'
                              : 'bg-[#FFF7E6] text-[#D88700] border-[#FEE4B2]'
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
              <div className="lg:col-span-6 bg-white border border-[#e0e0e0] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#f5f5f7]">
                    <div className="flex items-center gap-2">
                      <h2 className="font-['Manrope'] font-bold text-base text-[#1d1d1f]">
                        Learning Trend
                      </h2>
                      <Info
                        className="w-3.5 h-3.5 text-[#86868b] cursor-pointer hover:text-[#0066cc]"
                        title="Skill readiness evolution across consecutive study weeks."
                      />
                    </div>

                    {/* Timeframe Filter Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsTrendDropdownOpen((v) => !v)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-[#f5f5f7] border border-[#f0f0f0] rounded-lg text-xs font-semibold text-[#1d1d1f] hover:bg-gray-100"
                      >
                        <span>{trendTimeframe}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-[#7a7a7a]" />
                      </button>

                      {isTrendDropdownOpen && (
                        <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg border border-[#e0e0e0] shadow-lg p-1 z-20">
                          {['Last 4 Weeks', 'Last 8 Weeks', 'All Time'].map((tf) => (
                            <button
                              key={tf}
                              type="button"
                              onClick={() => {
                                setTrendTimeframe(tf)
                                setIsTrendDropdownOpen(false)
                              }}
                              className="w-full text-left px-2.5 py-1.5 text-xs font-medium hover:bg-[#eaf2fc] hover:text-[#0066cc] rounded"
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
                            <stop offset="5%" stopColor="#0066cc" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#0066cc" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f7" />
                        <XAxis
                          dataKey="week"
                          tick={{ fill: '#333333', fontSize: 11, fontWeight: 600 }}
                          axisLine={{ stroke: '#f0f0f0' }}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          ticks={[0, 20, 40, 60, 80, 100]}
                          tickFormatter={(v) => `${v}%`}
                          tick={{ fill: '#7a7a7a', fontSize: 10, fontWeight: 600 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-[#1d1d1f] text-white px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-lg">
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
                          stroke="#0066cc"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#violetGradient)"
                          dot={{ fill: '#0066cc', stroke: '#FFFFFF', strokeWidth: 2, r: 4 }}
                          activeDot={{ fill: '#0066cc', stroke: '#eaf2fc', strokeWidth: 3, r: 6 }}
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
                  <div className="mt-3 p-3 bg-[#ECFDF3] border border-[#D1FADF] rounded-xl flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-[#22A06B] flex-none" />
                    <p className="text-xs font-semibold text-[#1d1d1f]">
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
              <div className="lg:col-span-3 bg-white border border-[#e0e0e0] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#f5f5f7]">
                    <div className="flex items-center gap-2">
                      <h2 className="font-['Manrope'] font-bold text-base text-[#1d1d1f]">
                        Skill Category Breakdown
                      </h2>
                      <Info
                        className="w-3.5 h-3.5 text-[#86868b] cursor-pointer hover:text-[#0066cc]"
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
                                <div className="bg-[#1d1d1f] text-white px-2 py-1 rounded-md text-xs font-bold">
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
                      <span className="font-['Manrope'] font-extrabold text-xl text-[#1d1d1f] leading-none">
                        {roadmap.percent}%
                      </span>
                      <span className="text-[10px] font-semibold text-[#7a7a7a] uppercase tracking-wider mt-0.5">
                        Overall
                      </span>
                    </div>
                  </div>

                  {/* Clean Legend */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] font-medium text-[#333333] pt-2 border-t border-[#f5f5f7]">
                    {categoryData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between pr-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: item.color }} />
                          <span className="truncate">{item.name}</span>
                        </div>
                        <span className="font-bold text-[#1d1d1f]">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CARD 3: Recommended Focus (Actionable Card, 3 of 12 cols) */}
              <div className="lg:col-span-3 bg-white border border-[#e0e0e0] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#f5f5f7]">
                    <div className="flex items-center gap-2">
                      <h2 className="font-['Manrope'] font-bold text-base text-[#1d1d1f]">
                        Recommended Focus
                      </h2>
                      <Info
                        className="w-3.5 h-3.5 text-[#86868b] cursor-pointer hover:text-[#0066cc]"
                        title="AI-prioritized roadmap steps based on your current skill gaps."
                      />
                    </div>
                  </div>

                  {/* Priority Banner (Green Surface) — real biggest gap */}
                  {biggestGap && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-[#ECFDF3] border border-[#D1FADF] flex items-start gap-2">
                      <Shield className="w-4 h-4 text-[#22A06B] flex-none mt-0.5" />
                      <p className="text-[11px] font-bold text-[#1d1d1f] leading-tight">
                        Next Priority: Complete <span className="text-[#0066cc]">{cap(biggestGap.tag)}</span> to close your biggest real gap
                      </p>
                    </div>
                  )}

                  {/* Real next 3 not-started roadmap steps */}
                  <div className="space-y-3 mt-3">
                    {recommendedFocus.length === 0 && (
                      <p className="text-[11px] text-[#7a7a7a] italic">You're all caught up on your roadmap!</p>
                    )}
                    {recommendedFocus.map((item) => {
                      const ItemIcon = item.icon
                      return (
                        <div
                          key={item.title}
                          className="p-3 rounded-xl border border-[#f5f5f7] hover:border-[#0066cc] hover:bg-[#fafafb] cursor-pointer transition-all flex items-center justify-between group"
                          onClick={() => navigate('/dashboard')}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-[#eaf2fc] text-[#0066cc] flex items-center justify-center flex-none">
                              <ItemIcon className="w-3.5 h-3.5" />
                            </span>
                            <div>
                              <h4 className="font-bold text-xs text-[#1d1d1f] group-hover:text-[#0066cc]">
                                {item.title}
                              </h4>
                              <p className="text-[10px] text-[#7a7a7a]">{item.subtitle}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[#7a7a7a] group-hover:text-[#0066cc] transition-transform group-hover:translate-x-0.5" />
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
            <div className="pt-6 border-t border-[#f0f0f0] space-y-6">
              
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-['Manrope'] font-bold text-lg text-[#1d1d1f]">
                    Skill Matrix & Diagnostic Intelligence
                  </h3>
                  <p className="text-xs text-[#7a7a7a]">
                    Granular breakdown of competence tiers, learning velocity, and active AI recommendations.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'overview'
                        ? 'bg-[#0066cc] text-white shadow-sm'
                        : 'bg-[#f5f5f7] text-[#333333] hover:text-[#1d1d1f]'
                    }`}
                  >
                    Intelligence Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('heatmap')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'heatmap'
                        ? 'bg-[#0066cc] text-white shadow-sm'
                        : 'bg-[#f5f5f7] text-[#333333] hover:text-[#1d1d1f]'
                    }`}
                  >
                    Skill-Gap Heatmap
                  </button>
                </div>
              </div>

              {activeTab === 'heatmap' ? (
                /* SKILL GAP HEATMAP MATRIX */
                <div className="bg-white border border-[#e0e0e0] rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-bold text-sm text-[#1d1d1f]">
                      Tiered Skill-Gap Matrix (Foundations → Intermediate → Advanced)
                    </span>
                    <div className="flex items-center gap-3 text-[11px] font-semibold">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#ECFDF3] border border-[#D1FADF]" /> Strong (≥75%)</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#FFF7E6] border border-[#FEE4B2]" /> Developing (50–74%)</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#FFF0F0] border border-[#FECDCA]" /> Priority Gap (&lt;50%)</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-[#f0f0f0] text-[#7a7a7a]">
                          <th className="py-2.5 px-3 font-bold">Tier Level</th>
                          {heatmapSkills.map((s) => (
                            <th key={s.tag} className="py-2.5 px-3 font-bold text-center">{cap(s.tag)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {heatmapData.map((row) => (
                          <tr key={row.level} className="border-b border-[#f5f5f7]">
                            <td className="py-3 px-3 font-bold text-[#1d1d1f]">{row.level}</td>
                            {heatmapSkills.map((s) => {
                              const val = row[s.tag]
                              return (
                                <td key={s.tag} className="py-3 px-3 text-center">
                                  {val === null ? (
                                    <span className="text-[#c3c4c5]">—</span>
                                  ) : (
                                    <span className={`inline-block px-3 py-1 rounded-lg border font-bold ${getHeatmapColor(val)}`}>
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
                  <div className="bg-white border border-[#e0e0e0] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#7a7a7a] uppercase tracking-wider">
                          Learning Pace
                        </span>
                      </div>
                      <h4 className="font-['Manrope'] font-extrabold text-2xl text-[#1d1d1f]">
                        {stepsPerWeek} steps / week
                      </h4>
                      <p className="text-[11px] text-[#333333] mt-0.5 font-medium">
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
                  <div className="bg-white border border-[#e0e0e0] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#7a7a7a] uppercase tracking-wider">
                          Time Spent
                        </span>
                        <span className="text-[11px] font-bold text-[#0066cc]">{totalRealHours.toFixed(1)} hrs</span>
                      </div>
                      <div className="space-y-1.5 mt-2">
                        {timeSpentData.map((item) => (
                          <div key={item.name} className="flex justify-between text-[11px]">
                            <span className="text-[#333333]">{item.name}</span>
                            <span className="font-bold text-[#1d1d1f]">{item.value}% ({item.hours})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Top Strengths */}
                  <div className="bg-white border border-[#e0e0e0] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#7a7a7a] uppercase tracking-wider">
                          Top Strengths
                        </span>
                        <span className="text-[10px] font-bold text-[#22A06B]">{strengthsList.length} Skill{strengthsList.length === 1 ? '' : 's'} Strong</span>
                      </div>
                      <div className="space-y-1.5 mt-2">
                        {strengthsList.length === 0 && (
                          <p className="text-[11px] text-[#7a7a7a] italic">Complete some steps to see your strengths here.</p>
                        )}
                        {strengthsList.slice(0, 4).map((s) => (
                          <div key={s.name} className="flex items-center justify-between text-[11px]">
                            <span className="text-[#1d1d1f] font-semibold truncate">{s.rank}. {s.name}</span>
                            <span className="text-[#22A06B] font-bold flex-none">{s.score}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {strengthsList.length > 0 && (
                      <div className="mt-2 text-[10px] text-[#22A06B] font-bold bg-[#ECFDF3] px-2 py-1 rounded-lg text-center">
                        Great job! Build on these strengths.
                      </div>
                    )}
                  </div>

                  {/* Card 4: AI-Powered PathFinder Explanation */}
                  <div className="bg-[#eaf2fc] border border-[#dcecfd] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-[#0066cc] mb-1.5">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs font-bold font-['Manrope']">PathFinder insight</span>
                      </div>
                      <p className="text-[11px] text-[#333333] leading-relaxed">
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
                      className="mt-3 text-xs font-bold text-[#0066cc] hover:underline flex items-center gap-1 self-start"
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
            SKILL DRILL-DOWN MODAL
           ========================================================================= */}
        {selectedSkillModal && (
          <div className="fixed inset-0 z-50 bg-[#1d1d1f]/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#e0e0e0] shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-150">
              <button
                type="button"
                onClick={() => setSelectedSkillModal(null)}
                className="absolute top-4 right-4 text-[#7a7a7a] hover:text-[#1d1d1f] text-sm font-bold w-6 h-6 flex items-center justify-center"
              >
                ✕
              </button>
              
              <div className="flex items-center gap-2 text-xs font-bold text-[#0066cc] bg-[#eaf2fc] px-2.5 py-1 rounded-md w-fit mb-3">
                <span>Skill Deep-Dive</span>
              </div>

              <h3 className="font-['Manrope'] font-bold text-xl text-[#1d1d1f]">
                {selectedSkillModal.title}
              </h3>
              <p className="text-xs text-[#333333] mt-1 mb-4">
                {selectedSkillModal.desc}
              </p>

              <div className="grid grid-cols-3 gap-3 p-3 bg-[#fafafb] rounded-xl border border-[#f0f0f0] text-center mb-4">
                <div>
                  <span className="text-[10px] text-[#7a7a7a] font-bold block">CURRENT</span>
                  <span className="text-base font-extrabold text-[#1d1d1f]">{selectedSkillModal.current}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7a7a7a] font-bold block">TARGET</span>
                  <span className="text-base font-extrabold text-[#0066cc]">{selectedSkillModal.target}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7a7a7a] font-bold block">PRIORITY</span>
                  <span className="text-xs font-extrabold text-[#E5484D]">{selectedSkillModal.priority}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSkillModal(null)
                    navigate('/progress')
                  }}
                  className="flex-1 py-2.5 bg-[#0066cc] hover:bg-[#004fa3] text-white font-bold text-xs rounded-xl shadow-md transition-all"
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
                  className="px-4 py-2.5 border border-[#0066cc] text-[#0066cc] hover:bg-[#eaf2fc] font-bold text-xs rounded-xl transition-all"
                >
                  Ask Coach ✨
                </button>
              </div>
            </div>
          </div>
        )}
    </AppShell>
  )
}
