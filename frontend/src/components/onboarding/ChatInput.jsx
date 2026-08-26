import React, { useState } from 'react'

const PLACEHOLDER =
  "e.g. I'm a marketing professional who wants to transition into data science. " +
  'I have basic Excel skills and can study 10 hours a week.'

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent align-[-2px]" />
  )
}

export default function ChatInput({ onSubmit, isLoading }) {
  const [text, setText] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isLoading || !text.trim()) return
    onSubmit(text.trim())
  }

  const disabled = isLoading || !text.trim()

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={PLACEHOLDER}
        disabled={isLoading}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm text-gray-800 disabled:bg-gray-50"
      />
      <button
        type="submit"
        disabled={disabled}
        className="mt-4 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading && <Spinner />}
        {isLoading ? 'Analyzing…' : 'Generate My Path →'}
      </button>
    </form>
  )
}
