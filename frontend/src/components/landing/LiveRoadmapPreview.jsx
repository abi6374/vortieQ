import React, { useState } from 'react'
import { CheckCircle2, Lock, Sparkles, ChevronRight, Zap, Target, BookOpen, Trophy } from 'lucide-react'

/**
 * LiveRoadmapPreview (Interactive Product Demo)
 * Allows landing page visitors to test completing tasks and observe real-time AI recalibration.
 */
export default function LiveRoadmapPreview() {
  const [tasks, setTasks] = useState([
    {
      id: 1,
      week: 'Week 1',
      title: 'Neural Networks & Tensor Operations',
      skill: 'PyTorch & Math',
      duration: '4h',
      completed: true,
      difficulty: 'Core',
    },
    {
      id: 2,
      week: 'Week 2',
      title: 'Attention Mechanism & Transformer Architectures',
      skill: 'Transformers',
      duration: '6h',
      completed: false,
      difficulty: 'Advanced',
    },
    {
      id: 3,
      week: 'Week 3',
      title: 'LoRA / QLoRA Parameter-Efficient Fine-Tuning',
      skill: 'Fine-Tuning',
      duration: '5h',
      completed: false,
      difficulty: 'Mastery',
    },
    {
      id: 4,
      week: 'Week 4',
      title: 'Deploying High-Throughput Inference with vLLM',
      skill: 'MLOps',
      duration: '8h',
      completed: false,
      difficulty: 'Production',
    },
  ])

  const [isCalibrating, setIsCalibrating] = useState(false)
  const [activeTab, setActiveTab] = useState(2)

  const completedCount = tasks.filter((t) => t.completed).length
  const progressPercent = Math.round((completedCount / tasks.length) * 100)

  const toggleTask = (id) => {
    setIsCalibrating(true)
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    )
    setTimeout(() => {
      setIsCalibrating(false)
    }, 800)
  }

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl border border-[#E0E0E0] dark:border-[#263348] bg-white/95 dark:bg-[#111726]/95 backdrop-blur-md shadow-2xl p-6 sm:p-8 relative overflow-hidden transition-all duration-200 will-change-transform">
      {/* Top Banner & AI Recalibration Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#F0F0F0] dark:border-[#1E293B]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0066CC] to-[#004FA3] flex items-center justify-center text-white shadow-md shadow-[#0066CC]/20">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-sans font-bold text-lg text-[#1D1D1F] dark:text-[#F8FAFC]">
                AI Engineer Acceleration Track
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-[#EAF2FC] dark:bg-[#1E293B] text-[#0066CC] dark:text-[#38BDF8]">
                ADAPTIVE
              </span>
            </div>
            <p className="text-xs text-[#7A7A7A] dark:text-[#94A3B8]">
              Target Role: Senior ML / LLM Systems Engineer • Custom Weeks
            </p>
          </div>
        </div>

        {/* Progress Pill */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs font-semibold text-[#7A7A7A] dark:text-[#94A3B8]">Velocity</div>
            <div className="text-sm font-extrabold text-[#0066CC] dark:text-[#38BDF8] font-mono">
              {progressPercent}% Complete
            </div>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-[#E0E0E0] dark:border-[#20293A] relative flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-[#0066CC] dark:text-[#38BDF8] transition-all duration-700"
                strokeDasharray="113"
                strokeDashoffset={113 - (113 * progressPercent) / 100}
                style={{ transform: 'scale(1.15)', transformOrigin: 'center' }}
              />
            </svg>
            <Trophy className="w-5 h-5 text-[#0066CC] dark:text-[#38BDF8]" />
          </div>
        </div>
      </div>

      {/* Real-time Recalibration Banner */}
      <div className="my-4 h-9 flex items-center justify-between px-3.5 rounded-xl bg-[#F0F6FE] dark:bg-[#132238] border border-[#D5E6FA] dark:border-[#1E3A5F]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#0066CC] dark:text-[#38BDF8]">
          <Sparkles className={`w-3.5 h-3.5 ${isCalibrating ? 'animate-spin' : ''}`} />
          <span>
            {isCalibrating
              ? 'AI Engine recalculating optimal prerequisite sequencing...'
              : 'Interactive Simulator: Click tasks below to test dynamic roadmap adaptation!'}
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold text-[#7A7A7A] dark:text-[#64748B] hidden sm:inline">
          LIVE DEMO
        </span>
      </div>

      {/* Roadmap Interactive Step Timeline */}
      <div className="space-y-3 mt-4">
        {tasks.map((task, idx) => {
          const isAccessible = idx === 0 || tasks[idx - 1].completed
          return (
            <div
              key={task.id}
              onClick={() => isAccessible && toggleTask(task.id)}
              className={`p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-4 cursor-pointer select-none ${
                task.completed
                  ? 'border-[#22A06B]/30 bg-[#ECFDF3]/50 dark:bg-[#064E3B]/20 dark:border-[#059669]/30'
                  : isAccessible
                  ? 'border-[#0066CC]/40 bg-white dark:bg-[#161F30] hover:border-[#0066CC] dark:hover:border-[#38BDF8] shadow-sm hover:shadow-md'
                  : 'border-[#E0E0E0]/60 dark:border-[#1E293B] bg-gray-50/50 dark:bg-[#0F1522]/50 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <button
                  type="button"
                  disabled={!isAccessible}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    task.completed
                      ? 'bg-[#22A06B] text-white shadow-xs'
                      : isAccessible
                      ? 'border-2 border-[#0066CC] dark:border-[#38BDF8] text-[#0066CC] dark:text-[#38BDF8] hover:bg-[#EAF2FC] dark:hover:bg-[#1E293B]'
                      : 'border-2 border-[#CBD5E1] dark:border-[#334155] text-gray-400'
                  }`}
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 fill-current text-white stroke-[#22A06B]" />
                  ) : isAccessible ? (
                    <Zap className="w-4 h-4" />
                  ) : (
                    <Lock className="w-3.5 h-3.5" />
                  )}
                </button>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold font-mono text-[#0066CC] dark:text-[#38BDF8]">
                      {task.week}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#F1F5F9] dark:bg-[#1E293B] text-[#475569] dark:text-[#94A3B8]">
                      {task.skill}
                    </span>
                  </div>
                  <h4
                    className={`font-semibold text-sm sm:text-base mt-0.5 ${
                      task.completed
                        ? 'line-through text-[#7A7A7A] dark:text-[#64748B]'
                        : 'text-[#1D1D1F] dark:text-[#F8FAFC]'
                    }`}
                  >
                    {task.title}
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-[#7A7A7A] dark:text-[#94A3B8] hidden sm:inline">
                  {task.duration}
                </span>
                <span
                  className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full ${
                    task.completed
                      ? 'bg-[#22A06B]/15 text-[#22A06B]'
                      : isAccessible
                      ? 'bg-[#0066CC]/10 dark:bg-[#38BDF8]/15 text-[#0066CC] dark:text-[#38BDF8]'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                  }`}
                >
                  {task.completed ? 'COMPLETED' : isAccessible ? 'ACTIONABLE' : 'LOCKED'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
