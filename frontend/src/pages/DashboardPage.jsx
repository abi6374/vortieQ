import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import PersonalizedRoadmap from '../components/dashboard/PersonalizedRoadmap'

export default function DashboardPage() {
  const [path, setPath] = useState(null)

  async function fetchDashboardData() {
    try {
      const { data: paths } = await supabase
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

      setPath(paths?.[0] || null)
    } catch (err) {
      console.warn('Dashboard fetch note:', err)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  return <PersonalizedRoadmap pathData={path} />
}


