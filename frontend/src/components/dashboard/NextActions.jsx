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
  beginner: 'bg-emerald-100 text-emerald-700',
  intermediate: 'bg-amber-100 text-amber-700',
  advanced: 'bg-rose-100 text-rose-700',
}

function DifficultyBadge({ difficulty }) {
  if (!difficulty) return null
  const style = DIFFICULTY_STYLES[String(difficulty).toLowerCase()] || 'bg-gray-100 text-gray-600'
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
        <h3 className="text-lg font-bold text-gray-800">Up Next</h3>
        {visibleSteps.length > 0 && (
          <span className="text-xs font-semibold text-gray-400">
            {visibleSteps.length} recommended
          </span>
        )}
      </div>

      {visibleSteps.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-8 text-center">
          <p className="text-base font-medium text-gray-600">
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
                className="bg-white rounded-2xl shadow p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="font-bold text-gray-900 leading-snug">
                      {course.title || 'Recommended course'}
                    </h4>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                      {course.provider && <span>{course.provider}</span>}
                      <DifficultyBadge difficulty={course.difficulty} />
                      {course.duration_hrs != null && (
                        <span className="text-gray-400">· {course.duration_hrs} hrs</span>
                      )}
                    </div>
                  </div>
                  {course.resource_url && (
                    <a
                      href={course.resource_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                    >
                      Open ↗
                    </a>
                  )}
                </div>

                <hr className="my-4 border-gray-100" />

                <FeedbackButtons stepId={step.id} onFeedbackGiven={onRefresh} />
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
