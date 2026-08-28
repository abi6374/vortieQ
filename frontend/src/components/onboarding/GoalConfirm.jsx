import React from 'react'

const LEVEL_BADGE = {
  beginner: 'bg-[#ECFDF3] text-[#22A06B] border-[#B7E7C9]',
  intermediate: 'bg-[#F5F1FF] text-[#5B36E9] border-[#EFE9FF]',
  advanced: 'bg-[#FEF6E7] text-[#D88700] border-[#F3DB9B]',
  expert: 'bg-[#FAF9FF] text-[#4826C9] border-[#DCD3FF]',
}

export default function GoalConfirm({ profile, onConfirm, onEdit }) {
  if (!profile) return null

  const {
    target_role,
    current_level,
    interests = [],
    weekly_hours,
  } = profile

  const levelClass = LEVEL_BADGE[current_level] || 'bg-[#F5F7FC] text-[#52617D] border-[#E1E6F0]'

  return (
    <div className="bg-white rounded-2xl border border-[#E1E6F0] shadow-[0_14px_38px_rgba(25,40,75,0.08)] p-8 max-w-2xl w-full">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[12px] font-bold uppercase tracking-wider text-[#5B36E9] bg-[#F5F1FF] border border-[#EFE9FF]">
          Profile Review
        </span>
      </div>

      <h2 className="text-2xl font-bold text-[#0E1B38] font-['Manrope']">Here’s what I understood:</h2>
      <p className="text-sm text-[#52617D] mt-1 mb-6">Review the extracted parameters before we generate your learning roadmap.</p>

      <div className="space-y-4">
        <div className="bg-[#FAFBFD] border border-[#E1E6F0] rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider font-bold text-[#74819A]">Target Role</p>
          <p className="mt-1 text-lg font-bold text-[#0E1B38]">
            {target_role || 'AIML Engineer'}
          </p>
        </div>

        <div className="bg-[#FAFBFD] border border-[#E1E6F0] rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-bold text-[#74819A]">Current Level</p>
            <p className="mt-1 text-sm font-semibold text-[#0E1B38]">Based on your background</p>
          </div>
          <span
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${levelClass}`}
          >
            {current_level || 'intermediate'}
          </span>
        </div>

        <div className="bg-[#FAFBFD] border border-[#E1E6F0] rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider font-bold text-[#74819A] mb-2">Skills & Interests</p>
          <div className="flex flex-wrap gap-2">
            {interests.length > 0 ? (
              interests.map((tag, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-white border border-[#D8DFEB] text-[#0E1B38] shadow-2xs"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-sm text-[#74819A] italic">None detected</span>
            )}
          </div>
        </div>

        <div className="bg-[#FAFBFD] border border-[#E1E6F0] rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider font-bold text-[#74819A]">Weekly Commitment</p>
          <p className="mt-1 text-base font-bold text-[#5B36E9]">
            {weekly_hours ?? 8} hours per week
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <button
          onClick={onConfirm}
          className="flex-1 bg-[#5B36E9] hover:bg-[#4826C9] text-white font-bold py-3.5 px-6 rounded-xl shadow-[0_4px_14px_rgba(91,54,233,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <span>✨ Generate My Learning Path</span>
        </button>
        <button
          onClick={onEdit}
          className="px-6 py-3.5 border border-[#D8DFEB] text-[#52617D] hover:text-[#0E1B38] hover:bg-gray-50 font-semibold rounded-xl transition-colors cursor-pointer"
        >
          Let me rephrase
        </button>
      </div>
    </div>
  )
}

