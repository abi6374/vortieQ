import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../lib/apiClient'

/**
 * PathFinderWorkspace
 * High-fidelity 2x2 Desktop UI Presentation Board & Learning Workspace for PathFinder.
 *
 * Implements the complete design system:
 * - Deep navy heading text: #0E1B38
 * - Secondary slate text: #52617D
 * - Muted text: #74819A
 * - Primary violet: #5B36E9
 * - Active violet: #4826C9
 * - Light lavender surface: #F5F1FF
 * - Icon background lavender: #EEE9FF
 * - Card borders: #D8DFEB
 * - Success green: #22A06B (#ECFDF3)
 * - Priority amber: #D88700 (#FFF7E6)
 */
export default function PathFinderWorkspace({ pathData = null }) {
  const navigate = useNavigate()

  // State for interactive features
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [resourceFilter, setResourceFilter] = useState('All')
  const [openedResource, setOpenedResource] = useState(null)

  // AI Coach Chat State
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      text: 'What would you like help with today?',
    },
    {
      id: 2,
      role: 'user',
      text: 'Explain variance with a simple example.',
    },
    {
      id: 3,
      role: 'assistant',
      text: 'Variance shows how far values spread from their average. Want a quick practice question?',
    },
  ])
  const [inputQuery, setInputQuery] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, isTyping])

  // Resource items definitions
  const allResources = [
    {
      id: 'r1',
      type: 'Practice',
      iconType: 'play',
      title: 'Python Functions: practice guide',
      metadata: 'Free · 25 min',
      url: 'https://docs.python.org/3/tutorial/controlflow.html#defining-functions',
      description: 'Hands-on practice defining reusable functions, handling arguments, and writing docstrings in Python.',
    },
    {
      id: 'r2',
      type: 'Articles',
      iconType: 'book',
      title: 'Descriptive Statistics essentials',
      metadata: 'Free · 45 min',
      url: 'https://en.wikipedia.org/wiki/Descriptive_statistics',
      description: 'Core statistical measures: mean, median, mode, variance, and standard deviation with practical examples.',
    },
    {
      id: 'r3',
      type: 'Videos',
      iconType: 'video',
      title: 'Pandas for data analysis',
      metadata: 'Beginner · 1 hr',
      url: 'https://pandas.pydata.org/docs/user_guide/10min.html',
      description: 'Quick walkthrough of Series, DataFrames, indexing, filtering, and basic aggregations in Pandas.',
    },
  ]

  const filteredResources = resourceFilter === 'All'
    ? allResources
    : allResources.filter((r) => r.type === resourceFilter)

  // Handle AI send
  const handleSendMessage = async (customText = null) => {
    const textToSend = (customText || inputQuery).trim()
    if (!textToSend || isTyping) return

    setInputQuery('')
    const userMsg = { id: Date.now(), role: 'user', text: textToSend }
    setChatMessages((prev) => [...prev, userMsg])
    setIsTyping(true)

    try {
      if (pathData?.id) {
        const res = await apiClient.post('/api/assistant/ask', {
          question: textToSend,
          path_id: pathData.id,
        })
        setChatMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, role: 'assistant', text: res.data.answer },
        ])
      } else {
        // High quality simulated AI Coach responses tailored to suggestions
        setTimeout(() => {
          let reply = "I'm your PathFinder AI Coach! I'm here to support your learning goals, explain concepts, and keep you on track."
          const lower = textToSend.toLowerCase()
          if (lower.includes('variance')) {
            reply = "Imagine five students scored 70, 75, 80, 85, 90 (mean = 80). Variance measures the average squared difference from 80. A smaller variance means scores are packed tight; a larger variance means they're widely scattered!"
          } else if (lower.includes('concept')) {
            reply = "Sure! Which concept would you like to unpack? We can explore Python decorators, standard deviation, linear regression, or SQL joins."
          } else if (lower.includes('plan')) {
            reply = "For Week 1, your target is 8 hours: 2 hrs refreshing Python functions, 3 hrs mastering descriptive statistics, and 3 hrs on hands-on coding tasks."
          } else if (lower.includes('practice')) {
            reply = "Here's a quick challenge: Write a Python function `calc_mean_variance(numbers)` that returns a tuple of (mean, variance) without using external libraries!"
          }
          setChatMessages((prev) => [
            ...prev,
            { id: Date.now() + 1, role: 'assistant', text: reply },
          ])
          setIsTyping(false)
        }, 600)
        return
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: "Here's a quick insight: Variance measures how much individual data points deviate from the mean. Let me know if you want to test your understanding with a problem!",
        },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* HEADER: Centered title and subtitle */}
      <header className="text-center mb-8">
        <h1 className="font-['Manrope'] font-extrabold text-2xl sm:text-3xl lg:text-[34px] tracking-tight text-[#0E1B38] leading-tight">
          Your PathFinder learning workspace
        </h1>
        <p className="mt-2 text-sm sm:text-base text-[#52617D] max-w-2xl mx-auto font-normal">
          Track progress, understand gaps, learn with resources, and get help when you need it.
        </p>
      </header>

      {/* 2x2 DASHBOARD GRID */}
      <main className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-stretch">
        
        {/* =========================================================================
            PANEL 1 — Progress (Top-Left)
           ========================================================================= */}
        <section 
          aria-labelledby="panel-progress-title"
          className="bg-white rounded-[16px] border border-[#D8DFEB] shadow-[0_8px_20px_rgba(25,40,75,0.08)] p-6 sm:p-7 flex flex-col justify-between transition-all hover:shadow-[0_12px_28px_rgba(25,40,75,0.11)]"
        >
          <div>
            {/* Heading row & status */}
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-[#F0F3F8]">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-[#EEE9FF] text-[#5B36E9] flex items-center justify-center flex-none">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="16.2 7.8 10.5 10.5 7.8 16.2 13.5 13.5" fill="currentColor" stroke="none" />
                  </svg>
                </span>
                <h2 id="panel-progress-title" className="font-['Manrope'] font-extrabold text-xl text-[#0E1B38]">
                  Progress
                </h2>
                <span className="bg-[#F5F1FF] text-[#5B36E9] font-semibold text-xs px-2.5 py-1 rounded-full">
                  16-week path
                </span>
              </div>
              <span className="text-xs sm:text-sm font-semibold text-[#52617D]">
                2 of 3 tasks complete
              </span>
            </div>

            {/* Horizontal Timeline (16 weeks) */}
            <div className="mt-5 mb-6">
              <div className="relative flex items-center justify-between">
                {/* Connecting line */}
                <div className="absolute left-2.5 right-2.5 top-1/2 -translate-y-1/2 h-[2px] bg-[#E6EAF2] z-0" />
                
                {/* 16 Circles */}
                {Array.from({ length: 16 }, (_, i) => i + 1).map((weekNum) => {
                  const isSelected = selectedWeek === weekNum
                  return (
                    <button
                      key={weekNum}
                      type="button"
                      onClick={() => setSelectedWeek(weekNum)}
                      title={`Week ${weekNum}`}
                      aria-label={`Select Week ${weekNum}`}
                      className={`relative z-10 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[#5B36E9] focus:ring-offset-1 ${
                        isSelected
                          ? 'bg-[#5B36E9] text-white shadow-md shadow-[#5B36E9]/30 scale-110'
                          : 'bg-white text-[#74819A] border border-[#D8DFEB] hover:border-[#5B36E9] hover:text-[#5B36E9]'
                      }`}
                    >
                      {weekNum}
                    </button>
                  )
                })}
              </div>

              {/* Labels below */}
              <div className="flex justify-between items-center mt-2 px-1 text-[11px] font-semibold text-[#74819A]">
                <span className="text-[#5B36E9]">Week 1</span>
                <span>Week 8</span>
                <span>Week 16</span>
              </div>
            </div>

            {/* Three equally sized compact cards in one row */}
            <div className="grid grid-cols-3 gap-3 my-4">
              {/* Card 1: Progress Ring */}
              <div className="bg-[#FBFCFE] border border-[#D8DFEB] rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center text-center">
                <div className="relative w-14 h-14 sm:w-16 sm:h-16">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
                    <circle
                      cx="22"
                      cy="22"
                      r="17"
                      fill="none"
                      stroke="#EEE9FF"
                      strokeWidth="4"
                    />
                    <circle
                      cx="22"
                      cy="22"
                      r="17"
                      fill="none"
                      stroke="#5B36E9"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray="106.8"
                      strokeDashoffset={106.8 * (1 - 0.28)}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-['Manrope'] font-extrabold text-xs sm:text-sm text-[#0E1B38]">
                    28%
                  </div>
                </div>
                <span className="mt-2 text-xs font-semibold text-[#52617D]">
                  Path completion
                </span>
              </div>

              {/* Card 2: Streak */}
              <div className="bg-[#FBFCFE] border border-[#D8DFEB] rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center text-center">
                <span className="text-2xl sm:text-3xl" aria-hidden="true">
                  🔥
                </span>
                <span className="font-['Manrope'] font-extrabold text-sm sm:text-base text-[#0E1B38] mt-1">
                  4 day streak
                </span>
                <span className="text-xs text-[#52617D] mt-0.5">
                  Keep it going!
                </span>
              </div>

              {/* Card 3: Weekly hours bar chart */}
              <div className="bg-[#FBFCFE] border border-[#D8DFEB] rounded-xl p-3 sm:p-4 flex flex-col items-center justify-between text-center">
                <span className="text-xs font-bold text-[#0E1B38]">
                  Weekly hours
                </span>
                <div className="w-full flex items-end justify-center gap-2 sm:gap-2.5 h-10 my-1">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-2.5 sm:w-3 bg-[#5B36E9] rounded-t-sm h-5" title="W1: 5 hrs" />
                    <span className="text-[10px] font-semibold text-[#74819A]">W1</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-2.5 sm:w-3 bg-[#5B36E9] rounded-t-sm h-9" title="W2: 8 hrs" />
                    <span className="text-[10px] font-semibold text-[#74819A]">W2</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-2.5 sm:w-3 bg-[#5B36E9] rounded-t-sm h-6" title="W3: 6 hrs" />
                    <span className="text-[10px] font-semibold text-[#74819A]">W3</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-2.5 sm:w-3 bg-[#5B36E9] rounded-t-sm h-7" title="W4: 7 hrs" />
                    <span className="text-[10px] font-semibold text-[#74819A]">W4</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Milestone Card */}
          <div 
            onClick={() => pathData?.id ? navigate(`/roadmap/${pathData.id}`) : navigate('/roadmap')}
            className="mt-4 bg-[#F5F7FC] border border-[#D8DFEB] rounded-xl p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:border-[#5B36E9] transition-colors group"
          >
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-[#EEE9FF] text-[#5B36E9] flex items-center justify-center flex-none group-hover:bg-[#5B36E9] group-hover:text-white transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-[#0E1B38] group-hover:text-[#5B36E9] transition-colors">
                  Next milestone: Statistics foundations
                </h3>
                <p className="text-xs text-[#74819A]">
                  Due this week
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-[#5B36E9] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              View →
            </span>
          </div>
        </section>

        {/* =========================================================================
            PANEL 2 — Skill Insights (Top-Right)
           ========================================================================= */}
        <section 
          aria-labelledby="panel-skills-title"
          className="bg-white rounded-[16px] border border-[#D8DFEB] shadow-[0_8px_20px_rgba(25,40,75,0.08)] p-6 sm:p-7 flex flex-col justify-between transition-all hover:shadow-[0_12px_28px_rgba(25,40,75,0.11)]"
        >
          <div>
            {/* Heading row */}
            <div className="flex items-center gap-3 pb-4 border-b border-[#F0F3F8]">
              <span className="w-9 h-9 rounded-full bg-[#EEE9FF] text-[#5B36E9] flex items-center justify-center flex-none">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a4.5 4.5 0 0 0-4.5 4.5c0 1.2.5 2.3 1.3 3.1-.3.5-.8 1.4-.8 2.4 0 1.5 1 2.8 2.3 3.3.4.6.9 1.1 1.7 1.7" />
                  <path d="M12 2a4.5 4.5 0 0 1 4.5 4.5c0 1.2-.5 2.3-1.3 3.1.3.5.8 1.4.8 2.4 0 1.5-1 2.8-2.3 3.3-.4.6-.9 1.1-1.7 1.7" />
                  <line x1="8" y1="18" x2="8" y2="22" />
                  <line x1="12" y1="15" x2="12" y2="22" />
                  <line x1="16" y1="17" x2="16" y2="22" />
                </svg>
              </span>
              <h2 id="panel-skills-title" className="font-['Manrope'] font-extrabold text-xl text-[#0E1B38]">
                Skill insights
              </h2>
            </div>

            {/* Two-column layout: Skill rows on Left, Insight card on Right */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 mt-5 items-center">
              {/* Skill Mastery Rows (7 cols) */}
              <div className="sm:col-span-7 space-y-3.5">
                {/* Row 1: Python */}
                <div>
                  <div className="flex justify-between items-center text-xs sm:text-sm font-semibold mb-1">
                    <span className="text-[#0E1B38]">Python</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#0E1B38]">72%</span>
                      <span className="bg-[#ECFDF3] text-[#22A06B] border border-[#B7E7C9] text-[11px] font-bold px-2 py-0.5 rounded-full">
                        Strong
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-[#E8EAF4] rounded-full overflow-hidden">
                    <div className="h-full bg-[#5B36E9] rounded-full" style={{ width: '72%' }} />
                  </div>
                </div>

                {/* Row 2: Pandas */}
                <div>
                  <div className="flex justify-between items-center text-xs sm:text-sm font-semibold mb-1">
                    <span className="text-[#0E1B38]">Pandas</span>
                    <span className="font-bold text-[#0E1B38]">55%</span>
                  </div>
                  <div className="h-2 w-full bg-[#E8EAF4] rounded-full overflow-hidden">
                    <div className="h-full bg-[#5B36E9] rounded-full" style={{ width: '55%' }} />
                  </div>
                </div>

                {/* Row 3: SQL */}
                <div>
                  <div className="flex justify-between items-center text-xs sm:text-sm font-semibold mb-1">
                    <span className="text-[#0E1B38]">SQL</span>
                    <span className="font-bold text-[#0E1B38]">35%</span>
                  </div>
                  <div className="h-2 w-full bg-[#E8EAF4] rounded-full overflow-hidden">
                    <div className="h-full bg-[#5B36E9] rounded-full" style={{ width: '35%' }} />
                  </div>
                </div>

                {/* Row 4: Statistics */}
                <div>
                  <div className="flex justify-between items-center text-xs sm:text-sm font-semibold mb-1">
                    <span className="text-[#0E1B38]">Statistics</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#0E1B38]">30%</span>
                      <span className="bg-[#FFF7E6] text-[#D88700] border border-[#F3DB9B] text-[11px] font-bold px-2 py-0.5 rounded-full">
                        Priority gap
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-[#E8EAF4] rounded-full overflow-hidden">
                    <div className="h-full bg-[#5B36E9] rounded-full" style={{ width: '30%' }} />
                  </div>
                </div>

                {/* Row 5: Machine Learning */}
                <div>
                  <div className="flex justify-between items-center text-xs sm:text-sm font-semibold mb-1">
                    <span className="text-[#0E1B38]">Machine Learning</span>
                    <span className="font-bold text-[#0E1B38]">18%</span>
                  </div>
                  <div className="h-2 w-full bg-[#E8EAF4] rounded-full overflow-hidden">
                    <div className="h-full bg-[#5B36E9] rounded-full" style={{ width: '18%' }} />
                  </div>
                </div>
              </div>

              {/* Pale Lavender Insight Card (5 cols) */}
              <div className="sm:col-span-5 bg-[#F5F1FF] border border-[#E7E0FF] rounded-2xl p-5 flex flex-col items-center text-center justify-center h-full min-h-[190px]">
                <span className="w-12 h-12 rounded-full bg-[#EEE9FF] text-[#5B36E9] flex items-center justify-center mb-3">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18h6" />
                    <path d="M10 22h4" />
                    <path d="M15 2a6 6 0 0 0-6 6c0 2 1 3.5 2 4.5V15h2v-2.5c1-1 2-2.5 2-4.5a6 6 0 0 0-6-6z" />
                  </svg>
                </span>
                <h3 className="font-['Manrope'] font-bold text-base text-[#0E1B38]">
                  Focus next
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm font-medium text-[#52617D] leading-snug">
                  Build Statistics before Machine Learning
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            PANEL 3 — Resources (Bottom-Left)
           ========================================================================= */}
        <section 
          aria-labelledby="panel-resources-title"
          className="bg-white rounded-[16px] border border-[#D8DFEB] shadow-[0_8px_20px_rgba(25,40,75,0.08)] p-6 sm:p-7 flex flex-col justify-between transition-all hover:shadow-[0_12px_28px_rgba(25,40,75,0.11)]"
        >
          <div>
            {/* Heading row */}
            <div className="flex items-center gap-3 pb-3 border-b border-[#F0F3F8]">
              <span className="w-9 h-9 rounded-full bg-[#EEE9FF] text-[#5B36E9] flex items-center justify-center flex-none">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </span>
              <h2 id="panel-resources-title" className="font-['Manrope'] font-extrabold text-xl text-[#0E1B38]">
                Resources
              </h2>
            </div>

            {/* Segmented Filter Tabs */}
            <div className="flex items-center gap-1.5 mt-4 bg-[#F5F7FC] p-1 rounded-xl w-fit">
              {['All', 'Videos', 'Articles', 'Practice'].map((tab) => {
                const isActive = resourceFilter === tab
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setResourceFilter(tab)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#5B36E9] text-white shadow-sm'
                        : 'text-[#52617D] hover:text-[#0E1B38] hover:bg-white/60'
                    }`}
                  >
                    {tab}
                  </button>
                )
              })}
            </div>

            {/* Caption */}
            <p className="mt-3 mb-3 text-xs font-semibold text-[#74819A]">
              Recommended for your Week 1 plan
            </p>

            {/* 3 White Resource Cards */}
            <div className="space-y-2.5">
              {/* Resource 1: Python Functions */}
              <article className="bg-white border border-[#D8DFEB] rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:border-[#5B36E9]/50 hover:shadow-sm transition-all group">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 rounded-full bg-[#EEE9FF] text-[#5B36E9] flex items-center justify-center flex-none group-hover:scale-105 transition-transform">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="6 3 20 12 6 21 6 3" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs sm:text-sm text-[#0E1B38] truncate group-hover:text-[#5B36E9] transition-colors">
                      Python Functions: practice guide
                    </h3>
                    <p className="text-xs text-[#74819A] mt-0.5">
                      Free · 25 min
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenedResource(allResources[0])}
                  className="px-3.5 py-1.5 bg-[#5B36E9] hover:bg-[#4826C9] text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex-none focus:outline-none focus:ring-2 focus:ring-[#5B36E9] focus:ring-offset-1"
                >
                  Open
                </button>
              </article>

              {/* Resource 2: Descriptive Statistics */}
              <article className="bg-white border border-[#D8DFEB] rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:border-[#5B36E9]/50 hover:shadow-sm transition-all group">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 rounded-full bg-[#EEE9FF] text-[#5B36E9] flex items-center justify-center flex-none group-hover:scale-105 transition-transform">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs sm:text-sm text-[#0E1B38] truncate group-hover:text-[#5B36E9] transition-colors">
                      Descriptive Statistics essentials
                    </h3>
                    <p className="text-xs text-[#74819A] mt-0.5">
                      Free · 45 min
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenedResource(allResources[1])}
                  className="px-3.5 py-1.5 bg-[#5B36E9] hover:bg-[#4826C9] text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex-none focus:outline-none focus:ring-2 focus:ring-[#5B36E9] focus:ring-offset-1"
                >
                  Open
                </button>
              </article>

              {/* Resource 3: Pandas for data analysis */}
              <article className="bg-white border border-[#D8DFEB] rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:border-[#5B36E9]/50 hover:shadow-sm transition-all group">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 rounded-full bg-[#EEE9FF] text-[#5B36E9] flex items-center justify-center flex-none group-hover:scale-105 transition-transform">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="23 7 16 12 23 17 23 7" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs sm:text-sm text-[#0E1B38] truncate group-hover:text-[#5B36E9] transition-colors">
                      Pandas for data analysis
                    </h3>
                    <p className="text-xs text-[#74819A] mt-0.5">
                      Beginner · 1 hr
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenedResource(allResources[2])}
                  className="px-3.5 py-1.5 bg-[#5B36E9] hover:bg-[#4826C9] text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex-none focus:outline-none focus:ring-2 focus:ring-[#5B36E9] focus:ring-offset-1"
                >
                  Open
                </button>
              </article>
            </div>
          </div>
        </section>

        {/* =========================================================================
            PANEL 4 — AI Coach (Bottom-Right)
           ========================================================================= */}
        <section 
          aria-labelledby="panel-coach-title"
          className="bg-white rounded-[16px] border border-[#D8DFEB] shadow-[0_8px_20px_rgba(25,40,75,0.08)] p-6 sm:p-7 flex flex-col justify-between transition-all hover:shadow-[0_12px_28px_rgba(25,40,75,0.11)]"
        >
          <div>
            {/* Heading row with Online status */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F3F8]">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-[#EEE9FF] text-[#5B36E9] flex items-center justify-center flex-none">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    <polygon points="12 7 13.2 9.8 16 11 13.2 12.2 12 15 10.8 12.2 8 11 10.8 9.8" fill="currentColor" stroke="none" />
                  </svg>
                </span>
                <h2 id="panel-coach-title" className="font-['Manrope'] font-extrabold text-xl text-[#0E1B38]">
                  AI coach
                </h2>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#22A06B]">
                <span className="w-2 h-2 rounded-full bg-[#22A06B] animate-pulse" />
                <span>Online</span>
              </div>
            </div>

            {/* Chat Conversation Area */}
            <div className="my-3.5 space-y-2.5 max-h-[175px] overflow-y-auto pr-1">
              {chatMessages.map((msg) => {
                const isAssistant = msg.role === 'assistant'
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 ${
                      isAssistant ? 'justify-start' : 'justify-end'
                    }`}
                  >
                    {isAssistant && (
                      <span className="w-6 h-6 rounded-full bg-[#EEE9FF] text-[#5B36E9] flex items-center justify-center flex-none text-xs mt-0.5" aria-hidden="true">
                        ✨
                      </span>
                    )}
                    <div
                      className={`max-w-[85%] px-3.5 py-2 text-xs sm:text-[13px] leading-relaxed ${
                        isAssistant
                          ? 'bg-[#F5F1FF] text-[#0E1B38] rounded-2xl rounded-tl-sm border border-[#EBE4FF]'
                          : 'bg-[#52617D] text-white rounded-2xl rounded-tr-sm shadow-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                    {!isAssistant && (
                      <span className="w-6 h-6 rounded-full bg-[#E2E8F0] text-[#0E1B38] font-bold flex items-center justify-center flex-none text-[10px] mt-0.5">
                        👤
                      </span>
                    )}
                  </div>
                )
              })}
              {isTyping && (
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#EEE9FF] text-[#5B36E9] flex items-center justify-center flex-none text-xs">
                    ✨
                  </span>
                  <div className="bg-[#F5F1FF] px-3 py-1.5 rounded-2xl rounded-tl-sm text-xs text-[#52617D] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B36E9] animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B36E9] animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B36E9] animate-bounce" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Three Suggestion Chips */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              <button
                type="button"
                onClick={() => handleSendMessage('Explain a concept')}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#D8DFEB] hover:border-[#5B36E9] bg-white hover:bg-[#F5F1FF] text-[11px] sm:text-xs font-semibold text-[#0E1B38] hover:text-[#5B36E9] transition-all"
              >
                <span className="text-[#5B36E9]">💡</span>
                <span>Explain a concept</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendMessage('Plan my week')}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#D8DFEB] hover:border-[#5B36E9] bg-white hover:bg-[#F5F1FF] text-[11px] sm:text-xs font-semibold text-[#0E1B38] hover:text-[#5B36E9] transition-all"
              >
                <span className="text-[#5B36E9]">📅</span>
                <span>Plan my week</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendMessage('Create practice questions')}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#D8DFEB] hover:border-[#5B36E9] bg-white hover:bg-[#F5F1FF] text-[11px] sm:text-xs font-semibold text-[#0E1B38] hover:text-[#5B36E9] transition-all"
              >
                <span className="text-[#5B36E9]">❓</span>
                <span>Create practice questions</span>
              </button>
            </div>
          </div>

          {/* Bottom Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="relative flex items-center mt-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask PathFinder anything..."
              className="w-full bg-[#FAFBFF] border border-[#D8DFEB] rounded-full py-2.5 pl-4 pr-12 text-xs sm:text-sm text-[#0E1B38] placeholder-[#74819A] focus:outline-none focus:border-[#5B36E9] focus:ring-2 focus:ring-[#5B36E9]/20 transition-all"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isTyping}
              aria-label="Send message to AI Coach"
              className="absolute right-1.5 w-8 h-8 rounded-full bg-[#5B36E9] hover:bg-[#4826C9] disabled:opacity-40 text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-sm"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" />
              </svg>
            </button>
          </form>
        </section>

      </main>

      {/* Resource Preview Modal if opened */}
      {openedResource && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#0E1B38]/50 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl border border-[#D8DFEB] shadow-2xl max-w-lg w-full p-6 sm:p-7 relative animate-in fade-in zoom-in duration-150">
            <button
              onClick={() => setOpenedResource(null)}
              className="absolute top-4 right-4 text-[#74819A] hover:text-[#0E1B38] text-lg font-bold w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
              aria-label="Close modal"
            >
              ✕
            </button>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-full bg-[#EEE9FF] text-[#5B36E9] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </span>
              <div>
                <span className="text-xs font-semibold text-[#5B36E9] bg-[#F5F1FF] px-2 py-0.5 rounded-full">
                  {openedResource.type}
                </span>
                <p className="text-xs text-[#74819A] mt-0.5">{openedResource.metadata}</p>
              </div>
            </div>
            <h3 className="font-['Manrope'] font-bold text-lg text-[#0E1B38]">
              {openedResource.title}
            </h3>
            <p className="mt-2 text-sm text-[#52617D] leading-relaxed">
              {openedResource.description}
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpenedResource(null)}
                className="px-4 py-2 text-sm font-semibold text-[#52617D] hover:bg-gray-100 rounded-xl"
              >
                Close
              </button>
              <a
                href={openedResource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2 text-sm font-bold bg-[#5B36E9] hover:bg-[#4826C9] text-white rounded-xl shadow-md shadow-[#5B36E9]/20 flex items-center gap-1.5"
              >
                Go to resource ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
