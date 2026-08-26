import { useState } from 'react'
import api from '../lib/apiClient'

export function useFeedback() {
  const [submitting, setSubmitting] = useState(false)

  const sendFeedback = async (stepId, action, notes = '') => {
    setSubmitting(true)
    try {
      const res = await api.post(`/api/steps/${stepId}/feedback`, { action, notes })
      return res.data
    } finally {
      setSubmitting(false)
    }
  }

  return { sendFeedback, submitting }
}
