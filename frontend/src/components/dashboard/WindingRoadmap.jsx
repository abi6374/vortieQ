import React, { useMemo } from 'react'

/**
 * WindingRoadmap
 * Vertical Serpentine / Snake Roadmap infographic component matching Image 2.
 * The asphalt road flows continuously down the page, alternating left and right
 * through each week/milestone from START at the top down to GOAL at the bottom.
 * 
 * Features:
 * - Dynamic generation for N weeks with zero horizontal overlap
 * - Continuous SVG road with asphalt styling, curb outline, and dashed centerline
 * - S-curve turns touching every milestone node pin
 * - Rich, high-legibility cards with PathFinder brand blue (#0066cc) active state
 * - Clean status badges (Active, Completed, Locked)
 */
export default function WindingRoadmap({
  milestones = [],
  activeMilestoneId = 1,
  onSelectMilestone,
  weekGroups = {},
}) {
  const nodes = useMemo(() => {
    if (!milestones.length) return []
    return milestones.map((m, idx) => {
      const wg = weekGroups[m.weekTab] || {}
      const firstTask = wg.tasks?.[0] || {}
      
      const title = m.label || wg.themeTitle || `Week ${idx + 1}`
      
      const allSkills = (wg.tasks || []).flatMap((t) => t.skill_tags || [])
      const uniqueSkills = Array.from(new Set(allSkills)).slice(0, 3)
      const subtitle = uniqueSkills.length > 0 ? uniqueSkills.join(' · ') : firstTask.provider || 'Core milestones'
      const totalHrs = wg.totalHrs || (wg.tasks || []).reduce((acc, t) => acc + (t.duration_hrs || 0), 0) || 8

      return {
        ...m,
        index: idx,
        number: idx + 1,
        title,
        subtitle,
        totalHrs,
        isComplete: !!wg.isComplete || m.isComplete,
        isLocked: !!wg.isLocked || m.isLocked,
        isActive: m.id === activeMilestoneId,
        percent: wg.percent || 0,
      }
    })
  }, [milestones, weekGroups, activeMilestoneId])

  if (!nodes.length) return null

  // Layout parameters for the vertical snake
  const rowHeight = 150
  const topPadding = 90
  const bottomPadding = 110
  const totalHeight = topPadding + nodes.length * rowHeight + bottomPadding

  const leftX = 140
  const rightX = 660
  const centerX = 400

  // Build the continuous SVG path for the road
  const roadPathD = useMemo(() => {
    let d = `M ${centerX} 25 L ${centerX} ${topPadding - 40}`
    
    nodes.forEach((node, i) => {
      const isLeft = i % 2 === 0
      const currentY = topPadding + i * rowHeight + rowHeight / 2
      const targetX = isLeft ? leftX : rightX

      if (i === 0) {
        // Curve from top center into first node (left)
        d += ` C ${centerX} ${topPadding - 10}, ${targetX} ${topPadding - 10}, ${targetX} ${currentY}`
      } else {
        const prevIsLeft = (i - 1) % 2 === 0
        const prevX = prevIsLeft ? leftX : rightX
        const prevY = topPadding + (i - 1) * rowHeight + rowHeight / 2
        const midY = (prevY + currentY) / 2
        // S-curve from previous node to current node
        d += ` C ${prevX} ${midY}, ${targetX} ${midY}, ${targetX} ${currentY}`
      }
    })

    // Curve from last node to bottom center GOAL arrow
    const lastIndex = nodes.length - 1
    const lastIsLeft = lastIndex % 2 === 0
    const lastX = lastIsLeft ? leftX : rightX
    const lastY = topPadding + lastIndex * rowHeight + rowHeight / 2
    const finalY = totalHeight - 45

    d += ` C ${lastX} ${lastY + 50}, ${centerX} ${lastY + 50}, ${centerX} ${finalY}`
    return d
  }, [nodes, totalHeight])

  return (
    <div className="w-full bg-[#FAFBFD] dark:bg-[#0D131F] rounded-2xl border border-[#E1E8F2] dark:border-[#1E2638] p-5 sm:p-8 shadow-xs relative overflow-hidden select-none">
      
      {/* Visual Canvas Container */}
      <div className="relative w-full max-w-[800px] mx-auto overflow-hidden">
        
        {/* START Banner at Top */}
        <div className="flex flex-col items-center mb-2 z-10 relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#EAF2FC] dark:bg-blue-950/60 border border-[#0066cc]/30 dark:border-blue-800 rounded-full shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#0066cc] animate-ping"></span>
            <span className="font-['Manrope'] font-extrabold text-sm tracking-wider text-[#0066cc] dark:text-[#38BDF8] uppercase">
              START
            </span>
          </div>
        </div>

        {/* SVG Road Layer */}
        <svg
          viewBox={`0 0 800 ${totalHeight}`}
          className="absolute inset-0 w-full h-full pointer-events-none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="verticalRoadGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2A303C" />
              <stop offset="50%" stopColor="#1E232E" />
              <stop offset="100%" stopColor="#161A22" />
            </linearGradient>
            <filter id="roadDropShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#0E1B38" floodOpacity="0.16" />
            </filter>
          </defs>

          {/* Road Outer Shadow Bed */}
          <path
            d={roadPathD}
            stroke="url(#verticalRoadGradient)"
            strokeWidth="42"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#roadDropShadow)"
          />

          {/* Road Curb Borders */}
          <path
            d={roadPathD}
            stroke="#4A5568"
            strokeWidth="40"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Road Asphalt Surface */}
          <path
            d={roadPathD}
            stroke="#212733"
            strokeWidth="34"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* White Center Dashed Line */}
          <path
            d={roadPathD}
            stroke="#FFFFFF"
            strokeWidth="3.2"
            strokeDasharray="12 12"
            strokeLinecap="round"
            opacity="0.9"
          />
        </svg>

        {/* Milestone Nodes & Content Rows */}
        <div className="relative z-10" style={{ height: `${totalHeight - 70}px`, paddingTop: `${topPadding - 20}px` }}>
          {nodes.map((node, i) => {
            const isLeft = i % 2 === 0
            const isSelected = activeMilestoneId === node.id

            return (
              <div
                key={node.id}
                style={{ height: `${rowHeight}px` }}
                className={`flex items-center w-full px-2 sm:px-6 transition-all ${
                  isLeft ? 'flex-row' : 'flex-row-reverse'
                }`}
              >
                {/* Milestone Pin on Road Path */}
                <div
                  onClick={() => onSelectMilestone(node)}
                  className="flex-none cursor-pointer group flex flex-col items-center justify-center relative z-20"
                  style={{ width: '90px' }}
                >
                  <div
                    className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-['Manrope'] font-extrabold text-base sm:text-lg transition-all duration-200 shadow-lg cursor-pointer ${
                      isSelected
                        ? 'bg-[#0066cc] text-white ring-4 ring-[#0066cc]/25 scale-110 shadow-[0_0_20px_rgba(0,102,204,0.4)]'
                        : node.isComplete
                        ? 'bg-[#22A06B] text-white ring-3 ring-[#22A06B]/25 hover:scale-105'
                        : node.isLocked
                        ? 'bg-[#2B3442] text-[#94A3B8] border border-[#3E4C5E]'
                        : 'bg-white dark:bg-[#1E2638] text-[#0066cc] dark:text-[#38BDF8] border-2 border-[#0066cc] dark:border-[#38BDF8] hover:scale-105'
                    }`}
                  >
                    {node.isComplete ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      String(node.number).padStart(2, '0')
                    )}
                  </div>

                  {/* Pin Status Label */}
                  <span className={`text-[11px] font-bold mt-1.5 px-2 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-[#EAF2FC] text-[#0066cc] dark:bg-blue-950 dark:text-[#38BDF8] font-extrabold'
                      : node.isComplete
                      ? 'bg-[#ECFDF3] text-[#22A06B] dark:bg-emerald-950 dark:text-emerald-400'
                      : node.isLocked
                      ? 'text-[#64748B] dark:text-[#94A3B8]'
                      : 'text-[#0E1B38] dark:text-[#CBD5E1]'
                  }`}>
                    {isSelected ? 'Active' : node.isComplete ? 'Done' : node.isLocked ? 'Locked' : `Step ${node.number}`}
                  </span>
                </div>

                {/* Connecting Space */}
                <div className="w-6 sm:w-10 flex-none flex items-center justify-center">
                  <span className={`h-0.5 w-full ${isSelected ? 'bg-[#0066cc]' : 'bg-[#CBD5E1] dark:bg-[#334155]'}`}></span>
                </div>

                {/* Rich Milestone Content Card */}
                <div
                  onClick={() => onSelectMilestone(node)}
                  className={`flex-1 rounded-2xl p-4 sm:p-5 border transition-all duration-200 cursor-pointer text-left ${
                    isSelected
                      ? 'bg-white dark:bg-[#161F30] border-2 border-[#0066cc] dark:border-[#38BDF8] shadow-[0_8px_24px_rgba(0,102,204,0.12)] ring-2 ring-[#0066cc]/10 -translate-y-0.5'
                      : 'bg-white/90 dark:bg-[#121824]/90 border-[#E2E8F0] dark:border-[#1E2638] hover:border-[#0066cc]/40 hover:bg-white hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-[#0066cc] dark:text-[#38BDF8]">
                        Week {node.number}
                      </span>
                      <span className="text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">
                        · {node.totalHrs} hrs
                      </span>
                    </div>

                    {/* Status Pill */}
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 bg-[#ECFDF3] text-[#22A06B] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#A6F4C5]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#22A06B] animate-pulse"></span>
                        Current Focus
                      </span>
                    ) : node.isComplete ? (
                      <span className="inline-flex items-center gap-1 bg-[#ECFDF3] text-[#22A06B] text-xs font-bold px-2.5 py-0.5 rounded-full">
                        ✓ Completed
                      </span>
                    ) : node.isLocked ? (
                      <span className="inline-flex items-center gap-1 bg-[#F1F5F9] dark:bg-[#1E293B] text-[#64748B] dark:text-[#94A3B8] text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        🔒 Locked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-[#F8FAFC] dark:bg-[#1E293B] text-[#475569] dark:text-[#CBD5E1] text-xs font-semibold px-2.5 py-0.5 rounded-full border border-[#E2E8F0] dark:border-[#334155]">
                        Up Next
                      </span>
                    )}
                  </div>

                  {/* Main Milestone Title (Large & Readable) */}
                  <h4 className="font-['Manrope'] font-bold text-base sm:text-lg text-[#0E1B38] dark:text-[#F8FAFC] leading-snug">
                    {node.title}
                  </h4>

                  {/* Skills / Tech Stack Subtitle */}
                  <p className="text-xs sm:text-sm text-[#52617D] dark:text-[#94A3B8] mt-1 font-normal leading-relaxed">
                    {node.subtitle}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* GOAL / FINISH Arrow at Bottom */}
        <div className="flex flex-col items-center mt-6 z-10 relative">
          <div className="w-0.5 h-6 bg-[#22A06B] dark:bg-emerald-400"></div>
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-[#ECFDF3] dark:bg-emerald-950/70 border-2 border-[#22A06B] dark:border-emerald-500 rounded-full shadow-md">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22A06B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
            <span className="font-['Manrope'] font-extrabold text-sm tracking-wider text-[#22A06B] dark:text-emerald-400 uppercase">
              GOAL ACHIEVED 🎯
            </span>
          </div>
        </div>

      </div>

      {/* Clean Status Legend */}
      <div className="mt-8 pt-4 border-t border-[#E1E8F2] dark:border-[#1E2638] flex flex-wrap items-center justify-center gap-6 text-xs text-[#52617D] dark:text-[#94A3B8] font-medium">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-[#0066cc] bg-white dark:bg-[#0D131F]"></span>
          <span>Not started</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-[#0066cc] text-white"></span>
          <span>Active</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-[#22A06B]"></span>
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-[#374151]"></span>
          <span>Locked</span>
        </div>
      </div>

    </div>
  )
}
