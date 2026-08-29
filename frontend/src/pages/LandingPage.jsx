import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthScreen from '../components/auth/AuthScreen'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'

export default function LandingPage() {
  const { session, user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    const activeUser = session?.user || user
    if (!activeUser) return

    let cancelled = false
    async function handleAuthRedirect() {
      try {
        const { data: paths } = await supabase
          .from('learning_paths')
          .select('id')
          .eq('status', 'active')
          .limit(1)

        if (cancelled) return
        if (paths && paths.length > 0) {
          navigate('/dashboard', { replace: true })
        } else {
          navigate('/onboarding', { replace: true })
        }
      } catch {
        if (!cancelled) {
          navigate('/onboarding', { replace: true })
        }
      }
    }

    handleAuthRedirect()
    return () => {
      cancelled = true
    }
  }, [session, user, loading, navigate])

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f5f5f7]">
        <div className="animate-spin rounded-full h-9 w-9 border-3 border-[#0066cc] border-t-transparent"></div>
      </div>
    )
  }

  return <AuthScreen />
}
