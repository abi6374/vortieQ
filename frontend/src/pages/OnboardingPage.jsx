import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import ChatInput from '../components/onboarding/ChatInput'
import GoalConfirm from '../components/onboarding/GoalConfirm'
import GeneratingOverlay from '../components/onboarding/GeneratingOverlay'
import LearnerIntakeWorkspace from '../components/onboarding/LearnerIntakeWorkspace'
import GitHubIntegrationStep from '../components/onboarding/GitHubIntegrationStep'
import YourSkillsStep from '../components/onboarding/YourSkillsStep'
import SkillConfidenceStep from '../components/onboarding/SkillConfidenceStep'
import GoalCompass from '../components/onboarding/GoalCompass'
import SetupSidebar from '../components/onboarding/SetupSidebar'
import api, { genIdempotencyKey } from '../lib/apiClient'

/**
 * Onboarding is a 7-step unified wizard:
 *   1. Learner Intake (Resume upload + Background description)
 *   2. GitHub Integration (Optional - repository & stack extraction)
 *   3. Your Skill (Detected skills & stacks review)
 *   4. Your Confidence Level (Fine-tune level per skill)
 *   5. Set your Goal (Goal Compass & Ambition-Readiness)
 *   6. Create Roadmap (Generation overlay)
 *   7. Track Progress (Roadmap dashboard)
 */
