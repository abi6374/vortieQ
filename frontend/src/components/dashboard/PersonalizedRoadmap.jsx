import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAIChat } from '../../contexts/AIChatContext'
import { useRoadmap } from '../../hooks/useRoadmap'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabaseClient'
import AppShell from '../layout/AppShell'
import ConnectGitHubModal from '../ui/ConnectGitHubModal'

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
 * - Non-blocking top GitHub Roadmap Booster banner
 */
export default function PersonalizedRoadmap({
  pathData,
  onReset,
  onToggleTask,
  onApplyFeedback,
}) {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { openCoach: openAICoach } = useAIChat()

  // Centralized roadmap state (persisted in Supabase via roadmap_service)
  const roadmap = useRoadmap(pathData)

  // Local state for week navigation
  const [selectedWeek, setSelectedWeek] = useState('Week 1')
  const [activeMilestone, setActiveMilestone] = useState(1)
  const [expandedWhyIds, setExpandedWhyIds] = useState(new Set())
  const [activeNav, setActiveNav] = useState('roadmap')

  // Notification toast for user actions
  const [toastMessage, setToastMessage] = useState(null)

  // Modals for other views (Resources, etc.)
  const [activeModal, setActiveModal] = useState(null)
  const [showGitHubModal, setShowGitHubModal] = useState(false)

  // Scoped ref for "Remind me later" within this page mount
  const remindLaterDismissedRef = useRef(false)

  // Prompt Google / Email users to link GitHub if not yet linked and not permanently dismissed
  useEffect(() => {
    if (!user) return
    const userId = user.id
    const hasGitHub =
      user.app_metadata?.provider?.includes('github') ||
      user.user_metadata?.user_name ||
      profile?.github_username
    const preference = localStorage.getItem(`pf_github_preference_${userId}`)

    if (!hasGitHub && preference !== 'no_github' && preference !== 'connected' && !remindLaterDismissedRef.current) {
      const timer = setTimeout(() => {
        if (!remindLaterDismissedRef.current) {
          setShowGitHubModal(true)
        }
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [user, profile])

  // Auto-expand the first NOT-YET-DONE real task's "Why this task?" panel ONCE by default
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
  const weekTabs = useMemo(
    () => (roadmap.weeks.length ? roadmap.weeks.map((w) => `Week ${w.week_number}`) : ['Week 1']),
    [roadmap.weeks]
  )

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
        webResources: w.web_resources || [],
      }
    })
    return groups
  }, [roadmap.weeks])

  // Follow the server's current week until the learner picks another tab
  useEffect(() => {
    if (roadmap.currentWeek) setSelectedWeek(`Week ${roadmap.currentWeek}`)
  }, [roadmap.currentWeek])

  const currentWeekData = weekGroups[selectedWeek] || {
    tasks: [], totalHrs: 0, themeTitle: 'Your plan',
    isLocked: false, lockedReason: null, isComplete: false, percent: 0,
    webResources: [],
  }

  // ---------------------------------------------------------------------------
  // Priority Gaps
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
  // Milestone Nodes (Bottom Strip)
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

  const handleMilestoneClick = (milestone) => {
    setActiveMilestone(milestone.id)
    setSelectedWeek(milestone.weekTab)
    showToast(`Switched view to Milestone ${milestone.id}: ${milestone.label}`)
  }

  // ---------------------------------------------------------------------------
  // Task Interactions (Completion & Notes)
  // ---------------------------------------------------------------------------
  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

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

  const handleStartWeek = () => {
    const pendingTask = currentWeekData.tasks.find((t) => !completedTaskIds.has(t.id))
    if (pendingTask) {
      if (pendingTask.resource_url) {
        window.open(pendingTask.resource_url, '_blank')
      }
      toggleTask(pendingTask)
      showToast(`🚀 Started task: "${pendingTask.title}"`)
    } else {
      showToast(`🌟 All tasks for ${selectedWeek} are already completed! Great job!`)
    }
  }

  const completedTaskIds = roadmap.completedIds
  const weekCompletedCount = currentWeekData.tasks.filter((t) => completedTaskIds.has(t.id)).length

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

      {/* GitHub Recommendation Booster Top Banner (Non-blocking, zero screen blackout) */}
      <ConnectGitHubModal
        isOpen={showGitHubModal}
        onClose={() => setShowGitHubModal(false)}
        onRemindLater={() => { remindLaterDismissedRef.current = true }}
        onConnected={(ghData) => {
          setToastMessage(`GitHub synced! Calibrated ${ghData.topics?.length || 0} skills & portfolio depth.`)
          setTimeout(() => setToastMessage(null), 3500)
        }}
      />

      {/* 3 Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6 mb-6">
        <div className="pf-glass-card p-5 sm:p-6 flex items-center gap-5 sm:gap-6">
          <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#eaf2fc] to-[#dbeafc] text-[#0066cc] flex items-center justify-center flex-none shadow-sm mr-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </span>
          <div>
            <div className="font-['Manrope'] font-extrabold text-2xl sm:text-[28px] text-[#1d1d1f] leading-none tracking-tight">
              {weekTabs.length}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-[#555555] mt-1.5">
              weeks total
            </div>
          </div>
        </div>

        <div className="pf-glass-card p-5 sm:p-6 flex items-center gap-5 sm:gap-6">
          <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#eaf2fc] to-[#dbeafc] text-[#0066cc] flex items-center justify-center flex-none shadow-sm mr-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
          <div>
            <div className="font-['Manrope'] font-extrabold text-2xl sm:text-[28px] text-[#1d1d1f] leading-none tracking-tight">
              {currentWeekData.totalHrs}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-[#555555] mt-1.5">
              hrs/week
            </div>
          </div>
        </div>

        <div className="pf-glass-card p-5 sm:p-6 flex items-center gap-5 sm:gap-6">
          <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ECFDF3] to-[#D1FADF] dark:from-emerald-950/80 dark:to-emerald-900/60 text-[#22A06B] dark:text-emerald-400 border border-transparent dark:border-emerald-800/60 flex items-center justify-center flex-none shadow-sm mr-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </span>
          <div>
            <div className="font-['Manrope'] font-extrabold text-2xl sm:text-[28px] text-[#1d1d1f] leading-none tracking-tight">
              {roadmap.percent}%
            </div>
            <div className="text-xs sm:text-sm font-semibold text-[#555555] mt-1.5">
              curriculum completed
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Section: roadmap timeline + 330px right rail */}
      <div className="grid pf-roadmap-grid gap-6 items-start">

        {/* LEFT COLUMN: Your learning roadmap */}
        <div className="pf-glass-card p-6 sm:p-7 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-['Manrope'] font-bold text-lg text-[#1d1d1f]">
                Your learning roadmap
              </h2>
            </div>

            {/* Week Selector Chips */}
            <div className="flex flex-wrap gap-2 mb-6">
              {weekTabs.map((tab) => {
                const isSelected = selectedWeek === tab
                const wg = weekGroups[tab] || {}
                const isLocked = !!wg.isLocked
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSelectedWeek(tab)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[#0066cc] text-white shadow-xs'
                        : isLocked
                        ? 'bg-[#fafbfc] dark:bg-[#101622] text-[#86868b] dark:text-[#94A3B8] border border-[#f0f0f0] dark:border-[#242E40] opacity-85'
                        : 'bg-[#f5f5f7] dark:bg-[#1A2232] text-[#333333] dark:text-[#CBD5E1] hover:bg-[#eaf2fc] dark:hover:bg-blue-950/40 hover:text-[#0066cc] dark:hover:text-[#38BDF8]'
                    }`}
                  >
                    {isLocked && (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                    )}
                    {tab}
                  </button>
                )
              })}
            </div>

            {currentWeekData.isLocked && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#F3DB9B] dark:border-amber-800/60 bg-[#FEF6E7] dark:bg-amber-950/40 px-4 py-3 shadow-xs">
                <span className="grid place-items-center rounded-full flex-none w-7 h-7 bg-[#E0A100] text-white">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                </span>
                <span className="text-sm font-semibold text-[#8A6100] dark:text-amber-300">
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
                        ? 'border-[#22A06B]/30 dark:border-emerald-800/60 bg-[#F6FEF9] dark:bg-emerald-950/20'
                        : 'border-[#e0e0e0] dark:border-[#242E40] bg-white dark:bg-[#141A26] hover:border-[#0066cc]/40 dark:hover:border-[#38BDF8]/40'
                    }`}>
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Checkbox button */}
                        <button
                          type="button"
                          onClick={() => toggleTask(task)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
                            isCompleted
                              ? 'bg-[#22A06B] dark:bg-emerald-500 border-[#22A06B] dark:border-emerald-500 text-white shadow-xs'
                              : 'border-[#d2d2d7] dark:border-[#475569] hover:border-[#0066cc] dark:hover:border-[#38BDF8]'
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
                        <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-none font-bold text-sm ${
                          isCompleted
                            ? 'bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-[#eaf2fc] dark:bg-[#1E293B] text-[#0066cc] dark:text-[#38BDF8] border border-[#cfe4fb] dark:border-[#242E40]'
                        }`}>
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
                          <h4 className={`font-bold text-sm truncate flex items-center gap-1.5 ${
                            isCompleted
                              ? 'line-through text-emerald-900 dark:text-emerald-300/80'
                              : 'text-[#1d1d1f] dark:text-white'
                          }`}>
                            <span className="truncate">{task.title}</span>
                            {task.partTotal > 1 && (
                              <span className={`flex-none text-[10px] font-bold px-1.5 py-0.5 rounded-full no-underline ${
                                isCompleted
                                  ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                                  : 'text-[#0066cc] dark:text-[#38BDF8] bg-[#eaf2fc] dark:bg-sky-950/70 border border-[#cfe4fb] dark:border-sky-800/60'
                              }`}>
                                Part {task.partNumber}/{task.partTotal}
                              </span>
                            )}
                          </h4>
                          <p className={`text-xs mt-0.5 truncate ${
                            isCompleted
                              ? 'text-emerald-700/70 dark:text-emerald-400/60'
                              : 'text-[#7a7a7a] dark:text-[#94A3B8]'
                          }`}>
                            {task.subtitle}
                          </p>
                        </div>
                      </div>

                      {/* Right Controls */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                            isCompleted
                              ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/60'
                              : 'text-[#0066cc] dark:text-[#38BDF8] bg-[#eaf2fc] dark:bg-sky-950/70 border border-[#cfe4fb] dark:border-sky-800/60'
                          }`}
                          title={task.partTotal > 1 ? `${task.duration_hrs}h this week of ${task.fullDurationHrs}h total` : undefined}
                        >
                          {task.duration_hrs} hrs
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleWhy(task.id)}
                          className={`text-xs font-semibold hover:underline whitespace-nowrap cursor-pointer ${
                            isCompleted
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-[#0066cc] dark:text-[#38BDF8]'
                          }`}
                        >
                          Why this?
                        </button>
                        {task.resource_url && (
                          <a
                            href={task.resource_url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-white dark:bg-[#1E293B] border border-[#e0e0e0] dark:border-[#242E40] hover:border-[#0066cc] dark:hover:border-[#38BDF8] hover:text-[#0066cc] dark:hover:text-[#38BDF8] rounded-lg text-xs font-semibold text-[#333333] dark:text-white transition-colors"
                          >
                            Open ↗
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Expanded "Why this task?" explanation */}
                    {isExpanded && (
                      <div className="bg-[#eaf2fc] dark:bg-[#142036] border-l-[3.5px] border-[#0066cc] dark:border-[#38BDF8] rounded-xl p-4 sm:p-5 relative animate-in fade-in duration-150 shadow-2xs">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-['Manrope'] font-bold text-xs sm:text-sm text-[#0066cc] dark:text-[#38BDF8]">
                            Why this task?
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleWhy(task.id)}
                            className="text-[#0066cc] dark:text-[#38BDF8] hover:opacity-75 focus:outline-none cursor-pointer"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="18 15 12 9 6 15" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-xs sm:text-sm text-[#1d1d1f] dark:text-[#E2E8F0] leading-relaxed">
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
          <div className="mt-8 pt-6 border-t border-[#f5f5f7] dark:border-[#1E2638]">
            <div className="flex items-center gap-2 overflow-x-auto pb-2.5 pf-custom-scrollbar">
              {milestoneNodes.map((node, i) => {
                const isSelected = activeMilestone === node.id
                return (
                  <React.Fragment key={node.id}>
                    {i > 0 && (
                      <span className="text-[#d2d2d7] dark:text-[#4B5563] font-bold text-sm flex-none">
                        →
                      </span>
                    )}
                    <div
                      onClick={() => handleMilestoneClick(node)}
                      className={`flex-none rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-w-[95px] sm:min-w-[110px] border ${
                        isSelected
                          ? 'border-2 border-[#0066cc] dark:border-[#38BDF8] bg-[#eaf2fc] dark:bg-blue-950/40 shadow-xs ring-2 ring-[#0066cc]/10'
                          : node.isComplete
                          ? 'border-[#22A06B]/40 bg-[#F6FEF9] dark:bg-emerald-950/30 shadow-2xs hover:border-[#22A06B]'
                          : 'border-[#e0e0e0] dark:border-[#242E40] bg-white dark:bg-[#101520] hover:border-[#d2d2d7] dark:hover:border-[#3B4860]'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center mb-1 ${
                          isSelected
                            ? 'bg-[#0066cc] dark:bg-[#38BDF8] text-white dark:text-slate-900 shadow-xs'
                            : 'bg-[#333333] dark:bg-[#242E40] text-white'
                        }`}
                      >
                        {node.id}
                      </span>

                      <span className="text-[11px] sm:text-xs font-bold text-[#1d1d1f] dark:text-[#F9FAFB] leading-tight truncate max-w-[95px]">
                        {node.label}
                      </span>

                      {node.isLocked ? (
                        <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-[#86868b] dark:text-[#94A3B8] bg-[#f5f5f5] dark:bg-[#1A2232] border border-[#e9e9e9] dark:border-[#242E40] px-1.5 py-0.5 rounded-full mt-1 shadow-2xs">
                          🔒 Locked
                        </span>
                      ) : node.isComplete ? (
                        <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-[#22A06B] dark:text-emerald-400 bg-[#ECFDF3] dark:bg-emerald-950/50 border border-[#D1FADF] dark:border-emerald-800/60 px-1.5 py-0.5 rounded-full mt-1 shadow-2xs">
                          ✓ Complete
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#7a7a7a] dark:text-[#94A3B8] mt-1">
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
          <div className="pf-glass-card p-5 sm:p-6 shadow-sm border border-[#dbeafc] dark:border-[#242E40] bg-gradient-to-br from-[#f2f7ff]/95 to-[#e6f1fc]/90 dark:from-[#141A26] dark:to-[#101520]">
            <h3 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] mb-4">
              This week’s plan ({selectedWeek})
            </h3>

            <div className="flex items-center gap-4 mb-5">
              {/* Progress Ring */}
              <div className="relative w-20 h-20 flex-none">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="#d7e8fa" className="dark:stroke-slate-800" strokeWidth="4.5" />
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
                    className="transition-all duration-300 dark:stroke-[#38BDF8]"
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
                      completedTaskIds.has(t.id) ? 'bg-[#22A06B] shadow-[0_0_8px_rgba(34,160,107,0.5)]' : 'bg-[#e0e0e0] dark:bg-slate-700'
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
              className="w-full py-3 bg-[#0066cc] hover:bg-[#004fa3] active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-[0_4px_16px_rgba(0,102,204,0.28)] hover:shadow-[0_6px_20px_rgba(0,102,204,0.36)] transition-all cursor-pointer flex items-center justify-center gap-2"
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

          {/* WIDGET 2: Priority Gaps */}
          <div className="pf-glass-card p-5 sm:p-6 shadow-sm">
            <h3 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] mb-4">
              Priority gaps
            </h3>

            {priorityGaps.length > 0 ? (
              <div className="space-y-3.5">
                {priorityGaps.map((g) => (
                  <div key={g.tag} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#1d1d1f] capitalize">{g.tag}</span>
                      <span className="text-[#0066cc] dark:text-[#38BDF8]">{g.progress}%</span>
                    </div>
                    <div className="w-full bg-[#f5f5f7] dark:bg-[#1E2638] h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#0066cc] to-[#38bdf8] rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(0,102,204,0.4)]" style={{ width: `${g.progress}%` }} />
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
              className="mt-4 text-xs font-bold text-[#0066cc] dark:text-[#38BDF8] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View skill insights</span>
              <span>→</span>
            </button>
          </div>

          {/* WIDGET 3: Recommended for you */}
          <div className="pf-glass-card p-5 sm:p-6 shadow-sm">
            <h3 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] mb-3">
              Recommended for you
            </h3>

            {currentWeekData.webResources?.[0] ? (
              <div className="flex items-center justify-between gap-3 p-3.5 bg-[#f9fcff] dark:bg-[#0E131E] border border-[#e1effe] dark:border-[#1E2638] rounded-xl shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-full bg-[#dbeafc] dark:bg-[#1E293B] text-[#0066cc] dark:text-[#38BDF8] flex items-center justify-center flex-none">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-[#1d1d1f] dark:text-[#F9FAFB] max-w-[130px] truncate">
                      {currentWeekData.webResources[0].title || currentWeekData.webResources[0].url}
                    </h4>
                    <p className="text-[11px] text-[#7a7a7a] dark:text-[#94A3B8] truncate max-w-[150px]">
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
                  className="px-3.5 py-1.5 bg-white dark:bg-[#141A26] border border-[#0066cc] dark:border-[#38BDF8] text-[#0066cc] dark:text-[#38BDF8] hover:bg-[#0066cc] hover:text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex-none"
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

      {/* Task Completion Note Modal */}
      {pendingCompleteTask && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 dark:bg-black/75 p-4" onClick={() => setPendingCompleteTask(null)}>
          <div
            className="bg-white dark:bg-[#141A26] border border-transparent dark:border-[#242E40] rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-base text-[#1d1d1f] dark:text-white mb-1">How did this go?</h3>
            <p className="text-sm text-[#6e6e73] dark:text-[#94A3B8] mb-4">
              Marking <span className="font-semibold text-[#1d1d1f] dark:text-white">"{pendingCompleteTask.title}"</span> as done.
              A quick note helps us pick better courses for what's next.
            </p>
            <textarea
              autoFocus
              value={completeNote}
              onChange={(e) => { setCompleteNote(e.target.value); if (completeNoteError) setCompleteNoteError('') }}
              placeholder="e.g. This was too easy, I already knew most of it / This was perfect, more like this please / Too theoretical, I wanted more hands-on practice..."
              rows={3}
              className="w-full border border-[#e0e0e0] dark:border-[#242E40] bg-white dark:bg-[#0E131E] rounded-xl px-3.5 py-2.5 text-sm text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0066cc] dark:focus:border-[#38BDF8] focus:ring-2 focus:ring-[#0066cc]/15 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
            />
            {completeNoteError && (
              <p className="text-xs font-semibold text-red-600 dark:text-rose-400 mt-1.5">{completeNoteError}</p>
            )}
            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setPendingCompleteTask(null)}
                className="px-4 py-2 text-sm font-semibold text-[#333333] dark:text-[#CBD5E1] hover:text-[#1d1d1f] dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmCompleteTask}
                disabled={!completeNote.trim()}
                className="px-5 py-2 bg-[#0066cc] hover:bg-[#004fa3] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-sm cursor-pointer"
              >
                Mark done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1d1d1f] text-white px-5 py-2.5 rounded-xl shadow-xl text-xs sm:text-sm font-semibold animate-in fade-in slide-in-from-bottom duration-150 flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}
    </AppShell>
  )
}
