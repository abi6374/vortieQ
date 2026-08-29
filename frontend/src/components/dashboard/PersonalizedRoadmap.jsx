import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAIChat } from '../../contexts/AIChatContext'
import { useRoadmap } from '../../hooks/useRoadmap'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabaseClient'
import AppShell from '../layout/AppShell'

/**
 * PersonalizedRoadmap
 * High-fidelity, 100% dynamic learning workspace connected to real user pathData.
 *
 * Features:
 * - Real goal extraction & replanning
 * - Dynamic week tabs with real task filtering per selected week
 * - Reactive "Start Week X" button that launches the actual course link and records progress
 * - Interactive bottom milestone strip where clicking any milestone switches to its tasks
 * - Top-right user profile pill with dropdown info and sign out
 * - Floating AI Coach with context-aware responses
 */
export default function PersonalizedRoadmap({ pathData = null }) {
  const navigate = useNavigate()
  const { open: openAICoach } = useAIChat()
  // Real roadmap state: weeks, current week, lock state and completion all
  // come from the backend (GET /api/roadmap). No client-side fabrication.
  const roadmap = useRoadmap()
  const { user, profile, signOut } = useAuth()

  // Navigation tab state
  const [activeNav, setActiveNav] = useState('roadmap') // 'roadmap' | 'progress' | 'skills' | 'resources' | 'coach'

  // Selected week tab
  const [selectedWeek, setSelectedWeek] = useState('Week 1')

  // Selected milestone node in bottom strip
  const [activeMilestone, setActiveMilestone] = useState(1)

  // Task completion tracking by step ID
  // Completion is server state now; this Set is derived, never the source.
  const completedTaskIds = roadmap.completedIds

  // "Why this task?" expanded state per step ID
  const [expandedWhyIds, setExpandedWhyIds] = useState(new Set())

  // Notification toast for user actions
  const [toastMessage, setToastMessage] = useState(null)

  // Modals for other views (Resources, etc.)
  const [activeModal, setActiveModal] = useState(null)

  // (Completion state is derived from useRoadmap.completedIds now — the old
  // useEffect that seeded a local Set was dead code and referenced a setter
  // that no longer exists.)

  // Auto-expand the first NOT-YET-DONE real task's "Why this task?" panel ONCE by
  // default on initial load, but never overwrite user's manual toggles afterwards.
  const initializedWhyRef = useRef(false)
  useEffect(() => {
    if (!initializedWhyRef.current && roadmap.allSteps.length > 0) {
      const firstOpenStep = roadmap.allSteps.find((s) => s.status !== 'completed' && s.status !== 'skipped')
      if (firstOpenStep) {
        setExpandedWhyIds(new Set([firstOpenStep.step_id]))
        initializedWhyRef.current = true
      }
    }
  }, [roadmap.allSteps])

  // ---------------------------------------------------------------------------
  // Dynamic Week Grouping & Tabs
  // ---------------------------------------------------------------------------
  // Week tabs come from the backend's real week_number grouping.
  const weekTabs = useMemo(
    () => (roadmap.weeks.length ? roadmap.weeks.map((w) => `Week ${w.week_number}`) : ['Week 1']),
    [roadmap.weeks]
  )

  // Week -> {tasks, totalHrs, themeTitle, isLocked, lockedReason, isComplete}
  const weekGroups = useMemo(() => {
    const groups = {}
    roadmap.weeks.forEach((w) => {
      const tasks = (w.steps || []).map((st) => ({
        id: st.step_id,
        sequence_order: st.sequence_order,
        title: st.title,
        subtitle: (st.skill_tags || []).join(', ') || st.provider,
        provider: st.provider,
        duration_hrs: st.duration_hrs,
        difficulty: st.difficulty,
        skill_tags: st.skill_tags,
        resource_url: st.resource_url,
        explanation: st.explanation,
        status: st.status,
        milestone_label: st.milestone_label,
        // A course longer than the learner's weekly budget can now span
        // multiple weeks as separate parts (real, not synthesized here -
        // roadmap_service.plan_weeks_with_splits does the actual splitting).
        // duration_hrs above is already this PART's real hours, not the
        // whole course's, when partTotal > 1.
        partNumber: st.part_number || 1,
        partTotal: st.part_total || 1,
        fullDurationHrs: st.full_duration_hrs ?? st.duration_hrs,
      }))
      groups[`Week ${w.week_number}`] = {
        tasks,
        totalHrs: tasks.reduce((sum, t) => sum + (t.duration_hrs || 0), 0),
        themeTitle: w.milestone_label || `Week ${w.week_number}`,
        isLocked: w.is_locked,
        lockedReason: w.locked_reason,
        isComplete: w.is_complete,
        percent: w.percent,
        weekNumber: w.week_number,
        // Real live-web-search resources for this week (NPTEL, Coursera, etc.)
        // - the backend already computes these (roadmap_service.get_roadmap()),
        // this was just never read on the frontend before.
        webResources: w.web_resources || [],
      }
    })
    return groups
  }, [roadmap.weeks])

  // Follow the server's current week until the learner picks another tab.
  useEffect(() => {
    if (roadmap.currentWeek) setSelectedWeek(`Week ${roadmap.currentWeek}`)
  }, [roadmap.currentWeek])

  const currentWeekData = weekGroups[selectedWeek] || {
    tasks: [], totalHrs: 0, themeTitle: 'Your plan',
    isLocked: false, lockedReason: null, isComplete: false, percent: 0,
    webResources: [],
  }

  // ---------------------------------------------------------------------------
  // "Priority gaps" — real skill tags ranked by real completion % (lowest
  // first = biggest gap), from roadmap.allSteps. Same computation used on
  // /skills ("Top Skill Gaps"). Previously this widget hardcoded
  // "Statistics 30%" / "Machine Learning 18%" for every single learner.
  // ---------------------------------------------------------------------------
  const priorityGaps = useMemo(() => {
    const stats = {}
    roadmap.allSteps.forEach((s) => {
      ;(s.skill_tags || []).forEach((tag) => {
        if (!stats[tag]) stats[tag] = { total: 0, done: 0 }
        stats[tag].total += 1
        if (s.status === 'completed') stats[tag].done += 1
      })
    })
    return Object.entries(stats)
      .map(([tag, s]) => ({ tag, progress: Math.round((s.done / s.total) * 100) }))
      .filter((s) => s.progress < 100)
      .sort((a, b) => a.progress - b.progress)
      .slice(0, 2)
  }, [roadmap.allSteps])

  // ---------------------------------------------------------------------------
  // Milestone Nodes — one per REAL week, using that week's real milestone
  // label (or "Week N" if the backend didn't set one). Previously fell back to
  // a hardcoded 6-item Python/ML-specific list whenever the real path had
  // fewer than 4 distinct milestone labels - a Web Developer or Product
  // Manager's real 2-3-milestone path would silently show fake "Machine
  // Learning" / "Pandas & EDA" nodes that had nothing to do with their goal.
  // ---------------------------------------------------------------------------
  const milestoneNodes = useMemo(() => {
    return weekTabs.map((tab, idx) => {
      const wg = weekGroups[tab] || {}
      return {
        id: idx + 1,
        label: wg.themeTitle || tab,
        weekTab: tab,
        isLocked: !!wg.isLocked,
        isComplete: !!wg.isComplete,
      }
    })
  }, [weekTabs, weekGroups])

  // Handle clicking a milestone node
  const handleMilestoneClick = (milestone) => {
    setActiveMilestone(milestone.id)
    setSelectedWeek(milestone.weekTab)
    showToast(`Switched view to Milestone ${milestone.id}: ${milestone.label}`)
  }

  // ---------------------------------------------------------------------------
  // Task Interactions (Completion & "Why this task?")
  // ---------------------------------------------------------------------------
  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Two-way completion, persisted server-side. The backend enforces week
  // prerequisites and returns the whole recomputed roadmap, so Progress and
  // Skill insights stay in step without extra requests.
  //
  // Completing a task requires a real natural-language note first (see
  // pendingCompleteTask/completeNote below) - the backend uses accumulated
  // notes from a finished week to reconsider the NEXT not-started week's
  // course selection (feedback_service.apply_week_feedback). Un-completing
  // needs no note - nothing to act on there.
  const [pendingCompleteTask, setPendingCompleteTask] = useState(null)
  const [completeNote, setCompleteNote] = useState('')
  const [completeNoteError, setCompleteNoteError] = useState('')

  const toggleTask = async (task) => {
    const isCompleted = completedTaskIds.has(task.id)
    if (!isCompleted) {
      setPendingCompleteTask(task)
      setCompleteNote('')
      setCompleteNoteError('')
      return
    }
    const result = await roadmap.toggleTask(task.id, false)
    if (!result.ok) {
      showToast(result.reason || 'Unable to update. Try again.')
      return
    }
    showToast(`Marked "${task.title}" as pending.`)
  }

  const confirmCompleteTask = async () => {
    if (!completeNote.trim()) {
      setCompleteNoteError('A quick note is required so we can improve what comes next.')
      return
    }
    const task = pendingCompleteTask
    if (!task) return
    const result = await roadmap.toggleTask(task.id, true, completeNote.trim())
    if (!result.ok) {
      showToast(result.reason || 'Unable to update. Try again.')
      setPendingCompleteTask(null)
      return
    }
    setPendingCompleteTask(null)
    setCompleteNote('')
    showToast(`🎉 Completed "${task.title}"! Progress updated.`)
  }

  const toggleWhy = (taskId) => {
    setExpandedWhyIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  // ---------------------------------------------------------------------------
  // "Start Week X" functional action
  // ---------------------------------------------------------------------------
  const handleStartWeek = () => {
    const pendingTask = currentWeekData.tasks.find((t) => !completedTaskIds.has(t.id))

    if (pendingTask) {
      // Launch the course resource
      if (pendingTask.resource_url) {
        window.open(pendingTask.resource_url, '_blank')
      }
      toggleTask(pendingTask)
      showToast(`🚀 Started task: "${pendingTask.title}"`)
    } else {
      // All tasks in this week are completed
      showToast(`🌟 All tasks for ${selectedWeek} are already completed! Great job!`)
    }
  }

  // Count completions for current week
  const weekCompletedCount = currentWeekData.tasks.filter((t) =>
    completedTaskIds.has(t.id)
  ).length

  // Goal title for heading & cards. Real profile.target_role (e.g. "Data
  // Analyst") is the primary source now - short and reliable, computed
  // server-side by the actual profile-extraction LLM call (or the explicit
  // role the learner picked in GoalCompass), not guessed client-side.
  // Previously this only ever regex-stripped the FULL goal sentence (e.g.
  // "Become a data analyst using Python and SQL for real-world BI
  // projects") and showed all of it as the header instead of just the real
  // target role - the regex cleanup is kept only as a fallback for the rare
  // case target_role hasn't been set yet.
  const rawGoalText = profile?.goal_text || roadmap.path?.goal_text || pathData?.goal_text || ''
  const targetRole = roadmap.path?.target_role || ''
  const cleanGoalTitle = useMemo(() => {
    if (targetRole) return targetRole
    if (!rawGoalText) return 'your learning goal'
    let text = rawGoalText.split('I can study')[0].trim()
    text = text.replace(
      /^(I want to become an?|I want to become|I want to be an?|I want to be|I want an?|I want|My goal is to become an?|My goal is to be an?|My goal is to|My goal is)\s+/i,
      ''
    )
    text = text.charAt(0).toUpperCase() + text.slice(1)
    text = text.replace(/\.$/, '').trim()
    return text || 'your learning goal'
  }, [rawGoalText, targetRole])

  const handleNavClick = (navId) => {
    setActiveNav(navId)
    if (navId === 'roadmap') {
      setActiveModal(null)
    } else if (navId === 'skills') {
      navigate('/skills')
    } else if (navId === 'resources') {
      navigate('/resources')
    } else if (navId === 'progress') {
      navigate('/progress')
    } else if (navId === 'coach') {
      openAICoach()
    }
  }

  return (
    <AppShell
      topBar={
        <div className="bg-white border border-[#e0e0e0] hover:border-[#d2d2d7] rounded-2xl px-3.5 py-2 flex items-center gap-3 shadow-2xs min-w-0">
          <span className="w-8 h-8 rounded-xl bg-[#eaf2fc] text-[#0066cc] flex items-center justify-center flex-none">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          </span>
          <div className="text-left min-w-0">
            <h2 className="font-['Manrope'] font-bold text-xs sm:text-[13px] text-[#1d1d1f] leading-tight max-w-[220px] truncate">
              {cleanGoalTitle}
            </h2>
            <p className="text-[10px] text-[#7a7a7a] font-medium leading-tight mt-0.5">
              Target: Ongoing Pace
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/onboarding')}
            className="px-2.5 py-1 rounded-lg border border-[#e0e0e0] hover:border-[#0066cc] hover:bg-[#eaf2fc] text-[#0066cc] text-xs font-bold transition-colors cursor-pointer flex-none"
          >
            Replan
          </button>
        </div>
      }
    >
          {/* Page header */}
          <div className="mb-6">
            <h1 className="font-['Manrope'] font-extrabold text-2xl sm:text-3xl text-[#1d1d1f] tracking-tight">
              Your path to: {cleanGoalTitle}
            </h1>
            <p className="text-sm sm:text-base text-[#333333] mt-1 font-normal">
              Personalized roadmap calibrated from your skills and weekly availability.
            </p>
          </div>

          {/* 3 Top Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-[#e0e0e0] rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-2xs">
              <span className="w-12 h-12 rounded-xl bg-[#eaf2fc] text-[#0066cc] flex items-center justify-center flex-none">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
              <div>
                <div className="font-['Manrope'] font-extrabold text-2xl sm:text-[26px] text-[#1d1d1f] leading-none">
                  {weekTabs.length}
                </div>
                <div className="text-xs sm:text-sm font-medium text-[#333333] mt-1">
                  weeks total
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#e0e0e0] rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-2xs">
              <span className="w-12 h-12 rounded-xl bg-[#eaf2fc] text-[#0066cc] flex items-center justify-center flex-none">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              <div>
                <div className="font-['Manrope'] font-extrabold text-2xl sm:text-[26px] text-[#1d1d1f] leading-none">
                  {currentWeekData.totalHrs}
                </div>
                <div className="text-xs sm:text-sm font-medium text-[#333333] mt-1">
                  hrs/week
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#e0e0e0] rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-2xs">
              <span className="w-12 h-12 rounded-xl bg-[#eaf2fc] text-[#0066cc] flex items-center justify-center flex-none">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              </span>
              <div>
                <div className="font-['Manrope'] font-extrabold text-2xl sm:text-[26px] text-[#1d1d1f] leading-none">
                  {roadmap.percent}%
                </div>
                <div className="text-xs sm:text-sm font-medium text-[#333333] mt-1">
                  curriculum completed
                </div>
              </div>
            </div>
          </div>

          {/* Main 2-Column Section: roadmap timeline + 330px right rail */}
          <div className="grid pf-roadmap-grid gap-6 items-start">

            {/* LEFT COLUMN: Your learning roadmap */}
            <div className="bg-white border border-[#e0e0e0] rounded-2xl p-6 sm:p-7 shadow-[0_4px_20px_rgba(25,49,75,0.03)] flex flex-col justify-between min-w-0">
              <div>
                <h2 className="font-['Manrope'] font-bold text-lg text-[#1d1d1f] mb-4">
                  Your learning roadmap
                </h2>

                {/* Week Tabs Navigation */}
                <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-[#f5f5f7]">
                  {weekTabs.map((tab) => {
                    const isSel = selectedWeek === tab
                    const wg = weekGroups[tab] || {}
                    // Locked weeks stay VISIBLE but muted with a lock icon —
                    // the learner can still open them to see what's ahead.
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setSelectedWeek(tab)}
                        title={wg.isLocked ? wg.lockedReason : undefined}
                        className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                          isSel
                            ? 'bg-[#0066cc] text-white shadow-sm'
                            : wg.isLocked
                            ? 'bg-white text-[#86868b] hover:bg-gray-50'
                            : 'bg-white text-[#333333] hover:text-[#1d1d1f] hover:bg-gray-100/70'
                        }`}
                      >
                        {wg.isComplete && !isSel && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22A06B" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                        )}
                        {wg.isLocked && (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                        )}
                        {tab}
                      </button>
                    )
                  })}
                </div>

                {currentWeekData.isLocked && (
                  <div className="mb-4 flex items-center gap-3 rounded-xl border px-4 py-3"
                       style={{ background: '#FEF6E7', borderColor: '#F3DB9B' }}>
                    <span className="grid place-items-center rounded-full flex-none"
                          style={{ width: 28, height: 28, background: '#E0A100', color: '#fff' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                    </span>
                    <span className="text-sm font-semibold" style={{ color: '#8A6100' }}>
                      {currentWeekData.lockedReason || 'Complete the previous week to unlock this one.'}
                    </span>
                  </div>
                )}

                {/* Active Week Theme Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-['Manrope'] font-bold text-base text-[#1d1d1f]">
                      {currentWeekData.themeTitle}
                    </h3>
                    {selectedWeek === 'Week 1' && (
                      <span className="bg-[#eaf2fc] text-[#0066cc] font-bold text-xs px-2.5 py-0.5 rounded-full">
                        Current week
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[#7a7a7a] font-medium">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>{currentWeekData.totalHrs} hours</span>
                  </div>
                </div>

                {/* Dynamic Task List for Selected Week */}
                <div className="space-y-3.5">
                  {currentWeekData.tasks.map((task) => {
                    const isCompleted = completedTaskIds.has(task.id)
                    const isExpanded = expandedWhyIds.has(task.id)

                    return (
                      <div key={task.id} className="space-y-2">
                        <div className={`border rounded-xl p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-colors ${
                          isCompleted
                            ? 'border-[#22A06B]/30 bg-[#F6FEF9]'
                            : 'border-[#e0e0e0] bg-white hover:border-[#0066cc]/40'
                        }`}>
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* Checkbox button */}
                            <button
                              type="button"
                              onClick={() => toggleTask(task)}
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
                                isCompleted
                                  ? 'bg-[#22A06B] border-[#22A06B] text-white shadow-xs'
                                  : 'border-[#d2d2d7] hover:border-[#0066cc]'
                              }`}
                              aria-label="Toggle task completion"
                            >
                              {isCompleted && (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </button>

                            {/* Task Icon / Emoji */}
                            <span className="w-9 h-9 rounded-lg bg-[#eaf2fc] text-[#0066cc] flex items-center justify-center flex-none font-bold text-sm">
                              {task.skill_tags?.[0]?.toLowerCase().includes('python')
                                ? '🐍'
                                : task.skill_tags?.[0]?.toLowerCase().includes('stat')
                                ? '📊'
                                : task.skill_tags?.[0]?.toLowerCase().includes('pandas')
                                ? '🐼'
                                : task.skill_tags?.[0]?.toLowerCase().includes('ml') || task.skill_tags?.[0]?.toLowerCase().includes('learn')
                                ? '🧠'
                                : '⚡'}
                            </span>

                            {/* Title & Subtitle */}
                            <div className="min-w-0">
                              <h4 className={`font-bold text-sm text-[#1d1d1f] truncate flex items-center gap-1.5 ${isCompleted ? 'line-through opacity-60' : ''}`}>
                                <span className="truncate">{task.title}</span>
                                {task.partTotal > 1 && (
                                  <span className="flex-none text-[10px] font-bold text-[#0066cc] bg-[#eaf2fc] px-1.5 py-0.5 rounded-full no-underline">
                                    Part {task.partNumber}/{task.partTotal}
                                  </span>
                                )}
                              </h4>
                              <p className="text-xs text-[#7a7a7a] mt-0.5 truncate">
                                {task.subtitle}
                              </p>
                            </div>
                          </div>

                          {/* Right Controls */}
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span
                              className="text-xs font-semibold text-[#0066cc] bg-[#eaf2fc] px-2.5 py-1 rounded-lg"
                              title={task.partTotal > 1 ? `${task.duration_hrs}h this week of ${task.fullDurationHrs}h total` : undefined}
                            >
                              {task.duration_hrs} hrs
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleWhy(task.id)}
                              className="text-xs font-semibold text-[#0066cc] hover:underline whitespace-nowrap cursor-pointer"
                            >
                              Why this?
                            </button>
                            {task.resource_url && (
                              <a
                                href={task.resource_url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-white border border-[#e0e0e0] hover:border-[#0066cc] hover:text-[#0066cc] rounded-lg text-xs font-semibold text-[#333333] transition-colors"
                              >
                                Open ↗
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Expanded "Why this task?" explanation */}
                        {isExpanded && (
                          <div className="bg-[#eaf2fc] border-l-[3.5px] border-[#0066cc] rounded-xl p-4 sm:p-5 relative animate-in fade-in duration-150">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-['Manrope'] font-bold text-xs sm:text-sm text-[#0066cc]">
                                Why this task?
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleWhy(task.id)}
                                className="text-[#0066cc] hover:opacity-75 focus:outline-none cursor-pointer"
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="18 15 12 9 6 15" />
                                </svg>
                              </button>
                            </div>
                            <p className="text-xs sm:text-sm text-[#1d1d1f] leading-relaxed">
                              {task.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ROADMAP MILESTONE STRIP (Bottom Nodes with Arrows) */}
              <div className="mt-8 pt-6 border-t border-[#f5f5f7]">
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {milestoneNodes.map((node, i) => {
                    const isSelected = activeMilestone === node.id
                    return (
                      <React.Fragment key={node.id}>
                        {i > 0 && (
                          <span className="text-[#d2d2d7] font-bold text-sm flex-none">
                            →
                          </span>
                        )}
                        <div
                          onClick={() => handleMilestoneClick(node)}
                          className={`flex-none rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-w-[95px] sm:min-w-[110px] border ${
                            isSelected
                              ? 'border-2 border-[#0066cc] bg-[#eaf2fc] shadow-xs ring-2 ring-[#0066cc]/10'
                              : node.isComplete
                              ? 'border-[#22A06B]/40 bg-[#F6FEF9] shadow-2xs hover:border-[#22A06B]'
                              : 'border-[#e0e0e0] bg-white hover:border-[#d2d2d7]'
                          }`}
                        >
                          {/* Consistent Clean Circle Number */}
                          <span
                            className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center mb-1 ${
                              isSelected
                                ? 'bg-[#0066cc] text-white shadow-xs'
                                : 'bg-[#333333] text-white'
                            }`}
                          >
                            {node.id}
                          </span>

                          {/* Milestone Label */}
                          <span className="text-[11px] sm:text-xs font-bold text-[#1d1d1f] leading-tight truncate max-w-[95px]">
                            {node.label}
                          </span>

                          {/* Real state badge: locked / complete / real step number */}
                          {node.isLocked ? (
                            <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-[#86868b] bg-[#f5f5f5] border border-[#e9e9e9] px-1.5 py-0.5 rounded-full mt-1 shadow-2xs">
                              🔒 Locked
                            </span>
                          ) : node.isComplete ? (
                            <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-[#22A06B] bg-[#ECFDF3] border border-[#D1FADF] px-1.5 py-0.5 rounded-full mt-1 shadow-2xs">
                              ✓ Complete
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#7a7a7a] mt-1">
                              Step {node.id}
                            </span>
                          )}
                        </div>
                      </React.Fragment>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: 3 Stacked Widgets */}
            <div className="space-y-5 min-w-0">
              
              {/* WIDGET 1: "This week's plan" */}
              <div className="bg-[#eaf2fc] border border-[#e1effe] rounded-2xl p-5 sm:p-6 shadow-sm">
                <h3 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] mb-4">
                  This week’s plan ({selectedWeek})
                </h3>

                <div className="flex items-center gap-4 mb-5">
                  {/* Progress Ring */}
                  <div className="relative w-20 h-20 flex-none">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="20" fill="none" stroke="#d7e8fa" strokeWidth="4.5" />
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        fill="none"
                        stroke="#0066cc"
                        strokeWidth="4.5"
                        strokeDasharray="125.6"
                        strokeDashoffset={
                          125.6 -
                          (125.6 * (weekCompletedCount / Math.max(currentWeekData.tasks.length, 1)))
                        }
                        strokeLinecap="round"
                        className="transition-all duration-300"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="font-['Manrope'] font-extrabold text-sm text-[#1d1d1f] leading-tight">
                        {weekCompletedCount} of {currentWeekData.tasks.length}
                      </span>
                      <span className="text-[10px] text-[#7a7a7a] font-semibold">
                        tasks
                      </span>
                    </div>
                  </div>

                  {/* Checklist Summary */}
                  <div className="space-y-1.5 text-xs text-[#1d1d1f] font-medium min-w-0">
                    {currentWeekData.tasks.map((t) => (
                      <div key={t.id} className="flex items-center gap-2 truncate">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          completedTaskIds.has(t.id) ? 'bg-[#22A06B]' : 'bg-[#e0e0e0]'
                        }`} />
                        <span className={`truncate ${completedTaskIds.has(t.id) ? 'line-through text-[#7a7a7a]' : ''}`}>
                          {t.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Start Week Button */}
                <button
                  type="button"
                  onClick={handleStartWeek}
                  className="w-full py-3 bg-[#0066cc] hover:bg-[#004fa3] active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>
                    {weekCompletedCount === currentWeekData.tasks.length
                      ? `Completed ${selectedWeek} 🎉`
                      : `Start ${selectedWeek}`}
                  </span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>

              {/* WIDGET 2: Priority Gaps — real skill tags, real gap %, from
                  the learner's actual roadmap steps. */}
              <div className="bg-white border border-[#e0e0e0] rounded-2xl p-5 sm:p-6 shadow-2xs">
                <h3 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] mb-4">
                  Priority gaps
                </h3>

                {priorityGaps.length > 0 ? (
                  <div className="space-y-3.5">
                    {priorityGaps.map((g) => (
                      <div key={g.tag}>
                        <div className="flex justify-between text-xs font-bold text-[#1d1d1f] mb-1">
                          <span className="capitalize">{g.tag}</span>
                          <span className="text-[#0066cc]">{g.progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-[#f2f2f2] rounded-full overflow-hidden">
                          <div className="h-full bg-[#0066cc] rounded-full" style={{ width: `${g.progress}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#86868b]">No skill gaps yet — keep completing steps to see this fill in.</p>
                )}

                <button
                  type="button"
                  onClick={() => navigate('/skills')}
                  className="mt-4 text-xs font-bold text-[#0066cc] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View skill insights</span>
                  <span>→</span>
                </button>
              </div>

              {/* WIDGET 3: Recommended for you — a real live-web-search
                  resource for the current week (NPTEL, Coursera, etc. -
                  backend already computes this via web_search_service, it
                  just never reached this component before). Previously this
                  duplicated the first task already shown above and fell back
                  to a hardcoded Python-docs link when none existed - neither
                  was a real recommendation. */}
              <div className="bg-white border border-[#e0e0e0] rounded-2xl p-5 sm:p-6 shadow-2xs">
                <h3 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] mb-3">
                  Recommended for you
                </h3>

                {currentWeekData.webResources?.[0] ? (
                  <div className="flex items-center justify-between gap-3 p-3 bg-[#f9fcff] border border-[#e1effe] rounded-xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-full bg-[#dbeafc] text-[#0066cc] flex items-center justify-center flex-none">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[#1d1d1f] max-w-[130px] truncate">
                          {currentWeekData.webResources[0].title || currentWeekData.webResources[0].url}
                        </h4>
                        <p className="text-[11px] text-[#7a7a7a] truncate max-w-[150px]">
                          {(() => {
                            try { return new URL(currentWeekData.webResources[0].url).hostname.replace('www.', '') }
                            catch { return 'External resource' }
                          })()}
                        </p>
                      </div>
                    </div>

                    <a
                      href={currentWeekData.webResources[0].url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 bg-white border border-[#0066cc] text-[#0066cc] hover:bg-[#0066cc] hover:text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex-none"
                    >
                      Open
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-[#86868b]">No extra resources found for this week yet.</p>
                )}
              </div>

            </div>
          </div>

      {/* Mandatory feedback note before a task completion goes through - real
          notes get used to reconsider the next not-started week's courses
          once the current week is fully done (see feedback_service.
          apply_week_feedback on the backend). */}
      {pendingCompleteTask && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setPendingCompleteTask(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-base text-[#1d1d1f] mb-1">How did this go?</h3>
            <p className="text-sm text-[#6e6e73] mb-4">
              Marking <span className="font-semibold text-[#1d1d1f]">"{pendingCompleteTask.title}"</span> as done.
              A quick note helps us pick better courses for what's next.
            </p>
            <textarea
              autoFocus
              value={completeNote}
              onChange={(e) => { setCompleteNote(e.target.value); if (completeNoteError) setCompleteNoteError('') }}
              placeholder="e.g. This was too easy, I already knew most of it / This was perfect, more like this please / Too theoretical, I wanted more hands-on practice..."
              rows={3}
              className="w-full border border-[#e0e0e0] rounded-xl px-3.5 py-2.5 text-sm text-[#1d1d1f] focus:outline-none focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/15 resize-none"
            />
            {completeNoteError && (
              <p className="text-xs font-semibold text-red-600 mt-1.5">{completeNoteError}</p>
            )}
            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setPendingCompleteTask(null)}
                className="px-4 py-2 text-sm font-semibold text-[#333333] hover:text-[#1d1d1f]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmCompleteTask}
                disabled={!completeNote.trim()}
                className="px-5 py-2 bg-[#0066cc] hover:bg-[#004fa3] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-sm"
              >
                Mark done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification — the global "Ask PathFinder" FAB (AIChat, mounted
          once in App.jsx) already covers the floating assistant; no per-page
          duplicate here. */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1d1d1f] text-white px-5 py-2.5 rounded-xl shadow-xl text-xs sm:text-sm font-semibold animate-in fade-in slide-in-from-bottom duration-150 flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}
    </AppShell>
  )
}
