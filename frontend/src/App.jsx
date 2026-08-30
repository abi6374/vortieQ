import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { AIChatProvider } from './contexts/AIChatContext'
import { SidebarProvider } from './contexts/SidebarContext'
import AIChat from './components/ui/AIChat'
import ProtectedRoute from './components/auth/ProtectedRoute'
import BackToTop from './components/ui/BackToTop'

// Route-level code splitting for lightning-fast initial page loads
const LandingPage = lazy(() => import('./pages/LandingPage'))
const AuthScreen = lazy(() => import('./components/auth/AuthScreen'))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const RoadmapPage = lazy(() => import('./pages/RoadmapPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ProgressPage = lazy(() => import('./pages/ProgressPage'))
const SkillInsightsPage = lazy(() => import('./pages/SkillInsightsPage'))
const ResourcesPage = lazy(() => import('./pages/ResourcesPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const CoachPage = lazy(() => import('./pages/CoachPage'))
const InterviewPage = lazy(() => import('./pages/InterviewPage'))
const HackathonsPage = lazy(() => import('./pages/HackathonsPage'))
const InternshipsPage = lazy(() => import('./pages/InternshipsPage'))

function PageFallback() {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-[var(--bg-main)]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 border-3 border-[#0066cc]/20 border-t-[#0066cc] dark:border-[#C9D0D6]/20 dark:border-t-[#C9D0D6] rounded-full animate-spin" />
        <span className="text-xs font-bold text-[#7a7a7a] dark:text-[#94A3B8] tracking-wide animate-pulse">Loading PathFinder…</span>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <SidebarProvider>
            <AIChatProvider>
              <Suspense fallback={<PageFallback />}>
                <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthScreen />} />
              <Route path="/login" element={<AuthScreen />} />
              <Route path="/register" element={<AuthScreen />} />
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
  )
}
