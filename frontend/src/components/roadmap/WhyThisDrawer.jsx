import React from 'react'
import { createPortal } from 'react-dom'

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
      <aside className="relative z-10 w-80 max-w-[85vw] h-full bg-white dark:bg-[#141A26] border-l border-[#e0e0e0] dark:border-[#242E40] shadow-2xl p-6 flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Why this course?</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl leading-none cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {courseTitle && (
          <p className="mt-1.5 text-sm font-bold text-[#0066cc] dark:text-[#38BDF8]">{courseTitle}</p>
        )}

        <p className="mt-4 text-sm text-gray-700 dark:text-[#94A3B8] leading-relaxed">
          {explanation ||
            'This resource was selected to bridge your current skills into this milestone’s objectives.'}
        </p>
      </aside>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(drawerContent, document.body) : drawerContent
}

