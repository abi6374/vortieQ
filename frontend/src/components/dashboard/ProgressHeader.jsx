import React from 'react'
import { useNavigate } from 'react-router-dom'

const RADIUS = 40
const STROKE_WIDTH = 8
const CIRCUMFERENCE = 2 * Math.PI * RADIUS // 251.2

export default function ProgressHeader({ percent = 0, totalSteps = 0, completedSteps = 0, pathId }) {
  const navigate = useNavigate()
  const safePercent = Math.max(0, Math.min(100, percent))
  const dashOffset = CIRCUMFERENCE * (1 - safePercent / 100)

  return (
    <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-center text-center">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE_WIDTH}
            className="stroke-gray-200"
          />
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            className="stroke-indigo-600 transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-800">{safePercent}%</span>
        </div>
      </div>

      <p className="mt-4 text-sm text-gray-600">
        {completedSteps} of {totalSteps} steps completed
      </p>

      {pathId && (
        <button
          onClick={() => navigate(`/roadmap/${pathId}`)}
          className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
        >
          View full roadmap →
        </button>
      )}
    </div>
  )
}
