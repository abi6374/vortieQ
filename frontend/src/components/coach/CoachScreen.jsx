import React, { useEffect, useRef, useState } from 'react'
import { useAIChat } from '../../contexts/AIChatContext'
import api from '../../lib/apiClient'
import AppShell from '../layout/AppShell'

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
    <div className="coach-chat-card bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
      <div ref={bodyRef} className="flex-1 min-h-0 overflow-y-auto p-5 space-y-3 bg-[#FAFBFE]">
        {hydrating && <p className="text-xs text-[#74819A] text-center">Loading your conversation…</p>}
        {!hydrating && messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-[#74819A] text-sm max-w-md mx-auto">
            <b className="block text-[#0E1B38] text-base mb-1.5">Ask PathFinder anything</b>
            <p className="mb-4">Why a course is in your path, what to learn next, how you're tracking against your goal — this is the same real assistant everywhere in the app, just full-page here.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="text-left px-3.5 py-2.5 bg-white border border-[#D8DFEB] rounded-xl text-xs sm:text-[13px] font-semibold text-[#0E1B38] hover:border-[#5B36E9] hover:bg-[#F5F1FF] transition-colors"
                >
                  {p}
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
                  ? 'bg-[#5B36E9] text-white rounded-br-sm'
                  : 'bg-white text-[#0E1B38] border border-[#E5E7EB] rounded-bl-sm'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 bg-white border border-[#E5E7EB] rounded-2xl rounded-bl-sm flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B9C2D4] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#B9C2D4] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#B9C2D4] animate-bounce" style={{ animationDelay: '300ms' }} />
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

      <form onSubmit={submit} className="p-3 border-t border-[#EEF2F7] flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submit(e) }}
          placeholder="Ask about your path, a skill gap, or what to do next…"
          rows={1}
          className="flex-1 resize-none border border-[#D8DFEB] rounded-xl px-3.5 py-2.5 text-sm text-[#0E1B38] focus:outline-none focus:border-[#5B36E9] focus:ring-2 focus:ring-[#5B36E9]/15 max-h-24"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="w-10 h-10 rounded-xl bg-[#5B36E9] hover:bg-[#4826C9] disabled:opacity-40 text-white flex items-center justify-center flex-none"
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
      <form onSubmit={generate} className="bg-white border border-[#E5E7EB] rounded-2xl p-5 flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <label className="block text-xs font-bold text-[#52617D] mb-1.5">What do you want to practice?</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Python dictionaries, SQL joins, React hooks…"
            className="w-full border border-[#D8DFEB] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#5B36E9] focus:ring-2 focus:ring-[#5B36E9]/15"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#52617D] mb-1.5">Questions</label>
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="border border-[#D8DFEB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#5B36E9]"
          >
            {[3, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button
          type="submit"
          disabled={!topic.trim() || loading}
          className="px-5 py-2.5 bg-[#5B36E9] hover:bg-[#4826C9] disabled:opacity-50 text-white font-bold text-sm rounded-xl whitespace-nowrap"
        >
          {loading ? 'Generating…' : 'Generate practice questions'}
        </button>
      </form>

      {error && <p className="text-sm text-[#B42318] bg-[#FDECEC] border border-[#F3B9B9] rounded-xl px-4 py-3">{error}</p>}

      {questions && (
        <div className="space-y-4">
          {checked && (
            <div className="bg-[#F5F1FF] border border-[#E4DCFD] rounded-2xl p-4 flex items-center justify-between">
              <span className="font-bold text-[#0E1B38]">Score: {score} / {questions.length}</span>
              <button type="button" onClick={() => { setChecked(false); setAnswers({}) }} className="text-xs font-bold text-[#5B36E9] hover:underline">
                Try again
              </button>
            </div>
          )}
          {questions.map((q, i) => (
            <div key={i} className="bg-white border border-[#E5E7EB] rounded-2xl p-5">
              <p className="font-bold text-sm text-[#0E1B38] mb-3 whitespace-pre-wrap">{i + 1}. {q.question}</p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const isSelected = answers[i] === oi
                  const isCorrect = oi === q.correct_index
                  let style = 'border-[#D8DFEB] hover:border-[#B7A7FF]'
                  if (checked && isCorrect) style = 'border-[#22A06B] bg-[#ECFDF3]'
                  else if (checked && isSelected && !isCorrect) style = 'border-[#E5484D] bg-[#FFF0F0]'
                  else if (!checked && isSelected) style = 'border-[#5B36E9] bg-[#F5F1FF]'
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
                <p className="mt-3 text-xs text-[#52617D] bg-[#F8FAFC] rounded-lg px-3 py-2">{q.explanation}</p>
              )}
            </div>
          ))}
          {!checked && (
            <button
              type="button"
              onClick={() => setChecked(true)}
              disabled={Object.keys(answers).length !== questions.length}
              className="px-5 py-2.5 bg-[#5B36E9] hover:bg-[#4826C9] disabled:opacity-40 text-white font-bold text-sm rounded-xl"
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
    beginner: 'bg-[#ECFDF3] text-[#16A34A] border-[#D1FADF]',
    intermediate: 'bg-[#F3EEFF] text-[#5B36E9] border-[#DDD2FF]',
    advanced: 'bg-[#FFF0F0] text-[#E5484D] border-[#FECDCA]',
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-bold text-sm text-[#0E1B38]">Project suggestion</h3>
          <p className="text-xs text-[#74819A] mt-0.5">Built only from skills you've actually completed or are currently learning.</p>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="px-5 py-2.5 bg-[#5B36E9] hover:bg-[#4826C9] disabled:opacity-50 text-white font-bold text-sm rounded-xl whitespace-nowrap"
        >
          {loading ? 'Thinking…' : idea ? 'Suggest another' : 'Suggest a project'}
        </button>
      </div>

      {error && <p className="text-sm text-[#B42318] bg-[#FDECEC] border border-[#F3B9B9] rounded-xl px-4 py-3">{error}</p>}

      {idea && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h2 className="font-bold text-lg text-[#0E1B38]">{idea.title}</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${DIFF_COLOR[idea.difficulty] || DIFF_COLOR.beginner}`}>
              {idea.difficulty}
            </span>
          </div>
          <p className="text-sm text-[#52617D] leading-relaxed mb-4">{idea.description}</p>
          <div className="flex items-center gap-4 text-xs text-[#74819A] mb-3">
            <span>⏱ ~{idea.estimated_hours}h estimated</span>
          </div>
          {idea.skills_used.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {idea.skills_used.map((s) => (
                <span key={s} className="px-2.5 py-1 bg-[#F5F1FF] text-[#5B36E9] text-xs font-bold rounded-lg">{s}</span>
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
    <AppShell>
      <div className="coach-page max-w-[1000px] font-['Inter',sans-serif] text-[#172554]">
        <header>
          <h1 className="font-['Manrope'] font-extrabold text-2xl sm:text-[28px] text-[#0E1B38] tracking-tight">AI Coach</h1>
          <p className="mt-0.5 text-sm text-[#52617D]">Chat, practice questions, and project ideas — all grounded in your real progress.</p>
        </header>

        <div className="flex gap-1.5 bg-[#EEF2F7] rounded-xl p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                tab === t.key ? 'bg-white text-[#5B36E9] shadow-sm' : 'text-[#64748B] hover:text-[#0E1B38]'
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
    </AppShell>
  )
}
