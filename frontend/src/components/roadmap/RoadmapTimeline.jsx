import React from 'react'
import MilestoneCard from './MilestoneCard'

export default function RoadmapTimeline({ milestones, onRefresh }) {
  if (!milestones || milestones.length === 0) {
    return (
      <div className="bg-white dark:bg-[#121216] border border-gray-200 dark:border-[#27272F] rounded-2xl p-8 text-center text-sm text-gray-500 dark:text-[#94A3B8] shadow-sm">
        No milestones yet.
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Vertical connector line running behind the milestone markers */}
      <div className="absolute left-4 top-4 bottom-4 w-px bg-indigo-200 dark:bg-[#27272F]" aria-hidden="true" />

      <div className="space-y-6">
        {milestones.map((m, idx) => (
          <MilestoneCard
            key={m.id || idx}
            milestone={m}
            index={idx + 1}
            defaultOpen={idx === 0}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </div>
  )
}
