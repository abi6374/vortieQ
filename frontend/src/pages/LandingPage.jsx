import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthCard from '../components/auth/AuthCard'
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 to-blue-900 px-4 py-12">
      <div className="flex flex-col items-center text-center mb-8">
        <span className="text-5xl mb-4" role="img" aria-label="brain">
          🧠
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
          PathAI
        </h1>
        <p className="mt-3 text-indigo-200 text-sm sm:text-base max-w-md">
          Your AI-powered career learning roadmap — personalized to your goals
        </p>
      </div>

      <AuthCard />
    </div>
  )
}
