import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import PersonalizedRoadmap from '../components/dashboard/PersonalizedRoadmap'

export default function DashboardPage() {
  const [path, setPath] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  async function fetchDashboardData() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user?.id) {
        navigate('/')
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
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .order('generated_at', { ascending: false })
        .limit(1)

      if (paths && paths.length > 0) {
        setPath(paths[0])
      } else {
        // If user has not created a path yet, take them to onboarding
        navigate('/onboarding')
        return
      }
    } catch (err) {
      console.warn('Dashboard fetch note:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-[#0066cc] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <PersonalizedRoadmap pathData={path} />
}
