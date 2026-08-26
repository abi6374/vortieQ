import { useState } from 'react'
import TopicRatingCard from './TopicRatingCard'

/**
 * Screen showing all extracted topics as rating cards, with Continue / Back /
 * Skip All. Emits an array of {name, evidence, level} on continue.
 */
export default function TopicRatingList({ topics, detectedYears, onContinue, onBack, onSkip }) {
  const [levels, setLevels] = useState(
    Object.fromEntries(topics.map((t) => [t.name, t.suggested_level]))
  )

  const setLevel = (name, level) => setLevels((prev) => ({ ...prev, [name]: level }))

  const submit = () => {
    onContinue(
      topics.map((t) => ({
        name: t.name,
        level: levels[t.name] || t.suggested_level || 'basic',
        evidence: t.evidence || '',
      }))
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 max-w-3xl w-full">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Your skills, your confidence</h2>
      <p className="text-sm text-gray-600 mb-6">
        {topics.length > 0
          ? `We found ${topics.length} topic${topics.length === 1 ? '' : 's'} in your resume` +
            (detectedYears ? ` (≈${detectedYears} years experience).` : '.') +
            ' Adjust any level that doesn’t feel right — this shapes what we recommend.'
          : 'We couldn’t detect any technical topics in your resume. You can skip this step.'}
      </p>

      <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
        {topics.map((t) => (
          <TopicRatingCard
            key={t.name}
            topic={t}
            level={levels[t.name]}
            onLevel={(lvl) => setLevel(t.name, lvl)}
          />
        ))}
      </div>

      <div className="mt-6 flex gap-3 flex-col sm:flex-row">
        <button
          type="button"
          onClick={submit}
          disabled={topics.length === 0}
          className="flex-1 bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-40"
        >
          Continue →
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 rounded-xl text-gray-500 hover:text-gray-700"
        >
          ← Back
        </button>
      </div>
    </div>
  )
}
