import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAIChat } from '../../contexts/AIChatContext'
import UserProfileDropdown from '../ui/UserProfileDropdown'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import {
  Search,
  Bell,
  ChevronDown,
  Lightbulb,
  Target,
  Sparkles,
  Brain,
  TrendingUp,
  Trophy,
  Flame,
  BookOpen,
  GraduationCap,
  Database,
  Code,
  BarChart3,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  ArrowRight,
  Info,
  Clock,
  SlidersHorizontal,
  RefreshCw,
  User,
  Settings,
  Shield,
  Briefcase,
  Layers,
  ChevronRight,
  Hourglass,
  HelpCircle,
  Compass,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

/**
 * SkillInsightsScreen Component for PathFinder
 * Pixel-perfect desktop implementation matching the provided reference design.
 *
 * Visual & Functional Architecture:
 * - Top Global Bar: Search input, Notifications with badge, Profile dropdown
 * - Left Fixed Sidebar (255px): Brand, Main Navigation with "Skill Insights" active, Account items, and Promo Card
 * - Main Header: Lightbulb icon, "Skill Insights", Subtitle, Goal selector ("Goal: AIML Engineer Internship"), Last updated timestamp
 * - Top KPI Summary (4 Cards): Overall Skill Readiness (78%), Skills Mastered (3/8), Skills In Progress (4), Skills to Learn (1)
 * - Main Analytics Grid Row 1:
 *     1. Skill Proficiency Comparison (BarChart with dual bars + target outlines + custom labels)
 *     2. Skill Radar (RadarChart with 7 dimensions)
 *     3. Top Skill Gaps (Actionable priority list with High/Medium chips)
 * - Main Analytics Grid Row 2:
 *     1. Learning Trend (AreaChart over 8 weeks + success insight badge)
 *     2. Skill Category Breakdown (Donut chart with center 78% callout)
 *     3. Recommended Focus (Priority banner + 3 actionable next steps)
 * - Deep Analytics & AI Insights Section (Toggleable/Expandable):
 *     1. Skill-Gap Heatmap Matrix
 *     2. Learning Velocity (2.4 skills/wk sparkline)
 *     3. Time Spent by Category (24.5 hrs donut)
 *     4. Top Strengths List
 *     5. AI-Powered PathFinder Explanation ("Ask PathFinder why →")
 * - Interactive Modals: Skill drill-down, Goal selector, AI Coach drawer
 */
export default function SkillInsightsScreen() {
  const navigate = useNavigate()
  const { open: openAICoach } = useAIChat()
  const { user, signOut } = useAuth()

  // State Management
  const [activeNav, setActiveNav] = useState('skills')
  const [selectedGoal, setSelectedGoal] = useState('Goal: AIML Engineer Internship')
  const [isGoalDropdownOpen, setIsGoalDropdownOpen] = useState(false)
  const [trendTimeframe, setTrendTimeframe] = useState('Last 8 Weeks')
  const [isTrendDropdownOpen, setIsTrendDropdownOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [selectedSkillModal, setSelectedSkillModal] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'deep_analytics' | 'heatmap'

  // Tooltip hover states for info icons
  const [activeTooltip, setActiveTooltip] = useState(null)

  // Floating AI Coach State
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      text: 'Hi Kavindra! I’ve analyzed your skill profile for the AIML Engineer Internship (Target: Feb 2027). Your Python foundations (85%) and Pandas (70%) are strong, but Statistics (55%) and Machine Learning (45%) are your critical gaps. What would you like to explore first?',
    },
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages, isTyping, isChatOpen])

  const handleNavClick = (navId) => {
    setActiveNav(navId)
    if (navId === 'roadmap') {
      navigate('/dashboard')
    } else if (navId === 'progress') {
      navigate('/progress')
    } else if (navId === 'resources') {
      navigate('/resources')
    } else if (navId === 'coach') {
      openAICoach()
    }
  }

  const handleSendMessage = (customText = null) => {
    const text = (customText || inputMessage).trim()
    if (!text || isTyping) return
    setInputMessage('')
    setChatMessages((prev) => [...prev, { id: Date.now(), role: 'user', text }])
    setIsTyping(true)

    setTimeout(() => {
      let reply = 'Here is what PathFinder recommends based on your skill analytics:'
      const lower = text.toLowerCase()
      if (lower.includes('why') || lower.includes('statistics') || lower.includes('prerequisite')) {
        reply =
          'Statistics foundations (55% current → 80% target) is prioritized before Machine Learning because loss functions, gradient descent optimization, probability distributions, and evaluation metrics (ROC-AUC, Precision-Recall) directly require descriptive and inferential statistics.'
      } else if (lower.includes('velocity') || lower.includes('speed') || lower.includes('rate')) {
        reply =
          'Your current learning velocity is 2.4 skills/week (+15% vs prior 2 weeks). At this velocity, you are projected to reach 85% readiness by early January 2027—well ahead of your February 2027 deadline!'
      } else if (lower.includes('gap') || lower.includes('weak')) {
        reply =
          'Your top skill gaps are: 1. Machine Learning (45% vs 85% target), 2. Statistics (55% vs 80% target), 3. Deep Learning (35% vs 75% target), and 4. Interview Preparation (50% vs 80% target).'
      } else if (lower.includes('strength') || lower.includes('python')) {
        reply =
          'Your strongest technical skills are Python Foundations (85%), Pandas & EDA (70%), and SQL (65%). You can leverage these to accelerate your practical ML modeling tasks!'
      }

      setChatMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', text: reply },
      ])
      setIsTyping(false)
    }, 650)
  }

  // ---------------------------------------------------------------------------
  // DATASETS FOR RECHARTS & CUSTOM VISUALS
  // ---------------------------------------------------------------------------

  // 1. Skill Proficiency Comparison Data (Grouped Bar Chart)
  const proficiencyData = [
    { skill: 'Python', current: 85, target: 85, gap: 0, status: 'Mastered' },
    { skill: 'Statistics', current: 55, target: 80, gap: 25, status: 'High Priority' },
    { skill: 'Pandas\n& EDA', name: 'Pandas & EDA', current: 70, target: 80, gap: 10, status: 'Developing' },
    { skill: 'Machine\nLearning', name: 'Machine Learning', current: 45, target: 85, gap: 40, status: 'High Priority' },
    { skill: 'Deep\nLearning', name: 'Deep Learning', current: 35, target: 75, gap: 40, status: 'Medium' },
    { skill: 'SQL', current: 65, target: 75, gap: 10, status: 'Developing' },
    { skill: 'Portfolio', current: 60, target: 75, gap: 15, status: 'Developing' },
    { skill: 'Interview\nPrep', name: 'Interview Prep', current: 50, target: 80, gap: 30, status: 'Medium' },
  ]

  // 2. Radar Chart Data
  const radarData = [
    { skill: 'Python', current: 85, target: 85 },
    { skill: 'Statistics', current: 55, target: 80 },
    { skill: 'Pandas & EDA', current: 70, target: 80 },
    { skill: 'Machine Learning', current: 45, target: 85 },
    { skill: 'Deep Learning', current: 35, target: 75 },
    { skill: 'SQL', current: 65, target: 75 },
    { skill: 'Communication', current: 60, target: 70 },
  ]

  // 3. Learning Trend Data (8 Weeks)
  const trendData = [
    { week: 'W1', readiness: 25 },
    { week: 'W2', readiness: 32 },
    { week: 'W3', readiness: 42 },
    { week: 'W4', readiness: 48 },
    { week: 'W5', readiness: 53 },
    { week: 'W6', readiness: 61 },
    { week: 'W7', readiness: 70 },
    { week: 'W8', readiness: 78 },
  ]

  // 4. Skill Category Breakdown (Donut Chart)
  const categoryData = [
    { name: 'Programming', value: 28, color: '#5B36E9' },
    { name: 'Data Analysis', value: 22, color: '#5B8DEF' },
    { name: 'Machine Learning', value: 18, color: '#18A999' },
    { name: 'Deep Learning', value: 12, color: '#E96A91' },
    { name: 'Tools & Databases', value: 10, color: '#F2A33A' },
    { name: 'Soft Skills', value: 10, color: '#7C61F5' },
  ]

  // 5. Time Spent By Category (Donut Chart)
  const timeSpentData = [
    { name: 'Programming', value: 40, hours: '9.8h', color: '#5B36E9' },
    { name: 'Data Analysis', value: 25, hours: '6.1h', color: '#5B8DEF' },
    { name: 'Machine Learning', value: 20, hours: '4.9h', color: '#18A999' },
    { name: 'Tools & Others', value: 15, hours: '3.7h', color: '#F2A33A' },
  ]

  // 6. Top Strengths Data
  const strengthsList = [
    { rank: 1, name: 'Python Foundations', score: 75 },
    { rank: 2, name: 'SQL Basics', score: 70 },
    { rank: 3, name: 'Data Wrangling', score: 65 },
    { rank: 4, name: 'Problem Solving', score: 60 },
    { rank: 5, name: 'Git & GitHub', score: 58 },
  ]

  // 7. Heatmap Matrix Data
  const heatmapData = [
    { level: 'Foundations', python: 92, stats: 68, ml: 58, pandas: 88, sql: 78 },
    { level: 'Intermediate', python: 80, stats: 48, ml: 40, pandas: 62, sql: 56 },
    { level: 'Advanced', python: 60, stats: 28, ml: 22, pandas: 40, sql: 32 },
  ]

  const getHeatmapColor = (val) => {
    if (val >= 75) return 'bg-[#ECFDF3] text-[#22A06B] border-[#D1FADF]' // Strong green
    if (val >= 50) return 'bg-[#FFF7E6] text-[#D88700] border-[#FEE4B2]' // Developing amber
    return 'bg-[#FFF0F0] text-[#E5484D] border-[#FECDCA]' // Gap red
  }

  // Custom Bar with Target Outline
  const CustomBarWithTarget = (props) => {
    const { x, y, width, height, value, index } = props
    const targetVal = proficiencyData[index]?.target || 80
    const chartHeight = 180 // Reference height inside chart
    const targetHeight = (targetVal / 100) * 180
    const targetY = 190 - targetHeight

    return (
      <g>
        {/* Dashed Target Box Outline */}
        <rect
          x={x - 2}
          y={targetY}
          width={width + 4}
          height={targetHeight}
          fill="transparent"
          stroke="#CAD3E2"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          rx="6"
        />
        {/* Current Solid Violet Bar */}
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="#5B36E9"
          rx="6"
          className="transition-all duration-300 hover:fill-[#4826C9] cursor-pointer"
        />
        {/* Percentage Label Above Bar */}
        <text
          x={x + width / 2}
          y={y - 8}
          fill="#0E1B38"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
        >
          {value}%
        </text>
      </g>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F7FC] p-2 sm:p-4 md:p-6 lg:p-7 flex items-center justify-center font-['Inter',sans-serif] text-[#0E1B38]">
      {/* =========================================================================
          MAIN APPLICATION CONTAINER (Desktop canvas 1536 x 1024 px styled)
         ========================================================================= */}
      <div className="w-full max-w-[1536px] min-h-[1024px] bg-white rounded-[18px] border border-[#E1E6F0] shadow-[0_8px_30px_rgba(20,30,60,0.06)] flex flex-col md:flex-row overflow-hidden relative">

        {/* =========================================================================
            FIXED LEFT SIDEBAR (~255px wide, thin border #E6EAF2)
           ========================================================================= */}
        <aside className="w-full md:w-[255px] flex-none border-b md:border-b-0 md:border-r border-[#E6EAF2] p-5 lg:p-6 flex flex-col justify-between bg-white select-none z-20">
          <div>
            {/* Top Logo: Violet compass icon + Navy wordmark */}
            <div
              className="flex items-center gap-3 mb-7 cursor-pointer group"
              onClick={() => navigate('/dashboard')}
            >
              <span className="w-10 h-10 rounded-xl bg-[#5B36E9] text-white flex items-center justify-center shadow-md shadow-[#5B36E9]/20 group-hover:scale-105 transition-transform">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="16.2 7.8 10.5 10.5 7.8 16.2 13.5 13.5" fill="white" stroke="none" />
                </svg>
              </span>
              <span className="font-['Manrope'] font-extrabold text-[22px] text-[#0E1B38] tracking-tight">
                PathFinder
              </span>
            </div>

            {/* Sidebar Navigation Items */}
            <nav className="space-y-1.5" aria-label="Main Navigation">
              {/* 1. My Roadmap */}
              <button
                type="button"
                onClick={() => handleNavClick('roadmap')}
                className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left text-[#52617D] hover:text-[#0E1B38] hover:bg-[#F8FAFD]"
              >
                <Compass className="w-5 h-5 text-[#74819A]" strokeWidth={2} />
                <span>My Roadmap</span>
              </button>

              {/* 2. Progress */}
              <button
                type="button"
                onClick={() => handleNavClick('progress')}
                className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left text-[#52617D] hover:text-[#0E1B38] hover:bg-[#F8FAFD]"
              >
                <BarChart3 className="w-5 h-5 text-[#74819A]" strokeWidth={2} />
                <span>Progress</span>
              </button>

              {/* 3. Skill Insights (Selected State) */}
              <button
                type="button"
                onClick={() => handleNavClick('skills')}
                className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors text-left bg-[#F5F1FF] text-[#5B36E9]"
              >
                <Sparkles className="w-5 h-5 text-[#5B36E9]" strokeWidth={2} />
                <span>Skill Insights</span>
              </button>

              {/* 4. Resources */}
              <button
                type="button"
                onClick={() => handleNavClick('resources')}
                className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left text-[#52617D] hover:text-[#0E1B38] hover:bg-[#F8FAFD]"
              >
                <BookOpen className="w-5 h-5 text-[#74819A]" strokeWidth={2} />
                <span>Resources</span>
              </button>

              {/* 5. AI Coach */}
              <button
                type="button"
                onClick={() => handleNavClick('coach')}
                className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left text-[#52617D] hover:text-[#0E1B38] hover:bg-[#F8FAFD]"
              >
                <Brain className="w-5 h-5 text-[#74819A]" strokeWidth={2} />
                <span>AI Coach</span>
              </button>
            </nav>

            {/* Account Section Divider & Navigation */}
            <div className="mt-6 pt-5 border-t border-[#E6EAF2]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#98A3B7] px-4 block mb-2">
                Account
              </span>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen(true)}
                  className="w-full flex items-center gap-3.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#52617D] hover:text-[#0E1B38] hover:bg-[#F8FAFD]"
                >
                  <User className="w-4 h-4 text-[#74819A]" strokeWidth={2} />
                  <span>Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen(true)}
                  className="w-full flex items-center gap-3.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#52617D] hover:text-[#0E1B38] hover:bg-[#F8FAFD]"
                >
                  <Settings className="w-4 h-4 text-[#74819A]" strokeWidth={2} />
                  <span>Settings</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Sidebar Promo Card ("Upgrade your skills. Build your future.") */}
          <div className="mt-6 p-4 rounded-2xl bg-[#F5F1FF] border border-[#E4DCFD] relative overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-[#EEE9FF] text-[#5B36E9] flex items-center justify-center mb-2.5 shadow-sm">
              <Sparkles className="w-4 h-4" strokeWidth={2.2} />
            </div>
            <h4 className="font-['Manrope'] font-bold text-xs sm:text-[13px] text-[#0E1B38] leading-tight">
              Upgrade your skills. Build your future.
            </h4>
            <p className="text-[11px] text-[#52617D] mt-1 leading-snug">
              Stay consistent and achieve your AIML dream.
            </p>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="mt-3.5 w-full py-2 bg-[#5B36E9] hover:bg-[#4826C9] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
            >
              <span>Keep Learning</span>
              <span>→</span>
            </button>
          </div>
        </aside>

        {/* =========================================================================
            MAIN CONTENT AREA (Top Bar + Headers + KPI Summary + Analytics Grid)
           ========================================================================= */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          
          {/* -----------------------------------------------------------------------
              TOP GLOBAL HEADER (Search Bar, Notification Bell, User Avatar)
             ----------------------------------------------------------------------- */}
          <header className="px-6 lg:px-9 py-3.5 border-b border-[#E6EAF2] flex items-center justify-between gap-4 select-none">
            {/* Global Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#74819A] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses, skills, resources..."
                className="w-full pl-9 pr-4 py-2 bg-[#F5F7FC] border border-[#E6EAF2] rounded-full text-xs text-[#0E1B38] placeholder-[#74819A] focus:outline-none focus:border-[#5B36E9] focus:bg-white transition-colors"
              />
            </div>

            {/* Right Controls: Notifications & Profile */}
            <div className="flex items-center gap-4">
              {/* Notification Bell with Badge */}


              {/* User Profile Dropdown */}
              <UserProfileDropdown />
            </div>
          </header>

          {/* -----------------------------------------------------------------------
              MAIN SCROLLABLE WORKSPACE
             ----------------------------------------------------------------------- */}
          <main className="flex-1 p-6 lg:p-8 overflow-y-auto space-y-6">
            
            {/* ---------------------------------------------------------------------
                PAGE TITLE ROW: Icon + Heading/Subtitle (Left) + Goal Selector & Timestamp (Right)
               --------------------------------------------------------------------- */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                {/* Purple Icon Badge */}
                <div className="w-11 h-11 rounded-2xl bg-[#F5F1FF] border border-[#E4DCFD] text-[#5B36E9] flex items-center justify-center flex-none shadow-sm mt-0.5">
                  <Lightbulb className="w-6 h-6" strokeWidth={2.2} />
                </div>
                <div>
                  <h1 className="font-['Manrope'] font-extrabold text-2xl sm:text-[30px] lg:text-[32px] text-[#0E1B38] tracking-tight leading-tight">
                    Skill Insights
                  </h1>
                  <p className="mt-0.5 text-xs sm:text-[14px] text-[#52617D]">
                    Understand your strengths, find gaps and focus on what to learn next.
                  </p>
                </div>
              </div>

              {/* Right Side: Goal Selector & Last Updated */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 lg:self-center">
                {/* White Rounded Dropdown: Goal Selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsGoalDropdownOpen((v) => !v)}
                    className="flex items-center gap-2 px-3.5 py-2 bg-white border border-[#D8DFEB] hover:border-[#B9C2D4] rounded-xl text-xs font-bold text-[#0E1B38] shadow-sm transition-all"
                  >
                    <Target className="w-4 h-4 text-[#5B36E9]" strokeWidth={2.2} />
                    <span>{selectedGoal}</span>
                    <ChevronDown className={`w-4 h-4 text-[#74819A] transition-transform ${isGoalDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isGoalDropdownOpen && (
                    <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl border border-[#D8DFEB] shadow-xl p-2 z-30 animate-in fade-in duration-100">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGoal('Goal: AIML Engineer Internship')
                          setIsGoalDropdownOpen(false)
                        }}
                        className="w-full text-left p-2 rounded-lg bg-[#F5F1FF] text-[#5B36E9] font-bold text-xs mb-1"
                      >
                        Goal: AIML Engineer Internship
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGoal('Goal: Data Scientist')
                          setIsGoalDropdownOpen(false)
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-gray-50 text-[#0E1B38] font-semibold text-xs"
                      >
                        Goal: Data Scientist
                      </button>
                    </div>
                  )}
                </div>

                {/* Last Updated Timestamp */}
                <span className="text-xs font-medium text-[#74819A] self-center sm:self-auto">
                  Last updated: 28 Aug 2026
                </span>
              </div>
            </div>

            {/* ---------------------------------------------------------------------
                TOP KPI SUMMARY (4 Equal-Height Polished Cards)
               --------------------------------------------------------------------- */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="KPI Cards">
              
              {/* KPI 1: Overall Skill Readiness */}
              <div className="bg-white border border-[#D8DFEB] rounded-2xl p-4 sm:p-5 shadow-sm hover:border-[#CAD3E2] transition-colors flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#F5F1FF] text-[#5B36E9] flex items-center justify-center flex-none">
                      <BarChart3 className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-bold text-[#52617D]">Overall Skill Readiness</span>
                  </div>
                  <Info
                    className="w-3.5 h-3.5 text-[#98A3B7] cursor-pointer hover:text-[#5B36E9]"
                    title="Calculated from assessments, completed learning activities, practice performance, and skill progress."
                  />
                </div>

                <div className="flex items-baseline gap-3 my-2.5">
                  <span className="font-['Manrope'] font-extrabold text-2xl sm:text-[28px] text-[#0E1B38] tracking-tight leading-none">
                    78%
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#22A06B] bg-[#ECFDF3] px-2 py-0.5 rounded-full border border-[#D1FADF]">
                    <TrendingUp className="w-3 h-3" />
                    <span>+12% vs last assessment</span>
                  </span>
                </div>

                <div className="w-full bg-[#E8ECF4] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#5B36E9] h-full rounded-full transition-all duration-500" style={{ width: '78%' }} />
                </div>
              </div>

              {/* KPI 2: Skills Mastered */}
              <div className="bg-white border border-[#D8DFEB] rounded-2xl p-4 sm:p-5 shadow-sm hover:border-[#CAD3E2] transition-colors flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#ECFDF3] text-[#22A06B] flex items-center justify-center flex-none">
                      <CheckCircle className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-bold text-[#52617D]">Skills Mastered</span>
                  </div>
                  <span className="text-[11px] font-bold text-[#74819A]">43%</span>
                </div>

                <div className="my-2.5">
                  <span className="font-['Manrope'] font-extrabold text-2xl sm:text-[28px] text-[#0E1B38] tracking-tight leading-none">
                    3 / 8
                  </span>
                </div>

                <div className="w-full bg-[#E8ECF4] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#22A06B] h-full rounded-full transition-all duration-500" style={{ width: '37.5%' }} />
                </div>
              </div>

              {/* KPI 3: Skills In Progress */}
              <div className="bg-white border border-[#D8DFEB] rounded-2xl p-4 sm:p-5 shadow-sm hover:border-[#CAD3E2] transition-colors flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#FFF7E6] text-[#D88700] flex items-center justify-center flex-none">
                      <Hourglass className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-bold text-[#52617D]">Skills In Progress</span>
                  </div>
                  <span className="text-[11px] font-bold text-[#D88700]">Keep going!</span>
                </div>

                <div className="my-2.5">
                  <span className="font-['Manrope'] font-extrabold text-2xl sm:text-[28px] text-[#0E1B38] tracking-tight leading-none">
                    4
                  </span>
                </div>

                <div className="w-full bg-[#E8ECF4] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#D88700] h-full rounded-full transition-all duration-500" style={{ width: '50%' }} />
                </div>
              </div>

              {/* KPI 4: Skills to Learn */}
              <div className="bg-white border border-[#D8DFEB] rounded-2xl p-4 sm:p-5 shadow-sm hover:border-[#CAD3E2] transition-colors flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#F5F1FF] text-[#5B8DEF] flex items-center justify-center flex-none">
                      <BookOpen className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-bold text-[#52617D]">Skills to Learn</span>
                  </div>
                  <span className="text-[11px] font-bold text-[#5B8DEF]">Focus recommended</span>
                </div>

                <div className="my-2.5">
                  <span className="font-['Manrope'] font-extrabold text-2xl sm:text-[28px] text-[#0E1B38] tracking-tight leading-none">
                    1
                  </span>
                </div>

                <div className="w-full bg-[#E8ECF4] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#5B8DEF] h-full rounded-full transition-all duration-500" style={{ width: '15%' }} />
                </div>
              </div>

            </section>

            {/* ---------------------------------------------------------------------
                MAIN ANALYTICS GRID - ROW 1:
                1. Skill Proficiency Comparison (Large)
                2. Skill Radar (Medium)
                3. Top Skill Gaps (Right)
               --------------------------------------------------------------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* CARD 1: Skill Proficiency Comparison (5.5 of 12 cols or 6 cols) */}
              <div className="lg:col-span-6 bg-white border border-[#D8DFEB] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#F0F2F7]">
                    <div className="flex items-center gap-2">
                      <h2 className="font-['Manrope'] font-bold text-base text-[#0E1B38]">
                        Skill Proficiency Comparison
                      </h2>
                      <Info
                        className="w-3.5 h-3.5 text-[#98A3B7] cursor-pointer hover:text-[#5B36E9]"
                        title="Current level compared with the proficiency recommended for your target AIML Engineer internship."
                      />
                    </div>

                    {/* Chart Legend */}
                    <div className="flex items-center gap-4 text-xs font-medium text-[#52617D]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#5B36E9]" />
                        <span>Your Level</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 border-t-2 border-dashed border-[#CAD3E2]" />
                        <span>Target Level (Internship)</span>
                      </div>
                    </div>
                  </div>

                  {/* Grouped Bar Chart with Target Outline */}
                  <div className="h-64 w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={proficiencyData}
                        margin={{ top: 20, right: 10, left: -20, bottom: 20 }}
                        barSize={24}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F2F7" />
                        <XAxis
                          dataKey="skill"
                          tick={{ fill: '#52617D', fontSize: 11, fontWeight: 600 }}
                          axisLine={{ stroke: '#E6EAF2' }}
                          tickLine={false}
                          interval={0}
                        />
                        <YAxis
                          domain={[0, 100]}
                          ticks={[0, 20, 40, 60, 80, 100]}
                          tickFormatter={(val) => `${val}%`}
                          tick={{ fill: '#74819A', fontSize: 10, fontWeight: 600 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RechartsTooltip
                          cursor={{ fill: 'rgba(91,54,233,0.04)' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload
                              return (
                                <div className="bg-[#0E1B38] text-white p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                                  <div className="font-bold border-b border-gray-700 pb-1 text-[#EEE9FF]">{d.name || d.skill}</div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-gray-300">Your Level:</span>
                                    <span className="font-bold text-[#7C61F5]">{d.current}%</span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-gray-300">Target Level:</span>
                                    <span className="font-bold text-gray-200">{d.target}%</span>
                                  </div>
                                  <div className="flex justify-between gap-4 text-[11px] pt-1 text-gray-400">
                                    <span>Gap:</span>
                                    <span className={d.gap > 20 ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>{d.gap}%</span>
                                  </div>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Bar
                          dataKey="current"
                          shape={<CustomBarWithTarget />}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* CARD 2: Skill Radar (3.5 of 12 cols) */}
              <div className="lg:col-span-3 bg-white border border-[#D8DFEB] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#F0F2F7]">
                    <div className="flex items-center gap-2">
                      <h2 className="font-['Manrope'] font-bold text-base text-[#0E1B38]">
                        Skill Radar
                      </h2>
                      <Info
                        className="w-3.5 h-3.5 text-[#98A3B7] cursor-pointer hover:text-[#5B36E9]"
                        title="Multidimensional visualization of technical competencies vs role benchmarks."
                      />
                    </div>
                  </div>

                  <div className="h-60 w-full flex items-center justify-center pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} outerRadius="75%">
                        <PolarGrid stroke="#E6EAF2" />
                        <PolarAngleAxis
                          dataKey="skill"
                          tick={{ fill: '#52617D', fontSize: 10, fontWeight: 600 }}
                        />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                          name="Target Level"
                          dataKey="target"
                          stroke="#B8C0D0"
                          fill="transparent"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                        />
                        <Radar
                          name="Your Level"
                          dataKey="current"
                          stroke="#5B36E9"
                          fill="#5B36E9"
                          fillOpacity={0.2}
                          strokeWidth={2}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Radar Legend */}
                <div className="flex items-center justify-center gap-4 text-xs font-medium text-[#52617D] pt-2 border-t border-[#F0F2F7]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#5B36E9]" />
                    <span>Your Level</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#B8C0D0]" />
                    <span>Target Level</span>
                  </div>
                </div>
              </div>

              {/* CARD 3: Top Skill Gaps (3 of 12 cols) */}
              <div className="lg:col-span-3 bg-white border border-[#D8DFEB] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#F0F2F7]">
                    <div className="flex items-center gap-2">
                      <h2 className="font-['Manrope'] font-bold text-base text-[#0E1B38]">
                        Top Skill Gaps
                      </h2>
                      <Info
                        className="w-3.5 h-3.5 text-[#98A3B7] cursor-pointer hover:text-[#5B36E9]"
                        title="Difference between your current proficiency and the target proficiency for this career goal."
                      />
                    </div>
                  </div>

                  {/* Actionable Gap Rows */}
                  <div className="space-y-3 mt-3">
                    {/* Gap 1: Machine Learning */}
                    <div
                      className="p-2.5 rounded-xl border border-[#F0F2F7] hover:border-[#5B36E9] hover:bg-[#F8FAFD] cursor-pointer transition-all flex items-center justify-between"
                      onClick={() => {
                        setSelectedSkillModal({
                          title: 'Machine Learning',
                          current: '45%',
                          target: '85%',
                          priority: 'High Priority',
                          desc: 'Focus on Supervised Learning algorithms, Cost Functions, and Model Validation.',
                        })
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-[#F5F1FF] text-[#5B36E9] flex items-center justify-center flex-none">
                          <Brain className="w-4 h-4" />
                        </span>
                        <div>
                          <h4 className="font-bold text-xs text-[#0E1B38]">Machine Learning</h4>
                          <p className="text-[11px] text-[#74819A]">Current 45% → Target 85%</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-[#FFF0F0] text-[#E5484D] font-bold text-[10px] border border-[#FECDCA]">
                        High Priority
                      </span>
                    </div>

                    {/* Gap 2: Statistics */}
                    <div
                      className="p-2.5 rounded-xl border border-[#F0F2F7] hover:border-[#5B36E9] hover:bg-[#F8FAFD] cursor-pointer transition-all flex items-center justify-between"
                      onClick={() => {
                        setSelectedSkillModal({
                          title: 'Statistics',
                          current: '55%',
                          target: '80%',
                          priority: 'High Priority',
                          desc: 'Master descriptive statistics, probability distributions, variance, and hypothesis testing.',
                        })
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-[#F5F1FF] text-[#5B36E9] flex items-center justify-center flex-none">
                          <BarChart3 className="w-4 h-4" />
                        </span>
                        <div>
                          <h4 className="font-bold text-xs text-[#0E1B38]">Statistics</h4>
                          <p className="text-[11px] text-[#74819A]">Current 55% → Target 80%</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-[#FFF0F0] text-[#E5484D] font-bold text-[10px] border border-[#FECDCA]">
                        High Priority
                      </span>
                    </div>

                    {/* Gap 3: Deep Learning */}
                    <div
                      className="p-2.5 rounded-xl border border-[#F0F2F7] hover:border-[#5B36E9] hover:bg-[#F8FAFD] cursor-pointer transition-all flex items-center justify-between"
                      onClick={() => {
                        setSelectedSkillModal({
                          title: 'Deep Learning',
                          current: '35%',
                          target: '75%',
                          priority: 'Medium',
                          desc: 'Neural network architectures, Backpropagation, and PyTorch tensors.',
                        })
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-[#F5F1FF] text-[#7C61F5] flex items-center justify-center flex-none">
                          <Layers className="w-4 h-4" />
                        </span>
                        <div>
                          <h4 className="font-bold text-xs text-[#0E1B38]">Deep Learning</h4>
                          <p className="text-[11px] text-[#74819A]">Current 35% → Target 75%</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-[#FFF7E6] text-[#D88700] font-bold text-[10px] border border-[#FEE4B2]">
                        Medium
                      </span>
                    </div>

                    {/* Gap 4: Interview Preparation */}
                    <div
                      className="p-2.5 rounded-xl border border-[#F0F2F7] hover:border-[#5B36E9] hover:bg-[#F8FAFD] cursor-pointer transition-all flex items-center justify-between"
                      onClick={() => {
                        setSelectedSkillModal({
                          title: 'Interview Preparation',
                          current: '50%',
                          target: '80%',
                          priority: 'Medium',
                          desc: 'ML system design mock scenarios, behavioral questions, and coding questions.',
                        })
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-[#F5F1FF] text-[#5B8DEF] flex items-center justify-center flex-none">
                          <Briefcase className="w-4 h-4" />
                        </span>
                        <div>
                          <h4 className="font-bold text-xs text-[#0E1B38]">Interview Preparation</h4>
                          <p className="text-[11px] text-[#74819A]">Current 50% → Target 80%</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-[#FFF7E6] text-[#D88700] font-bold text-[10px] border border-[#FEE4B2]">
                        Medium
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* ---------------------------------------------------------------------
                MAIN ANALYTICS GRID - ROW 2:
                1. Learning Trend (AreaChart + Green Banner)
                2. Skill Category Breakdown (Donut Chart)
                3. Recommended Focus (Actionable Card)
               --------------------------------------------------------------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* CARD 1: Learning Trend (Large, 5.5 of 12 cols) */}
              <div className="lg:col-span-6 bg-white border border-[#D8DFEB] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#F0F2F7]">
                    <div className="flex items-center gap-2">
                      <h2 className="font-['Manrope'] font-bold text-base text-[#0E1B38]">
                        Learning Trend
                      </h2>
                      <Info
                        className="w-3.5 h-3.5 text-[#98A3B7] cursor-pointer hover:text-[#5B36E9]"
                        title="Skill readiness evolution across consecutive study weeks."
                      />
                    </div>

                    {/* Timeframe Filter Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsTrendDropdownOpen((v) => !v)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-[#F5F7FC] border border-[#E6EAF2] rounded-lg text-xs font-semibold text-[#0E1B38] hover:bg-gray-100"
                      >
                        <span>{trendTimeframe}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-[#74819A]" />
                      </button>

                      {isTrendDropdownOpen && (
                        <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg border border-[#D8DFEB] shadow-lg p-1 z-20">
                          {['Last 4 Weeks', 'Last 8 Weeks', 'All Time'].map((tf) => (
                            <button
                              key={tf}
                              type="button"
                              onClick={() => {
                                setTrendTimeframe(tf)
                                setIsTrendDropdownOpen(false)
                              }}
                              className="w-full text-left px-2.5 py-1.5 text-xs font-medium hover:bg-[#F5F1FF] hover:text-[#5B36E9] rounded"
                            >
                              {tf}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Area Chart with Soft Violet Gradient */}
                  <div className="h-44 w-full pt-3 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="violetGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#5B36E9" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#5B36E9" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F2F7" />
                        <XAxis
                          dataKey="week"
                          tick={{ fill: '#52617D', fontSize: 11, fontWeight: 600 }}
                          axisLine={{ stroke: '#E6EAF2' }}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          ticks={[0, 20, 40, 60, 80, 100]}
                          tickFormatter={(v) => `${v}%`}
                          tick={{ fill: '#74819A', fontSize: 10, fontWeight: 600 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-[#0E1B38] text-white px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-lg">
                                  {payload[0].payload.week}: {payload[0].value}% Readiness
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="readiness"
                          stroke="#5B36E9"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#violetGradient)"
                          dot={{ fill: '#5B36E9', stroke: '#FFFFFF', strokeWidth: 2, r: 4 }}
                          activeDot={{ fill: '#5B36E9', stroke: '#F5F1FF', strokeWidth: 3, r: 6 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>

                    {/* Pinned 78% Tooltip Callout at W8 */}
                    <div className="absolute top-1 right-2 sm:right-4 bg-[#5B36E9] text-white text-[11px] font-extrabold px-2 py-0.5 rounded-md shadow-md">
                      78%
                    </div>
                  </div>
                </div>

                {/* Green Insight Banner at bottom */}
                <div className="mt-3 p-3 bg-[#ECFDF3] border border-[#D1FADF] rounded-xl flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-[#22A06B] flex-none" />
                  <p className="text-xs font-semibold text-[#0E1B38]">
                    Great progress! Your skill readiness improved by 18% in the last 8 weeks.
                  </p>
                </div>
              </div>

              {/* CARD 2: Skill Category Breakdown (Donut Chart, 3.5 of 12 cols) */}
              <div className="lg:col-span-3 bg-white border border-[#D8DFEB] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#F0F2F7]">
                    <div className="flex items-center gap-2">
                      <h2 className="font-['Manrope'] font-bold text-base text-[#0E1B38]">
                        Skill Category Breakdown
                      </h2>
                      <Info
                        className="w-3.5 h-3.5 text-[#98A3B7] cursor-pointer hover:text-[#5B36E9]"
                        title="Distribution of learning content and assessments by domain."
                      />
                    </div>
                  </div>

                  {/* Donut Chart with Centered 78% Callout */}
                  <div className="h-44 w-full relative flex items-center justify-center pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload
                              return (
                                <div className="bg-[#0E1B38] text-white px-2 py-1 rounded-md text-xs font-bold">
                                  {d.name}: {d.value}%
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Centered 78% Overall Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="font-['Manrope'] font-extrabold text-xl text-[#0E1B38] leading-none">
                        78%
                      </span>
                      <span className="text-[10px] font-semibold text-[#74819A] uppercase tracking-wider mt-0.5">
                        Overall
                      </span>
                    </div>
                  </div>

                  {/* Clean Legend */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] font-medium text-[#52617D] pt-2 border-t border-[#F0F2F7]">
                    {categoryData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between pr-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: item.color }} />
                          <span className="truncate">{item.name}</span>
                        </div>
                        <span className="font-bold text-[#0E1B38]">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CARD 3: Recommended Focus (Actionable Card, 3 of 12 cols) */}
              <div className="lg:col-span-3 bg-white border border-[#D8DFEB] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#F0F2F7]">
                    <div className="flex items-center gap-2">
                      <h2 className="font-['Manrope'] font-bold text-base text-[#0E1B38]">
                        Recommended Focus
                      </h2>
                      <Info
                        className="w-3.5 h-3.5 text-[#98A3B7] cursor-pointer hover:text-[#5B36E9]"
                        title="AI-prioritized roadmap steps based on your current skill gaps."
                      />
                    </div>
                  </div>

                  {/* Priority Banner (Green Surface) */}
                  <div className="mt-2.5 p-2.5 rounded-xl bg-[#ECFDF3] border border-[#D1FADF] flex items-start gap-2">
                    <Shield className="w-4 h-4 text-[#22A06B] flex-none mt-0.5" />
                    <p className="text-[11px] font-bold text-[#0E1B38] leading-tight">
                      Next Priority: Complete <span className="text-[#5B36E9]">Statistics</span> foundations to prepare for Machine Learning
                    </p>
                  </div>

                  {/* 3 Actionable Recommendation Rows */}
                  <div className="space-y-2.5 mt-3">
                    {/* Item 1 */}
                    <div
                      className="p-2.5 rounded-xl border border-[#F0F2F7] hover:border-[#5B36E9] hover:bg-[#F8FAFD] cursor-pointer transition-all flex items-center justify-between group"
                      onClick={() => navigate('/progress')}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-[#F5F1FF] text-[#5B36E9] flex items-center justify-center flex-none">
                          <Target className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <h4 className="font-bold text-xs text-[#0E1B38] group-hover:text-[#5B36E9]">
                            Improve Statistics to 80%
                          </h4>
                          <p className="text-[10px] text-[#74819A]">Estimated time: 2 weeks</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#74819A] group-hover:text-[#5B36E9] transition-transform group-hover:translate-x-0.5" />
                    </div>

                    {/* Item 2 */}
                    <div
                      className="p-2.5 rounded-xl border border-[#F0F2F7] hover:border-[#5B36E9] hover:bg-[#F8FAFD] cursor-pointer transition-all flex items-center justify-between group"
                      onClick={() => navigate('/dashboard')}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-[#F5F1FF] text-[#5B36E9] flex items-center justify-center flex-none">
                          <Sparkles className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <h4 className="font-bold text-xs text-[#0E1B38] group-hover:text-[#5B36E9]">
                            Start Machine Learning module
                          </h4>
                          <p className="text-[10px] text-[#74819A]">After Statistics completion</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#74819A] group-hover:text-[#5B36E9] transition-transform group-hover:translate-x-0.5" />
                    </div>

                    {/* Item 3 */}
                    <div
                      className="p-2.5 rounded-xl border border-[#F0F2F7] hover:border-[#5B36E9] hover:bg-[#F8FAFD] cursor-pointer transition-all flex items-center justify-between group"
                      onClick={() => navigate('/dashboard')}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-[#F5F1FF] text-[#5B36E9] flex items-center justify-center flex-none">
                          <Briefcase className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <h4 className="font-bold text-xs text-[#0E1B38] group-hover:text-[#5B36E9]">
                            Build portfolio project
                          </h4>
                          <p className="text-[10px] text-[#74819A]">Target: Week 10</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#74819A] group-hover:text-[#5B36E9] transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* ---------------------------------------------------------------------
                SECONDARY DEEP ANALYTICS & AI INSIGHTS
                (Heatmap Matrix, Learning Velocity, Time Spent, Strengths, AI Insight)
               --------------------------------------------------------------------- */}
            <div className="pt-2 border-t border-[#F0F2F7]">
              
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-['Manrope'] font-bold text-lg text-[#0E1B38]">
                    Skill Matrix & Diagnostic Intelligence
                  </h3>
                  <p className="text-xs text-[#74819A]">
                    Granular breakdown of competence tiers, learning velocity, and active AI recommendations.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'overview'
                        ? 'bg-[#5B36E9] text-white shadow-sm'
                        : 'bg-[#F5F7FC] text-[#52617D] hover:text-[#0E1B38]'
                    }`}
                  >
                    Intelligence Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('heatmap')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'heatmap'
                        ? 'bg-[#5B36E9] text-white shadow-sm'
                        : 'bg-[#F5F7FC] text-[#52617D] hover:text-[#0E1B38]'
                    }`}
                  >
                    Skill-Gap Heatmap
                  </button>
                </div>
              </div>

              {activeTab === 'heatmap' ? (
                /* SKILL GAP HEATMAP MATRIX */
                <div className="bg-white border border-[#D8DFEB] rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-bold text-sm text-[#0E1B38]">
                      Tiered Skill-Gap Matrix (Foundations → Intermediate → Advanced)
                    </span>
                    <div className="flex items-center gap-3 text-[11px] font-semibold">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#ECFDF3] border border-[#D1FADF]" /> Strong (≥75%)</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#FFF7E6] border border-[#FEE4B2]" /> Developing (50–74%)</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#FFF0F0] border border-[#FECDCA]" /> Priority Gap (&lt;50%)</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-[#E6EAF2] text-[#74819A]">
                          <th className="py-2.5 px-3 font-bold">Tier Level</th>
                          <th className="py-2.5 px-3 font-bold text-center">Python</th>
                          <th className="py-2.5 px-3 font-bold text-center">Statistics</th>
                          <th className="py-2.5 px-3 font-bold text-center">Machine Learning</th>
                          <th className="py-2.5 px-3 font-bold text-center">Pandas & EDA</th>
                          <th className="py-2.5 px-3 font-bold text-center">SQL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {heatmapData.map((row) => (
                          <tr key={row.level} className="border-b border-[#F0F2F7]">
                            <td className="py-3 px-3 font-bold text-[#0E1B38]">{row.level}</td>
                            <td className="py-3 px-3 text-center">
                              <span className={`inline-block px-3 py-1 rounded-lg border font-bold ${getHeatmapColor(row.python)}`}>
                                {row.python}%
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`inline-block px-3 py-1 rounded-lg border font-bold ${getHeatmapColor(row.stats)}`}>
                                {row.stats}%
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`inline-block px-3 py-1 rounded-lg border font-bold ${getHeatmapColor(row.ml)}`}>
                                {row.ml}%
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`inline-block px-3 py-1 rounded-lg border font-bold ${getHeatmapColor(row.pandas)}`}>
                                {row.pandas}%
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`inline-block px-3 py-1 rounded-lg border font-bold ${getHeatmapColor(row.sql)}`}>
                                {row.sql}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* INTELLIGENCE GRID: 4 Focused Cards */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Card 1: Learning Velocity */}
                  <div className="bg-white border border-[#D8DFEB] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#74819A] uppercase tracking-wider">
                          Learning Velocity
                        </span>
                        <span className="text-[11px] font-bold text-[#22A06B] bg-[#ECFDF3] px-2 py-0.5 rounded-full border border-[#D1FADF]">
                          +15%
                        </span>
                      </div>
                      <h4 className="font-['Manrope'] font-extrabold text-2xl text-[#0E1B38]">
                        2.4 skills / week
                      </h4>
                      <p className="text-[11px] text-[#52617D] mt-0.5 font-medium">
                        +15% vs last 2 weeks
                      </p>
                    </div>
                    {/* Mini Sparkline */}
                    <div className="h-10 w-full mt-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[{ v: 1.8 }, { v: 1.9 }, { v: 2.1 }, { v: 2.0 }, { v: 2.3 }, { v: 2.4 }]}>
                          <Line type="monotone" dataKey="v" stroke="#5B36E9" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Card 2: Time Spent by Category */}
                  <div className="bg-white border border-[#D8DFEB] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#74819A] uppercase tracking-wider">
                          Time Spent
                        </span>
                        <span className="text-[11px] font-bold text-[#5B36E9]">24.5 hrs</span>
                      </div>
                      <div className="space-y-1.5 mt-2">
                        {timeSpentData.map((item) => (
                          <div key={item.name} className="flex justify-between text-[11px]">
                            <span className="text-[#52617D]">{item.name}</span>
                            <span className="font-bold text-[#0E1B38]">{item.value}% ({item.hours})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Top Strengths */}
                  <div className="bg-white border border-[#D8DFEB] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#74819A] uppercase tracking-wider">
                          Top Strengths
                        </span>
                        <span className="text-[10px] font-bold text-[#22A06B]">5 Skills Strong</span>
                      </div>
                      <div className="space-y-1.5 mt-2">
                        {strengthsList.slice(0, 4).map((s) => (
                          <div key={s.name} className="flex items-center justify-between text-[11px]">
                            <span className="text-[#0E1B38] font-semibold truncate">{s.rank}. {s.name}</span>
                            <span className="text-[#22A06B] font-bold flex-none">{s.score}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-2 text-[10px] text-[#22A06B] font-bold bg-[#ECFDF3] px-2 py-1 rounded-lg text-center">
                      Great job! Build on these strengths.
                    </div>
                  </div>

                  {/* Card 4: AI-Powered PathFinder Explanation */}
                  <div className="bg-[#F5F1FF] border border-[#E4DCFD] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-[#5B36E9] mb-1.5">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs font-bold font-['Manrope']">PathFinder insight</span>
                      </div>
                      <p className="text-[11px] text-[#52617D] leading-relaxed">
                        Your strongest foundation is <strong>Python</strong>, while <strong>Statistics</strong> and <strong>Machine Learning</strong> are the biggest gaps relative to your AIML internship target. Complete Statistics first because it unlocks the next Machine Learning stage in your roadmap.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        openAICoach()
                        handleSendMessage('Why is Statistics prioritized before Machine Learning?')
                      }}
                      className="mt-3 text-xs font-bold text-[#5B36E9] hover:underline flex items-center gap-1 self-start"
                    >
                      <span>Ask PathFinder why</span>
                      <span>→</span>
                    </button>
                  </div>

                </div>
              )}

            </div>

          </main>
        </div>

        {/* =========================================================================
            FLOATING AI COACH BUTTON (Lower-Right)
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
              <Sparkles className="w-5 h-5" />
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
                  PathFinder Skill Coach
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
                onClick={() => handleSendMessage('Why is Statistics prioritized before Machine Learning?')}
                className="px-2.5 py-1 bg-[#F5F1FF] hover:bg-[#EEE9FF] text-[#5B36E9] text-[11px] font-semibold rounded-lg whitespace-nowrap"
              >
                Why Statistics first?
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('How does my velocity compare to target?')}
                className="px-2.5 py-1 bg-[#F5F1FF] hover:bg-[#EEE9FF] text-[#5B36E9] text-[11px] font-semibold rounded-lg whitespace-nowrap"
              >
                Velocity analysis
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
                placeholder="Ask about skill gaps, benchmarks..."
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
            SKILL DRILL-DOWN MODAL
           ========================================================================= */}
        {selectedSkillModal && (
          <div className="fixed inset-0 z-50 bg-[#0E1B38]/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#D8DFEB] shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-150">
              <button
                type="button"
                onClick={() => setSelectedSkillModal(null)}
                className="absolute top-4 right-4 text-[#74819A] hover:text-[#0E1B38] text-sm font-bold w-6 h-6 flex items-center justify-center"
              >
                ✕
              </button>
              
              <div className="flex items-center gap-2 text-xs font-bold text-[#5B36E9] bg-[#F5F1FF] px-2.5 py-1 rounded-md w-fit mb-3">
                <span>Skill Deep-Dive</span>
              </div>

              <h3 className="font-['Manrope'] font-bold text-xl text-[#0E1B38]">
                {selectedSkillModal.title}
              </h3>
              <p className="text-xs text-[#52617D] mt-1 mb-4">
                {selectedSkillModal.desc}
              </p>

              <div className="grid grid-cols-3 gap-3 p-3 bg-[#F8FAFD] rounded-xl border border-[#E6EAF2] text-center mb-4">
                <div>
                  <span className="text-[10px] text-[#74819A] font-bold block">CURRENT</span>
                  <span className="text-base font-extrabold text-[#0E1B38]">{selectedSkillModal.current}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#74819A] font-bold block">TARGET</span>
                  <span className="text-base font-extrabold text-[#5B36E9]">{selectedSkillModal.target}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#74819A] font-bold block">PRIORITY</span>
                  <span className="text-xs font-extrabold text-[#E5484D]">{selectedSkillModal.priority}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSkillModal(null)
                    navigate('/progress')
                  }}
                  className="flex-1 py-2.5 bg-[#5B36E9] hover:bg-[#4826C9] text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  Start Focused Practice
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const skillName = selectedSkillModal.title
                    setSelectedSkillModal(null)
                    openAICoach()
                    handleSendMessage(`Explain key study topics for ${skillName}`)
                  }}
                  className="px-4 py-2.5 border border-[#5B36E9] text-[#5B36E9] hover:bg-[#F5F1FF] font-bold text-xs rounded-xl transition-all"
                >
                  Ask Coach ✨
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
