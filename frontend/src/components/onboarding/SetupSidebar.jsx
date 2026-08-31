import React from 'react'

/**
 * SetupSidebar
 * Six-step learning-setup progress sidebar matching the unified PathFinder onboarding flow.
 * Steps:
 * 1. Learner Intake
 * 2. GitHub Integration
 * 3. Your Skill
 * 4. Your Confidence Level
 * 5. Set your goal
 * 6. Create roadmap
 */
const STEPS = [
  { n: 1, label: 'Learner Intake' },
  { n: 2, label: 'GitHub Integration' },
  { n: 3, label: 'Your Skill' },
  { n: 4, label: 'Your Confidence Level' },
  { n: 5, label: 'Set your goal' },
  { n: 6, label: 'Create roadmap' },
]

export default function SetupSidebar({ current = 1 }) {
  return (
    <aside className="hidden md:flex flex-col flex-none w-[270px] h-full overflow-hidden border-r border-[#C6D6FB] dark:border-[#27272F] p-7 bg-white/85 dark:bg-[#121216]/90 backdrop-blur-md transition-colors select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-10 flex-none">
        <span className="grid place-items-center rounded-xl text-white flex-shrink-0 w-[38px] h-[38px] bg-gradient-to-br from-[#0071e3] to-[#0066cc] dark:from-[#0066cc] dark:to-[#004fa3] dark:bg-[#0066cc] shadow-[0_4px_14px_rgba(0,102,204,0.35)] p-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" className="dark:stroke-white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <polygon points="16 8 10.5 10.5 8 16 13.5 13.5" fill="#fff" className="dark:fill-white" stroke="none" />
          </svg>
        </span>
        <span className="font-['Manrope'] font-extrabold text-[#1d1d1f] dark:text-white text-xl tracking-tight">
          Skilling
        </span>
      </div>

      {/* Steps List */}
      <ol className="relative m-0 p-0 list-none">
        {STEPS.map((s, i) => {
          const done = s.n < current
          const active = s.n === current
          const last = i === STEPS.length - 1

          return (
            <li
              key={s.n}
              className="relative grid grid-cols-[36px_1fr] gap-3.5"
              style={{ paddingBottom: last ? 0 : 36 }}
            >
              {/* Connecting vertical line */}
              {!last && (
                <span
                  className={`absolute left-[17px] top-9 bottom-0 w-[2px] ${
                    done
                      ? 'bg-gradient-to-b from-[#22A06B] to-[#0066cc] dark:to-[#0066cc]'
                      : active
                      ? 'bg-gradient-to-b from-[#0066cc] dark:from-[#0066cc] to-[#e6e6e6] dark:to-[#27272F]'
                      : 'bg-[#e9e9e9] dark:bg-[#202026]'
                  }`}
                />
              )}

              {/* Step Circle Indicator */}
              <span
                className={`grid place-items-center rounded-full font-bold z-10 text-sm transition-all w-9 h-9 border-2 ${
                  done
                    ? 'border-[#22A06B] bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#22A06B] dark:text-emerald-400'
                    : active
                    ? 'border-[#0066cc] dark:border-[#0066cc] bg-[#0066cc] dark:bg-[#0066cc] text-white dark:text-white shadow-[0_4px_14px_rgba(0,102,204,0.40)]'
                    : 'border-[#e6e6e6] dark:border-[#27272F] bg-white dark:bg-[#18181D] text-[#7a7a7a] dark:text-[#94A3B8]'
                }`}
              >
                {done ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  s.n
                )}
              </span>

              {/* Step Label & Subtitle */}
              <div className="mt-0.5 min-w-0">
                <div
                  className={`text-[15px] font-bold ${
                    active
                      ? 'text-[#0066cc] dark:text-[#0066cc]'
                      : done
                      ? 'text-[#1d1d1f] dark:text-white'
                      : 'text-[#555555] dark:text-[#94A3B8]'
                  }`}
                >
                  {s.label}
                </div>
                <div
                  className={`text-[12.5px] mt-0.5 font-semibold ${
                    done
                      ? 'text-[#22A06B] dark:text-emerald-400'
                      : active
                      ? 'text-[#0066cc] dark:text-[#C9D0D6]'
                      : 'text-[#86868b] dark:text-[#71717A]'
                  }`}
                >
                  {done ? 'Completed' : active ? 'In progress' : 'Upcoming'}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
