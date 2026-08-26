import { useRef, useState } from 'react'
import apiClient from '../../lib/apiClient'

/**
 * Optional resume upload step of onboarding.
 *
 * Props:
 *   onExtracted(topics, years) — called when the LLM has extracted topics.
 *   onSkip()                   — called if the user chooses to skip.
 *
 * The user can drop a PDF/DOCX, click to select one, or hit Skip. Nothing
 * is persisted from this component — the parent OnboardingPage carries the
 * extracted topics forward through the wizard.
 */
export default function ResumeUpload({ onExtracted, onSkip }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const acceptTypes = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

  function pickFile(f) {
    if (!f) return
    const ok = /\.(pdf|docx)$/i.test(f.name)
    if (!ok) { setError('Please choose a PDF or DOCX file.'); return }
    if (f.size > 5 * 1024 * 1024) { setError('File too large (max 5MB).'); return }
    setError('')
    setFile(f)
  }

  async function upload() {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await apiClient.post('/api/profile/resume', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onExtracted(data.topics || [], data.detected_years_experience || 0)
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Could not read your resume. Please try again or skip.'
      setError(typeof msg === 'string' ? msg : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 max-w-2xl w-full">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Share your resume — optional</h2>
      <p className="text-sm text-gray-600 mb-6">
        Drop your resume or CV and our AI will pre-fill your skills and match you to better courses.
        You can skip this and just describe your goal.
      </p>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          pickFile(e.dataTransfer.files?.[0])
        }}
        className={`block cursor-pointer border-2 border-dashed rounded-xl p-8 text-center transition
          ${dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptTypes}
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
        {file ? (
          <div>
            <p className="font-medium text-gray-900">{file.name}</p>
            <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(0)} KB</p>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setFile(null); inputRef.current.value = '' }}
              className="mt-3 text-sm text-indigo-600 hover:underline"
            >Choose a different file</button>
          </div>
        ) : (
          <div>
            <div className="text-4xl mb-2">📄</div>
            <p className="text-gray-700 font-medium">Drop your resume here, or click to choose</p>
            <p className="text-xs text-gray-500 mt-1">PDF or DOCX · max 5MB</p>
          </div>
        )}
      </label>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex gap-3 flex-col sm:flex-row">
        <button
          type="button"
          disabled={!file || uploading}
          onClick={upload}
          className="flex-1 bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {uploading ? 'Reading your resume…' : 'Extract my skills →'}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="flex-1 sm:flex-none px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Skip
        </button>
      </div>
    </div>
  )
}
