import React, { useState } from 'react'
import MessageBubble from './MessageBubble'
import api from '../../lib/apiClient'

export default function AssistantChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { sender: 'assistant', text: 'Hello! I am your AI Career Advisor. Ask me anything about your learning roadmap, project ideas, or study pacing.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }])
    setLoading(true)

    try {
      const res = await api.post('/api/assistant/ask', { question: userMsg })
      setMessages((prev) => [...prev, { sender: 'assistant', text: res.data.answer }])
    } catch (err) {
      setMessages((prev) => [...prev, { sender: 'assistant', text: 'Sorry, I ran into an issue connecting to the AI service.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-3 rounded-full shadow-2xl transition-transform hover:scale-105 font-medium text-xs"
        >
          <span>💬</span> Ask AI Advisor
        </button>
      ) : (
        <div className="bg-slate-900 border border-slate-700 w-80 sm:w-96 rounded-2xl shadow-2xl flex flex-col h-[480px] overflow-hidden">
          <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center">
            <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> AI Career Assistant
            </h4>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white text-sm font-bold">✕</button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.map((m, idx) => (
              <MessageBubble key={idx} sender={m.sender} text={m.text} />
            ))}
            {loading && <div className="text-[10px] text-slate-500 italic">Advisor is typing...</div>}
          </div>

          <form onSubmit={handleSend} className="p-3 bg-slate-800/50 border-t border-slate-700 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
