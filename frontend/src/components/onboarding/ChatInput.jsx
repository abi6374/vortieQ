import React, { useState } from 'react'

export default function ChatInput({ onSubmit, disabled }) {
  const [goal, setGoal] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!goal.trim() || disabled) return
    onSubmit(goal.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-xl focus-within:border-blue-500 transition">
        <textarea
          rows={3}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="E.g., I am a 2nd year CS student who knows basic Python. I want to become a Machine Learning Engineer working on LLMs, studying 10 hours a week with hands-on projects..."
          className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none resize-none"
          disabled={disabled}
        />
        <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-800">
          <span className="text-xs text-slate-500">Natural language goal input</span>
          <button
            type="submit"
            disabled={disabled || !goal.trim()}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition"
          >
            Generate Roadmap →
          </button>
        </div>
      </div>
    </form>
  )
}
