import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

/**
 * PostInterviewDashboard (Stage 3) — Comprehensive Interview Analytics & Results.
 *
 * Includes:
 * - Accurate pillar scores & diagnostics (0% when no answers provided).
 * - Action Blue branding consistent with PathFinder theme.
 * - Embedded candidate video/audio playback of the live session.
 * - Speaking analytics: filler words count, pacing (WPM), articulation.
 * - Question-by-question breakdown with transcripts, feedback, and missing concepts.
 * - Direct bridges to PathFinder roadmap modules and recommended resources.
 */
export default function PostInterviewDashboard({
  evaluation,
  recordedBlob,
  trackId,
  topic,
  totalDurationSec = 0,
  onRestart
}) {
  const navigate = useNavigate()
  const [videoUrl, setVideoUrl] = useState(null)
  const [activeTab, setActiveTab] = useState('questions') // 'questions' | 'pathways' | 'playback'

  useEffect(() => {
    if (recordedBlob) {
      const url = URL.createObjectURL(recordedBlob)
      setVideoUrl(url)
      return () => {
        URL.revokeObjectURL(url)
      }
    }
  }, [recordedBlob])

  const {
    overall_score = 0,
    verdict = 'Do Not Hire',
    summary = '',
    scores = {},
    metrics = {},
    strengths = [],
    areas_for_improvement = [],
    question_evaluations = [],
    recommended_learning_topics = []
  } = evaluation || {}

  const fillerData = metrics?.filler_words || { count: 0, breakdown: {}, densityPercent: 0, impact: 'Low' }

  // Check if candidate answered questions or has 0 overall score
  const isZeroScore = overall_score === 0 || (question_evaluations.length > 0 && question_evaluations.every(q => (q.score ?? 0) === 0))

  // Extract core pillar scores safely — strictly 0 when no answers provided
  const technical_accuracy_score = isZeroScore ? 0 : (scores?.technical_depth ?? scores?.technical_accuracy ?? scores?.technical ?? 0)
  const communication_score = isZeroScore ? 0 : (scores?.communication_clarity ?? scores?.communication ?? 0)
  const problem_solving_score = isZeroScore ? 0 : (scores?.problem_solving ?? 0)
  const system_design_score = isZeroScore ? 0 : (scores?.confidence_structure ?? scores?.system_design ?? scores?.architecture ?? 0)

  // Format Duration MM:SS
  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}m ${s}s`
  }

  // Handle report download
  const handleDownloadReport = () => {
    const reportText = `PATHFINDER AI INTERVIEW EVALUATION REPORT
Date: ${new Date().toLocaleDateString()}
Role / Track: ${topic || trackId}
Overall Score: ${overall_score}/100 (${verdict})
Total Duration: ${formatDuration(totalDurationSec)}
Total Words: ${metrics?.total_words || 0} (${metrics?.wpm || 0} WPM)
Filler Words Detected: ${fillerData.count}

EXECUTIVE SUMMARY:
${summary || (isZeroScore ? 'The candidate did not provide verbal answers during this interview session.' : 'Performance diagnosis generated based on technical answers and behavioral signals.')}

CORE PILLARS:
- Technical Depth: ${technical_accuracy_score}%
- Communication Clarity: ${communication_score}%
- Problem Solving: ${problem_solving_score}%
- System Design & Structure: ${system_design_score}%

STRENGTHS:
${strengths.map(s => `- ${s}`).join('\n')}

AREAS TO STRENGTHEN:
${areas_for_improvement.map(a => `- ${a}`).join('\n')}

