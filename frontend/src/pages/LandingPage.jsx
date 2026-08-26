import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthScreen from '../components/auth/AuthScreen'
import { useAuth } from '../hooks/useAuth'

export default function LandingPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()

  // If the user already has a session, send them straight to the dashboard
  useEffect(() => {
    if (!loading && session) {
      navigate('/dashboard', { replace: true })
    }
  }, [session, loading, navigate])

  return <AuthScreen />
}
