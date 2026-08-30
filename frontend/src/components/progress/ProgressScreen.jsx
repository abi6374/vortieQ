import React, { useState, useMemo } from 'react'
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
} from 'recharts'
import {
  TrendingUp,
  MapPinned,
  Check,
  BadgeCheck,
  Clock3,
  Flame,
  BarChart3,
  Code2,
  Brain,
  Flag,
  ArrowRight,
  Sparkles,
  Lock,
  ChevronDown,
  ChevronRight,
  Layers,
  FileText,
  Activity,
  FileDown,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import AppShell from '../layout/AppShell'
import GoalSelectorDropdown from '../layout/GoalSelectorDropdown'
import { useRoadmap } from '../../hooks/useRoadmap'
import { useStreak } from '../../hooks/useStreak'
import RoadmapInfographicModal from '../dashboard/RoadmapInfographicModal'

/**
 * PathFinder High-Fidelity Progress Page
 * Clean, responsive dashboard tracking learning momentum, skills growth, and roadmap milestones.
 */
export default function ProgressScreen() {
  const navigate = useNavigate()
  const { open: openAICoach } = useAIChat()
  const { user } = useAuth()

  // Real KPIs & hooks
  const roadmap = useRoadmap()
  const streak = useStreak()
  const weeklyHoursTotal = Math.round(((streak.minutes_this_week || 0) / 60) * 10) / 10

  // Timeframe filter, view logs, and export PDF modal state
  const [progressTimeframe, setProgressTimeframe] = useState('8 weeks')
  const [isTimeframeOpen, setIsTimeframeOpen] = useState(false)
  const [showAllLogs, setShowAllLogs] = useState(false)
  const [showPosterModal, setShowPosterModal] = useState(false)

  // ---------------------------------------------------------------------------
  // 1. Roadmap Progress Over Time (Area Chart Data) - Dynamic with exact weeks
  // ---------------------------------------------------------------------------
  const progressTimelineData = useMemo(() => {
    const allWeeks = roadmap.weeks || []
    if (!allWeeks.length) return []

    let sliceCount = allWeeks.length
    if (progressTimeframe === '4 weeks') sliceCount = 4
    else if (progressTimeframe === '8 weeks') sliceCount = 8
    else if (progressTimeframe === '12 weeks') sliceCount = 12

    const selectedWeeks = allWeeks.slice(0, Math.min(sliceCount, allWeeks.length))
    const totalAll = roadmap.totalSteps || 0

    return selectedWeeks.map((w, index) => {
      const previousWeeksSteps = allWeeks.slice(0, index + 1)
      const currentCumulative = previousWeeksSteps.reduce((acc, curr) => acc + (curr.completed_steps || 0), 0)
      const progress = totalAll ? Math.round((currentCumulative / totalAll) * 100) : 0
      const weekPct = w.total_steps ? Math.round(((w.completed_steps || 0) / w.total_steps) * 100) : 0
      const prevDone = previousWeeksSteps.slice(0, index).reduce((acc, curr) => acc + (curr.completed_steps || 0), 0)
      const delta = totalAll ? Math.round(((currentCumulative - prevDone) / totalAll) * 100) : 0

      return {
        week: `Week ${w.week_number}`,
        weekNumber: w.week_number,
        progress,
        weekCompletion: weekPct,
        completedTasks: `${w.completed_steps || 0} of ${w.total_steps || 0} tasks done`,
        change: `${delta >= 0 ? '+' : ''}${delta}%`,
      }
    })
  }, [roadmap.weeks, roadmap.totalSteps, progressTimeframe])

  // ---------------------------------------------------------------------------
  // 2. Weekly Activity Bar Chart Data (Mon..Sun)
  // ---------------------------------------------------------------------------
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const weeklyActivityData = (streak.daily_minutes_this_week || []).map((d, i) => ({
    day: DAY_LABELS[i] || d.date,
    hours: Math.round(((d.minutes || 0) / 60) * 10) / 10,
  }))
  const maxDayHours = Math.max(...weeklyActivityData.map((d) => d.hours), 4)
  const yAxisMax = Math.max(4, Math.ceil(maxDayHours * 1.25))

  // ---------------------------------------------------------------------------
  // 3. Core Skills Development & Mastery
  // ---------------------------------------------------------------------------
  const SKILL_ICON_MAP = [
    [/python|programming/i, Code2],
    [/statistic|sql|analy/i, BarChart3],
    [/machine.?learning|deep.?learning|ai\b/i, Brain],
    [/pandas|data/i, Layers],
    [/docs?|documentation/i, FileText],
  ]
  const iconFor = (tag) => (SKILL_ICON_MAP.find(([re]) => re.test(tag)) || [null, Activity])[1]
  const statusFor = (pct) => {
    if (pct >= 80) return { status: 'Strong', color: 'bg-[#ECFDF3] dark:bg-emerald-950/70 text-[#16A34A] dark:text-emerald-300 border-[#D1FADF] dark:border-emerald-800' }
    if (pct >= 60) return { status: 'Good', color: 'bg-[#eaf2fc] dark:bg-sky-950/70 text-[#0066cc] dark:text-sky-300 border-[#cfe4fb] dark:border-sky-800' }
    if (pct >= 40) return { status: 'Developing', color: 'bg-[#EFF6FF] dark:bg-blue-950/70 text-[#3B82F6] dark:text-blue-300 border-[#DBEAFE] dark:border-blue-800' }
    if (pct > 0) return { status: 'Needs attention', color: 'bg-[#FFF7E6] dark:bg-amber-950/70 text-[#F59E0B] dark:text-amber-300 border-[#FEE4B2] dark:border-amber-800' }
    return { status: 'Upcoming', color: 'bg-[#f5f5f7] dark:bg-[#18181D] text-[#6e6e73] dark:text-[#CBD5E1] border-[#e9e9e9] dark:border-[#27272F]' }
  }

  const skillTagStats = useMemo(() => {
    const stats = {}
    roadmap.allSteps.forEach((step) => {
      ;(step.skill_tags || []).forEach((tag) => {
        const clean = (tag || '').trim()
        if (!clean) return
        if (!stats[clean]) stats[clean] = { total: 0, done: 0 }
        stats[clean].total += 1
        if (step.completed || step.status === 'completed') {
          stats[clean].done += 1
        }
      })
    })
    return stats
  }, [roadmap.allSteps])

  const allSkills = useMemo(() => {
    return Object.entries(skillTagStats).map(([tag, s]) => ({
      tag,
      total: s.total,
      done: s.done,
      progress: s.total ? Math.round((s.done / s.total) * 100) : 0,
    }))
  }, [skillTagStats])

  const rankedSkills = useMemo(() => {
    return [...allSkills].sort((a, b) => b.total - a.total).slice(0, 6)
  }, [allSkills])

  const masteredSkillCount = allSkills.filter((s) => s.total > 0 && s.done >= s.total).length
  const totalSkillCount = allSkills.length
  const skillsMasteredPct = totalSkillCount ? Math.round((masteredSkillCount / totalSkillCount) * 100) : 0

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

  // ---------------------------------------------------------------------------
  // 4. 5-Week Activity Heatmap
  // ---------------------------------------------------------------------------
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
        return 'bg-[#0066cc] dark:bg-[#38BDF8]'
      case 3:
        return 'bg-[#61a9f5] dark:bg-[#38BDF8]/75'
      case 2:
        return 'bg-[#a1ccfb] dark:bg-[#38BDF8]/50'
      case 1:
        return 'bg-[#dcecfe] dark:bg-[#38BDF8]/25'
      default:
        return 'bg-[#f5f5f7] dark:bg-[#18181D]'
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Roadmap Milestones Timeline
  // ---------------------------------------------------------------------------
  const milestones = useMemo(() => {
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
  }, [roadmap.weeks, roadmap.allSteps])

  // ---------------------------------------------------------------------------
  // 6. Recent Activity Logs & Full History
  // ---------------------------------------------------------------------------
  const relativeDay = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000)
    if (days <= 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days} days ago`
  }

  const allRecentActivities = useMemo(() => {
    const perStepPercent = roadmap.totalSteps ? Math.round((1 / roadmap.totalSteps) * 100) : 0
    return roadmap.allSteps
      .filter((s) => s.completed || s.status === 'completed')
      .sort((a, b) => {
        const timeA = a.completed_at ? new Date(a.completed_at).getTime() : 0
        const timeB = b.completed_at ? new Date(b.completed_at).getTime() : 0
        return timeB - timeA
      })
      .map((s, idx) => ({
        id: s.step_id || `act-${idx}`,
        title: s.title,
        time: relativeDay(s.completed_at) || 'Completed recently',
        progressChange: `+${Math.max(1, perStepPercent)}%`,
        type: 'completed',
      }))
  }, [roadmap.allSteps, roadmap.totalSteps])

  const displayedActivities = showAllLogs ? allRecentActivities : allRecentActivities.slice(0, 4)

  // ---------------------------------------------------------------------------
  // 7. Next Best Actions & Dynamic Goals
  // ---------------------------------------------------------------------------
  const nextActions = roadmap.allSteps
    .filter((s) => !s.completed && s.status !== 'completed')
    .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0))
    .slice(0, 3)
    .map((s, i) => ({
      id: String(i + 1).padStart(2, '0'),
      stepId: s.step_id,
      title: s.title,
      duration: s.duration_hrs ? `${s.duration_hrs}h` : '',
      desc: s.explanation || s.description || '',
      buttonLabel: 'Continue',
      icon: iconFor((s.skill_tags || [])[0] || ''),
    }))

  const targetWeeklyHours = roadmap.path?.weekly_hours || 20
  const weeklyGoalPct = Math.min(100, Math.round((weeklyHoursTotal / targetWeeklyHours) * 100))

  return (
    <AppShell
      activeTab="progress"
      streakCount={streak.current_streak}
      topBar={
        <div className="flex items-center gap-3">
          <GoalSelectorDropdown
            activePath={roadmap.path}
            onSelectPath={(p) => {
              if (p?.id) navigate(`/roadmap/${p.id}`)
            }}
          />
          <button
            type="button"
            onClick={() => roadmap.path?.id ? navigate(`/roadmap/${roadmap.path.id}`) : navigate('/dashboard')}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 border border-[#0066cc] dark:border-[#27272F] text-[#0066cc] dark:text-[#38BDF8] hover:bg-[#0066cc] dark:hover:bg-[#18181D] hover:text-white dark:hover:text-white rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-[0.98] flex-none cursor-pointer"
          >
            <MapPinned className="w-4 h-4" />
            <span className="hidden sm:inline">View roadmap</span>
          </button>
        </div>
      }
    >
      {/* HEADER ROW */}
      <header className="mb-6">
        <h1 className="font-['Manrope'] font-extrabold text-2xl sm:text-[28px] text-[#1d1d1f] dark:text-white tracking-tight leading-tight">
          Progress
        </h1>
        <p className="mt-1 text-xs sm:text-[13px] text-[#6e6e73] dark:text-[#94A3B8]">
          Track your learning momentum, skill growth, and roadmap readiness.
        </p>
      </header>

      <div className="space-y-7 font-['Inter',sans-serif]">
        
        {/* FOUR KPI METRIC CARDS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5" aria-label="KPI Cards">
          
          {/* Card 1: Learning Progress */}
          <div className="pf-glass-card p-5 shadow-sm flex flex-col justify-between cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6e6e73] dark:text-[#94A3B8]">Learning progress</span>
              <span className="w-8 h-8 rounded-xl bg-[#eaf2fc] dark:bg-[#18181D] text-[#0066cc] dark:text-[#38BDF8] border border-[#cfe4fb] dark:border-[#27272F] flex items-center justify-center shadow-xs">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="my-2.5">
              <span className="font-['Manrope'] font-extrabold text-3xl text-[#1d1d1f] dark:text-white tracking-tight">
                {roadmap.percent}%
              </span>
            </div>
            <span className="text-xs font-bold text-[#16A34A] dark:text-emerald-400 flex items-center gap-1">
              <span>{roadmap.completedSteps} of {roadmap.totalSteps} steps done</span>
            </span>
          </div>

          {/* Card 2: Skills Mastered */}
          <div className="pf-glass-card p-5 shadow-sm flex flex-col justify-between cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6e6e73] dark:text-[#94A3B8]">Skills mastered</span>
              <span className="w-8 h-8 rounded-xl bg-[#ECFDF3] dark:bg-emerald-950/70 text-[#16A34A] dark:text-emerald-400 border border-[#D1FADF] dark:border-emerald-800/60 flex items-center justify-center shadow-xs">
                <BadgeCheck className="w-4 h-4" />
              </span>
            </div>
            <div className="my-2.5">
              <span className="font-['Manrope'] font-extrabold text-3xl text-[#1d1d1f] dark:text-white tracking-tight">
                {masteredSkillCount} / {totalSkillCount}
              </span>
            </div>
            <span className="text-xs font-semibold text-[#6e6e73] dark:text-[#CBD5E1]">
              {skillsMasteredPct}% complete {rankedSkills.filter((s) => s.progress > 0 && s.progress < 100).length > 0 ? `(${rankedSkills.filter((s) => s.progress > 0 && s.progress < 100).length} in progress)` : ''}
            </span>
          </div>

          {/* Card 3: Learning Time */}
          <div className="pf-glass-card p-5 shadow-sm flex flex-col justify-between cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6e6e73] dark:text-[#94A3B8]">Learning time</span>
              <span className="w-8 h-8 rounded-xl bg-[#FFF7E6] dark:bg-amber-950/70 text-[#F59E0B] dark:text-amber-400 border border-[#FEE4B2] dark:border-amber-800/60 flex items-center justify-center shadow-xs">
                <Clock3 className="w-4 h-4" />
              </span>
            </div>
            <div className="my-2.5">
              <span className="font-['Manrope'] font-extrabold text-3xl text-[#1d1d1f] dark:text-white tracking-tight">
                {Math.round(((streak.minutes_total || 0) / 60) * 10) / 10} hrs
              </span>
            </div>
            <span className="text-xs font-bold text-[#0066cc] dark:text-[#38BDF8]">
              {weeklyHoursTotal} hrs this week
            </span>
          </div>

          {/* Card 4: Learning Streak */}
          <div className="pf-glass-card p-5 shadow-sm flex flex-col justify-between cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6e6e73] dark:text-[#94A3B8]">Learning streak</span>
              <span className="w-8 h-8 rounded-xl bg-[#FFF5EB] dark:bg-orange-950/70 text-[#F97316] dark:text-orange-400 border border-[#FED7AA] dark:border-orange-800/60 flex items-center justify-center shadow-xs">
                <Flame className="w-4 h-4" />
              </span>
            </div>
            <div className="my-2.5">
              <span className="font-['Manrope'] font-extrabold text-3xl text-[#1d1d1f] dark:text-white tracking-tight">
                {streak.current_streak} days
              </span>
            </div>
            <span className="text-xs font-semibold text-[#6e6e73] dark:text-[#CBD5E1]">
              Personal best: {streak.best_streak} days
            </span>
          </div>

        </section>

        {/* MAIN PROGRESS ANALYTICS SECTION (65% Left Column, 35% Right Column) */}
        <div className="grid grid-cols-1 pf-progress-grid gap-5">

          {/* LEFT COLUMN */}
          <div className="space-y-6 min-w-0">
            
            {/* CARD A: Learning Progress Over Time (Dynamic Area Chart) */}
            <section className="pf-glass-card p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#f5f5f7] dark:border-[#202026] gap-2">
                <div>
                  <h2 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white">
                    Learning progress
                  </h2>
                  <p className="text-xs text-[#6e6e73] dark:text-[#94A3B8] mt-0.5">
                    Your roadmap completion over {progressTimeframe.toLowerCase()} ({progressTimelineData.length} weeks)
                  </p>
                </div>

                {/* Dropdown filter */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsTimeframeOpen((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#fafafc] dark:bg-[#18181D] border border-[#e0e0e0] dark:border-[#27272F] rounded-lg text-xs font-semibold text-[#1d1d1f] dark:text-white hover:bg-gray-100 dark:hover:bg-[#27272F] transition-colors cursor-pointer"
                  >
                    <span>{progressTimeframe}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#6e6e73] dark:text-[#94A3B8]" />
                  </button>

                  {isTimeframeOpen && (
                    <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-[#121216] rounded-lg border border-[#e0e0e0] dark:border-[#27272F] shadow-xl p-1 z-20">
                      {['4 weeks', '8 weeks', '12 weeks', 'All weeks'].map((tf) => (
                        <button
                          key={tf}
                          type="button"
                          onClick={() => {
                            setProgressTimeframe(tf)
                            setIsTimeframeOpen(false)
                          }}
                          className={`w-full text-left px-2.5 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                            progressTimeframe === tf
                              ? 'bg-[#eaf2fc] dark:bg-[#1E293B] text-[#0066cc] dark:text-[#38BDF8] font-bold'
                              : 'text-[#1d1d1f] dark:text-white hover:bg-gray-100 dark:hover:bg-[#18181D]'
                          }`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Area Chart Container with exact week indices and interval={0} */}
              <div className="h-64 w-full pt-4 relative">
                {progressTimelineData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-[#6e6e73] dark:text-[#94A3B8]">
                    No roadmap weeks available yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={progressTimelineData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="progressGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0066cc" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#0066cc" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f7" className="stroke-[#f0f0f0] dark:stroke-[#27272F]" />
                      <XAxis
                        dataKey="week"
                        interval={0}
                        tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 600 }}
                        axisLine={{ stroke: '#27272F' }}
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
                              <div className="bg-[#1d1d1f] dark:bg-[#0E0E12] border border-gray-700 dark:border-[#27272F] p-3 rounded-xl shadow-xl text-xs space-y-1 text-white">
                                <div className="font-bold text-white text-sm">{d.week} · {d.completedTasks}</div>
                                <div className="text-[#38BDF8] font-extrabold">{d.progress}% Cumulative Roadmap Done</div>
                                <div className="text-gray-300 text-[11px]">Week Completion: {d.weekCompletion}% ({d.change} delta)</div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="progress"
                        stroke="#0066cc"
                        className="dark:stroke-[#38BDF8]"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#progressGrad)"
                        dot={{ fill: '#0066cc', stroke: '#ffffff', strokeWidth: 2, r: 4 }}
                        activeDot={{ fill: '#0066cc', stroke: '#38BDF8', strokeWidth: 2, r: 6 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            {/* CARD B: Skill Progress List */}
            <section className="pf-glass-card p-6 shadow-sm">
              <div className="pb-3 border-b border-[#f5f5f7] dark:border-[#202026] flex items-center justify-between">
                <div>
                  <h2 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white">
                    Skill progress
                  </h2>
                  <p className="text-xs text-[#6e6e73] dark:text-[#94A3B8] mt-0.5">
                    Core skills developing against roadmap requirements
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/skills')}
                  className="text-xs font-bold text-[#0066cc] dark:text-[#38BDF8] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>View all skill insights</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4">
                {skillsData.length === 0 ? (
                  <div className="col-span-2 py-8 text-center text-xs text-[#6e6e73] dark:text-[#94A3B8]">
                    No skills data tracked yet.
                  </div>
                ) : (
                  skillsData.map((skill) => {
                    const IconComp = skill.icon
                    return (
                      <div
                        key={skill.id}
                        className="group p-3.5 rounded-xl bg-[#fafafc] dark:bg-[#0E0E12] border border-[#f5f5f7] dark:border-[#202026] hover:-translate-y-0.5 hover:border-black/40 hover:shadow-md dark:hover:border-[#C9D0D6]/40 dark:hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between gap-2.5"
                        onClick={() => navigate('/skills')}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-[#eaf2fc] dark:bg-[#18181D] text-[#0066cc] dark:text-[#38BDF8] border border-[#cfe4fb] dark:border-[#27272F] flex items-center justify-center flex-none">
                              <IconComp className="w-4 h-4" />
                            </span>
                            <span className="font-bold text-xs sm:text-sm text-[#1d1d1f] dark:text-white group-hover:text-[#0066cc] dark:group-hover:text-[#38BDF8] transition-colors">
                              {skill.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-extrabold text-[#1d1d1f] dark:text-white font-['Manrope']">{skill.progress}%</span>
                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${skill.statusColor}`}>
                              {skill.status}
                            </span>
                          </div>
                        </div>

                        <div className="w-full bg-[#f5f5f7] dark:bg-[#202026] h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#0066cc] dark:bg-[#38BDF8] h-full rounded-full transition-all duration-500"
                            style={{ width: `${skill.progress}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </section>

            {/* CARD C: Learning Streak & Mini Heatmap */}
            <section className="pf-glass-card p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#f5f5f7] dark:border-[#202026] gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-[#FFF7E6] dark:bg-amber-950/70 text-[#F59E0B] dark:text-amber-400 border border-[#FEE4B2] dark:border-amber-800/60 flex items-center justify-center flex-none shadow-xs">
                    <Flame className="w-5 h-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white">
                        Learning streak
                      </h2>
                      <span className="font-extrabold text-sm text-[#0066cc] dark:text-[#38BDF8] font-['Manrope']">{streak.current_streak} days</span>
                    </div>
                    <p className="text-xs text-[#6e6e73] dark:text-[#94A3B8]">
                      {streak.current_streak > 0
                        ? "You're building a consistent learning habit."
                        : 'Complete a roadmap task to start your streak.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold text-[#6e6e73] dark:text-[#CBD5E1]">
                  <span>{streak.current_streak} day current streak</span>
                  <span className="text-[#0066cc] dark:text-[#38BDF8]">{streak.best_streak} day best streak</span>
                </div>
              </div>

              {/* 5-Week Mini Heatmap Matrix */}
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex gap-2 overflow-x-auto pb-1 pf-custom-scrollbar">
                  {heatmapWeeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-1.5">
                      {week.map((intensity, dIdx) => (
                        <div
                          key={dIdx}
                          title={`Activity level: ${intensity}/4`}
                          className={`w-5 h-5 rounded-md ${getHeatmapColor(intensity)} transition-transform hover:scale-110 cursor-pointer border border-transparent dark:border-[#27272F]/40`}
                        />
                      ))}
                    </div>
                  ))}
                </div>

                <div className="p-3.5 bg-[#f5faff] dark:bg-[#18181D] border border-[#cfe4fb] dark:border-[#27272F] rounded-xl text-xs text-[#004fa3] dark:text-[#CBD5E1] font-medium leading-relaxed max-w-xs shadow-xs">
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

          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6 min-w-0">
            
            {/* RIGHT CARD 1: Weekly Activity Bar Chart */}
            <section className="pf-glass-card p-5 shadow-sm">
              <div className="pb-3 border-b border-[#f5f5f7] dark:border-[#202026]">
                <div className="flex items-center justify-between">
                  <h3 className="font-['Manrope'] font-bold text-sm text-[#1d1d1f] dark:text-white">
                    Weekly activity
                  </h3>
                  {streak.current_streak > 0 && (
                    <span className="text-[11px] font-bold text-[#0066cc] dark:text-[#38BDF8] bg-[#eaf2fc] dark:bg-[#18181D] px-2 py-0.5 rounded-full border border-[#cfe4fb] dark:border-[rgba(201,208,214,0.2)] font-['Manrope']">
                      {streak.current_streak}-day streak
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#6e6e73] dark:text-[#94A3B8] mt-0.5">Hours spent learning</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="font-['Manrope'] font-extrabold text-2xl text-[#1d1d1f] dark:text-white">
                    {weeklyHoursTotal} hrs
                  </span>
                  <span className="text-xs text-[#6e6e73] dark:text-[#94A3B8]">This week</span>
                </div>
              </div>

              {/* Dynamic Scaling Bar Chart */}
              <div className="h-36 w-full pt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyActivityData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f7" className="stroke-[#f0f0f0] dark:stroke-[#27272F]" />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 600 }}
                      axisLine={{ stroke: '#27272F' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, yAxisMax]}
                      tickCount={4}
                      tickFormatter={(val) => `${Math.round(val)}h`}
                      tick={{ fill: '#94A3B8', fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload
                          return (
                            <div className="bg-[#1d1d1f] dark:bg-[#0E0E12] border border-gray-700 dark:border-[#27272F] p-2.5 rounded-lg shadow-xl text-xs space-y-1 text-white">
                              <div className="font-bold text-white font-['Manrope']">{d.day}</div>
                              <div className="text-[#38BDF8] font-bold font-['Manrope']">{d.hours} hours logged</div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar
                      dataKey="hours"
                      fill="#0066cc"
                      className="dark:fill-[#38BDF8]"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* RIGHT CARD 2: AI Progress Insight Card ("PathFinder insight") */}
            <section className="pf-glass-card p-5 shadow-sm bg-[#f5faff] dark:bg-[#18181D] border border-[#cfe4fb] dark:border-[#27272F]">
              <div className="flex items-center gap-2 text-[#0066cc] dark:text-[#38BDF8] mb-2">
                <Sparkles className="w-4 h-4" />
                <h3 className="font-['Manrope'] font-bold text-xs uppercase tracking-wider text-[#0066cc] dark:text-[#38BDF8]">
                  PathFinder insight
                </h3>
              </div>
              <p className="text-xs text-[#004fa3] dark:text-[#CBD5E1] leading-relaxed">
                {roadmap.percent >= 50
                  ? "You have solid momentum! Tackling your hands-on deployment and interview prep steps next will maximize your career readiness."
                  : "Focus on finishing this week's active milestone tasks to keep your pace steady and unlock advanced modules on schedule."}
              </p>
              <button
                type="button"
                onClick={() => navigate('/skills')}
                className="mt-3 text-xs font-bold text-[#0066cc] dark:text-[#38BDF8] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View recommended skill resources</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </section>

            {/* RIGHT CARD 3: Next Best Actions (01, 02, 03) */}
            <section className="pf-glass-card p-5 shadow-sm">
              <div className="pb-3 border-b border-[#f5f5f7] dark:border-[#202026]">
                <h3 className="font-['Manrope'] font-bold text-sm text-[#1d1d1f] dark:text-white">
                  Your next best actions
                </h3>
                <p className="text-xs text-[#6e6e73] dark:text-[#94A3B8] mt-0.5">Recommended tasks for today</p>
              </div>

              <div className="space-y-3 mt-3">
                {nextActions.length === 0 && (
                  <p className="text-xs text-[#6e6e73] dark:text-[#94A3B8] italic">
                    {roadmap.weeks.length ? "You're all caught up!" : 'Generate a learning path to see your next actions.'}
                  </p>
                )}
                {nextActions.map((act) => {
                  return (
                    <div
                      key={act.id}
                      className="p-3 rounded-xl bg-[#fafafc] dark:bg-[#0E0E12] border border-[#f5f5f7] dark:border-[#202026] hover:-translate-y-0.5 hover:border-black/40 hover:shadow-md dark:hover:border-[#C9D0D6]/40 transition-all flex items-center justify-between gap-2"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="font-mono text-xs font-extrabold text-[#0066cc] dark:text-[#38BDF8] mt-0.5">
                          {act.id}
                        </span>
                        <div>
                          <h4 className="font-bold text-xs text-[#1d1d1f] dark:text-[#F8FAFC] font-['Manrope']">{act.title}</h4>
                          <span className="text-[10px] text-[#6e6e73] dark:text-[#94A3B8] font-medium">{act.duration}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="px-3 py-1 bg-[#0066cc] hover:bg-[#004fa3] text-white text-[11px] font-bold rounded-lg transition-colors flex-none cursor-pointer"
                      >
                        {act.buttonLabel}
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* RIGHT CARD 4: Contextual Roadmap Status Panel (Dynamic Weekly Goal) */}
            <section className="pf-glass-card p-5 shadow-sm space-y-4">
              {/* Item 1: Roadmap status */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-[#1d1d1f] dark:text-[#F8FAFC]">Roadmap status</span>
                  <span className="text-[#0066cc] dark:text-[#38BDF8] font-['Manrope']">{roadmap.percent}% complete</span>
                </div>
                <div className="w-full bg-[#f5f5f7] dark:bg-[#202026] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#0066cc] dark:bg-[#38BDF8] h-full rounded-full transition-all duration-500" style={{ width: roadmap.percent + '%' }} />
                </div>
                <p className="text-[11px] text-[#6e6e73] dark:text-[#94A3B8] mt-1 font-medium">
                  {roadmap.completedSteps} of {roadmap.totalSteps} steps completed.
                </p>
              </div>

              <hr className="border-[#f5f5f7] dark:border-[#202026]" />

              {/* Item 2: Dynamic This week's goal */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-[#1d1d1f] dark:text-[#F8FAFC]">This week's goal</span>
                  <span className={`font-['Manrope'] font-bold ${weeklyGoalPct >= 100 ? 'text-[#16A34A] dark:text-emerald-400' : 'text-[#0066cc] dark:text-[#38BDF8]'}`}>
                    {weeklyHoursTotal} / {targetWeeklyHours} hrs ({weeklyGoalPct}%)
                  </span>
                </div>
                <div className="w-full bg-[#f5f5f7] dark:bg-[#202026] h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      weeklyGoalPct >= 100 ? 'bg-[#16A34A] dark:bg-emerald-400' : 'bg-[#0066cc] dark:bg-[#38BDF8]'
                    }`}
                    style={{ width: `${weeklyGoalPct}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="mt-2 w-full py-1.5 bg-[#eaf2fc] dark:bg-[#18181D] text-[#0066cc] dark:text-[#38BDF8] hover:bg-[#0066cc] hover:text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Continue learning
                </button>
              </div>

              <hr className="border-[#f5f5f7] dark:border-[#202026]" />

              {/* Item 3: Current Week Context */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#6e6e73] dark:text-[#94A3B8]">Active step:</span>
                  <span className="font-bold text-[#0066cc] dark:text-[#38BDF8] font-['Manrope']">Week {roadmap.currentWeek}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6e6e73] dark:text-[#94A3B8]">Weeks finished:</span>
                  <span className="font-bold text-[#16A34A] dark:text-emerald-400 font-['Manrope']">{roadmap.weeks.filter(w => w.is_complete).length} of {roadmap.weeks.length}</span>
                </div>
              </div>
            </section>

          </div>

        </div>

        {/* -----------------------------------------------------------------------
            BOTTOM 2-COLUMN SECTION: Roadmap Milestones & Recent Activity (Side-by-Side)
           ----------------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left: Roadmap Milestones */}
          <section className="pf-glass-card p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="pb-4 border-b border-[#f5f5f7] dark:border-[#202026]">
                <h2 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white">
                  Roadmap milestones
                </h2>
                <p className="text-xs text-[#6e6e73] dark:text-[#94A3B8] mt-0.5">
                  Key milestones configured on your roadmap ({milestones.length} total)
                </p>
              </div>

              <div className="space-y-3 mt-3.5 max-h-[380px] overflow-y-auto pt-2 pb-2 px-1 -mx-1 pf-custom-scrollbar">
                {milestones.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#6e6e73] dark:text-[#94A3B8]">
                    No milestones found on your current path.
                  </div>
                ) : (
                  milestones.map((m) => {
                    const isCompleted = m.status === 'completed'
                    const isInProgress = m.status === 'in_progress'
                    const isLocked = m.status === 'locked'

                    return (
                      <div key={m.title} className="flex items-center gap-3.5 relative">
                        {isCompleted ? (
                          <span className="w-8 h-8 rounded-full bg-[#ECFDF3] dark:bg-emerald-950/70 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center flex-none border border-[#D1FADF] dark:border-emerald-800/60 shadow-sm">
                            <Check className="w-4 h-4" />
                          </span>
                        ) : isInProgress ? (
                          <span className="w-8 h-8 rounded-full bg-[#eaf2fc] dark:bg-[#18181D] text-[#0066cc] dark:text-[#38BDF8] flex items-center justify-center flex-none border-2 border-[#0066cc] dark:border-[#38BDF8] shadow-sm animate-pulse">
                            <Flag className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="w-8 h-8 rounded-full bg-[#fafafc] dark:bg-[#18181D] text-[#86868b] dark:text-[#94A3B8] flex items-center justify-center flex-none border border-[#e9e9e9] dark:border-[#27272F]">
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        )}

                        <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-[#fafafc] dark:bg-[#0E0E12] border border-[#f5f5f7] dark:border-[#202026] hover:-translate-y-0.5 hover:border-black/40 hover:shadow-md dark:hover:border-[#C9D0D6]/40 transition-all">
                          <div className="min-w-0">
                            <h4 className={`font-bold text-xs sm:text-sm truncate ${isInProgress ? 'text-[#0066cc] dark:text-[#38BDF8]' : isCompleted ? 'text-[#1d1d1f] dark:text-white' : 'text-[#475569] dark:text-[#CBD5E1]'}`}>
                              {m.title}
                            </h4>
                            <span className="text-[11px] text-[#6e6e73] dark:text-[#94A3B8] font-medium">{m.date}</span>
                          </div>

                          <div className="flex-none">
                            {isCompleted && (
                              <span className="px-2.5 py-1 rounded-md bg-[#ECFDF3] dark:bg-emerald-950/70 text-[#16A34A] dark:text-emerald-300 border border-[#D1FADF] dark:border-emerald-800 text-[10px] font-bold">
                                Completed
                              </span>
                            )}
                            {isInProgress && (
                              <span className="px-2.5 py-1 rounded-md bg-[#eaf2fc] dark:bg-[#18181D] text-[#0066cc] dark:text-[#38BDF8] border border-[#cfe4fb] dark:border-[#27272F] text-[10px] font-bold">
                                In Progress ({m.progress}%)
                              </span>
                            )}
                            {isLocked && (
                              <span className="px-2.5 py-1 rounded-md bg-[#f5f5f5] dark:bg-[#18181D] text-[#6e6e73] dark:text-[#94A3B8] border border-[#e5e5e5] dark:border-[#27272F] text-[10px] font-bold">
                                Upcoming
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </section>

          {/* Right: Recent Activity Card */}
          <section className="pf-glass-card p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="pb-4 border-b border-[#f5f5f7] dark:border-[#202026] flex items-center justify-between">
                <div>
                  <h2 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white">
                    Recent activity
                  </h2>
                  <p className="text-xs text-[#6e6e73] dark:text-[#94A3B8] mt-0.5">
                    Completed tasks and learning sessions
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllLogs((v) => !v)}
                  className="text-xs font-bold text-[#0066cc] dark:text-[#38BDF8] hover:underline cursor-pointer flex items-center gap-1 select-none"
                >
                  <span>{showAllLogs ? 'Show recent (4)' : 'View All logs'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAllLogs ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Scrollable container when full log is viewed */}
              <div
                className={`mt-4 ${
                  showAllLogs
                    ? 'space-y-2.5 max-h-[340px] overflow-y-auto pt-2 pb-2 px-2 pf-custom-scrollbar border border-[#e6eef8] dark:border-[#1E293B] rounded-xl p-2.5 bg-[#f8fbff]/60 dark:bg-[#0B0F17]/60'
                    : 'space-y-3 pt-2 pb-2 px-1 -mx-1'
                }`}
              >
                {displayedActivities.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#6e6e73] dark:text-[#94A3B8]">
                    No completed activities yet. Check off your first task on the Roadmap!
                  </div>
                ) : (
                  displayedActivities.map((act) => (
                    <div
                      key={act.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#fafafc] dark:bg-[#0E0E12] border border-[#f5f5f7] dark:border-[#202026] hover:bg-white dark:hover:bg-[#121216] hover:-translate-y-0.5 hover:border-black/40 hover:shadow-md dark:hover:border-[#C9D0D6]/40 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center flex-none bg-[#ECFDF3] dark:bg-emerald-950/70 text-[#16A34A] dark:text-emerald-400 border border-[#D1FADF] dark:border-emerald-800/60">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs text-[#1d1d1f] dark:text-white truncate">{act.title}</h4>
                          <p className="text-[11px] text-[#6e6e73] dark:text-[#94A3B8]">{act.time}</p>
                        </div>
                      </div>

                      <span className="text-[11px] font-bold text-[#16A34A] dark:text-emerald-300 bg-[#ECFDF3] dark:bg-emerald-950/70 px-2 py-0.5 rounded-md border border-[#D1FADF] dark:border-emerald-800 font-['Manrope'] flex-none">
                        {act.progressChange}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

        </div>

      </div>

      {/* Flowchart Poster & 1-Click PDF Export Modal */}
      <RoadmapInfographicModal
        isOpen={showPosterModal}
        onClose={() => setShowPosterModal(false)}
        roadmap={roadmap}
        cleanGoalTitle={roadmap.path?.goal_text?.split('.')[0] || 'Career'}
        targetRole={roadmap.path?.goal_text?.split('.')[0] || 'Career Path'}
        totalWeeks={roadmap.weeks?.length || 24}
      />
    </AppShell>
  )
}
