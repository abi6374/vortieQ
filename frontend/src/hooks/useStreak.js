import { useCallback, useEffect, useState } from 'react'
import api from '../lib/apiClient'

/**
 * Real learning streak, derived server-side from study_sessions.
 * Returns the shape /api/streak already emits so components can read it directly.
 */
export function useStreak() {
  const [data, setData] = useState({
    current_streak: 0, best_streak: 0, active_today: false,
    total_days: 0, minutes_this_week: 0, minutes_total: 0, recent_days: [],
    daily_minutes_this_week: [], daily_minutes_35d: [],
  })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/streak')
      setData(data)
    } catch {
      // Non-fatal: keep zero streak state so the UI never crashes.
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  return { ...data, loading, reload: load }
}

export default useStreak
