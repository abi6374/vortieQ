import React from 'react'

export default function MessageBubble({ sender, text }) {
  const isUser = sender === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] text-xs p-3 rounded-xl leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-none'
        }`}
      >
        {text}
      </div>
    </div>
  )
}
