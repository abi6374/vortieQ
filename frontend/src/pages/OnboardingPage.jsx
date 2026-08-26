import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ChatInput from '../components/onboarding/ChatInput'
import GoalConfirm from '../components/onboarding/GoalConfirm'
import GeneratingLoader from '../components/onboarding/GeneratingLoader'
import ResumeUpload from '../components/onboarding/ResumeUpload'
import TopicRatingList from '../components/onboarding/TopicRatingList'
import NavBar from '../components/ui/NavBar'
import api from '../lib/apiClient'

/**
 * Onboarding is a wizard with two entry lanes:
 *   1. Skip resume → phase = 'chat' → 'confirm' → 'generating' (the original flow)
 *   2. Upload resume → phase = 'resume' → 'topics' → 'chat' → 'confirm' → 'generating'
 * At submit time, topic ratings (if any) ride along on the POST /api/profile/ call
 * as `topic_ratings`, which the backend merges into the learner profile.
 */
export default function OnboardingPage() {
  const [phase, setPhase] = useState('resume') // 'resume' | 'topics' | 'chat' | 'confirm' | 'generating'
  const [goalText, setGoalText] = useState('')
  const [extractedProfile, setExtractedProfile] = useState(null)
  const [resumeTopics, setResumeTopics] = useState([])       // from LLM extraction
  const [detectedYears, setDetectedYears] = useState(0)
  const [topicRatings, setTopicRatings] = useState([])       // user-adjusted levels
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const navigate = useNavigate()

  // ------------- resume step
  const handleResumeExtracted = (topics, years) => {
    setResumeTopics(topics)
    setDetectedYears(years)
    setPhase(topics.length > 0 ? 'topics' : 'chat')
  }

  // ------------- topic ratings step
  const handleTopicsContinue = (ratings) => {
    setTopicRatings(ratings)
    setPhase('chat')
  }

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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-900 to-blue-900">
      <NavBar />
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full flex justify-center">
          {phase === 'resume' && (
            <ResumeUpload
              onExtracted={handleResumeExtracted}
              onSkip={() => setPhase('chat')}
            />
          )}

          {phase === 'topics' && (
            <TopicRatingList
              topics={resumeTopics}
              detectedYears={detectedYears}
              onContinue={handleTopicsContinue}
              onBack={() => setPhase('resume')}
              onSkip={() => { setTopicRatings([]); setPhase('chat') }}
            />
          )}

          {phase === 'chat' && (
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
              <h1 className="text-2xl font-bold text-gray-900">Let's map your path</h1>
              <p className="mt-2 text-sm text-gray-600">
                Describe your learning goal in your own words. Our AI will turn it into a
                personalized roadmap.
              </p>
              {topicRatings.length > 0 && (
                <p className="mt-3 text-xs text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2">
                  Using {topicRatings.length} skill{topicRatings.length === 1 ? '' : 's'} from your resume to personalize recommendations.
                </p>
              )}
              <div className="mt-6">
                <ChatInput onSubmit={handleGoalSubmit} isLoading={isLoading} />
              </div>
            </div>
          )}

          {phase === 'confirm' && (
            <GoalConfirm
              profile={extractedProfile}
              onConfirm={handleConfirm}
              onEdit={handleEditGoal}
            />
          )}

          {phase === 'generating' && <GeneratingLoader />}
        </div>

        {error && (
          <p className="mt-4 text-center text-sm text-red-200 bg-red-900/40 rounded-lg py-2 px-4 max-w-md">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