RECOMMENDED ROADMAP MODULES:
${recommended_learning_topics.map(t => `- ${t}`).join('\n')}
`
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `interview-evaluation-${trackId || 'session'}-${Date.now()}.txt`
    link.click()
  }

  return (
    <div className="w-full font-['Inter',sans-serif] text-[#1d1d1f] dark:text-[#F5F5F7] select-none">
      <div className="flex flex-col gap-6">
        {/* Top Header & Navigation Banner */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121722] p-6 rounded-2xl border border-[#e0e0e0] dark:border-[#27272F] shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider rounded-md bg-[#0066cc]/10 text-[#0066cc] dark:bg-[#0066cc]/20 dark:text-[#38BDF8]">
                Session Results
              </span>
              <span className="text-xs text-[#6e6e73] dark:text-[#94A3B8] font-medium">
                {new Date().toLocaleDateString()} • {formatDuration(totalDurationSec)}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-['Manrope'] tracking-tight text-[#1d1d1f] dark:text-white">
              AI Interview Evaluation
            </h1>
            <p className="text-sm text-[#6e6e73] dark:text-[#94A3B8]">
              Performance diagnosis and targeted learning pathways for <strong className="text-[#1d1d1f] dark:text-white capitalize">{topic || trackId}</strong>
            </p>
          </div>

          {/* Action CTAs — Rich Action Blue Branding */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleDownloadReport}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border border-[#e0e0e0] dark:border-[#27272F] bg-white dark:bg-[#182030] text-[#1d1d1f] dark:text-white hover:bg-[#f5f5f7] dark:hover:bg-[#20293d] transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Export Report</span>
            </button>

            <button
              type="button"
              onClick={onRestart}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-[#0066cc] dark:text-[#38BDF8] bg-[#0066cc]/10 dark:bg-[#0066cc]/20 hover:bg-[#0066cc]/20 transition-all cursor-pointer flex items-center gap-2 border border-[#0066cc]/20 dark:border-[#0066cc]/30"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              <span>Practice Again</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#0071e3] to-[#0066cc] hover:from-[#0077ed] hover:to-[#005bb5] shadow-md shadow-[#0066cc]/25 transition-all cursor-pointer flex items-center gap-2 border-none"
            >
              <span>Return to Roadmap</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </header>

        {/* Hero Performance Overview & Score Matrix */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Score & Verdict Card (4 cols) */}
          <div className="lg:col-span-4 bg-white dark:bg-[#121722] p-6 sm:p-7 rounded-2xl border border-[#e0e0e0] dark:border-[#27272F] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6e6e73] dark:text-[#94A3B8]">
                  Overall Assessment
                </span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                  overall_score >= 85
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : overall_score >= 70
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                    : overall_score >= 50
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                }`}>
                  {verdict}
                </span>
              </div>

              {/* Score Display */}
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-6xl font-extrabold font-['Manrope'] text-[#0066cc] dark:text-[#38BDF8] tracking-tight">
                  {overall_score}
                </span>
                <span className="text-xl font-bold text-[#7a7a7a]">/100</span>
              </div>

              <p className="text-xs sm:text-sm text-[#555555] dark:text-[#94A3B8] leading-relaxed">
                {summary || (isZeroScore
                  ? 'The candidate did not provide any verbal answers to the questions asked during this session.'
                  : 'Detailed diagnostic generated based on technical answers, problem solving pacing, and behavioral signals.'
                )}
              </p>
            </div>

            {/* Quick Metrics Matrix */}
            <div className="grid grid-cols-2 gap-3 pt-4 mt-4 border-t border-[#f0f0f0] dark:border-[#27272F]">
              <div className="p-3 rounded-xl bg-[#fafafc] dark:bg-[#182030]">
                <div className="text-[11px] text-[#7a7a7a] dark:text-[#94A3B8]">Questions</div>
                <div className="text-base font-bold text-[#1d1d1f] dark:text-white font-mono mt-0.5">
                  {question_evaluations.length} Answered
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#fafafc] dark:bg-[#182030]">
                <div className="text-[11px] text-[#7a7a7a] dark:text-[#94A3B8]">Pacing</div>
                <div className="text-base font-bold text-[#1d1d1f] dark:text-white font-mono mt-0.5">
                  {Math.round(totalDurationSec / (question_evaluations.length || 1))}s / Q
                </div>
              </div>
            </div>
          </div>

          {/* 4 Performance Pillars & Strengths (8 cols) */}
          <div className="lg:col-span-8 bg-white dark:bg-[#121722] p-6 sm:p-7 rounded-2xl border border-[#e0e0e0] dark:border-[#27272F] shadow-sm flex flex-col justify-between gap-6">
            {/* 4 Pillars Progress Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Technical Depth', value: technical_accuracy_score, desc: 'Domain algorithms, system architecture, core concepts' },
                { label: 'Communication & Structure', value: communication_score, desc: 'Clarity, conciseness, structured response delivery' },
                { label: 'Problem Solving Pacing', value: problem_solving_score, desc: 'Edge-case handling, reasoning method, trade-offs' },
                { label: 'System Design Completeness', value: system_design_score, desc: 'Scalability, reliability, component integration' },
              ].map((pillar, i) => (
                <div key={i} className="p-4 rounded-xl bg-[#fafafc] dark:bg-[#182030] border border-[#f0f0f0] dark:border-[#27272F] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-[#1d1d1f] dark:text-white">
                        {pillar.label}
                      </span>
                      <span className="text-sm font-extrabold text-[#0066cc] dark:text-[#38BDF8]">
                        {pillar.value}%
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6e6e73] dark:text-[#94A3B8] mb-3">
                      {pillar.desc}
                    </p>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-[#28303F] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#0066cc] dark:bg-[#38BDF8] transition-all duration-500"
                      style={{ width: `${pillar.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Key Strengths & Growth Areas Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#f0f0f0] dark:border-[#27272F]">
              <div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  Identified Strengths
                </span>
                <ul className="space-y-1.5">
                  {strengths.map((st, i) => (
                    <li key={i} className="text-xs text-[#333333] dark:text-[#E5E5EA] flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-none" />
                      <span>{st}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  Targeted Growth Areas
                </span>
                <ul className="space-y-1.5">
                  {areas_for_improvement.map((imp, i) => (
                    <li key={i} className="text-xs text-[#333333] dark:text-[#E5E5EA] flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-none" />
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Navigation Tabs for Detailed Inspection */}
        <div className="flex border-b border-[#E0E0E0] dark:border-[#27272F] gap-2">
          {[
            { id: 'questions', label: 'Question-by-Question Breakdown', count: question_evaluations.length },
            { id: 'pathways', label: 'Recommended Roadmap Next Steps', count: recommended_learning_topics.length },
            { id: 'playback', label: 'Recorded Video Replay', count: videoUrl ? 'Available' : 'Voice' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-[#0066cc] text-[#0066cc] dark:border-[#38BDF8] dark:text-[#38BDF8]'
                  : 'border-transparent text-[#7a7a7a] hover:text-[#1d1d1f] dark:hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/5 dark:bg-white/10 text-[#64748b] dark:text-slate-400">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Tab 1: Detailed Question-by-Question Breakdown */}
        {activeTab === 'questions' && (
          <div className="flex flex-col gap-4">
            {question_evaluations.map((q, idx) => (
              <div
                key={q.question_id || idx}
                className="bg-white dark:bg-[#121722] p-6 rounded-3xl border border-[#E0E0E0] dark:border-[#27272F] shadow-xs flex flex-col gap-4"
              >
                {/* Question Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-[#0066cc]/10 dark:bg-[#0066cc]/20 text-[#0066cc] dark:text-[#38BDF8] font-bold text-xs flex items-center justify-center">
                      Q{idx + 1}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#7a7a7a] dark:text-[#9CA3AF]">
                      {q.category || 'Technical Evaluation'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#7a7a7a]">Score:</span>
                    <span className="text-sm font-extrabold text-[#0066cc] dark:text-[#38BDF8] bg-[#0066cc]/10 dark:bg-[#0066cc]/20 px-2.5 py-0.5 rounded-lg">
                      {q.score ?? 0}/100
                    </span>
                  </div>
                </div>

                {/* Question Text */}
                <h3 className="text-base font-bold text-[#1d1d1f] dark:text-white">
                  "{q.question}"
                </h3>

                {/* Candidate's Transcript */}
                <div className="p-4 rounded-2xl bg-[#fafafc] dark:bg-[#182030] border border-[#f0f0f0] dark:border-[#27272F]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#7a7a7a] dark:text-[#9CA3AF] block mb-1">
                    Your Response Transcript
                  </span>
                  <p className="text-xs sm:text-sm text-[#333333] dark:text-[#E5E5EA] leading-relaxed italic">
                    "{q.transcript}"
                  </p>
                </div>

                {/* AI Diagnostic Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Strengths / What was done well */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-1 flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      Strengths in Your Answer
                    </span>
                    <ul className="space-y-1 text-emerald-900 dark:text-emerald-200">
                      {q.strengths?.map((s, i) => (
                        <li key={i}>• {s}</li>
                      )) || <li>• Clear conceptual explanation</li>}
                    </ul>
                  </div>

                  {/* Missing Concepts / What you could add */}
                  <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/40">
                    <span className="font-bold text-amber-800 dark:text-amber-300 block mb-1 flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                      Missing Concepts to Strengthen Answer
                    </span>
                    <ul className="space-y-1 text-amber-900 dark:text-amber-200">
                      {q.missing_concepts?.map((m, i) => (
                        <li key={i}>• {m}</li>
                      )) || <li>• Consider mentioning specific operational metrics and edge cases</li>}
                    </ul>
                  </div>
                </div>

                {/* Model Answer Summary */}
                {q.model_answer_summary && (
                  <div className="text-xs text-[#7a7a7a] dark:text-[#9CA3AF] bg-[#f5f7fa] dark:bg-[#182030] p-3 rounded-xl border border-[#e5e9f0] dark:border-[#27272F]">
                    <strong className="text-[#1d1d1f] dark:text-slate-200">Model Interviewer Rubric:</strong> {q.model_answer_summary}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Recommended Roadmap Pathways */}
        {activeTab === 'pathways' && (
          <div className="bg-white dark:bg-[#121722] p-6 sm:p-8 rounded-3xl border border-[#E0E0E0] dark:border-[#27272F] shadow-xs flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-bold font-['Manrope'] mb-1 text-[#1d1d1f] dark:text-white">
                Personalized Learning Recommendations
              </h2>
              <p className="text-xs sm:text-sm text-[#7a7a7a] dark:text-[#94A3AF]">
                Based on the skill gaps identified in your interview, here are the most impactful modules to add to your Skilling roadmap:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommended_learning_topics.map((topicItem, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-[#fafafc] dark:bg-[#182030] border border-[#f0f0f0] dark:border-[#27272F] flex flex-col justify-between gap-4 hover:border-[#0066cc]/50 dark:hover:border-[#38BDF8]/50 transition-colors"
                >
                  <div>
                    <span className="w-8 h-8 rounded-xl bg-[#0066cc]/10 text-[#0066cc] dark:bg-[#0066cc]/20 dark:text-[#38BDF8] flex items-center justify-center font-bold text-xs mb-3">
                      #{idx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white mb-1">
                      {topicItem}
                    </h3>
                    <p className="text-xs text-[#7a7a7a] dark:text-[#9CA3AF]">
                      Targeted practice to solidify conceptual depth and interview readiness.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate('/resources')}
                    className="w-full py-2 px-3 rounded-xl bg-white dark:bg-[#121722] border border-[#E0E0E0] dark:border-[#27272F] text-xs font-bold text-[#0066cc] dark:text-[#38BDF8] hover:bg-[#eaf2fc] dark:hover:bg-[#182030] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Explore Learning Resources</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-[#eaf2fc] dark:bg-[#182030] border border-[#0066cc]/20 dark:border-[#27272F] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-[#0066cc] dark:text-[#38BDF8]">
                  Ready to update your master Roadmap?
                </h4>
                <p className="text-xs text-[#333333] dark:text-[#D1D5DB]">
                  Sync these interview insights directly with your weekly learning schedule.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0071e3] to-[#0066cc] text-white text-xs font-bold hover:from-[#0077ed] hover:to-[#005bb5] transition-all cursor-pointer border-none shadow-sm"
              >
                Go to Roadmap
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Recorded Video Replay */}
        {activeTab === 'playback' && (
          <div className="bg-white dark:bg-[#121722] p-6 sm:p-8 rounded-3xl border border-[#E0E0E0] dark:border-[#28303F] shadow-xs flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-bold font-['Manrope'] mb-1 text-[#1d1d1f] dark:text-white">
                Interview Recording Playback
              </h2>
              <p className="text-xs text-[#7a7a7a] dark:text-[#9CA3AF]">
                Review your body language, eye contact, and vocal cadence throughout the session.
              </p>
            </div>

            {videoUrl ? (
              <div className="w-full max-w-3xl mx-auto rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl aspect-video">
                <video
                  src={videoUrl}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="p-8 text-center text-[#7a7a7a] dark:text-[#9CA3AF] bg-[#fafafc] dark:bg-[#171D2B] rounded-2xl border border-dashed border-[#E0E0E0] dark:border-[#28303F]">
                <p className="text-sm font-medium">
                  This session was recorded in voice-only mode or camera stream was not saved.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
