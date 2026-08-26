import React from 'react'

export default function GoalConfirm({ profile, onConfirm, onEdit }) {
  return (
    <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
      <h3 className="text-lg font-semibold text-slate-100 mb-4">Learner Profile Extracted</h3>
      <div className="space-y-3 text-sm text-slate-300">
        <div className="flex justify-between py-1 border-b border-slate-800">
          <span className="text-slate-500">Target Role:</span>
          <span className="font-medium text-blue-400">{profile.target_role}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-slate-800">
          <span className="text-slate-500">Current Level:</span>
          <span className="capitalize">{profile.current_skill_level}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-slate-800">
          <span className="text-slate-500">Time Commitment:</span>
          <span>{profile.time_commitment_hrs_per_week} hrs/week</span>
        </div>
        <div className="flex justify-between py-1 border-b border-slate-800">
          <span className="text-slate-500">Learning Style:</span>
          <span className="capitalize">{profile.learning_style}</span>
        </div>
        <div>
          <span className="text-slate-500 block mb-1">Interests & Tags:</span>
          <div className="flex flex-wrap gap-1.5">
            {profile.interests?.map((tag, i) => (
              <span key={i} className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-xs rounded text-blue-300">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={onEdit}
          className="flex-1 py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
        >
          Edit Goal
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition"
        >
          Confirm & Build Path →
        </button>
      </div>
    </div>
  )
}
