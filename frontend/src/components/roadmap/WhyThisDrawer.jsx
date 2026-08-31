import React from 'react'
import { createPortal } from 'react-dom'
import { stripEmojis } from '../../utils/textUtils'

export default function WhyThisDrawer({ isOpen, onClose, courseTitle, explanation }) {
  if (!isOpen) return null

  const drawerContent = (
    <div className="fixed inset-0 z-[9999] flex justify-end">
      {/* Full-screen backdrop with blur */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Right-hand slide-in panel */}
      <aside className="relative z-10 w-80 max-w-[85vw] h-full bg-white dark:bg-[#121216] border-l border-[#e0e0e0] dark:border-[#27272F] shadow-2xl p-6 flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Why this course?</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {courseTitle && (
          <p className="mt-1.5 text-sm font-bold text-[#0066cc] dark:text-[#C9D0D6]">{stripEmojis(courseTitle)}</p>
        )}

        <p className="mt-4 text-sm text-gray-700 dark:text-[#94A3B8] leading-relaxed">
          {stripEmojis(explanation) ||
            'This resource was selected to bridge your current skills into this milestone’s objectives.'}
        </p>
      </aside>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(drawerContent, document.body) : drawerContent
}

