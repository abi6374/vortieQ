import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import ProgressHeader from '../components/dashboard/ProgressHeader'
import SkillMap from '../components/dashboard/SkillMap'
import NextActions from '../components/dashboard/NextActions'
import AssistantChat from '../components/assistant/AssistantChat'
import NavBar from '../components/ui/NavBar'
import ErrorCard from '../components/ui/ErrorCard'
import SkeletonBlock from '../components/ui/SkeletonBlock'

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="grid gap-6 md:grid-cols-3">
        <SkeletonBlock className="h-56 md:col-span-1" />
        <SkeletonBlock className="h-56 md:col-span-2" />
      </div>
      <SkeletonBlock className="h-8 w-40" />
      <SkeletonBlock className="h-28 w-full" />
      <SkeletonBlock className="h-28 w-3/4" />
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [path, setPath] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)

  async function fetchDashboardData() {
    setLoading(true)
    setError(null)
    const { data: paths, error: fetchError } = await supabase
      .from('learning_paths')
      .select(`
        id, goal_text, status, generated_at,
        path_steps (
          id, sequence_order, milestone_label, status, explanation,
          courses ( id, title, provider, difficulty, skill_tags, duration_hrs, resource_url )
        )
      `)
      .eq('status', 'active')
      .order('generated_at', { ascending: false })
      .limit(1)

    if (fetchError) {
      setError('Could not load your dashboard. Please try again.')
      setPath(null)
    } else {
      setPath(paths?.[0] || null)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Called by FeedbackButtons (via NextActions) after a successful feedback post.
  // If the backend adapted the path, surface a toast, then always re-fetch.
  const handleFeedback = async (response) => {
    if (response?.path_updated) {
      setToastMessage('✨ Path updated based on your feedback!')
      setTimeout(() => setToastMessage(null), 3000)
    }
    await fetchDashboardData()
  }

  // Derived data
  const allSteps = path?.path_steps || []
  const totalSteps = allSteps.length
  const completedSteps = allSteps.filter((s) => s.status === 'completed').length
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
  const skillsGained = [
    ...new Set(
      allSteps
        .filter((s) => s.status === 'completed')
        .flatMap((s) => s.courses?.skill_tags || [])
    ),
  ]
  const nextSteps = allSteps
    .filter((s) => s.status === 'not_started')
    .sort((a, b) => a.sequence_order - b.sequence_order)
    .slice(0, 3)

  return (
    <div className="min-h-screen bg-gray-50">
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg animate-bounce"
        >
          {toastMessage}
        </div>
      )}

      <NavBar>
        {path && (
          <Link
            to={`/roadmap/${path.id}`}
            className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
          >
            My Roadmap
          </Link>
        )}
      </NavBar>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Your Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Track your progress and take the next step.</p>
        </div>

        {loading && <DashboardSkeleton />}

        {!loading && error && <ErrorCard message={error} onRetry={fetchDashboardData} />}

        {!loading && !error && !path && (
          <div className="bg-white rounded-2xl shadow p-10 text-center max-w-lg mx-auto">
            <div className="text-6xl" aria-hidden="true">🗺️</div>
            <h2 className="mt-4 text-2xl font-bold text-gray-800">No learning path yet</h2>
            <p className="mt-2 text-gray-500">
              Tell us your goal and we'll build a personalized roadmap just for you.
            </p>
            <button
              onClick={() => navigate('/onboarding')}
              className="mt-6 inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-1"
            >
              Generate my first path →
            </button>
          </div>
        )}

        {!loading && !error && path && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-1">
                <ProgressHeader
                  percent={progressPercent}
                  totalSteps={totalSteps}
                  completedSteps={completedSteps}
                  pathId={path.id}
                />
              </div>
              <div className="md:col-span-2">
                <SkillMap skills={skillsGained} />
              </div>
            </div>

            <NextActions steps={nextSteps} pathId={path.id} onRefresh={handleFeedback} />
          </div>
        )}
      </div>

      {path && <AssistantChat pathId={path.id} />}
    </div>
  )
}
