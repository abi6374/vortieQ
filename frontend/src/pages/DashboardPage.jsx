import React from 'react'
import { useNavigate } from 'react-router-dom'
import ProgressHeader from '../components/dashboard/ProgressHeader'
import SkillMap from '../components/dashboard/SkillMap'
import NextActions from '../components/dashboard/NextActions'
import AssistantChat from '../components/assistant/AssistantChat'
import { useAuth } from '../hooks/useAuth'

export default function DashboardPage() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleFeedback = (stepId, action) => {
    alert(`Action: ${action} recorded for step ${stepId}`)
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 max-w-5xl mx-auto space-y-6">
      <header className="flex justify-between items-center pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-sm">
            V
          </div>
          <h1 className="text-lg font-bold text-slate-100">Learner Overview</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/roadmap')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
          >
            Roadmap Timeline
          </button>
          <button
            onClick={signOut}
            className="px-3 py-1.5 bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 text-xs rounded-lg transition border border-slate-700"
          >
            Sign Out
          </button>
        </div>
      </header>

      <ProgressHeader totalSteps={8} completedSteps={3} targetRole="Machine Learning Engineer" />

      <div className="grid md:grid-cols-2 gap-6">
        <SkillMap skills={["Python 3.11", "Pandas", "Scikit-Learn", "FastAPI", "Vector Search"]} />
        <NextActions
          currentStep={{
            id: "step-2",
            title: "Applied Data Science with Python",
            description: "Complete hands-on pandas filtering and exploratory data analysis project."
          }}
          onFeedback={handleFeedback}
        />
      </div>

      <AssistantChat />
    </div>
  )
}
