import React, { useState, useRef } from 'react'
import apiClient from '../../lib/apiClient'
import ThemeToggle from '../ui/ThemeToggle'

/**
 * LearnerIntakeWorkspace
 * High-fidelity Step 1 Intake Workspace for PathFinder.
 * Features symmetrical Resume Upload (Optional) and Background Description (Required) cards,
 * with full-width "What PathFinder will understand" indicator pills.
 */
export default function LearnerIntakeWorkspace({
  onExtracted,
  onSkip,
  hasExistingPath = false,
}) {
  // Selection mode: 'text' (default) or 'resume'
  const [selectedMethod, setSelectedMethod] = useState('text')

  // Single Text input state (Required)
  const [singleDescription, setSingleDescription] = useState('')
  const descInputRef = useRef(null)

  // Resume upload state
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const [continueError, setContinueError] = useState('')

  // Cached topics extracted from natural language text
  const parsedTopicsRef = useRef([])

  const acceptTypes =
    '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

  const handleFileChange = (f) => {
    if (!f) return
    const isDoc = /\.(pdf|docx)$/i.test(f.name)
    if (!isDoc) {
      setUploadError('Please select a valid PDF or DOCX document.')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds 10 MB limit.')
      return
    }
    setUploadError('')
    setContinueError('')
    setFile(f)
  }

  const handleDescriptionChange = (e) => {
    const val = e.target.value
    setSingleDescription(val)
    if (continueError && val.trim()) setContinueError('')
  }

  const handleContinue = async () => {
    const trimmedDesc = singleDescription.trim()

    // Filling the single text description is strictly REQUIRED
    if (!trimmedDesc) {
      setContinueError('Describing your background in a single text is required before continuing.')
      setSelectedMethod('text')
      descInputRef.current?.focus()
      return
    }

    setUploading(true)
    setContinueError('')

    if (file) {
      setUploadError('')
      try {
        const form = new FormData()
        form.append('file', file)
        const { data } = await apiClient.post('/api/profile/resume', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        const resumeTopics = data.topics || []
        onExtracted(
          resumeTopics,
          data.detected_years_experience || 0,
          data.education || '',
          data.projects || '',
          trimmedDesc || data.suggested_goal || ''
        )
      } catch (err) {
        console.error('Resume extraction failed:', err)
        setUploadError(
          err?.response?.data?.detail ||
            'Could not analyze this resume. Continuing with your background description.'
        )
        onExtracted([], 0, '', '', trimmedDesc)
      } finally {
        setUploading(false)
      }
    } else {
      // Natural Language background description flow
      try {
        let topicsToPass = parsedTopicsRef.current || []
        let detectedYears = 0
        let educationStr = ''
        let projectsStr = ''
        let goalStr = trimmedDesc

        if (topicsToPass.length === 0 && trimmedDesc.length >= 15) {
          try {
            const { data } = await apiClient.post('/api/profile/extract-text', { text: trimmedDesc })
            if (data?.topics && data.topics.length > 0) {
              topicsToPass = data.topics
              detectedYears = data.detected_years_experience || 0
              if (data.education) educationStr = data.education
              if (data.projects) projectsStr = data.projects
              if (data.suggested_goal) goalStr = data.suggested_goal
            }
          } catch (e) {
            console.warn('Inline text extraction fallback:', e)
          }
        }

        onExtracted(
          topicsToPass,
          detectedYears,
          educationStr,
          projectsStr,
          goalStr
        )
      } finally {
        setUploading(false)
      }
    }
  }

  return (
    <div className="w-full max-w-[1140px] bg-white dark:bg-[#0E1522] rounded-2xl border border-[#f0f0f0] dark:border-[#202B3C] shadow-[0_14px_38px_rgba(25,49,75,0.08)] dark:shadow-[0_14px_38px_rgba(0,0,0,0.5)] flex flex-col justify-between overflow-hidden transition-colors min-h-[640px]">
      
      {/* Top Header Row with ThemeToggle & conditional Profile Dropdown */}
      <div className="pt-6 sm:pt-8 pb-3 px-6 sm:px-10 relative">
        <div className="flex items-center justify-end mb-2">
          <ThemeToggle />
        </div>

        <div className="text-center mt-2">
          <h1 className="text-2xl sm:text-3xl md:text-[38px] font-bold text-[#1d1d1f] dark:text-[#F8FAFC] tracking-tight leading-tight flex items-center justify-center gap-2.5 flex-wrap">
            <span>Let’s understand where you are today</span>
            <span className="inline-flex text-[#0066cc] dark:text-[#38BDF8]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L14.4 7.6L20 10L14.4 12.4L12 18L9.6 12.4L4 10L9.6 7.6L12 2Z" />
                <path d="M19 16L20.2 18.8L23 20L20.2 21.2L19 24L17.8 21.2L15 20L17.8 18.8L19 16Z" />
              </svg>
            </span>
          </h1>
          <p className="text-[15px] sm:text-[16px] text-[#555555] dark:text-[#94A3B8] mt-2 font-normal">
            Upload your resume or describe your background to build your customized curriculum.
          </p>
        </div>
      </div>

      {/* Primary Input Area: Two Symmetrical Equal Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 sm:px-10 py-3 flex-1">
        
        {/* Left Card: Resume Upload */}
        <div
          onClick={() => setSelectedMethod('resume')}
          className={`rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all cursor-pointer border-2 ${
            selectedMethod === 'resume'
              ? 'bg-[#fbfdff] dark:bg-[#131D2E] border-[#0066cc] dark:border-[#38BDF8] shadow-[0_6px_24px_rgba(0,102,204,0.08)] ring-1 ring-[#0066cc]/20'
              : 'bg-white dark:bg-[#101726] border-[#e0e0e0] dark:border-[#202C3E] hover:border-[#abd2fb] dark:hover:border-[#38BDF8] shadow-xs'
          }`}
        >
          <div>
            <div className="w-[68px] h-[68px] rounded-2xl bg-[#dbeafc] dark:bg-[#1E293B] text-[#0066cc] dark:text-[#38BDF8] flex items-center justify-center mb-4 shadow-xs">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9 15 12 12 15 15" />
              </svg>
            </div>

            <h2 className="text-[20px] sm:text-[22px] font-bold text-[#1d1d1f] dark:text-[#F8FAFC] mb-1">
              Upload my resume <span className="text-xs font-semibold text-[#7a7a7a] dark:text-[#94A3B8]">(Optional)</span>
            </h2>
            <p className="text-[14px] text-[#555555] dark:text-[#94A3B8] leading-snug mb-4">
              Automatic extraction of your skills, past projects, and experience level.
            </p>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              handleFileChange(e.dataTransfer.files?.[0])
            }}
            onClick={(e) => {
              e.stopPropagation()
              fileInputRef.current?.click()
            }}
            className={`border-2 border-dashed rounded-xl p-5 text-center flex flex-col items-center justify-center relative min-h-[175px] transition-colors ${
              dragOver
                ? 'border-[#0066cc] dark:border-[#38BDF8] bg-[#eaf2fc] dark:bg-[#18263D]'
                : 'border-[#abd2fb] dark:border-[#263750] bg-[#fafbfc] dark:bg-[#121927] hover:bg-[#f1f7fe] dark:hover:bg-[#162133]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptTypes}
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0])}
            />

            {file ? (
              <div className="flex flex-col items-center py-1">
                <div className="w-10 h-10 rounded-full bg-[#ECFDF3] dark:bg-[#064E3B]/40 text-[#22A06B] dark:text-[#34D399] flex items-center justify-center mb-1.5 shadow-xs">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <p className="font-bold text-[#1d1d1f] dark:text-[#F8FAFC] text-[14.5px] max-w-[240px] truncate">{file.name}</p>
                <p className="text-[12.5px] text-[#7a7a7a] dark:text-[#94A3B8] mt-0.5">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB · Ready to analyze
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="mt-2 text-xs font-semibold text-[#0066cc] dark:text-[#38BDF8] hover:underline"
                >
                  Change file
                </button>
              </div>
            ) : (
              <>
                <div className="text-[#0066cc] dark:text-[#38BDF8] mb-1">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>

                <p className="text-[14.5px] text-[#1d1d1f] dark:text-[#F8FAFC] font-medium">
                  Drop your resume here or{' '}
                  <span className="text-[#0066cc] dark:text-[#38BDF8] font-semibold underline underline-offset-2">
                    browse
                  </span>
                </p>
                <p className="text-[12.5px] text-[#7a7a7a] dark:text-[#94A3B8] mt-0.5 mb-2.5">
                  PDF or DOCX · up to 10 MB
                </p>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}
                  className="bg-white dark:bg-[#1A2536] border border-[#0066cc] dark:border-[#38BDF8] text-[#0066cc] dark:text-[#38BDF8] font-semibold text-[13px] px-5 py-1.5 rounded-xl hover:bg-[#eaf2fc] dark:hover:bg-[#1E2D44] transition-colors shadow-xs"
                >
                  Choose file
                </button>
              </>
            )}

            <div className="absolute left-3.5 bottom-2.5 flex items-center gap-1.5 text-[11.5px] font-medium text-[#555555] dark:text-[#94A3B8]">
              <span className="text-[#22A06B] dark:text-emerald-400">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </span>
              <span>Private & secure</span>
            </div>
          </div>

          {uploadError && (
            <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">{uploadError}</p>
          )}
        </div>

        {/* Right Card: Describe in a single text */}
        <div
          onClick={() => setSelectedMethod('text')}
          className={`rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all cursor-pointer border-2 ${
            selectedMethod === 'text'
              ? 'bg-[#fbfdff] dark:bg-[#131D2E] border-[#0066cc] dark:border-[#38BDF8] shadow-[0_6px_24px_rgba(0,102,204,0.08)] ring-1 ring-[#0066cc]/20'
              : 'bg-white dark:bg-[#101726] border-[#e0e0e0] dark:border-[#202C3E] hover:border-[#abd2fb] dark:hover:border-[#38BDF8] shadow-xs'
          }`}
        >
          <div>
            <div className="w-[68px] h-[68px] rounded-2xl bg-[#dbeafc] dark:bg-[#1E293B] text-[#0066cc] dark:text-[#38BDF8] flex items-center justify-center mb-4 shadow-xs">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>

            <h2 className="text-[20px] sm:text-[22px] font-bold text-[#1d1d1f] dark:text-[#F8FAFC] mb-1">
              Describe your background <span className="text-xs font-bold text-[#0066cc] dark:text-[#38BDF8]">(Required)</span>
            </h2>
            <p className="text-[14px] text-[#555555] dark:text-[#94A3B8] leading-snug mb-4">
              Share your current skills, experience, and target career goal.
            </p>
          </div>

          <div className="relative mt-1" onClick={(e) => e.stopPropagation()}>
            <textarea
              ref={descInputRef}
              value={singleDescription}
              onChange={handleDescriptionChange}
              maxLength={1500}
              placeholder="e.g. I have 2 years of Python experience building APIs with FastAPI and Flask. I understand descriptive statistics and basic Pandas for data analysis. I have built 1 data visualization project with Matplotlib. I want to learn Machine Learning from scratch..."
              className="w-full resize-none rounded-xl border border-[#D8DFEB] dark:border-[#263750] bg-[#fbfbfb] dark:bg-[#0E1522] p-3.5 text-[14px] text-[#1d1d1f] dark:text-[#F8FAFC] placeholder-[#7a7a7a] dark:placeholder-[#64748B] leading-relaxed focus:outline-none focus:border-[#0066cc] dark:focus:border-[#38BDF8] focus:bg-white dark:focus:bg-[#141C2B] focus:ring-2 focus:ring-[#0066cc]/15 transition-all shadow-inner"
              style={{ minHeight: 175 }}
            />
            <div className="flex items-center justify-between mt-1 text-[11.5px] font-semibold text-[#7a7a7a] dark:text-[#64748B]">
              <span className={singleDescription.trim() ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-amber-600 dark:text-amber-400"}>
                {singleDescription.trim() ? "✓ Background entered" : "* Required to continue"}
              </span>
              <span className="tabular-nums">{singleDescription.length}/1500</span>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Width "What PathFinder will understand" Indicator Panel */}
      <div className="mx-6 sm:mx-10 bg-[#f9fcff]/90 dark:bg-[#101622] border border-[#ddedfe] dark:border-[#242E40] rounded-2xl p-4 sm:p-5 my-2 shadow-xs">
        <h3 className="font-bold text-[#1d1d1f] dark:text-white text-[14.5px] mb-3">
          What PathFinder will understand
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {/* 1. Skills */}
          <div className="h-[44px] bg-white dark:bg-[#141A26] border border-[#e8eff8] dark:border-[#242E40] rounded-full px-3.5 flex items-center gap-2 text-[#1d1d1f] dark:text-[#F9FAFB] text-[13px] font-semibold shadow-xs hover:border-[#0066cc] dark:hover:border-[#38BDF8] transition-all">
            <span className="text-[#0066cc] dark:text-[#38BDF8] flex-shrink-0">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </span>
            <span className="truncate">Skills</span>
          </div>

          {/* 2. Education */}
          <div className="h-[44px] bg-white dark:bg-[#141A26] border border-[#e8eff8] dark:border-[#242E40] rounded-full px-3.5 flex items-center gap-2 text-[#1d1d1f] dark:text-[#F9FAFB] text-[13px] font-semibold shadow-xs hover:border-[#0066cc] dark:hover:border-[#38BDF8] transition-all">
            <span className="text-[#0066cc] dark:text-[#38BDF8] flex-shrink-0">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </span>
            <span className="truncate">Education</span>
          </div>

          {/* 3. Projects */}
          <div className="h-[44px] bg-white dark:bg-[#141A26] border border-[#e8eff8] dark:border-[#242E40] rounded-full px-3.5 flex items-center gap-2 text-[#1d1d1f] dark:text-[#F9FAFB] text-[13px] font-semibold shadow-xs hover:border-[#0066cc] dark:hover:border-[#38BDF8] transition-all">
            <span className="text-[#0066cc] dark:text-[#38BDF8] flex-shrink-0">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </span>
            <span className="truncate">Projects</span>
          </div>

          {/* 4. Confidence */}
          <div className="h-[44px] bg-white dark:bg-[#141A26] border border-[#e8eff8] dark:border-[#242E40] rounded-full px-3.5 flex items-center gap-2 text-[#1d1d1f] dark:text-[#F9FAFB] text-[13px] font-semibold shadow-xs hover:border-[#0066cc] dark:hover:border-[#38BDF8] transition-all">
            <span className="text-[#0066cc] dark:text-[#38BDF8] flex-shrink-0">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </span>
            <span className="truncate">Confidence</span>
          </div>

          {/* 5. Goal & time */}
          <div className="h-[44px] bg-white dark:bg-[#141A26] border border-[#e8eff8] dark:border-[#242E40] rounded-full px-3.5 flex items-center gap-2 text-[#1d1d1f] dark:text-[#F9FAFB] text-[13px] font-semibold shadow-xs hover:border-[#0066cc] dark:hover:border-[#38BDF8] transition-all">
            <span className="text-[#0066cc] dark:text-[#38BDF8] flex-shrink-0">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </span>
            <span className="truncate">Goal & time</span>
          </div>
        </div>
      </div>

      {/* Continue-blocking validation message */}
      {continueError && (
        <div className="mx-6 sm:mx-10 -mt-1 mb-2">
          <p className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg px-3.5 py-2">
            {continueError}
          </p>
        </div>
      )}

      {/* Footer Controls */}
      <div className="h-[76px] px-6 sm:px-10 border-t border-[#f0f0f0] dark:border-[#1E2638] flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2 text-[13.5px] font-medium text-[#555555] dark:text-[#94A3B8]">
          <span className="text-[#22A06B] dark:text-emerald-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </span>
          <span>You are always in control of what we use.</span>
        </div>

        <button
          type="button"
          onClick={handleContinue}
          disabled={uploading || !singleDescription.trim()}
          title={
            !singleDescription.trim()
              ? 'Please describe your background in the text box (Required) before continuing'
              : undefined
          }
          className="w-[160px] h-[48px] bg-[#0066cc] hover:bg-[#004fa3] active:scale-[0.99] text-white font-bold rounded-xl shadow-[0_4px_14px_rgba(0,102,204,0.35)] transition-all flex items-center justify-center text-[15px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Analyzing...</span>
            </span>
          ) : (
            <span>Continue</span>
          )}
        </button>
      </div>
    </div>
  )
}
