import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../layout/AppShell'
import CalibrationModal from './CalibrationModal'
import LiveInterviewView from './LiveInterviewView'
import PostInterviewDashboard from './PostInterviewDashboard'
import {
  startInterviewSession,
  submitInterviewAnswer,
  finalizeInterviewSession
} from '../../lib/interviewService'

/**
 * InterviewScreen — The top-level orchestrator for the AI Interview workflow.
 *
 * Coordinates:
 * 1. Stage 1: Calibration (Camera/Mic test, track selection, consent inside AppShell)
 * 2. Stage 2: Live Video Call Interview with Amazon Bedrock Adaptive Questioning & Polly TTS
 * 3. Loading Stage: AI Evaluation & Diagnosis
 * 4. Stage 3: Post-Session Dashboard (Metrics, video playback, roadmap actions inside AppShell)
 */
export default function InterviewScreen() {
  const navigate = useNavigate()

  const [stage, setStage] = useState('calibrating') // 'calibrating' | 'live' | 'evaluating' | 'dashboard'
  const [sessionConfig, setSessionConfig] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [isProcessingTurn, setIsProcessingTurn] = useState(false)
  const [evaluation, setEvaluation] = useState(null)
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [totalDurationSec, setTotalDurationSec] = useState(0)
  const [loadingText, setLoadingText] = useState('Connecting to the Interviewer, Just a Moment...')
  const streamRef = useRef(null)

  // Ensure camera hardware stops ONLY when leaving InterviewScreen entirely
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          try { track.stop() } catch {}
        })
      }
    }
  }, [])

  // Stage 1 -> Stage 2: Calibration Complete
  const handleStartSession = async (config) => {
    setSessionConfig(config)
    streamRef.current = config?.mediaStream || null
    setStage('evaluating')
    setLoadingText('Connecting to the Interviewer, Just a Moment...')

    try {
      const initData = await startInterviewSession(
        config.trackId,
        config.customTopic,
        config.questionCount || 5
      )

      setSessionId(initData.session_id)
      setQuestions([initData.question])
      setCurrentQuestionIndex(0)
      setAnswers([])
      setSessionConfig(prev => ({
        ...prev,
        targetRole: initData.target_role,
        currentMilestone: initData.current_milestone
      }))
      setStage('live')
    } catch (err) {
      console.warn('Error initiating interview session:', err)
      setStage('live')
    }
  }

  // Handle Turn Submission (Adaptive Bedrock Question Loop)
  const handleAnswerSubmit = async ({ transcript, durationSec }) => {
    setIsProcessingTurn(true)
    const currentQ = questions[currentQuestionIndex]
    const qNum = currentQuestionIndex + 1
    const totalQ = sessionConfig?.questionCount || 5

    const newAnswerRecord = {
      question_id: currentQ?.id || `q${qNum}`,
      question_number: qNum,
      question: currentQ?.question,
      category: currentQ?.category,
      transcript,
      duration_sec: durationSec
    }

    try {
      const turnResult = await submitInterviewAnswer({
        sessionId,
        questionNumber: qNum,
        totalQuestions: totalQ,
        currentQuestion: currentQ,
        transcript,
        durationSec
      })

      newAnswerRecord.answer_evaluation = turnResult.answer_evaluation
      const updatedAnswers = [...answers, newAnswerRecord]
      setAnswers(updatedAnswers)

      if (turnResult.completed || !turnResult.next_question || qNum >= totalQ) {
        // Complete the interview session
        await handleFinishSession(updatedAnswers)
      } else {
        // Append next adaptive question from Bedrock
        setQuestions(prev => [...prev, turnResult.next_question])
        setCurrentQuestionIndex(prev => prev + 1)
      }
    } catch (err) {
      console.warn('Turn evaluation error:', err)
      const updatedAnswers = [...answers, newAnswerRecord]
      setAnswers(updatedAnswers)
      if (qNum >= totalQ) {
        await handleFinishSession(updatedAnswers)
      }
    } finally {
      setIsProcessingTurn(false)
    }
  }

  // Finalize Session -> Stage 3
  const handleFinishSession = async (finalAnswers = answers) => {
    setStage('evaluating')
    setLoadingText('Synthesizing Interview Performance & Identifying Roadmap Skill Gaps...')

    try {
      const evalResult = await finalizeInterviewSession({
        sessionId,
        trackId: sessionConfig?.trackId || 'fullstack',
        topic: sessionConfig?.customTopic || sessionConfig?.targetRole || 'Full Stack Software Engineer',
        questions,
        answers: finalAnswers,
        totalDurationSec
      })
      setEvaluation(evalResult)
      setStage('dashboard')
    } catch (err) {
      console.error('Interview finalization error:', err)
      setStage('dashboard')
    }
  }

  // Restart Interview
  const handleRestart = () => {
    setEvaluation(null)
    setRecordedBlob(null)
    setQuestions([])
    setAnswers([])
    setCurrentQuestionIndex(0)
    setStage('calibrating')
  }

  // Exit Interview
  const handleExit = () => {
    if (sessionConfig?.mediaStream) {
      sessionConfig.mediaStream.getTracks().forEach(track => track.stop())
    }
    navigate('/dashboard')
  }

  // Stage 2: Live stage takes over full screen video call format
  if (stage === 'live') {
    return (
      <LiveInterviewView
        sessionConfig={sessionConfig}
        currentQuestion={questions[currentQuestionIndex]}
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={sessionConfig?.questionCount || 5}
        onAnswerSubmit={handleAnswerSubmit}
        onFinalize={({ recordedBlob: blob, totalDurationSec: dur }) => {
          setRecordedBlob(blob)
          setTotalDurationSec(dur)
          handleFinishSession(answers)
        }}
        onExit={handleExit}
        isProcessingTurn={isProcessingTurn}
      />
    )
  }

  // Evaluating / Processing Interstitial
  if (stage === 'evaluating') {
    return (
      <div className="fixed inset-0 z-50 bg-[#F8FAFC]/95 dark:bg-[#0B0F17]/95 backdrop-blur-2xl text-[#1D1D1F] dark:text-white flex flex-col items-center justify-center p-6 text-center select-none font-['Inter',sans-serif] transition-colors duration-300">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full border-4 border-[#0066cc]/20 dark:border-white/10 border-t-[#0066cc] dark:border-t-[#38BDF8] animate-spin flex items-center justify-center shadow-lg shadow-[#0066cc]/15 dark:shadow-cyan-500/10">
            <div className="w-10 h-10 rounded-full bg-[#0066cc]/10 dark:bg-white/10 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse text-[#0066cc] dark:text-[#38BDF8]">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </div>
          </div>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold font-['Manrope'] mb-2 text-[#1D1D1F] dark:text-white tracking-tight">
          {loadingText}
        </h2>
        <p className="text-xs sm:text-sm text-[#7A7A7A] dark:text-slate-400 max-w-md leading-relaxed">
          Calibrating live audio streams, configuring interview parameters, and preparing your session.
        </p>
      </div>
    )
  }

  // Stage 3: Results Dashboard (Inside AppShell)
  if (stage === 'dashboard') {
    return (
      <AppShell contentClassName="!overflow-y-auto" containerClassName="!pb-6">
        <PostInterviewDashboard
          evaluation={evaluation}
          recordedBlob={recordedBlob}
          trackId={sessionConfig?.trackId}
          topic={sessionConfig?.customTopic || sessionConfig?.targetRole}
          totalDurationSec={totalDurationSec}
          onRestart={handleRestart}
        />
      </AppShell>
    )
  }

  // Stage 1: Calibration View (Centered inside AppShell)
  return (
    <AppShell
      contentClassName="!overflow-y-auto flex flex-col items-center justify-center !p-3 sm:!p-5"
      containerClassName="!pb-0 !h-full flex flex-col justify-center items-center my-auto min-h-0"
    >
      <CalibrationModal
        initialTrack="fullstack"
        onStart={handleStartSession}
        onClose={() => navigate('/dashboard')}
      />
    </AppShell>
  )
}
