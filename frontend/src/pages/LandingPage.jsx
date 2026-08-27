import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthScreen from '../components/auth/AuthScreen'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'

export default function LandingPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    async function handleAuthRedirect() {
      if (!loading && session?.user) {
        try {
          // Check if user already completed onboarding and has an active path
          const { data: paths } = await supabase
            .from('learning_paths')
            .select('id')
            .eq('status', 'active')
            .limit(1)

          if (paths && paths.length > 0) {
            navigate('/dashboard', { replace: true })
          } else {
            navigate('/onboarding', { replace: true })
          }
        } catch {
          navigate('/onboarding', { replace: true })
        }
      }
    }

    handleAuthRedirect()
  }, [session, loading, navigate])

  return <AuthScreen />
}
