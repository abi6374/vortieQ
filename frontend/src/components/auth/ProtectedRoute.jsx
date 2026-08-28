import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function ProtectedRoute({ children }) {
  const { session, user, loading } = useAuth()
  const isAuth = session?.user || user

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f5f7]">
        <div className="animate-spin rounded-full h-9 w-9 border-3 border-[#0066cc] border-t-transparent"></div>
      </div>
    )
  }
  if (!isAuth) {
    return <Navigate to="/" replace />
  }
  return children
}
