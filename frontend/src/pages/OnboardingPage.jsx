import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ChatInput from '../components/onboarding/ChatInput'
import GoalConfirm from '../components/onboarding/GoalConfirm'
import GeneratingLoader from '../components/onboarding/GeneratingLoader'
import api from '../lib/apiClient'

export default function OnboardingPage() {
  const [phase, setPhase] = useState('chat') // 'chat' | 'confirm' | 'generating'
  const [goalText, setGoalText] = useState('')
  const [extractedProfile, setExtractedProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const navigate = useNavigate()

  const handleGoalSubmit = async (text) => {
    setGoalText(text)
    setError(null)
    setIsLoading(true)
    try {
      // Trailing slash matches the FastAPI route (POST /api/profile/) and avoids a 307 redirect
      const result = await api.post('/api/profile/', { goal_text: text })
      setExtractedProfile(result.data)
      setPhase('confirm')
    } catch (err) {
      setError('Could not process your goal. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

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

  const handleEdit = () => {
    setPhase('chat')
    setExtractedProfile(null)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 to-blue-900 px-4 py-12">
      <div className="w-full max-w-2xl">
        {phase === 'chat' && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h1 className="text-2xl font-bold text-gray-900">Let's map your path</h1>
            <p className="mt-2 text-sm text-gray-600">
              Describe your learning goal in your own words. Our AI will turn it into a
              personalized roadmap.
            </p>
            <div className="mt-6">
              <ChatInput onSubmit={handleGoalSubmit} isLoading={isLoading} />
            </div>
          </div>
        )}

        {phase === 'confirm' && (
          <GoalConfirm
            profile={extractedProfile}
            onConfirm={handleConfirm}
            onEdit={handleEdit}
          />
        )}

        {phase === 'generating' && <GeneratingLoader />}

        {error && (
          <p className="mt-4 text-center text-sm text-red-200 bg-red-900/40 rounded-lg py-2 px-4">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
