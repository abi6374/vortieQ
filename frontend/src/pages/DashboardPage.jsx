import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'
import PersonalizedRoadmap from '../components/dashboard/PersonalizedRoadmap'

export default function DashboardPage() {
  const [path, setPath] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user, session } = useAuth()
  const navigate = useNavigate()

  async function fetchDashboardData() {
    try {
      const activeUser = session?.user || user
      if (!activeUser?.id) {
        setLoading(false)
        return
      }

      const { data: paths } = await supabase
        .from('learning_paths')
        .select(`
          id, goal_text, status, generated_at,
          path_steps (
            id, sequence_order, milestone_label, status, explanation,
            courses ( id, title, provider, difficulty, skill_tags, duration_hrs, resource_url )
          )
        `)
        .eq('user_id', activeUser.id)
        .eq('status', 'active')
        .order('generated_at', { ascending: false })
        .limit(1)

      if (paths && paths.length > 0) {
        setPath(paths[0])
      }
    } catch (err) {
      console.warn('Dashboard fetch note:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [session, user])

  useEffect(() => {
    if (!loading && !path) {
      const isDevBypass = typeof window !== 'undefined' && window.localStorage?.getItem('pf_dev_bypass') === 'true'
      if (!isDevBypass) {
        navigate('/onboarding', { replace: true })
      }
    }
  }, [loading, path, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#0B0E14] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-[#0066cc] dark:border-[#38BDF8] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <PersonalizedRoadmap pathData={path} />
}
