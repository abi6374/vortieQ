import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AIChatProvider } from './contexts/AIChatContext'
import AIChat from './components/ui/AIChat'
import ProtectedRoute from './components/auth/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import OnboardingPage from './pages/OnboardingPage'
import RoadmapPage from './pages/RoadmapPage'
import DashboardPage from './pages/DashboardPage'
import ProgressPage from './pages/ProgressPage'
import SkillInsightsPage from './pages/SkillInsightsPage'
import ResourcesPage from './pages/ResourcesPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AIChatProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {/* The single shared "Ask PathFinder" assistant, mounted once for the
            whole app so the conversation persists across every route. */}
        <AIChat />
        </AIChatProvider>
      </BrowserRouter>
    </AuthProvider>
  )
}
