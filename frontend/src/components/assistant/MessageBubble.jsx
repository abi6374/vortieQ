import React from 'react'

/**
 * MessageBubble
 * A single chat message, aligned and styled by sender.
 *
 * Props:
 *   role - "user" | "assistant"
 *   text - message body
 */
export default function MessageBubble({ role, text }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'max-w-[85%] px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words',
          isUser
            ? 'bg-indigo-600 text-white rounded-2xl rounded-br-sm'
            : 'bg-gray-100 text-gray-800 rounded-2xl rounded-bl-sm',
        ].join(' ')}
      >
        {text}
      </div>
    </div>
  )
}
