import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

/**
 * PostInterviewDashboard (Stage 3) — Comprehensive Interview Analytics & Results.
 *
 * Includes:
 * - Embedded candidate video/audio playback of the live session.
 * - Overall performance rating and score cards.
 * - Speaking analytics: filler words count, pacing (WPM), articulation.
 * - Question-by-question breakdown with transcripts, feedback, and missing concepts.
 * - Direct bridges to PathFinder roadmap modules and recommended resources to strengthen weak spots.
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
    overall_score = 85,
    verdict = 'Strong Hire',
    summary = '',
    scores = {},
    metrics = {},
    strengths = [],
    areas_for_improvement = [],
    question_evaluations = [],
    recommended_learning_topics = []
  } = evaluation || {}

  const fillerData = metrics?.filler_words || { count: 0, breakdown: {}, densityPercent: 0, impact: 'Low' }

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
${summary}

CORE PILLARS:
- Technical Depth: ${scores.technical_depth || 0}%
- Communication Clarity: ${scores.communication_clarity || 0}%
- Problem Solving: ${scores.problem_solving || 0}%
- Structure & Confidence: ${scores.confidence_structure || 0}%

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
    link.download = `interview-evaluation-${trackId}-${Date.now()}.txt`
    link.click()
  }

  return (
    <div className="w-full font-['Inter',sans-serif] text-[#1d1d1f] dark:text-[#F5F5F7] select-none">
      <div className="flex flex-col gap-6">
        {/* Top Header & Navigation Banner */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#141A26] p-6 rounded-2xl border border-[#e0e0e0] dark:border-[#242E40] shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider rounded-md bg-[#0066cc]/10 text-[#0066cc] dark:bg-[#38BDF8]/20 dark:text-[#38BDF8]">
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

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadReport}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border border-[#e0e0e0] dark:border-[#242E40] bg-white dark:bg-[#1E2638] text-[#1d1d1f] dark:text-white hover:bg-[#f5f5f7] dark:hover:bg-[#20293D] transition-all flex items-center gap-2 cursor-pointer shadow-xs"
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
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-[#0066cc] dark:text-[#38BDF8] bg-[#eaf2fc] dark:bg-[rgba(41,151,255,0.18)] hover:bg-[#dbeafc] transition-all cursor-pointer flex items-center gap-2"
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
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#0066cc] dark:bg-[#38BDF8] dark:text-[#090D16] hover:bg-[#0052a3] dark:hover:bg-[#0284c7] transition-all shadow-sm cursor-pointer flex items-center gap-2"
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
          <div className="lg:col-span-4 bg-white dark:bg-[#141A26] p-6 sm:p-7 rounded-2xl border border-[#e0e0e0] dark:border-[#242E40] shadow-sm flex flex-col justify-between">
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
                <span className="text-xl text-[#6e6e73] dark:text-[#94A3B8] font-bold">
                  / 100
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#333333] dark:text-[#E5E5EA] leading-relaxed">
                {summary}
              </p>
            </div>

            {/* Speaking Flow Metrics */}
            <div className="mt-6 pt-4 border-t border-[#f0f0f0] dark:border-[#242E40] grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#f5f5f7] dark:bg-[#1E2638] border border-[#e0e0e0] dark:border-[#242E40]">
                <span className="text-[11px] text-[#6e6e73] dark:text-[#94A3B8] font-bold uppercase block mb-1">
                  Pacing (Speed)
                </span>
                <span className="text-base font-extrabold text-[#1d1d1f] dark:text-white">
                  {metrics?.wpm ?? 0} <span className="text-xs font-normal text-[#6e6e73]">WPM</span>
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
                  {metrics?.pacing_status || (overall_score === 0 ? 'No Speech' : 'Optimal Speed')}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#f5f5f7] dark:bg-[#1E2638] border border-[#e0e0e0] dark:border-[#242E40]">
                <span className="text-[11px] text-[#6e6e73] dark:text-[#94A3B8] font-bold uppercase block mb-1">
                  Filler Words
                </span>
                <span className="text-base font-extrabold text-[#1d1d1f] dark:text-white">
                  {fillerData.count} <span className="text-xs font-normal text-[#6e6e73]">used</span>
                </span>
                <span className="text-[10px] text-[#6e6e73] dark:text-[#94A3B8] font-semibold block mt-0.5">
                  {fillerData.impact}
                </span>
              </div>
            </div>
          </div>

          {/* 4 Core Competency Pillars (8 cols) */}
          <div className="lg:col-span-8 bg-white dark:bg-[#141A26] p-6 sm:p-7 rounded-2xl border border-[#e0e0e0] dark:border-[#242E40] shadow-sm flex flex-col justify-between gap-6">
            <div>
              <h2 className="text-lg font-bold font-['Manrope'] mb-1 text-[#1d1d1f] dark:text-white">
                Core Competency Diagnostic
              </h2>
              <p className="text-xs text-[#6e6e73] dark:text-[#94A3B8]">
                Quantitative evaluation across technical precision, articulation, and problem framing.
              </p>
            </div>

            {/* Score Progress Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Technical Depth & Accuracy', value: scores?.technical_depth ?? (overall_score === 0 ? 0 : 75), icon: 'code', desc: 'Understanding of core APIs, patterns, and trade-offs' },
                { label: 'Communication & Articulation', value: scores?.communication_clarity ?? (overall_score === 0 ? 0 : 80), icon: 'message', desc: 'Concise explanation, natural pacing, and minimal fillers' },
                { label: 'Problem Solving & System Design', value: scores?.problem_solving ?? (overall_score === 0 ? 0 : 70), icon: 'cpu', desc: 'Requirements analysis, bottleneck detection, and scaling' },
                { label: 'Structure & STAR Delivery', value: scores?.confidence_structure ?? (overall_score === 0 ? 0 : 72), icon: 'check', desc: 'Context setting, actions taken, and measurable results' },
              ].map((pillar, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[#f5f5f7] dark:bg-[#1E2638] border border-[#e0e0e0] dark:border-[#242E40] flex flex-col justify-between">
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
                  <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#0066cc] dark:bg-[#38BDF8]"
                      style={{ width: `${pillar.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Key Strengths & Growth Areas Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#f0f0f0] dark:border-[#28303F]">
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
        <div className="flex border-b border-[#E0E0E0] dark:border-[#28303F] gap-2">
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
                className="bg-white dark:bg-[#121722] p-6 rounded-3xl border border-[#E0E0E0] dark:border-[#28303F] shadow-xs flex flex-col gap-4"
              >
                {/* Question Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-[#eaf2fc] dark:bg-[rgba(41,151,255,0.18)] text-[#0066cc] dark:text-[#38BDF8] font-bold text-xs flex items-center justify-center">
                      Q{idx + 1}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#7a7a7a] dark:text-[#9CA3AF]">
                      {q.category || 'Technical Evaluation'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#7a7a7a]">Score:</span>
                    <span className="text-sm font-extrabold text-[#0066cc] dark:text-[#38BDF8] bg-[#eaf2fc] dark:bg-[rgba(41,151,255,0.2)] px-2.5 py-0.5 rounded-lg">
                      {q.score ?? 0}/100
                    </span>
                  </div>
                </div>

                {/* Question Text */}
                <h3 className="text-base font-bold text-[#1d1d1f] dark:text-white">
                  "{q.question}"
                </h3>

                {/* Candidate's Transcript */}
                <div className="p-4 rounded-2xl bg-[#fafafc] dark:bg-[#171D2B] border border-[#f0f0f0] dark:border-[#202734]">
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
                  <div className="text-xs text-[#7a7a7a] dark:text-[#9CA3AF] bg-[#f5f7fa] dark:bg-[#141b29] p-3 rounded-xl border border-[#e5e9f0] dark:border-[#1f293d]">
                    <strong className="text-[#1d1d1f] dark:text-slate-200">Model Interviewer Rubric:</strong> {q.model_answer_summary}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Recommended Roadmap Pathways */}
        {activeTab === 'pathways' && (
          <div className="bg-white dark:bg-[#121722] p-6 sm:p-8 rounded-3xl border border-[#E0E0E0] dark:border-[#28303F] shadow-xs flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-bold font-['Manrope'] mb-1 text-[#1d1d1f] dark:text-white">
                Personalized Learning Recommendations
              </h2>
              <p className="text-xs sm:text-sm text-[#7a7a7a] dark:text-[#9CA3AF]">
                Based on the skill gaps identified in your interview, here are the most impactful modules to add to your PathFinder roadmap:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommended_learning_topics.map((topicItem, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-[#fafafc] dark:bg-[#171D2B] border border-[#f0f0f0] dark:border-[#202734] flex flex-col justify-between gap-4 hover:border-[#0066cc]/50 transition-colors"
                >
                  <div>
                    <span className="w-8 h-8 rounded-xl bg-[#0066cc]/10 text-[#0066cc] dark:bg-[#38BDF8]/20 dark:text-[#38BDF8] flex items-center justify-center font-bold text-xs mb-3">
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
                    className="w-full py-2 px-3 rounded-xl bg-white dark:bg-[#1f293d] border border-[#E0E0E0] dark:border-[#28303F] text-xs font-bold text-[#0066cc] dark:text-[#38BDF8] hover:bg-[#eaf2fc] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Explore Learning Resources</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-[#eaf2fc] dark:bg-[rgba(41,151,255,0.15)] border border-[#0066cc]/20 flex items-center justify-between">
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
                className="px-4 py-2 rounded-xl bg-[#0066cc] text-white text-xs font-bold hover:bg-[#005bb5] transition-colors cursor-pointer"
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
