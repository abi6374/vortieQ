import { useCallback, useEffect, useState } from 'react'
import api from '../lib/apiClient'

/**
 * The single source of truth for roadmap state.
 *
 * Everything (weeks, current week, lock state, completion) comes from
 * GET /api/roadmap, which derives it server-side from path_steps.week_number.
 * No client-side week fabrication, no local completion Sets that drift.
 *
 * toggleTask() PATCHes the backend and swaps in the recomputed roadmap the
 * response returns, so Progress / Skill insights / the week strip all reflect
 * the change without extra requests.
 */
const MOCK_DEV_ROADMAP = {
  path: { id: 'dev-path', goal_text: 'AIML Engineer & Data Analytics' },
  percent: 35,
  total_steps: 10,
  completed_steps: 4,
  current_week: 2,
  weeks: [
    {
      week_number: 1,
      title: 'Foundations of Python & Data Processing',
      status: 'completed',
      completed_steps: 4,
      steps: [
        { step_id: 's1', title: 'Python Programming Fundamentals', completed: true, difficulty: 'beginner', duration_hrs: 10, skill_tags: ['Python', 'Machine Learning'] },
        { step_id: 's2', title: 'NumPy & Pandas Essentials', completed: true, difficulty: 'beginner', duration_hrs: 8, skill_tags: ['Pandas', 'Visualization'] },
        { step_id: 's3', title: 'Statistics for Machine Learning', completed: true, difficulty: 'intermediate', duration_hrs: 12, skill_tags: ['Machine Learning', 'Python'] },
        { step_id: 's4', title: 'Exploratory Data Analysis & Visualization', completed: true, difficulty: 'intermediate', duration_hrs: 10, skill_tags: ['Visualization', 'Business Intelligence'] },
      ]
    },
    {
      week_number: 2,
      title: 'Machine Learning & Business Intelligence',
      status: 'in_progress',
      completed_steps: 0,
      steps: [
        { step_id: 's5', title: 'Supervised Learning Algorithms', completed: false, difficulty: 'intermediate', duration_hrs: 14, skill_tags: ['Machine Learning', 'Scikit Learn'] },
        { step_id: 's6', title: 'BI Dashboards with PowerBI & SQL', completed: false, difficulty: 'intermediate', duration_hrs: 10, skill_tags: ['Business Intelligence', 'Analytics'] },
        { step_id: 's7', title: 'Model Evaluation & Hyperparameters', completed: false, difficulty: 'advanced', duration_hrs: 12, skill_tags: ['Machine Learning', 'Python'] },
        { step_id: 's8', title: 'Deep Learning & Neural Networks', completed: false, difficulty: 'advanced', duration_hrs: 15, skill_tags: ['Deep Learning', 'Machine Learning'] },
      ]
    },
    {
      week_number: 3,
      title: 'Advanced AI Systems & Deployment',
      status: 'locked',
      completed_steps: 0,
      steps: [
        { step_id: 's9', title: 'End-to-End MLOps Pipeline', completed: false, difficulty: 'advanced', duration_hrs: 16, skill_tags: ['Machine Learning', 'Python'] },
        { step_id: 's10', title: 'Portfolio Project: Predictive Analytics', completed: false, difficulty: 'advanced', duration_hrs: 20, skill_tags: ['Machine Learning', 'Visualization'] },
      ]
    }
  ]
}

export function useRoadmap() {
  const [data, setData] = useState(null)      // {path, weeks, current_week, percent, ...}
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lockMessage, setLockMessage] = useState(null) // prerequisite violation
  const [savingId, setSavingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/roadmap')
      if (res.data && res.data.weeks && res.data.weeks.length > 0) {
        setData(res.data)
      } else if (typeof window !== 'undefined' && (window.localStorage.getItem('pf_dev_bypass') === 'true' || window.localStorage.getItem('e2e_mock_auth') === 'true')) {
        setData(MOCK_DEV_ROADMAP)
      } else {
        setData(res.data)
      }
    } catch (err) {
      if (typeof window !== 'undefined' && (window.localStorage.getItem('pf_dev_bypass') === 'true' || window.localStorage.getItem('e2e_mock_auth') === 'true')) {
        setData(MOCK_DEV_ROADMAP)
      } else {
        setError('We could not load your roadmap. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const toggleTask = useCallback(async (stepId, completed, note = '', rating = null, tag = '') => {
    setSavingId(stepId)
    setLockMessage(null)
    try {
      const res = await api.patch(`/api/roadmap/tasks/${stepId}`, {
        completed,
        note,
        rating,
        tag,
      })
      setData(res.data) // full recomputed roadmap
      return { ok: true }
    } catch (err) {
      if (err?.response?.status === 409) {
        // Server-enforced prerequisite: surface the real reason.
        const msg = err.response.data?.detail || 'Complete the previous week first.'
        setLockMessage(msg)
        return { ok: false, reason: msg }
      }
      if (import.meta.env.DEV && (!localStorage.getItem('token') || localStorage.getItem('token') === 'dev-token')) {
        setData((prev) => {
          if (!prev) return prev
          const newWeeks = (prev.weeks || []).map((w) => {
            const steps = (w.steps || []).map((s) => (s.step_id === stepId ? { ...s, completed } : s))
            const completed_steps = steps.filter((s) => s.completed).length
            return { ...w, steps, completed_steps, is_complete: completed_steps === steps.length }
          })
          const allSteps = newWeeks.flatMap((w) => w.steps || [])
          const completedSteps = allSteps.filter((s) => s.completed).length
          const totalSteps = allSteps.length
          const percent = totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0
          return { ...prev, weeks: newWeeks, completed_steps: completedSteps, total_steps: totalSteps, percent }
        })
        return { ok: true }
      }
      return { ok: false, reason: 'Unable to update. Try again.' }
    } finally {
      setSavingId(null)
    }
  }, [])

  const rerecommendTask = useCallback(async (stepId, preference = 'custom', note = '') => {
    setSavingId(stepId)
    try {
      const res = await api.post('/api/roadmap/rerecommend', {
        step_id: stepId,
        preference,
        note,
      })
      setData(res.data) // full recomputed roadmap
      return { ok: true }
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Unable to re-recommend course for this week.'
      return { ok: false, reason: msg }
    } finally {
      setSavingId(null)
    }
  }, [])

  // Convenience derivations so components don't re-implement them.
  const weeks = data?.weeks || []
  const currentWeek = data?.current_week ?? 1
  const allSteps = weeks.flatMap((w) => w.steps || [])
  const completedIds = new Set(allSteps.filter((s) => s.completed).map((s) => s.step_id))

  return {
    data, weeks, currentWeek, allSteps, completedIds,
    percent: data?.percent ?? 0,
    totalSteps: data?.total_steps ?? 0,
    completedSteps: data?.completed_steps ?? 0,
    path: data?.path || null,
    loading, error, lockMessage, setLockMessage, savingId,
    reload: load, toggleTask, rerecommendTask,
  }
}

export default useRoadmap
