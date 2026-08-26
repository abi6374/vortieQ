import React, { useState } from 'react'
import WhyThisDrawer from './WhyThisDrawer'
import FeedbackButtons from '../dashboard/FeedbackButtons'

const DIFFICULTY_BADGE = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800',
}

export default function ResourceItem({ step, onRefresh }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const course = step.course || step.courses || {}
  const status = step.status || 'not_started'
  const isCompleted = status === 'completed'
  const difficulty = course.difficulty
  const difficultyClass = DIFFICULTY_BADGE[difficulty] || 'bg-gray-100 text-gray-700'

  return (
    <div
      className={`p-4 border rounded-xl transition-colors ${
        isCompleted ? 'bg-gray-50 border-gray-200 opacity-70' : 'bg-white border-gray-200 hover:border-indigo-300'
      }`}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <h4
            className={`text-sm font-semibold ${
              isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'
            }`}
          >
            {course.title || 'Recommended Course'}
          </h4>
          <p className="text-xs text-gray-500 mt-0.5">{course.provider || 'Online Provider'}</p>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            {difficulty && (
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${difficultyClass}`}>
                {difficulty}
              </span>
            )}
            {course.duration_hrs != null && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
                {course.duration_hrs} hrs
              </span>
            )}
            {status === 'skipped' && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-200 text-gray-500">
                skipped
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setDrawerOpen(true)}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 shrink-0"
        >
          Why this? →
        </button>
      </div>

      {course.resource_url && (
        <a
          href={course.resource_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 text-xs text-indigo-600 hover:underline"
        >
          Visit course ↗
        </a>
      )}

      {/* Member 4's feedback wiring — preserved. Completed steps show a static badge. */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        {isCompleted ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600">
            ✓ Completed
          </span>
        ) : (
          <FeedbackButtons stepId={step.id || step.step_id} onFeedbackGiven={onRefresh} />
        )}
      </div>

      <WhyThisDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        courseTitle={course.title}
        explanation={step.why_recommended || step.explanation}
      />
    </div>
  )
}
