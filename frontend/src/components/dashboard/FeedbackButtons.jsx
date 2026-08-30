import React, { useEffect, useRef, useState } from 'react'
import apiClient, { genIdempotencyKey } from '../../lib/apiClient'

/**
 * FeedbackButtons
 * Self-contained action row for a single learning-path step. Posts the learner's
 * feedback straight to the backend and hands the response back to the parent so
 * it can re-fetch / adapt the path.
 *
 * Props:
 *   stepId          - string, the path_step id to attach feedback to
 *   onFeedbackGiven - function(responseData), called after a successful post
 */
// All four non-"Mark Done" buttons post to /api/steps/{id}/feedback
// (feedback_service.handle_feedback), which records the real evidence
// (mastery update for too_easy/too_hard, a real skill_prerequisites gap
// check for too_hard) BEFORE delegating to path_service.swap_step for the
// single-step in-place replacement. Previously too_easy/not_interested
// bypassed handle_feedback entirely and hit /swap directly - meaning the
// mastery-update-from-feedback logic, despite being fully implemented and
// tested, was unreachable from any real button click. Fixed as part of the
// platform-audit's real-time-feedback phase.
const ACTIONS = [
  {
    type: 'completed',
    label: 'Mark Done',
    icon: '✅',
    idle: 'bg-green-100 text-green-700 hover:bg-green-200 focus-visible:ring-green-400',
    spinner: 'text-green-700',
  },
  {
    type: 'too_easy',
    label: 'Too Easy',
    icon: '⚡',
    idle: 'bg-amber-100 text-amber-700 hover:bg-amber-200 focus-visible:ring-amber-400',
    spinner: 'text-amber-700',
  },
  {
    type: 'too_hard',
    label: 'Too Hard',
    icon: '🧗',
    idle: 'bg-rose-100 text-rose-700 hover:bg-rose-200 focus-visible:ring-rose-400',
    spinner: 'text-rose-700',
  },
  {
    type: 'not_interested',
    label: 'Swap',
    icon: '🔀',
    idle: 'bg-blue-100 text-blue-700 hover:bg-blue-200 focus-visible:ring-blue-400',
    spinner: 'text-blue-700',
  },
]

function Spinner({ className = '' }) {
  return (
    <svg
      className={`animate-spin h-4 w-4 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4z"
      />
    </svg>
  )
}

export default function FeedbackButtons({ stepId, stepStatus, onFeedbackGiven }) {
  const [loadingType, setLoadingType] = useState(null)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const errorTimer = useRef(null)
  const infoTimer = useRef(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (errorTimer.current) clearTimeout(errorTimer.current)
      if (infoTimer.current) clearTimeout(infoTimer.current)
    }
  }, [])

  // Auto-hide the info toast after 3s.
  useEffect(() => {
    if (!info) return
    if (infoTimer.current) clearTimeout(infoTimer.current)
    infoTimer.current = setTimeout(() => { if (mounted.current) setInfo(null) }, 3000)
    return () => { if (infoTimer.current) clearTimeout(infoTimer.current) }
  }, [info])

  // Auto-hide the error after 3s whenever it changes.
  useEffect(() => {
    if (!error) return
    if (errorTimer.current) clearTimeout(errorTimer.current)
    errorTimer.current = setTimeout(() => {
      if (mounted.current) setError(null)
    }, 3000)
    return () => {
      if (errorTimer.current) clearTimeout(errorTimer.current)
    }
  }, [error])

  const submit = async (buttonType) => {
    if (loadingType) return
    setError(null)
    setInfo(null)
    setLoadingType(buttonType)
    try {
      // One fresh idempotency key per click, not per retry - see
      // apiClient.genIdempotencyKey for why this matters (a double
      // click/retry must not double-apply a mastery-evidence write).
      const response = await apiClient.post(`/api/steps/${stepId}/feedback`, {
        event_type: buttonType, note: '',
      }, { headers: { 'Idempotency-Key': genIdempotencyKey() } })
      const data = response.data || {}

      // Idempotency guard (step already terminal) returns a plain note.
      if (data.note && data.path_updated === false) {
        if (mounted.current) setInfo(data.note)
      } else if (data.swap_result && data.swap_result.swapped === false && data.swap_result.reason) {
        // No alternative course was available to swap in.
        if (mounted.current) setInfo(data.swap_result.reason)
      } else if (data.reason_for_change) {
        // A real, specific explanation of what changed and why
        // (mastery-adjusted, prerequisite gap, etc.) - see
        // feedback_service.handle_feedback.
        if (mounted.current) setInfo(data.reason_for_change)
      }
      if (typeof onFeedbackGiven === 'function') {
        onFeedbackGiven(data)
      }
    } catch (err) {
      if (mounted.current) setError('Failed to update. Try again.')
    } finally {
      if (mounted.current) setLoadingType(null)
    }
  }

  const busy = loadingType !== null
  const terminal = stepStatus === 'completed' || stepStatus === 'skipped'

  // Once a step is terminal, replace the button row with a compact status pill.
  if (terminal) {
    return (
      <div className="w-full">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold
            ${stepStatus === 'completed'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'}`}
        >
          {stepStatus === 'completed' ? '✅ Completed' : '⏭ Skipped'}
        </span>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((action) => {
          const isLoading = loadingType === action.type
          return (
            <button
              key={action.type}
              type="button"
              onClick={() => submit(action.type)}
              disabled={busy}
              aria-busy={isLoading}
              aria-label={action.label}
              className={[
                'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5',
                'text-sm font-semibold transition-colors duration-150 select-none',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                action.idle,
                busy && !isLoading ? 'opacity-40 cursor-not-allowed' : '',
                isLoading ? 'cursor-progress' : '',
              ].join(' ')}
            >
              {isLoading ? (
                <Spinner className={action.spinner} />
              ) : (
                <span aria-hidden="true">{action.icon}</span>
              )}
              <span>{action.label}</span>
            </button>
          )
        })}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
      {info && !error && (
        <p role="status" className="mt-2 text-xs font-medium text-gray-500">
          {info}
        </p>
      )}
    </div>
  )
}
