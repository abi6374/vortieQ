import React from 'react'
import FeedbackButtons from './FeedbackButtons'

/**
 * NextActions
 * The learner's immediate to-do list: the next few not-started steps, each with
 * inline feedback controls.
 *
 * Props:
 *   steps     - array of path_step rows (each with a nested `courses` object)
 *   pathId    - string, the active path id (reserved for future deep-links)
 *   onRefresh - function, called after feedback so the dashboard re-fetches
 */
const DIFFICULTY_STYLES = {
  beginner: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
  intermediate: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
  advanced: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
}

function DifficultyBadge({ difficulty }) {
  if (!difficulty) return null
  const style = DIFFICULTY_STYLES[String(difficulty).toLowerCase()] || 'bg-gray-100 dark:bg-[#18181D] text-gray-600 dark:text-[#CBD5E1] border border-gray-200 dark:border-[#27272F]'
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${style}`}>
      {difficulty}
    </span>
  )
}

export default function NextActions({ steps = [], pathId, onRefresh }) {
  const visibleSteps = (Array.isArray(steps) ? steps : []).slice(0, 3)

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Up Next</h3>
        {visibleSteps.length > 0 && (
          <span className="text-xs font-semibold text-gray-400 dark:text-[#94A3B8]">
            {visibleSteps.length} recommended
          </span>
        )}
      </div>

      {visibleSteps.length === 0 ? (
        <div className="bg-white dark:bg-[#121216] border border-gray-100 dark:border-[#27272F] rounded-2xl shadow p-8 text-center">
          <p className="text-base font-medium text-gray-600 dark:text-[#CBD5E1]">
            🎉 You're all caught up! View your full roadmap for more.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleSteps.map((step) => {
            const course = step.courses || step.course || {}
            return (
              <article
                key={step.id}
                className="bg-white dark:bg-[#121216] border border-gray-100 dark:border-[#27272F] rounded-2xl shadow p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="font-bold text-gray-900 dark:text-white leading-snug">
                      {course.title || 'Recommended course'}
                    </h4>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-[#94A3B8]">
                      {course.provider && <span className="font-medium text-gray-700 dark:text-[#CBD5E1]">{course.provider}</span>}
                      <DifficultyBadge difficulty={course.difficulty} />
                      {course.duration_hrs != null && (
                        <span className="text-gray-400 dark:text-[#64748B]">· {course.duration_hrs} hrs</span>
                      )}
                    </div>
                  </div>
                  {course.resource_url && (
                    <a
                      href={course.resource_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-sm font-medium text-indigo-600 dark:text-[#C9D0D6] hover:text-indigo-700 dark:hover:text-white hover:underline"
                    >
                      Open ↗
                    </a>
                  )}
                </div>

                <hr className="my-4 border-gray-100 dark:border-[#27272F]" />

                <FeedbackButtons stepId={step.id} stepStatus={step.status} onFeedbackGiven={onRefresh} />
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
