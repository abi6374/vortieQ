import React, { useEffect, useRef, useState } from 'react'
import MessageBubble from './MessageBubble'
import apiClient from '../../lib/apiClient'

const WELCOME = {
  role: 'assistant',
  text: 'Hi! Ask me anything about your learning path — like why a course is here, or what to study first.',
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
        <span className="flex items-center gap-1" aria-label="Assistant is typing">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
        </span>
      </div>
    </div>
  )
}

/**
 * AssistantChat
 * Floating, grounded AI assistant. Collapsed to a bubble button; expands into a
 * compact chat panel that posts questions to the backend with the active pathId.
 *
 * Props:
 *   pathId - string, the learning path the questions are about
 */
export default function AssistantChat({ pathId }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const endRef = useRef(null)
  const inputRef = useRef(null)

  // Keep the latest message / typing indicator in view.
  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isTyping, isOpen])

  const openChat = () => {
    setIsOpen(true)
    // Seed a welcome message the first time the panel is opened.
    setMessages((prev) => (prev.length === 0 ? [WELCOME] : prev))
    // Focus the input once the panel is on screen.
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const sendMessage = async () => {
    const question = inputText.trim()
    if (!question || isTyping) return

    setInputText('')
    setMessages((prev) => [...prev, { role: 'user', text: question }])
    setIsTyping(true)
    try {
      const res = await apiClient.post('/api/assistant/ask', {
        question,
        path_id: pathId,
      })
      setMessages((prev) => [...prev, { role: 'assistant', text: res.data.answer }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: "Sorry, I couldn't answer that. Please try again." },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Collapsed: floating action button (56px circle, bottom-right).
  if (!isOpen) {
    return (
      <button
        onClick={openChat}
        aria-label="Open AI learning assistant"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-2xl shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
      >
        <span aria-hidden="true">💬</span>
      </button>
    )
  }

  // Expanded: chat panel (full width on mobile, w-80 on sm+).
  return (
    <div className="fixed z-40 bottom-6 right-6 left-6 sm:left-auto w-auto sm:w-80 h-96 max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <span aria-hidden="true">🤖</span> AI Learning Assistant
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          aria-label="Close assistant"
          className="text-gray-400 hover:text-gray-700 text-lg leading-none px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {messages.map((m, idx) => (
          <MessageBubble key={idx} role={m.role} text={m.text} />
        ))}
        {isTyping && <TypingBubble />}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-100 flex items-end gap-2 shrink-0">
        <textarea
          ref={inputRef}
          rows={1}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your path…"
          className="flex-1 resize-none max-h-24 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300"
        />
        <button
          onClick={sendMessage}
          disabled={!inputText.trim() || isTyping}
          className="shrink-0 h-9 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          Send
        </button>
      </div>
    </div>
  )
}
