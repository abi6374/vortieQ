import React, { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAIChat } from '../../contexts/AIChatContext'
import { useAuth } from '../../hooks/useAuth'

/**
 * The one and only "Ask PathFinder" assistant. Mounted once at app-shell level,
 * bottom-right, on authenticated dashboard/inner pages.
 * Never appears on the Signup/Landing/Onboarding pages or full AI Coach page.
 */

const V = '#0066cc'

const STYLES = `
.pfchat-fab{ position:fixed; bottom:24px; right:28px; z-index:30; display:flex; align-items:center; gap:9px;
  background:#fff; border:1px solid #e0e0e0; border-radius:999px; padding:8px 16px 8px 8px;
  box-shadow:0 8px 22px rgba(0,102,204,.18); cursor:pointer; transition:box-shadow .15s, transform .12s;
  font-family:"Inter",system-ui,sans-serif; }
.pfchat-fab:hover{ box-shadow:0 12px 28px rgba(0,102,204,.26); transform:translateY(-1px); }
.pfchat-fab .b{ width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg,#0071e3,${V});
  color:#fff; display:grid; place-items:center; flex:none; }
.pfchat-fab span{ font-weight:600; font-size:13.5px; color:#1d1d1f; }
/* Above the mobile bottom nav (64px) so it never overlaps it. */
@media (max-width:767px){
  .pfchat-fab{ bottom:calc(64px + 14px); right:16px; }
  .pfchat-fab span{ display:none; }
  .pfchat-fab{ padding:8px; }
  .pfchat-panel{ bottom:calc(64px + 14px); right:16px; left:16px; width:auto; }
}

.pfchat-panel{ position:fixed; bottom:24px; right:28px; z-index:31; width:min(400px, calc(100vw - 32px));
  height:min(560px, calc(100vh - 44px)); background:#fff; border:1px solid #e0e0e0; border-radius:18px;
  box-shadow:0 18px 48px rgba(25,49,75,.20); display:flex; flex-direction:column; overflow:hidden;
  font-family:"Inter",system-ui,sans-serif; }
.pfchat-head{ display:flex; align-items:center; gap:11px; padding:14px 16px; border-bottom:1px solid #f5f5f7; flex:none; }
.pfchat-head .av{ width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg,#0071e3,${V});
  color:#fff; display:grid; place-items:center; flex:none; }
.pfchat-head .t{ flex:1; min-width:0; }
.pfchat-head .n{ font-weight:700; font-size:14.5px; color:#1d1d1f; letter-spacing:-.01em; }
.pfchat-head .s{ font-size:11.5px; color:#22A06B; display:flex; align-items:center; gap:5px; }
.pfchat-head .s i{ width:6px; height:6px; border-radius:50%; background:#22A06B; display:block; }
.pfchat-head button{ background:none; border:none; cursor:pointer; color:#7a7a7a; padding:6px; border-radius:8px; display:grid; place-items:center; }
.pfchat-head button:hover{ background:#f5f5f7; color:#1d1d1f; }

.pfchat-body{ flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px; background:#fafcfe; }
.pfchat-empty{ margin:auto; text-align:center; color:#7a7a7a; font-size:13.5px; padding:20px; }
.pfchat-empty b{ display:block; color:#1d1d1f; font-size:15px; margin-bottom:6px; }
.pfchat-sugg{ display:flex; flex-direction:column; gap:8px; margin-top:16px; }
.pfchat-sugg button{ background:#fff; border:1px solid #e0e0e0; border-radius:10px; padding:9px 12px;
  font-size:12.5px; color:#1d1d1f; cursor:pointer; text-align:left; font-family:inherit; }
.pfchat-sugg button:hover{ border-color:#cfe4fb; background:#eaf2fc; }

.pfchat-msg{ max-width:86%; padding:10px 13px; border-radius:14px; font-size:13.5px; line-height:1.5; white-space:pre-wrap; word-wrap:break-word; }
.pfchat-msg.user{ align-self:flex-end; background:${V}; color:#fff; border-bottom-right-radius:5px; }
.pfchat-msg.assistant{ align-self:flex-start; background:#fff; color:#1d1d1f; border:1px solid #e0e0e0; border-bottom-left-radius:5px; }
.pfchat-typing{ align-self:flex-start; display:flex; gap:4px; padding:12px 14px; background:#fff; border:1px solid #e0e0e0; border-radius:14px; }
.pfchat-typing i{ width:6px; height:6px; border-radius:50%; background:#c6c6c7; animation:pfbounce 1.2s infinite; }
.pfchat-typing i:nth-child(2){ animation-delay:.15s } .pfchat-typing i:nth-child(3){ animation-delay:.3s }
@keyframes pfbounce{ 0%,60%,100%{ transform:translateY(0); opacity:.5 } 30%{ transform:translateY(-5px); opacity:1 } }

.pfchat-err{ background:#FDECEC; border:1px solid #F3B9B9; color:#B42318; border-radius:10px; padding:10px 12px; font-size:12.5px; }
.pfchat-err button{ background:none; border:none; color:#B42318; font-weight:700; cursor:pointer; text-decoration:underline; padding:0; margin-left:6px; font-size:12.5px; font-family:inherit; }

.pfchat-foot{ padding:12px; border-top:1px solid #f5f5f7; flex:none; background:#fff; }
.pfchat-in{ display:flex; align-items:flex-end; gap:8px; border:1.5px solid #e0e0e0; border-radius:12px; padding:8px 10px; background:#fff; }
.pfchat-in:focus-within{ border-color:${V}; box-shadow:0 0 0 3px rgba(0,102,204,.15); }
.pfchat-in textarea{ flex:1; border:none; outline:none; resize:none; font-family:inherit; font-size:13.5px;
  line-height:1.45; color:#1d1d1f; max-height:96px; background:none; }
.pfchat-in textarea::placeholder{ color:#86868b; }
.pfchat-send{ width:34px; height:34px; border-radius:9px; border:none; background:${V}; color:#fff; cursor:pointer;
  display:grid; place-items:center; flex:none; }
.pfchat-send:disabled{ opacity:.4; cursor:not-allowed; }
.pfchat-send:hover:not(:disabled){ background:#004fa3; }
.pfchat-ctx{ font-size:11px; color:#86868b; margin-top:7px; text-align:center; }
@media (prefers-reduced-motion:reduce){ .pfchat-typing i{ animation:none } .pfchat-fab{ transition:none } }
`

