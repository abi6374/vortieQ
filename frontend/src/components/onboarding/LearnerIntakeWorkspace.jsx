import React, { useState, useRef } from 'react'
import apiClient from '../../lib/apiClient'
import UserProfileDropdown from '../ui/UserProfileDropdown'
import ThemeToggle from '../ui/ThemeToggle'

const EMPTY_DRAFT = { skills: '', education: '', projects: '', confidence: '', goal: '', summary: '' }

// Qualitative label for an average suggested_level across real extracted topics.
// Purely descriptive of what was actually detected — never a guess.
function levelLabel(topics) {
  if (!topics.length) return ''
  const order = { basic: 0, intermediate: 1, advanced: 2, expert: 3 }
  const avg = topics.reduce((s, t) => s + (order[t.suggested_level] ?? 0), 0) / topics.length
  if (avg >= 2.5) return 'Expert'
  if (avg >= 1.5) return 'Advanced'
  if (avg >= 0.5) return 'Intermediate'
  return 'Basic'
}

function avgConfidence(topics) {
  if (!topics || !topics.length) return ''
  const sum = topics.reduce((acc, t) => acc + (t.confidence_pct || 80), 0)
  return `${Math.round(sum / topics.length)}%`
}

/**
 * LearnerIntakeWorkspace
 * High-fidelity Step 1 Intake Workspace for PathFinder.
 * Designed to fit seamlessly inside the unified 5-step Onboarding layout with SetupSidebar.
 */
