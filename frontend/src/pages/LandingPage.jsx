import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Sparkles,
  ArrowRight,
  Compass,
  Zap,
  Target,
  FileText,
  Github,
  Bot,
  Layers,
  BarChart3,
  CheckCircle2,
  Lock,
  Cpu,
  BookOpen,
  Award,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../hooks/useAuth'

import LiquidMetalBackground from '../components/landing/LiquidMetalBackground'
import DecryptedText from '../components/landing/DecryptedText'
import SpotlightCard from '../components/landing/SpotlightCard'
import TiltedCard from '../components/landing/TiltedCard'
import InfiniteMarquee from '../components/landing/InfiniteMarquee'
import MagneticButton from '../components/landing/MagneticButton'
import LiveRoadmapPreview from '../components/landing/LiveRoadmapPreview'
import StatsCounter from '../components/landing/StatsCounter'
import InteractiveCoachTeaser from '../components/landing/InteractiveCoachTeaser'
import ComparisonMatrix from '../components/landing/ComparisonMatrix'
import LandingNavbar from '../components/landing/LandingNavbar'
import LandingFooter from '../components/landing/LandingFooter'

export default function LandingPage() {
  const { theme } = useTheme()
  const { user, session } = useAuth()
  const navigate = useNavigate()
  const isDark = theme === 'dark'

  const techStackRow1 = [
    { name: 'Python', badge: 'Core', icon: <Cpu className="w-4 h-4" /> },
    { name: 'PyTorch', badge: 'ML', icon: <Sparkles className="w-4 h-4" /> },
    { name: 'React 18', badge: 'Frontend', icon: <Layers className="w-4 h-4" /> },
    { name: 'FastAPI', badge: 'API', icon: <Zap className="w-4 h-4" /> },
    { name: 'LangChain', badge: 'Agents', icon: <Bot className="w-4 h-4" /> },
    { name: 'Docker', badge: 'DevOps', icon: <Layers className="w-4 h-4" /> },
    { name: 'PostgreSQL', badge: 'Database', icon: <FileText className="w-4 h-4" /> },
    { name: 'AWS Cloud', badge: 'Cloud', icon: <Target className="w-4 h-4" /> },
  ]

  const techStackRow2 = [
    { name: 'TypeScript', badge: 'Language', icon: <FileText className="w-4 h-4" /> },
    { name: 'Kubernetes', badge: 'Infra', icon: <Layers className="w-4 h-4" /> },
    { name: 'TensorFlow', badge: 'Deep Learning', icon: <Cpu className="w-4 h-4" /> },
    { name: 'Next.js', badge: 'Fullstack', icon: <Layers className="w-4 h-4" /> },
    { name: 'Supabase', badge: 'Backend', icon: <Zap className="w-4 h-4" /> },
    { name: 'vLLM', badge: 'Inference', icon: <Sparkles className="w-4 h-4" /> },
    { name: 'TailwindCSS', badge: 'Design', icon: <Layers className="w-4 h-4" /> },
    { name: 'GraphQL', badge: 'API', icon: <Zap className="w-4 h-4" /> },
  ]

  const scrollToDemo = () => {
    const el = document.getElementById('demo')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="relative min-h-screen bg-[#F5F5F7] dark:bg-[#0B0F17] text-[#1D1D1F] dark:text-[#F8FAFC] overflow-x-hidden selection:bg-[#0066CC] selection:text-white transition-colors duration-300">
      {/* 1. Interactive Molten Metal Fluid WebGL Shader Canvas */}
      <LiquidMetalBackground isDark={isDark} />

      {/* 2. Floating Glass Navbar */}
      <LandingNavbar />

      {/* 3. HERO SECTION */}
      <section className="relative pt-32 sm:pt-40 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center z-10">
        {/* Shadow Light Handwriting Eyebrow Accent */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#0066CC]/30 dark:border-[#38BDF8]/30 bg-[#EAF2FC]/80 dark:bg-[#132238]/80 backdrop-blur-md shadow-xs mb-6 animate-fade-in">
          <span className="font-shadow text-lg sm:text-xl text-[#0066CC] dark:text-[#38BDF8] font-bold">
            ✦ Your Personal AI Career GPS
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#0066CC] dark:bg-[#38BDF8] animate-ping" />
        </div>

        {/* BALBOA Loud Monumental Display Headline */}
        <h1 className="font-balboa text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black uppercase tracking-tight text-[#1D1D1F] dark:text-white leading-[0.9] text-balance max-w-5xl">
          CRUSH THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0066CC] via-[#0080FF] to-[#38BDF8]">SKILL GAP</span>
        </h1>

        {/* Subheading & Decrypted Role Scrambler */}
        <p className="mt-6 text-lg sm:text-xl md:text-2xl text-[#4A4A4A] dark:text-[#CBD5E1] max-w-3xl font-medium leading-relaxed">
          Architect your custom 12-week roadmap to become an{' '}
          <DecryptedText
            words={['AI / LLM Engineer', 'Full-Stack Architect', 'MLOps Lead', 'Cloud Specialist']}
            className="text-[#0066CC] dark:text-[#38BDF8] underline decoration-[#0066CC]/40"
          />
          . Real-time path adaptation grounded in your verified GitHub code and resume.
        </p>

        {/* Action Button Suite */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 sm:gap-5 w-full justify-center">
          <MagneticButton
            strength={25}
            onClick={() => navigate('/onboarding')}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#0066CC] to-[#004FA3] hover:from-[#0052A3] hover:to-[#003D80] text-white font-bold text-base sm:text-lg shadow-xl shadow-[#0066CC]/30 hover:shadow-2xl hover:shadow-[#0066CC]/40 transition-all flex items-center justify-center gap-3 group"
          >
            <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span>Generate Your Learning Path</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </MagneticButton>

          <button
            type="button"
            onClick={scrollToDemo}
            className="w-full sm:w-auto px-7 py-4 rounded-2xl border border-[#D0D0D0] dark:border-[#2A374A] bg-white/70 dark:bg-[#141C2B]/75 hover:bg-white dark:hover:bg-[#1A2538] text-[#1D1D1F] dark:text-[#F1F5F9] font-bold text-base backdrop-blur-md shadow-xs hover:border-[#0066CC] transition-all flex items-center justify-center gap-2"
          >
            <span>Explore Interactive Demo</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#EAF2FC] dark:bg-[#1E293B] text-[#0066CC] dark:text-[#38BDF8] font-mono">
              60s
            </span>
          </button>
        </div>

        {/* Feature Checkpoints */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm font-semibold text-[#666666] dark:text-[#94A3B8]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#0066CC] dark:text-[#38BDF8]" />
            <span>Deterministic Skill Gating</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#0066CC] dark:text-[#38BDF8]" />
            <span>Public GitHub Repos Grounding</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#0066CC] dark:text-[#38BDF8]" />
            <span>Integrated 24/7 AI Coach</span>
          </div>
        </div>
      </section>

      {/* 4. INFINITE SKILL MARQUEE */}
      <section id="tech-stack" className="relative py-8 z-10">
        <div className="max-w-7xl mx-auto px-4 mb-4 text-center">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#7A7A7A] dark:text-[#64748B]">
            Supported Engineering Ecosystems & Stacks
          </span>
        </div>
        <InfiniteMarquee items={techStackRow1} speed={32} direction="left" />
        <InfiniteMarquee items={techStackRow2} speed={36} direction="right" className="mt-2" />
      </section>

      {/* 5. PLATFORM PILLARS (SPOTLIGHT 3D CARDS) */}
      <section id="features" className="relative py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="font-shadow text-xl sm:text-2xl text-[#0066CC] dark:text-[#38BDF8] font-bold mb-2">
            Engineered for High-Velocity Mastery
          </div>
          <h2 className="font-balboa text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-[#1D1D1F] dark:text-white">
            FOUR PILLARS OF ADAPTIVE INTELLIGENCE
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#666666] dark:text-[#94A3B8]">
            Traditional courses give everyone the same 40 hours of static video. PathFinder builds a live learning graph that reacts to every concept you master or struggle with.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Pillar 1 */}
          <SpotlightCard className="p-8 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#EAF2FC] dark:bg-[#1E293B] text-[#0066CC] dark:text-[#38BDF8] flex items-center justify-center mb-6 shadow-xs">
                <FileText className="w-6 h-6" />
              </div>
              <div className="font-mono text-xs font-bold text-[#0066CC] dark:text-[#38BDF8] uppercase tracking-wider mb-1">
                PILLAR 01
              </div>
              <h3 className="font-sans text-2xl font-bold text-[#1D1D1F] dark:text-[#F8FAFC] mb-3">
                Intelligent Resume & GitHub Intake
              </h3>
              <p className="text-sm sm:text-base text-[#666666] dark:text-[#94A3B8] leading-relaxed">
                Upload your resume or connect your GitHub handle. PathFinder extracts your verified languages, frameworks, and project seniority so you never waste time on topics you already know.
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-[#F0F0F0] dark:border-[#1E293B] flex items-center gap-2 text-xs font-bold text-[#0066CC] dark:text-[#38BDF8]">
              <span>Zero boilerplate re-learning</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </SpotlightCard>

          {/* Pillar 2 */}
          <SpotlightCard className="p-8 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#EAF2FC] dark:bg-[#1E293B] text-[#0066CC] dark:text-[#38BDF8] flex items-center justify-center mb-6 shadow-xs">
                <Layers className="w-6 h-6" />
              </div>
              <div className="font-mono text-xs font-bold text-[#0066CC] dark:text-[#38BDF8] uppercase tracking-wider mb-1">
                PILLAR 02
              </div>
              <h3 className="font-sans text-2xl font-bold text-[#1D1D1F] dark:text-[#F8FAFC] mb-3">
                12-Week Adaptive Graph Engine
              </h3>
              <p className="text-sm sm:text-base text-[#666666] dark:text-[#94A3B8] leading-relaxed">
                Every milestone has deterministic prerequisite dependencies. If you breeze through Week 2 or hit a blocker in Week 4, the learning graph recalibrates subsequent tasks automatically.
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-[#F0F0F0] dark:border-[#1E293B] flex items-center gap-2 text-xs font-bold text-[#0066CC] dark:text-[#38BDF8]">
              <span>Dynamic prerequisite recalibration</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </SpotlightCard>

          {/* Pillar 3 */}
          <SpotlightCard className="p-8 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#EAF2FC] dark:bg-[#1E293B] text-[#0066CC] dark:text-[#38BDF8] flex items-center justify-center mb-6 shadow-xs">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div className="font-mono text-xs font-bold text-[#0066CC] dark:text-[#38BDF8] uppercase tracking-wider mb-1">
                PILLAR 03
              </div>
              <h3 className="font-sans text-2xl font-bold text-[#1D1D1F] dark:text-[#F8FAFC] mb-3">
                Skill-Gap Heatmap & Benchmarking
              </h3>
              <p className="text-sm sm:text-base text-[#666666] dark:text-[#94A3B8] leading-relaxed">
                Visualize exactly where you stand against industry job requirements. Color-coded competency heatmaps show your progression from Foundational to Production-Ready mastery.
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-[#F0F0F0] dark:border-[#1E293B] flex items-center gap-2 text-xs font-bold text-[#0066CC] dark:text-[#38BDF8]">
              <span>Target role calibration</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </SpotlightCard>

          {/* Pillar 4 */}
          <SpotlightCard className="p-8 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#EAF2FC] dark:bg-[#1E293B] text-[#0066CC] dark:text-[#38BDF8] flex items-center justify-center mb-6 shadow-xs">
                <Bot className="w-6 h-6" />
              </div>
              <div className="font-mono text-xs font-bold text-[#0066CC] dark:text-[#38BDF8] uppercase tracking-wider mb-1">
                PILLAR 04
              </div>
              <h3 className="font-sans text-2xl font-bold text-[#1D1D1F] dark:text-[#F8FAFC] mb-3">
                Integrated Contextual AI Coach
              </h3>
              <p className="text-sm sm:text-base text-[#666666] dark:text-[#94A3B8] leading-relaxed">
                Never get stuck alone on an obscure error. The AI Coach knows your exact roadmap context, the current milestone you’re tackling, and guides you with interactive hints, code reviews, and explanations.
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-[#F0F0F0] dark:border-[#1E293B] flex items-center gap-2 text-xs font-bold text-[#0066CC] dark:text-[#38BDF8]">
              <span>24/7 Milestone tutoring</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </SpotlightCard>
        </div>
      </section>

      {/* 6. LIVE ROADMAP INTERACTIVE DEMO */}
      <section id="demo" className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="font-shadow text-xl sm:text-2xl text-[#0066CC] dark:text-[#38BDF8] font-bold mb-2">
            Try It Yourself
          </div>
          <h2 className="font-balboa text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-[#1D1D1F] dark:text-white">
            INTERACTIVE ROADMAP SIMULATOR
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#666666] dark:text-[#94A3B8]">
            Click the actionable milestone below to witness how PathFinder recalculates your learning velocity and dynamically unlocks downstream modules.
          </p>
        </div>

        <LiveRoadmapPreview />
      </section>

      {/* 7. INTERACTIVE AI COACH TEASER */}
      <section id="coach" className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="font-shadow text-xl sm:text-2xl text-[#0066CC] dark:text-[#38BDF8] font-bold mb-2">
            Your On-Demand AI Mentor
          </div>
          <h2 className="font-balboa text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-[#1D1D1F] dark:text-white">
            CONTEXT-AWARE REAL-TIME COACHING
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#666666] dark:text-[#94A3B8]">
            Select any question below to see how PathFinder’s AI Coach provides grounded, milestone-specific guidance.
          </p>
        </div>

        <InteractiveCoachTeaser />
      </section>

      {/* 8. IMPACT STATS & METRICS */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
        <StatsCounter />
      </section>

      {/* 9. COMPARISON MATRIX */}
      <section id="comparison" className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="font-shadow text-xl sm:text-2xl text-[#0066CC] dark:text-[#38BDF8] font-bold mb-2">
            The Evolution of Learning
          </div>
          <h2 className="font-balboa text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-[#1D1D1F] dark:text-white">
            WHY STATIC COURSES DON'T WORK
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#666666] dark:text-[#94A3B8]">
            Discover why developers upskill 94% faster with dynamic, milestone-driven adaptation.
          </p>
        </div>

        <ComparisonMatrix />
      </section>

      {/* 10. FINAL LAUNCH CTA BANNER */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto z-10">
        <div className="relative rounded-3xl p-10 sm:p-14 border border-[#0066CC]/30 dark:border-[#38BDF8]/30 bg-gradient-to-br from-[#EAF2FC]/90 via-white/80 to-[#DBEAFC]/90 dark:from-[#0E1726]/90 dark:via-[#111A2E]/80 dark:to-[#0A1220]/90 backdrop-blur-2xl shadow-2xl overflow-hidden text-center">
          <div className="font-shadow text-2xl sm:text-3xl text-[#0066CC] dark:text-[#38BDF8] font-bold mb-3">
            Start Your Transformation Today
          </div>
          <h2 className="font-balboa text-5xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight text-[#1D1D1F] dark:text-white max-w-3xl mx-auto leading-none">
            READY TO BUILD YOUR NEXT CAREER CHAPTER?
          </h2>
          <p className="mt-6 text-base sm:text-lg text-[#555555] dark:text-[#CBD5E1] max-w-2xl mx-auto">
            Join thousands of ambitious developers accelerating their career trajectory with PathFinder’s AI-powered learning paths.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <MagneticButton
              strength={30}
              onClick={() => navigate('/onboarding')}
              className="w-full sm:w-auto px-9 py-4 rounded-2xl bg-gradient-to-r from-[#0066CC] to-[#004FA3] hover:from-[#0052A3] hover:to-[#003D80] text-white font-bold text-lg shadow-xl shadow-[#0066CC]/35 hover:shadow-2xl hover:shadow-[#0066CC]/50 transition-all flex items-center justify-center gap-3 group"
            >
              <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span>Generate My Free Roadmap</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </MagneticButton>
          </div>
        </div>
      </section>

      {/* 11. DEEP GLASS FOOTER */}
      <LandingFooter />
    </div>
  )
}
