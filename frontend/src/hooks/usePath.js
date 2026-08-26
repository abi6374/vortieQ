import { useState, useEffect } from 'react'
import api from '../lib/apiClient'

export function usePath(pathId) {
  const [path, setPath] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPath = async () => {
    if (!pathId) return
    setLoading(true)
    try {
      const res = await api.get(`/api/paths/${pathId}`)
      setPath(res.data)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPath()
  }, [pathId])

  return { path, loading, error, refetch: fetchPath }
}
