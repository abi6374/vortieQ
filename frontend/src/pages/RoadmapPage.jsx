import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import RoadmapTimeline from '../components/roadmap/RoadmapTimeline'
import AssistantChat from '../components/assistant/AssistantChat'
import NavBar from '../components/ui/NavBar'
import ErrorCard from '../components/ui/ErrorCard'
import SkeletonBlock from '../components/ui/SkeletonBlock'
import apiClient from '../lib/apiClient'
import RebuildTailButton from '../components/roadmap/RebuildTailButton'

const DEFAULT_MILESTONES = [
  {
    id: 'm1',
    title: '1. Python Foundations',
    description: 'Master core syntax, functions, scopes, and modular structure.',
    estimated_weeks: 3,
    steps: [
      {
        id: 's1',
        status: 'completed',
        why_recommended: 'Essential for all data processing and modeling tasks.',
        course: {
          title: 'Refresh Python Fundamentals',
          provider: 'PathFinder Academy',
          difficulty: 'Beginner',
          duration_hrs: 2,
          skill_tags: ['Python', 'Functions'],
          resource_url: 'https://docs.python.org/3/tutorial/',
        },
      },
      {
        id: 's2',
        status: 'not_started',
        why_recommended: 'Hands-on practice applying control structures and data structures.',
        course: {
          title: 'Complete 2 Python Practice Tasks',
          provider: 'PathFinder Labs',
          difficulty: 'Beginner',
          duration_hrs: 3,
          skill_tags: ['Python', 'Problem Solving'],
          resource_url: 'https://exercism.org/tracks/python',
        },
      },
    ],
  },
  {
    id: 'm2',
    title: '2. Statistics Foundations (High Priority)',
    description: 'Master descriptive statistics, probability distributions, and hypothesis testing.',
    estimated_weeks: 4,
    steps: [
      {
        id: 's3',
        status: 'not_started',
        why_recommended: 'Statistics comes first because current readiness is 30% and is required before ML.',
        course: {
          title: 'Learn Descriptive Statistics',
          provider: 'Khan Academy / PathFinder',
          difficulty: 'Intermediate',
          duration_hrs: 3,
          skill_tags: ['Statistics', 'Variance', 'Distributions'],
          resource_url: 'https://en.wikipedia.org/wiki/Descriptive_statistics',
        },
      },
    ],
  },
  {
    id: 'm3',
    title: '3. Pandas & Exploratory Data Analysis',
    description: 'Data manipulation, data cleaning, aggregation, and visualization.',
    estimated_weeks: 3,
    steps: [
      {
        id: 's4',
        status: 'not_started',
        why_recommended: 'Core toolkit for real-world data science workflows.',
        course: {
          title: 'Pandas for Data Analysis',
          provider: 'Real Python',
          difficulty: 'Beginner',
          duration_hrs: 4,
          skill_tags: ['Pandas', 'EDA'],
          resource_url: 'https://pandas.pydata.org/docs/user_guide/10min.html',
        },
      },
    ],
  },
  {
    id: 'm4',
    title: '4. Machine Learning Core',
    description: 'Supervised and unsupervised algorithms with scikit-learn.',
    estimated_weeks: 3,
    steps: [
      {
        id: 's5',
        status: 'not_started',
        why_recommended: 'Builds upon statistical foundations for predictive modeling.',
        course: {
          title: 'Hands-On Machine Learning with Scikit-Learn',
          provider: 'Coursera / PathFinder',
          difficulty: 'Intermediate',
          duration_hrs: 6,
          skill_tags: ['Machine Learning', 'Scikit-Learn'],
          resource_url: 'https://scikit-learn.org/stable/tutorial/index.html',
        },
      },
    ],
  },
  {
    id: 'm5',
    title: '5. End-to-End Portfolio Project',
    description: 'Build and deploy a complete predictive AI application.',
    estimated_weeks: 2,
    steps: [
      {
        id: 's6',
        status: 'not_started',
        why_recommended: 'Demonstrates practical ability to potential employers.',
        course: {
          title: 'Deploy a Full-Stack ML Pipeline',
          provider: 'FastAPI & Hugging Face',
          difficulty: 'Advanced',
          duration_hrs: 8,
          skill_tags: ['FastAPI', 'Deployment', 'MLOps'],
          resource_url: 'https://fastapi.tiangolo.com/',
        },
      },
    ],
  },
  {
    id: 'm6',
    title: '6. Technical Interview Prep',
    description: 'System design, algorithm challenges, and behavioral questions.',
    estimated_weeks: 1,
    steps: [
      {
        id: 's7',
        status: 'not_started',
        why_recommended: 'Final preparation to ace ML engineer internships.',
        course: {
          title: 'AIML Internship Interview Simulation',
          provider: 'PathFinder Coach',
          difficulty: 'Intermediate',
          duration_hrs: 4,
          skill_tags: ['Interview Prep'],
          resource_url: 'https://leetcode.com/problemset/all/',
        },
      },
    ],
  },
]

