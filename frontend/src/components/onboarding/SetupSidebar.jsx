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
    <aside className="hidden md:block flex-none w-[270px] border-r border-[#f0f0f0] dark:border-[#1E2638] p-7 bg-gradient-to-b from-white to-[#f9fcff] dark:from-[#0E131E] dark:to-[#0B0E14] transition-colors">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-10">
        <span className="grid place-items-center rounded-xl text-white flex-shrink-0 w-[38px] height-[38px] bg-gradient-to-br from-[#0071e3] to-[#0066cc] shadow-[0_4px_14px_rgba(0,102,204,0.35)] p-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <polygon points="16 8 10.5 10.5 8 16 13.5 13.5" fill="#fff" stroke="none" />
          </svg>
        </span>
        <span className="font-['Manrope'] font-extrabold text-[#1d1d1f] dark:text-white text-xl tracking-tight">
          PathFinder
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
                      ? 'bg-gradient-to-b from-[#22A06B] to-[#0066cc]'
                      : active
                      ? 'bg-gradient-to-b from-[#0066cc] to-[#e6e6e6] dark:to-[#242E40]'
                      : 'bg-[#e9e9e9] dark:bg-[#1E2638]'
                  }`}
                />
              )}

              {/* Step Circle Indicator */}
              <span
                className={`grid place-items-center rounded-full font-bold z-10 text-sm transition-all w-9 h-9 border-2 ${
                  done
                    ? 'border-[#22A06B] bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#22A06B] dark:text-emerald-400'
                    : active
                    ? 'border-[#0066cc] dark:border-[#38BDF8] bg-[#0066cc] dark:bg-[#38BDF8] text-white dark:text-slate-900 shadow-[0_4px_14px_rgba(0,102,204,0.40)]'
                    : 'border-[#e6e6e6] dark:border-[#242E40] bg-white dark:bg-[#141A26] text-[#7a7a7a] dark:text-[#94A3B8]'
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
                      ? 'text-[#0066cc] dark:text-[#38BDF8]'
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
                      ? 'text-[#0066cc] dark:text-[#38BDF8]'
                      : 'text-[#86868b] dark:text-[#64748B]'
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
