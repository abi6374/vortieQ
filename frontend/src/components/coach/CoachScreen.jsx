import React, { useEffect, useRef, useState } from 'react'
import { useAIChat } from '../../contexts/AIChatContext'
import api from '../../lib/apiClient'
import AppShell from '../layout/AppShell'
import CustomSelect from '../ui/CustomSelect'

/**
 * CoachScreen — the real, dedicated "AI Coach" full page.
 *
 * Three real tabs:
 *   Chat          — the same persisted, backend-grounded conversation used by
 *                   the floating widget everywhere else (useAIChat), just
 *                   rendered full-page instead of a small panel.
 *   Practice      — real Groq-generated MCQ questions for a topic the learner
 *                   picks, graded client-side against the real correct_index
 *                   the backend returns (no fabricated content).
 *   Project ideas — a real Groq-generated project suggestion built only from
 *                   the learner's real completed/in-progress skills.
 *
 * Practice/project results are generated fresh each time, not persisted to a
 * history table (no schema change needed for this first version).
 */

const TABS = [
  { key: 'chat', label: 'Chat' },
  { key: 'practice', label: 'Practice' },
  { key: 'projects', label: 'Project ideas' },
]

const STARTER_PROMPTS = [
  'Explain my next roadmap task',
  'Help me plan this week',
  'Give me a Python practice question',
  'Suggest a portfolio project',
]

function ChatTab() {
  const { messages, send, loading, hydrating, error, setError } = useAIChat()
  const [input, setInput] = useState('')
  const bodyRef = useRef(null)

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const submit = (e) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    send(text)
  }

  return (
    <div className="coach-chat-card flex-1 min-h-0 h-full bg-white dark:bg-[#121216] border border-[#e0e0e0] dark:border-[#27272F] rounded-2xl overflow-hidden shadow-xs flex flex-col">
      <div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4 bg-[#fafcfe] dark:bg-[#0E0E12] pf-custom-scrollbar">
        {hydrating && <p className="text-xs text-[#7a7a7a] dark:text-[#94A3B8] text-center">Loading your conversation…</p>}
        {!hydrating && messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-[#7a7a7a] dark:text-[#94A3B8] text-sm max-w-2xl mx-auto py-8">
            <div className="w-12 h-12 rounded-2xl bg-[#eaf2fc] dark:bg-[#1A2840] text-[#0066cc] dark:text-[#38BDF8] flex items-center justify-center mb-3 shadow-xs">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <b className="block text-[#1d1d1f] dark:text-white text-lg sm:text-xl mb-1.5 font-['Manrope'] font-bold">Ask PathFinder AI anything</b>
            <p className="mb-6 text-xs sm:text-sm text-[#555555] dark:text-[#94A3B8] leading-relaxed max-w-lg">Why a course is in your path, what to learn next, how you're tracking against your goal — your AI Assistant is here to help you learn faster.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="text-left p-4 bg-white dark:bg-[#18181D] border-[1.5px] border-[#D0D7E2] dark:border-[#27272F] hover:border-black/50 dark:hover:border-[#C9D0D6] hover:bg-[#fafafc] dark:hover:bg-[#202026] rounded-xl text-xs sm:text-sm font-semibold text-[#1d1d1f] dark:text-white transition-all hover:-translate-y-0.5 shadow-sm cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <span>{p}</span>
                  <span className="w-6 h-6 rounded-lg bg-[#F5F5F7] dark:bg-[#121216] group-hover:bg-[#0066cc] text-[#86868b] dark:text-[#94A3B8] group-hover:text-white flex items-center justify-center transition-all text-xs font-bold flex-none">→</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] sm:max-w-[75%] px-4 sm:px-5 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                m.role === 'user'
                  ? 'bg-[#0066cc] text-white rounded-br-sm shadow-xs'
                  : 'bg-white dark:bg-[#18181D] text-[#1d1d1f] dark:text-white border border-[#e0e0e0] dark:border-[#27272F] rounded-bl-sm shadow-xs'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 bg-white dark:bg-[#18181D] border border-[#e0e0e0] dark:border-[#27272F] rounded-2xl rounded-bl-sm flex gap-1.5 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0066cc] dark:bg-[#38BDF8] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#0066cc] dark:bg-[#38BDF8] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#0066cc] dark:bg-[#38BDF8] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mx-4 mb-2 text-xs text-[#B42318] dark:text-red-400 bg-[#FDECEC] dark:bg-red-950/40 border border-[#F3B9B9] dark:border-red-800/60 rounded-xl px-4 py-2.5 flex items-center justify-between flex-none">
          <span>{error.text}</span>
          <button type="button" className="font-bold underline cursor-pointer" onClick={() => { setError(null); send(error.retry) }}>Retry</button>
        </div>
      )}

      <form onSubmit={submit} className="p-3 sm:p-4 border-t border-[#e0e0e0] dark:border-[#27272F] flex items-center gap-3 bg-white dark:bg-[#121216] flex-none">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submit(e) }}
          placeholder="Ask about your path, a skill gap, or what to do next…"
          rows={1}
          className="flex-1 resize-none border border-[#e0e0e0] dark:border-[#27272F] bg-white dark:bg-[#0E0E12] rounded-xl px-4 py-3 text-sm text-[#1d1d1f] dark:text-white placeholder-[#7a7a7a] dark:placeholder-[#94A3B8] focus:outline-none focus:border-[#0066cc] dark:focus:border-[#38BDF8] focus:ring-2 focus:ring-[#0066cc]/15 max-h-28 pf-custom-scrollbar"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="w-11 h-11 rounded-xl bg-[#0066cc] hover:bg-[#004fa3] disabled:opacity-40 text-white flex items-center justify-center flex-none cursor-pointer transition-all shadow-sm active:scale-95"
          aria-label="Send message"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  )
}

