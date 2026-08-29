import React, { useMemo } from 'react'

/**
 * WindingRoadmap
 * High-fidelity, interactive S-curve asphalt highway roadmap visualization.
 * Replaces linear horizontal card strips with an authentic road-like milestone map
 * matching Image 1, complete with Start/Finish flags, milestone nodes, category titles,
 * tech subtitles, dynamic status badges, and an interactive legend.
 */
export default function WindingRoadmap({
  milestones = [],
  activeMilestoneId = 1,
  onSelectMilestone,
  weekGroups = {},
}) {
  // Ensure we have milestones to render
  const nodes = useMemo(() => {
    if (!milestones.length) return []
    return milestones.map((m, idx) => {
      const wg = weekGroups[m.weekTab] || {}
      const firstTask = wg.tasks?.[0] || {}
      
      // Extract main category title
      const title = m.label || wg.themeTitle || `Step ${idx + 1}`
      
      // Extract technologies / skills subtitle
      const allSkills = (wg.tasks || []).flatMap((t) => t.skill_tags || [])
      const uniqueSkills = Array.from(new Set(allSkills)).slice(0, 3)
      const subtitle = uniqueSkills.length > 0 ? uniqueSkills.join(' / ') : firstTask.provider || 'Core concepts'

      return {
        ...m,
        number: idx + 1,
        title,
        subtitle,
        isComplete: !!wg.isComplete || m.isComplete,
        isLocked: !!wg.isLocked || m.isLocked,
        isInProgress: !wg.isComplete && !wg.isLocked && (wg.percent > 0 || m.id === activeMilestoneId),
      }
    })
  }, [milestones, weekGroups, activeMilestoneId])

  // Split into Top Row (left-to-right) and Bottom Row (right-to-left)
  const { topRow, bottomRow } = useMemo(() => {
    if (!nodes.length) return { topRow: [], bottomRow: [] }
    const half = Math.ceil(nodes.length / 2)
    const top = nodes.slice(0, half)
    const bottom = nodes.slice(half) // will be displayed right-to-left
    return { topRow: top, bottomRow: bottom }
  }, [nodes])

  if (!nodes.length) return null

  return (
    <div className="w-full bg-[#FAFBFD] dark:bg-[#0D131F] rounded-2xl border border-[#E1E8F2] dark:border-[#1E2638] p-5 sm:p-7 shadow-xs relative overflow-hidden select-none">
      
      {/* Visual Roadmap Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-['Manrope'] font-bold text-base sm:text-lg text-[#0E1B38] dark:text-[#F8FAFC]">
            Interactive Highway Roadmap
          </h3>
          <p className="text-xs text-[#52617D] dark:text-[#94A3B8] mt-0.5">
            Follow the learning path from Start 🏁 to Finish ⛳. Click any milestone to switch tasks.
          </p>
        </div>
        <span className="text-[11px] font-bold text-[#0066cc] dark:text-[#38BDF8] bg-[#EAF2FC] dark:bg-blue-950/50 border border-[#D5E6FA] dark:border-blue-900/60 px-3 py-1 rounded-full hidden sm:inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0066cc] dark:bg-[#38BDF8] animate-pulse"></span>
          {nodes.length} Milestones Total
        </span>
      </div>

      {/* SVG & HTML Interactive Canvas */}
      <div className="relative w-full min-w-[700px] overflow-x-auto py-6 pf-custom-scrollbar">
        
        {/* START Flag (Top-Left) */}
        <div className="absolute top-[88px] left-2 sm:left-4 z-10 flex flex-col items-center pointer-events-none">
          <div className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-[#141A26] border-2 border-[#5B36E9] dark:border-[#818CF8] rounded-lg shadow-sm">
            <span className="text-xs font-extrabold text-[#5B36E9] dark:text-[#818CF8]">Start</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5B36E9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          </div>
          <div className="w-0.5 h-6 bg-[#5B36E9] dark:bg-[#818CF8]"></div>
        </div>

        {/* FINISH Flag (Bottom-Left) */}
        <div className="absolute bottom-[96px] left-2 sm:left-4 z-10 flex flex-col items-center pointer-events-none">
          <div className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-[#141A26] border-2 border-[#22A06B] dark:border-emerald-400 rounded-lg shadow-sm">
            <span className="text-xs font-extrabold text-[#22A06B] dark:text-emerald-400">Finish</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22A06B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          </div>
          <div className="w-0.5 h-6 bg-[#22A06B] dark:bg-emerald-400"></div>
        </div>

        {/* The Winding Road Background SVG (S-Curve Highway) */}
        <svg
          viewBox="0 0 1000 320"
          className="w-full h-[320px] overflow-visible drop-shadow-md"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Asphalt road gradient */}
            <linearGradient id="roadGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2A303C" />
              <stop offset="50%" stopColor="#1E232E" />
              <stop offset="100%" stopColor="#161A22" />
            </linearGradient>
            
            {/* Road border shadow */}
            <filter id="roadShadow" x="-5%" y="-5%" width="110%" height="120%" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#0E1B38" floodOpacity="0.18" />
            </filter>
          </defs>

          {/* Main Road Outer Path (Asphalt Bed) */}
          <path
            d="M 50 115 
               C 150 115, 200 95, 300 115 
               C 400 135, 500 95, 600 115 
               C 700 135, 800 100, 870 120
               C 960 145, 960 215, 870 240
               C 780 265, 680 230, 580 250
               C 480 270, 380 230, 280 250
               C 180 270, 100 245, 50 250"
            stroke="url(#roadGradient)"
            strokeWidth="38"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#roadShadow)"
          />

          {/* Road Curb Edge Top */}
          <path
            d="M 50 115 
               C 150 115, 200 95, 300 115 
               C 400 135, 500 95, 600 115 
               C 700 135, 800 100, 870 120
               C 960 145, 960 215, 870 240
               C 780 265, 680 230, 580 250
               C 480 270, 380 230, 280 250
               C 180 270, 100 245, 50 250"
            stroke="#4A5568"
            strokeWidth="36"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Road Asphalt Fill */}
          <path
            d="M 50 115 
               C 150 115, 200 95, 300 115 
               C 400 135, 500 95, 600 115 
               C 700 135, 800 100, 870 120
               C 960 145, 960 215, 870 240
               C 780 265, 680 230, 580 250
               C 480 270, 380 230, 280 250
               C 180 270, 100 245, 50 250"
            stroke="#212733"
            strokeWidth="32"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Centerline Dashes */}
          <path
            d="M 50 115 
               C 150 115, 200 95, 300 115 
               C 400 135, 500 95, 600 115 
               C 700 135, 800 100, 870 120
               C 960 145, 960 215, 870 240
               C 780 265, 680 230, 580 250
               C 480 270, 380 230, 280 250
               C 180 270, 100 245, 50 250"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeDasharray="10 12"
            strokeLinecap="round"
            opacity="0.85"
          />
        </svg>

        {/* TOP ROW MILESTONES (Left to Right) */}
        <div className="absolute top-2 left-16 right-16 flex items-start justify-between">
          {topRow.map((node) => {
            const isSelected = activeMilestoneId === node.id

            return (
              <div
                key={node.id}
                onClick={() => onSelectMilestone(node)}
                className={`flex flex-col items-center cursor-pointer transition-all duration-200 group px-2 py-1.5 rounded-2xl ${
                  isSelected
                    ? 'bg-[#EEF2FF] dark:bg-[#1E1B4B]/70 ring-2 ring-[#5B36E9] dark:ring-[#818CF8] shadow-md -translate-y-1'
                    : 'hover:-translate-y-1 hover:bg-white/80 dark:hover:bg-[#1A2232]/80'
                }`}
                style={{ minWidth: '100px', maxWidth: '140px' }}
              >
                {/* Category Title */}
                <h4 className="font-['Manrope'] font-bold text-xs sm:text-[13px] text-[#0E1B38] dark:text-[#F8FAFC] text-center leading-tight truncate w-full">
                  {node.title}
                </h4>

                {/* Tech / Skills Subtitle */}
                <p className="text-[10.5px] text-[#52617D] dark:text-[#94A3B8] text-center truncate w-full mt-0.5 font-medium">
                  {node.subtitle}
                </p>

                {/* Milestone Number Pin on the Road */}
                <div className="my-2.5 relative">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-extrabold text-xs sm:text-sm transition-all duration-200 shadow-md ${
                      isSelected
                        ? 'bg-[#5B36E9] text-white ring-4 ring-[#5B36E9]/25 scale-110'
                        : node.isComplete
                        ? 'bg-[#22A06B] text-white ring-2 ring-[#22A06B]/30'
                        : node.isLocked
                        ? 'bg-[#374151] text-[#9CA3AF] border border-[#4B5563]'
                        : 'bg-[#0066cc] text-white ring-2 ring-[#0066cc]/25'
                    }`}
                  >
                    {node.isComplete ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      node.number
                    )}
                  </div>
                </div>

                {/* Status Pill Badge */}
                {isSelected ? (
                  <span className="inline-flex items-center gap-1 bg-[#ECFDF3] text-[#22A06B] text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs border border-[#A6F4C5]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22A06B] animate-pulse"></span>
                    Active
                  </span>
                ) : node.isComplete ? (
                  <span className="inline-flex items-center gap-1 bg-[#ECFDF3] text-[#22A06B] text-[10px] font-bold px-2 py-0.5 rounded-full">
                    ✓ Done
                  </span>
                ) : node.isLocked ? (
                  <span className="inline-flex items-center gap-1 bg-[#F3F4F6] dark:bg-[#1F2937] text-[#6B7280] dark:text-[#9CA3AF] text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#E5E7EB] dark:border-[#374151]">
                    🔒 Locked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-[#EFF6FF] dark:bg-blue-950/40 text-[#2563EB] dark:text-[#60A5FA] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    Step {node.number}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* BOTTOM ROW MILESTONES (Right to Left) */}
        <div className="absolute bottom-2 left-16 right-16 flex flex-row-reverse items-end justify-between">
          {bottomRow.map((node) => {
            const isSelected = activeMilestoneId === node.id

            return (
              <div
                key={node.id}
                onClick={() => onSelectMilestone(node)}
                className={`flex flex-col items-center cursor-pointer transition-all duration-200 group px-2 py-1.5 rounded-2xl ${
                  isSelected
                    ? 'bg-[#EEF2FF] dark:bg-[#1E1B4B]/70 ring-2 ring-[#5B36E9] dark:ring-[#818CF8] shadow-md -translate-y-1'
                    : 'hover:-translate-y-1 hover:bg-white/80 dark:hover:bg-[#1A2232]/80'
                }`}
                style={{ minWidth: '100px', maxWidth: '140px' }}
              >
                {/* Milestone Number Pin on the Road */}
                <div className="mb-2 relative">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-extrabold text-xs sm:text-sm transition-all duration-200 shadow-md ${
                      isSelected
                        ? 'bg-[#5B36E9] text-white ring-4 ring-[#5B36E9]/25 scale-110'
                        : node.isComplete
                        ? 'bg-[#22A06B] text-white ring-2 ring-[#22A06B]/30'
                        : node.isLocked
                        ? 'bg-[#374151] text-[#9CA3AF] border border-[#4B5563]'
                        : 'bg-[#0066cc] text-white ring-2 ring-[#0066cc]/25'
                    }`}
                  >
                    {node.isComplete ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      node.number
                    )}
                  </div>
                </div>

                {/* Category Title */}
                <h4 className="font-['Manrope'] font-bold text-xs sm:text-[13px] text-[#0E1B38] dark:text-[#F8FAFC] text-center leading-tight truncate w-full">
                  {node.title}
                </h4>

                {/* Tech / Skills Subtitle */}
                <p className="text-[10.5px] text-[#52617D] dark:text-[#94A3B8] text-center truncate w-full mt-0.5 font-medium">
                  {node.subtitle}
                </p>

                {/* Status Pill Badge */}
                <div className="mt-1.5">
                  {isSelected ? (
                    <span className="inline-flex items-center gap-1 bg-[#ECFDF3] text-[#22A06B] text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs border border-[#A6F4C5]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22A06B] animate-pulse"></span>
                      Active
                    </span>
                  ) : node.isComplete ? (
                    <span className="inline-flex items-center gap-1 bg-[#ECFDF3] text-[#22A06B] text-[10px] font-bold px-2 py-0.5 rounded-full">
                      ✓ Done
                    </span>
                  ) : node.isLocked ? (
                    <span className="inline-flex items-center gap-1 bg-[#F3F4F6] dark:bg-[#1F2937] text-[#6B7280] dark:text-[#9CA3AF] text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#E5E7EB] dark:border-[#374151]">
                      🔒 Locked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-[#EFF6FF] dark:bg-blue-950/40 text-[#2563EB] dark:text-[#60A5FA] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      Step {node.number}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

      </div>

      {/* Bottom Interactive Legend */}
      <div className="mt-4 pt-3.5 border-t border-[#E1E8F2] dark:border-[#1E2638] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-[#52617D] dark:text-[#94A3B8] font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border-2 border-[#0066cc] bg-white dark:bg-[#0D131F]"></span>
            <span>Not started</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border-2 border-[#F59E0B] bg-[#FEF3C7] dark:bg-amber-950/50"></span>
            <span>In progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#22A06B] border border-[#16A34A]"></span>
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#374151] border border-[#4B5563]"></span>
            <span>Locked</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[#0066cc] dark:text-[#38BDF8] font-bold text-[11.5px]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 15l5-5-5-5" />
            <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
          </svg>
          <span>Click any milestone to view week details & tasks</span>
        </div>
      </div>

    </div>
  )
}
