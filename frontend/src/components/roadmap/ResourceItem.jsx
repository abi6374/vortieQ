import React, { useState } from 'react'
import WhyThisDrawer from './WhyThisDrawer'
import FeedbackButtons from '../dashboard/FeedbackButtons'

export default function ResourceItem({ step, onRefresh }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const course = step.course || step.courses || {}
  const status = step.status || 'not_started'
  const isCompleted = status === 'completed'

  return (
    <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl hover:border-slate-600 transition">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
              isCompleted ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
              status === 'skipped' ? 'bg-slate-700 text-slate-400 border border-slate-600' :
              'bg-slate-700 text-slate-300'
            }`}>
              {status}
            </span>
            <span className="text-xs text-slate-400">{course.provider || 'Online Provider'}</span>
          </div>
          <h5 className="text-sm font-semibold text-slate-100 mt-1">{course.title || 'Recommended Course Module'}</h5>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{course.description}</p>
        </div>

        <button
          onClick={() => setDrawerOpen(true)}
          className="text-xs text-blue-400 hover:text-blue-300 ml-4 font-medium"
        >
          Why this? →
        </button>
      </div>

      <div className="flex justify-between items-center mt-3 text-xs">
        <div className="flex gap-1.5 flex-wrap">
          {course.skill_tags?.map((tag, idx) => (
            <span key={idx} className="bg-slate-700/40 text-slate-400 px-1.5 py-0.5 rounded text-[10px]">
              {tag}
            </span>
          ))}
        </div>
        {course.resource_url && (
          <a
            href={course.resource_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline shrink-0 ml-2"
          >
            Visit Course ↗
          </a>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-700/40">
        {isCompleted ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
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
