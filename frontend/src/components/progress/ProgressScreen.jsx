import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

/**
 * ProgressScreen Component for PathFinder
 * High-fidelity, production-grade desktop SaaS page matching exact specs.
 *
 * Visual & functional features:
 * - Desktop canvas: 1536 x 1024 px responsive container
 * - Fixed left sidebar (255px) with "Progress" active state & profile section
 * - Main header with goal selector ("AIML Engineer internship - February 2027") & "View roadmap" button
 * - 3 top summary cards: Path completion (28% circular ring), Study consistency (4 day streak), Current milestone (Statistics foundations)
 * - This week's activity card with custom SVG bar chart (7.5 / 8 hrs), dashed goal line, and positive insight
 * - Your 16-week journey with 16 milestone circles and labeled breakdown
 * - Today's progress with 3 task rows (2 completed, 1 active with "Continue")
 * - Right-side insight column: Weekly wins, Next best action, Smart replan
 * - Floating AI Coach ("Ask PathFinder") with interactive assistant drawer
 */
export default function ProgressScreen() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  // Navigation tab state
  const [activeNav, setActiveNav] = useState('progress') // 'roadmap' | 'progress' | 'skills' | 'resources' | 'coach'

  // Goal dropdown state
  const [isGoalDropdownOpen, setIsGoalDropdownOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState({
    title: 'AIML Engineer internship',
    targetDate: 'February 2027',
  })

  // Task completion state
  const [tasks, setTasks] = useState([
    {
      id: 'task-1',
      title: 'Refresh Python fundamentals',
      subtext: 'Syntax, functions, loops',
      completed: true,
      duration: '45 min',
    },
    {
      id: 'task-2',
      title: 'Complete mean and median practice',
      subtext: 'Statistics · 45 min',
      completed: true,
      duration: '45 min',
    },
    {
      id: 'task-3',
      title: 'Learn variance and standard deviation',
      subtext: 'Statistics · 1 hour',
      completed: false,
      duration: '1 hour',
    },
  ])

  // Modals state
  const [activeModal, setActiveModal] = useState(null) // 'skills' | 'resources' | 'replan' | 'task_continue' | null
  const [weeklyHours, setWeeklyHours] = useState(8)
  const [replanTargetDate, setReplanTargetDate] = useState('February 2027')
  const [replanSuccessMessage, setReplanSuccessMessage] = useState('')

  // Floating AI Chat state
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      text: 'Hi Kavindra! I noticed you have completed 7.5 of your 8 planned hours this week. You are just 30 minutes away from your weekly goal! How can I help you accelerate your Statistics milestone today?',
    },
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const chatEndRef = useRef(null)

  // Profile menu dropdown
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)

  // Auto-scroll chat
  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages, isTyping, isChatOpen])

  // Toggle task completion
  const handleToggleTask = (taskId) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    )
  }

  // Handle nav clicks
  const handleNavClick = (navId) => {
    setActiveNav(navId)
    if (navId === 'roadmap') {
      navigate('/dashboard')
    } else if (navId === 'skills') {
      navigate('/skills')
    } else if (navId === 'resources') {
      setActiveModal('resources')
    } else if (navId === 'coach') {
      setIsChatOpen(true)
    }
  }

  // Handle AI Chat send
  const handleSendMessage = (customText = null) => {
    const text = (customText || inputMessage).trim()
    if (!text || isTyping) return
    setInputMessage('')
    setChatMessages((prev) => [...prev, { id: Date.now(), role: 'user', text }])
    setIsTyping(true)

    setTimeout(() => {
      let reply = "I'm tracking your progress toward the AIML Engineer internship! Let's conquer the Statistics module."
      const lower = text.toLowerCase()
      if (lower.includes('variance') || lower.includes('standard deviation')) {
        reply = "Variance is the average of squared differences from the mean (σ² = Σ(x - μ)² / N). Standard deviation (σ) is the square root of variance, returning the spread back to original units. Would you like a 3-question mini quiz?"
      } else if (lower.includes('goal') || lower.includes('8 hours') || lower.includes('reach')) {
        reply = "You currently have 7.5 hours completed! Completing your remaining task 'Learn variance and standard deviation' (1 hr) will put you at 8.5 hours—exceeding your weekly target!"
      } else if (lower.includes('milestone') || lower.includes('statistics')) {
        reply = "Your current milestone is Statistics Foundations (Week 2 of 3). It is due in 4 days. Completing variance and standard deviation unlocks the descriptive statistics checkpoint!"
      } else if (lower.includes('replan') || lower.includes('hours')) {
        reply = "You can adjust your weekly study pace anytime. If you increase to 10 hours/week, your roadmap completes 2 weeks earlier in mid-January 2027!"
      } else if (lower.includes('streak') || lower.includes('consistency')) {
        reply = "Awesome job maintaining a 4-day study streak! Consistent daily study of 1-1.5 hours yields 2.4x better retention than weekend cramming."
      }

      setChatMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', text: reply },
      ])
      setIsTyping(false)
    }, 650)
  }

  // 16-week milestone breakdown
  const journeyMilestones = [
    { span: 'Week 1', title: 'Python refresh', status: 'completed', weeks: [1] },
    { span: 'Week 2–3', title: 'Statistics', status: 'current', weeks: [2, 3] },
    { span: 'Week 4–6', title: 'Pandas & EDA', status: 'upcoming', weeks: [4, 5, 6] },
    { span: 'Week 7–10', title: 'Machine Learning', status: 'upcoming', weeks: [7, 8, 9, 10] },
    { span: 'Week 11–13', title: 'Portfolio project', status: 'upcoming', weeks: [11, 12, 13] },
    { span: 'Week 14–16', title: 'Interview prep', status: 'upcoming', weeks: [14, 15, 16] },
  ]

  // Weekly study data for chart
  const weeklyData = [
    { day: 'Mon', hours: 1.5, completed: true },
    { day: 'Tue', hours: 2.0, completed: true },
    { day: 'Wed', hours: 1.2, completed: true },
    { day: 'Thu', hours: 1.8, completed: true },
    { day: 'Fri', hours: 1.0, completed: true },
    { day: 'Sat', hours: 0.0, completed: false },
    { day: 'Sun', hours: 0.0, completed: false },
  ]
  const totalCompletedHours = 7.5
  const maxDayScale = 2.5 // scale height reference for bar chart (up to 2.5h)

  return (
    <div className="min-h-screen bg-[#F5F7FC] p-2 sm:p-4 md:p-6 lg:p-8 flex items-center justify-center font-['Inter',sans-serif] text-[#0E1B38]">
      {/* =========================================================================
          MAIN APPLICATION CONTAINER (1536 x 1024 px desktop canvas target)
         ========================================================================= */}
      <div className="w-full max-w-[1536px] min-h-[1024px] bg-white rounded-[18px] border border-[#E1E6F0] shadow-[0_12px_32px_rgba(25,40,75,0.10)] flex flex-col md:flex-row overflow-hidden relative">
        
        {/* =========================================================================
            FIXED LEFT NAVIGATION SIDEBAR (~255px wide, thin border #E6EAF2)
           ========================================================================= */}
        <aside className="w-full md:w-[255px] flex-none border-b md:border-b-0 md:border-r border-[#E6EAF2] p-6 flex flex-col justify-between bg-white select-none z-20">
          <div>
            {/* Top Logo: Violet compass icon + Navy wordmark */}
            <div
              className="flex items-center gap-3 mb-8 cursor-pointer group"
              onClick={() => navigate('/dashboard')}
            >
              <span className="w-10 h-10 rounded-xl bg-[#F5F1FF] border border-[#E4DCFD] text-[#5B36E9] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5B36E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="16.2 7.8 10.5 10.5 7.8 16.2 13.5 13.5" fill="#5B36E9" stroke="none" />
                </svg>
              </span>
              <span className="font-['Manrope'] font-extrabold text-[22px] text-[#0E1B38] tracking-tight">
                PathFinder
              </span>
            </div>

            {/* Sidebar Navigation Items */}
            <nav className="space-y-1.5" aria-label="Sidebar Navigation">
              {/* 1. My roadmap */}
              <button
                type="button"
                onClick={() => handleNavClick('roadmap')}
                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-colors text-left text-[#52617D] hover:text-[#0E1B38] hover:bg-[#F8FAFD]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                <span>My roadmap</span>
              </button>

              {/* 2. Progress — Selected (Pale lavender #F5F1FF bg, violet icon & text) */}
              <button
                type="button"
                onClick={() => handleNavClick('progress')}
                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-colors text-left bg-[#F5F1FF] text-[#5B36E9]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5B36E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
                <span className="font-bold">Progress</span>
              </button>

              {/* 3. Skill insights */}
              <button
                type="button"
                onClick={() => handleNavClick('skills')}
                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-colors text-left text-[#52617D] hover:text-[#0E1B38] hover:bg-[#F8FAFD]"
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
                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-colors text-left text-[#52617D] hover:text-[#0E1B38] hover:bg-[#F8FAFD]"
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
                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-colors text-left text-[#52617D] hover:text-[#0E1B38] hover:bg-[#F8FAFD]"
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

          {/* Bottom Profile Section */}
          <div className="pt-6 border-t border-[#E6EAF2] relative">
            <div
              className="flex items-center justify-between p-2 rounded-xl hover:bg-[#F8FAFD] cursor-pointer transition-colors"
              onClick={() => setIsProfileMenuOpen((v) => !v)}
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-[#5B36E9] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  K
                </span>
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-[#0E1B38]">Kavindra</span>
                  <span className="text-[11px] text-[#74819A]">AIML Learner</span>
                </div>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#74819A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>

            {/* Profile Menu Dropdown */}
            {isProfileMenuOpen && (
              <div className="absolute bottom-16 left-0 w-full bg-white rounded-xl border border-[#D8DFEB] shadow-lg p-2 z-30 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false)
                    setActiveModal('replan')
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-[#52617D] hover:text-[#0E1B38] hover:bg-[#F5F1FF] rounded-lg transition-colors"
                >
                  Edit learning pace
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false)
                    signOut?.()
                    navigate('/')
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* =========================================================================
            MAIN CONTENT AREA (42–52 px padding, p-6 sm:p-8 lg:p-11)
           ========================================================================= */}
        <main className="flex-1 p-6 sm:p-8 lg:p-11 flex flex-col gap-8 bg-white overflow-y-auto">
          
          {/* -----------------------------------------------------------------------
              MAIN HEADER: Heading & Subheading (Left) + Goal Selector & Roadmap (Right)
             ----------------------------------------------------------------------- */}
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="font-['Manrope'] font-extrabold text-2xl sm:text-[30px] lg:text-[32px] text-[#0E1B38] tracking-tight leading-tight">
                Your progress
              </h1>
              <p className="mt-1 text-sm sm:text-[15px] text-[#52617D]">
                See how far you’ve come and what to focus on next.
              </p>
            </div>

            {/* Top-Right Action Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Compact White Outlined Goal Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsGoalDropdownOpen((v) => !v)}
                  className="flex items-center gap-2.5 px-3.5 py-2 bg-white border border-[#D8DFEB] hover:border-[#B9C2D4] rounded-xl text-xs font-semibold text-[#0E1B38] shadow-sm transition-all focus:outline-none"
                >
                  <span className="w-6 h-6 rounded-lg bg-[#F5F1FF] text-[#5B36E9] flex items-center justify-center flex-none">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5B36E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                  </span>
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-[#0E1B38] leading-tight">{selectedGoal.title}</span>
                    <span className="text-[11px] text-[#74819A] font-medium leading-tight">{selectedGoal.targetDate}</span>
                  </div>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#74819A"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`ml-1 transition-transform ${isGoalDropdownOpen ? 'rotate-180' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Goal Selector Dropdown */}
                {isGoalDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-[#D8DFEB] shadow-xl p-2 z-30 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 text-[11px] font-bold text-[#74819A] uppercase tracking-wider">
                      Active Target Goal
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#F5F1FF] border border-[#E4DCFD] mb-2">
                      <p className="font-bold text-xs text-[#0E1B38]">AIML Engineer internship</p>
                      <p className="text-[11px] text-[#5B36E9] font-medium mt-0.5">Target: February 2027</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsGoalDropdownOpen(false)
                        setActiveModal('replan')
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-[#5B36E9] hover:bg-[#F5F1FF] rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                      <span>Adjust target deadline</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Small Violet Outlined Button: "View roadmap" */}
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 px-3.5 py-2.5 border border-[#5B36E9] text-[#5B36E9] hover:bg-[#5B36E9] hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.98]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>View roadmap</span>
              </button>
            </div>
          </header>

          {/* -----------------------------------------------------------------------
              TOP PROGRESS SUMMARY (Three horizontal summary cards)
             ----------------------------------------------------------------------- */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-5" aria-label="Progress Summary Cards">
            
            {/* Card 1 — Overall progress: Path completion */}
            <div className="bg-white border border-[#D8DFEB] rounded-2xl p-5 shadow-sm hover:border-[#CAD3E2] transition-colors flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#74819A] uppercase tracking-wider">
                  Path completion
                </span>
                <span className="font-['Manrope'] font-extrabold text-2xl sm:text-[28px] text-[#0E1B38] mt-1 tracking-tight">
                  28%
                </span>
                <span className="text-xs text-[#52617D] mt-0.5 font-medium">
                  4 of 16 weeks completed
                </span>
                <div className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-[#5B36E9] bg-[#F5F1FF] px-2 py-0.5 rounded-full w-fit">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                  <span>+8% this week</span>
                </div>
              </div>

              {/* Large violet circular progress ring */}
              <div className="relative w-18 h-18 sm:w-20 sm:h-20 flex-none flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                  {/* Track Circle */}
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    stroke="#E8ECF4"
                    strokeWidth="7"
                    fill="transparent"
                  />
                  {/* Progress Circle (28% of 2 * PI * 32 ~= 56.3) */}
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    stroke="#5B36E9"
                    strokeWidth="7"
                    strokeDasharray={`${2 * Math.PI * 32}`}
                    strokeDashoffset={`${2 * Math.PI * 32 * (1 - 0.28)}`}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-['Manrope'] font-extrabold text-sm sm:text-base text-[#0E1B38]">
                    28%
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2 — Study consistency: 4 day streak */}
            <div className="bg-white border border-[#D8DFEB] rounded-2xl p-5 shadow-sm hover:border-[#CAD3E2] transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#74819A] uppercase tracking-wider">
                  Study consistency
                </span>
                {/* Small green success chip */}
                <span className="px-2.5 py-0.5 bg-[#ECFDF3] text-[#22A06B] font-bold text-[11px] rounded-full border border-[#D1FADF]">
                  On track
                </span>
              </div>

              <div className="flex items-center gap-3.5 my-2">
                {/* Large flame icon in pale lavender surface */}
                <span className="w-12 h-12 rounded-xl bg-[#FFF7E6] border border-[#FEE4B2] text-[#D88700] flex items-center justify-center flex-none">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 17c1.38 0 2.5-1.12 2.5-2.5 0-.58-.2-1.11-.53-1.53-.45-.57-1.1-1.02-1.97-1.47-.7-.36-1.5-.78-1.5-1.5 0-.55.45-1 1-1 .28 0 .53.11.71.29.18.18.29.43.29.71h2c0-.83-.34-1.58-.88-2.12C11.58 6.34 10.83 6 10 6c-1.66 0-3 1.34-3 3 0 1.3.84 2.4 2 2.82.7.25 1 .55 1 .93 0 .41-.34.75-.75.75-.41 0-.75-.34-.75-.75H6.5c0 1.15.77 2.12 1.81 2.41.06.11.12.23.19.34z" opacity="0.1" />
                    <path d="M12 23c4.97 0 9-4.03 9-9 0-4.5-3.5-7.5-6-10-.5-.5-1.3-.1-1.3.6 0 1.2-.8 2.4-2 2.4-1.5 0-2.5-1.2-2.5-2.7 0-.5-.4-.9-.9-.9C4.5 4.5 3 8.5 3 14c0 4.97 4.03 9 9 9zm0-15.5c1.8 1.4 3 3.5 3 6 0 1.7-.8 3.2-2 4.1-.7.5-1.7.5-2.4 0-1.2-.9-2-2.4-2-4.1 0-2.5 1.2-4.6 3.4-6z" />
                  </svg>
                </span>
                <div>
                  <h3 className="font-['Manrope'] font-extrabold text-2xl sm:text-[28px] text-[#0E1B38] tracking-tight leading-tight">
                    4 day streak
                  </h3>
                  <p className="text-xs text-[#52617D] mt-0.5 font-medium">
                    You studied 7.5 of 8 planned hours
                  </p>
                </div>
              </div>

              {/* Mini progress track */}
              <div className="w-full bg-[#E8ECF4] h-1.5 rounded-full overflow-hidden mt-1">
                <div className="bg-[#22A06B] h-full rounded-full transition-all duration-500" style={{ width: '93.75%' }} />
              </div>
            </div>

            {/* Card 3 — Current milestone: Statistics foundations */}
            <div className="bg-white border border-[#D8DFEB] rounded-2xl p-5 shadow-sm hover:border-[#CAD3E2] transition-colors flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#74819A] uppercase tracking-wider">
                  Current milestone
                </span>
                {/* Amber status chip */}
                <span className="px-2.5 py-0.5 bg-[#FFF7E6] text-[#D88700] font-bold text-[11px] rounded-full border border-[#FEE4B2]">
                  Due in 4 days
                </span>
              </div>

              <div className="flex items-center gap-3.5 my-2">
                {/* Calendar / checklist icon */}
                <span className="w-12 h-12 rounded-xl bg-[#F5F1FF] border border-[#E4DCFD] text-[#5B36E9] flex items-center justify-center flex-none">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5B36E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <polyline points="9 16 11 18 15 14" />
                  </svg>
                </span>
                <div>
                  <h3 className="font-['Manrope'] font-extrabold text-xl sm:text-[22px] text-[#0E1B38] tracking-tight leading-tight">
                    Statistics foundations
                  </h3>
                  <p className="text-xs text-[#52617D] mt-0.5 font-medium">
                    Week 2 of 3
                  </p>
                </div>
              </div>

              {/* Sub status */}
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#74819A] pt-1">
                <span>Phase 2: Descriptive stats</span>
                <span className="text-[#5B36E9]">67% done</span>
              </div>
            </div>

          </section>

          {/* -----------------------------------------------------------------------
              MIDDLE & LOWER CONTENT SECTION (Left 8 cols, Right 4 cols)
             ----------------------------------------------------------------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* =====================================================================
                LEFT / MAIN COLUMN (approx 8 of 12 cols)
               ===================================================================== */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* -------------------------------------------------------------------
                  CARD A: Weekly Activity Section ("This week’s activity")
                 ------------------------------------------------------------------- */}
              <section className="bg-white border border-[#D8DFEB] rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#F0F2F7]">
                  <div>
                    <h2 className="font-['Manrope'] font-bold text-lg text-[#0E1B38]">
                      This week’s activity
                    </h2>
                    <p className="text-xs font-semibold text-[#5B36E9] mt-0.5">
                      7.5 / 8 hours completed
                    </p>
                  </div>

                  {/* Top-Right Legend */}
                  <div className="flex items-center gap-4 text-xs font-medium text-[#52617D]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-[#5B36E9]" />
                      <span>Study time</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 border-t-2 border-dashed border-[#CAD3E2]" />
                      <span>Weekly goal</span>
                    </div>
                  </div>
                </div>

                {/* Compact Weekly Bar Chart */}
                <div className="mt-6 relative">
                  {/* Goal Line indicator at top (representing target threshold) */}
                  <div className="absolute top-2 left-0 right-0 border-t border-dashed border-[#CAD3E2] z-0 flex items-center justify-end">
                    <span className="text-[10px] font-semibold text-[#74819A] bg-white px-1.5 -mt-2">
                      Weekly goal pace (1.1h/day)
                    </span>
                  </div>

                  {/* Bars Container */}
                  <div className="h-44 pt-6 flex items-end justify-between gap-2 sm:gap-4 relative z-10 px-2 sm:px-6">
                    {weeklyData.map((item) => {
                      const heightPercent = item.hours > 0 ? (item.hours / maxDayScale) * 100 : 4
                      return (
                        <div key={item.day} className="flex-1 flex flex-col items-center group relative">
                          {/* Hover Tooltip */}
                          <div className="absolute -top-10 bg-[#0E1B38] text-white text-[11px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap shadow-md z-20">
                            {item.hours > 0 ? `${item.hours} hours` : 'Rest day'}
                          </div>

                          {/* Bar */}
                          <div className="w-full max-w-[42px] bg-[#F5F7FC] rounded-t-lg h-32 flex items-end justify-center p-1">
                            <div
                              className={`w-full rounded-t-md transition-all duration-500 ${
                                item.hours > 0
                                  ? 'bg-[#5B36E9] group-hover:bg-[#4826C9]'
                                  : 'bg-transparent'
                              }`}
                              style={{ height: `${heightPercent}%` }}
                            />
                          </div>

                          {/* X-axis Label */}
                          <span className="mt-2 text-xs font-semibold text-[#52617D] group-hover:text-[#0E1B38]">
                            {item.day}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Positive Insight Box with Green Check Icon */}
                <div className="mt-5 p-3.5 bg-[#ECFDF3] border border-[#D1FADF] rounded-xl flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#22A06B] text-white flex items-center justify-center text-xs font-bold flex-none shadow-sm">
                    ✓
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-[#0E1B38]">
                    You are 30 minutes away from your weekly goal.
                  </p>
                </div>
              </section>

              {/* -------------------------------------------------------------------
                  CARD B: Roadmap Completion Section ("Your 16-week journey")
                 ------------------------------------------------------------------- */}
              <section className="bg-white border border-[#D8DFEB] rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                  <div>
                    <h2 className="font-['Manrope'] font-bold text-lg text-[#0E1B38]">
                      Your 16-week journey
                    </h2>
                    <p className="text-xs font-semibold text-[#5B36E9] mt-0.5">
                      Next milestone: Complete descriptive statistics
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#74819A] bg-[#F5F7FC] px-3 py-1 rounded-full">
                    Week 5 in progress
                  </span>
                </div>

                {/* Horizontal milestone timeline with 16 small circles */}
                <div className="py-2 overflow-x-auto">
                  <div className="min-w-[620px]">
                    {/* Circle Nodes Bar */}
                    <div className="flex items-center justify-between relative mb-6 px-1">
                      {/* Connecting Background Line */}
                      <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-[#E8ECF4] -translate-y-1/2 z-0" />
                      
                      {/* Completed Connected Line (Weeks 1 to 5) */}
                      <div className="absolute top-1/2 left-4 w-[28%] h-0.5 bg-[#5B36E9] -translate-y-1/2 z-0" />

                      {Array.from({ length: 16 }, (_, i) => {
                        const weekNum = i + 1
                        const isCompleted = weekNum <= 4
                        const isCurrent = weekNum === 5

                        return (
                          <div key={weekNum} className="flex flex-col items-center relative z-10">
                            {/* Circle Node */}
                            {isCompleted ? (
                              <div
                                title={`Week ${weekNum}: Completed`}
                                className="w-6 h-6 rounded-full bg-[#5B36E9] text-white flex items-center justify-center text-[10px] font-bold shadow-sm ring-2 ring-white"
                              >
                                ✓
                              </div>
                            ) : isCurrent ? (
                              <div
                                title="Week 5: Current active week"
                                className="w-6 h-6 rounded-full bg-white border-2 border-[#5B36E9] text-[#5B36E9] flex items-center justify-center text-[10px] font-extrabold shadow-md ring-4 ring-[#F5F1FF]"
                              >
                                5
                              </div>
                            ) : (
                              <div
                                title={`Week ${weekNum}: Upcoming`}
                                className="w-6 h-6 rounded-full bg-[#F5F7FC] border border-[#D8DFEB] text-[#74819A] flex items-center justify-center text-[10px] font-semibold ring-2 ring-white"
                              >
                                {weekNum}
                              </div>
                            )}

                            {/* "This week" label on current circle 5 */}
                            {isCurrent && (
                              <span className="absolute -top-6 text-[10px] font-extrabold text-[#5B36E9] bg-[#F5F1FF] px-2 py-0.5 rounded-full border border-[#E4DCFD] whitespace-nowrap shadow-sm">
                                This week
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Visible Milestone Labels Below */}
                    <div className="grid grid-cols-6 gap-2 pt-2 border-t border-[#F0F2F7]">
                      {journeyMilestones.map((milestone) => {
                        const isCurrent = milestone.status === 'current'
                        const isCompleted = milestone.status === 'completed'

                        return (
                          <div
                            key={milestone.span}
                            className={`p-2.5 rounded-xl transition-all ${
                              isCurrent
                                ? 'bg-[#F5F1FF] border border-[#E4DCFD] shadow-sm'
                                : 'bg-[#FAFCFF] border border-[#EBF0F8]'
                            }`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#74819A] block">
                              {milestone.span}
                            </span>
                            <span className={`font-bold text-xs sm:text-[13px] block mt-0.5 leading-tight ${
                              isCurrent ? 'text-[#5B36E9]' : isCompleted ? 'text-[#0E1B38]' : 'text-[#52617D]'
                            }`}>
                              {milestone.title}
                            </span>
                            {isCurrent && (
                              <span className="inline-block mt-1.5 text-[9px] font-extrabold text-[#5B36E9] bg-white px-1.5 py-0.5 rounded border border-[#E4DCFD]">
                                Active now
                              </span>
                            )}
                            {isCompleted && (
                              <span className="inline-block mt-1.5 text-[9px] font-bold text-[#22A06B]">
                                Completed ✓
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </section>

              {/* -------------------------------------------------------------------
                  CARD C: Task Completion Section ("Today’s progress")
                 ------------------------------------------------------------------- */}
              <section className="bg-white border border-[#D8DFEB] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-['Manrope'] font-bold text-lg text-[#0E1B38]">
                    Today’s progress
                  </h2>
                  <span className="text-xs font-semibold text-[#52617D]">
                    {tasks.filter((t) => t.completed).length} of {tasks.length} tasks completed
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Task 1: Filled violet circle with checkmark, "Refresh Python fundamentals" */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E6EAF2] hover:border-[#CAD3E2] transition-colors">
                    <div className="flex items-center gap-3.5">
                      <button
                        type="button"
                        onClick={() => handleToggleTask('task-1')}
                        className="w-5 h-5 rounded-full bg-[#5B36E9] text-white flex items-center justify-center text-xs font-bold flex-none shadow-sm"
                        aria-label="Toggle task 1"
                      >
                        ✓
                      </button>
                      <div>
                        <h3 className="font-bold text-sm text-[#0E1B38] line-through text-[#74819A]">
                          Refresh Python fundamentals
                        </h3>
                        <p className="text-xs text-[#74819A]">
                          Syntax, functions, loops
                        </p>
                      </div>
                    </div>
                    {/* Status Chip: "Completed" */}
                    <span className="px-2.5 py-1 bg-[#ECFDF3] text-[#22A06B] font-bold text-xs rounded-lg border border-[#D1FADF]">
                      Completed
                    </span>
                  </div>

                  {/* Task 2: Filled violet circle with checkmark, "Complete mean and median practice" */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E6EAF2] hover:border-[#CAD3E2] transition-colors">
                    <div className="flex items-center gap-3.5">
                      <button
                        type="button"
                        onClick={() => handleToggleTask('task-2')}
                        className="w-5 h-5 rounded-full bg-[#5B36E9] text-white flex items-center justify-center text-xs font-bold flex-none shadow-sm"
                        aria-label="Toggle task 2"
                      >
                        ✓
                      </button>
                      <div>
                        <h3 className="font-bold text-sm text-[#0E1B38] line-through text-[#74819A]">
                          Complete mean and median practice
                        </h3>
                        <p className="text-xs text-[#74819A]">
                          Statistics · 45 min
                        </p>
                      </div>
                    </div>
                    {/* Status Chip: "Completed" */}
                    <span className="px-2.5 py-1 bg-[#ECFDF3] text-[#22A06B] font-bold text-xs rounded-lg border border-[#D1FADF]">
                      Completed
                    </span>
                  </div>

                  {/* Task 3: Empty outlined circle, "Learn variance and standard deviation", button "Continue" */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-[#D8DFEB] hover:border-[#5B36E9] transition-all shadow-sm">
                    <div className="flex items-center gap-3.5">
                      <button
                        type="button"
                        onClick={() => handleToggleTask('task-3')}
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-none transition-colors ${
                          tasks[2].completed
                            ? 'bg-[#5B36E9] text-white'
                            : 'border-2 border-[#CAD3E2] hover:border-[#5B36E9]'
                        }`}
                        aria-label="Toggle task 3"
                      >
                        {tasks[2].completed && '✓'}
                      </button>
                      <div>
                        <h3 className={`font-bold text-sm ${tasks[2].completed ? 'line-through text-[#74819A]' : 'text-[#0E1B38]'}`}>
                          Learn variance and standard deviation
                        </h3>
                        <p className="text-xs text-[#52617D]">
                          Statistics · 1 hour
                        </p>
                      </div>
                    </div>
                    {/* Violet Outlined Button: "Continue" */}
                    <button
                      type="button"
                      onClick={() => setActiveModal('task_continue')}
                      className="px-4 py-1.5 border border-[#5B36E9] text-[#5B36E9] hover:bg-[#5B36E9] hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              </section>

            </div>

            {/* =====================================================================
                RIGHT-SIDE INSIGHT COLUMN (approx 4 of 12 cols)
               ===================================================================== */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* -------------------------------------------------------------------
                  CARD 1: Weekly wins
                 ------------------------------------------------------------------- */}
              <div className="bg-white border border-[#D8DFEB] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="w-8 h-8 rounded-lg bg-[#F5F1FF] text-[#5B36E9] flex items-center justify-center flex-none">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5B36E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                      <path d="M4 22h16" />
                      <path d="M10 14.66V17c0 .55-.45 1-1 1H7v2h10v-2h-2c-.55 0-1-.45-1-1v-2.34" />
                      <path d="M6 4h12v5a6 6 0 0 1-12 0V4z" />
                    </svg>
                  </span>
                  <h3 className="font-['Manrope'] font-bold text-base text-[#0E1B38]">
                    Weekly wins
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-xs font-semibold text-[#0E1B38] p-2.5 rounded-xl bg-[#F8FAFD] border border-[#F0F2F7]">
                    <span className="text-[#D88700] text-sm">🔥</span>
                    <span>4-day learning streak</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-semibold text-[#0E1B38] p-2.5 rounded-xl bg-[#F8FAFD] border border-[#F0F2F7]">
                    <span className="text-[#22A06B] text-sm">✓</span>
                    <span>2 tasks completed</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-semibold text-[#0E1B38] p-2.5 rounded-xl bg-[#F8FAFD] border border-[#F0F2F7]">
                    <span className="text-[#5B36E9] text-sm">📈</span>
                    <span>Python confidence increased to 78%</span>
                  </div>
                </div>
              </div>

              {/* -------------------------------------------------------------------
                  CARD 2: Next best action (Pale lavender background)
                 ------------------------------------------------------------------- */}
              <div className="bg-[#F5F1FF] border border-[#E4DCFD] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="w-8 h-8 rounded-lg bg-[#EEE9FF] text-[#5B36E9] flex items-center justify-center flex-none">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5B36E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18h6" />
                      <path d="M10 22h4" />
                      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
                    </svg>
                  </span>
                  <h3 className="font-['Manrope'] font-bold text-base text-[#0E1B38]">
                    Your next best action
                  </h3>
                </div>

                <p className="text-xs sm:text-[13px] text-[#52617D] leading-relaxed mb-4">
                  Finish variance and standard deviation to unlock your first Statistics checkpoint.
                </p>

                {/* Primary Violet Button: "Continue learning" */}
                <button
                  type="button"
                  onClick={() => setActiveModal('task_continue')}
                  className="w-full py-3 bg-[#5B36E9] hover:bg-[#4826C9] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-[#5B36E9]/25 transition-all active:scale-[0.99] focus:outline-none"
                >
                  Continue learning
                </button>
              </div>

              {/* -------------------------------------------------------------------
                  CARD 3: Smart replan
                 ------------------------------------------------------------------- */}
              <div className="bg-white border border-[#D8DFEB] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <span className="w-8 h-8 rounded-lg bg-[#F5F1FF] text-[#5B36E9] flex items-center justify-center flex-none">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5B36E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                  </span>
                  <h3 className="font-['Manrope'] font-bold text-base text-[#0E1B38]">
                    Need to adjust your plan?
                  </h3>
                </div>

                <p className="text-xs text-[#52617D] leading-relaxed mb-3.5">
                  Change your study hours or deadline and PathFinder will recalculate your roadmap.
                </p>

                {/* Violet text link: "Replan my path" */}
                <button
                  type="button"
                  onClick={() => setActiveModal('replan')}
                  className="text-xs font-bold text-[#5B36E9] hover:underline inline-flex items-center gap-1"
                >
                  <span>Replan my path</span>
                  <span>→</span>
                </button>
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
            aria-label="Ask PathFinder"
          >
            {/* Sparkle Chat Circle */}
            <span className="w-12 h-12 rounded-full bg-[#5B36E9] hover:bg-[#4826C9] text-white flex items-center justify-center shadow-[0_8px_24px_rgba(91,54,233,0.4)] group-hover:scale-105 transition-all z-10">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <polygon points="12 7 13.2 9.8 16 11 13.2 12.2 12 15 10.8 12.2 8 11 10.8 9.8" fill="currentColor" stroke="none" />
              </svg>
            </span>

            {/* Attached White Pill Label: "Ask PathFinder" */}
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
            <div className="flex items-center justify-between px-4 py-3 bg-[#F5F1FF] border-b border-[#E4DCFD]">
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
                          ? 'bg-[#F5F1FF] text-[#0E1B38] rounded-tl-sm border border-[#E4DCFD]'
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

            {/* Quick Suggestions */}
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
                onClick={() => handleSendMessage('How do I reach 8 hours this week?')}
                className="px-2.5 py-1 bg-[#F5F1FF] hover:bg-[#EEE9FF] text-[#5B36E9] text-[11px] font-semibold rounded-lg whitespace-nowrap"
              >
                Reach 8h goal
              </button>
            </div>

            {/* Input Form */}
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
            REPLAN MODAL ("Need to adjust your plan?")
           ========================================================================= */}
        {activeModal === 'replan' && (
          <div className="fixed inset-0 z-50 bg-[#0E1B38]/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#D8DFEB] shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-150">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null)
                  setReplanSuccessMessage('')
                }}
                className="absolute top-4 right-4 text-[#74819A] hover:text-[#0E1B38] text-sm font-bold w-6 h-6 flex items-center justify-center"
              >
                ✕
              </button>
              
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 rounded-xl bg-[#F5F1FF] text-[#5B36E9] flex items-center justify-center flex-none">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5B36E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                </span>
                <div>
                  <h3 className="font-['Manrope'] font-bold text-lg text-[#0E1B38]">
                    Replan your path
                  </h3>
                  <p className="text-xs text-[#74819A]">
                    Adjust study hours or deadline to recalculate milestones
                  </p>
                </div>
              </div>

              {replanSuccessMessage ? (
                <div className="p-4 bg-[#ECFDF3] border border-[#D1FADF] rounded-xl text-center">
                  <span className="text-2xl mb-1 block">🎉</span>
                  <p className="font-bold text-sm text-[#22A06B]">{replanSuccessMessage}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModal(null)
                      setReplanSuccessMessage('')
                    }}
                    className="mt-4 px-4 py-2 bg-[#5B36E9] text-white text-xs font-bold rounded-xl"
                  >
                    Back to Progress
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    setSelectedGoal((prev) => ({ ...prev, targetDate: replanTargetDate }))
                    setReplanSuccessMessage(`Path recalculated! At ${weeklyHours} hours/week, your roadmap is optimized for ${replanTargetDate}.`)
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-bold text-[#0E1B38] mb-1.5">
                      Weekly Study Hours: <span className="text-[#5B36E9]">{weeklyHours} hrs/week</span>
                    </label>
                    <input
                      type="range"
                      min="4"
                      max="20"
                      value={weeklyHours}
                      onChange={(e) => setWeeklyHours(Number(e.target.value))}
                      className="w-full accent-[#5B36E9]"
                    />
                    <div className="flex justify-between text-[10px] text-[#74819A] mt-1 font-semibold">
                      <span>4 hrs (Relaxed)</span>
                      <span>8 hrs (Recommended)</span>
                      <span>20 hrs (Intensive)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0E1B38] mb-1.5">
                      Target Internship Deadline
                    </label>
                    <select
                      value={replanTargetDate}
                      onChange={(e) => setReplanTargetDate(e.target.value)}
                      className="w-full bg-white border border-[#D8DFEB] rounded-xl px-3 py-2 text-xs font-semibold text-[#0E1B38] focus:outline-none focus:border-[#5B36E9]"
                    >
                      <option value="January 2027">January 2027 (Fast-track)</option>
                      <option value="February 2027">February 2027 (Standard)</option>
                      <option value="May 2027">May 2027 (Summer Cycle)</option>
                    </select>
                  </div>

                  <div className="p-3 bg-[#F5F1FF] rounded-xl text-xs text-[#52617D] leading-relaxed">
                    💡 <strong>Smart AI Recommendation:</strong> Keeping 8 hrs/week preserves your 4-day consistency streak and covers all 16 milestone modules comfortably.
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#5B36E9] hover:bg-[#4826C9] text-white font-bold text-xs rounded-xl shadow-md transition-all"
                  >
                    Recalculate Roadmap
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TASK PRACTICE / CONTINUE MODAL
           ========================================================================= */}
        {activeModal === 'task_continue' && (
          <div className="fixed inset-0 z-50 bg-[#0E1B38]/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#D8DFEB] shadow-2xl max-w-lg w-full p-6 relative animate-in fade-in zoom-in duration-150">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 text-[#74819A] hover:text-[#0E1B38] text-sm font-bold w-6 h-6 flex items-center justify-center"
              >
                ✕
              </button>

              <div className="flex items-center gap-2 text-xs font-bold text-[#5B36E9] bg-[#F5F1FF] px-2.5 py-1 rounded-md w-fit mb-3">
                <span>Statistics · Module 2.3</span>
              </div>

              <h3 className="font-['Manrope'] font-bold text-xl text-[#0E1B38] mb-1">
                Variance and Standard Deviation
              </h3>
              <p className="text-xs text-[#52617D] mb-4">
                Understand dispersion in feature datasets for Machine Learning loss functions.
              </p>

              <div className="space-y-3 bg-[#F8FAFD] p-4 rounded-xl border border-[#E6EAF2] text-xs text-[#0E1B38]">
                <div className="font-bold text-[#5B36E9]">Key Concept:</div>
                <p className="leading-relaxed">
                  <strong>Variance (σ²):</strong> Measures how spread out numbers are from the mean:
                </p>
                <div className="bg-white p-2 rounded-lg font-mono text-[11px] border border-[#D8DFEB] text-center">
                  σ² = Σ (x - μ)² / N
                </div>
                <p className="leading-relaxed">
                  <strong>Standard Deviation (σ):</strong> Square root of variance, providing spread in original dataset units.
                </p>
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    handleToggleTask('task-3')
                    setActiveModal(null)
                  }}
                  className="flex-1 py-2.5 bg-[#5B36E9] hover:bg-[#4826C9] text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  Mark Task Complete & Unlock Checkpoint
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null)
                    setIsChatOpen(true)
                    handleSendMessage('Explain variance with a simple example.')
                  }}
                  className="px-4 py-2.5 border border-[#5B36E9] text-[#5B36E9] hover:bg-[#F5F1FF] font-bold text-xs rounded-xl transition-all"
                >
                  Ask Coach ✨
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SKILL INSIGHTS MODAL
           ========================================================================= */}
        {activeModal === 'skills' && (
          <div className="fixed inset-0 z-50 bg-[#0E1B38]/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#D8DFEB] shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-150">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 text-[#74819A] hover:text-[#0E1B38] text-sm font-bold w-6 h-6 flex items-center justify-center"
              >
                ✕
              </button>
              <h3 className="font-['Manrope'] font-bold text-lg text-[#0E1B38] mb-1">
                Skill Insights
              </h3>
              <p className="text-xs text-[#74819A] mb-4">
                Current mastery toward AIML Engineer internship
              </p>

              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Python</span>
                    <span className="text-[#22A06B] font-bold">78% (Confidence +6%)</span>
                  </div>
                  <div className="h-2 w-full bg-[#E8ECF4] rounded-full overflow-hidden">
                    <div className="h-full bg-[#22A06B]" style={{ width: '78%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Pandas & EDA</span>
                    <span className="font-bold">55%</span>
                  </div>
                  <div className="h-2 w-full bg-[#E8ECF4] rounded-full overflow-hidden">
                    <div className="h-full bg-[#5B36E9]" style={{ width: '55%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>SQL & Databases</span>
                    <span className="font-bold">35%</span>
                  </div>
                  <div className="h-2 w-full bg-[#E8ECF4] rounded-full overflow-hidden">
                    <div className="h-full bg-[#5B36E9]" style={{ width: '35%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Statistics foundations</span>
                    <span className="text-[#D88700] font-bold">45% (In progress)</span>
                  </div>
                  <div className="h-2 w-full bg-[#E8ECF4] rounded-full overflow-hidden">
                    <div className="h-full bg-[#5B36E9]" style={{ width: '45%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Machine Learning Algorithms</span>
                    <span className="font-bold">18%</span>
                  </div>
                  <div className="h-2 w-full bg-[#E8ECF4] rounded-full overflow-hidden">
                    <div className="h-full bg-[#5B36E9]" style={{ width: '18%' }} />
                  </div>
                </div>
              </div>

              <div className="mt-5 p-3.5 bg-[#F5F1FF] border border-[#E4DCFD] rounded-xl text-xs text-[#0E1B38]">
                <strong>Next Priority:</strong> Complete Statistics foundations to prepare for supervised learning loss functions in Week 7.
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            RESOURCES MODAL
           ========================================================================= */}
        {activeModal === 'resources' && (
          <div className="fixed inset-0 z-50 bg-[#0E1B38]/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#D8DFEB] shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-150">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 text-[#74819A] hover:text-[#0E1B38] text-sm font-bold w-6 h-6 flex items-center justify-center"
              >
                ✕
              </button>
              <h3 className="font-['Manrope'] font-bold text-lg text-[#0E1B38] mb-1">
                Learning Resources
              </h3>
              <p className="text-xs text-[#74819A] mb-4">
                Curated references for your current Statistics module
              </p>

              <div className="space-y-3">
                <a
                  href="https://docs.python.org/3/tutorial/controlflow.html#defining-functions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl border border-[#D8DFEB] hover:border-[#5B36E9] flex items-center justify-between group transition-colors block"
                >
                  <div>
                    <h4 className="font-bold text-xs text-[#0E1B38] group-hover:text-[#5B36E9]">
                      Python Functions & Vectorization
                    </h4>
                    <p className="text-[11px] text-[#74819A]">Official Documentation · Free</p>
                  </div>
                  <span className="text-[#5B36E9] font-bold text-xs">Open ↗</span>
                </a>

                <a
                  href="https://scikit-learn.org/stable/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl border border-[#D8DFEB] hover:border-[#5B36E9] flex items-center justify-between group transition-colors block"
                >
                  <div>
                    <h4 className="font-bold text-xs text-[#0E1B38] group-hover:text-[#5B36E9]">
                      Descriptive Statistics in NumPy & Scipy
                    </h4>
                    <p className="text-[11px] text-[#74819A]">Interactive Guide · 30 min</p>
                  </div>
                  <span className="text-[#5B36E9] font-bold text-xs">Open ↗</span>
                </a>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
