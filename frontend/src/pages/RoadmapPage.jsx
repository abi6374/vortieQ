import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import PersonalizedRoadmap from '../components/dashboard/PersonalizedRoadmap'

export default function RoadmapPage() {
  const { pathId } = useParams()
  const [path, setPath] = useState(null)

  useEffect(() => {
    async function fetchPath() {
      if (!pathId) return
      try {
        const { data, error } = await supabase
          .from('learning_paths')
          .select(`
            id, goal_text, status, generated_at,
            path_steps (
              id, sequence_order, milestone_label, status, explanation,
              courses ( id, title, provider, difficulty, skill_tags, duration_hrs, resource_url )
            )
          `)
          .eq('id', pathId)
          .single()
        if (error) {
          console.warn('Roadmap page fetch error:', error)
        } else if (data) {
          setPath(data)
        }
      } catch (err) {
        console.warn('Roadmap page fetch note:', err)
      }
    }
    fetchPath()
  }, [pathId])

  return <PersonalizedRoadmap pathData={path || (pathId ? { id: pathId } : null)} />
}


