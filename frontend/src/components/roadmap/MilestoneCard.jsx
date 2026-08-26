import React, { useState } from 'react'
import ResourceItem from './ResourceItem'

export default function MilestoneCard({ milestone, index, defaultOpen = false, onRefresh }) {
  const [open, setOpen] = useState(defaultOpen)
  const steps = milestone.steps || milestone.path_steps || []

  return (
    <div className="relative pl-10">
      {/* Numbered marker sitting on the timeline line */}
      <div className="absolute left-0 top-4 flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-sm ring-4 ring-gray-50">
        {index}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 p-5 text-left hover:bg-gray-50 transition-colors"
        >
          <div>
            <h3 className="text-base font-bold text-gray-900">{milestone.title}</h3>
            {milestone.description && (
              <p className="text-xs text-gray-500 mt-0.5">{milestone.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {milestone.estimated_weeks != null && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                ~{milestone.estimated_weeks} weeks
              </span>
            )}
            <span className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>
              ▾
            </span>
          </div>
        </button>

        {open && (
          <div className="px-5 pb-5 space-y-3">
            {steps.map((s, sIdx) => (
              <ResourceItem key={s.id || sIdx} step={s} onRefresh={onRefresh} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
