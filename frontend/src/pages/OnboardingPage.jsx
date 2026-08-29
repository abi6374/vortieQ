import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
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
 * Onboarding is a wizard with multiple entry lanes:
 *   1. GitHub OAuth → Repos & stack analyzed automatically; Step 1 optional
 *   2. Skip resume / Chat → phase = 'intake' → 'topics' → 'goalcompass' → 'generating'
 *   3. Upload resume → phase = 'intake' → 'topics' → 'goalcompass' → 'generating'
 */
export default function OnboardingPage() {
  const [phase, setPhase] = useState('intake') // 'intake' | 'topics' | 'goalcompass' | 'chat' | 'confirm' | 'generating'
  const [goalText, setGoalText] = useState('')
  const [extractedProfile, setExtractedProfile] = useState(null)
  const [resumeTopics, setResumeTopics] = useState([])       // from LLM/GitHub extraction
  const [detectedYears, setDetectedYears] = useState(0)
  const [topicRatings, setTopicRatings] = useState([])       // user-adjusted levels
  // Real resume context beyond just skills - folded into the profile
  // extraction call so the "AI Profile Draft" the learner sees actually
  // shapes their recommendations, not just displayed and discarded.
  const [resumeEducation, setResumeEducation] = useState('')
  const [resumeProjects, setResumeProjects] = useState('')
  const [targetRoleOverride, setTargetRoleOverride] = useState('')
  const [githubData, setGithubData] = useState(null)
  const [githubLoading, setGithubLoading] = useState(false)
  const [githubSyncError, setGithubSyncError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [genStatus, setGenStatus] = useState('loading') // 'loading' | 'success' | 'error'
  const [pendingPathId, setPendingPathId] = useState(null)
  const lastPlanArgs = useRef(null)
  const bgRef = useRef(null)

  const { session, user } = useAuth()
  const navigate = useNavigate()

  // Ingest GitHub data if the user authenticated via GitHub
  useEffect(() => {
    const isGithubUser =
      session?.provider_token ||
      user?.app_metadata?.provider === 'github' ||
      user?.user_metadata?.user_name ||
      window.location.search.includes('source=github')

    if (isGithubUser && !githubData) {
      const targetUser = user?.user_metadata?.user_name || user?.user_metadata?.preferred_username
      handleSyncGithub(targetUser)
    }
  }, [session, user])

  const handleSyncGithub = async (customUsername) => {
    const targetUsername = (customUsername || user?.user_metadata?.user_name || user?.user_metadata?.preferred_username || '').trim()
    if (!targetUsername && !session?.provider_token) return
    setGithubLoading(true)
    setGithubSyncError('')
    try {
      const res = await api.post('/api/profile/github', {
        token: session?.provider_token,
        username: targetUsername || undefined,
      })
      if (res?.data) {
        setGithubData(res.data)
        if (res.data.topics && res.data.topics.length > 0) {
          setResumeTopics(res.data.topics)
          setDetectedYears(res.data.detected_years_experience || 0)
        }
      }
    } catch (err) {
      // Previously this only console.warn'd - a nonexistent username or a
      // rate-limit both failed completely silently, with no way for the
      // learner to tell why nothing happened. Surface the backend's real
      // detail (e.g. "GitHub user '@x' was not found...") instead.
      console.warn('[Onboarding] GitHub profile ingestion note:', err)
      setGithubSyncError(
        err?.response?.data?.detail || 'Could not sync your GitHub profile. Please try again.'
      )
    } finally {
      setGithubLoading(false)
    }
  }

  // Freeze the Goal Compass page (pointer + keyboard) while the overlay is open.
  useEffect(() => {
    if (bgRef.current) bgRef.current.inert = phase === 'generating'
  }, [phase])

  // ------------- Step 1: Intake (Resume, GitHub, or Natural-language notes)
  const handleResumeExtracted = (topics, years, education = '', projects = '', suggestedGoal = '') => {
    // If GitHub topics were already loaded, merge them cleanly
    const existingNames = new Set((topics || []).map((t) => t.name.toLowerCase()))
    const merged = [...(topics || [])]
    if (githubData?.topics) {
      for (const gt of githubData.topics) {
        if (!existingNames.has(gt.name.toLowerCase())) {
          merged.push(gt)
        }
      }
    }
    const finalYears = Math.max(years || 0, detectedYears || 0)
    setResumeTopics(merged)
    setDetectedYears(finalYears)
    if (education) setResumeEducation(education)
    if (projects) setResumeProjects(projects)
    // Pre-fill the goal box with the resume's own inferred goal - only if
    // the learner hasn't already typed a goal elsewhere (chat lane), never
    // overwrites something they wrote themselves.
    if (suggestedGoal && !goalText.trim()) setGoalText(suggestedGoal)
    setPhase(merged && merged.length > 0 ? 'topics' : 'goalcompass')
  }

  const handleChatIntake = (storyText) => {
    setGoalText(storyText || '')
    // Preserve GitHub topics if available, else empty
    if (!githubData?.topics || githubData.topics.length === 0) {
      setResumeTopics([])
      setTopicRatings([])
      setDetectedYears(0)
    }
    setPhase('goalcompass')
  }

  // ------------- topic ratings step → Goal Compass (skills in hand)
  const handleTopicsContinue = (ratings) => {
    setTopicRatings(ratings)
    setPhase('goalcompass')
  }

  // ------------- Goal Compass "Create my learning plan"
  const runPlan = async (goalTextInput, weeklyHours, targetRoleOverrideInput = '') => {
    lastPlanArgs.current = { goalTextInput, weeklyHours, targetRoleOverrideInput }
    if (targetRoleOverrideInput) setTargetRoleOverride(targetRoleOverrideInput)
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
      // Real resume context (education/projects) so the profile the LLM
      // extracts actually reflects the full "AI Profile Draft", not just
      // skills - and the explicit role the learner selected/typed, which
      // should win over whatever the LLM separately infers from goal_text.
      if (resumeEducation) body.resume_education = resumeEducation
      if (resumeProjects) body.resume_projects = resumeProjects
      const roleOverride = targetRoleOverrideInput || targetRoleOverride
      if (roleOverride) body.target_role_override = roleOverride
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
    if (a) runPlan(a.goalTextInput, a.weeklyHours, a.targetRoleOverrideInput)
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
      <div className="min-h-screen flex bg-[#f5f5f7] dark:bg-[#0B0E14]">
        <SetupSidebar current={1} />
        <div className="flex-1 flex flex-col items-center justify-start px-4 py-8 lg:py-10 overflow-y-auto">
          <LearnerIntakeWorkspace
            githubData={githubData}
            githubLoading={githubLoading}
            githubSyncError={githubSyncError}
            authenticatedUsername={user?.user_metadata?.user_name || user?.user_metadata?.preferred_username || ''}
            onSyncGithub={handleSyncGithub}
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
      <div className="min-h-screen flex bg-[#f5f5f7] dark:bg-[#0B0E14]">
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
        <div ref={bgRef} className="min-h-screen flex bg-[#f5f5f7] dark:bg-[#0B0E14]">
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
    <div className="min-h-screen flex bg-[#f5f5f7] dark:bg-[#0B0E14]">
      <SetupSidebar current={1} />
      <div className="flex-1 flex flex-col items-center justify-start px-4 py-8 lg:py-10 overflow-y-auto">
        <div className="w-full max-w-[1140px] flex justify-center">
          {phase === 'chat' && (
            <div className="bg-white rounded-2xl border border-[#f0f0f0] shadow-[0_14px_38px_rgba(25,49,75,0.08)] p-8 max-w-2xl w-full">
              <h1 className="text-2xl font-bold text-[#1d1d1f]">Let's map your path</h1>
              <p className="mt-2 text-sm text-[#333333]">
                Describe your learning goal in your own words. Our AI will turn it into a
                personalized roadmap.
              </p>
              {topicRatings.length > 0 && (
                <p className="mt-3 text-xs text-[#0066cc] bg-[#eaf2fc] rounded-lg px-3 py-2 border border-[#eaf2fc]">
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