export default function OnboardingPage() {
  const [phase, setPhase] = useState('intake') // 'intake' | 'github' | 'skills' | 'confidence' | 'goalcompass' | 'chat' | 'confirm' | 'generating'
  const [goalText, setGoalText] = useState('')
  const [extractedProfile, setExtractedProfile] = useState(null)
  const [resumeTopics, setResumeTopics] = useState([])       // from LLM/GitHub extraction
  const [detectedYears, setDetectedYears] = useState(0)
  const [topicRatings, setTopicRatings] = useState([])       // user-adjusted levels
  const [resumeEducation, setResumeEducation] = useState('')
  const [resumeProjects, setResumeProjects] = useState('')
  const [targetRoleOverride, setTargetRoleOverride] = useState('')
  const [githubData, setGithubData] = useState(null)
  const [hasExistingPath, setHasExistingPath] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [genStatus, setGenStatus] = useState('loading') // 'loading' | 'success' | 'error'
  const [pendingPathId, setPendingPathId] = useState(null)
  const lastPlanArgs = useRef(null)
  const planIdempotencyKey = useRef(null)
  const confirmIdempotencyKey = useRef(null)
  const bgRef = useRef(null)

  const { session, user } = useAuth()
  const navigate = useNavigate()

  // Check whether the user has an existing generated learning path (Replan / Recalibrate mode)
  useEffect(() => {
    let isMounted = true
    const checkExistingPath = async () => {
      if (!user) return
      try {
        const res = await api.get('/api/paths/active')
        if (isMounted && res?.data?.path_id) {
          setHasExistingPath(true)
          return
        }
      } catch {
        // Fallback check
        try {
          const res2 = await api.get('/api/roadmap')
          if (isMounted && res2?.data?.path_id) {
            setHasExistingPath(true)
            return
          }
        } catch {
          if (isMounted) setHasExistingPath(false)
        }
      }
    }
    checkExistingPath()
    return () => {
      isMounted = false
    }
  }, [user])

  // Ingest GitHub data automatically if the user authenticated directly via GitHub OAuth
  useEffect(() => {
    const isGithubUser =
      session?.provider_token ||
      user?.app_metadata?.provider === 'github' ||
      user?.user_metadata?.user_name ||
      window.location.search.includes('source=github')

    if (isGithubUser && !githubData) {
      const targetUser = user?.user_metadata?.user_name || user?.user_metadata?.preferred_username
      if (targetUser || session?.provider_token) {
        api.post('/api/profile/github', {
          token: session?.provider_token,
          username: targetUser || undefined,
        }).then((res) => {
          if (res?.data) {
            setGithubData(res.data)
            if (res.data.topics && res.data.topics.length > 0) {
              setResumeTopics(res.data.topics)
              setDetectedYears(res.data.detected_years_experience || 0)
            }
          }
        }).catch((err) => {
          console.warn('[Onboarding] GitHub profile ingestion note:', err)
        })
      }
    }
  }, [session, user])

  // Freeze the Goal Compass page (pointer + keyboard) while the overlay is open.
  useEffect(() => {
    if (bgRef.current) bgRef.current.inert = phase === 'generating'
  }, [phase])

  // ------------- Step 1: Intake (Resume and/or Natural-language notes)
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
    if (suggestedGoal && !(goalText || '').trim()) setGoalText(suggestedGoal)

    // Check if GitHub is already integrated
    const userId = user?.id || 'guest'
    const isGithubConnected =
      githubData?.topics?.length > 0 ||
      user?.app_metadata?.provider?.includes('github') ||
      user?.user_metadata?.user_name ||
      localStorage.getItem(`pf_github_preference_${userId}`) === 'connected'

    if (isGithubConnected) {
      // Already connected -> skip to Step 3: Your Skill
      setPhase('skills')
    } else {
      // Not connected -> proceed to Step 2: GitHub Integration
      setPhase('github')
    }
  }

  const handleChatIntake = (storyText) => {
    setGoalText(storyText || '')
    if (!githubData?.topics || githubData.topics.length === 0) {
      setResumeTopics([])
      setTopicRatings([])
      setDetectedYears(0)
    }
    setPhase('skills')
  }

  // ------------- Step 2: GitHub Integration callback
  const handleGithubSynced = (ghResult) => {
    setGithubData(ghResult)
    if (ghResult?.topics?.length > 0) {
      const existingNames = new Set(resumeTopics.map((t) => t.name.toLowerCase()))
      const merged = [...resumeTopics]
      for (const gt of ghResult.topics) {
        if (!existingNames.has(gt.name.toLowerCase())) {
          merged.push(gt)
        }
      }
      setResumeTopics(merged)
      setDetectedYears(Math.max(detectedYears, ghResult.detected_years_experience || 0))
    }
  }

  // ------------- Step 3: Your Skill continue → Step 4: Your Confidence Level
  const handleSkillsContinue = (updatedTopics) => {
    setResumeTopics(updatedTopics)
    setPhase('confidence')
  }

  // ------------- Step 4: Your Confidence Level continue → Step 5: Goal Compass
  const handleConfidenceContinue = (ratings) => {
    setTopicRatings(ratings)
    setPhase('goalcompass')
  }

  // ------------- Step 4: Goal Compass "Create my learning plan"
  const runPlan = async (goalTextInput, weeklyHours, targetRoleOverrideInput = '', targetWeeksInput = null) => {
    const prev = lastPlanArgs.current
    const isSameSubmission = prev
      && prev.goalTextInput === goalTextInput
      && prev.weeklyHours === weeklyHours
      && prev.targetRoleOverrideInput === targetRoleOverrideInput
      && prev.targetWeeksInput === targetWeeksInput
    if (!isSameSubmission) {
      planIdempotencyKey.current = null
    }
    if (!planIdempotencyKey.current) {
      planIdempotencyKey.current = genIdempotencyKey()
    }
    lastPlanArgs.current = { goalTextInput, weeklyHours, targetRoleOverrideInput, targetWeeksInput }
    if (targetRoleOverrideInput) setTargetRoleOverride(targetRoleOverrideInput)

    setGenStatus('loading')
    setError(null)
    setPhase('generating')

    try {
      const ratingsPayload = (topicRatings.length > 0 ? topicRatings : resumeTopics).map((t) => ({
        name: String(t.name || t.topic_name || t.skill_name || '').trim().slice(0, 100),
        level: String(t.suggested_level || t.level || t.self_rating || 'basic').toLowerCase().trim(),
        evidence: String(t.evidence || '').slice(0, 500),
        confidence_pct: typeof t.confidence_pct === 'number' ? Math.round(t.confidence_pct) : 80,
      })).filter((t) => t.name.length > 0)

      let effectiveTargetRole = targetRoleOverrideInput || targetRoleOverride
      if (!effectiveTargetRole && goalTextInput) {
        effectiveTargetRole = goalTextInput.trim().slice(0, 80)
      }

      const composed = weeklyHours
        ? `${goalTextInput || 'My Career Learning Goal'} I can study ${weeklyHours} hours per week.`
        : (goalTextInput || 'My Career Learning Goal')

      const profilePayload = {
        goal: goalTextInput,
        goal_text: composed,
        target_role: effectiveTargetRole || 'Software Engineer',
        target_role_override: effectiveTargetRole || 'Software Engineer',
        weekly_hours: weeklyHours || 10,
        target_weeks: targetWeeksInput || null,
        detected_years_experience: detectedYears || 0,
        years_experience: detectedYears || 0,
        topic_ratings: ratingsPayload,
        resume_education: resumeEducation || '',
        education: resumeEducation || '',
        resume_projects: resumeProjects || '',
        projects: resumeProjects || '',
      }

      const generatePayload = {
        goal_text: composed,
        target_role: effectiveTargetRole || 'Software Engineer',
        weekly_hours: weeklyHours || 10,
        target_weeks: targetWeeksInput || null,
        resume_topics: ratingsPayload,
      }

      const [_, genRes] = await Promise.all([
        api.post('/api/profile/', profilePayload).catch((err) => console.warn('Profile background sync:', err)),
        api.post('/api/paths/generate', generatePayload, {
          headers: { 'Idempotency-Key': planIdempotencyKey.current },
        }),
      ])

      if (genRes?.data && genRes.data.path_id) {
        setPendingPathId(genRes.data.path_id)
        planIdempotencyKey.current = null
        setGenStatus('success')
      } else {
        throw new Error('No path_id returned from generation')
      }
    } catch (err) {
      console.error('Plan generation failed:', err?.response?.data || err?.message || err)
      const detail = err?.response?.data?.detail
      const msg = typeof detail === 'string' ? detail : 'Failed to generate learning plan. Please try again.'
      setError(msg)
      setGenStatus('error')
    }
  }

  const handleCreatePlan = (goalTextInput, weeklyHours, targetRoleOverrideInput, targetWeeksInput) => {
    runPlan(goalTextInput, weeklyHours, targetRoleOverrideInput, targetWeeksInput)
  }

  const retryPlan = () => {
    if (lastPlanArgs.current) {
      const { goalTextInput, weeklyHours, targetRoleOverrideInput, targetWeeksInput } = lastPlanArgs.current
      runPlan(goalTextInput, weeklyHours, targetRoleOverrideInput, targetWeeksInput)
    } else {
      setPhase('goalcompass')
    }
  }

  const backToGoal = () => {
    setPhase('goalcompass')
  }

  const finishToRoadmap = () => {
    if (pendingPathId) {
      navigate(`/roadmap/${pendingPathId}`)
    } else {
      navigate('/dashboard')
    }
  }

  const handleGoalSubmit = async (goal) => {
    setGoalText(goal)
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.post('/api/profile/extract', {
        goal_text: goal,
        resume_topics: resumeTopics,
      })
      setExtractedProfile(res.data)
      setPhase('confirm')
    } catch (err) {
      setError('Could not process goal. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirm = async (confirmedProfile) => {
    setError(null)
    if (!confirmIdempotencyKey.current) {
      confirmIdempotencyKey.current = genIdempotencyKey()
    }
    try {
      const result = await api.post('/api/paths/generate', confirmedProfile, {
        headers: { 'Idempotency-Key': confirmIdempotencyKey.current },
      })
      confirmIdempotencyKey.current = null
      navigate(`/roadmap/${result.data.path_id}`)
    } catch (err) {
      setError('Path generation failed. Please try again.')
      setPhase('confirm')
    }
  }

  const handleEditGoal = () => {
    confirmIdempotencyKey.current = null
    setPhase('chat')
    setExtractedProfile(null)
  }

  // =========================================================================
  // VIEW RENDERING PER PHASE
  // =========================================================================

  // Step 1: Learner Intake (Resume Upload + Background Description)
  if (phase === 'intake' || phase === 'resume') {
    return (
      <div className="min-h-screen flex bg-[#f5f5f7] dark:bg-[#09090B]">
        <SetupSidebar current={1} />
        <div className="flex-1 flex flex-col items-center justify-start px-4 py-8 lg:py-10 overflow-y-auto">
          <LearnerIntakeWorkspace
            hasExistingPath={hasExistingPath}
            onExtracted={handleResumeExtracted}
            onChatSubmit={handleChatIntake}
            onSkip={() => setPhase('github')}
          />
        </div>
      </div>
    )
  }

  // Step 2: Dedicated GitHub Integration Step (Optional)
  if (phase === 'github') {
    return (
      <div className="min-h-screen flex bg-[#f5f5f7] dark:bg-[#09090B]">
        <SetupSidebar current={2} />
        <div className="flex-1 flex flex-col items-center justify-start px-4 py-8 lg:py-10 overflow-y-auto">
          <GitHubIntegrationStep
            githubData={githubData}
            hasExistingPath={hasExistingPath}
            onGithubSynced={handleGithubSynced}
            onContinue={() => setPhase('skills')}
            onSkip={() => setPhase('skills')}
          />
        </div>
      </div>
    )
  }

  // Step 3: Your Skill (Review & manage detected skills & stacks)
  if (phase === 'skills' || phase === 'topics') {
    return (
      <div className="min-h-screen flex bg-[#f5f5f7] dark:bg-[#09090B]">
        <SetupSidebar current={3} />
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 lg:py-10 overflow-y-auto">
          <YourSkillsStep
            topics={resumeTopics}
            detectedYears={detectedYears}
            onContinue={handleSkillsContinue}
            onBack={() => setPhase(githubData ? 'github' : 'intake')}
          />
        </div>
      </div>
    )
  }

  // Step 4: Your Confidence Level (Fine-tune level per skill)
  if (phase === 'confidence') {
    return (
      <div className="min-h-screen flex bg-[#f5f5f7] dark:bg-[#09090B]">
        <SetupSidebar current={4} />
        <div className="flex-1 flex flex-col items-center justify-start px-4 py-8 lg:py-10 overflow-y-auto">
          <SkillConfidenceStep
            topics={resumeTopics}
            detectedYears={detectedYears}
            onContinue={handleConfidenceContinue}
            onBack={() => setPhase('skills')}
          />
        </div>
      </div>
    )
  }

  // Step 5 & 6: Goal Compass & Generating Overlay
  if (phase === 'goalcompass' || phase === 'generating') {
    return (
      <>
        <div ref={bgRef} className="min-h-screen flex bg-[#f5f5f7] dark:bg-[#09090B]">
          <SetupSidebar current={phase === 'generating' ? 6 : 5} />
          <div className="flex-1 flex flex-col items-center justify-start px-4 py-8 lg:py-10 overflow-y-auto">
            <GoalCompass
              topicRatings={topicRatings.length > 0 ? topicRatings : resumeTopics}
              detectedYears={detectedYears}
              initialGoal={goalText}
              onCreate={handleCreatePlan}
              onBack={() => setPhase('confidence')}
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

  // Fallback Chat/Confirm Lanes
  return (
    <div className="min-h-screen flex bg-[#f5f5f7] dark:bg-[#09090B]">
      <SetupSidebar current={1} />
      <div className="flex-1 flex flex-col items-center justify-start px-4 py-8 lg:py-10 overflow-y-auto">
        <div className="w-full max-w-[1140px] flex justify-center">
          {phase === 'chat' && (
            <div className="bg-white dark:bg-[#121216] rounded-2xl border border-[#f0f0f0] dark:border-[#27272F] shadow-[0_14px_38px_rgba(0,0,0,0.4)] p-8 max-w-2xl w-full">
              <h1 className="text-2xl font-bold text-[#1d1d1f] dark:text-white">Let's map your path</h1>
              <p className="mt-2 text-sm text-[#555555] dark:text-[#94A3B8]">
                Describe your learning goal in your own words. Our AI will turn it into a personalized roadmap.
              </p>
              {topicRatings.length > 0 && (
                <p className="mt-3 text-xs text-[#0066cc] dark:text-[#C9D0D6] bg-[#eaf2fc] dark:bg-[#18181D] rounded-lg px-3 py-2 border border-[#cfe4fb] dark:border-[#27272F]">
                  Using {topicRatings.length} skill{topicRatings.length === 1 ? '' : 's'} from your profile to personalize recommendations.
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
