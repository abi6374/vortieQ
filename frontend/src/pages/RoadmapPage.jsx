import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RoadmapTimeline from '../components/roadmap/RoadmapTimeline'
import AssistantChat from '../components/assistant/AssistantChat'
import { useFeedback } from '../hooks/useFeedback'

const MOCK_MILESTONES = [
  {
    id: "m1",
    title: "Phase 1: Programming & Python Foundations",
    description: "Core algorithms, data structures, and Python environment setup.",
    estimated_weeks: 4,
    steps: [
      {
        id: "s1",
        why_recommended: "Builds rigorous coding fundamentals required for machine learning.",
        status: "completed",
        course: {
          title: "Python for Everybody Specialization",
          provider: "Coursera",
          description: "Learn Python fundamentals, data structures, and clean coding best practices.",
          skill_tags: ["python", "basics"],
          resource_url: "https://www.coursera.org"
        }
      },
      {
        id: "s2",
        why_recommended: "Mandatory prerequisite for data wrangling and numerical computing.",
        status: "in_progress",
        course: {
          title: "Applied Data Science with Python",
          provider: "Coursera",
          description: "Hands-on data analysis using Pandas, NumPy, and Scikit-Learn.",
          skill_tags: ["pandas", "numpy"],
          resource_url: "https://www.coursera.org"
        }
      }
    ]
  },
  {
    id: "m2",
    title: "Phase 2: Machine Learning & Deep Learning Core",
    description: "Statistical models, supervised algorithms, neural networks, and PyTorch.",
    estimated_weeks: 6,
    steps: [
      {
        id: "s3",
        why_recommended: "Industry standard grounding in optimization and gradient descent.",
        status: "not_started",
        course: {
          title: "Machine Learning Specialization",
          provider: "DeepLearning.AI",
          description: "Fundamental machine learning concepts, algorithms, and practical implementation.",
          skill_tags: ["machine learning", "pytorch"],
          resource_url: "https://www.deeplearning.ai"
        }
      }
    ]
  }
]

export default function RoadmapPage() {
  const [milestones, setMilestones] = useState(MOCK_MILESTONES)
  const { sendFeedback } = useFeedback()
  const navigate = useNavigate()

  const handleFeedback = async (stepId, action) => {
    await sendFeedback(stepId, action)
    setMilestones((prev) =>
      prev.map((m) => ({
        ...m,
        steps: m.steps.map((s) => (s.id === stepId ? { ...s, status: action === 'completed' ? 'completed' : 'skipped' } : s))
      }))
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 max-w-4xl mx-auto">
      <header className="flex justify-between items-center mb-8 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-100">Your AI Career Roadmap</h1>
          <p className="text-xs text-slate-400 mt-1">Structured milestones with prerequisite validation</p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition"
        >
          View Dashboard →
        </button>
      </header>

      <RoadmapTimeline milestones={milestones} onStepFeedback={handleFeedback} />
      <AssistantChat />
    </div>
  )
}
