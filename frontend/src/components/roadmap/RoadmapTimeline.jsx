import React from 'react'
import MilestoneCard from './MilestoneCard'

export default function RoadmapTimeline({ milestones, onRefresh }) {
  if (!milestones || milestones.length === 0) {
    return <div className="text-slate-500 text-sm">No milestones generated yet.</div>
  }

  return (
    <div className="space-y-6">
      {milestones.map((m, idx) => (
        <MilestoneCard
          key={m.id || idx}
          milestone={m}
          index={idx + 1}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  )
}
