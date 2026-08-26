import React from 'react'

export default function ProgressHeader({ totalSteps = 10, completedSteps = 3, targetRole = "AI Engineer" }) {
  const percentage = Math.round((completedSteps / (totalSteps || 1)) * 100)

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center justify-between">
      <div>
        <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Active Target Role</span>
        <h2 className="text-2xl font-black text-slate-100 mt-1">{targetRole}</h2>
        <p className="text-xs text-slate-400 mt-1">
          {completedSteps} of {totalSteps} modules finished ({percentage}%)
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-800"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-blue-500 transition-all duration-1000 ease-out"
              strokeDasharray={`${percentage}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className="absolute text-xs font-bold text-slate-200">{percentage}%</span>
        </div>
      </div>
    </div>
  )
}
