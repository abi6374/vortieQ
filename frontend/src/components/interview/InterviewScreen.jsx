import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../layout/AppShell'
import CalibrationModal from './CalibrationModal'
import LiveInterviewView from './LiveInterviewView'
import PostInterviewDashboard from './PostInterviewDashboard'
import { fetchInterviewQuestions, evaluateInterviewSession } from '../../lib/interviewService'

/**
 * InterviewScreen — The top-level orchestrator for the AI Interview workflow.
 *
 * Coordinates:
 * 1. Stage 1: Calibration (Camera/Mic test, track selection, consent)
 * 2. Stage 2: Live Video Call Interview (Abstract AI visualizer, PiP webcam, voice Q&A)
 * 3. Loading Stage: AI Evaluation & Diagnosis
 * 4. Stage 3: Post-Session Dashboard (Metrics, video playback, personalized roadmap actions)
 */
export default function InterviewScreen() {
  const navigate = useNavigate()

  const [stage, setStage] = useState('calibrating') // 'calibrating' | 'live' | 'evaluating' | 'dashboard'
  const [sessionConfig, setSessionConfig] = useState(null)
  const [questions, setQuestions] = useState([])
  const [evaluation, setEvaluation] = useState(null)
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [totalDurationSec, setTotalDurationSec] = useState(0)
  const [loadingText, setLoadingText] = useState('AI Evaluator Analyzing Responses...')

  // Stage 1 -> Stage 2: Calibration Complete
  const handleStartSession = async (config) => {
    setSessionConfig(config)
    setStage('evaluating')
    setLoadingText('Generating Tailored Interview Questions...')

    try {
      const qList = await fetchInterviewQuestions(
        config.trackId,
        config.customTopic,
        config.questionCount || 4
      )
      setQuestions(qList)
      setStage('live')
    } catch (err) {
      console.warn('Error initiating interview questions:', err)
      setStage('live')
    }
  }

  // Stage 2 -> Stage 3: Live Interview Complete
  const handleLiveInterviewComplete = async ({ answers, recordedBlob: blob, totalDurationSec: duration }) => {
    setRecordedBlob(blob)
    setTotalDurationSec(duration)
    setStage('evaluating')
    setLoadingText('Synthesizing Interview Performance & Identifying Skill Gaps...')

    try {
      const evalResult = await evaluateInterviewSession({
        trackId: sessionConfig?.trackId || 'fullstack',
        topic: sessionConfig?.customTopic || sessionConfig?.trackId || 'Full Stack Software Engineer',
        questions,
        answers,
        durationSec: duration
      })
      setEvaluation(evalResult)
      setStage('dashboard')
    } catch (err) {
      console.error('Interview evaluation error:', err)
      setStage('dashboard')
    }
  }

  // Restart Interview
  const handleRestart = () => {
    setEvaluation(null)
    setRecordedBlob(null)
    setStage('calibrating')
  }

  // Exit Interview
  const handleExit = () => {
    if (sessionConfig?.mediaStream) {
      sessionConfig.mediaStream.getTracks().forEach(track => track.stop())
    }
    navigate('/dashboard')
  }

  // Live stage takes over full screen video call format
  if (stage === 'live') {
    return (
      <LiveInterviewView
        sessionConfig={sessionConfig}
        questions={questions}
        onComplete={handleLiveInterviewComplete}
        onExit={handleExit}
      />
    )
  }

  // Evaluating / Processing Interstitial
  if (stage === 'evaluating') {
    return (
      <div className="fixed inset-0 z-50 bg-[#090d16] text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full border-4 border-white/10 border-t-[#0071e3] animate-spin flex items-center justify-center shadow-xl shadow-[#0071e3]/30">
            <div className="w-10 h-10 rounded-full bg-[#0071e3]/20 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </div>
          </div>
        </div>
        <h2 className="text-xl font-bold font-['Manrope'] mb-2 text-white">
          {loadingText}
        </h2>
        <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
          Evaluating technical criteria, measuring filler words, computing clarity scores, and mapping gaps to your learning roadmap.
        </p>
      </div>
    )
  }

  // Stage 3: Results Dashboard
  if (stage === 'dashboard') {
    return (
      <PostInterviewDashboard
        evaluation={evaluation}
        recordedBlob={recordedBlob}
        trackId={sessionConfig?.trackId}
        topic={sessionConfig?.customTopic}
        totalDurationSec={totalDurationSec}
        onRestart={handleRestart}
      />
    )
  }

  // Stage 1: Calibration View (default inside AppShell)
  return (
    <AppShell>
      <div className="flex-1 flex flex-col h-full bg-[#F5F5F7] dark:bg-[#0B0E14] overflow-y-auto">
        <CalibrationModal
          initialTrack="fullstack"
          onStart={handleStartSession}
          onClose={() => navigate('/dashboard')}
        />
      </div>
    </AppShell>
  )
}
