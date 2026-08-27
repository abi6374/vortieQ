import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import PathFinderWorkspace from '../components/dashboard/PathFinderWorkspace'
import NavBar from '../components/ui/NavBar'
import ErrorCard from '../components/ui/ErrorCard'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [path, setPath] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)

  async function fetchDashboardData() {
    setLoading(true)
    setError(null)
    try {
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
        // Not fatal, workspace fallback remains fully functional
        console.warn('Dashboard data fetch note:', fetchError.message)
      } else {
        setPath(paths?.[0] || null)
      }
    } catch (err) {
      console.warn('Dashboard fetch exception:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  return (
    <div className="min-h-screen bg-[#F5F7FC] text-[#0E1B38] flex flex-col font-['Inter',sans-serif]">
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#5B36E9] text-white font-semibold px-6 py-3 rounded-xl shadow-xl animate-bounce"
        >
          {toastMessage}
        </div>
      )}

      <NavBar>
        {path ? (
          <Link
            to={`/roadmap/${path.id}`}
            className="text-xs sm:text-sm font-bold bg-[#5B36E9] text-white hover:bg-[#4826C9] px-3.5 py-1.5 rounded-lg transition-colors shadow-sm"
          >
            Open Roadmap
          </Link>
        ) : (
          <button
            onClick={() => navigate('/onboarding')}
            className="text-xs sm:text-sm font-bold bg-[#5B36E9] text-white hover:bg-[#4826C9] px-3.5 py-1.5 rounded-lg transition-colors shadow-sm"
          >
            Goal Compass →
          </button>
        )}
      </NavBar>

      <main className="flex-1 flex flex-col items-center justify-start">
        {error && (
          <div className="max-w-4xl mx-auto px-4 mt-6 w-full">
            <ErrorCard message={error} onRetry={fetchDashboardData} />
          </div>
        )}

        <PathFinderWorkspace pathData={path} />
      </main>
    </div>
  )
}

