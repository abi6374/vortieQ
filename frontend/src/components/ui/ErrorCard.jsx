import React from 'react'

/**
 * ErrorCard
 * A friendly, self-contained failure state for a failed API call.
 *
 * Props:
 *   message - string, what went wrong (learner-friendly)
 *   onRetry - optional function; when provided, renders a "Try again" button
 */
export default function ErrorCard({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="bg-white border border-red-200 rounded-2xl shadow-sm p-8 text-center max-w-lg mx-auto"
    >
      <div className="text-3xl" aria-hidden="true">⚠️</div>
      <p className="mt-3 text-sm text-gray-700">
        {message || 'Something went wrong. Please try again.'}
      </p>
      {typeof onRetry === 'function' && (
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-1"
        >
          Try again
        </button>
      )}
    </div>
  )
}
