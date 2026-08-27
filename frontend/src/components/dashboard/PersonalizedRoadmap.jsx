import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import apiClient from '../../lib/apiClient'

/**
 * PersonalizedRoadmap
 * Pixel-perfect desktop UI matching the PathFinder reference image.
 *
 * Visual hierarchy:
 * - Left fixed sidebar (255px) with PathFinder compass branding & navigation
 * - Main header: "Your path to an AIML internship" & Goal Card ("AIML Engineer internship - February 2027 - Replan")
 * - 3 top stats cards: 16 weeks, 8 hrs/week, 38% starting readiness
 * - Main left card: "Your learning roadmap" with week tabs, "Build your foundations (Current week - 8 hours)",
 *   3 task rows with circular completion controls, expanded "Why this task?" card, and 6 connected milestone nodes
 * - Right sidebar: "This week's plan" (progress ring + checklist + "Start Week 1"), "Priority gaps" (Statistics 30%, Machine Learning 18%),
 *   "Recommended for you" ("Python Functions: practice guide" + "Open")
 * - Floating AI Coach: violet circular button + "Ask PathFinder" label
 */
export default function PersonalizedRoadmap({ pathData = null }) {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  // Navigation active tab
  const [activeNav, setActiveNav] = useState('roadmap') // 'roadmap' | 'progress' | 'skills' | 'resources' | 'coach'

  // Selected week tab
  const [selectedWeek, setSelectedWeek] = useState('Week 1')

  // Task completion state
  const [completedTasks, setCompletedTasks] = useState({
    task1: false,
    task2: false,
    task3: false,
  })

  // "Why this?" expanded state
  const [expandedWhy, setExpandedWhy] = useState({
    task1: false,
    task2: true, // Default open in reference image
    task3: false,
  })

  // Selected milestone in bottom strip
  const [activeMilestone, setActiveMilestone] = useState(1)

  // Floating AI Chat modal
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    { id: 1, role: 'assistant', text: 'Hi! Ask me anything about your learning path — like why a course is here, or what to study first.' },
    { id: 2, role: 'user', text: 'Explain variance with a simple example.' },
    { id: 3, role: 'assistant', text: 'Variance shows how far values spread from their average. Want a quick practice question?' }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const chatEndRef = useRef(null)

  // Modals for other views (Progress, Skills, Resources)
  const [activeModal, setActiveModal] = useState(null) // 'skills' | 'resources' | 'progress' | null

  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages, isTyping, isChatOpen])

  const toggleTask = (taskId) => {
    setCompletedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  const toggleWhy = (taskId) => {
    setExpandedWhy((prev) => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  const completedCount = Object.values(completedTasks).filter(Boolean).length

  // Handle AI send
  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend || inputMessage).trim()
    if (!text || isTyping) return
    setInputMessage('')
    setChatMessages((prev) => [...prev, { id: Date.now(), role: 'user', text }])
    setIsTyping(true)

    try {
      if (pathData?.id) {
        const res = await apiClient.post('/api/assistant/ask', {
          question: text,
          path_id: pathData.id,
        })
        setChatMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, role: 'assistant', text: res.data.answer },
        ])
      } else {
        setTimeout(() => {
          let answer = "I'm PathFinder AI Coach! I'm here to help you master Python, Statistics, and Machine Learning."
          const lower = text.toLowerCase()
          if (lower.includes('variance')) {
            answer = "Variance measures the average squared deviation of each number from the mean. A low variance means numbers are clustered closely around the average!"
          } else if (lower.includes('plan')) {
            answer = "For Week 1, dedicate 2 hours to Python fundamentals, 3 hours to descriptive statistics, and 3 hours to practical exercises."
          } else if (lower.includes('statistics')) {
            answer = "Statistics gives you the mathematical foundation for understanding distributions, probability, regression, and loss functions in Machine Learning."
          }
          setChatMessages((prev) => [
            ...prev,
            { id: Date.now() + 1, role: 'assistant', text: answer },
          ])
          setIsTyping(false)
        }, 600)
        return
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', text: "Here's a quick tip: Focus on mastering the basics of Python functions and descriptive statistics this week." },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  const handleNavClick = (navId) => {
    setActiveNav(navId)
    if (navId === 'roadmap') {
      setActiveModal(null)
    } else if (navId === 'skills') {
      setActiveModal('skills')
    } else if (navId === 'resources') {
      setActiveModal('resources')
    } else if (navId === 'progress') {
      navigate('/progress')
    } else if (navId === 'coach') {
      setIsChatOpen(true)
    }
  }

  const weekTabs = ['Week 1', 'Week 2', 'Week 3–4', 'Week 5–8', 'Week 9–12', 'Week 13–16']

  const milestoneNodes = [
    { id: 1, label: 'Python foundations', status: 'active', priority: false },
    { id: 2, label: 'Statistics', status: 'upcoming', priority: true, tag: 'High priority' },
    { id: 3, label: 'Pandas & EDA', status: 'upcoming', priority: false },
    { id: 4, label: 'Machine Learning', status: 'upcoming', priority: false },
    { id: 5, label: 'Portfolio project', status: 'upcoming', priority: false },
    { id: 6, label: 'Interview prep', status: 'upcoming', priority: false },
  ]

  return (
    <div className="min-h-screen bg-[#F5F7FC] p-2 sm:p-4 md:p-6 lg:p-8 flex items-center justify-center font-['Inter',sans-serif]">
      {/* =========================================================================
          MAIN APPLICATION SHELL (White card, rounded 18px, border #E1E6F0)
         ========================================================================= */}
      <div className="w-full max-w-[1440px] bg-white rounded-[18px] border border-[#E1E6F0] shadow-[0_12px_36px_rgba(25,40,75,0.06)] flex flex-col md:flex-row overflow-hidden min-h-[880px] relative">
        
        {/* =========================================================================
            FIXED LEFT SIDEBAR (~255px wide)
           ========================================================================= */}
        <aside className="w-full md:w-[255px] flex-none border-b md:border-b-0 md:border-r border-[#E1E6F0] p-6 flex flex-col justify-between bg-white select-none">
          <div>
            {/* Logo: PathFinder Compass */}
            <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={() => handleNavClick('roadmap')}>
              <span className="w-10 h-10 rounded-full border-[2.2px] border-[#5B36E9] text-[#5B36E9] flex items-center justify-center shadow-sm">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="16.2 7.8 10.5 10.5 7.8 16.2 13.5 13.5" fill="#5B36E9" stroke="none" />
                </svg>
              </span>
              <span className="font-['Manrope'] font-extrabold text-[22px] text-[#0E1B38] tracking-tight">
                PathFinder
              </span>
            </div>

            {/* Sidebar Navigation Items */}
            <nav className="space-y-1.5">
              {/* 1. My roadmap */}
              <button
                type="button"
                onClick={() => handleNavClick('roadmap')}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-colors text-left ${
                  activeNav === 'roadmap'
                    ? 'bg-[#F5F1FF] text-[#5B36E9]'
                    : 'text-[#52617D] hover:text-[#0E1B38] hover:bg-gray-50'
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                <span>My roadmap</span>
              </button>

              {/* 2. Progress */}
              <button
                type="button"
                onClick={() => handleNavClick('progress')}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-colors text-left ${
                  activeNav === 'progress'
                    ? 'bg-[#F5F1FF] text-[#5B36E9]'
                    : 'text-[#52617D] hover:text-[#0E1B38] hover:bg-gray-50'
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
                <span>Progress</span>
              </button>

              {/* 3. Skill insights */}
              <button
                type="button"
                onClick={() => handleNavClick('skills')}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-colors text-left ${
                  activeNav === 'skills'
                    ? 'bg-[#F5F1FF] text-[#5B36E9]'
                    : 'text-[#52617D] hover:text-[#0E1B38] hover:bg-gray-50'
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                  <path d="M22 12A10 10 0 0 0 12 2v10z" />
                </svg>
                <span>Skill insights</span>
              </button>

              {/* 4. Resources */}
              <button
                type="button"
                onClick={() => handleNavClick('resources')}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-colors text-left ${
                  activeNav === 'resources'
                    ? 'bg-[#F5F1FF] text-[#5B36E9]'
                    : 'text-[#52617D] hover:text-[#0E1B38] hover:bg-gray-50'
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                  <line x1="8" y1="6" x2="16" y2="6" />
                  <line x1="8" y1="10" x2="16" y2="10" />
                  <line x1="8" y1="14" x2="12" y2="14" />
                </svg>
                <span>Resources</span>
              </button>

              {/* 5. AI coach */}
              <button
                type="button"
                onClick={() => handleNavClick('coach')}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-colors text-left ${
                  activeNav === 'coach'
                    ? 'bg-[#F5F1FF] text-[#5B36E9]'
                    : 'text-[#52617D] hover:text-[#0E1B38] hover:bg-gray-50'
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <line x1="8" y1="10" x2="8.01" y2="10" />
                  <line x1="12" y1="10" x2="12.01" y2="10" />
                  <line x1="16" y1="10" x2="16.01" y2="10" />
                </svg>
                <span>AI coach</span>
              </button>
            </nav>
          </div>

          {/* User Signout */}
          <div className="pt-6 border-t border-[#E1E6F0]">
            <button
              onClick={() => { signOut(); navigate('/') }}
              className="flex items-center gap-2 text-xs font-semibold text-[#74819A] hover:text-[#0E1B38] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        {/* =========================================================================
            MAIN CONTENT AREA (Generous 32–40px padding)
           ========================================================================= */}
        <main className="flex-1 p-6 sm:p-8 lg:p-10 flex flex-col gap-6 bg-white overflow-y-auto">
          
          {/* -----------------------------------------------------------------------
              MAIN HEADER ROW: Title + Subtitle on Left, Goal Card on Right
             ----------------------------------------------------------------------- */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="font-['Manrope'] font-extrabold text-2xl sm:text-[30px] lg:text-[32px] text-[#0E1B38] tracking-tight leading-tight">
                Your path to an AIML internship
              </h1>
              <p className="mt-1 text-sm sm:text-[15px] text-[#52617D]">
                A 16-week plan built from your goal, skills and 8 hours per week.
              </p>
            </div>

            {/* Top-Right Goal Card */}
            <div className="bg-white border border-[#D8DFEB] rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-4 shadow-sm min-w-[280px]">
              <div className="flex items-center gap-3.5">
                <span className="w-11 h-11 rounded-xl bg-[#F5F1FF] text-[#5B36E9] flex items-center justify-center flex-none">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                </span>
                <div>
                  <h2 className="font-['Manrope'] font-bold text-sm text-[#0E1B38] leading-tight">
                    AIML Engineer internship
                  </h2>
                  <p className="text-xs text-[#74819A] mt-0.5 font-medium">
                    February 2027
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/onboarding')}
                className="px-3.5 py-1.5 rounded-xl border border-[#D8DFEB] hover:border-[#5B36E9] hover:bg-[#F5F1FF] text-[#5B36E9] text-xs font-bold flex items-center gap-1.5 transition-colors focus:outline-none"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="21" x2="4" y2="14" />
                  <line x1="4" y1="10" x2="4" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12" y2="3" />
                  <line x1="20" y1="21" x2="20" y2="16" />
                  <line x1="20" y1="12" x2="20" y2="3" />
                  <line x1="1" y1="14" x2="7" y2="14" />
                  <line x1="9" y1="8" x2="15" y2="8" />
                  <line x1="17" y1="16" x2="23" y2="16" />
                </svg>
                <span>Replan</span>
              </button>
            </div>
          </div>

          {/* -----------------------------------------------------------------------
              TOP STATISTICS: 3 Compact Cards
             ----------------------------------------------------------------------- */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Stat 1: 16 weeks */}
            <div className="bg-white border border-[#D8DFEB] rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-sm">
              <span className="w-12 h-12 rounded-xl bg-[#F5F1FF] text-[#5B36E9] flex items-center justify-center flex-none">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
              <div>
                <div className="font-['Manrope'] font-extrabold text-2xl sm:text-[26px] text-[#0E1B38] leading-none">
                  16
                </div>
                <div className="text-xs sm:text-sm font-medium text-[#52617D] mt-1">
                  weeks
                </div>
              </div>
            </div>

            {/* Stat 2: 8 hrs/week */}
            <div className="bg-white border border-[#D8DFEB] rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-sm">
              <span className="w-12 h-12 rounded-xl bg-[#F5F1FF] text-[#5B36E9] flex items-center justify-center flex-none">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              <div>
                <div className="font-['Manrope'] font-extrabold text-2xl sm:text-[26px] text-[#0E1B38] leading-none">
                  8
                </div>
                <div className="text-xs sm:text-sm font-medium text-[#52617D] mt-1">
                  hrs/week
                </div>
              </div>
            </div>

            {/* Stat 3: 38% starting readiness */}
            <div className="bg-white border border-[#D8DFEB] rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-sm">
              <span className="w-12 h-12 rounded-xl bg-[#F5F1FF] text-[#5B36E9] flex items-center justify-center flex-none">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              </span>
              <div>
                <div className="font-['Manrope'] font-extrabold text-2xl sm:text-[26px] text-[#0E1B38] leading-none">
                  38%
                </div>
                <div className="text-xs sm:text-sm font-medium text-[#52617D] mt-1">
                  starting readiness
                </div>
              </div>
            </div>
          </div>

          {/* -----------------------------------------------------------------------
              MAIN TWO-COLUMN WORKSPACE: Roadmap on Left (67%), Widgets on Right (33%)
             ----------------------------------------------------------------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* =====================================================================
                LEFT COLUMN: "Your learning roadmap" card (8 cols)
               ===================================================================== */}
            <div className="lg:col-span-8 bg-white border border-[#D8DFEB] rounded-2xl p-6 sm:p-7 shadow-[0_4px_20px_rgba(25,40,75,0.03)] flex flex-col justify-between">
              <div>
                {/* Title */}
                <h2 className="font-['Manrope'] font-bold text-lg text-[#0E1B38] mb-4">
                  Your learning roadmap
                </h2>

                {/* Week Tabs Row */}
                <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-[#F0F3F8]">
                  {weekTabs.map((tab) => {
                    const isSel = selectedWeek === tab
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setSelectedWeek(tab)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                          isSel
                            ? 'bg-[#5B36E9] text-white shadow-sm'
                            : 'bg-white text-[#52617D] hover:text-[#0E1B38] hover:bg-gray-100/70'
                        }`}
                      >
                        {tab}
                      </button>
                    )
                  })}
                </div>

                {/* Active Week Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-['Manrope'] font-bold text-base text-[#0E1B38]">
                      Build your foundations
                    </h3>
                    <span className="bg-[#F5F1FF] text-[#5B36E9] font-bold text-xs px-2.5 py-0.5 rounded-full">
                      Current week
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[#74819A] font-medium">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>8 hours</span>
                  </div>
                </div>

                {/* Task List */}
                <div className="space-y-3">
                  {/* TASK 1: Refresh Python fundamentals */}
                  <div className="border border-[#D8DFEB] rounded-xl p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:border-[#5B36E9]/40 transition-colors">
                    <div className="flex items-center gap-3.5">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleTask('task1')}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          completedTasks.task1
                            ? 'bg-[#22A06B] border-[#22A06B] text-white'
                            : 'border-[#CAD3E2] hover:border-[#5B36E9]'
                        }`}
                        aria-label="Mark task complete"
                      >
                        {completedTasks.task1 && (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>

                      {/* Icon */}
                      <span className="w-9 h-9 rounded-lg bg-[#F5F1FF] text-[#5B36E9] flex items-center justify-center flex-none">
                        <span className="font-mono text-sm font-bold">🐍</span>
                      </span>

                      {/* Title & Desc */}
                      <div>
                        <h4 className={`font-bold text-sm text-[#0E1B38] ${completedTasks.task1 ? 'line-through opacity-60' : ''}`}>
                          Refresh Python fundamentals
                        </h4>
                        <p className="text-xs text-[#74819A] mt-0.5">
                          Syntax, functions, loops
                        </p>
                      </div>
                    </div>

                    {/* Right Info */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-[#5B36E9] bg-[#F5F1FF] px-2.5 py-1 rounded-lg">
                        2 hrs
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleWhy('task1')}
                        className="text-xs font-semibold text-[#5B36E9] hover:underline whitespace-nowrap"
                      >
                        Why this?
                      </button>
                    </div>
                  </div>

                  {/* Optional expanded Why for Task 1 */}
                  {expandedWhy.task1 && (
                    <div className="bg-[#F5F1FF] border-l-4 border-[#5B36E9] rounded-xl p-4 text-xs text-[#0E1B38] relative animate-in fade-in duration-150">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-[#5B36E9]">Why this task?</span>
                        <button onClick={() => toggleWhy('task1')} className="text-[#5B36E9]">▲</button>
                      </div>
                      Python is the core language required for data wrangling, model training, and scripting in AIML roles.
                    </div>
                  )}

                  {/* TASK 2: Learn descriptive statistics */}
                  <div className="border border-[#D8DFEB] rounded-xl p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:border-[#5B36E9]/40 transition-colors">
                    <div className="flex items-center gap-3.5">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleTask('task2')}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          completedTasks.task2
                            ? 'bg-[#22A06B] border-[#22A06B] text-white'
                            : 'border-[#CAD3E2] hover:border-[#5B36E9]'
                        }`}
                        aria-label="Mark task complete"
                      >
                        {completedTasks.task2 && (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>

                      {/* Icon */}
                      <span className="w-9 h-9 rounded-lg bg-[#F5F1FF] text-[#5B36E9] flex items-center justify-center flex-none">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="20" x2="18" y2="10" />
                          <line x1="12" y1="20" x2="12" y2="4" />
                          <line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                      </span>

                      {/* Title & Desc */}
                      <div>
                        <h4 className={`font-bold text-sm text-[#0E1B38] ${completedTasks.task2 ? 'line-through opacity-60' : ''}`}>
                          Learn descriptive statistics
                        </h4>
                        <p className="text-xs text-[#74819A] mt-0.5">
                          Mean, median, variance
                        </p>
                      </div>
                    </div>

                    {/* Right Info */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-[#5B36E9] bg-[#F5F1FF] px-2.5 py-1 rounded-lg">
                        3 hrs
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleWhy('task2')}
                        className="text-xs font-semibold text-[#5B36E9] hover:underline whitespace-nowrap"
                      >
                        Why this?
                      </button>
                    </div>
                  </div>

                  {/* EXPANDED "Why this task?" CARD FOR STATISTICS (Default open in reference image) */}
                  {expandedWhy.task2 && (
                    <div className="bg-[#F5F1FF] border-l-[3.5px] border-[#5B36E9] rounded-xl p-4 sm:p-5 relative animate-in fade-in duration-150">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-['Manrope'] font-bold text-xs sm:text-sm text-[#5B36E9]">
                          Why this task?
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleWhy('task2')}
                          className="text-[#5B36E9] hover:opacity-75 focus:outline-none"
                          aria-label="Collapse explanation"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="18 15 12 9 6 15" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm text-[#0E1B38] leading-relaxed">
                        Statistics comes first because your current readiness is 30%, and it is required before Machine Learning.
                      </p>
                    </div>
                  )}

                  {/* TASK 3: Complete 2 Python practice tasks */}
                  <div className="border border-[#D8DFEB] rounded-xl p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:border-[#5B36E9]/40 transition-colors">
                    <div className="flex items-center gap-3.5">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleTask('task3')}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          completedTasks.task3
                            ? 'bg-[#22A06B] border-[#22A06B] text-white'
                            : 'border-[#CAD3E2] hover:border-[#5B36E9]'
                        }`}
                        aria-label="Mark task complete"
                      >
                        {completedTasks.task3 && (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>

                      {/* Icon */}
                      <span className="w-9 h-9 rounded-lg bg-[#F5F1FF] text-[#5B36E9] flex items-center justify-center flex-none">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="16 18 22 12 16 6" />
                          <polyline points="8 6 2 12 8 18" />
                        </svg>
                      </span>

                      {/* Title & Desc */}
                      <div>
                        <h4 className={`font-bold text-sm text-[#0E1B38] ${completedTasks.task3 ? 'line-through opacity-60' : ''}`}>
                          Complete 2 Python practice tasks
                        </h4>
                        <p className="text-xs text-[#74819A] mt-0.5">
                          Hands-on exercises
                        </p>
                      </div>
                    </div>

                    {/* Right Info */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-[#5B36E9] bg-[#F5F1FF] px-2.5 py-1 rounded-lg">
                        3 hrs
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleWhy('task3')}
                        className="text-xs font-semibold text-[#5B36E9] hover:underline whitespace-nowrap"
                      >
                        Why this?
                      </button>
                    </div>
                  </div>

                  {/* Optional expanded Why for Task 3 */}
                  {expandedWhy.task3 && (
                    <div className="bg-[#F5F1FF] border-l-4 border-[#5B36E9] rounded-xl p-4 text-xs text-[#0E1B38] relative animate-in fade-in duration-150">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-[#5B36E9]">Why this task?</span>
                        <button onClick={() => toggleWhy('task3')} className="text-[#5B36E9]">▲</button>
                      </div>
                      Reinforcing theory with coding exercises guarantees long-term retention and syntax fluency.
                    </div>
                  )}
                </div>
              </div>

              {/* -------------------------------------------------------------------
                  ROADMAP MILESTONE STRIP (Bottom Nodes with Arrows)
                 ------------------------------------------------------------------- */}
              <div className="mt-8 pt-6 border-t border-[#F0F3F8]">
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {milestoneNodes.map((node, i) => {
                    const isActive = node.id === 1
                    const isPriority = node.id === 2
                    return (
                      <React.Fragment key={node.id}>
                        {i > 0 && (
                          <span className="text-[#CAD3E2] font-bold text-sm flex-none">
                            →
                          </span>
                        )}
                        <div
                          onClick={() => setActiveMilestone(node.id)}
                          className={`flex-none rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-w-[90px] sm:min-w-[105px] border ${
                            isActive
                              ? 'border-[#5B36E9] bg-[#F5F1FF]/30'
                              : isPriority
                              ? 'border-[#5B36E9] bg-white shadow-sm'
                              : 'border-[#D8DFEB] bg-white hover:border-[#CAD3E2]'
                          }`}
                        >
                          {/* Circle badge */}
                          {isActive ? (
                            <span className="w-6 h-6 rounded-full bg-[#5B36E9] text-white font-bold text-xs flex items-center justify-center mb-1 shadow-sm">
                              {node.id}
                            </span>
                          ) : isPriority ? (
                            <span className="w-6 h-6 rounded-full bg-[#3B4860] text-white font-bold text-xs flex items-center justify-center mb-1 relative">
                              <span className="text-[10px] mr-0.5">⭐</span>{node.id}
                            </span>
                          ) : (
                            <span className="w-6 h-6 rounded-full bg-[#3B4860] text-white font-bold text-xs flex items-center justify-center mb-1">
                              {node.id}
                            </span>
                          )}

                          {/* Title */}
                          <span className="text-[11px] sm:text-xs font-bold text-[#0E1B38] leading-tight">
                            {node.label}
                          </span>

                          {/* High priority tag if applicable */}
                          {isPriority && (
                            <span className="text-[10px] font-bold text-[#D88700] mt-0.5">
                              High priority
                            </span>
                          )}
                        </div>
                      </React.Fragment>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* =====================================================================
                RIGHT COLUMN: 3 Stacked Widgets (4 cols)
               ===================================================================== */}
            <div className="lg:col-span-4 space-y-5">
              
              {/* -------------------------------------------------------------------
                  CARD 1: "This week's plan" (Lavender background)
                 ------------------------------------------------------------------- */}
              <div className="bg-[#F5F1FF] border border-[#E7E0FF] rounded-2xl p-5 sm:p-6 shadow-sm">
                <h3 className="font-['Manrope'] font-bold text-base text-[#0E1B38] mb-4">
                  This week’s plan
                </h3>

                <div className="flex items-center gap-4 mb-5">
                  {/* Progress Ring */}
                  <div className="relative w-20 h-20 flex-none">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="20" fill="none" stroke="#E1D7FA" strokeWidth="4.5" />
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        fill="none"
                        stroke="#5B36E9"
                        strokeWidth="4.5"
                        strokeLinecap="round"
                        strokeDasharray="125.6"
                        strokeDashoffset={125.6 * (1 - completedCount / 3)}
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="font-['Manrope'] font-extrabold text-sm text-[#0E1B38] leading-none">
                        {completedCount} of 3
                      </span>
                      <span className="text-[10px] text-[#74819A] font-medium mt-0.5">
                        tasks
                      </span>
                    </div>
                  </div>

                  {/* Checklist items */}
                  <div className="space-y-2 text-xs font-semibold text-[#0E1B38]">
                    <div
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => toggleTask('task1')}
                    >
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${completedTasks.task1 ? 'bg-[#22A06B] border-[#22A06B] text-white' : 'border-[#CAD3E2] bg-white'}`}>
                        {completedTasks.task1 && '✓'}
                      </span>
                      <span className={completedTasks.task1 ? 'line-through text-[#74819A]' : ''}>
                        Refresh Python fundamentals
                      </span>
                    </div>

                    <div
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => toggleTask('task2')}
                    >
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${completedTasks.task2 ? 'bg-[#22A06B] border-[#22A06B] text-white' : 'border-[#CAD3E2] bg-white'}`}>
                        {completedTasks.task2 && '✓'}
                      </span>
                      <span className={completedTasks.task2 ? 'line-through text-[#74819A]' : ''}>
                        Learn descriptive statistics
                      </span>
                    </div>

                    <div
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => toggleTask('task3')}
                    >
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${completedTasks.task3 ? 'bg-[#22A06B] border-[#22A06B] text-white' : 'border-[#CAD3E2] bg-white'}`}>
                        {completedTasks.task3 && '✓'}
                      </span>
                      <span className={completedTasks.task3 ? 'line-through text-[#74819A]' : ''}>
                        Complete 2 Python practice tasks
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary Button */}
                <button
                  type="button"
                  onClick={() => {
                    setCompletedTasks({ task1: true, task2: true, task3: true })
                  }}
                  className="w-full py-3 bg-[#5B36E9] hover:bg-[#4826C9] text-white font-bold text-sm rounded-xl shadow-md shadow-[#5B36E9]/25 transition-all active:scale-[0.99] focus:outline-none"
                >
                  Start Week 1
                </button>
              </div>

              {/* -------------------------------------------------------------------
                  CARD 2: "Priority gaps" (White background)
                 ------------------------------------------------------------------- */}
              <div className="bg-white border border-[#D8DFEB] rounded-2xl p-5 shadow-sm">
                <h3 className="font-['Manrope'] font-bold text-base text-[#0E1B38] mb-3">
                  Priority gaps
                </h3>

                <div className="space-y-3.5">
                  {/* Statistics 30% */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-[#0E1B38]">Statistics</span>
                      <span className="font-bold text-[#0E1B38]">30%</span>
                    </div>
                    <div className="h-2 w-full bg-[#E8EAF4] rounded-full overflow-hidden">
                      <div className="h-full bg-[#5B36E9] rounded-full" style={{ width: '30%' }} />
                    </div>
                  </div>

                  {/* Machine Learning 18% */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-[#0E1B38]">Machine Learning</span>
                      <span className="font-bold text-[#0E1B38]">18%</span>
                    </div>
                    <div className="h-2 w-full bg-[#E8EAF4] rounded-full overflow-hidden">
                      <div className="h-full bg-[#5B36E9] rounded-full" style={{ width: '18%' }} />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveModal('skills')}
                  className="text-xs font-semibold text-[#5B36E9] hover:underline mt-3.5 inline-flex items-center gap-1"
                >
                  <span>View skill insights</span>
                  <span>›</span>
                </button>
              </div>

              {/* -------------------------------------------------------------------
                  CARD 3: "Recommended for you" (White background)
                 ------------------------------------------------------------------- */}
              <div className="bg-white border border-[#D8DFEB] rounded-2xl p-5 shadow-sm">
                <h3 className="font-['Manrope'] font-bold text-base text-[#0E1B38] mb-3">
                  Recommended for you
                </h3>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-full bg-[#F5F1FF] text-[#5B36E9] flex items-center justify-center flex-none">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="6 3 20 12 6 21 6 3" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-[#0E1B38] truncate">
                        Python Functions: practice guide
                      </h4>
                      <p className="text-xs text-[#74819A] mt-0.5 font-medium">
                        Free · 25 min
                      </p>
                    </div>
                  </div>

                  <a
                    href="https://docs.python.org/3/tutorial/controlflow.html#defining-functions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 border border-[#5B36E9] text-[#5B36E9] hover:bg-[#5B36E9] hover:text-white rounded-xl text-xs font-bold transition-colors flex-none"
                  >
                    Open
                  </a>
                </div>
              </div>

            </div>
          </div>
        </main>

        {/* =========================================================================
            FLOATING AI COACH (Lower-Right)
           ========================================================================= */}
        <div className="fixed bottom-6 right-6 z-40 flex items-center select-none">
          <button
            type="button"
            onClick={() => setIsChatOpen((v) => !v)}
            className="flex items-center group focus:outline-none"
            aria-label="Open PathFinder AI Assistant"
          >
            {/* Sparkle Chat Circle */}
            <span className="w-12 h-12 rounded-full bg-[#5B36E9] hover:bg-[#4826C9] text-white flex items-center justify-center shadow-[0_8px_24px_rgba(91,54,233,0.4)] group-hover:scale-105 transition-all z-10">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <polygon points="12 7 13.2 9.8 16 11 13.2 12.2 12 15 10.8 12.2 8 11 10.8 9.8" fill="currentColor" stroke="none" />
              </svg>
            </span>

            {/* Attached White Pill Label */}
            <span className="bg-white border border-[#D8DFEB] text-[#0E1B38] text-xs font-bold pl-5 pr-4 py-2.5 rounded-r-full shadow-md -ml-3 group-hover:text-[#5B36E9] transition-colors">
              Ask PathFinder
            </span>
          </button>
        </div>

        {/* =========================================================================
            INTERACTIVE AI COACH CHAT DRAWER / PANEL
           ========================================================================= */}
        {isChatOpen && (
          <div className="fixed bottom-20 right-6 z-50 w-full max-w-sm bg-white rounded-2xl border border-[#D8DFEB] shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#F5F1FF] border-b border-[#E7E0FF]">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#5B36E9] text-white flex items-center justify-center text-xs">
                  ✨
                </span>
                <h3 className="font-['Manrope'] font-bold text-sm text-[#0E1B38]">
                  PathFinder AI Coach
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="text-[#74819A] hover:text-[#0E1B38] text-sm font-bold w-6 h-6 rounded flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="p-4 flex-1 max-h-[320px] overflow-y-auto space-y-3">
              {chatMessages.map((msg) => {
                const isAssistant = msg.role === 'assistant'
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                        isAssistant
                          ? 'bg-[#F5F1FF] text-[#0E1B38] rounded-tl-sm border border-[#E7E0FF]'
                          : 'bg-[#5B36E9] text-white rounded-tr-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                )
              })}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-[#F5F1FF] px-3.5 py-2 rounded-2xl rounded-tl-sm text-xs text-[#52617D] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B36E9] animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B36E9] animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B36E9] animate-bounce" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Suggestions */}
            <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => handleSendMessage('Explain variance with a simple example.')}
                className="px-2.5 py-1 bg-[#F5F1FF] hover:bg-[#EEE9FF] text-[#5B36E9] text-[11px] font-semibold rounded-lg whitespace-nowrap"
              >
                Explain variance
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('Plan my week 1')}
                className="px-2.5 py-1 bg-[#F5F1FF] hover:bg-[#EEE9FF] text-[#5B36E9] text-[11px] font-semibold rounded-lg whitespace-nowrap"
              >
                Plan Week 1
              </button>
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="p-3 border-t border-[#E1E6F0] flex items-center gap-2 bg-[#FBFCFE]"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask PathFinder anything..."
                className="flex-1 bg-white border border-[#D8DFEB] rounded-xl px-3 py-2 text-xs text-[#0E1B38] placeholder-[#74819A] focus:outline-none focus:border-[#5B36E9]"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isTyping}
                className="w-8 h-8 rounded-xl bg-[#5B36E9] hover:bg-[#4826C9] disabled:opacity-40 text-white flex items-center justify-center flex-none"
              >
                ➔
              </button>
            </form>
          </div>
        )}

        {/* =========================================================================
            SKILL INSIGHTS MODAL (when triggered from sidebar or priority gaps)
           ========================================================================= */}
        {activeModal === 'skills' && (
          <div className="fixed inset-0 z-50 bg-[#0E1B38]/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#D8DFEB] shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-150">
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 text-[#74819A] hover:text-[#0E1B38] text-sm font-bold"
              >
                ✕
              </button>
              <h3 className="font-['Manrope'] font-bold text-lg text-[#0E1B38] mb-4">
                Skill Insights
              </h3>
              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Python</span>
                    <span className="text-[#22A06B] font-bold">72% (Strong)</span>
                  </div>
                  <div className="h-2 w-full bg-[#E8EAF4] rounded-full overflow-hidden">
                    <div className="h-full bg-[#5B36E9]" style={{ width: '72%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Pandas</span>
                    <span className="font-bold">55%</span>
                  </div>
                  <div className="h-2 w-full bg-[#E8EAF4] rounded-full overflow-hidden">
                    <div className="h-full bg-[#5B36E9]" style={{ width: '55%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>SQL</span>
                    <span className="font-bold">35%</span>
                  </div>
                  <div className="h-2 w-full bg-[#E8EAF4] rounded-full overflow-hidden">
                    <div className="h-full bg-[#5B36E9]" style={{ width: '35%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Statistics</span>
                    <span className="text-[#D88700] font-bold">30% (Priority gap)</span>
                  </div>
                  <div className="h-2 w-full bg-[#E8EAF4] rounded-full overflow-hidden">
                    <div className="h-full bg-[#5B36E9]" style={{ width: '30%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Machine Learning</span>
                    <span className="font-bold">18%</span>
                  </div>
                  <div className="h-2 w-full bg-[#E8EAF4] rounded-full overflow-hidden">
                    <div className="h-full bg-[#5B36E9]" style={{ width: '18%' }} />
                  </div>
                </div>
              </div>
              <div className="mt-5 p-3.5 bg-[#F5F1FF] border border-[#E7E0FF] rounded-xl text-xs text-[#0E1B38]">
                <strong>Focus next:</strong> Build Statistics before Machine Learning to accelerate your readiness.
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
