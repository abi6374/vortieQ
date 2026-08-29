import React, { useState } from 'react'
import ResourceItem from './ResourceItem'

export default function MilestoneCard({ milestone, index, defaultOpen = false, onRefresh }) {
  const [open, setOpen] = useState(defaultOpen)
  const steps = milestone.steps || milestone.path_steps || []

  return (
    <div className="relative pl-10">
      {/* Numbered marker sitting on the timeline line */}
      <div className="absolute left-0 top-4 flex items-center justify-center w-8 h-8 rounded-full bg-[#0066cc] text-white font-bold text-sm ring-4 ring-[#f5f5f7] shadow-sm">
        {index}
      </div>

      <div className="bg-white border border-[#e0e0e0] rounded-2xl shadow-[0_4px_14px_rgba(25,49,75,0.05)] overflow-hidden transition-all hover:border-[#0066cc]/40">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 p-5 text-left hover:bg-[#eaf2fc]/30 transition-colors"
        >
          <div>
            <h3 className="text-base font-bold text-[#1d1d1f] font-['Manrope',sans-serif]">{milestone.title}</h3>
            {milestone.description && (
              <p className="text-xs text-[#333333] mt-0.5">{milestone.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {milestone.estimated_weeks != null && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#eaf2fc] text-[#0066cc] border border-[#e1effe]">
                ~{milestone.estimated_weeks} weeks
              </span>
            )}
            <span className={`text-[#7a7a7a] transition-transform ${open ? 'rotate-180' : ''}`}>
              ▾
            </span>
          </div>
        </button>

        {open && (
          <div className="px-5 pb-5 space-y-3">
            {steps.map((s, sIdx) => (
              <ResourceItem key={s.id || sIdx} step={s} onRefresh={onRefresh} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

