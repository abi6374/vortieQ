import { useState } from 'react'
import apiClient from '../../lib/apiClient'

/**
 * "Rebuild remaining path" — the escape hatch for when a learner wants the
 * whole remaining plan reshuffled. Deliberately buried under the timeline
 * and gated on a confirm click so it can't fire by accident. This is the
 * OLD default behavior of the not-for-me / too-easy buttons; those buttons
 * now do a per-step swap instead.
 */
export default function RebuildTailButton({ pathId, onDone }) {
  const [phase, setPhase] = useState('idle') // 'idle' | 'confirm' | 'loading' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  const run = async () => {
    setPhase('loading')
    setErrorMsg('')
    try {
      await apiClient.post(`/api/paths/${pathId}/rebuild-tail`, {})
      if (typeof onDone === 'function') onDone()
      setPhase('idle')
    } catch (err) {
      setErrorMsg('Could not rebuild the path. Try again.')
      setPhase('error')
    }
  }

  if (phase === 'loading') {
    return (
      <div className="mt-8 text-center text-sm text-gray-500">
        Rebuilding your remaining plan… this can take up to a minute.
      </div>
    )
  }

  return (
    <div className="mt-10 pt-6 border-t border-gray-200 text-center">
      {phase !== 'confirm' && (
        <button
          type="button"
          onClick={() => setPhase('confirm')}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Not the plan you wanted? Rebuild remaining path
        </button>
      )}
      {phase === 'confirm' && (
        <div className="inline-flex flex-col sm:flex-row items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <span className="text-sm text-amber-900">
            This will replace every remaining course with a fresh recommendation. Continue?
          </span>
          <div className="flex gap-2">
            <button
              onClick={run}
              className="px-3 py-1.5 rounded-md bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700"
            >
              Yes, rebuild
            </button>
            <button
              onClick={() => setPhase('idle')}
              className="px-3 py-1.5 rounded-md text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {errorMsg && <p className="mt-2 text-xs text-red-600">{errorMsg}</p>}
    </div>
  )
}