function normalizePath(data) {
  const milestones = data?.milestones || []
  if (milestones.length === 0) return DEFAULT_MILESTONES
  return milestones.map((m, idx) => ({
    id: `${data.path_id || 'path'}-m${idx}`,
    title: m.label || `Milestone ${idx + 1}`,
    description: m.rationale || '',
    estimated_weeks: m.estimated_weeks,
    steps: (m.steps || []).map((s) => ({
      id: s.step_id || s.id,
      status: s.status || 'not_started',
      why_recommended: s.explanation || s.why_recommended || '',
      course: {
        title: s.title,
        provider: s.provider,
        description: s.description || '',
        difficulty: s.difficulty,
        duration_hrs: s.duration_hrs,
        skill_tags: s.skill_tags || [],
        resource_url: s.resource_url,
      },
    })),
  }))
}

function RoadmapSkeleton() {
  return (
    <div className="space-y-6 pl-10" aria-hidden="true">
      <SkeletonBlock className="h-24 w-full" />
      <SkeletonBlock className="h-24 w-full" />
      <SkeletonBlock className="h-24 w-3/4" />
    </div>
  )
}

export default function RoadmapPage() {
  const { pathId } = useParams()
  const navigate = useNavigate()
  const [milestones, setMilestones] = useState(DEFAULT_MILESTONES)
  const [loading, setLoading] = useState(Boolean(pathId))
  const [error, setError] = useState(null)

  const refetchPath = useCallback(async () => {
    if (!pathId) {
      setLoading(false)
      setMilestones(DEFAULT_MILESTONES)
      return
    }
    setError(null)
    try {
      const { data } = await apiClient.get(`/api/paths/${pathId}`)
      setMilestones(normalizePath(data))
    } catch (err) {
      // Fallback to default roadmap sequence
      console.warn('Could not load specific path, showing standard path:', err)
      setMilestones(DEFAULT_MILESTONES)
    } finally {
      setLoading(false)
    }
  }, [pathId])

  useEffect(() => {
    refetchPath()
  }, [refetchPath])

  const handleRetry = () => {
    setLoading(true)
    refetchPath()
  }

  return (
    <div className="min-h-screen bg-[#F5F7FC] text-[#0E1B38] flex flex-col font-['Inter',sans-serif]">
      <NavBar>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-xs sm:text-sm font-bold bg-[#5B36E9] text-white hover:bg-[#4826C9] px-3.5 py-1.5 rounded-lg transition-colors shadow-sm"
        >
          ← Workspace
        </button>
      </NavBar>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-['Manrope'] font-extrabold text-2xl sm:text-3xl text-[#0E1B38] tracking-tight">
              Your Learning Roadmap
            </h1>
            <p className="mt-1 text-sm sm:text-base text-[#52617D]">
              Milestones sequenced from foundational skills to advanced internship readiness.
            </p>
          </div>
          <button
            onClick={() => navigate('/onboarding')}
            className="self-start sm:self-auto px-4 py-2 text-xs sm:text-sm font-bold text-[#5B36E9] bg-[#F5F1FF] border border-[#E7E0FF] hover:bg-[#EEE9FF] rounded-xl transition-colors"
          >
            ⚙ Replan in Goal Compass
          </button>
        </div>

        <div>
          {loading ? (
            <RoadmapSkeleton />
          ) : error ? (
            <ErrorCard message={error} onRetry={handleRetry} />
          ) : (
            <>
              <RoadmapTimeline milestones={milestones} onRefresh={refetchPath} />
              {pathId && <RebuildTailButton pathId={pathId} onDone={refetchPath} />}
            </>
          )}
        </div>
      </div>

      <AssistantChat pathId={pathId} />
    </div>
  )
}

