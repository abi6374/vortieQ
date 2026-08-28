import React from 'react'

/**
 * SetupSidebar
 * Five-step learning-setup progress sidebar matching the unified PathFinder onboarding flow.
 * Steps:
 * 1. Upload resume
 * 2. Assess skills
 * 3. Set your goal
 * 4. Create roadmap
 * 5. Track progress
 */
const STEPS = [
  { n: 1, label: 'Upload resume' },
  { n: 2, label: 'Assess skills' },
  { n: 3, label: 'Set your goal' },
  { n: 4, label: 'Create roadmap' },
  { n: 5, label: 'Track progress' },
]

const V = '#0066cc'
const GREEN = '#22A06B'

export default function SetupSidebar({ current = 1 }) {
  return (
    <aside
      className="hidden md:block flex-none"
      style={{
        width: 270,
        borderRight: '1px solid #f0f0f0',
        padding: '36px 28px',
        background: 'linear-gradient(180deg, #FFFFFF 0%, #f9fcff 100%)',
      }}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-10">
        <span
          className="grid place-items-center rounded-xl text-white flex-shrink-0"
          style={{
            width: 38,
            height: 38,
            background: 'linear-gradient(135deg, #0071e3, #0066cc)',
            boxShadow: '0 4px 14px rgba(0, 102, 204, 0.35)',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12h4l3 8 4-16 3 8h4" />
          </svg>
        </span>
        <span
          className="font-['Manrope'] font-extrabold text-[#1d1d1f]"
          style={{ fontSize: 21, letterSpacing: '-0.02em' }}
        >
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
              className="relative grid"
              style={{
                gridTemplateColumns: '36px 1fr',
                gap: 14,
                paddingBottom: last ? 0 : 36,
              }}
            >
              {/* Connecting vertical line */}
              {!last && (
                <span
                  className="absolute"
                  style={{
                    left: 17,
                    top: 36,
                    bottom: 0,
                    width: 2,
                    background: done
                      ? `linear-gradient(180deg, ${GREEN}, ${V})`
                      : active
                      ? `linear-gradient(180deg, ${V}, #e6e6e6)`
                      : '#e9e9e9',
                  }}
                />
              )}

              {/* Step Circle Indicator */}
              <span
                className="grid place-items-center rounded-full font-bold z-10 transition-all"
                style={{
                  width: 36,
                  height: 36,
                  fontSize: 14,
                  border: `2px solid ${
                    done ? GREEN : active ? V : '#e6e6e6'
                  }`,
                  background: done
                    ? '#ECFDF3'
                    : active
                    ? V
                    : '#FFFFFF',
                  color: done
                    ? GREEN
                    : active
                    ? '#FFFFFF'
                    : '#7a7a7a',
                  boxShadow: active
                    ? '0 4px 14px rgba(0, 102, 204, 0.40)'
                    : 'none',
                }}
              >
                {done ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : (
                  s.n
                )}
              </span>

              {/* Step Label & Subtitle */}
              <div style={{ marginTop: 3 }}>
                <div
                  className="font-bold text-[#1d1d1f]"
                  style={{
                    fontSize: 15,
                    color: active ? V : done ? '#1d1d1f' : '#333333',
                    fontWeight: active ? 700 : done ? 650 : 500,
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    marginTop: 2,
                    fontWeight: 600,
                    color: done ? GREEN : active ? V : '#86868b',
                  }}
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