const SUGGESTIONS = [
  'What should I learn next?',
  'Why is this course in my path?',
  'How am I tracking against my goal?',
]

export default function AIChat() {
  const { isOpen, setIsOpen, messages, send, loading, hydrating, error, setError, pageContext } = useAIChat()
  const { user } = useAuth()
  const [input, setInput] = useState('')
  const bodyRef = useRef(null)
  const taRef = useRef(null)
  const location = useLocation()

  // Scroll to latest whenever the thread changes or the panel opens.
  useEffect(() => {
    if (isOpen && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [messages, loading, isOpen])

  useEffect(() => { if (isOpen) taRef.current?.focus() }, [isOpen])

  const submit = () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    send(text)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
  }

  // The chatbot must NOT appear on the Signup/Landing page, onboarding, full AI coach page, or live AI interview,
  // and must only appear after the dashboard / inner workspace is active.
  const isExcludedPath =
    location.pathname === '/' ||
    location.pathname.startsWith('/auth') ||
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/register') ||
    location.pathname.startsWith('/onboarding') ||
    location.pathname.startsWith('/coach') ||
    location.pathname.startsWith('/interview')

  if (!user || isExcludedPath) return null

  if (!isOpen) {
    return (
      <>
        <style>{STYLES}</style>
        <button className="pfchat-fab" onClick={() => setIsOpen(true)} aria-label="Ask PathFinder">
          <span className="b">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 1 1-4.9-7.4L21 3l-1.4 4.9A7.9 7.9 0 0 1 21 12z"/></svg>
          </span>
          <span>Ask PathFinder</span>
        </button>
      </>
    )
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="pfchat-panel" role="dialog" aria-label="PathFinder AI coach">
        <div className="pfchat-head">
          <span className="av">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2"/></svg>
          </span>
          <div className="t">
            <div className="n">PathFinder</div>
            <div className="s"><i />Online</div>
          </div>
          <button onClick={() => setIsOpen(false)} aria-label="Close">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="pfchat-body" ref={bodyRef}>
          {hydrating && <div className="pfchat-empty">Loading your conversation…</div>}

          {!hydrating && messages.length === 0 && (
            <div className="pfchat-empty">
              <b>Ask PathFinder anything</b>
              I know your roadmap, your skills, and where you are right now.
              <div className="pfchat-sugg">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`pfchat-msg ${m.role}`}>{m.content}</div>
          ))}

          {loading && <div className="pfchat-typing"><i /><i /><i /></div>}

          {error && (
            <div className="pfchat-err">
              {error.text}
              <button onClick={() => { const t = error.retry; setError(null); send(t) }}>Retry</button>
            </div>
          )}
        </div>

        <div className="pfchat-foot">
          <div className="pfchat-in">
            <textarea
              ref={taRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask PathFinder anything..."
              disabled={loading}
            />
            <button className="pfchat-send" onClick={submit} disabled={!input.trim() || loading} aria-label="Send">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </button>
          </div>
          <div className="pfchat-ctx">Asking from {pageContext}</div>
        </div>
      </div>
    </>
  )
}
