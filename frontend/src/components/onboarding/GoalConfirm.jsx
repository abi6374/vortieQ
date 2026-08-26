import React from 'react'

const LEVEL_BADGE = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800',
}

export default function GoalConfirm({ profile, onConfirm, onEdit }) {
  if (!profile) return null

  const {
    target_role,
    current_level,
    interests = [],
    weekly_hours,
  } = profile

  const levelClass = LEVEL_BADGE[current_level] || 'bg-gray-100 text-gray-800'

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <h2 className="text-xl font-bold text-gray-900">Here's what I understood:</h2>

      <div className="mt-6 space-y-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Target Role</p>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {target_role || '—'}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Current Level</p>
          <span
            className={`mt-1 inline-block px-3 py-1 rounded-full text-sm font-medium capitalize ${levelClass}`}
          >
            {current_level || 'unknown'}
          </span>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Skills & Interests</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {interests.length > 0 ? (
              interests.map((tag, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-400 italic">None detected</span>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Weekly Hours</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {weekly_hours ?? '—'} hrs / week
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <button
          onClick={onConfirm}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          ✨ Generate My Learning Path
        </button>
        <button
          onClick={onEdit}
          className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2.5 rounded-lg transition-colors"
        >
          Let me rephrase
        </button>
      </div>
    </div>
  )
}
