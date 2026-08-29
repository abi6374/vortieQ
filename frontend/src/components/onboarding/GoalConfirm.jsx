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

  const levelClass = LEVEL_BADGE[current_level] || 'bg-[#f5f5f7] text-[#333333] border-[#f0f0f0]'

  return (
    <div className="bg-white rounded-2xl border border-[#f0f0f0] shadow-[0_14px_38px_rgba(25,49,75,0.08)] p-8 max-w-2xl w-full">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[12px] font-bold uppercase tracking-wider text-[#0066cc] bg-[#eaf2fc] border border-[#eaf2fc]">
          Profile Review
        </span>
      </div>

      <h2 className="text-2xl font-bold text-[#1d1d1f] font-['Manrope']">Here’s what I understood:</h2>
      <p className="text-sm text-[#333333] mt-1 mb-6">Review the extracted parameters before we generate your learning roadmap.</p>

      <div className="space-y-4">
        <div className="bg-[#fbfbfc] border border-[#f0f0f0] rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider font-bold text-[#7a7a7a]">Target Role</p>
          <p className="mt-1 text-lg font-bold text-[#1d1d1f]">
            {target_role || 'AIML Engineer'}
          </p>
        </div>

        <div className="bg-[#fbfbfc] border border-[#f0f0f0] rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-bold text-[#7a7a7a]">Current Level</p>
            <p className="mt-1 text-sm font-semibold text-[#1d1d1f]">Based on your background</p>
          </div>
          <span
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${levelClass}`}
          >
            {current_level || 'intermediate'}
          </span>
        </div>

        <div className="bg-[#fbfbfc] border border-[#f0f0f0] rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider font-bold text-[#7a7a7a] mb-2">Skills & Interests</p>
          <div className="flex flex-wrap gap-2">
            {interests.length > 0 ? (
              interests.map((tag, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-white border border-[#e0e0e0] text-[#1d1d1f] shadow-2xs"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-sm text-[#7a7a7a] italic">None detected</span>
            )}
          </div>
        </div>

        <div className="bg-[#fbfbfc] border border-[#f0f0f0] rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider font-bold text-[#7a7a7a]">Weekly Commitment</p>
          <p className="mt-1 text-base font-bold text-[#0066cc]">
            {weekly_hours ?? 8} hours per week
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <button
          onClick={onConfirm}
          className="flex-1 bg-[#2DB1F9] hover:bg-[#0EA5E9] text-white font-bold py-3.5 px-6 rounded-xl shadow-[0_4px_14px_rgba(45,177,249,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <span>✨ Generate My Learning Path</span>
        </button>
        <button
          onClick={onEdit}
          className="px-6 py-3.5 border border-[#e0e0e0] text-[#333333] hover:text-[#1d1d1f] hover:bg-gray-50 font-semibold rounded-xl transition-colors cursor-pointer"
        >
          Let me rephrase
        </button>
      </div>
    </div>
  )
}

