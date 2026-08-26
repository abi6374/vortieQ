import React from 'react'
import { useNavigate } from 'react-router-dom'
import AuthCard from '../components/auth/AuthCard'
import { useAuth } from '../hooks/useAuth'

export default function LandingPage() {
  const { session } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/40 via-slate-950 to-slate-950 p-6">
      <header className="max-w-6xl mx-auto w-full flex justify-between items-center py-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-sm">
            V
          </div>
          <span className="font-bold text-slate-100 tracking-tight">VortieQ Path</span>
        </div>
        {session && (
          <button
            onClick={() => navigate('/dashboard')}
            className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 rounded-lg text-slate-200 transition"
          >
            Go to Dashboard →
          </button>
        )}
      </header>

      <main className="max-w-6xl mx-auto w-full grid md:grid-cols-2 gap-12 items-center my-auto py-12">
        <div>
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-blue-950/80 border border-blue-800 text-blue-400 mb-4">
            AI-Powered Career & Learning Architecture
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-50 tracking-tight leading-tight">
            Personalized Learning Roadmaps, Grounded in Real Data.
          </h1>
          <p className="text-sm text-slate-400 mt-4 leading-relaxed max-w-lg">
            Tell us your dream career role in plain natural language. Our hybrid RAG + LLM engine sequences prerequisite milestones, curates courses, and continuously adapts to your feedback.
          </p>
        </div>

        <div className="flex justify-center">
          <AuthCard onSuccess={() => navigate('/onboarding')} />
        </div>
      </main>

      <footer className="max-w-6xl mx-auto w-full py-4 text-center text-xs text-slate-600 border-t border-slate-900">
        AI Career & Learning Path Recommender
      </footer>
    </div>
  )
}
