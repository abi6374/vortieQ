import React, { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAIChat } from '../../contexts/AIChatContext'
import { useRoadmap } from '../../hooks/useRoadmap'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabaseClient'
import AppShell from '../layout/AppShell'
import ConnectGitHubModal from '../ui/ConnectGitHubModal'
import RoadmapInfographicModal from './RoadmapInfographicModal'
import { stripEmojis } from '../../utils/textUtils'

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

  // Modals for other views (Resources, Infographic Poster, etc.)
  const [activeModal, setActiveModal] = useState(null)
  const [showGitHubModal, setShowGitHubModal] = useState(false)
  const [showPosterModal, setShowPosterModal] = useState(false)

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

  // If the user has no active roadmap / path, redirect them directly to onboarding
  useEffect(() => {
    if (!roadmap.loading && !roadmap.path && (!roadmap.weeks || roadmap.weeks.length === 0)) {
      const isDevBypass =
        import.meta.env.DEV &&
        typeof window !== 'undefined' &&
        (window.localStorage.getItem('pf_dev_bypass') === 'true' ||
          window.localStorage.getItem('e2e_mock_auth') === 'true')
      if (!isDevBypass) {
        navigate('/onboarding', { replace: true })
      }
    }
  }, [roadmap.loading, roadmap.path, roadmap.weeks, navigate])
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
        title: stripEmojis(st.title),
        subtitle: stripEmojis((st.skill_tags || []).join(', ') || st.provider),
        provider: stripEmojis(st.provider),
        duration_hrs: st.duration_hrs,
        difficulty: st.difficulty,
        skill_tags: (st.skill_tags || []).map(stripEmojis),
        resource_url: st.resource_url,
        explanation: stripEmojis(st.explanation),
        status: st.status,
        milestone_label: stripEmojis(st.milestone_label),
        partNumber: st.part_number || 1,
        partTotal: st.part_total || 1,
        fullDurationHrs: st.full_duration_hrs ?? st.duration_hrs,
      }))
      groups[`Week ${w.week_number}`] = {
        tasks,
        totalHrs: tasks.reduce((sum, t) => sum + (t.duration_hrs || 0), 0),
        themeTitle: stripEmojis(w.milestone_label || `Week ${w.week_number}`),
        isLocked: w.is_locked,
        lockedReason: stripEmojis(w.locked_reason),
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
      ; (s.skill_tags || []).forEach((tag) => {
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
  const [completeRating, setCompleteRating] = useState(0)
  const [completeHoverRating, setCompleteHoverRating] = useState(0)
  const [completeTag, setCompleteTag] = useState('')
  const [completeNoteError, setCompleteNoteError] = useState('')

  // Re-recommendation Modal State
  const [rerecommendTaskTarget, setRerecommendTaskTarget] = useState(null)
  const [rerecommendPref, setRerecommendPref] = useState('free_resource')
  const [rerecommendNote, setRerecommendNote] = useState('')
  const [rerecommendLoading, setRerecommendLoading] = useState(false)

  const FEEDBACK_TAG_OPTIONS = [
    'Clear explanation',
    'Too theoretical',
    'Need more practice',
    'Just right',
    'Want video/interactive',
  ]

  const RERECOMMEND_OPTIONS = [
    {
      id: 'free_resource',
      title: 'Free & Open Source Resource',
      desc: 'Prioritize GeeksforGeeks, MDN, Official Docs, YouTube, freeCodeCamp, and NPTEL',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      id: 'hands_on',
      title: 'Hands-on Practice & Project Labs',
      desc: 'Interactive exercises, practical code implementations, and project challenges',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
          <line x1="14" y1="4" x2="10" y2="20" />
        </svg>
      ),
    },
    {
      id: 'too_advanced',
      title: 'Too Advanced (Need gentler intro)',
      desc: 'Find a beginner-friendly foundation step before diving deep into complex topics',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
          <polyline points="17 18 23 18 23 12" />
        </svg>
      ),
    },
    {
      id: 'too_basic',
      title: 'Too Basic (Want advanced project)',
      desc: 'Skip basic syntax and tackle production-grade architecture and scaling',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      ),
    },
    {
      id: 'custom',
      title: 'Custom Natural Language Request',
      desc: 'Type your exact preferred topics, tools, or style in the note below',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
  ]

  const getResourceBadge = (task) => {
    const prov = (task.provider || '').toLowerCase()
    const title = (task.title || '').toLowerCase()
    const url = (task.resource_url || '').toLowerCase()

    if (url.includes('geeksforgeeks.org') || prov.includes('geeksforgeeks')) {
      return { name: 'GeeksforGeeks', type: 'article', isFree: true, color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' }
    }
    if (url.includes('takeuforward') || title.includes('striver') || prov.includes('takeuforward')) {
      return { name: 'Striver Sheet', type: 'practice', isFree: true, color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300' }
    }
    if (url.includes('youtube') || url.includes('youtu.be') || prov.includes('youtube')) {
      return { name: 'YouTube Video', type: 'video', isFree: true, color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300' }
    }
    if (url.includes('docs.python') || url.includes('developer.mozilla') || url.includes('react.dev') || url.includes('fastapi') || url.includes('docs.docker') || url.includes('kubernetes') || url.includes('aws.amazon')) {
      return { name: 'Official Docs', type: 'docs', isFree: true, color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300' }
    }
    if (url.includes('nptel') || url.includes('swayam')) {
      return { name: 'NPTEL / Swayam', type: 'course', isFree: true, color: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300' }
    }
    if (url.includes('freecodecamp') || prov.includes('freecodecamp')) {
      return { name: 'freeCodeCamp', type: 'free_guide', isFree: true, color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300' }
    }
    if (url.includes('wikipedia')) {
      return { name: 'Wikipedia', type: 'article', isFree: true, color: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300' }
    }
    return { name: task.provider || 'Course', type: 'course', isFree: false, color: 'bg-[#eaf2fc] text-[#0066cc] border-[#cfe4fb] dark:bg-sky-950/40 dark:text-sky-300' }
  }

  const renderTaskTypeIcon = (badge, isCompleted) => {
    if (badge.type === 'video') {
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      )
    }
    if (badge.type === 'docs' || badge.type === 'article') {
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      )
    }
    if (badge.type === 'practice') {
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
          <line x1="14" y1="4" x2="10" y2="20" />
        </svg>
      )
    }
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    )
  }

  const toggleTask = async (task) => {
    const isCompleted = completedTaskIds.has(task.id)
    if (!isCompleted) {
      setPendingCompleteTask(task)
      setCompleteNote('')
      setCompleteRating(0)
      setCompleteHoverRating(0)
      setCompleteTag('')
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
    const task = pendingCompleteTask
    if (!task) return
    const validRating = (typeof completeRating === 'number' && completeRating >= 1 && completeRating <= 5) ? completeRating : null
    const result = await roadmap.toggleTask(
      task.id,
      true,
      completeNote.trim() || completeTag,
      validRating,
      completeTag
    )
    if (!result.ok) {
      showToast(result.reason || 'Unable to update. Try again.')
      setPendingCompleteTask(null)
      return
    }
    setPendingCompleteTask(null)
    setCompleteNote('')
    setCompleteRating(0)
    setCompleteTag('')
    showToast(`Completed "${task.title}"! Progress updated.`)
  }

  const handleOpenRerecommend = (task) => {
    setRerecommendTaskTarget(task)
    setRerecommendPref('free_resource')
    setRerecommendNote('')
  }

  const handleRerecommendSubmit = async () => {
    if (!rerecommendTaskTarget) return
    setRerecommendLoading(true)
    try {
      const res = await roadmap.rerecommendTask(
        rerecommendTaskTarget.id,
        rerecommendPref,
        rerecommendNote.trim()
      )
      if (res.ok) {
        // Prefer the real, specific reason (mastery-adjusted / prerequisite
        // gap) when the backend produced one; otherwise the generic
        // confirmation for format/style preferences that don't touch mastery.
        showToast(res.reasonForChange || `Re-recommended alternative for "${rerecommendTaskTarget.title}"!`)
        setRerecommendTaskTarget(null)
      } else {
        showToast(res.reason || 'Could not re-recommend course.')
      }
    } catch (err) {
      showToast('Re-recommendation request failed. Please try again.')
    } finally {
      setRerecommendLoading(false)
    }
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
    if (currentWeekData.isLocked) {
      showToast(currentWeekData.lockedReason || 'Complete previous weeks first.')
      return
    }
    const pendingTask = currentWeekData.tasks.find((t) => !completedTaskIds.has(t.id))
    if (pendingTask) {
      if (pendingTask.resource_url) {
        window.open(pendingTask.resource_url, '_blank')
      }
      toggleTask(pendingTask)
      showToast(`Started task: "${pendingTask.title}"`)
    } else {
      showToast(`All tasks for ${selectedWeek} are already completed!`)
    }
  }

  const completedTaskIds = roadmap.completedIds
  const weekCompletedCount = currentWeekData.tasks.filter((t) => completedTaskIds.has(t.id)).length

  const rawGoalText = profile?.goal_text || roadmap.path?.goal_text || pathData?.goal_text || ''
  const targetRole = roadmap.path?.target_role || profile?.target_role || pathData?.target_role || ''

  const cleanGoalTitle = useMemo(() => {
    if (targetRole && targetRole.trim()) return targetRole.trim()
    if (!rawGoalText) return 'your learning goal'

    // Extract explicit (Target role: ...) tag if present
    const targetMatch = rawGoalText.match(/\(Target\s+role:\s*([^.)]+)\.?\)/i)
    if (targetMatch && targetMatch[1]) return targetMatch[1].trim()

    let text = rawGoalText.split('I can study')[0].trim()
    text = text.replace(
      /^(I want to become an?|I want to become|I want to be an?|I want to be|I want an?|I want|My goal is to become an?|My goal is to be an?|My goal is to|My goal is)\s+/i,
      ''
    )
    text = text.charAt(0).toUpperCase() + text.slice(1)
    text = text.replace(/\.$/, '').trim()

    if (text.length > 35) {
      const roleInTextMatch = text.match(/(?:transition into|become|work as)(?:\s+an?|\s+a)?\s+([A-Z][a-zA-Z\s/]+(?:Engineer|Analyst|Developer|Scientist|Specialist|Lead|Manager))/i)
      if (roleInTextMatch && roleInTextMatch[1]) {
        return roleInTextMatch[1].trim()
      }
      return text.split('.')[0].trim()
    }
    return text || 'your learning goal'
  }, [rawGoalText, targetRole])

  // Show a polished loading state when roadmap is fetching
  if (roadmap.loading && !roadmap.weeks.length && !pathData?.path_steps?.length) {
    return (
      <AppShell>
        <div className="min-h-[65vh] flex flex-col items-center justify-center text-center px-4 py-16 animate-in fade-in duration-300">
          <div className="relative w-16 h-16 rounded-2xl bg-[#EAF2FC] dark:bg-[#141B26] border border-[#CFE4FB] dark:border-[#22334B] flex items-center justify-center mb-6 shadow-lg shadow-blue-500/10 dark:shadow-cyan-500/10">
            {/* Outer spinning ring */}
            <div className="w-8 h-8 border-[3px] border-[#0066CC]/25 dark:border-[#38BDF8]/25 border-t-[#0066CC] dark:border-t-[#38BDF8] rounded-full animate-spin" />
            {/* Center pulsing core */}
            <div className="absolute w-2.5 h-2.5 bg-[#0066CC] dark:bg-[#38BDF8] rounded-full animate-pulse" />
          </div>
          <h2 className="font-['Manrope'] font-bold text-xl sm:text-2xl text-[#1D1D1F] dark:text-[#F8FAFC] tracking-tight mb-2">
            Loading your learning path...
          </h2>
          <p className="text-sm text-[#555555] dark:text-[#94A3B8] max-w-md leading-relaxed">
            Calibrating your customized roadmap milestones and study schedule.
          </p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell
      topBar={
        <div className="bg-white dark:bg-[#121216] border border-[#e0e0e0] dark:border-[#27272F] hover:border-[#d2d2d7] rounded-2xl px-3.5 py-2 flex items-center gap-3 shadow-2xs min-w-0">
          <span className="w-8 h-8 rounded-xl bg-[#eaf2fc] dark:bg-[#18181D] text-[#0066cc] dark:text-[#38BDF8] flex items-center justify-center flex-none">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          </span>
          <div className="text-left min-w-0">
            <h2 className="font-['Manrope'] font-bold text-xs sm:text-[13px] text-[#1d1d1f] dark:text-white leading-tight max-w-[220px] truncate">
              {cleanGoalTitle}
            </h2>
            <p className="text-[10px] text-[#7a7a7a] dark:text-[#94A3B8] font-medium leading-tight mt-0.5">
              Target: Ongoing Pace
            </p>
          </div>
          <div className="flex items-center gap-2 flex-none ml-auto">
            <button
              type="button"
              onClick={() => navigate('/onboarding?replan=true')}
              className="px-2.5 py-1 rounded-lg border border-[#e0e0e0] dark:border-[#27272F] hover:border-[#0066cc] hover:bg-[#eaf2fc] dark:hover:bg-[#18181D] text-[#0066cc] dark:text-[#38BDF8] text-xs font-bold transition-colors cursor-pointer"
            >
              Replan
            </button>
          </div>
        </div>
      }
    >
      {/* Page header */}
      <div className="mb-6 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-['Manrope'] font-extrabold text-2xl sm:text-3xl text-[#1d1d1f] dark:text-white tracking-tight">
            Your path to: {cleanGoalTitle}
          </h1>
          <p className="text-sm sm:text-base text-[#333333] dark:text-[#94A3B8] mt-1 font-normal">
            Personalized roadmap calibrated from your skills and weekly availability.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPosterModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0066cc] hover:bg-[#004fa3] text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer flex-none self-start sm:self-auto"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span>Download Flowchart PDF</span>
        </button>
      </div>

      {/* Honest pacing note - real weeks needed at the learner's REAL stated
          weekly_hours vs. their requested target timeline. Only shows when
          the honest math genuinely runs longer than what was asked for -
          never a fabricated "it fits!" when it doesn't (see
          roadmap_service.assign_week_numbers's docstring for the real bug
          this replaces: it used to silently pretend the learner had far
          more weekly hours than they actually said, just to force a fit). */}
      {roadmap.pacing?.over_target && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 px-4 py-3.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 dark:text-amber-400 flex-none mt-0.5">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p className="text-xs sm:text-[13px] text-amber-900 dark:text-amber-200 leading-relaxed">
            <span className="font-bold">Realistic pacing: </span>
            at your actual weekly hours, this path needs <span className="font-bold">{roadmap.pacing.weeks_used} weeks</span> to
            complete - longer than the {roadmap.pacing.target_weeks}-week timeline you asked for. Increase your weekly study
            hours in Account settings, or ask for a shorter/lighter path, to bring it closer to your target.
          </p>
        </div>
      )}

      {/* GitHub Recommendation Booster Top Banner (Non-blocking, zero screen blackout) */}
      <ConnectGitHubModal
        isOpen={showGitHubModal}
        onClose={() => setShowGitHubModal(false)}
        onRemindLater={() => { remindLaterDismissedRef.current = true }}
        onConnected={(ghData) => {
          // GitHub connection & calibration state is displayed directly inside the banner with the green tick mark
        }}
      />

      {/* 3 Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6 mb-6">
        <div className="pf-glass-card p-5 sm:p-6 flex items-center gap-5 sm:gap-6">
          <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#eaf2fc] to-[#dbeafc] dark:from-[#0066cc]/20 dark:to-[#0066cc]/10 text-[#0066cc] dark:text-[#0066cc] flex items-center justify-center flex-none shadow-sm mr-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </span>
          <div>
            <div className="font-['Manrope'] font-extrabold text-2xl sm:text-[28px] text-[#1d1d1f] dark:text-white leading-none tracking-tight">
              {weekTabs.length}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-[#555555] dark:text-[#94A3B8] mt-1.5">
              weeks total
            </div>
          </div>
        </div>

        <div className="pf-glass-card p-5 sm:p-6 flex items-center gap-5 sm:gap-6">
          <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#eaf2fc] to-[#dbeafc] dark:from-[#0066cc]/20 dark:to-[#0066cc]/10 text-[#0066cc] dark:text-[#0066cc] flex items-center justify-center flex-none shadow-sm mr-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
          <div>
            <div className="font-['Manrope'] font-extrabold text-2xl sm:text-[28px] text-[#1d1d1f] dark:text-white leading-none tracking-tight">
              {currentWeekData.totalHrs}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-[#555555] dark:text-[#94A3B8] mt-1.5">
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
            <div className="font-['Manrope'] font-extrabold text-2xl sm:text-[28px] text-[#1d1d1f] dark:text-white leading-none tracking-tight">
              {roadmap.percent}%
            </div>
            <div className="text-xs sm:text-sm font-semibold text-[#555555] dark:text-[#94A3B8] mt-1.5">
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
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-['Manrope'] font-bold text-lg text-[#1d1d1f] dark:text-white">
                Your learning roadmap
              </h2>
            </div>

            {/* Week Selector Chips */}
            <div className="flex flex-wrap gap-2 mb-6">
              {weekTabs.map((tab) => {
                const isSelected = selectedWeek === tab
                const wg = weekGroups[tab] || {}
                const isLocked = !!wg.isLocked
                const isComplete = !!wg.isComplete

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSelectedWeek(tab)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? isComplete
                          ? 'bg-[#22A06B] dark:bg-emerald-500 text-white shadow-xs'
                          : 'bg-[#0066cc] dark:bg-[#0066cc] text-white dark:text-white font-bold shadow-xs'
                        : isComplete
                        ? 'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#22A06B] dark:text-emerald-400 border border-[#B7E7C9] dark:border-emerald-800/60 hover:bg-emerald-100/60'
                        : isLocked
                        ? 'bg-[#fafbfc] dark:bg-[#0E0E12] text-[#86868b] dark:text-[#94A3B8] border border-[#f0f0f0] dark:border-[#27272F] opacity-85'
                        : 'bg-[#f5f5f7] dark:bg-[#18181D] text-[#333333] dark:text-[#CBD5E1] hover:bg-[#eaf2fc] dark:hover:bg-[#0066cc]/15 hover:text-[#0066cc] dark:hover:text-[#0066cc]'
                    }`}
                  >
                    {isComplete ? (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : isLocked ? (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="4" y="11" width="16" height="10" rx="2" />
                        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                      </svg>
                    ) : null}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white">
                  {currentWeekData.themeTitle}
                </h3>
                {currentWeekData.isComplete ? (
                  <span className="bg-[#ECFDF3] dark:bg-emerald-950/50 text-[#22A06B] dark:text-emerald-400 font-bold text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    Week Completed
                  </span>
                ) : selectedWeek === 'Week 1' || (currentWeekData.tasks.some(t => !completedTaskIds.has(t.id)) && !currentWeekData.isLocked) ? (
                  <span className="bg-[#eaf2fc] dark:bg-[#0066cc]/20 text-[#0066cc] dark:text-[#0066cc] font-bold text-xs px-2.5 py-0.5 rounded-full">
                    Current week
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[#7a7a7a] dark:text-[#94A3B8] font-medium">
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
                const resBadge = getResourceBadge(task)

                return (
                  <div key={task.id} className="space-y-2">
                    <div className={`border rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      isCompleted
                        ? 'border-[#22A06B]/30 dark:border-emerald-800/60 bg-[#F6FEF9] dark:bg-emerald-950/20'
                        : 'border-[#e0e0e0] dark:border-[#27272F] bg-white dark:bg-[#121216] hover:border-black/40 dark:hover:border-[#C9D0D6]/40'
                    }`}>
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {/* Checkbox button */}
                        <button
                          type="button"
                          onClick={() => toggleTask(task)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
                            isCompleted
                              ? 'bg-[#22A06B] dark:bg-emerald-500 border-[#22A06B] dark:border-emerald-500 text-white shadow-xs'
                              : 'border-[#d2d2d7] dark:border-[#3F3F46] hover:border-[#0066cc] dark:hover:border-[#0066cc]'
                          }`}
                          aria-label="Toggle task completion"
                        >
                          {isCompleted && (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>

                        {/* Clean SVG Resource Icon */}
                        <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-none font-bold text-sm ${
                          isCompleted
                            ? 'bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-[#eaf2fc] dark:bg-[#0066cc]/20 text-[#0066cc] dark:text-[#0066cc] border border-[#cfe4fb] dark:border-[#0066cc]/30'
                        }`}>
                          {renderTaskTypeIcon(resBadge, isCompleted)}
                        </span>

                        {/* Title, Badges & Subtitle */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className={`font-bold text-sm truncate ${
                              isCompleted
                                ? 'line-through text-emerald-900 dark:text-emerald-300/80'
                                : 'text-[#1d1d1f] dark:text-white'
                            }`}>
                              {task.title}
                            </h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${resBadge.color}`}>
                              {resBadge.name}
                            </span>
                            {task.partTotal > 1 && (
                              <span className={`flex-none text-[10px] font-bold px-1.5 py-0.5 rounded-full no-underline ${
                                isCompleted
                                  ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                                  : 'text-[#0066cc] dark:text-[#0066cc] bg-[#eaf2fc] dark:bg-[#0066cc]/20 border border-[#cfe4fb] dark:border-[#0066cc]/30'
                              }`}>
                                Part {task.partNumber}/{task.partTotal}
                              </span>
                            )}
                          </div>
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
                      <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0 self-end sm:self-center">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                            isCompleted
                              ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/60'
                              : 'text-[#0066cc] dark:text-[#0066cc] bg-[#eaf2fc] dark:bg-[#0066cc]/20 border border-[#cfe4fb] dark:border-[#0066cc]/30'
                          }`}
                          title={task.partTotal > 1 ? `${task.duration_hrs}h this week of ${task.fullDurationHrs}h total` : undefined}
                        >
                          {task.duration_hrs} hrs
                        </span>

                        {!isCompleted && (
                          <button
                            type="button"
                            onClick={() => handleOpenRerecommend(task)}
                            title="Re-recommend an alternative for this topic"
                            className="px-2.5 py-1 bg-white dark:bg-[#18181D] border border-[#e0e0e0] dark:border-[#27272F] hover:border-[#0066cc] dark:hover:border-[#0066cc] hover:text-[#0066cc] dark:hover:text-[#0066cc] rounded-lg text-xs font-semibold text-[#555555] dark:text-[#CBD5E1] transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                              <path d="M21 3v5h-5" />
                              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                              <path d="M3 21v-5h5" />
                            </svg>
                            <span>Swap</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => toggleWhy(task.id)}
                          className={`text-xs font-semibold hover:underline whitespace-nowrap cursor-pointer ${
                            isCompleted
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-[#0066cc] dark:text-[#0066cc]'
                          }`}
                        >
                          Why this?
                        </button>

                        {task.resource_url && (
                          <a
                            href={task.resource_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-white dark:bg-[#18181D] border border-[#e0e0e0] dark:border-[#27272F] hover:border-[#0066cc] dark:hover:border-[#0066cc] hover:text-[#0066cc] dark:hover:text-[#0066cc] rounded-lg text-xs font-semibold text-[#333333] dark:text-white transition-colors"
                          >
                            Open ↗
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Expanded "Why this task?" explanation */}
                    {isExpanded && (
                      <div className="bg-[#eaf2fc] dark:bg-[#18181D] border-l-[3.5px] border-[#0066cc] dark:border-[#0066cc] rounded-xl p-4 sm:p-5 relative animate-in fade-in duration-150 shadow-2xs">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-['Manrope'] font-bold text-xs sm:text-sm text-[#0066cc] dark:text-[#0066cc]">
                            Why this recommendation?
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleWhy(task.id)}
                            className="text-[#0066cc] dark:text-[#0066cc] hover:opacity-75 focus:outline-none cursor-pointer"
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
          <div className="mt-8 pt-6 border-t border-[#f5f5f7] dark:border-[#27272F]">
            <div className="flex items-center gap-2 overflow-x-auto pb-2.5 pf-custom-scrollbar">
              {milestoneNodes.map((node, i) => {
                const isSelected = activeMilestone === node.id
                return (
                  <React.Fragment key={node.id}>
                    {i > 0 && (
                      <span className="text-[#d2d2d7] dark:text-[#71717A] font-bold text-sm flex-none">
                        →
                      </span>
                    )}
                    <div
                      onClick={() => handleMilestoneClick(node)}
                      className={`flex-none rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-w-[95px] sm:min-w-[110px] border ${
                        isSelected
                          ? 'border-2 border-[#0066cc] dark:border-[#0066cc] bg-[#eaf2fc] dark:bg-[#0066cc]/15 shadow-xs ring-2 ring-[#0066cc]/10 dark:ring-[#0066cc]/20'
                          : node.isComplete
                          ? 'border-[#22A06B]/50 bg-[#F6FEF9] dark:bg-emerald-950/30 shadow-2xs hover:border-[#22A06B]'
                          : 'border-[#e0e0e0] dark:border-[#27272F] bg-white dark:bg-[#121216] hover:border-[#d2d2d7] dark:hover:border-[#71717A]'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center mb-1 ${
                          isSelected
                            ? 'bg-[#0066cc] dark:bg-[#0066cc] text-white dark:text-white shadow-xs'
                            : node.isComplete
                            ? 'bg-[#22A06B] text-white shadow-xs'
                            : node.isLocked
                            ? 'bg-[#f0f0f2] dark:bg-[#1E2738] text-[#86868b] dark:text-[#94A3B8] border border-[#e0e0e0] dark:border-[#2A374E]'
                            : 'bg-[#333333] dark:bg-[#27272F] text-white dark:text-[#C9D0D6]'
                        }`}
                      >
                        {node.isComplete ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : node.isLocked ? (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="4" y="11" width="16" height="10" rx="2" />
                            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                          </svg>
                        ) : (
                          node.id
                        )}
                      </span>

                      <span className="text-[11px] sm:text-xs font-bold text-[#1d1d1f] dark:text-[#F9FAFB] leading-tight truncate max-w-[95px]">
                        {node.label}
                      </span>

                      <span className="text-[10px] text-[#7a7a7a] dark:text-[#94A3B8] mt-1 font-medium">
                        {node.isComplete ? (
                          <span className="text-[#22A06B] dark:text-emerald-400 font-bold">Done</span>
                        ) : isSelected ? (
                          <span className="text-[#0066cc] dark:text-[#38BDF8] font-bold">Active</span>
                        ) : node.isLocked ? (
                          `Week ${node.id}`
                        ) : (
                          `Step ${node.id}`
                        )}
                      </span>
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
          <div className="pf-glass-card p-5 sm:p-6 shadow-sm border border-[#dbeafc] dark:border-[#27272F] bg-gradient-to-br from-[#f2f7ff]/95 to-[#e6f1fc]/90 dark:from-[#121216] dark:to-[#18181D]">
            <h3 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white mb-4">
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
                    stroke={weekCompletedCount === currentWeekData.tasks.length && currentWeekData.tasks.length > 0 ? '#22A06B' : '#0066cc'}
                    strokeWidth="4.5"
                    strokeDasharray="125.6"
                    strokeDashoffset={
                      125.6 -
                      (125.6 * (weekCompletedCount / Math.max(currentWeekData.tasks.length, 1)))
                    }
                    strokeLinecap="round"
                    className="transition-all duration-300 dark:stroke-[#C9D0D6]"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-['Manrope'] font-extrabold text-sm text-[#1d1d1f] dark:text-white leading-tight">
                    {weekCompletedCount} of {currentWeekData.tasks.length}
                  </span>
                  <span className="text-[10px] text-[#7a7a7a] dark:text-[#94A3B8] font-semibold">
                    tasks
                  </span>
                </div>
              </div>

              {/* Checklist Summary */}
              <div className="space-y-1.5 text-xs text-[#1d1d1f] dark:text-[#F1F5F9] font-medium min-w-0">
                {currentWeekData.tasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 truncate">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      completedTaskIds.has(t.id) ? 'bg-[#22A06B] shadow-[0_0_8px_rgba(34,160,107,0.5)]' : 'bg-[#e0e0e0] dark:bg-slate-700'
                    }`} />
                    <span className={`truncate ${completedTaskIds.has(t.id) ? 'line-through text-[#7a7a7a] dark:text-[#64748B]' : ''}`}>
                      {t.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Start Week Button - Gated on Locked State */}
            <button
              type="button"
              onClick={handleStartWeek}
              disabled={currentWeekData.isLocked || (currentWeekData.tasks.length > 0 && weekCompletedCount === currentWeekData.tasks.length)}
              className={`w-full py-3 px-4 font-bold text-sm rounded-xl transition-all inline-flex items-center justify-center gap-2 select-none ${
                currentWeekData.isLocked
                  ? 'bg-[#e5e5ea] dark:bg-[#18181D] text-[#86868b] dark:text-[#71717A] cursor-not-allowed border border-[#d2d2d7] dark:border-[#27272F] shadow-none'
                  : weekCompletedCount === currentWeekData.tasks.length && currentWeekData.tasks.length > 0
                  ? 'bg-[#ECFDF3] dark:bg-emerald-950/50 text-[#22A06B] dark:text-emerald-400 border border-[#D1FADF] dark:border-emerald-800/60 shadow-none cursor-default'
                  : 'bg-[#0066cc] hover:bg-[#004fa3] active:scale-[0.98] text-white shadow-[0_4px_16px_rgba(0,102,204,0.28)] hover:shadow-[0_6px_20px_rgba(0,102,204,0.36)] cursor-pointer'
              }`}
            >
              {currentWeekData.isLocked ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="11" width="16" height="10" rx="2" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </svg>
                  <span className="leading-none text-center">Locked — Complete previous week first</span>
                </span>
              ) : weekCompletedCount === currentWeekData.tasks.length && currentWeekData.tasks.length > 0 ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Completed {selectedWeek}</span>
                </span>
              ) : (
                <span className="inline-flex items-center justify-center gap-2">
                  <span>Start {selectedWeek}</span>
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              )}
            </button>
          </div>

          {/* WIDGET 2: Priority Gaps */}
          <div className="pf-glass-card p-5 sm:p-6 shadow-sm">
            <h3 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white mb-4">
              Priority gaps
            </h3>

            {priorityGaps.length > 0 ? (
              <div className="space-y-3.5">
                {priorityGaps.map((g) => (
                  <div key={g.tag} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#1d1d1f] dark:text-white capitalize">{g.tag}</span>
                      <span className="text-[#0066cc] dark:text-[#C9D0D6]">{g.progress}%</span>
                    </div>
                    <div className="w-full bg-[#f5f5f7] dark:bg-[#202026] h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#0066cc] to-[#004fa3] dark:from-[#C9D0D6] dark:to-[#8B949E] rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(0,102,204,0.4)]" style={{ width: `${g.progress}%` }} />
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
              className="mt-4 text-xs font-bold text-[#0066cc] dark:text-[#C9D0D6] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View skill insights</span>
              <span>→</span>
            </button>
          </div>

          {/* WIDGET 3: Recommended for you */}
          <div className="pf-glass-card p-5 sm:p-6 shadow-sm">
            <h3 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white mb-3">
              Recommended for you
            </h3>

            {currentWeekData.webResources && currentWeekData.webResources.length > 0 ? (
              <div className="space-y-2.5">
                {currentWeekData.webResources.slice(0, 2).map((res, idx) => (
                  <div key={res.url || idx} className="flex items-center justify-between gap-3 p-3 bg-[#f9fcff] dark:bg-[#121216] border border-[#e1effe] dark:border-[#27272F] rounded-xl shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-none ${
                        res.resource_type === 'video' || (res.provider || '').toLowerCase().includes('youtube')
                          ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50'
                          : 'bg-[#dbeafc] dark:bg-[#18181D] text-[#0066cc] dark:text-[#C9D0D6]'
                      }`}>
                        {res.resource_type === 'video' || (res.provider || '').toLowerCase().includes('youtube') ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                          </svg>
                        )}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[#1d1d1f] dark:text-[#F9FAFB] max-w-[135px] truncate">
                          {res.title || res.url}
                        </h4>
                        <p className="text-[10px] text-[#7a7a7a] dark:text-[#94A3B8] truncate max-w-[140px]">
                          {res.provider || 'Learning Resource'}
                        </p>
                      </div>
                    </div>

                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-white dark:bg-[#141A26] border border-[#0066cc] dark:border-[#C9D0D6] text-[#0066cc] dark:text-[#C9D0D6] hover:bg-[#0066cc] hover:text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex-none"
                    >
                      Open
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#86868b]">No extra resources found for this week yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Upgraded Task Completion Feedback Modal with 5-Star Rating (Teleported to document.body for full-screen backdrop blur) */}
      {pendingCompleteTask && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setPendingCompleteTask(null)}
        >
          <div
            className="bg-white dark:bg-[#121216] border border-[#e0e0e0] dark:border-[#27272F] rounded-2xl shadow-2xl w-full max-w-lg p-6 sm:p-7 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-[#ECFDF3] dark:bg-emerald-950/60 text-[#22A06B] dark:text-emerald-400 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <h3 className="font-['Manrope'] font-bold text-lg text-[#1d1d1f] dark:text-white">How did this step go?</h3>
              </div>
              <button
                type="button"
                onClick={() => setPendingCompleteTask(null)}
                className="text-[#7a7a7a] hover:text-[#1d1d1f] dark:hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-[#555555] dark:text-[#94A3B8] mb-5">
              Marking <span className="font-semibold text-[#1d1d1f] dark:text-white">"{pendingCompleteTask.title}"</span> as complete.
              Your rating & notes refine future recommendations in real-time.
            </p>

            {/* 5-Star Interactive Rating */}
            <div className="mb-5 bg-[#fafbfc] dark:bg-[#0E131E] border border-[#e9eef6] dark:border-[#202C3E] rounded-xl p-4 text-center">
              <div className="text-xs font-bold text-[#555555] dark:text-[#94A3B8] mb-2 uppercase tracking-wide">
                Rate Course Match & Depth
              </div>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (completeHoverRating || completeRating) >= star
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setCompleteHoverRating(star)}
                      onMouseLeave={() => setCompleteHoverRating(0)}
                      onClick={() => setCompleteRating(star)}
                      className="p-1 transition-transform hover:scale-125 cursor-pointer focus:outline-none"
                      aria-label={`${star} star`}
                    >
                      <svg
                        width="26"
                        height="26"
                        viewBox="0 0 24 24"
                        fill={active ? '#F59E0B' : 'none'}
                        stroke={active ? '#D97706' : '#94A3B8'}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-colors"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                  )
                })}
              </div>
              <div className="text-xs font-semibold text-[#0066cc] dark:text-[#C9D0D6] mt-1.5 min-h-[18px]">
                {completeRating === 0 && <span className="text-[#888888] dark:text-[#94A3B8] font-normal">Click stars to rate (1–5)</span>}
                {completeRating === 1 && '1/5 — Too basic / Needed better depth'}
                {completeRating === 2 && '2/5 — Needed more practical exercises'}
                {completeRating === 3 && '3/5 — Good match & steady pace'}
                {completeRating === 4 && '4/5 — Great depth & clear explanations'}
                {completeRating === 5 && '5/5 — Perfect match for my goal!'}
              </div>
            </div>

            {/* Quick Feedback Chips */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-[#333333] dark:text-[#CBD5E1] mb-2">
                Quick Feedback Tag
              </label>
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_TAG_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setCompleteTag((prev) => (prev === tag ? '' : tag))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                      completeTag === tag
                        ? 'bg-[#0066cc] text-white border-[#0066cc] shadow-xs'
                        : 'bg-white dark:bg-[#18181D] text-[#555555] dark:text-[#CBD5E1] border-[#e0e0e0] dark:border-[#27272F] hover:border-[#0066cc] dark:hover:border-[#C9D0D6]'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Natural Language Reflection */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-[#333333] dark:text-[#CBD5E1] mb-1.5">
                Personal Notes & Reflection <span className="text-[#7a7a7a] font-normal">(Optional)</span>
              </label>
              <textarea
                value={completeNote}
                onChange={(e) => setCompleteNote(e.target.value)}
                placeholder="e.g. Mastered the core syntax, but want to build a mini-project next / Needed more coding practice on LeetCode..."
                rows={3}
                className="w-full border border-[#e0e0e0] dark:border-[#27272F] bg-white dark:bg-[#0E0E12] rounded-xl px-3.5 py-2.5 text-sm text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0066cc] dark:focus:border-[#C9D0D6] focus:ring-2 focus:ring-[#0066cc]/15 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingCompleteTask(null)}
                className="px-4 py-2 text-sm font-semibold text-[#555555] dark:text-[#CBD5E1] hover:text-[#1d1d1f] dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmCompleteTask}
                disabled={Boolean(roadmap.savingId)}
                className={`px-5 py-2.5 bg-[#22A06B] hover:bg-[#1b8557] text-white text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 ${
                  roadmap.savingId ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                {roadmap.savingId ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                <span>{roadmap.savingId ? 'Updating...' : 'Complete & Update Path'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Re-recommend / Swap Course Modal (Teleported to document.body for full-screen backdrop blur) */}
      {rerecommendTaskTarget && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => !rerecommendLoading && setRerecommendTaskTarget(null)}
        >
          <div
            className="bg-white dark:bg-[#121216] border border-[#e0e0e0] dark:border-[#27272F] rounded-2xl shadow-2xl w-full max-w-lg p-6 sm:p-7 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-[#eaf2fc] dark:bg-[#18181D] text-[#0066cc] dark:text-[#C9D0D6] flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                    <path d="M3 21v-5h5" />
                  </svg>
                </span>
                <h3 className="font-['Manrope'] font-bold text-lg text-[#1d1d1f] dark:text-white">Re-recommend Course</h3>
              </div>
              <button
                type="button"
                disabled={rerecommendLoading}
                onClick={() => setRerecommendTaskTarget(null)}
                className="text-[#7a7a7a] hover:text-[#1d1d1f] dark:hover:text-white text-lg font-bold p-1 cursor-pointer disabled:opacity-40"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-[#555555] dark:text-[#94A3B8] mb-4">
              Swap <span className="font-semibold text-[#1d1d1f] dark:text-white">"{rerecommendTaskTarget.title}"</span> with a better alternative tailored to your learning style.
            </p>

            <div className="space-y-2.5 mb-4 max-h-[260px] overflow-y-auto pr-1 pf-custom-scrollbar">
              {RERECOMMEND_OPTIONS.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setRerecommendPref(opt.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                    rerecommendPref === opt.id
                      ? 'border-[#0066cc] dark:border-[#C9D0D6] bg-[#eaf2fc]/60 dark:bg-[#18181D] shadow-xs ring-1 ring-[#0066cc]/20 dark:ring-[#C9D0D6]/20'
                      : 'border-[#e0e0e0] dark:border-[#27272F] bg-white dark:bg-[#0E0E12] hover:border-[#0066cc]/40 dark:hover:border-[#C9D0D6]/40'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-none mt-0.5 ${
                    rerecommendPref === opt.id
                      ? 'bg-[#0066cc] text-white dark:bg-[#C9D0D6] dark:text-[#09090B]'
                      : 'bg-[#f5f5f7] dark:bg-[#18181D] text-[#555555] dark:text-[#CBD5E1]'
                  }`}>
                    {opt.icon}
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#1d1d1f] dark:text-white leading-tight">
                      {opt.title}
                    </h4>
                    <p className="text-xs text-[#7a7a7a] dark:text-[#94A3B8] mt-0.5">
                      {opt.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-5">
              <label className="block text-xs font-bold text-[#333333] dark:text-[#CBD5E1] mb-1.5">
                Additional Instructions in Natural Language
              </label>
              <textarea
                value={rerecommendNote}
                onChange={(e) => setRerecommendNote(e.target.value)}
                placeholder={`e.g. Focus on interactive labs for ${rerecommendTaskTarget?.title || 'this topic'}, need hands-on step-by-step guidance...`}
                rows={2}
                className="w-full border border-[#e0e0e0] dark:border-[#27272F] bg-white dark:bg-[#0E0E12] rounded-xl px-3.5 py-2 text-sm text-[#1d1d1f] dark:text-white focus:outline-none focus:border-[#0066cc] dark:focus:border-[#C9D0D6] resize-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={rerecommendLoading}
                onClick={() => setRerecommendTaskTarget(null)}
                className="px-4 py-2 text-sm font-semibold text-[#555555] dark:text-[#CBD5E1] hover:text-[#1d1d1f] dark:hover:text-white cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRerecommendSubmit}
                disabled={rerecommendLoading}
                className="px-5 py-2.5 bg-[#0066cc] hover:bg-[#004fa3] text-white text-sm font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {rerecommendLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Calibrating with Live Web & AI...</span>
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                    </svg>
                    <span>Re-recommend Alternative</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast Notification (Teleported to document.body) */}
      {toastMessage && typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-[#1d1d1f] text-white px-5 py-2.5 rounded-xl shadow-xl text-xs sm:text-sm font-semibold animate-in fade-in slide-in-from-bottom duration-150 flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>,
        document.body
      )}

      {/* Flowchart Poster & 1-Click PDF Export Modal */}
      <RoadmapInfographicModal
        isOpen={showPosterModal}
        onClose={() => setShowPosterModal(false)}
        roadmap={roadmap}
        cleanGoalTitle={cleanGoalTitle}
        targetRole={cleanGoalTitle}
        totalWeeks={weekTabs.length}
      />
    </AppShell>
  )
}
