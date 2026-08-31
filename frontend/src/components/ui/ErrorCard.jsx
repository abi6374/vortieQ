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
      <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 border border-red-200 flex items-center justify-center mx-auto mb-3" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
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
