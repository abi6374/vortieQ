import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, ChevronDown, Check, Plus, Sparkles, MapPinned } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabaseClient'

/**
 * GoalSelectorDropdown
 * TopBar Roadmap/Goal switcher that dynamically fetches and lists all of the user's
 * personalized learning paths.
 */
export default function GoalSelectorDropdown({
  activePath = null,
  onSelectPath = null,
  className = '',
}) {
  const navigate = useNavigate()
  const { user, session } = useAuth()
  const activeUser = session?.user || user
  const [isOpen, setIsOpen] = useState(false)
  const [userPaths, setUserPaths] = useState([])
  const [loadingPaths, setLoadingPaths] = useState(false)
  const dropdownRef = useRef(null)

  // Fetch all learning paths for the active user
  useEffect(() => {
    let cancelled = false
    async function loadPaths() {
      if (!activeUser?.id) return
      setLoadingPaths(true)
      try {
        const { data, error } = await supabase
          .from('learning_paths')
          .select('id, goal_text, status, generated_at, target_role, timeframe')
          .eq('user_id', activeUser.id)
          .order('generated_at', { ascending: false })

        if (!cancelled && data && data.length > 0) {
          setUserPaths(data)
        }
      } catch (err) {
        console.warn('Could not fetch user learning paths:', err)
      } finally {
        if (!cancelled) setLoadingPaths(false)
      }
    }

    loadPaths()
    return () => {
      cancelled = true
    }
  }, [activeUser?.id])

  // Handle outside click & escape key
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

function formatGoalTitle(targetRole, rawGoalText) {
  if (targetRole && targetRole.trim()) return targetRole.trim()
  if (!rawGoalText) return 'Personalized Goal'

  // Extract explicit (Target role: ...) tag if present
  const targetMatch = rawGoalText.match(/\(Target\s+role:\s*([^.)]+)\.?\)/i)
  if (targetMatch && targetMatch[1]) return targetMatch[1].trim()

  let text = rawGoalText.split('I can study')[0].trim()
  text = text.replace(
    /^(I want to become an?|I want to become|I want to be an?|I want to be|I want an?|I want|My goal is to become an?|My goal is to be an?|My goal is to|My goal is)\s+/i,
    ''
  )
  text = text.charAt(0).toUpperCase() + text.slice(1)
  text = text.replace(/\.$/, '').trim()

  if (text.length > 35) {
    const roleInTextMatch = text.match(/(?:transition into|become|work as)(?:\s+an?|\s+a)?\s+([A-Z][a-zA-Z\s/]+(?:Engineer|Analyst|Developer|Scientist|Specialist|Lead|Manager))/i)
    if (roleInTextMatch && roleInTextMatch[1]) {
      return roleInTextMatch[1].trim()
    }
    return text.split('.')[0].trim()
  }
  return text || 'Personalized Goal'
}

  // Determine current active goal title and target text
  const currentGoalTitle =
    formatGoalTitle(activePath?.target_role, activePath?.goal_text) ||
    (userPaths.length > 0 ? formatGoalTitle(userPaths[0]?.target_role, userPaths[0]?.goal_text) : 'Personalized Goal')

  const currentTargetSubtitle = activePath?.timeframe
    ? `Target: ${activePath.timeframe}`
    : 'Target: Ongoing Pace'

  // Combine user paths or fallback activePath
  const displayPaths = userPaths.length > 0
    ? userPaths
    : activePath
    ? [activePath]
    : [
        {
          id: 'active',
          goal_text: currentGoalTitle,
          target_role: currentGoalTitle,
          status: 'active',
        },
      ]

  const handleSelect = (pathItem) => {
    setIsOpen(false)
    if (onSelectPath) {
      onSelectPath(pathItem)
    } else if (pathItem.id && pathItem.id !== 'active') {
      navigate(`/roadmap/${pathItem.id}`)
    }
  }

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`flex items-center gap-2.5 px-3.5 py-2 bg-white dark:bg-[#141A26] border border-[#e0e0e0] dark:border-[#242E40] hover:border-[#0066cc] dark:hover:border-[#38BDF8] rounded-xl text-xs font-medium text-[#1d1d1f] dark:text-white shadow-2xs transition-all cursor-pointer select-none max-w-[280px] sm:max-w-xs ${
          isOpen ? 'border-[#0066cc] dark:border-[#38BDF8] ring-2 ring-[#0066cc]/15' : ''
        }`}
      >
        <CalendarDays className="w-4 h-4 text-[#0066cc] dark:text-[#38BDF8] flex-none" />
        <div className="flex flex-col text-left min-w-0 flex-1">
          <span className="font-bold text-[#1d1d1f] dark:text-white leading-tight truncate font-['Manrope']">
            {currentGoalTitle}
          </span>
          <span className="text-[10px] text-[#6e6e73] dark:text-[#94A3B8] font-medium leading-tight truncate mt-0.5">
            {currentTargetSubtitle}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#86868b] dark:text-[#94A3B8] flex-none transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#0066cc] dark:text-[#38BDF8]' : ''
          }`}
        />
      </button>

      {/* Floating Animated Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: 'top left' }}
            className="absolute left-0 top-full mt-1.5 z-50 w-72 sm:w-80 bg-white dark:bg-[#141A26] border border-[#E6EAF2] dark:border-[#242E40] shadow-[0_20px_48px_rgba(14,27,56,0.18),0_4px_12px_rgba(14,27,56,0.06)] dark:shadow-[0_20px_48px_rgba(0,0,0,0.6)] rounded-2xl p-1.5 overflow-hidden"
            role="listbox"
          >
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7a7a7a] dark:text-[#94A3B8] border-b border-[#f0f0f0] dark:border-[#1E2638] mb-1 font-['Manrope']">
              Your Learning Roadmaps ({displayPaths.length})
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5">
              {displayPaths.map((pathItem, idx) => {
                const title = formatGoalTitle(pathItem.target_role, pathItem.goal_text) || `Roadmap #${idx + 1}`
                const isSelected =
                  (activePath && activePath.id === pathItem.id) ||
                  (!activePath && idx === 0)

                return (
                  <button
                    key={pathItem.id || idx}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(pathItem)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#eaf2fc] dark:bg-[#1E293B] text-[#0066cc] dark:text-[#38BDF8] font-bold'
                        : 'text-[#1d1d1f] dark:text-[#E2E8F0] hover:bg-[#f5f7fa] dark:hover:bg-[#1A2234] font-medium'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate leading-tight font-['Manrope'] font-bold">{title}</div>
                      <div className="text-[10px] font-normal text-[#7a7a7a] dark:text-[#94A3B8] mt-0.5 truncate">
                        {pathItem.timeframe ? `Target: ${pathItem.timeframe}` : 'Target: Ongoing Pace'}
                        {pathItem.generated_at && ` · ${new Date(pathItem.generated_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#0066cc] dark:text-[#38BDF8] flex-none" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Bottom Action: Create New Goal / Replan */}
            <div className="mt-1 pt-1 border-t border-[#f0f0f0] dark:border-[#1E2638]">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  navigate('/onboarding')
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#0066cc] dark:text-[#38BDF8] hover:bg-[#eaf2fc] dark:hover:bg-[#1E293B] flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Learning Goal</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
