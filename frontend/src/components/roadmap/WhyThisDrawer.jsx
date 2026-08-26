import React from 'react'

export default function WhyThisDrawer({ isOpen, onClose, courseTitle, explanation }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <h4 className="text-base font-bold text-slate-100 mb-2">Why This Course Was Recommended</h4>
        <p className="text-xs text-blue-400 font-medium mb-4">{courseTitle}</p>
        <div className="p-4 bg-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed border border-slate-700 mb-6">
          {explanation || "This resource was algorithmically selected to bridge your current prerequisites directly into the milestone objectives."}
        </div>
        <button
          onClick={onClose}
          className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
