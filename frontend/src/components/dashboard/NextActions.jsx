import React from 'react'
import FeedbackButtons from './FeedbackButtons'

export default function NextActions({ currentStep, onFeedback }) {
  if (!currentStep) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-xs text-slate-500">
        All active tasks for this milestone are complete!
      </div>
    )
  }

  return (
    <div className="bg-slate-900 border border-blue-900/40 rounded-2xl p-6 shadow-xl">
      <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Next Recommended Action</span>
      <h3 className="text-base font-bold text-slate-100 mt-1">{currentStep.title || "Continue Current Module"}</h3>
      <p className="text-xs text-slate-400 mt-1 mb-4">{currentStep.description || "Work through the assigned project exercises."}</p>

      <FeedbackButtons stepId={currentStep.id} onFeedback={onFeedback} />
    </div>
  )
}
