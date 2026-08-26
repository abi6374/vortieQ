import React from 'react'

export default function FeedbackButtons({ stepId, onFeedback }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onFeedback(stepId, 'completed')}
        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition shadow-md shadow-emerald-950"
      >
        Mark Completed ✓
      </button>
      <button
        onClick={() => onFeedback(stepId, 'too_easy')}
        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition border border-slate-700"
      >
        Too Easy ⚡
      </button>
      <button
        onClick={() => onFeedback(stepId, 'not_interested')}
        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs rounded-lg transition border border-slate-700"
      >
        Skip / Not Interested
      </button>
    </div>
  )
}
