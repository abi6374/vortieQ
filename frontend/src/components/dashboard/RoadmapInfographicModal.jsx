import React, { useRef, useState, useMemo } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

/**
 * RoadmapInfographicModal
 * Renders an infographic-style flowchart learning roadmap matching the user reference image
 * with a high-resolution 1-Click PDF export.
 */
export default function RoadmapInfographicModal({
  isOpen,
  onClose,
  roadmap,
  targetRole = 'Software Engineer',
  cleanGoalTitle = 'Career Path',
  totalWeeks = 24,
}) {
  const posterRef = useRef(null)
  const [isExporting, setIsExporting] = useState(false)
  const [downloadSuccess, setDownloadSuccess] = useState(false)

  // Group weeks into phases / months (up to 4 weeks per month)
  const monthsData = useMemo(() => {
    const rawWeeks = roadmap?.weeks || []
    if (!rawWeeks.length) {
      // Fallback synthetic structure if roadmap weeks are empty
      return [
        {
          monthNumber: 1,
          theme: 'Foundations & Core Syntax',
          weeks: [
            { week_number: 1, title: 'Programming Fundamentals', desc: 'Syntax, data structures, and algorithmic logic' },
            { week_number: 2, title: 'Core Libraries & Tools', desc: 'Standard libraries, tooling, and version control' },
          ],
        },
      ]
    }

    const months = []
    const weeksPerMonth = 4
    for (let i = 0; i < rawWeeks.length; i += weeksPerMonth) {
      const chunk = rawWeeks.slice(i, i + weeksPerMonth)
      const monthIdx = Math.floor(i / weeksPerMonth) + 1

      // Find the milestone label or primary theme of this chunk
      const firstWeekWithLabel = chunk.find((w) => w.milestone_label && w.milestone_label !== 'Milestone')
      const monthTheme = firstWeekWithLabel
        ? firstWeekWithLabel.milestone_label
        : chunk[0]?.title || `Phase ${monthIdx} Core Mastery`

      months.push({
        monthNumber: monthIdx,
        theme: monthTheme,
        weeks: chunk.map((w) => {
          const stepDescriptions = (w.steps || [])
            .map((s) => s.title)
            .filter(Boolean)
            .slice(0, 3)
            .join(' · ')

          return {
            week_number: w.week_number,
            title: w.title || `Week ${w.week_number} Module`,
            desc:
              w.subtitle ||
              stepDescriptions ||
              'Key concepts, production projects, and hands-on practice',
            isComplete: !!w.is_complete,
            steps: w.steps || [],
          }
        }),
      })
    }
    return months
  }, [roadmap])

  const handleDownloadPDF = async () => {
    if (!posterRef.current || isExporting) return
    setIsExporting(true)
    setDownloadSuccess(false)
    try {
      const element = posterRef.current
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution for crisp printing
        useCORS: true,
        backgroundColor: '#fafbfc',
        logging: false,
        windowWidth: 1000,
      })

      const imgData = canvas.toDataURL('image/png')
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      const pdf = new jsPDF('p', 'mm', 'a4')
      let heightLeft = imgHeight
      let position = 0

      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST')
      } else {
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
        heightLeft -= pageHeight

        while (heightLeft > 0) {
          position = heightLeft - imgHeight
          pdf.addPage()
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
          heightLeft -= pageHeight
        }
      }

      const safeTitle = (cleanGoalTitle || targetRole || 'Learning')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
      pdf.save(`${safeTitle}_Roadmap_PathFinder.pdf`)
      setDownloadSuccess(true)
      setTimeout(() => setDownloadSuccess(false), 4000)
    } catch (err) {
      console.error('Error generating PDF roadmap:', err)
    } finally {
      setIsExporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0E131E] w-full max-w-4xl max-h-[92vh] rounded-3xl border border-[#e0e0e0] dark:border-[#202B3C] shadow-2xl flex flex-col overflow-hidden">
        
        {/* MODAL CONTROLS HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0] dark:border-[#1E2638] bg-white dark:bg-[#0E131E] flex-none">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-[#eaf2fc] dark:bg-[#1A2840] text-[#0066cc] dark:text-[#38BDF8] flex items-center justify-center font-bold text-sm shadow-xs">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </span>
            <div>
              <h2 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] dark:text-white">
                Roadmap Poster & PDF Export
              </h2>
              <p className="text-xs text-[#7a7a7a] dark:text-[#94A3B8]">
                Infographic flowchart tailored to your learning pace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0066cc] hover:bg-[#004fa3] text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isExporting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Download Roadmap PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#7a7a7a] hover:text-[#1d1d1f] hover:bg-[#f0f0f0] dark:hover:bg-[#1E2638] dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* SCROLLABLE POSTER CANVAS CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#f5f6f8] dark:bg-[#080B10] flex justify-center pf-custom-scrollbar">
          
          {/* THE INFOGRAPHIC POSTER ELEMENT (Exported to PDF via html2canvas) */}
          <div
            ref={posterRef}
            className="w-full max-w-[820px] bg-[#fafbfc] border border-[#e0e7ef] rounded-3xl p-6 sm:p-10 shadow-lg text-[#1d1d1f] flex flex-col items-center relative overflow-hidden"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {/* Top Brand & Title Header Banner (Matching user reference image style) */}
            <div className="w-full flex flex-col items-center mb-8 relative">
              <div className="w-full max-w-lg bg-[#E2EBE5] border-2 border-[#CBD8CE] rounded-2xl py-3 px-6 text-center shadow-xs flex items-center justify-center gap-3">
                <span className="text-2xl" role="img" aria-label="AI bot">🤖</span>
                <h1 className="font-['Manrope'] font-extrabold text-xl sm:text-2xl text-[#1E293B] tracking-tight">
                  {cleanGoalTitle || targetRole} Roadmap
                </h1>
                <span className="text-2xl" role="img" aria-label="AI bot">🤖</span>
              </div>
              <p className="text-xs text-[#64748B] font-semibold mt-2 text-center">
                Personalized {monthsData.reduce((acc, m) => acc + m.weeks.length, 0)}-Week Learning Path · Calibrated by PathFinder AI
              </p>
            </div>

            {/* START GREEN MARKER */}
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#10B981] text-white text-xs font-black tracking-wider uppercase shadow-sm mb-2 z-10">
              <span>START</span>
            </div>

            {/* Top Central Spine Connector */}
            <div className="w-[3px] h-6 bg-[#334155]" />

            {/* FLOWCHART MONTHS & WEEKS TREE */}
            <div className="w-full space-y-6 relative flex flex-col items-center">
              {monthsData.map((month, mIdx) => {
                const isEvenMonth = month.monthNumber % 2 === 0
                return (
                  <div key={month.monthNumber} className="w-full flex flex-col items-center relative">
                    
                    {/* CENTRAL MONTH BOX */}
                    <div className="z-10 bg-white border-2 border-dashed border-[#F59E0B] rounded-2xl px-6 py-2.5 text-center shadow-sm max-w-[260px] w-full">
                      <span className="text-[11px] font-black text-[#D97706] uppercase tracking-wider block">
                        MONTH {month.monthNumber}
                      </span>
                      <span className="font-bold text-xs sm:text-sm text-[#1E293B] leading-tight block mt-0.5">
                        {month.theme}
                      </span>
                    </div>

                    {/* HORIZONTAL CONNECTOR & WEEKS BRANCHING ROW */}
                    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 mt-4 relative items-stretch">
                      
                      {/* Left Column (Odd-indexed weeks in month) */}
                      <div className="flex flex-col gap-4">
                        {month.weeks
                          .filter((_, wIndex) => wIndex % 2 === 0)
                          .map((week) => (
                            <div
                              key={week.week_number}
                              className="relative bg-[#FFFBEB] border-2 border-dashed border-[#FCD34D] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="px-2.5 py-0.5 bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-[10px] font-extrabold uppercase tracking-wider rounded-md">
                                  WEEK {week.week_number}
                                </span>
                                {week.isComplete && (
                                  <span className="text-[10px] font-bold text-[#059669] bg-[#D1FAE5] px-1.5 py-0.5 rounded">
                                    ✓ Completed
                                  </span>
                                )}
                              </div>
                              <h3 className="font-bold text-xs sm:text-sm text-[#1E293B] leading-snug">
                                {week.title}
                              </h3>
                              <p className="text-[11px] text-[#64748B] mt-1.5 leading-relaxed">
                                {week.desc}
                              </p>
                            </div>
                          ))}
                      </div>

                      {/* Right Column (Even-indexed weeks in month) */}
                      <div className="flex flex-col gap-4">
                        {month.weeks
                          .filter((_, wIndex) => wIndex % 2 === 1)
                          .map((week) => (
                            <div
                              key={week.week_number}
                              className="relative bg-[#EFF6FF] border-2 border-dashed border-[#BFDBFE] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="px-2.5 py-0.5 bg-[#DBEAFE] border border-[#BFDBFE] text-[#1E40AF] text-[10px] font-extrabold uppercase tracking-wider rounded-md">
                                  WEEK {week.week_number}
                                </span>
                                {week.isComplete && (
                                  <span className="text-[10px] font-bold text-[#059669] bg-[#D1FAE5] px-1.5 py-0.5 rounded">
                                    ✓ Completed
                                  </span>
                                )}
                              </div>
                              <h3 className="font-bold text-xs sm:text-sm text-[#1E293B] leading-snug">
                                {week.title}
                              </h3>
                              <p className="text-[11px] text-[#64748B] mt-1.5 leading-relaxed">
                                {week.desc}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Central Spine Diamond Node & Vertical Line to Next Month */}
                    {mIdx < monthsData.length - 1 && (
                      <div className="flex flex-col items-center my-3">
                        <div className="w-[3px] h-5 bg-[#334155]" />
                        <div className="w-3.5 h-3.5 bg-[#0F172A] transform rotate-45 my-1" />
                        <div className="w-[3px] h-5 bg-[#334155]" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Bottom Vertical Spine Connector to Finish */}
            <div className="w-[3px] h-6 bg-[#334155] mt-3" />

            {/* FINISH RED MARKER */}
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#EF4444] text-white text-xs font-black tracking-wider uppercase shadow-sm mt-1 z-10">
              <span>FINISH</span>
            </div>

            {/* POSTER FOOTER */}
            <div className="w-full pt-8 mt-6 border-t border-[#e2e8f0] flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-[#94A3B8]">
              <span>Generated on {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              <span className="font-semibold text-[#64748B]">PathFinder AI · Personalized Learning Platform</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
