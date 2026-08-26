import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import RoadmapTimeline from '../components/roadmap/RoadmapTimeline'
import AssistantChat from '../components/assistant/AssistantChat'
import NavBar from '../components/ui/NavBar'
import ErrorCard from '../components/ui/ErrorCard'
import SkeletonBlock from '../components/ui/SkeletonBlock'
import apiClient from '../lib/apiClient'
import RebuildTailButton from '../components/roadmap/RebuildTailButton'

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

function RoadmapSkeleton() {
  return (
    <div className="space-y-6 pl-10" aria-hidden="true">
      <SkeletonBlock className="h-24 w-full" />
      <SkeletonBlock className="h-24 w-full" />
      <SkeletonBlock className="h-24 w-3/4" />
    </div>
  )
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

  const handleRetry = () => {
    setLoading(true)
    refetchPath()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
        >
          My Dashboard
        </button>
      </NavBar>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Your Learning Roadmap</h1>
        <p className="mt-1 text-sm text-gray-500">
          Milestones sequenced from foundational to advanced.
        </p>

        <div className="mt-8">
          {loading ? (
            <RoadmapSkeleton />
          ) : error ? (
            <ErrorCard message={error} onRetry={handleRetry} />
          ) : (
            <>
              <RoadmapTimeline milestones={milestones} onRefresh={refetchPath} />
              <RebuildTailButton pathId={pathId} onDone={refetchPath} />
            </>
          )}
        </div>
      </div>

      <AssistantChat pathId={pathId} />
    </div>
  )
}
