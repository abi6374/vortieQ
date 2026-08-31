import React, { useState, useEffect } from 'react'

const STAGES = [
  'Understanding your goals',
  'Finding relevant courses',
  'Sequencing your learning path',
  'Preparing your roadmap',
]

export default function GeneratingLoader() {
  const [activeStage, setActiveStage] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStage((prev) => (prev < STAGES.length - 1 ? prev + 1 : prev))
    }, 1500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-white rounded-2xl shadow-xl p-10">
      <h2 className="text-xl font-bold text-gray-900 text-center">
        Building your roadmap…
      </h2>

      <ul className="mt-8 space-y-4">
        {STAGES.map((stage, i) => (
          <li
            key={i}
            className={`text-center text-base transition-colors duration-300 ${
              i === activeStage
                ? 'text-indigo-600 font-bold'
                : i < activeStage
                ? 'text-gray-400'
                : 'text-gray-300'
            }`}
          >
            {stage}
          </li>
        ))}
      </ul>

      <div className="mt-8 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full w-1/3 bg-indigo-500 rounded-full animate-pulse" />
      </div>
    </div>
  )
}
