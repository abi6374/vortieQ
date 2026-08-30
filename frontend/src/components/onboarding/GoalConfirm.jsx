import React from 'react'

const LEVEL_BADGE = {
  beginner: 'bg-[#ECFDF3] text-[#22A06B] border-[#B7E7C9]',
  intermediate: 'bg-[#eaf2fc] text-[#0066cc] border-[#eaf2fc]',
  advanced: 'bg-[#FEF6E7] text-[#D88700] border-[#F3DB9B]',
  expert: 'bg-[#f9fcff] text-[#004fa3] border-[#d5e8fd]',
}

export default function GoalConfirm({ profile, onConfirm, onEdit }) {
  if (!profile) return null

  const {
    target_role,
    current_level,
    interests = [],
    weekly_hours,
  } = profile

  const levelClass = LEVEL_BADGE[current_level] || 'bg-[#f5f5f7] dark:bg-[#18181D] text-[#333333] dark:text-[#CBD5E1] border-[#f0f0f0] dark:border-[#27272F]'

  return (
    <div className="bg-white dark:bg-[#121216] rounded-2xl border border-[#f0f0f0] dark:border-[#27272F] shadow-[0_14px_38px_rgba(25,49,75,0.08)] dark:shadow-[0_14px_38px_rgba(0,0,0,0.5)] p-8 max-w-2xl w-full">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[12px] font-bold uppercase tracking-wider text-[#0066cc] dark:text-[#C9D0D6] bg-[#eaf2fc] dark:bg-[#18181D] border border-[#eaf2fc] dark:border-[#27272F]">
          Profile Review
        </span>
      </div>

      <h2 className="text-2xl font-bold text-[#1d1d1f] dark:text-white font-['Manrope']">Here’s what I understood:</h2>
      <p className="text-sm text-[#333333] dark:text-[#94A3B8] mt-1 mb-6">Review the extracted parameters before we generate your learning roadmap.</p>

      <div className="space-y-4">
        <div className="bg-[#fbfbfc] dark:bg-[#18181D] border border-[#f0f0f0] dark:border-[#27272F] rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider font-bold text-[#7a7a7a] dark:text-[#94A3B8]">Target Role</p>
          <p className="mt-1 text-lg font-bold text-[#1d1d1f] dark:text-white">
            {target_role || 'AIML Engineer'}
          </p>
        </div>

        <div className="bg-[#fbfbfc] dark:bg-[#18181D] border border-[#f0f0f0] dark:border-[#27272F] rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-bold text-[#7a7a7a] dark:text-[#94A3B8]">Current Level</p>
            <p className="mt-1 text-sm font-semibold text-[#1d1d1f] dark:text-white">Based on your background</p>
          </div>
          <span
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${levelClass}`}
          >
            {current_level || 'intermediate'}
          </span>
        </div>

        <div className="bg-[#fbfbfc] dark:bg-[#18181D] border border-[#f0f0f0] dark:border-[#27272F] rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider font-bold text-[#7a7a7a] dark:text-[#94A3B8] mb-2">Skills & Interests</p>
          <div className="flex flex-wrap gap-2">
            {interests.length > 0 ? (
              interests.map((tag, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-[#121216] border border-[#e0e0e0] dark:border-[#27272F] text-[#1d1d1f] dark:text-[#F8FAFC] shadow-2xs"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-sm text-[#7a7a7a] dark:text-[#94A3B8] italic">None detected</span>
            )}
          </div>
        </div>

        <div className="bg-[#fbfbfc] dark:bg-[#18181D] border border-[#f0f0f0] dark:border-[#27272F] rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider font-bold text-[#7a7a7a] dark:text-[#94A3B8]">Weekly Commitment</p>
          <p className="mt-1 text-base font-bold text-[#0066cc] dark:text-[#0066cc]">
            {weekly_hours ?? 8} hours per week
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <button
          onClick={onConfirm}
          className="flex-1 bg-[#0066cc] dark:bg-[#0066cc] hover:bg-[#004fa3] dark:hover:bg-[#004fa3] text-white dark:text-white font-bold py-3.5 px-6 rounded-xl shadow-[0_4px_14px_rgba(0,102,204,0.35)] dark:shadow-[0_4px_14px_rgba(0,102,204,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <span>✨ Generate My Learning Path</span>
        </button>
        <button
          onClick={onEdit}
          className="px-6 py-3.5 border border-[#e0e0e0] dark:border-[#27272F] text-[#333333] dark:text-[#CBD5E1] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#18181D] font-semibold rounded-xl transition-colors cursor-pointer"
        >
          Let me rephrase
        </button>
      </div>
    </div>
  )
}

