import React, { useState, useEffect } from 'react'

const STAGES = [
  "Analyzing learner experience & career goal...",
  "Running vector similarity search across course library...",
  "Sequencing prerequisite milestones with LLM...",
  "Finalizing personalized roadmap with grounded explanations..."
]

export default function GeneratingLoader() {
  const [stageIdx, setStageIdx] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIdx((prev) => (prev < STAGES.length - 1 ? prev + 1 : prev))
    }, 1200)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center max-w-md mx-auto">
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin"></div>
      </div>
      <h3 className="text-lg font-semibold text-slate-100 mb-2">Building Your Career Path</h3>
      <p className="text-xs text-blue-400 font-medium transition-all duration-300 h-6">
        {STAGES[stageIdx]}
      </p>
    </div>
  )
}
