import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function ProtectedRoute({ children }) {
  const { session, user, loading } = useAuth()
  // No separate bypass check here: AuthContext.getDevBypassUser() already
  // produces a real (DEV-build-only) session.user for the dev/e2e flags, so
  // session?.user / user already cover it. This route guard previously had
  // its OWN parallel `isBypass` OR-clause with zero import.meta.env.DEV
  // gate - the single most security-critical place to have had an
  // ungated bypass, since it's literally the check deciding whether to let
  // a request past the auth wall in production.
  const isAuth = session?.user || user
  const isBypass = import.meta.env.DEV && typeof window !== 'undefined' &&
    (window.localStorage.getItem('e2e_mock_auth') === 'true' || window.localStorage.getItem('pf_dev_bypass') === 'true')

  const isOAuthCallback =
    typeof window !== 'undefined' &&
    (window.location.hash.includes('access_token') ||
      window.location.search.includes('code=') ||
      window.location.search.includes('source=github'))

  if ((loading && !isBypass) || (isOAuthCallback && !isAuth)) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f5f7] dark:bg-[#0B0E14]">
        <div className="w-10 h-10 border-[3px] border-[#0066cc]/25 dark:border-[#38BDF8]/25 border-t-[#0066cc] dark:border-t-[#38BDF8] rounded-full animate-spin" />
      </div>
    )
  }
  if (!isAuth) {
    return <Navigate to="/auth" replace />
  }
  return children
}
