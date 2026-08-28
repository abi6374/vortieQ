import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ChatInput from '../components/onboarding/ChatInput'
import GoalConfirm from '../components/onboarding/GoalConfirm'
import GeneratingOverlay from '../components/onboarding/GeneratingOverlay'
import ResumeUpload from '../components/onboarding/ResumeUpload'
import LearnerIntakeWorkspace from '../components/onboarding/LearnerIntakeWorkspace'
import AssessSkills from '../components/onboarding/AssessSkills'
import GoalCompass from '../components/onboarding/GoalCompass'
import SetupSidebar from '../components/onboarding/SetupSidebar'
import NavBar from '../components/ui/NavBar'
import api from '../lib/apiClient'

/**
 * Onboarding is a wizard with two entry lanes:
 *   1. Skip resume / Chat → phase = 'intake' → 'topics' → 'goalcompass' → 'generating'
 *   2. Upload resume → phase = 'intake' → 'topics' → 'goalcompass' → 'generating'
 * At submit time, topic ratings (if any) ride along on the POST /api/profile/ call
 * as `topic_ratings`, which the backend merges into the learner profile.
 */
export default function OnboardingPage() {
  const [phase, setPhase] = useState('intake') // 'intake' | 'topics' | 'goalcompass' | 'chat' | 'confirm' | 'generating'
  const [goalText, setGoalText] = useState('')
  const [extractedProfile, setExtractedProfile] = useState(null)
  const [resumeTopics, setResumeTopics] = useState([])       // from LLM extraction
  const [detectedYears, setDetectedYears] = useState(0)
  const [topicRatings, setTopicRatings] = useState([])       // user-adjusted levels
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [genStatus, setGenStatus] = useState('loading') // 'loading' | 'success' | 'error'
  const [pendingPathId, setPendingPathId] = useState(null)
  const lastPlanArgs = useRef(null)
  const bgRef = useRef(null)

  const navigate = useNavigate()

  // Freeze the Goal Compass page (pointer + keyboard) while the overlay is open.
  useEffect(() => {
    if (bgRef.current) bgRef.current.inert = phase === 'generating'
  }, [phase])

  // ------------- Step 1: Intake (Resume or Natural-language notes)
  const handleResumeExtracted = (topics, years) => {
    setResumeTopics(topics)
    setDetectedYears(years)
    setPhase(topics && topics.length > 0 ? 'topics' : 'goalcompass')
  }

  const handleChatIntake = (storyText) => {
    // Chat lane: no resume => no extracted skills. Do NOT fabricate topics
    // (the old code hardcoded "Python" + "Data Analysis" which would then be
    // asked about even if the user described, say, wanting to learn React).
    // Skip the assessment step; carry the user's own words into Goal Compass
    // so the goal textarea is pre-filled instead of thrown away.
    setGoalText(storyText || '')
    setResumeTopics([])
    setTopicRatings([])
    setDetectedYears(0)
    setPhase('goalcompass')
  }

  // ------------- topic ratings step → Goal Compass (skills in hand)
  const handleTopicsContinue = (ratings) => {
    setTopicRatings(ratings)
    setPhase('goalcompass')
  }

  // ------------- Goal Compass "Create my learning plan"
  const runPlan = async (goalTextInput, weeklyHours) => {
    lastPlanArgs.current = { goalTextInput, weeklyHours }
    setError(null)
    setPendingPathId(null)
    setGenStatus('loading')
    setPhase('generating')
    try {
      // Fold the weekly-hours choice into the goal text so extract_profile picks
      // it up (backend derives weekly_hours from the free text).
      const composed = weeklyHours
        ? `${goalTextInput} I can study ${weeklyHours} hours per week.`
        : goalTextInput
      const body = { goal_text: composed }
      if (topicRatings.length > 0) body.topic_ratings = topicRatings
      if (detectedYears > 0) body.detected_years_experience = detectedYears
      await api.post('/api/profile/', body)
      const result = await api.post('/api/paths/generate', {})
      setPendingPathId(result.data.path_id)
      setGenStatus('success')
    } catch (err) {
      setGenStatus('error')
    }
  }
  const handleCreatePlan = runPlan
  const retryPlan = () => {
    const a = lastPlanArgs.current
    if (a) runPlan(a.goalTextInput, a.weeklyHours)
  }
  const backToGoal = () => { setGenStatus('loading'); setPhase('goalcompass') }
  const finishToRoadmap = () => { if (pendingPathId) navigate(`/roadmap/${pendingPathId}`) }

  // ------------- goal chat
  const handleGoalSubmit = async (text) => {
    setGoalText(text)
    setError(null)
    setIsLoading(true)
    try {
      const body = { goal_text: text }
      if (topicRatings.length > 0) body.topic_ratings = topicRatings
      if (detectedYears > 0) body.detected_years_experience = detectedYears
      const result = await api.post('/api/profile/', body)
      setExtractedProfile(result.data)
      setPhase('confirm')
    } catch (err) {
      setError('Could not process your goal. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // ------------- confirm profile → generate path
  const handleConfirm = async () => {
    setError(null)
    setPhase('generating')
    try {
      const result = await api.post('/api/paths/generate', {})
      navigate(`/roadmap/${result.data.path_id}`)
    } catch (err) {
      setError('Path generation failed. Please try again.')
      setPhase('confirm')
    }
  }

  const handleEditGoal = () => {
    setPhase('chat')
    setExtractedProfile(null)
  }

  // Step 1: High-fidelity desktop learner intake screen with unified 5-step sidebar
  if (phase === 'intake' || phase === 'resume') {
    return (
      <div className="min-h-screen flex" style={{ background: '#F5F7FC' }}>
        <SetupSidebar current={1} />
        <div className="flex-1 flex flex-col items-center justify-start px-4 py-8 lg:py-10 overflow-y-auto">
          <LearnerIntakeWorkspace
            onExtracted={handleResumeExtracted}
            onChatSubmit={handleChatIntake}
            onSkip={() => setPhase('topics')}
          />
        </div>
      </div>
    )
  }

  // Step 2: The "Assess skills" step
  if (phase === 'topics') {
    return (
      <div className="min-h-screen flex" style={{ background: '#F5F7FC' }}>
        <SetupSidebar current={2} />
        <div className="flex-1 flex flex-col items-center justify-start px-4 py-8 lg:py-10 overflow-y-auto">
          <AssessSkills
            topics={resumeTopics}
            detectedYears={detectedYears}
            onContinue={handleTopicsContinue}
            onBack={() => setPhase('intake')}
            onSkip={() => { setTopicRatings([]); setPhase('goalcompass') }}
          />
        </div>
      </div>
    )
  }

  // Step 3: The "Set your goal" step — Goal Compass with Ambition–Readiness Meter
  if (phase === 'goalcompass' || phase === 'generating') {
    return (
      <>
        <div ref={bgRef} className="min-h-screen flex" style={{ background: '#F5F7FC' }}>
          <SetupSidebar current={3} />
          <div className="flex-1 flex flex-col items-center justify-start px-4 py-8 lg:py-10 overflow-y-auto">
            <GoalCompass
              topicRatings={topicRatings}
              detectedYears={detectedYears}
              initialGoal={goalText}
              onCreate={handleCreatePlan}
              onBack={() => setPhase(resumeTopics.length > 0 ? 'topics' : 'intake')}
            />
            {error && phase !== 'generating' && (
              <p className="mt-4 text-center text-sm text-red-700 bg-red-100 rounded-lg py-2 px-4 max-w-md">
                {error}
              </p>
            )}
          </div>
        </div>
        {phase === 'generating' && (
          <GeneratingOverlay
            status={genStatus}
            onFinished={finishToRoadmap}
            onRetry={retryPlan}
            onBack={backToGoal}
          />
        )}
      </>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#F5F7FC' }}>
      <SetupSidebar current={1} />
      <div className="flex-1 flex flex-col items-center justify-start px-4 py-8 lg:py-10 overflow-y-auto">
        <div className="w-full max-w-[1140px] flex justify-center">
          {phase === 'chat' && (
            <div className="bg-white rounded-2xl border border-[#E1E6F0] shadow-[0_14px_38px_rgba(25,40,75,0.08)] p-8 max-w-2xl w-full">
              <h1 className="text-2xl font-bold text-[#0E1B38]">Let's map your path</h1>
              <p className="mt-2 text-sm text-[#52617D]">
                Describe your learning goal in your own words. Our AI will turn it into a
                personalized roadmap.
              </p>
              {topicRatings.length > 0 && (
                <p className="mt-3 text-xs text-[#5B36E9] bg-[#F5F1FF] rounded-lg px-3 py-2 border border-[#EFE9FF]">
                  Using {topicRatings.length} skill{topicRatings.length === 1 ? '' : 's'} from your resume to personalize recommendations.
                </p>
              )}
              <div className="mt-6">
                <ChatInput onSubmit={handleGoalSubmit} isLoading={isLoading} />
              </div>
            </div>
          )}

          {phase === 'confirm' && (
            <div className="w-full max-w-[1140px] flex justify-center">
              <GoalConfirm
                profile={extractedProfile}
                onConfirm={handleConfirm}
                onEdit={handleEditGoal}
              />
            </div>
          )}
        </div>

        {error && (
          <p className="mt-4 text-center text-sm text-red-700 bg-red-100 rounded-lg py-2 px-4 max-w-md">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
