import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAIChat } from '../../contexts/AIChatContext'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts'
import {
  Rocket,
  Map,
  TrendingUp,
  Radar as RadarIcon,
  NotebookTabs,
  MessageCircle,
  CalendarDays,
  MapPinned,
  CheckCircle2,
  BadgeCheck,
  Clock3,
  Flame,
  BarChart3,
  Code2,
  Brain,
  Briefcase,
  Flag,
  ArrowRight,
  Sparkles,
  Lock,
  Trophy,
  Info,
  ChevronDown,
  ChevronRight,
  Search,
  Check,
  X,
  Target,
  Layers,
  FileText,
  Activity,
  Play,
  RotateCcw,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import AppSidebar from '../ui/AppSidebar'
import { useRoadmap } from '../../hooks/useRoadmap'
import { useStreak } from '../../hooks/useStreak'
import UserProfileDropdown from '../ui/UserProfileDropdown'

/**
 * PathFinder High-Fidelity Progress Page
 * Matches the exact design language, layout, tokens, typography, and card hierarchy
 * of the PathFinder platform reference.
 *
 * Core Features:
 * - Desktop Layout (Sidebar 220px, Header, Hero Overview, 4 KPI cards)
 * - 65% / 35% Main Analytics Grid
 * - Line/Area Chart: Roadmap Progress over 8 weeks
 * - Weekly Activity Bar Chart: 17.4 hrs with daily breakdown
 * - Skill Progress list with progress bars, statuses, and hover states
 * - Skill Profile Radar Chart
 * - 5-Week Activity Heatmap with streak counters
 * - Milestone Timeline (Completed, In Progress, Upcoming)
 * - AI Progress Insight Card ("PathFinder insight")
 * - Next Best Actions (01, 02, 03)
 * - Recent Activity list
 * - Achievements badges (Unlocked & Locked)
 * - Right-Side Roadmap Status & Goal panel
 * - Floating AI Coach with interactive chat drawer
 */

export default function ProgressScreen() {
  const navigate = useNavigate()
  const { open: openAICoach, send: sendToAICoach } = useAIChat()
  const { user, signOut } = useAuth()

  // Navigation tab state
  const [activeNav, setActiveNav] = useState('progress')
  // Real KPIs — roadmap %, streak days and weekly hours come from the
  // backend rather than hardcoded literals.
  const roadmap = useRoadmap()
  const streak = useStreak()
  const hoursLoggedThisWeek = Math.round(((streak.minutes_this_week || 0) / 60) * 10) / 10

  // Roadmap filter & dropdown state
  const [isGoalDropdownOpen, setIsGoalDropdownOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState('AIML Engineer Internship')
  const [progressTimeframe, setProgressTimeframe] = useState('8 weeks')
  const [isTimeframeOpen, setIsTimeframeOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)

  // Interactive Task / Action Modal state
  const [activeActionModal, setActiveActionModal] = useState(null)

  // Navigation handler
  const handleNavClick = (navId) => {
    setActiveNav(navId)
    if (navId === 'roadmap') {
      navigate('/dashboard')
    } else if (navId === 'skills') {
      navigate('/skills')
    } else if (navId === 'resources') {
      navigate('/dashboard')
    } else if (navId === 'coach') {
      openAICoach()
    }
  }

  // ---------------------------------------------------------------------------
  // DATASETS
  // ---------------------------------------------------------------------------

  // Real derived stats used by the hero card above the charts.
  const weeksCompletedCount = roadmap.weeks.filter((w) => w.is_complete).length
  const onTrack = (() => {
    const totalWeeks = roadmap.weeks.length
    if (!totalWeeks || !roadmap.currentWeek) return false
    const expectedPercent = (roadmap.currentWeek / totalWeeks) * 100
    return roadmap.percent >= expectedPercent * 0.85
  })()

  // 1. Roadmap Progress Over Time (Area Chart) — REAL, derived from roadmap.weeks.
  // Each point is cumulative completion (steps done in weeks 1..N / total steps
  // in the whole roadmap), so it's an honest reflection of the learner's real
  // progress against their real week count — not a fixed "8 weeks" fiction.
  // There's no historical snapshot table, so this can't show what completion
  // looked like on a past calendar date; it shows real completion mapped onto
  // the roadmap's own week axis, which is the closest real signal available.
  const progressTimelineData = (() => {
    const totalAll = roadmap.totalSteps || 0
    let cumulativeDone = 0
    let prevProgress = 0
    return roadmap.weeks.map((w) => {
      cumulativeDone += w.completed_steps || 0
      const progress = totalAll ? Math.round((cumulativeDone / totalAll) * 100) : 0
      const delta = progress - prevProgress
      prevProgress = progress
      return {
        week: `Week ${w.week_number}`,
        progress,
        change: `${delta >= 0 ? '+' : ''}${delta}%`,
      }
    })
  })()

  // 2. Weekly Learning Activity (Bar Chart) — REAL, from streak.daily_minutes_this_week
  // (backend: study_sessions rows summed per day, this calendar week). There's
  // no stored historical average across weeks, so the old "+15% vs avg" style
  // comparison per day can't be computed honestly - dropped rather than faked.
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const weeklyActivityData = (streak.daily_minutes_this_week || []).map((d, i) => ({
    day: DAY_LABELS[i] || d.date,
    hours: Math.round((d.minutes / 60) * 10) / 10,
  }))
  const weeklyHoursTotal = Math.round(((streak.minutes_this_week || 0) / 60) * 10) / 10

  // 3 & 4. Core Skills Development + Skill Profile Radar — REAL, derived from
  // roadmap.allSteps' real skill_tags and completion status. There's no
  // stored "category" taxonomy per tag, so that label is dropped rather than
  // invented; icon is a cosmetic lookup only, not a data field.
  const SKILL_ICON_MAP = [
    [/python|programming/i, Code2],
    [/statistic|sql|analy/i, BarChart3],
    [/machine.?learning|deep.?learning|ai\b/i, Brain],
    [/pandas|data/i, Layers],
    [/docs?|documentation/i, FileText],
  ]
  const iconFor = (tag) => (SKILL_ICON_MAP.find(([re]) => re.test(tag)) || [null, Activity])[1]
  const statusFor = (pct) => {
    if (pct >= 80) return { status: 'Strong', color: 'bg-[#ECFDF3] text-[#16A34A] border-[#D1FADF]' }
    if (pct >= 60) return { status: 'Good', color: 'bg-[#F3EEFF] text-[#5B2FF3] border-[#DDD2FF]' }
    if (pct >= 40) return { status: 'Developing', color: 'bg-[#EFF6FF] text-[#3B82F6] border-[#DBEAFE]' }
    if (pct > 0) return { status: 'Needs attention', color: 'bg-[#FFF7E6] text-[#F59E0B] border-[#FEE4B2]' }
    return { status: 'Upcoming', color: 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]' }
  }

  const skillTagStats = {}
  roadmap.allSteps.forEach((step) => {
    ;(step.skill_tags || []).forEach((tag) => {
      if (!skillTagStats[tag]) skillTagStats[tag] = { total: 0, done: 0 }
      skillTagStats[tag].total += 1
      if (step.completed) skillTagStats[tag].done += 1
    })
  })
  const allSkills = Object.entries(skillTagStats)
    .map(([tag, s]) => ({ tag, total: s.total, progress: Math.round((s.done / s.total) * 100) }))
  const rankedSkills = [...allSkills].sort((a, b) => b.total - a.total).slice(0, 6)

  // "Mastered" = a real skill tag where every real step referencing it is
  // complete (100%), used by the "Skills mastered" KPI card below.
  const masteredSkillCount = allSkills.filter((s) => s.progress >= 100).length
  const totalSkillCount = allSkills.length

  const cap = (s) => s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  const skillsData = rankedSkills.map((s) => {
    const { status, color } = statusFor(s.progress)
    return {
      id: s.tag,
      name: cap(s.tag),
      progress: s.progress,
      status,
      statusColor: color,
      icon: iconFor(s.tag),
    }
  })

  // 4. Skill Profile Radar Data — same real per-skill progress, reshaped for the radar chart.
  const radarData = rankedSkills.map((s) => ({ skill: cap(s.tag), value: s.progress }))

  // 5. 5-Week Mini Activity Heatmap Matrix (7 days x 5 weeks) — REAL, from
  // streak.daily_minutes_35d (real study_sessions minutes, chronological).
  // Intensity: 0 (gray), 1 (very light), 2 (light), 3 (medium), 4 (strong purple)
  const minutesToIntensity = (mins) => {
    if (mins <= 0) return 0
    if (mins < 30) return 1
    if (mins < 60) return 2
    if (mins < 120) return 3
    return 4
  }
  const heatmapDays = streak.daily_minutes_35d || []
  const heatmapWeeks = []
  for (let i = 0; i < heatmapDays.length; i += 7) {
    heatmapWeeks.push(heatmapDays.slice(i, i + 7).map((d) => minutesToIntensity(d.minutes)))
  }

  const getHeatmapColor = (intensity) => {
    switch (intensity) {
      case 4:
        return 'bg-[#5B2FF3]' // Strong purple
      case 3:
        return 'bg-[#7C61F5]' // Medium purple
      case 2:
        return 'bg-[#B49DFF]' // Light purple
      case 1:
        return 'bg-[#E5DBFF]' // Very light purple
      default:
        return 'bg-[#EEF2F7]' // No activity
    }
  }

  // 6. Roadmap Milestones Timeline
  // 6. Roadmap Milestones Timeline — REAL, grouped from roadmap.weeks by
  // milestone_label (a milestone can span multiple weeks). Dates for
  // completed milestones use the real latest completed_at among that
  // milestone's steps; everything else shows its real week range instead of
  // an invented "Estimated: N weeks".
  const milestones = (() => {
    const order = []
    const byLabel = new Map()
    roadmap.weeks.forEach((w) => {
      const label = w.milestone_label || 'Milestone'
      if (!byLabel.has(label)) {
        const group = { title: label, weeks: [] }
        byLabel.set(label, group)
        order.push(group)
      }
      byLabel.get(label).weeks.push(w)
    })

    return order.map((g) => {
      const totalSteps = g.weeks.reduce((a, w) => a + (w.total_steps || 0), 0)
      const doneSteps = g.weeks.reduce((a, w) => a + (w.completed_steps || 0), 0)
      const progress = totalSteps ? Math.round((doneSteps / totalSteps) * 100) : 0
      const allComplete = g.weeks.every((w) => w.is_complete)
      const anyCurrent = g.weeks.some((w) => w.is_current)
      const allLocked = g.weeks.every((w) => w.is_locked)

      let status = 'upcoming'
      if (allComplete) status = 'completed'
      else if (anyCurrent) status = 'in_progress'
      else if (allLocked) status = 'locked'

      const weekNums = g.weeks.map((w) => w.week_number)
      const weekRange = weekNums.length > 1
        ? `Weeks ${Math.min(...weekNums)}-${Math.max(...weekNums)}`
        : `Week ${weekNums[0]}`

      let date = weekRange
      if (allComplete) {
        const completedDates = roadmap.allSteps
          .filter((s) => s.milestone_label === g.title && s.completed_at)
          .map((s) => new Date(s.completed_at))
        if (completedDates.length) {
          const latest = new Date(Math.max(...completedDates))
          date = latest.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
        } else {
          date = 'Completed'
        }
      } else if (anyCurrent) {
        date = `In progress · ${weekRange}`
      }

      return { title: g.title, status, date, progress }
    })
  })()

  // 7. Next Best Actions
  const nextActions = [
    {
      id: '01',
      title: 'Complete Statistics checkpoint',
      duration: '15 min',
      desc: 'Verify understanding of variance, standard deviation, and IQR.',
      buttonLabel: 'Start',
      icon: Target,
    },
    {
      id: '02',
      title: 'Practice descriptive statistics',
      duration: '25 min',
      desc: '10 interactive practice questions with step-by-step solutions.',
      buttonLabel: 'Practice',
      icon: BarChart3,
    },
    {
      id: '03',
      title: 'Finish Pandas mini project',
      duration: '45 min',
      desc: 'Apply exploratory data analysis on a real-world customer dataset.',
      buttonLabel: 'Continue',
      icon: Layers,
    },
  ]

  // 8. Recent Activity Timeline
  const recentActivities = [
    {
      id: 1,
      title: 'Statistics Fundamentals completed',
      time: 'Today',
      progressChange: '+6% progress',
      type: 'completed',
    },
    {
      id: 2,
      title: 'Python Functions: Practice Guide completed',
      time: 'Yesterday',
      progressChange: '+4% progress',
      type: 'completed',
    },
    {
      id: 3,
      title: 'Pandas Data Analysis lesson completed',
      time: '2 days ago',
      progressChange: '+5% progress',
      type: 'completed',
    },
    {
      id: 4,
      title: 'Descriptive Statistics practice started',
      time: '3 days ago',
      progressChange: '6 / 10 completed',
      type: 'practice',
    },
  ]

  // 9. Achievements Badges
  const achievements = [
    { icon: '🏆', title: '7-day streak', status: 'Unlocked', unlocked: true },
    { icon: '🎯', title: 'First milestone', status: 'Unlocked', unlocked: true },
    { icon: '📚', title: '10 resources completed', status: 'Unlocked', unlocked: true },
    { icon: '🚀', title: 'Roadmap starter', status: 'Unlocked', unlocked: true },
    { icon: '🔒', title: '30-day streak', status: 'Locked', unlocked: false },
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-['Inter',sans-serif] text-[#172554]">
      {/* =========================================================================
          1. LEFT SIDEBAR (~220px wide, matching Resources reference)
         ========================================================================= */}
      <AppSidebar />

      {/* =========================================================================
          2. MAIN CONTENT AREA (Offset by sidebar width 220px, max-w-[1320px])
         ========================================================================= */}
      <main className="flex-1 min-w-0 p-6 lg:p-10 space-y-7 max-w-[1360px]">
        
        {/* -----------------------------------------------------------------------
            HEADER ROW: Title + Subtitle on Left, Goal Selector & Roadmap on Right
           ----------------------------------------------------------------------- */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-['Inter'] font-extrabold text-2xl sm:text-[28px] text-[#172554] tracking-tight leading-tight">
              Progress
            </h1>
            <p className="mt-1 text-xs sm:text-[13px] text-[#64748B]">
              Track your learning momentum, skill growth, and roadmap readiness.
            </p>
          </div>

          {/* Top-Right Controls matching Resources reference */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Roadmap Selector Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsGoalDropdownOpen((v) => !v)}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-white border border-[#E5E7EB] hover:border-[#DDD2FF] rounded-xl text-xs font-medium text-[#172554] shadow-sm transition-all"
              >
                <CalendarDays className="w-4 h-4 text-[#5B2FF3]" />
                <div className="flex flex-col text-left">
                  <span className="font-bold text-[#172554] leading-tight">{selectedGoal}</span>
                  <span className="text-[10px] text-[#64748B] font-medium leading-tight">Target: February 2027</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-[#94A3B8] ml-1 transition-transform ${isGoalDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isGoalDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl border border-[#E5E7EB] shadow-xl p-1.5 z-30">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGoal('AIML Engineer Internship')
                      setIsGoalDropdownOpen(false)
                    }}
                    className="w-full text-left p-2 rounded-lg bg-[#F3EEFF] text-[#5B2FF3] font-bold text-xs mb-1"
                  >
                    AIML Engineer Internship (Target: Feb 2027)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGoal('Data Scientist Track')
                      setIsGoalDropdownOpen(false)
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-gray-50 text-[#172554] font-semibold text-xs"
                  >
                    Data Scientist Track (Target: Summer 2027)
                  </button>
                </div>
              )}
            </div>

            {/* Outlined Button: "View roadmap" */}
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-4 py-2.5 border border-[#5B2FF3] text-[#5B2FF3] hover:bg-[#5B2FF3] hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.98]"
            >
              <MapPinned className="w-4 h-4" />
              <span>View roadmap</span>
            </button>

            {/* Primary profile control lives top-right on every section */}
            <UserProfileDropdown />
          </div>
        </header>

        {/* -----------------------------------------------------------------------
            HERO OVERVIEW PROGRESS CARD (68% Prominent Card)
           ----------------------------------------------------------------------- */}
        <section className="bg-white border border-[#E5E7EB] rounded-[14px] p-6 lg:p-7 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:border-[#DDD2FF] hover:shadow-[0_6px_18px_rgba(91,47,243,0.08)] transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left Column Text */}
          <div className="space-y-2 max-w-xl">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#5B2FF3] bg-[#F3EEFF] px-2.5 py-1 rounded-md border border-[#DDD2FF]">
              ROADMAP PROGRESS
            </span>
            <div className="flex items-baseline gap-3 pt-1">
              <span className="font-['Inter'] font-extrabold text-4xl sm:text-5xl text-[#172554] tracking-tight">
                {roadmap.percent}%
              </span>
              {onTrack && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#16A34A] bg-[#ECFDF3] px-2.5 py-0.5 rounded-full border border-[#D1FADF]">
                  <Check className="w-3.5 h-3.5" />
                  <span>On track</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] font-medium leading-relaxed">
              {roadmap.path?.goal_text
                ? <>Working toward: <strong>{roadmap.path.goal_text.split('.')[0]}</strong>. {roadmap.completedSteps} of {roadmap.totalSteps} steps completed so far.</>
                : 'Generate a learning path to start tracking real progress here.'}
            </p>
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveActionModal('checkpoint')}
                className="px-4 py-2 bg-[#5B2FF3] hover:bg-[#4C1DCE] text-white text-xs font-bold rounded-lg shadow-sm transition-all"
              >
                Continue Week {roadmap.currentWeek}
              </button>
              <button
                type="button"
                onClick={() => navigate('/skills')}
                className="px-4 py-2 bg-white border border-[#E5E7EB] hover:border-[#DDD2FF] text-[#5B2FF3] text-xs font-bold rounded-lg transition-all"
              >
                View skill gaps →
              </button>
            </div>
          </div>

          {/* Right Column Circular Progress Visualization */}
          <div className="flex items-center gap-6 self-center md:self-auto pr-2">
            <div className="relative w-32 h-32 flex-none flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                {/* Track Circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  stroke="#EEF2F7"
                  strokeWidth="10"
                  fill="transparent"
                />
                {/* Active Purple Arc — real percent of 2 * PI * 48 */}
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  stroke="#5B2FF3"
                  strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 48}`}
                  strokeDashoffset={`${2 * Math.PI * 48 * (1 - roadmap.percent / 100)}`}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-['Inter'] font-extrabold text-2xl text-[#172554]">
                  {roadmap.percent}%
                </span>
                <span className="text-[10px] font-semibold text-[#64748B]">
                  Overall
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-[#172554]">Overall roadmap</span>
              <span className="text-[11px] text-[#64748B]">{weeksCompletedCount} of {roadmap.weeks.length} weeks completed</span>
              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5B2FF3] bg-[#F3EEFF] px-2 py-0.5 rounded-full w-fit">
                <TrendingUp className="w-3 h-3" />
                <span>{roadmap.completedSteps} of {roadmap.totalSteps} steps done</span>
              </div>
            </div>
          </div>
        </section>

        {/* -----------------------------------------------------------------------
            FOUR KPI METRIC CARDS
           ----------------------------------------------------------------------- */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="KPI Cards">
          
          {/* Card 1: Learning Progress */}
          <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:border-[#DDD2FF] hover:shadow-[0_6px_18px_rgba(91,47,243,0.08)] transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B]">Learning progress</span>
              <span className="w-8 h-8 rounded-full bg-[#F3EEFF] text-[#5B2FF3] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="my-2">
              <span className="font-['Inter'] font-extrabold text-3xl text-[#172554] tracking-tight">
                {roadmap.percent}%
              </span>
            </div>
            <span className="text-xs font-bold text-[#16A34A] flex items-center gap-1">
              <span>{roadmap.completedSteps} of {roadmap.totalSteps} steps done</span>
            </span>
          </div>

          {/* Card 2: Skills Mastered */}
          <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:border-[#DDD2FF] hover:shadow-[0_6px_18px_rgba(91,47,243,0.08)] transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B]">Skills mastered</span>
              <span className="w-8 h-8 rounded-full bg-[#ECFDF3] text-[#16A34A] flex items-center justify-center">
                <BadgeCheck className="w-4 h-4" />
              </span>
            </div>
            <div className="my-2">
              <span className="font-['Inter'] font-extrabold text-3xl text-[#172554] tracking-tight">
                {masteredSkillCount} / {totalSkillCount}
              </span>
            </div>
            <span className="text-xs font-semibold text-[#64748B]">
              {totalSkillCount ? Math.round((masteredSkillCount / totalSkillCount) * 100) : 0}% complete
            </span>
          </div>

          {/* Card 3: Learning Time */}
          <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:border-[#DDD2FF] hover:shadow-[0_6px_18px_rgba(91,47,243,0.08)] transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B]">Learning time</span>
              <span className="w-8 h-8 rounded-full bg-[#FFF7E6] text-[#F59E0B] flex items-center justify-center">
                <Clock3 className="w-4 h-4" />
              </span>
            </div>
            <div className="my-2">
              <span className="font-['Inter'] font-extrabold text-3xl text-[#172554] tracking-tight">
                {Math.round(((streak.minutes_total || 0) / 60) * 10) / 10} hrs
              </span>
            </div>
            <span className="text-xs font-bold text-[#5B2FF3]">
              {weeklyHoursTotal} hrs this week
            </span>
          </div>

          {/* Card 4: Learning Streak */}
          <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:border-[#DDD2FF] hover:shadow-[0_6px_18px_rgba(91,47,243,0.08)] transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B]">Learning streak</span>
              <span className="w-8 h-8 rounded-full bg-[#F8F5FF] text-[#EC4899] flex items-center justify-center">
                <Flame className="w-4 h-4 text-[#F59E0B]" />
              </span>
            </div>
            <div className="my-2">
              <span className="font-['Inter'] font-extrabold text-3xl text-[#172554] tracking-tight">
                {streak.current_streak} days
              </span>
            </div>
            <span className="text-xs font-semibold text-[#64748B]">
              Personal best: {streak.best_streak} days
            </span>
          </div>

        </section>

        {/* -----------------------------------------------------------------------
            MAIN PROGRESS ANALYTICS SECTION (65% Left Column, 35% Right Column)
           ----------------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* =====================================================================
              LEFT COLUMN (approx 8 of 12 cols, ~65% width)
             ===================================================================== */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* CARD A: Learning Progress Over Time (Line/Area Chart) */}
            <section className="bg-white border border-[#E5E7EB] rounded-[14px] p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:border-[#DDD2FF] transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#EEF2F7] gap-2">
                <div>
                  <h2 className="font-['Inter'] font-bold text-base text-[#172554]">
                    Learning progress
                  </h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Your roadmap completion over the last 8 weeks
                  </p>
                </div>

                {/* Dropdown filter */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsTimeframeOpen((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#172554] hover:bg-gray-100"
                  >
                    <span>{progressTimeframe}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
                  </button>

                  {isTimeframeOpen && (
                    <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg border border-[#E5E7EB] shadow-lg p-1 z-20">
                      {['4 weeks', '8 weeks', 'All time'].map((tf) => (
                        <button
                          key={tf}
                          type="button"
                          onClick={() => {
                            setProgressTimeframe(tf)
                            setIsTimeframeOpen(false)
                          }}
                          className="w-full text-left px-2.5 py-1.5 text-xs font-medium hover:bg-[#F3EEFF] hover:text-[#5B2FF3] rounded"
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Area Chart Container */}
              <div className="h-64 w-full pt-4 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={progressTimelineData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5B2FF3" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#5B2FF3" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
                    <XAxis
                      dataKey="week"
                      tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                      axisLine={{ stroke: '#EEF2F7' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 20, 40, 60, 80, 100]}
                      tickFormatter={(val) => `${val}%`}
                      tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload
                          return (
                            <div className="bg-white border border-[#E5E7EB] p-2.5 rounded-lg shadow-lg text-xs space-y-1">
                              <div className="font-bold text-[#172554]">{d.week}</div>
                              <div className="text-[#5B2FF3] font-extrabold">{d.progress}% Roadmap Complete</div>
                              <div className="text-[#16A34A] text-[10px] font-semibold">{d.change} from previous week</div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="progress"
                      stroke="#5B2FF3"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#purpleGradient)"
                      dot={{ fill: '#5B2FF3', stroke: '#FFFFFF', strokeWidth: 2, r: 4 }}
                      activeDot={{ fill: '#5B2FF3', stroke: '#F3EEFF', strokeWidth: 3, r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* CARD B: Skill Progress & Skill Radar Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Skill Progress List (7 cols) */}
              <section className="md:col-span-7 bg-white border border-[#E5E7EB] rounded-[14px] p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:border-[#DDD2FF] transition-all flex flex-col justify-between">
                <div>
                  <div className="pb-3 border-b border-[#EEF2F7]">
                    <h2 className="font-['Inter'] font-bold text-base text-[#172554]">
                      Skill progress
                    </h2>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Core skills developing against roadmap requirements
                    </p>
                  </div>

                  <div className="space-y-4 mt-4">
                    {skillsData.map((skill) => {
                      const IconComp = skill.icon
                      return (
                        <div
                          key={skill.id}
                          className="group p-2 rounded-xl hover:bg-[#FAF8FF] transition-colors cursor-pointer"
                          onClick={() => navigate('/skills')}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-[#F8FAFC] text-[#5B2FF3] flex items-center justify-center">
                                <IconComp className="w-3.5 h-3.5" />
                              </span>
                              <span className="font-bold text-xs text-[#172554] group-hover:text-[#5B2FF3] transition-colors">
                                {skill.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#172554]">{skill.progress}%</span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${skill.statusColor}`}>
                                {skill.status}
                              </span>
                            </div>
                          </div>

                          {/* 8px Rounded Progress Bar */}
                          <div className="w-full bg-[#EEF2F7] h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-[#5B2FF3] h-full rounded-full transition-all duration-500"
                              style={{ width: `${skill.progress}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#EEF2F7] mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => navigate('/skills')}
                    className="text-xs font-bold text-[#5B2FF3] hover:underline inline-flex items-center gap-1"
                  >
                    <span>View all skill insights</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </section>

              {/* Skill Profile Radar Chart (5 cols) */}
              <section className="md:col-span-5 bg-white border border-[#E5E7EB] rounded-[14px] p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:border-[#DDD2FF] transition-all flex flex-col justify-between">
                <div>
                  <div className="pb-2 border-b border-[#EEF2F7]">
                    <h2 className="font-['Inter'] font-bold text-base text-[#172554]">
                      Skill profile
                    </h2>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Current capability distribution
                    </p>
                  </div>

                  <div className="h-56 w-full flex items-center justify-center pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} outerRadius="70%">
                        <PolarGrid stroke="#EEF2F7" />
                        <PolarAngleAxis
                          dataKey="skill"
                          tick={{ fill: '#64748B', fontSize: 10, fontWeight: 500 }}
                        />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                          name="Skill Readiness"
                          dataKey="value"
                          stroke="#5B2FF3"
                          fill="#5B2FF3"
                          fillOpacity={0.2}
                          strokeWidth={2}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <p className="text-[11px] text-[#64748B] text-center pt-2 border-t border-[#EEF2F7]">
                  Strongest: <strong>Python (88%)</strong> · Target: <strong>Statistics (55%)</strong>
                </p>
              </section>

            </div>

            {/* CARD C: Learning Streak & Mini Heatmap */}
            <section className="bg-white border border-[#E5E7EB] rounded-[14px] p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:border-[#DDD2FF] transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#EEF2F7] gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-[#FFF7E6] text-[#F59E0B] flex items-center justify-center flex-none">
                    <Flame className="w-5 h-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-['Inter'] font-bold text-base text-[#172554]">
                        Learning streak
                      </h2>
                      <span className="font-extrabold text-sm text-[#5B2FF3]">{streak.current_streak} days</span>
                    </div>
                    <p className="text-xs text-[#64748B]">
                      {streak.current_streak > 0
                        ? "You're building a consistent learning habit."
                        : 'Complete a roadmap task to start your streak.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold text-[#64748B]">
                  <span>{streak.current_streak} day current streak</span>
                  <span className="text-[#5B2FF3]">{streak.best_streak} day best streak</span>
                </div>
              </div>

              {/* 5-Week Mini Heatmap Matrix */}
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {heatmapWeeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-1.5">
                      {week.map((intensity, dIdx) => (
                        <div
                          key={dIdx}
                          title={`Activity level: ${intensity}/4`}
                          className={`w-5 h-5 rounded-md ${getHeatmapColor(intensity)} transition-transform hover:scale-110 cursor-pointer`}
                        />
                      ))}
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-[#F8F5FF] border border-[#DDD2FF] rounded-xl text-xs text-[#4F2BC8] font-medium leading-relaxed max-w-xs">
                  {streak.current_streak > 0 && streak.current_streak >= streak.best_streak ? (
                    <>🔥 You're on your <strong>best streak yet</strong> — keep it going!</>
                  ) : streak.current_streak > 0 ? (
                    <>🔥 <strong>{streak.best_streak - streak.current_streak} more day{streak.best_streak - streak.current_streak === 1 ? '' : 's'}</strong> to beat your personal best of {streak.best_streak} days!</>
                  ) : (
                    <>🔥 Complete a task today to start a new streak.</>
                  )}
                </div>
              </div>
            </section>

            {/* CARD D: Roadmap Milestones Timeline */}
            <section className="bg-white border border-[#E5E7EB] rounded-[14px] p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:border-[#DDD2FF] transition-all">
              <div className="pb-4 border-b border-[#EEF2F7]">
                <h2 className="font-['Inter'] font-bold text-base text-[#172554]">
                  Roadmap milestones
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Key achievements on your path{roadmap.path?.goal_text ? ` toward ${roadmap.path.goal_text.split('.')[0]}` : ''}
                </p>
              </div>

              <div className="space-y-4 mt-5">
                {milestones.map((m, idx) => {
                  const isCompleted = m.status === 'completed'
                  const isInProgress = m.status === 'in_progress'
                  const isLocked = m.status === 'locked'

                  return (
                    <div key={m.title} className="flex items-center gap-4 relative">
                      {/* Left Icon Node */}
                      {isCompleted ? (
                        <span className="w-8 h-8 rounded-full bg-[#ECFDF3] text-[#16A34A] flex items-center justify-center flex-none border border-[#D1FADF] shadow-sm">
                          <Check className="w-4 h-4" />
                        </span>
                      ) : isInProgress ? (
                        <span className="w-8 h-8 rounded-full bg-[#F3EEFF] text-[#5B2FF3] flex items-center justify-center flex-none border-2 border-[#5B2FF3] shadow-sm animate-pulse">
                          <Flag className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="w-8 h-8 rounded-full bg-[#F8FAFC] text-[#94A3B8] flex items-center justify-center flex-none border border-[#E2E8F0]">
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      )}

                      {/* Content */}
                      <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-3 rounded-xl bg-[#F8FAFC] border border-[#EEF2F7]">
                        <div>
                          <h4 className={`font-bold text-xs sm:text-sm ${isInProgress ? 'text-[#5B2FF3]' : isCompleted ? 'text-[#172554]' : 'text-[#64748B]'}`}>
                            {m.title}
                          </h4>
                          <span className="text-[11px] text-[#64748B] font-medium">{m.date}</span>
                        </div>

                        <div>
                          {isCompleted && (
                            <span className="px-2.5 py-0.5 rounded-full bg-[#ECFDF3] text-[#16A34A] text-[10px] font-bold">
                              Completed
                            </span>
                          )}
                          {isInProgress && (
                            <span className="px-2.5 py-0.5 rounded-full bg-[#F3EEFF] text-[#5B2FF3] text-[10px] font-bold">
                              In Progress ({m.progress}%)
                            </span>
                          )}
                          {isLocked && (
                            <span className="px-2.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B] text-[10px] font-bold">
                              Upcoming
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* CARD E: Recent Activity List */}
            <section className="bg-white border border-[#E5E7EB] rounded-[14px] p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:border-[#DDD2FF] transition-all">
              <div className="pb-4 border-b border-[#EEF2F7] flex items-center justify-between">
                <div>
                  <h2 className="font-['Inter'] font-bold text-base text-[#172554]">
                    Recent activity
                  </h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Completed tasks and learning sessions
                  </p>
                </div>
                <span className="text-xs font-bold text-[#5B2FF3] cursor-pointer hover:underline">
                  View full log
                </span>
              </div>

              <div className="space-y-3 mt-4">
                {recentActivities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-[#EEF2F7] hover:bg-white hover:border-[#DDD2FF] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-none ${
                        act.type === 'completed' ? 'bg-[#ECFDF3] text-[#16A34A]' : 'bg-[#F3EEFF] text-[#5B2FF3]'
                      }`}>
                        {act.type === 'completed' ? <Check className="w-3.5 h-3.5" /> : <Play className="w-3 h-3" />}
                      </span>
                      <div>
                        <h4 className="font-bold text-xs text-[#172554]">{act.title}</h4>
                        <p className="text-[11px] text-[#64748B]">{act.time}</p>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-[#16A34A] bg-[#ECFDF3] px-2 py-0.5 rounded-md border border-[#D1FADF]">
                      {act.progressChange}
                    </span>
                  </div>
                ))}
              </div>
            </section>

          </div>

          {/* =====================================================================
              RIGHT COLUMN / CONTEXTUAL PANEL (approx 4 of 12 cols, ~35% width)
             ===================================================================== */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* RIGHT CARD 1: Weekly Activity Bar Chart */}
            <section className="bg-white border border-[#E5E7EB] rounded-[14px] p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:border-[#DDD2FF] transition-all">
              <div className="pb-3 border-b border-[#EEF2F7]">
                <div className="flex items-center justify-between">
                  <h3 className="font-['Inter'] font-bold text-sm text-[#172554]">
                    Weekly activity
                  </h3>
                  {streak.current_streak > 0 && (
                    <span className="text-[11px] font-bold text-[#5B2FF3] bg-[#F3EEFF] px-2 py-0.5 rounded-full">
                      {streak.current_streak}-day streak
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">Hours spent learning</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="font-['Inter'] font-extrabold text-2xl text-[#172554]">
                    {weeklyHoursTotal} hrs
                  </span>
                  <span className="text-xs text-[#64748B]">This week</span>
                </div>
              </div>

              {/* Compact Bar Chart */}
              <div className="h-36 w-full pt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyActivityData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: '#64748B', fontSize: 10, fontWeight: 500 }}
                      axisLine={{ stroke: '#EEF2F7' }}
                      tickLine={false}
                    />
                    <YAxis
                      ticks={[0, 2, 4]}
                      tickFormatter={(val) => `${val}h`}
                      tick={{ fill: '#94A3B8', fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload
                          return (
                            <div className="bg-white border border-[#E5E7EB] p-2 rounded-md shadow-md text-[11px]">
                              <div className="font-bold text-[#172554]">{d.day}</div>
                              <div className="text-[#5B2FF3] font-bold">{d.hours} hours</div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar
                      dataKey="hours"
                      fill="#5B2FF3"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* RIGHT CARD 2: AI Progress Insight Card ("PathFinder insight") */}
            <section className="bg-[#F8F5FF] border border-[#DDD2FF] rounded-[14px] p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[#5B2FF3] mb-2">
                <Sparkles className="w-4 h-4" />
                <h3 className="font-['Inter'] font-bold text-xs uppercase tracking-wider">
                  PathFinder insight
                </h3>
              </div>
              <p className="text-xs text-[#4F2BC8] leading-relaxed">
                You're progressing well in Python and data analysis, but <strong>Statistics</strong> is currently your biggest skill gap. Strengthening descriptive statistics this week will keep your roadmap on track for Machine Learning.
              </p>
              <button
                type="button"
                onClick={() => navigate('/skills')}
                className="mt-3 text-xs font-bold text-[#5B2FF3] hover:underline inline-flex items-center gap-1"
              >
                <span>View recommended resources</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </section>

            {/* RIGHT CARD 3: Next Best Actions (01, 02, 03) */}
            <section className="bg-white border border-[#E5E7EB] rounded-[14px] p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:border-[#DDD2FF] transition-all">
              <div className="pb-3 border-b border-[#EEF2F7]">
                <h3 className="font-['Inter'] font-bold text-sm text-[#172554]">
                  Your next best actions
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">Recommended tasks for today</p>
              </div>

              <div className="space-y-3 mt-3">
                {nextActions.map((act) => {
                  const IconComp = act.icon
                  return (
                    <div
                      key={act.id}
                      className="p-3 rounded-xl bg-[#F8FAFC] border border-[#EEF2F7] hover:border-[#5B2FF3] transition-all flex items-center justify-between gap-2"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="font-mono text-xs font-extrabold text-[#5B2FF3] mt-0.5">
                          {act.id}
                        </span>
                        <div>
                          <h4 className="font-bold text-xs text-[#172554]">{act.title}</h4>
                          <span className="text-[10px] text-[#64748B] font-medium">{act.duration}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveActionModal(act.id)}
                        className="px-3 py-1 bg-[#5B2FF3] hover:bg-[#4C1DCE] text-white text-[11px] font-bold rounded-lg transition-colors flex-none"
                      >
                        {act.buttonLabel}
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* RIGHT CARD 4: Contextual Roadmap Status Panel */}
            <section className="bg-white border border-[#E5E7EB] rounded-[14px] p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:border-[#DDD2FF] transition-all space-y-4">
              {/* Item 1: Roadmap status */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-[#172554]">Roadmap status</span>
                  <span className="text-[#5B2FF3]">{roadmap.percent}% complete</span>
                </div>
                <div className="w-full bg-[#EEF2F7] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#5B2FF3] h-full rounded-full" style={{ width: roadmap.percent + '%' }} />
                </div>
                <p className="text-[11px] text-[#64748B] mt-1">You're on track for your February 2027 target.</p>
              </div>

              <hr className="border-[#EEF2F7]" />

              {/* Item 2: This week's goal */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-[#172554]">This week's goal</span>
                  <span className="text-[#16A34A]">17.4 / 20 hrs (87%)</span>
                </div>
                <div className="w-full bg-[#EEF2F7] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#16A34A] h-full rounded-full" style={{ width: '87%' }} />
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="mt-2 w-full py-1.5 bg-[#F3EEFF] text-[#5B2FF3] hover:bg-[#5B2FF3] hover:text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Continue learning
                </button>
              </div>

              <hr className="border-[#EEF2F7]" />

              {/* Item 3: Skill gap & Next milestone */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Primary skill gap:</span>
                  <span className="font-bold text-[#F59E0B]">Statistics (55%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Next milestone:</span>
                  <span className="font-bold text-[#5B2FF3]">Statistics checkpoint (This week)</span>
                </div>
              </div>
            </section>

            {/* RIGHT CARD 5: Achievements Badges */}
            <section className="bg-white border border-[#E5E7EB] rounded-[14px] p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:border-[#DDD2FF] transition-all">
              <div className="pb-3 border-b border-[#EEF2F7] flex items-center justify-between">
                <h3 className="font-['Inter'] font-bold text-sm text-[#172554]">
                  Achievements
                </h3>
                <span className="text-[11px] font-bold text-[#16A34A]">4 Unlocked</span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                {achievements.map((ach) => (
                  <div
                    key={ach.title}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                      ach.unlocked
                        ? 'bg-[#F8FAFC] border-[#EEF2F7]'
                        : 'bg-[#F1F5F9] border-[#E2E8F0] opacity-60'
                    }`}
                  >
                    <span className="text-base">{ach.icon}</span>
                    <div className="truncate">
                      <h4 className="font-bold text-[11px] text-[#172554] truncate">{ach.title}</h4>
                      <span className="text-[9px] text-[#64748B] font-medium">{ach.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>

        </div>

      </main>


      {/* =========================================================================
          5. ACTION PRACTICE / CHECKPOINT MODAL
         ========================================================================= */}
      {activeActionModal && (
        <div className="fixed inset-0 z-50 bg-[#172554]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-150">
            <button
              type="button"
              onClick={() => setActiveActionModal(null)}
              className="absolute top-4 right-4 text-[#64748B] hover:text-[#172554] text-sm font-bold w-6 h-6 flex items-center justify-center"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 text-xs font-bold text-[#5B2FF3] bg-[#F3EEFF] px-2.5 py-1 rounded-md w-fit mb-3">
              <span>Week 5 · Statistics Checkpoint</span>
            </div>

            <h3 className="font-['Inter'] font-bold text-xl text-[#172554]">
              Descriptive Statistics & Variance
            </h3>
            <p className="text-xs text-[#64748B] mt-1 mb-4">
              Complete this 15-minute checkpoint to lock in your Statistics foundations and unlock Machine Learning.
            </p>

            <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#EEF2F7] text-xs space-y-2 mb-4">
              <div className="flex justify-between font-semibold">
                <span className="text-[#64748B]">Questions:</span>
                <span className="text-[#172554]">10 multiple-choice & code snippets</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-[#64748B]">Passing Score:</span>
                <span className="text-[#16A34A]">80% or higher</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-[#64748B]">Reward:</span>
                <span className="text-[#5B2FF3]">+6% overall roadmap completion</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveActionModal(null)
                  navigate('/dashboard')
                }}
                className="flex-1 py-2.5 bg-[#5B2FF3] hover:bg-[#4C1DCE] text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                Begin Checkpoint
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveActionModal(null)
                  openAICoach()
                  sendToAICoach('Give me a quick 1-minute summary of variance before the checkpoint.')
                }}
                className="px-4 py-2.5 border border-[#5B2FF3] text-[#5B2FF3] hover:bg-[#F3EEFF] font-bold text-xs rounded-xl transition-all"
              >
                Ask Coach ✨
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
