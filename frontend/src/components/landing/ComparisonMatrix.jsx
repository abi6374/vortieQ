import React from 'react'
import { Check, X, Sparkles } from 'lucide-react'

/**
 * ComparisonMatrix
 * Side-by-side comparison between Static Courses vs. PathFinder Adaptive AI.
 */
export default function ComparisonMatrix() {
  const rows = [
    {
      feature: 'Curriculum Model',
      traditional: 'Static, one-size-fits-all 40hr video playlist',
      pathfinder: 'Dynamic 12-week graph calibrated to your exact skill gaps',
    },
    {
      feature: 'Prior Experience Recognition',
      traditional: 'Ignored — must re-watch beginner modules',
      pathfinder: 'Deep GitHub & Resume parsing skips mastered topics',
    },
    {
      feature: 'When You Get Stuck',
      traditional: 'Post on dead forums or abandon course',
      pathfinder: 'Integrated 24/7 AI Coach with real-time code debugging',
    },
    {
      feature: 'Adaptive Pacing',
      traditional: 'Zero adaptation if behind or ahead of schedule',
      pathfinder: 'Autonomous recalibration based on completion velocity',
    },
    {
      feature: 'Resource Diversity',
      traditional: 'Locked to single instructor’s slides',
      pathfinder: 'Multi-modal vetting (Docs, GitHub Repos, Papers, Top Videos)',
    },
    {
      feature: 'Skill Verification',
      traditional: 'Passive multiple-choice quizzes',
      pathfinder: 'Live interactive skill heatmaps & project milestones',
    },
  ]

  return (
    <div className="w-full max-w-5xl mx-auto overflow-x-auto rounded-3xl border border-[#E0E0E0] dark:border-[#263348] bg-white/95 dark:bg-[#111726]/95 backdrop-blur-md shadow-2xl p-6 sm:p-8 will-change-transform">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[#E0E0E0] dark:border-[#1E293B]">
            <th className="pb-4 text-sm font-bold text-[#7A7A7A] dark:text-[#94A3B8] w-1/3">
              Capability
            </th>
            <th className="pb-4 text-sm font-bold text-gray-500 dark:text-gray-400 w-1/3">
              Traditional Courses
            </th>
            <th className="pb-4 text-sm font-bold text-[#0066CC] dark:text-[#38BDF8] w-1/3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>PathFinder AI</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F0F0F0] dark:divide-[#1E293B] text-sm">
          {rows.map((r, idx) => (
            <tr
              key={idx}
              className="hover:bg-[#F8FAFC]/80 dark:hover:bg-[#161F2E]/60 transition-colors"
            >
              <td className="py-4 pr-4 font-bold text-[#1D1D1F] dark:text-[#F8FAFC]">
                {r.feature}
              </td>
              <td className="py-4 pr-4 text-[#64748B] dark:text-[#94A3B8] flex items-start gap-2">
                <X className="w-4 h-4 text-red-400 flex-none mt-0.5" />
                <span>{r.traditional}</span>
              </td>
              <td className="py-4 font-medium text-[#1D1D1F] dark:text-[#F1F5F9]">
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#0066CC] dark:text-[#38BDF8] flex-none mt-0.5" />
                  <span>{r.pathfinder}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
