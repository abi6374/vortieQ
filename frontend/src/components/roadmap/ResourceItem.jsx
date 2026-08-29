import React, { useState } from 'react'
import WhyThisDrawer from './WhyThisDrawer'
import FeedbackButtons from '../dashboard/FeedbackButtons'

const DIFFICULTY_BADGE = {
  beginner: 'bg-green-100 dark:bg-emerald-950/60 text-green-800 dark:text-emerald-300 border border-green-200 dark:border-emerald-800',
  intermediate: 'bg-yellow-100 dark:bg-amber-950/60 text-yellow-800 dark:text-amber-300 border border-yellow-200 dark:border-amber-800',
  advanced: 'bg-red-100 dark:bg-rose-950/60 text-red-800 dark:text-rose-300 border border-red-200 dark:border-rose-800',
}

export default function ResourceItem({ step, onRefresh }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const course = step.course || step.courses || {}
  const status = step.status || 'not_started'
  const isCompleted = status === 'completed'
  const difficulty = course.difficulty
  const difficultyClass = DIFFICULTY_BADGE[difficulty] || 'bg-gray-100 dark:bg-[#1E293B] text-gray-700 dark:text-[#CBD5E1] border border-gray-200 dark:border-[#242E40]'

  return (
    <div
      className={`p-4 border rounded-xl transition-colors ${
        isCompleted
          ? 'bg-gray-50 dark:bg-[#101622] border-gray-200 dark:border-[#242E40] opacity-70'
          : 'bg-white dark:bg-[#141A26] border-gray-200 dark:border-[#242E40] hover:border-indigo-300 dark:hover:border-[#38BDF8]'
      }`}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <h4
            className={`text-sm font-semibold ${
              isCompleted ? 'text-gray-500 dark:text-[#64748B] line-through' : 'text-gray-900 dark:text-white'
            }`}
          >
            {course.title || 'Recommended Course'}
          </h4>
          <p className="text-xs text-gray-500 dark:text-[#94A3B8] mt-0.5">{course.provider || 'Online Provider'}</p>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            {difficulty && (
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${difficultyClass}`}>
                {difficulty}
              </span>
            )}
            {course.duration_hrs != null && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-[#1E293B] text-gray-600 dark:text-[#CBD5E1] border border-gray-200 dark:border-[#242E40]">
                {course.duration_hrs} hrs
              </span>
            )}
            {status === 'skipped' && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-200 dark:bg-[#1E293B] text-gray-500 dark:text-[#94A3B8]">
                skipped
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setDrawerOpen(true)}
          className="text-xs font-medium text-indigo-600 dark:text-[#38BDF8] hover:text-indigo-800 dark:hover:text-[#7DD3FC] shrink-0 cursor-pointer"
        >
          Why this? →
        </button>
      </div>

      {course.resource_url && (
        <a
          href={course.resource_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 text-xs text-indigo-600 dark:text-[#38BDF8] hover:underline"
        >
          Visit course ↗
        </a>
      )}

      {/* Member 4's feedback wiring — preserved. Completed steps show a static badge. */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#1E2638]">
        {isCompleted ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-emerald-400">
            ✓ Completed
          </span>
        ) : (
          <FeedbackButtons stepId={step.id || step.step_id} stepStatus={step.status} onFeedbackGiven={onRefresh} />
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
