import React from 'react'

export default function WhyThisDrawer({ isOpen, onClose, courseTitle, explanation }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop — click to close */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Right-hand slide-in panel */}
      <aside className="absolute inset-y-0 right-0 w-80 max-w-[85vw] bg-white shadow-2xl p-6 flex flex-col">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold text-gray-900">Why this course?</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {courseTitle && (
          <p className="mt-1 text-sm font-medium text-indigo-600">{courseTitle}</p>
        )}

        <p className="mt-4 text-sm text-gray-700 leading-relaxed">
          {explanation ||
            'This resource was selected to bridge your current skills into this milestone’s objectives.'}
        </p>
      </aside>
    </div>
  )
}
