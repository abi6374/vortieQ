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
    <div className="coach-chat-card bg-white border border-[#e0e0e0] rounded-2xl overflow-hidden">
      <div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto p-5 space-y-3 bg-[#fafcfe]">
        {hydrating && <p className="text-xs text-[#7a7a7a] text-center">Loading your conversation…</p>}
        {!hydrating && messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-[#7a7a7a] text-sm max-w-lg mx-auto py-6">
            <b className="block text-[#1d1d1f] text-lg mb-2 font-['Manrope'] font-bold">Ask PathFinder anything</b>
            <p className="mb-6 text-sm text-[#555555] leading-relaxed max-w-md">Why a course is in your path, what to learn next, how you're tracking against your goal — this is the same real assistant everywhere in the app, just full-page here.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="text-left p-4 bg-white border-[1.5px] border-[#D0D7E2] hover:border-[#0066cc] hover:bg-[#eaf2fc] rounded-2xl text-[13.5px] font-semibold text-[#1d1d1f] transition-all hover:translate-y-[-2px] shadow-sm cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{p}</span>
                    <span className="text-[#86868b] text-sm font-bold flex-none">→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                m.role === 'user'
                  ? 'bg-[#0066cc] text-white rounded-br-sm'
                  : 'bg-white text-[#1d1d1f] border border-[#e0e0e0] rounded-bl-sm'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 bg-white border border-[#e0e0e0] rounded-2xl rounded-bl-sm flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c6c6c7] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#c6c6c7] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#c6c6c7] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mx-4 mb-2 text-xs text-[#B42318] bg-[#FDECEC] border border-[#F3B9B9] rounded-lg px-3 py-2 flex items-center justify-between">
          <span>{error.text}</span>
          <button type="button" className="font-bold underline" onClick={() => { setError(null); send(error.retry) }}>Retry</button>
        </div>
      )}

      <form onSubmit={submit} className="p-3 border-t border-[#f5f5f7] flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submit(e) }}
          placeholder="Ask about your path, a skill gap, or what to do next…"
          rows={1}
          className="flex-1 resize-none border border-[#e0e0e0] rounded-xl px-3.5 py-2.5 text-sm text-[#1d1d1f] focus:outline-none focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/15 max-h-24"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="w-10 h-10 rounded-xl bg-[#0066cc] hover:bg-[#004fa3] disabled:opacity-40 text-white flex items-center justify-center flex-none"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
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
      <form onSubmit={generate} className="bg-white border border-[#e0e0e0] rounded-2xl p-5 flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <label className="block text-xs font-bold text-[#333333] mb-1.5">What do you want to practice?</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Python dictionaries, SQL joins, React hooks…"
            className="w-full border border-[#e0e0e0] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/15"
          />
        </div>
        <div className="flex-none">
          <label className="block text-xs font-bold text-[#333333] mb-1.5">Questions</label>
          <CustomSelect
            value={count}
            onChange={(val) => setCount(Number(val))}
            options={[
              { value: 3, label: '3 Questions', subtitle: 'Quick drill' },
              { value: 5, label: '5 Questions', subtitle: 'Standard (Recommended)' },
              { value: 10, label: '10 Questions', subtitle: 'Deep challenge' },
            ]}
            buttonClassName="w-[140px]"
            ariaLabel="Question count"
          />
        </div>
        <button
          type="submit"
          disabled={!topic.trim() || loading}
          className="px-5 py-2.5 bg-[#0066cc] hover:bg-[#004fa3] disabled:opacity-50 text-white font-bold text-sm rounded-xl whitespace-nowrap"
        >
          {loading ? 'Generating…' : 'Generate practice questions'}
        </button>
      </form>

      {error && <p className="text-sm text-[#B42318] bg-[#FDECEC] border border-[#F3B9B9] rounded-xl px-4 py-3">{error}</p>}

      {questions && (
        <div className="space-y-4">
          {checked && (
            <div className="bg-[#eaf2fc] border border-[#dcecfd] rounded-2xl p-4 flex items-center justify-between">
              <span className="font-bold text-[#1d1d1f]">Score: {score} / {questions.length}</span>
              <button type="button" onClick={() => { setChecked(false); setAnswers({}) }} className="text-xs font-bold text-[#0066cc] hover:underline">
                Try again
              </button>
            </div>
          )}
          {questions.map((q, i) => (
            <div key={i} className="bg-white border border-[#e0e0e0] rounded-2xl p-5">
              <p className="font-bold text-sm text-[#1d1d1f] mb-3 whitespace-pre-wrap">{i + 1}. {q.question}</p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const isSelected = answers[i] === oi
                  const isCorrect = oi === q.correct_index
                  let style = 'border-[#e0e0e0] hover:border-[#abd2fb]'
                  if (checked && isCorrect) style = 'border-[#22A06B] bg-[#ECFDF3]'
                  else if (checked && isSelected && !isCorrect) style = 'border-[#E5484D] bg-[#FFF0F0]'
                  else if (!checked && isSelected) style = 'border-[#0066cc] bg-[#eaf2fc]'
                  return (
                    <button
                      key={oi}
                      type="button"
                      disabled={checked}
                      onClick={() => setAnswers((a) => ({ ...a, [i]: oi }))}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-sm transition-colors ${style}`}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
              {checked && q.explanation && (
                <p className="mt-3 text-xs text-[#333333] bg-[#fafafc] rounded-lg px-3 py-2">{q.explanation}</p>
              )}
            </div>
          ))}
          {!checked && (
            <button
              type="button"
              onClick={() => setChecked(true)}
              disabled={Object.keys(answers).length !== questions.length}
              className="px-5 py-2.5 bg-[#0066cc] hover:bg-[#004fa3] disabled:opacity-40 text-white font-bold text-sm rounded-xl"
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
    intermediate: 'bg-[#eaf2fc] dark:bg-blue-950/50 text-[#0066cc] dark:text-blue-300 border-[#cfe4fb] dark:border-blue-800/60',
    advanced: 'bg-[#FFF0F0] dark:bg-rose-950/50 text-[#E5484D] dark:text-rose-300 border-[#FECDCA] dark:border-rose-800/60',
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#e0e0e0] rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-bold text-sm text-[#1d1d1f]">Project suggestion</h3>
          <p className="text-xs text-[#7a7a7a] mt-0.5">Built only from skills you've actually completed or are currently learning.</p>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="px-5 py-2.5 bg-[#0066cc] hover:bg-[#004fa3] disabled:opacity-50 text-white font-bold text-sm rounded-xl whitespace-nowrap"
        >
          {loading ? 'Thinking…' : idea ? 'Suggest another' : 'Suggest a project'}
        </button>
      </div>

      {error && <p className="text-sm text-[#B42318] bg-[#FDECEC] border border-[#F3B9B9] rounded-xl px-4 py-3">{error}</p>}

      {idea && (
        <div className="bg-white border border-[#e0e0e0] rounded-2xl p-6">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h2 className="font-bold text-lg text-[#1d1d1f]">{idea.title}</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize ${DIFF_COLOR[idea.difficulty] || DIFF_COLOR.beginner}`}>
              {idea.difficulty}
            </span>
          </div>
          <p className="text-sm text-[#333333] leading-relaxed mb-4">{idea.description}</p>
          <div className="flex items-center gap-4 text-xs text-[#7a7a7a] mb-3">
            <span>⏱ ~{idea.estimated_hours}h estimated</span>
          </div>
          {idea.skills_used.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {idea.skills_used.map((s) => (
                <span key={s} className="px-2.5 py-1 bg-[#eaf2fc] text-[#0066cc] text-xs font-bold rounded-lg">{s}</span>
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
  const { send } = useAIChat()

  const handleQuickPrompt = (prompt) => {
    setTab('chat')
    send(prompt)
  }

  return (
    <AppShell>
      <div className="w-full font-['Inter',sans-serif] text-[#1d1d1f]">
        <header className="mb-6">
          <h1 className="font-['Manrope'] font-extrabold text-2xl sm:text-[28px] text-[#1d1d1f] tracking-tight">AI Coach</h1>
          <p className="mt-0.5 text-sm text-[#333333]">Chat, practice questions, and project ideas — all grounded in your real progress.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start w-full">
          {/* Main Coach Column */}
          <div className="lg:col-span-7 flex flex-col gap-4 min-w-0">
            <div className="flex gap-1.5 bg-[#f5f5f7] rounded-xl p-1 w-fit">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                    tab === t.key ? 'bg-white text-[#0066cc] shadow-sm' : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'chat' && <ChatTab />}
            {tab === 'practice' && <PracticeTab />}
            {tab === 'projects' && <ProjectsTab />}
          </div>

          {/* Right Rail: Quick Actions & Coach Context */}
          <div className="lg:col-span-5 space-y-6">
            {/* Quick Prompts */}
            <div className="bg-white border-[1.5px] border-[#D0D7E2] rounded-2xl p-6 sm:p-7 shadow-sm">
              <h3 className="font-['Manrope'] font-bold text-base text-[#1d1d1f] mb-4 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-[#eaf2fc] text-[#0066cc] flex items-center justify-center text-sm shadow-xs font-bold">⚡</span>
                Suggested Questions
              </h3>
              <div className="space-y-3">
                {STARTER_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleQuickPrompt(p)}
                    className="w-full text-left px-5 py-3.5 sm:py-4 bg-white hover:bg-[#eaf2fc] border-[1.5px] border-[#D0D7E2] hover:border-[#0066cc] text-[13.5px] sm:text-sm font-semibold text-[#1d1d1f] rounded-2xl transition-all hover:translate-x-1.5 shadow-2xs cursor-pointer flex items-center justify-between group"
                  >
                    <span>{p}</span>
                    <span className="w-7 h-7 rounded-lg bg-[#F5F5F7] group-hover:bg-[#0066cc] text-[#86868b] group-hover:text-white flex items-center justify-center transition-all text-xs font-bold flex-none ml-3 shadow-2xs">
                      →
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Context Awareness Notice */}
            <div className="bg-gradient-to-br from-[#fafbfc] to-[#eaf2fc] dark:from-[#141A26] dark:to-[#182236] border-[1.5px] border-[#BFDBFE] dark:border-[#24344D] rounded-2xl p-6 sm:p-7 shadow-sm">
              <h4 className="font-['Manrope'] font-bold text-sm text-[#1d1d1f] dark:text-[#F9FAFB] mb-2 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#22A06B] shadow-[0_0_8px_rgba(34,160,107,0.6)]" />
                Roadmap-Grounded
              </h4>
              <p className="text-xs sm:text-[13px] text-[#444444] dark:text-[#CBD5E1] leading-relaxed">
                Your AI Coach continuously inspects your completed lessons, quiz outcomes, and target roles to provide accurate, tailored answers.
              </p>
            </div>

            {/* Study Mode Tips */}
            <div className="bg-white border-[1.5px] border-[#D0D7E2] rounded-2xl p-6 sm:p-7 shadow-sm">
              <h4 className="font-['Manrope'] font-bold text-xs uppercase tracking-wider text-[#7a7a7a] mb-3">
                Coaching Modes
              </h4>
              <ul className="text-xs sm:text-[13px] text-[#333333] space-y-3">
                <li className="flex items-start gap-2.5">
                  <span className="text-[#0066cc] font-bold text-base leading-none mt-0.5">•</span>
                  <span><strong>Practice:</strong> Generate multiple-choice questions tailored to your active skills.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-[#0066cc] font-bold text-base leading-none mt-0.5">•</span>
                  <span><strong>Project Ideas:</strong> Get portfolio-ready project concepts with step-by-step guidance.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
