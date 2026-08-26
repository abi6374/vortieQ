import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'
import ProgressHeader from '../components/dashboard/ProgressHeader'
import SkillMap from '../components/dashboard/SkillMap'
import NextActions from '../components/dashboard/NextActions'

export default function DashboardPage() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [path, setPath] = useState(null)

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

  const TopNav = () => (
    <header className="flex items-center justify-between mb-8">
      <span className="text-xl font-bold text-indigo-600">PathAI</span>
      <div className="flex items-center gap-4">
        {path && (
          <Link
            to={`/roadmap/${path.id}`}
            className="text-sm font-medium text-gray-600 hover:text-indigo-600"
          >
            My Roadmap
          </Link>
        )}
        <button
          onClick={signOut}
          className="text-sm font-medium text-gray-500 hover:text-gray-800"
        >
          Sign Out
        </button>
      </div>
    </header>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <TopNav />

        {loading && (
          <div className="text-center text-gray-500 py-20">Loading your dashboard…</div>
        )}

        {!loading && error && (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && !path && (
          <div className="bg-white rounded-2xl shadow p-10 text-center max-w-lg mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No active learning path yet</h2>
            <p className="text-gray-500 mb-6">
              Tell us your goal and we'll build a personalized roadmap just for you.
            </p>
            <button
              onClick={() => navigate('/onboarding')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
            >
              Create your path
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

            <NextActions
              steps={nextSteps}
              pathId={path.id}
              onRefresh={fetchDashboardData}
            />
          </div>
        )}
      </div>
    </div>
  )
}
