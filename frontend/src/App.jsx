import React, { Suspense, lazy, Component } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { AIChatProvider } from './contexts/AIChatContext'
import { SidebarProvider } from './contexts/SidebarContext'
import AIChat from './components/ui/AIChat'
import ProtectedRoute from './components/auth/ProtectedRoute'
import BackToTop from './components/ui/BackToTop'

/**
 * Robust lazy import with automatic single retry / reload.
 * Handles cases where a new production deployment replaces chunk hashes while a client has an older page loaded.
 */
function lazyWithRetry(componentImport) {
  return lazy(async () => {
    const pageHasBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('pf_chunk_retry') || 'false'
    )

    try {
      const component = await componentImport()
      window.sessionStorage.setItem('pf_chunk_retry', 'false')
      return component
    } catch (error) {
      console.warn('Chunk import failed, attempting reload for new version:', error)
      if (!pageHasBeenForceRefreshed) {
        window.sessionStorage.setItem('pf_chunk_retry', 'true')
        window.location.reload()
        return new Promise(() => {}) // keep in loading state until reload happens
      }
      throw error
    }
  })
}

// Route-level code splitting with auto-recovery on new deployment builds
const LandingPage = lazyWithRetry(() => import('./pages/LandingPage'))
const AuthScreen = lazyWithRetry(() => import('./components/auth/AuthScreen'))
const OnboardingPage = lazyWithRetry(() => import('./pages/OnboardingPage'))
const RoadmapPage = lazyWithRetry(() => import('./pages/RoadmapPage'))
const DashboardPage = lazyWithRetry(() => import('./pages/DashboardPage'))
const ProgressPage = lazyWithRetry(() => import('./pages/ProgressPage'))
const SkillInsightsPage = lazyWithRetry(() => import('./pages/SkillInsightsPage'))
const ResourcesPage = lazyWithRetry(() => import('./pages/ResourcesPage'))
const AccountPage = lazyWithRetry(() => import('./pages/AccountPage'))
const SettingsPage = lazyWithRetry(() => import('./pages/SettingsPage'))
const CoachPage = lazyWithRetry(() => import('./pages/CoachPage'))
const InterviewPage = lazyWithRetry(() => import('./pages/InterviewPage'))
const HackathonsPage = lazyWithRetry(() => import('./pages/HackathonsPage'))
const InternshipsPage = lazyWithRetry(() => import('./pages/InternshipsPage'))

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('App ErrorBoundary caught error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-screen flex items-center justify-center bg-[#f5f5f7] dark:bg-[#0B0E14] p-6">
          <div className="max-w-md w-full bg-white dark:bg-[#18181D] border border-[#e0e0e0] dark:border-[#27272F] rounded-2xl p-7 shadow-xl text-center">
            <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-[#F8FAFC] mb-2">
              Update Available
            </h2>
            <p className="text-sm text-[#555555] dark:text-[#94A3B8] mb-6 leading-relaxed">
              A newer version of Skilling is available. Please refresh to load the latest improvements.
            </p>
            <button
              type="button"
              onClick={() => {
                window.sessionStorage.removeItem('pf_chunk_retry')
                window.location.reload()
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0066cc] hover:bg-[#004fa3] text-white font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              Refresh Application
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function PageFallback() {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-[var(--bg-main)]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-[3px] border-[#0066cc]/25 border-t-[#0066cc] dark:border-[#38BDF8]/25 dark:border-t-[#38BDF8] rounded-full animate-spin" />
        <span className="text-xs font-bold text-[#7a7a7a] dark:text-[#94A3B8] tracking-wide animate-pulse">Loading Skilling…</span>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <SidebarProvider>
              <AIChatProvider>
                <Suspense fallback={<PageFallback />}>
                  <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthScreen />} />
              <Route path="/login" element={<AuthScreen initialMode="signin" />} />
              <Route path="/register" element={<AuthScreen initialMode="create" />} />
              <Route path="/signup" element={<AuthScreen initialMode="create" />} />
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <OnboardingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/roadmap/:pathId"
                element={
                  <ProtectedRoute>
                    <RoadmapPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/roadmap"
                element={
                  <ProtectedRoute>
                    <RoadmapPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/workspace"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/progress"
                element={
                  <ProtectedRoute>
                    <ProgressPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/skills"
                element={
                  <ProtectedRoute>
                    <SkillInsightsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/skill-insights"
                element={
                  <ProtectedRoute>
                    <SkillInsightsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/resources"
                element={
                  <ProtectedRoute>
                    <ResourcesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/interview"
                element={
                  <ProtectedRoute>
                    <InterviewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hackathons"
                element={
                  <ProtectedRoute>
                    <HackathonsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/internships"
                element={
                  <ProtectedRoute>
                    <InternshipsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/coach"
                element={
                  <ProtectedRoute>
                    <CoachPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account"
                element={
                  <ProtectedRoute>
                    <AccountPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          {/* The single shared "Ask PathFinder" assistant, mounted once for the
                whole app so the conversation persists across every route. */}
            <AIChat />
            {/* Universal Back-To-Top button */}
            <BackToTop />
          </AIChatProvider>
        </SidebarProvider>
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
</ErrorBoundary>
  )
}
