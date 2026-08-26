import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import RoadmapTimeline from '../components/roadmap/RoadmapTimeline'
import AssistantChat from '../components/assistant/AssistantChat'
import apiClient from '../lib/apiClient'

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
        status: "not_started",
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

// Normalize the backend GET /api/paths/{id} shape into the shape the roadmap
// components expect (milestone.title / step.course / step.why_recommended).
function normalizePath(data) {
  const milestones = data?.milestones || []
  return milestones.map((m, idx) => ({
    id: `${data.path_id || 'path'}-m${idx}`,
    title: m.label || `Milestone ${idx + 1}`,
    description: m.rationale || '',
    estimated_weeks: m.estimated_weeks,
    steps: (m.steps || []).map((s) => ({
      id: s.step_id || s.id,
      status: s.status || 'not_started',
      why_recommended: s.explanation || s.why_recommended || '',
      course: {
        title: s.title,
        provider: s.provider,
        description: s.description || '',
        difficulty: s.difficulty,
        duration_hrs: s.duration_hrs,
        skill_tags: s.skill_tags || [],
        resource_url: s.resource_url,
      },
    })),
  }))
}

export default function RoadmapPage() {
  const { pathId } = useParams()
  const navigate = useNavigate()
  const [milestones, setMilestones] = useState(MOCK_MILESTONES)
  const [loading, setLoading] = useState(Boolean(pathId))
  const [usingMock, setUsingMock] = useState(!pathId)

  const refetchPath = useCallback(async () => {
    if (!pathId) return
    try {
      const { data } = await apiClient.get(`/api/paths/${pathId}`)
      const normalized = normalizePath(data)
      if (normalized.length > 0) {
        setMilestones(normalized)
        setUsingMock(false)
      }
    } catch (err) {
      // Backend not reachable (e.g. demo mode) — keep whatever is on screen.
      console.warn('Could not load path, showing sample roadmap:', err?.message)
    } finally {
      setLoading(false)
    }
  }, [pathId])

  useEffect(() => {
    refetchPath()
  }, [refetchPath])

  return (
    <div className="min-h-screen bg-slate-950 p-6 max-w-4xl mx-auto">
      <header className="flex justify-between items-center mb-8 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-100">Your AI Career Roadmap</h1>
          <p className="text-xs text-slate-400 mt-1">
            Structured milestones with prerequisite validation
            {usingMock && ' · sample preview'}
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition"
        >
          View Dashboard →
        </button>
      </header>

      {loading ? (
        <div className="text-slate-500 text-sm py-16 text-center">Loading your roadmap…</div>
      ) : (
        <RoadmapTimeline milestones={milestones} onRefresh={refetchPath} />
      )}

      <AssistantChat />
    </div>
  )
}
