import React from 'react'
import ResourceItem from './ResourceItem'

export default function MilestoneCard({ milestone, index, onStepFeedback }) {
  const steps = milestone.steps || milestone.path_steps || []

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs">
          {index}
        </div>
        <div>
          <h4 className="text-base font-bold text-slate-100">{milestone.title}</h4>
          <p className="text-xs text-slate-400">{milestone.description} • ~{milestone.estimated_weeks || 4} weeks</p>
        </div>
      </div>

      <div className="space-y-3 mt-4">
        {steps.map((s, sIdx) => (
          <ResourceItem
            key={s.id || sIdx}
            step={s}
            onFeedback={onStepFeedback}
          />
        ))}
      </div>
    </div>
  )
}
