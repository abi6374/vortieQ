import React from 'react'

export default function SkillMap({ skills = ["Python", "PyTorch", "FastAPI", "Data Structures", "pgvector"] }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Skills in Progress & Mastered</h4>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill, idx) => (
          <span
            key={idx}
            className="px-3 py-1 bg-slate-800 border border-slate-700 text-xs font-medium text-blue-300 rounded-lg hover:border-blue-500 transition"
          >
            ✓ {skill}
          </span>
        ))}
      </div>
    </div>
  )
}