function PracticeTab() {
  const [topic, setTopic] = useState('')
  const [count, setCount] = useState(5)
  const [questions, setQuestions] = useState(null)
  const [answers, setAnswers] = useState({})
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generate = async (e) => {
    e?.preventDefault()
    const t = topic.trim()
    if (!t || loading) return
    setLoading(true)
    setError('')
    setChecked(false)
    setAnswers({})
    try {
      const { data } = await api.post('/api/coach/practice', { topic: t, count })
      setQuestions(data.questions)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not generate practice questions right now. Please try again.')
      setQuestions(null)
    } finally {
      setLoading(false)
    }
  }

  const score = questions
    ? questions.reduce((acc, q, i) => acc + (answers[i] === q.correct_index ? 1 : 0), 0)
    : 0

  return (
    <div className="space-y-5">
      <form onSubmit={generate} className="bg-white dark:bg-[#121216] border border-[#e0e0e0] dark:border-[#27272F] rounded-2xl p-5 flex flex-col sm:flex-row gap-3 sm:items-end shadow-xs">
        <div className="flex-1">
          <label className="block text-xs font-bold text-[#333333] dark:text-[#CBD5E1] mb-1.5">What do you want to practice?</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Python dictionaries, SQL joins, React hooks…"
            className="w-full border border-[#e0e0e0] dark:border-[#27272F] bg-white dark:bg-[#0E0E12] text-[#1d1d1f] dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0066cc] dark:focus:border-[#C9D0D6] focus:ring-2 focus:ring-[#0066cc]/15"
          />
        </div>
        <div className="flex-none">
          <label className="block text-xs font-bold text-[#333333] dark:text-[#CBD5E1] mb-1.5">Questions</label>
          <CustomSelect
            value={count}
            onChange={(val) => setCount(Number(val))}
            options={[
              { value: 3, label: '3 Questions', subtitle: 'Quick drill' },
              { value: 5, label: '5 Questions', subtitle: 'Standard (Recommended)' },
              { value: 10, label: '10 Questions', subtitle: 'Deep challenge' },
            ]}
            buttonClassName="w-[140px] bg-white dark:bg-[#0E0E12] border-[#e0e0e0] dark:border-[#27272F] text-[#1d1d1f] dark:text-white"
            ariaLabel="Question count"
          />
        </div>
        <button
          type="submit"
          disabled={!topic.trim() || loading}
          className="px-5 py-2.5 bg-[#0066cc] hover:bg-[#004fa3] disabled:opacity-50 text-white font-bold text-sm rounded-xl whitespace-nowrap cursor-pointer"
        >
          {loading ? 'Generating…' : 'Generate practice questions'}
        </button>
      </form>

      {error && <p className="text-sm text-[#B42318] dark:text-red-400 bg-[#FDECEC] dark:bg-red-950/40 border border-[#F3B9B9] dark:border-red-800/60 rounded-xl px-4 py-3">{error}</p>}

      {questions && (
        <div className="space-y-4">
          {checked && (
            <div className="bg-[#eaf2fc] dark:bg-[#18181D] border border-[#dcecfd] dark:border-[#27272F] rounded-2xl p-4 flex items-center justify-between">
              <span className="font-bold text-[#1d1d1f] dark:text-white">Score: {score} / {questions.length}</span>
              <button type="button" onClick={() => { setChecked(false); setAnswers({}) }} className="text-xs font-bold text-[#0066cc] dark:text-[#C9D0D6] hover:underline cursor-pointer">
                Try again
              </button>
            </div>
          )}
          {questions.map((q, i) => (
            <div key={i} className="bg-white dark:bg-[#121216] border border-[#e0e0e0] dark:border-[#27272F] rounded-2xl p-5 shadow-xs">
              <p className="font-bold text-sm text-[#1d1d1f] dark:text-white mb-3 whitespace-pre-wrap">{i + 1}. {q.question}</p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const isSelected = answers[i] === oi
                  const isCorrect = oi === q.correct_index
                  let style = 'border-[#e0e0e0] dark:border-[#27272F] bg-white dark:bg-[#0E0E12] text-[#1d1d1f] dark:text-white hover:border-[#0066cc] dark:hover:border-[#C9D0D6]'
                  if (checked && isCorrect) style = 'border-[#22A06B] dark:border-emerald-500 bg-[#ECFDF3] dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                  else if (checked && isSelected && !isCorrect) style = 'border-[#E5484D] dark:border-rose-500 bg-[#FFF0F0] dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'
                  else if (!checked && isSelected) style = 'border-[#0066cc] dark:border-[#C9D0D6] bg-[#eaf2fc] dark:bg-[#18181D] text-[#0066cc] dark:text-[#C9D0D6]'
                  return (
                    <button
                      key={oi}
                      type="button"
                      disabled={checked}
                      onClick={() => setAnswers((a) => ({ ...a, [i]: oi }))}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-sm transition-colors cursor-pointer ${style}`}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
              {checked && q.explanation && (
                <p className="mt-3 text-xs text-[#333333] dark:text-[#CBD5E1] bg-[#fafafc] dark:bg-[#0E0E12] border border-transparent dark:border-[#27272F] rounded-lg px-3 py-2">{q.explanation}</p>
              )}
            </div>
          ))}
          {!checked && (
            <button
              type="button"
              onClick={() => setChecked(true)}
              disabled={Object.keys(answers).length !== questions.length}
              className="px-5 py-2.5 bg-[#0066cc] hover:bg-[#004fa3] disabled:opacity-40 text-white font-bold text-sm rounded-xl cursor-pointer"
            >
              Check answers
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ProjectsTab() {
  const [idea, setIdea] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generate = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/api/coach/project-idea')
      setIdea(data)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not generate a project idea right now. Please try again.')
      setIdea(null)
    } finally {
      setLoading(false)
    }
  }

  const DIFF_COLOR = {
    beginner: 'bg-[#ECFDF3] dark:bg-emerald-950/50 text-[#16A34A] dark:text-emerald-300 border-[#D1FADF] dark:border-emerald-800/60',
    intermediate: 'bg-[#eaf2fc] dark:bg-[#18181D] text-[#0066cc] dark:text-[#C9D0D6] border-[#cfe4fb] dark:border-[#27272F]',
    advanced: 'bg-[#FFF0F0] dark:bg-rose-950/50 text-[#E5484D] dark:text-rose-300 border-[#FECDCA] dark:border-rose-800/60',
  }

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-[#121216] border border-[#e0e0e0] dark:border-[#27272F] rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap shadow-xs">
        <div>
          <h3 className="font-bold text-sm text-[#1d1d1f] dark:text-white">Project suggestion</h3>
          <p className="text-xs text-[#7a7a7a] dark:text-[#94A3B8] mt-0.5">Built only from skills you've actually completed or are currently learning.</p>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="px-5 py-2.5 bg-[#0066cc] hover:bg-[#004fa3] disabled:opacity-50 text-white font-bold text-sm rounded-xl whitespace-nowrap cursor-pointer"
        >
          {loading ? 'Thinking…' : idea ? 'Suggest another' : 'Suggest a project'}
        </button>
      </div>

      {error && <p className="text-sm text-[#B42318] dark:text-red-400 bg-[#FDECEC] dark:bg-red-950/40 border border-[#F3B9B9] dark:border-red-800/60 rounded-xl px-4 py-3">{error}</p>}

      {idea && (
        <div className="bg-white dark:bg-[#121216] border border-[#e0e0e0] dark:border-[#27272F] rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h2 className="font-bold text-lg text-[#1d1d1f] dark:text-white">{idea.title}</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize ${DIFF_COLOR[idea.difficulty] || DIFF_COLOR.beginner}`}>
              {idea.difficulty}
            </span>
          </div>
          <p className="text-sm text-[#333333] dark:text-[#CBD5E1] leading-relaxed mb-4">{idea.description}</p>
          <div className="flex items-center gap-4 text-xs text-[#7a7a7a] dark:text-[#94A3B8] mb-3">
            <span>⏱ ~{idea.estimated_hours}h estimated</span>
          </div>
          {idea.skills_used.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {idea.skills_used.map((s) => (
                <span key={s} className="px-2.5 py-1 bg-[#eaf2fc] dark:bg-[#18181D] text-[#0066cc] dark:text-[#C9D0D6] text-xs font-bold rounded-lg">{s}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CoachScreen() {
  const [tab, setTab] = useState('chat')

  return (
    <AppShell contentClassName="h-full overflow-hidden flex flex-col !p-4 sm:!p-6 lg:!p-7">
      <div className="w-full h-full flex flex-col min-h-0 font-['Inter',sans-serif] text-[#1d1d1f] dark:text-white">
        <header className="mb-3.5 flex-none flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-['Manrope'] font-extrabold text-2xl sm:text-[26px] text-[#1d1d1f] dark:text-white tracking-tight">AI Coach</h1>
            <p className="mt-0.5 text-xs sm:text-sm text-[#333333] dark:text-[#94A3B8]">Chat, practice questions, and project ideas — all grounded in your real progress.</p>
          </div>

          <div className="flex gap-1.5 bg-[#f5f5f7] dark:bg-[#121216] border border-transparent dark:border-[#27272F] rounded-xl p-1 w-fit flex-none">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                  tab === t.key ? 'bg-white dark:bg-[#18181D] text-[#0066cc] dark:text-[#C9D0D6] shadow-sm' : 'text-[#6e6e73] dark:text-[#94A3B8] hover:text-[#1d1d1f] dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </header>

        {/* Full-Page AI Assistant & Tools View */}
        <div className="flex-1 min-h-0 h-full flex flex-col w-full overflow-hidden">
          {tab === 'chat' && <ChatTab />}
          {tab === 'practice' && <div className="h-full overflow-y-auto pf-custom-scrollbar pr-1.5"><PracticeTab /></div>}
          {tab === 'projects' && <div className="h-full overflow-y-auto pf-custom-scrollbar pr-1.5"><ProjectsTab /></div>}
        </div>
      </div>
    </AppShell>
  )
}