export default function LearnerIntakeWorkspace({
  onExtracted,
  onChatSubmit,
  onSkip,
  githubData,
  githubLoading,
  githubSyncError = '',
  authenticatedUsername = '',
  onSyncGithub,
}) {
  // Selection mode: 'resume' (default selected) or 'chat'
  const [selectedMethod, setSelectedMethod] = useState('resume')

  // Per-user GitHub username state
  const [customUsername, setCustomUsername] = useState(authenticatedUsername || '')
  const [showUsernameInput, setShowUsernameInput] = useState(false)

  // Resume upload state
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  // Chat conversation state
  const [chatStory, setChatStory] = useState('')
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Tell me about your skills, experience, and what you want to achieve.',
    },
  ])
  const [continueError, setContinueError] = useState('')

  // AI Profile Draft
  const [profileDraft, setProfileDraft] = useState(null)

  // Sync draft if GitHub data arrives
  React.useEffect(() => {
    if (githubData?.topics && githubData.topics.length > 0 && !file && chatMessages.length <= 1) {
      const topics = githubData.topics
      const confStr = topics.length ? `${avgConfidence(topics)} (${levelLabel(topics)})` : ''
      setProfileDraft({
        ...EMPTY_DRAFT,
        skills: topics.map((t) => t.name).join(', '),
        confidence: confStr,
        summary: `Imported ${githubData.github_projects?.length || topics.length} repositories for ${customUsername || authenticatedUsername || 'your profile'} with ${githubData.top_languages?.join(', ') || 'modern stacks'}. Detected ${topics.length} skills (~${avgConfidence(topics)} confidence).`,
      })
    }
  }, [githubData, customUsername, authenticatedUsername])

  const handleCustomSync = (e) => {
    e?.preventDefault()
    if (!customUsername.trim()) return
    onSyncGithub?.(customUsername.trim())
    setShowUsernameInput(false)
  }

  // Review & Edit Modal state
  const [isEditingDraft, setIsEditingDraft] = useState(false)
  const [editFormData, setEditFormData] = useState({ ...EMPTY_DRAFT })

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
    setSelectedMethod('resume')
    setProfileDraft({
      ...EMPTY_DRAFT,
      summary: `"${f.name}" is ready. Click Continue to analyze and merge with your profile.`,
    })
  }

  // Handle chat submission
  const handleSendChatMessage = (e) => {
    e?.preventDefault()
    const trimmed = chatStory.trim()
    if (!trimmed) return

    const newMsg = {
      id: Date.now(),
      sender: 'user',
      text: trimmed,
    }
    const updatedMessages = [...chatMessages, newMsg]
    setChatMessages(updatedMessages)
    setChatStory('')
    setSelectedMethod('chat')
    setContinueError('')

    const userNotes = updatedMessages
      .filter((m) => m.sender === 'user')
      .map((m) => m.text)
      .join(' ')

    setProfileDraft({
      ...EMPTY_DRAFT,
      summary: `In your own words: "${userNotes.slice(0, 220)}${userNotes.length > 220 ? '…' : ''}"`,
    })

    // Deliberately does NOT call onChatSubmit here. It used to fire on every
    // single message send, which silently advanced the WHOLE onboarding
    // wizard straight past this screen (skipping Assess Skills too) the
    // instant a learner sent their first message - bypassing the AI Profile
    // Draft entirely along with the visible "Continue" button and its
    // validation. Sending a message now only updates the draft preview;
    // onChatSubmit only fires from handleContinue below, once the learner
    // has actually reviewed the draft and clicked Continue.
  }

  // Handle Continue button action
  const handleContinue = async () => {
    setContinueError('')

    if (selectedMethod === 'resume' && file) {
      setUploading(true)
      setUploadError('')
      try {
        const form = new FormData()
        form.append('file', file)
        const { data } = await apiClient.post('/api/profile/resume', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        const topics = data.topics || []
        const confStr = topics.length ? `${avgConfidence(topics)} (${levelLabel(topics)})` : ''
        setProfileDraft({
          ...EMPTY_DRAFT,
          skills: topics.map((t) => t.name).join(', '),
          confidence: confStr,
          // Real resume context beyond just skills - previously these 3
          // fields stayed blank forever even though the edit modal already
          // had inputs for them; the backend just never extracted them.
          education: data.education || '',
          projects: data.projects || '',
          goal: data.suggested_goal || '',
          summary: topics.length
            ? `Identified ${topics.length} skill${topics.length === 1 ? '' : 's'} (~${avgConfidence(topics)} confidence)${
                data.detected_years_experience ? ` and ~${data.detected_years_experience} years experience` : ''
              }: ${topics.map((t) => t.name).join(', ')}.`
            : 'No specific technical topics were detected in this resume — you can still continue and describe your background.',
        })
        onExtracted(topics, data.detected_years_experience || 0, data.education || '', data.projects || '', data.suggested_goal || '')
      } catch (err) {
        console.error('Resume extraction failed:', err)
        setUploadError(
          err?.response?.data?.detail ||
            'Could not analyze this resume. Please try a different file, or use the chat option instead.'
        )
      } finally {
        setUploading(false)
      }
    } else if (selectedMethod === 'chat') {
      const userNotes = chatMessages
        .filter((m) => m.sender === 'user')
        .map((m) => m.text)
        .join(' ')
        .trim()
      if (userNotes) {
        onChatSubmit?.(userNotes)
      } else if (githubData?.topics && githubData.topics.length > 0) {
        // GitHub data present - resume/chat is optional! Pass through any
        // edits the learner made in "Review and edit" (education/projects/
        // goal) too - previously only (topics, years) were forwarded here,
        // so anything typed into the edit modal for a GitHub-only learner
        // was silently discarded the moment they clicked Continue.
        onExtracted(
          githubData.topics, githubData.detected_years_experience || 0,
          profileDraft?.education || '', profileDraft?.projects || '', profileDraft?.goal || ''
        )
      } else {
        setContinueError('Tell PathFinder a bit about yourself in the chat box before continuing.')
      }
    } else if (githubData?.topics && githubData.topics.length > 0) {
      // Direct pass-through for GitHub users without mandatory resume
      onExtracted(
        githubData.topics, githubData.detected_years_experience || 0,
        profileDraft?.education || '', profileDraft?.projects || '', profileDraft?.goal || ''
      )
    } else {
      setContinueError('Upload a resume or describe your background in the chat box before continuing.')
    }
  }

  const handleSaveDraft = () => {
    setProfileDraft((prev) => ({
      ...EMPTY_DRAFT,
      ...editFormData,
      summary: `We understood that you know ${editFormData.skills || '—'}, studied ${
        editFormData.education || '—'
      }, and aim for ${editFormData.goal || '—'}.`,
    }))
    setIsEditingDraft(false)
  }

  return (
    <div className="w-full max-w-[1140px] bg-white dark:bg-[#0E1522] rounded-2xl border border-[#f0f0f0] dark:border-[#202B3C] shadow-[0_14px_38px_rgba(25,49,75,0.08)] dark:shadow-[0_14px_38px_rgba(0,0,0,0.5)] flex flex-col justify-between overflow-hidden transition-colors">
      
      {/* Top Header Row with Badge, Title, ThemeToggle, and Profile Dropdown */}
      <div className="pt-6 sm:pt-8 pb-3 px-6 sm:px-10 relative">
        <div className="flex items-center justify-between mb-2">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[12px] font-bold uppercase tracking-wider text-[#0066cc] dark:text-[#38BDF8] bg-[#eaf2fc] dark:bg-[#1E293B] border border-[#eaf2fc] dark:border-[#2D3A4F]">
            Step 1 · Learner Intake
          </span>
          <div className="flex items-center gap-2 sm:gap-2.5">
            <ThemeToggle />
            <UserProfileDropdown />
          </div>
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
          <p className="text-[16px] text-[#333333] dark:text-[#94A3B8] mt-2 font-normal">
            {githubData?.topics?.length > 0
              ? 'Your GitHub repositories are linked. Uploading a resume or adding notes is completely optional.'
              : 'Upload your resume or describe your background in your own words.'}
          </p>
        </div>

        {/* GitHub Ingestion Banner if active */}
        {githubLoading && (
          <div className="mt-4 bg-[#eaf2fc] dark:bg-[#132238] border border-[#cfe4fb] dark:border-[#1E3A5F] rounded-xl p-3 flex items-center justify-center gap-2 text-sm text-[#0066cc] dark:text-[#38BDF8] animate-pulse">
            <svg className="animate-spin h-4 w-4 text-[#0066cc] dark:text-[#38BDF8]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>Analyzing repositories, commit velocity, and stacks for {customUsername || 'your profile'}...</span>
          </div>
        )}

        {githubSyncError && !githubLoading && (
          <p className="mt-4 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg px-3.5 py-2.5">
            {githubSyncError}
          </p>
        )}

        {githubData?.topics && githubData.topics.length > 0 && !githubLoading && (
          <div className="mt-4 bg-[#F8FAFD] dark:bg-[#141C2B] border border-[#DCE4F0] dark:border-[#24334A] rounded-xl p-3.5 flex flex-col gap-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#181717] dark:bg-[#1E293B] text-white flex items-center justify-center flex-none">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0E1B38] dark:text-[#F8FAFC] flex items-center gap-1.5 flex-wrap">
                    <span>GitHub: @{customUsername || authenticatedUsername || 'Connected User'}</span>
                    <span className="bg-[#ECFDF3] dark:bg-[#064E3B]/30 text-[#22A06B] dark:text-[#34D399] text-[11px] px-2 py-0.5 rounded-full font-bold">
                      {githubData.github_projects?.length || 0} Repos Synced
                    </span>
                  </p>
                  <p className="text-[12px] text-[#52617D] dark:text-[#94A3B8] mt-0.5">
                    Stack: {githubData.top_languages?.join(', ') || 'Python, TypeScript'} · Experience: ~{githubData.detected_years_experience || 1} yrs
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowUsernameInput((v) => !v)}
                  className="px-2.5 py-1.5 border border-[#D8DFEB] dark:border-[#2D3F59] hover:bg-white dark:hover:bg-[#1E293B] text-[#52617D] dark:text-[#CBD5E1] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  {showUsernameInput ? 'Hide' : 'Switch GitHub User'}
                </button>
                <button
                  type="button"
                  onClick={handleContinue}
                  className="px-3.5 py-1.5 bg-[#0066CC] hover:bg-[#0052A3] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer flex-none"
                >
                  Continue with this Stack →
                </button>
              </div>
            </div>

            {/* Inline Username Switcher */}
            {showUsernameInput && (
              <form onSubmit={handleCustomSync} className="pt-2 border-t border-[#E6EAF2] dark:border-[#24334A] flex items-center gap-2">
                <div className="flex-1 flex items-center bg-white dark:bg-[#0B0F17] border border-[#D8DFEB] dark:border-[#2D3F59] rounded-full p-1 pl-3.5 shadow-2xs focus-within:border-[#0066cc] dark:focus-within:border-[#38BDF8] focus-within:ring-2 focus-within:ring-[#0066cc]/15 transition-all">
                  <span className="text-[#888888] dark:text-[#94A3B8] text-xs font-mono font-bold mr-1 select-none">
                    github.com/
                  </span>
                  <input
                    type="text"
                    value={customUsername}
                    onChange={(e) => setCustomUsername(e.target.value)}
                    placeholder="your-username"
                    className="bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 text-xs text-[#0E1B38] dark:text-[#F8FAFC] placeholder-[#888888] dark:placeholder-[#64748B] w-full flex-1"
                    style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!customUsername.trim()}
                  className="px-3.5 py-1.5 bg-[#0066CC] hover:bg-[#0052A3] text-white text-xs font-bold rounded-full transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs active:scale-95 flex-none"
                >
                  <span>Sync Repos</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Sync Prompt if no GitHub data loaded yet */}
        {!githubData && !githubLoading && (
          <div className="mt-4 bg-[#F8FAFD] dark:bg-[#141C2B] border border-[#E1E6F0] dark:border-[#24334A] rounded-2xl sm:rounded-full p-2 sm:px-4 sm:py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-7 h-7 rounded-full bg-[#181717] dark:bg-[#1E293B] text-white flex items-center justify-center flex-none text-xs shadow-2xs">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </span>
              <p className="text-xs text-[#52617D] dark:text-[#94A3B8] font-medium leading-tight truncate">
                Have a GitHub profile? Connect your handle to automatically import your repos & stack.
              </p>
            </div>
            <form onSubmit={handleCustomSync} className="flex items-center bg-white dark:bg-[#0B0F17] border border-[#D8DFEB] dark:border-[#2D3F59] rounded-full p-1 pl-3.5 shadow-2xs focus-within:border-[#0066cc] dark:focus-within:border-[#38BDF8] focus-within:ring-2 focus-within:ring-[#0066cc]/15 transition-all w-full sm:w-auto min-w-[220px]">
              <span className="text-[#888888] dark:text-[#94A3B8] text-xs font-mono font-bold mr-1 select-none">
                @
              </span>
              <input
                type="text"
                value={customUsername}
                onChange={(e) => setCustomUsername(e.target.value)}
                placeholder="github-handle"
                className="bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 text-xs text-[#0E1B38] dark:text-[#F8FAFC] placeholder-[#888888] dark:placeholder-[#64748B] w-full flex-1"
                style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
              />
              <button
                type="submit"
                disabled={!customUsername.trim()}
                className="px-3.5 py-1.5 bg-[#0066CC] hover:bg-[#0052A3] text-white text-xs font-bold rounded-full transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs active:scale-95 flex-none"
              >
                <span>Sync</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Primary Input Area: Two Equal Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 sm:px-10 py-4">
        
        {/* Left Card: Resume Upload */}
        <div
          onClick={() => setSelectedMethod('resume')}
          className={`rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all cursor-pointer ${
            selectedMethod === 'resume'
              ? 'bg-[#fbfdff] dark:bg-[#131D2E] border-2 border-[#0066cc] dark:border-[#38BDF8] shadow-[0_6px_24px_rgba(0,102,204,0.08)] ring-1 ring-[#0066cc]/20'
              : 'bg-white dark:bg-[#101726] border border-[#e0e0e0] dark:border-[#202C3E] hover:border-[#abd2fb] dark:hover:border-[#38BDF8] shadow-xs'
          }`}
        >
          <div>
            <div className="w-[74px] h-[74px] rounded-2xl bg-[#dbeafc] dark:bg-[#1E293B] text-[#0066cc] dark:text-[#38BDF8] flex items-center justify-center mb-4">
              <svg
                width="34"
                height="34"
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

            <h2 className="text-[22px] font-bold text-[#1d1d1f] dark:text-[#F8FAFC] mb-1">
              Upload my resume
            </h2>
            <p className="text-[14.5px] text-[#333333] dark:text-[#94A3B8] leading-snug mb-4">
              Upload a PDF or DOCX and we’ll identify your skills, projects and experience.
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
            className={`border-2 border-dashed rounded-xl p-5 text-center flex flex-col items-center justify-center relative min-h-[160px] transition-colors ${
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
                <div className="w-9 h-9 rounded-full bg-[#ECFDF3] dark:bg-[#064E3B]/40 text-[#22A06B] dark:text-[#34D399] flex items-center justify-center mb-1.5">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

            <div className="absolute left-3.5 bottom-2.5 flex items-center gap-1.5 text-[11.5px] font-medium text-[#333333] dark:text-[#94A3B8]">
              <span className="text-[#22A06B] dark:text-emerald-400">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </span>
              <span>Private and secure</span>
            </div>
          </div>

          {uploadError && (
            <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">{uploadError}</p>
          )}
        </div>

        {/* Right Card: Natural Language Chat */}
        <div
          onClick={() => setSelectedMethod('chat')}
          className={`rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all cursor-pointer ${
            selectedMethod === 'chat'
              ? 'bg-[#fbfdff] dark:bg-[#131D2E] border-2 border-[#0066cc] dark:border-[#38BDF8] shadow-[0_6px_24px_rgba(0,102,204,0.08)] ring-1 ring-[#0066cc]/20'
              : 'bg-white dark:bg-[#101726] border border-[#e0e0e0] dark:border-[#202C3E] hover:border-[#abd2fb] dark:hover:border-[#38BDF8] shadow-xs'
          }`}
        >
          <div>
            <div className="w-[74px] h-[74px] rounded-2xl bg-[#dbeafc] dark:bg-[#1E293B] text-[#0066cc] dark:text-[#38BDF8] flex items-center justify-center mb-4">
              <svg
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <path d="M13 8l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="currentColor" />
              </svg>
            </div>

            <h2 className="text-[22px] font-bold text-[#1d1d1f] dark:text-[#F8FAFC] mb-1">
              Tell PathFinder in a chat
            </h2>
            <p className="text-[14.5px] text-[#333333] dark:text-[#94A3B8] leading-snug mb-4">
              Describe your background naturally. We’ll build your learner profile together.
            </p>
          </div>

          <div className="space-y-2.5 max-h-[170px] overflow-y-auto pr-1">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-6 h-6 rounded-full bg-[#dbeafc] dark:bg-[#1E293B] text-[#0066cc] dark:text-[#38BDF8] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L14.4 7.6L20 10L14.4 12.4L12 18L9.6 12.4L4 10L9.6 7.6L12 2Z" />
                    </svg>
                  </div>
                )}
                <div
                  className={`text-[13.5px] leading-relaxed rounded-2xl px-3.5 py-2 max-w-[88%] ${
                    msg.sender === 'user'
                      ? 'bg-[#0066cc] text-white rounded-tr-sm shadow-xs'
                      : 'bg-[#eaf2fc] dark:bg-[#182438] text-[#1d1d1f] dark:text-[#F1F5F9] rounded-tl-sm border border-[#e3f0fe] dark:border-[#22334D]'
                  }`}
                >
                  {msg.text}
                </div>
                {msg.sender === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-[#e9e9e9] dark:bg-[#1E293B] text-[#7a7a7a] dark:text-[#CBD5E1] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          <form
            onSubmit={handleSendChatMessage}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#fbfbfb] dark:bg-[#121927] border border-[#e0e0e0] dark:border-[#263750] rounded-xl px-3 py-1.5 flex items-center justify-between gap-2 mt-4 focus-within:border-[#0066cc] dark:focus-within:border-[#38BDF8] focus-within:bg-white dark:focus-within:bg-[#162133] focus-within:ring-2 focus-within:ring-[#0066cc]/15 transition-all shadow-xs"
          >
            <input
              type="text"
              value={chatStory}
              onChange={(e) => setChatStory(e.target.value)}
              placeholder="Type your story here..."
              className="w-full bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 ring-0 shadow-none text-[14px] text-[#1d1d1f] dark:text-[#F8FAFC] placeholder-[#7a7a7a] dark:placeholder-[#64748B] px-1"
              style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
            />
            <button
              type="submit"
              className="w-7 h-7 rounded-full bg-[#0066cc] hover:bg-[#004fa3] text-white flex items-center justify-center cursor-pointer transition-colors shadow-sm flex-shrink-0"
              aria-label="Send message"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      {/* Reassurance text */}
      <div className="text-center py-1">
        <p className="text-[14.5px] text-[#333333] dark:text-[#94A3B8]">
          You can{' '}
          <button
            type="button"
            onClick={() =>
              setSelectedMethod((prev) => (prev === 'resume' ? 'chat' : 'resume'))
            }
            className="text-[#0066cc] dark:text-[#38BDF8] font-semibold hover:underline cursor-pointer focus:outline-none"
          >
            add the other
          </button>{' '}
          later.
        </p>
      </div>

      {/* Bottom Profile-Understanding Panel */}
      <div className="mx-6 sm:mx-10 bg-[#f9fcff]/90 dark:bg-[#101622] border border-[#ddedfe] dark:border-[#242E40] rounded-2xl p-4 sm:p-5 my-3 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          
          {/* Left Column: 5 Compact Chips */}
          <div className="lg:col-span-7 xl:col-span-8">
            <h3 className="font-bold text-[#1d1d1f] dark:text-white text-[14.5px] mb-2.5">
              What PathFinder will understand
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              <div className="h-[42px] bg-white dark:bg-[#141A26] border border-[#f0f0f0] dark:border-[#242E40] rounded-xl px-2.5 flex items-center gap-1.5 text-[#1d1d1f] dark:text-[#F9FAFB] text-[12.5px] font-semibold shadow-xs hover:border-[#0066cc] dark:hover:border-[#38BDF8] transition-all">
                <span className="text-[#0066cc] dark:text-[#38BDF8] flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04z" />
                    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z" />
                  </svg>
                </span>
                <span className="truncate">Skills</span>
              </div>

              <div className="h-[42px] bg-white dark:bg-[#141A26] border border-[#f0f0f0] dark:border-[#242E40] rounded-xl px-2.5 flex items-center gap-1.5 text-[#1d1d1f] dark:text-[#F9FAFB] text-[12.5px] font-semibold shadow-xs hover:border-[#0066cc] dark:hover:border-[#38BDF8] transition-all">
                <span className="text-[#0066cc] dark:text-[#38BDF8] flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                  </svg>
                </span>
                <span className="truncate">Education</span>
              </div>

              <div className="h-[42px] bg-white dark:bg-[#141A26] border border-[#f0f0f0] dark:border-[#242E40] rounded-xl px-2.5 flex items-center gap-1.5 text-[#1d1d1f] dark:text-[#F9FAFB] text-[12.5px] font-semibold shadow-xs hover:border-[#0066cc] dark:hover:border-[#38BDF8] transition-all">
                <span className="text-[#0066cc] dark:text-[#38BDF8] flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                </span>
                <span className="truncate">Projects</span>
              </div>

              <div className="h-[42px] bg-white dark:bg-[#141A26] border border-[#f0f0f0] dark:border-[#242E40] rounded-xl px-2.5 flex items-center gap-1.5 text-[#1d1d1f] dark:text-[#F9FAFB] text-[12.5px] font-semibold shadow-xs hover:border-[#0066cc] dark:hover:border-[#38BDF8] transition-all">
                <span className="text-[#0066cc] dark:text-[#38BDF8] flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                </span>
                <span className="truncate">Confidence</span>
              </div>

              <div className="h-[42px] bg-white dark:bg-[#141A26] border border-[#f0f0f0] dark:border-[#242E40] rounded-xl px-2.5 flex items-center gap-1.5 text-[#1d1d1f] dark:text-[#F9FAFB] text-[12.5px] font-semibold shadow-xs hover:border-[#0066cc] dark:hover:border-[#38BDF8] transition-all">
                <span className="text-[#0066cc] dark:text-[#38BDF8] flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                </span>
                <span className="truncate">Goal & time</span>
              </div>
            </div>
          </div>

          {/* Right Column: AI Profile Draft */}
          <div className="lg:col-span-5 xl:col-span-4 lg:border-l lg:border-[#f0f0f0] dark:lg:border-[#242E40] lg:pl-5">
            <div className="flex items-center gap-1.5 text-[#1d1d1f] dark:text-white font-bold text-[14.5px]">
              <span className="text-[#0066cc] dark:text-[#38BDF8]">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L14.4 7.6L20 10L14.4 12.4L12 18L9.6 12.4L4 10L9.6 7.6L12 2Z" />
                </svg>
              </span>
              <span>AI Profile Draft</span>
            </div>

            <p className="text-[13px] text-[#333333] dark:text-[#94A3B8] leading-relaxed mt-1">
              {profileDraft?.summary
                ? `"${profileDraft.summary}"`
                : 'Upload a resume or start describing your background — your real profile draft will appear here.'}
            </p>

            <button
              type="button"
              disabled={!profileDraft}
              onClick={() => {
                setEditFormData({ ...EMPTY_DRAFT, ...profileDraft })
                setIsEditingDraft(true)
              }}
              className="mt-2 text-[#0066cc] dark:text-[#38BDF8] text-[12.5px] font-bold inline-flex items-center gap-1.5 hover:underline cursor-pointer focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:no-underline"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
              <span>Review and edit</span>
            </button>
          </div>

        </div>
      </div>

      {/* Continue-blocking validation, shown right above the footer */}
      {continueError && (
        <div className="mx-6 sm:mx-10 -mt-1 mb-2">
          <p className="text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg px-3.5 py-2">
            {continueError}
          </p>
        </div>
      )}

      {/* Footer Controls */}
      <div className="h-[76px] px-6 sm:px-10 border-t border-[#f0f0f0] dark:border-[#1E2638] flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13.5px] font-medium text-[#333333] dark:text-[#94A3B8]">
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
          disabled={uploading || !profileDraft}
          title={!profileDraft ? 'Upload a resume, connect GitHub, or describe your background first' : undefined}
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
            'Continue'
          )}
        </button>
      </div>

      {/* Edit Modal */}
      {isEditingDraft && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141A26] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#e0e0e0] dark:border-[#242E40] animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#f0f0f0] dark:border-[#242E40]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#dbeafc] dark:bg-[#1E293B] text-[#0066cc] dark:text-[#38BDF8] flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L14.4 7.6L20 10L14.4 12.4L12 18L9.6 12.4L4 10L9.6 7.6L12 2Z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-[#1d1d1f] dark:text-white">Edit AI Profile Draft</h3>
              </div>
              <button
                onClick={() => setIsEditingDraft(false)}
                className="text-[#7a7a7a] hover:text-[#1d1d1f] dark:hover:text-white text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 py-4 text-left">
              <div>
                <label className="block text-xs font-bold text-[#1d1d1f] dark:text-[#CBD5E1] uppercase tracking-wider mb-1">
                  Skills & Tools
                </label>
                <input
                  type="text"
                  value={editFormData.skills}
                  onChange={(e) => setEditFormData({ ...editFormData, skills: e.target.value })}
                  className="w-full bg-[#fbfbfb] dark:bg-[#0E131E] border border-[#e0e0e0] dark:border-[#242E40] rounded-xl px-3.5 py-2.5 text-sm text-[#1d1d1f] dark:text-white focus:border-[#0066cc] dark:focus:border-[#38BDF8] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1d1d1f] dark:text-[#CBD5E1] uppercase tracking-wider mb-1">
                  Education & Background
                </label>
                <input
                  type="text"
                  value={editFormData.education}
                  onChange={(e) => setEditFormData({ ...editFormData, education: e.target.value })}
                  className="w-full bg-[#fbfbfb] dark:bg-[#0E131E] border border-[#e0e0e0] dark:border-[#242E40] rounded-xl px-3.5 py-2.5 text-sm text-[#1d1d1f] dark:text-white focus:border-[#0066cc] dark:focus:border-[#38BDF8] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1d1d1f] dark:text-[#CBD5E1] uppercase tracking-wider mb-1">
                  Projects Mentioned
                </label>
                <input
                  type="text"
                  value={editFormData.projects}
                  onChange={(e) => setEditFormData({ ...editFormData, projects: e.target.value })}
                  className="w-full bg-[#fbfbfb] dark:bg-[#0E131E] border border-[#e0e0e0] dark:border-[#242E40] rounded-xl px-3.5 py-2.5 text-sm text-[#1d1d1f] dark:text-white focus:border-[#0066cc] dark:focus:border-[#38BDF8] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1d1d1f] dark:text-[#CBD5E1] uppercase tracking-wider mb-1">
                  Career Goal & Target
                </label>
                <input
                  type="text"
                  value={editFormData.goal}
                  onChange={(e) => setEditFormData({ ...editFormData, goal: e.target.value })}
                  className="w-full bg-[#fbfbfb] dark:bg-[#0E131E] border border-[#e0e0e0] dark:border-[#242E40] rounded-xl px-3.5 py-2.5 text-sm text-[#1d1d1f] dark:text-white focus:border-[#0066cc] dark:focus:border-[#38BDF8] outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f0f0f0] dark:border-[#242E40]">
              <button
                type="button"
                onClick={() => setIsEditingDraft(false)}
                className="px-4 py-2 text-sm font-semibold text-[#333333] dark:text-[#CBD5E1] hover:text-[#1d1d1f] dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-5 py-2 bg-[#0066cc] hover:bg-[#004fa3] text-white text-sm font-bold rounded-xl shadow-sm"
              >
                Save Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
