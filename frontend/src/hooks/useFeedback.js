import { useState } from 'react'
import api from '../lib/apiClient'

// Contract fix: this hook previously sent {action, notes}, but the backend
// (schemas/feedback.py::FeedbackCreateSchema) expects {event_type, note} -
// every call would have 422'd. Currently unused anywhere in the app (the
// roadmap's own feedback flow goes through useRoadmap.toggleTask instead),
// so this was never an active production failure, but fixing it now rather
// than leaving a broken contract for whoever wires this up next.
export function useFeedback() {
  const [submitting, setSubmitting] = useState(false)

  const sendFeedback = async (stepId, eventType, note = '') => {
    setSubmitting(true)
    try {
      const res = await api.post(`/api/steps/${stepId}/feedback`, {
        event_type: eventType,
        note,
      })
      return res.data
    } finally {
      setSubmitting(false)
    }
  }

  return { sendFeedback, submitting }
}
