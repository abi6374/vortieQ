import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { AIChatProvider } from './contexts/AIChatContext'
import { SidebarProvider } from './contexts/SidebarContext'
import AIChat from './components/ui/AIChat'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AuthScreen from './components/auth/AuthScreen'
import LandingPage from './pages/LandingPage'
import OnboardingPage from './pages/OnboardingPage'
import RoadmapPage from './pages/RoadmapPage'
import DashboardPage from './pages/DashboardPage'
import ProgressPage from './pages/ProgressPage'
import SkillInsightsPage from './pages/SkillInsightsPage'
import ResourcesPage from './pages/ResourcesPage'
import AccountPage from './pages/AccountPage'
import SettingsPage from './pages/SettingsPage'
import CoachPage from './pages/CoachPage'
import InterviewPage from './pages/InterviewPage'

import BackToTop from './components/ui/BackToTop'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <SidebarProvider>
            <AIChatProvider>
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
