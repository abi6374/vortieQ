import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import RoadmapTimeline from '../components/roadmap/RoadmapTimeline'
import AssistantChat from '../components/assistant/AssistantChat'
import apiClient from '../lib/apiClient'

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
  const [milestones, setMilestones] = useState([])
  const [loading, setLoading] = useState(Boolean(pathId))
  const [error, setError] = useState(null)

  const refetchPath = useCallback(async () => {
    if (!pathId) {
      setLoading(false)
      return
    }
    setError(null)
    try {
      const { data } = await apiClient.get(`/api/paths/${pathId}`)
      setMilestones(normalizePath(data))
    } catch (err) {
      setError('We could not load your roadmap. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [pathId])

  useEffect(() => {
    refetchPath()
  }, [refetchPath])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
        >
          ← PathAI
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          My Dashboard
        </button>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Your Learning Roadmap</h1>
        <p className="mt-1 text-sm text-gray-500">
          Milestones sequenced from foundational to advanced.
        </p>

        <div className="mt-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
            </div>
          ) : error ? (
            <div className="bg-white border border-red-200 rounded-2xl p-8 text-center shadow-sm">
              <p className="text-3xl">⚠️</p>
              <p className="mt-2 text-sm text-gray-700">{error}</p>
              <button
                onClick={() => {
                  setLoading(true)
                  refetchPath()
                }}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Try again
              </button>
            </div>
          ) : (
            <RoadmapTimeline milestones={milestones} onRefresh={refetchPath} />
          )}
        </div>
      </div>

      <AssistantChat pathId={pathId} />
    </div>
  )
}
