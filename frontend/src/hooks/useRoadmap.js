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
      setData(res.data)
    } catch (err) {
      setError('We could not load your roadmap. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const toggleTask = useCallback(async (stepId, completed, note = '') => {
    setSavingId(stepId)
    setLockMessage(null)
    try {
      const res = await api.patch(`/api/roadmap/tasks/${stepId}`, { completed, note })
      setData(res.data) // full recomputed roadmap
      return { ok: true }
    } catch (err) {
      if (err?.response?.status === 409) {
        // Server-enforced prerequisite: surface the real reason.
        const msg = err.response.data?.detail || 'Complete the previous week first.'
        setLockMessage(msg)
        return { ok: false, reason: msg }
      }
      return { ok: false, reason: 'Unable to update. Try again.' }
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
    reload: load, toggleTask,
  }
}

export default useRoadmap
