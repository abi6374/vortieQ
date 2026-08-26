import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ChatInput from '../components/onboarding/ChatInput'
import GoalConfirm from '../components/onboarding/GoalConfirm'
import GeneratingLoader from '../components/onboarding/GeneratingLoader'
import api from '../lib/apiClient'

export default function OnboardingPage() {
  const [stage, setStage] = useState('input') // 'input' | 'confirm' | 'generating'
  const [profile, setProfile] = useState(null)
  const navigate = useNavigate()

  const handleGoalSubmit = async (goalText) => {
    try {
      const res = await api.post('/api/profile', { goal_text: goalText })
      setProfile(res.data)
      setStage('confirm')
    } catch (err) {
      console.error(err)
      // Dev fallback
      setProfile({
        target_role: "Machine Learning Engineer",
        current_skill_level: "beginner",
        time_commitment_hrs_per_week: 10,
        learning_style: "hands-on",
        interests: ["Python", "PyTorch", "NLP", "FastAPI"]
      })
      setStage('confirm')
    }
  }

  const handleConfirm = async () => {
    setStage('generating')
    try {
      const res = await api.post('/api/paths/generate')
      setTimeout(() => {
        navigate('/roadmap')
      }, 3000)
    } catch (err) {
      console.error(err)
      setTimeout(() => {
        navigate('/roadmap')
      }, 3000)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-center">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-slate-100">Tell Us Your Career Ambition</h2>
        <p className="text-xs text-slate-400 mt-1">Our AI extracts your skill baseline and builds a tailored path</p>
      </div>

      {stage === 'input' && <ChatInput onSubmit={handleGoalSubmit} />}
      {stage === 'confirm' && (
        <GoalConfirm
          profile={profile}
          onConfirm={handleConfirm}
          onEdit={() => setStage('input')}
        />
      )}
      {stage === 'generating' && <GeneratingLoader />}
    </div>
  )
}
