import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/apiClient'

/**
 * The single shared PathFinder AI conversation.
 *
 * One thread per user, persisted server-side (ai_conversations / ai_messages),
 * so the conversation survives navigation, reload, and devices. Every page uses
 * this — there are no page-local chat implementations any more.
 */

const AIChatContext = createContext(null)

// Maps a route to the page name we send as context so the assistant knows
// where the learner is standing when they ask.
function pageContextFor(pathname) {
  if (pathname.startsWith('/progress')) return 'Progress'
  if (pathname.startsWith('/skill')) return 'Skill Insights'
  if (pathname.startsWith('/resources')) return 'Resources'
  if (pathname.startsWith('/roadmap') || pathname.startsWith('/dashboard')) return 'My Roadmap'
  if (pathname.startsWith('/onboarding')) return 'Onboarding'
  return 'PathFinder'
}

export function AIChatProvider({ children }) {
  const { session } = useAuth()
  const location = useLocation()

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)   // sending a message
  const [hydrating, setHydrating] = useState(false) // initial history load
  const [error, setError] = useState(null)
  const loadedRef = useRef(false)

  const pageContext = pageContextFor(location.pathname)

  // Load persisted history once per session.
  useEffect(() => {
    if (!session?.user || loadedRef.current) return
    loadedRef.current = true
    let cancelled = false
    ;(async () => {
      setHydrating(true)
      try {
        const { data } = await api.get('/api/assistant/conversation')
        if (!cancelled) setMessages(data.messages || [])
      } catch {
        // Non-fatal: the user can still start a fresh conversation.
      } finally {
        if (!cancelled) setHydrating(false)
      }
    })()
    return () => { cancelled = true }
  }, [session])

  const send = useCallback(async (text) => {
    const content = (text || '').trim()
    if (!content || loading) return

    setError(null)
    setLoading(true)
    // Optimistic user message so the UI feels instant.
    const optimistic = { id: `tmp-${Date.now()}`, role: 'user', content, _optimistic: true }
    setMessages((m) => [...m, optimistic])

    try {
      const { data } = await api.post('/api/assistant/messages', {
        content,
        page_context: pageContext,
      })
      setMessages((m) => [
        ...m.filter((x) => x.id !== optimistic.id),
        data.user_message,
        data.assistant_message,
      ])
    } catch (err) {
      // Roll the optimistic message back and surface a retryable error.
      setMessages((m) => m.filter((x) => x.id !== optimistic.id))
      setError({
        text: err?.response?.status === 503
          ? 'PathFinder is temporarily unavailable. Please try again.'
          : 'Could not send your message. Please try again.',
        retry: content,
      })
    } finally {
      setLoading(false)
    }
  }, [loading, pageContext])

  const clear = useCallback(async () => {
    try { await api.delete('/api/assistant/conversation') } catch {}
    setMessages([])
    setError(null)
  }, [])

  const value = {
    isOpen, setIsOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((o) => !o),
    messages, send, clear,
    loading, hydrating, error, setError,
    pageContext,
  }

  return <AIChatContext.Provider value={value}>{children}</AIChatContext.Provider>
}

export function useAIChat() {
  const ctx = useContext(AIChatContext)
  if (!ctx) throw new Error('useAIChat must be used inside AIChatProvider')
  return ctx
}
