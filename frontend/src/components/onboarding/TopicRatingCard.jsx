/**
 * A single extracted topic with a 4-level self-rating pill selector.
 *
 * Props:
 *   topic:   {name, evidence, suggested_level}
 *   level:   currently selected level (string)
 *   onLevel: (level: string) => void
 */
const LEVELS = [
  { key: 'basic',        label: 'Basic',        hint: 'Learned it' },
  { key: 'intermediate', label: 'Intermediate', hint: '1–2 projects' },
  { key: 'advanced',     label: 'Advanced',     hint: '2+ years' },
  { key: 'expert',       label: 'Expert',       hint: 'Deep, at scale' },
]

export default function TopicRatingCard({ topic, level, onLevel }) {
  const chosen = level || topic.suggested_level || 'basic'
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{topic.name}</h3>
          {topic.evidence && (
            <p className="text-xs text-gray-500 mt-0.5 italic">"{topic.evidence}"</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {LEVELS.map((l) => {
          const active = l.key === chosen
          return (
            <button
              key={l.key}
              type="button"
              onClick={() => onLevel(l.key)}
              className={`text-left px-3 py-2 rounded-lg border transition text-sm
                ${active
                  ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200'
                  : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}`}
            >
              <div className={`font-medium ${active ? 'text-indigo-700' : 'text-gray-800'}`}>{l.label}</div>
              <div className="text-[11px] text-gray-500">{l.hint}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
