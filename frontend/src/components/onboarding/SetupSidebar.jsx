/**
 * Five-step learning-setup progress rail, matching the Skill Confidence
 * Assessment design. `current` is the 1-based active step (2 = Assess skills).
 */
const STEPS = [
  { n: 1, label: 'Upload resume' },
  { n: 2, label: 'Assess skills' },
  { n: 3, label: 'Take assessment' },
  { n: 4, label: 'Review results' },
  { n: 5, label: 'Track progress' },
]

const V = '#5B36E9'

export default function SetupSidebar({ current = 2 }) {
  return (
    <aside
      className="hidden md:block flex-none"
      style={{ width: 260, borderRight: '1px solid #E6EAF2', padding: '40px 28px', background: 'linear-gradient(180deg,#fff,#FCFBFF)' }}
    >
      <div className="flex items-center gap-2.5 mb-10">
        <span className="grid place-items-center rounded-lg" style={{ width: 30, height: 30, background: V, boxShadow: '0 4px 10px rgba(91,54,233,.3)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3 8 4-16 3 8h4"/></svg>
        </span>
        <span className="font-extrabold text-[#0E1B38]" style={{ fontSize: 18, letterSpacing: '-.02em' }}>PathFinder</span>
      </div>

      <ol className="relative m-0 p-0 list-none">
        {STEPS.map((s, i) => {
          const done = s.n < current
          const active = s.n === current
          const last = i === STEPS.length - 1
          return (
            <li key={s.n} className="relative grid" style={{ gridTemplateColumns: '32px 1fr', gap: 14, paddingBottom: last ? 0 : 34 }}>
              {!last && (
                <span className="absolute" style={{
                  left: 15, top: 34, bottom: 0, width: 2,
                  background: done ? `linear-gradient(180deg,#26A17B,${V})` : '#DDE3EF',
                }} />
              )}
              <span
                className="grid place-items-center rounded-full font-bold z-10"
                style={{
                  width: 32, height: 32, fontSize: 14,
                  border: `2px solid ${done ? '#26A17B' : active ? V : '#DDE3EF'}`,
                  background: done ? '#E7F6F0' : active ? V : '#fff',
                  color: done ? '#26A17B' : active ? '#fff' : '#7B879E',
                  boxShadow: active ? '0 4px 12px rgba(91,54,233,.35)' : 'none',
                }}
              >
                {done ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                ) : s.n}
              </span>
              <div style={{ marginTop: 4 }}>
                <div className="font-semibold" style={{ fontSize: 15, color: active ? V : done ? '#0E1B38' : '#7B879E', fontWeight: active ? 700 : done ? 600 : 500 }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 12.5, marginTop: 3, fontWeight: 600, color: done ? '#26A17B' : active ? V : '#7B879E' }}>
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
